-- Player Bonus Hunt product area.
-- Separate from streamer OBS Bonus Hunt widgets and overlay tables.

ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS product_code TEXT DEFAULT 'streamer_premium',
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status TEXT;

UPDATE public.billing_subscriptions
SET product_code = 'streamer_premium'
WHERE product_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_product
  ON public.billing_subscriptions(user_id, product_code, status);

CREATE TABLE IF NOT EXISTS public.user_product_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_product_subscriptions_current
  ON public.user_product_subscriptions(user_id, product_code);

CREATE INDEX IF NOT EXISTS idx_user_product_subscriptions_access
  ON public.user_product_subscriptions(user_id, product_code, status, trial_ends_at, current_period_end);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_code TEXT,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.player_hunts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  casino_name TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'active',
  starting_deposit NUMERIC(14,2) NOT NULL DEFAULT 0,
  additional_deposits NUMERIC(14,2) NOT NULL DEFAULT 0,
  initial_withdrawal NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  hunt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT player_hunts_status_check CHECK (status IN ('active', 'completed', 'archived')),
  CONSTRAINT player_hunts_currency_check CHECK (currency IN ('EUR', 'USD', 'GBP', 'CAD', 'AUD', 'BRL', 'NOK', 'SEK', 'DKK', 'PLN')),
  CONSTRAINT player_hunts_non_negative_check CHECK (
    starting_deposit >= 0
    AND additional_deposits >= 0
    AND initial_withdrawal >= 0
    AND total_withdrawals >= 0
    AND current_balance >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.player_hunt_bonuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hunt_id UUID NOT NULL REFERENCES public.player_hunts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  slot_name TEXT NOT NULL,
  provider_name TEXT,
  slot_image_url TEXT,
  slot_rtp NUMERIC(5,2),
  slot_volatility TEXT,
  slot_max_win_multiplier NUMERIC(10,2),
  slot_theme TEXT,
  slot_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  bonus_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  bet_size NUMERIC(14,2) NOT NULL DEFAULT 0,
  payout NUMERIC(14,2) NOT NULL DEFAULT 0,
  multiplier NUMERIC(14,2),
  profit_loss NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unopened',
  opened_at TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT player_hunt_bonuses_status_check CHECK (status IN ('unopened', 'opened')),
  CONSTRAINT player_hunt_bonuses_slot_volatility_check CHECK (
    slot_volatility IS NULL OR slot_volatility IN ('low', 'medium', 'high', 'very_high')
  ),
  CONSTRAINT player_hunt_bonuses_non_negative_check CHECK (
    (slot_rtp IS NULL OR (slot_rtp >= 0 AND slot_rtp <= 100))
    AND (slot_max_win_multiplier IS NULL OR slot_max_win_multiplier >= 0)
    AND
    bonus_cost >= 0
    AND bet_size >= 0
    AND payout >= 0
    AND position >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_player_hunts_user_status_date
  ON public.player_hunts(user_id, status, hunt_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_player_hunts_user_date
  ON public.player_hunts(user_id, hunt_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_player_hunt_bonuses_hunt
  ON public.player_hunt_bonuses(hunt_id, position, created_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_player_hunt_bonuses_user_status
  ON public.player_hunt_bonuses(user_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_player_hunt_bonuses_slot
  ON public.player_hunt_bonuses(user_id, lower(slot_name), lower(provider_name))
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS player_hunts_updated_at ON public.player_hunts;
CREATE TRIGGER player_hunts_updated_at
  BEFORE UPDATE ON public.player_hunts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS player_hunt_bonuses_updated_at ON public.player_hunt_bonuses;
CREATE TRIGGER player_hunt_bonuses_updated_at
  BEFORE UPDATE ON public.player_hunt_bonuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_product_subscriptions_updated_at ON public.user_product_subscriptions;
CREATE TRIGGER user_product_subscriptions_updated_at
  BEFORE UPDATE ON public.user_product_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.player_bonus_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_product_subscriptions ups
    WHERE ups.user_id = p_user_id
      AND ups.product_code = 'player_bonus_hunt'
      AND (
        ups.status = 'active'
        OR (
          ups.status = 'trialing'
          AND (ups.trial_ends_at IS NULL OR ups.trial_ends_at > NOW())
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role IN ('admin', 'superadmin')
      AND ur.is_active = true
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE VIEW public.player_slot_results AS
SELECT
  b.id,
  b.user_id,
  b.hunt_id,
  h.name AS hunt_name,
  h.casino_name,
  h.currency,
  h.hunt_date,
  b.slot_id,
  b.slot_name,
  b.provider_name,
  b.slot_image_url,
  b.slot_rtp,
  b.slot_volatility,
  b.slot_max_win_multiplier,
  b.slot_theme,
  b.slot_features,
  b.bonus_cost,
  b.bet_size,
  b.payout,
  b.multiplier,
  b.profit_loss,
  b.status,
  b.opened_at,
  b.created_at
FROM public.player_hunt_bonuses b
JOIN public.player_hunts h ON h.id = b.hunt_id
WHERE b.deleted_at IS NULL
  AND h.deleted_at IS NULL;

ALTER TABLE public.user_product_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_hunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_hunt_bonuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own product subscriptions" ON public.user_product_subscriptions;
CREATE POLICY "Users can read own product subscriptions"
  ON public.user_product_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own player hunts" ON public.player_hunts;
CREATE POLICY "Users can read own player hunts"
  ON public.player_hunts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own player hunts" ON public.player_hunts;
CREATE POLICY "Users can insert own player hunts"
  ON public.player_hunts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.player_bonus_access(auth.uid()));

DROP POLICY IF EXISTS "Users can update own player hunts" ON public.player_hunts;
CREATE POLICY "Users can update own player hunts"
  ON public.player_hunts FOR UPDATE
  USING (auth.uid() = user_id AND public.player_bonus_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.player_bonus_access(auth.uid()));

DROP POLICY IF EXISTS "Users can read own player bonuses" ON public.player_hunt_bonuses;
CREATE POLICY "Users can read own player bonuses"
  ON public.player_hunt_bonuses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own player bonuses" ON public.player_hunt_bonuses;
CREATE POLICY "Users can insert own player bonuses"
  ON public.player_hunt_bonuses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.player_bonus_access(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.player_hunts h
      WHERE h.id = hunt_id
        AND h.user_id = auth.uid()
        AND h.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update own player bonuses" ON public.player_hunt_bonuses;
CREATE POLICY "Users can update own player bonuses"
  ON public.player_hunt_bonuses FOR UPDATE
  USING (auth.uid() = user_id AND public.player_bonus_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.player_bonus_access(auth.uid()));

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
