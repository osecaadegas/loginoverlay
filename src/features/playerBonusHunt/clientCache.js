const CACHE_PREFIX = 'streamerscenter.playerBonusHunt.';

export const NEW_HUNT_DRAFT_CACHE_KEY = `${CACHE_PREFIX}newDraft.v1`;

export function huntDetailCacheKey(huntId) {
  return `${CACHE_PREFIX}huntDetail.${huntId}.v1`;
}

export function readPlayerCache(key) {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writePlayerCache(key, value) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...value, cachedAt: Date.now() }));
  } catch {
    // Local storage can be disabled or full; the server-backed flow should still work.
  }
}

export function removePlayerCache(key) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}
