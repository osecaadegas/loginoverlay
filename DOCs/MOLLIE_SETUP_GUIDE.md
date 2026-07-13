# Mollie Billing Setup

This project uses Mollie through Vercel serverless functions. No Mollie npm package is required.

## 1. Create and verify Mollie

1. Create or open your Mollie account.
2. Complete business verification and activate the website profile for `streamerscenter.com`.
3. Enable payment methods that support recurring payments for your account. For subscriptions, Mollie recurring payments commonly use credit card, direct debit, or PayPal depending on your account configuration.
4. Start with a test API key first. It should begin with `test_`. Switch to a `live_` key only after checkout and webhook tests pass.

## 2. Run the Supabase migration

Run the migration after `020_overlay_appearance_system.sql`:

```sql
-- migrations/021_mollie_billing.sql
```

The migration keeps the existing Stripe columns for history, adds provider-neutral billing IDs, and makes new billing rows default to Mollie.

## 3. Add Vercel environment variables

Required:

```bash
MOLLIE_API_KEY=test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_URL=https://streamerscenter.com
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Recommended:

```bash
MOLLIE_WEBHOOK_SECRET=make-a-long-random-secret
MOLLIE_WEBHOOK_URL=https://streamerscenter.com/api/mollie-webhook
BILLING_SUPPORT_URL=https://streamerscenter.com/contact
```

Optional plan amount overrides:

```bash
MOLLIE_AMOUNT_MONTHLY=15.00
MOLLIE_AMOUNT_QUARTERLY=40.00
MOLLIE_AMOUNT_SEMIANNUAL=60.00
MOLLIE_AMOUNT_ANNUAL=120.00
MOLLIE_AMOUNT_PLAYER_MONTHLY=3.00
```

Optional player subscription enforcement:

```bash
PLAYER_BONUS_HUNT_REQUIRE_SUBSCRIPTION=true
```

## 4. Deploy and test with Mollie test mode

1. Deploy the Vercel environment with the test key.
2. Sign in to the site with a normal user.
3. Open `/premium` and start a plan.
4. Complete the Mollie test checkout.
5. Confirm the browser returns to `/premium?success=true`.
6. In Supabase, verify a Mollie customer exists in `billing_customers`, a subscription exists in `billing_subscriptions`, and the user has an active `premium` role with `source = 'mollie'`.
7. Confirm `subscription_events` contains Mollie payment events.

## 5. Webhook behavior

The checkout route sends `https://streamerscenter.com/api/mollie-webhook` to Mollie on each first payment and created subscription. Mollie posts the payment ID to that URL. The API then retrieves the payment from Mollie, creates the recurring subscription after the first paid payment, and syncs Supabase access.

If `MOLLIE_WEBHOOK_SECRET` is set, the webhook URL includes it as a query parameter. Keep that value private.

## 6. Go live

1. Replace `MOLLIE_API_KEY` with the live key from Mollie.
2. Keep `APP_URL` pointed at the production domain.
3. Redeploy Vercel.
4. Run one low-risk live checkout and verify the Mollie dashboard, Supabase billing rows, and premium access.

## Important difference from Stripe

Mollie does not provide a Stripe-style hosted customer billing portal. The current app returns a support message or `BILLING_SUPPORT_URL` for payment-detail updates and cancellations. Checkout and webhook subscription sync are handled automatically.