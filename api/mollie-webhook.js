import { createClient } from '@supabase/supabase-js';
import {
  BILLING_PROVIDER,
  mollieEventId,
  parseMollieWebhookBody,
  readRawBody,
  retrievePayment,
  syncMolliePayment,
} from './_lib/mollie-billing.js';

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

function querySecret(req) {
  const direct = req.query?.secret;
  if (Array.isArray(direct)) return direct[0];
  if (typeof direct === 'string') return direct;
  return new URL(req.url || '/', 'https://streamerscenter.com').searchParams.get('secret');
}

function verifyWebhookSecret(req) {
  const expected = process.env.MOLLIE_WEBHOOK_SECRET;
  if (!expected) return;
  if (querySecret(req) === expected) return;

  const err = new Error('Invalid Mollie webhook secret');
  err.statusCode = 401;
  throw err;
}

async function alreadyProcessed(supabase, eventId) {
  const { data, error } = await supabase
    .from('subscription_events')
    .select('id')
    .eq('provider', BILLING_PROVIDER)
    .eq('provider_event_id', eventId)
    .maybeSingle();

  if (error && error.code !== '42P01') throw error;
  return !!data;
}

async function recordSubscriptionEvent(supabase, eventId, payment, syncResult) {
  const metadata = payment?.metadata || {};
  const { error } = await supabase
    .from('subscription_events')
    .upsert({
      user_id: syncResult?.userId || metadata.supabase_user_id || metadata.user_id || null,
      product_code: syncResult?.productCode || metadata.product_code || null,
      provider: BILLING_PROVIDER,
      provider_event_id: eventId,
      event_type: `payment.${payment?.status || 'unknown'}`,
      payload: payment || {},
      processed_at: new Date().toISOString(),
    }, { onConflict: 'provider,provider_event_id' });
  if (error && error.code !== '42P01') throw error;
}

function webhookErrorStatus(error) {
  if (error?.statusCode && error.statusCode < 500) return error.statusCode;
  return 500;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    verifyWebhookSecret(req);
    const rawBody = await readRawBody(req);
    const body = parseMollieWebhookBody(rawBody);
    const paymentId = body.id;

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing Mollie payment id' });
    }

    const supabase = createSupabaseAdmin();
    const payment = await retrievePayment(paymentId);
    const eventId = mollieEventId(payment);

    if (await alreadyProcessed(supabase, eventId)) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    const syncResult = await syncMolliePayment(supabase, payment, req);
    await recordSubscriptionEvent(supabase, eventId, payment, syncResult);

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[mollie-webhook]', err);
    return res.status(webhookErrorStatus(err)).json({ error: err.message || 'Webhook processing failed' });
  }
}