export const PRODUCT_TYPES = {
  player: {
    code: 'player',
    productCode: 'player_bonus_hunt',
    title: 'Player',
  },
  streamer: {
    code: 'streamer',
    productCode: 'streamer_premium',
    title: 'Streamer',
  },
};

export const PRODUCT_TYPE_BY_PRODUCT_CODE = {
  player_bonus_hunt: 'player',
  streamer_premium: 'streamer',
};

export const LEGACY_MOLLIE_PLANS = {
  monthly: {
    id: 'monthly',
    label: '1 Month',
    amount: '15.00',
    amountEnv: 'MOLLIE_AMOUNT_MONTHLY',
    interval: '1 month',
    intervalMonths: 1,
    productCode: 'streamer_premium',
    productType: 'streamer',
    public: false,
  },
  quarterly: {
    id: 'quarterly',
    label: '3 Months',
    amount: '40.00',
    amountEnv: 'MOLLIE_AMOUNT_QUARTERLY',
    interval: '3 months',
    intervalMonths: 3,
    productCode: 'streamer_premium',
    productType: 'streamer',
    public: false,
  },
  semiannual: {
    id: 'semiannual',
    label: '6 Months',
    amount: '60.00',
    amountEnv: 'MOLLIE_AMOUNT_SEMIANNUAL',
    interval: '6 months',
    intervalMonths: 6,
    productCode: 'streamer_premium',
    productType: 'streamer',
    public: false,
  },
  annual: {
    id: 'annual',
    label: '12 Months',
    amount: '120.00',
    amountEnv: 'MOLLIE_AMOUNT_ANNUAL',
    interval: '12 months',
    intervalMonths: 12,
    productCode: 'streamer_premium',
    productType: 'streamer',
    public: false,
  },
  player_monthly: {
    id: 'player_monthly',
    label: 'Player Monthly',
    amount: '3.00',
    amountEnv: 'MOLLIE_AMOUNT_PLAYER_MONTHLY',
    interval: '1 month',
    intervalMonths: 1,
    productCode: 'player_bonus_hunt',
    productType: 'player',
    monthlyPrice: '3.00',
    public: true,
  },
};

const ACTIVE_PAID_STATUSES = new Set(['active', 'trialing']);
const PAST_DUE_STATUSES = new Set(['past_due', 'unpaid', 'payment_pending', 'incomplete']);
const ACCESS_ROLE_NAMES = ['admin', 'superadmin', 'moderator', 'slot_modder', 'premium', 'affiliate'];

function isMissingTable(error) {
  if (!error) return false;
  const text = `${error.code || ''} ${error.message || ''}`.toLowerCase();
  return text.includes('42p01') || text.includes('pgrst205') || text.includes('could not find the table');
}

function centsToAmount(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function intervalMonths(row = {}) {
  const count = Number(row.interval_count || row.intervalCount || 1);
  return row.billing_interval === 'year' ? count * 12 : count;
}

function mollieInterval(row = {}) {
  const months = intervalMonths(row);
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

function normalizePlanRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    internalName: row.internal_name || row.id,
    title: row.public_title || row.title || row.label,
    description: row.description || '',
    productType: row.product_type_code || row.productType || PRODUCT_TYPE_BY_PRODUCT_CODE[row.product_code] || 'streamer',
    productCode: row.product_code || row.productCode || 'streamer_premium',
    priceCents: Number(row.price_cents ?? Math.round(Number(row.amount || 0) * 100)),
    currency: row.currency || 'EUR',
    billingInterval: row.billing_interval || (Number(row.intervalMonths || 1) >= 12 ? 'year' : 'month'),
    intervalCount: Number(row.interval_count || row.intervalCount || 1),
    intervalMonths: intervalMonths(row),
    badge: row.badge || null,
    savingsLabel: row.savings_label || null,
    monthlyEquivalentCents: row.monthly_equivalent_cents || null,
    inclusionText: row.inclusion_text || '',
    recommended: !!row.recommended,
    sortOrder: Number(row.sort_order || 0),
    active: row.active !== false,
    provider: row.provider || 'mollie',
    providerProductId: row.provider_product_id || null,
    providerPriceId: row.provider_price_id || null,
    metadata: row.metadata || {},
  };
}

