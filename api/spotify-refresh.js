import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPOTIFY_CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SPOTIFY_CLIENT_ID) {
    return res.status(500).json({ error: 'Server config error' });
  }

  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  /* 1. Read current refresh token from spotify_tokens table */
  const { data: tokenRow, error: readErr } = await supabase
    .from('spotify_tokens')
    .select('refresh_token, access_token, expires_at')
    .eq('user_id', user_id)
    .single();

  if (readErr || !tokenRow?.refresh_token) {
    return res.status(404).json({ error: 'No Spotify tokens found for this user' });
  }

  /* If access token is still valid (>60s remaining), return it as-is */
  if (tokenRow.expires_at && Date.now() < tokenRow.expires_at - 60000) {
    return res.status(200).json({
      access_token: tokenRow.access_token,
      expires_at: tokenRow.expires_at,
    });
  }

  /* 2. Refresh the token via Spotify API */
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

  /* 3. Persist to spotify_tokens table (single source of truth) */
  await supabase.from('spotify_tokens').update({
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user_id);

  /* 4. Also update all widget configs that store Spotify tokens */
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
