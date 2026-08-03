import { createClient } from '@supabase/supabase-js';
import {
  readRawBody,
  retrieveSubscription,
  syncStripeSubscription,
  verifyStripeSignature,
} from './_lib/stripe-billing.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function createSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase service role is not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

function stripeId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function buildStripeEventSummary(event, syncResult = null) {
  const object = event.data?.object || {};
  const metadata = object.metadata || {};
  const subscriptionMetadata = object.subscription_details?.metadata || {};
  const item = object.items?.data?.[0] || object.lines?.data?.[0] || {};
  const subscriptionId =
    stripeId(object.subscription) ||
    (object.object === 'subscription' ? object.id : null);
  const invoiceId =
    object.object === 'invoice'
      ? object.id
      : stripeId(object.invoice) || stripeId(object.latest_invoice);

  return {
    event_id: event.id || null,
    event_type: event.type || null,
    api_version: event.api_version || null,
    livemode: !!event.livemode,
    created: event.created || null,
    object_type: object.object || null,
    object_id: object.id || null,
    customer_id: stripeId(object.customer),
    subscription_id: subscriptionId,
    invoice_id: invoiceId,
    user_id:
      syncResult?.userId ||
      object.client_reference_id ||
      metadata.supabase_user_id ||
      subscriptionMetadata.supabase_user_id ||
      null,
    product_code:
      syncResult?.productCode ||
      metadata.product_code ||
      subscriptionMetadata.product_code ||
      null,
    plan_id:
      metadata.plan_id ||
      subscriptionMetadata.plan_id ||
      null,
    status: syncResult?.status || object.status || null,
    payment_status: object.payment_status || item.payment_status || null,
    price_id: stripeId(item.price),
  };
}

async function alreadyProcessed(supabase, eventId) {
  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

async function recordProcessedEvent(supabase, event, syncResult) {
  const eventSummary = buildStripeEventSummary(event, syncResult);
  const { error } = await supabase
    .from('stripe_webhook_events')
    .upsert({
      stripe_event_id: event.id,
      event_type: event.type,
      raw_event: eventSummary,
      processed_at: new Date().toISOString(),
    }, { onConflict: 'stripe_event_id' });

  if (error) throw error;
}

async function syncSubscriptionById(supabase, subscriptionRef, fallbackUserId = null) {
  const subscriptionId = stripeId(subscriptionRef);
  if (!subscriptionId) return null;

  const subscription = await retrieveSubscription(subscriptionId);
  return syncStripeSubscription(supabase, subscription, fallbackUserId);
}

async function handleCheckoutCompleted(supabase, session) {
  const userId = session.client_reference_id || session.metadata?.supabase_user_id || null;
  const customerId = stripeId(session.customer);

  if (userId && customerId) {
    const { error } = await supabase
      .from('billing_customers')
      .upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        email: session.customer_details?.email || session.customer_email || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  return syncSubscriptionById(supabase, session.subscription, userId);
}

async function handleInvoiceEvent(supabase, invoice) {
  return syncSubscriptionById(supabase, invoice.subscription);
}

async function handleStripeEvent(supabase, event) {
  const object = event.data?.object;

  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(supabase, object);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return syncStripeSubscription(supabase, object);
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      return handleInvoiceEvent(supabase, object);
    default:
      return null;
  }
}

async function recordSubscriptionEvent(supabase, event, syncResult) {
  if (!event?.id) return;
  const eventSummary = buildStripeEventSummary(event, syncResult);

  const { error } = await supabase
    .from('subscription_events')
    .upsert({
      user_id: eventSummary.user_id,
      product_code: eventSummary.product_code,
      provider: 'stripe',
      provider_event_id: event.id,
      event_type: event.type,
      payload: eventSummary,
      processed_at: new Date().toISOString(),
    }, { onConflict: 'provider,provider_event_id' });
  if (error && error.code !== '42P01') throw error;
}

function webhookErrorStatus(error) {
  const message = error?.message || '';
  if (
    error instanceof SyntaxError ||
    message.includes('Stripe-Signature') ||
    message.includes('signature header') ||
    message.includes('signature timestamp') ||
    message.includes('signature verification')
  ) {
    return 400;
  }

  return error?.statusCode && error.statusCode < 500 ? error.statusCode : 500;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const rawBody = await readRawBody(req);
    verifyStripeSignature(rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);

    const event = JSON.parse(rawBody);
    const supabase = createSupabaseAdmin();

    if (await alreadyProcessed(supabase, event.id)) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    const syncResult = await handleStripeEvent(supabase, event);
    await recordSubscriptionEvent(supabase, event, syncResult);
    await recordProcessedEvent(supabase, event, syncResult);

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook]', err);
    return res.status(webhookErrorStatus(err)).json({ error: err.message || 'Webhook processing failed' });
  }
}
