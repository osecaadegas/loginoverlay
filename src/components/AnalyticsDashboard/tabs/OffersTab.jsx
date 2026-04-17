/**
 * OffersTab.jsx — Offer performance analytics with drilldown detail view.
 * Shows per-offer click logs with Twitch ID, IP, geo, device, and timeline.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const TOOLTIP_STYLE = {
  background: 'rgba(17,24,39,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};
const AXIS_STYLE = { fill: '#64748b', fontSize: 11 };
const GRID_STYLE = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.04)' };
const AXIS_LINE = { stroke: 'rgba(255,255,255,0.06)' };

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Detail View for a single offer ──
function OfferDetail({ offerId, analytics, period, onBack }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all'); // all | suspicious | clean
  const PER_PAGE = 50;

  const load = useCallback(() => {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    analytics.fetchOfferDetail({ offer_id: offerId, since, limit: String(PER_PAGE), offset: String(page * PER_PAGE) })
      .then(setData);
  }, [offerId, period, page]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="an-tab__loading">Loading offer details...</div>;

  const { offer, clicks, stats, timeline, pagination } = data;
  const filtered = filter === 'all' ? clicks
    : filter === 'suspicious' ? clicks.filter(c => c.is_suspicious)
    : clicks.filter(c => !c.is_suspicious);
  const totalPages = Math.ceil((pagination?.total || 0) / PER_PAGE);

  return (
    <div className="an-tab">
      {/* Back + Offer Header */}
      <button className="an-btn an-btn--ghost" onClick={onBack}>← Back to all offers</button>

      <div className="an-user-detail__header">
        {offer.logo_url && <img src={offer.logo_url} alt="" className="an-user-detail__avatar" />}
        <div>
          <div className="an-user-detail__name">{offer.name}</div>
          <div className="an-user-detail__meta">
            {offer.url && <span>{offer.url}</span>}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="an-stats-grid">
        <div className="an-stat-card">
          <span className="an-stat-card__icon">🖱️</span>
          <div className="an-stat-card__content">
            <div className="an-stat-card__value">{stats.totalClicks?.toLocaleString()}</div>
            <div className="an-stat-card__label">Total Clicks</div>
          </div>
        </div>
        <div className="an-stat-card">
          <span className="an-stat-card__icon">👤</span>
          <div className="an-stat-card__content">
            <div className="an-stat-card__value">{stats.uniqueVisitors?.toLocaleString()}</div>
            <div className="an-stat-card__label">Unique Visitors</div>
          </div>
        </div>
        <div className="an-stat-card">
          <span className="an-stat-card__icon">🌐</span>
          <div className="an-stat-card__content">
            <div className="an-stat-card__value">{stats.uniqueIPs?.toLocaleString()}</div>
            <div className="an-stat-card__label">Unique IPs</div>
          </div>
        </div>
        <div className={`an-stat-card ${stats.suspiciousCount > 0 ? 'an-stat-card--danger' : ''}`}>
          <span className="an-stat-card__icon">🚨</span>
          <div className="an-stat-card__content">
            <div className="an-stat-card__value">{stats.suspiciousCount?.toLocaleString()}</div>
            <div className="an-stat-card__label">Suspicious</div>
          </div>
        </div>
      </div>

      {/* Timeline Chart + Top Countries side-by-side */}
      <div className="an-traffic-grid">
        {timeline && timeline.length > 1 && (
          <div className="an-chart-card">
            <h3 className="an-chart-card__title">Click Timeline</h3>
            <div className="an-chart-card__body">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="offerTimeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="hour" tick={AXIS_STYLE} axisLine={AXIS_LINE} />
                  <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" fill="url(#offerTimeGrad)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {stats.topCountries && stats.topCountries.length > 0 && (
          <div className="an-chart-card">
            <h3 className="an-chart-card__title">Top Countries</h3>
            <div className="an-chart-card__body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.topCountries} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" tick={AXIS_STYLE} axisLine={AXIS_LINE} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={70} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  <Bar dataKey="clicks" radius={[0, 6, 6, 0]}>
                    {(stats.topCountries || []).map((_, i) => (
                      <rect key={i} fill={i === 0 ? '#6366f1' : '#4f46e5'} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="countryBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="an-toolbar">
        <select className="an-toolbar__select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Clicks</option>
          <option value="suspicious">Suspicious Only</option>
          <option value="clean">Clean Only</option>
        </select>
        <span className="an-toolbar__count">
          Showing {filtered.length} of {pagination?.total || clicks.length} clicks
        </span>
      </div>

      {/* Clicks Table */}
      <div className="an-table-wrap">
        <table className="an-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Twitch User</th>
              <th>IP Address</th>
              <th>Location</th>
              <th>Device</th>
              <th>Browser / OS</th>
              <th>Source</th>
              <th>Risk</th>
              <th>Session</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className={c.is_suspicious ? 'an-table__row--danger' : ''}>
                <td>
                  <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{formatDate(c.created_at)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>{formatRelative(c.created_at)}</div>
                </td>
                <td>
                  {c.twitch_username ? (
                    <span className="an-user-badge">
                      {c.twitch_avatar && <img src={c.twitch_avatar} alt="" className="an-user-badge__avatar" />}
                      <span>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{c.twitch_username}</div>
                        <div className="an-mono" style={{ fontSize: '0.68rem' }}>ID: {c.twitch_id}</div>
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: '#4b5563', fontStyle: 'italic' }}>
                      {c.fingerprint ? c.fingerprint.slice(0, 10) + '...' : 'Anonymous'}
                    </span>
                  )}
                </td>
                <td className="an-mono">{c.ip_address || '—'}</td>
                <td>
                  {c.country || c.city ? (
                    <>
                      <div style={{ color: '#e2e8f0' }}>{[c.city, c.region].filter(Boolean).join(', ')}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.country}{c.isp ? ` · ${c.isp}` : ''}</div>
                    </>
                  ) : '—'}
                </td>
                <td>
                  <span className="an-event-badge" style={{
                    background: c.device_type === 'mobile' ? 'rgba(245,158,11,0.12)' : c.device_type === 'tablet' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)',
                    color: c.device_type === 'mobile' ? '#fbbf24' : c.device_type === 'tablet' ? '#c084fc' : '#60a5fa',
                  }}>
                    {c.device_type || 'unknown'}
                  </span>
                </td>
                <td>
                  <div style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>{c.browser || '—'}</div>
                  <div style={{ color: '#4b5563', fontSize: '0.7rem' }}>{c.os || ''}</div>
                </td>
                <td style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{c.referrer_source || 'direct'}</td>
                <td>
                  <span className={`an-risk an-risk--${c.risk_score >= 50 ? 'high' : c.risk_score >= 20 ? 'medium' : 'low'}`}>
                    {c.risk_score}
                  </span>
                  {c.is_bot && <span className="an-badge an-badge--danger" style={{ marginLeft: 4 }}>BOT</span>}
                </td>
                <td>
                  {c.session_duration != null ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                      {Math.floor(c.session_duration / 60)}m {c.session_duration % 60}s
                      <div style={{ color: '#4b5563', fontSize: '0.68rem' }}>
                        {c.visitor_total_sessions} sessions · {c.visitor_total_events} events
                      </div>
                    </div>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="9" className="an-table__empty">No clicks found for this filter</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="an-pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Main Offers List View ──
export default function OffersTab({ analytics, period }) {
  const [data, setData] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);

  useEffect(() => {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    analytics.fetchOffers({ since }).then(setData);
  }, [period]);

  // If an offer is selected, show detail view
  if (selectedOffer) {
    return (
      <OfferDetail
        offerId={selectedOffer}
        analytics={analytics}
        period={period}
        onBack={() => setSelectedOffer(null)}
      />
    );
  }

  if (!data) return <div className="an-tab__loading">Loading offer stats...</div>;

  const offers = data.offers || [];
  const chartData = offers.slice(0, 10).map(o => ({
    name: o.name?.length > 20 ? o.name.slice(0, 18) + '...' : o.name,
    clicks: o.clean_clicks,
    suspicious: o.suspicious_clicks,
  }));

  return (
    <div className="an-tab">
      {/* Chart */}
      {chartData.length > 0 && (
        <div className="an-chart-card">
          <h3 className="an-chart-card__title">Top Offers by Clicks</h3>
          <div className="an-chart-card__body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 10 }} angle={-20} textAnchor="end" height={60} axisLine={AXIS_LINE} />
                <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey="clicks" stackId="a" fill="#10b981" name="Clean Clicks" radius={[0, 0, 0, 0]} />
                <Bar dataKey="suspicious" stackId="a" fill="#ef4444" name="Suspicious" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="an-table-wrap">
        <table className="an-table">
          <thead>
            <tr>
              <th>Offer</th><th>Total Clicks</th><th>Clean</th><th>Suspicious</th>
              <th>Unique Clickers</th><th>CTR</th><th></th>
            </tr>
          </thead>
          <tbody>
            {offers.map(o => (
              <tr key={o.offer_id} className="an-table__row--clickable" onClick={() => setSelectedOffer(o.offer_id)}>
                <td className="an-table__offer-name">{o.name}</td>
                <td>{o.total_clicks}</td>
                <td className="an-text--success">{o.clean_clicks}</td>
                <td className={o.suspicious_clicks > 0 ? 'an-text--danger' : ''}>{o.suspicious_clicks}</td>
                <td>{o.unique_clickers}</td>
                <td>{o.ctr}%</td>
                <td>
                  <button className="an-btn an-btn--sm" onClick={e => { e.stopPropagation(); setSelectedOffer(o.offer_id); }}>
                    View Details →
                  </button>
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr><td colSpan="7" className="an-table__empty">No offer data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="an-tab__footnote">
        Total pageviews in period: {data.totalPageviews?.toLocaleString()}
        · CTR = clicks / total pageviews · Click any offer for detailed click logs
      </p>
    </div>
  );
}
