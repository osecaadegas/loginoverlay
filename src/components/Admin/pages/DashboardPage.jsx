import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../config/supabaseClient';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Shield,
  Activity,
  Eye,
  ArrowRight
} from 'lucide-react';
import './DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeAlerts: 0,
    alertsChange: 0,
    riskScore: 0,
    riskChange: 0,
    activePlayers: 0,
    playersChange: 0,
    flaggedActions: 0,
    actionsChange: 0
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [riskTrend, setRiskTrend] = useState([]);
  const [topRiskPlayers, setTopRiskPlayers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch active alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('security_alerts')
        .select('*, player:the_life_players(username)')
        .in('status', ['new', 'investigating'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (alertsError) throw alertsError;

      // Fetch total alert count for stats
      const { count: totalAlerts, error: countError } = await supabase
        .from('security_alerts')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'investigating']);

      if (countError) throw countError;

      // Fetch players with risk scores
      const { data: players, error: playersError } = await supabase
        .from('the_life_players')
        .select(`
          id,
          username,
          player_risk_scores(total_risk_score)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (playersError) throw playersError;

      // Calculate average risk score
      const playersWithRisk = players?.filter(p => p.player_risk_scores?.[0]?.total_risk_score > 0) || [];
      const avgRisk = playersWithRisk.length > 0
        ? Math.round(playersWithRisk.reduce((sum, p) => sum + p.player_risk_scores[0].total_risk_score, 0) / playersWithRisk.length)
        : 0;

      // Get top risk players
      const topRisk = [...playersWithRisk]
        .sort((a, b) => (b.player_risk_scores[0]?.total_risk_score || 0) - (a.player_risk_scores[0]?.total_risk_score || 0))
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          username: p.username,
          riskScore: p.player_risk_scores[0].total_risk_score
        }));

      // Fetch flagged actions count
      const { count: flaggedCount, error: flaggedError } = await supabase
        .from('game_logs')
        .select('*', { count: 'exact', head: true })
        .eq('is_flagged', true)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (flaggedError) throw flaggedError;

      setStats({
        activeAlerts: totalAlerts || 0,
        alertsChange: 12, // Mock trend data
        riskScore: avgRisk,
        riskChange: -5,
        activePlayers: players?.length || 0,
        playersChange: 8,
        flaggedActions: flaggedCount || 0,
        actionsChange: -15
      });

      setRecentAlerts(alerts || []);
      setTopRiskPlayers(topRisk);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getRiskLevel = (score) => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'safe';
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Security Dashboard</h1>
          <p className="page-description">Real-time overview of anti-cheat system</p>
        </div>
        <div className="last-updated">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard
          label="Active Alerts"
          value={stats.activeAlerts}
          change={stats.alertsChange}
          trend={stats.alertsChange > 0 ? 'up' : 'down'}
          icon={AlertTriangle}
          color="#F59E0B"
        />
        <MetricCard
          label="Avg Risk Score"
          value={stats.riskScore}
          change={stats.riskChange}
          trend={stats.riskChange > 0 ? 'up' : 'down'}
          icon={Shield}
          color="#3B82F6"
        />
        <MetricCard
          label="Active Players"
          value={stats.activePlayers}
          change={stats.playersChange}
          trend={stats.playersChange > 0 ? 'up' : 'down'}
          icon={Users}
          color="var(--admin-accent)"
        />
        <MetricCard
          label="Flagged Actions (24h)"
          value={stats.flaggedActions}
          change={stats.actionsChange}
          trend={stats.actionsChange > 0 ? 'up' : 'down'}
          icon={Activity}
          color="#DC2626"
        />
      </div>

      <div className="dashboard-grid">
        {/* Recent Alerts */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Recent Alerts</h2>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/admin/alerts')}
            >
              View All
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : recentAlerts.length === 0 ? (
              <div className="empty-state-small">
                <div className="empty-icon">🎉</div>
                <div className="empty-text">No active alerts</div>
              </div>
            ) : (
              <div className="alerts-list">
                {recentAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className="alert-item"
                    onClick={() => navigate(`/admin/investigations?player=${alert.player_id}&alert=${alert.id}`)}
                  >
                    <div className="alert-item-header">
                      <SeverityBadge severity={alert.severity} size="sm" />
                      <span className="alert-time">{getRelativeTime(alert.created_at)}</span>
                    </div>
                    <div className="alert-item-title">{alert.alert_title}</div>
                    <div className="alert-item-player">
                      {alert.player?.username || `Player #${alert.player_id}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Risk Players */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">High Risk Players</h2>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/admin/players')}
            >
              View All
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : topRiskPlayers.length === 0 ? (
              <div className="empty-state-small">
                <div className="empty-icon">✨</div>
                <div className="empty-text">No high risk players</div>
              </div>
            ) : (
              <div className="risk-list">
                {topRiskPlayers.map((player, index) => (
                  <div 
                    key={player.id} 
                    className="risk-item"
                    onClick={() => navigate(`/admin/investigations?player=${player.id}`)}
                  >
                    <div className="risk-rank">#{index + 1}</div>
                    <div className="risk-player-info">
                      <div className="risk-player-name">{player.username}</div>
                      <div className="risk-player-id">#{player.id}</div>
                    </div>
                    <div className="risk-score-badge">
                      <SeverityBadge severity={getRiskLevel(player.riskScore)} size="sm" />
                      <span className="risk-score-value">{player.riskScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card quick-actions-card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
          </div>
          <div className="card-content">
            <div className="quick-actions-grid">
              <button 
                className="quick-action-btn"
                onClick={() => navigate('/admin/alerts?status=new')}
              >
                <AlertTriangle size={20} />
                <div className="quick-action-label">New Alerts</div>
                <div className="quick-action-count">{stats.activeAlerts}</div>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => navigate('/admin/logs?flagged=true')}
              >
                <Activity size={20} />
                <div className="quick-action-label">Flagged Logs</div>
                <div className="quick-action-count">{stats.flaggedActions}</div>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => navigate('/admin/players')}
              >
                <Users size={20} />
                <div className="quick-action-label">All Players</div>
                <div className="quick-action-count">{stats.activePlayers}</div>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => navigate('/admin/rules')}
              >
                <Shield size={20} />
                <div className="quick-action-label">Manage Rules</div>
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="dashboard-card system-status-card">
          <div className="card-header">
            <h2 className="card-title">System Status</h2>
          </div>
          <div className="card-content">
            <div className="status-list">
              <div className="status-item">
                <div className="status-indicator online"></div>
                <div className="status-label">Anti-Cheat Engine</div>
                <StatusBadge status="online" />
              </div>
              <div className="status-item">
                <div className="status-indicator online"></div>
                <div className="status-label">Logging System</div>
                <StatusBadge status="online" />
              </div>
              <div className="status-item">
                <div className="status-indicator online"></div>
                <div className="status-label">Alert Processing</div>
                <StatusBadge status="online" />
              </div>
              <div className="status-item">
                <div className="status-indicator online"></div>
                <div className="status-label">Database Connection</div>
                <StatusBadge status="online" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
