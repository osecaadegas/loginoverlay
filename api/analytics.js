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

  const { fingerprint, referrer, landing_page, utm_source, utm_medium, utm_campaign } = req.body;
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

  // Increment total_sessions
  await supabase.rpc('increment_field', {
    table_name: 'analytics_visitors',
    row_id: visitor.id,
    field_name: 'total_sessions',
    amount: 1,
  }).catch(() => {
    // Fallback: manual update if RPC doesn't exist
    supabase
      .from('analytics_visitors')
      .update({ total_sessions: supabase.raw('total_sessions + 1') })
      .eq('id', visitor.id);
  });

  // Create session
  const { data: session } = await supabase
    .from('analytics_sessions')
    .insert({
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
    })
    .select('id')
    .single();

  return res.status(200).json({
    session_id: session?.id,
    visitor_id: visitor.id,
  });
}

async function handleTrack(req, res, supabase) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const {
    session_id, visitor_id, event_type,
    page_url, page_title, offer_id, element_id, element_text,
    target_url, metadata,
  } = req.body;

  if (!session_id || !visitor_id || !event_type) {
    return res.status(400).json({ error: 'session_id, visitor_id, event_type required' });
  }

  const ip = getClientIp(req);
  const geo = await getGeoForIp(ip, supabase);

  // Insert event
  const { data: event } = await supabase
    .from('analytics_events')
    .insert({
      session_id,
      visitor_id,
      event_type,
      page_url: page_url || null,
      page_title: page_title || null,
      offer_id: offer_id || null,
      element_id: element_id || null,
      element_text: element_text || null,
      target_url: target_url || null,
      metadata: metadata || {},
      ip_address: ip,
      country: geo.country || null,
      city: geo.city || null,
    })
    .select('id')
    .single();

  // Update session stats
  const updates = { event_count: undefined };
  if (event_type === 'pageview') {
    await supabase
      .from('analytics_sessions')
      .update({ is_bounce: false })
      .eq('id', session_id)
      .gt('page_count', 0);
  }

  // Increment counters via raw SQL-safe update
  await supabase.rpc('analytics_increment_session', {
    p_session_id: session_id,
    p_is_pageview: event_type === 'pageview',
  }).catch(() => {
    // Fallback if RPC doesn't exist yet
  });

  // Run fraud detection (async, don't block response)
  runFraudChecks(supabase, {
    session_id,
    visitor_id,
    ip_address: ip,
    event_type,
  }).catch(err => console.error('[Fraud check]', err));

  return res.status(200).json({ id: event?.id, ok: true });
}

async function handleIdentify(req, res, supabase) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { visitor_id, user_id, twitch_id, twitch_username, twitch_avatar } = req.body;
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
