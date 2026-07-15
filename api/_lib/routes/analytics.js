/**
 * analytics.js — Vercel serverless API for the analytics system.
 *
 * Endpoints (via ?action=):
 *   POST  track        — Record event (pageview, click, etc.)
 *   POST  session      — Create / update session
 *   POST  identify     — Link visitor to Twitch user
 *   GET   overview     — Dashboard overview stats
 *   GET   visitors     — Paginated visitor list
 *   GET   visitor      — Single visitor detail + timeline
 *   GET   sessions     — Paginated session list
 *   GET   events       — Paginated event list
 *   GET   offers       — Offer performance stats
 *   GET   realtime     — Recent activity feed
 *   GET   traffic      — Traffic source breakdown
 *   GET   geo          — Geo analytics
 *   GET   fraud        — Fraud logs
 *   GET   config       — Get analytics config
 *   POST  config       — Update analytics config
 *   POST  resolve-fraud — Mark fraud log resolved
 *   POST  delete-data  — GDPR data deletion
 *   GET   export       — CSV export
 *   GET   funnel       — Funnel analysis
 */

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_EVENTS,
  getAnalyticsPeriodRange,
  getExperienceFromPath,
  getLegacyEventType,
  isKnownAnalyticsEvent,
  normalizeAnalyticsEventName,
  sanitizeAnalyticsProperties,
  safeRatio,
} from '../../../shared/analytics.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

/* ─── CORS + Routing ─── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server config error' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { action } = req.query;

  try {
    switch (action) {
      // ── Tracking (public, no auth) ──
      case 'track':       return await handleTrack(req, res, supabase);
      case 'session':     return await handleSession(req, res, supabase);
      case 'identify':    return await handleIdentify(req, res, supabase);

      // ── Dashboard (admin auth required) ──
      case 'overview':    return await requireAdmin(req, res, supabase, handleOverview);
      case 'visitors':    return await requireAdmin(req, res, supabase, handleVisitors);
      case 'visitor':     return await requireAdmin(req, res, supabase, handleVisitorDetail);
      case 'sessions':    return await requireAdmin(req, res, supabase, handleSessions);
      case 'events':      return await requireAdmin(req, res, supabase, handleEvents);
      case 'offers':      return await requireAdmin(req, res, supabase, handleOffers);
      case 'offer-detail': return await requireAdmin(req, res, supabase, handleOfferDetail);
      case 'product-overview': return await requireAdmin(req, res, supabase, handleProductOverview);
      case 'data-quality': return await requireAdmin(req, res, supabase, handleDataQuality);
      case 'realtime':    return await requireAdmin(req, res, supabase, handleRealtime);
      case 'traffic':     return await requireAdmin(req, res, supabase, handleTraffic);
      case 'geo':         return await requireAdmin(req, res, supabase, handleGeo);
      case 'fraud':       return await requireAdmin(req, res, supabase, handleFraud);
      case 'config':      return await requireAdmin(req, res, supabase, handleConfig);
      case 'resolve-fraud': return await requireAdmin(req, res, supabase, handleResolveFraud);
      case 'delete-data': return await requireAdmin(req, res, supabase, handleDeleteData);
      case 'export':      return await requireAdmin(req, res, supabase, handleExport);
      case 'funnel':      return await requireAdmin(req, res, supabase, handleFunnel);

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    console.error('[Analytics API]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/* ═══════════════════════════════════════════════════════════
   AUTH MIDDLEWARE
   ═══════════════════════════════════════════════════════════ */

async function requireAdmin(req, res, supabase, handler) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  // Check admin role
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const roleNames = (roles || []).map(r => r.role);
  if (!roleNames.includes('admin') && !roleNames.includes('superadmin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return handler(req, res, supabase, user);
}

/* ═══════════════════════════════════════════════════════════
   GEO LOOKUP (cached)
   ═══════════════════════════════════════════════════════════ */

async function getGeoForIp(ip, supabase) {
  if (!ip) return {};

  // Check cache
  let { data: cached, error: cacheError } = await supabase
    .from('analytics_geo_cache')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if (cacheError && isMissingRelationError(cacheError)) {
    const legacy = await supabase
      .from('geo_cache')
      .select('*')
      .eq('ip_address', ip)
      .maybeSingle();
    cached = legacy.data;
  }

  if (cached) return cached;

  // Fetch from API
  let geo = {};
  try {
    const resp = await fetch(`https://ipwho.is/${ip}`);
    if (resp.ok) {
      const d = await resp.json();
      if (d.success !== false) {
        geo = {
          ip_address: ip,
          country: d.country || null,
          country_code: d.country_code || null,
          city: d.city || null,
          region: d.region || null,
          isp: d.connection?.isp || null,
          latitude: d.latitude || null,
          longitude: d.longitude || null,
        };
      }
    }
  } catch { /* fallback below */ }

  if (!geo.country) {
    try {
      const resp = await fetch(`https://ipapi.co/${ip}/json/`);
      if (resp.ok) {
        const d = await resp.json();
        if (!d.error) {
          geo = {
            ip_address: ip,
            country: d.country_name || null,
            country_code: d.country_code || null,
            city: d.city || null,
            region: d.region || null,
            isp: d.org || null,
            latitude: d.latitude || null,
            longitude: d.longitude || null,
          };
        }
      }
    } catch { /* ignore */ }
  }

  // Cache result
  if (geo.ip_address) {
    const cacheResult = await supabase.from('analytics_geo_cache').upsert(geo, { onConflict: 'ip_address' }).select();
    if (cacheResult.error && isMissingRelationError(cacheResult.error)) {
      const { fetched_at, ...legacyGeo } = { ...geo, fetched_at: new Date().toISOString() };
      await supabase.from('geo_cache').upsert({ ...legacyGeo, cached_at: fetched_at }, { onConflict: 'ip_address' }).select();
    }
  }

  return geo;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || null;
}

function parseUserAgent(ua) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device_type: 'desktop' };

  let browser = 'Unknown';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let device_type = 'desktop';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device_type = 'mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) device_type = 'tablet';

  return { browser, os, device_type };
}

function classifyReferrer(referrer) {
  if (!referrer) return 'direct';
  const r = referrer.toLowerCase();
  if (r.includes('twitch.tv')) return 'twitch';
  if (r.includes('google.') || r.includes('bing.') || r.includes('duckduckgo.') || r.includes('yahoo.')) return 'search';
  if (r.includes('twitter.com') || r.includes('x.com') || r.includes('facebook.com') || r.includes('instagram.com') || r.includes('tiktok.com') || r.includes('discord.') || r.includes('reddit.com') || r.includes('youtube.com')) return 'social';
  return 'other';
}

function parseJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }
  return req.body;
}

function compactIp(ip) {
  if (!ip) return null;
  const value = String(ip);
  if (value === '::1' || value === '127.0.0.1') return null;
  return value;
}

function normalizeEventPayload(input = {}, req) {
  const eventName = normalizeAnalyticsEventName(input.event_name || input.event_type);
  const pageUrl = input.page_url || input.route || null;
  const properties = sanitizeAnalyticsProperties(input.properties || input.metadata || {});
  const route = input.route || pageUrl || null;
  const experience = ANALYTICS_EXPERIENCES_SAFE(input.experience)
    ? input.experience
    : getExperienceFromPath(route || '/');

  return {
    session_id: input.session_id || null,
    visitor_id: input.visitor_id || null,
    user_id: null,
    event_id: input.event_id || null,
    event_name: eventName,
    event_version: Number(input.event_version || ANALYTICS_SCHEMA_VERSION) || ANALYTICS_SCHEMA_VERSION,
    event_type: getLegacyEventType(eventName || input.event_type),
    page_url: pageUrl,
    page_title: input.page_title || null,
    offer_id: input.offer_id || properties.offer_id || null,
    element_id: input.element_id || properties.element_id || null,
    element_text: input.element_text || properties.element_text || null,
    target_url: input.target_url || properties.target_url || null,
    metadata: {
      ...properties,
      event_id: input.event_id || null,
      canonical_event_name: eventName,
      schema_version: ANALYTICS_SCHEMA_VERSION,
      known_event: isKnownAnalyticsEvent(eventName),
      source: input.source || properties.source || null,
      experience,
    },
    occurred_at: input.occurred_at || new Date().toISOString(),
    anonymous_id: input.anonymous_id || null,
    experience,
    source: input.source || null,
    environment: input.environment || process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
    route,
    properties,
    schema_version: ANALYTICS_SCHEMA_VERSION,
    ip_address: compactIp(getClientIp(req)),
  };
}

function ANALYTICS_EXPERIENCES_SAFE(value) {
  return ['public', 'player', 'streamer', 'overlay', 'admin'].includes(value);
}

function isMissingColumnError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`;
  return error?.code === 'PGRST204' || error?.code === '42703' || message.includes('schema cache') || message.includes('column');
}

function isMissingRelationError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('could not find the table') || message.includes('relation') && message.includes('does not exist');
}

function removeV2EventColumns(row) {
  const {
    event_id,
    event_name,
    event_version,
    occurred_at,
    received_at,
    anonymous_id,
    experience,
    source,
    environment,
    route,
    properties,
    schema_version,
    ...legacy
  } = row;
  return legacy;
}

function minimalLegacyEventRow(row) {
  const metadata = safeMetadata(row);
  return {
    session_id: row.session_id,
    user_id: row.user_id || null,
    event_type: row.event_type,
    page_url: row.page_url || row.route || null,
    offer_id: row.offer_id || metadata.offer_id || null,
    metadata: {
      ...metadata,
      event_id: row.event_id || metadata.event_id || null,
      event_name: row.event_name || metadata.canonical_event_name || row.event_type,
      canonical_event_name: row.event_name || metadata.canonical_event_name || row.event_type,
      route: row.route || row.page_url || metadata.route || null,
      properties: row.properties || metadata.properties || {},
      anonymous_id: row.anonymous_id || metadata.anonymous_id || null,
      experience: row.experience || metadata.experience || null,
    },
    ip_address: row.ip_address || null,
    country: row.country || null,
    city: row.city || null,
    is_suspicious: row.is_suspicious || false,
  };
}

function legacySessionPayload({ body, fingerprint, ip, ua, parsed, geo, referrer, referrer_source }) {
  return {
    session_token: body.session_token || `legacy_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    user_id: body.user_id || null,
    ip_address: compactIp(ip),
    user_agent: ua,
    country: geo.country || null,
    country_code: geo.country_code || null,
    city: geo.city || null,
    region: geo.region || null,
    isp: geo.isp || null,
    referrer,
    referrer_source,
    is_suspicious: false,
    device_type: parsed.device_type,
    browser: parsed.browser,
    os: parsed.os,
    timezone: body.timezone || null,
    device_fingerprint: fingerprint || null,
  };
}

function sumRows(rows = [], key) {
  return rows.reduce((sum, row) => sum + (Number(row?.[key]) || 0), 0);
}

function countBy(rows = [], key) {
  return rows.reduce((acc, row) => {
    const value = row?.[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function safeMetadata(row = {}) {
  const metadata = row.metadata || row.properties || {};
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) return metadata;
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function analyticsEventName(row = {}) {
  const metadata = safeMetadata(row);
  return normalizeAnalyticsEventName(row.event_name || metadata.canonical_event_name || row.event_type || 'unknown') || 'unknown';
}

function analyticsEventTime(row = {}) {
  return row.occurred_at || row.created_at || row.received_at || null;
}

function analyticsSessionTime(row = {}) {
  return row.started_at || row.created_at || row.last_seen_at || null;
}

function analyticsRoute(row = {}) {
  const metadata = safeMetadata(row);
  return row.route || row.page_url || row.landing_page || row.entry_route || row.last_route || metadata.route || metadata.page_url || '/';
}

function analyticsExperience(row = {}) {
  const metadata = safeMetadata(row);
  return row.experience || metadata.experience || getExperienceFromPath(analyticsRoute(row));
}

function sessionVisitorKey(row = {}) {
  return row.visitor_id || row.anonymous_id || row.user_id || row.device_fingerprint || row.gpu_fingerprint || row.session_token || (row.ip_address && row.user_agent ? `${row.ip_address}:${row.user_agent}` : null) || row.id || null;
}

function eventVisitorKey(row = {}, sessionKeys = new Map()) {
  const metadata = safeMetadata(row);
  return row.visitor_id || row.anonymous_id || row.user_id || metadata.anonymous_id || sessionKeys.get(row.session_id) || row.session_id || row.id || null;
}

function addMapCount(map, key, amount = 1) {
  const safeKey = key || 'unknown';
  map[safeKey] = (map[safeKey] || 0) + amount;
}

function topCountRows(map, labelKey, valueKey, limit = 10) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ [labelKey]: label, [valueKey]: value }));
}

function buildDayBuckets(startIso, endIso) {
  const buckets = [];
  const cursor = new Date(startIso);
  const end = new Date(endIso);
  cursor.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor <= end) {
    buckets.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

async function fetchAnalyticsSessionsForRange(supabase, startIso, endIso, limit = 15000) {
  const modernColumns = 'id, visitor_id, user_id, anonymous_id, ip_address, user_agent, browser, os, device_type, country, country_code, city, referrer, referrer_source, landing_page, entry_route, last_route, started_at, ended_at, duration_secs, page_count, event_count, is_bounce, risk_score, is_suspicious, experience, metadata';
  let result = await supabase
    .from('analytics_sessions')
    .select(modernColumns)
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .order('started_at', { ascending: true })
    .limit(limit);

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from('analytics_sessions')
      .select('id, session_token, user_id, ip_address, user_agent, browser, os, device_type, country, country_code, city, referrer, referrer_source, created_at, last_seen_at, is_suspicious, device_fingerprint, gpu_fingerprint')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true })
      .limit(limit);
  }

  if (result.error && isMissingRelationError(result.error)) return [];
  return result.data || [];
}

async function fetchAnalyticsEventsForRange(supabase, startIso, endIso, limit = 25000) {
  const modernColumns = 'id, session_id, visitor_id, user_id, event_type, event_name, event_id, page_url, route, offer_id, element_text, target_url, metadata, properties, ip_address, country, city, is_suspicious, created_at, occurred_at, anonymous_id, experience';
  let result = await supabase
    .from('analytics_events')
    .select(modernColumns)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from('analytics_events')
      .select('id, session_id, user_id, event_type, page_url, offer_id, metadata, ip_address, country, city, is_suspicious, created_at')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true })
      .limit(limit);
  }

  if (result.error && isMissingRelationError(result.error)) return [];
  return result.data || [];
}

async function fetchOfferRows(supabase, offerIds = null) {
  const selections = [
    'id, name, logo_url, affiliate_url, visible, sort_order, rating',
    'id, casino_name, title, image_url, bonus_link, is_active, is_premium, display_order',
  ];

  for (const selection of selections) {
    let query = supabase.from('casino_offers').select(selection).limit(1000);
    if (offerIds?.length) query = query.in('id', offerIds);
    const result = await query;
    if (!result.error) return result.data || [];
    if (isMissingRelationError(result.error)) return [];
    if (!isMissingColumnError(result.error)) return [];
  }
  return [];
}

async function optionalRows(queryPromise) {
  const result = await queryPromise;
  if (!result.error) return result.data || [];
  if (isMissingRelationError(result.error) || isMissingColumnError(result.error)) return [];
  return [];
}

async function fetchUserRoleRows(supabase) {
  let result = await supabase
    .from('user_roles')
    .select('user_id, role, is_active, access_expires_at, source, created_at')
    .in('role', ['premium', 'admin', 'superadmin', 'moderator'])
    .limit(5000);

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from('user_roles')
      .select('user_id, role, is_active, access_expires_at, created_at')
      .in('role', ['premium', 'admin', 'superadmin', 'moderator'])
      .limit(5000);
  }

  if (result.error && (isMissingRelationError(result.error) || isMissingColumnError(result.error))) return [];
  return result.data || [];
}

function offerDisplayName(row = {}) {
  return row.name || row.casino_name || row.title || 'Unknown offer';
}

function normalizeSessionRow(row = {}) {
  return {
    ...row,
    started_at: analyticsSessionTime(row),
    ended_at: row.ended_at || row.last_seen_at || null,
    landing_page: row.landing_page || row.entry_route || null,
    page_count: Number(row.page_count || 0),
    event_count: Number(row.event_count || 0),
    duration_secs: Number(row.duration_secs || 0),
    risk_score: Number(row.risk_score || 0),
    is_bounce: row.is_bounce ?? Number(row.page_count || 0) <= 1,
  };
}

function normalizeEventRow(row = {}) {
  return {
    ...row,
    event_name: analyticsEventName(row),
    route: analyticsRoute(row),
    created_at: row.created_at || row.occurred_at || row.received_at,
  };
}

function synthesizeVisitors(sessions = [], events = []) {
  const sessionKeys = new Map(sessions.map(session => [session.id, sessionVisitorKey(session)]));
  const visitors = new Map();

  for (const session of sessions) {
    const key = sessionVisitorKey(session);
    if (!key) continue;
    const time = analyticsSessionTime(session);
    const existing = visitors.get(key) || {
      id: key,
      fingerprint: session.device_fingerprint || session.gpu_fingerprint || session.session_token || key,
      twitch_username: null,
      twitch_avatar: null,
      total_sessions: 0,
      total_events: 0,
      first_seen_at: time,
      last_seen_at: time,
      is_bot: false,
      user_id: session.user_id || null,
      user_email: session.user_email || null,
      country: session.country || null,
      city: session.city || null,
      ip_address: session.ip_address || null,
    };
    existing.total_sessions += 1;
    existing.total_events += Number(session.event_count || 0);
    if (time && (!existing.first_seen_at || time < existing.first_seen_at)) existing.first_seen_at = time;
    if (time && (!existing.last_seen_at || time > existing.last_seen_at)) existing.last_seen_at = time;
    existing.user_id ||= session.user_id || null;
    existing.user_email ||= session.user_email || null;
    visitors.set(key, existing);
  }

  for (const event of events) {
    const key = eventVisitorKey(event, sessionKeys);
    if (!key) continue;
    const time = analyticsEventTime(event);
    const metadata = safeMetadata(event);
    const existing = visitors.get(key) || {
      id: key,
      fingerprint: metadata.anonymous_id || key,
      twitch_username: null,
      twitch_avatar: null,
      total_sessions: 0,
      total_events: 0,
      first_seen_at: time,
      last_seen_at: time,
      is_bot: false,
      user_id: event.user_id || null,
      country: event.country || null,
      city: event.city || null,
      ip_address: event.ip_address || null,
    };
    existing.total_events += 1;
    if (time && (!existing.first_seen_at || time < existing.first_seen_at)) existing.first_seen_at = time;
    if (time && (!existing.last_seen_at || time > existing.last_seen_at)) existing.last_seen_at = time;
    existing.user_id ||= event.user_id || null;
    visitors.set(key, existing);
  }

  return Array.from(visitors.values()).sort((a, b) => String(b.last_seen_at || '').localeCompare(String(a.last_seen_at || '')));
}

