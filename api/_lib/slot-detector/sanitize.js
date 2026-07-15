import { normalizeTarget } from './core.js';

const GAME_ID_KEYS = [
  'gameid',
  'game_id',
  'game',
  'gamecode',
  'game_code',
  'symbol',
  'g',
  'slug',
  'launchgameid',
  'casino_game_id',
];

const PROVIDER_KEYS = ['provider', 'providername', 'provider_name', 'studio', 'vendor'];

function asciiFold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(value) {
  return asciiFold(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeKey(value) {
  return normalizeText(value).replace(/\s+/g, '_');
}

function safeText(value, max = 160) {
  const text = String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ');
  return text.slice(0, max);
}

function safeIdentifier(value, max = 96) {
  const text = asciiFold(value).trim();
  const safe = text.replace(/[^a-zA-Z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '');
  return safe.slice(0, max) || null;
}

function safePanelId(value) {
  return safeIdentifier(value, 64);
}

function cleanTitleTail(value) {
  return safeText(value, 160)
    .replace(/\s*[-|]\s*(?:VIP\s+)?Crypto\s+Casino.*$/i, '')
    .replace(/\s*[-|]\s*Shuffle.*$/i, '')
    .replace(/\s*[-|]\s*Stake.*$/i, '')
    .replace(/\s*[-|]\s*Casino.*$/i, '')
    .trim();
}

function parseSlotTitle(value) {
  const title = cleanTitleTail(value);
  if (!title) return { slotName: '', providerName: '' };

  const gamblingGame = title.match(/^play\s+(.+?)\s+gambling\s+game\s+by\s+(.+)$/i);
  if (gamblingGame) {
    return {
      slotName: safeText(gamblingGame[1], 120),
      providerName: safeText(gamblingGame[2], 80),
    };
  }

  const slotByProvider = title.match(/^play\s+(.+?)\s+(?:slot|casino\s+game|game)\s+by\s+(.+)$/i);
  if (slotByProvider) {
    return {
      slotName: safeText(slotByProvider[1], 120),
      providerName: safeText(slotByProvider[2], 80),
    };
  }

  const plainPlay = title.match(/^play\s+(.+)$/i);
  if (plainPlay) {
    return {
      slotName: safeText(plainPlay[1], 120),
      providerName: '',
    };
  }

  return { slotName: title, providerName: '' };
}

function normalizeDomain(hostname) {
  return String(hostname || '')
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[^a-z0-9.-]/g, '')
    .slice(0, 160);
}

function segmentPattern(segment) {
  const clean = decodeURIComponent(segment || '').replace(/[^a-zA-Z0-9._:-]/g, '-').slice(0, 64);
  if (!clean) return null;
  if (/^[0-9a-f]{16,}$/i.test(clean)) return ':id';
  if (/^[0-9]{5,}$/.test(clean)) return ':id';
  if (/^[0-9a-f-]{24,}$/i.test(clean)) return ':id';
  return clean;
}

function buildPathPattern(pathname) {
  const parts = String(pathname || '/')
    .split('/')
    .map(segmentPattern)
    .filter(Boolean)
    .slice(0, 8);
  return parts.length ? `/${parts.join('/')}` : '/';
}

function getQueryValue(params, keys) {
  for (const [key, value] of params.entries()) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (keys.includes(normalized)) return value;
  }
  return null;
}

function inferGameIdFromPath(pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  const markers = new Set(['game', 'games', 'slot', 'slots', 'play', 'launch']);
  for (let index = 0; index < parts.length; index += 1) {
    if (markers.has(parts[index]?.toLowerCase()) && parts[index + 1]) {
      return parts[index + 1];
    }
  }
  return parts.length ? parts[parts.length - 1] : null;
}

export function sanitizeUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(String(rawUrl));
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { supported: false, reason: 'unsupported_protocol' };
    }
    const domain = normalizeDomain(parsed.hostname);
    const gameFromQuery = getQueryValue(parsed.searchParams, GAME_ID_KEYS);
    const providerFromQuery = getQueryValue(parsed.searchParams, PROVIDER_KEYS);
    return {
      supported: true,
      domain,
      pathPattern: buildPathPattern(parsed.pathname),
      safeGameId: safeIdentifier(gameFromQuery || inferGameIdFromPath(parsed.pathname)),
      providerHint: safeText(providerFromQuery, 80) || null,
    };
  } catch {
    return { supported: false, reason: 'invalid_url' };
  }
}

