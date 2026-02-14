/**
 * PLAYER MANAGEMENT PAGE
 * Professional admin interface for managing player accounts
 * 
 * Features:
 * - Player search (username/ID/Twitch)
 * - Full profile view with tabs
 * - Inline editing with confirmation
 * - Diff viewer for changes
 * - Action history
 * - Rollback system
 * - Admin notes
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../config/supabaseClient';
import { Search, User, DollarSign, Package, Shield, History, ChevronRight, Ban, RotateCcw, Plus } from 'lucide-react';
import './PlayerManagement.css';

const API_URL = '/api/player-management'; // Vercel serverless function wrapper

export default function PlayerManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('username');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showConfirmModal, setShowConfirmModal] = useState(null);

  // Load player from URL parameter
  useEffect(() => {
    const playerId = searchParams.get('player');
    if (playerId) {
      loadPlayer(playerId);
    }
  }, [searchParams]);

  // =====================================================
  // API CALLS
  // =====================================================

  const apiCall = async (action, params = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ action, ...params })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API error');
    }
    return data;
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const data = await apiCall('search', {
        query: searchQuery,
        searchBy,
        limit: 50
      });

      setSearchResults(data.players || []);
    } catch (error) {
      alert('Search failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD FULL PLAYER PROFILE
  // =====================================================

  const loadPlayer = async (playerId) => {
    setLoading(true);
    try {
      const data = await apiCall('view', { playerId });
      setSelectedPlayer(data.player);
      setSearchParams({ player: playerId });
      setActiveTab('profile');
    } catch (error) {
      alert('Failed to load player: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // EDIT ACTIONS
  // =====================================================

  const editMoney = async (field, amount) => {
    const reason = prompt(`Reason for ${amount > 0 ? 'adding' : 'removing'} ${Math.abs(amount)} ${field}:`);
    if (!reason) return;

    try {
      await apiCall('edit:money', {
        playerId: selectedPlayer.id,
        field,
        amount,
        reason
      });

      alert('Updated successfully');
      loadPlayer(selectedPlayer.id);
    } catch (error) {
      alert('Failed: ' + error.message);
    }
  };

  const editLevel = async () => {
    const newLevel = prompt('New level:', selectedPlayer.level);
    const newXP = prompt('New XP:', selectedPlayer.xp);
    const reason = prompt('Reason for change:');

    if (!reason) return;

    try {
      await apiCall('edit:level', {
        playerId: selectedPlayer.id,
        level: newLevel ? parseInt(newLevel) : undefined,
        xp: newXP ? parseInt(newXP) : undefined,
        reason
      });

      alert('Level updated');
      loadPlayer(selectedPlayer.id);
    } catch (error) {
      alert('Failed: ' + error.message);
    }
  };

  const tempBan = async () => {
    const duration = prompt('Ban duration (hours, max 168):');
    const reason = prompt('Ban reason:');

    if (!duration || !reason) return;

    try {
      await apiCall('ban:temp', {
        playerId: selectedPlayer.id,
        duration: parseInt(duration),
        reason
      });

      alert(`Player banned for ${duration} hours`);
      loadPlayer(selectedPlayer.id);
    } catch (error) {
      alert('Failed: ' + error.message);
    }
  };

  const permBan = async () => {
    const confirmed = confirm('⚠️ PERMANENT BAN - This cannot be undone easily. Are you sure?');
    if (!confirmed) return;

    const reason = prompt('Permanent ban reason:');
    if (!reason) return;

    try {
      await apiCall('ban:perm', {
        playerId: selectedPlayer.id,
        reason
      });

      alert('Player permanently banned');
      loadPlayer(selectedPlayer.id);
    } catch (error) {
      alert('Failed: ' + error.message);
    }
  };

  const unban = async () => {
    const reason = prompt('Reason for unban:');
    if (!reason) return;

    try {
      await apiCall('unban', {
        playerId: selectedPlayer.id,
        reason
      });

      alert('Player unbanned');
      loadPlayer(selectedPlayer.id);
    } catch (error) {
      alert('Failed: ' + error.message);
    }
  };

  const addNote = async () => {
    const noteType = prompt('Note type (info/warning/investigation):');
    const noteContent = prompt('Note content:');

    if (!noteType || !noteContent) return;

    try {
      await apiCall('notes:add', {
        playerId: selectedPlayer.id,
        noteType,
        noteContent
      });

      alert('Note added');
      loadPlayer(selectedPlayer.id);
    } catch (error) {
      alert('Failed: ' + error.message);
    }
  };

  const rollbackAction = async (actionId) => {
    const reason = prompt('Reason for rollback:');
    if (!reason) return;

    try {
      await apiCall('rollback', {
        actionId,
        reason
      });

      alert('Action rolled back');
      loadPlayer(selectedPlayer.id);
    } catch (error) {
      alert('Failed: ' + error.message);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="player-management-page">
      <div className="page-header">
        <h1>👥 Player Management</h1>
        <p>Search, view, and manage player accounts</p>
      </div>

      {/* SEARCH BAR */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-bar">
          <select 
            value={searchBy} 
            onChange={(e) => setSearchBy(e.target.value)}
            className="search-type-select"
          >
            <option value="username">Username</option>
            <option value="id">Player ID</option>
            <option value="twitch_id">Twitch ID</option>
          </select>
          
          <input
            type="text"
            placeholder={`Search by ${searchBy}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          
          <button type="submit" className="search-btn" disabled={loading}>
            <Search size={18} />
            Search
          </button>
        </form>

        {/* SEARCH RESULTS */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <div className="results-header">
              <span>{searchResults.length} players found</span>
            </div>
            <div className="results-list">
              {searchResults.map(player => (
                <div 
                  key={player.id} 
                  className="result-item"
                  onClick={() => loadPlayer(player.id)}
                >
                  <div className="result-info">
                    <strong>{player.username}</strong>
                    <span>Level {player.level}</span>
                  </div>
                  <div className="result-stats">
                    <span>${(player.cash + player.bank).toLocaleString()}</span>
                    {player.is_banned && <span className="badge banned">BANNED</span>}
                    {player.is_flagged && <span className="badge flagged">FLAGGED</span>}
                  </div>
                  <ChevronRight size={18} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PLAYER PROFILE */}
      {selectedPlayer && (
        <div className="player-profile-section">
          {/* PLAYER HEADER */}
          <div className="player-header">
            <div className="player-avatar">
              <img src={selectedPlayer.avatar_url || '/default-avatar.png'} alt={selectedPlayer.username} />
              {selectedPlayer.is_banned && <span className="status-badge banned">BANNED</span>}
              {selectedPlayer.is_flagged && <span className="status-badge flagged">FLAGGED</span>}
            </div>
            <div className="player-info">
              <h2>{selectedPlayer.username}</h2>
              <p className="player-id">ID: {selectedPlayer.id}</p>
              <div className="player-quick-stats">
                <span>Level {selectedPlayer.level}</span>
                <span>•</span>
                <span>${(selectedPlayer.cash + selectedPlayer.bank).toLocaleString()}</span>
                <span>•</span>
                <span>Risk Score: {selectedPlayer.riskScore?.total_risk_score || 0}</span>
              </div>
            </div>
            <div className="player-actions">
              {!selectedPlayer.is_banned ? (
                <>
                  <button onClick={tempBan} className="btn-warning">
                    <Ban size={16} />
                    Temp Ban
                  </button>
                  <button onClick={permBan} className="btn-danger">
                    <Ban size={16} />
                    Perm Ban
                  </button>
                </>
              ) : (
                <button onClick={unban} className="btn-success">
                  <RotateCcw size={16} />
                  Unban
                </button>
              )}
              <button onClick={addNote} className="btn-secondary">
                <Plus size={16} />
                Add Note
              </button>
            </div>
          </div>

          {/* TABS */}
          <div className="profile-tabs">
            {['profile', 'economy', 'inventory', 'security', 'history'].map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'profile' && <User size={16} />}
                {tab === 'economy' && <DollarSign size={16} />}
                {tab === 'inventory' && <Package size={16} />}
                {tab === 'security' && <Shield size={16} />}
                {tab === 'history' && <History size={16} />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="tab-content">
            {activeTab === 'profile' && (
              <ProfileTab player={selectedPlayer} onEdit={editLevel} />
            )}
            {activeTab === 'economy' && (
              <EconomyTab player={selectedPlayer} onEdit={editMoney} />
            )}
            {activeTab === 'inventory' && (
              <InventoryTab player={selectedPlayer} />
            )}
            {activeTab === 'security' && (
              <SecurityTab player={selectedPlayer} />
            )}
            {activeTab === 'history' && (
              <HistoryTab player={selectedPlayer} onRollback={rollbackAction} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// TAB COMPONENTS
// =====================================================

function ProfileTab({ player, onEdit }) {
  return (
    <div className="profile-tab">
      <div className="stat-grid">
        <StatCard label="Username" value={player.username} />
        <StatCard label="Level" value={player.level} editable onEdit={onEdit} />
        <StatCard label="XP" value={player.xp} editable onEdit={onEdit} />
        <StatCard label="Created" value={new Date(player.created_at).toLocaleDateString()} />
        <StatCard label="Last Login" value={new Date(player.last_login).toLocaleDateString()} />
        <StatCard label="Playtime" value={`${Math.floor((player.playtime_seconds || 0) / 3600)}h`} />
      </div>
    </div>
  );
}

function EconomyTab({ player, onEdit }) {
  return (
    <div className="economy-tab">
      <div className="economy-grid">
        <div className="economy-card">
          <h3>Cash</h3>
          <div className="economy-value">${player.cash.toLocaleString()}</div>
          <div className="economy-actions">
            <button onClick={() => onEdit('cash', 1000)} className="btn-sm">+1K</button>
            <button onClick={() => onEdit('cash', 10000)} className="btn-sm">+10K</button>
            <button onClick={() => onEdit('cash', -1000)} className="btn-sm btn-danger">-1K</button>
          </div>
        </div>

        <div className="economy-card">
          <h3>Bank</h3>
          <div className="economy-value">${player.bank.toLocaleString()}</div>
          <div className="economy-actions">
            <button onClick={() => onEdit('bank', 1000)} className="btn-sm">+1K</button>
            <button onClick={() => onEdit('bank', 10000)} className="btn-sm">+10K</button>
            <button onClick={() => onEdit('bank', -1000)} className="btn-sm btn-danger">-1K</button>
          </div>
        </div>

        <div className="economy-card total">
          <h3>Total Net Worth</h3>
          <div className="economy-value">${(player.cash + player.bank).toLocaleString()}</div>
        </div>
      </div>

      <div className="businesses-section">
        <h3>Businesses Owned ({player.businesses?.length || 0})</h3>
        {player.businesses && player.businesses.length > 0 ? (
          <div className="business-list">
            {player.businesses.map(biz => (
              <div key={biz.id} className="business-item">
                <span>{biz.name}</span>
                <span>Level {biz.level}</span>
                <span>${biz.value?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">No businesses owned</p>
        )}
      </div>
    </div>
  );
}

function InventoryTab({ player }) {
  return (
    <div className="inventory-tab">
      <h3>Inventory ({player.inventory?.length || 0} items)</h3>
      {player.inventory && player.inventory.length > 0 ? (
        <div className="inventory-grid">
          {player.inventory.map(item => (
            <div key={item.id} className="inventory-item">
              <div className="item-icon">{item.emoji || '📦'}</div>
              <div className="item-info">
                <strong>{item.item_name}</strong>
                <span>Qty: {item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-data">Inventory is empty</p>
      )}
    </div>
  );
}

function SecurityTab({ player }) {
  const risk = player.riskScore;
  const alerts = player.alerts || [];

  return (
    <div className="security-tab">
      <div className="risk-overview">
        <h3>Risk Score: {risk?.total_risk_score || 0}</h3>
        <div className="risk-breakdown">
          <div className="risk-item">
            <span>Velocity Violations</span>
            <strong>{risk?.velocity_violations || 0}</strong>
          </div>
          <div className="risk-item">
            <span>Suspicious Money</span>
            <strong>{risk?.suspicious_money_gains || 0}</strong>
          </div>
          <div className="risk-item">
            <span>Failed Validations</span>
            <strong>{risk?.failed_validations || 0}</strong>
          </div>
        </div>
      </div>

      <div className="alerts-section">
        <h3>Security Alerts ({alerts.length})</h3>
        {alerts.map(alert => (
          <div key={alert.id} className={`alert-card ${alert.severity}`}>
            <div className="alert-header">
              <span className="alert-type">{alert.alert_type}</span>
              <span className="alert-time">{new Date(alert.created_at).toLocaleString()}</span>
            </div>
            <p>{alert.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ player, onRollback }) {
  const actions = player.recentActions || [];

  return (
    <div className="history-tab">
      <h3>Recent Admin Actions ({actions.length})</h3>
      {actions.map(action => (
        <div key={action.id} className="history-item">
          <div className="history-header">
            <strong>{action.action_type}</strong>
            <span>{new Date(action.created_at).toLocaleString()}</span>
          </div>
          <div className="history-details">
            <p>Admin: {action.admin_username} ({action.admin_role})</p>
            <p>Reason: {action.reason}</p>
            {action.field_changed && (
              <div className="diff-view">
                <span className="before">Before: {JSON.stringify(action.before_value)}</span>
                <span className="after">After: {JSON.stringify(action.after_value)}</span>
              </div>
            )}
          </div>
          {!action.is_rolled_back && action.status === 'completed' && (
            <button 
              onClick={() => onRollback(action.id)} 
              className="btn-rollback"
            >
              <RotateCcw size={14} />
              Rollback
            </button>
          )}
          {action.is_rolled_back && (
            <span className="rolled-back-badge">ROLLED BACK</span>
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, editable, onEdit }) {
  return (
    <div className="stat-card">
      <label>{label}</label>
      <div className="stat-value">
        <strong>{value}</strong>
        {editable && (
          <button onClick={onEdit} className="edit-btn">✏️</button>
        )}
      </div>
    </div>
  );
}
