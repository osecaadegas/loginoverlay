/**
 * @module errors
 * Error classification system for the slot ingestion engine.
 * Every error in the pipeline is typed, structured, and JSON-serializable.
 *
 * Error types map directly to the `error_class` enum in PostgreSQL.
 */

/** @enum {string} */
export const ErrorType = Object.freeze({
  VALIDATION:  'validation_error',
  AI:          'ai_error',
  MODERATION:  'moderation_error',
  DUPLICATE:   'duplicate_error',
  SOURCE:      'source_error',
  RATE_LIMIT:  'rate_limit_error',
  AUTH:        'auth_error',
  INTERNAL:    'internal_error',
});

/**
 * Structured error for the ingestion pipeline.
 * Carries a type, message, optional details, and auto-timestamps.
 */
export class IngestionError extends Error {
  /**
   * @param {string} type    - One of ErrorType values
   * @param {string} message - Human-readable message
   * @param {Record<string, any>} [details={}] - Extra context (never contains secrets)
   */
  constructor(type, message, details = {}) {
    super(message);
    this.name = 'IngestionError';
    /** @type {string} */
    this.type = type;
    /** @type {Record<string, any>} */
    this.details = details;
    /** @type {string} */
    this.timestamp = new Date().toISOString();
    /** @type {number} */
    this.statusCode = STATUS_MAP[type] || 500;
  }

  /** Serialize for API response. */
  toJSON() {
    return {
      ok: false,
      error: {
        type: this.type,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

/** Maps error types to HTTP status codes. */
const STATUS_MAP = {
  [ErrorType.VALIDATION]:  400,
  [ErrorType.AI]:          502,
  [ErrorType.MODERATION]:  422,
  [ErrorType.DUPLICATE]:   409,
  [ErrorType.SOURCE]:      422,
  [ErrorType.RATE_LIMIT]:  429,
  [ErrorType.AUTH]:        401,
  [ErrorType.INTERNAL]:    500,
};

// ── Factory helpers ──────────────────────────────────────────────────

/** @param {string} msg @param {Record<string, any>} [d] */
export const validationError = (msg, d) => new IngestionError(ErrorType.VALIDATION, msg, d);

/** @param {string} msg @param {Record<string, any>} [d] */
export const aiError         = (msg, d) => new IngestionError(ErrorType.AI, msg, d);

/** @param {string} msg @param {Record<string, any>} [d] */
export const moderationError = (msg, d) => new IngestionError(ErrorType.MODERATION, msg, d);

/** @param {string} msg @param {Record<string, any>} [d] */
export const duplicateError  = (msg, d) => new IngestionError(ErrorType.DUPLICATE, msg, d);

/** @param {string} msg @param {Record<string, any>} [d] */
export const sourceError     = (msg, d) => new IngestionError(ErrorType.SOURCE, msg, d);

/** @param {string} msg @param {Record<string, any>} [d] */
export const rateLimitError  = (msg, d) => new IngestionError(ErrorType.RATE_LIMIT, msg, d);

/** @param {string} msg @param {Record<string, any>} [d] */
export const authError       = (msg, d) => new IngestionError(ErrorType.AUTH, msg, d);

/** @param {string} msg @param {Record<string, any>} [d] */
export const internalError   = (msg, d) => new IngestionError(ErrorType.INTERNAL, msg, d);

/**
 * Classify an unknown error into an IngestionError.
 * @param {unknown} err
 * @returns {IngestionError}
 */
export function classifyError(err) {
  if (err instanceof IngestionError) return err;
  const message = err?.message || 'Unknown error';
  if (message.includes('rate limit') || message.includes('429'))      return rateLimitError(message);
  if (message.includes('GEMINI') || message.includes('Gemini'))       return aiError(message);
  if (message.includes('duplicate') || message.includes('unique'))    return duplicateError(message);
  if (message.includes('auth') || message.includes('unauthorized'))   return authError(message);
  return internalError(message);
}
