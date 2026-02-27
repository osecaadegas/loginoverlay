/**
 * @module pipeline
 * Main orchestrator for the slot ingestion pipeline.
 *
 * Execution order:
 *   1. Input validation
 *   2. Content safety gate
 *   3. Cache check
 *   4. Duplicate detection
 *   5. AI extraction (Gemini + Google Search grounding)
 *   6. Data validation + normalization
 *   7. Source compliance filtering
 *   8. Image pipeline (search + Gemini Vision safety)
 *   9. Confidence gate
 *  10. Database storage (upsert)
 *  11. Audit logging
 *
 * Each step is idempotent and independently testable.
 */

import { logger } from './logger.js';
import { IngestionError, classifyError, moderationError } from './errors.js';
import {
  validateInput,
  checkContentSafety,
  validateSlotData,
} from './validator.js';
import {
  extractSlotMetadata,
  findSafeImage,
} from './extractor.js';
import {
  buildCacheKey,
  cacheGet,
  cacheSet,
  checkDuplicate,
  upsertSlot,
  writeIngestionLog,
  writeModerationLog,
  writeSourceReferences,
} from './db.js';
import { CONFIDENCE_THRESHOLD } from './config.js';

/**
 * @typedef {object} PipelineResult
 * @property {boolean}  ok              - Whether the pipeline succeeded
 * @property {string}   action          - 'inserted' | 'updated' | 'cached' | 'duplicate'
 * @property {object}   slot            - The final slot data
 * @property {number}   confidence      - Confidence score (0-100)
 * @property {string}   source          - Data source label
 * @property {boolean}  needsReview     - True if below confidence threshold
 * @property {object}   [image]         - Image pipeline result
 * @property {string[]} [warnings]      - Non-fatal warnings
 * @property {number}   duration_ms     - Total pipeline execution time
 */

/**
 * Execute the full ingestion pipeline for a single slot.
 *
 * @param {object}  input       - Raw request body { name, provider?, skipCache?, skipImage?, forceRefresh? }
 * @param {object}  [context]   - Request context for audit trail
 * @param {string}  [context.userId]   - Requesting user ID
 * @param {string}  [context.ip]       - Requesting IP
 * @returns {Promise<PipelineResult>}
 */
