/**
 * /api/penalty-king — Football Penalty Shootout Twitch Mini-Game
 *
 * Chat commands (configured in StreamElements):
 *   !remate [points] [spot 1-6]   → start or continue a game
 *   !cashout                       → cash out current streak
 *   !continue [spot 1-6]           → keep shooting (spot optional, random if omitted)
 *
 * API actions (POST or GET):
 *   start_game      – first shot: deduct points, create session
 *   reveal_shot     – called by overlay after animation; resolves goal/miss
 *   cashout         – player cashes out; credit points
 *   continue_game   – player chooses to keep going; set up next shot
 *   get_state       – overlay polling endpoint; also handles auto-timeouts
 *   get_leaderboard – today's top streaks / wins
 *   admin_reset     – force-end any active session
 */

import { createClient } from '@supabase/supabase-js';

const SE_BASE = 'https://api.streamelements.com/kappa/v2';

// Multiplier per streak goal (index = streak - 1, capped at last entry)
const MULTIPLIERS = [1.2, 1.5, 2.0, 3.0, 5.0, 8.0, 12.0, 20.0];

// Probability that the GK successfully saves when diving at the same spot
const GK_SAVE_CHANCE = 0.80; // 80% → net ~13% miss per shot → great tension

function getMultiplier(idx) {
  return MULTIPLIERS[Math.min(idx, MULTIPLIERS.length - 1)];
}

// ─── SE Helpers ──────────────────────────────────────────────────────────────

async function seGetCreds(supabase, streamerId) {
  const { data } = await supabase
    .from('streamelements_connections')
    .select('se_channel_id, se_jwt_token')
    .eq('user_id', streamerId)
    .single();
  if (!data) throw new Error('SE credentials not found for streamer');
  return data;
}

async function seGetPoints(channelId, jwtToken, username) {
  const r = await fetch(
    `${SE_BASE}/points/${channelId}/${encodeURIComponent(username)}`,
    { headers: { Authorization: `Bearer ${jwtToken}` } }
  );
  if (!r.ok) throw new Error(`SE get points failed (${r.status})`);
  const d = await r.json();
  return typeof d.points === 'number' ? d.points : 0;
}

