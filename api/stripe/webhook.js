import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Disable body parsing, need raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body
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

    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      // Check if this is a season pass purchase
      if (session.metadata?.type === 'season_pass_premium') {
        const userId = session.metadata.userId;
        const seasonId = parseInt(session.metadata.seasonId) || 1;

        console.log(`Processing Season Pass Premium for user ${userId}`);

        try {
          // Update user's season pass progress to has_premium = true
          const { data, error } = await supabase
            .from('season_pass_progress')
            .upsert({
              user_id: userId,
              season_id: seasonId,
              has_premium: true,
              premium_purchased_at: new Date().toISOString(),
              stripe_payment_id: session.payment_intent
            }, {
              onConflict: 'user_id,season_id'
            });

          if (error) {
            console.error('Error updating season pass progress:', error);
          } else {
            console.log(`✅ Season Pass Premium activated for user ${userId}`);
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }
      break;
    }

    case 'payment_intent.succeeded': {
      console.log('Payment succeeded:', event.data.object.id);
      break;
    }

    case 'payment_intent.payment_failed': {
      console.log('Payment failed:', event.data.object.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Return 200 to acknowledge receipt
  res.status(200).json({ received: true });
}
