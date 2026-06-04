/**
 * Pari-Mutuel Betting Contests API
 *
 * POST /api/betting   { action, ...params }
 * GET  /api/betting?action=get_contest&contestId=...
 *
 * Actions:
 *   PUBLIC           get_contest, list_contests, get_odds
 *   AUTHENTICATED    place_bet, get_user_bets
 *   ADMIN ONLY       create_contest, lock_contest, resolve_contest, cancel_contest
 *
 * Math model (identical to StreamElements):
 *   winningPool = SUM of bets on the winning outcome
 *   losingPool  = totalPool - winningPool
 *   profit      = FLOOR( (userBet / winningPool) * losingPool )
 *   payout      = userBet + profit
 *   remainder   = losingPool - SUM(profits) → credited to largest-bet winner
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ── Auth: extract and verify JWT if present ──────────────────────────────
  let user = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authedUser }, error: authErr } = await supabase.auth.getUser(token);
    if (!authErr && authedUser) user = authedUser;
  }

  // ── Parse action ─────────────────────────────────────────────────────────
  const { action, ...body } =
    req.method === 'GET' ? req.query : (req.body || {});

  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }

  try {
    switch (action) {

      // ── PUBLIC ─────────────────────────────────────────────────────────
      case 'get_contest':
        return handleGetContest(supabase, body, res);

      case 'list_contests':
        return handleListContests(supabase, body, res);

      case 'get_odds':
        return handleGetOdds(supabase, body, res);

      // ── AUTHENTICATED ──────────────────────────────────────────────────
      case 'place_bet': {
        if (!user) return res.status(401).json({ error: 'Authentication required' });
        return handlePlaceBet(supabase, user, body, res);
      }

      case 'get_user_bets': {
        if (!user) return res.status(401).json({ error: 'Authentication required' });
        return handleGetUserBets(supabase, user, body, res);
      }

      // ── ADMIN ONLY ─────────────────────────────────────────────────────
      case 'create_contest':
      case 'lock_contest':
      case 'resolve_contest':
      case 'cancel_contest': {
        if (!user) return res.status(401).json({ error: 'Authentication required' });

        const isAdmin = await checkAdmin(supabase, user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

        if (action === 'create_contest')  return handleCreateContest(supabase, user, body, res);
        if (action === 'lock_contest')    return handleLockContest(supabase, body, res);
        if (action === 'resolve_contest') return handleResolveContest(supabase, body, res);
        if (action === 'cancel_contest')  return handleCancelContest(supabase, body, res);
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[betting] Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function checkAdmin(supabase, userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .maybeSingle();
  return !error && !!data;
}

/**
 * Compute live pari-mutuel multipliers for all outcomes.
 * multiplier = totalPool / outcomePool  (StreamElements formula)
 * A multiplier of 5.0x means for every 1 point bet on this outcome,
 * you receive 5 points back if it wins.
 */
function computeLiveOdds(outcomes, totalPool) {
  return outcomes.map(o => {
    const pool  = Number(o.pool)  || 0;
    const total = Number(totalPool) || 0;

    const multiplier = pool > 0 && total > 0
      ? parseFloat((total / pool).toFixed(2))
      : null;

    const percentage = total > 0
      ? parseFloat(((pool / total) * 100).toFixed(1))
      : 0;

    // Estimated payout for a reference bet of 100 points
    const exampleBet = 100;
    const examplePayout = multiplier !== null
      ? Math.floor(exampleBet * multiplier)
      : null;

    return { ...o, multiplier, percentage, examplePayout };
  });
}

// ─── Action: create_contest ───────────────────────────────────────────────────
// Body: { title, question, outcomes: [{label}], locksAt? }
async function handleCreateContest(supabase, user, body, res) {
  const { title, question, outcomes, locksAt } = body;

  // Validation
  if (!title?.trim())
    return res.status(400).json({ error: 'title is required' });
  if (title.trim().length > 200)
    return res.status(400).json({ error: 'title must be ≤ 200 characters' });
  if (!question?.trim())
    return res.status(400).json({ error: 'question is required' });
  if (question.trim().length > 500)
    return res.status(400).json({ error: 'question must be ≤ 500 characters' });
  if (!Array.isArray(outcomes) || outcomes.length < 2)
    return res.status(400).json({ error: 'At least 2 outcomes are required' });
  if (outcomes.length > 10)
    return res.status(400).json({ error: 'Maximum 10 outcomes allowed' });

  for (let i = 0; i < outcomes.length; i++) {
    if (!outcomes[i].label?.trim())
      return res.status(400).json({ error: `Outcome ${i + 1} must have a label` });
    if (outcomes[i].label.trim().length > 200)
      return res.status(400).json({ error: `Outcome ${i + 1} label must be ≤ 200 characters` });
  }

  if (locksAt != null) {
    const lockDate = new Date(locksAt);
    if (isNaN(lockDate.getTime()) || lockDate <= new Date())
      return res.status(400).json({ error: 'locks_at must be a future timestamp' });
  }

  // Create contest row
  const { data: contest, error: contestErr } = await supabase
    .from('betting_contests')
    .insert({
      streamer_id: user.id,
      title:       title.trim(),
      question:    question.trim(),
      status:      'open',
      total_pool:  0,
      locks_at:    locksAt ?? null,
    })
    .select()
    .single();

  if (contestErr) {
    console.error('[betting] create_contest error:', contestErr);
    return res.status(500).json({ error: 'Failed to create contest' });
  }

  // Create outcome rows
  const outcomeRows = outcomes.map((o, i) => ({
    contest_id: contest.id,
    label:      o.label.trim(),
    pool:       0,
    bet_count:  0,
    sort_order: i,
  }));

  const { data: createdOutcomes, error: outcomeErr } = await supabase
    .from('betting_contest_outcomes')
    .insert(outcomeRows)
    .select();

  if (outcomeErr) {
    console.error('[betting] create outcomes error:', outcomeErr);
    // Best-effort rollback
    await supabase.from('betting_contests').delete().eq('id', contest.id);
    return res.status(500).json({ error: 'Failed to create outcomes' });
  }

  return res.status(201).json({
    success: true,
    contest: { ...contest, outcomes: createdOutcomes },
  });
}

