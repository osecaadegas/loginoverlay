import { createClient } from '@supabase/supabase-js';

/**
 * /api/spotify/song-request
 *
 * Called by StreamElements custom command:
 *   !song <query>
 *   → ${customapi.https://yoursite.com/api/spotify/song-request?song=${querystring}&user_id=STREAMER_USER_ID}
 *
 * Query params:
 *   song     — search query (required)
 *   user_id  — Supabase user ID of the streamer whose Spotify to queue on (required)
 *
 * Uses service_role key to read spotify_tokens (bypasses RLS).
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPOTIFY_CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { song, user_id } = req.query;

  if (!song || !song.trim()) {
    return res.status(200).send('Usage: !song <song name>');
  }
  if (!user_id) {
    return res.status(200).send('Missing streamer user_id');
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(200).send('Server config error — Supabase not configured');
  }
  if (!SPOTIFY_CLIENT_ID) {
    return res.status(200).send('Server config error — Spotify not configured');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Get streamer's Spotify tokens
    const { data: tokenRow, error: dbErr } = await supabase
      .from('spotify_tokens')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (dbErr || !tokenRow) {
      return res.status(200).send('Streamer has not connected Spotify yet.');
    }

    let accessToken = tokenRow.access_token;

    // 2. Refresh token if expired
    if (Date.now() >= tokenRow.expires_at) {
      const refreshed = await refreshToken(tokenRow.refresh_token);
      if (!refreshed) {
        return res.status(200).send('Spotify token expired — streamer needs to reconnect.');
      }
      accessToken = refreshed.access_token;

      // Persist refreshed tokens
      await supabase.from('spotify_tokens').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user_id);
    }

    // 3. Search Spotify for the song
    const query = encodeURIComponent(song.trim());
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!searchRes.ok) {
      return res.status(200).send('Spotify search failed. Try again later.');
    }

    const searchData = await searchRes.json();
    const track = searchData.tracks?.items?.[0];

    if (!track) {
      return res.status(200).send(`No results found for "${song}".`);
    }

    // 4. Add track to queue
    const queueRes = await fetch(
      `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(track.uri)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (queueRes.status === 204 || queueRes.ok) {
      const artists = track.artists.map(a => a.name).join(', ');
      return res.status(200).send(`🎵 Queued: ${track.name} by ${artists}`);
    }

    if (queueRes.status === 404) {
      return res.status(200).send('No active Spotify device found. Start playing something first!');
    }

    if (queueRes.status === 403) {
      return res.status(200).send('Spotify Premium is required for song requests.');
    }

    return res.status(200).send('Could not add song to queue. Try again later.');
  } catch (err) {
    console.error('Song request error:', err);
    return res.status(200).send('Something went wrong. Try again later.');
  }
}

async function refreshToken(refreshTokenVal) {
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
  } catch {
    return null;
  }
}
