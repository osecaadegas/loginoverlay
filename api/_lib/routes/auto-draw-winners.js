import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export function hasValidCronAuthorization(header, secret) {
  if (typeof secret !== 'string' || !secret.trim() || typeof header !== 'string') return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Vercel Cron sends GET with Authorization: Bearer <CRON_SECRET>. A manual
// POST uses the same credential; neither method is a public draw endpoint.
export default async function handler(req, res, { createClientImpl = createClient } = {}) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) return res.status(503).json({ error: 'Giveaway automation is not configured' });
  if (!hasValidCronAuthorization(req.headers?.authorization, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Giveaway database is not configured' });
  }

  try {
    const client = createClientImpl(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // One database transaction locks each expired giveaway, draws distinct
    // ticket-weighted winners, and marks it complete. A retry skips completed
    // giveaways. The RPC safely reports when the retired legacy schema is absent.
    const { data, error } = await client.rpc('draw_expired_giveaways');
    if (error) {
      console.error('[auto-draw-winners] Database draw failed:', error.code);
      return res.status(error.code === 'PGRST202' ? 503 : 500).json({
        error: error.code === 'PGRST202' ? 'Giveaway draw migration is pending' : 'Giveaway draw failed',
      });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error('[auto-draw-winners] Unexpected draw failure:', error?.name || 'Error');
    return res.status(500).json({ error: 'Giveaway draw failed' });
  }
}
