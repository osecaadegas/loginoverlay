-- Mollie recurring subscriptions and provider-neutral billing identifiers.
-- Run after 020_overlay_appearance_system.sql.

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref TEXT;

UPDATE public.user_roles
SET source = 'manual'
WHERE source IS NULL;

ALTER TABLE public.user_roles
  ALTER COLUMN source SET DEFAULT 'manual';

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_key,
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_manual_unique
  ON public.user_roles(user_id, role)
  WHERE source = 'manual';

CREATE INDEX IF NOT EXISTS idx_user_roles_source
  ON public.user_roles(source, source_ref);

CREATE TABLE IF NOT EXISTS public.billing_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  provider TEXT NOT NULL DEFAULT 'mollie',
  provider_customer_id TEXT,
  mollie_customer_id TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  provider TEXT NOT NULL DEFAULT 'mollie',
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  provider_price_id TEXT,
  provider_payment_id TEXT,
  mollie_subscription_id TEXT,
  mollie_customer_id TEXT,
  mollie_payment_id TEXT,
  product_code TEXT DEFAULT 'streamer_premium',
  plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'payment_pending',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  payment_status TEXT,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_product_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mollie',
  provider_customer_id TEXT,
  provider_subscription_id TEXT UNIQUE,
  provider_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'payment_pending',
  payment_status TEXT,
  trial_consumed BOOLEAN NOT NULL DEFAULT false,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_product_subscriptions_product_check
    CHECK (product_code IN ('player_bonus_hunt', 'streamer_premium')),
  CONSTRAINT user_product_subscriptions_status_check
    CHECK (status IN ('trialing', 'active', 'payment_pending', 'past_due', 'canceled', 'cancelled', 'expired', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  CONSTRAINT user_product_subscriptions_plan_check
    CHECK (plan_code <> '')
);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_code TEXT,
  provider TEXT NOT NULL DEFAULT 'mollie',
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_event_id)
);

ALTER TABLE public.billing_customers
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS mollie_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mollie_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS mollie_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS mollie_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS product_code TEXT DEFAULT 'streamer_premium',
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status TEXT;

UPDATE public.billing_subscriptions
SET product_code = 'streamer_premium'
WHERE product_code IS NULL;

ALTER TABLE public.user_product_subscriptions
  ADD COLUMN IF NOT EXISTS product_code TEXT NOT NULL DEFAULT 'player_bonus_hunt',
  ADD COLUMN IF NOT EXISTS plan_code TEXT NOT NULL DEFAULT 'player_monthly',
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'payment_pending',
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS trial_consumed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.subscription_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_code TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_event_id TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_billing_customers_user_id
  ON public.billing_customers(user_id);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user_id
  ON public.billing_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status
  ON public.billing_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_product
  ON public.billing_subscriptions(user_id, product_code, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_product_subscriptions_current
  ON public.user_product_subscriptions(user_id, product_code);

CREATE INDEX IF NOT EXISTS idx_user_product_subscriptions_access
  ON public.user_product_subscriptions(user_id, product_code, status, trial_ends_at, current_period_end);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_events_provider_event
  ON public.subscription_events(provider, provider_event_id);

ALTER TABLE public.billing_customers
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS mollie_customer_id TEXT;

UPDATE public.billing_customers
SET
  provider = COALESCE(provider, 'stripe'),
  provider_customer_id = COALESCE(provider_customer_id, stripe_customer_id)
WHERE provider_customer_id IS NULL OR provider IS NULL;

ALTER TABLE public.billing_customers
  ALTER COLUMN provider SET DEFAULT 'mollie';

ALTER TABLE public.billing_subscriptions
  ALTER COLUMN stripe_subscription_id DROP NOT NULL,
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mollie_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS mollie_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS mollie_payment_id TEXT;

UPDATE public.billing_subscriptions
SET
  provider = COALESCE(provider, 'stripe'),
  provider_subscription_id = COALESCE(provider_subscription_id, stripe_subscription_id),
  provider_customer_id = COALESCE(provider_customer_id, stripe_customer_id),
  provider_price_id = COALESCE(provider_price_id, stripe_price_id)
WHERE provider_subscription_id IS NULL
  OR provider_customer_id IS NULL
  OR provider_price_id IS NULL
  OR provider IS NULL;

ALTER TABLE public.billing_subscriptions
  ALTER COLUMN provider SET DEFAULT 'mollie';

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_customers_provider_customer
  ON public.billing_customers(provider, provider_customer_id)
  WHERE provider_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_customers_mollie_customer
  ON public.billing_customers(mollie_customer_id)
  WHERE mollie_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_subscriptions_provider_subscription
  ON public.billing_subscriptions(provider_subscription_id);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_provider_customer
  ON public.billing_subscriptions(provider, provider_customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_mollie_unique
  ON public.user_roles(user_id, role, source_ref)
  WHERE source = 'mollie' AND source_ref IS NOT NULL;

ALTER TABLE public.user_product_subscriptions
  ALTER COLUMN provider SET DEFAULT 'mollie';

ALTER TABLE public.subscription_events
  ALTER COLUMN provider SET DEFAULT 'mollie';

UPDATE public.user_product_subscriptions
SET provider = 'mollie'
WHERE provider IS NULL;

UPDATE public.subscription_events
SET provider = 'mollie'
WHERE provider IS NULL;

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_product_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own billing customer" ON public.billing_customers;
CREATE POLICY "Users can read own billing customer"
  ON public.billing_customers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read billing customers" ON public.billing_customers;
CREATE POLICY "Admins can read billing customers"
  ON public.billing_customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can read own billing subscriptions" ON public.billing_subscriptions;
CREATE POLICY "Users can read own billing subscriptions"
  ON public.billing_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read billing subscriptions" ON public.billing_subscriptions;
CREATE POLICY "Admins can read billing subscriptions"
  ON public.billing_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can read own product subscriptions" ON public.user_product_subscriptions;
CREATE POLICY "Users can read own product subscriptions"
  ON public.user_product_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read product subscriptions" ON public.user_product_subscriptions;
CREATE POLICY "Admins can read product subscriptions"
  ON public.user_product_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can read subscription events" ON public.subscription_events;
CREATE POLICY "Admins can read subscription events"
  ON public.subscription_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );