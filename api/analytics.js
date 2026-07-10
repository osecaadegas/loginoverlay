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
} from '../shared/analytics.js';

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
  const { data: cached } = await supabase
    .from('analytics_geo_cache')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

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
    await supabase.from('analytics_geo_cache').upsert(geo, { onConflict: 'ip_address' }).select();
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

/* ═══════════════════════════════════════════════════════════
   FRAUD DETECTION
   ═══════════════════════════════════════════════════════════ */

async function runFraudChecks(supabase, { session_id, visitor_id, ip_address, event_type }) {
  let totalScore = 0;
  const flags = [];

  // Load config (use defaults if none)
  const { data: cfg } = await supabase
    .from('analytics_config')
    .select('*')
    .limit(1)
    .maybeSingle();

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
    const { count: ipSessions } = await supabase
      .from('analytics_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip_address)
      .gte('started_at', oneHourAgo);

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
    await supabase.from('analytics_fraud_logs').insert({
      session_id,
      visitor_id,
      ip_address,
      ...flag,
    });
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
  const { data: visitor } = await supabase
    .from('analytics_visitors')
    .upsert(
      { fingerprint, last_seen_at: new Date().toISOString() },
      { onConflict: 'fingerprint' }
    )
    .select('id')
    .single();

  if (!visitor) return res.status(500).json({ error: 'Failed to create visitor' });

  // Increment total_sessions (best-effort, non-critical)
  await supabase.rpc('increment_field', {
    table_name: 'analytics_visitors',
    row_id: visitor.id,
    field_name: 'total_sessions',
    amount: 1,
  }).catch(() => {
    // If RPC doesn't exist, just skip increment (not critical)
  });

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

  if (sessionResult.error || !sessionResult.data) {
    return res.status(500).json({ error: 'Failed to create session' });
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
  const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString();

  // Current period
  const [
    { count: totalSessions },
    { count: totalEvents },
    { count: uniqueVisitors },
    { count: suspiciousSessions },
  ] = await Promise.all([
    supabase.from('analytics_sessions').select('id', { count: 'exact', head: true }).gte('started_at', since),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('analytics_sessions').select('visitor_id', { count: 'exact', head: true }).gte('started_at', since),
    supabase.from('analytics_sessions').select('id', { count: 'exact', head: true }).gte('started_at', since).eq('is_suspicious', true),
  ]);

  // Previous period for trends
  const [
    { count: prevSessions },
    { count: prevEvents },
  ] = await Promise.all([
    supabase.from('analytics_sessions').select('id', { count: 'exact', head: true }).gte('started_at', prevSince).lt('started_at', since),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).gte('created_at', prevSince).lt('created_at', since),
  ]);

  // Click count
  const { count: totalClicks } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
    .in('event_type', ['click', 'offer_click', 'button_click']);

  // Daily chart data
  const { data: dailyData } = await supabase
    .from('analytics_sessions')
    .select('started_at')
    .gte('started_at', since)
    .order('started_at', { ascending: true });

  // Group by day
  const chartMap = {};
  (dailyData || []).forEach(s => {
    const day = s.started_at.slice(0, 10);
    chartMap[day] = (chartMap[day] || 0) + 1;
  });
  const chart = Object.entries(chartMap).map(([date, sessions]) => ({ date, sessions }));

  // Top pages
  const { data: topPages } = await supabase
    .from('analytics_events')
    .select('page_url')
    .eq('event_type', 'pageview')
    .gte('created_at', since)
    .limit(500);

  const pageCount = {};
  (topPages || []).forEach(e => {
    const p = e.page_url || '/';
    pageCount[p] = (pageCount[p] || 0) + 1;
  });
  const topPagesList = Object.entries(pageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, views]) => ({ page, views }));

  return res.status(200).json({
    totalSessions: totalSessions || 0,
    totalEvents: totalEvents || 0,
    uniqueVisitors: uniqueVisitors || 0,
    totalClicks: totalClicks || 0,
    suspiciousSessions: suspiciousSessions || 0,
    sessionsTrend: calcTrend(totalSessions, prevSessions),
    eventsTrend: calcTrend(totalEvents, prevEvents),
    chart,
    topPages: topPagesList,
    period,
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

  const { data, count } = await query;
  return res.status(200).json({ visitors: data || [], total: count || 0 });
}

async function handleVisitorDetail(req, res, supabase) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  const [
    { data: visitor },
    { data: sessions },
    { data: events },
    { data: fraudLogs },
  ] = await Promise.all([
    supabase.from('analytics_visitors').select('*').eq('id', id).single(),
    supabase.from('analytics_sessions').select('*').eq('visitor_id', id).order('started_at', { ascending: false }).limit(50),
    supabase.from('analytics_events').select('*').eq('visitor_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('analytics_fraud_logs').select('*').eq('visitor_id', id).order('created_at', { ascending: false }).limit(20),
  ]);

  return res.status(200).json({ visitor, sessions: sessions || [], events: events || [], fraudLogs: fraudLogs || [] });
}

async function handleSessions(req, res, supabase) {
  const { page = 1, limit = 20, suspicious, country, since } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabase
    .from('analytics_sessions')
    .select('*, analytics_visitors(twitch_username, twitch_avatar, fingerprint)', { count: 'exact' })
    .order('started_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (suspicious === 'true') query = query.eq('is_suspicious', true);
  if (country) query = query.eq('country_code', country);
  if (since) query = query.gte('started_at', since);

  const { data, count } = await query;
  return res.status(200).json({ sessions: data || [], total: count || 0 });
}

async function handleEvents(req, res, supabase) {
  const { page = 1, limit = 50, type, session_id, since } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabase
    .from('analytics_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (type) query = query.eq('event_type', type);
  if (session_id) query = query.eq('session_id', session_id);
  if (since) query = query.gte('created_at', since);

  const { data, count } = await query;
  return res.status(200).json({ events: data || [], total: count || 0 });
}

async function handleOffers(req, res, supabase) {
  const { since } = req.query;
  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString();

  // Get all offer clicks
  const { data: clicks } = await supabase
    .from('analytics_events')
    .select('offer_id, is_suspicious, visitor_id, session_id, created_at')
    .in('event_type', ['offer_click', 'click'])
    .not('offer_id', 'is', null)
    .gte('created_at', sinceDate);

  // Get total pageviews for CTR
  const { count: totalPageviews } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'pageview')
    .gte('created_at', sinceDate);

  // Aggregate per offer
  const offerMap = {};
  (clicks || []).forEach(c => {
    if (!c.offer_id) return;
    if (!offerMap[c.offer_id]) {
      offerMap[c.offer_id] = { offer_id: c.offer_id, total: 0, clean: 0, suspicious: 0, visitors: new Set(), sessions: new Set() };
    }
    const o = offerMap[c.offer_id];
    o.total++;
    if (c.is_suspicious) o.suspicious++;
    else o.clean++;
    o.visitors.add(c.visitor_id);
    o.sessions.add(c.session_id);
  });

  // Get offer names
  const offerIds = Object.keys(offerMap);
  let offerNames = {};
  if (offerIds.length > 0) {
    const { data: offers } = await supabase
      .from('casino_offers')
      .select('id, name')
      .in('id', offerIds);
    (offers || []).forEach(o => { offerNames[o.id] = o.name; });
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

  // Get offer name
  const { data: offerRow } = await supabase
    .from('casino_offers')
    .select('id, name, url, logo_url')
    .eq('id', offer_id)
    .single();

  // Get click events with session + visitor data
  const { data: clicks, count } = await supabase
    .from('analytics_events')
    .select(`
      id, event_type, created_at, is_suspicious, ip_address, country, city, metadata, target_url,
      session:analytics_sessions!session_id (
        id, ip_address, browser, os, device_type, country, country_code, city, region, isp,
        referrer, referrer_source, user_agent, risk_score, is_suspicious, started_at, duration_secs
      ),
      visitor:analytics_visitors!visitor_id (
        id, twitch_id, twitch_username, twitch_avatar, fingerprint, first_seen_at, last_seen_at,
        total_sessions, total_events, is_bot
      )
    `, { count: 'exact' })
    .eq('offer_id', offer_id)
    .in('event_type', ['offer_click', 'click'])
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1);

  // Aggregate quick stats
  const rows = clicks || [];
  const uniqueVisitors = new Set(rows.map(r => r.visitor?.id)).size;
  const uniqueIPs = new Set(rows.map(r => r.session?.ip_address || r.ip_address).filter(Boolean)).size;
  const suspiciousCount = rows.filter(r => r.is_suspicious).length;
  const countries = {};
  rows.forEach(r => {
    const c = r.session?.country || r.country || 'Unknown';
    countries[c] = (countries[c] || 0) + 1;
  });
  const topCountries = Object.entries(countries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, clicks]) => ({ name, clicks }));

  // Clicks per hour for timeline chart
  const hourBuckets = {};
  rows.forEach(r => {
    const h = r.created_at.slice(0, 13); // "2026-04-17T14"
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
  });
  const timeline = Object.entries(hourBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([hour, count]) => ({ hour: hour.slice(5) + ':00', clicks: count }));

  return res.status(200).json({
    offer: {
      id: offer_id,
      name: offerRow?.name || 'Unknown',
      url: offerRow?.url || null,
      logo_url: offerRow?.logo_url || null,
    },
    clicks: rows.map(r => ({
      id: r.id,
      event_type: r.event_type,
      created_at: r.created_at,
      is_suspicious: r.is_suspicious,
      target_url: r.target_url,
      ip_address: r.session?.ip_address || r.ip_address || null,
      country: r.session?.country || r.country || null,
      city: r.session?.city || r.city || null,
      region: r.session?.region || null,
      isp: r.session?.isp || null,
      browser: r.session?.browser || null,
      os: r.session?.os || null,
      device_type: r.session?.device_type || null,
      referrer_source: r.session?.referrer_source || null,
      risk_score: r.session?.risk_score || 0,
      session_duration: r.session?.duration_secs || null,
      twitch_id: r.visitor?.twitch_id || null,
      twitch_username: r.visitor?.twitch_username || null,
      twitch_avatar: r.visitor?.twitch_avatar || null,
      fingerprint: r.visitor?.fingerprint || null,
      visitor_total_sessions: r.visitor?.total_sessions || 0,
      visitor_total_events: r.visitor?.total_events || 0,
      visitor_first_seen: r.visitor?.first_seen_at || null,
      is_bot: r.visitor?.is_bot || false,
      metadata: r.metadata || {},
    })),
    stats: {
      totalClicks: count || rows.length,
      uniqueVisitors,
      uniqueIPs,
      suspiciousCount,
      topCountries,
    },
    timeline,
    pagination: { total: count || rows.length, limit: lim, offset: off },
  });
}

async function handleProductOverview(req, res, supabase) {
  const { period = '30d' } = req.query;
  const range = getAnalyticsPeriodRange(period);

  const [
    sessionsResult,
    eventsResult,
    playerHuntsResult,
    playerBonusesResult,
    streamerSubsResult,
    playerSubsResult,
    billingSubsResult,
    offersResult,
    legacyOfferClicksResult,
  ] = await Promise.all([
    supabase
      .from('analytics_sessions')
      .select('id, visitor_id, user_id, landing_page, referrer_source, started_at, event_count, page_count, duration_secs, is_suspicious')
      .gte('started_at', range.start)
      .lte('started_at', range.end)
      .limit(10000),
    supabase
      .from('analytics_events')
      .select('id, event_type, event_name, offer_id, page_url, route, metadata, created_at, occurred_at, visitor_id, session_id, is_suspicious')
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .limit(15000),
    supabase
      .from('player_hunts')
      .select('id, user_id, currency, status, starting_deposit, additional_deposits, initial_withdrawal, total_withdrawals, hunt_date, created_at')
      .is('deleted_at', null)
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .limit(5000),
    supabase
      .from('player_hunt_bonuses')
      .select('id, user_id, hunt_id, slot_name, provider_name, bonus_cost, bet_size, payout, multiplier, profit_loss, status, created_at, opened_at')
      .is('deleted_at', null)
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .limit(10000),
    supabase
      .from('user_roles')
      .select('user_id, role, is_active, access_expires_at, source, created_at')
      .in('role', ['premium', 'admin', 'superadmin', 'moderator'])
      .limit(5000),
    supabase
      .from('user_product_subscriptions')
      .select('user_id, product_code, plan_code, status, trial_started_at, trial_ends_at, current_period_end, cancel_at_period_end, created_at')
      .limit(5000),
    supabase
      .from('billing_subscriptions')
      .select('user_id, product_code, plan_id, status, current_period_start, current_period_end, trial_start, trial_end, cancel_at_period_end, created_at')
      .limit(5000),
    supabase
      .from('casino_offers')
      .select('id, casino_name, title, is_active, is_premium, display_order')
      .limit(1000),
    supabase
      .from('offer_clicks')
      .select('offer_id, casino_name, user_id, page_source, created_at')
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .limit(10000),
  ]);

  const sessions = sessionsResult.data || [];
  let events = eventsResult.data || [];
  if (eventsResult.error && isMissingColumnError(eventsResult.error)) {
    const fallback = await supabase
      .from('analytics_events')
      .select('id, event_type, offer_id, page_url, metadata, created_at, visitor_id, session_id, is_suspicious')
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .limit(15000);
    events = fallback.data || [];
  }
  const playerHunts = playerHuntsResult.data || [];
  const playerBonuses = playerBonusesResult.data || [];
  const streamerRoles = streamerSubsResult.data || [];
  const playerSubscriptions = playerSubsResult.data || [];
  const billingSubscriptions = billingSubsResult.data || [];
  const offers = offersResult.data || [];
  const legacyOfferClicks = legacyOfferClicksResult.data || [];

  const uniqueVisitors = new Set(sessions.map(s => s.visitor_id).filter(Boolean)).size;
  const authenticatedUsers = new Set(sessions.map(s => s.user_id).filter(Boolean)).size;
  const playerSessions = sessions.filter(s => getExperienceFromPath(s.landing_page || '') === 'player' || String(s.landing_page || '').startsWith('/player'));
  const streamerSessions = sessions.filter(s => ['streamer', 'overlay'].includes(getExperienceFromPath(s.landing_page || '')));
  const overlaySessions = sessions.filter(s => String(s.landing_page || '').startsWith('/overlay-center') || String(s.landing_page || '').startsWith('/overlay/'));

  const canonicalName = (event) => normalizeAnalyticsEventName(event.event_name || event.metadata?.canonical_event_name || event.event_type);
  const offerEvents = events.filter(event => canonicalName(event) === ANALYTICS_EVENTS.OFFER_CLICKED || event.event_type === 'offer_click');
  const playerEvents = events.filter(event => getExperienceFromPath(event.route || event.page_url || '') === 'player' || event.metadata?.experience === 'player');
  const streamerEvents = events.filter(event => ['streamer', 'overlay'].includes(getExperienceFromPath(event.route || event.page_url || '')) || ['streamer', 'overlay'].includes(event.metadata?.experience));
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

  const offerNameMap = new Map(offers.map(offer => [offer.id, offer.casino_name || offer.title || 'Unknown offer']));
  const offerClickMap = {};
  for (const event of offerEvents) {
    const offerId = event.offer_id || event.metadata?.offer_id;
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
      activeStripeSubscriptions: activeStreamerSubs.length,
      sessions: streamerSessionIds.size,
      overlaySessions: overlaySessionIds.size,
      events: streamerEvents.length,
      premiumViews: events.filter(event => String(event.page_url || event.route || '').startsWith('/premium')).length,
      offerClicks: offerEvents.length + legacyOfferClicks.length,
      offersActive: offers.filter(offer => offer.is_active).length,
      premiumOffers: offers.filter(offer => offer.is_premium).length,
    },
    revenue: {
      activePlayerSubscriptions: activePlayerSubs.length,
      activeStreamerSubscriptions: activeStreamerSubs.length,
      estimatedPlayerMrrEur: activePlayerSubs.length * 3,
      subscriptionStatuses: countBy([...playerSubscriptions, ...billingSubscriptions], 'status'),
      productMix: countBy([...playerSubscriptions, ...billingSubscriptions], 'product_code'),
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
  let { data: events, error } = await supabase
    .from('analytics_events')
    .select('id, event_type, event_name, session_id, visitor_id, page_url, route, metadata, created_at, offer_id')
    .gte('created_at', range.start)
    .lte('created_at', range.end)
    .limit(15000);

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from('analytics_events')
      .select('id, event_type, session_id, visitor_id, page_url, metadata, created_at, offer_id')
      .gte('created_at', range.start)
      .lte('created_at', range.end)
      .limit(15000);
    events = fallback.data || [];
  }

  const rows = events || [];
  const unknownEvents = rows.filter(event => !isKnownAnalyticsEvent(event.event_name || event.metadata?.canonical_event_name || event.event_type));
  const missingRoute = rows.filter(event => !(event.route || event.page_url));
  const missingProductContext = rows.filter(event => {
    const route = event.route || event.page_url || '';
    const experience = event.metadata?.experience || getExperienceFromPath(route);
    return !experience || experience === 'public' && route !== '/';
  });
  const offerClicksMissingOffer = rows.filter(event => {
    const name = normalizeAnalyticsEventName(event.event_name || event.metadata?.canonical_event_name || event.event_type);
    return name === ANALYTICS_EVENTS.OFFER_CLICKED && !(event.offer_id || event.metadata?.offer_id);
  });
  const eventIdCoverage = rows.filter(event => event.metadata?.event_id).length;

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
    examples: {
      unknownEvents: unknownEvents.slice(0, 10).map(event => ({
        id: event.id,
        event_type: event.event_type,
        event_name: event.event_name || event.metadata?.canonical_event_name || null,
        page_url: event.page_url,
        created_at: event.created_at,
      })),
      missingRoute: missingRoute.slice(0, 10).map(event => ({
        id: event.id,
        event_type: event.event_type,
        created_at: event.created_at,
      })),
    },
  });
}

async function handleRealtime(req, res, supabase) {
  const fiveMinAgo = new Date(Date.now() - 300000).toISOString();

  const [
    { data: activeSessions },
    { data: recentEvents },
    { count: activeCount },
  ] = await Promise.all([
    supabase
      .from('analytics_sessions')
      .select('id, visitor_id, ip_address, country, city, browser, device_type, started_at, is_suspicious, analytics_visitors(twitch_username, twitch_avatar)')
      .gte('started_at', new Date(Date.now() - 900000).toISOString())
      .order('started_at', { ascending: false })
      .limit(20),
    supabase
      .from('analytics_events')
      .select('id, event_type, page_url, offer_id, element_text, is_suspicious, created_at, session_id')
      .gte('created_at', fiveMinAgo)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('analytics_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', fiveMinAgo),
  ]);

  return res.status(200).json({
    activeSessions: activeSessions || [],
    recentEvents: recentEvents || [],
    activeCount: activeCount || 0,
  });
}

async function handleTraffic(req, res, supabase) {
  const { since } = req.query;
  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('referrer_source, visitor_id, duration_secs, is_bounce')
    .gte('started_at', sinceDate);

  const sourceMap = {};
  (sessions || []).forEach(s => {
    const src = s.referrer_source || 'direct';
    if (!sourceMap[src]) sourceMap[src] = { source: src, sessions: 0, visitors: new Set(), bounces: 0, totalDuration: 0, durationCount: 0 };
    const m = sourceMap[src];
    m.sessions++;
    m.visitors.add(s.visitor_id);
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

  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('country, country_code, city, visitor_id')
    .gte('started_at', sinceDate);

  // Country breakdown
  const countryMap = {};
  const cityMap = {};
  (sessions || []).forEach(s => {
    const c = s.country || 'Unknown';
    const cc = s.country_code || '??';
    if (!countryMap[cc]) countryMap[cc] = { country: c, country_code: cc, sessions: 0, visitors: new Set() };
    countryMap[cc].sessions++;
    countryMap[cc].visitors.add(s.visitor_id);

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
    .select('*, analytics_sessions(ip_address, country, browser, analytics_visitors(twitch_username))', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (resolved !== 'all') query = query.eq('resolved', resolved === 'true');
  if (rule) query = query.eq('rule_name', rule);

  const { data, count } = await query;

  // Summary counts
  const { data: summary } = await supabase
    .from('analytics_fraud_logs')
    .select('rule_name')
    .eq('resolved', false);

  const ruleCounts = {};
  (summary || []).forEach(f => {
    ruleCounts[f.rule_name] = (ruleCounts[f.rule_name] || 0) + 1;
  });

  return res.status(200).json({ logs: data || [], total: count || 0, ruleCounts });
}

async function handleConfig(req, res, supabase, user) {
  if (req.method === 'POST') {
    const body = req.body;
    const { data } = await supabase
      .from('analytics_config')
      .upsert({
        user_id: user.id,
        ...body,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    return res.status(200).json({ config: data });
  }

  // GET
  const { data } = await supabase
    .from('analytics_config')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return res.status(200).json({
    config: data || {
      max_clicks_10s: 15,
      max_same_offer_1m: 5,
      max_sessions_ip_1h: 10,
      risk_score_threshold: 60,
      tracking_enabled: true,
      geo_tracking: true,
      ip_tracking: true,
    },
  });
}

async function handleResolveFraud(req, res, supabase, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  await supabase
    .from('analytics_fraud_logs')
    .update({ resolved: true, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq('id', id);

  return res.status(200).json({ ok: true });
}

async function handleDeleteData(req, res, supabase, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { visitor_id, ip_address } = req.body;
  if (!visitor_id && !ip_address) return res.status(400).json({ error: 'visitor_id or ip_address required' });

  const counts = { sessions: 0, events: 0, fraud_logs: 0 };

  if (visitor_id) {
    const { count: ec } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('visitor_id', visitor_id);
    const { count: sc } = await supabase.from('analytics_sessions').select('id', { count: 'exact', head: true }).eq('visitor_id', visitor_id);
    const { count: fc } = await supabase.from('analytics_fraud_logs').select('id', { count: 'exact', head: true }).eq('visitor_id', visitor_id);

    counts.events = ec || 0;
    counts.sessions = sc || 0;
    counts.fraud_logs = fc || 0;

    // Delete in order (events → sessions → fraud → visitor)
    await supabase.from('analytics_events').delete().eq('visitor_id', visitor_id);
    await supabase.from('analytics_fraud_logs').delete().eq('visitor_id', visitor_id);
    await supabase.from('analytics_sessions').delete().eq('visitor_id', visitor_id);
    await supabase.from('analytics_visitors').delete().eq('id', visitor_id);
  }

  if (ip_address) {
    await supabase.from('analytics_events').delete().eq('ip_address', ip_address);
    await supabase.from('analytics_fraud_logs').delete().eq('ip_address', ip_address);
    await supabase.from('analytics_sessions').delete().eq('ip_address', ip_address);
    await supabase.from('analytics_geo_cache').delete().eq('ip_address', ip_address);
  }

  // Log deletion request
  await supabase.from('analytics_deletion_requests').insert({
    requester_id: user.id,
    target_visitor_id: visitor_id || null,
    target_ip: ip_address || null,
    status: 'completed',
    completed_at: new Date().toISOString(),
    deleted_count: counts,
  });

  return res.status(200).json({ ok: true, deleted: counts });
}

async function handleExport(req, res, supabase) {
  const { type = 'events', since, limit = 1000 } = req.query;
  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString();

  let data = [];
  if (type === 'events') {
    const { data: rows } = await supabase
      .from('analytics_events')
      .select('id, session_id, event_type, page_url, offer_id, element_text, ip_address, country, city, is_suspicious, created_at')
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    data = rows || [];
  } else if (type === 'sessions') {
    const { data: rows } = await supabase
      .from('analytics_sessions')
      .select('id, visitor_id, ip_address, browser, os, device_type, country, city, referrer_source, started_at, duration_secs, page_count, event_count, risk_score, is_suspicious')
      .gte('started_at', sinceDate)
      .order('started_at', { ascending: false })
      .limit(parseInt(limit));
    data = rows || [];
  } else if (type === 'fraud') {
    const { data: rows } = await supabase
      .from('analytics_fraud_logs')
      .select('id, session_id, ip_address, rule_name, reason, risk_score, event_count, resolved, created_at')
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    data = rows || [];
  }

  // Convert to CSV
  if (!data.length) return res.status(200).json({ csv: '', rows: 0 });

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  data.forEach(row => {
    csvRows.push(headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
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
  const results = [];
  for (const step of funnelSteps) {
    let query = supabase
      .from('analytics_events')
      .select('visitor_id')
      .eq('event_type', step.event_type)
      .gte('created_at', sinceDate);

    if (step.page_url_pattern) {
      query = query.ilike('page_url', `%${step.page_url_pattern}%`);
    }

    const { data } = await query;
    const uniqueVisitors = new Set((data || []).map(e => e.visitor_id)).size;

    results.push({
      label: step.label || step.event_type,
      event_type: step.event_type,
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
