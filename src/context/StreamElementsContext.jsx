import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabaseClient';

const StreamElementsContext = createContext();

function isMissingRedemptionTable(error) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return error?.code === 'PGRST205'
    || error?.status === 404
    || (text.includes('point_redemptions') && (text.includes('could not find') || text.includes('schema cache')));
}

function shouldPollRedemptionNotifications() {
  return typeof window !== 'undefined' && window.location.pathname === '/admin-overlay';
}

function isTwitchAuthUser(authUser) {
  return authUser?.app_metadata?.provider === 'twitch';
}

function getTwitchUsername(authUser) {
  return authUser.user_metadata?.preferred_username
    || authUser.user_metadata?.name
    || authUser.user_metadata?.user_name
    || null;
}

async function getExistingConnection(userId) {
  const { data: existing, error } = await supabase
    .from('streamelements_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking existing connection:', error);
  }

  return existing || null;
}

async function getStreamElementsCredentials(userId) {
  const { data: seRow } = await supabase
    .from('streamelements_connections')
    .select('se_channel_id, se_jwt_token')
    .eq('user_id', userId)
    .single();

  if (seRow?.se_channel_id && seRow?.se_jwt_token) {
    return {
      seChannelId: seRow.se_channel_id,
      seJwtToken: seRow.se_jwt_token,
    };
  }

  const { data: streamerCreds } = await supabase.rpc('get_streamer_se_credentials');
  const credentials = streamerCreds?.[0];
  return {
    seChannelId: credentials?.channel_id || null,
    seJwtToken: credentials?.jwt_token || null,
  };
}

async function fetchOrCreatePoints(seChannelId, seJwtToken, twitchUsername) {
  const requestOptions = {
    headers: {
      'Authorization': `Bearer ${seJwtToken}`,
      'Accept': 'application/json'
    }
  };
  const response = await fetch(
    `https://api.streamelements.com/kappa/v2/points/${seChannelId}/${twitchUsername}`,
    requestOptions
  );

  if (response.ok) return response.json();
  if (response.status !== 404) return null;

  const createResponse = await fetch(
    `https://api.streamelements.com/kappa/v2/points/${seChannelId}/${twitchUsername}/500`,
    { ...requestOptions, method: 'PUT' }
  );

  return createResponse.ok ? createResponse.json() : { points: 500 };
}

export function useStreamElements() {
  const context = useContext(StreamElementsContext);
  if (!context) {
    throw new Error('useStreamElements must be used within StreamElementsProvider');
  }
  return context;
}

