import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../config/supabaseClient';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { RefreshCw, Download, Eye } from 'lucide-react';
import './AlertsPage.css';

const AlertsPage = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    rule: 'all'
  });

  useEffect(() => {
    fetchAlerts();
  }, [filters]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('security_alerts')
        .select(`
          *,
          player:the_life_players(id, username)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }

      if (filters.rule !== 'all') {
        query = query.eq('alert_type', filters.rule);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (alert) => {
    navigate(`/admin/investigations?player=${alert.player_id}&alert=${alert.id}`);
  };

  const handleMarkAllRead = async () => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ status: 'investigating' })
        .eq('status', 'new');

      if (error) throw error;
      fetchAlerts();
    } catch (error) {
      console.error('Error marking alerts as read:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Time', 'Player', 'Alert Type', 'Severity', 'Status', 'Description'].join(','),
      ...alerts.map(alert => [
        new Date(alert.created_at).toISOString(),
        alert.player?.username || `Player#${alert.player_id}`,
        alert.alert_type,
        alert.severity,
        alert.status,
        `"${alert.title}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts_${new Date().toISOString()}.csv`;
    a.click();
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

  const columns = [
    {
      key: 'severity',
      label: 'Severity',
      width: '120px',
      render: (value) => <SeverityBadge severity={value} size="sm" />
    },
    {
      key: 'player',
      label: 'Player',
      width: '180px',
      render: (value, row) => (
        <div className="player-cell">
          <div className="player-name">{value?.username || 'Unknown'}</div>
          <div className="player-id">ID: {row.player_id}</div>
        </div>
      )
    },
    {
      key: 'title',
      label: 'Alert',
      render: (value, row) => (
        <div className="alert-cell">
          <div className="alert-title">{value}</div>
          <div className="alert-description">{row.description}</div>
        </div>
      )
    },
    {
      key: 'alert_type',
      label: 'Rule',
      width: '150px',
      render: (value) => (
        <span className="rule-type">{value}</span>
      )
    },
    {
      key: 'created_at',
      label: 'Time',
      width: '120px',
      render: (value) => (
        <span className="time-cell" title={new Date(value).toLocaleString()}>
          {getRelativeTime(value)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '140px',
      render: (value) => <StatusBadge status={value} size="sm" />
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      sortable: false,
      render: (_, row) => (
        <button 
          className="action-btn view-btn"
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
    <div className="alerts-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Alerts</h1>
          <p className="page-description">Real-time security alerts from anti-cheat rules</p>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={fetchAlerts}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="header-btn" onClick={handleExport}>
            <Download size={16} />
            Export
          </button>
          <button className="header-btn primary" onClick={handleMarkAllRead}>
            Mark All Read
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Status:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filters.status === 'all' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, status: 'all'})}
            >
              All
            </button>
            <button 
              className={`filter-btn ${filters.status === 'new' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, status: 'new'})}
            >
              New
            </button>
            <button 
              className={`filter-btn ${filters.status === 'investigating' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, status: 'investigating'})}
            >
              Investigating
            </button>
            <button 
              className={`filter-btn ${filters.status === 'resolved' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, status: 'resolved'})}
            >
              Resolved
            </button>
            <button 
              className={`filter-btn ${filters.status === 'dismissed' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, status: 'dismissed'})}
            >
              Dismissed
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Severity:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn severity-all ${filters.severity === 'all' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, severity: 'all'})}
            >
              All
            </button>
            <button 
              className={`filter-btn severity-critical ${filters.severity === 'critical' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, severity: 'critical'})}
            >
              🔴 Critical
            </button>
            <button 
              className={`filter-btn severity-high ${filters.severity === 'high' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, severity: 'high'})}
            >
              🟠 High
            </button>
            <button 
              className={`filter-btn severity-medium ${filters.severity === 'medium' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, severity: 'medium'})}
            >
              🟡 Medium
            </button>
            <button 
              className={`filter-btn severity-low ${filters.severity === 'low' ? 'active' : ''}`}
              onClick={() => setFilters({...filters, severity: 'low'})}
            >
              🔵 Low
            </button>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={alerts}
        loading={loading}
        onRowClick={handleRowClick}
        emptyState={
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <div className="empty-title">All Clear!</div>
            <div className="empty-description">
              No active security alerts at the moment.<br />
              Anti-cheat system is monitoring all players.
            </div>
          </div>
        }
      />
    </div>
  );
};

export default AlertsPage;
