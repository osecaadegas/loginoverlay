import { createClient } from '@supabase/supabase-js';
import streamerDataHandler from './_lib/streamer-data.js';
import imageSearchHandler from './_lib/image-search.js';

/**
 * /api/chat-commands — Unified chat command handler
 *
 * Routes via ?cmd= query param:
 *   cmd=sr   — Slot request (!sr <slot>)   GET
 *   cmd=song — Spotify song request        GET
 *   cmd=award — Award StreamElements points POST
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPOTIFY_CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID;

/** Join w1..w10 query params into a single string (SE fallback for ${querystring}) */
function buildFromWords(query) {
  const parts = [];
  for (let i = 1; i <= 10; i++) {
    const v = query[`w${i}`];
    if (v && v.trim()) parts.push(v.trim());
  }
  return parts.join(' ') || '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { cmd } = req.query;

  switch (cmd) {
    case 'sr':       return handleSlotRequest(req, res);
    case 'sr-reject': return handleSlotReject(req, res);
    case 'sr-clear-all': return handleSlotClearAll(req, res);
    case 'song':     return handleSongRequest(req, res);
    case 'award':    return handleAwardPoints(req, res);
    case 'spotify-refresh': return handleSpotifyRefresh(req, res);
    case 'pred-say': return handlePredSay(req, res);
    case 'streamer-data': return streamerDataHandler(req, res);
    case 'image-search': return imageSearchHandler(req, res);
    default:         return res.status(400).json({ error: 'Unknown cmd' });
  }
}

/* ─── Slot Request (?cmd=sr&slot=...&user_id=...&requester=...) ─── */