function legacyPlanToRow(planId, plan) {
  const amount = Number(process.env[plan.amountEnv] || plan.amount);
  return normalizePlanRow({
    id: planId,
    internal_name: planId,
    public_title: plan.label,
    product_type_code: plan.productType,
    product_code: plan.productCode,
    price_cents: Math.round(amount * 100),
    currency: 'EUR',
    billing_interval: plan.intervalMonths >= 12 ? 'year' : 'month',
    interval_count: plan.intervalMonths >= 12 ? plan.intervalMonths / 12 : plan.intervalMonths,
    monthly_equivalent_cents: plan.intervalMonths ? Math.round((amount * 100) / plan.intervalMonths) : Math.round(amount * 100),
    inclusion_text: plan.productCode === 'player_bonus_hunt' ? 'Includes all Player features' : 'Includes all Streamer features',
    active: !!plan.public,
    provider: 'mollie',
  });
}

export function planToBillingPlan(plan) {
  const row = normalizePlanRow(plan);
  if (!row) return null;
  return {
    id: row.id,
    label: row.title,
    amount: centsToAmount(row.priceCents),
    currency: row.currency,
    interval: mollieInterval({ billing_interval: row.billingInterval, interval_count: row.intervalCount }),
    intervalMonths: row.intervalMonths,
    productCode: row.productCode,
    productType: row.productType,
    priceCents: row.priceCents,
    providerPriceId: row.providerPriceId,
  };
}

export async function loadBillingPlan(supabase, planId, { requireActive = true } = {}) {
  const id = String(planId || '').trim();
  if (!id) {
    const err = new Error('Missing subscription plan');
    err.statusCode = 400;
    throw err;
  }

  if (supabase) {
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', id);
    if (requireActive) query = query.eq('active', true);
    const { data, error } = await query.maybeSingle();
    if (error && !isMissingTable(error)) {
      const err = new Error(`Failed to load subscription plan: ${error.message}`);
      err.statusCode = 500;
      throw err;
    }
    if (data) return planToBillingPlan(data);
  }

  const legacy = LEGACY_MOLLIE_PLANS[id];
  if (legacy) return planToBillingPlan(legacyPlanToRow(id, legacy));

  const err = new Error('Unknown subscription plan');
  err.statusCode = 400;
  throw err;
}

export async function loadPremiumContent(supabase, { includeInactive = false } = {}) {
  let contentQuery = supabase
    .from('subscription_page_content')
    .select('*')
    .eq('scope', 'premium');
  if (!includeInactive) contentQuery = contentQuery.eq('active', true);
  contentQuery = contentQuery
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const [productResult, planResult, featureResult, contentResult] = await Promise.all([
    supabase.from('subscription_product_types').select('*').order('sort_order', { ascending: true }),
    supabase.from('subscription_plans').select('*').order('sort_order', { ascending: true }),
    supabase.from('subscription_features').select('*').order('sort_order', { ascending: true }),
    contentQuery,
  ]);

  const results = [productResult, planResult, featureResult, contentResult];
  const missing = results.some((result) => isMissingTable(result.error));
  if (missing) {
    const err = new Error('Subscription content tables are not available. Run migration 024_subscription_products_trials_admin.sql.');
    err.statusCode = 503;
    throw err;
  }
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    const err = new Error(firstError.message || 'Failed to load subscription content');
    err.statusCode = 500;
    throw err;
  }

  const productTypes = (productResult.data || [])
    .filter((item) => includeInactive || item.active)
    .map((item) => ({
      code: item.code,
      productCode: item.entitlement_product_code,
      title: item.public_title,
      description: item.description || '',
      icon: item.icon,
      sortOrder: item.sort_order || 0,
      active: item.active,
    }));

  const plans = (planResult.data || [])
    .filter((item) => includeInactive || item.active)
    .map(normalizePlanRow);

  const features = (featureResult.data || [])
    .filter((item) => includeInactive || item.active)
    .map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      description: item.description || '',
      icon: item.icon,
      playerAvailable: !!item.player_available,
      streamerAvailable: !!item.streamer_available,
      sortOrder: item.sort_order || 0,
      active: item.active,
    }));

  return {
    productTypes,
    plans,
    features,
    content: contentResult.data?.content || {},
    contentRecord: contentResult.data || null,
  };
}

function isCurrentPaid(row, now = new Date()) {
  if (!row || !ACTIVE_PAID_STATUSES.has(row.status)) return false;
  const end = row.current_period_end ? new Date(row.current_period_end) : null;
  return !end || end > now;
}

function normalizeSubscription(row, productType) {
  if (!row) return null;
  return {
    id: row.id,
    productType,
    productCode: row.product_code,
    planId: row.plan_id || row.plan_code || row.provider_price_id || null,
    status: row.status,
    paymentStatus: row.payment_status || null,
    currentPeriodStart: row.current_period_start || null,
    currentPeriodEnd: row.current_period_end || null,
    nextBillingAt: row.next_billing_at || null,
    cancelAtPeriodEnd: !!row.cancel_at_period_end,
    canceledAt: row.canceled_at || null,
    endedAt: row.ended_at || null,
    provider: row.provider || 'mollie',
    providerSubscriptionId: row.provider_subscription_id || null,
  };
}

