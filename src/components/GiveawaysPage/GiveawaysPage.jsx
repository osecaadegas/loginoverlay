import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function GiveawaysPage() {
  const { user } = useAuth();
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(null);
  const [userEntries, setUserEntries] = useState({});
  const [successMessage, setSuccessMessage] = useState({});
  const [allParticipants, setAllParticipants] = useState([]);
  const [giveawayWinners, setGiveawayWinners] = useState({});

  useEffect(() => {
    fetchGiveaways();
    fetchAllParticipants();
    checkAndDrawExpiredGiveaways();
    if (user) {
      fetchUserEntries();
    }
  }, [user]);

  const checkAndDrawExpiredGiveaways = async () => {
    try {
      // Call the auto-draw API to check and draw winners for expired giveaways
      await fetch('/api/auto-draw-winners', {
        method: 'POST'
      });
      // Refresh giveaways after auto-draw
      setTimeout(() => fetchGiveaways(), 2000);
    } catch (error) {
      console.error('Error checking expired giveaways:', error);
    }
  };

  const fetchGiveaways = async () => {
    try {
      // Fetch active giveaways OR recently ended giveaways with winners (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('giveaways')
        .select(`
          *,
          giveaway_entries(count),
          giveaway_winners(user_id)
        `)
        .or(`is_active.eq.true,and(winners_drawn.eq.true,ends_at.gte.${sevenDaysAgo.toISOString()})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch winners SE usernames for each giveaway
      const winnersMap = {};
      for (const giveaway of (data || [])) {
        if (giveaway.giveaway_winners && giveaway.giveaway_winners.length > 0) {
          const winnerIds = giveaway.giveaway_winners.map(w => w.user_id);
          
          const { data: seAccounts } = await supabase
            .from('streamelements_connections')
            .select('user_id, se_username')
            .in('user_id', winnerIds);

          const { data: userProfiles } = await supabase
            .from('user_profiles')
            .select('user_id, twitch_username')
            .in('user_id', winnerIds);

          const seMap = {};
          seAccounts?.forEach(acc => seMap[acc.user_id] = acc.se_username);

          const twitchMap = {};
          userProfiles?.forEach(prof => {
            if (prof.twitch_username) twitchMap[prof.user_id] = prof.twitch_username;
          });

          winnersMap[giveaway.id] = giveaway.giveaway_winners.map(w => ({
            user_id: w.user_id,
            username: seMap[w.user_id] || twitchMap[w.user_id] || 'Unknown User'
          }));
        }
      }

      setGiveawayWinners(winnersMap);
      setGiveaways(data || []);
    } catch (error) {
      console.error('Error fetching giveaways:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaway_entries')
        .select('giveaway_id, tickets_count')
        .eq('user_id', user.id);

      if (error) throw error;

      const entriesMap = {};
      data?.forEach(entry => {
        entriesMap[entry.giveaway_id] = entry.tickets_count;
      });
      setUserEntries(entriesMap);
    } catch (error) {
      console.error('Error fetching user entries:', error);
    }
  };

  const fetchAllParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaway_entries')
        .select(`
          user_id,
          tickets_count,
          entered_at,
          giveaways (title, id)
        `)
        .order('entered_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get SE usernames
      const { data: seAccounts } = await supabase
        .from('streamelements_connections')
        .select('user_id, se_username');

      // Get Twitch usernames from user_profiles
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, twitch_username');

      const seUsernameMap = {};
      if (seAccounts) {
        seAccounts.forEach(account => {
          seUsernameMap[account.user_id] = account.se_username;
        });
      }

      // Create Twitch username map from user_profiles
      const twitchUsernameMap = {};
      if (userProfiles) {
        userProfiles.forEach(profile => {
          if (profile.twitch_username) {
            twitchUsernameMap[profile.user_id] = profile.twitch_username;
          }
        });
      }

      // Check who won
      const { data: winners } = await supabase
        .from('giveaway_winners')
        .select('user_id, giveaway_id');

      const winnerMap = {};
      winners?.forEach(w => {
        if (!winnerMap[w.giveaway_id]) winnerMap[w.giveaway_id] = [];
        winnerMap[w.giveaway_id].push(w.user_id);
      });

      // Enrich entries with SE usernames or Twitch usernames
      const enriched = data?.map(entry => ({
        ...entry,
        username: seUsernameMap[entry.user_id] || twitchUsernameMap[entry.user_id] || 'Unknown User',
        giveaway_title: entry.giveaways?.title || 'Unknown Giveaway',
        status: winnerMap[entry.giveaways?.id]?.includes(entry.user_id) ? 'WON' : 'JOINED'
      })) || [];

      setAllParticipants(enriched);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchRecentWinners = async () => {
    // This function is no longer needed - winners shown on cards
  };

  const enterGiveaway = async (giveaway, additionalTickets = 1) => {
    if (!user) {
      alert('Please login to enter giveaways');
      return;
    }

    setEntering(giveaway.id);

    try {
      const totalCost = giveaway.ticket_cost * additionalTickets;

      // If there's a cost, handle SE points
      if (totalCost > 0) {
        const { data: seConnection } = await supabase
          .from('streamelements_connections')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!seConnection) {
          alert('Please connect your StreamElements account first in Points Store');
          setEntering(null);
          return;
        }

        // Check if user has enough points
        const pointsResponse = await fetch(
          `https://api.streamelements.com/kappa/v2/points/${seConnection.se_channel_id}/${seConnection.se_username}`,
          {
            headers: {
              'Authorization': `Bearer ${seConnection.se_jwt_token}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!pointsResponse.ok) throw new Error('Failed to fetch points');
        
        const pointsData = await pointsResponse.json();
        if (pointsData.points < totalCost) {
          alert(`Insufficient points. You need ${totalCost} points but have ${pointsData.points}`);
          setEntering(null);
          return;
        }

        // Deduct points
        const deductResponse = await fetch(
          `https://api.streamelements.com/kappa/v2/points/${seConnection.se_channel_id}/${seConnection.se_username}/-${totalCost}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${seConnection.se_jwt_token}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!deductResponse.ok) throw new Error('Failed to deduct points');
      }

      // Check if user already has entry
      const currentTickets = userEntries[giveaway.id] || 0;

      if (currentTickets > 0 && !giveaway.allow_multiple_tickets) {
        setSuccessMessage({ [giveaway.id]: { type: 'error', text: 'You have already entered this giveaway' } });
        setTimeout(() => setSuccessMessage({}), 5000);
        setEntering(null);
        return;
      }

      if (currentTickets > 0) {
        // Update existing entry
        const { error } = await supabase
          .from('giveaway_entries')
          .update({ 
            tickets_count: currentTickets + additionalTickets,
            total_cost: (currentTickets + additionalTickets) * giveaway.ticket_cost
          })
          .eq('giveaway_id', giveaway.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('giveaway_entries')
          .insert([{
            giveaway_id: giveaway.id,
            user_id: user.id,
            tickets_count: additionalTickets,
            total_cost: totalCost
          }]);

        if (error) throw error;
      }

      const newTicketCount = currentTickets + additionalTickets;
      setSuccessMessage({ 
        [giveaway.id]: { 
          type: 'success', 
          text: `You have bought ${newTicketCount} ticket${newTicketCount > 1 ? 's' : ''} for "${giveaway.title}"` 
        } 
      });
      setTimeout(() => setSuccessMessage({}), 5000);
      
      fetchUserEntries();
      fetchGiveaways();
      fetchAllParticipants();
    } catch (error) {
      console.error('Error entering giveaway:', error);
      alert('Failed to enter giveaway. Please try again.');
    } finally {
      setEntering(null);
    }
  };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20 text-white text-xl">Loading giveaways...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 md:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
            <span className="text-5xl">🎁</span> Giveaways & Raffles
          </h1>
          <p className="text-gray-300 text-base md:text-lg">Participate and win amazing prizes</p>
        </div>

        {/* Giveaways Grid */}
        {giveaways.length === 0 ? (
          <div className="relative bg-black/40 backdrop-blur-xl border border-yellow-500/30 rounded-3xl p-16 text-center shadow-2xl shadow-yellow-500/10">
            <div className="text-7xl mb-6">🎁</div>
            <h2 className="text-3xl font-bold text-white mb-3">No Active Giveaways</h2>
            <p className="text-gray-400 text-lg">Check back soon for new giveaways!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16">
            {giveaways.map((giveaway) => {
              const entriesCount = giveaway.giveaway_entries?.[0]?.count || 0;
              const userTickets = userEntries[giveaway.id] || 0;
              const winners = giveawayWinners[giveaway.id] || [];
              const isWinner = winners.some(w => w.user_id === user?.id);
              const isExpired = new Date(giveaway.ends_at) < new Date();
              const isEnded = !giveaway.is_active || isExpired;
              
              return (
                <div key={giveaway.id} className="group relative bg-black/40 backdrop-blur-xl border border-yellow-500/20 rounded-3xl overflow-hidden hover:border-yellow-500/60 hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/25">
                  {/* Winner Badge on Top */}
                  {winners.length > 0 && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-4 py-3 z-10 shadow-lg">
                      <div className="flex items-center justify-center gap-2 text-sm font-black text-black">
                        <span className="text-xl">🏆</span>
                        <span className="uppercase tracking-wide">WINNER: {winners.map(w => w.username).join(', ')}</span>
                      </div>
                    </div>
                  )}

                  {/* Success/Error Message */}
                  {successMessage[giveaway.id] && (
                    <div className={`absolute top-0 left-0 right-0 px-4 py-3 text-sm font-bold z-10 shadow-lg ${successMessage[giveaway.id].type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      <div className="flex items-center justify-center gap-2">
                        <span>{successMessage[giveaway.id].type === 'success' ? '✓' : '⚠'}</span>
                        <span>{successMessage[giveaway.id].text}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Image */}
                  {giveaway.image_url && (
                    <div className={`relative aspect-video overflow-hidden ${winners.length > 0 || successMessage[giveaway.id] ? 'mt-12' : ''}`}>
                      <img src={giveaway.image_url} alt={giveaway.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-4 right-4 bg-black/90 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold text-yellow-400 shadow-xl border border-yellow-500/30">
                        {isEnded ? '⏱ ENDED' : `⏱ ${getTimeRemaining(giveaway.ends_at)}`}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">{giveaway.title}</h3>
                    {giveaway.description && (
                      <p className="text-gray-400 text-sm mb-5 line-clamp-2">{giveaway.description}</p>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-2xl p-4 backdrop-blur-sm">
                        <div className="text-xs text-yellow-400/70 mb-1 font-semibold uppercase tracking-wide">Entry Cost</div>
                        <div className="text-lg font-black text-yellow-400">
                          {giveaway.ticket_cost === 0 ? 'FREE' : `${giveaway.ticket_cost} pts`}
                        </div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                        <div className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Winners</div>
                        <div className="text-lg font-black text-white">{giveaway.max_winners}</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                        <div className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Total Entries</div>
                        <div className="text-lg font-black text-white">{entriesCount}</div>
                      </div>
                      {userTickets > 0 && (
                        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/50 rounded-2xl p-4 backdrop-blur-sm">
                          <div className="text-xs text-green-400 mb-1 font-semibold uppercase tracking-wide">Your Tickets</div>
                          <div className="text-lg font-black text-green-400">{userTickets}</div>
                        </div>
                      )}
                    </div>

                    {/* Winner Highlight for Current User */}
                    {isWinner && (
                      <div className="bg-gradient-to-r from-yellow-500/30 to-yellow-600/20 border-2 border-yellow-500/70 rounded-2xl px-4 py-3 mb-5 text-center shadow-lg shadow-yellow-500/20">
                        <span className="text-yellow-400 font-black text-base">🏆 You Won This Giveaway!</span>
                      </div>
                    )}

                    {/* Action Button */}
                    {!user ? (
                      <button className="w-full bg-gray-700/50 border border-gray-600 text-gray-300 font-bold py-4 px-6 rounded-2xl cursor-not-allowed backdrop-blur-sm">
                        🔒 Login to Enter
                      </button>
                    ) : isEnded ? (
                      <button className="w-full bg-gray-700/50 border border-gray-600 text-gray-300 font-bold py-4 px-6 rounded-2xl cursor-not-allowed backdrop-blur-sm">
                        🔒 Giveaway Ended
                      </button>
                    ) : userTickets > 0 && !giveaway.allow_multiple_tickets ? (
                      <button className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-green-500/30 cursor-default">
                        ✓ Entered Successfully
                      </button>
                    ) : (
                      <button 
                        className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-black py-4 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-yellow-500/40 hover:shadow-2xl hover:shadow-yellow-500/60 hover:scale-105"
                        onClick={() => enterGiveaway(giveaway)}
                        disabled={entering === giveaway.id}
                      >
                        {entering === giveaway.id ? '⏳ Entering...' : userTickets > 0 ? '🎫 Buy More Tickets' : giveaway.ticket_cost === 0 ? '🎁 Enter Free' : `🎟 Enter (${giveaway.ticket_cost} pts)`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Latest Redeems Table */}
        {allParticipants.length > 0 && (
          <div className="relative bg-black/40 backdrop-blur-xl border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-yellow-500/10">
            <div className="px-6 md:px-8 py-5 border-b border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-transparent">
              <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🎟️</span> Latest Redeems
              </h2>
            </div>
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-yellow-500/5 border-b border-yellow-500/20">
                    <th className="text-left px-8 py-4 text-xs font-black text-yellow-400 uppercase tracking-widest">Redeems</th>
                    <th className="text-left px-8 py-4 text-xs font-black text-yellow-400 uppercase tracking-widest">Nickname</th>
                    <th className="text-left px-8 py-4 text-xs font-black text-yellow-400 uppercase tracking-widest">Date</th>
                    <th className="text-left px-8 py-4 text-xs font-black text-yellow-400 uppercase tracking-widest">Points</th>
                    <th className="text-left px-8 py-4 text-xs font-black text-yellow-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allParticipants.map((entry, index) => (
                    <tr key={index} className="hover:bg-yellow-500/5 transition-colors">
                      <td className="px-8 py-4 text-sm font-bold text-white">GIVEAWAY ENTRY</td>
                      <td className="px-8 py-4 text-sm text-gray-300 font-medium">{entry.username}</td>
                      <td className="px-8 py-4 text-sm text-gray-400">
                        {new Date(entry.entered_at).toLocaleDateString('en-US', { 
                          month: '2-digit', 
                          day: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-8 py-4 text-sm font-bold text-yellow-400">-1 pts</td>
                      <td className="px-8 py-4">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide ${
                          entry.status === 'WON' 
                            ? 'bg-gradient-to-r from-yellow-500/30 to-yellow-600/20 text-yellow-400 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/20' 
                            : 'bg-gradient-to-r from-green-500/30 to-green-600/20 text-green-400 border-2 border-green-500/50 shadow-lg shadow-green-500/20'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-white/5">
              {allParticipants.map((entry, index) => (
                <div key={index} className="px-5 py-5 hover:bg-yellow-500/5 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-bold text-white text-sm">GIVEAWAY ENTRY</div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                      entry.status === 'WON' 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                        : 'bg-green-500/20 text-green-400 border border-green-500/50'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 font-medium mb-2">{entry.username}</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">
                      {new Date(entry.entered_at).toLocaleDateString('en-US', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="text-yellow-400 font-bold">-1 pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