export async function ingestSlot(input, context = {}) {
  const pipelineTimer = logger.startTimer('pipeline.total');
  const warnings = [];
  let logEntry = {
    slot_name: input?.name || 'unknown',
    provider_hint: input?.provider || null,
    requested_by: context.userId || 'system',
    ip_address: context.ip || null,
    metadata: {},
  };

  try {
    // ── Step 1: Input validation ──────────────────────────────────
    logger.info('pipeline.start', { name: input?.name, provider: input?.provider });
    const { name, provider, options } = validateInput(input);
    logEntry.slot_name = name;
    logEntry.provider_hint = provider;

    // ── Step 2: Content safety gate ───────────────────────────────
    const nameCheck = checkContentSafety(name);
    if (nameCheck.blocked) {
      throw moderationError(
        `Blocked content in slot name: "${nameCheck.term}"`,
        { name, blocked_term: nameCheck.term }
      );
    }
    if (provider) {
      const provCheck = checkContentSafety(provider);
      if (provCheck.blocked) {
        throw moderationError(
          `Blocked content in provider name: "${provCheck.term}"`,
          { provider, blocked_term: provCheck.term }
        );
      }
    }

    // ── Step 3: Cache check ───────────────────────────────────────
    if (!options.skipCache && !options.forceRefresh) {
      const cacheKey = buildCacheKey(name, provider);
      const cached = await cacheGet(cacheKey);
      if (cached) {
        logger.info('pipeline.cache_hit', { name });
        const duration_ms = pipelineTimer.end({ name, action: 'cached' });
        logEntry.status = 'completed';
        logEntry.source = 'cache';
        logEntry.duration_ms = duration_ms;
        logEntry.confidence_score = cached.confidence_score;
        writeIngestionLog(logEntry); // fire-and-forget

        return {
          ok: true,
          action: 'cached',
          slot: cached,
          confidence: cached.confidence_score || 0,
          source: 'cache',
          needsReview: false,
          warnings: [],
          duration_ms,
        };
      }
    }

    // ── Step 4: Duplicate detection ───────────────────────────────
    if (!options.forceRefresh) {
      const dupCheck = await checkDuplicate(name, provider);
      if (dupCheck.isDuplicate) {
        logger.info('pipeline.duplicate', { name, existing_id: dupCheck.existingSlot.id });
        const duration_ms = pipelineTimer.end({ name, action: 'duplicate' });
        logEntry.status = 'completed';
        logEntry.source = 'database';
        logEntry.duration_ms = duration_ms;
        logEntry.result_slot_id = dupCheck.existingSlot.id;
        writeIngestionLog(logEntry);

        return {
          ok: true,
          action: 'duplicate',
          slot: dupCheck.existingSlot,
          confidence: dupCheck.existingSlot.confidence_score || 0,
          source: 'database',
          needsReview: false,
          warnings: [],
          duration_ms,
        };
      }
    }

    // ── Step 5: AI Extraction ─────────────────────────────────────
    const extraction = await extractSlotMetadata(name, provider);
    logEntry.source = extraction.source;
    logEntry.gemini_tokens_used = extraction.tokens;
    logEntry.metadata.ai_source = extraction.source;

    // ── Step 6: Validate + normalize extracted data ───────────────
    const validated = validateSlotData(extraction.data, name);

    // ── Step 7: Source compliance ─────────────────────────────────
    if (validated._rejectedSources?.length) {
      warnings.push(`${validated._rejectedSources.length} source(s) rejected for compliance`);
      logger.warn('pipeline.sources_rejected', {
        name,
        rejected: validated._rejectedSources,
      });
    }

    // ── Step 8: Image pipeline ────────────────────────────────────
    let imageResult = { url: null, status: 'pending', reason: 'skipped' };

    if (!options.skipImage) {
      imageResult = await findSafeImage(validated.name, validated.provider);
      if (imageResult.url) {
        validated.image = imageResult.url;
        validated.image_safety_status = imageResult.status; // 'safe' | 'quarantined' | 'not_found'
      }

      if (imageResult.status === 'quarantined') {
        warnings.push('Image was quarantined — all candidates flagged by AI safety check');
        // Log moderation event
        writeModerationLog({
          slot_name: validated.name,
          check_type: 'image_safety',
          status: 'quarantined',
          details: { name: validated.name, image_url: imageResult.url, reason: imageResult.reason },
          flagged_reasons: ['ai_image_safety_check_failed'],
        });
      }
    }

    // ── Step 9: Confidence gate ───────────────────────────────────
    const needsReview = validated.confidence_score < CONFIDENCE_THRESHOLD;
    if (needsReview) {
      validated.moderation_status = 'manual_review';
      warnings.push(`Low confidence (${validated.confidence_score}/${CONFIDENCE_THRESHOLD}) — flagged for manual review`);
    } else {
      validated.moderation_status = 'approved';
    }

    // ── Step 10: Database storage ─────────────────────────────────
    const { id, isNew } = await upsertSlot(validated);
    const action = isNew ? 'inserted' : 'updated';

    // ── Step 11: Post-storage tasks (async, non-blocking) ────────

    // Write source references
    if (validated._validSources?.length) {
      writeSourceReferences(
        id,
        validated._validSources.map(s => ({ ...s, type: 'review_site' }))
      );
    }

    // Cache the result
    const cacheKey = buildCacheKey(name, provider);
    const cachePayload = {
      id,
      name: validated.name,
      provider: validated.provider,
      rtp: validated.rtp,
      volatility: validated.volatility,
      max_win_multiplier: validated.max_win_multiplier,
      theme: validated.theme,
      features: validated.features,
      image: validated.image || null,
      twitch_safe: validated.twitch_safe,
      confidence_score: validated.confidence_score,
      release_year: validated.release_year,
    };
    cacheSet(cacheKey, cachePayload);

    // Write moderation log
    writeModerationLog({
      slot_id: id,
      slot_name: validated.name,
      check_type: 'content_filter',
      status: needsReview ? 'manual_review' : 'approved',
      details: {
        confidence: validated.confidence_score,
        source: extraction.source,
        twitch_safe: validated.twitch_safe,
      },
    });

    // ── Finalize ──────────────────────────────────────────────────
    const duration_ms = pipelineTimer.end({ name: validated.name, action });
    logEntry.status = 'completed';
    logEntry.confidence_score = validated.confidence_score;
    logEntry.result_slot_id = id;
    logEntry.duration_ms = duration_ms;
    writeIngestionLog(logEntry);

    return {
      ok: true,
      action,
      slot: {
        id,
        ...cachePayload,
      },
      confidence: validated.confidence_score,
      source: extraction.source,
      needsReview,
      image: imageResult,
      warnings,
      duration_ms,
    };
  } catch (err) {
    // ── Error handling ────────────────────────────────────────────
    const classified = classifyError(err);
    const duration_ms = pipelineTimer.end({ name: input?.name, error: classified.type });

    logEntry.status = 'failed';
    logEntry.error_type = classified.type;
    logEntry.error_message = classified.message;
    logEntry.duration_ms = duration_ms;
    writeIngestionLog(logEntry);

    logger.error('pipeline.failed', {
      name: input?.name,
      error_type: classified.type,
      error_message: classified.message,
    });

    throw classified;
  }
}

/**
 * Batch ingest multiple slots.
 * Processes sequentially to respect rate limits.
 *
 * @param {Array<{name: string, provider?: string}>} items
 * @param {object} [context]
 * @returns {Promise<{results: PipelineResult[], errors: object[], summary: object}>}
 */
export async function ingestBatch(items, context = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return { results: [], errors: [], summary: { total: 0 } };
  }

  const MAX_BATCH = 50;
  const batch = items.slice(0, MAX_BATCH);
  const results = [];
  const errors = [];

  logger.info('pipeline.batch_start', { count: batch.length });

  for (const item of batch) {
    try {
      const result = await ingestSlot(item, context);
      results.push(result);
    } catch (err) {
      const classified = classifyError(err);
      errors.push({
        name: item.name,
        provider: item.provider,
        error: classified.toJSON(),
      });
    }

    // Small delay between items to be respectful to APIs
    await new Promise(r => setTimeout(r, 200));
  }

  const summary = {
    total: batch.length,
    succeeded: results.length,
    failed: errors.length,
    inserted: results.filter(r => r.action === 'inserted').length,
    updated: results.filter(r => r.action === 'updated').length,
    cached: results.filter(r => r.action === 'cached').length,
    duplicates: results.filter(r => r.action === 'duplicate').length,
    needs_review: results.filter(r => r.needsReview).length,
    truncated: items.length > MAX_BATCH,
  };

  logger.info('pipeline.batch_complete', summary);

  return { results, errors, summary };
}
