/**
 * Twitch Extension Admin API (Broadcaster-only)
 * 
 * Manages: predictions, bets, giveaways, slot picker sessions, stats
 * Auth: Bearer token (Supabase auth — same as existing APIs)
 * 
 * Routes via ?action= parameter:
 *   Predictions:  create_prediction, lock_prediction, resolve_prediction
 *   Total Guess:  create_total_guess, resolve_total_guess
 *   Bets:         create_bet, lock_bet, resolve_bet, cancel_bet
 *   Giveaway:     create_giveaway, close_giveaway, draw_winners
 *   Slot Picker:  new_session, approve_suggestion, reject_suggestion, mark_played
 *   Stats:        start_session, end_session, update_session, record_slot
 *   Config:       update_config
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Auth: verify broadcaster via Supabase token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const broadcasterId = user.id;
  const { action, ...body } = req.body;

  try {
    switch (action) {

      // ═══ PREDICTIONS ══════════════════════════════════

      case 'create_prediction': {
        const { round_id, bonus_index, slot_name } = body;
        if (!round_id || bonus_index == null) {
          return res.status(400).json({ error: 'round_id and bonus_index required' });
        }

        // Close any existing open prediction first
        await supabase
          .from('ext_bh_predictions')
          .update({ status: 'locked' })
          .eq('broadcaster_id', broadcasterId)
          .eq('status', 'open');

        const { data, error } = await supabase
          .from('ext_bh_predictions')
          .insert({
            broadcaster_id: broadcasterId,
            round_id,
            bonus_index,
            slot_name: slot_name || '',
            status: 'open',
          })
          .select()
          .single();

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ prediction: data });
      }

      case 'lock_prediction': {
        const { prediction_id } = body;

        const { error } = await supabase
          .from('ext_bh_predictions')
          .update({ status: 'locked' })
          .eq('id', prediction_id)
          .eq('broadcaster_id', broadcasterId);

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }

      case 'resolve_prediction': {
        const { prediction_id, actual_multiplier } = body;
        if (!prediction_id || actual_multiplier == null) {
          return res.status(400).json({ error: 'prediction_id and actual_multiplier required' });
        }

        const actualMulti = parseFloat(actual_multiplier);

        // Update prediction
        await supabase
          .from('ext_bh_predictions')
          .update({
            status: 'resolved',
            actual_multiplier: actualMulti,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', prediction_id)
          .eq('broadcaster_id', broadcasterId);

        // Get all entries and calculate accuracy
        const { data: entries } = await supabase
          .from('ext_bh_prediction_entries')
          .select('*')
          .eq('prediction_id', prediction_id);

        if (entries?.length) {
          // Calculate accuracy (% difference from actual)
          const scoredEntries = entries.map(e => ({
            ...e,
            accuracy: actualMulti > 0
              ? Math.abs(e.predicted_multiplier - actualMulti) / actualMulti
              : Math.abs(e.predicted_multiplier - actualMulti),
          }));

          // Sort by accuracy (closest first)
          scoredEntries.sort((a, b) => a.accuracy - b.accuracy);

          // Get config for reward
          const { data: config } = await supabase
            .from('ext_config')
            .select('prediction_points_reward')
            .eq('broadcaster_id', broadcasterId)
            .single();

          const reward = config?.prediction_points_reward || 100;

          // Top 3 get rewards: 1st=3x, 2nd=2x, 3rd=1x
          const rewards = [reward * 3, reward * 2, reward];

          for (let i = 0; i < Math.min(3, scoredEntries.length); i++) {
            const entry = scoredEntries[i];
            const pts = rewards[i] + entry.points_wagered * 2; // wager back + winnings

            await supabase
              .from('ext_bh_prediction_entries')
              .update({ accuracy: entry.accuracy, points_won: pts })
              .eq('id', entry.id);

            // Award points
            await addPoints(supabase, broadcasterId, entry.twitch_user_id, pts);

            // Update leaderboard
            await updateLeaderboard(supabase, broadcasterId, entry.twitch_user_id, entry.twitch_display_name, {
              win: true,
              accuracy: entry.accuracy,
              pointsWon: pts,
            });
          }

          // Losers: update leaderboard, return wager if close enough (within 20%)
          for (let i = 3; i < scoredEntries.length; i++) {
            const entry = scoredEntries[i];
            let refund = 0;
            if (entry.accuracy <= 0.2 && entry.points_wagered > 0) {
              refund = Math.floor(entry.points_wagered * 0.5); // 50% refund if close
              await addPoints(supabase, broadcasterId, entry.twitch_user_id, refund);
            }

            await supabase
              .from('ext_bh_prediction_entries')
              .update({ accuracy: entry.accuracy, points_won: refund })
              .eq('id', entry.id);

            await updateLeaderboard(supabase, broadcasterId, entry.twitch_user_id, entry.twitch_display_name, {
              win: false,
              accuracy: entry.accuracy,
              pointsWon: refund,
            });
          }
        }

        return res.json({ success: true, entries_resolved: entries?.length || 0 });
      }

      // ═══ TOTAL GUESS ══════════════════════════════════

      case 'create_total_guess': {
        const { round_id, prize_points } = body;
        if (!round_id) return res.status(400).json({ error: 'round_id required' });

        // Close existing
        await supabase
          .from('ext_bh_total_guess')
          .update({ status: 'locked' })
          .eq('broadcaster_id', broadcasterId)
          .eq('status', 'open');

        const { data, error } = await supabase
          .from('ext_bh_total_guess')
          .insert({
            broadcaster_id: broadcasterId,
            round_id,
            prize_points: prize_points || 1000,
            status: 'open',
          })
          .select()
          .single();

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ guess: data });
      }

      case 'resolve_total_guess': {
        const { guess_id, actual_total } = body;
        if (!guess_id || actual_total == null) {
          return res.status(400).json({ error: 'guess_id and actual_total required' });
        }

        const total = parseFloat(actual_total);

        // Get all entries
        const { data: entries } = await supabase
          .from('ext_bh_total_guess_entries')
          .select('*')
          .eq('guess_id', guess_id);

        let winnerId = null;
        let winnerName = null;

        if (entries?.length) {
          // Find closest guess
          let bestDiff = Infinity;
          for (const e of entries) {
            const diff = Math.abs(e.guessed_total - total);
            await supabase
              .from('ext_bh_total_guess_entries')
              .update({ difference: diff })
              .eq('id', e.id);

            if (diff < bestDiff) {
              bestDiff = diff;
              winnerId = e.twitch_user_id;
              winnerName = e.twitch_display_name;
            }
          }

          // Award prize
          const { data: guess } = await supabase
            .from('ext_bh_total_guess')
            .select('prize_points')
            .eq('id', guess_id)
            .single();

          const prize = guess?.prize_points || 1000;
          if (winnerId) {
            await addPoints(supabase, broadcasterId, winnerId, prize);
          }
        }

        await supabase
          .from('ext_bh_total_guess')
          .update({
            status: 'resolved',
            actual_total: total,
            winner_twitch_id: winnerId,
            winner_display_name: winnerName,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', guess_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({ success: true, winner: winnerName, entries: entries?.length || 0 });
      }

      // ═══ LIVE BETS ════════════════════════════════════

      case 'create_bet': {
        const { bet_type, title, description, options } = body;
        if (!title || !options?.length) {
          return res.status(400).json({ error: 'title and options required' });
        }

        // Validate options have ids and labels
        const validOptions = options.map((o, i) => ({
          id: o.id || `opt_${i}`,
          label: o.label || `Option ${i + 1}`,
          odds: o.odds || 2.0,
        }));

        const { data, error } = await supabase
          .from('ext_live_bets')
          .insert({
            broadcaster_id: broadcasterId,
            bet_type: bet_type || 'custom',
            title,
            description: description || null,
            options: validOptions,
            status: 'open',
          })
          .select()
          .single();

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ bet: data });
      }

      case 'lock_bet': {
        const { bet_id } = body;
        await supabase
          .from('ext_live_bets')
          .update({ status: 'locked', locked_at: new Date().toISOString() })
          .eq('id', bet_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({ success: true });
      }

      case 'resolve_bet': {
        const { bet_id, winning_option } = body;
        if (!bet_id || !winning_option) {
          return res.status(400).json({ error: 'bet_id and winning_option required' });
        }

        // Get bet details
        const { data: bet } = await supabase
          .from('ext_live_bets')
          .select('options, total_pool')
          .eq('id', bet_id)
          .eq('broadcaster_id', broadcasterId)
          .single();

        if (!bet) return res.status(404).json({ error: 'Bet not found' });

        const winOpt = (bet.options || []).find(o => o.id === winning_option);
        if (!winOpt) return res.status(400).json({ error: 'Invalid winning option' });

        // Get all entries
        const { data: entries } = await supabase
          .from('ext_live_bet_entries')
          .select('*')
          .eq('bet_id', bet_id);

        // Calculate winnings based on odds
        const winners = (entries || []).filter(e => e.option_id === winning_option);
        const totalWinnerWagers = winners.reduce((sum, w) => sum + w.points_wagered, 0);

        for (const winner of winners) {
          // Pari-mutuel: proportional share of pool
          const share = totalWinnerWagers > 0
            ? (winner.points_wagered / totalWinnerWagers) * bet.total_pool
            : 0;
          const payout = Math.floor(share);

          await supabase
            .from('ext_live_bet_entries')
            .update({ points_won: payout })
            .eq('id', winner.id);

          await addPoints(supabase, broadcasterId, winner.twitch_user_id, payout);
        }

        // Mark losers
        const losers = (entries || []).filter(e => e.option_id !== winning_option);
        for (const loser of losers) {
          await supabase
            .from('ext_live_bet_entries')
            .update({ points_won: 0 })
            .eq('id', loser.id);
        }

        await supabase
          .from('ext_live_bets')
          .update({
            status: 'resolved',
            winning_option,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', bet_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({ success: true, winners: winners.length, losers: losers.length });
      }

      case 'cancel_bet': {
        const { bet_id } = body;

        // Refund all entries
        const { data: entries } = await supabase
          .from('ext_live_bet_entries')
          .select('twitch_user_id, points_wagered')
          .eq('bet_id', bet_id);

        for (const entry of (entries || [])) {
          if (entry.points_wagered > 0) {
            await addPoints(supabase, broadcasterId, entry.twitch_user_id, entry.points_wagered);
          }
        }

        await supabase
          .from('ext_live_bets')
          .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
          .eq('id', bet_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({ success: true, refunded: entries?.length || 0 });
      }

      // ═══ GIVEAWAY ═════════════════════════════════════

      case 'create_giveaway': {
        const { title, prize, description, image_url, ticket_cost, max_tickets_per_user, max_winners, ends_at } = body;
        if (!title) return res.status(400).json({ error: 'title required' });

        const { data, error } = await supabase
          .from('ext_giveaways')
          .insert({
            broadcaster_id: broadcasterId,
            title,
            prize: prize || '',
            description: description || null,
            image_url: image_url || null,
            ticket_cost: ticket_cost || 0,
            max_tickets_per_user: max_tickets_per_user || 1,
            max_winners: max_winners || 1,
            status: 'open',
            ends_at: ends_at || null,
          })
          .select()
          .single();

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ giveaway: data });
      }

      case 'close_giveaway': {
        const { giveaway_id } = body;
        await supabase
          .from('ext_giveaways')
          .update({ status: 'closed' })
          .eq('id', giveaway_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({ success: true });
      }

      case 'draw_winners': {
        const { giveaway_id } = body;

        const { data: ga } = await supabase
          .from('ext_giveaways')
          .select('max_winners')
          .eq('id', giveaway_id)
          .eq('broadcaster_id', broadcasterId)
          .single();

        if (!ga) return res.status(404).json({ error: 'Giveaway not found' });

        // Get all entries
        const { data: entries } = await supabase
          .from('ext_giveaway_entries')
          .select('twitch_user_id, twitch_display_name, tickets')
          .eq('giveaway_id', giveaway_id);

        if (!entries?.length) {
          return res.status(400).json({ error: 'No entries' });
        }

        // Build weighted pool
        const pool = [];
        for (const e of entries) {
          for (let i = 0; i < e.tickets; i++) {
            pool.push(e);
          }
        }

        // Fisher-Yates shuffle
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // Pick unique winners
        const winners = [];
        const seen = new Set();
        for (const entry of pool) {
          if (winners.length >= ga.max_winners) break;
          if (seen.has(entry.twitch_user_id)) continue;
          seen.add(entry.twitch_user_id);
          winners.push(entry);
        }

        // Insert winners
        for (const w of winners) {
          await supabase.from('ext_giveaway_winners').insert({
            giveaway_id,
            twitch_user_id: w.twitch_user_id,
            twitch_display_name: w.twitch_display_name,
          });
        }

        await supabase
          .from('ext_giveaways')
          .update({
            status: 'completed',
            drawn_at: new Date().toISOString(),
          })
          .eq('id', giveaway_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({
          success: true,
          winners: winners.map(w => w.twitch_display_name),
        });
      }

      // ═══ SLOT PICKER ══════════════════════════════════

      case 'new_session': {
        const sessionId = body.session_id || `session_${Date.now()}`;
        return res.json({ session_id: sessionId });
      }

      case 'approve_suggestion': {
        const { suggestion_id } = body;
        await supabase
          .from('ext_slot_suggestions')
          .update({ status: 'approved' })
          .eq('id', suggestion_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({ success: true });
      }

      case 'reject_suggestion': {
        const { suggestion_id } = body;
        await supabase
          .from('ext_slot_suggestions')
          .update({ status: 'rejected' })
          .eq('id', suggestion_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({ success: true });
      }

      case 'mark_played': {
        const { suggestion_id } = body;
        await supabase
          .from('ext_slot_suggestions')
          .update({ status: 'played' })
          .eq('id', suggestion_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({ success: true });
      }

      // ═══ SESSION STATS ════════════════════════════════

      case 'start_session': {
        // End any existing live session
        await supabase
          .from('ext_stream_sessions')
          .update({ is_live: false, ended_at: new Date().toISOString() })
          .eq('broadcaster_id', broadcasterId)
          .eq('is_live', true);

        const { data, error } = await supabase
          .from('ext_stream_sessions')
          .insert({
            broadcaster_id: broadcasterId,
            currency: body.currency || '€',
            is_live: true,
          })
          .select()
          .single();

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ session: data });
      }

      case 'end_session': {
        const { session_id } = body;

        const { data: session } = await supabase
          .from('ext_stream_sessions')
          .select('*')
          .eq('id', session_id)
          .eq('broadcaster_id', broadcasterId)
          .single();

        if (session) {
          await supabase
            .from('ext_stream_sessions')
            .update({ is_live: false, ended_at: new Date().toISOString() })
            .eq('id', session_id);

          // Update all-time stats
          await updateAllTimeStats(supabase, broadcasterId, session);
        }

        return res.json({ success: true });
      }

      case 'update_session': {
        const { session_id, ...updates } = body;
        const allowed = ['total_wagered', 'total_won', 'biggest_win', 'biggest_win_slot',
          'biggest_multiplier', 'biggest_multi_slot', 'slots_played', 'bonus_hunts_completed', 'stats'];

        const patch = {};
        for (const key of allowed) {
          if (updates[key] !== undefined) patch[key] = updates[key];
        }

        await supabase
          .from('ext_stream_sessions')
          .update(patch)
          .eq('id', session_id)
          .eq('broadcaster_id', broadcasterId);

        return res.json({ success: true });
      }

      case 'record_slot': {
        const { session_id, slot_name, provider, bet_size, wagered, won, spins, biggest_win, biggest_multiplier } = body;

        await supabase.from('ext_session_slots').insert({
          session_id,
          slot_name: slot_name || 'Unknown',
          provider: provider || null,
          bet_size: bet_size || null,
          total_wagered: wagered || 0,
          total_won: won || 0,
          spins: spins || 0,
          biggest_win: biggest_win || 0,
          biggest_multiplier: biggest_multiplier || 0,
        });

        return res.json({ success: true });
      }

      // ═══ CONFIG ═══════════════════════════════════════

      case 'update_config': {
        const allowed = [
          'prediction_points_reward', 'total_guess_prize', 'slot_lock_cost',
          'slot_vote_enabled', 'predictions_enabled', 'bets_enabled',
          'giveaway_enabled', 'wheel_enabled', 'games_enabled',
          'starting_points', 'points_per_minute_watching',
          'theme_primary', 'theme_bg', 'theme_card', 'theme_text', 'theme_accent',
        ];

        const patch = { updated_at: new Date().toISOString() };
        for (const key of allowed) {
          if (body[key] !== undefined) patch[key] = body[key];
        }

        const { error } = await supabase
          .from('ext_config')
          .upsert({
            broadcaster_id: broadcasterId,
            ...patch,
          }, { onConflict: 'broadcaster_id' });

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('Extension admin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── Shared Helpers ─────────────────────────────────────

async function addPoints(supabase, broadcasterId, twitchUserId, amount) {
  const { data } = await supabase
    .from('ext_viewer_points')
    .select('points, lifetime_earned')
    .eq('broadcaster_id', broadcasterId)
    .eq('twitch_user_id', twitchUserId)
    .single();

  if (data) {
    await supabase
      .from('ext_viewer_points')
      .update({
        points: data.points + amount,
        lifetime_earned: data.lifetime_earned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('broadcaster_id', broadcasterId)
      .eq('twitch_user_id', twitchUserId);
  }
}

async function updateLeaderboard(supabase, broadcasterId, twitchUserId, displayName, result) {
  const { data: existing } = await supabase
    .from('ext_predictor_leaderboard')
    .select('*')
    .eq('broadcaster_id', broadcasterId)
    .eq('twitch_user_id', twitchUserId)
    .single();

  if (existing) {
    const totalPredictions = existing.total_predictions + 1;
    const wins = existing.wins + (result.win ? 1 : 0);
    const totalPointsWon = existing.total_points_won + result.pointsWon;
    const bestAccuracy = result.accuracy < (existing.best_accuracy ?? Infinity)
      ? result.accuracy : existing.best_accuracy;
    const avgAccuracy = ((existing.avg_accuracy || 0) * existing.total_predictions + result.accuracy) / totalPredictions;
    const streak = result.win ? (existing.streak + 1) : 0;
    const bestStreak = Math.max(existing.best_streak, streak);

    await supabase
      .from('ext_predictor_leaderboard')
      .update({
        total_predictions: totalPredictions,
        wins,
        total_points_won: totalPointsWon,
        best_accuracy: bestAccuracy,
        avg_accuracy: avgAccuracy,
        streak,
        best_streak: bestStreak,
        twitch_display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('broadcaster_id', broadcasterId)
      .eq('twitch_user_id', twitchUserId);
  } else {
    await supabase
      .from('ext_predictor_leaderboard')
      .insert({
        broadcaster_id: broadcasterId,
        twitch_user_id: twitchUserId,
        twitch_display_name: displayName,
        total_predictions: 1,
        wins: result.win ? 1 : 0,
        total_points_won: result.pointsWon,
        best_accuracy: result.accuracy,
        avg_accuracy: result.accuracy,
        streak: result.win ? 1 : 0,
        best_streak: result.win ? 1 : 0,
      });
  }
}

async function updateAllTimeStats(supabase, broadcasterId, session) {
  const { data: existing } = await supabase
    .from('ext_streamer_stats')
    .select('*')
    .eq('broadcaster_id', broadcasterId)
    .single();

  if (existing) {
    const patch = {
      total_sessions: existing.total_sessions + 1,
      total_wagered: parseFloat(existing.total_wagered) + parseFloat(session.total_wagered || 0),
      total_won: parseFloat(existing.total_won) + parseFloat(session.total_won || 0),
      total_slots_played: existing.total_slots_played + (session.slots_played || 0),
      total_bonus_hunts: existing.total_bonus_hunts + (session.bonus_hunts_completed || 0),
      updated_at: new Date().toISOString(),
    };

    if (parseFloat(session.biggest_win || 0) > parseFloat(existing.biggest_win_ever || 0)) {
      patch.biggest_win_ever = session.biggest_win;
      patch.biggest_win_slot = session.biggest_win_slot;
    }

    if (parseFloat(session.biggest_multiplier || 0) > parseFloat(existing.biggest_multiplier_ever || 0)) {
      patch.biggest_multiplier_ever = session.biggest_multiplier;
      patch.biggest_multi_slot = session.biggest_multi_slot;
    }

    await supabase
      .from('ext_streamer_stats')
      .update(patch)
      .eq('broadcaster_id', broadcasterId);
  } else {
    await supabase
      .from('ext_streamer_stats')
      .insert({
        broadcaster_id: broadcasterId,
        total_sessions: 1,
        total_wagered: session.total_wagered || 0,
        total_won: session.total_won || 0,
        biggest_win_ever: session.biggest_win || 0,
        biggest_win_slot: session.biggest_win_slot || null,
        biggest_multiplier_ever: session.biggest_multiplier || 0,
        biggest_multi_slot: session.biggest_multi_slot || null,
        total_slots_played: session.slots_played || 0,
        total_bonus_hunts: session.bonus_hunts_completed || 0,
      });
  }
}
