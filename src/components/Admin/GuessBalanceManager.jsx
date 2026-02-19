import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { supabase } from '../../config/supabaseClient';
import { SidePanel } from '../AdminPanel/components';
import '../AdminPanel/AdminPanel.css';
import './GuessBalanceManager.css';

export default function GuessBalanceManager() {
  const { isAdmin, isModerator, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  
  // Access control - allow admins and moderators
  const hasAccess = isAdmin || isModerator;

  // State for Guess Balance
  const [loading, setLoading] = useState(true);
  const [guessBalanceSessions, setGuessBalanceSessions] = useState([]);
  const [guessBalanceSlots, setGuessBalanceSlots] = useState([]);
  const [showGuessBalanceModal, setShowGuessBalanceModal] = useState(false);
  const [editingGuessSession, setEditingGuessSession] = useState(null);
  const [selectedSessionForSlots, setSelectedSessionForSlots] = useState(null);
  const [slotCatalog, setSlotCatalog] = useState([]);
  const [slotSearchQuery, setSlotSearchQuery] = useState('');
  const [newSlotBetValue, setNewSlotBetValue] = useState(1);
  const [newSlotIsSuper, setNewSlotIsSuper] = useState(false);
  const [sessionSlotsInModal, setSessionSlotsInModal] = useState([]);
  const [guessSessionFormData, setGuessSessionFormData] = useState({
    title: '',
    stream_date: '',
    start_value: '',
    final_balance: '',
    casino_brand: '',
    casino_image_url: '',
    is_guessing_open: false,
    reveal_answer: false,
    conducted_by: '',
    notes: ''
  });
  
  // Hunt Logs state
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' or 'logs'
  const [huntLogs, setHuntLogs] = useState([]);
  
  // Slot management state
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotFormData, setSlotFormData] = useState({
    slot_name: '',
    provider: '',
    slot_image_url: '',
    bet_value: '',
    display_order: 0,
    is_super: false,
    bonus_win: '',
    multiplier: ''
  });
  
  // Slot results modal state
  const [showSlotResultsModal, setShowSlotResultsModal] = useState(false);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  
  // Guesses and votes modal state
  const [showGuessesModal, setShowGuessesModal] = useState(false);
  const [showVotesModal, setShowVotesModal] = useState(false);
  const [sessionGuesses, setSessionGuesses] = useState([]);
  const [sessionVotes, setSessionVotes] = useState([]);

  // Notification state
  const [notification, setNotification] = useState(null);

  // Notification helper
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Filter slot catalog
  const filteredSlotCatalog = useMemo(() => {
    if (!slotSearchQuery.trim()) return [];
    const query = slotSearchQuery.toLowerCase();
    return slotCatalog.filter(slot => 
      slot.name?.toLowerCase().includes(query) || 
      slot.provider?.toLowerCase().includes(query)
    );
  }, [slotCatalog, slotSearchQuery]);

  // Load slot catalog
  const loadSlotCatalog = useCallback(async () => {
    try {
      let allSlots = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('slots')
          .select('id, name, image, provider')
          .range(offset, offset + limit - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allSlots = [...allSlots, ...data];
          offset += limit;
          hasMore = data.length === limit;
        } else {
          hasMore = false;
        }
      }
      setSlotCatalog(allSlots);
    } catch (err) {
      console.error('Error loading slot catalog:', err);
    }
  }, []);

  // Load hunt logs (completed sessions with profit data)
  const loadHuntLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('guess_balance_sessions')
        .select('*')
        .eq('reveal_answer', true)
        .order('stream_date', { ascending: false });
      
      if (error) throw error;
      setHuntLogs(data || []);
    } catch (err) {
      console.error('Error loading hunt logs:', err);
    }
  }, []);

  // Load guess balance sessions
  const loadGuessBalanceSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('guess_balance_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setGuessBalanceSessions(data || []);
    } catch (err) {
      console.error('Error loading guess balance sessions:', err);
      showNotification('Failed to load sessions', 'error');
    }
  }, [showNotification]);

  // Load slots for a session
  const loadGuessBalanceSlots = useCallback(async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('guess_balance_slots')
        .select('*')
        .eq('session_id', sessionId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setGuessBalanceSlots(data || []);
    } catch (err) {
      console.error('Error loading session slots:', err);
      showNotification('Failed to load slots', 'error');
    }
  }, [showNotification]);

  // Load guesses for a session with SE username mapping
  const loadSessionGuesses = useCallback(async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('guess_balance_guesses')
        .select('*')
        .eq('session_id', sessionId)
        .order('guessed_at', { ascending: true });
      
      if (error) throw error;
      
      // Map user IDs to display names
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(g => g.user_id))];
        const { data: seData } = await supabase
          .from('streamelements_users')
          .select('twitch_id, twitch_username')
          .in('twitch_id', userIds);
        
        const usernameMap = {};
        seData?.forEach(u => {
          usernameMap[u.twitch_id] = u.twitch_username;
        });
        
        const enrichedData = data.map(guess => ({
          ...guess,
          display_name: usernameMap[guess.user_id] || guess.user_id
        }));
        
        setSessionGuesses(enrichedData);
      } else {
        setSessionGuesses([]);
      }
    } catch (err) {
      console.error('Error loading session guesses:', err);
    }
  }, []);

  // Load votes for a session
  const loadSessionVotes = useCallback(async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('guess_balance_slot_votes')
        .select(`
          *,
          guess_balance_slots (slot_name)
        `)
        .eq('session_id', sessionId)
        .order('voted_at', { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(v => v.user_id))];
        const { data: seData } = await supabase
          .from('streamelements_users')
          .select('twitch_id, twitch_username')
          .in('twitch_id', userIds);
        
        const usernameMap = {};
        seData?.forEach(u => {
          usernameMap[u.twitch_id] = u.twitch_username;
        });
        
        const enrichedData = data.map(vote => ({
          ...vote,
          display_name: usernameMap[vote.user_id] || vote.user_id,
          slot_name: vote.guess_balance_slots?.slot_name || 'Unknown Slot'
        }));
        
        setSessionVotes(enrichedData);
      } else {
        setSessionVotes([]);
      }
    } catch (err) {
      console.error('Error loading session votes:', err);
    }
  }, []);

  // Open session modal for new/edit
  const openGuessSessionModal = useCallback((session = null) => {
    if (session) {
      setEditingGuessSession(session);
      setGuessSessionFormData({
        title: session.title || '',
        stream_date: session.stream_date || '',
        start_value: session.start_value || '',
        final_balance: session.final_balance || '',
        casino_brand: session.casino_brand || '',
        casino_image_url: session.casino_image_url || '',
        is_guessing_open: session.is_guessing_open || false,
        reveal_answer: session.reveal_answer || false,
        conducted_by: session.conducted_by || '',
        notes: session.notes || ''
      });
      // Load existing slots for this session
      loadGuessBalanceSlots(session.id).then(() => {
        setSessionSlotsInModal([...guessBalanceSlots]);
      });
      // Also fetch slots directly for the modal
      supabase
        .from('guess_balance_slots')
        .select('*')
        .eq('session_id', session.id)
        .order('display_order', { ascending: true })
        .then(({ data }) => {
          setSessionSlotsInModal(data || []);
        });
    } else {
      setEditingGuessSession(null);
      setGuessSessionFormData({
        title: '',
        stream_date: new Date().toISOString().split('T')[0],
        start_value: '',
        final_balance: '',
        casino_brand: '',
        casino_image_url: '',
        is_guessing_open: false,
        reveal_answer: false,
        conducted_by: '',
        notes: ''
      });
      setSessionSlotsInModal([]);
    }
    setSlotSearchQuery('');
    setShowGuessBalanceModal(true);
  }, [loadGuessBalanceSlots, guessBalanceSlots]);

  // Add slot to session (in modal)
  const addSlotToSession = useCallback((catalogSlot) => {
    const newSlot = {
      tempId: `temp-${Date.now()}`,
      slot_name: catalogSlot.name,
      provider: catalogSlot.provider,
      slot_image_url: catalogSlot.image,
      bet_value: newSlotBetValue,
      is_super: newSlotIsSuper,
      display_order: sessionSlotsInModal.length
    };
    setSessionSlotsInModal(prev => [...prev, newSlot]);
    setSlotSearchQuery('');
  }, [newSlotBetValue, newSlotIsSuper, sessionSlotsInModal.length]);

  // Remove slot from session (in modal)
  const removeSlotFromSession = useCallback((index) => {
    setSessionSlotsInModal(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Save guess session
  const saveGuessSession = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      let sessionId;
      
      if (editingGuessSession) {
        // Update existing session
        const { error } = await supabase
          .from('guess_balance_sessions')
          .update({
            title: guessSessionFormData.title,
            stream_date: guessSessionFormData.stream_date || null,
            start_value: parseFloat(guessSessionFormData.start_value) || null,
            final_balance: parseFloat(guessSessionFormData.final_balance) || null,
            casino_brand: guessSessionFormData.casino_brand || null,
            casino_image_url: guessSessionFormData.casino_image_url || null,
            is_guessing_open: guessSessionFormData.is_guessing_open,
            reveal_answer: guessSessionFormData.reveal_answer,
            conducted_by: guessSessionFormData.conducted_by || null,
            notes: guessSessionFormData.notes || null
          })
          .eq('id', editingGuessSession.id);
        
        if (error) throw error;
        sessionId = editingGuessSession.id;
        
        // Delete existing slots and re-add
        await supabase
          .from('guess_balance_slots')
          .delete()
          .eq('session_id', sessionId);
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('guess_balance_sessions')
          .insert({
            title: guessSessionFormData.title,
            stream_date: guessSessionFormData.stream_date || null,
            start_value: parseFloat(guessSessionFormData.start_value) || null,
            final_balance: parseFloat(guessSessionFormData.final_balance) || null,
            casino_brand: guessSessionFormData.casino_brand || null,
            casino_image_url: guessSessionFormData.casino_image_url || null,
            is_guessing_open: guessSessionFormData.is_guessing_open,
            reveal_answer: guessSessionFormData.reveal_answer,
            conducted_by: guessSessionFormData.conducted_by || null,
            notes: guessSessionFormData.notes || null
          })
          .select()
          .single();
        
        if (error) throw error;
        sessionId = data.id;
      }
      
      // Add all slots
      if (sessionSlotsInModal.length > 0) {
        const slotsToInsert = sessionSlotsInModal.map((slot, index) => ({
          session_id: sessionId,
          slot_name: slot.slot_name,
          provider: slot.provider || null,
          slot_image_url: slot.slot_image_url || null,
          bet_value: parseFloat(slot.bet_value) || 0,
          is_super: slot.is_super || false,
          display_order: index,
          bonus_win: slot.bonus_win ? parseFloat(slot.bonus_win) : null,
          multiplier: slot.multiplier ? parseFloat(slot.multiplier) : null
        }));
        
        const { error: slotError } = await supabase
          .from('guess_balance_slots')
          .insert(slotsToInsert);
        
        if (slotError) throw slotError;
      }
      
      showNotification(editingGuessSession ? 'Session updated!' : 'Session created!', 'success');
      setShowGuessBalanceModal(false);
      loadGuessBalanceSessions();
    } catch (err) {
      console.error('Error saving session:', err);
      showNotification('Failed to save session', 'error');
    }
  }, [editingGuessSession, guessSessionFormData, sessionSlotsInModal, showNotification, loadGuessBalanceSessions]);

  // Delete guess session
  const deleteGuessSession = useCallback(async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session? All guesses and votes will be lost.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('guess_balance_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      
      showNotification('Session deleted!', 'success');
      loadGuessBalanceSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      showNotification('Failed to delete session', 'error');
    }
  }, [showNotification, loadGuessBalanceSessions]);

  // Open slot modal for standalone slot editing
  const openSlotModal = useCallback((slot = null) => {
    if (slot) {
      setEditingSlot(slot);
      setSlotFormData({
        slot_name: slot.slot_name || '',
        provider: slot.provider || '',
        slot_image_url: slot.slot_image_url || '',
        bet_value: slot.bet_value || '',
        display_order: slot.display_order || 0,
        is_super: slot.is_super || false,
        bonus_win: slot.bonus_win || '',
        multiplier: slot.multiplier || ''
      });
    } else {
      setEditingSlot(null);
      setSlotFormData({
        slot_name: '',
        provider: '',
        slot_image_url: '',
        bet_value: '',
        display_order: guessBalanceSlots.length,
        is_super: false,
        bonus_win: '',
        multiplier: ''
      });
    }
    setShowSlotModal(true);
  }, [guessBalanceSlots.length]);

  // Save slot
  const saveSlot = useCallback(async (e) => {
    e.preventDefault();
    
    if (!selectedSessionForSlots) {
      showNotification('No session selected', 'error');
      return;
    }
    
    try {
      const slotData = {
        session_id: selectedSessionForSlots.id,
        slot_name: slotFormData.slot_name,
        provider: slotFormData.provider || null,
        slot_image_url: slotFormData.slot_image_url || null,
        bet_value: parseFloat(slotFormData.bet_value) || 0,
        display_order: parseInt(slotFormData.display_order) || 0,
        is_super: slotFormData.is_super,
        bonus_win: slotFormData.bonus_win ? parseFloat(slotFormData.bonus_win) : null,
        multiplier: slotFormData.multiplier ? parseFloat(slotFormData.multiplier) : null
      };
      
      if (editingSlot) {
        const { error } = await supabase
          .from('guess_balance_slots')
          .update(slotData)
          .eq('id', editingSlot.id);
        
        if (error) throw error;
        showNotification('Slot updated!', 'success');
      } else {
        const { error } = await supabase
          .from('guess_balance_slots')
          .insert(slotData);
        
        if (error) throw error;
        showNotification('Slot added!', 'success');
      }
      
      setShowSlotModal(false);
      loadGuessBalanceSlots(selectedSessionForSlots.id);
    } catch (err) {
      console.error('Error saving slot:', err);
      showNotification('Failed to save slot', 'error');
    }
  }, [selectedSessionForSlots, slotFormData, editingSlot, showNotification, loadGuessBalanceSlots]);

  // Delete slot
  const deleteSlot = useCallback(async (slotId) => {
    if (!window.confirm('Delete this slot?')) return;
    
    try {
      const { error } = await supabase
        .from('guess_balance_slots')
        .delete()
        .eq('id', slotId);
      
      if (error) throw error;
      
      showNotification('Slot deleted!', 'success');
      if (selectedSessionForSlots) {
        loadGuessBalanceSlots(selectedSessionForSlots.id);
      }
    } catch (err) {
      console.error('Error deleting slot:', err);
      showNotification('Failed to delete slot', 'error');
    }
  }, [showNotification, selectedSessionForSlots, loadGuessBalanceSlots]);

  // End session and calculate winners
  const endGuessSessionAndCalculateWinner = useCallback(async (sessionId) => {
    if (!window.confirm('End this session and calculate winners? This will lock in the final balance.')) {
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('calculate_guess_balance_winner', {
        p_session_id: sessionId
      });
      
      if (error) throw error;
      
      showNotification('Winners calculated successfully!', 'success');
      loadGuessBalanceSessions();
    } catch (err) {
      console.error('Error calculating winners:', err);
      showNotification('Failed to calculate winners: ' + err.message, 'error');
    }
  }, [showNotification, loadGuessBalanceSessions]);

  // Open slot results modal
  const openSlotResultsModal = useCallback((session) => {
    setSelectedSessionForSlots(session);
    loadGuessBalanceSlots(session.id).then(() => {
      setCurrentSlotIndex(0);
      setShowSlotResultsModal(true);
    });
  }, [loadGuessBalanceSlots]);

  // Save slot result
  const saveSlotResult = useCallback(async (slot, moveNext = true) => {
    try {
      const { error } = await supabase
        .from('guess_balance_slots')
        .update({
          bonus_win: slot.bonus_win ? parseFloat(slot.bonus_win) : null,
          multiplier: slot.bet_value && slot.bonus_win 
            ? (parseFloat(slot.bonus_win) / parseFloat(slot.bet_value)).toFixed(2)
            : null
        })
        .eq('id', slot.id);
      
      if (error) throw error;
      
      if (moveNext && currentSlotIndex < guessBalanceSlots.length - 1) {
        setCurrentSlotIndex(prev => prev + 1);
      }
      
      showNotification('Result saved!', 'success');
    } catch (err) {
      console.error('Error saving slot result:', err);
      showNotification('Failed to save result', 'error');
    }
  }, [currentSlotIndex, guessBalanceSlots.length, showNotification]);

  // Navigate to slot in results modal
  const goToSlot = useCallback((index) => {
    if (index >= 0 && index < guessBalanceSlots.length) {
      setCurrentSlotIndex(index);
    }
  }, [guessBalanceSlots.length]);

  // Initial load
  useEffect(() => {
    if (!adminLoading && hasAccess) {
      setLoading(true);
      Promise.all([
        loadGuessBalanceSessions(),
        loadSlotCatalog(),
        loadHuntLogs()
      ]).finally(() => setLoading(false));
    }
  }, [adminLoading, hasAccess, loadGuessBalanceSessions, loadSlotCatalog, loadHuntLogs]);

  // Redirect if no access
  useEffect(() => {
    if (!adminLoading && !hasAccess) {
      navigate('/');
    }
  }, [adminLoading, hasAccess, navigate]);

  if (adminLoading || loading) {
    return (
      <div className="guess-balance-manager">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="guess-balance-manager">
      {/* Notification Toast */}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="guess-balance-header">
        <h1>🎯 Guess The Balance Manager</h1>
        <p>Create and manage Guess The Balance sessions for streams</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          📅 Sessions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📊 Hunt Logs
        </button>
      </div>

      {/* Hunt Logs Section */}
      {activeTab === 'logs' && (
        <div className="guess-balance-section hunt-logs-section">
          <div className="section-header">
            <h2>📊 Hunt Logs & Profit Tracking</h2>
          </div>

          {/* Summary Stats */}
          <div className="hunt-summary-stats">
            <div className="summary-stat">
              <span className="stat-value">{huntLogs.length}</span>
              <span className="stat-label">Total Hunts</span>
            </div>
            <div className="summary-stat">
              <span className={`stat-value ${huntLogs.reduce((sum, h) => sum + (parseFloat(h.final_balance) - parseFloat(h.start_value) || 0), 0) >= 0 ? 'profit' : 'loss'}`}>
                €{huntLogs.reduce((sum, h) => sum + (parseFloat(h.final_balance) - parseFloat(h.start_value) || 0), 0).toFixed(2)}
              </span>
              <span className="stat-label">Total Profit/Loss</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">
                €{huntLogs.length > 0 ? (huntLogs.reduce((sum, h) => sum + (parseFloat(h.final_balance) - parseFloat(h.start_value) || 0), 0) / huntLogs.length).toFixed(2) : '0.00'}
              </span>
              <span className="stat-label">Avg Profit/Hunt</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value profit">
                {huntLogs.filter(h => (parseFloat(h.final_balance) - parseFloat(h.start_value)) > 0).length}
              </span>
              <span className="stat-label">Profitable Hunts</span>
            </div>
          </div>

          {/* Hunt Logs Table */}
          {huntLogs.length === 0 ? (
            <div className="empty-state">
              <p>No completed hunts yet. Complete a session to see it in the logs.</p>
            </div>
          ) : (
            <div className="hunt-logs-table-wrapper">
              <table className="hunt-logs-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Casino</th>
                    <th>Conducted By</th>
                    <th>Start</th>
                    <th>Final</th>
                    <th>Profit/Loss</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {huntLogs.map(hunt => {
                    const profit = (parseFloat(hunt.final_balance) || 0) - (parseFloat(hunt.start_value) || 0);
                    return (
                      <tr key={hunt.id} className={profit >= 0 ? 'profit-row' : 'loss-row'}>
                        <td>{hunt.stream_date ? new Date(hunt.stream_date).toLocaleDateString() : '-'}</td>
                        <td>{hunt.title}</td>
                        <td>
                          {hunt.casino_image_url && (
                            <img src={hunt.casino_image_url} alt="" className="mini-casino-logo" />
                          )}
                          {hunt.casino_brand || '-'}
                        </td>
                        <td>{hunt.conducted_by || '-'}</td>
                        <td>€{parseFloat(hunt.start_value || 0).toFixed(2)}</td>
                        <td>€{parseFloat(hunt.final_balance || 0).toFixed(2)}</td>
                        <td className={`profit-cell ${profit >= 0 ? 'profit' : 'loss'}`}>
                          {profit >= 0 ? '+' : ''}€{profit.toFixed(2)}
                        </td>
                        <td className="notes-cell">{hunt.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sessions Section */}
      {activeTab === 'sessions' && (
      <div className="guess-balance-section">
        <div className="section-header">
          <h2>📅 Sessions</h2>
          <button 
            className="btn-primary"
            onClick={() => openGuessSessionModal()}
          >
            + New Session
          </button>
        </div>

        {guessBalanceSessions.length === 0 ? (
          <div className="empty-state">
            <p>No sessions yet. Create your first Guess The Balance session!</p>
          </div>
        ) : (
          <div className="sessions-grid">
            {guessBalanceSessions.map(session => (
              <div key={session.id} className={`session-card ${session.is_guessing_open ? 'active' : ''}`}>
                <div className="session-card-header">
                  {session.casino_image_url && (
                    <img src={session.casino_image_url} alt={session.casino_brand} className="casino-logo" />
                  )}
                  <div className="session-info">
                    <h3>{session.title}</h3>
                    {session.casino_brand && <span className="casino-brand">{session.casino_brand}</span>}
                    {session.stream_date && (
                      <span className="stream-date">📅 {new Date(session.stream_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="session-status">
                    {session.is_guessing_open ? (
                      <span className="status-badge active">🟢 Open</span>
                    ) : (
                      <span className="status-badge closed">🔴 Closed</span>
                    )}
                  </div>
                </div>

                <div className="session-stats">
                  <div className="stat">
                    <span className="stat-label">Start</span>
                    <span className="stat-value">€{session.start_value || '---'}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Final</span>
                    <span className="stat-value">
                      {session.reveal_answer ? `€${session.final_balance || '---'}` : '🔒 Hidden'}
                    </span>
                  </div>
                  {session.reveal_answer && session.final_balance && session.start_value && (
                    <div className="stat">
                      <span className="stat-label">Profit</span>
                      <span className={`stat-value ${(parseFloat(session.final_balance) - parseFloat(session.start_value)) >= 0 ? 'profit' : 'loss'}`}>
                        {(parseFloat(session.final_balance) - parseFloat(session.start_value)) >= 0 ? '+' : ''}
                        €{(parseFloat(session.final_balance) - parseFloat(session.start_value)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                
                {session.conducted_by && (
                  <div className="session-conducted-by">
                    <span>👤 Conducted by: {session.conducted_by}</span>
                  </div>
                )}

                <div className="session-actions">
                  <button 
                    className="btn-sm btn-secondary"
                    onClick={() => openGuessSessionModal(session)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="btn-sm btn-secondary"
                    onClick={() => {
                      setSelectedSessionForSlots(session);
                      loadGuessBalanceSlots(session.id);
                    }}
                  >
                    🎰 Slots
                  </button>
                  <button 
                    className="btn-sm btn-secondary"
                    onClick={() => openSlotResultsModal(session)}
                  >
                    🎯 Results
                  </button>
                  <button 
                    className="btn-sm btn-secondary"
                    onClick={() => {
                      setSelectedSessionForSlots(session);
                      loadSessionGuesses(session.id);
                      setShowGuessesModal(true);
                    }}
                  >
                    💭 Guesses
                  </button>
                  <button 
                    className="btn-sm btn-secondary"
                    onClick={() => {
                      setSelectedSessionForSlots(session);
                      loadSessionVotes(session.id);
                      setShowVotesModal(true);
                    }}
                  >
                    🗳️ Votes
                  </button>
                  {!session.reveal_answer && (
                    <button 
                      className="btn-sm btn-warning"
                      onClick={() => endGuessSessionAndCalculateWinner(session.id)}
                    >
                      🏆 End & Calculate
                    </button>
                  )}
                  <button 
                    className="btn-sm btn-danger"
                    onClick={() => deleteGuessSession(session.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Slots Management Section (when session selected) */}
      {selectedSessionForSlots && (
        <div className="guess-balance-section slots-section">
          <div className="section-header">
            <h2>🎰 Slots for: {selectedSessionForSlots.title}</h2>
            <div className="section-actions">
              <button 
                className="btn-secondary"
                onClick={() => setSelectedSessionForSlots(null)}
              >
                ← Back to Sessions
              </button>
              <button 
                className="btn-primary"
                onClick={() => openSlotModal()}
              >
                + Add Slot
              </button>
            </div>
          </div>

          {guessBalanceSlots.length === 0 ? (
            <div className="empty-state">
              <p>No slots added to this session yet.</p>
            </div>
          ) : (
            <div className="slots-grid">
              {guessBalanceSlots.map((slot, index) => (
                <div key={slot.id} className={`slot-card ${slot.is_super ? 'super' : ''}`}>
                  <span className="slot-order">#{index + 1}</span>
                  {slot.slot_image_url ? (
                    <img src={slot.slot_image_url} alt={slot.slot_name} className="slot-image" />
                  ) : (
                    <div className="slot-image-placeholder">🎰</div>
                  )}
                  <div className="slot-info">
                    <h4>{slot.slot_name}</h4>
                    {slot.provider && <span className="slot-provider">{slot.provider}</span>}
                  </div>
                  <div className="slot-details">
                    <span className="slot-bet">Bet: €{slot.bet_value || '0.00'}</span>
                    {slot.bonus_win && (
                      <span className="slot-win">Win: €{slot.bonus_win}</span>
                    )}
                    {slot.is_super && <span className="super-badge">⭐ Super</span>}
                  </div>
                  <div className="slot-actions">
                    <button 
                      className="btn-sm btn-secondary"
                      onClick={() => openSlotModal(slot)}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-sm btn-danger"
                      onClick={() => deleteSlot(slot.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Session Edit Side Panel */}
      <SidePanel
        isOpen={showGuessBalanceModal}
        onClose={() => setShowGuessBalanceModal(false)}
        title={editingGuessSession ? 'Edit Session' : 'New Session'}
        size="large"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowGuessBalanceModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={saveGuessSession}>
              {editingGuessSession ? 'Update Session' : 'Create Session'}
            </button>
          </>
        }
      >
        <form className="session-form" onSubmit={saveGuessSession}>
          <div className="form-section-title">📋 Basic Info</div>
          <div className="form-group">
            <label>Session Title *</label>
            <input
              type="text"
              value={guessSessionFormData.title}
              onChange={(e) => setGuessSessionFormData({...guessSessionFormData, title: e.target.value})}
              placeholder="e.g., Friday Night Session"
              required
            />
          </div>
          <div className="form-row two-cols">
            <div className="form-group">
              <label>Stream Date</label>
              <input
                type="date"
                value={guessSessionFormData.stream_date}
                onChange={(e) => setGuessSessionFormData({...guessSessionFormData, stream_date: e.target.value})}
              />
            </div>
          </div>

          <div className="form-section-title">💰 Balance</div>
          <div className="form-row two-cols">
            <div className="form-group">
              <label>Start Value (€) *</label>
              <input
                type="number"
                step="0.01"
                value={guessSessionFormData.start_value}
                onChange={(e) => setGuessSessionFormData({...guessSessionFormData, start_value: e.target.value})}
                placeholder="1000.00"
              />
            </div>
            <div className="form-group">
              <label>Final Balance (€)</label>
              <input
                type="number"
                step="0.01"
                value={guessSessionFormData.final_balance}
                onChange={(e) => setGuessSessionFormData({...guessSessionFormData, final_balance: e.target.value})}
                placeholder="Set when session ends"
              />
              <small className="form-hint">Set when session ends</small>
            </div>
          </div>
          <div className="form-row two-cols">
            <div className="form-group">
              <label>Amount Expended (€)</label>
              <input
                type="number"
                step="0.01"
                value={sessionSlotsInModal.reduce((sum, s) => sum + (parseFloat(s.bet_value) || 0), 0).toFixed(2)}
                readOnly
                className="readonly-input"
              />
              <small className="form-hint">Auto-calculated from slots</small>
            </div>
            <div className="form-group">
              <label>BE Multiplier (x)</label>
              <input
                type="number"
                step="0.01"
                value={(() => {
                  const startVal = parseFloat(guessSessionFormData.start_value) || 0;
                  const finalBal = parseFloat(guessSessionFormData.final_balance) || 0;
                  const totalBets = sessionSlotsInModal.reduce((sum, s) => sum + (parseFloat(s.bet_value) || 0), 0);
                  if (startVal > 0 && totalBets > 0 && finalBal > 0) {
                    return ((finalBal / startVal) / totalBets).toFixed(2);
                  }
                  return '';
                })()}
                readOnly
                className="readonly-input"
                placeholder="Auto-calculated"
              />
              <small className="form-hint">= (Final ÷ Start) ÷ Total Bets</small>
            </div>
          </div>

          <div className="form-section-title">🏛️ Casino Info</div>
          <div className="form-row">
            <div className="form-group">
              <label>Casino Brand</label>
              <input
                type="text"
                value={guessSessionFormData.casino_brand}
                onChange={(e) => setGuessSessionFormData({...guessSessionFormData, casino_brand: e.target.value})}
                placeholder="e.g., Stake, Rollbit..."
              />
            </div>
            <div className="form-group">
              <label>Casino Logo URL</label>
              <input
                type="url"
                value={guessSessionFormData.casino_image_url}
                onChange={(e) => setGuessSessionFormData({...guessSessionFormData, casino_image_url: e.target.value})}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="form-section-title">👤 Hunt Info</div>
          <div className="form-row">
            <div className="form-group">
              <label>Conducted By</label>
              <input
                type="text"
                value={guessSessionFormData.conducted_by}
                onChange={(e) => setGuessSessionFormData({...guessSessionFormData, conducted_by: e.target.value})}
                placeholder="Who ran this hunt? e.g., StreamerName"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={guessSessionFormData.notes}
              onChange={(e) => setGuessSessionFormData({...guessSessionFormData, notes: e.target.value})}
              placeholder="Any notes about this session..."
              rows={3}
            />
          </div>

          <div className="form-section-title">⚙️ Settings</div>
          <div className="form-row checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={guessSessionFormData.is_guessing_open}
                onChange={(e) => setGuessSessionFormData({...guessSessionFormData, is_guessing_open: e.target.checked})}
              />
              <span>Guessing Open (users can submit guesses)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={guessSessionFormData.reveal_answer}
                onChange={(e) => setGuessSessionFormData({...guessSessionFormData, reveal_answer: e.target.checked})}
              />
              <span>Reveal Answer (show final balance to users)</span>
            </label>
          </div>

          {/* Slot Selection Section */}
          <div className="form-section-title">🎰 Add Slots</div>
          
          {/* Slot Search & Add Controls */}
          <div className="slot-picker-section">
            <div className="slot-picker-controls">
              <div className="form-group slot-search-group">
                <label>Search Slots</label>
                <input
                  type="text"
                  value={slotSearchQuery}
                  onChange={(e) => setSlotSearchQuery(e.target.value)}
                  placeholder="Type to search slots..."
                  className="slot-search-input"
                />
              </div>
              <div className="slot-picker-row">
                <div className="form-group bet-group">
                  <label>Bet Value (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSlotBetValue}
                    onChange={(e) => setNewSlotBetValue(parseFloat(e.target.value) || 0)}
                    placeholder="1.00"
                    className="bet-input"
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label className="checkbox-label super-checkbox">
                    <input
                      type="checkbox"
                      checked={newSlotIsSuper}
                      onChange={(e) => setNewSlotIsSuper(e.target.checked)}
                    />
                    <span>⭐ Super</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Slot Catalog Results */}
            {slotSearchQuery && (
              <div className="slot-catalog-results">
                <div className="catalog-debug" style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px'}}>
                  Searching in {slotCatalog.length} slots • Found {filteredSlotCatalog.length} matches
                </div>
                {filteredSlotCatalog.length === 0 ? (
                  <div className="no-results">No slots found matching "{slotSearchQuery}"</div>
                ) : (
                  <div className="slot-catalog-grid">
                    {filteredSlotCatalog.slice(0, 20).map((slot) => (
                      <div 
                        key={slot.id} 
                        className="slot-catalog-item"
                        onClick={() => addSlotToSession(slot)}
                      >
                        <img src={slot.image} alt={slot.name} className="slot-catalog-image" />
                        <div className="slot-catalog-info">
                          <span className="slot-catalog-name">{slot.name}</span>
                          <span className="slot-catalog-provider">{slot.provider}</span>
                        </div>
                        <button type="button" className="add-slot-btn">+</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Added Slots List */}
          <div className="session-slots-list">
            <div className="slots-list-header">
              <span>Added Slots ({sessionSlotsInModal.length})</span>
              <span className="total-bets">Total Bets: €{sessionSlotsInModal.reduce((sum, s) => sum + (parseFloat(s.bet_value) || 0), 0).toFixed(2)}</span>
            </div>
            
            {sessionSlotsInModal.length === 0 ? (
              <div className="no-slots-added">
                <p>No slots added yet. Search and add slots above.</p>
              </div>
            ) : (
              <div className="added-slots-grid">
                {sessionSlotsInModal.map((slot, index) => (
                  <div key={slot.id || slot.tempId} className={`added-slot-item ${slot.is_super ? 'super' : ''}`}>
                    <span className="slot-order">#{index + 1}</span>
                    {slot.slot_image_url ? (
                      <img src={slot.slot_image_url} alt={slot.slot_name} className="added-slot-image" />
                    ) : (
                      <div className="added-slot-placeholder">🎰</div>
                    )}
                    <div className="added-slot-info">
                      <span className="added-slot-name">{slot.slot_name}</span>
                      <span className="added-slot-provider">{slot.provider}</span>
                    </div>
                    <span className="added-slot-bet">€{parseFloat(slot.bet_value || 0).toFixed(2)}</span>
                    {slot.is_super && <span className="super-badge">⭐</span>}
                    <button 
                      type="button" 
                      className="remove-slot-btn"
                      onClick={() => removeSlotFromSession(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </SidePanel>

      {/* Slot Side Panel */}
      <SidePanel
        isOpen={showSlotModal}
        onClose={() => setShowSlotModal(false)}
        title={editingSlot ? 'Edit Slot' : 'Add New Slot'}
        size="medium"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowSlotModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={(e) => {
              e.preventDefault();
              saveSlot(e);
            }}>
              {editingSlot ? 'Update Slot' : 'Add Slot'}
            </button>
          </>
        }
      >
        <form className="slot-form">
          <div className="form-row">
            <div className="form-group">
              <label>Slot Name *</label>
              <input
                type="text"
                value={slotFormData.slot_name}
                onChange={(e) => setSlotFormData({...slotFormData, slot_name: e.target.value})}
                placeholder="e.g., Gates of Olympus"
                required
              />
            </div>
            <div className="form-group">
              <label>Provider</label>
              <input
                type="text"
                value={slotFormData.provider}
                onChange={(e) => setSlotFormData({...slotFormData, provider: e.target.value})}
                placeholder="e.g., Pragmatic Play"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Slot Image URL</label>
            <input
              type="url"
              value={slotFormData.slot_image_url}
              onChange={(e) => setSlotFormData({...slotFormData, slot_image_url: e.target.value})}
              placeholder="https://..."
            />
            {slotFormData.slot_image_url && (
              <img src={slotFormData.slot_image_url} alt="Preview" className="image-preview" />
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Bet Value (€)</label>
              <input
                type="number"
                step="0.01"
                value={slotFormData.bet_value}
                onChange={(e) => setSlotFormData({...slotFormData, bet_value: e.target.value})}
                placeholder="1.00"
              />
            </div>
            <div className="form-group">
              <label>Display Order</label>
              <input
                type="number"
                value={slotFormData.display_order}
                onChange={(e) => setSlotFormData({...slotFormData, display_order: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group checkbox-inline">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={slotFormData.is_super}
                onChange={(e) => setSlotFormData({...slotFormData, is_super: e.target.checked})}
              />
              <span>⭐ Is Super/Bonus Slot</span>
            </label>
          </div>

          <div className="form-section-title">🏆 Results (optional - fill when bonus opens)</div>
          <div className="form-row">
            <div className="form-group">
              <label>Bonus Win (€)</label>
              <input
                type="number"
                step="0.01"
                value={slotFormData.bonus_win}
                onChange={(e) => setSlotFormData({...slotFormData, bonus_win: e.target.value})}
                placeholder="Leave empty until opened"
              />
            </div>
            <div className="form-group">
              <label>Multiplier (x)</label>
              <input
                type="number"
                step="0.01"
                value={slotFormData.multiplier}
                onChange={(e) => setSlotFormData({...slotFormData, multiplier: e.target.value})}
                placeholder="e.g., 150"
              />
            </div>
          </div>
        </form>
      </SidePanel>

      {/* Slot Results Entry Side Panel */}
      <SidePanel
        isOpen={showSlotResultsModal && guessBalanceSlots && guessBalanceSlots.length > 0}
        onClose={() => setShowSlotResultsModal(false)}
        title="🎯 Enter Slot Results"
        size="large"
        footer={
          <>
            <button 
              className="btn-save-result"
              onClick={() => saveSlotResult(guessBalanceSlots[currentSlotIndex])}
            >
              💾 Save & Continue
            </button>
            <button 
              className="btn-save-all"
              onClick={async () => {
                for (const slot of guessBalanceSlots) {
                  if (slot.bonus_win !== null && slot.bonus_win !== '') {
                    await saveSlotResult(slot, false);
                  }
                }
                showNotification('All results saved!', 'success');
                setShowSlotResultsModal(false);
              }}
            >
              ✅ Save All & Close
            </button>
          </>
        }
      >
        <div className="slot-results-content">
          {/* Progress indicator */}
          <div className="slot-results-progress">
            <span>Slot {currentSlotIndex + 1} of {guessBalanceSlots.length}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentSlotIndex + 1) / guessBalanceSlots.length) * 100}%` }}
              />
            </div>
            <span className="completed-count">
              {guessBalanceSlots.filter(s => s.bonus_win !== null && s.bonus_win !== '').length} completed
            </span>
          </div>

          {/* Current slot display */}
          {(() => {
            const currentSlot = guessBalanceSlots[currentSlotIndex];
            if (!currentSlot) return null;
            
            return (
              <div className="current-slot-display">
                <div className="slot-image-large">
                  {currentSlot.slot_image_url ? (
                    <img src={currentSlot.slot_image_url} alt={currentSlot.slot_name} />
                  ) : (
                    <div className="no-image-large">🎰</div>
                  )}
                  {currentSlot.is_super && <span className="super-badge-large">⭐ SUPER</span>}
                </div>
                
                <div className="slot-info-large">
                  <h3>{currentSlot.slot_name}</h3>
                  {currentSlot.provider && <p className="slot-provider">{currentSlot.provider}</p>}
                  <p className="slot-bet">Bet: €{currentSlot.bet_value || '0.00'}</p>
                </div>

                <div className="result-inputs">
                  <div className="input-group">
                    <label>💰 Bonus Win (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentSlot.bonus_win || ''}
                      onChange={(e) => {
                        const updatedSlots = [...guessBalanceSlots];
                        updatedSlots[currentSlotIndex] = {
                          ...currentSlot,
                          bonus_win: e.target.value
                        };
                        setGuessBalanceSlots(updatedSlots);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Save current and move to next slot
                          if (currentSlotIndex < guessBalanceSlots.length - 1) {
                            goToSlot(currentSlotIndex + 1);
                          }
                        }
                      }}
                      placeholder="Enter win amount..."
                      autoFocus
                    />
                  </div>
                  {currentSlot.bet_value && currentSlot.bonus_win && (
                    <div className="auto-multiplier">
                      📊 Multiplier: {(parseFloat(currentSlot.bonus_win) / parseFloat(currentSlot.bet_value)).toFixed(2)}x
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Navigation */}
          <div className="slot-results-navigation">
            <button 
              className="btn-nav" 
              onClick={() => goToSlot(currentSlotIndex - 1)}
              disabled={currentSlotIndex === 0}
            >
              ← Previous
            </button>
            
            <div className="slot-dots">
              {guessBalanceSlots.map((slot, idx) => (
                <button
                  key={idx}
                  className={`dot ${idx === currentSlotIndex ? 'active' : ''} ${slot.bonus_win ? 'completed' : ''}`}
                  onClick={() => goToSlot(idx)}
                  title={slot.slot_name}
                />
              ))}
            </div>

            <button 
              className="btn-nav" 
              onClick={() => goToSlot(currentSlotIndex + 1)}
              disabled={currentSlotIndex === guessBalanceSlots.length - 1}
            >
              Next →
            </button>
          </div>
        </div>
      </SidePanel>

      {/* Guesses List Side Panel */}
      <SidePanel
        isOpen={showGuessesModal}
        onClose={() => setShowGuessesModal(false)}
        title={`💭 Player Guesses - ${selectedSessionForSlots?.title || ''}`}
        size="large"
      >
        <div className="guesses-list-container">
          {sessionGuesses.length === 0 ? (
            <div className="empty-state">
              <p>No guesses submitted yet for this session.</p>
            </div>
          ) : (
            <>
              <div className="guesses-summary">
                <span className="total-guesses">Total: {sessionGuesses.length} guesses</span>
              </div>
              <div className="guesses-table-wrapper">
                <table className="guesses-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Guess</th>
                      <th>Time</th>
                      <th>Winner?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionGuesses.map((guess, index) => (
                      <tr key={guess.id} className={guess.is_winner ? 'winner-row' : ''}>
                        <td>{index + 1}</td>
                        <td>{guess.display_name || 'Anonymous'}</td>
                        <td className="guess-amount">€{parseFloat(guess.guessed_balance).toFixed(2)}</td>
                        <td className="guess-time">{new Date(guess.guessed_at).toLocaleString()}</td>
                        <td>{guess.is_winner ? '🏆 Winner!' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </SidePanel>

      {/* Votes List Side Panel */}
      <SidePanel
        isOpen={showVotesModal}
        onClose={() => setShowVotesModal(false)}
        title={`🗳️ Slot Votes - ${selectedSessionForSlots?.title || ''}`}
        size="large"
      >
        <div className="votes-list-container">
          {sessionVotes.length === 0 ? (
            <div className="empty-state">
              <p>No votes cast yet for this session.</p>
            </div>
          ) : (
            <>
              <div className="votes-summary">
                <span className="total-votes">Total: {sessionVotes.length} votes</span>
                <span className="best-votes">👍 Best: {sessionVotes.filter(v => v.vote_type === 'best').length}</span>
                <span className="worst-votes">👎 Worst: {sessionVotes.filter(v => v.vote_type === 'worst').length}</span>
              </div>
              <div className="votes-table-wrapper">
                <table className="votes-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Slot</th>
                      <th>Vote</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionVotes.map((vote, index) => (
                      <tr key={vote.id} className={`vote-row ${vote.vote_type}`}>
                        <td>{index + 1}</td>
                        <td>{vote.display_name || 'Anonymous'}</td>
                        <td className="slot-name">{vote.slot_name}</td>
                        <td className={`vote-type ${vote.vote_type}`}>
                          {vote.vote_type === 'best' ? '👍 Best' : '👎 Worst'}
                        </td>
                        <td className="vote-time">{new Date(vote.voted_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </SidePanel>
    </div>
  );
}
