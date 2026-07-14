import {
  createSupabaseAdmin,
  parseBody,
  requireUser,
  setCors,
} from '../api-auth.js';
import {
  PRODUCT_TYPES,
  loadPremiumContent,
  resolvePremiumAccess,
} from '../premium-data.js';

const TRIAL_DAYS = 15;

async function optionalUser(req, supabase) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function normalizeProductType(value) {
  const normalized = String(value || 'player').trim().toLowerCase();
  return PRODUCT_TYPES[normalized] ? normalized : 'player';
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function recordInternalEvent(supabase, eventId, userId, eventType, payload) {
  const { error } = await supabase
    .from('subscription_events')
    .upsert({
      user_id: userId,
      product_code: payload.product_code || null,
      provider: 'internal',
      provider_event_id: eventId,
      event_type: eventType,
      payload,
      processed_at: new Date().toISOString(),
    }, { onConflict: 'provider,provider_event_id' });
  if (error && error.code !== '42P01') throw error;
}

async function handlePage(req, res, supabase) {
  const user = await optionalUser(req, supabase);
  const content = await loadPremiumContent(supabase);
  const access = user ? await resolvePremiumAccess(supabase, user.id) : null;
  return res.status(200).json({
    ...content,
    access,
    authenticated: !!user,
    trialDays: TRIAL_DAYS,
  });
}

async function handleStatus(req, res, supabase) {
  const user = await requireUser(req, supabase);
  const access = await resolvePremiumAccess(supabase, user.id);
  return res.status(200).json({ access });
}

async function handleStartTrial(req, res, supabase) {
  const user = await requireUser(req, supabase);
  const body = parseBody(req);
  const selectedProductType = normalizeProductType(body.productType || body.selectedProductType);
  const selectedProduct = PRODUCT_TYPES[selectedProductType];
  const accessBefore = await resolvePremiumAccess(supabase, user.id);

  if (accessBefore.level === 'player_paid' || accessBefore.level === 'streamer_paid') {
    const err = new Error('You already have paid access. No trial is needed.');
    err.statusCode = 409;
    err.code = 'paid_access_exists';
    throw err;
  }

  const { data: existing, error: existingError } = await supabase
    .from('user_trials')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const err = new Error('Your free trial was already used on this account.');
    err.statusCode = 409;
    err.code = existing.status === 'active' ? 'trial_already_active' : 'trial_already_used';
    err.trial = existing;
    throw err;
  }

  const startedAt = new Date();
  const expiresAt = addDays(startedAt, TRIAL_DAYS);
  const { data: trial, error } = await supabase
    .from('user_trials')
    .insert({
      user_id: user.id,
      selected_product_type: selectedProductType,
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'active',
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') {
      const err = new Error('Your free trial was already used on this account.');
      err.statusCode = 409;
      err.code = 'trial_already_used';
      throw err;
    }
    throw error;
  }

  await recordInternalEvent(supabase, `trial-started-${user.id}`, user.id, 'trial.started', {
    product_type: selectedProductType,
    product_code: selectedProduct.productCode,
    started_at: trial.started_at,
    expires_at: trial.expires_at,
  });

  const access = await resolvePremiumAccess(supabase, user.id);
  return res.status(200).json({ trial, access });
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
    if (req.method === 'POST' && action === 'start_trial') return handleStartTrial(req, res, supabase);
    return res.status(404).json({ error: 'Unknown premium action' });
  } catch (err) {
    console.error('[premium]', err);
    return errorResponse(res, err);
  }
}