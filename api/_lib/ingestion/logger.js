/**
 * @module logger
 * Structured JSON logging with observability hooks.
 *
 * Outputs newline-delimited JSON (NDJSON) — compatible with
 * Vercel Log Drains, Datadog, Logtail, and any log aggregator.
 *
 * Automatically redacts sensitive fields (apiKey, token, password).
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

/** @param {string} level */
function shouldLog(level) {
  return (LOG_LEVELS[level] ?? 1) >= (LOG_LEVELS[MIN_LEVEL] ?? 1);
}

/** Keys that must never appear in log output. */
const REDACT_KEYS = new Set(['apikey', 'api_key', 'token', 'password', 'secret', 'authorization', 'service_role_key']);

/**
 * Deep-redact sensitive fields from a data object.
 * @param {Record<string, any>} obj
 * @returns {Record<string, any>}
 */
function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clean)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof clean[key] === 'object' && clean[key] !== null) {
      clean[key] = redact(clean[key]);
    }
  }
  return clean;
}

/**
 * Build a structured log entry.
 * @param {string} level
 * @param {string} event
 * @param {Record<string, any>} data
 */
function formatEntry(level, event, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    service: 'slot-ingestion',
    event,
    ...redact(data),
  };
}

/**
 * Structured logger singleton.
 * Usage: `logger.info('slot.ingested', { name: 'Mental', provider: 'Nolimit City' })`
 */
export const logger = {
  debug(event, data)  { if (shouldLog('debug')) console.debug(JSON.stringify(formatEntry('debug', event, data))); },
  info(event, data)   { if (shouldLog('info'))  console.log(JSON.stringify(formatEntry('info', event, data))); },
  warn(event, data)   { if (shouldLog('warn'))  console.warn(JSON.stringify(formatEntry('warn', event, data))); },
  error(event, data)  { if (shouldLog('error')) console.error(JSON.stringify(formatEntry('error', event, data))); },

  /**
   * Start a performance timer. Call `.end()` to log the duration.
   * @param {string} event
   * @returns {{ end: (data?: Record<string, any>) => number }}
   */
  startTimer(event) {
    const start = Date.now();
    return {
      end(data = {}) {
        const duration_ms = Date.now() - start;
        logger.info(`${event}.completed`, { ...data, duration_ms });
        return duration_ms;
      },
    };
  },

  /**
   * Log a slot-specific event with standardized fields.
   * @param {string} event
   * @param {string} slotName
   * @param {Record<string, any>} data
   */
  slot(event, slotName, data = {}) {
    logger.info(event, { slot_name: slotName, ...data });
  },
};
