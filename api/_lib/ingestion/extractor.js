/**
 * @module extractor
 * AI-powered slot metadata extraction using Gemini with Google Search grounding.
 *
 * Two-stage extraction:
 *   1. Gemini with google_search tool (live internet) → structured JSON
 *   2. Fallback: plain Gemini (parametric knowledge) → structured JSON
 *
 * Image pipeline:
 *   1. Google Images server-side fetch → URL blocklist filter
 *   2. Gemini Vision safety check → safe/unsafe classification
 */

import { logger } from './logger.js';
import { aiError, internalError } from './errors.js';
import {
  GEMINI_URL,
  GEMINI_MAX_RETRIES,
  GEMINI_RETRY_BASE_MS,
  GEMINI_TIMEOUT_MS,
  BLOCKED_IMAGE_KEYWORDS,
} from './config.js';

// ─── Constants ──────────────────────────────────────────────────────

const GEMINI_KEY = () => process.env.GEMINI_API_KEY;

/**
 * Structured prompt for slot metadata extraction.
 * Designed for deterministic JSON output with anti-hallucination instructions.
 */
const EXTRACTION_PROMPT = (name, providerHint) => `
You are a slot game metadata expert. Extract VERIFIED metadata for the online slot game "${name}"${providerHint ? ` by ${providerHint}` : ''}.

CRITICAL RULES:
- Only return data you are CONFIDENT about from reputable sources.
- If you are unsure about a value, set it to null.
- Never hallucinate or guess RTP, volatility, or max win values.
- Always prefer official provider data over third-party sources.
- Return ONLY a raw JSON object. NO markdown, NO code fences, NO explanation.

Return this exact JSON structure:
{
  "name": "Official slot name with proper capitalization",
  "provider": "Official provider/studio name",
  "rtp": 96.50,
  "volatility": "high",
  "max_win": "10000x",
  "theme": "Brief theme description",
  "features": "Key features comma-separated",
  "release_year": 2024,
  "confidence": 85,
  "sources": ["https://source1.com/page", "https://source2.com/page"],
  "twitch_safe": true
}

Field notes:
- rtp: Return as a number (e.g. 96.50). Must be between 80 and 99.99. Null if unknown.
- volatility: One of "low", "medium", "high", "very_high". Null if unknown.
- max_win: Format as "10000x" or similar multiplier. Null if unknown.
- confidence: Your confidence (0-100) that this data is accurate.
- sources: URLs where you found this information. Empty array if from memory.
- twitch_safe: true if safe for Twitch streaming, false if contains NSFW/explicit imagery.
`.trim();

// ─── Gemini API Call ────────────────────────────────────────────────

/**
 * Call Gemini API with optional Google Search grounding.
 *
 * @param {string} prompt
 * @param {object} [options]
 * @param {boolean} [options.useGrounding=false] - Enable google_search tool
 * @param {number} [options.temperature=0.1]
 * @param {number} [options.maxTokens=1024]
 * @returns {Promise<{text: string, tokens?: number, grounded: boolean}>}
 */
async function callGemini(prompt, { useGrounding = false, temperature = 0.1, maxTokens = 1024 } = {}) {
  const apiKey = GEMINI_KEY();
  if (!apiKey) throw internalError('GEMINI_API_KEY not configured');

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };

  // Add google_search tool for grounded responses
  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  let lastError = null;

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        // Rate limited — wait and retry
        const delay = GEMINI_RETRY_BASE_MS * Math.pow(2, attempt);
        logger.warn('gemini.rate_limited', { attempt, delay });
        await sleep(delay);
        lastError = aiError('Gemini rate limited');
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown');
        throw aiError(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokens = data?.usageMetadata?.totalTokenCount || null;

      if (!text.trim()) {
        throw aiError('Gemini returned empty response');
      }

      return { text, tokens, grounded: useGrounding };
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = aiError('Gemini request timed out', { timeout: GEMINI_TIMEOUT_MS });
      }
      if (attempt < GEMINI_MAX_RETRIES) {
        const delay = GEMINI_RETRY_BASE_MS * Math.pow(2, attempt);
        logger.warn('gemini.retry', { attempt: attempt + 1, error: lastError.message, delay });
        await sleep(delay);
      }
    }
  }

  throw lastError || aiError('Gemini extraction failed after all retries');
}

