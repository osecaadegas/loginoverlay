import { LEGACY_MOLLIE_PLANS, loadBillingPlan } from './premium-data.js';

export const BILLING_PROVIDER = 'mollie';

export const BILLING_PLANS = LEGACY_MOLLIE_PLANS;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
const MOLLIE_API_BASE = 'https://api.mollie.com/v2';

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

function normalizeAmount(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    const err = new Error(`Invalid Mollie amount for ${label}`);
    err.statusCode = 500;
    throw err;
  }
  return numeric.toFixed(2);
}

export async function getPlanPrice(supabase, planId, options = {}) {
  const plan = await loadBillingPlan(supabase, planId, options);
  const amount = normalizeAmount(plan.amount, planId);
  return { ...plan, amount };
}

function planWithMetadataPrice(plan, metadata = {}) {
  const priceCents = Number(metadata.price_cents || metadata.priceCents || 0);
  if (!Number.isFinite(priceCents) || priceCents <= 0) return plan;
  return {
    ...plan,
    amount: normalizeAmount(priceCents / 100, plan.id),
    priceCents,
    currency: metadata.currency || plan.currency,
  };
}

function mollieApiKey() {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) {
    const err = new Error('Missing MOLLIE_API_KEY');
    err.statusCode = 500;
    throw err;
  }
  return key;
}

function mollieWebhookUrl(req) {
  const configured = process.env.MOLLIE_WEBHOOK_URL;
  const url = new URL(configured || `${getSiteUrl(req)}/api/mollie-webhook`);
  if (process.env.MOLLIE_WEBHOOK_SECRET) {
    url.searchParams.set('secret', process.env.MOLLIE_WEBHOOK_SECRET);
  }
  return url.toString();
}

