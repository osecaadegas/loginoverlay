/**
 * Twitch Extension Backend Service (EBS)
 * 
 * Handles ALL extension API calls from viewers.
 * Auth: Twitch Extension JWT → verified via shared secret
 * 
 * Routes via ?action= parameter:
 *   Points:       get_points
 *   Predictions:  get_prediction, submit_prediction, get_leaderboard
 *   Total Guess:  get_total_guess, submit_total_guess
 *   Slot Picker:  get_suggestions, submit_suggestion, vote_suggestion, lock_suggestion
 *   Bets:         get_bets, place_bet
 *   Giveaway:     get_giveaways, enter_giveaway
 *   Stats:        get_session_stats, get_all_time_stats, get_favourite_slots
 *   Wheel:        spin_wheel, get_wheel_prizes
 *   Config:       get_config
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ─── JWT Verification ───────────────────────────────────

function verifyTwitchJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Verify signature
    const signingInput = parts[0] + '.' + parts[1];
    const expectedSig = crypto
      .createHmac('sha256', Buffer.from(secret, 'base64'))
      .update(signingInput)
      .digest('base64url');

    if (expectedSig !== parts[2]) return null;

    // Check expiry
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

function getBroadcasterIdFromJWT(payload) {
  return payload.channel_id || null;
}

function getViewerIdFromJWT(payload) {
  return payload.opaque_user_id || payload.user_id || null;
}

function isViewerLinked(payload) {
  return payload.user_id && !payload.is_unlinked;
}

// ─── Handler ────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-extension-jwt');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify Twitch Extension JWT
  const jwt = req.headers['x-extension-jwt'];
  if (!jwt) return res.status(401).json({ error: 'Missing extension JWT' });

  const secret = process.env.TWITCH_EXTENSION_SECRET;
  if (!secret) return res.status(500).json({ error: 'Extension secret not configured' });

  const payload = verifyTwitchJWT(jwt, secret);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired JWT' });

  const channelId = getBroadcasterIdFromJWT(payload);
  const viewerId = getViewerIdFromJWT(payload);
  const viewerRole = payload.role; // 'broadcaster', 'moderator', 'viewer'

  if (!channelId || !viewerId) {
    return res.status(400).json({ error: 'Missing channel or viewer ID' });
  }

  // Resolve broadcaster's Supabase user_id from their Twitch channel ID
  const { data: broadcasterProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('twitch_id', channelId)
    .single();

  if (!broadcasterProfile) {
    return res.status(404).json({ error: 'Broadcaster not found' });
  }

  const broadcasterId = broadcasterProfile.id;
  const action = req.query.action || req.body?.action;
  const body = req.method === 'POST' ? req.body : req.query;

  try {
    switch (action) {

      // ═══ POINTS ═══════════════════════════════════════

      case 'get_points': {
        const { data } = await supabase
          .from('ext_viewer_points')
          .select('points, lifetime_earned')
          .eq('broadcaster_id', broadcasterId)
          .eq('twitch_user_id', viewerId)
          .single();

        return res.json({ points: data?.points || 0, lifetime: data?.lifetime_earned || 0 });
      }

      // ═══ CONFIG ═══════════════════════════════════════

      case 'get_config': {
        const { data } = await supabase
          .from('ext_config')
          .select('*')
          .eq('broadcaster_id', broadcasterId)
          .single();

        return res.json({ config: data || {} });
      }

      // ═══ BONUS HUNT PREDICTIONS ═══════════════════════

      case 'get_prediction': {
        const { data: prediction } = await supabase
          .from('ext_bh_predictions')
          .select('*, ext_bh_prediction_entries(*)')
          .eq('broadcaster_id', broadcasterId)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get viewer's entry if exists
        let myEntry = null;
        if (prediction) {
          const entry = prediction.ext_bh_prediction_entries?.find(
            e => e.twitch_user_id === viewerId
          );
          myEntry = entry || null;
        }

        return res.json({
          prediction: prediction ? {
            id: prediction.id,
            bonus_index: prediction.bonus_index,
            slot_name: prediction.slot_name,
            status: prediction.status,
            total_entries: prediction.ext_bh_prediction_entries?.length || 0,
          } : null,
          my_entry: myEntry,
        });
      }

      case 'submit_prediction': {
        const { prediction_id, multiplier, wager } = body;
        if (!prediction_id || multiplier == null) {
          return res.status(400).json({ error: 'prediction_id and multiplier required' });
        }

        const predictedMulti = parseFloat(multiplier);
        if (isNaN(predictedMulti) || predictedMulti < 0 || predictedMulti > 99999) {
          return res.status(400).json({ error: 'Invalid multiplier' });
        }

        const wagerAmount = Math.max(0, parseInt(wager) || 0);

        // Verify prediction is open
        const { data: pred } = await supabase
          .from('ext_bh_predictions')
          .select('status')
          .eq('id', prediction_id)
          .single();

        if (!pred || pred.status !== 'open') {
          return res.status(400).json({ error: 'Prediction is not open' });
        }

        // Deduct wager if > 0
        if (wagerAmount > 0) {
          const { data: pts } = await supabase
            .from('ext_viewer_points')
            .select('points')
            .eq('broadcaster_id', broadcasterId)
            .eq('twitch_user_id', viewerId)
            .single();

          if (!pts || pts.points < wagerAmount) {
            return res.status(400).json({ error: 'Insufficient points' });
          }

          await supabase
            .from('ext_viewer_points')
            .update({ points: pts.points - wagerAmount, updated_at: new Date().toISOString() })
            .eq('broadcaster_id', broadcasterId)
            .eq('twitch_user_id', viewerId);
        }

        const displayName = body.display_name || viewerId;

        const { error } = await supabase
          .from('ext_bh_prediction_entries')
          .upsert({
            prediction_id,
            twitch_user_id: viewerId,
            twitch_display_name: displayName,
            predicted_multiplier: predictedMulti,
            points_wagered: wagerAmount,
          }, { onConflict: 'prediction_id,twitch_user_id' });

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }

      case 'get_leaderboard': {
        const { data } = await supabase
          .from('ext_predictor_leaderboard')
          .select('twitch_display_name, total_predictions, wins, total_points_won, best_accuracy, streak')
          .eq('broadcaster_id', broadcasterId)
          .order('total_points_won', { ascending: false })
          .limit(50);

        return res.json({ leaderboard: data || [] });
      }

      // ═══ GUESS THE TOTAL PAY ══════════════════════════

      case 'get_total_guess': {
        const { data: guess } = await supabase
          .from('ext_bh_total_guess')
          .select('id, round_id, status, prize_points')
          .eq('broadcaster_id', broadcasterId)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let myGuess = null;
        if (guess) {
          const { data: entry } = await supabase
            .from('ext_bh_total_guess_entries')
            .select('guessed_total')
            .eq('guess_id', guess.id)
            .eq('twitch_user_id', viewerId)
            .single();
          myGuess = entry;
        }

        const { count } = await supabase
          .from('ext_bh_total_guess_entries')
          .select('*', { count: 'exact', head: true })
          .eq('guess_id', guess?.id);

        return res.json({ guess: guess || null, my_guess: myGuess, total_entries: count || 0 });
      }

      case 'submit_total_guess': {
        const { guess_id, total } = body;
        if (!guess_id || total == null) {
          return res.status(400).json({ error: 'guess_id and total required' });
        }

        const guessedTotal = parseFloat(total);
        if (isNaN(guessedTotal) || guessedTotal < 0 || guessedTotal > 9999999) {
          return res.status(400).json({ error: 'Invalid total' });
        }

        const { data: g } = await supabase
          .from('ext_bh_total_guess')
          .select('status')
          .eq('id', guess_id)
          .single();

        if (!g || g.status !== 'open') {
          return res.status(400).json({ error: 'Guess round is not open' });
        }

        const displayName = body.display_name || viewerId;

        const { error } = await supabase
          .from('ext_bh_total_guess_entries')
          .upsert({
            guess_id,
            twitch_user_id: viewerId,
            twitch_display_name: displayName,
            guessed_total: guessedTotal,
          }, { onConflict: 'guess_id,twitch_user_id' });

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }

      // ═══ COMMUNITY SLOT PICKER ════════════════════════

      case 'get_suggestions': {
        const sessionId = body.session_id || 'default';

        const { data } = await supabase
          .from('ext_slot_suggestions')
          .select('id, slot_name, slot_provider, slot_image, votes, status, twitch_display_name, locked_by_user')
          .eq('broadcaster_id', broadcasterId)
          .eq('session_id', sessionId)
          .in('status', ['pending', 'approved'])
          .order('votes', { ascending: false })
          .limit(50);

        return res.json({ suggestions: data || [] });
      }

      case 'submit_suggestion': {
        const { slot_name, session_id } = body;
        if (!slot_name?.trim()) {
          return res.status(400).json({ error: 'slot_name required' });
        }

        const sId = session_id || 'default';
        const displayName = body.display_name || viewerId;

        // Check for duplicate from this user
        const { data: existing } = await supabase
          .from('ext_slot_suggestions')
          .select('id')
          .eq('session_id', sId)
          .eq('twitch_user_id', viewerId)
          .single();

        if (existing) {
          return res.status(400).json({ error: 'You already submitted a suggestion' });
        }

        // Try to match slot in DB
        const { data: slotMatch } = await supabase
          .from('slots')
          .select('name, provider, image')
          .ilike('name', `%${slot_name.trim().substring(0, 100)}%`)
          .limit(1)
          .single();

        const { error } = await supabase
          .from('ext_slot_suggestions')
          .insert({
            broadcaster_id: broadcasterId,
            session_id: sId,
            twitch_user_id: viewerId,
            twitch_display_name: displayName,
            slot_name: slotMatch?.name || slot_name.trim().substring(0, 100),
            slot_provider: slotMatch?.provider || body.slot_provider || null,
            slot_image: slotMatch?.image || null,
          });

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true });
      }

      case 'vote_suggestion': {
        const { suggestion_id } = body;
        if (!suggestion_id) return res.status(400).json({ error: 'suggestion_id required' });

        // Check not already voted
        const { data: existingVote } = await supabase
          .from('ext_slot_votes')
          .select('id')
          .eq('suggestion_id', suggestion_id)
          .eq('twitch_user_id', viewerId)
          .single();

        if (existingVote) {
          return res.status(400).json({ error: 'Already voted' });
        }

        await supabase.from('ext_slot_votes').insert({
          suggestion_id,
          twitch_user_id: viewerId,
        });

        // Increment vote count
        await supabase.rpc('increment_suggestion_votes', { sid: suggestion_id });

        return res.json({ success: true });
      }

      case 'lock_suggestion': {
        const { suggestion_id } = body;
        if (!suggestion_id) return res.status(400).json({ error: 'suggestion_id required' });

        // Get lock cost
        const { data: config } = await supabase
          .from('ext_config')
          .select('slot_lock_cost')
          .eq('broadcaster_id', broadcasterId)
          .single();

        const cost = config?.slot_lock_cost || 500;

        // Check points
        const { data: pts } = await supabase
          .from('ext_viewer_points')
          .select('points')
          .eq('broadcaster_id', broadcasterId)
          .eq('twitch_user_id', viewerId)
          .single();

        if (!pts || pts.points < cost) {
          return res.status(400).json({ error: `Need ${cost} points to lock a slot` });
        }

        // Deduct & lock
        await supabase
          .from('ext_viewer_points')
          .update({ points: pts.points - cost, updated_at: new Date().toISOString() })
          .eq('broadcaster_id', broadcasterId)
          .eq('twitch_user_id', viewerId);

        const displayName = body.display_name || viewerId;

        await supabase
          .from('ext_slot_suggestions')
          .update({
            status: 'approved',
            locked_by_user: displayName,
            lock_cost: cost,
          })
          .eq('id', suggestion_id);

        return res.json({ success: true, cost });
      }

      // ═══ LIVE BETS ════════════════════════════════════

      case 'get_bets': {
        const { data } = await supabase
          .from('ext_live_bets')
          .select('id, bet_type, title, description, options, status, total_pool, winning_option')
          .eq('broadcaster_id', broadcasterId)
          .in('status', ['open', 'locked'])
          .order('created_at', { ascending: false })
          .limit(5);

        // Get viewer's entries for these bets
        const betIds = (data || []).map(b => b.id);
        let myEntries = {};
        if (betIds.length) {
          const { data: entries } = await supabase
            .from('ext_live_bet_entries')
            .select('bet_id, option_id, points_wagered')
            .in('bet_id', betIds)
            .eq('twitch_user_id', viewerId);

          (entries || []).forEach(e => { myEntries[e.bet_id] = e; });
        }

        return res.json({
          bets: (data || []).map(b => ({
            ...b,
            my_entry: myEntries[b.id] || null,
          })),
        });
      }

      case 'place_bet': {
        const { bet_id, option_id, wager } = body;
        if (!bet_id || !option_id) {
          return res.status(400).json({ error: 'bet_id and option_id required' });
        }

        const wagerAmount = parseInt(wager) || 0;
        if (wagerAmount <= 0) {
          return res.status(400).json({ error: 'Wager must be positive' });
        }

        // Verify bet is open
        const { data: bet } = await supabase
          .from('ext_live_bets')
          .select('status, options')
          .eq('id', bet_id)
          .single();

        if (!bet || bet.status !== 'open') {
          return res.status(400).json({ error: 'Bet is not open' });
        }

        // Verify option exists
        const optionExists = (bet.options || []).some(o => o.id === option_id);
        if (!optionExists) {
          return res.status(400).json({ error: 'Invalid option' });
        }

        // Deduct points
        const { data: pts } = await supabase
          .from('ext_viewer_points')
          .select('points')
          .eq('broadcaster_id', broadcasterId)
          .eq('twitch_user_id', viewerId)
          .single();

        if (!pts || pts.points < wagerAmount) {
          return res.status(400).json({ error: 'Insufficient points' });
        }

        await supabase
          .from('ext_viewer_points')
          .update({ points: pts.points - wagerAmount, updated_at: new Date().toISOString() })
          .eq('broadcaster_id', broadcasterId)
          .eq('twitch_user_id', viewerId);

        const displayName = body.display_name || viewerId;

        const { error } = await supabase
          .from('ext_live_bet_entries')
          .upsert({
            bet_id,
            twitch_user_id: viewerId,
            twitch_display_name: displayName,
            option_id,
            points_wagered: wagerAmount,
          }, { onConflict: 'bet_id,twitch_user_id' });

        if (error) return res.status(400).json({ error: error.message });

        // Update total pool
        await supabase
          .from('ext_live_bets')
          .update({ total_pool: (bet.total_pool || 0) + wagerAmount })
          .eq('id', bet_id);

        return res.json({ success: true });
      }

      // ═══ GIVEAWAY ═════════════════════════════════════

      case 'get_giveaways': {
        const { data } = await supabase
          .from('ext_giveaways')
          .select('id, title, prize, description, image_url, ticket_cost, max_tickets_per_user, max_winners, status, ends_at')
          .eq('broadcaster_id', broadcasterId)
          .in('status', ['open', 'drawing', 'completed'])
          .order('created_at', { ascending: false })
          .limit(5);

        // Get viewer entries
        const gaIds = (data || []).map(g => g.id);
        let myEntries = {};
        if (gaIds.length) {
          const { data: entries } = await supabase
            .from('ext_giveaway_entries')
            .select('giveaway_id, tickets')
            .in('giveaway_id', gaIds)
            .eq('twitch_user_id', viewerId);

          (entries || []).forEach(e => { myEntries[e.giveaway_id] = e.tickets; });
        }

        // Get entry counts
        let entryCounts = {};
        for (const g of (data || [])) {
          const { count } = await supabase
            .from('ext_giveaway_entries')
            .select('*', { count: 'exact', head: true })
            .eq('giveaway_id', g.id);
          entryCounts[g.id] = count || 0;
        }

        // Get winners for completed
        let winners = {};
        for (const g of (data || []).filter(g => g.status === 'completed')) {
          const { data: w } = await supabase
            .from('ext_giveaway_winners')
            .select('twitch_display_name')
            .eq('giveaway_id', g.id);
          winners[g.id] = (w || []).map(x => x.twitch_display_name);
        }

        return res.json({
          giveaways: (data || []).map(g => ({
            ...g,
            my_tickets: myEntries[g.id] || 0,
            total_entries: entryCounts[g.id] || 0,
            winners: winners[g.id] || [],
          })),
        });
      }

      case 'enter_giveaway': {
        const { giveaway_id, tickets } = body;
        if (!giveaway_id) return res.status(400).json({ error: 'giveaway_id required' });

        const ticketCount = Math.max(1, parseInt(tickets) || 1);

        const { data: ga } = await supabase
          .from('ext_giveaways')
          .select('status, ticket_cost, max_tickets_per_user')
          .eq('id', giveaway_id)
          .single();

        if (!ga || ga.status !== 'open') {
          return res.status(400).json({ error: 'Giveaway is not open' });
        }

        const actualTickets = Math.min(ticketCount, ga.max_tickets_per_user);
        const totalCost = actualTickets * ga.ticket_cost;

        // Deduct points if tickets cost something
        if (totalCost > 0) {
          const { data: pts } = await supabase
            .from('ext_viewer_points')
            .select('points')
            .eq('broadcaster_id', broadcasterId)
            .eq('twitch_user_id', viewerId)
            .single();

          if (!pts || pts.points < totalCost) {
            return res.status(400).json({ error: 'Insufficient points' });
          }

          await supabase
            .from('ext_viewer_points')
            .update({ points: pts.points - totalCost, updated_at: new Date().toISOString() })
            .eq('broadcaster_id', broadcasterId)
            .eq('twitch_user_id', viewerId);
        }

        const displayName = body.display_name || viewerId;

        const { error } = await supabase
          .from('ext_giveaway_entries')
          .upsert({
            giveaway_id,
            twitch_user_id: viewerId,
            twitch_display_name: displayName,
            tickets: actualTickets,
          }, { onConflict: 'giveaway_id,twitch_user_id' });

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true, tickets: actualTickets, cost: totalCost });
      }

      // ═══ STATS ════════════════════════════════════════

      case 'get_session_stats': {
        const { data: session } = await supabase
          .from('ext_stream_sessions')
          .select('*, ext_session_slots(*)')
          .eq('broadcaster_id', broadcasterId)
          .eq('is_live', true)
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        return res.json({ session: session || null });
      }

      case 'get_all_time_stats': {
        const { data } = await supabase
          .from('ext_streamer_stats')
          .select('*')
          .eq('broadcaster_id', broadcasterId)
          .single();

        return res.json({ stats: data || null });
      }

      case 'get_favourite_slots': {
        const { data } = await supabase
          .from('ext_streamer_stats')
          .select('favourite_slots')
          .eq('broadcaster_id', broadcasterId)
          .single();

        return res.json({ favourite_slots: data?.favourite_slots || [] });
      }

      case 'get_session_history': {
        const { data } = await supabase
          .from('ext_stream_sessions')
          .select('id, started_at, ended_at, total_wagered, total_won, biggest_win, biggest_win_slot, slots_played')
          .eq('broadcaster_id', broadcasterId)
          .order('started_at', { ascending: false })
          .limit(20);

        return res.json({ sessions: data || [] });
      }

      // ═══ WHEEL ════════════════════════════════════════

      case 'get_wheel_prizes': {
        const { data } = await supabase
          .from('daily_wheel_prizes')
          .select('id, label, icon, color, text_color, se_points, probability')
          .eq('is_active', true)
          .order('display_order');

        return res.json({ prizes: data || [] });
      }

      case 'spin_wheel': {
        // Check cooldown (1 spin per 24h per viewer per channel)
        const { data: lastSpin } = await supabase
          .from('ext_wheel_spins')
          .select('spun_at')
          .eq('broadcaster_id', broadcasterId)
          .eq('twitch_user_id', viewerId)
          .order('spun_at', { ascending: false })
          .limit(1)
          .single();

        if (lastSpin) {
          const cooldownMs = 24 * 60 * 60 * 1000;
          const timeSince = Date.now() - new Date(lastSpin.spun_at).getTime();
          if (timeSince < cooldownMs) {
            const nextSpin = new Date(new Date(lastSpin.spun_at).getTime() + cooldownMs);
            return res.status(429).json({
              error: 'Spin on cooldown',
              next_spin_at: nextSpin.toISOString(),
            });
          }
        }

        // Get prizes and pick one based on probability
        const { data: prizes } = await supabase
          .from('daily_wheel_prizes')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (!prizes?.length) {
          return res.status(400).json({ error: 'No prizes configured' });
        }

        const totalWeight = prizes.reduce((sum, p) => sum + p.probability, 0);
        let rand = Math.random() * totalWeight;
        let selectedPrize = prizes[0];

        for (const prize of prizes) {
          rand -= prize.probability;
          if (rand <= 0) {
            selectedPrize = prize;
            break;
          }
        }

        const displayName = body.display_name || viewerId;

        // Record spin
        await supabase.from('ext_wheel_spins').insert({
          broadcaster_id: broadcasterId,
          twitch_user_id: viewerId,
          twitch_display_name: displayName,
          prize_label: selectedPrize.label,
          points_won: selectedPrize.se_points || 0,
        });

        // Award points
        if (selectedPrize.se_points > 0) {
          await ensureViewerPoints(supabase, broadcasterId, viewerId, displayName);
          await supabase.rpc('add_viewer_points', {
            p_broadcaster_id: broadcasterId,
            p_twitch_user_id: viewerId,
            p_amount: selectedPrize.se_points,
          });
        }

        return res.json({
          prize: {
            label: selectedPrize.label,
            icon: selectedPrize.icon,
            color: selectedPrize.color,
            points: selectedPrize.se_points || 0,
          },
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('Extension EBS error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── Helpers ────────────────────────────────────────────

async function ensureViewerPoints(supabase, broadcasterId, twitchUserId, displayName) {
  const { data } = await supabase
    .from('ext_viewer_points')
    .select('id')
    .eq('broadcaster_id', broadcasterId)
    .eq('twitch_user_id', twitchUserId)
    .single();

  if (!data) {
    // Get starting points from config
    const { data: config } = await supabase
      .from('ext_config')
      .select('starting_points')
      .eq('broadcaster_id', broadcasterId)
      .single();

    const startPts = config?.starting_points || 500;

    await supabase.from('ext_viewer_points').insert({
      broadcaster_id: broadcasterId,
      twitch_user_id: twitchUserId,
      twitch_display_name: displayName || twitchUserId,
      points: startPts,
      lifetime_earned: startPts,
    });
  }
}
