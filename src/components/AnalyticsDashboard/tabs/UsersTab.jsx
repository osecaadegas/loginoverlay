/**
 * UsersTab.jsx — User/Visitor analytics with detail view.
 */
import React, { useState, useEffect } from 'react';

export default function UsersTab({ analytics, period }) {
  const [visitors, setVisitors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = async (p = page, s = search) => {
    const result = await analytics.fetchVisitors({ page: p, limit: 20, search: s });
    if (result) {
      setVisitors(result.visitors);
      setTotal(result.total);
    }
  };

  useEffect(() => { load(1); }, []);

  const handleSearch = () => { setPage(1); load(1, search); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const openDetail = async (v) => {
    setSelected(v);
    const result = await analytics.fetchVisitorDetail(v.id);
    setDetail(result);
  };

  const handleDelete = async (visitorId) => {
    if (!window.confirm('Delete ALL data for this visitor? This cannot be undone.')) return;
    await analytics.deleteData({ visitor_id: visitorId });
    setSelected(null);
    setDetail(null);
    load();
  };

  const totalPages = Math.ceil(total / 20);

  // Detail view
  if (selected && detail) {
    return (
      <div className="an-tab">
        <button className="an-btn an-btn--ghost" onClick={() => { setSelected(null); setDetail(null); }}>
          ← Back to Users
        </button>

        <div className="an-user-detail">
          <div className="an-user-detail__header">
            {detail.visitor?.twitch_avatar && (
              <img className="an-user-detail__avatar" src={detail.visitor.twitch_avatar} alt="" />
            )}
            <div>
              <h2 className="an-user-detail__name">
                {detail.visitor?.twitch_username || detail.visitor?.fingerprint?.slice(0, 12) || 'Anonymous'}
              </h2>
              <p className="an-user-detail__meta">
                {detail.visitor?.total_sessions} sessions · {detail.visitor?.total_events} events
                · First seen {new Date(detail.visitor?.first_seen_at).toLocaleDateString()}
              </p>
              {detail.visitor?.is_bot && <span className="an-badge an-badge--danger">BOT</span>}
            </div>
            <button className="an-btn an-btn--danger" onClick={() => handleDelete(selected.id)}>
              🗑️ Delete Data (GDPR)
            </button>
          </div>

          {/* Sessions */}
          <h3 className="an-section-title">Sessions ({detail.sessions?.length})</h3>
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr>
                  <th>Date</th><th>IP</th><th>Location</th><th>Browser</th><th>Device</th>
                  <th>Pages</th><th>Events</th><th>Duration</th><th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {(detail.sessions || []).map(s => (
                  <tr key={s.id} className={s.is_suspicious ? 'an-table__row--danger' : ''}>
                    <td>{new Date(s.started_at).toLocaleString()}</td>
                    <td className="an-mono">{s.ip_address || '-'}</td>
                    <td>{[s.city, s.country].filter(Boolean).join(', ') || '-'}</td>
                    <td>{s.browser}</td>
                    <td>{s.device_type}</td>
                    <td>{s.page_count}</td>
                    <td>{s.event_count}</td>
                    <td>{s.duration_secs ? `${Math.floor(s.duration_secs / 60)}m ${s.duration_secs % 60}s` : '-'}</td>
                    <td><RiskBadge score={s.risk_score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Event Timeline */}
          <h3 className="an-section-title">Event Timeline ({detail.events?.length})</h3>
          <div className="an-timeline">
            {(detail.events || []).slice(0, 50).map(e => (
              <div key={e.id} className={`an-timeline__item ${e.is_suspicious ? 'an-timeline__item--suspicious' : ''}`}>
                <span className="an-timeline__time">{new Date(e.created_at).toLocaleTimeString()}</span>
                <span className={`an-timeline__badge an-timeline__badge--${e.event_type}`}>
                  {e.event_type}
                </span>
                <span className="an-timeline__detail">
                  {e.page_url || e.element_text || e.target_url || '-'}
                </span>
              </div>
            ))}
          </div>

          {/* Fraud Flags */}
          {detail.fraudLogs?.length > 0 && (
            <>
              <h3 className="an-section-title an-section-title--danger">Fraud Flags ({detail.fraudLogs.length})</h3>
              <div className="an-fraud-flags">
                {detail.fraudLogs.map(f => (
                  <div key={f.id} className="an-fraud-flag">
                    <span className="an-fraud-flag__rule">{f.rule_name}</span>
                    <span className="an-fraud-flag__reason">{f.reason}</span>
                    <RiskBadge score={f.risk_score} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="an-tab">
      <div className="an-toolbar">
        <input
          className="an-toolbar__search"
          placeholder="Search by username or fingerprint..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="an-btn" onClick={handleSearch}>Search</button>
        <span className="an-toolbar__count">{total} visitors</span>
      </div>

      <div className="an-table-wrap">
        <table className="an-table">
          <thead>
            <tr>
              <th>Visitor</th><th>Twitch</th><th>Sessions</th><th>Events</th>
              <th>First Seen</th><th>Last Seen</th><th>Bot</th>
            </tr>
          </thead>
          <tbody>
            {visitors.map(v => (
              <tr key={v.id} className="an-table__row--clickable" onClick={() => openDetail(v)}>
                <td className="an-mono">{v.fingerprint?.slice(0, 16) || '-'}</td>
                <td>
                  {v.twitch_username ? (
                    <span className="an-user-badge">
                      {v.twitch_avatar && <img src={v.twitch_avatar} alt="" className="an-user-badge__avatar" />}
                      {v.twitch_username}
                    </span>
                  ) : '-'}
                </td>
                <td>{v.total_sessions}</td>
                <td>{v.total_events}</td>
                <td>{new Date(v.first_seen_at).toLocaleDateString()}</td>
                <td>{new Date(v.last_seen_at).toLocaleDateString()}</td>
                <td>{v.is_bot ? '🤖' : ''}</td>
              </tr>
            ))}
            {visitors.length === 0 && (
              <tr><td colSpan="7" className="an-table__empty">No visitors found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="an-pagination">
          <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1, search); }}>‹ Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); load(page + 1, search); }}>Next ›</button>
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