// ─── Action: lock_contest ─────────────────────────────────────────────────────
// Body: { contestId }
async function handleLockContest(supabase, body, res) {
  const { contestId } = body;
  if (!contestId) return res.status(400).json({ error: 'contestId is required' });

  const { data: existing, error: fetchErr } = await supabase
    .from('betting_contests')
    .select('id, status')
    .eq('id', contestId)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Contest not found' });
  if (existing.status !== 'open')
    return res.status(400).json({ error: `Contest is already ${existing.status}` });

  const { data, error } = await supabase
    .from('betting_contests')
    .update({ status: 'locked', updated_at: new Date().toISOString() })
    .eq('id', contestId)
    .select()
    .single();

  if (error) {
    console.error('[betting] lock_contest error:', error);
    return res.status(500).json({ error: 'Failed to lock contest' });
  }

  return res.status(200).json({ success: true, contest: data });
}

// ─── Action: resolve_contest ──────────────────────────────────────────────────
// Body: { contestId, winningOutcomeId }
// Delegates to the atomic Postgres RPC that handles all math in one transaction.
async function handleResolveContest(supabase, body, res) {
  const { contestId, winningOutcomeId } = body;
  if (!contestId)        return res.status(400).json({ error: 'contestId is required' });
  if (!winningOutcomeId) return res.status(400).json({ error: 'winningOutcomeId is required' });

  const { data, error } = await supabase.rpc('resolve_betting_contest', {
    p_contest_id:         contestId,
    p_winning_outcome_id: winningOutcomeId,
  });

  if (error) {
    console.error('[betting] resolve_betting_contest RPC error:', error);
    return res.status(500).json({ error: 'Resolution failed', details: error.message });
  }

  if (!data?.success) {
    return res.status(400).json({ error: data?.error ?? 'Resolution failed' });
  }

  return res.status(200).json(data);
}

// ─── Action: cancel_contest ───────────────────────────────────────────────────
// Body: { contestId }
// Full refund: all bet amounts returned to bettors' cash balance.
async function handleCancelContest(supabase, body, res) {
  const { contestId } = body;
  if (!contestId) return res.status(400).json({ error: 'contestId is required' });

  const { data, error } = await supabase.rpc('cancel_betting_contest', {
    p_contest_id: contestId,
  });

  if (error) {
    console.error('[betting] cancel_betting_contest RPC error:', error);
    return res.status(500).json({ error: 'Cancellation failed', details: error.message });
  }

  if (!data?.success) {
    return res.status(400).json({ error: data?.error ?? 'Cancellation failed' });
  }

  return res.status(200).json(data);
}

// ─── Action: place_bet ────────────────────────────────────────────────────────
// Body: { contestId, outcomeId, amount }
// Delegates to atomic Postgres RPC (SELECT FOR UPDATE prevents double-spend).
async function handlePlaceBet(supabase, user, body, res) {
  const { contestId, outcomeId, amount } = body;

  if (!contestId) return res.status(400).json({ error: 'contestId is required' });
  if (!outcomeId) return res.status(400).json({ error: 'outcomeId is required' });

  const numAmount = Number(amount);
  if (!amount || isNaN(numAmount) || numAmount < 1 || !Number.isFinite(numAmount)) {
    return res.status(400).json({ error: 'amount must be a positive integer ≥ 1' });
  }

  const { data, error } = await supabase.rpc('place_betting_bet', {
    p_user_id:    user.id,
    p_contest_id: contestId,
    p_outcome_id: outcomeId,
    p_amount:     Math.floor(numAmount),
  });

  if (error) {
    console.error('[betting] place_betting_bet RPC error:', error);
    return res.status(500).json({ error: 'Failed to place bet', details: error.message });
  }

  if (!data?.success) {
    return res.status(400).json({
      error:    data?.error    ?? 'Failed to place bet',
      balance:  data?.balance  ?? undefined,
      required: data?.required ?? undefined,
    });
  }

  return res.status(200).json(data);
}

