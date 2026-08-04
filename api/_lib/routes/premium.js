import {
  createSupabaseAdmin,
  parseBody,
  requireUser,
  setCors,
} from '../api-auth.js';
import {
  loadPremiumContent,
  resolvePremiumAccess,
} from '../premium-data.js';

const STRIPE_TRIAL_DAYS = 7;

async function optionalUser(req, supabase) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function handlePage(req, res, supabase) {
  const user = await optionalUser(req, supabase);
  const content = await loadPremiumContent(supabase);
  const access = user ? await resolvePremiumAccess(supabase, user.id) : null;
  return res.status(200).json({
    ...content,
    access,
    authenticated: !!user,
    trialDays: STRIPE_TRIAL_DAYS,
    trialRequiresPaymentMethod: true,
  });
}

async function handleStatus(req, res, supabase) {
  const user = await requireUser(req, supabase);
  const access = await resolvePremiumAccess(supabase, user.id);
  return res.status(200).json({ access });
}

function errorResponse(res, err) {
  return res.status(err.statusCode || 500).json({
    error: err.message || 'Premium request failed',
    code: err.code || null,
    trial: err.trial || null,
  });
}

export default async function handler(req, res) {
  setCors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createSupabaseAdmin();
    const body = req.method === 'POST' ? parseBody(req) : {};
    const action = req.query.action || body.action || (req.method === 'GET' ? 'page' : '');

    if (req.method === 'GET' && action === 'page') return handlePage(req, res, supabase);
    if (req.method === 'GET' && action === 'status') return handleStatus(req, res, supabase);
    if (req.method === 'POST' && action === 'start_trial') {
      return res.status(410).json({
        error: 'No-card trials have been retired. Start a monthly Stripe Checkout trial instead.',
        code: 'internal_trial_retired',
      });
    }
    return res.status(404).json({ error: 'Unknown premium action' });
  } catch (err) {
    console.error('[premium]', err);
    return errorResponse(res, err);
  }
}