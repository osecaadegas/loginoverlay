import { createSupabaseAdmin, requireUser } from './_lib/api-auth.js';

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || process.env.VITE_TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
let appToken = null;
let appTokenExpiresAt = 0;

export function normalizeTwitchLogin(value) {
  const login = String(value || '')
    .trim()
    .replace(/^https?:\/\/(?:www\.)?twitch\.tv\//i, '')
    .replace(/^@/, '')
    .replace(/\/$/, '')
    .toLowerCase();
  return /^[a-z0-9_]{3,25}$/.test(login) ? login : '';
}

export async function fetchTwitchProfiles(logins, { fetcher = fetch, clientId = TWITCH_CLIENT_ID, clientSecret = TWITCH_CLIENT_SECRET } = {}) {
  if (!clientId || !clientSecret) throw new Error('Twitch profile lookup is not configured');
  if (!appToken || appTokenExpiresAt <= Date.now()) {
    const response = await fetcher('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Twitch authentication unavailable');
    const token = await response.json();
    if (!token.access_token) throw new Error('Twitch authentication unavailable');
    appToken = token.access_token;
    appTokenExpiresAt = Date.now() + Math.max(30, Number(token.expires_in || 3600) - 60) * 1000;
  }

  const url = new URL('https://api.twitch.tv/helix/users');
  logins.forEach((login) => url.searchParams.append('login', login));
  const response = await fetcher(url, {
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${appToken}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Twitch profiles unavailable');
  const payload = await response.json();
  return Object.fromEntries((payload.data || []).filter((user) => logins.includes(String(user.login || '').toLowerCase())).map((user) => [
    String(user.login).toLowerCase(),
    { username: user.display_name || user.login, avatarUrl: user.profile_image_url || '' },
  ]));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!String(req.headers?.authorization || '').startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    await requireUser(req, createSupabaseAdmin());
    const input = req.body?.logins;
    if (!Array.isArray(input) || input.length > 16 || input.some((value) => typeof value !== 'string' || value.length > 100)) {
      return res.status(400).json({ error: 'Provide up to 16 Twitch usernames' });
    }
    const logins = [...new Set(input.map(normalizeTwitchLogin).filter(Boolean))];
    if (!logins.length) return res.status(200).json({ profiles: {} });
    const profiles = await fetchTwitchProfiles(logins);
    return res.status(200).json({ profiles });
  } catch (error) {
    const status = error.statusCode || (error.message === 'Twitch profile lookup is not configured' ? 503 : 502);
    return res.status(status).json({ error: status === 401 ? 'Authentication required' : 'Avatar lookup is temporarily unavailable' });
  }
}