/** Verify a Supabase JWT and return the user, or null on failure. */
async function verifyJwt(supabase, req) {
  const auth = (req.headers && req.headers.authorization) || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/** Send a message to Twitch chat via the StreamElements bot */
async function seBotSay(seChannelId, seJwtToken, message) {
  try {
    const resp = await fetch(`https://api.streamelements.com/kappa/v2/bot/${seChannelId}/say`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${seJwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error('[seBotSay] SE API returned', resp.status, body);
    }
  } catch (err) {
    console.error('[seBotSay] Failed to send chat message:', err.message);
  }
}

async function handleSlotRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Support both GET (SE overlay) and POST (internal hook)
  const params = req.method === 'POST' ? (req.body || {}) : req.query;
  const { slot, user_id, requester } = params;

  // Support individual word params w1..w10 as fallback for SE (${querystring} doesn't resolve)
  const slotParam = slot || buildFromWords(req.method === 'GET' ? req.query : {});

  if (!slotParam || !slotParam.trim()) return res.status(200).send('Usage: !sr <slot name>');
  if (!user_id) return res.status(200).send('Missing streamer user_id');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(200).send('Server config error');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const rawName = slotParam.trim();
  const viewer = (requester || 'anonymous').trim();

  try {
    // Look up the slot in the DB first (case-insensitive) to resolve the canonical name
    let resolvedName = rawName;
    let slotImage = null;
    let dbMatchFound = false;

    // 1) Exact case-insensitive match
    const { data: exactMatch } = await supabase
      .from('slots')
      .select('name, image')
      .ilike('name', rawName)
      .limit(1);

    if (exactMatch && exactMatch.length > 0) {
      resolvedName = exactMatch[0].name;
      slotImage = exactMatch[0].image || null;
      dbMatchFound = true;
    } else {
      // 2) Substring match
      const { data: partialMatch } = await supabase
        .from('slots')
        .select('name, image')
        .ilike('name', `%${rawName}%`)
        .limit(1);

      if (partialMatch && partialMatch.length > 0) {
        resolvedName = partialMatch[0].name;
        slotImage = partialMatch[0].image || null;
        dbMatchFound = true;
      } else {
        // 3) Word-by-word fuzzy match — e.g. "gates olympus" matches "Gates of Olympus"
        //    Fetches multiple candidates and picks the best (highest word-overlap ratio, then shortest name)
        const stopWords = new Set(['of', 'the', 'a', 'an', 'and', 'in', 'on', 'at', 'to', 'for', 'by', 'or', 'is', 'it', 'vs']);
        const words = rawName.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
        if (words.length > 0) {
          let q = supabase.from('slots').select('name, image');
          for (const word of words) {
            q = q.ilike('name', `%${word}%`);
          }
          const { data: fuzzyMatches } = await q.limit(20);
          if (fuzzyMatches && fuzzyMatches.length > 0) {
            // Score each: ratio of matched keywords to total words in the slot name (higher = tighter match)
            const scored = fuzzyMatches.map(s => {
              const nameWords = s.name.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
              const totalWords = nameWords.length || 1;
              return { ...s, score: words.length / totalWords, nameLen: s.name.length };
            });
            // Best = highest score (most overlap), then shortest name
            scored.sort((a, b) => b.score - a.score || a.nameLen - b.nameLen);
            resolvedName = scored[0].name;
            slotImage = scored[0].image || null;
            dbMatchFound = true;
          }
        }
      }
    }

    // ── Resolve SE creds from streamelements_connections (per-user) ──
    const { data: srWidgets } = await supabase
      .from('overlay_widgets')
      .select('config')
      .eq('user_id', user_id)
      .eq('widget_type', 'slot_requests')
      .limit(1);

    const wConfig = srWidgets?.[0]?.config;
    const seEnabled = !!wConfig?.srSeEnabled;
    const seCost = parseInt(wConfig?.srSeCost, 10) || 0;

    // If the streamer has disabled the chat listener, reject new requests immediately
    if (wConfig?.srChatEnabled === false) {
      return res.status(200).send('Slot requests are currently paused.');
    }

    // ── H2: Max queue size enforcement ──
    const maxQueueSize = parseInt(wConfig?.maxQueueSize, 10) || 50;
    const { count: queueCount } = await supabase
      .from('slot_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('status', 'pending');
    if (queueCount !== null && queueCount >= maxQueueSize) {
      const msgFull = wConfig?.srMsgQueueFull || '❌ {user}, the slot queue is full right now.';
      const msg = msgFull.replace(/\{user\}/g, viewer);
      if (seEnabled && seCost > 0) {
        // load creds just for chat
        const { data: seConnCheck } = await supabase.from('streamelements_connections').select('se_channel_id, se_jwt_token').eq('user_id', user_id).single();
        if (seConnCheck?.se_channel_id && seConnCheck?.se_jwt_token) await seBotSay(seConnCheck.se_channel_id, seConnCheck.se_jwt_token, msg);
      }
      return res.status(200).send(msg);
    }

    // ── H1: Per-viewer cooldown enforcement ──
    const cooldownSecs = parseInt(wConfig?.cooldownSeconds, 10) || 0;
    if (cooldownSecs > 0) {
      const cutoff = new Date(Date.now() - cooldownSecs * 1000).toISOString();
      const { data: recentReqs } = await supabase
        .from('slot_requests')
        .select('id')
        .eq('user_id', user_id)
        .ilike('requested_by', viewer)
        .gt('created_at', cutoff)
        .limit(1);
      if (recentReqs && recentReqs.length > 0) {
        const msgCool = wConfig?.srMsgCooldown || '⏳ {user}, please wait before requesting another slot.';
        const msg = msgCool.replace(/\{user\}/g, viewer);
        if (seEnabled && seCost > 0) {
          const { data: seConnCheck } = await supabase.from('streamelements_connections').select('se_channel_id, se_jwt_token').eq('user_id', user_id).single();
          if (seConnCheck?.se_channel_id && seConnCheck?.se_jwt_token) await seBotSay(seConnCheck.se_channel_id, seConnCheck.se_jwt_token, msg);
        }
        return res.status(200).send(msg);
      }
    }

    // ── H3: No-match rejection ──
    if (!dbMatchFound) {
      const msgNoMatch = wConfig?.srMsgNoMatch || '❌ {user}, could not find that slot. Please try again.';
      const msg = msgNoMatch.replace(/\{user\}/g, viewer);
      // Load SE creds for chat notification
      const { data: seConnCheck } = await supabase.from('streamelements_connections').select('se_channel_id, se_jwt_token').eq('user_id', user_id).single();
      if (seConnCheck?.se_channel_id && seConnCheck?.se_jwt_token) await seBotSay(seConnCheck.se_channel_id, seConnCheck.se_jwt_token, msg);
      return res.status(200).send(msg);
    }

    // Custom message templates (user-configurable from widget settings)
    const msgTemplates = {
      accepted: wConfig?.srMsgAccepted || '🎰 Added "{slot}" to the queue (requested by {user})',
      acceptedCost: wConfig?.srMsgAcceptedCost || '🎰 Added "{slot}" to the queue ({user} — {cost} points deducted)',
      notEnough: wConfig?.srMsgNotEnough || '❌ {user}, you need {cost} points to request a slot (you have {points}).',
      duplicate: wConfig?.srMsgDuplicate || '⚠️ {user}, "{slot}" is already in the queue (requested by {by}). No points taken!',
      noMatch: wConfig?.srMsgNoMatch || '❌ {user}, could not find that slot. Please try again.',
    };
    const fillTemplate = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

    // Load SE credentials from the user's streamelements_connections row
    let seChannelId = null;
    let seJwtToken = null;
    const { data: seConn } = await supabase
      .from('streamelements_connections')
      .select('se_channel_id, se_jwt_token')
      .eq('user_id', user_id)
      .single();
    if (seConn) {
      seChannelId = seConn.se_channel_id;
      seJwtToken = seConn.se_jwt_token;
    }

    /** Send a single chat message via SE bot, then return HTTP response. */
    const chatAndReply = async (msg) => {
      if (seChannelId && seJwtToken) await seBotSay(seChannelId, seJwtToken, msg);
      return res.status(200).send(msg);
    };

    console.log('[SR] user_id:', user_id, 'seEnabled:', seEnabled, 'seCost:', seCost,
      'hasSeCreds:', !!(seChannelId && seJwtToken));

    // ── Dedup: check for an existing pending row for this slot ──
    // We only check 'pending' here. 'denied' rows are intentionally ignored —
    // a denied row (failed points check) should NOT block a different viewer
    // from requesting the same slot, and it must NOT cause fall-through insertion
    // that resurrects the denied row as a new pending request.
    const { data: existing } = await supabase
      .from('slot_requests')
      .select('id, status, created_at, requested_by')
      .eq('user_id', user_id)
      .ilike('slot_name', resolvedName)
      .eq('status', 'pending')   // ← only block on pending, not denied
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const row = existing[0];
      const age = Date.now() - new Date(row.created_at).getTime();

      // Silent dedup for concurrent overlay instances (same viewer within 30s)
      if (age < 30000) return res.status(200).send('ok');

      // Genuine duplicate: viewer typed !sr again for an already-queued slot
      // Do NOT mutate created_at — preserves queue order
      const msg = fillTemplate(msgTemplates.duplicate, { slot: resolvedName, user: viewer, by: row.requested_by || '?' });
      return chatAndReply(msg);
    }

    // ── Before inserting, check points (if SE is enabled with a cost) ──
    // We do this BEFORE the INSERT so we never create a row that immediately
    // needs to be set 'denied'. Denied rows from the old pattern were the
    // source of the resurrection bug.
    if (seEnabled && seCost > 0) {
      if (!seChannelId || !seJwtToken) {
        const msg = '⚠️ StreamElements not configured. Ask the streamer to connect SE.';
        return chatAndReply(msg);
      }

      const cleanViewer = viewer.replace(/^@/, '').trim().toLowerCase();

      // 1) Check viewer's points
      const pointsRes = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seChannelId}/${cleanViewer}`,
        { headers: { 'Authorization': `Bearer ${seJwtToken}` } }
      );

      if (!pointsRes.ok) {
        const msg = `❌ Could not check points for ${viewer}. Are you a follower?`;
        return chatAndReply(msg);
      }

      const pointsData = await pointsRes.json();
      const viewerPoints = pointsData.points || 0;

      if (viewerPoints < seCost) {
        const msg = fillTemplate(msgTemplates.notEnough, { user: viewer, cost: seCost, points: viewerPoints, slot: resolvedName });
        return chatAndReply(msg);
      }

      // 2) Deduct points before inserting the row
      const deductRes = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seChannelId}/${cleanViewer}/${-seCost}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${seJwtToken}`, 'Content-Type': 'application/json' },
        }
      );

      if (!deductRes.ok) {
        const msg = `❌ Failed to deduct ${seCost} points from ${viewer}. Try again.`;
        return chatAndReply(msg);
      }

      // 3) Points successfully deducted — now insert the row with points_deducted recorded
      const { data: inserted, error: insertErr } = await supabase
        .from('slot_requests')
        .insert({
          user_id,
          slot_name: resolvedName,
          slot_image: slotImage,
          requested_by: viewer,
          status: 'pending',
          points_deducted: seCost,
        })
        .select('id')
        .single();

      if (insertErr) {
        // Unique index violation = concurrent call already inserted this slot.
        // Points were already deducted — refund immediately.
        console.error('[SR] Insert after deduct failed (likely race):', insertErr.code);
        if (insertErr.code === '23505') {
          // Refund the deducted points since we won't own the row
          await fetch(
            `https://api.streamelements.com/kappa/v2/points/${seChannelId}/${cleanViewer}/${seCost}`,
            { method: 'PUT', headers: { 'Authorization': `Bearer ${seJwtToken}`, 'Content-Type': 'application/json' } }
          ).catch(() => {});
          console.warn('[SR] Refunded points for duplicate insert race:', viewer, resolvedName);
        }
        return res.status(200).send('ok');
      }

      console.log('[SR] Inserted with points_deducted:', seCost, 'id:', inserted?.id);
      const msg = fillTemplate(msgTemplates.acceptedCost, { user: viewer, cost: seCost, slot: resolvedName });
      return chatAndReply(msg);
    }

    // ── Free request (no SE cost) — insert directly ──
    const { error: insertErr } = await supabase
      .from('slot_requests')
      .insert({
        user_id,
        slot_name: resolvedName,
        slot_image: slotImage,
        requested_by: viewer,
        status: 'pending',
        points_deducted: 0,
      });

    if (insertErr) {
      if (insertErr.code === '23505') return res.status(200).send('ok'); // concurrent duplicate
      console.error('[SR] Free insert error:', insertErr);
      return res.status(200).send('ok');
    }

    const msg = fillTemplate(msgTemplates.accepted, { user: viewer, slot: resolvedName });
    return chatAndReply(msg);
  } catch (err) {
    console.error('Slot request error:', err);
    return res.status(200).send('Something went wrong. Try again later.');
  }
}

