import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userEmail, seasonId } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'Missing userId or userEmail' });
    }

    // Get the price ID from environment or database
    const priceId = process.env.STRIPE_SEASON_PASS_PRICE_ID;

    if (!priceId) {
      return res.status(500).json({ error: 'Stripe price not configured' });
    }

    // Get your domain for redirect URLs
    const domain = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.SITE_URL || 'http://localhost:5173';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${domain}/games/thelife/season-pass?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/games/thelife/season-pass?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        seasonId: seasonId || '1',
        type: 'season_pass_premium'
      },
      // Optional: Allow promotion codes
      allow_promotion_codes: true,
    });

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
