/**
 * Frontend analytics SDK.
 *
 * Keeps the old public API while sending the v2 event contract used by the
 * analytics API. Tracking still respects the existing analytics cookie consent.
 */
import {
  ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_EVENTS,
  getExperienceFromPath,
  getLegacyEventType,
  normalizeAnalyticsEventName,
  sanitizeAnalyticsProperties,
} from '../../shared/analytics.js';

const API_BASE = '/api/analytics';
const SESSION_KEY = 'analytics_session';
const VISITOR_KEY = 'analytics_visitor';
const FINGERPRINT_KEY = 'analytics_fp';
const ANONYMOUS_ID_KEY = 'analytics_anonymous_id';
const BATCH_INTERVAL = 3000;
const MAX_BATCH_SIZE = 20;

let sessionId = null;
let visitorId = null;
let anonymousId = null;
let eventBatch = [];
let batchTimer = null;
let initialized = false;
let trackingEnabled = true;

function safeStorage(storage, action, key, value) {
  try {
    if (action === 'get') return storage.getItem(key);
    if (action === 'set') storage.setItem(key, value);
  } catch {
    return null;
  }
  return null;
}

function randomId(prefix = 'evt') {
  if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function getAnonymousId() {
  const stored = safeStorage(localStorage, 'get', ANONYMOUS_ID_KEY);
  if (stored) return stored;
  const next = randomId('anon');
  safeStorage(localStorage, 'set', ANONYMOUS_ID_KEY, next);
  return next;
}

function generateFingerprint() {
  const stored = safeStorage(localStorage, 'get', FINGERPRINT_KEY);
  if (stored) return stored;

  const nav = window.navigator;
  const screen = window.screen;
  const raw = [
    anonymousId || getAnonymousId(),
    nav.language,
    `${screen.width}x${screen.height}`,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash &= hash;
  }
  const fp = `fp_${Math.abs(hash).toString(36)}`;
  safeStorage(localStorage, 'set', FINGERPRINT_KEY, fp);
  return fp;
}

function hasAnalyticsConsent() {
  try {
    const consent = JSON.parse(localStorage.getItem('cookie_consent'));
    return consent?.analytics === true;
  } catch {
    return false;
  }
}

async function apiCall(action, body = null, method = 'POST', { keepalive = false } = {}) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      keepalive,
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

function buildEvent(eventName, details = {}) {
  const normalized = normalizeAnalyticsEventName(eventName);
  const route = details.route || details.page_url || `${window.location.pathname}${window.location.search}`;
  const properties = sanitizeAnalyticsProperties(details.properties || details.metadata || {});

  return {
    event_id: details.event_id || randomId('evt'),
    event_name: normalized,
    event_type: details.event_type || getLegacyEventType(normalized),
    event_version: ANALYTICS_SCHEMA_VERSION,
    occurred_at: new Date().toISOString(),
    anonymous_id: anonymousId || getAnonymousId(),
    session_id: sessionId,
    visitor_id: visitorId,
    page_url: details.page_url || route,
    page_title: details.page_title || document.title,
    route,
    source: details.source || document.referrer || 'direct',
    experience: details.experience || getExperienceFromPath(route),
    environment: import.meta.env.MODE || 'production',
    offer_id: details.offer_id || properties.offer_id || null,
    element_id: details.element_id || properties.element_id || null,
    element_text: details.element_text || properties.element_text || null,
    target_url: details.target_url || properties.target_url || null,
    properties,
    metadata: properties,
  };
}

function scheduleBatch() {
  if (batchTimer) return;
  batchTimer = window.setTimeout(flushBatch, BATCH_INTERVAL);
}

export async function flushBatch({ keepalive = false } = {}) {
  batchTimer = null;
  if (!eventBatch.length || !sessionId || !visitorId) return;

  const batch = eventBatch.splice(0, MAX_BATCH_SIZE);
  await apiCall('track', batch, 'POST', { keepalive });
  if (eventBatch.length > 0) scheduleBatch();
}

export async function initAnalytics() {
  if (initialized) return { session_id: sessionId, visitor_id: visitorId };
  anonymousId = getAnonymousId();

  if (!hasAnalyticsConsent()) {
    trackingEnabled = false;
    return null;
  }

  try {
    const fingerprint = generateFingerprint();
    const stored = safeStorage(sessionStorage, 'get', SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.session_id && parsed.visitor_id && Date.now() - parsed.ts < 1800000) {
          sessionId = parsed.session_id;
          visitorId = parsed.visitor_id;
          initialized = true;
          return { session_id: sessionId, visitor_id: visitorId };
        }
      } catch {
        // Create a fresh session below.
      }
    }

    const params = new URLSearchParams(window.location.search);
    const result = await apiCall('session', {
      fingerprint,
      anonymous_id: anonymousId,
      referrer: document.referrer || null,
      landing_page: window.location.pathname,
      experience: getExperienceFromPath(window.location.pathname),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
    });

    if (result?.session_id) {
      sessionId = result.session_id;
      visitorId = result.visitor_id;
      safeStorage(sessionStorage, 'set', SESSION_KEY, JSON.stringify({
        session_id: sessionId,
        visitor_id: visitorId,
        ts: Date.now(),
      }));
      safeStorage(localStorage, 'set', VISITOR_KEY, visitorId);
      initialized = true;
    }

    return result;
  } catch (err) {
    console.warn('[Analytics] Init failed:', err.message);
    return null;
  }
}

