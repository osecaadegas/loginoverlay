import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import './GuessBalancePage.css';

export default function GuessBalancePage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [slots, setSlots] = useState([]);
  const [userGuess, setUserGuess] = useState('');
  const [existingGuess, setExistingGuess] = useState(null);
  const [allGuesses, setAllGuesses] = useState([]);
  const [publicGuesses, setPublicGuesses] = useState([]); // All guesses for public display
  const [hasPayoutStarted, setHasPayoutStarted] = useState(false); // Lock guessing after first payout
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'gtb', 'leaderboard'
  
  // Slot voting state
  const [slotVotes, setSlotVotes] = useState([]); // All votes for this session
  const [userVotes, setUserVotes] = useState({ best: null, worst: null }); // Current user's votes
  const [votingInProgress, setVotingInProgress] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSession) {
      loadSessionDetails(activeSession.id);
    }
  }, [activeSession?.id, user?.id]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guess_balance_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
      
      // Auto-select first active session
      const activeIndex = data?.findIndex(s => s.status === 'active');
      if (activeIndex >= 0) {
        setCurrentSessionIndex(activeIndex);
        setActiveSession(data[activeIndex]);
      } else if (data?.length > 0) {
        setCurrentSessionIndex(0);
        setActiveSession(data[0]);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    }
    setLoading(false);
  };

  const loadSessionDetails = async (sessionId) => {
    try {
      // Load slots
      const { data: slotsData, error: slotsError } = await supabase
        .from('guess_balance_slots')
        .select('*')
        .eq('session_id', sessionId)
        .order('display_order', { ascending: true });

      if (slotsError) throw slotsError;
      setSlots(slotsData || []);
      
      // Check if any slot has a payout (locks guessing)
      const hasPayout = (slotsData || []).some(slot => slot.bonus_win !== null);
      setHasPayoutStarted(hasPayout);

      // Load user's existing guess
      if (user?.id) {
        const { data: guessData } = await supabase
          .from('guess_balance_guesses')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .single();

        if (guessData) {
          setExistingGuess(guessData);
          setUserGuess(guessData.guessed_balance.toString());
        } else {
          setExistingGuess(null);
          setUserGuess('');
        }
      }

      // Load all guesses for public display (without join to avoid RLS issues)
      const { data: allGuessesData, error: guessesError } = await supabase
        .from('guess_balance_guesses')
        .select('*')
        .eq('session_id', sessionId)
        .order('guessed_at', { ascending: false });

      console.log('Loaded guesses:', allGuessesData?.length, 'error:', guessesError);

      if (guessesError) {
        console.error('Error loading guesses:', guessesError);
      }

      // Get usernames from streamelements_connections (has public read access)
      const userIds = [...new Set((allGuessesData || []).map(g => g.user_id))];
      
      let usernameMap = {};
      
      if (userIds.length > 0) {
        // Try SE connections first
        const { data: seData } = await supabase
          .from('streamelements_connections')
          .select('user_id, se_username')
          .in('user_id', userIds);
        
        if (seData) {
          seData.forEach(se => {
            usernameMap[se.user_id] = se.se_username;
          });
        }
      }

      // Enrich guesses with usernames
      const enrichedGuesses = (allGuessesData || []).map(guess => ({
        ...guess,
        user: {
          twitch_username: usernameMap[guess.user_id] || null,
          display_name: usernameMap[guess.user_id] || null,
          username: usernameMap[guess.user_id] || 'Anonymous'
        }
      }));

      setPublicGuesses(enrichedGuesses);
      
      // For results tab, sort by difference (only when revealed)
      const session = sessions.find(s => s.id === sessionId);
      if (session?.reveal_answer || session?.status === 'completed') {
        const sortedByDiff = [...enrichedGuesses].sort((a, b) => 
          (a.difference || Infinity) - (b.difference || Infinity)
        );
        setAllGuesses(sortedByDiff);
      } else {
        setAllGuesses([]);
      }
      
      // Load slot votes
      await loadSlotVotes(sessionId);
    } catch (err) {
      console.error('Error loading session details:', err);
    }
  };

  // Load all votes for a session with user info
  const loadSlotVotes = async (sessionId) => {
    try {
      const { data: votesData, error } = await supabase
        .from('guess_balance_slot_votes')
        .select('*')
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error loading votes:', error);
        return;
      }

      // Get unique user IDs from votes
      const voterUserIds = [...new Set((votesData || []).map(v => v.user_id))];
      
      // Fetch user profiles for voters
      let voterUsernameMap = {};
      if (voterUserIds.length > 0) {
        const { data: voterProfiles } = await supabase
          .from('user_profiles')
          .select('id, twitch_username, display_name, username')
          .in('id', voterUserIds);
        
        voterProfiles?.forEach(profile => {
          voterUsernameMap[profile.id] = profile.twitch_username || profile.display_name || profile.username || 'Anonymous';
        });
      }

      // Enrich votes with usernames
      const enrichedVotes = (votesData || []).map(vote => ({
        ...vote,
        username: voterUsernameMap[vote.user_id] || 'Anonymous'
      }));

      setSlotVotes(enrichedVotes);

      // Get current user's votes
      if (user?.id) {
        const userBestVote = votesData?.find(v => v.user_id === user.id && v.vote_type === 'best');
        const userWorstVote = votesData?.find(v => v.user_id === user.id && v.vote_type === 'worst');
        setUserVotes({
          best: userBestVote?.slot_id || null,
          worst: userWorstVote?.slot_id || null
        });
      }
    } catch (err) {
      console.error('Error loading slot votes:', err);
    }
  };

  // Vote for a slot
  const voteForSlot = async (slotId, voteType) => {
    if (!user) {
      setError('Please log in to vote');
      return;
    }

    if (!activeSession || activeSession.status !== 'active') {
      setError('Voting is only available for active sessions');
      return;
    }

    if (hasPayoutStarted) {
      setError('Voting is closed after payouts have started');
      return;
    }

    // Check if user already voted for this type - votes are permanent!
    if (userVotes[voteType]) {
      setError(`You have already cast your ${voteType} vote for this session`);
      return;
    }

    setVotingInProgress(true);
    try {
      // Insert vote
      const { error } = await supabase
        .from('guess_balance_slot_votes')
        .insert({
          session_id: activeSession.id,
          slot_id: slotId,
          user_id: user.id,
          vote_type: voteType
        });

      if (error) throw error;

      setUserVotes(prev => ({ ...prev, [voteType]: slotId }));
      await loadSlotVotes(activeSession.id);
    } catch (err) {
      console.error('Error voting:', err);
      setError('Failed to submit vote');
    }
    setVotingInProgress(false);
  };

  // Get vote counts for a slot
  const getVoteCounts = (slotId) => {
    const bestVotes = slotVotes.filter(v => v.slot_id === slotId && v.vote_type === 'best').length;
    const worstVotes = slotVotes.filter(v => v.slot_id === slotId && v.vote_type === 'worst').length;
    return { best: bestVotes, worst: worstVotes };
  };

  const navigateSession = (direction) => {
    const newIndex = currentSessionIndex + direction;
    if (newIndex >= 0 && newIndex < sessions.length) {
      setCurrentSessionIndex(newIndex);
      setActiveSession(sessions[newIndex]);
    }
  };

  const submitGuess = async () => {
    if (!user) {
      setError('Please log in to submit a guess');
      return;
    }

    // Only allow ONE guess per session - no updates allowed
    if (existingGuess) {
      setError('You have already submitted a guess for this session. Only one guess per session is allowed!');
      return;
    }

    if (!userGuess || isNaN(parseFloat(userGuess))) {
      setError('Please enter a valid balance');
      return;
    }

    if (!activeSession?.is_guessing_open || hasPayoutStarted) {
      setError('Guessing is closed for this session');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const guessValue = parseFloat(userGuess);

      // Only insert - no updates allowed
      const { error } = await supabase
        .from('guess_balance_guesses')
        .insert({
          session_id: activeSession.id,
          user_id: user.id,
          guessed_balance: guessValue
        });

      if (error) throw error;
      setSuccess('Your guess has been submitted!');

      loadSessionDetails(activeSession.id);
    } catch (err) {
      console.error('Error submitting guess:', err);
      setError('Failed to submit guess: ' + err.message);
    }

    setSubmitting(false);
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return parseFloat(value).toFixed(2) + '€';
  };

  const formatMultiplier = (value) => {
    if (value === null || value === undefined) return '-';
    return parseFloat(value).toFixed(2) + 'x';
  };

  // Calculate stats
  const calculateStats = () => {
    if (!activeSession || slots.length === 0) {
      return {
        totalSlots: 0,
        openedSlots: 0,
        totalWinnings: 0,
        avgMulti: 0,
        profit: 0,
        currentBE: 0
      };
    }

    const openedSlots = slots.filter(s => s.bonus_win !== null).length;
    const totalWinnings = slots.reduce((sum, s) => sum + (parseFloat(s.bonus_win) || 0), 0);
    const totalBets = slots.reduce((sum, s) => sum + (parseFloat(s.bet_value) || 0), 0);
    
    const multipliers = slots.filter(s => s.multiplier !== null).map(s => parseFloat(s.multiplier));
    const avgMulti = multipliers.length > 0 ? multipliers.reduce((a, b) => a + b, 0) / multipliers.length : 0;
    
    const startValue = parseFloat(activeSession.start_value) || 0;
    const amountExpended = parseFloat(activeSession.amount_expended) || totalBets;
    const currentBalance = startValue - amountExpended + totalWinnings;
    const profit = currentBalance - startValue;
    
    const currentBE = amountExpended > 0 ? (amountExpended / totalWinnings) : 0;

    return {
      totalSlots: slots.length,
      openedSlots,
      totalWinnings,
      avgMulti,
      profit,
      currentBE,
      totalBets: amountExpended
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="gtb-page">
        <div className="gtb-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gtb-page">
      <div className="gtb-container">
        {/* Header */}
        <div className="gtb-header">
          <h1>GUESS THE BALANCE</h1>
          <p>Follow the bonus opening and participate in challenges!</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {sessions.length === 0 ? (
          <div className="no-sessions">
            <div className="no-sessions-icon">🎰</div>
            <h2>No Active Games</h2>
            <p>Check back soon for the next Guess the Balance game!</p>
          </div>
        ) : (
          <div className="gtb-main-layout">
            {/* Left Side - Session & Slots Table */}
            <div className="gtb-left-panel">
              {/* Session Header */}
              <div className="session-header-card">
                <div className="session-icon">💰</div>
                <div className="session-title-info">
                  <span className="session-name">{activeSession?.title || 'Guess the Balance'}</span>
                </div>
                
                <div className="session-nav">
                  <button 
                    className="nav-arrow" 
                    onClick={() => navigateSession(-1)}
                    disabled={currentSessionIndex === 0}
                  >
                    ‹
                  </button>
                  <button 
                    className="nav-arrow"
                    onClick={() => navigateSession(1)}
                    disabled={currentSessionIndex === sessions.length - 1}
                  >
                    ›
                  </button>
                </div>

                <div className={`session-status-badge ${activeSession?.status}`}>
                  {activeSession?.status === 'active' ? 'ACTIVE' : 
                   activeSession?.status === 'completed' ? 'COMPLETED' : 'CANCELLED'}
                </div>

                <div className="session-count">
                  {stats.openedSlots} / {stats.totalSlots} Bónus
                </div>
              </div>

              {/* Slots Table */}
              <div className="slots-table-container">
                <table className="slots-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>SLOT</th>
                      <th>BETSIZE</th>
                      <th>VOTES</th>
                      <th>SPECIAL</th>
                      <th>WINNINGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot, index) => {
                      const voteCounts = getVoteCounts(slot.id);
                      const isUserBestVote = userVotes.best === slot.id;
                      const isUserWorstVote = userVotes.worst === slot.id;
                      const canVote = activeSession?.status === 'active' && !hasPayoutStarted && user;
                      
                      return (
                        <tr key={slot.id} className={slot.is_super ? 'super-row' : ''}>
                          <td className="slot-number">#{index + 1}</td>
                          <td className="slot-info-cell">
                            <div className="slot-info-wrapper">
                              {slot.slot_image_url ? (
                                <img src={slot.slot_image_url} alt={slot.slot_name} className="slot-thumb" />
                              ) : (
                                <div className="slot-thumb-placeholder">🎰</div>
                              )}
                              <div className="slot-text">
                                <span className="slot-name">{slot.slot_name}</span>
                                <span className="slot-provider">{slot.provider || 'Unknown'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="bet-cell">{formatCurrency(slot.bet_value)}</td>
                          <td className="votes-cell">
                            <div className="vote-buttons">
                              <button
                                className={`vote-btn vote-best ${isUserBestVote ? 'voted' : ''} ${userVotes.best && !isUserBestVote ? 'locked' : ''}`}
                                onClick={() => voteForSlot(slot.id, 'best')}
                                disabled={!canVote || votingInProgress || userVotes.best}
                                title={isUserBestVote ? 'Your Best vote' : userVotes.best ? 'Already voted' : canVote ? 'Vote as Best' : 'Voting closed'}
                              >
                                👑 {voteCounts.best > 0 && <span className="vote-count">{voteCounts.best}</span>}
                              </button>
                              <button
                                className={`vote-btn vote-worst ${isUserWorstVote ? 'voted' : ''} ${userVotes.worst && !isUserWorstVote ? 'locked' : ''}`}
                                onClick={() => voteForSlot(slot.id, 'worst')}
                                disabled={!canVote || votingInProgress || userVotes.worst}
                                title={isUserWorstVote ? 'Your Worst vote' : userVotes.worst ? 'Already voted' : canVote ? 'Vote as Worst' : 'Voting closed'}
                              >
                                💩 {voteCounts.worst > 0 && <span className="vote-count">{voteCounts.worst}</span>}
                              </button>
                            </div>
                          </td>
                          <td className="special-cell">
                            {slot.is_super && (
                              <span className="super-bonus-badge">
                                <span className="badge-icon">👑</span> SUPER BONUS
                              </span>
                            )}
                          </td>
                          <td className="winnings-cell">
                            {slot.bonus_win !== null ? (
                              <div className="winnings-display">
                                <span className="win-amount">{formatCurrency(slot.bonus_win)}</span>
                                {slot.multiplier && (
                                  <span className="win-multiplier">({formatMultiplier(slot.multiplier)})</span>
                                )}
                              </div>
                            ) : (
                              <span className="hidden-win">???</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {slots.length === 0 && (
                  <div className="empty-slots">
                    <p>No slots added yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Stats Panel */}
            <div className="gtb-right-panel">
              {/* Tabs */}
              <div className="stats-tabs">
                <button 
                  className={`stats-tab ${activeTab === 'stats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stats')}
                >
                  <span className="tab-icon">📊</span> Stats
                </button>
                <button 
                  className={`stats-tab ${activeTab === 'gtb' ? 'active' : ''}`}
                  onClick={() => setActiveTab('gtb')}
                >
                  <span className="tab-icon">💰</span> GTB
                </button>
                <button 
                  className={`stats-tab ${activeTab === 'votes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('votes')}
                >
                  <span className="tab-icon">🗳️</span> Votes
                </button>
                <button 
                  className={`stats-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('leaderboard')}
                >
                  <span className="tab-icon">🏆</span> Results
                </button>
              </div>

              {/* Stats Tab */}
              {activeTab === 'stats' && (
                <div className="stats-content">
                  {/* Top Stats Row */}
                  <div className="stats-top-row">
                    <div className="stat-item">
                      <span className="stat-icon">▷</span>
                      <span className="stat-label">START</span>
                      <span className="stat-value gold">{formatCurrency(activeSession?.start_value)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">□</span>
                      <span className="stat-label">STOP</span>
                      <span className="stat-value">0€</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">⚐</span>
                      <span className="stat-label">TARGET</span>
                      <span className="stat-value">{formatCurrency(activeSession?.start_value)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">PROGRESS</span>
                      <span className="progress-count">{stats.openedSlots}/{stats.totalSlots}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill"
                        style={{ width: `${stats.totalSlots > 0 ? (stats.openedSlots / stats.totalSlots) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stat Boxes */}
                  <div className="stat-boxes">
                    <div className="stat-box">
                      <span className="box-icon">⚡</span>
                      <span className="box-label">CURRENT BE</span>
                      <span className="box-value">{stats.currentBE.toFixed(2)}x</span>
                    </div>

                    <div className="stat-box">
                      <span className="box-icon">◎</span>
                      <span className="box-label">INITIAL BE</span>
                      <span className="box-value">{formatMultiplier(activeSession?.be_multiplier)}</span>
                    </div>

                    <div className="stat-box">
                      <span className="box-icon">↗</span>
                      <span className="box-label">AVG MULTI</span>
                      <span className="box-value">{stats.avgMulti.toFixed(2)}x</span>
                    </div>

                    <div className="stat-box">
                      <span className="box-icon">↓</span>
                      <span className="box-label">PROFIT</span>
                      <span className={`box-value ${stats.profit >= 0 ? 'positive' : 'negative'}`}>
                        {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
                      </span>
                    </div>
                  </div>

                  {/* Casino Brand */}
                  {activeSession?.casino_brand && (
                    <div className="casino-brand-box">
                      {activeSession.casino_image_url && (
                        <img src={activeSession.casino_image_url} alt={activeSession.casino_brand} className="casino-logo" />
                      )}
                      <span className="casino-name">🏛️ {activeSession.casino_brand}</span>
                    </div>
                  )}
                </div>
              )}

              {/* GTB (Guess) Tab */}
              {activeTab === 'gtb' && (
                <div className="gtb-content">
                  <div className="guess-section">
                    <h3>🎯 Make Your Guess</h3>
                    <p className="guess-subtitle">Guess the final balance to win!</p>
                    
                    {!user ? (
                      <div className="login-prompt">
                        <p>Please log in to submit your guess!</p>
                      </div>
                    ) : existingGuess ? (
                      <div className="guessing-closed">
                        <p>✅ Your guess has been submitted!</p>
                        <p className="your-guess">Your guess: {formatCurrency(existingGuess.guessed_balance)}</p>
                        <p className="one-guess-notice">Only one guess per session is allowed.</p>
                      </div>
                    ) : (!activeSession?.is_guessing_open || hasPayoutStarted) ? (
                      <div className="guessing-closed">
                        <p>⏰ Guessing is closed {hasPayoutStarted && '(payouts started)'}</p>
                      </div>
                    ) : (
                      <div className="guess-form">
                        <div className="guess-input-wrapper">
                          <input
                            type="number"
                            value={userGuess}
                            onChange={(e) => setUserGuess(e.target.value)}
                            placeholder="Enter balance..."
                            step="0.01"
                            min="0"
                            className="guess-input"
                          />
                          <span className="currency-symbol">€</span>
                        </div>
                        
                        <button 
                          onClick={submitGuess}
                          disabled={submitting || !userGuess}
                          className="submit-guess-btn"
                        >
                          {submitting ? 'Submitting...' : 'Submit Guess'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Public Guess History - Show twitch names and amounts */}
                  <div className="public-guess-history">
                    <h4>📜 All Guesses ({publicGuesses.length})</h4>
                    {publicGuesses.length === 0 ? (
                      <p className="no-guesses-yet">No guesses submitted yet. Be the first!</p>
                    ) : (
                      <div className="guess-history-list">
                        {publicGuesses.map((guess, index) => (
                          <div 
                            key={guess.id} 
                            className={`guess-history-item ${guess.user_id === user?.id ? 'your-guess-item' : ''}`}
                          >
                            <span className="guess-player">
                              {guess.user?.twitch_username || guess.user?.display_name || guess.user?.username || 'Anonymous'}
                              {guess.user_id === user?.id && <span className="you-badge">YOU</span>}
                            </span>
                            <span className="guess-amount">
                              {formatCurrency(guess.guessed_balance)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Final Balance Reveal */}
                  {activeSession?.reveal_answer && activeSession?.final_balance !== null && (
                    <div className="final-balance-reveal">
                      <span className="reveal-label">FINAL BALANCE</span>
                      <span className="reveal-value">{formatCurrency(activeSession.final_balance)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Votes Tab */}
              {activeTab === 'votes' && (
                <div className="votes-content">
                  {slotVotes.length === 0 ? (
                    <div className="no-votes-yet">
                      <p>No votes yet. Be the first to vote!</p>
                    </div>
                  ) : (
                    <div className="votes-compact">
                      {/* Best Votes Row */}
                      <div className="vote-row best-row">
                        <span className="vote-row-label">👑 BEST</span>
                        <div className="vote-row-items">
                          {slots.filter(slot => slotVotes.some(v => v.slot_id === slot.id && v.vote_type === 'best'))
                            .map(slot => {
                              const votesForSlot = slotVotes.filter(v => v.slot_id === slot.id && v.vote_type === 'best');
                              return (
                                <div key={`best-${slot.id}`} className="vote-chip">
                                  <span className="chip-slot">{slot.slot_name}</span>
                                  <span className="chip-voters">
                                    {votesForSlot.map((vote, i) => (
                                      <span key={vote.id} className={vote.user_id === user?.id ? 'you' : ''}>
                                        {vote.username}{vote.user_id === user?.id && ' ★'}{i < votesForSlot.length - 1 && ', '}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              );
                            })}
                          {!slotVotes.some(v => v.vote_type === 'best') && (
                            <span className="no-votes-inline">No votes</span>
                          )}
                        </div>
                      </div>

                      {/* Worst Votes Row */}
                      <div className="vote-row worst-row">
                        <span className="vote-row-label">💩 WORST</span>
                        <div className="vote-row-items">
                          {slots.filter(slot => slotVotes.some(v => v.slot_id === slot.id && v.vote_type === 'worst'))
                            .map(slot => {
                              const votesForSlot = slotVotes.filter(v => v.slot_id === slot.id && v.vote_type === 'worst');
                              return (
                                <div key={`worst-${slot.id}`} className="vote-chip">
                                  <span className="chip-slot">{slot.slot_name}</span>
                                  <span className="chip-voters">
                                    {votesForSlot.map((vote, i) => (
                                      <span key={vote.id} className={vote.user_id === user?.id ? 'you' : ''}>
                                        {vote.username}{vote.user_id === user?.id && ' ★'}{i < votesForSlot.length - 1 && ', '}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              );
                            })}
                          {!slotVotes.some(v => v.vote_type === 'worst') && (
                            <span className="no-votes-inline">No votes</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard Tab */}
              {activeTab === 'leaderboard' && (
                <div className="leaderboard-content">
                  <h3>🏆 Results</h3>
                  
                  {/* Always show winner if exists */}
                  {activeSession?.winner_user_id && allGuesses.length > 0 && (
                    <div className="winner-announcement">
                      <span className="winner-crown">👑</span>
                      <span className="winner-label">WINNER</span>
                      <span className="winner-name">
                        {allGuesses.find(g => g.is_winner)?.user?.twitch_username ||
                         allGuesses.find(g => g.is_winner)?.user?.display_name || 
                         allGuesses.find(g => g.is_winner)?.user?.username || 
                         allGuesses[0]?.user?.twitch_username ||
                         allGuesses[0]?.user?.display_name || 
                         allGuesses[0]?.user?.username || 'Anonymous'}
                      </span>
                      {activeSession?.final_balance && (
                        <span className="winner-final">Final: {formatCurrency(activeSession.final_balance)}</span>
                      )}
                    </div>
                  )}
                  
                  {!activeSession?.reveal_answer && activeSession?.status !== 'completed' ? (
                    <div className="results-pending">
                      <div className="pending-icon">⏳</div>
                      <p>Results will be revealed when the session ends!</p>
                      <p className="participants-count">{publicGuesses.length} participants so far</p>
                    </div>
                  ) : allGuesses.length === 0 ? (
                    <div className="no-guesses">
                      <p>No guesses submitted yet</p>
                    </div>
                  ) : (
                    <>
                      {activeSession?.final_balance && (
                        <div className="final-balance-banner">
                          <span>Final Balance:</span>
                          <strong>{formatCurrency(activeSession.final_balance)}</strong>
                        </div>
                      )}
                      <div className="leaderboard-list">
                        {allGuesses.map((guess, index) => (
                          <div 
                            key={guess.id} 
                            className={`leaderboard-item ${guess.is_winner ? 'winner' : ''} ${guess.user_id === user?.id ? 'you' : ''}`}
                          >
                            <span className="rank">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </span>
                            <span className="player-name">
                              {guess.user?.twitch_username || guess.user?.display_name || guess.user?.username || 'Anonymous'}
                              {guess.user_id === user?.id && <span className="you-tag">YOU</span>}
                            </span>
                            <div className="guess-info">
                              <span className="guessed">{formatCurrency(guess.guessed_balance)}</span>
                              <span className="diff">Δ {formatCurrency(guess.difference)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
