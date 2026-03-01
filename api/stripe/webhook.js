import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    /* ── New subscription or renewal paid ── */
    case 'checkout.session.completed':
    case 'invoice.paid': {
      let userId, months;

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        if (session.metadata?.type !== 'overlay_premium') break;
        userId = session.metadata.userId;
        months = parseInt(session.metadata.months) || 1;
      } else {
        /* invoice.paid — get metadata from the subscription */
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_create') break; // already handled by checkout.session.completed
        try {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          if (subscription.metadata?.type !== 'overlay_premium') break;
          userId = subscription.metadata.userId;
          months = parseInt(subscription.metadata.months) || 1;
        } catch (e) {
          console.error('Error fetching subscription:', e);
          break;
        }
      }

      if (!userId) break;
      console.log(`Granting/renewing premium for ${userId} — ${months} month(s)`);

      try {
        const { data: existing } = await supabase
          .from('user_roles')
          .select('id, access_expires_at')
          .eq('user_id', userId)
          .eq('role', 'premium')
          .maybeSingle();

        const now = new Date();
        let baseDate = now;
        if (existing?.access_expires_at) {
          const currentExpiry = new Date(existing.access_expires_at);
          if (currentExpiry > now) baseDate = currentExpiry;
        }

        const newExpiry = new Date(baseDate);
        newExpiry.setMonth(newExpiry.getMonth() + months);

        if (existing) {
          const { error } = await supabase
            .from('user_roles')
            .update({
              is_active: true,
              access_expires_at: newExpiry.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', existing.id);
          if (error) console.error('Error updating premium role:', error);
          else console.log(`✅ Premium extended for ${userId} until ${newExpiry.toISOString()}`);
        } else {
          const { error } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'premium',
              is_active: true,
              access_expires_at: newExpiry.toISOString(),
            });
          if (error) console.error('Error inserting premium role:', error);
          else console.log(`✅ Premium granted to ${userId} until ${newExpiry.toISOString()}`);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
      break;
    }

    /* ── Subscription canceled or expired ── */
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      if (subscription.metadata?.type !== 'overlay_premium') break;
      const userId = subscription.metadata.userId;

      if (!userId) break;
      console.log(`Subscription canceled for ${userId}`);

      try {
        const { error } = await supabase
          .from('user_roles')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('role', 'premium');
        if (error) console.error('Error deactivating premium:', error);
        else console.log(`✅ Premium deactivated for ${userId}`);
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
      break;
    }

    case 'payment_intent.succeeded':
      console.log('Payment succeeded:', event.data.object.id);
      break;

    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}
