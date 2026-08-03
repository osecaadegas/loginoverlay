-- Remove retired Mollie billing defaults and provider-specific columns.
-- Stripe is the only active payment provider.

ALTER TABLE IF EXISTS public.billing_customers
  ALTER COLUMN provider SET DEFAULT 'stripe';

ALTER TABLE IF EXISTS public.billing_subscriptions
  ALTER COLUMN provider SET DEFAULT 'stripe';

ALTER TABLE IF EXISTS public.user_product_subscriptions
  ALTER COLUMN provider SET DEFAULT 'stripe';

ALTER TABLE IF EXISTS public.subscription_events
  ALTER COLUMN provider SET DEFAULT 'stripe';

ALTER TABLE IF EXISTS public.subscription_plans
  ALTER COLUMN provider SET DEFAULT 'stripe';

ALTER TABLE IF EXISTS public.subscription_plan_price_changes
  ALTER COLUMN provider SET DEFAULT 'stripe';

UPDATE public.billing_customers
SET provider = 'stripe',
    provider_customer_id = COALESCE(provider_customer_id, stripe_customer_id),
    updated_at = NOW()
WHERE provider IS NULL OR provider = 'mollie';

UPDATE public.billing_subscriptions
SET provider = 'stripe',
    provider_subscription_id = COALESCE(provider_subscription_id, stripe_subscription_id),
    provider_customer_id = COALESCE(provider_customer_id, stripe_customer_id),
    provider_price_id = COALESCE(provider_price_id, stripe_price_id),
    updated_at = NOW()
WHERE provider IS NULL OR provider = 'mollie';

UPDATE public.user_product_subscriptions
SET provider = 'stripe',
    updated_at = NOW()
WHERE provider IS NULL OR provider = 'mollie';

UPDATE public.subscription_plans
SET provider = 'stripe',
    updated_at = NOW()
WHERE provider IS NULL OR provider = 'mollie';

UPDATE public.subscription_plan_price_changes
SET provider = 'stripe'
WHERE provider IS NULL OR provider = 'mollie';

UPDATE public.subscription_page_content
SET content = jsonb_set(
      content,
      '{legal_note}',
      to_jsonb('Secure recurring billing is handled by Stripe. Trials are internal entitlements and never create an automatic paid subscription.'::text),
      true
    ),
    updated_at = NOW()
WHERE id = 'premium_main'
  AND content->>'legal_note' ILIKE '%mollie%';

DROP INDEX IF EXISTS public.idx_billing_customers_mollie_customer;
DROP INDEX IF EXISTS public.idx_user_roles_mollie_unique;

ALTER TABLE IF EXISTS public.billing_customers
  DROP COLUMN IF EXISTS mollie_customer_id;

ALTER TABLE IF EXISTS public.billing_subscriptions
  DROP COLUMN IF EXISTS mollie_subscription_id,
  DROP COLUMN IF EXISTS mollie_customer_id,
  DROP COLUMN IF EXISTS mollie_payment_id;