/* ─── Song Request (?cmd=song&song=...&user_id=...) ─── */

async function handleSongRequest(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { song, user_id } = req.query;

  // Support individual word params w1..w10 as fallback for SE
  const songParam = song || buildFromWords(req.query);

  if (!songParam || !songParam.trim()) return res.status(200).send('Usage: !song <song name>');
  if (!user_id) return res.status(200).send('Missing streamer user_id');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(200).send('Server config error');
  if (!SPOTIFY_CLIENT_ID) return res.status(200).send('Server config error — Spotify not configured');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { data: tokenRow, error: dbErr } = await supabase
      .from('spotify_tokens')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (dbErr || !tokenRow) {
      return res.status(200).send('Streamer has not connected Spotify yet.');
    }

    let accessToken = tokenRow.access_token;

    // Refresh if expired
    if (Date.now() >= tokenRow.expires_at) {
      const refreshed = await refreshSpotifyToken(tokenRow.refresh_token);
      if (!refreshed) return res.status(200).send('Spotify token expired — streamer needs to reconnect.');
      accessToken = refreshed.access_token;

      await supabase.from('spotify_tokens').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user_id);
    }

    // Search Spotify
    const query = encodeURIComponent(songParam.trim());
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!searchRes.ok) return res.status(200).send('Spotify search failed. Try again later.');

    const searchData = await searchRes.json();
    const track = searchData.tracks?.items?.[0];
    if (!track) return res.status(200).send(`No results found for "${songParam.trim()}".`);

    // Add to queue
    const queueRes = await fetch(
      `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(track.uri)}`,
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (queueRes.status === 204 || queueRes.ok) {
      const artists = track.artists.map(a => a.name).join(', ');
      return res.status(200).send(`🎵 Queued: ${track.name} by ${artists}`);
    }
    if (queueRes.status === 404) return res.status(200).send('No active Spotify device found. Start playing something first!');
    if (queueRes.status === 403) return res.status(200).send('Spotify Premium is required for song requests.');

    return res.status(200).send('Could not add song to queue. Try again later.');
  } catch (err) {
    console.error('Song request error:', err);
    return res.status(200).send('Something went wrong. Try again later.');
  }
}