export function StreamElementsProvider({ children }) {
  const { user } = useAuth();
  const [seAccount, setSeAccount] = useState(null);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latestRedemption, setLatestRedemption] = useState(null);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const didAutoConnect = useRef(false);
  const redemptionPollingDisabled = useRef(false);

  // Load user's StreamElements connection from database
  useEffect(() => {
    if (user) {
      const init = async () => {
        await loadStreamElementsConnection();
        if (!didAutoConnect.current) {
          didAutoConnect.current = true;
          await autoConnectTwitchUser();
        }
      };
      init();
    } else {
      setSeAccount(null);
      setPoints(0);
      didAutoConnect.current = false;
    }
  }, [user?.id]);

  // Auto-connect Twitch users to StreamElements
  const autoConnectTwitchUser = async () => {
    setAutoConnecting(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!isTwitchAuthUser(authUser)) return;

      const existing = await getExistingConnection(user.id);

      if (existing) {
        setSeAccount(existing);
        await fetchPoints(existing.se_channel_id, existing.se_jwt_token, existing.se_username);
        return;
      }

      const twitchUsername = getTwitchUsername(authUser);
      if (!twitchUsername) return;

      const { seChannelId, seJwtToken } = await getStreamElementsCredentials(user.id);

      if (!seChannelId || !seJwtToken) {
        console.log('⚠️ No SE credentials found. Streamer needs to configure SE.');
        return;
      }

      const pointsData = await fetchOrCreatePoints(seChannelId, seJwtToken, twitchUsername);
      if (!pointsData) return;

      // Save connection to database with THIS user's own SE creds
      const { error: insertError } = await supabase
        .from('streamelements_connections')
        .insert({
          user_id: user.id,
          se_channel_id: seChannelId,
          se_jwt_token: seJwtToken,
          se_username: twitchUsername,
          connected_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving SE connection:', insertError);
      }

      setSeAccount({
        se_channel_id: seChannelId,
        se_jwt_token: seJwtToken,
        se_username: twitchUsername
      });
      setPoints(pointsData?.points || 0);
    } catch (err) {
      console.error('Auto-connect failed:', err);
    } finally {
      setAutoConnecting(false);
    }
  };

  const loadStreamElementsConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('streamelements_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSeAccount(data);
        // Fetch current points using SE username
        await fetchPoints(data.se_channel_id, data.se_jwt_token, data.se_username);
      }
    } catch (err) {
      console.error('Error loading SE connection:', err);
    }
  };

  const fetchPoints = async (channelId, jwtToken, username = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use username if provided, otherwise use user.id
      const userId = username || user.id;
      
      // Call StreamElements API to get user points
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${channelId}/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch points');
      
      const data = await response.json();
      setPoints(data.points || 0);
    } catch (err) {
      console.error('Error fetching points:', err);
      setError(err.message);
      setPoints(0);
    } finally {
      setLoading(false);
    }
  };

  const linkAccount = async (channelId, jwtToken, username) => {
    setLoading(true);
    setError(null);

    try {
      // Verify the JWT token works by fetching points
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${channelId}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Invalid StreamElements credentials');

      // Save to database
      const { data, error } = await supabase
        .from('streamelements_connections')
        .upsert({
          user_id: user.id,
          se_channel_id: channelId,
          se_jwt_token: jwtToken,
          se_username: username,
          connected_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSeAccount(data);
      await fetchPoints(channelId, jwtToken);
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const unlinkAccount = async () => {
    try {
      const { error } = await supabase
        .from('streamelements_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setSeAccount(null);
      setPoints(0);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const redeemPoints = async (redemptionId, pointCost) => {
    console.log('=== redeemPoints called ===');
    console.log('redemptionId received:', redemptionId, 'type:', typeof redemptionId);
    console.log('pointCost received:', pointCost);
    
    if (points < pointCost) {
      return { success: false, error: 'Insufficient points' };
    }

    // Validate redemptionId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(redemptionId)) {
      console.error('Invalid redemption ID format:', redemptionId);
      return { success: false, error: 'Invalid redemption item' };
    }

    setLoading(true);
    setError(null);

    try {
      // Use SE username for API call
      const userId = seAccount.se_username || user.id;
      
      // Deduct points via StreamElements API
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seAccount.se_channel_id}/${userId}/${-pointCost}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${seAccount.se_jwt_token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to deduct points');

      // Get the redemption item to check available_units
      const { data: itemData, error: itemError } = await supabase
        .from('redemption_items')
        .select('available_units')
        .eq('id', redemptionId)
        .single();

      if (itemError) throw itemError;

      // Check if item has limited units and if any are available
      if (itemData.available_units !== null) {
        if (itemData.available_units <= 0) {
          throw new Error('This item is out of stock');
        }
        
        // Decrement available_units
        const { error: updateError } = await supabase
          .from('redemption_items')
          .update({ available_units: itemData.available_units - 1 })
          .eq('id', redemptionId);

        if (updateError) throw updateError;
      }

      // Record redemption in database
      console.log('About to insert redemption:', {
        user_id: user.id,
        redemption_id: redemptionId,
        points_spent: pointCost
      });
      
      const { error: dbError } = await supabase
        .from('point_redemptions')
        .insert({
          user_id: user.id,
          redemption_id: redemptionId,
          points_spent: pointCost,
          redeemed_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      // Update local points
      setPoints(prev => prev - pointCost);

      return { success: true };
    } catch (err) {
      console.error('Redemption error:', err);
      const errorMessage = err.message || 'Failed to process redemption';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const refreshPoints = async () => {
    if (seAccount) {
      await fetchPoints(seAccount.se_channel_id, seAccount.se_jwt_token, seAccount.se_username);
    }
  };

  const updateUserPoints = async (amount) => {
    if (!seAccount) {
      return { success: false, error: 'StreamElements account not connected' };
    }

    setLoading(true);
    setError(null);

    try {
      const userId = seAccount.se_username || user.id;
      
      // Update points via StreamElements API
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seAccount.se_channel_id}/${userId}/${amount}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${seAccount.se_jwt_token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to update points');

      // Update local points
      setPoints(prev => Math.max(0, prev + amount));

      return { success: true };
    } catch (err) {
      console.error('Update points error:', err);
      const errorMessage = err.message || 'Failed to update points';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Poll for redemptions from database
  useEffect(() => {
    if (!user || !seAccount || !shouldPollRedemptionNotifications()) return;
    redemptionPollingDisabled.current = false;

    const checkRedemptions = async () => {
      if (redemptionPollingDisabled.current) return;
      try {
        const lastCheck = localStorage.getItem('last_redemption_id');
        
        // Query redemptions from database, ordered by most recent first
        const { data, error } = await supabase
          .from('point_redemptions')
          .select(`
            *,
            redemption_items!inner(name, point_cost, image_url)
          `)
          .order('redeemed_at', { ascending: false })
          .limit(1);

        if (error) {
          if (isMissingRedemptionTable(error)) {
            redemptionPollingDisabled.current = true;
            return;
          }
          console.error('[Redemptions] Error fetching redemptions:', error);
          return;
        }

        // Check for new redemptions
        if (data && data.length > 0) {
          const newest = data[0];
          
          if (newest.id !== lastCheck) {
            // Get username via RPC (bypasses RLS on streamelements_connections)
            const { data: usernames } = await supabase.rpc('get_usernames_for_ids', {
              p_user_ids: [newest.user_id]
            });
            
            const twitchUsername = usernames?.[0]?.username || 'Unknown';
            
            const itemName = newest.redemption_items?.name || 'Unknown Item';
            const cost = newest.redemption_items?.point_cost || newest.points_spent || 0;
            const imageUrl = newest.redemption_items?.image_url || null;
            
            setLatestRedemption({
              username: twitchUsername,
              item: itemName,
              cost: cost,
              imageUrl: imageUrl,
              id: newest.id,
              timestamp: newest.redeemed_at
            });
            localStorage.setItem('last_redemption_id', newest.id);
          }
        }
      } catch (err) {
        console.error('[Redemptions] Error checking redemptions:', err);
      }
    };

    // Check immediately and then every 60 seconds (reduced from 10s to save egress)
    checkRedemptions();
    const interval = setInterval(checkRedemptions, 60000);

    return () => clearInterval(interval);
  }, [user?.id, seAccount?.id]);

  const value = useMemo(() => ({
    seAccount,
    points,
    loading,
    error,
    latestRedemption,
    setLatestRedemption,
    linkAccount,
    unlinkAccount,
    redeemPoints,
    refreshPoints,
    updateUserPoints,
    isConnected: !!seAccount,
    autoConnecting
  }), [
    autoConnecting,
    error,
    latestRedemption,
    linkAccount,
    loading,
    points,
    redeemPoints,
    refreshPoints,
    seAccount,
    unlinkAccount,
    updateUserPoints,
  ]);

  return (
    <StreamElementsContext.Provider value={value}>
      {children}
    </StreamElementsContext.Provider>
  );
}
