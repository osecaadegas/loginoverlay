import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../config/supabaseClient';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { Users, AlertTriangle, Flag, Ban, RefreshCw, Eye, UserX } from 'lucide-react';
import './PlayersPage.css';

const PlayersPage = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    highRisk: 0,
    flagged: 0,
    banned: 0
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      // Fetch players with risk scores
      const { data: playersData, error: playersError } = await supabase
        .from('the_life_players')
        .select(`
          id,
          username,
          created_at,
          player_risk_scores(
            total_risk_score,
            updated_at
          )
        `)
        .order('created_at', { ascending: false });

      if (playersError) throw playersError;

      // Fetch alert counts per player
      const { data: alertCounts, error: alertError } = await supabase
        .from('security_alerts')
        .select('player_id, status')
        .in('status', ['new', 'investigating']);

      if (alertError) throw alertError;

      // Process player data
      const processedPlayers = (playersData || []).map(player => {
        const riskScore = player.player_risk_scores?.[0]?.total_risk_score || 0;
        const activeAlerts = alertCounts?.filter(a => a.player_id === player.id).length || 0;
        
        return {
          id: player.id,
          username: player.username,
          joinedAt: player.created_at,
          riskScore,
          activeAlerts,
          status: riskScore > 70 ? 'flagged' : 'online'
        };
      });

      // Calculate stats
      const totalPlayers = processedPlayers.length;
      const highRiskCount = processedPlayers.filter(p => p.riskScore >= 50).length;
      const flaggedCount = processedPlayers.filter(p => p.riskScore > 70).length;
      const bannedCount = processedPlayers.filter(p => p.status === 'banned').length;

      setPlayers(processedPlayers);
      setStats({
        total: totalPlayers,
        highRisk: highRiskCount,
        flagged: flaggedCount,
        banned: bannedCount
      });
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (score) => {
    if (score >= 80) return { level: 'critical', label: 'Critical', color: '#DC2626' };
    if (score >= 60) return { level: 'high', label: 'High', color: '#EA580C' };
    if (score >= 40) return { level: 'medium', label: 'Medium', color: '#F59E0B' };
    if (score >= 20) return { level: 'low', label: 'Low', color: '#FCD34D' };
    return { level: 'safe', label: 'Safe', color: '#10B981' };
  };

  const handleRowClick = (player) => {
    navigate(`/anticheat/investigations?player=${player.id}`);
  };

  const getTimeSinceJoined = (date) => {
    const now = new Date();
    const joined = new Date(date);
    const days = Math.floor((now - joined) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const columns = [
    {
      key: 'username',
      label: 'Player',
      width: '200px',
      render: (value, row) => (
        <div className="player-info-cell">
          <div className="player-avatar">
            {value?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="player-details">
            <div className="player-username">{value || 'Unknown'}</div>
            <div className="player-id-small">#{row.id}</div>
          </div>
        </div>
      )
    },
    {
      key: 'riskScore',
      label: 'Risk Score',
      width: '280px',
      render: (value) => {
        const risk = getRiskLevel(value);
        return (
          <div className="risk-score-cell">
            <div className="risk-bar-container">
              <div 
                className="risk-bar-fill" 
                style={{ 
                  width: `${value}%`,
                  background: risk.color
                }}
              />
            </div>
            <div className="risk-details">
              <span className="risk-value">{value}</span>
              <span 
                className="risk-label"
                style={{ color: risk.color }}
              >
                {risk.label}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'activeAlerts',
      label: 'Active Alerts',
      width: '120px',
      render: (value) => (
        <div className="alerts-count">
          {value > 0 ? (
            <>
              <AlertTriangle size={14} className="alert-icon" />
              <span className="alert-number">{value}</span>
            </>
          ) : (
            <span className="no-alerts">None</span>
          )}
        </div>
      )
    },
    {
      key: 'joinedAt',
      label: 'Joined',
      width: '120px',
      render: (value) => (
        <div className="joined-cell">
          <div className="joined-relative">{getTimeSinceJoined(value)}</div>
          <div className="joined-date">{new Date(value).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      sortable: false,
      render: (_, row) => (
        <button 
          className="view-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(row);
          }}
          title="View investigation"
        >
          <Eye size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="players-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Player Management</h1>
          <p className="page-description">Monitor player risk scores and activity</p>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={fetchPlayers}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Total Players"
          value={stats.total.toLocaleString()}
          icon={Users}
          color="var(--admin-accent)"
        />
        <MetricCard
          label="High Risk"
          value={stats.highRisk.toLocaleString()}
          icon={AlertTriangle}
          color="#F59E0B"
        />
        <MetricCard
          label="Flagged"
          value={stats.flagged.toLocaleString()}
          icon={Flag}
          color="#EA580C"
        />
        <MetricCard
          label="Banned"
          value={stats.banned.toLocaleString()}
          icon={Ban}
          color="#DC2626"
        />
      </div>

      <div className="players-table-section">
        <div className="section-header">
          <h2 className="section-title">Risk Leaderboard</h2>
          <p className="section-description">Players sorted by risk score (highest to lowest)</p>
        </div>

        <DataTable
          columns={columns}
          data={[...players].sort((a, b) => b.riskScore - a.riskScore)}
          loading={loading}
          onRowClick={handleRowClick}
          emptyState={
            <div className="empty-state">
              <div className="empty-icon">
                <UserX size={48} />
              </div>
              <div className="empty-title">No Players Found</div>
              <div className="empty-description">
                No player data available yet.
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default PlayersPage;
