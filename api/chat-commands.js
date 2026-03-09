import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { cmd } = req.query;

  switch (cmd) {
    case 'sr':    return handleSlotRequest(req, res);
    case 'song':  return handleSongRequest(req, res);
    case 'award': return handleAwardPoints(req, res);
    default:      return res.status(400).json({ error: 'Unknown cmd. Use ?cmd=sr|song|award' });
  }
}

/* ─── Slot Request (?cmd=sr&slot=...&user_id=...&requester=...) ─── */

async function handleSlotRequest(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slot, user_id, requester } = req.query;

  if (!slot || !slot.trim()) return res.status(200).send('Usage: !sr <slot name>');
  if (!user_id) return res.status(200).send('Missing streamer user_id');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(200).send('Server config error');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const slotName = slot.trim();
  const viewer = (requester || 'anonymous').trim();

  try {
    // Check for duplicate
    const { data: existing } = await supabase
      .from('slot_requests')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .ilike('slot_name', slotName)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(200).send(`"${slotName}" is already in the queue!`);
    }

    // Look up slot image
    let slotImage = null;
    const { data: matchedSlot } = await supabase
      .from('slots')
      .select('name, image')
      .ilike('name', `%${slotName}%`)
      .limit(1);

    if (matchedSlot && matchedSlot.length > 0 && matchedSlot[0].image) {
      slotImage = matchedSlot[0].image;
    }

    // Insert request
    const { error: insertErr } = await supabase
      .from('slot_requests')
      .insert({
        user_id,
        slot_name: slotName,
        slot_image: slotImage,
        requested_by: viewer,
        status: 'pending',
      });

    if (insertErr) {
      console.error('Insert error:', insertErr);
      return res.status(200).send('Could not add request. Try again later.');
    }

    return res.status(200).send(`🎰 Added "${slotName}" to the queue (requested by ${viewer})`);
  } catch (err) {
    console.error('Slot request error:', err);
    return res.status(200).send('Something went wrong. Try again later.');
  }
}

/* ─── Song Request (?cmd=song&song=...&user_id=...) ─── */

async function handleSongRequest(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { song, user_id } = req.query;

  if (!song || !song.trim()) return res.status(200).send('Usage: !song <song name>');
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
    const query = encodeURIComponent(song.trim());
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!searchRes.ok) return res.status(200).send('Spotify search failed. Try again later.');

    const searchData = await searchRes.json();
    const track = searchData.tracks?.items?.[0];
    if (!track) return res.status(200).send(`No results found for "${song}".`);

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
