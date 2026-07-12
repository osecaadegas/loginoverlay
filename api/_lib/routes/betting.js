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

// ─── StreamElements helpers ───────────────────────────────────────────────────
const SE_BASE = 'https://api.streamelements.com/kappa/v2';

/** Fetch SE credentials for a streamer from the streamelements_connections table. */
async function seGetCreds(supabase, streamerId) {
  const { data } = await supabase
    .from('streamelements_connections')
    .select('se_channel_id, se_jwt_token')
    .eq('user_id', streamerId)
    .single();
  return data ?? null;
}

/** Fetch the Twitch username for a Supabase user. */
async function getTwitchUsername(supabase, userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('twitch_username')
    .eq('user_id', userId)
    .single();
  return data?.twitch_username?.toLowerCase() ?? null;
}

/** Get a viewer's SE points balance. Throws on SE API failure. */
async function seGetPoints(channelId, jwtToken, twitchUsername) {
  const r = await fetch(
    `${SE_BASE}/points/${channelId}/${encodeURIComponent(twitchUsername)}`,
    { headers: { Authorization: `Bearer ${jwtToken}` } }
  );
  if (!r.ok) throw new Error(`SE points check failed (${r.status})`);
  const d = await r.json();
  return typeof d.points === 'number' ? d.points : 0;
}

