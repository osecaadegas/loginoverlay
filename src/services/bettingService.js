/**
 * bettingService.js
 * Frontend service layer for the pari-mutuel betting contest system.
 * All API calls go through /api/betting with the user's session JWT.
 */

import { supabase } from '../config/supabaseClient';

const API_BASE = '/api/betting';

// ── Internal helpers ──────────────────────────────────────────────────────────

/** POST request with auth token */
async function post(action, body = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...body }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/** GET request (public, no auth required) */
async function get(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${API_BASE}?${qs}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ── Payout math helper (mirrors server-side logic; useful for preview UI) ─────

/**
 * Calculate estimated payout for a potential bet without hitting the server.
 *
 * @param {number} userBet       - Points the user wants to wager
 * @param {number} outcomePool   - Current pool for the chosen outcome
 * @param {number} totalPool     - Current total pool across all outcomes
 * @returns {{ multiplier: number, profit: number, payout: number }}
 */
export function estimatePayout(userBet, outcomePool, totalPool) {
  if (!userBet || userBet <= 0) return { multiplier: null, profit: 0, payout: 0 };

  const newOutcomePool = outcomePool + userBet;
  const newTotalPool   = totalPool + userBet;

  // If I am the only bettor on this outcome, I'd win the entire losing pool
  const winningPool = newOutcomePool;
  const losingPool  = newTotalPool - winningPool;

  const profit    = Math.floor((userBet / winningPool) * losingPool);
  const payout    = userBet + profit;
  const multiplier = parseFloat((payout / userBet).toFixed(2));

  return { multiplier, profit, payout };
}

/**
 * Verify payout integrity: sum of all winner payouts must equal totalPool.
 * Returns { valid, totalPaidOut, remainder }.
 *
 * @param {Array<{amount: number}>} winnerBets
 * @param {number} winningPool
 * @param {number} totalPool
 */
export function verifyPayoutIntegrity(winnerBets, winningPool, totalPool) {
  const losingPool = totalPool - winningPool;
  let totalPaidOut = 0;

  for (const bet of winnerBets) {
    const profit  = Math.floor((bet.amount / winningPool) * losingPool);
    const payout  = bet.amount + profit;
    totalPaidOut += payout;
  }

  const remainder = totalPool - totalPaidOut;
  return {
    valid:        remainder >= 0,
    totalPaidOut: totalPaidOut + remainder, // after rounding fix
    remainder,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const bettingService = {

  // ── Admin actions ───────────────────────────────────────────────────────

  /**
   * Create a new betting contest.
   * @param {{ title: string, question: string, outcomes: {label: string}[], locksAt?: string }} opts
   */
  createContest(opts) {
    return post('create_contest', opts);
  },

  /**
   * Lock a contest — no new bets accepted after this.
   * @param {string} contestId
   */
  lockContest(contestId) {
    return post('lock_contest', { contestId });
  },

  /**
   * Resolve a contest with a winning outcome.
   * Triggers pari-mutuel payout calculation and credits winners.
   * @param {string} contestId
   * @param {string} winningOutcomeId
   */
  resolveContest(contestId, winningOutcomeId) {
    return post('resolve_contest', { contestId, winningOutcomeId });
  },

  /**
   * Cancel a contest and issue full refunds to all bettors.
   * @param {string} contestId
   */
  cancelContest(contestId) {
    return post('cancel_contest', { contestId });
  },

  // ── User actions ────────────────────────────────────────────────────────

  /**
   * Place a bet on a specific outcome.
   * Cash is deducted immediately. One bet per contest per user.
   * @param {string} contestId
   * @param {string} outcomeId
   * @param {number} amount  - Must be ≥ 1
   */
  placeBet(contestId, outcomeId, amount) {
    return post('place_bet', { contestId, outcomeId, amount });
  },

  /**
   * Get the authenticated user's betting history.
   * @param {string|null} contestId  - Filter to a specific contest (optional)
   * @param {{ limit?: number, offset?: number }} opts
   */
  getUserBets(contestId = null, opts = {}) {
    return post('get_user_bets', {
      ...(contestId ? { contestId } : {}),
      ...opts,
    });
  },

  // ── Public queries ──────────────────────────────────────────────────────

  /**
   * Get a full contest with live odds.
   * @param {string} contestId
   */
  getContest(contestId) {
    return get('get_contest', { contestId });
  },

  /**
   * List contests.
   * @param {string|null} status  - Filter: 'open'|'locked'|'resolved'|'cancelled'
   * @param {{ limit?: number, offset?: number }} opts
   */
  listContests(status = null, opts = {}) {
    return get('list_contests', {
      ...(status ? { status } : {}),
      limit:  opts.limit  ?? 20,
      offset: opts.offset ?? 0,
    });
  },

  /**
   * Get live odds for every outcome of a contest.
   * Poll this on a short interval (e.g. 5 s) for a live ticker.
   * @param {string} contestId
   */
  getOdds(contestId) {
    return get('get_odds', { contestId });
  },

  // ── Realtime subscriptions ──────────────────────────────────────────────

  /**
   * Subscribe to live changes for a specific contest (status, pool updates).
   * Returns an unsubscribe function.
   *
   * @param {string}   contestId
   * @param {Function} onUpdate  - Called with the raw Supabase realtime payload
   * @returns {Function} unsubscribe
   */
  subscribeToContest(contestId, onUpdate) {
    const channel = supabase
      .channel(`betting_contest:${contestId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'betting_contests',
        filter: `id=eq.${contestId}`,
      }, onUpdate)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'betting_contest_outcomes',
        filter: `contest_id=eq.${contestId}`,
      }, onUpdate)
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * Subscribe to changes on any active contest (open/locked).
   * Useful for a dashboard that shows the currently live contest.
   *
   * @param {Function} onUpdate
   * @returns {Function} unsubscribe
   */
  subscribeToActiveContests(onUpdate) {
    const channel = supabase
      .channel('active_betting_contests')
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'betting_contests',
      }, onUpdate)
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};

export default bettingService;
