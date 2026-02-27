/**
 * BonusHuntLibrary.jsx — "Library" panel in the Overlay Control Center.
 * Shows the authenticated user's saved bonus hunts from bonus_hunt_history.
 * Each user can only see their own hunts (RLS enforced).
 * Hunts can be viewed in detail, searched/filtered, deleted, or loaded
 * back onto the overlay's bonus_hunt widget.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBonusHuntHistory, deleteBonusHuntHistory } from '../../services/overlayService';

export default function BonusHuntLibrary({ widgets, onSaveWidget }) {
  const { user } = useAuth();

  const [hunts, setHunts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');   // date-desc | date-asc | profit-desc | profit-asc | bonuses-desc
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewMode, setViewMode] = useState('grid');      // grid | list

  // ── Load hunts ──
  const loadHunts = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const data = await getBonusHuntHistory(user.id);
      setHunts(data);
    } catch (err) {
      const msg = err?.message || 'Failed to load library';
      if (msg.includes('42P01')) {
        setError('Table not found. Run the migration: add_bonus_hunt_history.sql');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadHunts(); }, [loadHunts]);

  // ── Flash message helper ──
  const flash = (msg, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  };

  // ── Search + Sort ──
  const filtered = useMemo(() => {
    let list = hunts;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(h =>
        (h.hunt_name || '').toLowerCase().includes(q) ||
        (h.best_slot_name || '').toLowerCase().includes(q) ||
        (Array.isArray(h.bonuses) && h.bonuses.some(b =>
          (b.slotName || b.slot?.name || '').toLowerCase().includes(q)
        ))
      );
    }

    // Sort
    const sorted = [...list];
    switch (sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'profit-desc':
        sorted.sort((a, b) => (Number(b.profit) || 0) - (Number(a.profit) || 0));
        break;
      case 'profit-asc':
        sorted.sort((a, b) => (Number(a.profit) || 0) - (Number(b.profit) || 0));
        break;
      case 'bonuses-desc':
        sorted.sort((a, b) => (b.bonus_count || 0) - (a.bonus_count || 0));
        break;
      default:
        break;
    }
    return sorted;
  }, [hunts, searchQuery, sortBy]);

  // ── Load hunt back to overlay ──
  const handleLoadToOverlay = useCallback((hunt) => {
    const bhWidget = (widgets || []).find(w => w.widget_type === 'bonus_hunt');
    if (!bhWidget) {
      flash('⚠️ No Bonus Hunt widget on your overlay. Add one first from the Widgets tab.');
      return;
    }

    const updatedConfig = {
      ...(bhWidget.config || {}),
      huntName: hunt.hunt_name,
      currency: hunt.currency || '€',
      startMoney: hunt.start_money,
      stopLoss: hunt.stop_loss,
      bonuses: hunt.bonuses || [],
      huntActive: true,
    };

    onSaveWidget({ ...bhWidget, config: updatedConfig });
    flash(`✅ "${hunt.hunt_name}" loaded onto your overlay!`);
  }, [widgets, onSaveWidget]);

  // ── Delete hunt ──
  const handleDelete = async (id) => {
    try {
      await deleteBonusHuntHistory(id);
      setHunts(prev => prev.filter(h => h.id !== id));
      setConfirmDelete(null);
      if (expandedId === id) setExpandedId(null);
      flash('🗑️ Hunt deleted');
    } catch (err) {
      flash('⚠️ ' + (err?.message || 'Delete failed'));
    }
  };

  // ── Download hunt as JSON ──
  const handleDownloadJSON = (hunt) => {
    const data = {
      hunt_name: hunt.hunt_name,
      currency: hunt.currency || '€',
      hunt_date: hunt.hunt_date || hunt.created_at,
      start_money: hunt.start_money,
      stop_loss: hunt.stop_loss,
      total_bet: hunt.total_bet,
      total_win: hunt.total_win,
      profit: hunt.profit,
      bonus_count: hunt.bonus_count,
      bonuses_opened: hunt.bonuses_opened,
      avg_multi: hunt.avg_multi,
      best_multi: hunt.best_multi,
      best_slot_name: hunt.best_slot_name,
      bonuses: hunt.bonuses || [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(hunt.hunt_name || 'hunt').replace(/[^a-z0-9]/gi, '_')}_${new Date(hunt.created_at).toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Formatting helpers ──
  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const fmtNum = (n) => {
    const num = Number(n) || 0;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ── Stats summary ──
  const stats = useMemo(() => {
    const total = hunts.length;
    const totalProfit = hunts.reduce((s, h) => s + (Number(h.profit) || 0), 0);
    const totalBonuses = hunts.reduce((s, h) => s + (h.bonus_count || 0), 0);
    const profitable = hunts.filter(h => (Number(h.profit) || 0) >= 0).length;
    const bestHunt = hunts.reduce((best, h) =>
      (Number(h.profit) || 0) > (Number(best?.profit) || -Infinity) ? h : best,
      null
    );
    return { total, totalProfit, totalBonuses, profitable, bestHunt };
  }, [hunts]);

  // ── Render ──
  if (!user) {
    return (
      <div className="bhl-empty-state">
        <span className="bhl-empty-icon">🔒</span>
        <p>Sign in to access your Bonus Hunt Library.</p>
      </div>
    );
  }

  return (
    <div className="bhl-panel" data-tour="library-page">
      {/* ── Header ── */}
      <div className="oc-panel-header">
        <h2 className="oc-panel-title">📚 Bonus Hunt Library</h2>
        <button className="oc-btn oc-btn--sm" onClick={loadHunts} title="Refresh library">
          🔄 Refresh
        </button>
      </div>

      <p className="bhl-description">
        Your private collection of saved bonus hunts. Search, review stats, or load any hunt back onto your overlay.
      </p>

      {/* ── Message banner ── */}
      {message && (
        <div className={`bh-history-msg ${message.startsWith('✅') ? 'bh-history-msg--ok' : message.startsWith('🗑') ? 'bh-history-msg--del' : 'bh-history-msg--err'}`}>
          {message}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bh-history-msg bh-history-msg--err">{error}</div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div className="bhl-loading">
          <div className="oc-spinner" />
          <p>Loading your library…</p>
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && !error && (
        <>
          {/* ── Stats overview ── */}
          {hunts.length > 0 && (
            <div className="bhl-stats-bar">
              <div className="bhl-stat-item">
                <span className="bhl-stat-value">{stats.total}</span>
                <span className="bhl-stat-label">Hunts</span>
              </div>
              <div className="bhl-stat-item">
                <span className="bhl-stat-value">{stats.totalBonuses}</span>
                <span className="bhl-stat-label">Total Bonuses</span>
              </div>
              <div className="bhl-stat-item">
                <span className={`bhl-stat-value ${stats.totalProfit >= 0 ? 'bhl-val--profit' : 'bhl-val--loss'}`}>
                  {stats.totalProfit >= 0 ? '+' : ''}{fmtNum(stats.totalProfit)}
                </span>
                <span className="bhl-stat-label">Total P/L</span>
              </div>
              <div className="bhl-stat-item">
                <span className="bhl-stat-value">{stats.profitable}/{stats.total}</span>
                <span className="bhl-stat-label">Profitable</span>
              </div>
              {stats.bestHunt && (
                <div className="bhl-stat-item bhl-stat-item--best">
                  <span className="bhl-stat-value">🏆 {stats.bestHunt.hunt_name}</span>
                  <span className="bhl-stat-label">Best Hunt (+{fmtNum(stats.bestHunt.profit)})</span>
                </div>
              )}
            </div>
          )}

          {/* ── Search + Sort + View controls ── */}
          {hunts.length > 0 && (
            <div className="bhl-controls">
              <div className="bhl-search-box">
                <span className="bhl-search-icon">🔍</span>
                <input
                  className="bhl-search-input"
                  type="text"
                  placeholder="Search by hunt name or slot…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="bhl-search-clear" onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>

              <select className="bhl-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="profit-desc">Highest profit</option>
                <option value="profit-asc">Lowest profit</option>
                <option value="bonuses-desc">Most bonuses</option>
              </select>

              <div className="bhl-view-toggle">
                <button
                  className={`bhl-view-btn ${viewMode === 'grid' ? 'bhl-view-btn--active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  ▦
                </button>
                <button
                  className={`bhl-view-btn ${viewMode === 'list' ? 'bhl-view-btn--active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  ☰
                </button>
              </div>
            </div>
          )}

          {/* ── Search results count ── */}
          {searchQuery && (
            <p className="bhl-results-count">
              {filtered.length} hunt{filtered.length !== 1 ? 's' : ''} found
            </p>
          )}

          {/* ── Empty state ── */}
          {hunts.length === 0 && (
            <div className="bhl-empty-state">
              <span className="bhl-empty-icon">📚</span>
              <h3 className="bhl-empty-title">Your library is empty</h3>
              <p className="bhl-empty-text">
                Complete a bonus hunt and save it from the Bonus Hunt widget's History tab to start building your collection.
              </p>
            </div>
          )}

          {/* ── No search results ── */}
          {hunts.length > 0 && filtered.length === 0 && (
            <div className="bhl-empty-state">
              <span className="bhl-empty-icon">🔍</span>
              <p className="bhl-empty-text">No hunts match "{searchQuery}"</p>
            </div>
          )}

          {/* ── Hunt Cards ── */}
          {filtered.length > 0 && (
            <div className={`bhl-hunt-grid ${viewMode === 'list' ? 'bhl-hunt-grid--list' : ''}`}>
              {filtered.map(hunt => {
                const prof = Number(hunt.profit) || 0;
                const isProfit = prof >= 0;
                const isExpanded = expandedId === hunt.id;
                const cur = hunt.currency || '€';

                return (
                  <div
                    key={hunt.id}
                    className={`bhl-card ${isExpanded ? 'bhl-card--expanded' : ''} ${isProfit ? 'bhl-card--profit' : 'bhl-card--loss'}`}
                  >
                    {/* Card header — clickable */}
                    <div className="bhl-card-header" onClick={() => setExpandedId(isExpanded ? null : hunt.id)}>
                      <div className="bhl-card-title-row">
                        <h3 className="bhl-card-name">{hunt.hunt_name}</h3>
                        <span className={`bhl-card-pnl ${isProfit ? 'bhl-pnl--profit' : 'bhl-pnl--loss'}`}>
                          {isProfit ? '+' : ''}{cur}{fmtNum(prof)}
                        </span>
                      </div>
                      <div className="bhl-card-meta">
                        <span className="bhl-card-date">{fmtDate(hunt.created_at)}</span>
                        <span className="bhl-card-bonus-count">🎰 {hunt.bonus_count} bonuses</span>
                        {hunt.best_slot_name && (
                          <span className="bhl-card-best-slot">🏆 {hunt.best_slot_name}</span>
                        )}
                      </div>

                      {/* Mini progress bar — opened / total */}
                      <div className="bhl-card-progress">
                        <div
                          className="bhl-card-progress-fill"
                          style={{ width: `${hunt.bonus_count > 0 ? ((hunt.bonuses_opened || 0) / hunt.bonus_count) * 100 : 0}%` }}
                        />
                      </div>

                      <svg
                        className={`bhl-card-chevron ${isExpanded ? 'bhl-card-chevron--open' : ''}`}
                        width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <path d="M3 5l4 4 4-4" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Expanded detail section */}
                    {isExpanded && (
                      <div className="bhl-card-body">
                        {/* Stats grid */}
                        <div className="bhl-detail-grid">
                          <div className="bhl-detail-box">
                            <span className="bhl-detail-label">Start</span>
                            <span className="bhl-detail-value">{cur}{fmtNum(hunt.start_money)}</span>
                          </div>
                          <div className="bhl-detail-box">
                            <span className="bhl-detail-label">Total Bet</span>
                            <span className="bhl-detail-value">{cur}{fmtNum(hunt.total_bet)}</span>
                          </div>
                          <div className="bhl-detail-box">
                            <span className="bhl-detail-label">Total Win</span>
                            <span className="bhl-detail-value">{cur}{fmtNum(hunt.total_win)}</span>
                          </div>
                          <div className="bhl-detail-box">
                            <span className="bhl-detail-label">Profit/Loss</span>
                            <span className={`bhl-detail-value ${isProfit ? 'bhl-val--profit' : 'bhl-val--loss'}`}>
                              {isProfit ? '+' : ''}{cur}{fmtNum(prof)}
                            </span>
                          </div>
                          <div className="bhl-detail-box">
                            <span className="bhl-detail-label">Avg Multi</span>
                            <span className="bhl-detail-value">{Number(hunt.avg_multi || 0).toFixed(2)}x</span>
                          </div>
                          <div className="bhl-detail-box">
                            <span className="bhl-detail-label">Best Multi</span>
                            <span className="bhl-detail-value">{Number(hunt.best_multi || 0).toFixed(2)}x</span>
                          </div>
                          <div className="bhl-detail-box">
                            <span className="bhl-detail-label">Opened</span>
                            <span className="bhl-detail-value">{hunt.bonuses_opened || 0}/{hunt.bonus_count || 0}</span>
                          </div>
                          {hunt.stop_loss > 0 && (
                            <div className="bhl-detail-box">
                              <span className="bhl-detail-label">Stop Loss</span>
                              <span className="bhl-detail-value">{cur}{fmtNum(hunt.stop_loss)}</span>
                            </div>
                          )}
                          {hunt.best_slot_name && (
                            <div className="bhl-detail-box bhl-detail-box--wide">
                              <span className="bhl-detail-label">🏆 Best Slot</span>
                              <span className="bhl-detail-value">{hunt.best_slot_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Bonus list */}
                        {Array.isArray(hunt.bonuses) && hunt.bonuses.length > 0 && (
                          <div className="bhl-bonus-section">
                            <span className="bhl-bonus-section-label">
                              All Bonuses ({hunt.bonuses.length})
                            </span>
                            <div className="bhl-bonus-list">
                              {hunt.bonuses.map((b, i) => {
                                const mult = (Number(b.betSize) || 0) > 0
                                  ? ((Number(b.payout) || 0) / Number(b.betSize)).toFixed(1)
                                  : '0';
                                return (
                                  <div
                                    key={i}
                                    className={`bhl-bonus-item ${b.opened ? 'bhl-bonus-item--opened' : ''} ${b.isSuperBonus ? 'bhl-bonus-item--super' : ''}`}
                                  >
                                    <span className="bhl-bonus-name">{b.slotName || b.slot?.name || '?'}</span>
                                    <span className="bhl-bonus-bet">{cur}{fmtNum(b.betSize)}</span>
                                    {b.opened && (
                                      <>
                                        <span className="bhl-bonus-win">{cur}{fmtNum(b.payout)}</span>
                                        <span className={`bhl-bonus-mult ${Number(mult) >= 50 ? 'bhl-mult--high' : Number(mult) >= 20 ? 'bhl-mult--mid' : ''}`}>
                                          {mult}x
                                        </span>
                                      </>
                                    )}
                                    {!b.opened && (
                                      <span className="bhl-bonus-pending">Pending</span>
                                    )}
                                    {b.isSuperBonus && <span className="bhl-bonus-super-badge">SUPER</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="bhl-card-actions">
                          <button
                            className="oc-btn oc-btn--sm oc-btn--primary"
                            onClick={() => handleLoadToOverlay(hunt)}
                          >
                            📥 Load to Overlay
                          </button>

                          <button
                            className="bhl-download-btn"
                            onClick={() => handleDownloadJSON(hunt)}
                            title="Download hunt data as JSON"
                          >
                            💾 Download JSON
                          </button>

                          {confirmDelete === hunt.id ? (
                            <div className="bhl-confirm-row">
                              <span className="bhl-confirm-text">Delete this hunt?</span>
                              <button className="oc-btn oc-btn--sm oc-btn--danger" onClick={() => handleDelete(hunt.id)}>
                                Yes, Delete
                              </button>
                              <button className="oc-btn oc-btn--sm" onClick={() => setConfirmDelete(null)}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="oc-btn oc-btn--sm oc-btn--danger"
                              onClick={() => setConfirmDelete(hunt.id)}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