/** Add SE points to a viewer (positive delta = add, negative = subtract). */
async function seAdjustPoints(channelId, jwtToken, twitchUsername, delta) {
  const r = await fetch(
    `${SE_BASE}/points/${channelId}/${encodeURIComponent(twitchUsername)}/${delta}`,
    {
      method:  'PUT',
      headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
    }
  );
  return r.ok;
}

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

      case 'get_se_balance': {
        if (!user) return res.status(401).json({ error: 'Authentication required' });
        return handleGetSeBalance(supabase, user, body, res);
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
// Body: { title, question, outcomes: [{label}], locksAt?, currencyMode? }
async function handleCreateContest(supabase, user, body, res) {
  const { title, question, outcomes, locksAt, currencyMode = 'se_points' } = body;

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

  if (currencyMode !== 'se_points') {
    return res.status(400).json({ error: 'Only "se_points" contests are supported.' });
  }

  // Create contest row
  const { data: contest, error: contestErr } = await supabase
    .from('betting_contests')
    .insert({
      streamer_id:   user.id,
      title:         title.trim(),
      question:      question.trim(),
      status:        'open',
      total_pool:    0,
      currency_mode: currencyMode,
      locks_at:      locksAt ?? null,
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
async function handleResolveContest(supabase, body, res) {
  const { contestId, winningOutcomeId } = body;
  if (!contestId)        return res.status(400).json({ error: 'contestId is required' });
  if (!winningOutcomeId) return res.status(400).json({ error: 'winningOutcomeId is required' });

  // Determine currency mode
  const { data: contestMeta } = await supabase
    .from('betting_contests')
    .select('currency_mode, streamer_id')
    .eq('id', contestId)
    .single();

  // ── SE Points flow ──────────────────────────────────────────────────────────
  if (contestMeta?.currency_mode === 'se_points') {
    const { data, error } = await supabase.rpc('resolve_betting_contest_se', {
      p_contest_id:         contestId,
      p_winning_outcome_id: winningOutcomeId,
    });

    if (error) {
      console.error('[betting] resolve_betting_contest_se RPC error:', error);
      return res.status(500).json({ error: 'Resolution failed', details: error.message });
    }
    if (!data?.success) {
      return res.status(400).json({ error: data?.error ?? 'Resolution failed' });
    }

    // Credit SE points to each winner
    const winners = data.winners ?? [];
    if (winners.length > 0) {
      const creds = await seGetCreds(supabase, contestMeta.streamer_id);
      if (creds?.se_channel_id && creds?.se_jwt_token) {
        const userIds = winners.map(w => w.user_id);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, twitch_username')
          .in('user_id', userIds);

        const usernameMap = Object.fromEntries(
          (profiles ?? []).map(p => [p.user_id, p.twitch_username?.toLowerCase()])
        );

        await Promise.allSettled(
          winners.map(async w => {
            const username = usernameMap[w.user_id];
            if (!username) {
              console.warn('[betting] resolve SE: no twitch_username for user', w.user_id);
              return;
            }
            const ok = await seAdjustPoints(
              creds.se_channel_id, creds.se_jwt_token, username, w.payout_amount
            );
            if (!ok) console.error('[betting] SE credit failed for', username, w.payout_amount);
          })
        );
      }
    }

    return res.status(200).json(data);
  }

  return res.status(410).json({
    error: 'Legacy internal-point contests are no longer supported. Create a new SE points contest instead.',
  });
}

// ─── Action: cancel_contest ───────────────────────────────────────────────────
// Body: { contestId }
async function handleCancelContest(supabase, body, res) {
  const { contestId } = body;
  if (!contestId) return res.status(400).json({ error: 'contestId is required' });

  // Determine currency mode
  const { data: contestMeta } = await supabase
    .from('betting_contests')
    .select('currency_mode, streamer_id')
    .eq('id', contestId)
    .single();

  // ── SE Points flow ──────────────────────────────────────────────────────────
  if (contestMeta?.currency_mode === 'se_points') {
    const { data, error } = await supabase.rpc('cancel_betting_contest_se', {
      p_contest_id: contestId,
    });

    if (error) {
      console.error('[betting] cancel_betting_contest_se RPC error:', error);
      return res.status(500).json({ error: 'Cancellation failed', details: error.message });
    }
    if (!data?.success) {
      return res.status(400).json({ error: data?.error ?? 'Cancellation failed' });
    }

    // Refund SE points to each bettor
    const refunds = data.refunds ?? [];
    if (refunds.length > 0) {
      const creds = await seGetCreds(supabase, contestMeta.streamer_id);
      if (creds?.se_channel_id && creds?.se_jwt_token) {
        const userIds = refunds.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, twitch_username')
          .in('user_id', userIds);

        const usernameMap = Object.fromEntries(
          (profiles ?? []).map(p => [p.user_id, p.twitch_username?.toLowerCase()])
        );

        await Promise.allSettled(
          refunds.map(async r => {
            const username = usernameMap[r.user_id];
            if (!username) {
              console.warn('[betting] cancel SE: no twitch_username for user', r.user_id);
              return;
            }
            const ok = await seAdjustPoints(
              creds.se_channel_id, creds.se_jwt_token, username, r.amount
            );
            if (!ok) console.error('[betting] SE refund failed for', username, r.amount);
          })
        );
      }
    }

    return res.status(200).json(data);
  }

  return res.status(410).json({
    error: 'Legacy internal-point contests are no longer supported. Create a new SE points contest instead.',
  });
}

// ─── Action: place_bet ────────────────────────────────────────────────────────
// Body: { contestId, outcomeId, amount }
// Only StreamElements-backed contests are supported.
async function handlePlaceBet(supabase, user, body, res) {
  const { contestId, outcomeId, amount } = body;

  if (!contestId) return res.status(400).json({ error: 'contestId is required' });
  if (!outcomeId) return res.status(400).json({ error: 'outcomeId is required' });

  const numAmount = Number(amount);
  if (!amount || isNaN(numAmount) || numAmount < 1 || !Number.isFinite(numAmount)) {
    return res.status(400).json({ error: 'amount must be a positive integer ≥ 1' });
  }

  // Fetch contest to determine currency mode
  const { data: contest, error: contestFetchErr } = await supabase
    .from('betting_contests')
    .select('currency_mode, streamer_id, status')
    .eq('id', contestId)
    .single();

  if (contestFetchErr || !contest) {
    return res.status(404).json({ error: 'Contest not found' });
  }

  // ── SE Points flow ──────────────────────────────────────────────────────────
  if (contest.currency_mode === 'se_points') {
    const creds = await seGetCreds(supabase, contest.streamer_id);
    if (!creds?.se_channel_id || !creds?.se_jwt_token) {
      return res.status(400).json({ error: 'StreamElements is not configured for this contest' });
    }

    const twitchUsername = await getTwitchUsername(supabase, user.id);
    if (!twitchUsername) {
      return res.status(400).json({
        error: 'Twitch username not found — please reconnect your Twitch account.',
      });
    }

    // Check SE balance
    let sePoints;
    try {
      sePoints = await seGetPoints(creds.se_channel_id, creds.se_jwt_token, twitchUsername);
    } catch (e) {
      console.error('[betting] SE balance check failed:', e.message);
      return res.status(400).json({
        error: 'Could not check your StreamElements points. Are you a follower?',
      });
    }

    if (sePoints < numAmount) {
      return res.status(400).json({
        error:    'Insufficient StreamElements points',
        balance:  sePoints,
        required: numAmount,
      });
    }

    // Deduct SE points before writing to DB
    const deducted = await seAdjustPoints(
      creds.se_channel_id, creds.se_jwt_token, twitchUsername, -numAmount
    );
    if (!deducted) {
      return res.status(400).json({ error: 'Failed to deduct StreamElements points. Try again.' });
    }

    // Record the bet in DB (no wallet touch)
    const { data, error } = await supabase.rpc('place_betting_bet_se', {
      p_user_id:    user.id,
      p_contest_id: contestId,
      p_outcome_id: outcomeId,
      p_amount:     Math.floor(numAmount),
    });

    if (error || !data?.success) {
      // DB write failed — refund SE points so the user isn't left short-changed
      await seAdjustPoints(
        creds.se_channel_id, creds.se_jwt_token, twitchUsername, numAmount
      ).catch(() => {});
      console.error('[betting] place_betting_bet_se failed, SE points refunded:', error?.message ?? data?.error);
      return res.status(400).json({ error: data?.error ?? 'Failed to record bet' });
    }

    return res.status(200).json({ ...data, newBalance: sePoints - numAmount });
  }

  return res.status(410).json({
    error: 'Legacy internal-point contests are no longer supported. Create a new SE points contest instead.',
  });
}

// ─── Action: get_contest ──────────────────────────────────────────────────────
// Query: { contestId }
async function handleGetContest(supabase, body, res) {
  const { contestId } = body;
  if (!contestId) return res.status(400).json({ error: 'contestId is required' });

  const { data: contest, error: contestErr } = await supabase
    .from('betting_contests')
    .select('id, title, question, status, total_pool, winning_outcome_id, currency_mode, streamer_id, starts_at, locks_at, resolved_at, created_at')
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
    .select('id, title, question, status, total_pool, winning_outcome_id, currency_mode, starts_at, locks_at, resolved_at, created_at')
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

// ─── Action: get_se_balance ───────────────────────────────────────────────────
// Body: { contestId } — returns the user's SE points for the contest's channel.
async function handleGetSeBalance(supabase, user, body, res) {
  const { contestId } = body;
  if (!contestId) return res.status(400).json({ error: 'contestId is required' });

  const { data: contest } = await supabase
    .from('betting_contests')
    .select('currency_mode, streamer_id')
    .eq('id', contestId)
    .single();

  if (!contest || contest.currency_mode !== 'se_points') {
    return res.status(400).json({ error: 'Contest does not use SE points' });
  }

  const creds = await seGetCreds(supabase, contest.streamer_id);
  if (!creds?.se_channel_id || !creds?.se_jwt_token) {
    return res.status(400).json({ error: 'StreamElements not configured' });
  }

  const twitchUsername = await getTwitchUsername(supabase, user.id);
  if (!twitchUsername) {
    return res.status(400).json({ error: 'Twitch username not found — please reconnect.' });
  }

  try {
    const points = await seGetPoints(creds.se_channel_id, creds.se_jwt_token, twitchUsername);
    return res.status(200).json({ success: true, balance: points });
  } catch (e) {
    return res.status(400).json({ error: 'Could not fetch SE points. Are you a follower?' });
  }
}
