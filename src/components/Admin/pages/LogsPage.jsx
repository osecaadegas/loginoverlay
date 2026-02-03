import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../config/supabaseClient';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { RefreshCw, Download, ChevronDown, ChevronUp, Copy, Eye } from 'lucide-react';
import './LogsPage.css';

const LogsPage = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    flagged: false,
    playerId: '',
    dateRange: 'last-24h'
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('game_logs')
        .select(`
          *,
          player:the_life_players(id, username)
        `)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filters.category !== 'all') {
        query = query.eq('action_category', filters.category);
      }

      if (filters.flagged) {
        query = query.eq('is_flagged', true);
      }

      if (filters.playerId) {
        query = query.eq('player_id', filters.playerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Time', 'Player', 'Action', 'Category', 'Change', 'Flagged'].join(','),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.player?.username || `Player#${log.player_id}`,
        log.action_type,
        log.action_category,
        log.value_diff || '',
        log.is_flagged ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString()}.csv`;
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

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      return value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
    }
    return value;
  };

  const getCategoryBadgeColor = (category) => {
    const colors = {
      economy: '#F59E0B',
      inventory: '#3B82F6',
      crime: '#EF4444',
      auth: '#10B981',
      admin: '#8B5CF6'
    };
    return colors[category] || '#A1A1AA';
  };

  const handleRowClick = (log) => {
    setExpandedRow(expandedRow === log.id ? null : log.id);
  };

  const copyJSON = (obj) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  };

  const columns = [
    {
      key: 'timestamp',
      label: 'Time',
      width: '100px',
      render: (value) => (
        <div className="time-cell">
          <div className="time-relative">{getRelativeTime(value)}</div>
          <div className="time-absolute">{new Date(value).toLocaleTimeString()}</div>
        </div>
      )
    },
    {
      key: 'player',
      label: 'Player',
      width: '160px',
      render: (value, row) => (
        <div className="player-cell">
          <div className="player-name">{value?.username || 'Unknown'}</div>
          <div className="player-id">#{row.player_id}</div>
        </div>
      )
    },
    {
      key: 'action_type',
      label: 'Action',
      width: '200px',
      render: (value, row) => (
        <div className="action-cell">
          <div className="action-type">{value.replace(/_/g, ' ')}</div>
          <div 
            className="action-category" 
            style={{ background: `${getCategoryBadgeColor(row.action_category)}20`, color: getCategoryBadgeColor(row.action_category) }}
          >
            {row.action_category}
          </div>
        </div>
      )
    },
    {
      key: 'description',
      label: 'Details',
      render: (value) => (
        <div className="details-cell">{value || '-'}</div>
      )
    },
    {
      key: 'value_diff',
      label: 'Change',
      width: '120px',
      render: (value) => {
        if (!value) return <span className="change-neutral">-</span>;
        const isPositive = value > 0;
        return (
          <span className={`change-value ${isPositive ? 'change-positive' : 'change-negative'}`}>
            {formatValue(value)}
          </span>
        );
      }
    },
    {
      key: 'is_flagged',
      label: 'Flag',
      width: '80px',
      render: (value, row) => (
        value ? (
          <div className="flag-indicator" title={row.flag_reason}>
            <span className="flag-icon">🚩</span>
            <span className="flag-severity">{row.flag_severity}</span>
          </div>
        ) : null
      )
    },
    {
      key: 'actions',
      label: '',
      width: '60px',
      sortable: false,
      render: (_, row) => (
        <button 
          className="expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(row);
          }}
          title="View details"
        >
          {expandedRow === row.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )
    }
  ];

  return (
    <div className="logs-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Player Action Logs</h1>
          <p className="page-description">Comprehensive audit trail of all player actions</p>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={fetchLogs}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="header-btn" onClick={handleExport}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Category:</label>
          <div className="filter-buttons">
            {['all', 'economy', 'inventory', 'crime', 'auth', 'admin'].map(cat => (
              <button 
                key={cat}
                className={`filter-btn ${filters.category === cat ? 'active' : ''}`}
                onClick={() => setFilters({...filters, category: cat})}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Options:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filters.flagged ? 'active' : ''}`}
              onClick={() => setFilters({...filters, flagged: !filters.flagged})}
            >
              🚩 Flagged Only
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Player ID:</label>
          <input 
            type="text"
            className="filter-input"
            placeholder="Search by player ID..."
            value={filters.playerId}
            onChange={(e) => setFilters({...filters, playerId: e.target.value})}
          />
        </div>
      </div>

      <div className="logs-table-container">
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          onRowClick={handleRowClick}
          emptyState={
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No Logs Found</div>
              <div className="empty-description">
                Try adjusting your filters or date range.
              </div>
            </div>
          }
        />

        {/* Expanded Row Details */}
        {logs.map(log => (
          expandedRow === log.id && (
            <div key={`expanded-${log.id}`} className="expanded-row">
              <div className="expanded-header">
                <h3>Full Details</h3>
                <button className="close-btn" onClick={() => setExpandedRow(null)}>
                  <ChevronUp size={16} />
                  Hide
                </button>
              </div>

              <div className="expanded-content">
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Log ID:</label>
                    <span>{log.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Player ID:</label>
                    <span>{log.player_id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Session ID:</label>
                    <span className="monospace">{log.session_id || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>IP Address:</label>
                    <span className="monospace">{log.ip_address || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Device FP:</label>
                    <span className="monospace truncate">{log.device_fingerprint || '-'}</span>
                  </div>
                </div>

                {(log.old_value || log.new_value) && (
                  <div className="value-comparison">
                    <div className="value-block">
                      <label>Old Value:</label>
                      <pre>{JSON.stringify(log.old_value, null, 2)}</pre>
                    </div>
                    <div className="value-arrow">→</div>
                    <div className="value-block">
                      <label>New Value:</label>
                      <pre>{JSON.stringify(log.new_value, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {log.metadata && (
                  <div className="metadata-section">
                    <div className="metadata-header">
                      <label>Metadata:</label>
                      <button className="copy-btn" onClick={() => copyJSON(log.metadata)}>
                        <Copy size={14} />
                        Copy JSON
                      </button>
                    </div>
                    <pre className="json-viewer">{JSON.stringify(log.metadata, null, 2)}</pre>
                  </div>
                )}

                <div className="expanded-actions">
                  <button 
                    className="action-btn"
                    onClick={() => navigate(`/admin/investigations?player=${log.player_id}`)}
                  >
                    <Eye size={16} />
                    View Player Investigation
                  </button>
                  <button className="action-btn" onClick={() => copyJSON(log)}>
                    <Copy size={16} />
                    Copy Full Log
                  </button>
                </div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default LogsPage;