export async function userHasAdminAccess(supabase, userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'superadmin'])
    .eq('is_active', true)
    .limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

export async function resolvePremiumAccess(supabase, userId) {
  if (!userId) {
    return {
      level: 'none',
      hasPlayerAccess: false,
      hasStreamerAccess: false,
      trial: null,
      subscriptions: [],
    };
  }

  const [trialResult, playerResult, streamerResult, roleResult] = await Promise.all([
    supabase.from('user_trials').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_product_subscriptions').select('*').eq('user_id', userId).eq('product_code', PRODUCT_TYPES.player.productCode).maybeSingle(),
    supabase.from('billing_subscriptions').select('*').eq('user_id', userId).eq('product_code', PRODUCT_TYPES.streamer.productCode).order('current_period_end', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('user_roles').select('*').eq('user_id', userId).in('role', ACCESS_ROLE_NAMES).eq('is_active', true),
  ]);

  const firstError = [trialResult, playerResult, streamerResult, roleResult]
    .find((result) => result.error && !isMissingTable(result.error))?.error;
  if (firstError) throw firstError;

  const now = new Date();
  let trial = trialResult.data || null;
  if (trial?.status === 'active' && new Date(trial.expires_at) <= now) {
    await supabase
      .from('user_trials')
      .update({ status: 'expired', updated_at: now.toISOString() })
      .eq('id', trial.id)
      .eq('status', 'active');
    trial = { ...trial, status: 'expired' };
  }

  const playerSubscription = normalizeSubscription(playerResult.data, 'player');
  const streamerSubscription = normalizeSubscription(streamerResult.data, 'streamer');
  const activeRoles = (roleResult.data || []).filter((row) => {
    const expires = row.access_expires_at ? new Date(row.access_expires_at) : null;
    return !expires || expires > now;
  });
  const activeRoleNames = [...new Set(activeRoles.map((row) => row.role).filter(Boolean))];
  const rolePremium = activeRoleNames.some((role) => ['premium', 'admin', 'superadmin'].includes(role));

  const playerPaid = isCurrentPaid(playerResult.data, now);
  const streamerPaid = isCurrentPaid(streamerResult.data, now) || rolePremium;
  const activeTrial = trial?.status === 'active' && new Date(trial.expires_at) > now ? trial : null;
  const hasPastDue = [playerResult.data, streamerResult.data].some((row) => row && PAST_DUE_STATUSES.has(row.status));
  const hasExpired = !!trial || [playerResult.data, streamerResult.data].some((row) => row?.status === 'expired' || row?.ended_at);
  const fallbackSubscription = streamerSubscription || playerSubscription;

  let level = 'none';
  if (streamerPaid) level = 'streamer_paid';
  else if (playerPaid) level = 'player_paid';
  else if (activeTrial?.selected_product_type === 'streamer') level = 'streamer_trial';
  else if (activeTrial?.selected_product_type === 'player') level = 'player_trial';
  else if (hasPastDue) level = 'past_due';
  else if (hasExpired) level = 'expired';

  const hasStreamerAccess = level === 'streamer_paid' || level === 'streamer_trial';
  const hasPlayerAccess = hasStreamerAccess || level === 'player_paid' || level === 'player_trial';

  return {
    level,
    hasPlayerAccess,
    hasStreamerAccess,
    trial,
    activeTrial,
    subscriptions: [playerSubscription, streamerSubscription].filter(Boolean),
    currentSubscription: streamerPaid ? streamerSubscription : playerPaid ? playerSubscription : fallbackSubscription,
    paidProductType: streamerPaid ? 'streamer' : playerPaid ? 'player' : null,
    pastDue: hasPastDue,
    roles: activeRoles,
    roleNames: activeRoleNames,
  };
}

export async function countActiveSubscribersForPlan(supabase, plan) {
  const normalized = normalizePlanRow(plan);
  const activeStatuses = ['active', 'trialing'];
  const table = normalized.productType === 'player' ? 'user_product_subscriptions' : 'billing_subscriptions';
  const planColumn = normalized.productType === 'player' ? 'plan_code' : 'plan_id';
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(planColumn, normalized.id)
    .in('status', activeStatuses);
  if (error && !isMissingTable(error)) throw error;
  return count || 0;
}