import {
  createSupabaseAdmin,
  parseBody,
  requireUser,
  setCors,
} from './_lib/api-auth.js';
import {
  countActiveSubscribersForPlan,
  loadPremiumContent,
  userHasAdminAccess,
} from './_lib/premium-data.js';

const PRODUCT_FIELDS = ['public_title', 'description', 'icon', 'sort_order', 'active'];
const PLAN_FIELDS = [
  'internal_name', 'public_title', 'description', 'product_type_code', 'product_code', 'price_cents',
  'currency', 'billing_interval', 'interval_count', 'badge', 'savings_label', 'monthly_equivalent_cents',
  'inclusion_text', 'recommended', 'sort_order', 'active', 'provider_product_id', 'provider_price_id',
];
const FEATURE_FIELDS = ['title', 'description', 'icon', 'player_available', 'streamer_available', 'sort_order', 'active'];

function pickFields(input = {}, allowed = []) {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => allowed.includes(key)),
  );
}

function requirePositiveCents(value) {
  const cents = Number(value);
  if (!Number.isInteger(cents) || cents <= 0) {
    const err = new Error('Price must be a positive integer number of cents.');
    err.statusCode = 400;
    throw err;
  }
  return cents;
}

async function requireAdmin(req, supabase) {
  const user = await requireUser(req, supabase);
  if (!await userHasAdminAccess(supabase, user.id)) {
    const err = new Error('Administrator access required');
    err.statusCode = 403;
    throw err;
  }
  return user;
}

async function withSubscriberCounts(supabase, payload) {
  const plans = await Promise.all((payload.plans || []).map(async (plan) => ({
    ...plan,
    providerPriceMatches: !plan.providerPriceId || plan.providerPriceId === plan.id,
    providerPriceEditable: false,
    providerPriceMode: 'mollie_amount_per_subscription',
    activeSubscriberCount: await countActiveSubscribersForPlan(supabase, plan),
    affectsNewSubscribersOnly: true,
  })));
  return { ...payload, plans };
}

async function handleGet(res, supabase) {
  const payload = await loadPremiumContent(supabase, { includeInactive: true });
  return res.status(200).json(await withSubscriberCounts(supabase, payload));
}

async function handleProductUpdate(req, res, supabase) {
  const body = parseBody(req);
  const values = pickFields(body.values, PRODUCT_FIELDS);
  const code = String(body.id || body.code || '').trim();
  if (!code) return res.status(400).json({ error: 'Missing product type code' });
  const { data, error } = await supabase
    .from('subscription_product_types')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('code', code)
    .select('*')
    .single();
  if (error) throw error;
  return res.status(200).json({ productType: data });
}

async function handleFeatureUpdate(req, res, supabase) {
  const body = parseBody(req);
  const values = pickFields(body.values, FEATURE_FIELDS);
  const id = String(body.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing feature id' });
  const { data, error } = await supabase
    .from('subscription_features')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return res.status(200).json({ feature: data });
}

async function handleContentUpdate(req, res, supabase) {
  const body = parseBody(req);
  const id = String(body.id || 'premium_main').trim();
  const content = body.values?.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return res.status(400).json({ error: 'Page content must be an object' });
  }
  const { data, error } = await supabase
    .from('subscription_page_content')
    .update({
      title: body.values?.title || 'Premium page content',
      content,
      active: body.values?.active !== false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return res.status(200).json({ content: data });
}

async function handlePlanUpdate(req, res, supabase, user) {
  const body = parseBody(req);
  const id = String(body.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing plan id' });

  const { data: existing, error: loadError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', id)
    .single();
  if (loadError) throw loadError;

  const values = pickFields(body.values, PLAN_FIELDS);
  if ('price_cents' in values) values.price_cents = requirePositiveCents(values.price_cents);
  if ('monthly_equivalent_cents' in values && values.monthly_equivalent_cents !== null && values.monthly_equivalent_cents !== '') {
    values.monthly_equivalent_cents = requirePositiveCents(values.monthly_equivalent_cents);
  }

  const priceChanged = 'price_cents' in values && Number(values.price_cents) !== Number(existing.price_cents);
  const activeSubscriberCount = await countActiveSubscribersForPlan(supabase, existing);
  if (priceChanged && !body.confirmedPriceChange) {
    return res.status(409).json({
      error: 'Price change requires confirmation.',
      code: 'price_change_confirmation_required',
      currentWebsitePriceCents: existing.price_cents,
      newWebsitePriceCents: values.price_cents,
      providerPriceId: existing.provider_price_id || null,
      providerAllowsModification: false,
      providerPriceChangeRequired: false,
      activeSubscriberCount,
      affectsNewSubscribersOnly: true,
      note: 'Mollie subscriptions store the amount on each subscription. This change affects new checkout sessions only.',
    });
  }

  const { data, error } = await supabase
    .from('subscription_plans')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  if (priceChanged) {
    const { error: auditError } = await supabase
      .from('subscription_plan_price_changes')
      .insert({
        plan_id: id,
        changed_by: user.id,
        old_price_cents: existing.price_cents,
        new_price_cents: values.price_cents,
        old_provider_price_id: existing.provider_price_id || null,
        new_provider_price_id: values.provider_price_id || existing.provider_price_id || null,
        provider: existing.provider || 'mollie',
        provider_price_change_required: false,
        active_subscriber_count: activeSubscriberCount,
        affects_new_subscribers_only: true,
        old_payload: existing,
        new_payload: data,
      });
    if (auditError) throw auditError;
  }

  return res.status(200).json({ plan: data, activeSubscriberCount });
}

export default async function handler(req, res) {
  setCors(res, 'GET, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createSupabaseAdmin();
    const user = await requireAdmin(req, supabase);

    if (req.method === 'GET') return handleGet(res, supabase);
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'GET or PATCH only' });

    const body = parseBody(req);
    if (body.entity === 'product_type') return handleProductUpdate(req, res, supabase);
    if (body.entity === 'plan') return handlePlanUpdate(req, res, supabase, user);
    if (body.entity === 'feature') return handleFeatureUpdate(req, res, supabase);
    if (body.entity === 'page_content') return handleContentUpdate(req, res, supabase);
    return res.status(400).json({ error: 'Unknown subscription admin entity' });
  } catch (err) {
    console.error('[admin-subscriptions]', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Subscription admin request failed' });
  }
}