import crypto from 'crypto';

export const BILLING_PLANS = {
  monthly: {
    label: '1 Month',
    env: 'STRIPE_PRICE_MONTHLY',
    productCode: 'streamer_premium',
  },
  quarterly: {
    label: '3 Months',
    env: 'STRIPE_PRICE_QUARTERLY',
    productCode: 'streamer_premium',
  },
  semiannual: {
    label: '6 Months',
    env: 'STRIPE_PRICE_SEMIANNUAL',
    productCode: 'streamer_premium',
  },
  annual: {
    label: '12 Months',
    env: 'STRIPE_PRICE_ANNUAL',
    productCode: 'streamer_premium',
  },
  player_monthly: {
    label: 'Player',
    env: 'STRIPE_PRICE_PLAYER_MONTHLY',
    productCode: 'player_bonus_hunt',
    monthlyPrice: '3.00',
    trialDays: 30,
  },
  player_annual: {
    label: 'Player Annual',
    env: 'STRIPE_PRICE_PLAYER_ANNUAL',
    productCode: 'player_bonus_hunt',
  },
  streamer_monthly: {
    label: 'Streamer Monthly',
    env: 'STRIPE_PRICE_STREAMER_MONTHLY',
    fallbackEnv: 'STRIPE_PRICE_MONTHLY',
    productCode: 'streamer_premium',
  },
  streamer_6_months: {
    label: 'Streamer 6 Months',
    env: 'STRIPE_PRICE_STREAMER_6_MONTHS',
    fallbackEnv: 'STRIPE_PRICE_SEMIANNUAL',
    productCode: 'streamer_premium',
  },
  streamer_annual: {
    label: 'Streamer Annual',
    env: 'STRIPE_PRICE_STREAMER_ANNUAL',
    fallbackEnv: 'STRIPE_PRICE_ANNUAL',
    productCode: 'streamer_premium',
  },
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

function isMissingTable(error) {
  if (!error) return false;
  const text = `${error.code || ''} ${error.message || ''}`.toLowerCase();
  return text.includes('42p01') || text.includes('pgrst205') || text.includes('could not find the table');
}

function planFromDatabaseRow(row) {
  if (!row) return null;
  const fallback = BILLING_PLANS[row.id] || {};
  return {
    label: row.public_title || row.title || fallback.label || row.id,
    env: fallback.env,
    fallbackEnv: fallback.fallbackEnv,
    productCode: row.product_code || fallback.productCode || 'streamer_premium',
    priceId: row.provider_price_id || null,
  };
}

function throwSupabaseError(result, message) {
  if (!result?.error) return;

  const err = new Error(`${message}: ${result.error.message}`);
  err.statusCode = 500;
  throw err;
}

export function getSiteUrl(req) {
  const configured = process.env.APP_URL || process.env.VITE_EBS_URL || process.env.PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  if (host) return `${proto}://${host}`.replace(/\/$/, '');

  return 'https://streamerscenter.com';
}

function resolveStripePriceId(plan, planId) {
  if (plan.priceId) return plan.priceId;
  const priceId = process.env[plan.env] || (plan.fallbackEnv ? process.env[plan.fallbackEnv] : null);
  if (priceId) return priceId;

  const missingEnv = [plan.env, plan.fallbackEnv].filter(Boolean).join(' or ');
  const err = new Error(`Missing Stripe price env var: ${missingEnv || `plan ${planId} provider_price_id`}`);
  err.statusCode = 500;
  throw err;
}

export async function getPlanPrice(supabase, planId, { requireActive = true } = {}) {
  const id = String(planId || '').trim();
  if (!id) {
    const err = new Error('Missing subscription plan');
    err.statusCode = 400;
    throw err;
  }

  let plan = null;
  if (supabase) {
    let query = supabase.from('subscription_plans').select('*').eq('id', id);
    if (requireActive) query = query.eq('active', true);
    const { data, error } = await query.maybeSingle();
    if (error && !isMissingTable(error)) {
      const err = new Error(`Failed to load subscription plan: ${error.message}`);
      err.statusCode = 500;
      throw err;
    }
    plan = planFromDatabaseRow(data);
  }

  plan = plan || BILLING_PLANS[id];
  if (!plan) {
    const err = new Error('Unknown subscription plan');
    err.statusCode = 400;
    throw err;
  }

  return { ...plan, id, priceId: resolveStripePriceId(plan, id) };
}

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error('Missing STRIPE_SECRET_KEY');
    err.statusCode = 500;
    throw err;
  }
  return key;
}

