const GAME_ID_KEYS = ['gameid', 'game_id', 'game', 'gamecode', 'game_code', 'symbol', 'g', 'slug', 'launchgameid'];

export function safeText(value, max = 160) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, max);
}

function normalizeDomain(hostname) {
  return String(hostname || '').toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9.-]/g, '').slice(0, 160);
}

function safeIdentifier(value, max = 96) {
  const safe = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '');
  return safe.slice(0, max) || null;
}

function pathPattern(pathname) {
  const parts = String(pathname || '/').split('/').filter(Boolean).slice(0, 8).map((part) => {
    const clean = decodeURIComponent(part).replace(/[^a-zA-Z0-9._:-]/g, '-').slice(0, 64);
    if (/^[0-9a-f-]{16,}$/i.test(clean) || /^[0-9]{5,}$/.test(clean)) return ':id';
    return clean;
  }).filter(Boolean);
  return parts.length ? `/${parts.join('/')}` : '/';
}

function getQueryValue(params) {
  for (const [key, value] of params.entries()) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (GAME_ID_KEYS.includes(normalized)) return value;
  }
  return null;
}

export function sanitizeUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || ''));
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    const gameFromPath = parts[parts.length - 1];
    return {
      domain: normalizeDomain(parsed.hostname),
      pathPattern: pathPattern(parsed.pathname),
      safeGameId: safeIdentifier(getQueryValue(parsed.searchParams) || gameFromPath),
    };
  } catch {
    return null;
  }
}

export function makeClientEventId() {
  const random = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${Date.now()}:${random}`;
}
