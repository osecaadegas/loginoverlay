import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabaseClient';
import './PointsManager.css';

export default function PointsManager() {
  const [users, setUsers] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionItems, setRedemptionItems] = useState([]);
  const [gameSessions, setGameSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'redemptions', 'items', 'games'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState('moderator'); // 'admin' or 'moderator'

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');

  // For adding/removing points
  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsAction, setPointsAction] = useState('add'); // 'add' or 'remove'

  // For managing redemption items
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    point_cost: '',
    reward_type: 'custom',
    reward_details: '',
    image_url: '',
    available_units: '',
    se_points_amount: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Pagination for all tabs
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Reset page when changing tabs or filters
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, statusFilter, gameFilter]);

  const SE_CHANNEL_ID = import.meta.env.VITE_SE_CHANNEL_ID;
  const SE_JWT_TOKEN = import.meta.env.VITE_SE_JWT_TOKEN;

  useEffect(() => {
    loadData();
    checkUserRole();
  }, [activeTab]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user has admin role from the user_roles table
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        const userRoles = roles?.map(r => r.role) || [];
        if (userRoles.includes('admin')) {
          setUserRole('admin');
        } else if (userRoles.includes('moderator')) {
          setUserRole('moderator');
        } else {
          setUserRole('user');
        }
      }
    } catch (err) {
      console.error('Error checking user role:', err);
    }
  };

  const uploadImage = async (file) => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `redemption-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image: ' + err.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        await loadUsers();
      } else if (activeTab === 'redemptions') {
        await loadRedemptions();
      } else if (activeTab === 'items') {
        await loadRedemptionItems();
      } else if (activeTab === 'games') {
        await loadGameSessions();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('Loading users...');
      console.log('SE_CHANNEL_ID:', SE_CHANNEL_ID);
      console.log('SE_JWT_TOKEN exists:', !!SE_JWT_TOKEN);
      
      // Get all users with SE connections
      const { data: connections, error: connError } = await supabase
        .from('streamelements_connections')
        .select('*');

      if (connError) {
        console.error('Error fetching SE connections:', connError);
      }
      console.log('SE Connections:', connections?.length || 0);

      // Get all unique user IDs from user_roles table
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id');
      
      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }
      
      console.log('User roles count:', userRoles?.length || 0);
      
      if (!userRoles || userRoles.length === 0) {
        console.log('No users found in user_roles');
        setUsers([]);
        return;
      }
      
      // Get unique user IDs
      const uniqueUserIds = [...new Set(userRoles.map(r => r.user_id))];
      console.log('Unique users:', uniqueUserIds.length);
      
      // Fetch email and metadata for each user using RPC
      const allUsers = await Promise.all(
        uniqueUserIds.map(async (userId) => {
          const { data: emailData } = await supabase
            .rpc('get_user_email', { user_id: userId });
          
          // Get user metadata to check for Twitch username
          const { data: metadata } = await supabase
            .rpc('get_user_metadata', { user_id: userId });
          
          let twitchUsername = null;
          if (metadata) {
            // Check if user logged in via Twitch
            if (metadata.identities && metadata.identities.length > 0) {
              const twitchIdentity = metadata.identities.find(i => i.provider === 'twitch');
              if (twitchIdentity?.identity_data) {
                twitchUsername = twitchIdentity.identity_data.preferred_username || 
                                twitchIdentity.identity_data.user_name ||
                                twitchIdentity.identity_data.full_name;
              }
            }
            // Fallback to user_metadata
            if (!twitchUsername && metadata.user_metadata) {
              twitchUsername = metadata.user_metadata.preferred_username || 
                              metadata.user_metadata.user_name ||
                              metadata.user_metadata.full_name;
            }
          }
          
          return {
            user_id: userId,
            email: emailData || 'Unknown',
            twitch_username: twitchUsername
          };
        })
      );
      
      console.log('All users with emails:', allUsers.length);

    // Create a map of user_id to SE connection
    const connectionMap = {};
    if (connections) {
      connections.forEach(conn => {
        connectionMap[conn.user_id] = conn;
      });
    }

    // For users without SE connections, use streamer's credentials
    const streamerChannelId = SE_CHANNEL_ID;
    const streamerJwtToken = SE_JWT_TOKEN;

    // Fetch current points for each user from SE API
    const usersWithPoints = await Promise.all(
      allUsers.map(async (user) => {
        const userEmail = user.email || 'Unknown';
        const connection = connectionMap[user.user_id];
        
        // Determine SE username priority: connection > twitch username > email prefix
        let seUsername = connection?.se_username;
        
        if (!seUsername && user.twitch_username) {
          // Use Twitch username if available
          seUsername = user.twitch_username;
        }
        
        if (!seUsername) {
          // Fallback: Extract username from email (before @)
          seUsername = userEmail.split('@')[0];
        }

        // Use connection credentials if available, otherwise use streamer's credentials
        const channelId = connection?.se_channel_id || streamerChannelId;
        const jwtToken = connection?.se_jwt_token || streamerJwtToken;

        console.log(`Processing user: ${userEmail}, SE Username: ${seUsername}, Has Connection: ${!!connection}`);

        try {
          if (channelId && jwtToken && seUsername) {
            const response = await fetch(
              `https://api.streamelements.com/kappa/v2/points/${channelId}/${seUsername}`,
              {
                headers: {
                  'Authorization': `Bearer ${jwtToken}`,
                  'Accept': 'application/json'
                }
              }
            );

            if (response.ok) {
              const data = await response.json();
              console.log(`Fetched points for ${seUsername}: ${data.points}`);
              return {
                user_id: user.user_id,
                se_username: seUsername,
                se_channel_id: channelId,
                se_jwt_token: jwtToken,
                current_points: data.points || 0,
                email: userEmail,
                has_connection: !!connection,
                connected_at: connection?.connected_at || new Date().toISOString(),
                se_status: 'active'
              };
            } else if (response.status === 404) {
              // User doesn't exist in SE yet - they'll be created when points are added
              console.log(`[!]  User ${seUsername} not found in StreamElements (will be created on first points add)`);
              return {
                user_id: user.user_id,
                se_username: seUsername,
                se_channel_id: channelId,
                se_jwt_token: jwtToken,
                current_points: 0,
                email: userEmail,
                has_connection: !!connection,
                connected_at: connection?.connected_at || new Date().toISOString(),
                se_status: 'not_in_se'
              };
            } else {
              console.error(`Failed to fetch points for ${seUsername}: ${response.status} ${response.statusText}`);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch points for ${seUsername}`, err);
        }

        return {
          user_id: user.user_id,
          se_username: seUsername || userEmail,
          se_channel_id: channelId,
          se_jwt_token: jwtToken,
          current_points: 0,
          email: userEmail,
          has_connection: !!connection,
          connected_at: connection?.connected_at || new Date().toISOString(),
          se_status: 'error'
        };
      })
    );

      console.log('Users with points:', usersWithPoints.length);
      setUsers(usersWithPoints);
    } catch (err) {
      console.error('Error in loadUsers:', err);
      setError('Failed to load users: ' + err.message);
    }
  };

  const loadRedemptions = async () => {
    // Add timestamp to prevent caching
    const { data: redemptionsData, error } = await supabase
      .from('point_redemptions')
      .select('id, user_id, redemption_id, points_spent, redeemed_at, processed, status')
      .order('redeemed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading redemptions:', error);
      throw error;
    }

    console.log('Loaded redemptions with status:', redemptionsData);

    // Get unique user IDs
    const userIds = [...new Set(redemptionsData.map(r => r.user_id))];
    
    // Fetch emails, Twitch usernames, and SE usernames for users
    const emailMap = {};
    const twitchUsernameMap = {};
    const seUsernameMap = {};
    
    await Promise.all(
      userIds.map(async (userId) => {
        const { data: emailData } = await supabase
          .rpc('get_user_email', { user_id: userId });
        emailMap[userId] = emailData || 'Unknown';
        
        // Get Twitch username from metadata
        const { data: metadata } = await supabase
          .rpc('get_user_metadata', { user_id: userId });
        
        if (metadata?.identities) {
          const twitchIdentity = metadata.identities.find(id => id.provider === 'twitch');
          if (twitchIdentity?.identity_data?.preferred_username) {
            twitchUsernameMap[userId] = twitchIdentity.identity_data.preferred_username;
          } else {
            twitchUsernameMap[userId] = emailData?.split('@')[0] || 'Unknown';
          }
        } else {
          twitchUsernameMap[userId] = emailData?.split('@')[0] || 'Unknown';
        }
      })
    );

    // Get SE connections for usernames
    const { data: connections } = await supabase
      .from('streamelements_connections')
      .select('*');
    
    if (connections) {
      connections.forEach(conn => {
        if (conn.se_username) {
          seUsernameMap[conn.user_id] = conn.se_username;
        }
      });
    }

    // Get redemption items
    const { data: items } = await supabase
      .from('redemption_items')
      .select('*');
    
    const itemMap = {};
    if (items) {
      items.forEach(item => {
        itemMap[item.id] = item;
      });
    }

    // Combine data
    const enrichedRedemptions = redemptionsData.map(redemption => ({
      ...redemption,
      user: { 
        email: emailMap[redemption.user_id] || 'Unknown',
        twitchUsername: twitchUsernameMap[redemption.user_id] || 'Unknown',
        seUsername: seUsernameMap[redemption.user_id] || null
      },
      item: itemMap[redemption.redemption_id] || { name: 'Deleted Item', point_cost: 0 }
    }));

    setRedemptions(enrichedRedemptions);
  };

  const loadRedemptionItems = async () => {
    const { data, error } = await supabase
      .from('redemption_items')
      .select('*')
      .order('point_cost', { ascending: true });

    if (error) throw error;
    setRedemptionItems(data || []);
  };

  const loadGameSessions = async () => {
    const { data: sessionsData, error } = await supabase
      .from('game_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Get unique user IDs
    const userIds = [...new Set(sessionsData.map(s => s.user_id))];
    
    // Fetch emails for users
    const emailMap = {};
    await Promise.all(
      userIds.map(async (userId) => {
        const { data: emailData } = await supabase
          .rpc('get_user_email', { user_id: userId });
        emailMap[userId] = emailData || 'Unknown';
      })
    );

    // Get SE usernames from streamelements_connections table
    const { data: seAccounts } = await supabase
      .from('streamelements_connections')
      .select('user_id, se_username');

    const seUsernameMap = {};
    if (seAccounts) {
      seAccounts.forEach(account => {
        seUsernameMap[account.user_id] = account.se_username;
      });
    }

    // Enrich sessions with user data
    const enrichedSessions = sessionsData.map(session => ({
      ...session,
      user_email: emailMap[session.user_id] || 'Unknown',
      se_username: seUsernameMap[session.user_id] || 'Not Connected'
    }));

    setGameSessions(enrichedSessions);
  };

  const handleAddPoints = async (amount) => {
    if (!selectedUser || !amount) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Use the user's connection credentials if available, otherwise use defaults
      const channelId = selectedUser.se_channel_id || SE_CHANNEL_ID;
      const jwtToken = selectedUser.se_jwt_token || SE_JWT_TOKEN;
      
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${channelId}/${selectedUser.se_username}/${amount}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update points: ${errorText}`);
      }

      setSuccess(`Successfully ${amount > 0 ? 'added' : 'removed'} ${Math.abs(amount)} points ${amount > 0 ? 'to' : 'from'} ${selectedUser.se_username}`);
      setShowPointsModal(false);
      setPointsAmount('');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let imageUrl = itemForm.image_url;
      
      // Upload image if a new file was selected
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const itemData = {
        name: itemForm.name,
        description: itemForm.description,
        point_cost: parseInt(itemForm.point_cost),
        reward_type: itemForm.reward_type,
        reward_value: {
          details: itemForm.reward_details,
          reward_type: itemForm.reward_type,
          se_points_amount: itemForm.reward_type === 'se_points_reward' ? parseInt(itemForm.se_points_amount) || 0 : null
        },
        image_url: imageUrl || null,
        available_units: itemForm.available_units ? parseInt(itemForm.available_units) : null,
        is_active: true
      };

      if (editingItem) {
        // Update existing
        const { error } = await supabase
          .from('redemption_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        setSuccess('Redemption item updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('redemption_items')
          .insert(itemData);

        if (error) throw error;
        setSuccess('Redemption item created successfully');
      }

      setShowItemModal(false);
      setEditingItem(null);
      setImageFile(null);
      setItemForm({
        name: '',
        description: '',
        point_cost: '',
        reward_type: 'custom',
        reward_details: '',
        image_url: '',
        available_units: '',
        se_points_amount: ''
      });
      await loadRedemptionItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (item) => {
    try {
      const { error } = await supabase
        .from('redemption_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      await loadRedemptionItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this redemption item?')) return;

    try {
      const { error } = await supabase
        .from('redemption_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setSuccess('Redemption item deleted');
      await loadRedemptionItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveRedemption = async (redemptionId) => {
    try {
      setLoading(true);
      setError('');
      
      // Get redemption details with item info
      const redemption = redemptions.find(r => r.id === redemptionId);
      
      // Check if this is an SE Points Reward type
      if (redemption?.item?.reward_type === 'se_points_reward' && redemption?.item?.reward_value?.se_points_amount) {
        const sePointsToAward = redemption.item.reward_value.se_points_amount;
        
        // Get user's SE connection
        const { data: connection } = await supabase
          .from('streamelements_connections')
          .select('*')
          .eq('user_id', redemption.user_id)
          .single();

        let channelId, jwtToken, seUsername;
        
        if (connection) {
          channelId = connection.se_channel_id;
          jwtToken = connection.se_jwt_token;
          seUsername = connection.se_username;
        } else {
          channelId = SE_CHANNEL_ID;
          jwtToken = SE_JWT_TOKEN;
          seUsername = redemption.user?.seUsername || redemption.user?.twitchUsername;
        }

        if (seUsername && channelId && jwtToken) {
          console.log(`Awarding ${sePointsToAward} SE points to ${seUsername}`);
          
          const awardResponse = await fetch(
            `https://api.streamelements.com/kappa/v2/points/${channelId}/${seUsername}/${sePointsToAward}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Accept': 'application/json'
              }
            }
          );

          if (!awardResponse.ok) {
            const errorText = await awardResponse.text();
            throw new Error(`Failed to award SE points: ${errorText}`);
          }
          
          console.log(`Successfully awarded ${sePointsToAward} SE points to ${seUsername}`);
        } else {
          console.warn('Could not award SE points - missing user SE info');
        }
      }
      
      const { data, error } = await supabase
        .from('point_redemptions')
        .update({ processed: true, status: 'approved' })
        .eq('id', redemptionId)
        .select();

      console.log('Approve result:', { data, error, redemptionId });

      if (error) throw error;
      
      setSuccess('Redemption approved' + (redemption?.item?.reward_type === 'se_points_reward' ? ' and SE points awarded!' : ''));
      
      // Wait a moment for DB to commit
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Force complete reload
      await loadRedemptions();
    } catch (err) {
      console.error('Approve error:', err);
      setError('Failed to approve: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDenyRedemption = async (redemption) => {
    if (!confirm('Are you sure you want to deny this redemption? Points will be refunded to the user.')) return;

    try {
      setLoading(true);
      setError('');
      
      // Get user's SE connection if they have one
      const { data: connection } = await supabase
        .from('streamelements_connections')
        .select('*')
        .eq('user_id', redemption.user_id)
        .single();

      // Determine which credentials to use
      let channelId, jwtToken, seUsername;
      
      if (connection) {
        // User has their own connection
        channelId = connection.se_channel_id;
        jwtToken = connection.se_jwt_token;
        seUsername = connection.se_username;
      } else {
        // Use streamer's credentials
        channelId = SE_CHANNEL_ID;
        jwtToken = SE_JWT_TOKEN;
        
        // Get user metadata to find their SE username
        const { data: metadata } = await supabase
          .rpc('get_user_metadata', { user_id: redemption.user_id });
        
        let twitchUsername = null;
        if (metadata?.identities) {
          const twitchIdentity = metadata.identities.find(i => i.provider === 'twitch');
          if (twitchIdentity?.identity_data) {
            twitchUsername = twitchIdentity.identity_data.preferred_username || 
                            twitchIdentity.identity_data.user_name;
          }
        }
        
        seUsername = twitchUsername || redemption.user?.email?.split('@')[0] || 'unknown';
      }

      console.log(`Refunding ${redemption.points_spent} points to ${seUsername}`);

      // Refund points via SE API
      const refundResponse = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${channelId}/${seUsername}/${redemption.points_spent}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!refundResponse.ok) {
        const errorText = await refundResponse.text();
        throw new Error(`Failed to refund points: ${errorText}`);
      }

      // Restore stock if applicable
      const { data: item } = await supabase
        .from('redemption_items')
        .select('available_units')
        .eq('id', redemption.redemption_id)
        .single();

      if (item && item.available_units !== null) {
        await supabase
          .from('redemption_items')
          .update({ available_units: item.available_units + 1 })
          .eq('id', redemption.redemption_id);
      }

      // Mark as denied
      const { error } = await supabase
        .from('point_redemptions')
        .update({ processed: true, status: 'denied' })
        .eq('id', redemption.id);

      if (error) throw error;
      
      setSuccess('Redemption denied and points refunded');
      // Force reload to get fresh data
      setRedemptions([]);
      await loadRedemptions();
    } catch (err) {
      setError('Failed to deny redemption: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="points-manager">
      <div className="pm-header">
        <h1>Points Manager</h1>
        <p>Manage StreamElements points, redemptions, and rewards</p>
      </div>

      {/* Stats Row */}
      <div className="pm-stats-row">
        <div className="pm-stat-card-top">
          <div className="stat-label">Total Points</div>
          <div className="stat-value">{users.reduce((sum, u) => sum + (u.current_points || 0), 0).toLocaleString()}</div>
        </div>
        <div className="pm-stat-card-top">
          <div className="stat-label">Active Users</div>
          <div className="stat-value">{users.filter(u => u.se_status === 'active').length}</div>
        </div>
        <div className="pm-stat-card-top">
          <div className="stat-label">Pending Redemptions</div>
          <div className="stat-value warning">{redemptions.filter(r => !r.status || r.status === 'pending').length}</div>
        </div>
        <div className="pm-stat-card-top">
          <div className="stat-label">Avg Points/User</div>
          <div className="stat-value">{users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.current_points || 0), 0) / users.length).toLocaleString() : 0}</div>
        </div>
      </div>

      {error && <div className="pm-error">{error}</div>}
      {success && <div className="pm-success">{success}</div>}

      <div className="pm-tabs">
        <button
          className={`pm-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users <span className="tab-count">{users.length}</span>
        </button>
        <button
          className={`pm-tab ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          Game History <span className="tab-count">{gameSessions.length}</span>
        </button>
        <button
          className={`pm-tab ${activeTab === 'redemptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('redemptions')}
        >
          Redemptions <span className="tab-count">{redemptions.filter(r => !r.status || r.status === 'pending').length}</span>
        </button>
        <button
          className={`pm-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Items <span className="tab-count">{redemptionItems.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="pm-loading">Loading...</div>
      ) : (
        <>
          {activeTab === 'users' && (
            <div className="pm-users">
              <div className="pm-toolbar">
                <input
                  type="text"
                  className="pm-search-input"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="pm-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="not_in_se">Not in SE</option>
                  <option value="error">Error</option>
                </select>
                <button onClick={loadUsers} className="pm-refresh-btn">
                  ↻ Refresh
                </button>
              </div>
              <div className="pm-table-container">
                <table className="pm-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>SE Username</th>
                      <th>Points</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredUsers = users.filter(user => {
                        const matchesSearch = !searchQuery || 
                          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.se_username?.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = statusFilter === 'all' || user.se_status === statusFilter;
                        return matchesSearch && matchesStatus;
                      });
                      const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                      const paginatedUsers = filteredUsers.slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      );
                      return paginatedUsers.map((user) => {
                        const maxPoints = Math.max(...users.map(u => u.current_points || 0), 1);
                        const pointsPercent = ((user.current_points || 0) / maxPoints) * 100;
                        return (
                          <tr key={user.id || user.user_id}>
                            <td>
                              <div className="pm-user-cell">
                                <div className="pm-user-avatar">
                                  {(user.se_username || user.email || 'U')[0].toUpperCase()}
                                </div>
                                <div className="pm-user-info">
                                  <div className="pm-user-name">{user.se_username || 'Unknown'}</div>
                                  <div className="pm-user-email">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>{user.se_username}</td>
                            <td>
                              <div className="pm-points-cell">
                                <span className="pm-points-value">{(user.current_points || 0).toLocaleString()}</span>
                                <div className="pm-points-bar">
                                  <div className="pm-points-bar-fill" style={{ width: `${pointsPercent}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td>
                              {user.se_status === 'active' && (
                                <span className="pm-badge pm-badge-success">
                                  <span className="pm-badge-dot"></span>
                                  Active
                                </span>
                              )}
                              {user.se_status === 'not_in_se' && (
                                <span className="pm-badge pm-badge-warning">
                                  <span className="pm-badge-dot"></span>
                                  Not in SE
                                </span>
                              )}
                              {user.se_status === 'error' && (
                                <span className="pm-badge pm-badge-danger">
                                  <span className="pm-badge-dot"></span>
                                  Error
                                </span>
                              )}
                              {!user.se_status && (
                                <span className="pm-badge pm-badge-neutral">
                                  Unknown
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="pm-actions-menu">
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setPointsAction('add');
                                    setShowPointsModal(true);
                                  }}
                                  className="pm-action-btn edit"
                                >
                                  Edit Points
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="pm-empty">
                    <div className="pm-empty-icon">👥</div>
                    <div className="pm-empty-title">No users connected yet</div>
                    <div className="pm-empty-description">Users will appear here after connecting their StreamElements account</div>
                  </div>
                )}
              </div>
              {/* Users Pagination */}
              {(() => {
                const filteredUsers = users.filter(user => {
                  const matchesSearch = !searchQuery || 
                    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    user.se_username?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesStatus = statusFilter === 'all' || user.se_status === statusFilter;
                  return matchesSearch && matchesStatus;
                });
                const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                if (totalPages <= 1) return null;
                return (
                  <div className="pm-table-pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="pm-pagination-btn"
                    >
                      ← Previous
                    </button>
                    <span className="pm-pagination-info">
                      Page {currentPage} of {totalPages} ({filteredUsers.length} users)
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="pm-pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'games' && (
            <div className="pm-games">
              <div className="pm-toolbar">
                <input
                  type="text"
                  className="pm-search-input"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="pm-filter-select"
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                >
                  <option value="all">All Games</option>
                  <option value="blackjack">Blackjack</option>
                  <option value="mines">Mines</option>
                  <option value="coinflip">Coin Flip</option>
                </select>
                <button onClick={loadGameSessions} className="pm-refresh-btn">
                  ↻ Refresh
                </button>
              </div>
              <div className="pm-table-container">
                <table className="pm-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Game</th>
                      <th>Bet</th>
                      <th>Result</th>
                      <th>Profit/Loss</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredSessions = gameSessions.filter(session => {
                        const matchesSearch = !searchQuery || 
                          session.se_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          session.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesGame = gameFilter === 'all' || session.game_type === gameFilter;
                        return matchesSearch && matchesGame;
                      });
                      const paginatedSessions = filteredSessions.slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      );
                      return paginatedSessions.map((session) => {
                      const profitLoss = session.result_amount - session.bet_amount;
                      const isWin = profitLoss > 0;
                      const isPush = profitLoss === 0;
                      
                      return (
                        <tr key={session.id}>
                          <td>
                            <div className="pm-user-cell">
                              <div className="pm-user-avatar">
                                {(session.se_username || session.user_email || 'U')[0].toUpperCase()}
                              </div>
                              <div className="pm-user-info">
                                <div className="pm-user-name">{session.se_username}</div>
                                <div className="pm-user-email">{session.user_email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`pm-game-badge ${session.game_type}`}>
                              {session.game_type === 'blackjack' && '🃏 Blackjack'}
                              {session.game_type === 'mines' && '💣 Mines'}
                              {session.game_type === 'coinflip' && '🪙 Coin Flip'}
                              {!['blackjack', 'mines', 'coinflip'].includes(session.game_type) && session.game_type}
                            </span>
                          </td>
                          <td>{session.bet_amount.toLocaleString()} pts</td>
                          <td>{session.result_amount.toLocaleString()} pts</td>
                          <td>
                            <span className={`pm-profit-loss ${isWin ? 'win' : isPush ? 'push' : 'loss'}`}>
                              {isWin && '+'}
                              {profitLoss.toLocaleString()} pts
                            </span>
                          </td>
                          <td>{new Date(session.created_at).toLocaleString()}</td>
                        </tr>
                      );
                    });
                    })()}
                  </tbody>
                </table>
                {gameSessions.length === 0 && (
                  <div className="pm-empty">
                    <div className="pm-empty-icon">🎮</div>
                    <div className="pm-empty-title">No game sessions yet</div>
                    <div className="pm-empty-description">Game sessions will appear here as users play</div>
                  </div>
                )}
              </div>

              {/* Games Pagination */}
              {(() => {
                const filteredSessions = gameSessions.filter(session => {
                  const matchesSearch = !searchQuery || 
                    session.se_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    session.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesGame = gameFilter === 'all' || session.game_type === gameFilter;
                  return matchesSearch && matchesGame;
                });
                const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
                if (totalPages <= 1) return null;
                return (
                  <div className="pm-table-pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="pm-pagination-btn"
                    >
                      ← Previous
                    </button>
                    <span className="pm-pagination-info">
                      Page {currentPage} of {totalPages} ({filteredSessions.length} games)
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="pm-pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                );
              })()}

              {/* Game Statistics Summary */}
              {gameSessions.length > 0 && (
                <div className="pm-stats-summary">
                  <h3>Statistics</h3>
                  <div className="pm-stats-grid">
                    <div className="pm-stat-card">
                      <div className="pm-stat-label">Total Games</div>
                      <div className="pm-stat-value">{gameSessions.length}</div>
                    </div>
                    <div className="pm-stat-card">
                      <div className="pm-stat-label">Total Wagered</div>
                      <div className="pm-stat-value">
                        {gameSessions.reduce((sum, s) => sum + s.bet_amount, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="pm-stat-card">
                      <div className="pm-stat-label">House Edge</div>
                      <div className={`pm-stat-value ${
                        gameSessions.reduce((sum, s) => sum + (s.result_amount - s.bet_amount), 0) > 0 ? 'loss' : 'win'
                      }`}>
                        {(-gameSessions.reduce((sum, s) => sum + (s.result_amount - s.bet_amount), 0)).toLocaleString()}
                      </div>
                    </div>
                    <div className="pm-stat-card">
                      <div className="pm-stat-label">Player Win Rate</div>
                      <div className="pm-stat-value">
                        {((gameSessions.filter(s => s.result_amount > s.bet_amount).length / gameSessions.length) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'redemptions' && (
            <div className="pm-redemptions">
              <div className="pm-toolbar">
                <input
                  type="text"
                  className="pm-search-input"
                  placeholder="Search redemptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="pm-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </select>
                <button onClick={loadRedemptions} className="pm-refresh-btn">
                  ↻ Refresh
                </button>
              </div>
              <div className="pm-table-container">
                <table className="pm-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Item</th>
                      <th>Points Spent</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredRedemptions = redemptions.filter(redemption => {
                        const currentStatus = redemption.status || (redemption.processed ? 'approved' : 'pending');
                        const matchesSearch = !searchQuery || 
                          redemption.user?.twitchUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          redemption.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          redemption.item?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
                        return matchesSearch && matchesStatus;
                      });
                      const paginatedRedemptions = filteredRedemptions.slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      );
                      return paginatedRedemptions.map((redemption) => (
                      <tr key={redemption.id}>
                        <td>
                          <div className="pm-user-cell">
                            <div className="pm-user-avatar">
                              {(redemption.user?.twitchUsername || redemption.user?.email || 'U')[0].toUpperCase()}
                            </div>
                            <div className="pm-user-info">
                              <div className="pm-user-name">{redemption.user?.twitchUsername || 'Unknown'}</div>
                              <div className="pm-user-email">{redemption.user?.seUsername || redemption.user?.email || 'Unknown'}</div>
                            </div>
                          </div>
                        </td>
                        <td>{redemption.item?.name || 'Deleted Item'}</td>
                        <td className="pm-points">{redemption.points_spent.toLocaleString()}</td>
                        <td>{new Date(redemption.redeemed_at).toLocaleString()}</td>
                        <td>
                          {(() => {
                            const currentStatus = redemption.status || (redemption.processed ? 'approved' : 'pending');
                            return (
                              <span className={`pm-badge pm-badge-${currentStatus === 'approved' ? 'success' : currentStatus === 'denied' ? 'danger' : 'warning'}`}>
                                <span className="pm-badge-dot"></span>
                                {currentStatus === 'approved' && 'Approved'}
                                {currentStatus === 'denied' && 'Denied'}
                                {currentStatus === 'pending' && 'Pending'}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          {!redemption.status || redemption.status === 'pending' ? (
                            <div className="pm-redemption-actions">
                              <button
                                onClick={() => handleApproveRedemption(redemption.id)}
                                className="pm-approve-btn"
                                title="Approve redemption"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleDenyRedemption(redemption)}
                                className="pm-deny-btn"
                                title="Deny and refund"
                              >
                                ✕ Deny
                              </button>
                            </div>
                          ) : (
                            <span className="pm-no-action">—</span>
                          )}
                        </td>
                      </tr>
                    ));
                    })()}
                  </tbody>
                </table>
                {redemptions.length === 0 && (
                  <div className="pm-empty">
                    <div className="pm-empty-icon">🎁</div>
                    <div className="pm-empty-title">No redemptions yet</div>
                    <div className="pm-empty-description">Redemptions will appear here when users claim rewards</div>
                  </div>
                )}
              </div>
              {/* Redemptions Pagination */}
              {(() => {
                const filteredRedemptions = redemptions.filter(redemption => {
                  const currentStatus = redemption.status || (redemption.processed ? 'approved' : 'pending');
                  const matchesSearch = !searchQuery || 
                    redemption.user?.twitchUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    redemption.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    redemption.item?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
                  return matchesSearch && matchesStatus;
                });
                const totalPages = Math.ceil(filteredRedemptions.length / itemsPerPage);
                if (totalPages <= 1) return null;
                return (
                  <div className="pm-table-pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="pm-pagination-btn"
                    >
                      ← Previous
                    </button>
                    <span className="pm-pagination-info">
                      Page {currentPage} of {totalPages} ({filteredRedemptions.length} redemptions)
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="pm-pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="pm-items">
              <div className="pm-toolbar">
                <input
                  type="text"
                  className="pm-search-input"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="pm-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Items</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setImageFile(null);
                    setItemForm({
                      name: '',
                      description: '',
                      point_cost: '',
                      reward_type: 'custom',
                      reward_details: '',
                      image_url: '',
                      available_units: ''
                    });
                    setShowItemModal(true);
                  }}
                  className="pm-add-btn"
                >
                  + Add Item
                </button>
              </div>
              <div className="pm-items-grid">
                {(() => {
                  const filteredItems = redemptionItems.filter(item => {
                    const matchesSearch = !searchQuery || 
                      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesStatus = statusFilter === 'all' || 
                      (statusFilter === 'active' && item.is_active) ||
                      (statusFilter === 'inactive' && !item.is_active);
                    return matchesSearch && matchesStatus;
                  });
                  const paginatedItems = filteredItems.slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  );
                  return paginatedItems.map((item) => (
                  <div key={item.id} className={`pm-item-card ${!item.is_active ? 'inactive' : ''}`}>
                    <div className="pm-item-header">
                      <h3>{item.name}</h3>
                      <div className="pm-item-cost">{item.point_cost.toLocaleString()} pts</div>
                    </div>
                    <p className="pm-item-description">{item.description}</p>
                    <div className="pm-item-meta">
                      <span>{item.reward_type}</span>
                      {item.available_units !== null && (
                        <span>📦 {item.available_units}</span>
                      )}
                      <span className={`pm-item-status ${item.is_active ? 'active' : 'inactive'}`}>
                        {item.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                    <div className="pm-item-actions">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setImageFile(null);
                          setItemForm({
                            name: item.name,
                            description: item.description,
                            point_cost: item.point_cost.toString(),
                            reward_type: item.reward_type || 'custom',
                            reward_details: item.reward_value?.details || item.reward_value?.duration_days || '',
                            image_url: item.image_url || '',
                            available_units: item.available_units ? item.available_units.toString() : '',
                            se_points_amount: item.reward_value?.se_points_amount ? item.reward_value.se_points_amount.toString() : ''
                          });
                          setShowItemModal(true);
                        }}
                        className="pm-edit-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleItem(item)}
                        className="pm-toggle-btn"
                      >
                        {item.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="pm-delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ));
                })()}
                {redemptionItems.length === 0 && (
                  <div className="pm-empty" style={{ gridColumn: '1 / -1' }}>
                    <div className="pm-empty-icon">🎁</div>
                    <div className="pm-empty-title">No redemption items yet</div>
                    <div className="pm-empty-description">Create items for users to redeem with their points</div>
                  </div>
                )}
              </div>
              {/* Items Pagination */}
              {(() => {
                const filteredItems = redemptionItems.filter(item => {
                  const matchesSearch = !searchQuery || 
                    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesStatus = statusFilter === 'all' || 
                    (statusFilter === 'active' && item.is_active) ||
                    (statusFilter === 'inactive' && !item.is_active);
                  return matchesSearch && matchesStatus;
                });
                const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
                if (totalPages <= 1) return null;
                return (
                  <div className="pm-table-pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="pm-pagination-btn"
                    >
                      ← Previous
                    </button>
                    <span className="pm-pagination-info">
                      Page {currentPage} of {totalPages} ({filteredItems.length} items)
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="pm-pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* Points Side Panel */}
      {showPointsModal && selectedUser && (
        <div className="pm-panel-overlay" onClick={() => setShowPointsModal(false)}>
          <div className="pm-side-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pm-panel-header">
              <h2>{userRole === 'admin' ? 'Edit' : pointsAction === 'add' ? 'Add' : 'Remove'} Points</h2>
              <button onClick={() => setShowPointsModal(false)} className="pm-panel-close">✕</button>
            </div>
            
            <div className="pm-panel-content">
              <div className="pm-panel-user-card">
                <div className="pm-user-avatar large">
                  {(selectedUser.se_username || 'U')[0].toUpperCase()}
                </div>
                <div className="pm-panel-user-info">
                  <div className="pm-panel-user-name">{selectedUser.se_username}</div>
                  <div className="pm-panel-user-email">{selectedUser.email}</div>
                </div>
              </div>

              <div className="pm-panel-stat">
                <span className="pm-panel-stat-label">Current Points</span>
                <span className="pm-panel-stat-value">{selectedUser.current_points.toLocaleString()}</span>
              </div>

              <div className="pm-form-group-new">
                <label>
                  {userRole === 'admin' 
                    ? 'Amount (positive to add, negative to remove)' 
                    : `Points to ${pointsAction === 'add' ? 'Add' : 'Remove'}`
                  }
                </label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder={userRole === 'admin' ? 'e.g., 1000 or -500' : 'e.g., 1000'}
                  min={userRole === 'moderator' ? '1' : undefined}
                  className="pm-input"
                />
              </div>

              {pointsAmount && (
                <div className="pm-panel-preview-change">
                  <span className="pm-panel-preview-label">New Balance</span>
                  <span className={`pm-panel-preview-value ${parseInt(pointsAmount) >= 0 ? 'positive' : 'negative'}`}>
                    {(selectedUser.current_points + parseInt(pointsAmount || 0)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="pm-panel-footer">
              <button
                onClick={() => setShowPointsModal(false)}
                className="pm-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amount = parseInt(pointsAmount);
                  if (userRole === 'admin') {
                    handleAddPoints(amount);
                  } else if (pointsAction === 'remove') {
                    handleAddPoints(-Math.abs(amount));
                  } else {
                    handleAddPoints(Math.abs(amount));
                  }
                }}
                disabled={!pointsAmount || loading}
                className="pm-btn-create"
              >
                {loading ? 'Updating...' : userRole === 'admin' ? 'Update Points' : `${pointsAction === 'add' ? 'Add' : 'Remove'} Points`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Side Panel */}
      {showItemModal && (
        <div className="pm-panel-overlay" onClick={() => setShowItemModal(false)}>
          <div className="pm-side-panel pm-side-panel-wide" onClick={(e) => e.stopPropagation()}>
            <div className="pm-panel-header">
              <h2>{editingItem ? 'Edit' : 'Create'} Redemption Item</h2>
              <button onClick={() => setShowItemModal(false)} className="pm-panel-close">✕</button>
            </div>

            <div className="pm-panel-content-split">
              {/* Form Section */}
              <div className="pm-panel-form-section">
                <div className="pm-form-group-new">
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g., Premium Access (30 Days)"
                    className="pm-input"
                  />
                </div>

                <div className="pm-form-group-new">
                  <label>Description</label>
                  <textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder="Describe what the user gets"
                    rows="3"
                    className="pm-textarea"
                  />
                </div>

                <div className="pm-form-row">
                  <div className="pm-form-group-new">
                    <label>Point Cost</label>
                    <input
                      type="number"
                      value={itemForm.point_cost}
                      onChange={(e) => setItemForm({ ...itemForm, point_cost: e.target.value })}
                      placeholder="15000"
                      className="pm-input"
                    />
                  </div>

                  <div className="pm-form-group-new">
                    <label>Available Units</label>
                    <input
                      type="number"
                      value={itemForm.available_units}
                      onChange={(e) => setItemForm({ ...itemForm, available_units: e.target.value })}
                      placeholder="Unlimited"
                      min="0"
                      className="pm-input"
                    />
                  </div>
                </div>

                <div className="pm-form-group-new">
                  <label>Reward Type</label>
                  <select
                    value={itemForm.reward_type}
                    onChange={(e) => setItemForm({ ...itemForm, reward_type: e.target.value })}
                    className="pm-select"
                  >
                    <option value="custom">Custom Reward</option>
                    <option value="se_points_reward">SE Points Reward</option>
                    <option value="premium_access">Premium Access</option>
                    <option value="exclusive_role">Exclusive Role</option>
                    <option value="bonus_entry">Bonus Entry</option>
                    <option value="special_feature">Special Feature</option>
                  </select>
                </div>

                {itemForm.reward_type === 'se_points_reward' && (
                  <div className="pm-form-group-new pm-se-points-info">
                    <label>SE Points to Award</label>
                    <input
                      type="number"
                      value={itemForm.se_points_amount || ''}
                      onChange={(e) => setItemForm({ ...itemForm, se_points_amount: e.target.value })}
                      placeholder="e.g., 5000"
                      min="1"
                      className="pm-input"
                    />
                    <small className="pm-hint">Players redeeming this will receive these SE points automatically when approved</small>
                  </div>
                )}

                <div className="pm-form-group-new">
                  <label>Reward Details</label>
                  <input
                    type="text"
                    value={itemForm.reward_details}
                    onChange={(e) => setItemForm({ ...itemForm, reward_details: e.target.value })}
                    placeholder="e.g., 30 days premium, VIP role, special badge"
                    className="pm-input"
                  />
                </div>

                <div className="pm-form-group-new">
                  <label>Item Image</label>
                  <div className="pm-file-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      id="image-upload"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="image-upload" className="pm-file-upload-btn">
                      <span>Choose Image</span>
                    </label>
                    {imageFile && (
                      <span className="pm-file-name">{imageFile.name}</span>
                    )}
                    {itemForm.image_url && !imageFile && (
                      <span className="pm-file-name">Current: {itemForm.image_url.split('/').pop()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview Section */}
              <div className="pm-panel-preview-section">
                <div className="pm-preview-header">
                  <h3>Live Preview</h3>
                  <span className="pm-preview-badge">Points Store</span>
                </div>
                
                <div className="pm-preview-card">
                  {(itemForm.image_url || imageFile) && (
                    <div className="pm-preview-image">
                      <img 
                        src={imageFile ? URL.createObjectURL(imageFile) : itemForm.image_url} 
                        alt="Preview" 
                      />
                    </div>
                  )}
                  
                  <div className="pm-preview-content">
                    <div className="pm-preview-header-info">
                      <h4>{itemForm.name || 'Item Name'}</h4>
                      <div className="pm-preview-cost">
                        {itemForm.point_cost || '0'} pts
                      </div>
                    </div>
                    
                    <p className="pm-preview-description">
                      {itemForm.description || 'Item description will appear here...'}
                    </p>
                    
                    {itemForm.reward_details && (
                      <div className="pm-preview-details">
                        <span className="pm-preview-icon">✦</span>
                        {itemForm.reward_details}
                      </div>
                    )}
                    
                    {itemForm.reward_type && (
                      <div className="pm-preview-type">
                        {itemForm.reward_type.replace('_', ' ').toUpperCase()}
                      </div>
                    )}
                    
                    {itemForm.available_units && (
                      <div className="pm-preview-stock">
                        {itemForm.available_units} units available
                      </div>
                    )}
                    
                    <button className="pm-preview-redeem-btn">
                      Redeem Now
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pm-panel-footer">
              <button
                onClick={() => setShowItemModal(false)}
                className="pm-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={!itemForm.name || !itemForm.point_cost || loading || uploadingImage}
                className="pm-btn-create"
              >
                {uploadingImage ? 'Uploading...' : loading ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