/* ═══════════════════════════════════════════════════════════
   FRAUD DETECTION
   ═══════════════════════════════════════════════════════════ */

async function runFraudChecks(supabase, { session_id, visitor_id, ip_address, event_type }) {
  let totalScore = 0;
  const flags = [];

  // Load config (use defaults if none)
  let { data: cfg, error: cfgError } = await supabase
    .from('analytics_config')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (cfgError && isMissingRelationError(cfgError)) {
    const legacyConfig = await supabase
      .from('fraud_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    cfg = legacyConfig.data?.value || legacyConfig.data || null;
  }

  const maxClicks10s = cfg?.max_clicks_10s || 15;
  const maxSameOffer1m = cfg?.max_same_offer_1m || 5;
  const maxSessionsIp1h = cfg?.max_sessions_ip_1h || 10;
  const threshold = cfg?.risk_score_threshold || 60;

  // Rule 1: Too many events in 10 seconds
  const tenSecsAgo = new Date(Date.now() - 10000).toISOString();
  const { count: recentEvents } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session_id)
    .gte('created_at', tenSecsAgo);

  if (recentEvents >= maxClicks10s) {
    totalScore += 40;
    flags.push({
      rule_name: 'rapid_clicks',
      reason: `${recentEvents} events in 10 seconds (threshold: ${maxClicks10s})`,
      risk_score: 40,
      event_count: recentEvents,
      time_window: '10s',
    });
  }

  // Rule 2: Multiple sessions from same IP in 1 hour
  if (ip_address) {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    let { count: ipSessions, error: ipSessionsError } = await supabase
      .from('analytics_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip_address)
      .gte('started_at', oneHourAgo);

    if (ipSessionsError && isMissingColumnError(ipSessionsError)) {
      const fallback = await supabase
        .from('analytics_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', ip_address)
        .gte('created_at', oneHourAgo);
      ipSessions = fallback.count;
    }

    if (ipSessions >= maxSessionsIp1h) {
      totalScore += 30;
      flags.push({
        rule_name: 'multi_session_ip',
        reason: `${ipSessions} sessions from same IP in 1 hour (threshold: ${maxSessionsIp1h})`,
        risk_score: 30,
        event_count: ipSessions,
        time_window: '1h',
      });
    }
  }

  // Rule 3: Only clicks, no pageviews (bot pattern)
  if (event_type === 'click' || event_type === 'offer_click') {
    const { count: totalEvents } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session_id);

    const { count: pageviews } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .eq('event_type', 'pageview');

    if (totalEvents > 5 && pageviews === 0) {
      totalScore += 30;
      flags.push({
        rule_name: 'no_pageviews',
        reason: `${totalEvents} events but 0 pageviews — possible bot`,
        risk_score: 30,
        event_count: totalEvents,
        time_window: 'session',
      });
    }
  }

  // Store fraud logs
  for (const flag of flags) {
    const fraudResult = await supabase.from('analytics_fraud_logs').insert({
      session_id,
      visitor_id,
      ip_address,
      ...flag,
    });
    if (fraudResult.error && (isMissingRelationError(fraudResult.error) || isMissingColumnError(fraudResult.error))) {
      await supabase.from('fraud_logs').insert({
        session_id,
        ip_address,
        reason: flag.reason,
        risk_score: flag.risk_score,
        metadata: {
          visitor_id,
          rule_name: flag.rule_name,
          event_count: flag.event_count,
          time_window: flag.time_window,
        },
      });
    }
  }

  // Update session risk score
  const isSuspicious = totalScore >= threshold;
  if (totalScore > 0) {
    await supabase
      .from('analytics_sessions')
      .update({ risk_score: Math.min(100, totalScore), is_suspicious: isSuspicious })
      .eq('id', session_id);
  }

  return { risk_score: totalScore, is_suspicious: isSuspicious, flags };
}

/* ═══════════════════════════════════════════════════════════
   TRACKING HANDLERS (public)
   ═══════════════════════════════════════════════════════════ */

async function handleSession(req, res, supabase) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = parseJsonBody(req);
  const { fingerprint, referrer, landing_page, utm_source, utm_medium, utm_campaign } = body;
  if (!fingerprint) return res.status(400).json({ error: 'fingerprint required' });

  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(ua);
  const geo = await getGeoForIp(ip, supabase);
  const referrer_source = classifyReferrer(referrer);

  // Upsert visitor
  let { data: visitor, error: visitorError } = await supabase
    .from('analytics_visitors')
    .upsert(
      { fingerprint, last_seen_at: new Date().toISOString() },
      { onConflict: 'fingerprint' }
    )
    .select('id')
    .single();

  const hasVisitorTable = !(visitorError && isMissingRelationError(visitorError));

  if (!hasVisitorTable) {
    visitor = { id: body.anonymous_id || fingerprint };
  }

  if (!visitor) return res.status(500).json({ error: 'Failed to create visitor' });

  // Increment total_sessions (best-effort, non-critical)
  if (hasVisitorTable) {
    await supabase.rpc('increment_field', {
      table_name: 'analytics_visitors',
      row_id: visitor.id,
      field_name: 'total_sessions',
      amount: 1,
    }).catch(() => {
      // If RPC doesn't exist, just skip increment (not critical)
    });
  }

  const sessionPayload = {
    visitor_id: visitor.id,
    ip_address: ip,
    user_agent: ua,
    browser: parsed.browser,
    os: parsed.os,
    device_type: parsed.device_type,
    country: geo.country || null,
    country_code: geo.country_code || null,
    city: geo.city || null,
    region: geo.region || null,
    isp: geo.isp || null,
    referrer,
    referrer_source,
    landing_page,
    utm_source: utm_source || null,
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    anonymous_id: body.anonymous_id || null,
    experience: ANALYTICS_EXPERIENCES_SAFE(body.experience) ? body.experience : getExperienceFromPath(landing_page || '/'),
    entry_route: landing_page || null,
    last_route: landing_page || null,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
    metadata: {
      schema_version: ANALYTICS_SCHEMA_VERSION,
      timezone: body.timezone || null,
    },
  };

  // Create session
  let sessionResult = await supabase
    .from('analytics_sessions')
    .insert(sessionPayload)
    .select('id')
    .single();

  if (sessionResult.error && isMissingColumnError(sessionResult.error)) {
    const {
      anonymous_id,
      experience,
      entry_route,
      last_route,
      environment,
      metadata,
      ...legacySessionPayload
    } = sessionPayload;
    sessionResult = await supabase
      .from('analytics_sessions')
      .insert(legacySessionPayload)
      .select('id')
      .single();
  }

  if (sessionResult.error && (isMissingRelationError(sessionResult.error) || isMissingColumnError(sessionResult.error))) {
    sessionResult = await supabase
      .from('analytics_sessions')
      .insert(legacySessionPayload({ body, fingerprint, ip, ua, parsed, geo, referrer, referrer_source }))
      .select('id')
      .single();
  }

  if (sessionResult.error || !sessionResult.data) {
    console.warn('[Analytics API] Session persistence failed; using ephemeral session', sessionResult.error);
    return res.status(200).json({
      session_id: randomUUID(),
      visitor_id: visitor.id,
      persisted: false,
    });
  }

  const session = sessionResult.data;
  return res.status(200).json({
    session_id: session?.id,
    visitor_id: visitor.id,
  });
}

