import React, { useState, useCallback } from 'react';
import { supabase } from '../../config/supabaseClient';
import { StatsCard, StatsGrid } from './components';
import './AffiliateStats.css';

/**
 * Parse a report cell value — handles both "money" objects and plain numbers.
 */
function cellValue(cell) {
  if (!cell) return 0;
  const v = cell.value;
  if (v && typeof v === 'object' && v.amount !== undefined) return parseFloat(v.amount) || 0;
  if (typeof v === 'number') return v;
  return 0;
}
function cellCurrency(cell) {
  if (!cell) return '';
  const v = cell.value;
  if (v && typeof v === 'object' && v.currency) return v.currency;
  if (cell.type === 'string') return cell.value || '';
  return '';
}

/** Get a cell by name from a row array */
function getCell(row, name) {
  return row.find(c => c.name === name);
}

/** Format money */
function fmt(amount, currency) {
  if (currency && currency !== 'N/A') {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount); }
    catch { /* fallback */ }
  }
  return amount.toFixed(2);
}

/** Date presets */
function getPresetRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today': return { from: today, to: today };
    case '7d': { const d = new Date(today); d.setDate(d.getDate() - 6); return { from: d, to: today }; }
    case '30d': { const d = new Date(today); d.setDate(d.getDate() - 29); return { from: d, to: today }; }
    case 'thisMonth': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: today };
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: start, to: end };
    }
    case 'thisYear': return { from: new Date(now.getFullYear(), 0, 1), to: today };
    default: return { from: new Date(today.getTime() - 29 * 86400000), to: today };
  }
}

function toISO(d) { return d.toISOString().split('T')[0]; }

const PROGRAMS = [
  { id: 'gamblezen', label: 'Gamblezen', icon: '🎰' },
  { id: 'megarich', label: 'Megarich', icon: '💎' },
];

