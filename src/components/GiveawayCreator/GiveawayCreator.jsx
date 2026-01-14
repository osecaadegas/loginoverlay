import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import './GiveawayCreator.css';

function GiveawayCreator() {
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showParticipants, setShowParticipants] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showWinners, setShowWinners] = useState(null);
  const [winners, setWinners] = useState([]);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    ticketCost: '0',
    allowMultipleTickets: false,
    maxWinners: '1',
    duration: '7'
  });

  useEffect(() => {
    fetchGiveaways();
  }, []);

  const fetchGiveaways = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaways')
        .select(`
          *,
          giveaway_entries(count),
          giveaway_winners(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGiveaways(data || []);
    } catch (error) {
      console.error('Error fetching giveaways:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGiveaway = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.duration) {
      alert('Please fill in title and duration');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + parseInt(formData.duration));

      const { error } = await supabase
        .from('giveaways')
        .insert([{
          title: formData.title,
          description: formData.description,
          image_url: formData.imageUrl || null,
          ticket_cost: parseInt(formData.ticketCost),
          allow_multiple_tickets: formData.allowMultipleTickets,
          max_winners: parseInt(formData.maxWinners),
          ends_at: endsAt.toISOString(),
          created_by: userData.user.id
        }]);

      if (error) throw error;

      alert('Giveaway created successfully!');
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        ticketCost: '0',
        allowMultipleTickets: false,
        maxWinners: '1',
        duration: '7'
      });
      setShowCreateForm(false);
      fetchGiveaways();
    } catch (error) {
      console.error('Error creating giveaway:', error);
      alert(error.message || 'Failed to create giveaway');
    }
  };

  const toggleGiveawayStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('giveaways')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchGiveaways();
    } catch (error) {
      console.error('Error toggling giveaway:', error);
    }
  };

  const drawWinners = async (giveaway) => {
    if (!confirm(`Draw ${giveaway.max_winners} winner(s) for "${giveaway.title}"?`)) return;

    try {
      // Get all entries for this giveaway
      const { data: entries, error: entriesError } = await supabase
        .from('giveaway_entries')
        .select('user_id, tickets_count')
        .eq('giveaway_id', giveaway.id);

      if (entriesError) throw entriesError;

      if (!entries || entries.length === 0) {
        alert('No entries for this giveaway yet!');
        return;
      }

      // Create weighted array (users with more tickets have more chances)
      const weightedEntries = [];
      entries.forEach(entry => {
        for (let i = 0; i < entry.tickets_count; i++) {
          weightedEntries.push(entry.user_id);
        }
      });

      // Shuffle and pick winners
      const shuffled = weightedEntries.sort(() => 0.5 - Math.random());
      const uniqueWinners = [...new Set(shuffled)].slice(0, giveaway.max_winners);

      // Insert winners
      const winnersData = uniqueWinners.map(userId => ({
        giveaway_id: giveaway.id,
        user_id: userId
      }));

      const { error: winnersError } = await supabase
        .from('giveaway_winners')
        .insert(winnersData);

      if (winnersError) throw winnersError;

      // Mark giveaway as drawn
      const { error: updateError } = await supabase
        .from('giveaways')
        .update({ 
          winners_drawn: true, 
          drawn_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', giveaway.id);

      if (updateError) throw updateError;

      alert(`Successfully drew ${uniqueWinners.length} winner(s)!`);
      fetchGiveaways();
    } catch (error) {
      console.error('Error drawing winners:', error);
      alert('Failed to draw winners');
    }
  };

  const deleteGiveaway = async (id) => {
    if (!confirm('Are you sure you want to delete this giveaway?')) return;

    try {
      const { error } = await supabase
        .from('giveaways')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchGiveaways();
    } catch (error) {
      console.error('Error deleting giveaway:', error);
    }
  };

  const viewParticipants = async (giveawayId) => {
    setShowParticipants(giveawayId);
    setLoadingParticipants(true);

    try {
      const { data: entries, error } = await supabase
        .from('giveaway_entries')
        .select('user_id, tickets_count, entered_at')
        .eq('giveaway_id', giveawayId)
        .order('entered_at', { ascending: false });

      if (error) throw error;

      // Get SE usernames
      const { data: seAccounts } = await supabase
        .from('streamelements_connections')
        .select('user_id, se_username');

      // Get Twitch usernames
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, twitch_username');

      const seUsernameMap = {};
      if (seAccounts) {
        seAccounts.forEach(account => {
          seUsernameMap[account.user_id] = account.se_username;
        });
      }

      const twitchUsernameMap = {};
      if (userProfiles) {
        userProfiles.forEach(profile => {
          if (profile.twitch_username) {
            twitchUsernameMap[profile.user_id] = profile.twitch_username;
          }
        });
      }

      const enrichedEntries = entries?.map(entry => ({
        ...entry,
        username: seUsernameMap[entry.user_id] || twitchUsernameMap[entry.user_id] || 'Unknown User'
      })) || [];

      setParticipants(enrichedEntries);
    } catch (error) {
      console.error('Error fetching participants:', error);
      alert('Failed to load participants');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const removeParticipant = async (giveawayId, userId, username) => {
    if (!confirm(`Remove ${username} from this giveaway?`)) return;

    try {
      const { error } = await supabase
        .from('giveaway_entries')
        .delete()
        .eq('giveaway_id', giveawayId)
        .eq('user_id', userId);

      if (error) throw error;

      alert(`${username} has been removed`);
      viewParticipants(giveawayId);
      fetchGiveaways();
    } catch (error) {
      console.error('Error removing participant:', error);
      alert('Failed to remove participant');
    }
  };

  const viewWinners = async (giveawayId) => {
    setShowWinners(giveawayId);
    setLoadingWinners(true);

    try {
      const { data: winnerRecords, error } = await supabase
        .from('giveaway_winners')
        .select('user_id, selected_at')
        .eq('giveaway_id', giveawayId)
        .order('selected_at', { ascending: true });

      if (error) throw error;

      // Get SE usernames
      const { data: seAccounts } = await supabase
        .from('streamelements_connections')
        .select('user_id, se_username');

      // Get Twitch usernames
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, twitch_username');

      const seUsernameMap = {};
      if (seAccounts) {
        seAccounts.forEach(account => {
          seUsernameMap[account.user_id] = account.se_username;
        });
      }

      const twitchUsernameMap = {};
      if (userProfiles) {
        userProfiles.forEach(profile => {
          if (profile.twitch_username) {
            twitchUsernameMap[profile.user_id] = profile.twitch_username;
          }
        });
      }

      const enrichedWinners = winnerRecords?.map((winner, index) => ({
        ...winner,
        username: seUsernameMap[winner.user_id] || twitchUsernameMap[winner.user_id] || 'Unknown User',
        position: index + 1
      })) || [];

      setWinners(enrichedWinners);
    } catch (error) {
      console.error('Error fetching winners:', error);
      alert('Failed to load winners');
    } finally {
      setLoadingWinners(false);
    }
  };

  if (loading) {
    return <div className="giveaway-creator"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="giveaway-creator">
      <div className="gc-header">
        <h1>Giveaway Creator</h1>
        <button 
          className="create-giveaway-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create Giveaway'}
        </button>
      </div>

      {showCreateForm && (
        <div className="gc-form-card">
          <h2>Create New Giveaway</h2>
          <form onSubmit={handleCreateGiveaway}>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., $100 Steam Gift Card"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the prize and rules..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Image URL (Optional)</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ticket Cost (SE Points)</label>
                <input
                  type="number"
                  value={formData.ticketCost}
                  onChange={(e) => setFormData({ ...formData, ticketCost: e.target.value })}
                  min="0"
                  required
                />
                <small>0 = Free entry</small>
              </div>

              <div className="form-group">
                <label>Duration (Days) *</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Number of Winners *</label>
                <input
                  type="number"
                  value={formData.maxWinners}
                  onChange={(e) => setFormData({ ...formData, maxWinners: e.target.value })}
                  min="1"
                  required
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.allowMultipleTickets}
                    onChange={(e) => setFormData({ ...formData, allowMultipleTickets: e.target.checked })}
                  />
                  <span>Allow Multiple Tickets</span>
                </label>
                <small>Users can buy multiple entries</small>
              </div>
            </div>

            <button type="submit" className="submit-btn">Create Giveaway</button>
          </form>
        </div>
      )}

      <div className="gc-list">
        <h2>All Giveaways ({giveaways.length})</h2>
        <div className="gc-grid">
          {giveaways.map((giveaway) => {
            const entriesCount = giveaway.giveaway_entries?.[0]?.count || 0;
            const winnersCount = giveaway.giveaway_winners?.[0]?.count || 0;
            const endsAt = new Date(giveaway.ends_at);
            const isExpired = endsAt < new Date();
            
            return (
              <div key={giveaway.id} className={`gc-card ${!giveaway.is_active ? 'inactive' : ''}`}>
                {giveaway.image_url && (
                  <div className="gc-image">
                    <img src={giveaway.image_url} alt={giveaway.title} />
                  </div>
                )}
                <div className="gc-content">
                  <h3>{giveaway.title}</h3>
                  {giveaway.description && (
                    <p className="gc-description">{giveaway.description}</p>
                  )}
                  
                  <div className="gc-stats">
                    <div className="gc-stat">
                      <span className="label">Cost:</span>
                      <span className="value">
                        {giveaway.ticket_cost === 0 ? 'Free' : `${giveaway.ticket_cost} pts`}
                      </span>
                    </div>
                    <div className="gc-stat">
                      <span className="label">Winners:</span>
                      <span className="value">{giveaway.max_winners}</span>
                    </div>
                    <div className="gc-stat">
                      <span className="label">Entries:</span>
                      <span className="value">{entriesCount}</span>
                    </div>
                    <div className="gc-stat">
                      <span className="label">Ends:</span>
                      <span className="value">
                        {isExpired ? 'Ended' : endsAt.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="gc-stat">
                      <span className="label">Status:</span>
                      <span className={`status ${giveaway.is_active ? 'active' : 'inactive'}`}>
                        {giveaway.winners_drawn ? 'Winners Drawn' : giveaway.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="gc-actions">
                    {!giveaway.winners_drawn && (
                      <>
                        <button 
                          onClick={() => toggleGiveawayStatus(giveaway.id, giveaway.is_active)}
                          className="toggle-btn"
                        >
                          {giveaway.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => drawWinners(giveaway)}
                          className="draw-btn"
                          disabled={entriesCount === 0}
                        >
                          Draw Winners
                        </button>
                      </>
                    )}
                    {entriesCount > 0 && (
                      <button 
                        onClick={() => viewParticipants(giveaway.id)}
                        className="view-participants-btn"
                      >
                        View Entries ({entriesCount})
                      </button>
                    )}
                    {winnersCount > 0 && (
                      <button 
                        onClick={() => viewWinners(giveaway.id)}
                        className="view-winners-btn"
                      >
                        🏆 View Winners ({winnersCount})
                      </button>
                    )}
                    <button 
                      onClick={() => deleteGiveaway(giveaway.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participants Modal */}
      {showParticipants && (
        <>
          <div className="modal-overlay" onClick={() => setShowParticipants(null)}></div>
          <div className="participants-modal">
            <div className="modal-header">
              <h2>🎟️ Giveaway Entries</h2>
              <button className="modal-close" onClick={() => setShowParticipants(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              {loadingParticipants ? (
                <div className="loading">Loading participants...</div>
              ) : participants.length === 0 ? (
                <div className="empty-state">No entries yet</div>
              ) : (
                <div className="participants-list">
                  {participants.map((participant, index) => (
                    <div key={index} className="participant-row">
                      <div className="participant-info">
                        <div className="participant-avatar">
                          {participant.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="participant-details">
                          <div className="participant-name">{participant.username}</div>
                          <div className="participant-meta">
                            {participant.tickets_count} ticket{participant.tickets_count > 1 ? 's' : ''} • 
                            Entered {new Date(participant.entered_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button 
                        className="remove-participant-btn"
                        onClick={() => removeParticipant(showParticipants, participant.user_id, participant.username)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Winners Modal */}
      {showWinners && (
        <>
          <div className="modal-overlay" onClick={() => setShowWinners(null)}></div>
          <div className="participants-modal winners-modal">
            <div className="modal-header">
              <h2>🏆 Giveaway Winners</h2>
              <button className="modal-close" onClick={() => setShowWinners(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              {loadingWinners ? (
                <div className="loading">Loading winners...</div>
              ) : winners.length === 0 ? (
                <div className="empty-state">No winners yet</div>
              ) : (
                <div className="participants-list">
                  {winners.map((winner) => (
                    <div key={winner.user_id} className="participant-row winner-row">
                      <div className="participant-info">
                        <div className="winner-position">
                          {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : `#${winner.position}`}
                        </div>
                        <div className="participant-avatar winner-avatar">
                          {winner.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="participant-details">
                          <div className="participant-name winner-name">
                            {winner.username}
                            <span className="winner-crown">👑</span>
                          </div>
                          <div className="participant-meta">
                            Won on {new Date(winner.selected_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default GiveawayCreator;