async function handleTrack(req, res, supabase) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = parseJsonBody(req);
  const payloads = Array.isArray(body) ? body : Array.isArray(body?.events) ? body.events : [body];
  if (payloads.length > 50) return res.status(413).json({ error: 'Too many events in one batch' });

  const inserted = [];
  const rejected = [];
  const ip = compactIp(getClientIp(req));
  const geo = await getGeoForIp(ip, supabase);

  for (const payload of payloads) {
    const normalized = normalizeEventPayload(payload, req);
    if (!normalized.session_id || !normalized.visitor_id || !normalized.event_type) {
      rejected.push({ reason: 'session_id, visitor_id, event_type required' });
      continue;
    }

    const row = {
      session_id: normalized.session_id,
      visitor_id: normalized.visitor_id,
      user_id: normalized.user_id,
      event_type: normalized.event_type,
      page_url: normalized.page_url || null,
      page_title: normalized.page_title || null,
      offer_id: normalized.offer_id || null,
      element_id: normalized.element_id || null,
      element_text: normalized.element_text || null,
      target_url: normalized.target_url || null,
      metadata: normalized.metadata || {},
      ip_address: ip,
      country: geo.country || null,
      city: geo.city || null,
      event_id: normalized.event_id,
      event_name: normalized.event_name || normalized.event_type,
      event_version: normalized.event_version,
      occurred_at: normalized.occurred_at,
      received_at: new Date().toISOString(),
      anonymous_id: normalized.anonymous_id,
      experience: normalized.experience,
      source: normalized.source,
      environment: normalized.environment,
      route: normalized.route,
      properties: normalized.properties,
      schema_version: normalized.schema_version,
    };

    let result = await supabase
      .from('analytics_events')
      .insert(row)
      .select('id')
      .single();

    if (result.error?.code === '23505') {
      inserted.push({ duplicate: true, event_id: normalized.event_id });
      continue;
    }

    if (result.error && isMissingColumnError(result.error)) {
      result = await supabase
        .from('analytics_events')
        .insert(removeV2EventColumns(row))
        .select('id')
        .single();
    }

    if (result.error && isMissingColumnError(result.error)) {
      result = await supabase
        .from('analytics_events')
        .insert(minimalLegacyEventRow(row))
        .select('id')
        .single();
    }

    if (result.error) {
      rejected.push({ reason: result.error.message || 'insert failed', event_name: normalized.event_name });
      continue;
    }

    inserted.push({ id: result.data?.id, event_name: normalized.event_name });

    await supabase.rpc('analytics_increment_session', {
      p_session_id: normalized.session_id,
      p_is_pageview: normalized.event_type === 'pageview',
    }).catch(() => {});

    await supabase.rpc('analytics_increment_visitor_events', {
      p_visitor_id: normalized.visitor_id,
      p_amount: 1,
    }).catch(() => {});

    runFraudChecks(supabase, {
      session_id: normalized.session_id,
      visitor_id: normalized.visitor_id,
      ip_address: ip,
      event_type: normalized.event_type,
    }).catch(err => console.error('[Fraud check]', err));
  }

  if (!inserted.length && rejected.length) return res.status(400).json({ ok: false, rejected });
  return res.status(200).json({ ok: true, inserted, rejected });
}

async function handleIdentify(req, res, supabase) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { visitor_id, user_id, twitch_id, twitch_username, twitch_avatar } = parseJsonBody(req);
  if (!visitor_id) return res.status(400).json({ error: 'visitor_id required' });

  const updates = {};
  if (user_id) updates.user_id = user_id;
  if (twitch_id) updates.twitch_id = twitch_id;
  if (twitch_username) updates.twitch_username = twitch_username;
  if (twitch_avatar) updates.twitch_avatar = twitch_avatar;

  await supabase
    .from('analytics_visitors')
    .update(updates)
    .eq('id', visitor_id);

  // Also link user_id to all sessions for this visitor
  if (user_id) {
    await supabase
      .from('analytics_sessions')
      .update({ user_id })
      .eq('visitor_id', visitor_id)
      .is('user_id', null);
  }

  return res.status(200).json({ ok: true });
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD HANDLERS (admin only)
   ═══════════════════════════════════════════════════════════ */

async function handleOverview(req, res, supabase) {
  const { period = '7d' } = req.query;
  const range = getAnalyticsPeriodRange(period);
  const [sessions, events, previousSessions, previousEvents] = await Promise.all([
    fetchAnalyticsSessionsForRange(supabase, range.start, range.end),
    fetchAnalyticsEventsForRange(supabase, range.start, range.end),
    fetchAnalyticsSessionsForRange(supabase, range.previousStart, range.start, 8000),
    fetchAnalyticsEventsForRange(supabase, range.previousStart, range.start, 12000),
  ]);

  const sessionKeys = new Map(sessions.map(session => [session.id, sessionVisitorKey(session)]));
  const visitorKeys = new Set([
    ...sessions.map(sessionVisitorKey).filter(Boolean),
    ...events.map(event => eventVisitorKey(event, sessionKeys)).filter(Boolean),
  ]);
  const suspiciousSessions = sessions.filter(session => session.is_suspicious).length;
  const suspiciousEvents = events.filter(event => event.is_suspicious).length;
  const pageViewEvents = events.filter(event => analyticsEventName(event) === ANALYTICS_EVENTS.PAGE_VIEW);
  const clickEvents = events.filter(event => [
    ANALYTICS_EVENTS.OFFER_CLICKED,
    ANALYTICS_EVENTS.UI_BUTTON_CLICKED,
    ANALYTICS_EVENTS.EXTERNAL_LINK_CLICKED,
  ].includes(analyticsEventName(event)));

  const chartBuckets = new Map(buildDayBuckets(range.start, range.end).map(date => [date, {
    date,
    sessions: 0,
    events: 0,
    pageViews: 0,
    clicks: 0,
    visitors: new Set(),
  }]));
  const eventNameCounts = {};
  const experienceCounts = {};
  const referrerCounts = {};
  const deviceCounts = {};
  const countryCounts = {};
  const pageCounts = {};

  for (const session of sessions) {
    const time = analyticsSessionTime(session);
    const day = time ? time.slice(0, 10) : null;
    const bucket = day ? chartBuckets.get(day) : null;
    if (bucket) {
      bucket.sessions += 1;
      const key = sessionVisitorKey(session);
      if (key) bucket.visitors.add(key);
    }
    addMapCount(referrerCounts, session.referrer_source || classifyReferrer(session.referrer));
    addMapCount(deviceCounts, session.device_type || 'unknown');
    addMapCount(countryCounts, session.country || session.country_code || 'Unknown');
  }

  for (const event of events) {
    const name = analyticsEventName(event);
    const route = analyticsRoute(event);
    const time = analyticsEventTime(event);
    const day = time ? time.slice(0, 10) : null;
    const bucket = day ? chartBuckets.get(day) : null;
    if (bucket) {
      bucket.events += 1;
      if (name === ANALYTICS_EVENTS.PAGE_VIEW) bucket.pageViews += 1;
      if ([ANALYTICS_EVENTS.OFFER_CLICKED, ANALYTICS_EVENTS.UI_BUTTON_CLICKED, ANALYTICS_EVENTS.EXTERNAL_LINK_CLICKED].includes(name)) bucket.clicks += 1;
      const key = eventVisitorKey(event, sessionKeys);
      if (key) bucket.visitors.add(key);
    }
    addMapCount(eventNameCounts, name);
    addMapCount(experienceCounts, analyticsExperience(event));
    if (name === ANALYTICS_EVENTS.PAGE_VIEW) addMapCount(pageCounts, route || '/');
  }

  const chart = Array.from(chartBuckets.values()).map(bucket => ({
    ...bucket,
    visitors: bucket.visitors.size,
  }));
  const topPagesList = topCountRows(pageCounts, 'page', 'views', 10);

  return res.status(200).json({
    totalSessions: sessions.length,
    totalEvents: events.length,
    uniqueVisitors: visitorKeys.size,
    totalClicks: clickEvents.length,
    totalPageViews: pageViewEvents.length,
    suspiciousSessions,
    suspiciousEvents,
    sessionsTrend: calcTrend(sessions.length, previousSessions.length),
    eventsTrend: calcTrend(events.length, previousEvents.length),
    chart,
    topPages: topPagesList,
    topEvents: topCountRows(eventNameCounts, 'event', 'count', 12),
    byEventName: eventNameCounts,
    byExperience: experienceCounts,
    byReferrer: referrerCounts,
    deviceTypes: deviceCounts,
    topCountries: topCountRows(countryCounts, 'country', 'sessions', 10),
    dataHealth: {
      knownEvents: events.filter(event => isKnownAnalyticsEvent(analyticsEventName(event))).length,
      unknownEvents: events.filter(event => !isKnownAnalyticsEvent(analyticsEventName(event))).length,
      eventIdCoverage: safeRatio(events.filter(event => event.event_id || safeMetadata(event).event_id).length, events.length),
    },
    period: range.key,
    range: { start: range.start, end: range.end },
  });
}

