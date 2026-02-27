/**
 * @module validator
 * Input validation, data normalization, and compliance checking.
 *
 * This module is purely functional — no side effects, no network calls.
 * All functions accept data and return either validated/normalized data
 * or throw a typed IngestionError.
 */

import { validationError, moderationError, sourceError } from './errors.js';
import {
  RTP_MIN,
  RTP_MAX,
  MAX_WIN_CEILING,
  VOLATILITY_ENUM,
  CONFIDENCE_THRESHOLD,
  CANONICAL_PROVIDERS,
  SAFE_PROVIDERS,
  BLOCKED_SEARCH_TERMS,
  ALLOWED_SOURCE_DOMAINS,
  BLOCKED_DOMAINS,
  INGESTION_VERSION,
} from './config.js';

// ─── Input Validation ───────────────────────────────────────────────

/**
 * Validate the raw input from the API request.
 * @param {object} input
 * @returns {{name: string, provider?: string, options?: object}}
 * @throws {IngestionError} VALIDATION if name is missing/invalid
 */
export function validateInput(input) {
  if (!input || typeof input !== 'object') {
    throw validationError('Request body must be a JSON object');
  }

  const name = (input.name || '').trim();
  if (!name) {
    throw validationError('Field "name" is required');
  }
  if (name.length < 2 || name.length > 200) {
    throw validationError('Slot name must be 2-200 characters', { name, length: name.length });
  }

  const provider = input.provider ? String(input.provider).trim() : undefined;
  if (provider && provider.length > 100) {
    throw validationError('Provider name must be ≤100 characters', { provider });
  }

  return {
    name,
    provider,
    options: {
      skipCache: !!input.skipCache,
      skipImage: !!input.skipImage,
      forceRefresh: !!input.forceRefresh,
    },
  };
}

// ─── Content Safety ─────────────────────────────────────────────────

/**
 * Check if a search term contains blocked/NSFW content.
 * Prevents the pipeline from processing inappropriate queries.
 *
 * @param {string} text
 * @returns {{blocked: boolean, term?: string}}
 */
export function checkContentSafety(text) {
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  for (const term of BLOCKED_SEARCH_TERMS) {
    if (lower.includes(term)) {
      return { blocked: true, term };
    }
  }
  return { blocked: false };
}

// ─── Data Normalization ─────────────────────────────────────────────

/**
 * Canonicalize a provider name.
 * Maps aliases, alternate spellings, and informal names to the proper display name.
 *
 * @param {string} raw
 * @returns {string} Canonical provider name
 */
export function canonicalProvider(raw) {
  if (!raw) return '';
  const lower = raw.toLowerCase().trim();

  // Direct match in canonical map
  if (CANONICAL_PROVIDERS[lower]) return CANONICAL_PROVIDERS[lower];

  // Partial match (e.g., "Pragmatic Play Ltd" → "Pragmatic Play")
  for (const [alias, canonical] of Object.entries(CANONICAL_PROVIDERS)) {
    if (lower.includes(alias) || alias.includes(lower)) {
      return canonical;
    }
  }

  // Not in map — capitalize each word and return as-is
  return raw.trim().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Normalize a slot name for consistent storage.
 * - Title-case
 * - Remove excessive whitespace
 * - Preserve special characters that are part of the actual name
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizeSlotName(raw) {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    // Title case each word but preserve all-caps acronyms (e.g., "XL")
    .replace(/\b([a-z])(\w*)/g, (_, first, rest) => first.toUpperCase() + rest);
}

/**
 * Normalize volatility to our enum set.
 * @param {string} raw
 * @returns {string} One of VOLATILITY_ENUM values
 */
export function normalizeVolatility(raw) {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase().trim().replace(/[-_\s]+/g, '_');

  // Direct match
  if (VOLATILITY_ENUM.includes(lower)) return lower;

  // Alias mapping
  const ALIASES = {
    'very high': 'very_high', 'very_high': 'very_high', 'extreme': 'very_high',
    'extremely high': 'very_high', 'extra high': 'very_high',
    'high/medium': 'high', 'medium/high': 'high', 'med-high': 'high',
    'medium high': 'high', 'high medium': 'high',
    'medium/low': 'medium', 'low/medium': 'medium', 'med-low': 'medium',
    'medium low': 'medium', 'low medium': 'medium',
    'low': 'low', 'med': 'medium', 'medium': 'medium', 'high': 'high',
    'moderate': 'medium', 'mild': 'low', 'intense': 'very_high',
  };

  return ALIASES[lower.replace(/_/g, ' ')] || ALIASES[lower] || 'unknown';
}

/**
 * Validate and normalize RTP value.
 * @param {any} raw
 * @returns {number|null}
 */
export function normalizeRTP(raw) {
  if (raw == null || raw === '' || raw === 'N/A') return null;
  const num = typeof raw === 'string' ? parseFloat(raw.replace(/[^0-9.]/g, '')) : Number(raw);
  if (isNaN(num)) return null;
  if (num < RTP_MIN || num > RTP_MAX) return null;
  return Math.round(num * 100) / 100; // 2 decimal places
}

/**
 * Validate and normalize max win multiplier.
 * @param {any} raw
 * @returns {number|null}
 */
export function normalizeMaxWin(raw) {
  if (raw == null || raw === '' || raw === 'N/A') return null;
  let str = typeof raw === 'string' ? raw : String(raw);
  // Extract number from formats like "10,000x", "10000x", "10.000x"
  str = str.replace(/[x×X]/g, '').replace(/,/g, '').trim();
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0 || num > MAX_WIN_CEILING) return null;
  return Math.round(num * 100) / 100;
}

