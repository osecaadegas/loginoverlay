export const READINESS_STATUSES = Object.freeze({
  READY: 'ready',
  WARNING: 'warning',
  ERROR: 'error',
  CHECKING: 'checking',
  OPTIONAL: 'optional',
  FALLBACK: 'fallback',
  NOT_CONFIGURED: 'not_configured',
  UNAVAILABLE: 'unavailable',
});

export const SERVICE_IDS = Object.freeze({
  TWITCH: 'twitch',
  STREAMELEMENTS: 'streamelements',
  MUSIC: 'music',
  SLOT_DATA: 'slot-data',
});

export const CURRENCY_OPTIONS = Object.freeze([
  { code: 'EUR', symbol: '€', label: 'EUR - €' },
  { code: 'USD', symbol: '$', label: 'USD - $' },
  { code: 'GBP', symbol: '£', label: 'GBP - £' },
  { code: 'CAD', symbol: 'C$', label: 'CAD - C$' },
  { code: 'AUD', symbol: 'A$', label: 'AUD - A$' },
  { code: 'BRL', symbol: 'R$', label: 'BRL - R$' },
  { code: 'PLN', symbol: 'zł', label: 'PLN - zł' },
  { code: 'SEK', symbol: 'kr', label: 'SEK - kr' },
  { code: 'NOK', symbol: 'kr', label: 'NOK - kr' },
  { code: 'TRY', symbol: '₺', label: 'TRY - ₺' },
]);

const LEGACY_SYMBOL_TO_CODE = Object.freeze({
  '€': 'EUR',
  '$': 'USD',
  '£': 'GBP',
  'C$': 'CAD',
  'A$': 'AUD',
  'R$': 'BRL',
  'zł': 'PLN',
  'kr': 'SEK',
  '₺': 'TRY',
});

export const POINT_SOURCES = Object.freeze([
  { id: 'streamelements', label: 'Use StreamElements loyalty points', description: 'Viewer costs are charged through your existing StreamElements loyalty setup.' },
  { id: 'internal', label: 'Use Streamers Center internal points', description: 'Keep point tracking inside Streamers Center when external loyalty is not needed.' },
  { id: 'none', label: 'Do not use points', description: 'Requests, bets and giveaway entries stay free.' },
]);

export const MUSIC_MODES = Object.freeze([
  { id: 'spotify', label: 'Connect Spotify', description: 'Show automatic now-playing data from your Spotify account.' },
  { id: 'manual', label: 'Manual music information', description: 'Type the music text yourself and use it as a valid fallback.' },
  { id: 'disabled', label: 'Disable music display', description: 'Hide music setup because music is optional for your overlay.' },
]);

export const SLOT_SOURCES = Object.freeze([
  { id: 'streamers_center', label: 'Streamers Center slot database', description: 'Use the built-in slot database and image search.' },
  { id: 'sloteller', label: 'Sloteller integration', description: 'Use Sloteller only where this installation already supports it.' },
  { id: 'manual', label: 'Manual slot entry fallback', description: 'Let you type unknown slots by hand so setup is never blocked.' },
]);

export const POINT_BEHAVIORS = Object.freeze([
  { id: 'charge_immediately', label: 'Charge immediately' },
  { id: 'do_not_charge', label: 'Do not charge points' },
]);

export function getCurrencyByCode(code) {
  return CURRENCY_OPTIONS.find(item => item.code === normalizeCurrencyCode(code)) || CURRENCY_OPTIONS[0];
}

export function normalizeCurrencyCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'EUR';
  const legacy = LEGACY_SYMBOL_TO_CODE[raw];
  if (legacy) return legacy;
  const upper = raw.toUpperCase();
  return CURRENCY_OPTIONS.some(item => item.code === upper) ? upper : 'EUR';
}

export function currencySymbolForCode(code) {
  return getCurrencyByCode(code).symbol;
}

