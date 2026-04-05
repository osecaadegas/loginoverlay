/**
 * /api/affiliate-stats — Vercel Serverless Function
 *
 * Proxies affiliate partner report API to avoid exposing the statistic token.
 * Admin-only: verifies user JWT + admin role via Supabase.
 *
 * GET /api/affiliate-stats?from=2026-01-01&to=2026-02-01&group_by=day,brand
 */
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const AFFILIATE_API_BASE = process.env.AFFILIATE_API_BASE; // e.g. https://admin.famouspartners.com
const AFFILIATE_API_TOKEN = process.env.AFFILIATE_API_TOKEN;

async function verifyAdmin(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization header' };
  }
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { authorized: false, error: 'Invalid token' };

  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const roleNames = (userRoles || []).map(r => r.role);
  const hasAdmin = roleNames.some(r =>
    ['admin', 'superadmin', 'super_admin', 'owner'].includes(r.toLowerCase())
  );
  if (!hasAdmin) return { authorized: false, error: 'Not authorized' };
  return { authorized: true, user };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const adminCheck = await verifyAdmin(req.headers.authorization);
  if (!adminCheck.authorized) return res.status(403).json({ error: adminCheck.error });

  // Validate config
  if (!AFFILIATE_API_BASE || !AFFILIATE_API_TOKEN) {
    return res.status(500).json({ error: 'Affiliate API not configured. Set AFFILIATE_API_BASE and AFFILIATE_API_TOKEN env vars.' });
  }

  // Build query
  const { from, to, group_by, columns } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Missing required params: from, to' });

  const params = new URLSearchParams();
  params.append('async', 'false');
  params.append('from', from);
  params.append('to', to);

  // Default columns if none specified
  const cols = columns
    ? (Array.isArray(columns) ? columns : columns.split(','))
    : ['ngr', 'deposits_sum', 'deposits_count', 'first_deposits_count', 'first_deposits_sum',
       'registrations_count', 'visits_count', 'casino_active_players_count', 'ggr', 'clean_net_revenue',
       'cashouts_sum', 'cashouts_count'];
  for (const c of cols) params.append('columns[]', c);

  // Default group_by if none specified
  const groups = group_by
    ? (Array.isArray(group_by) ? group_by : group_by.split(','))
    : ['day', 'brand'];
  for (const g of groups) params.append('group_by[]', g);

  try {
    const url = `${AFFILIATE_API_BASE}/api/customer/v1/partner/report?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': AFFILIATE_API_TOKEN,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[affiliate-stats] API error:', response.status, text);
      return res.status(response.status).json({ error: `Affiliate API error: ${response.status}`, details: text });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[affiliate-stats] Fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch affiliate stats', details: err.message });
  }
}