// ─── Action: get_contest ──────────────────────────────────────────────────────
// Query: { contestId }
async function handleGetContest(supabase, body, res) {
  const { contestId } = body;
  if (!contestId) return res.status(400).json({ error: 'contestId is required' });

  const { data: contest, error: contestErr } = await supabase
    .from('betting_contests')
    .select('id, title, question, status, total_pool, winning_outcome_id, starts_at, locks_at, resolved_at, created_at')
    .eq('id', contestId)
    .single();

  if (contestErr || !contest) return res.status(404).json({ error: 'Contest not found' });

  const { data: outcomes, error: outErr } = await supabase
    .from('betting_contest_outcomes')
    .select('id, label, pool, bet_count, sort_order')
    .eq('contest_id', contestId)
    .order('sort_order');

  if (outErr) {
    console.error('[betting] get_contest outcomes error:', outErr);
    return res.status(500).json({ error: 'Failed to load outcomes' });
  }

  return res.status(200).json({
    success: true,
    contest: {
      ...contest,
      outcomes: computeLiveOdds(outcomes ?? [], contest.total_pool),
    },
  });
}

// ─── Action: list_contests ────────────────────────────────────────────────────
// Query: { status?, limit?, offset? }
async function handleListContests(supabase, body, res) {
  const { status, limit = '20', offset = '0' } = body;
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const off = Math.max(parseInt(offset, 10) || 0, 0);

  let query = supabase
    .from('betting_contests')
    .select('id, title, question, status, total_pool, winning_outcome_id, starts_at, locks_at, resolved_at, created_at')
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1);

  if (status) query = query.eq('status', status);

  const { data: contests, error } = await query;
  if (error) {
    console.error('[betting] list_contests error:', error);
    return res.status(500).json({ error: 'Failed to list contests' });
  }

  // Batch-fetch outcomes for all returned contests
  if (contests.length > 0) {
    const ids = contests.map(c => c.id);
    const { data: allOutcomes } = await supabase
      .from('betting_contest_outcomes')
      .select('id, contest_id, label, pool, bet_count, sort_order')
      .in('contest_id', ids)
      .order('sort_order');

    const outcomeMap = {};
    for (const o of (allOutcomes ?? [])) {
      if (!outcomeMap[o.contest_id]) outcomeMap[o.contest_id] = [];
      outcomeMap[o.contest_id].push(o);
    }

    for (const c of contests) {
      c.outcomes = computeLiveOdds(outcomeMap[c.id] ?? [], c.total_pool);
    }
  }

  return res.status(200).json({ success: true, contests });
}

// ─── Action: get_odds ─────────────────────────────────────────────────────────
// Query: { contestId }
// Returns live odds for every outcome without the full contest payload.
async function handleGetOdds(supabase, body, res) {
  const { contestId } = body;
  if (!contestId) return res.status(400).json({ error: 'contestId is required' });

  const { data: contest, error: cErr } = await supabase
    .from('betting_contests')
    .select('id, status, total_pool')
    .eq('id', contestId)
    .single();

  if (cErr || !contest) return res.status(404).json({ error: 'Contest not found' });

  const { data: outcomes, error: oErr } = await supabase
    .from('betting_contest_outcomes')
    .select('id, label, pool, bet_count, sort_order')
    .eq('contest_id', contestId)
    .order('sort_order');

  if (oErr) {
    console.error('[betting] get_odds error:', oErr);
    return res.status(500).json({ error: 'Failed to load odds' });
  }

  return res.status(200).json({
    success:   true,
    contestId,
    status:    contest.status,
    totalPool: contest.total_pool,
    outcomes:  computeLiveOdds(outcomes ?? [], contest.total_pool),
  });
}

// ─── Action: get_user_bets ────────────────────────────────────────────────────
// Body: { contestId?, limit?, offset? }
async function handleGetUserBets(supabase, user, body, res) {
  const { contestId, limit = '50', offset = '0' } = body;
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const off = Math.max(parseInt(offset, 10) || 0, 0);

  let query = supabase
    .from('betting_contest_bets')
    .select(`
      id, contest_id, outcome_id, amount,
      payout_amount, profit, is_winner,
      placed_at, settled_at,
      betting_contests   (id, title, question, status, winning_outcome_id),
      betting_contest_outcomes (id, label)
    `)
    .eq('user_id', user.id)
    .order('placed_at', { ascending: false })
    .range(off, off + lim - 1);

  if (contestId) query = query.eq('contest_id', contestId);

  const { data, error } = await query;
  if (error) {
    console.error('[betting] get_user_bets error:', error);
    return res.status(500).json({ error: 'Failed to fetch bets' });
  }

  return res.status(200).json({ success: true, bets: data ?? [] });
}