export default function AffiliateStats() {
  const defaultRange = getPresetRange('30d');
  const [program, setProgram] = useState('gamblezen');
  const [from, setFrom] = useState(toISO(defaultRange.from));
  const [to, setTo] = useState(toISO(defaultRange.to));
  const [groupBy, setGroupBy] = useState('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [expandedBrand, setExpandedBrand] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const params = new URLSearchParams({ program, from, to, group_by: `${groupBy},brand` });
      const res = await fetch(`/api/affiliate-stats?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API error ${res.status}`);
      }
      setReport(await res.json());
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [program, from, to, groupBy]);

  // Process report data into per-brand aggregates
  const brandData = React.useMemo(() => {
    if (!report?.rows?.data) return { brands: [], totals: null, byBrand: {} };

    const relations = report.relations || {};
    const brandMap = {};
    (relations.brands || []).forEach(b => { brandMap[b.id] = b.name; });
    const campaignMap = {};
    (relations.campaigns || []).forEach(c => { campaignMap[c.id] = c; });

    // Aggregate by brand
    const byBrand = {};
    for (const row of report.rows.data) {
      const brandCell = getCell(row, 'brand_id');
      const brandId = brandCell?.value;
      if (!brandId) continue;

      if (!byBrand[brandId]) {
        byBrand[brandId] = {
          id: brandId,
          name: brandMap[brandId] || `Brand #${brandId}`,
          rows: [],
          totals: { ngr: 0, deposits_sum: 0, deposits_count: 0, first_deposits_count: 0,
            first_deposits_sum: 0, registrations_count: 0, visits_count: 0,
            casino_active_players_count: 0, ggr: 0, clean_net_revenue: 0,
            cashouts_sum: 0, cashouts_count: 0 },
          currency: 'EUR',
        };
      }
      const b = byBrand[brandId];
      b.rows.push(row);

      // Accumulate totals
      const cur = cellCurrency(getCell(row, 'currency'));
      if (cur && cur !== 'N/A') b.currency = cur;
      for (const key of Object.keys(b.totals)) {
        b.totals[key] += cellValue(getCell(row, key));
      }
    }

    // Global totals from API
    let totals = null;
    if (report.totals?.data?.[0]) {
      const tr = report.totals.data[0];
      const cur = cellCurrency(getCell(tr, 'currency')) || 'EUR';
      totals = {
        currency: cur,
        ngr: cellValue(getCell(tr, 'ngr')),
        deposits_sum: cellValue(getCell(tr, 'deposits_sum')),
        first_deposits_count: cellValue(getCell(tr, 'first_deposits_count')),
        registrations_count: cellValue(getCell(tr, 'registrations_count')),
        visits_count: cellValue(getCell(tr, 'visits_count')),
        clean_net_revenue: cellValue(getCell(tr, 'clean_net_revenue')),
      };
    }

    return {
      brands: Object.values(byBrand).sort((a, b) => b.totals.ngr - a.totals.ngr),
      totals,
      byBrand,
      brandMap,
      campaignMap,
    };
  }, [report]);

  const applyPreset = (preset) => {
    const r = getPresetRange(preset);
    setFrom(toISO(r.from));
    setTo(toISO(r.to));
  };

  return (
    <div className="affiliate-stats">
      <div className="affiliate-stats-header">
        <h2>📊 Affiliate Partner Stats</h2>
        <p className="affiliate-stats-subtitle">Revenue, deposits, registrations & more — grouped by brand</p>
      </div>

      {/* Program selector */}
      <div className="affiliate-program-tabs">
        {PROGRAMS.map(p => (
          <button
            key={p.id}
            className={`affiliate-program-tab ${program === p.id ? 'active' : ''}`}
            onClick={() => { setProgram(p.id); setReport(null); setExpandedBrand(null); }}
          >
            <span>{p.icon}</span> {p.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="affiliate-filters">
        <div className="affiliate-filters-row">
          <div className="affiliate-filter-group">
            <label>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="affiliate-input" />
          </div>
          <div className="affiliate-filter-group">
            <label>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="affiliate-input" />
          </div>
          <div className="affiliate-filter-group">
            <label>Group by</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="affiliate-input">
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          <button className="affiliate-btn-primary" onClick={fetchReport} disabled={loading}>
            {loading ? '⏳ Loading…' : '🔍 Fetch Report'}
          </button>
        </div>
        <div className="affiliate-presets">
          {[['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['thisMonth', 'This month'], ['lastMonth', 'Last month'], ['thisYear', 'This year']].map(([k, label]) => (
            <button key={k} className="affiliate-preset-btn" onClick={() => applyPreset(k)}>{label}</button>
          ))}
        </div>
      </div>

      {error && <div className="affiliate-error">⚠️ {error}</div>}

      {/* Not configured message */}
      {!report && !loading && !error && (
        <div className="affiliate-empty">
          <span className="affiliate-empty-icon">📊</span>
          <p>Select a date range and click <strong>Fetch Report</strong> to load affiliate stats.</p>
          <p className="affiliate-empty-hint">Make sure <code>AFFILIATE_API_BASE</code> and <code>AFFILIATE_API_TOKEN</code> are set in your Vercel environment variables.</p>
        </div>
      )}

      {/* Global totals */}
      {brandData.totals && (
        <StatsGrid columns={6}>
          <StatsCard icon="💰" value={fmt(brandData.totals.ngr, brandData.totals.currency)} label="Total NGR" color="primary" />
          <StatsCard icon="💳" value={fmt(brandData.totals.deposits_sum, brandData.totals.currency)} label="Total Deposits" color="success" />
          <StatsCard icon="🆕" value={brandData.totals.first_deposits_count} label="First Deposits" color="warning" />
          <StatsCard icon="📝" value={brandData.totals.registrations_count} label="Registrations" color="info" />
          <StatsCard icon="👁️" value={brandData.totals.visits_count} label="Visits" color="default" />
          <StatsCard icon="💎" value={fmt(brandData.totals.clean_net_revenue, brandData.totals.currency)} label="Clean Net Revenue" color="primary" />
        </StatsGrid>
      )}

      {/* Per-brand cards */}
      {brandData.brands.length > 0 && (
        <div className="affiliate-brands">
          <h3>Per Brand Breakdown</h3>
          <div className="affiliate-brand-grid">
            {brandData.brands.map(brand => {
              const isExpanded = expandedBrand === brand.id;
              return (
                <div key={brand.id} className={`affiliate-brand-card ${isExpanded ? 'expanded' : ''}`}>
                  <div className="affiliate-brand-header" onClick={() => setExpandedBrand(isExpanded ? null : brand.id)}>
                    <div className="affiliate-brand-name">
                      <span className="affiliate-brand-icon">🏢</span>
                      {brand.name}
                      <span className="affiliate-brand-id">#{brand.id}</span>
                    </div>
                    <div className="affiliate-brand-summary">
                      <span className={`affiliate-brand-ngr ${brand.totals.ngr >= 0 ? 'positive' : 'negative'}`}>
                        NGR: {fmt(brand.totals.ngr, brand.currency)}
                      </span>
                      <span className="affiliate-brand-arrow">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Brand summary stats */}
                  <div className="affiliate-brand-stats">
                    <div className="affiliate-mini-stat">
                      <span className="mini-label">Deposits</span>
                      <span className="mini-value">{fmt(brand.totals.deposits_sum, brand.currency)}</span>
                    </div>
                    <div className="affiliate-mini-stat">
                      <span className="mini-label">First Deps</span>
                      <span className="mini-value">{brand.totals.first_deposits_count}</span>
                    </div>
                    <div className="affiliate-mini-stat">
                      <span className="mini-label">Registrations</span>
                      <span className="mini-value">{brand.totals.registrations_count}</span>
                    </div>
                    <div className="affiliate-mini-stat">
                      <span className="mini-label">Visits</span>
                      <span className="mini-value">{brand.totals.visits_count}</span>
                    </div>
                    <div className="affiliate-mini-stat">
                      <span className="mini-label">Cashouts</span>
                      <span className="mini-value">{fmt(brand.totals.cashouts_sum, brand.currency)}</span>
                    </div>
                    <div className="affiliate-mini-stat">
                      <span className="mini-label">Clean Rev</span>
                      <span className="mini-value">{fmt(brand.totals.clean_net_revenue, brand.currency)}</span>
                    </div>
                  </div>

                  {/* Expanded: daily breakdown table */}
                  {isExpanded && (
                    <div className="affiliate-brand-detail">
                      <table className="affiliate-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>NGR</th>
                            <th>Deposits</th>
                            <th>First Deps</th>
                            <th>Regs</th>
                            <th>Visits</th>
                            <th>Clean Rev</th>
                          </tr>
                        </thead>
                        <tbody>
                          {brand.rows.map((row, i) => {
                            const date = getCell(row, 'date')?.value;
                            const cur = cellCurrency(getCell(row, 'currency')) || brand.currency;
                            return (
                              <tr key={i}>
                                <td>{date ? new Date(date).toLocaleDateString() : '—'}</td>
                                <td className={cellValue(getCell(row, 'ngr')) >= 0 ? 'positive' : 'negative'}>
                                  {fmt(cellValue(getCell(row, 'ngr')), cur)}
                                </td>
                                <td>{fmt(cellValue(getCell(row, 'deposits_sum')), cur)}</td>
                                <td>{cellValue(getCell(row, 'first_deposits_count'))}</td>
                                <td>{cellValue(getCell(row, 'registrations_count'))}</td>
                                <td>{cellValue(getCell(row, 'visits_count'))}</td>
                                <td className={cellValue(getCell(row, 'clean_net_revenue')) >= 0 ? 'positive' : 'negative'}>
                                  {fmt(cellValue(getCell(row, 'clean_net_revenue')), cur)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="affiliate-loading">
          <div className="affiliate-spinner" />
          <p>Fetching affiliate report…</p>
        </div>
      )}
    </div>
  );
}
