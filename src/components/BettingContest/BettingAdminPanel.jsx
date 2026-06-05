/**
 * BettingAdminPanel.jsx
 * Admin control panel for creating, locking, resolving, and cancelling
 * pari-mutuel betting contests. Restricted to users with role = 'admin'.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import bettingService from '../../services/bettingService';
import './BettingAdminPanel.css';


// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPoints(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const OUTCOME_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#dc2626', '#0891b2', '#7c3aed', '#be185d',
  '#4d7c0f', '#9f1239',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="bap-dialog-overlay" role="dialog" aria-modal>
      <div className="bap-dialog">
        <p className="bap-dialog__msg">{message}</p>
        <div className="bap-dialog__actions">
          <button className="bap-btn bap-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="bap-btn bap-btn--danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function ContestCard({ contest, onLock, onResolve, onCancel, loading }) {
  const [resolveMode, setResolveMode]       = useState(false);
  const [selectedWinner, setSelectedWinner] = useState('');
  const [confirm, setConfirm]               = useState(null);  // { action, message }

  const outcomes   = contest.outcomes ?? [];
  const totalPool  = Number(contest.total_pool) || 0;
  const isOpen     = contest.status === 'open';
  const isLocked   = contest.status === 'locked';
  const isResolved = contest.status === 'resolved';
  const isCancelled = contest.status === 'cancelled';
  const isActive   = isOpen || isLocked;

  function handleAction(action) {
    const messages = {
      lock:    'Lock this contest? No new bets will be accepted.',
      cancel:  `Cancel and refund ALL ${totalPool > 0 ? formatPoints(totalPool) + ' pts' : 'bets'}? This cannot be undone.`,
      resolve: `Resolve with "${outcomes.find(o => o.id === selectedWinner)?.label}"? Payouts will be calculated and credited immediately.`,
    };
    setConfirm({ action, message: messages[action] });
  }

  function handleConfirm() {
    const { action } = confirm;
    setConfirm(null);
    if (action === 'lock')    onLock(contest.id);
    if (action === 'cancel')  onCancel(contest.id);
    if (action === 'resolve') onResolve(contest.id, selectedWinner);
  }

  return (
    <div className={`bap-card bap-card--${contest.status}`}>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="bap-card__header">
        <span className={`bap-badge bap-badge--${contest.status}`}>
          {contest.status.toUpperCase()}
        </span>
        <span className="bap-card__pool">
          {formatPoints(totalPool)} pts
        </span>
      </div>

      <h3 className="bap-card__question">{contest.question}</h3>

      {/* Outcome pools */}
      <div className="bap-card__outcomes">
        {outcomes.map((o, i) => {
          const pool = Number(o.pool) || 0;
          const pct  = totalPool > 0 ? (pool / totalPool) * 100 : 0;
          const isWinner = isResolved && o.id === contest.winning_outcome_id;

          return (
            <div
              key={o.id}
              className={`bap-outcome ${isWinner ? 'bap-outcome--winner' : ''}`}
            >
              <div className="bap-outcome__row">
                <span
                  className="bap-outcome__dot"
                  style={{ background: OUTCOME_COLORS[i % OUTCOME_COLORS.length] }}
                />
                <span className="bap-outcome__label">{o.label}</span>
                <span className="bap-outcome__multi">
                  {o.multiplier != null ? `${o.multiplier}×` : '—'}
                </span>
                <span className="bap-outcome__pool">
                  {formatPoints(pool)} pts ({pct.toFixed(1)}%)
                </span>
                <span className="bap-outcome__bets">{o.bet_count} bets</span>
                {isWinner && <span className="bap-outcome__crown">👑</span>}
              </div>
              <div className="bap-outcome__bar-wrap">
                <div
                  className="bap-outcome__bar-fill"
                  style={{
                    width:      `${Math.max(pct, 1)}%`,
                    background: OUTCOME_COLORS[i % OUTCOME_COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Resolved result */}
      {isResolved && (
        <div className="bap-card__resolved-info">
          <span>Winner: <strong>{outcomes.find(o => o.id === contest.winning_outcome_id)?.label ?? '—'}</strong></span>
          <span className="bap-card__resolved-at">
            {contest.resolved_at ? new Date(contest.resolved_at).toLocaleString() : ''}
          </span>
        </div>
      )}

      {/* Controls */}
      {isActive && (
        <div className="bap-card__controls">
          {isOpen && (
            <button
              className="bap-btn bap-btn--amber"
              onClick={() => handleAction('lock')}
              disabled={loading}
            >
              🔒 Lock Betting
            </button>
          )}

          {/* Resolve: expand to choose winner */}
          {!resolveMode ? (
            <button
              className="bap-btn bap-btn--green"
              onClick={() => setResolveMode(true)}
              disabled={loading}
            >
              ✅ Resolve
            </button>
          ) : (
            <div className="bap-resolve-form">
              <label className="bap-resolve-form__label">Select winning outcome:</label>
              <select
                className="bap-resolve-form__select"
                value={selectedWinner}
                onChange={e => setSelectedWinner(e.target.value)}
              >
                <option value="" disabled>Choose outcome…</option>
                {outcomes.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <div className="bap-resolve-form__actions">
                <button
                  className="bap-btn bap-btn--ghost"
                  onClick={() => { setResolveMode(false); setSelectedWinner(''); }}
                >
                  Cancel
                </button>
                <button
                  className="bap-btn bap-btn--green"
                  onClick={() => selectedWinner && handleAction('resolve')}
                  disabled={!selectedWinner || loading}
                >
                  Confirm Winner
                </button>
              </div>
            </div>
          )}

          <button
            className="bap-btn bap-btn--danger bap-btn--outline"
            onClick={() => handleAction('cancel')}
            disabled={loading}
          >
            ✕ Cancel &amp; Refund
          </button>
        </div>
      )}
    </div>
  );
}

// ── Create Contest Form ────────────────────────────────────────────────────────

function CreateContestForm({ onCreate, loading }) {
  const [title, setTitle]             = useState('');
  const [question, setQuestion]       = useState('');
  const [outcomes, setOutcomes]       = useState(['', '']);
  const [locksAt, setLocksAt]         = useState('');
  const [error, setError]             = useState('');

  function addOutcome() {
    if (outcomes.length < 10) setOutcomes(p => [...p, '']);
  }

  function removeOutcome(i) {
    if (outcomes.length > 2) setOutcomes(p => p.filter((_, idx) => idx !== i));
  }

  function updateOutcome(i, val) {
    setOutcomes(p => { const n = [...p]; n[i] = val; return n; });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim())    { setError('Title is required.');    return; }
    if (!question.trim()) { setError('Question is required.'); return; }

    const filled = outcomes.filter(o => o.trim());
    if (filled.length < 2) { setError('At least 2 outcomes are required.'); return; }

    try {
      await onCreate({
        title:        title.trim(),
        question:     question.trim(),
        outcomes:     filled.map(o => ({ label: o.trim() })),
        locksAt:      locksAt || undefined,
        currencyMode: 'se_points',
      });
      // Reset form
      setTitle('');
      setQuestion('');
      setOutcomes(['', '']);
      setLocksAt('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="bap-create-form" onSubmit={handleSubmit} noValidate>
      <h3 className="bap-create-form__heading">New Contest</h3>

      <div className="bap-field">
        <label className="bap-label">Title</label>
        <input
          className="bap-input"
          type="text"
          maxLength={200}
          placeholder="e.g. Next slot bonus round result"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div className="bap-field">
        <label className="bap-label">Question</label>
        <input
          className="bap-input"
          type="text"
          maxLength={500}
          placeholder="e.g. What will the bonus round payout be?"
          value={question}
          onChange={e => setQuestion(e.target.value)}
        />
      </div>

      <div className="bap-field">
        <label className="bap-label">
          Outcomes <span className="bap-label--muted">({outcomes.length}/10)</span>
        </label>
        <div className="bap-outcomes-list">
          {outcomes.map((o, i) => (
            <div key={i} className="bap-outcomes-list__row">
              <span
                className="bap-outcomes-list__dot"
                style={{ background: OUTCOME_COLORS[i % OUTCOME_COLORS.length] }}
              />
              <input
                className="bap-input bap-input--outcome"
                type="text"
                maxLength={200}
                placeholder={`Outcome ${i + 1}`}
                value={o}
                onChange={e => updateOutcome(i, e.target.value)}
              />
              {outcomes.length > 2 && (
                <button
                  type="button"
                  className="bap-outcomes-list__remove"
                  onClick={() => removeOutcome(i)}
                  aria-label="Remove outcome"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {outcomes.length < 10 && (
          <button type="button" className="bap-btn-add-outcome" onClick={addOutcome}>
            + Add outcome
          </button>
        )}
      </div>

      <div className="bap-field">
        <label className="bap-label">
          Auto-lock at <span className="bap-label--muted">(optional)</span>
        </label>
        <input
          className="bap-input"
          type="datetime-local"
          value={locksAt}
          onChange={e => setLocksAt(e.target.value)}
          min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
        />
      </div>

      <div className="bap-field">
        <label className="bap-label">Currency</label>
        <div className="bap-currency-toggle">
          <button type="button" className="bap-currency-btn bap-currency-btn--active" disabled>
            ⚡ SE Points
          </button>
        </div>
        <p className="bap-label--muted bap-field__hint">
          StreamElements points will be deducted on bet and credited on win/refund.
        </p>
      </div>

      {error && <p className="bap-error" role="alert">{error}</p>}

      <button
        type="submit"
        className="bap-btn bap-btn--primary bap-btn--full"
        disabled={loading}
      >
        {loading ? 'Creating…' : '🎲 Create Contest'}
      </button>
    </form>
  );
}

// ── Payout Verification Panel ─────────────────────────────────────────────────

function PayoutVerifier({ contestId }) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  async function runVerification() {
    if (!contestId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { contest } = await bettingService.getContest(contestId);
      if (contest.status !== 'resolved') {
        setError('Contest must be resolved to verify payouts.');
        return;
      }
      // Fetch all payout records
      const { createClient } = await import('@supabase/supabase-js');
      const { supabase }     = await import('../../config/supabaseClient');
      const { data: payouts } = await supabase
        .from('betting_contest_payouts')
        .select('bet_amount, payout_amount, profit')
        .eq('contest_id', contestId);

      if (!payouts) { setError('No payout records found.'); return; }

      const totalBets    = payouts.reduce((s, p) => s + Number(p.bet_amount), 0);
      const totalPayouts = payouts.reduce((s, p) => s + Number(p.payout_amount), 0);
      const totalPool    = Number(contest.total_pool);
      const balance      = totalPool - totalPayouts;

      setResult({
        winnerCount:   payouts.length,
        totalBets,
        totalPool,
        totalPayouts,
        balance,
        isZeroSum:     balance === 0,
        houseKeeps:    balance > 0 ? balance : 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!contestId) return null;

  return (
    <div className="bap-verifier">
      <div className="bap-verifier__header">
        <span className="bap-verifier__title">Payout Integrity Check</span>
        <button
          className="bap-btn bap-btn--ghost bap-btn--sm"
          onClick={runVerification}
          disabled={loading}
        >
          {loading ? 'Checking…' : '🔍 Verify'}
        </button>
      </div>

      {error && <p className="bap-error">{error}</p>}

      {result && (
        <div className={`bap-verifier__result ${result.isZeroSum ? 'bap-verifier__result--ok' : 'bap-verifier__result--warn'}`}>
          <div className="bap-verifier__row">
            <span>Total pool</span>
            <strong>{formatPoints(result.totalPool)} pts</strong>
          </div>
          <div className="bap-verifier__row">
            <span>Paid to {result.winnerCount} winners</span>
            <strong>{formatPoints(result.totalPayouts)} pts</strong>
          </div>
          <div className="bap-verifier__row">
            <span>House keeps (no-winner edge case)</span>
            <strong>{formatPoints(result.houseKeeps)} pts</strong>
          </div>
          <div className="bap-verifier__row bap-verifier__row--total">
            <span>Balance (must be 0)</span>
            <strong className={result.isZeroSum ? 'bap-verifier__ok' : 'bap-verifier__warn'}>
              {result.balance} pts {result.isZeroSum ? '✓ Zero-sum' : '⚠ Mismatch'}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Admin Panel ──────────────────────────────────────────────────────────

/**
 * BettingAdminPanel — full admin control panel.
 * Requires user to have role = 'admin'.
 *
 * Props:
 *   onContestChange {Function} - Callback when a contest is created/resolved/cancelled
 */
export default function BettingAdminPanel({ onContestChange }) {
  const { user } = useAuth();

  const [tab,       setTab]     = useState('active');   // 'active' | 'create' | 'history'
  const [contests,  setContests] = useState([]);
  const [loading,   setLoading]  = useState(false);
  const [actionLoad, setActionLoad] = useState(false);
  const [notification, setNotification] = useState('');
  const [notifType,    setNotifType]    = useState('success');

  function showNotif(msg, type = 'success') {
    setNotification(msg);
    setNotifType(type);
    setTimeout(() => setNotification(''), 5000);
  }

  const loadContests = useCallback(async (status) => {
    setLoading(true);
    try {
      const { contests: data } = await bettingService.listContests(status, { limit: 30 });
      setContests(data ?? []);
    } catch (err) {
      showNotif(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'active')  loadContests('open');
    if (tab === 'history') loadContests('resolved');
    if (tab === 'locked')  loadContests('locked');
  }, [tab, loadContests]);

  // ── Admin actions ────────────────────────────────────────────────────
  async function handleCreate(opts) {
    setActionLoad(true);
    try {
      const res = await bettingService.createContest(opts);
      showNotif(`Contest created! ID: ${res.contest.id}`);
      setTab('active');
      onContestChange?.(res.contest);
    } catch (err) {
      showNotif(err.message, 'error');
      throw err;
    } finally {
      setActionLoad(false);
    }
  }

  async function handleLock(contestId) {
    setActionLoad(true);
    try {
      await bettingService.lockContest(contestId);
      showNotif('Contest locked — no new bets accepted.');
      loadContests('open');
      onContestChange?.({ id: contestId, action: 'locked' });
    } catch (err) {
      showNotif(err.message, 'error');
    } finally {
      setActionLoad(false);
    }
  }

  async function handleResolve(contestId, winningOutcomeId) {
    setActionLoad(true);
    try {
      const res = await bettingService.resolveContest(contestId, winningOutcomeId);
      showNotif(
        `Resolved! ${res.winnerCount} winners paid from ${formatPoints(res.totalPool)} pt pool.`
      );
      if (tab === 'active') loadContests('open');
      if (tab === 'locked') loadContests('locked');
      onContestChange?.({ id: contestId, action: 'resolved', ...res });
    } catch (err) {
      showNotif(err.message, 'error');
    } finally {
      setActionLoad(false);
    }
  }

  async function handleCancel(contestId) {
    setActionLoad(true);
    try {
      const res = await bettingService.cancelContest(contestId);
      showNotif(`Contest cancelled. ${res.refundedBets} bets refunded.`);
      loadContests(tab === 'locked' ? 'locked' : 'open');
      onContestChange?.({ id: contestId, action: 'cancelled' });
    } catch (err) {
      showNotif(err.message, 'error');
    } finally {
      setActionLoad(false);
    }
  }

  if (!user) {
    return (
      <div className="bap-container">
        <p className="bap-no-auth">Sign in as admin to manage contests.</p>
      </div>
    );
  }

  return (
    <div className="bap-container">
      <div className="bap-header">
        <h2 className="bap-header__title">🎲 Betting Contests</h2>
        <p className="bap-header__sub">Pari-mutuel pool betting</p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`bap-notif bap-notif--${notifType}`} role="status">
          {notification}
        </div>
      )}

      {/* Tabs */}
      <div className="bap-tabs" role="tablist">
        {[
          { id: 'active',  label: 'Open' },
          { id: 'locked',  label: 'Locked' },
          { id: 'create',  label: '+ New' },
          { id: 'history', label: 'History' },
        ].map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`bap-tab ${tab === t.id ? 'bap-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bap-tab-content">

        {/* Create form */}
        {tab === 'create' && (
          <CreateContestForm onCreate={handleCreate} loading={actionLoad} />
        )}

        {/* Contest list */}
        {(tab === 'active' || tab === 'locked' || tab === 'history') && (
          <>
            {loading && (
              <div className="bap-loading">
                <span className="bap-spinner" />
                Loading contests…
              </div>
            )}

            {!loading && contests.length === 0 && (
              <p className="bap-empty">
                {tab === 'active'  && 'No open contests. Create one with + New.'}
                {tab === 'locked'  && 'No locked contests.'}
                {tab === 'history' && 'No resolved contests yet.'}
              </p>
            )}

            <div className="bap-card-list">
              {contests.map(c => (
                <div key={c.id}>
                  <ContestCard
                    contest={c}
                    onLock={handleLock}
                    onResolve={handleResolve}
                    onCancel={handleCancel}
                    loading={actionLoad}
                  />
                  {c.status === 'resolved' && (
                    <PayoutVerifier contestId={c.id} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
