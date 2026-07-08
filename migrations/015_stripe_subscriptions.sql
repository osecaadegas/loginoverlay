-- Stripe recurring subscriptions for premium access.
-- Run after 014_cleanup_penalty_king.sql.

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_stripe_unique
  ON public.user_roles(user_id, role, source_ref)
  WHERE source = 'stripe' AND source_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_source
  ON public.user_roles(source, source_ref);

CREATE TABLE IF NOT EXISTS public.billing_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  raw_event JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_user_id
  ON public.billing_customers(user_id);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user_id
  ON public.billing_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status
  ON public.billing_subscriptions(status);

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Admins can read Stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Admins can read Stripe webhook events"
  ON public.stripe_webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );
