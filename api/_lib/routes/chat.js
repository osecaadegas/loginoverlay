const BTTV_API_BASE = 'https://api.betterttv.net/3';
const BTTV_CACHE_TTL_MS = 20 * 60 * 1000;
const TWITCH_TOKEN_TTL_BUFFER_MS = 60 * 1000;

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || process.env.VITE_TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

const runtimeCache = globalThis.__streamersCenterChatEmotesCache || {
  entries: new Map(),
};
globalThis.__streamersCenterChatEmotesCache = runtimeCache;

let twitchAppTokenCache = null;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getChatRouteSegments(req) {
  const dynamicPath = req.query?.path;
  const segments = Array.isArray(dynamicPath)
    ? dynamicPath
    : typeof dynamicPath === 'string'
      ? dynamicPath.split('/').filter(Boolean)
      : new URL(req.url, 'http://localhost').pathname
        .split('/')
        .filter(Boolean)
        .filter((segment) => segment !== 'api');

  return segments[0] === 'chat' ? segments.slice(1) : segments;
}

function parseBoolean(value, fallback = true) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  return fallback;
}

function normalizeTwitchLogin(value) {
  return String(value || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

function isNumericTwitchId(value) {
  return /^\d{1,24}$/.test(String(value || '').trim());
}

function normalizeBttvEmote(emote, source) {
  if (!emote || !emote.id || !emote.code) return null;
  return {
    id: String(emote.id),
    code: String(emote.code),
    imageType: emote.imageType ? String(emote.imageType) : '',
    animated: Boolean(emote.animated),
    source,
  };
}

function getCachedValue(key) {
  const entry = runtimeCache.entries.get(key);
  if (!entry) return { hit: false };
  if (entry.expiresAt > Date.now()) return { hit: true, value: entry.value };
  if (entry.promise) return { hit: true, value: entry.promise, isPromise: true };
  runtimeCache.entries.delete(key);
  return { hit: false };
}

function setCachedValue(key, value, ttlMs = BTTV_CACHE_TTL_MS) {
  runtimeCache.entries.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    promise: null,
  });
  return value;
}

function getCachedPromise(key, loader, ttlMs = BTTV_CACHE_TTL_MS) {
  const cached = getCachedValue(key);
  if (cached.hit) {
    return cached.isPromise ? cached.value : Promise.resolve(cached.value);
  }

  const promise = loader()
    .then((value) => setCachedValue(key, value, ttlMs))
    .catch((error) => {
      runtimeCache.entries.delete(key);
      throw error;
    });

  runtimeCache.entries.set(key, {
    value: null,
    expiresAt: 0,
    promise,
  });

  return promise;
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`Request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function getBttvGlobalEmotes() {
  return getCachedPromise('bttv:global', async () => {
    try {
      const emotes = await fetchJson(`${BTTV_API_BASE}/cached/emotes/global`);
      return Array.isArray(emotes)
        ? emotes.map((emote) => normalizeBttvEmote(emote, 'global')).filter(Boolean)
        : [];
    } catch (error) {
      console.warn('[chat-emotes] Failed to load BTTV global emotes:', error?.message || error);
      return [];
    }
  });
}

function getBttvChannelEmotes(channelId) {
  if (!channelId) return Promise.resolve([]);

  return getCachedPromise(`bttv:twitch:${channelId}`, async () => {
    try {
      const payload = await fetchJson(`${BTTV_API_BASE}/cached/users/twitch/${encodeURIComponent(channelId)}`);
      const shared = Array.isArray(payload?.sharedEmotes)
        ? payload.sharedEmotes.map((emote) => normalizeBttvEmote(emote, 'shared')).filter(Boolean)
        : [];
      const owned = Array.isArray(payload?.channelEmotes)
        ? payload.channelEmotes.map((emote) => normalizeBttvEmote(emote, 'channel')).filter(Boolean)
        : [];
      return [...shared, ...owned];
    } catch (error) {
      if (error?.status !== 404) {
        console.warn('[chat-emotes] Failed to load BTTV channel emotes:', error?.message || error);
      }
      return [];
    }
  });
}

async function getTwitchAppToken() {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) return null;
  if (twitchAppTokenCache?.accessToken && twitchAppTokenCache.expiresAt > Date.now()) {
    return twitchAppTokenCache.accessToken;
  }

  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials',
  });

  const payload = await fetchJson(`https://id.twitch.tv/oauth2/token?${params.toString()}`, {
    method: 'POST',
  });

  const expiresInMs = Number(payload?.expires_in || 0) * 1000;
  twitchAppTokenCache = {
    accessToken: payload?.access_token || null,
    expiresAt: Date.now() + Math.max(expiresInMs - TWITCH_TOKEN_TTL_BUFFER_MS, 60 * 1000),
  };

  return twitchAppTokenCache.accessToken;
}

async function resolveTwitchUserId(identifier) {
  const normalized = String(identifier || '').trim();
  if (!normalized) return null;
  if (isNumericTwitchId(normalized)) return normalized;

  const login = normalizeTwitchLogin(normalized);
  if (!login) return null;

  return getCachedPromise(`twitch:login:${login}`, async () => {
    try {
      const token = await getTwitchAppToken();
      if (!token) return null;

      const url = new URL('https://api.twitch.tv/helix/users');
      url.searchParams.set('login', login);

      const payload = await fetchJson(url.toString(), {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      });

      const user = Array.isArray(payload?.data) ? payload.data[0] : null;
      return user?.id ? String(user.id) : null;
    } catch (error) {
      console.warn('[chat-emotes] Failed to resolve Twitch channel:', error?.message || error);
      return null;
    }
  });
}

function buildEmotePayload(globalEmotes, channelEmotes) {
  const map = new Map();

  for (const emote of globalEmotes) {
    map.set(emote.code, emote);
  }

  for (const emote of channelEmotes) {
    map.set(emote.code, emote);
  }

  return Array.from(map.values());
}

export default async function chatHandler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const routeSegments = getChatRouteSegments(req);
  if (routeSegments[0] !== 'emotes' || routeSegments[1] !== 'bttv') {
    sendJson(res, 404, { error: 'Chat route not found' });
    return;
  }

  const includeGlobal = parseBoolean(req.query?.global, true);
  const includeChannel = parseBoolean(req.query?.channel, true);
  const requestedChannel =
    req.query?.channelId ||
    req.query?.twitchUserId ||
    req.query?.broadcasterId ||
    req.query?.id ||
    req.query?.channelName ||
    req.query?.channel ||
    req.query?.login ||
    req.query?.twitchChannel ||
    '';

  const resolvedChannelId = includeChannel ? await resolveTwitchUserId(requestedChannel) : null;

  const [globalEmotes, channelEmotes] = await Promise.all([
    includeGlobal ? getBttvGlobalEmotes() : Promise.resolve([]),
    includeChannel && resolvedChannelId ? getBttvChannelEmotes(resolvedChannelId) : Promise.resolve([]),
  ]);

  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=1200, stale-while-revalidate=600');
  sendJson(res, 200, {
    emotes: buildEmotePayload(globalEmotes, channelEmotes),
    channelId: resolvedChannelId,
    ttlSeconds: Math.floor(BTTV_CACHE_TTL_MS / 1000),
  });
}