export async function stripeRequest(path, { method = 'POST', params } = {}) {
  const url = new URL(`https://api.stripe.com${path}`);
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
    },
  };

  if (params && method !== 'GET') {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) body.append(key, String(value));
    }
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = body;
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data?.error?.message || `Stripe API error (${response.status})`);
    err.statusCode = response.status;
    throw err;
  }

  return data;
}

export async function findOrCreateStripeCustomer(supabase, user) {
  const existingResult = await supabase
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  throwSupabaseError(existingResult, 'Failed to load billing customer');

  const { data: existing } = existingResult;
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripeRequest('/v1/customers', {
    params: {
      email: user.email || undefined,
      'metadata[supabase_user_id]': user.id,
    },
  });

  const upsertResult = await supabase
    .from('billing_customers')
    .upsert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      provider: 'stripe',
      provider_customer_id: customer.id,
      email: user.email || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  throwSupabaseError(upsertResult, 'Failed to save billing customer');

  return customer.id;
}

export async function createCheckoutSession({
  req,
  supabase,
  user,
  planId,
  successPath = '/premium',
  cancelPath = '/premium',
  trialPeriodDays = 0,
}) {
  const plan = await getPlanPrice(supabase, planId);
  const siteUrl = getSiteUrl(req);
  const customerId = await findOrCreateStripeCustomer(supabase, user);
  const productCode = plan.productCode || 'streamer_premium';
  const params = {
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    success_url: `${siteUrl}${successPath}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}${cancelPath}?canceled=true`,
    allow_promotion_codes: 'true',
    billing_address_collection: 'auto',
    'line_items[0][price]': plan.priceId,
    'line_items[0][quantity]': 1,
    'metadata[supabase_user_id]': user.id,
    'metadata[plan_id]': plan.id,
    'metadata[product_code]': productCode,
    'subscription_data[metadata][supabase_user_id]': user.id,
    'subscription_data[metadata][plan_id]': plan.id,
    'subscription_data[metadata][product_code]': productCode,
  };

  if (trialPeriodDays > 0) {
    params.payment_method_collection = 'always';
    params['subscription_data[trial_period_days]'] = trialPeriodDays;
  }

  return stripeRequest('/v1/checkout/sessions', {
    params,
  });
}

export async function createBillingPortalSession({ req, customerId, returnPath = '/premium' }) {
  const siteUrl = getSiteUrl(req);
  return stripeRequest('/v1/billing_portal/sessions', {
    params: {
      customer: customerId,
      return_url: `${siteUrl}${returnPath}`,
    },
  });
}

export async function retrieveSubscription(subscriptionId) {
  if (!subscriptionId) return null;
  return stripeRequest(`/v1/subscriptions/${subscriptionId}`, { method: 'GET' });
}

export function verifyStripeSignature(rawBody, signatureHeader, endpointSecret) {
  if (!endpointSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  if (!signatureHeader) throw new Error('Missing Stripe-Signature header');

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, ...value] = part.split('=');
      return [key, value.join('=')];
    })
  );

  const timestamp = parts.t;
  const signatures = signatureHeader
    .split(',')
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    throw new Error('Invalid Stripe signature header');
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) {
    throw new Error('Stripe signature timestamp outside tolerance');
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', endpointSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const verified = signatures.some((sig) => {
    const actualBuffer = Buffer.from(sig, 'hex');
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  });

  if (!verified) throw new Error('Stripe signature verification failed');
}

export async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length > 0) return Buffer.concat(chunks).toString('utf8');

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  return '';
}

function stripeTimestampToIso(value) {
  return value ? new Date(Number(value) * 1000).toISOString() : null;
}

