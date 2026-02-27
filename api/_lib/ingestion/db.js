/**
 * @module db
 * Supabase data access layer for the ingestion engine.
 *
 * Centralizes all database operations: auth, caching, rate-limiting,
 * duplicate detection, slot CRUD, and audit logging.
 *
 * Uses the service-role key (bypasses RLS).
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.js';
import {
  internalError,
  duplicateError,
  rateLimitError,
  authError,
} from './errors.js';
import {
  CACHE_TTL_HOURS,
  RATE_LIMIT_WINDOW_MINUTES,
  RATE_LIMIT_MAX_REQUESTS,
} from './config.js';

// ─── Supabase Client ────────────────────────────────────────────────

/** @type {ReturnType<typeof createClient> | null} */
let _client = null;

/**
 * Get or create the Supabase admin client.
 * @returns {ReturnType<typeof createClient>}
 */
export function getSupabase() {
  if (_client) return _client;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw internalError('Supabase not configured (missing URL or SERVICE_ROLE_KEY)');
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// ─── Admin Authentication ───────────────────────────────────────────

/**
 * Verify that the request comes from an admin user.
 * Checks user_roles table + user_metadata fallback.
 *
 * @param {string|undefined} authHeader - The `Authorization` header value
 * @returns {Promise<{authorized: boolean, error?: string, user?: object, roles?: string[]}>}
 */
export async function verifyAdmin(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization header' };
  }

  const token = authHeader.substring(7);
  const sb = getSupabase();

  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) {
    return { authorized: false, error: 'Invalid or expired token' };
  }

  // Primary: check user_roles table
  const { data: userRoles } = await sb
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const roleNames = (userRoles || []).map(r => r.role);
  const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'owner'];
  const hasAdminRole = roleNames.some(r => ADMIN_ROLES.includes(r.toLowerCase()));

  // Fallback: user_metadata.role
  if (!hasAdminRole) {
    const metaRole = (user.user_metadata?.role || '').toLowerCase();
    if (!ADMIN_ROLES.includes(metaRole)) {
      return { authorized: false, error: 'Insufficient privileges', user };
    }
  }

  return { authorized: true, user, roles: roleNames };
}

// ─── Response Caching ───────────────────────────────────────────────

/**
 * Build a deterministic cache key from slot name + optional provider.
 * @param {string} name
 * @param {string} [provider]
 * @returns {string}
 */
export function buildCacheKey(name, provider) {
  const n = name.toLowerCase().trim().replace(/\s+/g, '_');
  const p = (provider || '').toLowerCase().trim().replace(/\s+/g, '_');
  return p ? `slot:${p}:${n}` : `slot:_:${n}`;
}

/**
 * Read from ingestion cache.
 * @param {string} key
 * @returns {Promise<object|null>} Cached response or null
 */
export async function cacheGet(key) {
  try {
    const sb = getSupabase();
    const now = new Date().toISOString();

    const { data } = await sb
      .from('ingestion_cache')
      .select('id, response, hit_count')
      .eq('cache_key', key)
      .gt('expires_at', now)
      .maybeSingle();

    if (!data) return null;

    // Increment hit count (fire-and-forget)
    sb.from('ingestion_cache')
      .update({ hit_count: (data.hit_count || 0) + 1 })
      .eq('id', data.id)
      .then(() => {})
      .catch(() => {});

    logger.debug('cache.hit', { key });
    return data.response;
  } catch (err) {
    logger.warn('cache.read_error', { key, error: err.message });
    return null; // Cache failures should not block the pipeline
  }
}

/**
 * Write to ingestion cache.
 * @param {string} key
 * @param {object} response
 */
export async function cacheSet(key, response) {
  try {
    const sb = getSupabase();
    const expires_at = new Date(Date.now() + CACHE_TTL_HOURS * 3600_000).toISOString();

    await sb
      .from('ingestion_cache')
      .upsert(
        { cache_key: key, response, expires_at, hit_count: 0 },
        { onConflict: 'cache_key' }
      );

    logger.debug('cache.set', { key, expires_at });
  } catch (err) {
    logger.warn('cache.write_error', { key, error: err.message });
  }
}

// ─── Rate Limiting (DB-backed) ──────────────────────────────────────