/**
 * Validate release year.
 * @param {any} raw
 * @returns {number|null}
 */
export function normalizeReleaseYear(raw) {
  if (raw == null) return null;
  const num = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (isNaN(num)) return null;
  const currentYear = new Date().getFullYear();
  // Slots exist from ~2005 to next year (pre-release)
  if (num < 2005 || num > currentYear + 1) return null;
  return num;
}

/**
 * Check if a provider is safe for Twitch streaming.
 * @param {string} provider
 * @returns {boolean}
 */
export function isProviderSafe(provider) {
  if (!provider) return true; // unknown = assume safe
  const lower = provider.toLowerCase().trim();
  return SAFE_PROVIDERS.some(p => lower.includes(p) || p.includes(lower));
}

// ─── Source Compliance ──────────────────────────────────────────────

/**
 * Validate that a source URL comes from a compliant domain.
 * @param {string} url
 * @returns {{compliant: boolean, domain: string, blocked?: boolean}}
 */
export function checkSourceCompliance(url) {
  try {
    const { hostname } = new URL(url);
    const domain = hostname.replace(/^www\./, '');

    // Check blocklist first
    if (BLOCKED_DOMAINS.some(d => domain.includes(d))) {
      return { compliant: false, domain, blocked: true };
    }

    // Check allowlist
    const allowed = ALLOWED_SOURCE_DOMAINS.some(d => domain.includes(d) || domain.endsWith(`.${d}`));
    return { compliant: allowed, domain };
  } catch {
    return { compliant: false, domain: 'invalid_url' };
  }
}

/**
 * Filter source citations to only compliant ones.
 * @param {string[]} urls
 * @returns {{compliant: Array<{url: string, domain: string}>, rejected: string[]}}
 */
export function filterCompliantSources(urls) {
  const compliant = [];
  const rejected = [];

  for (const url of urls || []) {
    const check = checkSourceCompliance(url);
    if (check.compliant) {
      compliant.push({ url, domain: check.domain });
    } else {
      rejected.push(url);
    }
  }

  return { compliant, rejected };
}

// ─── Full Slot Data Validation ──────────────────────────────────────

/**
 * Validate and normalize a complete slot object after AI extraction.
 * Applies all validation rules, normalizes values, and annotates metadata.
 *
 * @param {object} raw - Raw slot data from AI extraction
 * @param {string} inputName - Original input name for correlation
 * @returns {object} Validated and normalized slot data
 * @throws {IngestionError} if critical validation fails
 */
export function validateSlotData(raw, inputName) {
  if (!raw || typeof raw !== 'object') {
    throw validationError('AI extraction returned invalid data', { inputName });
  }

  // Name: use AI result but fallback to input
  const name = normalizeSlotName(raw.name || inputName);
  if (!name) {
    throw validationError('Could not determine slot name', { raw });
  }

  // Provider: canonicalize
  const provider = canonicalProvider(raw.provider);
  if (!provider) {
    throw validationError('Could not determine provider', { name, raw_provider: raw.provider });
  }

  // Numeric fields
  const rtp = normalizeRTP(raw.rtp);
  const max_win_multiplier = normalizeMaxWin(raw.max_win || raw.max_win_multiplier);
  const volatility = normalizeVolatility(raw.volatility);
  const release_year = normalizeReleaseYear(raw.release_year);

  // String fields
  const theme = raw.theme ? String(raw.theme).trim().substring(0, 200) : null;
  const features = raw.features ? String(raw.features).trim().substring(0, 500) : null;

  // Twitch safety
  const providerSafe = isProviderSafe(provider);
  const contentCheck = checkContentSafety(name);
  const twitch_safe = providerSafe && !contentCheck.blocked;

  // Confidence score (from AI or computed)
  let confidence_score = typeof raw.confidence === 'number'
    ? Math.min(100, Math.max(0, Math.round(raw.confidence)))
    : computeConfidence({ name, provider, rtp, volatility, max_win_multiplier });

  // Source compliance
  const { compliant: validSources, rejected: rejectedSources } =
    filterCompliantSources(raw.sources || raw.source_citations || []);

  return {
    // Core data
    name,
    provider,
    rtp,
    volatility,
    max_win_multiplier,
    theme,
    features,
    release_year,
    twitch_safe,

    // Metadata
    confidence_score,
    source_citations: validSources.map(s => s.url),
    ingestion_version: INGESTION_VERSION,

    // Intermediate (used by pipeline, not stored directly)
    _validSources: validSources,
    _rejectedSources: rejectedSources,
    _needsReview: confidence_score < CONFIDENCE_THRESHOLD,
    _providerSafe: providerSafe,
  };
}

// ─── Confidence Computation ─────────────────────────────────────────

/**
 * Compute a confidence score based on data completeness.
 * @param {object} data
 * @returns {number} 0-100
 */
function computeConfidence({ name, provider, rtp, volatility, max_win_multiplier }) {
  let score = 0;
  if (name)                            score += 20;
  if (provider)                        score += 20;
  if (rtp != null)                     score += 20;
  if (volatility && volatility !== 'unknown') score += 15;
  if (max_win_multiplier != null)      score += 15;
  // Bonus for having both RTP and max_win (cross-validates data quality)
  if (rtp != null && max_win_multiplier != null) score += 10;
  return Math.min(100, score);
}
