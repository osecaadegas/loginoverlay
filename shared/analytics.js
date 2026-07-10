export const ANALYTICS_SCHEMA_VERSION = 2;

export const ANALYTICS_PERIODS = {
  '24h': { label: 'Last 24 hours', days: 1 },
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
};

export const ANALYTICS_EXPERIENCES = ['public', 'player', 'streamer', 'overlay', 'admin'];

export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  UI_BUTTON_CLICKED: 'ui_button_clicked',
  EXTERNAL_LINK_CLICKED: 'external_link_clicked',
  OFFER_CLICKED: 'offer_clicked',
  USER_IDENTIFIED: 'user_identified',

  AUDIENCE_SELECTOR_VIEWED: 'audience_selector_viewed',
  AUDIENCE_PLAYER_PREVIEWED: 'audience_player_previewed',
  AUDIENCE_STREAMER_PREVIEWED: 'audience_streamer_previewed',
  AUDIENCE_PLAYER_SELECTED: 'audience_player_selected',
  AUDIENCE_STREAMER_SELECTED: 'audience_streamer_selected',
  AUDIENCE_SWITCHED: 'audience_switched',
  PLAYER_CTA_CLICKED: 'player_cta_clicked',
  STREAMER_CTA_CLICKED: 'streamer_cta_clicked',
  STREAMER_DEALS_PREVIEWED: 'audience_streamer_deals_previewed',
  STREAMER_OVERLAYS_PREVIEWED: 'audience_streamer_overlays_previewed',
  STREAMER_DEALS_SELECTED: 'audience_streamer_deals_selected',
  STREAMER_OVERLAYS_SELECTED: 'audience_streamer_overlays_selected',

  PLAYER_HUNT_CREATED: 'player_hunt_created',
  PLAYER_BONUS_ADDED: 'player_bonus_added',
  PLAYER_BONUS_OPENED: 'player_bonus_opened',
  PLAYER_PAYOUT_SAVED: 'player_payout_saved',
  PLAYER_LIBRARY_VIEWED: 'player_library_viewed',
  PLAYER_SUBSCRIPTION_VIEWED: 'player_subscription_viewed',
  PLAYER_SUBSCRIPTION_CHECKOUT_STARTED: 'player_subscription_checkout_started',

  STREAMER_OVERLAY_OPENED: 'streamer_overlay_opened',
  STREAMER_PREMIUM_VIEWED: 'streamer_premium_viewed',
  STREAMER_PREMIUM_CHECKOUT_STARTED: 'streamer_premium_checkout_started',
};

export const LEGACY_EVENT_NAME_MAP = {
  pageview: ANALYTICS_EVENTS.PAGE_VIEW,
  page_view: ANALYTICS_EVENTS.PAGE_VIEW,
  click: ANALYTICS_EVENTS.UI_BUTTON_CLICKED,
  button_click: ANALYTICS_EVENTS.UI_BUTTON_CLICKED,
  external_link: ANALYTICS_EVENTS.EXTERNAL_LINK_CLICKED,
  offer_click: ANALYTICS_EVENTS.OFFER_CLICKED,
};

const ALLOWED_EVENT_NAMES = new Set(Object.values(ANALYTICS_EVENTS));

export function normalizeAnalyticsEventName(eventName = '') {
  const raw = String(eventName || '').trim().toLowerCase();
  if (!raw) return '';
  return LEGACY_EVENT_NAME_MAP[raw] || raw.replace(/[^a-z0-9_:. -]/g, '').replace(/[\s:. -]+/g, '_');
}

export function isKnownAnalyticsEvent(eventName) {
  return ALLOWED_EVENT_NAMES.has(normalizeAnalyticsEventName(eventName));
}

export function getLegacyEventType(eventName) {
  const normalized = normalizeAnalyticsEventName(eventName);
  if (normalized === ANALYTICS_EVENTS.PAGE_VIEW) return 'pageview';
  if (normalized === ANALYTICS_EVENTS.OFFER_CLICKED) return 'offer_click';
  if (normalized === ANALYTICS_EVENTS.EXTERNAL_LINK_CLICKED) return 'external_link';
  if (normalized === ANALYTICS_EVENTS.UI_BUTTON_CLICKED) return 'button_click';
  return normalized;
}

export function getExperienceFromPath(path = '/') {
  const value = String(path || '/');
  if (value.startsWith('/player')) return 'player';
  if (value.startsWith('/overlay-center') || value.startsWith('/widgets/') || value.startsWith('/overlay/')) return 'overlay';
  if (value.startsWith('/admin') || value.startsWith('/analytics') || value.startsWith('/developer') || value.startsWith('/webmod')) return 'admin';
  if (value.startsWith('/offers') || value.startsWith('/premium') || value.startsWith('/streamer')) return 'streamer';
  return 'public';
}

export function getAnalyticsPeriodRange(period = '7d', nowInput = new Date()) {
  const now = new Date(nowInput);
  const key = ANALYTICS_PERIODS[period] ? period : '7d';
  const days = ANALYTICS_PERIODS[key].days;
  const end = new Date(now);
  const start = new Date(end.getTime() - days * 86400000);
  const previousStart = new Date(start.getTime() - days * 86400000);

  return {
    key,
    days,
    start: start.toISOString(),
    end: end.toISOString(),
    previousStart: previousStart.toISOString(),
  };
}

export function sanitizeAnalyticsProperties(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [key, raw] of Object.entries(value).slice(0, 80)) {
    const cleanKey = String(key || '').trim().slice(0, 80);
    if (!cleanKey) continue;
    if (raw === null || raw === undefined) {
      result[cleanKey] = raw;
    } else if (typeof raw === 'number' || typeof raw === 'boolean') {
      result[cleanKey] = raw;
    } else if (typeof raw === 'string') {
      result[cleanKey] = raw.slice(0, 1000);
    } else if (Array.isArray(raw)) {
      result[cleanKey] = raw.slice(0, 20).map((item) => (
        typeof item === 'string' ? item.slice(0, 200) : item
      ));
    } else if (typeof raw === 'object') {
      try {
        result[cleanKey] = JSON.parse(JSON.stringify(raw));
      } catch {
        result[cleanKey] = String(raw).slice(0, 200);
      }
    }
  }
  return result;
}

export function calculateTrendPercent(current = 0, previous = 0) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (!prev) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export function safeRatio(numerator = 0, denominator = 0, decimals = 1) {
  const den = Number(denominator) || 0;
  if (!den) return 0;
  const factor = 10 ** decimals;
  return Math.round(((Number(numerator) || 0) / den) * 100 * factor) / factor;
}