function collectUrls(body = {}) {
  const urls = [];
  const add = (value, source) => {
    if (value) urls.push({ value, source });
  };
  add(body.url, 'url');
  add(body.topUrl, 'topUrl');
  add(body.location, 'location');
  for (const [index, frameUrl] of (Array.isArray(body.frameUrls) ? body.frameUrls : []).entries()) {
    add(frameUrl, `frame:${index}`);
  }
  for (const [index, frame] of (Array.isArray(body.iframes) ? body.iframes : []).entries()) {
    add(frame?.url || frame?.src, `iframe:${index}`);
  }
  for (const [index, frameUrl] of (Array.isArray(body.evidence?.urls) ? body.evidence.urls : []).entries()) {
    add(frameUrl, `evidence:${index}`);
  }
  return urls.slice(0, 12);
}

export function sanitizeDetectionPayload(body = {}) {
  const sanitizedUrls = collectUrls(body)
    .map(({ value, source }) => ({ ...sanitizeUrl(value), source }))
    .filter(Boolean);
  const primary = sanitizedUrls.find((item) => item.supported) || sanitizedUrls[0] || null;
  const parsedTitle = parseSlotTitle(body.slotName || body.gameName || body.title || body.pageTitle || '');
  const safeTextHints = [
    parsedTitle.slotName,
    body.slotName,
    body.gameName,
    body.title,
    body.pageTitle,
    ...(Array.isArray(body.textHints) ? body.textHints : []),
  ].map((value) => safeText(value)).filter(Boolean).slice(0, 12);
  const slotHint = safeText(body.slotName || body.gameName || parsedTitle.slotName || safeTextHints[0] || '', 120);
  const providerHint = safeText(
    body.providerHint
      || body.provider
      || body.providerName
      || parsedTitle.providerName
      || primary?.providerHint
      || '',
    80,
  );
  const providerFrameGameId = sanitizedUrls.find((item) => (
    item.safeGameId
    && /^(frame|iframe|evidence):/.test(String(item.source || ''))
  ))?.safeGameId;
  const safeGameId = safeIdentifier(
    body.gameId
      || body.gameCode
      || providerFrameGameId
      || primary?.safeGameId
      || sanitizedUrls.find((item) => item.safeGameId)?.safeGameId
      || '',
  );

  return {
    clientEventId: body.clientEventId,
    detectedAt: body.detectedAt,
    target: normalizeTarget(body.target),
    devicePanelId: safePanelId(body.panelId || body.devicePanelId),
    domain: primary?.domain || null,
    pathPattern: primary?.pathPattern || null,
    safeGameId,
    providerHint: providerHint || null,
    slotHint: slotHint || null,
    pageTitleHint: safeText(body.title || body.pageTitle || '', 160) || null,
    iframeSupported: Boolean(body.iframeSupported),
    crossOriginUnsupported: Boolean(body.crossOriginUnsupported),
    evidence: {
      urls: sanitizedUrls.map((item) => ({
        source: item.source,
        supported: Boolean(item.supported),
        reason: item.reason || null,
        domain: item.domain || null,
        pathPattern: item.pathPattern || null,
        safeGameId: item.safeGameId || null,
        providerHint: item.providerHint || null,
      })),
      textHints: safeTextHints,
      panelId: safePanelId(body.panelId || body.devicePanelId),
      iframeSupported: Boolean(body.iframeSupported),
      crossOriginUnsupported: Boolean(body.crossOriginUnsupported),
      extensionVersion: safeText(body.extensionVersion || '', 40) || null,
    },
  };
}
