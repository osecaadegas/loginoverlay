import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import bettingService, { estimatePayout } from '../../services/bettingService';
import './BettingContest.css';

// ── Constants ────────────────────────────────────────────────────────────────
const QUICK_BET_AMOUNTS = [100, 500, 1000, 5000, 10000];
const ODDS_POLL_MS      = 5000; // live odds refresh interval

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  open:      'OPEN',
  locked:    'LOCKED',
  resolved:  'RESOLVED',
  cancelled: 'CANCELLED',
};

function formatPoints(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeSince(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (hours > 0)  return `${hours}h ago`;
  if (mins  > 0)  return `${mins}m ago`;
  return 'just now';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span className={`bc-badge bc-badge--${status}`}>
      {STATUS_LABELS[status] ?? status.toUpperCase()}
    </span>
  );
}

function OutcomeBar({ outcome, totalPool, isWinner, userOutcomeId, onClick, disabled }) {
  const pool       = Number(outcome.pool) || 0;
  const total      = Number(totalPool)    || 0;
  const pct        = total > 0 ? (pool / total) * 100 : 0;
  const isSelected = userOutcomeId === outcome.id;

  return (
    <button
      className={[
        'bc-outcome',
        isSelected   ? 'bc-outcome--selected'  : '',
        isWinner     ? 'bc-outcome--winner'     : '',
        isWinner === false ? 'bc-outcome--loser' : '',
        disabled     ? 'bc-outcome--disabled'   : '',
      ].filter(Boolean).join(' ')}
      onClick={() => !disabled && onClick(outcome)}
      disabled={disabled}
      aria-pressed={isSelected}
    >
      <div className="bc-outcome__header">
        <span className="bc-outcome__label">{outcome.label}</span>
        <span className="bc-outcome__multi">
          {outcome.multiplier != null ? `${outcome.multiplier}×` : '—'}
        </span>
      </div>

      <div className="bc-outcome__bar-wrap">
        <div
          className="bc-outcome__bar-fill"
          style={{ width: `${Math.max(pct, 2)}%` }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>

      <div className="bc-outcome__footer">
        <span className="bc-outcome__pool">{formatPoints(pool)} pts</span>
        <span className="bc-outcome__pct">{pct.toFixed(1)}%</span>
        <span className="bc-outcome__bets">{outcome.bet_count} bets</span>
      </div>

      {isWinner && <span className="bc-outcome__crown">👑 Winner</span>}
      {isSelected && !isWinner && (
        <span className="bc-outcome__your-pick">Your pick</span>
      )}
    </button>
  );
}

function BetForm({ outcomes, totalPool, playerBalance, onBet, loading }) {
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [amount, setAmount]                   = useState('');
  const [error, setError]                     = useState('');

  const numAmount = parseInt(amount, 10) || 0;
  const preview   = selectedOutcome && numAmount > 0
    ? estimatePayout(numAmount, Number(selectedOutcome.pool), Number(totalPool))
    : null;

  function handleQuick(val) {
    setAmount(String(Math.min(val, playerBalance ?? val)));
    setError('');
  }

  function handleMax() {
    setAmount(String(playerBalance ?? 0));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!selectedOutcome) { setError('Select an outcome first.'); return; }
    if (numAmount < 1)    { setError('Enter a valid bet amount.'); return; }
    if (playerBalance != null && numAmount > playerBalance) {
      setError(`Not enough balance (you have ${formatPoints(playerBalance)} pts).`);
      return;
    }

    try {
      await onBet(selectedOutcome.id, numAmount);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="bc-bet-form" onSubmit={handleSubmit} noValidate>
      <p className="bc-bet-form__title">Place your bet</p>

      <div className="bc-bet-form__outcomes">
        {outcomes.map(o => (
          <button
            key={o.id}
            type="button"
            className={`bc-bet-form__outcome-btn ${selectedOutcome?.id === o.id ? 'is-active' : ''}`}
            onClick={() => { setSelectedOutcome(o); setError(''); }}
          >
            {o.label}
            {o.multiplier != null && (
              <span className="bc-bet-form__outcome-multi">{o.multiplier}×</span>
            )}
          </button>
        ))}
      </div>

      <div className="bc-bet-form__amount-row">
        <input
          className="bc-bet-form__input"
          type="number"
          min={1}
          max={playerBalance ?? undefined}
          step={1}
          placeholder="Enter amount…"
          value={amount}
          onChange={e => { setAmount(e.target.value); setError(''); }}
          aria-label="Bet amount"
        />
        <button type="button" className="bc-bet-form__max-btn" onClick={handleMax}>
          MAX
        </button>
      </div>

      <div className="bc-bet-form__quick-bets">
        {QUICK_BET_AMOUNTS.map(v => (
          <button
            key={v}
            type="button"
            className="bc-bet-form__quick-btn"
            onClick={() => handleQuick(v)}
          >
            {formatPoints(v)}
          </button>
        ))}
      </div>

      {preview && selectedOutcome && (
        <div className="bc-bet-form__preview">
          <span>Est. payout if <strong>{selectedOutcome.label}</strong> wins:</span>
          <strong className="bc-bet-form__preview-payout">
            {formatPoints(preview.payout)} pts
          </strong>
          <span className="bc-bet-form__preview-multi">({preview.multiplier}×)</span>
        </div>
      )}

      {error && <p className="bc-bet-form__error" role="alert">{error}</p>}

      <button
        type="submit"
        className="bc-bet-form__submit"
        disabled={loading || !selectedOutcome || numAmount < 1}
      >
        {loading ? 'Placing bet…' : `Bet ${numAmount > 0 ? formatPoints(numAmount) + ' pts' : ''}`}
      </button>

      {playerBalance != null && (
        <p className="bc-bet-form__balance">
          Balance: <strong>{formatPoints(playerBalance)} pts</strong>
        </p>
      )}
    </form>
  );
}

function UserBetSummary({ bet, winningOutcomeId, outcomes }) {
  const outcome = outcomes.find(o => o.id === bet.outcome_id) ?? bet.betting_contest_outcomes;
  const label   = outcome?.label ?? 'Unknown';
  const isWinner = bet.is_winner === true;
  const isLoser  = bet.is_winner === false;
  const isRefund = bet.is_winner === null && bet.settled_at;

  return (
    <div className={[
      'bc-user-bet',
      isWinner ? 'bc-user-bet--won'      : '',
      isLoser  ? 'bc-user-bet--lost'     : '',
      isRefund ? 'bc-user-bet--refunded' : '',
    ].filter(Boolean).join(' ')}>
      <p className="bc-user-bet__label">
        {isWinner ? '🏆 You won!' : isLoser ? '❌ You lost' : isRefund ? '↩ Refunded' : '🎯 Your bet'}
      </p>
      <p className="bc-user-bet__pick">
        Picked: <strong>{label}</strong>
      </p>
      <p className="bc-user-bet__amount">
        Wagered: <strong>{formatPoints(bet.amount)} pts</strong>
      </p>
      {isWinner && bet.payout_amount != null && (
        <p className="bc-user-bet__payout">
          Payout: <strong className="bc-user-bet__payout-val">
            +{formatPoints(bet.payout_amount)} pts
          </strong>
          {bet.profit > 0 && (
            <span className="bc-user-bet__profit"> (+{formatPoints(bet.profit)} profit)</span>
          )}
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * BettingContest — viewer-facing pari-mutuel betting UI.
 *
 * Props:
 *   contestId   {string}   - Load a specific contest by ID
 *   contest     {object}   - OR pass a pre-loaded contest object
 *   onBetPlaced {Function} - Callback after a successful bet
 *   compact     {boolean}  - Compact display mode
 */
export default function BettingContest({ contestId, contest: contestProp, onBetPlaced, compact = false }) {
  const { user } = useAuth();

  const [contest, setContest]         = useState(contestProp ?? null);
  const [loading, setLoading]         = useState(!contestProp && !!contestId);
  const [betLoading, setBetLoading]   = useState(false);
  const [error, setError]             = useState('');
  const [notification, setNotification] = useState('');
  const [userBet, setUserBet]         = useState(null);
  const [playerBalance, setPlayerBalance] = useState(null);

  const pollRef = useRef(null);
  const notifRef = useRef(null);

  const effectiveId = contestId ?? contestProp?.id;

  // ── Show notification banner ───────────────────────────────────────────
  function showNotif(msg) {
    setNotification(msg);
    clearTimeout(notifRef.current);
    notifRef.current = setTimeout(() => setNotification(''), 4000);
  }

  // ── Load contest ───────────────────────────────────────────────────────
  const loadContest = useCallback(async () => {
    if (!effectiveId) return;
    try {
      const { contest: data } = await bettingService.getContest(effectiveId);
      setContest(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [effectiveId]);

  // ── Load user's existing bet ───────────────────────────────────────────
  const loadUserBet = useCallback(async () => {
    if (!user || !effectiveId) return;
    try {
      const { bets } = await bettingService.getUserBets(effectiveId, { limit: 1 });
      setUserBet(bets?.[0] ?? null);
    } catch {}
  }, [user, effectiveId]);

  // ── Load player balance ────────────────────────────────────────────────
  const loadBalance = useCallback(async () => {
    if (!user) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const { supabase }     = await import('../../config/supabaseClient');
      const { data } = await supabase
        .from('the_life_players')
        .select('cash')
        .eq('user_id', user.id)
        .single();
      setPlayerBalance(data?.cash ?? null);
    } catch {}
  }, [user]);

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!contestProp) loadContest();
    else setContest(contestProp);
  }, [contestProp, loadContest]);

  useEffect(() => { loadUserBet(); }, [loadUserBet]);
  useEffect(() => { loadBalance(); }, [loadBalance]);

  // ── Realtime subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (!effectiveId) return;
    const unsub = bettingService.subscribeToContest(effectiveId, () => {
      loadContest();
    });
    return unsub;
  }, [effectiveId, loadContest]);

  // ── Live odds poll (fallback for realtime gaps) ────────────────────────
  useEffect(() => {
    if (!effectiveId || contest?.status === 'resolved' || contest?.status === 'cancelled') return;

    pollRef.current = setInterval(async () => {
      try {
        const { outcomes, totalPool, status } = await bettingService.getOdds(effectiveId);
        setContest(prev =>
          prev ? { ...prev, outcomes, total_pool: totalPool, status } : prev
        );
      } catch {}
    }, ODDS_POLL_MS);

    return () => clearInterval(pollRef.current);
  }, [effectiveId, contest?.status]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearTimeout(notifRef.current);
  }, []);

  // ── Handle bet placement ───────────────────────────────────────────────
  async function handleBet(outcomeId, amount) {
    if (!user) { setError('Sign in to place a bet.'); return; }
    setBetLoading(true);
    setError('');
    try {
      const result = await bettingService.placeBet(effectiveId, outcomeId, amount);
      setPlayerBalance(result.newBalance);
      showNotif(`Bet placed! ${formatPoints(amount)} pts wagered.`);
      await Promise.all([loadContest(), loadUserBet()]);
      onBetPlaced?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBetLoading(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bc-container">
        <div className="bc-skeleton">
          <div className="bc-skeleton__title" />
          <div className="bc-skeleton__bar" />
          <div className="bc-skeleton__bar bc-skeleton__bar--short" />
          <div className="bc-skeleton__bar" />
        </div>
      </div>
    );
  }

  if (error && !contest) {
    return (
      <div className="bc-container">
        <div className="bc-error-state">
          <p>⚠ {error}</p>
          <button className="bc-btn-retry" onClick={loadContest}>Retry</button>
        </div>
      </div>
    );
  }

  if (!contest) return null;

  const outcomes        = contest.outcomes ?? [];
  const totalPool       = Number(contest.total_pool) || 0;
  const isOpen          = contest.status === 'open';
  const isResolved      = contest.status === 'resolved';
  const isCancelled     = contest.status === 'cancelled';
  const winningOutcome  = isResolved
    ? outcomes.find(o => o.id === contest.winning_outcome_id)
    : null;

  const canBet = isOpen && user && !userBet;

  return (
    <div className={`bc-container ${compact ? 'bc-container--compact' : ''}`}>

      {/* Notification banner */}
      {notification && (
        <div className="bc-notif" role="status">{notification}</div>
      )}

      {/* Header */}
      <div className="bc-header">
        <div className="bc-header__meta">
          <StatusBadge status={contest.status} />
          <span className="bc-header__pool">
            Pool: <strong>{formatPoints(totalPool)} pts</strong>
          </span>
          {contest.resolved_at && (
            <span className="bc-header__time">{timeSince(contest.resolved_at)}</span>
          )}
        </div>
        {contest.title && (
          <h2 className="bc-header__title">{contest.title}</h2>
        )}
        <p className="bc-header__question">{contest.question}</p>
      </div>

      {/* Cancelled notice */}
      {isCancelled && (
        <div className="bc-notice bc-notice--cancelled">
          This contest was cancelled. All bets have been refunded.
        </div>
      )}

      {/* Resolved notice */}
      {isResolved && winningOutcome && (
        <div className="bc-notice bc-notice--resolved">
          <span className="bc-notice__crown">👑</span>
          Winner: <strong>{winningOutcome.label}</strong>
        </div>
      )}

      {/* User's existing bet */}
      {userBet && (
        <UserBetSummary
          bet={userBet}
          winningOutcomeId={contest.winning_outcome_id}
          outcomes={outcomes}
        />
      )}

      {/* Outcome bars */}
      <div className="bc-outcomes">
        {outcomes.map(outcome => (
          <OutcomeBar
            key={outcome.id}
            outcome={outcome}
            totalPool={totalPool}
            isWinner={isResolved ? outcome.id === contest.winning_outcome_id : undefined}
            userOutcomeId={userBet?.outcome_id}
            onClick={o => {
              if (canBet) {
                // If bet form is shown, clicking an outcome selects it there
              }
            }}
            disabled={!canBet}
          />
        ))}
      </div>

      {/* Bet form */}
      {canBet && (
        <BetForm
          outcomes={outcomes}
          totalPool={totalPool}
          playerBalance={playerBalance}
          onBet={handleBet}
          loading={betLoading}
        />
      )}

      {/* Not signed in prompt */}
      {isOpen && !user && (
        <p className="bc-auth-prompt">Sign in to place a bet.</p>
      )}

      {/* Locked notice */}
      {contest.status === 'locked' && !userBet && (
        <p className="bc-locked-notice">Betting is closed. Waiting for results…</p>
      )}

      {/* Error */}
      {error && <p className="bc-inline-error" role="alert">{error}</p>}

      {/* Footer stats */}
      {!compact && (
        <div className="bc-footer">
          <span>{outcomes.reduce((s, o) => s + (Number(o.bet_count) || 0), 0)} total bets</span>
          <span>{formatPoints(totalPool)} pts in pool</span>
        </div>
      )}
    </div>
  );
}
