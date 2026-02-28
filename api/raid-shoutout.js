/**
 * /api/raid-shoutout.js — Vercel Serverless Function
 *
 * Triggered when a streamer wants to shoutout a raider.
 * 1. Resolves the raider's Twitch username → user ID + profile
 * 2. Fetches their top clips from Twitch Helix API
 * 3. Picks a random clip
 * 4. Inserts a shoutout alert into Supabase for the overlay to consume
 *
 * POST /api/raid-shoutout
 * Body: { raiderUsername, userId, triggeredBy? }
 *
 * Also supports GET with query params for simple webhook triggers:
 * GET /api/raid-shoutout?raider=username&userId=xxx&secret=xxx
 */
import { createClient } from '@supabase/supabase-js';

// ─── Twitch App Access Token (Client Credentials) ───
let cachedToken = null;
let tokenExpiresAt = 0;

async function getTwitchAppToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET environment variables');
  }

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min early
  return cachedToken;
}

// ─── Twitch Helix helpers ───
async function twitchGet(endpoint, params = {}) {
  const token = await getTwitchAppToken();
  const url = new URL(`https://api.twitch.tv/helix/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch API ${endpoint} failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function resolveUser(username) {
  const { data } = await twitchGet('users', { login: username.toLowerCase() });
  return data?.[0] || null;
}

async function fetchClips(broadcasterId, maxClips = 50) {
  const { data } = await twitchGet('clips', {
    broadcaster_id: broadcasterId,
    first: String(Math.min(maxClips, 100)),
  });
  return data || [];
}

async function fetchChannel(broadcasterId) {
  const { data } = await twitchGet('channels', { broadcaster_id: broadcasterId });
  return data?.[0] || null;
}

function pickRandomClip(clips, maxDuration = 60) {
  // Prefer shorter clips (< maxDuration seconds) for alerts
  const shortClips = clips.filter(c => c.duration <= maxDuration);
  const pool = shortClips.length > 0 ? shortClips : clips;

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Resolve the direct .mp4 video URL from a clip's thumbnail URL.
 * Server-side only — tries HEAD requests against multiple CDN URL patterns
 * to maximise hit-rate (Twitch uses several CDN hostnames and URL shapes).
 * Returns the first verified URL or null.
 */
async function resolveClipVideoUrl(thumbnailUrl) {
  if (!thumbnailUrl) return null;

  // Strip query params first
  const clean = thumbnailUrl.split('?')[0];

  // Primary derivation: strip "-preview-WxH.jpg"
  const primary = clean.replace(/-preview-\d+x\d+\.jpg$/i, '.mp4');
  if (primary === clean) return null; // regex didn't match

  // Build candidate list (different CDN hostnames)
  const candidates = [primary];
  if (primary.includes('clips-media-assets2')) {
    candidates.push(primary.replace('clips-media-assets2', 'clips-media-assets'));
  } else if (primary.includes('clips-media-assets.')) {
    candidates.push(primary.replace('clips-media-assets.', 'clips-media-assets2.'));
  }
  // Also try URL-decoded variant (AT-cm%7C → AT-cm|)
  const decoded = decodeURIComponent(primary);
  if (decoded !== primary) candidates.push(decoded);

  for (const url of candidates) {
    try {
      const headRes = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://clips.twitch.tv/',
        },
      });
      if (headRes.ok) {
        console.log('[RaidShoutout] Verified clip video URL:', url);
        return url;
      }
      console.warn(`[RaidShoutout] HEAD ${headRes.status}: ${url}`);
    } catch (err) {
      console.warn(`[RaidShoutout] HEAD failed for ${url}: ${err.message}`);
    }
  }

  // Even if HEAD failed, return the primary URL so the proxy can try at runtime
  // (the CDN might block HEAD but allow GET from a different IP)
  console.log('[RaidShoutout] HEAD checks failed — returning primary URL for proxy to try:', primary);
  return primary;
}

// ─── Main Handler ───
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Shoutout-Secret');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Support both POST body and GET query params (for SE webhook)
    let raiderUsername, userId, triggeredBy, secret;

    if (req.method === 'POST') {
      ({ raiderUsername, userId, triggeredBy } = req.body || {});
    } else if (req.method === 'GET') {
      raiderUsername = req.query.raider;
      userId = req.query.userId;
      triggeredBy = req.query.triggeredBy || 'chat_command';
      secret = req.query.secret;
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── Validate required fields ──
    if (!raiderUsername) {
      return res.status(400).json({ error: 'Missing raiderUsername' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId (overlay owner)' });
    }

    // ── Optional: verify webhook secret for GET triggers ──
    const expectedSecret = process.env.SHOUTOUT_WEBHOOK_SECRET;
    if (expectedSecret && req.method === 'GET') {
      const provided = secret || req.headers['x-shoutout-secret'];
      if (provided !== expectedSecret) {
        return res.status(403).json({ error: 'Invalid webhook secret' });
      }
    }

    // ── For POST: verify auth via Bearer token (optional, depends on trigger) ──
    if (req.method === 'POST' && !triggeredBy?.startsWith('webhook')) {
      const supabaseAuth = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
        if (authError || !user) {
          return res.status(401).json({ error: 'Invalid auth token' });
        }
        // Override userId with authenticated user
        userId = user.id;
      }
    }

    // ── Step 1: Resolve Twitch user ──
    const twitchUser = await resolveUser(raiderUsername);
    if (!twitchUser) {
      return res.status(404).json({ error: `Twitch user "${raiderUsername}" not found` });
    }

    // ── Step 2: Fetch channel info (for current game) ──
    const channel = await fetchChannel(twitchUser.id);

    // ── Step 3: Fetch clips ──
    const clips = await fetchClips(twitchUser.id, 50);
    const clip = pickRandomClip(clips, 60);

    // ── Step 4: Resolve direct .mp4 video URL (server-side, no CORS) ──
    const clipVideoUrl = clip ? await resolveClipVideoUrl(clip.thumbnail_url) : null;

    // ── Step 5: Build alert payload ──
    const alertPayload = {
      user_id: userId,
      raider_username: twitchUser.login,
      raider_display_name: twitchUser.display_name,
      raider_avatar_url: twitchUser.profile_image_url,
      raider_game: channel?.game_name || null,
      clip_id: clip?.id || null,
      clip_url: clip?.url || null,
      clip_embed_url: clip ? `https://clips.twitch.tv/embed?clip=${clip.id}&parent=${process.env.OVERLAY_DOMAIN || 'localhost'}` : null,
      clip_thumbnail_url: clip?.thumbnail_url || null,
      clip_video_url: clipVideoUrl,
      clip_title: clip?.title || null,
      clip_duration: clip?.duration || null,
      clip_view_count: clip?.view_count || null,
      clip_game_name: clip?.game_name || null,
      status: 'pending',
      triggered_by: triggeredBy || 'manual',
    };

    // ── Step 6: Insert into Supabase ──
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: alert, error: insertError } = await supabase
      .from('shoutout_alerts')
      .insert(alertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create shoutout alert', details: insertError.message });
    }

    return res.status(200).json({
      success: true,
      alert: {
        id: alert.id,
        raider: alert.raider_display_name,
        hasClip: !!alert.clip_id,
        clipTitle: alert.clip_title,
        game: alert.raider_game,
      },
    });

  } catch (error) {
    console.error('Raid shoutout API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
