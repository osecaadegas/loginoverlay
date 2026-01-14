import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabaseClient';

const StreamElementsContext = createContext();

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
  const [redemptions, setRedemptions] = useState([]);
  const [latestRedemption, setLatestRedemption] = useState(null);
  const [autoConnecting, setAutoConnecting] = useState(false);

  // Load user's StreamElements connection from database
  useEffect(() => {
    if (user) {
      const init = async () => {
        await loadStreamElementsConnection();
        await autoConnectTwitchUser();
      };
      init();
    } else {
      setSeAccount(null);
      setPoints(0);
    }
  }, [user]);

  // Auto-connect Twitch users to StreamElements
  const autoConnectTwitchUser = async () => {
    setAutoConnecting(true);
    try {
      console.log('🔍 Checking auto-connect for Twitch user...');
      
      // Check if user logged in via Twitch
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      console.log('User provider:', authUser?.app_metadata?.provider);
      console.log('User metadata:', authUser?.user_metadata);
      
      if (!authUser?.app_metadata?.provider || authUser.app_metadata.provider !== 'twitch') {
        console.log('❌ Not a Twitch user, skipping auto-connect');
        setAutoConnecting(false);
        return;
      }

      console.log('✅ Twitch user detected!');

      // Check if already connected
      const { data: existing, error: checkError } = await supabase
        .from('streamelements_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing connection:', checkError);
      }

      if (existing) {
        console.log('✅ Already connected to StreamElements');
        setSeAccount(existing);
        await fetchPoints(existing.se_channel_id, existing.se_jwt_token, existing.se_username);
        setAutoConnecting(false);
        return;
      }

      console.log('📝 No existing connection, creating new one...');

      // Get Twitch username from user metadata
      const twitchUsername = authUser.user_metadata?.preferred_username || 
                            authUser.user_metadata?.name ||
                            authUser.user_metadata?.user_name;

      console.log('Twitch username:', twitchUsername);

      if (!twitchUsername) {
        console.error('❌ Could not extract Twitch username from metadata');
        setAutoConnecting(false);
        return;
      }

      // Auto-connect using streamer's credentials
      const streamerChannelId = import.meta.env.VITE_SE_CHANNEL_ID;
      const streamerJwtToken = import.meta.env.VITE_SE_JWT_TOKEN;

      console.log('SE Channel ID configured:', !!streamerChannelId);
      console.log('SE JWT Token configured:', !!streamerJwtToken);

      if (!streamerChannelId || !streamerJwtToken) {
        console.warn('⚠️ StreamElements credentials not configured. Set VITE_SE_CHANNEL_ID and VITE_SE_JWT_TOKEN environment variables.');
        setAutoConnecting(false);
        return;
      }

      console.log('🔄 Attempting to fetch SE points for:', twitchUsername);

      // Try to fetch points using Twitch username
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${streamerChannelId}/${twitchUsername}`,
        {
          headers: {
            'Authorization': `Bearer ${streamerJwtToken}`,
            'Accept': 'application/json'
          }
        }
      );

      let pointsData = null;

      if (response.ok) {
        pointsData = await response.json();
        console.log('✅ Auto-connect successful! Points:', pointsData.points);
      } else if (response.status === 404) {
        // User doesn't exist in SE yet - create them with 500 starting points
        console.log('📝 User not found in SE, creating with 500 starting points...');
        
        const createResponse = await fetch(
          `https://api.streamelements.com/kappa/v2/points/${streamerChannelId}/${twitchUsername}/500`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${streamerJwtToken}`,
              'Accept': 'application/json'
            }
          }
        );

        if (createResponse.ok) {
          pointsData = await createResponse.json();
          console.log('✅ User created in SE with 500 starting points');
        } else {
          console.error('❌ Failed to create user in SE:', createResponse.status);
          // Still proceed with 500 points locally
          pointsData = { points: 500 };
        }
      } else {
        console.error('❌ SE API error:', response.status);
        setAutoConnecting(false);
        return;
      }

      // Save connection to database
      const { error: insertError } = await supabase
        .from('streamelements_connections')
        .insert({
          user_id: user.id,
          se_channel_id: streamerChannelId,
          se_jwt_token: streamerJwtToken,
          se_username: twitchUsername,
          connected_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving SE connection:', insertError);
      }

      setSeAccount({
        se_channel_id: streamerChannelId,
        se_jwt_token: streamerJwtToken,
        se_username: twitchUsername
      });
      setPoints(pointsData?.points || 0);
      console.log('✅ Auto-connect complete! Connected with', pointsData?.points || 0, 'points');
    } catch (err) {
      console.error('Auto-connect failed:', err);
      // Silently fail - user can manually connect if needed
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
    if (!user) return;

    const checkRedemptions = async () => {
      try {
        const lastCheck = localStorage.getItem('last_redemption_id');
        console.log('[Redemptions] Checking for new redemptions. Last check:', lastCheck);
        
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
          console.error('[Redemptions] Error fetching redemptions:', error);
          return;
        }

        console.log('[Redemptions] Query result:', data);

        // Check for new redemptions
        if (data && data.length > 0) {
          const newest = data[0];
          console.log('[Redemptions] Latest redemption ID:', newest.id, 'vs last check:', lastCheck);
          
          if (newest.id !== lastCheck) {
            // Try to get Twitch username from StreamElements connection first
            const { data: seConnection } = await supabase
              .from('streamelements_connections')
              .select('se_username')
              .eq('user_id', newest.user_id)
              .single();
            
            // Fallback to user profile
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('username, display_name')
              .eq('user_id', newest.user_id)
              .single();
            
            const twitchUsername = seConnection?.se_username || 
                                  profileData?.username || 
                                  profileData?.display_name || 
                                  'Unknown';
            
            const itemName = newest.redemption_items?.name || 'Unknown Item';
            const cost = newest.redemption_items?.point_cost || newest.points_spent || 0;
            const imageUrl = newest.redemption_items?.image_url || null;
            
            console.log('[Redemptions] NEW REDEMPTION FOUND!', { username: twitchUsername, itemName, cost, imageUrl, seConnection, profileData });
            
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
        } else {
          console.log('[Redemptions] No redemptions found in database');
        }
      } catch (err) {
        console.error('[Redemptions] Error checking redemptions:', err);
      }
    };

    // Check immediately and then every 3 seconds
    checkRedemptions();
    const interval = setInterval(checkRedemptions, 3000);

    return () => clearInterval(interval);
  }, [user]);

  const value = {
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
  };

  return (
    <StreamElementsContext.Provider value={value}>
      {children}
    </StreamElementsContext.Provider>
  );
}
