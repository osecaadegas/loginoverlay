/**
 * spotifyAuth.js — Spotify PKCE OAuth utility for overlay "Now Playing".
 *
 * Usage:
 *   1. Set VITE_SPOTIFY_CLIENT_ID in your .env
 *   2. Add redirect URI in Spotify Developer Dashboard:
 *      https://yourdomain.com/spotify-callback
 *   3. Call startSpotifyAuth() from the Navbar config panel
 *   4. The callback page will store tokens and close
 */

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = `${window.location.origin}/spotify-callback`;
const SCOPES = 'user-read-currently-playing user-read-playback-state';

/* ─── PKCE helpers ─── */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/* ─── Public API ─── */

/**
 * Start Spotify OAuth PKCE flow — opens popup.
 * Returns a Promise that resolves with { access_token, refresh_token, expires_at }
 * or rejects if user closes popup / error.
 */
export async function startSpotifyAuth() {
  if (!CLIENT_ID) {
    throw new Error('VITE_SPOTIFY_CLIENT_ID is not set. Add it to your .env file.');
  }

  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64urlEncode(hashed);

  // Store verifier for the callback
  sessionStorage.setItem('spotify_code_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const popup = window.open(authUrl, 'spotify-auth', 'width=500,height=700');
    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for message from callback page
    const handler = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'spotify-callback') return;

      window.removeEventListener('message', handler);

      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }

      try {
        const tokens = await exchangeCode(event.data.code);
        resolve(tokens);
      } catch (err) {
        reject(err);
      }
    };

    window.addEventListener('message', handler);

    // Detect popup close
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handler);
        reject(new Error('Auth popup was closed'));
      }
    }, 500);
  });
}

/**
 * Exchange auth code for tokens using PKCE (no secret needed).
 */
async function exchangeCode(code) {
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) throw new Error('Missing code verifier');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || 'Token exchange failed');
  }

  const data = await res.json();
  sessionStorage.removeItem('spotify_code_verifier');

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Refresh an expired access token.
 */
export async function refreshSpotifyToken(refreshToken) {
  if (!CLIENT_ID) throw new Error('VITE_SPOTIFY_CLIENT_ID not set');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error('Token refresh failed');

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Fetch currently playing track. Returns { artist, track, isPlaying, albumArt } or null.
 * Throws on 401 so callers can trigger a token refresh.
 */
export async function fetchNowPlaying(accessToken) {
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 204) return null;          // nothing playing
  if (res.status === 401) {
    const err = new Error('Spotify token expired');
    err.status = 401;
    throw err;
  }
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.item) return null;

  return {
    artist: data.item.artists?.map(a => a.name).join(', ') || 'Unknown',
    track: data.item.name || 'Unknown',
    isPlaying: data.is_playing,
    albumArt: data.item.album?.images?.[0]?.url || '',
  };
}