// ─── JSON Parsing ───────────────────────────────────────────────────

/**
 * Extract and parse JSON from Gemini response text.
 * Handles markdown fences, trailing text, and common formatting issues.
 *
 * @param {string} raw
 * @returns {object|null}
 */
function parseGeminiJSON(raw) {
  if (!raw) return null;
  let text = raw.trim();

  // Remove markdown code fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '');
  }

  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // noop
  }

  // Try extracting first JSON object
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // noop
    }
  }

  return null;
}

// ─── Slot Extraction ────────────────────────────────────────────────

/**
 * Extract slot metadata using Gemini with two-stage fallback:
 *   1. Grounded search (live internet via google_search tool)
 *   2. Plain Gemini (parametric knowledge)
 *
 * @param {string} name - Slot name to search for
 * @param {string} [provider] - Provider hint for disambiguation
 * @returns {Promise<{data: object, source: string, tokens: number}>}
 */
export async function extractSlotMetadata(name, provider) {
  const timer = logger.startTimer('extract.slot');
  const prompt = EXTRACTION_PROMPT(name, provider);

  // Stage 1: Grounded search
  try {
    logger.info('extract.grounded_start', { name, provider });
    const result = await callGemini(prompt, { useGrounding: true });
    const data = parseGeminiJSON(result.text);

    if (data && data.name) {
      timer.end({ name, source: 'google_ai', confidence: data.confidence });
      return {
        data,
        source: 'google_ai',
        tokens: result.tokens || 0,
      };
    }
    logger.warn('extract.grounded_empty', { name });
  } catch (err) {
    logger.warn('extract.grounded_failed', { name, error: err.message });
  }

  // Stage 2: Plain Gemini (parametric knowledge)
  try {
    logger.info('extract.plain_start', { name, provider });
    const result = await callGemini(prompt, { useGrounding: false });
    const data = parseGeminiJSON(result.text);

    if (data && data.name) {
      // Lower confidence for non-grounded results
      if (typeof data.confidence === 'number') {
        data.confidence = Math.min(data.confidence, 70);
      }
      timer.end({ name, source: 'gemini_ai', confidence: data.confidence });
      return {
        data,
        source: 'gemini_ai',
        tokens: result.tokens || 0,
      };
    }
    throw aiError('Gemini returned no usable data');
  } catch (err) {
    timer.end({ name, source: 'failed', error: err.message });
    throw err instanceof Error && err.type ? err : aiError(`Extraction failed: ${err.message}`);
  }
}

// ─── Image Search + Safety ──────────────────────────────────────────

/**
 * Search Google Images and return a safe image URL.
 *
 * Pipeline:
 *   1. Google Images server fetch (SafeSearch implicit via query)
 *   2. URL blocklist filter
 *   3. Gemini Vision safety validation (checks top 3 candidates)
 *
 * @param {string} name - Slot name
 * @param {string} [provider] - Provider for disambiguation
 * @returns {Promise<{url: string|null, status: string, reason: string}>}
 */
