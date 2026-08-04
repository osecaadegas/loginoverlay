import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const checkoutSource = readFileSync(new URL('../api/create-checkout-session.js', import.meta.url), 'utf8');
const billingSource = readFileSync(new URL('../api/_lib/stripe-billing.js', import.meta.url), 'utf8');
const premiumSource = readFileSync(new URL('../api/_lib/routes/premium.js', import.meta.url), 'utf8');
const pricingSource = readFileSync(new URL('../src/components/Pricing/PricingPage.jsx', import.meta.url), 'utf8');

assert.match(checkoutSource, /STRIPE_TRIAL_DAYS = 7/);
assert.match(checkoutSource, /new Set\(\['player_monthly', 'streamer_monthly'\]\)/);
assert.match(checkoutSource, /from\('user_trials'\)/);
assert.match(checkoutSource, /from\('user_product_subscriptions'\)/);
assert.match(checkoutSource, /from\('billing_subscriptions'\)/);
assert.match(billingSource, /payment_method_collection = 'always'/);
assert.match(billingSource, /subscription_data\[trial_period_days\]/);
assert.match(premiumSource, /internal_trial_retired/);
assert.match(pricingSource, /billing starts automatically after the trial/);
assert.match(pricingSource, /Monthly trials convert automatically after 7 days unless canceled/);

console.log('Stripe seven-day trial checks passed.');