function calcTrend(current, previous) {
  if (!previous) return current > 0 ? '+100%' : '0%';
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

async function handleVisitors(req, res, supabase) {
  const { page = 1, limit = 20, search = '', sort = 'last_seen_at', order = 'desc' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabase
    .from('analytics_visitors')
    .select('*', { count: 'exact' })
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + parseInt(limit) - 1);

  if (search) {
    query = query.or(`twitch_username.ilike.%${search}%,fingerprint.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (!error) return res.status(200).json({ visitors: data || [], total: count || 0 });

  if (!isMissingRelationError(error)) return res.status(200).json({ visitors: [], total: 0, warning: error.message });

  const range = getAnalyticsPeriodRange('90d');
  const [sessions, events] = await Promise.all([
    fetchAnalyticsSessionsForRange(supabase, range.start, range.end),
    fetchAnalyticsEventsForRange(supabase, range.start, range.end),
  ]);
  let visitors = synthesizeVisitors(sessions, events);
  if (search) {
    const needle = String(search).toLowerCase();
    visitors = visitors.filter(visitor => [visitor.fingerprint, visitor.user_email, visitor.twitch_username, visitor.ip_address]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(needle)));
  }
  if (sort) {
    visitors.sort((a, b) => {
      const left = a[sort] || '';
      const right = b[sort] || '';
      return order === 'asc' ? String(left).localeCompare(String(right)) : String(right).localeCompare(String(left));
    });
  }
  return res.status(200).json({
    visitors: visitors.slice(offset, offset + parseInt(limit)),
    total: visitors.length,
    synthetic: true,
  });
}

async function handleVisitorDetail(req, res, supabase) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  const [
    visitorResult,
    sessionsResult,
    eventsResult,
    fraudLogsResult,
  ] = await Promise.all([
    supabase.from('analytics_visitors').select('*').eq('id', id).single(),
    supabase.from('analytics_sessions').select('*').eq('visitor_id', id).order('started_at', { ascending: false }).limit(50),
    supabase.from('analytics_events').select('*').eq('visitor_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('analytics_fraud_logs').select('*').eq('visitor_id', id).order('created_at', { ascending: false }).limit(20),
  ]);

  if (!visitorResult.error) {
    return res.status(200).json({
      visitor: visitorResult.data,
      sessions: sessionsResult.data || [],
      events: eventsResult.data || [],
      fraudLogs: fraudLogsResult.data || [],
    });
  }

  const range = getAnalyticsPeriodRange('90d');
  const [allSessions, allEvents] = await Promise.all([
    fetchAnalyticsSessionsForRange(supabase, range.start, range.end),
    fetchAnalyticsEventsForRange(supabase, range.start, range.end),
  ]);
  const sessionKeys = new Map(allSessions.map(session => [session.id, sessionVisitorKey(session)]));
  const sessions = allSessions.filter(session => sessionVisitorKey(session) === id).map(normalizeSessionRow);
  const sessionIds = new Set(sessions.map(session => session.id));
  const events = allEvents
    .filter(event => eventVisitorKey(event, sessionKeys) === id || sessionIds.has(event.session_id))
    .map(normalizeEventRow)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 100);
  const visitor = synthesizeVisitors(sessions, events)[0] || { id, fingerprint: id, total_sessions: sessions.length, total_events: events.length };

  return res.status(200).json({ visitor, sessions: sessions || [], events: events || [], fraudLogs: [] });
}

async function handleSessions(req, res, supabase) {
  const { page = 1, limit = 20, suspicious, country, since } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const start = since || new Date(Date.now() - 90 * 86400000).toISOString();
  const sessions = (await fetchAnalyticsSessionsForRange(supabase, start, new Date().toISOString()))
    .map(normalizeSessionRow)
    .filter(session => suspicious === 'true' ? session.is_suspicious : true)
    .filter(session => country ? session.country_code === country || session.country === country : true)
    .sort((a, b) => String(b.started_at || '').localeCompare(String(a.started_at || '')));

  return res.status(200).json({ sessions: sessions.slice(offset, offset + parseInt(limit)), total: sessions.length });
}

async function handleEvents(req, res, supabase) {
  const { page = 1, limit = 50, type, session_id, since } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const start = since || new Date(Date.now() - 30 * 86400000).toISOString();
  const wantedType = type ? normalizeAnalyticsEventName(type) : null;
  const events = (await fetchAnalyticsEventsForRange(supabase, start, new Date().toISOString()))
    .map(normalizeEventRow)
    .filter(event => wantedType ? analyticsEventName(event) === wantedType || event.event_type === type : true)
    .filter(event => session_id ? event.session_id === session_id : true)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  return res.status(200).json({ events: events.slice(offset, offset + parseInt(limit)), total: events.length });
}

async function handleOffers(req, res, supabase) {
  const { since } = req.query;
  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString();

  const events = await fetchAnalyticsEventsForRange(supabase, sinceDate, new Date().toISOString());
  const clicks = events.filter(event => analyticsEventName(event) === ANALYTICS_EVENTS.OFFER_CLICKED && (event.offer_id || safeMetadata(event).offer_id));
  const totalPageviews = events.filter(event => analyticsEventName(event) === ANALYTICS_EVENTS.PAGE_VIEW).length;

  // Aggregate per offer
  const offerMap = {};
  clicks.forEach(c => {
    const offerId = c.offer_id || safeMetadata(c).offer_id;
    if (!offerId) return;
    if (!offerMap[offerId]) {
      offerMap[offerId] = { offer_id: offerId, total: 0, clean: 0, suspicious: 0, visitors: new Set(), sessions: new Set() };
    }
    const o = offerMap[offerId];
    o.total++;
    if (c.is_suspicious) o.suspicious++;
    else o.clean++;
    o.visitors.add(c.visitor_id || safeMetadata(c).anonymous_id || c.session_id || c.id);
    o.sessions.add(c.session_id);
  });

  // Get offer names
  const offerIds = Object.keys(offerMap);
  let offerNames = {};
  if (offerIds.length > 0) {
    const offers = await fetchOfferRows(supabase, offerIds);
    offers.forEach(o => { offerNames[o.id] = offerDisplayName(o); });
  }

  const result = Object.values(offerMap)
    .map(o => ({
      offer_id: o.offer_id,
      name: offerNames[o.offer_id] || 'Unknown',
      total_clicks: o.total,
      clean_clicks: o.clean,
      suspicious_clicks: o.suspicious,
      unique_clickers: o.visitors.size,
      ctr: totalPageviews > 0 ? ((o.total / totalPageviews) * 100).toFixed(2) : '0.00',
    }))
    .sort((a, b) => b.total_clicks - a.total_clicks);

  return res.status(200).json({ offers: result, totalPageviews: totalPageviews || 0 });
}

// ── Offer Detail — individual click events with full user/geo/IP data ──
async function handleOfferDetail(req, res, supabase) {
  const { offer_id, since, limit = '100', offset = '0' } = req.query;
  if (!offer_id) return res.status(400).json({ error: 'offer_id required' });

  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString();
  const lim = Math.min(parseInt(limit) || 100, 500);
  const off = parseInt(offset) || 0;

  const [offerRows, events, sessions] = await Promise.all([
    fetchOfferRows(supabase, [offer_id]),
    fetchAnalyticsEventsForRange(supabase, sinceDate, new Date().toISOString()),
    fetchAnalyticsSessionsForRange(supabase, sinceDate, new Date().toISOString()),
  ]);

  const offerRow = offerRows[0] || null;
  const sessionMap = new Map(sessions.map(session => [session.id, normalizeSessionRow(session)]));
  const visitorMap = new Map(synthesizeVisitors(sessions, events).map(visitor => [visitor.id, visitor]));
  const allRows = events
    .filter(event => analyticsEventName(event) === ANALYTICS_EVENTS.OFFER_CLICKED)
    .filter(event => (event.offer_id || safeMetadata(event).offer_id) === offer_id)
    .map(normalizeEventRow)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  // Aggregate quick stats
  const rows = allRows.slice(off, off + lim);
  const sessionKeys = new Map(sessions.map(session => [session.id, sessionVisitorKey(session)]));
  const uniqueVisitors = new Set(allRows.map(r => eventVisitorKey(r, sessionKeys)).filter(Boolean)).size;
  const uniqueIPs = new Set(allRows.map(r => sessionMap.get(r.session_id)?.ip_address || r.ip_address).filter(Boolean)).size;
  const suspiciousCount = rows.filter(r => r.is_suspicious).length;
  const countries = {};
  allRows.forEach(r => {
    const session = sessionMap.get(r.session_id);
    const c = session?.country || r.country || 'Unknown';
    countries[c] = (countries[c] || 0) + 1;
  });
  const topCountries = Object.entries(countries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, clicks]) => ({ name, clicks }));

  // Clicks per hour for timeline chart
  const hourBuckets = {};
  allRows.forEach(r => {
    const h = r.created_at.slice(0, 13); // "2026-04-17T14"
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
  });
  const timeline = Object.entries(hourBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([hour, count]) => ({ hour: hour.slice(5) + ':00', clicks: count }));

  return res.status(200).json({
    offer: {
      id: offer_id,
      name: offerDisplayName(offerRow),
      url: offerRow?.affiliate_url || offerRow?.bonus_link || null,
      logo_url: offerRow?.logo_url || offerRow?.image_url || null,
    },
    clicks: rows.map(r => {
      const session = sessionMap.get(r.session_id) || {};
      const visitorKey = eventVisitorKey(r, sessionKeys);
      const visitor = visitorMap.get(visitorKey) || {};
      const metadata = safeMetadata(r);
      return {
      id: r.id,
      event_type: r.event_type,
      event_name: analyticsEventName(r),
      created_at: r.created_at,
      is_suspicious: r.is_suspicious,
      target_url: r.target_url || metadata.target_url || null,
      ip_address: session.ip_address || r.ip_address || null,
      country: session.country || r.country || null,
      city: session.city || r.city || null,
      region: session.region || null,
      isp: session.isp || null,
      browser: session.browser || null,
      os: session.os || null,
      device_type: session.device_type || null,
      referrer_source: session.referrer_source || null,
      risk_score: session.risk_score || 0,
      session_duration: session.duration_secs || null,
      twitch_id: visitor.twitch_id || null,
      twitch_username: visitor.twitch_username || null,
      twitch_avatar: visitor.twitch_avatar || null,
      fingerprint: visitor.fingerprint || visitorKey || null,
      visitor_total_sessions: visitor.total_sessions || 0,
      visitor_total_events: visitor.total_events || 0,
      visitor_first_seen: visitor.first_seen_at || null,
      is_bot: visitor.is_bot || false,
      metadata,
      };
    }),
    stats: {
      totalClicks: allRows.length,
      uniqueVisitors,
      uniqueIPs,
      suspiciousCount: allRows.filter(r => r.is_suspicious).length,
      topCountries,
    },
    timeline,
    pagination: { total: allRows.length, limit: lim, offset: off },
  });
}

async function handleProductOverview(req, res, supabase) {
  const { period = '30d' } = req.query;
  const range = getAnalyticsPeriodRange(period);

  const [
    sessions,
    events,
    playerHunts,
    playerBonuses,
    streamerRoles,
    playerSubscriptions,
    billingSubscriptions,
    offers,
    legacyOfferClicks,
  ] = await Promise.all([
    fetchAnalyticsSessionsForRange(supabase, range.start, range.end, 10000).then(rows => rows.map(normalizeSessionRow)),
    fetchAnalyticsEventsForRange(supabase, range.start, range.end, 15000).then(rows => rows.map(normalizeEventRow)),
    optionalRows(supabase
      .from('player_hunts')
      .select('id, user_id, currency, status, starting_deposit, additional_deposits, initial_withdrawal, total_withdrawals, hunt_date, created_at')
      .is('deleted_at', null)
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .limit(5000)),
    optionalRows(supabase
      .from('player_hunt_bonuses')
      .select('id, user_id, hunt_id, slot_name, provider_name, bonus_cost, bet_size, payout, multiplier, profit_loss, status, created_at, opened_at')
      .is('deleted_at', null)
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .limit(10000)),
    fetchUserRoleRows(supabase),
    optionalRows(supabase
      .from('user_product_subscriptions')
      .select('user_id, product_code, plan_code, status, trial_started_at, trial_ends_at, current_period_end, cancel_at_period_end, created_at')
      .limit(5000)),
    optionalRows(supabase
      .from('billing_subscriptions')
      .select('user_id, product_code, plan_id, status, current_period_start, current_period_end, trial_start, trial_end, cancel_at_period_end, provider, created_at')
      .limit(5000)),
    fetchOfferRows(supabase),
    optionalRows(supabase
      .from('offer_clicks')
      .select('offer_id, casino_name, user_id, page_source, created_at')
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .limit(10000)),
  ]);

  const sessionKeys = new Map(sessions.map(session => [session.id, sessionVisitorKey(session)]));
  const uniqueVisitors = new Set([
    ...sessions.map(sessionVisitorKey).filter(Boolean),
    ...events.map(event => eventVisitorKey(event, sessionKeys)).filter(Boolean),
  ]).size;
  const authenticatedUsers = new Set(sessions.map(s => s.user_id).filter(Boolean)).size;
  const playerSessions = sessions.filter(s => analyticsExperience(s) === 'player' || String(analyticsRoute(s) || '').startsWith('/player'));
  const streamerSessions = sessions.filter(s => ['streamer', 'overlay'].includes(analyticsExperience(s)));
  const overlaySessions = sessions.filter(s => analyticsExperience(s) === 'overlay' || String(analyticsRoute(s) || '').startsWith('/overlay-center') || String(analyticsRoute(s) || '').startsWith('/overlay/'));

  const canonicalName = (event) => analyticsEventName(event);
  const offerEvents = events.filter(event => canonicalName(event) === ANALYTICS_EVENTS.OFFER_CLICKED);
  const playerEvents = events.filter(event => analyticsExperience(event) === 'player');
  const streamerEvents = events.filter(event => ['streamer', 'overlay'].includes(analyticsExperience(event)));
  const playerSessionIds = new Set([
    ...playerSessions.map(session => session.id),
    ...playerEvents.map(event => event.session_id).filter(Boolean),
  ]);
  const streamerSessionIds = new Set([
    ...streamerSessions.map(session => session.id),
    ...streamerEvents.map(event => event.session_id).filter(Boolean),
  ]);
  const overlaySessionIds = new Set([
    ...overlaySessions.map(session => session.id),
    ...streamerEvents
      .filter(event => getExperienceFromPath(event.route || event.page_url || '') === 'overlay' || event.metadata?.experience === 'overlay')
      .map(event => event.session_id)
      .filter(Boolean),
  ]);

  const openedBonuses = playerBonuses.filter(b => b.status === 'opened');
  const playerCurrencyMap = {};
  for (const hunt of playerHunts) {
    const currency = hunt.currency || 'EUR';
    playerCurrencyMap[currency] = playerCurrencyMap[currency] || {
      currency,
      hunts: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalBonusCost: 0,
      totalPayout: 0,
      profitLoss: 0,
    };
    const row = playerCurrencyMap[currency];
    row.hunts += 1;
    row.totalDeposits += Number(hunt.starting_deposit || 0) + Number(hunt.additional_deposits || 0);
    row.totalWithdrawals += Number(hunt.initial_withdrawal || 0) + Number(hunt.total_withdrawals || 0);
  }

  const huntCurrency = new Map(playerHunts.map(hunt => [hunt.id, hunt.currency || 'EUR']));
  for (const bonus of playerBonuses) {
    const currency = huntCurrency.get(bonus.hunt_id) || 'EUR';
    playerCurrencyMap[currency] = playerCurrencyMap[currency] || {
      currency,
      hunts: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalBonusCost: 0,
      totalPayout: 0,
      profitLoss: 0,
    };
    const row = playerCurrencyMap[currency];
    row.totalBonusCost += Number(bonus.bonus_cost || 0);
    if (bonus.status === 'opened') row.totalPayout += Number(bonus.payout || 0);
    row.profitLoss += Number(bonus.profit_loss || 0);
  }

  const activePlayerSubs = playerSubscriptions.filter(sub =>
    sub.product_code === 'player_bonus_hunt' &&
    ['trialing', 'active'].includes(sub.status) &&
    (!sub.trial_ends_at || new Date(sub.trial_ends_at).getTime() > Date.now())
  );
  const activeStreamerUsers = new Set(
    streamerRoles
      .filter(role => role.is_active && ['premium', 'admin', 'superadmin', 'moderator'].includes(role.role))
      .map(role => role.user_id)
      .filter(Boolean)
  );
  const activeStreamerSubs = billingSubscriptions.filter(sub =>
    (sub.product_code || 'streamer_premium') === 'streamer_premium' &&
    ['trialing', 'active'].includes(sub.status)
  );

  const offerNameMap = new Map(offers.map(offer => [offer.id, offerDisplayName(offer)]));
  const offerClickMap = {};
  for (const event of offerEvents) {
    const offerId = event.offer_id || safeMetadata(event).offer_id;
    if (!offerId) continue;
    offerClickMap[offerId] = offerClickMap[offerId] || { offer_id: offerId, name: offerNameMap.get(offerId) || 'Unknown offer', clicks: 0, analyticsClicks: 0, legacyClicks: 0 };
    offerClickMap[offerId].clicks += 1;
    offerClickMap[offerId].analyticsClicks += 1;
  }
  for (const click of legacyOfferClicks) {
    const offerId = click.offer_id;
    if (!offerId) continue;
    offerClickMap[offerId] = offerClickMap[offerId] || { offer_id: offerId, name: offerNameMap.get(offerId) || click.casino_name || 'Unknown offer', clicks: 0, analyticsClicks: 0, legacyClicks: 0 };
    offerClickMap[offerId].clicks += 1;
    offerClickMap[offerId].legacyClicks += 1;
  }

  const eventCounts = events.reduce((acc, event) => {
    const name = canonicalName(event) || event.event_type || 'unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return res.status(200).json({
    period: range.key,
    range: { start: range.start, end: range.end },
    acquisition: {
      sessions: sessions.length,
      uniqueVisitors,
      authenticatedUsers,
      playerSessions: playerSessionIds.size,
      streamerSessions: streamerSessionIds.size,
      overlaySessions: overlaySessionIds.size,
      suspiciousSessions: sessions.filter(s => s.is_suspicious).length,
      referrers: countBy(sessions, 'referrer_source'),
    },
    player: {
      activeSubscriptions: activePlayerSubs.length,
      trialing: playerSubscriptions.filter(sub => sub.product_code === 'player_bonus_hunt' && sub.status === 'trialing').length,
      canceled: playerSubscriptions.filter(sub => sub.product_code === 'player_bonus_hunt' && ['canceled', 'cancelled', 'expired'].includes(sub.status)).length,
      sessions: playerSessionIds.size,
      events: playerEvents.length,
      huntsCreated: playerHunts.length,
      activeHunts: playerHunts.filter(h => h.status === 'active').length,
      completedHunts: playerHunts.filter(h => h.status === 'completed').length,
      bonusesAdded: playerBonuses.length,
      bonusesOpened: openedBonuses.length,
      averagePayout: openedBonuses.length ? sumRows(openedBonuses, 'payout') / openedBonuses.length : 0,
      averageMultiplier: openedBonuses.length ? sumRows(openedBonuses, 'multiplier') / openedBonuses.length : 0,
      totalsByCurrency: Object.values(playerCurrencyMap).map(row => ({
        ...row,
        totalDeposits: Math.round(row.totalDeposits * 100) / 100,
        totalWithdrawals: Math.round(row.totalWithdrawals * 100) / 100,
        totalBonusCost: Math.round(row.totalBonusCost * 100) / 100,
        totalPayout: Math.round(row.totalPayout * 100) / 100,
        profitLoss: Math.round(row.profitLoss * 100) / 100,
      })),
    },
    streamer: {
      activePremiumUsers: activeStreamerUsers.size,
      activeSubscriptions: activeStreamerSubs.length,
      activeMollieSubscriptions: activeStreamerSubs.filter(sub => sub.provider === 'mollie').length,
      activeStripeSubscriptions: activeStreamerSubs.length,
      sessions: streamerSessionIds.size,
      overlaySessions: overlaySessionIds.size,
      events: streamerEvents.length,
      premiumViews: events.filter(event => String(event.page_url || event.route || '').startsWith('/premium')).length,
      offerClicks: offerEvents.length + legacyOfferClicks.length,
      offersActive: offers.filter(offer => offer.is_active ?? offer.visible !== false).length,
      premiumOffers: offers.filter(offer => offer.is_premium).length,
    },
    revenue: {
      activePlayerSubscriptions: activePlayerSubs.length,
      activeStreamerSubscriptions: activeStreamerSubs.length,
      estimatedPlayerMrrEur: activePlayerSubs.length * 3,
      subscriptionStatuses: countBy([...playerSubscriptions, ...billingSubscriptions], 'status'),
      productMix: countBy([...playerSubscriptions, ...billingSubscriptions], 'product_code'),
      providerMix: countBy(billingSubscriptions, 'provider'),
    },
    offers: Object.values(offerClickMap).sort((a, b) => b.clicks - a.clicks).slice(0, 12),
    events: {
      total: events.length,
      known: events.filter(event => isKnownAnalyticsEvent(canonicalName(event))).length,
      suspicious: events.filter(event => event.is_suspicious).length,
      byName: eventCounts,
    },
  });
}

async function handleDataQuality(req, res, supabase) {
  const { period = '30d' } = req.query;
  const range = getAnalyticsPeriodRange(period);
  const rows = (await fetchAnalyticsEventsForRange(supabase, range.start, range.end, 15000)).map(normalizeEventRow);
  const unknownEvents = rows.filter(event => !isKnownAnalyticsEvent(analyticsEventName(event)));
  const missingRoute = rows.filter(event => !(event.route || event.page_url || safeMetadata(event).route || safeMetadata(event).page_url));
  const missingProductContext = rows.filter(event => {
    const route = analyticsRoute(event);
    const experience = analyticsExperience(event);
    return !experience || (experience === 'public' && route !== '/');
  });
  const offerClicksMissingOffer = rows.filter(event => {
    const name = analyticsEventName(event);
    return name === ANALYTICS_EVENTS.OFFER_CLICKED && !(event.offer_id || safeMetadata(event).offer_id);
  });
  const eventIdCoverage = rows.filter(event => event.event_id || safeMetadata(event).event_id).length;
  const experienceCounts = rows.reduce((acc, event) => {
    addMapCount(acc, analyticsExperience(event));
    return acc;
  }, {});

  return res.status(200).json({
    period: range.key,
    range: { start: range.start, end: range.end },
    totalEvents: rows.length,
    issues: {
      unknownEvents: unknownEvents.length,
      missingRoute: missingRoute.length,
      missingProductContext: missingProductContext.length,
      offerClicksMissingOffer: offerClicksMissingOffer.length,
      missingSession: rows.filter(event => !event.session_id).length,
      missingVisitor: rows.filter(event => !event.visitor_id).length,
    },
    coverage: {
      knownEventPercent: safeRatio(rows.length - unknownEvents.length, rows.length),
      routePercent: safeRatio(rows.length - missingRoute.length, rows.length),
      eventIdPercent: safeRatio(eventIdCoverage, rows.length),
    },
    byExperience: experienceCounts,
    examples: {
      unknownEvents: unknownEvents.slice(0, 10).map(event => ({
        id: event.id,
        event_type: event.event_type,
        event_name: analyticsEventName(event),
        page_url: analyticsRoute(event),
        created_at: event.created_at,
      })),
      missingRoute: missingRoute.slice(0, 10).map(event => ({
        id: event.id,
        event_type: event.event_type,
        created_at: event.created_at,
      })),
      offerClicksMissingOffer: offerClicksMissingOffer.slice(0, 10).map(event => ({
        id: event.id,
        event_type: event.event_type,
        event_name: analyticsEventName(event),
        page_url: analyticsRoute(event),
        created_at: event.created_at,
      })),
    },
  });
}

async function handleRealtime(req, res, supabase) {
  const fiveMinAgo = new Date(Date.now() - 300000).toISOString();
  const fifteenMinAgo = new Date(Date.now() - 900000).toISOString();
  const [activeSessionsRaw, recentEventsRaw] = await Promise.all([
    fetchAnalyticsSessionsForRange(supabase, fifteenMinAgo, new Date().toISOString(), 200),
    fetchAnalyticsEventsForRange(supabase, fiveMinAgo, new Date().toISOString(), 200),
  ]);

  const activeSessions = activeSessionsRaw
    .map(normalizeSessionRow)
    .sort((a, b) => String(b.started_at || '').localeCompare(String(a.started_at || '')))
    .slice(0, 20);
  const recentEvents = recentEventsRaw
    .map(normalizeEventRow)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 30);

  return res.status(200).json({
    activeSessions,
    recentEvents,
    activeCount: activeSessionsRaw.length,
  });
}

async function handleTraffic(req, res, supabase) {
  const { since } = req.query;
  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString();

  const sessions = (await fetchAnalyticsSessionsForRange(supabase, sinceDate, new Date().toISOString())).map(normalizeSessionRow);

  const sourceMap = {};
  sessions.forEach(s => {
    const src = s.referrer_source || classifyReferrer(s.referrer) || 'direct';
    if (!sourceMap[src]) sourceMap[src] = { source: src, sessions: 0, visitors: new Set(), bounces: 0, totalDuration: 0, durationCount: 0 };
    const m = sourceMap[src];
    m.sessions++;
    m.visitors.add(sessionVisitorKey(s));
    if (s.is_bounce) m.bounces++;
    if (s.duration_secs) { m.totalDuration += s.duration_secs; m.durationCount++; }
  });

  const result = Object.values(sourceMap).map(m => ({
    source: m.source,
    sessions: m.sessions,
    unique_visitors: m.visitors.size,
    bounce_rate: m.sessions > 0 ? ((m.bounces / m.sessions) * 100).toFixed(1) : '0.0',
    avg_duration: m.durationCount > 0 ? Math.round(m.totalDuration / m.durationCount) : 0,
  })).sort((a, b) => b.sessions - a.sessions);

  return res.status(200).json({ sources: result });
}

async function handleGeo(req, res, supabase) {
  const { since } = req.query;
  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString();

  const sessions = (await fetchAnalyticsSessionsForRange(supabase, sinceDate, new Date().toISOString())).map(normalizeSessionRow);

  // Country breakdown
  const countryMap = {};
  const cityMap = {};
  sessions.forEach(s => {
    const c = s.country || 'Unknown';
    const cc = s.country_code || '??';
    if (!countryMap[cc]) countryMap[cc] = { country: c, country_code: cc, sessions: 0, visitors: new Set() };
    countryMap[cc].sessions++;
    countryMap[cc].visitors.add(sessionVisitorKey(s));

    const city = s.city || 'Unknown';
    const key = `${cc}:${city}`;
    if (!cityMap[key]) cityMap[key] = { city, country_code: cc, sessions: 0 };
    cityMap[key].sessions++;
  });

  const countries = Object.values(countryMap)
    .map(c => ({ ...c, unique_visitors: c.visitors.size, visitors: undefined }))
    .sort((a, b) => b.sessions - a.sessions);

  const cities = Object.values(cityMap)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 20);

  return res.status(200).json({ countries, cities });
}

async function handleFraud(req, res, supabase) {
  const { page = 1, limit = 20, resolved = 'false', rule } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabase
    .from('analytics_fraud_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (resolved !== 'all') query = query.eq('resolved', resolved === 'true');
  if (rule) query = query.eq('rule_name', rule);

  let { data, count, error } = await query;

  if (error && isMissingRelationError(error)) {
    let legacyQuery = supabase
      .from('fraud_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (resolved !== 'all') legacyQuery = legacyQuery.eq('resolved', resolved === 'true');
    const legacyResult = await legacyQuery;
    data = (legacyResult.data || []).map(row => ({
      ...row,
      visitor_id: row.metadata?.visitor_id || null,
      rule_name: row.metadata?.rule_name || 'legacy_flag',
      event_count: row.metadata?.event_count || null,
    }));
    count = legacyResult.count || data.length;
  }

  // Summary counts
  let { data: summary, error: summaryError } = await supabase
    .from('analytics_fraud_logs')
    .select('rule_name')
    .eq('resolved', false);

  if (summaryError && isMissingRelationError(summaryError)) {
    const legacySummary = await supabase.from('fraud_logs').select('metadata, reason').eq('resolved', false);
    summary = (legacySummary.data || []).map(row => ({ rule_name: row.metadata?.rule_name || 'legacy_flag' }));
  }

  const ruleCounts = {};
  (summary || []).forEach(f => {
    ruleCounts[f.rule_name] = (ruleCounts[f.rule_name] || 0) + 1;
  });

  return res.status(200).json({ logs: data || [], total: count || 0, ruleCounts });
}

async function handleConfig(req, res, supabase, user) {
  const defaults = {
    max_clicks_10s: 15,
    max_same_offer_1m: 5,
    max_sessions_ip_1h: 10,
    risk_score_threshold: 60,
    rapid_click_threshold: 15,
    multi_session_ip_threshold: 10,
    risk_threshold: 60,
    tracking_enabled: true,
    geo_tracking: true,
    geo_enabled: true,
    ip_tracking: true,
    retention_days: 365,
  };

  if (req.method === 'POST') {
    const body = parseJsonBody(req);
    const normalizedBody = {
      ...body,
      max_clicks_10s: body.max_clicks_10s ?? body.rapid_click_threshold ?? defaults.max_clicks_10s,
      max_sessions_ip_1h: body.max_sessions_ip_1h ?? body.multi_session_ip_threshold ?? defaults.max_sessions_ip_1h,
      risk_score_threshold: body.risk_score_threshold ?? body.risk_threshold ?? defaults.risk_score_threshold,
      geo_tracking: body.geo_tracking ?? body.geo_enabled ?? defaults.geo_tracking,
    };
    const { data, error } = await supabase
      .from('analytics_config')
      .upsert({
        user_id: user.id,
        ...normalizedBody,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error && isMissingRelationError(error)) {
      await supabase.from('fraud_config').insert({
        key: `analytics_config:${user.id}`,
        value: normalizedBody,
        description: 'Analytics dashboard settings fallback',
      }).catch(() => {});
      return res.status(200).json({ config: { ...defaults, ...normalizedBody } });
    }

    return res.status(200).json({ config: { ...defaults, ...(data || normalizedBody) } });
  }

  // GET
  const { data, error } = await supabase
    .from('analytics_config')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && isMissingRelationError(error)) {
    const legacy = await supabase
      .from('fraud_config')
      .select('value')
      .eq('key', `analytics_config:${user.id}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return res.status(200).json({ config: { ...defaults, ...(legacy.data?.value || {}) } });
  }

  return res.status(200).json({ config: { ...defaults, ...(data || {}) } });
}

async function handleResolveFraud(req, res, supabase, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  const result = await supabase
    .from('analytics_fraud_logs')
    .update({ resolved: true, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq('id', id);

  if (result.error && isMissingColumnError(result.error)) {
    await supabase.from('analytics_fraud_logs').update({ resolved: true }).eq('id', id);
  } else if (result.error && isMissingRelationError(result.error)) {
    await supabase.from('fraud_logs').update({ resolved: true }).eq('id', id);
  }

  return res.status(200).json({ ok: true });
}

async function handleDeleteData(req, res, supabase, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { visitor_id, ip_address, email, fingerprint } = parseJsonBody(req);
  if (!visitor_id && !ip_address && !email && !fingerprint) return res.status(400).json({ error: 'visitor_id, ip_address, email, or fingerprint required' });

  const counts = { sessions: 0, events: 0, fraud_logs: 0 };
  const targetVisitorIds = new Set(visitor_id ? [visitor_id] : []);
  const targetSessionIds = new Set();

  if (fingerprint) {
    const visitorResult = await supabase.from('analytics_visitors').select('id').eq('fingerprint', fingerprint).limit(20);
    (visitorResult.data || []).forEach(row => targetVisitorIds.add(row.id));
  }

  const legacyFilters = [];
  const syntheticId = fingerprint || visitor_id;
  if (syntheticId) legacyFilters.push(`session_token.eq.${syntheticId}`, `device_fingerprint.eq.${syntheticId}`, `gpu_fingerprint.eq.${syntheticId}`);
  if (email) legacyFilters.push(`user_email.eq.${email}`);
  if (legacyFilters.length) {
    const legacySessions = await supabase
      .from('analytics_sessions')
      .select('id')
      .or(legacyFilters.join(','))
      .limit(10000);
    (legacySessions.data || []).forEach(row => targetSessionIds.add(row.id));
  }

  for (const targetVisitorId of targetVisitorIds) {
    const { count: ec } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('visitor_id', targetVisitorId);
    const { count: sc } = await supabase.from('analytics_sessions').select('id', { count: 'exact', head: true }).eq('visitor_id', targetVisitorId);
    const { count: fc } = await supabase.from('analytics_fraud_logs').select('id', { count: 'exact', head: true }).eq('visitor_id', targetVisitorId);

    counts.events += ec || 0;
    counts.sessions += sc || 0;
    counts.fraud_logs += fc || 0;

    // Delete in order (events → sessions → fraud → visitor)
    await supabase.from('analytics_events').delete().eq('visitor_id', targetVisitorId);
    await supabase.from('analytics_fraud_logs').delete().eq('visitor_id', targetVisitorId);
    await supabase.from('analytics_sessions').delete().eq('visitor_id', targetVisitorId);
    await supabase.from('analytics_visitors').delete().eq('id', targetVisitorId);
  }

  if (targetSessionIds.size) {
    const ids = Array.from(targetSessionIds);
    const { count: ec } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).in('session_id', ids);
    const { count: sc } = await supabase.from('analytics_sessions').select('id', { count: 'exact', head: true }).in('id', ids);
    const { count: fc } = await supabase.from('fraud_logs').select('id', { count: 'exact', head: true }).in('session_id', ids);
    counts.events += ec || 0;
    counts.sessions += sc || 0;
    counts.fraud_logs += fc || 0;
    await supabase.from('analytics_events').delete().in('session_id', ids);
    await supabase.from('analytics_fraud_logs').delete().in('session_id', ids);
    await supabase.from('fraud_logs').delete().in('session_id', ids);
    await supabase.from('analytics_sessions').delete().in('id', ids);
  }

  if (ip_address) {
    await supabase.from('analytics_events').delete().eq('ip_address', ip_address);
    await supabase.from('analytics_fraud_logs').delete().eq('ip_address', ip_address);
    await supabase.from('analytics_sessions').delete().eq('ip_address', ip_address);
    await supabase.from('analytics_geo_cache').delete().eq('ip_address', ip_address);
  }

  // Log deletion request
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  await supabase.from('analytics_deletion_requests').insert({
    requester_id: user.id,
    target_visitor_id: visitor_id && uuid.test(visitor_id) ? visitor_id : null,
    target_ip: ip_address || null,
    status: 'completed',
    completed_at: new Date().toISOString(),
    deleted_count: counts,
  }).catch(() => {});

  return res.status(200).json({ ok: true, deleted: counts });
}

async function handleExport(req, res, supabase) {
  const { type = 'events', since, limit = 1000 } = req.query;
  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString();

  let data = [];
  if (type === 'events') {
    data = (await fetchAnalyticsEventsForRange(supabase, sinceDate, new Date().toISOString(), parseInt(limit))).map(normalizeEventRow);
  } else if (type === 'sessions') {
    data = (await fetchAnalyticsSessionsForRange(supabase, sinceDate, new Date().toISOString(), parseInt(limit))).map(normalizeSessionRow);
  } else if (type === 'fraud') {
    let rows = await optionalRows(supabase
      .from('analytics_fraud_logs')
      .select('id, session_id, visitor_id, ip_address, rule_name, reason, risk_score, event_count, resolved, created_at')
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit)));
    if (!rows.length) {
      rows = await optionalRows(supabase
        .from('fraud_logs')
        .select('id, session_id, ip_address, reason, risk_score, metadata, resolved, created_at')
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit)));
      rows = rows.map(row => ({ ...row, rule_name: row.metadata?.rule_name || 'legacy_flag', event_count: row.metadata?.event_count || null }));
    }
    data = rows;
  }

  // Convert to CSV
  if (!data.length) return res.status(200).json({ csv: '', rows: 0 });

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  data.forEach(row => {
    csvRows.push(headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','));
  });

  return res.status(200).json({ csv: csvRows.join('\n'), rows: data.length });
}

