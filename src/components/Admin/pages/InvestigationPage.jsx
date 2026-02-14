/**
 * Player Investigation Page - Comprehensive Forensic Tool
 * Full implementation with timeline, alerts, sessions, and actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../config/supabaseClient';
import { ArrowLeft, AlertTriangle, Download, Flag, Ban, RotateCcw } from 'lucide-react';
import './InvestigationPage.css';

const InvestigationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get('player');

  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [relatedPlayers, setRelatedPlayers] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    if (playerId) {
      loadInvestigationData();
    }
  }, [playerId]);

  const loadInvestigationData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPlayerData(),
        loadTimeline(),
        loadAlerts(),
        loadSessions(),
        loadRiskData()
      ]);
    } catch (error) {
      console.error('Error loading investigation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerData = async () => {
    const { data } = await supabase
      .from('the_life_players')
      .select('*')
      .eq('id', playerId)
      .single();
    if (data) setPlayer(data);
  };

  const loadTimeline = async () => {
    const { data } = await supabase
      .from('game_logs')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(100);
    setTimeline(data || []);
  };

  const loadAlerts = async () => {
    const { data } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });
    setAlerts(data || []);
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from('player_sessions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(20);
    setSessions(data || []);
  };

  const loadRiskData = async () => {
    const { data } = await supabase
      .from('player_risk_scores')
      .select('*')
      .eq('player_id', playerId)
      .single();
    setRiskData(data);
  };

  const handleBanPlayer = async (duration = null) => {
    if (!confirm(`Ban this player ${duration ? 'for 24 hours' : 'permanently'}?`)) return;
    
    setActionInProgress(true);
    try {
      await supabase
        .from('the_life_players')
        .update({
          is_banned: true,
          banned_until: duration ? new Date(Date.now() + duration).toISOString() : null
        })
        .eq('id', playerId);
      
      alert('Player banned successfully');
      await loadPlayerData();
    } finally {
      setActionInProgress(false);
    }
  };

  const handleFlagPlayer = async () => {
    setActionInProgress(true);
    try {
      await supabase
        .from('the_life_players')
        .update({ is_flagged: !player?.is_flagged })
        .eq('id', playerId);
      
      await loadPlayerData();
    } finally {
      setActionInProgress(false);
    }
  };

  const exportEvidence = () => {
    const evidence = {
      player,
      riskData,
      alerts,
      timeline: timeline.slice(0, 50),
      sessions,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investigation_${playerId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskLevel = (score) => {
    if (score >= 150) return { level: 'Critical', color: '#dc2626', icon: '🚫' };
    if (score >= 80) return { level: 'High', color: '#ea580c', icon: '🔴' };
    if (score >= 50) return { level: 'Medium', color: '#f59e0b', icon: '🟡' };
    if (score >= 20) return { level: 'Low', color: '#84cc16', icon: '⚠️' };
    return { level: 'Clean', color: '#10b981', icon: '✅' };
  };

  if (loading) {
    return (
      <div className="investigation-page loading">
        <div className="spinner"></div>
        <p>Loading investigation data...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="investigation-page error">
        <h2>Player Not Found</h2>
        <button onClick={() => navigate('/anticheat/players')}>Back to Players</button>
      </div>
    );
  }

  const risk = getRiskLevel(riskData?.total_risk_score || 0);

  return (
    <div className="investigation-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="header-content">
          <h1 className="page-title">Investigation: {player.username}</h1>
          <p className="page-description">
            Level {player.level} • Risk Score: {riskData?.total_risk_score || 0}
          </p>
        </div>
      </div>

      <div className="investigation-header">
        <div className="player-info">
          <div className="player-avatar">
            <img src={player.avatar_url || '/default-avatar.png'} alt={player.username} />
            {player.is_banned && <span className="badge banned">BANNED</span>}
            {player.is_flagged && <span className="badge flagged">FLAGGED</span>}
          </div>
          <div className="player-details">
            <h2>{player.username}</h2>
            <p>ID: {player.id.substring(0, 8)}...</p>
            <p>Cash: ${(player.cash + player.bank).toLocaleString()}</p>
          </div>
        </div>

        <div className="risk-indicator" style={{ borderColor: risk.color }}>
          <span className="risk-icon">{risk.icon}</span>
          <div>
            <div className="risk-score">{riskData?.total_risk_score || 0}</div>
            <div className="risk-level" style={{ color: risk.color }}>{risk.level}</div>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={exportEvidence} className="btn-secondary">
            <Download size={16} />
            Export
          </button>
          <button onClick={handleFlagPlayer} className={player.is_flagged ? 'btn-warning' : 'btn-secondary'} disabled={actionInProgress}>
            <Flag size={16} />
            {player.is_flagged ? 'Unflag' : 'Flag'}
          </button>
          {!player.is_banned && (
            <>
              <button onClick={() => handleBanPlayer(86400000)} className="btn-warning" disabled={actionInProgress}>
                <Ban size={16} />
                Temp Ban
              </button>
              <button onClick={() => handleBanPlayer()} className="btn-danger" disabled={actionInProgress}>
                <Ban size={16} />
                Perm Ban
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tab-navigation">
        {['overview', 'timeline', 'alerts', 'sessions'].map(tab => (
          <button
            key={tab}
            className={`tab ${selectedTab === tab ? 'active' : ''}`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {selectedTab === 'overview' && (
          <div className="overview-grid">
            <div className="overview-card">
              <h3>Risk Breakdown</h3>
              <div className="risk-metrics">
                <div className="metric">
                  <span>Velocity Violations</span>
                  <strong>{riskData?.velocity_violations || 0}</strong>
                </div>
                <div className="metric">
                  <span>Suspicious Money</span>
                  <strong>{riskData?.suspicious_money_gains || 0}</strong>
                </div>
                <div className="metric">
                  <span>Failed Validations</span>
                  <strong>{riskData?.failed_validations || 0}</strong>
                </div>
              </div>
            </div>

            <div className="overview-card">
              <h3>Activity Summary</h3>
              <div className="activity-stats">
                <div className="stat">
                  <span>Total Actions</span>
                  <strong>{timeline.length}</strong>
                </div>
                <div className="stat">
                  <span>Security Alerts</span>
                  <strong className={alerts.length > 0 ? 'danger' : ''}>{alerts.length}</strong>
                </div>
                <div className="stat">
                  <span>Sessions</span>
                  <strong>{sessions.length}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'timeline' && (
          <div className="timeline-list">
            {timeline.map(log => (
              <div key={log.id} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-action">{log.action_type}</span>
                    <span className="timeline-time">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="timeline-description">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div className="alerts-view">
            {alerts.map(alert => (
              <div key={alert.id} className={`alert-card ${alert.severity}`}>
                <div className="alert-header">
                  <span className={`severity-badge ${alert.severity}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="alert-type">{alert.alert_type}</span>
                  <span className="alert-time">{new Date(alert.created_at).toLocaleString()}</span>
                </div>
                <p className="alert-description">{alert.description}</p>
              </div>
            ))}
            {alerts.length === 0 && <p className="no-data">No alerts</p>}
          </div>
        )}

        {selectedTab === 'sessions' && (
          <div className="sessions-view">
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Started</th>
                  <th>Ended</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <tr key={session.id}>
                    <td>{session.ip_address || 'N/A'}</td>
                    <td>{new Date(session.created_at).toLocaleString()}</td>
                    <td>{session.ended_at ? new Date(session.ended_at).toLocaleString() : 'Active'}</td>
                    <td>
                      <span className={`status-badge ${session.is_suspicious ? 'danger' : 'success'}`}>
                        {session.is_suspicious ? 'Suspicious' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        <button className="back-home-btn" onClick={() => navigate('/anticheat/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default InvestigationPage;