export async function findSafeImage(name, provider) {
  const apiKey = GEMINI_KEY();
  if (!apiKey) return { url: null, status: 'not_found', reason: 'No API key' };

  const timer = logger.startTimer('extract.image');

  try {
    // Build search query
    const query = provider
      ? `"${provider}" "${name}" slot game`
      : `"${name}" online slot game logo`;

    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;

    const googleRes = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!googleRes.ok) {
      timer.end({ name, status: 'not_found' });
      return { url: null, status: 'not_found', reason: `Google ${googleRes.status}` };
    }

    const html = await googleRes.text();
    const candidates = extractImageUrls(html);

    if (!candidates.length) {
      timer.end({ name, status: 'not_found' });
      return { url: null, status: 'not_found', reason: 'No images found' };
    }

    // Validate top 3 candidates with Gemini Vision
    for (let i = 0; i < Math.min(3, candidates.length); i++) {
      const check = await validateImageSafety(apiKey, candidates[i], name);
      if (check.safe) {
        timer.end({ name, status: 'safe', candidate: i });
        return { url: candidates[i], status: 'safe', reason: check.reason };
      }
      logger.debug('extract.image_rejected', { name, index: i, reason: check.reason });
    }

    // All candidates failed — return first with unsafe marker
    timer.end({ name, status: 'quarantined' });
    return { url: candidates[0], status: 'quarantined', reason: 'All candidates flagged by AI' };
  } catch (err) {
    logger.warn('extract.image_error', { name, error: err.message });
    timer.end({ name, status: 'not_found' });
    return { url: null, status: 'not_found', reason: err.message };
  }
}

// ─── Image URL Extraction from Google HTML ──────────────────────────

/**
 * Extract image URLs from Google Images HTML response.
 * @param {string} html
 * @returns {string[]}
 */
function extractImageUrls(html) {
  const candidates = [];

  // Strategy 1: JSON-embedded URLs with dimensions
  const rxStandard = /"(https?:\/\/[^"]+?\.(?:jpg|png|jpeg|webp))",\d+,\d+/g;
  let m;
  while ((m = rxStandard.exec(html)) !== null && candidates.length < 15) {
    candidates.push(m[1]);
  }

  // Strategy 2: generic image URLs in quotes
  if (!candidates.length) {
    const rxGeneric = /"(https?:\/\/[^"]+?\.(?:jpg|png|jpeg|webp))"/g;
    while ((m = rxGeneric.exec(html)) !== null && candidates.length < 15) {
      candidates.push(m[1]);
    }
  }

  // Filter out blocklisted URLs
  return candidates.filter(url => {
    const lower = url.toLowerCase();
    return !BLOCKED_IMAGE_KEYWORDS.some(kw => lower.includes(kw));
  });
}

// ─── Gemini Vision Image Safety ─────────────────────────────────────

/**
 * Validate an image URL for Twitch/streaming safety using Gemini Vision.
 *
 * @param {string} apiKey
 * @param {string} imageUrl
 * @param {string} slotName
 * @returns {Promise<{safe: boolean, reason: string}>}
 */
async function validateImageSafety(apiKey, imageUrl, slotName) {
  try {
    // Fetch image
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SlotBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (!imgRes.ok) return { safe: false, reason: 'image_unreachable' };

    const contentType = imgRes.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return { safe: false, reason: 'not_an_image' };

    // Convert to base64
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = contentType.split(';')[0].trim();

    // Gemini Vision check
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64 } },
            {
              text: `This is a slot game cover image for "${slotName}". Evaluate if it is SAFE to display on a Twitch or YouTube live stream.

Return ONLY a raw JSON object (no markdown):
{"safe": true, "reason": "brief explanation"}

Mark safe=false if: nudity, sexual/suggestive content, excessive gore, drug use, real-world violence.
Mark safe=true for: standard slot art, cartoon violence, dark themes without explicit gore, anime characters in normal attire.`,
            },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return { safe: true, reason: 'validation_skipped' };

    const data = await response.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    raw = raw.trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

    const parsed = JSON.parse(raw);
    return {
      safe: typeof parsed.safe === 'boolean' ? parsed.safe : true,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'unknown',
    };
  } catch (e) {
    logger.warn('extract.vision_error', { imageUrl, error: e.message });
    return { safe: true, reason: 'validation_error' };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
