/**
 * FraudTab.jsx — Fraud monitoring and management panel.
 */
import React, { useState, useEffect } from 'react';

const RULE_ICONS = {
  rapid_clicks: '⚡',
  same_offer_spam: '🔄',
  multi_session_ip: '🌐',
  no_pageviews: '🤖',
  bot_pattern: '🕷️',
};

export default function FraudTab({ analytics }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [showResolved, setShowResolved] = useState('false');
  const [ruleFilter, setRuleFilter] = useState('');
  const [exportStatus, setExportStatus] = useState(null);

  const load = async (p = page) => {
    const result = await analytics.fetchFraud({
      page: p,
      limit: 20,
      resolved: showResolved,
      rule: ruleFilter || undefined,
    });
    if (result) setData(result);
  };

  useEffect(() => { setPage(1); load(1); }, [showResolved, ruleFilter]);

  const handleResolve = async (id) => {
    await analytics.resolveFraud(id);
    load();
  };

  const handleExport = async () => {
    setExportStatus('Exporting...');
    const result = await analytics.exportCSV('fraud');
    if (result?.csv) {
      const blob = new Blob([result.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fraud-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`Exported ${result.rows} rows`);
    } else {
      setExportStatus('No data to export');
    }
    setTimeout(() => setExportStatus(null), 3000);
  };

  if (!data) return <div className="an-tab__loading">Loading fraud data...</div>;

  const totalPages = Math.ceil((data.total || 0) / 20);

  return (
    <div className="an-tab">
      {/* Summary */}
      <div className="an-stats-grid an-stats-grid--compact">
        {Object.entries(data.ruleCounts || {}).map(([rule, count]) => (
          <div key={rule} className="an-stat-card an-stat-card--small an-stat-card--danger">
            <div className="an-stat-card__icon">{RULE_ICONS[rule] || '⚠️'}</div>
            <div className="an-stat-card__content">
              <div className="an-stat-card__value">{count}</div>
              <div className="an-stat-card__label">{rule.replace(/_/g, ' ')}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="an-toolbar">
        <select className="an-toolbar__select" value={showResolved} onChange={e => setShowResolved(e.target.value)}>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
          <option value="all">All</option>
        </select>
        <select className="an-toolbar__select" value={ruleFilter} onChange={e => setRuleFilter(e.target.value)}>
          <option value="">All Rules</option>
          <option value="rapid_clicks">Rapid Clicks</option>
          <option value="same_offer_spam">Same Offer Spam</option>
          <option value="multi_session_ip">Multi-Session IP</option>
          <option value="no_pageviews">No Pageviews</option>
          <option value="bot_pattern">Bot Pattern</option>
        </select>
        <button className="an-btn" onClick={handleExport}>
          📥 Export CSV
        </button>
        {exportStatus && <span className="an-toolbar__status">{exportStatus}</span>}
      </div>

      {/* Table */}
      <div className="an-table-wrap">
        <table className="an-table">
          <thead>
            <tr>
              <th>Time</th><th>Rule</th><th>Reason</th><th>IP</th>
              <th>Risk</th><th>User</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data.logs || []).map(log => (
              <tr key={log.id} className="an-table__row--danger">
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>
                  <span className="an-fraud-rule">
                    {RULE_ICONS[log.rule_name] || '⚠️'} {log.rule_name.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="an-table__reason">{log.reason}</td>
                <td className="an-mono">{log.ip_address || '-'}</td>
                <td><RiskBadge score={log.risk_score} /></td>
                <td>
                  {log.analytics_sessions?.analytics_visitors?.twitch_username || 'Anonymous'}
                </td>
                <td>
                  {!log.resolved ? (
                    <button className="an-btn an-btn--sm an-btn--success" onClick={() => handleResolve(log.id)}>
                      ✓ Resolve
                    </button>
                  ) : (
                    <span className="an-badge an-badge--resolved">Resolved</span>
                  )}
                </td>
              </tr>
            ))}
            {data.logs?.length === 0 && (
              <tr><td colSpan="7" className="an-table__empty">No fraud logs found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="an-pagination">
          <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1); }}>‹ Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); load(page + 1); }}>Next ›</button>
        </div>
      )}
    </div>
  );
}

function RiskBadge({ score }) {
  if (!score) return <span className="an-risk an-risk--low">0</span>;
  const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  return <span className={`an-risk an-risk--${level}`}>{score}</span>;
}
