/**
 * Streamer Data API — Public endpoint for external websites
 * 
 * External streamer sites call this with an API key to get
 * live bonus hunt data, overlay state, and hunt history.
 * 
 * Auth: ?key=<api_key> query param or x-api-key header
 * 
 * Routes via ?action= parameter:
 *   bonus_hunt       — Current live bonus hunt (bonuses list, totals, status)
 *   bonus_hunt_history — Completed hunts archive
 *   overlay_state    — Current overlay state (scene, alerts, etc.)
 *   widgets          — All visible widget configs
 *   profile          — Streamer public profile info
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Rate limiter (in-memory, per-key) ──────────────────
const rateLimits = new Map();

function checkRateLimit(apiKey, maxPerMin = 60) {
  const now = Date.now();
  const window = 60_000;
  let entry = rateLimits.get(apiKey);

  if (!entry || now - entry.windowStart > window) {
    entry = { windowStart: now, count: 0 };
    rateLimits.set(apiKey, entry);
  }

  entry.count++;
  return entry.count <= maxPerMin;
}

// ─── CORS helper ────────────────────────────────────────
function setCors(res, origin, allowedOrigins) {
  // If no origins configured, allow all
  if (!allowedOrigins || allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Cache-Control', 'public, max-age=2, s-maxage=2');
}

// ─── Main handler ───────────────────────────────────────
export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || '';

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  // ─── Extract API key ───────────────────────────────────
  const apiKey = req.query.key || req.headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 16) {
    return res.status(401).json({ error: 'Missing or invalid API key. Pass ?key=YOUR_KEY or x-api-key header.' });
  }

  // ─── Validate key ─────────────────────────────────────
  const { data: keyData, error: keyErr } = await supabase
    .rpc('validate_api_key', { p_api_key: apiKey });

  if (keyErr || !keyData || keyData.length === 0) {
    return res.status(403).json({ error: 'Invalid or deactivated API key.' });
  }

  const userId = keyData[0].user_id;
  const allowedOrigins = keyData[0].allowed_origins || [];

  setCors(res, origin, allowedOrigins);

  // ─── Rate limit ────────────────────────────────────────
  if (!checkRateLimit(apiKey)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 60 requests/min.' });
  }

  // ─── Route action ──────────────────────────────────────
  const action = req.query.action || 'bonus_hunt';

  try {
    switch (action) {
      case 'bonus_hunt':
        return await handleBonusHunt(res, userId);
      case 'bonus_hunt_history':
        return await handleBonusHuntHistory(res, userId, req.query);
      case 'overlay_state':
        return await handleOverlayState(res, userId);
      case 'widgets':
        return await handleWidgets(res, userId);
      case 'profile':
        return await handleProfile(res, userId);
      default:
        return res.status(400).json({
          error: `Unknown action: ${action}`,
          available: ['bonus_hunt', 'bonus_hunt_history', 'overlay_state', 'widgets', 'profile']
        });
    }
  } catch (err) {
    console.error('[streamer-data] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── ACTION HANDLERS ────────────────────────────────────

async function handleBonusHunt(res, userId) {
  // Get the bonus_hunt widget config — this is the LIVE hunt data
  const { data: widgets } = await supabase
    .from('overlay_widgets')
    .select('config, is_visible, updated_at')
    .eq('user_id', userId)
    .eq('widget_type', 'bonus_hunt')
    .limit(1);

  if (!widgets || widgets.length === 0) {
    return res.json({ active: false, message: 'No bonus hunt configured.' });
  }

  const widget = widgets[0];
  const config = widget.config || {};
  const bonuses = config.bonuses || [];

  // Calculate stats
  const totalBet = bonuses.reduce((sum, b) => sum + (parseFloat(b.bet) || 0), 0);
  const openedBonuses = bonuses.filter(b => b.result != null && b.result !== '');
  const totalWin = openedBonuses.reduce((sum, b) => sum + (parseFloat(b.result) || 0), 0);
  const totalCount = bonuses.length;
  const openedCount = openedBonuses.length;

  // Determine phase
  let phase = 'idle';
  if (totalCount > 0 && openedCount === 0) phase = 'building';
  else if (openedCount > 0 && openedCount < totalCount) phase = 'opening';
  else if (openedCount > 0 && openedCount === totalCount) phase = 'completed';

  return res.json({
    active: widget.is_visible,
    phase,
    hunt_name: config.huntName || config.hunt_name || null,
    currency: config.currency || '€',
    start_amount: parseFloat(config.startAmount || config.start_amount) || 0,
    stats: {
      total_bonuses: totalCount,
      opened: openedCount,
      remaining: totalCount - openedCount,
      total_bet: Math.round(totalBet * 100) / 100,
      total_win: Math.round(totalWin * 100) / 100,
      profit: Math.round((totalWin - totalBet) * 100) / 100,
      avg_multi: totalBet > 0 ? Math.round((totalWin / totalBet) * 100) / 100 : 0,
    },
    bonuses: bonuses.map(b => ({
      slot: b.slot || b.name || 'Unknown',
      bet: parseFloat(b.bet) || 0,
      result: b.result != null && b.result !== '' ? parseFloat(b.result) : null,
      multi: b.bet && b.result ? Math.round((parseFloat(b.result) / parseFloat(b.bet)) * 100) / 100 : null,
      image: b.image || b.img || null,
      provider: b.provider || null,
      is_super: b.isSuper || b.is_super || false,
    })),
    updated_at: widget.updated_at,
  });
}

async function handleBonusHuntHistory(res, userId, query) {
  const limit = Math.min(parseInt(query.limit) || 10, 50);
  const offset = parseInt(query.offset) || 0;

  const { data, error, count } = await supabase
    .from('bonus_hunt_history')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return res.json({
    hunts: (data || []).map(h => ({
      id: h.id,
      hunt_name: h.hunt_name,
      currency: h.currency || '€',
      start_money: h.start_money,
      total_bet: h.total_bet,
      total_win: h.total_win,
      profit: h.profit,
      bonus_count: h.bonus_count,
      avg_multi: h.avg_multi,
      best_multi: h.best_multi,
      bonuses: h.bonuses || [],
      created_at: h.created_at,
    })),
    total: count || 0,
    limit,
    offset,
  });
}

async function handleOverlayState(res, userId) {
  const { data } = await supabase
    .from('overlay_state')
    .select('state, updated_at')
    .eq('user_id', userId)
    .single();

  return res.json({
    state: data?.state || {},
    updated_at: data?.updated_at || null,
  });
}

async function handleWidgets(res, userId) {
  const { data } = await supabase
    .from('overlay_widgets')
    .select('widget_type, label, is_visible, config, updated_at')
    .eq('user_id', userId)
    .order('z_index', { ascending: true });

  // Strip sensitive fields from configs
  const safeWidgets = (data || []).map(w => {
    const config = { ...w.config };
    // Remove any credential fields
    delete config.se_jwt_token;
    delete config.se_channel_id;
    delete config.spotify_access_token;
    delete config.spotify_refresh_token;
    delete config.api_key;
    return {
      type: w.widget_type,
      label: w.label,
      visible: w.is_visible,
      config,
      updated_at: w.updated_at,
    };
  });

  return res.json({ widgets: safeWidgets });
}

async function handleProfile(res, userId) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username, display_name, avatar_url')
    .eq('user_id', userId)
    .single();

  const { data: instance } = await supabase
    .from('overlay_instances')
    .select('display_name')
    .eq('user_id', userId)
    .single();

  return res.json({
    username: profile?.display_name || profile?.username || 'Streamer',
    avatar: profile?.avatar_url || null,
    overlay_name: instance?.display_name || null,
  });
}
