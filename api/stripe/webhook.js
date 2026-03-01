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
    case 'checkout.session.completed': {
      const session = event.data.object;

      if (session.metadata?.type === 'overlay_premium') {
        const userId = session.metadata.userId;
        const months = parseInt(session.metadata.months) || 1;

        console.log(`Granting premium role to ${userId} for ${months} month(s)`);

        try {
          /* Check if user already has an active premium role */
          const { data: existing } = await supabase
            .from('user_roles')
            .select('id, access_expires_at')
            .eq('user_id', userId)
            .eq('role', 'premium')
            .maybeSingle();

          /* Calculate new expiry: extend from current expiry if still active, else from now */
          const now = new Date();
          let baseDate = now;
          if (existing?.access_expires_at) {
            const currentExpiry = new Date(existing.access_expires_at);
            if (currentExpiry > now) baseDate = currentExpiry; // extend remaining time
          }

          const newExpiry = new Date(baseDate);
          newExpiry.setMonth(newExpiry.getMonth() + months);

          if (existing) {
            /* Update existing role row */
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
            /* Insert new role row */
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
