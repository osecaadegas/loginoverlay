import { createClient } from '@supabase/supabase-js';
import { createCheckoutSession } from './_lib/stripe-billing.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return req.body;
}

function createSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    const err = new Error('Supabase service role is not configured');
    err.statusCode = 500;
    throw err;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

async function requireUser(req, supabase) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error('Invalid or expired session');
    err.statusCode = 401;
    throw err;
  }

  return data.user;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const supabase = createSupabaseAdmin();
    const user = await requireUser(req, supabase);
    const { planId } = parseBody(req);

    const session = await createCheckoutSession({ req, supabase, user, planId });
    return res.status(200).json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('[create-checkout-session]', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Unable to create checkout session' });
  }
}
