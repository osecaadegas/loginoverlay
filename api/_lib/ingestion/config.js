/**
 * @module config
 * Centralized configuration for the ingestion engine.
 * All thresholds, limits, and domain lists in one place.
 */

// ─── AI Model ───────────────────────────────────────────────────────

export const GEMINI_MODEL = 'gemini-2.0-flash';
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─── Quality Thresholds ─────────────────────────────────────────────

/** Minimum confidence score (0-100) to auto-approve a slot. Below this → requires_review. */
export const CONFIDENCE_THRESHOLD = 60;

/** RTP must be within this range to pass validation. */
export const RTP_MIN = 80.0;
export const RTP_MAX = 99.99;

/** Valid volatility values. */
export const VOLATILITY_ENUM = ['low', 'medium', 'high', 'very_high', 'unknown'];

/** Max win multiplier must be > 0 and < this ceiling as a sanity check. */
export const MAX_WIN_CEILING = 1_000_000;

/** Engine version stamped on every ingested slot. */
export const INGESTION_VERSION = '2.0.0';

// ─── Rate Limiting ──────────────────────────────────────────────────

/** Rate limit window in minutes. */
export const RATE_LIMIT_WINDOW_MINUTES = 1;

/** Max requests per window per identifier. */
export const RATE_LIMIT_MAX_REQUESTS = 30;

// ─── Caching ────────────────────────────────────────────────────────

/** How long cached AI responses remain valid (hours). */
export const CACHE_TTL_HOURS = 24;

// ─── AI Extraction ──────────────────────────────────────────────────

/** Max Gemini retries with exponential backoff. */
export const GEMINI_MAX_RETRIES = 2;

/** Base delay between retries (ms). Doubles each attempt. */
export const GEMINI_RETRY_BASE_MS = 1000;

/** Gemini request timeout (ms). */
export const GEMINI_TIMEOUT_MS = 25_000;

// ─── Source Compliance ──────────────────────────────────────────────

/**
 * Whitelisted domains we are legally allowed to reference.
 * Official provider sites + public review/aggregator sites + press.
 */
export const ALLOWED_SOURCE_DOMAINS = [
  // ── Provider Official Sites ──
  'pragmaticplay.com', 'hacksawgaming.com', 'nolimitcity.com',
  'playngo.com', 'pushgaming.com', 'relax-gaming.com',
  'elk-studios.com', 'thunderkick.com', 'redtigergaming.com',
  'netent.com', 'evolution.com', 'blueprintgaming.com',
  'bigtimegaming.com', 'quickspin.com', 'yggdrasilgaming.com',
  'pocketgamessoft.com', 'isoftbet.com', 'endorphina.com',
  'habanero.com', 'bgaming.com', 'playson.com', 'betsoft.com',
  'stakelogic.com', 'gamomat.com', 'evoplay.games', 'swintt.com',
  'spribe.co', 'gameart.net', 'gamingcorps.com', 'spinomenal.com',
  'wazdan.com', '3oaksgaming.com', 'slotmill.com', 'foxium.com',
  'greentube.com', 'novomatic.com', 'gamesglobal.com',
  'playtech.com', 'igt.com', 'winfast.games', 'octoplay.com',
  'wizardgamesglobal.com', 'tomhorngaming.com', 'rubyplay.com',
  'mancalagaming.com', 'mascot.games', 'platipusgaming.com',
  'kalambagames.com', 'avatarux.com', 'fantasmagames.com',
  'printstudios.com', 'peterandsons.com', 'spadegaming.com',
  'reelplay.com', 'booongo.com', 'belatra.com',

  // ── Public Review / Aggregator Sites (no auth required) ──
  'slotcatalog.com', 'bigwinboard.com', 'askgamblers.com',
  'casinoguru.com', 'vegasslotsonline.com', 'slottracker.com',
  'slotswise.com', 'slot.info', 'casinogrounds.com',

  // ── Industry Press ──
  'gamblinginsider.com', 'igamingbusiness.com', 'yogonet.com',
  'european-gaming.eu', 'casinobeats.com', 'igamingnext.com',
];

