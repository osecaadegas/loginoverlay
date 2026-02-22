import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../../config/supabaseClient';
import PokerTable from './PokerTable';
import './CasinoLobby.css';
import { 
  SidePanel,
  PanelSection, 
  PanelButton,
  PanelButtonGroup
} from '../../components/SidePanel';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  maxTablesPerPage: 10,
  refreshInterval: 5000, // 5 seconds
  defaultSeats: 6,
  actionTimeout: 30, // seconds
};

// Table templates for different game types
const TABLE_TEMPLATES = {
  poker: {
    name: 'Texas Hold\'em',
    icon: '🃏',
    minBuyIn: 100,
    maxBuyIn: 10000,
    seats: 6,
    smallBlind: 5,
    bigBlind: 10
  },
  blackjack: {
    name: 'Blackjack',
    icon: '🎰',
    minBuyIn: 50,
    maxBuyIn: 5000,
    seats: 7,
    minBet: 10,
    maxBet: 500
  },
  roulette: {
    name: 'Roulette',
    icon: '🎡',
    minBuyIn: 50,
    maxBuyIn: 10000,
    seats: 8,
    minBet: 5,
    maxBet: 1000
  }
};

// ============================================
// CASINO LOBBY COMPONENT
// ============================================
export default function CasinoLobby({
  player,
  setPlayer,
  setMessage,
  user,
  onBack
}) {
  // State
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeView, setActiveView] = useState('lobby'); // 'lobby', 'table', 'spectate'
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'poker', 'blackjack', 'roulette'
  const [sortBy, setSortBy] = useState('players'); // 'players', 'stakes', 'seats'
  
  // Create table form state
  const [newTable, setNewTable] = useState({
    gameType: 'poker',
    name: '',
    isPrivate: false,
    password: '',
    minBuyIn: 100,
    maxBuyIn: 10000,
    seats: 6
  });

  // Current player's seat info
  const [mySeat, setMySeat] = useState(null);
  const [myTableBalance, setMyTableBalance] = useState(0);

  // Refs
  const refreshIntervalRef = useRef(null);
  const subscriptionRef = useRef(null);

  // ============================================
  // LOAD TABLES FROM DATABASE
  // ============================================
  const loadTables = useCallback(async () => {
    try {
      let query = supabase
        .from('casino_tables')
        .select(`
          *,
          casino_seats (
            seat_number,
            user_id,
            player_name,
            avatar_url,
            balance,
            is_active,
            is_ready
          )
        `)
        .eq('is_active', true);

      if (filter !== 'all') {
        query = query.eq('game_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process tables with player counts
      const processedTables = (data || []).map(table => ({
        ...table,
        currentPlayers: table.casino_seats?.filter(s => s.is_active).length || 0,
        availableSeats: table.max_seats - (table.casino_seats?.filter(s => s.is_active).length || 0)
      }));

      // Sort tables
      processedTables.sort((a, b) => {
        if (sortBy === 'players') return b.currentPlayers - a.currentPlayers;
        if (sortBy === 'stakes') return b.min_buyin - a.min_buyin;
        if (sortBy === 'seats') return b.availableSeats - a.availableSeats;
        return 0;
      });

      setTables(processedTables);
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, sortBy]);

  // ============================================
  // REAL-TIME SUBSCRIPTION
  // ============================================
  useEffect(() => {
    loadTables();

    // Set up real-time subscription for table updates
    subscriptionRef.current = supabase
      .channel('casino_tables_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'casino_tables' },
        () => loadTables()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'casino_seats' },
        () => loadTables()
      )
      .subscribe();

    // Refresh interval as backup
    refreshIntervalRef.current = setInterval(loadTables, CONFIG.refreshInterval);

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadTables]);

  // ============================================
  // CREATE TABLE
  // ============================================
  const handleCreateTable = async () => {
    if (!newTable.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter a table name' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('casino_tables')
        .insert({
          name: newTable.name,
          game_type: newTable.gameType,
          min_buyin: newTable.minBuyIn,
          max_buyin: newTable.maxBuyIn,
          max_seats: newTable.seats,
          is_private: newTable.isPrivate,
          password_hash: newTable.isPrivate ? newTable.password : null,
          created_by: player.id,
          small_blind: TABLE_TEMPLATES[newTable.gameType].smallBlind || 5,
          big_blind: TABLE_TEMPLATES[newTable.gameType].bigBlind || 10,
          status: 'waiting',
          game_state: { phase: 'waiting', round: 0 }
        })
        .select()
        .single();

      if (error) throw error;

      setMessage({ type: 'success', text: `Table "${newTable.name}" created!` });
      setShowCreateModal(false);
      setNewTable({
        gameType: 'poker',
        name: '',
        isPrivate: false,
        password: '',
        minBuyIn: 100,
        maxBuyIn: 10000,
        seats: 6
      });
      
      // Auto-join the created table
      handleJoinTable(data);
    } catch (error) {
      console.error('Error creating table:', error);
      setMessage({ type: 'error', text: 'Failed to create table' });
    }
  };

  // ============================================
  // JOIN TABLE
  // ============================================
  const handleJoinTable = async (table, password = null) => {
    // Check if private table needs password
    if (table.is_private && table.password_hash && !password) {
      const inputPassword = prompt('Enter table password:');
      if (inputPassword !== table.password_hash) {
        setMessage({ type: 'error', text: 'Incorrect password' });
        return;
      }
    }

    setSelectedTable(table);
    setActiveView('table');
  };

  // ============================================
  // SPECTATE TABLE
  // ============================================
  const handleSpectateTable = (table) => {
    setSelectedTable(table);
    setActiveView('spectate');
  };

  // ============================================
  // LEAVE TABLE
  // ============================================
  const handleLeaveTable = async () => {
    if (mySeat) {
      try {
        // Return balance to player
        if (myTableBalance > 0) {
          const { data: cashResult, error: cashError } = await supabase.rpc('adjust_player_cash', { p_amount: myTableBalance });
          if (cashError) console.error('Error returning balance:', cashError);
          if (cashResult?.player) setPlayer(prev => ({ ...prev, cash: cashResult.player.cash }));
        }

        // Remove seat
        await supabase
          .from('casino_seats')
          .delete()
          .eq('table_id', selectedTable.id)
          .eq('user_id', user.id);

        setMySeat(null);
        setMyTableBalance(0);
      } catch (error) {
        console.error('Error leaving table:', error);
      }
    }

    setSelectedTable(null);
    setActiveView('lobby');
    loadTables();
  };

  // ============================================
  // RENDER LOBBY
  // ============================================
  const renderLobby = () => (
    <div className="casino-lobby">
      {/* Header */}
      <div className="lobby-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="lobby-title">
          <h1>UNDERGROUND <span>CASINO</span></h1>
          <p className="lobby-subtitle">Choose your table wisely, criminal.</p>
        </div>
        <div className="player-balance">
          <span className="balance-label">CASH</span>
          <span className="balance-amount">${player.cash?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="lobby-controls">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Tables
          </button>
          <button 
            className={`filter-tab ${filter === 'poker' ? 'active' : ''}`}
            onClick={() => setFilter('poker')}
          >
            🃏 Poker
          </button>
          <button 
            className={`filter-tab ${filter === 'blackjack' ? 'active' : ''}`}
            onClick={() => setFilter('blackjack')}
          >
            🎰 Blackjack
          </button>
          <button 
            className={`filter-tab ${filter === 'roulette' ? 'active' : ''}`}
            onClick={() => setFilter('roulette')}
          >
            🎡 Roulette
          </button>
        </div>

        <div className="lobby-actions">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="players">Sort: Most Players</option>
            <option value="stakes">Sort: Highest Stakes</option>
            <option value="seats">Sort: Most Seats</option>
          </select>
          <button 
            className="create-table-btn"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Table
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="tables-grid">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading tables...</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎰</div>
            <h3>No Tables Available</h3>
            <p>Be the first to create a table!</p>
            <button 
              className="create-table-btn"
              onClick={() => setShowCreateModal(true)}
            >
              + Create Table
            </button>
          </div>
        ) : (
          tables.map(table => (
            <div key={table.id} className={`table-card ${table.game_type}`}>
              <div className="table-card-header">
                <span className="game-icon">{TABLE_TEMPLATES[table.game_type]?.icon}</span>
                <div className="table-info">
                  <h3>{table.name}</h3>
                  <span className="game-type">{TABLE_TEMPLATES[table.game_type]?.name}</span>
                </div>
                {table.is_private && <span className="private-badge">🔒</span>}
              </div>

              <div className="table-card-body">
                <div className="seats-visual">
                  {Array.from({ length: table.max_seats }).map((_, i) => {
                    const seat = table.casino_seats?.find(s => s.seat_number === i && s.is_active);
                    return (
                      <div 
                        key={i} 
                        className={`seat-indicator ${seat ? 'occupied' : 'empty'}`}
                        title={seat ? seat.player_name : 'Empty seat'}
                      >
                        {seat ? (
                          <img src={seat.avatar_url || '/default-avatar.png'} alt="" />
                        ) : (
                          <span className="empty-seat">+</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="table-stats">
                  <div className="stat">
                    <span className="stat-label">Players</span>
                    <span className="stat-value">{table.currentPlayers}/{table.max_seats}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Buy-in</span>
                    <span className="stat-value">${table.min_buyin} - ${table.max_buyin}</span>
                  </div>
                  {table.game_type === 'poker' && (
                    <div className="stat">
                      <span className="stat-label">Blinds</span>
                      <span className="stat-value">${table.small_blind}/${table.big_blind}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="table-card-actions">
                <button 
                  className="join-btn"
                  onClick={() => handleJoinTable(table)}
                  disabled={table.availableSeats === 0 || player.cash < table.min_buyin}
                >
                  {table.availableSeats === 0 ? 'Full' : 
                   player.cash < table.min_buyin ? 'Not Enough Cash' : 'Join Table'}
                </button>
                <button 
                  className="spectate-btn"
                  onClick={() => handleSpectateTable(table)}
                >
                  👁 Watch
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Table Side Panel */}
      <SidePanel
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Table"
        subtitle="Set up your poker room"
        width="460px"
        footer={
          <PanelButtonGroup>
            <PanelButton variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </PanelButton>
            <PanelButton variant="primary" onClick={handleCreateTable}>
              Create Table
            </PanelButton>
          </PanelButtonGroup>
        }
      >
        <PanelSection title="Game Type">
          <div className="game-type-selector" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Object.entries(TABLE_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                className={`game-type-btn ${newTable.gameType === key ? 'active' : ''}`}
                onClick={() => setNewTable(prev => ({ 
                  ...prev, 
                  gameType: key,
                  seats: template.seats,
                  minBuyIn: template.minBuyIn,
                  maxBuyIn: template.maxBuyIn
                }))}
                style={{
                  flex: '1 0 calc(50% - 5px)',
                  padding: '14px 16px',
                  background: newTable.gameType === key ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                  border: newTable.gameType === key ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{template.icon}</span>
                <span style={{ color: newTable.gameType === key ? '#d4af37' : '#8a8d96', fontWeight: '600', fontSize: '0.9rem' }}>{template.name}</span>
              </button>
            ))}
          </div>
        </PanelSection>

        <PanelSection title="Table Name">
          <div className="thelife-panel-field">
            <input
              type="text"
              value={newTable.name}
              onChange={(e) => setNewTable(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., High Rollers Only"
              maxLength={30}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '1rem'
              }}
            />
          </div>
        </PanelSection>

        <PanelSection title="Buy-in Limits">
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="thelife-panel-field" style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#8a8d96', fontSize: '0.8rem', marginBottom: '8px' }}>Min Buy-in</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '10px', padding: '0 14px', height: '48px' }}>
                <span style={{ color: '#22c55e', fontWeight: '700', marginRight: '4px' }}>$</span>
                <input
                  type="number"
                  value={newTable.minBuyIn}
                  onChange={(e) => setNewTable(prev => ({ ...prev, minBuyIn: parseInt(e.target.value) || 0 }))}
                  min={10}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: '#22c55e', fontSize: '1.1rem', fontWeight: '700', padding: 0 }}
                />
              </div>
            </div>
            <div className="thelife-panel-field" style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#8a8d96', fontSize: '0.8rem', marginBottom: '8px' }}>Max Buy-in</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '10px', padding: '0 14px', height: '48px' }}>
                <span style={{ color: '#22c55e', fontWeight: '700', marginRight: '4px' }}>$</span>
                <input
                  type="number"
                  value={newTable.maxBuyIn}
                  onChange={(e) => setNewTable(prev => ({ ...prev, maxBuyIn: parseInt(e.target.value) || 0 }))}
                  min={newTable.minBuyIn}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: '#22c55e', fontSize: '1.1rem', fontWeight: '700', padding: 0 }}
                />
              </div>
            </div>
          </div>
        </PanelSection>

        <PanelSection title={`Seats: ${newTable.seats}`}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[2, 4, 6, 8, 10].map(seats => (
              <button
                key={seats}
                onClick={() => setNewTable(prev => ({ ...prev, seats }))}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  background: newTable.seats === seats ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                  border: newTable.seats === seats ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '10px',
                  color: newTable.seats === seats ? '#d4af37' : '#8a8d96',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {seats}
              </button>
            ))}
          </div>
        </PanelSection>

        <PanelSection title="Privacy">
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '14px 16px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <input
              type="checkbox"
              checked={newTable.isPrivate}
              onChange={(e) => setNewTable(prev => ({ ...prev, isPrivate: e.target.checked }))}
              style={{ width: '20px', height: '20px', accentColor: '#d4af37' }}
            />
            <span style={{ color: '#ffffff', fontWeight: '500' }}>Private Table (Password Required)</span>
          </label>

          {newTable.isPrivate && (
            <div className="thelife-panel-field" style={{ marginTop: '12px' }}>
              <input
                type="password"
                value={newTable.password}
                onChange={(e) => setNewTable(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter table password"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '1rem'
                }}
              />
            </div>
          )}
        </PanelSection>
      </SidePanel>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  if (activeView === 'table' && selectedTable) {
    return (
      <PokerTable
        table={selectedTable}
        player={player}
        setPlayer={setPlayer}
        setMessage={setMessage}
        user={user}
        onLeave={handleLeaveTable}
        isSpectator={false}
      />
    );
  }

  if (activeView === 'spectate' && selectedTable) {
    return (
      <PokerTable
        table={selectedTable}
        player={player}
        setPlayer={setPlayer}
        setMessage={setMessage}
        user={user}
        onLeave={handleLeaveTable}
        isSpectator={true}
      />
    );
  }

  return renderLobby();
}