export async function mollieRequest(path, { method = 'GET', body, idempotencyKey } = {}) {
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${mollieApiKey()}`,
      Accept: 'application/json',
    },
  };

  if (idempotencyKey) options.headers['Idempotency-Key'] = idempotencyKey;
  if (body && method !== 'GET') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${MOLLIE_API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data?.detail || data?.title || `Mollie API error (${response.status})`);
    err.statusCode = response.status;
    err.payload = data;
    throw err;
  }

  return data;
}

export async function findOrCreateMollieCustomer(supabase, user) {
  const existingResult = await supabase
    .from('billing_customers')
    .select('provider,provider_customer_id,mollie_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  throwSupabaseError(existingResult, 'Failed to load billing customer');

  const { data: existing } = existingResult;
  const existingCustomerId = existing?.mollie_customer_id || (existing?.provider === BILLING_PROVIDER ? existing.provider_customer_id : null);
  if (existingCustomerId) return existingCustomerId;

  const customer = await mollieRequest('/customers', {
    method: 'POST',
    body: {
      name: user.user_metadata?.full_name || user.email || user.id,
      email: user.email || undefined,
      metadata: { supabase_user_id: user.id },
    },
    idempotencyKey: `customer-${user.id}`,
  });

  const upsertResult = await supabase
    .from('billing_customers')
    .upsert({
      user_id: user.id,
      provider: BILLING_PROVIDER,
      provider_customer_id: customer.id,
      mollie_customer_id: customer.id,
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
}) {
  const plan = await getPlanPrice(supabase, planId);
  const siteUrl = getSiteUrl(req);
  const customerId = await findOrCreateMollieCustomer(supabase, user);
  const productCode = plan.productCode || 'streamer_premium';
  const metadata = {
    supabase_user_id: user.id,
    user_id: user.id,
    plan_id: plan.id,
    product_code: productCode,
    product_type: plan.productType || null,
    price_cents: plan.priceCents || null,
    currency: plan.currency,
    provider_price_id: plan.providerPriceId || null,
    interval: plan.interval,
    interval_months: plan.intervalMonths,
  };

  const payment = await mollieRequest('/payments', {
    method: 'POST',
    idempotencyKey: `checkout-${user.id}-${plan.id}-${new Date().toISOString().slice(0, 16)}`,
    body: {
      amount: { currency: plan.currency, value: plan.amount },
      description: `StreamersCenter ${plan.label}`,
      redirectUrl: `${siteUrl}${successPath}?success=true`,
      cancelUrl: `${siteUrl}${cancelPath}?canceled=true`,
      webhookUrl: mollieWebhookUrl(req),
      customerId,
      sequenceType: 'first',
      metadata,
    },
  });

  if (!payment._links?.checkout?.href) {
    const err = new Error('Mollie did not return a checkout URL');
    err.statusCode = 502;
    throw err;
  }

  return {
    id: payment.id,
    url: payment._links?.checkout?.href,
    payment,
  };
}

export async function createBillingPortalSession({ customerId } = {}) {
  const supportUrl = process.env.BILLING_SUPPORT_URL || process.env.MOLLIE_SUPPORT_URL || null;
  return {
    id: customerId || null,
    url: supportUrl,
    message: supportUrl
      ? 'Open support to update or cancel your Mollie subscription.'
      : 'Mollie does not provide a hosted customer billing portal. Contact support to update payment details or cancel your subscription.',
  };
}

export async function retrievePayment(paymentId) {
  if (!paymentId) return null;
  return mollieRequest(`/payments/${paymentId}`);
}

export async function retrieveSubscription(customerId, subscriptionId) {
  if (!customerId || !subscriptionId) return null;
  return mollieRequest(`/customers/${customerId}/subscriptions/${subscriptionId}`);
}

async function createMollieSubscription({ req, customerId, plan, metadata, startDate }) {
  return mollieRequest(`/customers/${customerId}/subscriptions`, {
    method: 'POST',
    idempotencyKey: `subscription-${customerId}-${metadata.product_code}-${metadata.plan_id}-${metadata.initial_payment_id || ''}`,
    body: {
      amount: { currency: plan.currency, value: plan.amount },
      interval: plan.interval,
      startDate,
      description: `StreamersCenter ${plan.label} ${String(metadata.supabase_user_id || '').slice(0, 8)}`,
      webhookUrl: mollieWebhookUrl(req),
      metadata,
    },
  });
}

function addMonths(date, months) {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + Number(months || 1));
  if (next.getUTCDate() !== day) next.setUTCDate(0);
  return next;
}

function isoDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function isoAtStartOfDay(dateOnly) {
  return dateOnly ? `${dateOnly}T00:00:00.000Z` : null;
}

function paymentStatusToSubscriptionStatus(payment, subscription) {
  if (subscription?.status === 'canceled') return 'canceled';
  if (subscription?.status === 'suspended') return 'past_due';
  if (subscription?.status === 'completed') return 'expired';
  if (payment?.status === 'paid') return 'active';
  if (payment?.status === 'failed' || payment?.status === 'expired' || payment?.status === 'canceled') return 'past_due';
  return subscription?.status || 'payment_pending';
}

function idFromMollieRef(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id || value.href?.split('/').pop() || null;
}

async function findUserIdForCustomer(supabase, mollieCustomerId) {
  if (!mollieCustomerId) return null;

  const result = await supabase
    .from('billing_customers')
    .select('user_id')
    .eq('provider', BILLING_PROVIDER)
    .eq('provider_customer_id', mollieCustomerId)
    .maybeSingle();
  throwSupabaseError(result, 'Failed to map Mollie customer');

  return result.data?.user_id || null;
}

async function upsertMollieSubscription(supabase, { subscription, payment, plan, metadata, periodStart, periodEnd }) {
  const customerId = subscription.customerId || payment.customerId;
  const userId =
    metadata?.supabase_user_id ||
    metadata?.user_id ||
    await findUserIdForCustomer(supabase, customerId);

  if (!userId) {
    throw new Error(`Unable to map Mollie subscription ${subscription.id} to a Supabase user`);
  }

  const planId = metadata?.plan_id || plan?.id || null;
  const productCode = metadata?.product_code || plan?.productCode || (planId === 'player_monthly' ? 'player_bonus_hunt' : 'streamer_premium');
  const status = paymentStatusToSubscriptionStatus(payment, subscription);
  const isPremiumActive = ACTIVE_SUBSCRIPTION_STATUSES.has(status);
  const paymentStatus = payment?.status || null;
  const nextBillingAt = subscription.nextPaymentDate ? isoAtStartOfDay(subscription.nextPaymentDate) : periodEnd;
  const payloadMetadata = { ...(metadata || {}), mollie_payment_id: payment?.id || null };

  const subscriptionResult = await supabase
    .from('billing_subscriptions')
    .upsert({
      user_id: userId,
      provider: BILLING_PROVIDER,
      provider_subscription_id: subscription.id,
      provider_customer_id: customerId,
      provider_price_id: planId,
      provider_payment_id: payment?.id || null,
      mollie_subscription_id: subscription.id,
      mollie_customer_id: customerId,
      mollie_payment_id: payment?.id || null,
      product_code: productCode,
      plan_id: planId,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      trial_start: null,
      trial_end: null,
      next_billing_at: nextBillingAt,
      payment_status: paymentStatus,
      cancel_at_period_end: subscription.status === 'canceled',
      canceled_at: subscription.canceledAt || null,
      ended_at: subscription.status === 'completed' ? new Date().toISOString() : null,
      metadata: payloadMetadata,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_subscription_id' });
  throwSupabaseError(subscriptionResult, 'Failed to sync billing subscription');

  if (productCode === 'player_bonus_hunt') {
    const playerResult = await supabase
      .from('user_product_subscriptions')
      .upsert({
        user_id: userId,
        product_code: productCode,
        plan_code: planId || 'player_monthly',
        provider: BILLING_PROVIDER,
        provider_customer_id: customerId,
        provider_subscription_id: subscription.id,
        provider_price_id: planId,
        status,
        payment_status: paymentStatus,
        trial_consumed: false,
        trial_started_at: null,
        trial_ends_at: null,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        next_billing_at: nextBillingAt,
        cancel_at_period_end: subscription.status === 'canceled',
        canceled_at: subscription.canceledAt || null,
        ended_at: subscription.status === 'completed' ? new Date().toISOString() : null,
        metadata: payloadMetadata,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_code' });
    throwSupabaseError(playerResult, 'Failed to sync player product subscription');
    if (isPremiumActive) {
      await supabase
        .from('user_trials')
        .update({ status: 'converted', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'active');
    }
    return { userId, active: ACTIVE_SUBSCRIPTION_STATUSES.has(status), status, productCode };
  }

  const roleResult = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'premium')
    .eq('source', BILLING_PROVIDER)
    .eq('source_ref', subscription.id)
    .maybeSingle();
  throwSupabaseError(roleResult, 'Failed to load Mollie premium role');

  const rolePayload = {
    user_id: userId,
    role: 'premium',
    access_expires_at: isPremiumActive ? periodEnd : new Date().toISOString(),
    is_active: isPremiumActive,
    moderator_permissions: {},
    source: BILLING_PROVIDER,
    source_ref: subscription.id,
    updated_at: new Date().toISOString(),
  };

  if (roleResult.data?.id) {
    const updateResult = await supabase.from('user_roles').update(rolePayload).eq('id', roleResult.data.id);
    throwSupabaseError(updateResult, 'Failed to update premium role');
  } else {
    const insertResult = await supabase.from('user_roles').insert(rolePayload);
    throwSupabaseError(insertResult, 'Failed to create premium role');
  }

  if (isPremiumActive) {
    await supabase
      .from('user_trials')
      .update({ status: 'converted', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active');
  }

  return { userId, active: isPremiumActive, status, productCode };
}

export async function syncMolliePayment(supabase, payment, req) {
  if (!payment?.id) return null;

  const metadata = payment.metadata || {};
  const plan = planWithMetadataPrice(
    await getPlanPrice(supabase, metadata.plan_id || 'monthly', { requireActive: false }),
    metadata,
  );
  const paidAt = payment.paidAt || new Date().toISOString();

  if (payment.subscriptionId) {
    const subscription = await retrieveSubscription(payment.customerId, payment.subscriptionId);
    const periodStart = payment.status === 'paid' ? paidAt : new Date().toISOString();
    const periodEnd = subscription?.nextPaymentDate
      ? isoAtStartOfDay(subscription.nextPaymentDate)
      : addMonths(periodStart, plan.intervalMonths).toISOString();
    return upsertMollieSubscription(supabase, { subscription, payment, plan, metadata: subscription.metadata || metadata, periodStart, periodEnd });
  }

  if (payment.sequenceType !== 'first' || payment.status !== 'paid') return null;

  const periodStart = paidAt;
  const nextPeriodDate = isoDateOnly(addMonths(periodStart, plan.intervalMonths));
  const subscriptionMetadata = { ...metadata, initial_payment_id: payment.id };
  const subscription = await createMollieSubscription({
    req,
    customerId: payment.customerId,
    plan,
    metadata: subscriptionMetadata,
    startDate: nextPeriodDate,
  });

  return upsertMollieSubscription(supabase, {
    subscription,
    payment,
    plan,
    metadata: subscriptionMetadata,
    periodStart,
    periodEnd: isoAtStartOfDay(nextPeriodDate),
  });
}

export async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length > 0) return Buffer.concat(chunks).toString('utf8');

  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return '';
}

export function parseMollieWebhookBody(rawBody = '') {
  if (!rawBody) return {};
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Mollie classic webhooks are form encoded.
  }
  return Object.fromEntries(new URLSearchParams(rawBody));
}

export function mollieEventId(payment) {
  return [
    payment.id,
    payment.status || 'unknown',
    payment.subscriptionId || 'setup',
    payment.paidAt || payment.canceledAt || payment.expiredAt || payment.failedAt || payment.createdAt || '',
  ].join(':');
}