async function refreshSpotifyToken(refreshTokenVal) {
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshTokenVal,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshTokenVal,
      expires_at: Date.now() + data.expires_in * 1000,
    };
  } catch { return null; }
}

/* ─── Award SE Points (?cmd=award) POST body: { username, points } ─── */

/* ─── Slot Request Reject (?cmd=sr-reject) ─── */
/* Called from the config panel to reject a request and refund SE points */
async function handleSlotReject(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'Server config error' });

  const { request_id, user_id, message_template } = req.body || {};
  if (!request_id || !user_id) return res.status(400).json({ error: 'Missing request_id or user_id' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // C1: Verify caller is authenticated as the correct user
  const caller = await verifyJwt(supabase, req);
  if (!caller || caller.id !== user_id) return res.status(403).json({ error: 'Forbidden' });

  // 1) ATOMIC CLAIM — flip status from 'pending' → 'refunding' in a single UPDATE.
  //    If 0 rows come back, another call already claimed this row (double-click, double-tab).
  //    This is the only place we touch the row before side effects happen.
  const { data: claimed, error: claimErr } = await supabase
    .from('slot_requests')
    .update({ status: 'refunding' })
    .eq('id', request_id)
    .eq('user_id', user_id)
    .eq('status', 'pending')   // ← only succeeds when row is still pending
    .select('*')
    .single();

  if (claimErr || !claimed) {
    // Row not found, not pending, or another concurrent call already claimed it.
    console.warn('[sr-reject] Row not claimable (already processed?):', request_id);
    return res.status(409).json({ error: 'Request already processed or not found' });
  }

  const sr = claimed;

  // 2) Load widget config and SE credentials in parallel
  const [widgetRes, seConnRes] = await Promise.all([
    supabase
      .from('overlay_widgets')
      .select('config')
      .eq('user_id', user_id)
      .eq('widget_type', 'slot_requests')
      .single(),
    supabase
      .from('streamelements_connections')
      .select('se_channel_id, se_jwt_token')
      .eq('user_id', user_id)
      .single(),
  ]);

  const wConfig = widgetRes.data?.config || {};
  const seChannelId = seConnRes.data?.se_channel_id;
  const seJwtToken = seConnRes.data?.se_jwt_token;

  // 3) Determine how many points to refund.
  //    Prefer points_deducted stored on the row (recorded at request time).
  //    Fall back to current config cost if the column isn't populated yet
  //    (e.g. migration 1 hasn't been run, or request was created before this deploy).
  const pointsToRefund = (sr.points_deducted > 0)
    ? sr.points_deducted
    : (parseInt(wConfig.srSeCost, 10) || 0);

  // 4) Refund points — we check SE creds and whether there are points to return.
  //    We do NOT gate on srSeEnabled: the streamer may have toggled SE off after
  //    the request came in, but the points were already deducted and must be returned.
  let refunded = false;
  let refundFailed = false;
  if (pointsToRefund > 0 && seChannelId && seJwtToken && sr.requested_by) {
    const cleanViewer = sr.requested_by.replace(/^@/, '').trim().toLowerCase();
    try {
      const refundRes = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seChannelId}/${cleanViewer}/${pointsToRefund}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${seJwtToken}`, 'Content-Type': 'application/json' },
        }
      );
      if (refundRes.ok) {
        refunded = true;
      } else {
        refundFailed = true;
        console.error('[sr-reject] SE refund returned', refundRes.status, 'for', cleanViewer);
      }
    } catch (err) {
      refundFailed = true;
      console.error('[sr-reject] Refund network error:', err.message);
    }
  }

  // 5) Transition to terminal status.
  //    On refund failure we keep the row as 'refund_failed' so the admin can retry
  //    manually — we never silently delete a row where the refund didn't go through.
  const terminalStatus = refundFailed ? 'refund_failed' : 'refunded';
  await supabase
    .from('slot_requests')
    .update({
      status: terminalStatus,
      refunded_at: refunded ? new Date().toISOString() : null,
      refunded_points: refunded ? pointsToRefund : null,
      rejection_reason: refundFailed ? 'SE API refund failed' : null,
    })
    .eq('id', request_id);

  // 6) Send chat notification — always fires if SE creds are present.
  //    {refund} resolves to e.g. "500 points refunded!" or empty string if no points.
  if (seChannelId && seJwtToken) {
    const defaultMsg = refunded
      ? '🚫 {user}, your request for "{slot}" was rejected. {refund}'
      : '🚫 {user}, your request for "{slot}" was rejected.';
    const tpl = message_template || wConfig.srMsgRejected || defaultMsg;
    const refundText = refunded ? `${pointsToRefund} points refunded!` : '';
    const msg = tpl
      .replace(/\{user\}/g, sr.requested_by || '?')
      .replace(/\{slot\}/g, sr.slot_name || '?')
      .replace(/\{cost\}/g, String(pointsToRefund))
      .replace(/\{refund\}/g, refundText)
      .trim();
    await seBotSay(seChannelId, seJwtToken, msg);
  }

  if (refundFailed) {
    return res.status(200).json({
      success: false,
      refunded: false,
      error: 'Points refund failed — request marked as refund_failed for manual retry.',
    });
  }

  return res.status(200).json({ success: true, refunded, pointsRefunded: pointsToRefund });
}

/* ─── Slot Request Clear All (?cmd=sr-clear-all) ─── */
/* Refunds SE points for ALL pending requests, then deletes them */
async function handleSlotClearAll(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'Server config error' });

  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // C1: Verify caller is authenticated as the correct user
  const caller = await verifyJwt(supabase, req);
  if (!caller || caller.id !== user_id) return res.status(403).json({ error: 'Forbidden' });

  // 1) Fetch all pending requests — include points_deducted so we refund exactly what was taken
  const { data: requests, error: reqErr } = await supabase
    .from('slot_requests')
    .select('id, slot_name, requested_by, points_deducted')
    .eq('user_id', user_id)
    .eq('status', 'pending');

  if (reqErr || !requests || requests.length === 0) {
    return res.status(200).json({ success: true, refunded: 0, total: 0 });
  }

  // 2) Load widget config and SE credentials in parallel
  const [widgetRes, seConnRes] = await Promise.all([
    supabase.from('overlay_widgets').select('config').eq('user_id', user_id).eq('widget_type', 'slot_requests').single(),
    supabase.from('streamelements_connections').select('se_channel_id, se_jwt_token').eq('user_id', user_id).single(),
  ]);
  const wConfig = widgetRes.data?.config || {};
  const fallbackCost = parseInt(wConfig.srSeCost, 10) || 0;
  const seChannelId = seConnRes.data?.se_channel_id;
  const seJwtToken = seConnRes.data?.se_jwt_token;

  // 3) Refund points — no longer gated on srSeEnabled.
  //    Points were deducted at request time; we must always attempt to return them.
  //    Group by viewer and sum their individual points_deducted values.
  let refundedCount = 0;
  if (seChannelId && seJwtToken) {
    // Build per-viewer refund totals using points_deducted stored on each row.
    // Fall back to fallbackCost (current config) for rows inserted before this deploy.
    const viewerTotals = {};
    for (const r of requests) {
      if (!r.requested_by || r.requested_by === 'anonymous') continue;
      const viewer = r.requested_by.replace(/^@/, '').trim().toLowerCase();
      const pts = (r.points_deducted > 0) ? r.points_deducted : fallbackCost;
      if (pts > 0) viewerTotals[viewer] = (viewerTotals[viewer] || 0) + pts;
    }

    for (const [viewer, totalRefund] of Object.entries(viewerTotals)) {
      try {
        const refundRes = await fetch(
          `https://api.streamelements.com/kappa/v2/points/${seChannelId}/${viewer}/${totalRefund}`,
          { method: 'PUT', headers: { 'Authorization': `Bearer ${seJwtToken}`, 'Content-Type': 'application/json' } }
        );
        if (refundRes.ok) {
          refundedCount++;
          console.log(`[sr-clear-all] Refunded ${totalRefund} pts to ${viewer}`);
        } else {
          console.error(`[sr-clear-all] SE refund failed for ${viewer}:`, refundRes.status);
        }
      } catch (err) {
        console.error(`[sr-clear-all] Refund error for ${viewer}:`, err.message);
      }
    }
  }

  // 4) Soft-delete: mark rows as 'cancelled' (never hard-delete — preserves audit trail
  //    and prevents unique index from allowing re-insertion of the same slot).
  const ids = requests.map(r => r.id);
  await supabase.from('slot_requests').update({ status: 'cancelled' }).in('id', ids);

  // 5) Send a single chat announcement if configured
  if (seChannelId && seJwtToken) {
    const defaultMsg = wConfig.srMsgClearAll || '🗑️ The slot request queue has been cleared. All points have been refunded!';
    if (defaultMsg.trim()) {
      await seBotSay(seChannelId, seJwtToken, defaultMsg);
    }
  }

  return res.status(200).json({ success: true, refunded: refundedCount, total: requests.length });
}

