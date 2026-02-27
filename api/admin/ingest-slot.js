/**
 * Vercel Serverless Function: POST /api/admin/ingest-slot
 *
 * Production-grade admin endpoint for the slot ingestion engine.
 *
 * Features:
 * ✅ Admin role verification (user_roles table + metadata fallback)
 * ✅ DB-backed rate limiting (30 req/min per user)
 * ✅ Single slot + batch ingestion
 * ✅ Standardized JSON responses with typed errors
 * ✅ CORS support
 * ✅ IP logging + audit trail
 *
 * Usage:
 *   POST /api/admin/ingest-slot
 *   Authorization: Bearer <supabase_jwt>
 *   Body: { "name": "Mental", "provider": "Nolimit City" }
 *
 *   Batch:
 *   POST /api/admin/ingest-slot
 *   Body: { "batch": [{ "name": "Mental" }, { "name": "Wanted Dead or a Wild" }] }
 */

import { verifyAdmin, checkRateLimit } from '../_lib/ingestion/db.js';
import { ingestSlot, ingestBatch } from '../_lib/ingestion/pipeline.js';
import { IngestionError, authError, validationError, rateLimitError, classifyError } from '../_lib/ingestion/errors.js';
import { logger } from '../_lib/ingestion/logger.js';

// ─── Helpers ────────────────────────────────────────────────────────

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function corsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonResponse(res, status, body) {
  return res.status(status).json(body);
}

// ─── Handler ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Set CORS headers on every response
  const cors = corsHeaders(req);
  for (const [key, val] of Object.entries(cors)) {
    res.setHeader(key, val);
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, {
      ok: false,
      error: { type: 'method_not_allowed', message: 'Only POST is allowed' },
    });
  }

  const ip = getClientIP(req);

  try {
    // ── Authentication ──────────────────────────────────────────
    const auth = await verifyAdmin(req.headers.authorization);
    if (!auth.authorized) {
      logger.warn('auth.rejected', { ip, error: auth.error });
      throw authError(auth.error || 'Unauthorized');
    }

    const userId = auth.user.id;
    logger.info('auth.verified', { userId, ip, roles: auth.roles });

    // ── Rate Limiting ───────────────────────────────────────────
    await checkRateLimit(userId, 'ingest-slot');

    // ── Dispatch ────────────────────────────────────────────────
    const body = req.body || {};

    // Batch mode
    if (Array.isArray(body.batch)) {
      if (body.batch.length === 0) {
        throw validationError('Batch array is empty');
      }
      if (body.batch.length > 50) {
        throw validationError('Batch size exceeds maximum of 50', { received: body.batch.length });
      }

      const result = await ingestBatch(body.batch, { userId, ip });

      return jsonResponse(res, 200, {
        ok: true,
        mode: 'batch',
        ...result.summary,
        results: result.results.map(formatResult),
        errors: result.errors,
      });
    }

    // Single slot mode
    if (!body.name) {
      throw validationError('Field "name" is required. For batch, use { "batch": [...] }');
    }

    const result = await ingestSlot(body, { userId, ip });

    return jsonResponse(res, 200, {
      ok: true,
      mode: 'single',
      ...formatResult(result),
    });
  } catch (err) {
    // ── Error Response ──────────────────────────────────────────
    const classified = err instanceof IngestionError ? err : classifyError(err);

    logger.error('handler.error', {
      ip,
      type: classified.type,
      message: classified.message,
    });

    return jsonResponse(res, classified.statusCode || 500, classified.toJSON());
  }
}

// ─── Response Formatting ────────────────────────────────────────────

/**
 * Format a pipeline result for API response.
 * Strips internal fields and sensitive data.
 *
 * @param {object} result
 * @returns {object}
 */
function formatResult(result) {
  return {
    action: result.action,
    slot: {
      id: result.slot?.id,
      name: result.slot?.name,
      provider: result.slot?.provider,
      rtp: result.slot?.rtp,
      volatility: result.slot?.volatility,
      max_win_multiplier: result.slot?.max_win_multiplier,
      theme: result.slot?.theme,
      features: result.slot?.features,
      image: result.slot?.image,
      twitch_safe: result.slot?.twitch_safe,
      release_year: result.slot?.release_year,
    },
    confidence: result.confidence,
    source: result.source,
    needsReview: result.needsReview,
    image: result.image ? {
      status: result.image.status,
      reason: result.image.reason,
    } : null,
    warnings: result.warnings || [],
    duration_ms: result.duration_ms,
  };
}