/**
 * BLOCKED domains — gambling platforms requiring auth.
 * We must never scrape these.
 */
export const BLOCKED_DOMAINS = [
  'stake.com', 'stake.us', 'gamdom.com', 'rollbit.com',
  'roobet.com', 'duelbits.com', '500.casino', 'bc.game',
  'csgoempire.com', 'shuffle.com', 'packdraw.com',
  'kick.com', 'twitch.tv',  // streaming platforms (not data sources)
];

// ─── Image Safety ───────────────────────────────────────────────────

/** Domains known to host slot artwork safely (no casino UI / no NSFW). */
export const SAFE_IMAGE_DOMAINS = [
  'pragmaticplay.com', 'hacksawgaming.com', 'nolimitcity.com',
  'slotcatalog.com', 'bigwinboard.com',
  'cdn.softswiss.net', 'cdn.wazdan.com',
  'static.wikia.nocookie.net',
];

/** URL keywords that indicate a blocked / junk image. */
export const BLOCKED_IMAGE_KEYWORDS = [
  'nsfw', 'xxx', 'porn', 'hentai', 'nude', 'naked', 'sexy',
  'adult', 'erotic', 'rule34', 'booru', 'xhamster', 'xvideos',
  'favicon', 'icon', 'logo', 'gstatic.com', 'googleusercontent',
  'pixel', '1x1', 'spacer', 'blank', 'transparent',
  'bet-size', 'balance', 'deposit', 'withdraw', 'bonus-banner',
];

// ─── Content Safety (profanity / NSFW blocklist) ───────────────────

export const BLOCKED_SEARCH_TERMS = [
  'porn', 'xxx', 'hentai', 'nsfw', 'nude', 'naked', 'nudes',
  'boobs', 'tits', 'titties', 'pussy', 'vagina', 'penis', 'dick', 'cock',
  'dildo', 'orgasm', 'blowjob', 'handjob', 'cumshot', 'creampie',
  'milf', 'anal', 'bdsm', 'fetish', 'onlyfans', 'chaturbate',
  'xvideos', 'xhamster', 'pornhub', 'brazzers', 'bangbros',
  'sex', 'sexy', 'erotic', 'erotica', 'fap', 'masturbat',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kike', 'spic',
  'chink', 'wetback', 'tranny', 'coon',
  'gore', 'snuff', 'bestiality', 'zoophil', 'necrophil', 'pedophil',
  'child porn', 'cp',
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'whore', 'slut',
];

// ─── Canonical Provider Map ─────────────────────────────────────────
// Maps lowercase aliases → proper display name.