export function normalizeTwitchLogin(value) {
  return String(value || '').trim().replace(/^#/, '').toLowerCase();
}

export function normalizeCommandPrefix(value) {
  const prefix = String(value || '!').trim();
  if (!prefix) return '!';
  return prefix.slice(0, 3);
}

export function normalizeCommandName(value, fallback = '') {
  return String(value || fallback || '')
    .trim()
    .replace(/^[!/#.]+/, '')
    .trim()
    .toLowerCase();
}

export function normalizeGiveawayKeyword(value, fallback = 'join') {
  return normalizeCommandName(value, fallback);
}

export function commandPreview(prefix, command, example = '') {
  const normalizedPrefix = normalizeCommandPrefix(prefix);
  const normalizedCommand = normalizeCommandName(command);
  return `${normalizedPrefix}${normalizedCommand}${example ? ` ${example}` : ''}`.trim();
}

export function normalizePointBehavior(value) {
  return POINT_BEHAVIORS.some(item => item.id === value) ? value : 'charge_immediately';
}

export function normalizeSetupDetails(details = {}, integrations = {}) {
  const prefix = normalizeCommandPrefix(details.commandPrefix || '!');
  const twitchLogin = normalizeTwitchLogin(details.twitchChannel || integrations.twitchChannel || details.verifiedTwitchLogin || '');
  const musicMode = ['spotify', 'manual', 'disabled'].includes(details.musicMode || details.spotifyMode)
    ? (details.musicMode || details.spotifyMode)
    : 'manual';
  const pointSource = ['streamelements', 'internal', 'none'].includes(details.pointSource)
    ? details.pointSource
    : (details.requestsUsePoints || details.betsUsePoints ? 'streamelements' : 'internal');
  const slotSource = ['streamers_center', 'sloteller', 'manual'].includes(details.slotSource)
    ? details.slotSource
    : 'streamers_center';
  const manualSlotFallback = slotSource === 'manual' || details.manualSlotFallback !== false;
  return {
    ...details,
    twitchChannel: twitchLogin,
    twitchDisplayName: String(details.twitchDisplayName || integrations.twitchDisplayName || '').trim(),
    commandPrefix: prefix,
    slotRequestCommand: normalizeCommandName(details.slotRequestCommand, 'sr'),
    betCommand: normalizeCommandName(details.betCommand, 'bet'),
    giveawayKeyword: normalizeGiveawayKeyword(details.giveawayKeyword, 'join'),
    chatConnectionMode: details.chatConnectionMode || 'authenticated_twitch',
    pointSource,
    requestsUsePoints: pointSource === 'streamelements',
    betsUsePoints: pointSource === 'streamelements',
    pointsEnabled: pointSource === 'streamelements',
    pointCurrencyName: String(details.pointCurrencyName || 'points').trim() || 'points',
    requestCost: toInteger(details.requestCost, 100),
    giveawayEntryCost: toInteger(details.giveawayEntryCost, 0),
    betMinAmount: toInteger(details.betMinAmount, 1),
    betMaxAmount: toInteger(details.betMaxAmount, 10000),
    defaultBetAmount: details.defaultBetAmount === '' || details.defaultBetAmount == null ? '' : toInteger(details.defaultBetAmount, ''),
    pointBalanceBehavior: normalizePointBehavior(details.pointBalanceBehavior),
    insufficientPointsBehavior: details.insufficientPointsBehavior || 'reject',
    refundBehavior: details.refundBehavior || 'refund_on_cancel_or_reject',
    musicMode,
    spotifyMode: musicMode,
    manualTrack: String(details.manualTrack || '').trim(),
    manualArtist: String(details.manualArtist || '').trim(),
    manualAlbum: String(details.manualAlbum || '').trim(),
    manualCoverUrl: String(details.manualCoverUrl || '').trim(),
    manualMusicLink: String(details.manualMusicLink || '').trim(),
    musicFallbackMessage: String(details.musicFallbackMessage || 'No track playing').trim(),
    hideMusicWhenEmpty: details.hideMusicWhenEmpty !== false,
    currencyCode: normalizeCurrencyCode(details.currencyCode || details.currency),
    currency: normalizeCurrencyCode(details.currencyCode || details.currency),
    slotSource,
    manualSlotFallback,
    slotProviderHint: String(details.slotProviderHint || '').trim(),
    sampleSlotName: String(details.sampleSlotName || 'Gates of Olympus').trim(),
    unknownSlotImage: String(details.unknownSlotImage || '').trim(),
    defaultRtpHandling: details.defaultRtpHandling || 'show_unknown',
    defaultVolatilityHandling: details.defaultVolatilityHandling || 'show_unknown',
    defaultProviderLabel: String(details.defaultProviderLabel || 'Unknown provider').trim(),
    missingSlotImageBehavior: details.missingSlotImageBehavior || 'use_default_image',
  };
}

export function toNonNegativeInteger(value, fallback = 0) {
  if (value === '' && fallback === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
}

export function toInteger(value, fallback = 0) {
  if (value === '' && fallback === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.floor(number);
}

export function validateCommandConfiguration(details = {}) {
  const normalized = normalizeSetupDetails(details);
  const errors = [];
  const warnings = [];
  const prefixPattern = /^[!#$%&?./-]{1,3}$/;
  const commandPattern = /^[a-z0-9][a-z0-9_-]{0,31}$/;
  const commands = [
    ['slot request command', normalized.slotRequestCommand],
    ['bet command', normalized.betCommand],
    ['giveaway keyword', normalized.giveawayKeyword],
  ];
  if (!prefixPattern.test(normalized.commandPrefix)) errors.push('Use a short command prefix such as !, ?, or #.');
  for (const [label, command] of commands) {
    if (!commandPattern.test(command)) errors.push(`${label} can only use letters, numbers, underscores or dashes.`);
  }
  const commandValues = commands.map(([, command]) => command).filter(Boolean);
  if (new Set(commandValues).size !== commandValues.length) errors.push('Commands must be unique so chat messages are not ambiguous.');
  if (/\s/.test(normalized.giveawayKeyword)) warnings.push('Giveaway keywords with spaces are not supported in this chat listener.');
  return { errors, warnings, normalized };
}

export function validatePointSettings(details = {}) {
  const normalized = normalizeSetupDetails(details);
  const errors = [];
  if (normalized.requestCost < 0) errors.push('Slot request cost must be zero or more.');
  if (normalized.giveawayEntryCost < 0) errors.push('Giveaway entry cost must be zero or more.');
  if (normalized.betMinAmount <= 0) errors.push('Minimum bet must be greater than zero.');
  if (normalized.betMaxAmount < normalized.betMinAmount) errors.push('Maximum bet must be at least the minimum bet.');
  if (normalized.defaultBetAmount !== '' && (normalized.defaultBetAmount < normalized.betMinAmount || normalized.defaultBetAmount > normalized.betMaxAmount)) {
    errors.push('Default bet must be inside the minimum and maximum bet range.');
  }
  if (!POINT_BEHAVIORS.some(item => item.id === normalized.pointBalanceBehavior)) {
    errors.push('The selected point charging behavior is not supported yet.');
  }
  return { errors, normalized };
}

export function serviceSectionStatus(checks = [], service) {
  const scoped = checks.filter(check => check.service === service);
  if (!scoped.length) return READINESS_STATUSES.OPTIONAL;
  if (scoped.some(check => check.status === READINESS_STATUSES.CHECKING)) return READINESS_STATUSES.CHECKING;
  if (scoped.some(check => check.blocking && check.status === READINESS_STATUSES.ERROR)) return READINESS_STATUSES.ERROR;
  if (scoped.some(check => check.status === READINESS_STATUSES.FALLBACK)) return READINESS_STATUSES.FALLBACK;
  if (scoped.some(check => check.status === READINESS_STATUSES.WARNING || check.status === READINESS_STATUSES.UNAVAILABLE || check.status === READINESS_STATUSES.NOT_CONFIGURED)) return READINESS_STATUSES.WARNING;
  if (scoped.every(check => check.status === READINESS_STATUSES.OPTIONAL)) return READINESS_STATUSES.OPTIONAL;
  return READINESS_STATUSES.READY;
}

export function summarizeReadiness(checks = []) {
  const required = checks.filter(check => check.blocking);
  const requiredCompleted = required.filter(check => check.status === READINESS_STATUSES.READY || check.status === READINESS_STATUSES.FALLBACK).length;
  const optionalConnected = checks.filter(check => !check.blocking && [READINESS_STATUSES.READY, READINESS_STATUSES.FALLBACK].includes(check.status)).length;
  const blocking = required.filter(check => ![READINESS_STATUSES.READY, READINESS_STATUSES.FALLBACK].includes(check.status));
  return {
    requiredTotal: required.length,
    requiredCompleted,
    optionalConnected,
    canContinue: blocking.length === 0,
    overallStatus: blocking.length === 0 ? READINESS_STATUSES.READY : READINESS_STATUSES.WARNING,
    blockingChecks: blocking.map(check => check.id),
  };
}

export function formatCommandForDisplay(prefix, command, fallback = '') {
  return commandPreview(prefix, command || fallback);
}

export function buildFinalServiceReview(details = {}, readiness = {}) {
  const normalized = normalizeSetupDetails(details);
  const currency = getCurrencyByCode(normalized.currencyCode);
  return {
    twitch: {
      channel: normalized.twitchChannel || 'Not connected',
      chat: readiness.sections?.twitch || READINESS_STATUSES.NOT_CONFIGURED,
      prefix: normalized.commandPrefix,
      commands: [formatCommandForDisplay(normalized.commandPrefix, normalized.slotRequestCommand), formatCommandForDisplay(normalized.commandPrefix, normalized.betCommand)],
      giveaway: normalized.giveawayKeyword,
    },
    points: {
      source: normalized.pointSource,
      currency: normalized.pointSource === 'streamelements' ? normalized.pointCurrencyName : currency.label,
      requestCost: normalized.pointSource === 'none' ? 'Free' : normalized.requestCost,
      betRange: `${normalized.betMinAmount}-${normalized.betMaxAmount}`,
    },
    music: {
      source: normalized.musicMode,
      fallback: normalized.musicMode === 'manual' ? `${normalized.manualArtist} - ${normalized.manualTrack}`.trim() : normalized.musicFallbackMessage,
    },
    slotData: {
      source: normalized.slotSource,
      manualFallback: normalized.manualSlotFallback ? 'Enabled' : 'Disabled',
    },
    currency: currency.label,
  };
}