export function trackPageView(url, title) {
  if (!trackingEnabled || !initialized) return;
  queueEvent(buildEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
    page_url: url || `${window.location.pathname}${window.location.search}`,
    page_title: title || document.title,
  }));
}

export function trackEvent(eventType, metadata = {}) {
  if (!trackingEnabled || !initialized) return;
  queueEvent(buildEvent(eventType, { metadata }));
}

export function trackOfferClick(offerId, metadata = {}) {
  if (!trackingEnabled || !initialized) return;
  queueEvent(buildEvent(ANALYTICS_EVENTS.OFFER_CLICKED, {
    offer_id: offerId,
    metadata: {
      ...metadata,
      offer_id: offerId,
    },
  }));
}

export function trackButtonClick(elementId, elementText, metadata = {}) {
  if (!trackingEnabled || !initialized) return;
  queueEvent(buildEvent(ANALYTICS_EVENTS.UI_BUTTON_CLICKED, {
    element_id: elementId,
    element_text: elementText,
    metadata,
  }));
}

export function trackExternalLink(url, linkText) {
  if (!trackingEnabled || !initialized) return;
  const event = buildEvent(ANALYTICS_EVENTS.EXTERNAL_LINK_CLICKED, {
    target_url: url,
    element_text: linkText,
  });

  if (navigator.sendBeacon) {
    const body = new Blob([JSON.stringify(event)], { type: 'application/json' });
    navigator.sendBeacon(`${API_BASE}?action=track`, body);
  } else {
    queueEvent(event);
    flushBatch({ keepalive: true });
  }
}

export async function identifyUser({ user_id, twitch_id, twitch_username, twitch_avatar }) {
  if (!visitorId) return null;
  const result = await apiCall('identify', {
    visitor_id: visitorId,
    user_id,
    twitch_id,
    twitch_username,
    twitch_avatar,
  });
  trackEvent(ANALYTICS_EVENTS.USER_IDENTIFIED, { user_id, twitch_id, twitch_username });
  return result;
}

export function getAnalyticsSession() {
  return { session_id: sessionId, visitor_id: visitorId, anonymous_id: anonymousId, initialized, trackingEnabled };
}

export function updateConsent() {
  const hadConsent = trackingEnabled;
  trackingEnabled = hasAnalyticsConsent();
  if (trackingEnabled && !hadConsent && !initialized) initAnalytics();
}

function queueEvent(evt) {
  eventBatch.push(evt);
  if (eventBatch.length >= MAX_BATCH_SIZE) {
    flushBatch();
  } else {
    scheduleBatch();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventBatch.length > 0 && sessionId && visitorId && navigator.sendBeacon) {
      const batch = eventBatch.splice(0, MAX_BATCH_SIZE);
      const body = new Blob([JSON.stringify(batch)], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE}?action=track`, body);
    }
  });
}