export const CANONICAL_PROVIDERS = {
  'pragmatic play': 'Pragmatic Play', 'pragmatic': 'Pragmatic Play', 'ppgames': 'Pragmatic Play',
  'hacksaw gaming': 'Hacksaw Gaming', 'hacksaw': 'Hacksaw Gaming',
  'nolimit city': 'Nolimit City', 'nolimit': 'Nolimit City', 'nolimitcity': 'Nolimit City',
  "play'n go": "Play'n GO", 'playngo': "Play'n GO", 'playn go': "Play'n GO",
  'push gaming': 'Push Gaming',
  'big time gaming': 'Big Time Gaming', 'btg': 'Big Time Gaming',
  'elk studios': 'ELK Studios', 'elk': 'ELK Studios',
  'relax gaming': 'Relax Gaming', 'relax': 'Relax Gaming',
  'red tiger gaming': 'Red Tiger Gaming', 'red tiger': 'Red Tiger Gaming',
  'netent': 'NetEnt', 'net entertainment': 'NetEnt',
  'thunderkick': 'Thunderkick',
  'quickspin': 'Quickspin',
  'yggdrasil gaming': 'Yggdrasil Gaming', 'yggdrasil': 'Yggdrasil Gaming',
  'blueprint gaming': 'Blueprint Gaming', 'blueprint': 'Blueprint Gaming',
  'evolution': 'Evolution',
  'playtech': 'Playtech',
  'igt': 'IGT',
  'microgaming': 'Microgaming', 'games global': 'Microgaming',
  'gamomat': 'Gamomat',
  'endorphina': 'Endorphina',
  'habanero': 'Habanero',
  'bgaming': 'BGaming',
  'playson': 'Playson',
  'betsoft gaming': 'Betsoft Gaming', 'betsoft': 'Betsoft Gaming',
  'isoftbet': 'iSoftBet',
  'pg soft': 'PG Soft', 'pgsoft': 'PG Soft',
  'evoplay entertainment': 'Evoplay Entertainment', 'evoplay': 'Evoplay Entertainment',
  'stakelogic': 'Stakelogic',
  'swintt': 'Swintt',
  'novomatic': 'Novomatic',
  'spribe': 'Spribe',
  'spinomenal': 'Spinomenal',
  'wazdan': 'Wazdan',
  '3 oaks gaming': '3 Oaks Gaming', '3oaks': '3 Oaks Gaming',
  'kalamba games': 'Kalamba Games', 'kalamba': 'Kalamba Games',
  'avatarux': 'AvatarUX',
  'fantasma games': 'Fantasma Games',
  'print studios': 'Print Studios',
  'peter & sons': 'Peter & Sons', 'peter and sons': 'Peter & Sons',
  'tom horn gaming': 'Tom Horn Gaming', 'tom horn': 'Tom Horn Gaming',
  'slotmill': 'Slotmill',
  'gaming corps': 'Gaming Corps',
  'booongo': 'Booongo',
  'foxium': 'Foxium',
  'greentube': 'Greentube',
  'synot games': 'SYNOT Games',
  'tada gaming': 'TaDa Gaming',
  'wizard games': 'Wizard Games',
  'winfast games': 'WinFast Games', 'winfast': 'WinFast Games',
  'reelplay': 'ReelPlay',
  'northern lights gaming': 'Northern Lights Gaming',
  'skywind group': 'Skywind Group', 'skywind': 'Skywind Group',
  'mancala gaming': 'Mancala Gaming',
  'mascot gaming': 'Mascot Gaming',
  'platipus gaming': 'Platipus Gaming', 'platipus': 'Platipus Gaming',
  'octoplay': 'Octoplay',
  'golden hero': 'Golden Hero',
  'high 5 games': 'High 5 Games',
  'rubyplay': 'RubyPlay',
  'belatra games': 'Belatra Games', 'belatra': 'Belatra Games',
  'spadegaming': 'Spadegaming',
  'booming games': 'Booming Games',
  'gameart': 'GameArt',
};

/** Providers known to have safe-for-streaming artwork (no NSFW even with edgy names). */
export const SAFE_PROVIDERS = [
  'pragmatic play', 'hacksaw gaming', 'nolimit city', 'push gaming',
  'big time gaming', 'elk studios', 'thunderkick', 'relax gaming',
  'red tiger gaming', 'blueprint gaming', 'quickspin', 'yggdrasil gaming',
  "play'n go", 'netent', 'evolution', 'gamomat', 'kalamba games',
  'avatarux', 'fantasma games', 'print studios', '3 oaks gaming',
  'wazdan', 'spinomenal', 'booming games', 'gameart', 'endorphina',
  'habanero', 'bgaming', 'playson', 'playtech', 'igt', 'microgaming',
  'evoplay entertainment', 'stakelogic', 'swintt', 'novomatic',
  'betsoft gaming', 'isoftbet', 'pg soft', 'peter & sons',
  'tom horn gaming', 'slotmill', 'gaming corps', 'booongo',
  'spribe', 'spadegaming', 'foxium', 'greentube', 'synot games',
  'tada gaming', 'wizard games', 'winfast games', 'reelplay',
  'northern lights gaming', 'skywind group', 'mancala gaming',
  'mascot gaming', 'platipus gaming', 'octoplay', 'golden hero',
  'high 5 games', 'rubyplay', 'belatra games',
];