async function handleFunnel(req, res, supabase) {
  const { steps, since } = req.query;
  if (!steps) return res.status(400).json({ error: 'steps required (JSON array)' });

  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString();
  let funnelSteps;
  try {
    funnelSteps = JSON.parse(steps);
  } catch {
    return res.status(400).json({ error: 'Invalid steps JSON' });
  }

  // For each step, count unique visitors who performed the event
  const events = await fetchAnalyticsEventsForRange(supabase, sinceDate, new Date().toISOString(), 25000);
  const sessionKeys = new Map();
  const results = [];
  for (const step of funnelSteps) {
    const stepEventName = normalizeAnalyticsEventName(step.event_name || step.event_type);
    const matchingEvents = events.filter(event => {
      if (analyticsEventName(event) !== stepEventName && event.event_type !== step.event_type) return false;
      if (step.page_url_pattern && !String(analyticsRoute(event)).includes(step.page_url_pattern)) return false;
      return true;
    });
    const uniqueVisitors = new Set(matchingEvents.map(event => eventVisitorKey(event, sessionKeys)).filter(Boolean)).size;

    results.push({
      label: step.label || step.event_name || step.event_type,
      event_type: step.event_type || getLegacyEventType(stepEventName),
      event_name: stepEventName,
      unique_visitors: uniqueVisitors,
    });
  }

  // Calculate drop-off
  results.forEach((step, i) => {
    step.conversion_rate = i === 0 ? 100 : (results[0].unique_visitors > 0
      ? ((step.unique_visitors / results[0].unique_visitors) * 100).toFixed(1)
      : 0);
    step.drop_off = i === 0 ? 0 : results[i - 1].unique_visitors - step.unique_visitors;
  });

  return res.status(200).json({ funnel: results });
}
