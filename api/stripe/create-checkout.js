import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ── Plan definitions: duration in months → Stripe Price ID ── */
const PLANS = {
  '1':  { months: 1,  priceId: process.env.STRIPE_PRICE_1M },
  '3':  { months: 3,  priceId: process.env.STRIPE_PRICE_3M },
  '6':  { months: 6,  priceId: process.env.STRIPE_PRICE_6M },
  '12': { months: 12, priceId: process.env.STRIPE_PRICE_12M },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userEmail, plan } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'Missing userId or userEmail' });
    }

    const selected = PLANS[String(plan)];
    if (!selected || !selected.priceId) {
      return res.status(400).json({ error: `Invalid plan "${plan}". Valid: 1, 3, 6, 12` });
    }

    const domain = process.env.SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: selected.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${domain}/premium?success=true`,
      cancel_url: `${domain}/premium?canceled=true`,
      customer_email: userEmail,
      subscription_data: {
        metadata: {
          userId,
          months: String(selected.months),
          type: 'overlay_premium',
        },
      },
      metadata: {
        userId,
        months: String(selected.months),
        type: 'overlay_premium',
      },
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