async function seAdjustPoints(channelId, jwtToken, username, delta) {
  const r = await fetch(
    `${SE_BASE}/points/${channelId}/${encodeURIComponent(username)}/${delta}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
    }
  );
  return r.ok;
}

async function seBotSay(channelId, jwtToken, message) {
  try {
    await fetch(`${SE_BASE}/bot/${channelId}/say`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch {
    // Non-fatal
  }
}

// ─── DB Helpers ──────────────────────────────────────────────────────────────

async function getActiveSession(supabase, streamerId) {
  const { data } = await supabase
    .from('penalty_king_sessions')
    .select('*')
    .eq('streamer_id', streamerId)
    .in('status', ['shooting', 'waiting_decision'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function computeShot(spot) {
  // GK picks a random spot (1-6). If same as player spot, 80% chance of save.
  const gkSpot = Math.ceil(Math.random() * 6);
  const sameSpot = gkSpot === spot;
  const saved = sameSpot && Math.random() < GK_SAVE_CHANCE;
  return { gkSpot, isGoal: !saved };
}

// ─── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const params = req.method === 'POST' ? (req.body || {}) : req.query;
  const { action } = params;

  try {
    switch (action) {
      case 'get_state':      return handleGetState(req, res, supabase, params);
      case 'start_game':     return handleStartGame(req, res, supabase, params);
      case 'reveal_shot':    return handleRevealShot(req, res, supabase, params);
      case 'cashout':        return handleCashout(req, res, supabase, params);
      case 'continue_game':  return handleContinueGame(req, res, supabase, params);
      case 'admin_reset':    return handleAdminReset(req, res, supabase, params);
      case 'get_leaderboard':return handleGetLeaderboard(req, res, supabase, params);
      default:               return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[penalty-king]', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Action: get_state ───────────────────────────────────────────────────────

async function handleGetState(req, res, supabase, params) {
  const { streamer_id } = params;
  if (!streamer_id) return res.status(400).json({ error: 'Missing streamer_id' });

  let session = await getActiveSession(supabase, streamer_id);

  // Auto-resolve: stuck in shooting > 15s
  if (session?.status === 'shooting' && session.shot_at) {
    const ageMs = Date.now() - new Date(session.shot_at).getTime();
    if (ageMs > 15000) {
      return handleRevealShot(req, res, supabase, { ...params, _auto: true });
    }
  }

  // Auto-cashout: decision window expired
  if (session?.status === 'waiting_decision' && session.decision_deadline) {
    if (Date.now() > new Date(session.decision_deadline).getTime()) {
      return handleCashout(req, res, supabase, {
        ...params,
        player: session.player_username,
        _auto: true,
      });
    }
  }

  const shots = session
    ? (await supabase
        .from('penalty_king_shots')
        .select('*')
        .eq('session_id', session.id)
        .order('shot_number', { ascending: true })
      ).data ?? []
    : [];

  return res.json({ success: true, session: session ?? null, shots, multipliers: MULTIPLIERS });
}

// ─── Action: start_game ──────────────────────────────────────────────────────
// Called when user types !remate [wager] [spot]

async function handleStartGame(req, res, supabase, params) {
  const { streamer_id, player, wager: wagerRaw, spot: spotRaw } = params;

  if (!streamer_id || !player) {
    return res.json({ success: false, message: 'Usage: !remate [pontos] [spot 1-6]' });
  }

  const wager = parseInt(wagerRaw, 10);
  const spot  = parseInt(spotRaw, 10);

  if (!wager || wager < 1) {
    return res.json({ success: false, message: 'Minimum wager is 1 point. Usage: !remate [pontos] [spot 1-6]' });
  }
  if (!spot || spot < 1 || spot > 6) {
    return res.json({ success: false, message: 'Spot must be 1-6. Usage: !remate [pontos] [1-6]' });
  }

  // Check for active session
  const existing = await getActiveSession(supabase, streamer_id);
  if (existing) {
    return res.json({
      success: false,
      message: `⚽ @${existing.player_username} is already shooting! Wait for them to finish.`,
    });
  }

  // SE: check balance & deduct
  let se;
  try {
    se = await seGetCreds(supabase, streamer_id);
    const balance = await seGetPoints(se.se_channel_id, se.se_jwt_token, player);
    if (balance < wager) {
      return res.json({
        success: false,
        message: `@${player} — Not enough points! You have ${balance.toLocaleString()} pts.`,
      });
    }
    await seAdjustPoints(se.se_channel_id, se.se_jwt_token, player, -wager);
  } catch (err) {
    return res.json({ success: false, message: `SE error: ${err.message}` });
  }

  // Pre-compute shot result
  const { gkSpot, isGoal } = computeShot(spot);

  // Create session
  const { data: session, error: sessionErr } = await supabase
    .from('penalty_king_sessions')
    .insert({
      streamer_id,
      player_username: player,
      wager,
      streak: 0,
      multiplier_idx: 0,
      status: 'shooting',
      shot_spot: spot,
      gk_spot: gkSpot,
      is_goal: isGoal,
      shot_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (sessionErr || !session) {
    // Refund on DB failure
    await seAdjustPoints(se.se_channel_id, se.se_jwt_token, player, wager).catch(() => {});
    return res.status(500).json({ error: 'Failed to create game session' });
  }

  // Record first shot in history
  await supabase.from('penalty_king_shots').insert({
    session_id: session.id,
    shot_number: 1,
    spot_chosen: spot,
    gk_spot: gkSpot,
    is_goal: isGoal,
    multiplier: getMultiplier(0),
  });

  await seBotSay(
    se.se_channel_id, se.se_jwt_token,
    `⚽ @${player} steps to the spot! ${wager.toLocaleString()} pts wagered — Spot ${spot}! Watch the screen! 🥅`
  );

  return res.json({ success: true, session });
}

// ─── Action: reveal_shot ─────────────────────────────────────────────────────
// Called by the overlay widget after the kick animation completes

async function handleRevealShot(req, res, supabase, params) {
  const { streamer_id } = params;
  if (!streamer_id) return res.status(400).json({ error: 'Missing streamer_id' });

  const session = await getActiveSession(supabase, streamer_id);
  if (!session) return res.json({ success: false, message: 'No active session' });
  if (session.status !== 'shooting') return res.json({ success: true, session }); // already revealed

  let se;
  try { se = await seGetCreds(supabase, streamer_id); } catch { /* no bot */ }

  if (session.is_goal) {
    // GOAL ✅
    const newStreak = session.streak + 1;
    const newMultiplierIdx = Math.min(newStreak, MULTIPLIERS.length - 1);
    const multiplier = getMultiplier(newMultiplierIdx);
    const potential = Math.floor(session.wager * multiplier);
    const deadline = new Date(Date.now() + 30000).toISOString();

    const { data: updated } = await supabase
      .from('penalty_king_sessions')
      .update({
        status: 'waiting_decision',
        streak: newStreak,
        multiplier_idx: newMultiplierIdx,
        decision_deadline: deadline,
      })
      .eq('id', session.id)
      .select()
      .single();

    if (se) {
      const bossTag = newStreak >= 5 ? ' 🔥 BOSS MODE ACTIVE!' : '';
      await seBotSay(
        se.se_channel_id, se.se_jwt_token,
        `⚽ GOOOAL! @${session.player_username} | Streak: ${newStreak} | ${multiplier}x | Cashout: ${potential.toLocaleString()} pts${bossTag} | !cashout or !continue [spot] (30s)`
      );
    }

    return res.json({ success: true, session: updated ?? session });
  } else {
    // MISS ❌
    const { data: updated } = await supabase
      .from('penalty_king_sessions')
      .update({
        status: 'ended',
        final_payout: 0,
        ended_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single();

    if (se) {
      await seBotSay(
        se.se_channel_id, se.se_jwt_token,
        `🧤 SAVED! The keeper stopped it! @${session.player_username} ends their run at ${session.streak} goals. Lost: ${session.wager.toLocaleString()} pts.`
      );
    }

    return res.json({ success: true, session: updated ?? session });
  }
}

// ─── Action: cashout ─────────────────────────────────────────────────────────

async function handleCashout(req, res, supabase, params) {
  const { streamer_id, player, _auto } = params;
  if (!streamer_id) return res.status(400).json({ error: 'Missing streamer_id' });

  const session = await getActiveSession(supabase, streamer_id);
  if (!session) return res.json({ success: false, message: 'No active game to cash out from.' });
  if (session.status !== 'waiting_decision') {
    return res.json({ success: false, message: 'Cannot cashout — no goal waiting for a decision.' });
  }
  if (player && session.player_username.toLowerCase() !== player.toLowerCase()) {
    return res.json({ success: false, message: `@${player} — It's not your game!` });
  }

  const multiplier = getMultiplier(session.multiplier_idx);
  const payout     = Math.floor(session.wager * multiplier);
  const profit     = payout - session.wager;

  // Credit points
  let se;
  try {
    se = await seGetCreds(supabase, streamer_id);
    await seAdjustPoints(se.se_channel_id, se.se_jwt_token, session.player_username, payout);
  } catch (err) {
    console.error('[penalty-king cashout] SE error:', err.message);
  }

  const { data: updated } = await supabase
    .from('penalty_king_sessions')
    .update({
      status: 'ended',
      final_payout: payout,
      ended_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .select()
    .single();

  if (se) {
    const autoNote = _auto ? '⏰ Auto-cashout! ' : '';
    await seBotSay(
      se.se_channel_id, se.se_jwt_token,
      `💰 ${autoNote}@${session.player_username} cashes out! Streak: ${session.streak} | ${multiplier}x | Won: ${payout.toLocaleString()} pts (Profit: +${profit.toLocaleString()} pts) 🎉`
    );
  }

  return res.json({ success: true, session: updated ?? session, payout, multiplier });
}

// ─── Action: continue_game ───────────────────────────────────────────────────

async function handleContinueGame(req, res, supabase, params) {
  const { streamer_id, player, spot: spotRaw } = params;
  if (!streamer_id) return res.status(400).json({ error: 'Missing streamer_id' });

  const session = await getActiveSession(supabase, streamer_id);
  if (!session) return res.json({ success: false, message: 'No active game.' });
  if (session.status !== 'waiting_decision') {
    return res.json({ success: false, message: 'No decision pending right now.' });
  }
  if (player && session.player_username.toLowerCase() !== player.toLowerCase()) {
    return res.json({ success: false, message: `@${player} — It's not your game!` });
  }

  // Spot: provided by player, or random if omitted
  const rawSpot = parseInt(spotRaw, 10);
  const spot    = rawSpot >= 1 && rawSpot <= 6 ? rawSpot : Math.ceil(Math.random() * 6);

  const { gkSpot, isGoal } = computeShot(spot);
  const nextShotNumber = session.streak + 2; // streak incremented on reveal; +2 because current streak is post-last-goal

  const { data: updated } = await supabase
    .from('penalty_king_sessions')
    .update({
      status: 'shooting',
      shot_spot: spot,
      gk_spot: gkSpot,
      is_goal: isGoal,
      shot_at: new Date().toISOString(),
      decision_deadline: null,
    })
    .eq('id', session.id)
    .select()
    .single();

  // Record shot in history
  await supabase.from('penalty_king_shots').insert({
    session_id: session.id,
    shot_number: nextShotNumber,
    spot_chosen: spot,
    gk_spot: gkSpot,
    is_goal: isGoal,
    multiplier: getMultiplier(session.multiplier_idx),
  });

  let se;
  try { se = await seGetCreds(supabase, streamer_id); } catch { /* ok */ }
  if (se) {
    await seBotSay(
      se.se_channel_id, se.se_jwt_token,
      `🔥 @${session.player_username} goes again! Spot ${spot}... Current: ${getMultiplier(session.multiplier_idx)}x`
    );
  }

  return res.json({ success: true, session: updated ?? session });
}

// ─── Action: admin_reset ─────────────────────────────────────────────────────

async function handleAdminReset(req, res, supabase, params) {
  const { streamer_id } = params;
  if (!streamer_id) return res.status(400).json({ error: 'Missing streamer_id' });

  await supabase
    .from('penalty_king_sessions')
    .update({ status: 'ended', final_payout: 0, ended_at: new Date().toISOString() })
    .eq('streamer_id', streamer_id)
    .in('status', ['shooting', 'waiting_decision']);

  return res.json({ success: true, message: 'Active session force-ended.' });
}

// ─── Action: get_leaderboard ─────────────────────────────────────────────────

async function handleGetLeaderboard(req, res, supabase, params) {
  const { streamer_id } = params;
  if (!streamer_id) return res.status(400).json({ error: 'Missing streamer_id' });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: rows } = await supabase
    .from('penalty_king_sessions')
    .select('player_username, streak, final_payout, wager, created_at')
    .eq('streamer_id', streamer_id)
    .eq('status', 'ended')
    .gte('created_at', todayStart.toISOString())
    .order('final_payout', { ascending: false })
    .limit(50);

  // Aggregate by player
  const byPlayer = {};
  for (const row of rows ?? []) {
    if (!byPlayer[row.player_username]) {
      byPlayer[row.player_username] = {
        player: row.player_username,
        best_streak: 0,
        biggest_win: 0,
        games: 0,
      };
    }
    const p = byPlayer[row.player_username];
    p.games++;
    p.best_streak = Math.max(p.best_streak, row.streak ?? 0);
    p.biggest_win = Math.max(p.biggest_win, row.final_payout ?? 0);
  }

  const leaderboard = Object.values(byPlayer)
    .sort((a, b) => b.biggest_win - a.biggest_win)
    .slice(0, 10);

  return res.json({
    success: true,
    leaderboard,
    biggest_win: (rows ?? []).reduce((m, r) => Math.max(m, r.final_payout ?? 0), 0),
    longest_streak: (rows ?? []).reduce((m, r) => Math.max(m, r.streak ?? 0), 0),
  });
}