/**
 * Check + increment rate limit for an identifier (IP or user ID).
 * Uses a 1-minute sliding window stored in the rate_limits table.
 *
 * @param {string} identifier - IP address or user ID
 * @param {string} [endpoint='ingest-slot']
 * @throws {IngestionError} if limit exceeded
 */
export async function checkRateLimit(identifier, endpoint = 'ingest-slot') {
  const sb = getSupabase();
  const windowStart = new Date(
    Math.floor(Date.now() / (RATE_LIMIT_WINDOW_MINUTES * 60_000)) * (RATE_LIMIT_WINDOW_MINUTES * 60_000)
  ).toISOString();

  // Read current count
  const { data: existing } = await sb
    .from('api_rate_limits')
    .select('id, request_count')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .eq('window_start', windowStart)
    .maybeSingle();

  if (existing && existing.request_count >= RATE_LIMIT_MAX_REQUESTS) {
    throw rateLimitError(
      `Rate limit exceeded: ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MINUTES}min`,
      { identifier, endpoint, limit: RATE_LIMIT_MAX_REQUESTS }
    );
  }

  if (existing) {
    // Increment
    await sb
      .from('api_rate_limits')
      .update({ request_count: existing.request_count + 1 })
      .eq('id', existing.id);
  } else {
    // Create new window entry
    await sb
      .from('api_rate_limits')
      .insert({ identifier, endpoint, window_start: windowStart, request_count: 1 })
      .catch(() => {
        // Handle race condition — another request may have created the row
      });
  }
}

// ─── Duplicate Detection ────────────────────────────────────────────

/**
 * Check if a slot with the same name + provider already exists.
 * Uses case-insensitive exact match first, then fuzzy name match.
 *
 * @param {string} name
 * @param {string} [provider]
 * @returns {Promise<{isDuplicate: boolean, existingSlot?: object}>}
 */
export async function checkDuplicate(name, provider) {
  const sb = getSupabase();
  const nameLower = name.toLowerCase().trim();

  // Exact match on lowered name + provider
  let query = sb
    .from('slots')
    .select('id, name, provider, rtp, volatility, max_win_multiplier, image, twitch_safe')
    .ilike('name', nameLower);

  if (provider) {
    query = query.ilike('provider', provider.toLowerCase().trim());
  }

  const { data: exact } = await query.limit(1).maybeSingle();
  if (exact) {
    return { isDuplicate: true, existingSlot: exact };
  }

  // Fuzzy match: remove special chars, check similarity
  const normalized = nameLower.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter(w => w.length > 2);

  if (words.length >= 2) {
    // Search by first two significant words
    const { data: fuzzy } = await sb
      .from('slots')
      .select('id, name, provider, rtp, volatility, max_win_multiplier, image, twitch_safe')
      .ilike('name', `%${words[0]}%${words[1]}%`)
      .limit(5);

    if (fuzzy?.length) {
      // Score each candidate
      for (const row of fuzzy) {
        const rowNorm = row.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
        if (rowNorm === normalized) {
          return { isDuplicate: true, existingSlot: row };
        }
      }
    }
  }

  return { isDuplicate: false };
}

// ─── Slot Upsert ────────────────────────────────────────────────────

/**
 * Insert or update a slot in the database.
 * Uses name + provider as the uniqueness key (case-insensitive).
 *
 * @param {object} slot - Validated and normalized slot data
 * @returns {Promise<{id: number|string, isNew: boolean}>}
 */
