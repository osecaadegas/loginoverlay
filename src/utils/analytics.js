/**
 * analytics.js — Frontend tracking SDK.
 *
 * Provides:
 *   - initAnalytics()     — Create session, start tracking
 *   - trackPageView()     — Track page view
 *   - trackEvent(type, metadata)  — Track any event
 *   - trackOfferClick(offerId, metadata) — Track offer click
 *   - trackButtonClick(elementId, text, metadata) — Track button click
 *   - trackExternalLink(url, text) — Track external link
 *   - identifyUser(userData) — Link visitor to Twitch user
 *   - getAnalyticsSession() — Get current session info
 *
 * Respects cookie consent (analytics category).
 * Batches events for performance.
 */

const API_BASE = '/api/analytics';
const SESSION_KEY = 'analytics_session';
const VISITOR_KEY = 'analytics_visitor';
const FINGERPRINT_KEY = 'analytics_fp';
const BATCH_INTERVAL = 3000; // 3 seconds
const MAX_BATCH_SIZE = 20;

let sessionId = null;
let visitorId = null;
let eventBatch = [];
let batchTimer = null;
let initialized = false;
let trackingEnabled = true;

/* ─── Fingerprint (simple, privacy-friendly) ─── */
function generateFingerprint() {
  const stored = localStorage.getItem(FINGERPRINT_KEY);
  if (stored) return stored;

  const nav = window.navigator;
  const screen = window.screen;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || '',
    nav.maxTouchPoints || 0,
  ].join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit
  }
  const fp = 'fp_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
  localStorage.setItem(FINGERPRINT_KEY, fp);
  return fp;
}

/* ─── Consent Check ─── */
function hasAnalyticsConsent() {
  try {
    const consent = JSON.parse(localStorage.getItem('cookie_consent'));
    return consent?.analytics === true;
  } catch {
    return false;
  }
}

/* ─── API Helper ─── */
async function apiCall(action, body = null, method = 'POST') {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body && method === 'POST') opts.body = JSON.stringify(body);

    const url = method === 'GET' && body
      ? `${API_BASE}?action=${action}&${new URLSearchParams(body).toString()}`
      : `${API_BASE}?action=${action}`;

    const res = await fetch(url, opts);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[Analytics]', err.message);
    return null;
  }
}

/* ─── Batch Processing ─── */
function scheduleBatch() {
  if (batchTimer) return;
  batchTimer = setTimeout(flushBatch, BATCH_INTERVAL);
}

async function flushBatch() {
  batchTimer = null;
  if (!eventBatch.length || !sessionId || !visitorId) return;

  const batch = eventBatch.splice(0, MAX_BATCH_SIZE);
  // Send each event (API handles one at a time for fraud detection)
  await Promise.allSettled(batch.map(evt =>
    apiCall('track', {
      session_id: sessionId,
      visitor_id: visitorId,
      ...evt,
    })
  ));

  // If there are more, schedule another flush
  if (eventBatch.length > 0) scheduleBatch();
}

/* ─── Public API ─── */

/**
 * Initialize analytics — creates session, starts tracking.
 * Call once on app mount.
 */
export async function initAnalytics() {
  if (initialized) return { session_id: sessionId, visitor_id: visitorId };
  if (!hasAnalyticsConsent()) {
    trackingEnabled = false;
    return null;
  }

  try {
    const fingerprint = generateFingerprint();

    // Check for existing session (within 30 min)
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.session_id && parsed.visitor_id && Date.now() - parsed.ts < 1800000) {
          sessionId = parsed.session_id;
          visitorId = parsed.visitor_id;
          initialized = true;
          return { session_id: sessionId, visitor_id: visitorId };
        }
      } catch { /* create new */ }
    }

    const result = await apiCall('session', {
      fingerprint,
      referrer: document.referrer || null,
      landing_page: window.location.pathname,
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
    });

    if (result?.session_id) {
      sessionId = result.session_id;
      visitorId = result.visitor_id;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        session_id: sessionId,
        visitor_id: visitorId,
        ts: Date.now(),
      }));
      localStorage.setItem(VISITOR_KEY, visitorId);
      initialized = true;
    }

    return result;
  } catch (err) {
    console.warn('[Analytics] Init failed:', err.message);
    return null;
  }
}

/**
 * Track a page view.
 */
export function trackPageView(url, title) {
  if (!trackingEnabled || !initialized) return;
  queueEvent({
    event_type: 'pageview',
    page_url: url || window.location.pathname,
    page_title: title || document.title,
  });
}

/**
 * Track a generic event.
 */
export function trackEvent(eventType, metadata = {}) {
  if (!trackingEnabled || !initialized) return;
  queueEvent({
    event_type: eventType,
    page_url: window.location.pathname,
    metadata,
  });
}

/**
 * Track an offer click.
 */
export function trackOfferClick(offerId, metadata = {}) {
  if (!trackingEnabled || !initialized) return;
  queueEvent({
    event_type: 'offer_click',
    page_url: window.location.pathname,
    offer_id: offerId,
    metadata,
  });
}

/**
 * Track a button click.
 */
export function trackButtonClick(elementId, elementText, metadata = {}) {
  if (!trackingEnabled || !initialized) return;
  queueEvent({
    event_type: 'button_click',
    page_url: window.location.pathname,
    element_id: elementId,
    element_text: elementText,
    metadata,
  });
}

/**
 * Track an external link redirect.
 */
export function trackExternalLink(url, linkText) {
  if (!trackingEnabled || !initialized) return;
  // Flush immediately for external links (user is leaving)
  const evt = {
    event_type: 'external_link',
    page_url: window.location.pathname,
    target_url: url,
    element_text: linkText,
  };
  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    const payload = JSON.stringify({
      session_id: sessionId,
      visitor_id: visitorId,
      ...evt,
    });
    navigator.sendBeacon(`${API_BASE}?action=track`, payload);
  } else {
    queueEvent(evt);
    flushBatch();
  }
}

/**
 * Link the current visitor to a Twitch user after login.
 */
export async function identifyUser({ user_id, twitch_id, twitch_username, twitch_avatar }) {
  if (!visitorId) return;
  return apiCall('identify', {
    visitor_id: visitorId,
    user_id,
    twitch_id,
    twitch_username,
    twitch_avatar,
  });
}

/**
 * Get the current analytics session info.
 */
export function getAnalyticsSession() {
  return { session_id: sessionId, visitor_id: visitorId, initialized, trackingEnabled };
}

/**
 * Re-check consent and enable/disable tracking.
 * Call this after user changes consent settings.
 */
export function updateConsent() {
  const hadConsent = trackingEnabled;
  trackingEnabled = hasAnalyticsConsent();
  if (trackingEnabled && !hadConsent && !initialized) {
    initAnalytics();
  }
}

/* ─── Internal ─── */
function queueEvent(evt) {
  eventBatch.push(evt);
  if (eventBatch.length >= MAX_BATCH_SIZE) {
    flushBatch();
  } else {
    scheduleBatch();
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventBatch.length > 0 && sessionId && visitorId) {
      const payload = JSON.stringify(eventBatch.map(evt => ({
        session_id: sessionId,
        visitor_id: visitorId,
        ...evt,
      })));
      navigator.sendBeacon?.(`${API_BASE}?action=track`, payload);
    }
  });
}