/* ─── Award Points (?cmd=award) ─── */

async function handleAwardPoints(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, points } = req.body;

    if (!username || points === undefined || points === null) {
      return res.status(400).json({ error: 'Missing required fields: username and points' });
    }

    const pointsNum = parseInt(points, 10);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number' });
    }

    const SE_JWT_TOKEN = process.env.STREAMELEMENTS_JWT_TOKEN || process.env.VITE_SE_JWT_TOKEN;
    const SE_CHANNEL_ID = process.env.STREAMELEMENTS_CHANNEL_ID || process.env.VITE_SE_CHANNEL_ID;

    if (!SE_JWT_TOKEN || !SE_CHANNEL_ID) {
      return res.status(500).json({ error: 'StreamElements integration not configured.' });
    }

    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();

    const response = await fetch(
      `https://api.streamelements.com/kappa/v2/points/${SE_CHANNEL_ID}/${cleanUsername}/${pointsNum}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SE_JWT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText }; }
      return res.status(response.status).json({ error: 'Failed to award points', details: errorData });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      message: `Successfully awarded ${pointsNum} points to ${cleanUsername}`,
      data,
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

/* ─── Spotify Token Refresh (?cmd=spotify-refresh) ─── */

async function handleSpotifyRefresh(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SPOTIFY_CLIENT_ID) {
    return res.status(500).json({ error: 'Server config error' });
  }

  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: tokenRow, error: readErr } = await supabase
    .from('spotify_tokens')
    .select('refresh_token, access_token, expires_at')
    .eq('user_id', user_id)
    .single();

  if (readErr || !tokenRow?.refresh_token) {
    return res.status(404).json({ error: 'No Spotify tokens found for this user' });
  }

  if (tokenRow.expires_at && Date.now() < tokenRow.expires_at - 60000) {
    return res.status(200).json({
      access_token: tokenRow.access_token,
      expires_at: tokenRow.expires_at,
    });
  }

  let freshData;
  try {
    const spotRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: tokenRow.refresh_token,
      }),
    });

    if (!spotRes.ok) {
      const err = await spotRes.json().catch(() => ({}));
      return res.status(401).json({ error: err.error_description || 'Token refresh failed' });
    }

    freshData = await spotRes.json();
  } catch (err) {
    return res.status(502).json({ error: 'Failed to contact Spotify' });
  }

  const newAccessToken = freshData.access_token;
  const newRefreshToken = freshData.refresh_token || tokenRow.refresh_token;
  const newExpiresAt = Date.now() + freshData.expires_in * 1000;

  await supabase.from('spotify_tokens').update({
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user_id);

  const tokenPayload = {
    spotify_access_token: newAccessToken,
    spotify_refresh_token: newRefreshToken,
    spotify_expires_at: newExpiresAt,
  };

  const { data: widgets } = await supabase
    .from('overlay_widgets')
    .select('id, config, widget_type')
    .eq('user_id', user_id)
    .in('widget_type', ['navbar', 'spotify_now_playing']);

  if (widgets?.length) {
    for (const w of widgets) {
      await supabase.from('overlay_widgets').update({
        config: { ...w.config, ...tokenPayload },
        updated_at: new Date().toISOString(),
      }).eq('id', w.id);
    }
  }

  return res.status(200).json({
    access_token: newAccessToken,
    expires_at: newExpiresAt,
  });
}

/* ─── Prediction SE Chat Announce (?cmd=pred-say&user_id=...&message=...) ─── */

async function handlePredSay(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server config error' });
  }

  const { user_id, message } = req.query;
  if (!user_id || !message) return res.status(400).json({ error: 'user_id and message required' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get SE credentials
  const { data: seConn } = await supabase
    .from('streamelements_connections')
    .select('se_channel_id, se_jwt_token')
    .eq('user_id', user_id)
    .maybeSingle();

  if (!seConn?.se_channel_id || !seConn?.se_jwt_token) {
    return res.status(200).json({ ok: false, reason: 'No SE connection' });
  }

  await seBotSay(seConn.se_channel_id, seConn.se_jwt_token, message);
  return res.status(200).json({ ok: true });
}
