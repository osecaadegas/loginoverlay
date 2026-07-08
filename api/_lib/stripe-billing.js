import crypto from 'crypto';

export const BILLING_PLANS = {
  monthly: {
    label: '1 Month',
    env: 'STRIPE_PRICE_MONTHLY',
  },
  quarterly: {
    label: '3 Months',
    env: 'STRIPE_PRICE_QUARTERLY',
  },
  semiannual: {
    label: '6 Months',
    env: 'STRIPE_PRICE_SEMIANNUAL',
  },
  annual: {
    label: '12 Months',
    env: 'STRIPE_PRICE_ANNUAL',
  },
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

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

export function getPlanPrice(planId) {
  const plan = BILLING_PLANS[planId];
  if (!plan) {
    const err = new Error('Unknown subscription plan');
    err.statusCode = 400;
    throw err;
  }

  const priceId = process.env[plan.env];
  if (!priceId) {
    const err = new Error(`Missing Stripe price env var: ${plan.env}`);
    err.statusCode = 500;
    throw err;
  }

  return { ...plan, id: planId, priceId };
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
      email: user.email || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  throwSupabaseError(upsertResult, 'Failed to save billing customer');

  return customer.id;
}

export async function createCheckoutSession({ req, supabase, user, planId }) {
  const plan = getPlanPrice(planId);
  const siteUrl = getSiteUrl(req);
  const customerId = await findOrCreateStripeCustomer(supabase, user);

  return stripeRequest('/v1/checkout/sessions', {
    params: {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      success_url: `${siteUrl}/premium?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/premium?canceled=true`,
      allow_promotion_codes: 'true',
      billing_address_collection: 'auto',
      'line_items[0][price]': plan.priceId,
      'line_items[0][quantity]': 1,
      'metadata[supabase_user_id]': user.id,
      'metadata[plan_id]': plan.id,
      'subscription_data[metadata][supabase_user_id]': user.id,
      'subscription_data[metadata][plan_id]': plan.id,
    },
  });
}

export async function createBillingPortalSession({ req, customerId }) {
  const siteUrl = getSiteUrl(req);
  return stripeRequest('/v1/billing_portal/sessions', {
    params: {
      customer: customerId,
      return_url: `${siteUrl}/premium`,
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
  const status = subscription.status || 'unknown';
  const isPremiumActive = ACTIVE_SUBSCRIPTION_STATUSES.has(status);

  const subscriptionResult = await supabase
    .from('billing_subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: idFromStripeRef(item.price),
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      canceled_at: stripeTimestampToIso(subscription.canceled_at),
      ended_at: stripeTimestampToIso(subscription.ended_at),
      metadata: subscription.metadata || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_subscription_id' });
  throwSupabaseError(subscriptionResult, 'Failed to sync billing subscription');

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

  return { userId, active: isPremiumActive, status };
}
