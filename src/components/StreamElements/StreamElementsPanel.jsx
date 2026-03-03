import { useState, useEffect } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';

export default function StreamElementsPanel() {
  const {
    seAccount,
    points,
    loading,
    error,
    linkAccount,
    unlinkAccount,
    redeemPoints,
    refreshPoints,
    isConnected,
    autoConnecting
  } = useStreamElements();

  const { user } = useAuth();

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [jwtToken, setJwtToken] = useState('');
  const [username, setUsername] = useState('');
  const [linkError, setLinkError] = useState('');
  const [redemptionItems, setRedemptionItems] = useState([]);
  const [redeeming, setRedeeming] = useState(null);
  const [allRedemptions, setAllRedemptions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isTwitchUser, setIsTwitchUser] = useState(false);
  const [seCredentialsConfigured, setSeCredentialsConfigured] = useState(false);

  useEffect(() => {
    checkIfTwitchUser();
    checkSeCredentials();
    loadRedemptionItems();
    loadAllRedemptions();
  }, []);

  const checkSeCredentials = () => {
    const channelId = import.meta.env.VITE_SE_CHANNEL_ID;
    const jwtToken = import.meta.env.VITE_SE_JWT_TOKEN;
    setSeCredentialsConfigured(!!(channelId && jwtToken));
  };

  const checkIfTwitchUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.app_metadata?.provider === 'twitch') {
        setIsTwitchUser(true);
      }
    } catch (err) {
      console.error('Error checking user provider:', err);
    }
  };

  const loadRedemptionItems = async () => {
    try {
      const { data, error } = await supabase
        .from('redemption_items')
        .select('*')
        .neq('reward_type', 'se_points_reward') // Exclude SE Points Reward items (for Season Pass only)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('point_cost', { ascending: true });

      if (error) throw error;
      
      console.log('Loaded redemption items:', data);
      if (data && data.length > 0) {
        console.log('First item reward_details:', data[0].reward_details);
      }
      
      setRedemptionItems(data || []);
    } catch (err) {
      console.error('Error loading redemption items:', err);
    }
  };

  const loadAllRedemptions = async () => {
    try {
      const { data, error } = await supabase
        .from('point_redemptions')
        .select(`
          *,
          redemption_items (
            name,
            point_cost,
            image_url
          )
        `)
        .order('redeemed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Fetch usernames separately from streamelements_connections
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: seConnections } = await supabase
          .from('streamelements_connections')
          .select('user_id, se_username')
          .in('user_id', userIds);
        
        // Map usernames to redemptions
        const usernameMap = {};
        seConnections?.forEach(conn => {
          usernameMap[conn.user_id] = conn.se_username;
        });
        
        const enrichedData = data.map(redemption => ({
          ...redemption,
          username: usernameMap[redemption.user_id] || 'User'
        }));
        
        setAllRedemptions(enrichedData);
      } else {
        setAllRedemptions(data || []);
      }
    } catch (err) {
      console.error('Error loading redemptions:', err);
    }
  };

  const handleLinkAccount = async (e) => {
    e.preventDefault();
    setLinkError('');

    if (!channelId || !jwtToken) {
      setLinkError('Please fill in all fields');
      return;
    }

    const result = await linkAccount(channelId, jwtToken, username);
    
    if (result.success) {
      setShowLinkForm(false);
      setChannelId('');
      setJwtToken('');
      setUsername('');
    } else {
      setLinkError(result.error);
    }
  };

  const handleUnlink = async () => {
    if (confirm('Are you sure you want to unlink your StreamElements account?')) {
      await unlinkAccount();
    }
  };

  const handleRedeem = async (item) => {
    if (points < item.point_cost) {
      alert('You don\'t have enough points for this redemption!');
      return;
    }

    // Check if item is out of stock
    if (item.available_units !== null && item.available_units <= 0) {
      alert('This item is out of stock!');
      return;
    }

    if (!confirm(`Redeem "${item.name}" for ${item.point_cost.toLocaleString()} points?`)) {
      return;
    }

    console.log('Full item object:', item);
    console.log('Item.id specifically:', item.id);
    console.log('All item keys:', Object.keys(item));
    setRedeeming(item.id);
    const result = await redeemPoints(item.id, item.point_cost);
    setRedeeming(null);

    if (result.success) {
      alert('Redemption successful! Your reward has been applied.');
      await refreshPoints();
      await loadRedemptionItems(); // Reload items to update stock count
      await loadAllRedemptions(); // Reload redemption history
    } else {
      console.error('Redemption failed:', result.error);
      alert(`Redemption failed: ${result.error}\n\nPlease contact an admin if this issue persists.`);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 md:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-purple-400 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-3 flex items-center gap-3">
            <span className="text-5xl">🎁</span> StreamElements Points
          </h2>
          <p className="text-gray-300 text-base md:text-lg">Link your StreamElements account to redeem loyalty points for rewards</p>
        </div>

        {/* Link Account Form */}
        {showLinkForm && !isConnected && (
          <div className="relative bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 md:p-10 mb-10 shadow-2xl shadow-purple-500/10">
            <form onSubmit={handleLinkAccount} className="max-w-2xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">Link StreamElements Account</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-purple-400 mb-2 uppercase tracking-wide">Channel ID</label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="Your SE Channel ID"
                    className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                  <small className="text-gray-400 text-xs mt-1 block">Find this in your SE dashboard URL</small>
                </div>

                <div>
                  <label className="block text-sm font-bold text-purple-400 mb-2 uppercase tracking-wide">JWT Token</label>
                  <input
                    type="password"
                    value={jwtToken}
                    onChange={(e) => setJwtToken(e.target.value)}
                    placeholder="Your SE JWT Token"
                    className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                  <small className="text-gray-400 text-xs mt-1 block">
                    Get this from StreamElements → Account → Show secrets → JWT Token
                  </small>
                </div>

                <div>
                  <label className="block text-sm font-bold text-purple-400 mb-2 uppercase tracking-wide">Username (Optional)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your SE username"
                    className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                </div>

                {linkError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {linkError}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-black py-4 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/60 hover:scale-105"
                  >
                    {loading ? '⏳ Connecting...' : '🔗 Connect Account'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowLinkForm(false);
                      setLinkError('');
                    }}
                    className="flex-1 bg-gray-700/50 border border-gray-600 text-gray-300 font-bold py-4 px-6 rounded-2xl hover:bg-gray-600/50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Not Connected Banner */}
        {!isConnected && !isTwitchUser && !showLinkForm && (
          <div className="relative bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-xl border-2 border-purple-500/50 rounded-3xl p-8 mb-10 shadow-2xl shadow-purple-500/20">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 flex items-center gap-2">
              <span>🔒</span> Connect to Redeem
            </h3>
            <p className="text-gray-300 mb-6">Link your StreamElements account to view your points balance and redeem rewards!</p>
            <button 
              onClick={() => setShowLinkForm(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-black py-4 px-8 rounded-2xl transition-all duration-300 shadow-xl shadow-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/60 hover:scale-105"
            >
              🔗 Connect StreamElements
            </button>
          </div>
        )}

        {/* Auto-connecting */}
        {autoConnecting && isTwitchUser && (
          <div className="relative bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl border border-purple-500/50 rounded-3xl p-8 mb-10 shadow-2xl shadow-purple-500/20">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="animate-spin">🔄</span> Connecting...
            </h3>
            <p className="text-gray-300">Syncing your StreamElements points...</p>
          </div>
        )}

        {/* Setup Required */}
        {!isConnected && !autoConnecting && isTwitchUser && !seCredentialsConfigured && (
          <div className="relative bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-xl border border-red-500/50 rounded-3xl p-8 mb-10 shadow-2xl shadow-red-500/20">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span>⚙️</span> Setup Required
            </h3>
            <p className="text-red-400 font-medium mb-2">StreamElements auto-sync is not configured yet. Contact the streamer!</p>
            <p className="text-gray-400 text-sm">The streamer needs to add their SE credentials to enable automatic point syncing for Twitch viewers.</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-2xl px-4 py-3 text-red-400 mb-8">
            {error}
          </div>
        )}

        {/* Available Redemptions */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white mb-6">Available Redemptions</h3>
          {redemptionItems.length === 0 ? (
            <div className="bg-[#13161d] border border-white/10 rounded-xl p-14 text-center">
              <div className="text-5xl mb-3">🎁</div>
              <p className="text-gray-500">No redemption items available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {redemptionItems.map(item => {
                const canAfford = isConnected && points >= item.point_cost;
                const isRedeeming = redeeming === item.id;
                const isOutOfStock = item.available_units !== null && item.available_units <= 0;
                const isDisabled = !item.is_active;
                const imageUrl = item.image_url || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&h=300&fit=crop';
                const dimmed = isDisabled || !canAfford || isOutOfStock || !isConnected;
                
                return (
                  <div 
                    key={item.id} 
                    className={`group flex flex-col bg-[#1a1e27] border border-[#2a2f3a] rounded-xl overflow-hidden transition-all duration-200 ${
                      dimmed ? 'opacity-45' : 'hover:border-purple-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-900/20'
                    }`}
                  >
                    {/* Image — aspect-ratio box, fills entire area */}
                    <div className="relative w-full bg-black/30 overflow-hidden" style={{ aspectRatio: '16/10' }}>
                      <img 
                        src={imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                      />
                      {isDisabled && (
                        <div className="absolute top-1.5 left-1.5 bg-yellow-500 text-black text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">SOON</div>
                      )}
                      {!isDisabled && isOutOfStock && (
                        <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">SOLD OUT</div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3 gap-1.5">
                      {/* Name + Points */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-[13px] font-bold text-white leading-tight line-clamp-1 flex-1">{item.name}</h4>
                        <span className="flex-shrink-0 text-[11px] font-bold text-purple-400 bg-purple-500/15 px-1.5 py-0.5 rounded border border-purple-500/25 whitespace-nowrap">
                          {item.point_cost >= 1000 ? `${(item.point_cost / 1000).toFixed(item.point_cost % 1000 === 0 ? 0 : 1)}k` : item.point_cost}
                        </span>
                      </div>
                      
                      {/* Description */}
                      <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{item.description}</p>
                      
                      {/* Reward detail */}
                      {(item.reward_details || item.reward_value?.details) && (
                        <div className="text-[11px] text-purple-300/70 leading-snug line-clamp-1 mt-auto">
                          🎁 {item.reward_details || item.reward_value?.details}
                        </div>
                      )}

                      {/* Stock */}
                      {item.available_units !== null && !isDisabled && (
                        <div className="text-[10px] text-gray-600">
                          Stock: <span className="text-gray-400 font-medium">{item.available_units}</span>
                        </div>
                      )}

                      {/* Button */}
                      <button
                        onClick={() => handleRedeem(item)}
                        disabled={!isConnected || isDisabled || !canAfford || isRedeeming || loading || isOutOfStock}
                        className={`w-full mt-1 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 ${
                          !isConnected || isDisabled || !canAfford || isOutOfStock
                            ? 'bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.06]'
                            : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-[0.97]'
                        }`}
                      >
                        {!isConnected ? '🔒 Connect' : isDisabled ? 'Soon' : isOutOfStock ? 'Sold Out' : isRedeeming ? '...' : canAfford ? '✨ Redeem' : '💰 Need More'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Redemptions - Compact Grid */}
        {allRedemptions.length > 0 && (
          <div className="relative bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/10">
            <div className="px-4 py-3 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-xl">📜</span> Recent Redemptions
                </h3>
                <span className="bg-purple-500/20 border border-purple-500/50 rounded-full px-3 py-1 text-xs font-bold text-purple-400">
                  {allRedemptions.length}
                </span>
              </div>
            </div>
            
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span>Item</span>
              <span>User</span>
              <span className="text-right">Points</span>
              <span className="text-center w-12">Status</span>
            </div>
            
            {/* Redemption Rows */}
            <div className="divide-y divide-white/5">
              {allRedemptions
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((redemption) => (
                  <div 
                    key={redemption.id} 
                    className="grid grid-cols-2 md:grid-cols-[1fr_1fr_auto_auto] gap-2 md:gap-4 px-4 py-2 hover:bg-purple-500/5 transition-colors items-center"
                  >
                    {/* Item Name */}
                    <div className="font-semibold text-white text-sm truncate">
                      {redemption.redemption_items?.is_special && <span className="text-yellow-400">⚡ </span>}
                      {redemption.redemption_items?.name || 'Unknown'}
                    </div>
                    
                    {/* Username */}
                    <div className="text-purple-400 text-sm truncate">
                      @{redemption.username}
                    </div>
                    
                    {/* Points */}
                    <div className="text-yellow-400 font-bold text-sm text-right whitespace-nowrap">
                      {redemption.points_spent.toLocaleString()} pts
                    </div>
                    
                    {/* Status */}
                    <div className="flex justify-center md:justify-end">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        redemption.processed 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                      }`}>
                        {redemption.processed ? '✓' : '○'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            
            {allRedemptions.length > itemsPerPage && (
              <div className="px-4 py-2 border-t border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-transparent">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 font-bold w-8 h-8 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  >
                    ‹
                  </button>
                  <span className="text-gray-400 text-sm">
                    Page {currentPage} of {Math.ceil(allRedemptions.length / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(allRedemptions.length / itemsPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(allRedemptions.length / itemsPerPage)}
                    className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 font-bold w-8 h-8 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