function idFromStripeRef(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

async function findUserIdForCustomer(supabase, stripeCustomerId) {
  if (!stripeCustomerId) return null;

  const result = await supabase
    .from('billing_customers')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();
  throwSupabaseError(result, 'Failed to map Stripe customer');

  return result.data?.user_id || null;
}

export async function syncStripeSubscription(supabase, subscription, fallbackUserId = null) {
  if (!subscription?.id) return null;

  const stripeCustomerId = idFromStripeRef(subscription.customer);
  const item = subscription.items?.data?.[0] || {};
  const userId =
    subscription.metadata?.supabase_user_id ||
    subscription.metadata?.user_id ||
    fallbackUserId ||
    await findUserIdForCustomer(supabase, stripeCustomerId);

  if (!userId) {
    throw new Error(`Unable to map Stripe subscription ${subscription.id} to a Supabase user`);
  }

  const periodStart = stripeTimestampToIso(subscription.current_period_start || item.current_period_start);
  const periodEnd = stripeTimestampToIso(subscription.current_period_end || item.current_period_end);
  const trialStart = stripeTimestampToIso(subscription.trial_start);
  const trialEnd = stripeTimestampToIso(subscription.trial_end);
  const status = subscription.status || 'unknown';
  const planId = subscription.metadata?.plan_id || null;
  const productCode = subscription.metadata?.product_code
    || (String(planId || '').startsWith('player_') ? 'player_bonus_hunt' : 'streamer_premium');
  const isPremiumActive = ACTIVE_SUBSCRIPTION_STATUSES.has(status);

  const subscriptionResult = await supabase
    .from('billing_subscriptions')
    .upsert({
      user_id: userId,
      provider: 'stripe',
      provider_subscription_id: subscription.id,
      provider_customer_id: stripeCustomerId,
      provider_price_id: idFromStripeRef(item.price),
      stripe_subscription_id: subscription.id,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: idFromStripeRef(item.price),
      product_code: productCode,
      plan_id: planId,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      trial_start: trialStart,
      trial_end: trialEnd,
      next_billing_at: periodEnd,
      payment_status: subscription.latest_invoice?.status || null,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      canceled_at: stripeTimestampToIso(subscription.canceled_at),
      ended_at: stripeTimestampToIso(subscription.ended_at),
      metadata: subscription.metadata || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_subscription_id' });
  throwSupabaseError(subscriptionResult, 'Failed to sync billing subscription');

  if (productCode === 'player_bonus_hunt') {
    const playerResult = await supabase
      .from('user_product_subscriptions')
      .upsert({
        user_id: userId,
        product_code: productCode,
        plan_code: planId || 'player_monthly',
        provider: 'stripe',
        provider_customer_id: stripeCustomerId,
        provider_subscription_id: subscription.id,
        provider_price_id: idFromStripeRef(item.price),
        status,
        payment_status: subscription.latest_invoice?.status || null,
        trial_consumed: !!(trialStart || trialEnd || status === 'trialing'),
        trial_started_at: trialStart,
        trial_ends_at: trialEnd,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        next_billing_at: periodEnd,
        cancel_at_period_end: !!subscription.cancel_at_period_end,
        canceled_at: stripeTimestampToIso(subscription.canceled_at),
        ended_at: stripeTimestampToIso(subscription.ended_at),
        metadata: subscription.metadata || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_code' });
    throwSupabaseError(playerResult, 'Failed to sync player product subscription');
    return { userId, active: ACTIVE_SUBSCRIPTION_STATUSES.has(status), status, productCode };
  }

  const roleResult = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'premium')
    .eq('source', 'stripe')
    .eq('source_ref', subscription.id)
    .maybeSingle();
  throwSupabaseError(roleResult, 'Failed to load Stripe premium role');

  const { data: existingRole } = roleResult;
  const rolePayload = {
    user_id: userId,
    role: 'premium',
    access_expires_at: isPremiumActive ? periodEnd : new Date().toISOString(),
    is_active: isPremiumActive,
    moderator_permissions: {},
    source: 'stripe',
    source_ref: subscription.id,
    updated_at: new Date().toISOString(),
  };

  if (existingRole?.id) {
    const updateResult = await supabase.from('user_roles').update(rolePayload).eq('id', existingRole.id);
    throwSupabaseError(updateResult, 'Failed to update premium role');
  } else {
    const insertResult = await supabase.from('user_roles').insert(rolePayload);
    throwSupabaseError(insertResult, 'Failed to create premium role');
  }

  return { userId, active: isPremiumActive, status, productCode };
}