export async function upsertSlot(slot) {
  const sb = getSupabase();
  const timer = logger.startTimer('db.upsert_slot');

  // Check if exists first for idempotent behavior
  const { data: existing } = await sb
    .from('slots')
    .select('id')
    .ilike('name', slot.name)
    .ilike('provider', slot.provider || '')
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update with new data (merge — don't overwrite good data with nulls)
    const updates = {};
    if (slot.rtp != null)                updates.rtp = slot.rtp;
    if (slot.volatility)                 updates.volatility = slot.volatility;
    if (slot.max_win_multiplier != null) updates.max_win_multiplier = slot.max_win_multiplier;
    if (slot.image)                      updates.image = slot.image;
    if (slot.theme)                      updates.theme = slot.theme;
    if (slot.features)                   updates.features = slot.features;
    if (slot.twitch_safe != null)        updates.twitch_safe = slot.twitch_safe;
    if (slot.confidence_score != null)   updates.confidence_score = slot.confidence_score;
    if (slot.image_safety_status)         updates.image_safety_status = slot.image_safety_status;
    if (slot.moderation_status)          updates.moderation_status = slot.moderation_status;
    if (slot.release_year)               updates.release_year = slot.release_year;
    if (slot.source_citations?.length)   updates.source_citations = slot.source_citations;
    if (slot.ingestion_version)          updates.ingestion_version = slot.ingestion_version;
    updates.ai_extracted_at = new Date().toISOString();

    if (Object.keys(updates).length > 0) {
      await sb.from('slots').update(updates).eq('id', existing.id);
    }

    timer.end({ slot_name: slot.name, action: 'update' });
    return { id: existing.id, isNew: false };
  }

  // Insert new slot
  const { data: inserted, error } = await sb
    .from('slots')
    .insert({
      name: slot.name,
      provider: slot.provider,
      rtp: slot.rtp,
      volatility: slot.volatility,
      max_win_multiplier: slot.max_win_multiplier,
      image: slot.image || null,
      theme: slot.theme || null,
      features: slot.features || null,
      status: 'live',
      twitch_safe: slot.twitch_safe ?? true,
      confidence_score: slot.confidence_score,
      image_safety_status: slot.image_safety_status || 'pending',
      moderation_status: slot.moderation_status || 'approved',
      release_year: slot.release_year,
      source_citations: slot.source_citations || [],
      ai_extracted_at: new Date().toISOString(),
      ingestion_version: slot.ingestion_version,
    })
    .select('id')
    .single();

  if (error) {
    throw internalError(`Failed to insert slot: ${error.message}`, { slot_name: slot.name });
  }

  timer.end({ slot_name: slot.name, action: 'insert' });
  return { id: inserted.id, isNew: true };
}

// ─── Ingestion Logging ──────────────────────────────────────────────

/**
 * Write an ingestion log entry.
 * @param {object} entry
 */
export async function writeIngestionLog(entry) {
  try {
    const sb = getSupabase();
    await sb.from('ingestion_logs').insert({
      slot_name: entry.slot_name,
      provider_hint: entry.provider_hint || null,
      status: entry.status || 'completed',
      error_class: entry.error_type || null,
      error_message: entry.error_message || null,
      duration_ms: entry.duration_ms || null,
      gemini_tokens: entry.gemini_tokens_used || null,
      extraction_source: entry.source || null,
      confidence_score: entry.confidence_score || null,
      result_slot_id: entry.result_slot_id || null,
      requested_by: entry.requested_by || 'system',
      ip_address: entry.ip_address || null,
      metadata: entry.metadata || {},
    });
  } catch (err) {
    // Logging failures must not crash the pipeline
    logger.error('db.ingestion_log_failed', { error: err.message, entry_name: entry.slot_name });
  }
}

// ─── Moderation Logging ─────────────────────────────────────────────

/**
 * Write a moderation log entry.
 * @param {object} entry
 */
export async function writeModerationLog(entry) {
  try {
    const sb = getSupabase();
    await sb.from('moderation_logs').insert({
      slot_id: entry.slot_id || null,
      slot_name: entry.slot_name || 'unknown',
      check_type: entry.check_type,
      verdict: entry.status,
      details: entry.details || {},
      flagged_reasons: entry.flagged_reasons || [],
      reviewed_by: entry.reviewed_by || null,
    });
  } catch (err) {
    logger.error('db.moderation_log_failed', { error: err.message });
  }
}

// ─── Source References ──────────────────────────────────────────────

/**
 * Store source references for a slot.
 * @param {number|string} slotId
 * @param {Array<{url: string, domain: string, type: string}>} sources
 */
export async function writeSourceReferences(slotId, sources) {
  if (!sources?.length) return;
  try {
    const sb = getSupabase();
    const rows = sources.map(s => ({
      slot_id: slotId,
      url: s.url,
      domain: s.domain,
      source_type: s.type || 'review_site',
      is_compliant: s.is_compliant ?? true,
    }));
    await sb.from('source_references').insert(rows);
  } catch (err) {
    logger.error('db.source_refs_failed', { error: err.message, slot_id: slotId });
  }
}
