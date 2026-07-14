-- Editable subscription products, plans, premium page content, and internal no-card trials.
-- Additive only: preserves existing billing_subscriptions, user_product_subscriptions, webhooks, and user_roles grants.

CREATE TABLE IF NOT EXISTS public.subscription_product_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  entitlement_product_code TEXT NOT NULL UNIQUE,
  public_title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_product_types_code_check CHECK (code IN ('player', 'streamer')),
  CONSTRAINT subscription_product_types_entitlement_check CHECK (entitlement_product_code IN ('player_bonus_hunt', 'streamer_premium'))
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  internal_name TEXT NOT NULL,
  public_title TEXT NOT NULL,
  description TEXT,
  product_type_code TEXT NOT NULL REFERENCES public.subscription_product_types(code) ON UPDATE CASCADE,
  product_code TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  billing_interval TEXT NOT NULL,
  interval_count INTEGER NOT NULL DEFAULT 1,
  badge TEXT,
  savings_label TEXT,
  monthly_equivalent_cents INTEGER,
  inclusion_text TEXT,
  recommended BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  provider TEXT NOT NULL DEFAULT 'mollie',
  provider_product_id TEXT,
  provider_price_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_plans_product_check CHECK (product_code IN ('player_bonus_hunt', 'streamer_premium')),
  CONSTRAINT subscription_plans_price_check CHECK (price_cents > 0),
  CONSTRAINT subscription_plans_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT subscription_plans_interval_check CHECK (billing_interval IN ('month', 'year')),
  CONSTRAINT subscription_plans_interval_count_check CHECK (interval_count > 0),
  CONSTRAINT subscription_plans_monthly_equivalent_check CHECK (monthly_equivalent_cents IS NULL OR monthly_equivalent_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_product_active
  ON public.subscription_plans(product_type_code, active, sort_order);

CREATE TABLE IF NOT EXISTS public.subscription_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Check',
  player_available BOOLEAN NOT NULL DEFAULT false,
  streamer_available BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_features_active_sort
  ON public.subscription_features(active, sort_order);

CREATE TABLE IF NOT EXISTS public.subscription_plan_features (
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.subscription_features(id) ON DELETE CASCADE,
  included BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plan_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_page_content (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'premium',
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_page_content_scope_check CHECK (scope IN ('premium'))
);

CREATE INDEX IF NOT EXISTS idx_subscription_page_content_scope_active
  ON public.subscription_page_content(scope, active);

CREATE TABLE IF NOT EXISTS public.user_trials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_product_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_trials_unique_user UNIQUE (user_id),
  CONSTRAINT user_trials_product_check CHECK (selected_product_type IN ('player', 'streamer')),
  CONSTRAINT user_trials_status_check CHECK (status IN ('active', 'expired', 'converted', 'revoked')),
  CONSTRAINT user_trials_dates_check CHECK (expires_at > started_at)
);

CREATE INDEX IF NOT EXISTS idx_user_trials_access
  ON public.user_trials(user_id, status, expires_at);

CREATE TABLE IF NOT EXISTS public.subscription_plan_price_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_price_cents INTEGER NOT NULL,
  new_price_cents INTEGER NOT NULL,
  old_provider_price_id TEXT,
  new_provider_price_id TEXT,
  provider TEXT NOT NULL DEFAULT 'mollie',
  provider_price_change_required BOOLEAN NOT NULL DEFAULT false,
  active_subscriber_count INTEGER NOT NULL DEFAULT 0,
  affects_new_subscribers_only BOOLEAN NOT NULL DEFAULT true,
  old_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_plan_price_changes_price_check CHECK (old_price_cents > 0 AND new_price_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_subscription_plan_price_changes_plan
  ON public.subscription_plan_price_changes(plan_id, created_at DESC);

INSERT INTO public.subscription_product_types (code, entitlement_product_code, public_title, description, icon, sort_order, active)
VALUES
  ('player', 'player_bonus_hunt', 'Player', 'Track your sessions, results and personal bests.', 'UserRound', 1, true),
  ('streamer', 'streamer_premium', 'Streamer', 'Run overlays, widgets and audience engagement tools.', 'RadioTower', 2, true)
ON CONFLICT (code) DO UPDATE SET
  entitlement_product_code = EXCLUDED.entitlement_product_code,
  public_title = EXCLUDED.public_title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO public.subscription_plans (
  id, internal_name, public_title, description, product_type_code, product_code, price_cents, currency,
  billing_interval, interval_count, badge, savings_label, monthly_equivalent_cents, inclusion_text,
  recommended, sort_order, active, provider, provider_product_id, provider_price_id
)
VALUES
  ('player_monthly', 'player_monthly', 'Player Monthly', 'Monthly Player access.', 'player', 'player_bonus_hunt', 300, 'EUR', 'month', 1, NULL, NULL, 300, 'Includes all Player features', false, 10, true, 'mollie', NULL, NULL),
  ('player_annual', 'player_annual', 'Player Annual', 'Annual Player access.', 'player', 'player_bonus_hunt', 3000, 'EUR', 'year', 1, 'Best value', 'Saves €6 compared with paying monthly for 12 months', 250, 'Includes all Player features', true, 20, true, 'mollie', NULL, NULL),
  ('streamer_monthly', 'streamer_monthly', 'Streamer Monthly', 'Monthly Streamer access.', 'streamer', 'streamer_premium', 2500, 'EUR', 'month', 1, NULL, NULL, 2500, 'Includes all Streamer features', false, 10, true, 'mollie', NULL, NULL),
  ('streamer_6_months', 'streamer_6_months', 'Streamer 6 Months', 'Six months of Streamer access.', 'streamer', 'streamer_premium', 12500, 'EUR', 'month', 6, 'Popular', 'Saves €25 compared with six monthly payments', 2083, 'Includes all Streamer features', false, 20, true, 'mollie', NULL, NULL),
  ('streamer_annual', 'streamer_annual', 'Streamer Annual', 'Annual Streamer access.', 'streamer', 'streamer_premium', 20000, 'EUR', 'year', 1, 'Best value', 'Saves €100 compared with twelve monthly payments', 1667, 'Includes all Streamer features', true, 30, true, 'mollie', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  internal_name = EXCLUDED.internal_name,
  public_title = EXCLUDED.public_title,
  description = EXCLUDED.description,
  product_type_code = EXCLUDED.product_type_code,
  product_code = EXCLUDED.product_code,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  billing_interval = EXCLUDED.billing_interval,
  interval_count = EXCLUDED.interval_count,
  badge = EXCLUDED.badge,
  savings_label = EXCLUDED.savings_label,
  monthly_equivalent_cents = EXCLUDED.monthly_equivalent_cents,
  inclusion_text = EXCLUDED.inclusion_text,
  recommended = EXCLUDED.recommended,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  provider = EXCLUDED.provider,
  updated_at = NOW();

INSERT INTO public.subscription_features (code, title, description, icon, player_available, streamer_available, sort_order, active)
VALUES
  ('personal_bonus_hunt', 'Personal Bonus Hunt tracking', 'Understand your own sessions without maintaining complicated spreadsheets.', 'Target', true, true, 10, true),
  ('deposits_withdrawals', 'Deposits and withdrawals', 'Track money in and out of every session.', 'WalletCards', true, true, 20, true),
  ('break_even_calculations', 'Break-even calculations', 'See the exact target and remaining amount needed.', 'Calculator', true, true, 30, true),
  ('profit_loss', 'Profit and loss', 'Keep session results clear at a glance.', 'TrendingUp', true, true, 40, true),
  ('best_worst_wins', 'Best and worst wins', 'Track standout results automatically.', 'Trophy', true, true, 50, true),
  ('payout_multiplier_records', 'Payout and multiplier records', 'Save payout and multiplier history for every bonus.', 'BadgePercent', true, true, 60, true),
  ('history_ranges', 'Daily, weekly, monthly and all-time history', 'Review results across useful time ranges.', 'CalendarDays', true, true, 70, true),
  ('personal_slot_statistics', 'Personal slot statistics', 'Build your own slot performance history.', 'BarChart3', true, true, 80, true),
  ('saved_session_history', 'Saved session history', 'Keep every hunt attached to your account.', 'Archive', true, true, 90, true),
  ('overlay_control_center', 'Full Overlay Control Center', 'Manage overlays, interactions and stream tools from one control center.', 'LayoutDashboard', false, true, 110, true),
  ('bonus_hunt_overlays', 'Bonus Hunt overlays', 'Show your stream hunt in OBS with live cards and stats.', 'MonitorPlay', false, true, 120, true),
  ('custom_widgets_themes', 'Custom widgets and themes', 'Control widget styling, layouts and appearance.', 'Palette', false, true, 130, true),
  ('obs_links', 'OBS browser-source links', 'Use secure browser-source URLs for stream scenes.', 'Link', false, true, 140, true),
  ('slot_requests', 'Slot requests', 'Let viewers request and vote on slots.', 'ListPlus', false, true, 150, true),
  ('giveaways', 'Giveaways', 'Run viewer giveaways from the control center.', 'Gift', false, true, 160, true),
  ('viewer_games', 'Viewer games', 'Add interactive viewer games and engagement tools.', 'Gamepad2', false, true, 170, true),
  ('multi_chat', 'Multi-chat tools', 'Bring chat workflows into one stream-ready surface.', 'MessagesSquare', false, true, 180, true),
  ('audience_engagement', 'Audience engagement features', 'Grow interaction around every stream.', 'UsersRound', false, true, 190, true),
  ('priority_support', 'Priority support', 'Get faster help for premium streamer workflows.', 'LifeBuoy', false, true, 200, true),
  ('future_streamer_tools', 'Future premium streamer tools', 'Access future premium streamer tools as they ship.', 'Sparkles', false, true, 210, true)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  player_available = EXCLUDED.player_available,
  streamer_available = EXCLUDED.streamer_available,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO public.subscription_page_content (id, scope, title, content, active)
VALUES (
  'premium_main',
  'premium',
  'Premium page content',
  jsonb_build_object(
    'hero_heading', 'Choose how you use Streamers Center',
    'hero_description', 'Start with 15 days of full access. No card, no charge and no automatic subscription.',
    'trial_heading', '15 days completely free',
    'trial_description', 'Try everything free for 15 days. No card required. No automatic charge.',
    'trial_supporting', 'Your trial simply ends after 15 days unless you manually choose a paid plan.',
    'trust_labels', jsonb_build_array('15 days free', 'No card required', 'Continue only when ready'),
    'primary_cta', 'Start free trial',
    'secondary_cta', 'Compare plans',
    'player_section_title', 'Player plans',
    'player_section_description', 'Understand your own sessions without maintaining complicated spreadsheets.',
    'streamer_section_title', 'Streamer plans',
    'streamer_section_description', 'Manage overlays, interactions and stream tools from one control center.',
    'comparison_title', 'Player versus Streamer',
    'comparison_description', 'Choose the access level that matches how you use Streamers Center.',
    'comparison_rows', jsonb_build_array(
      jsonb_build_object('code', 'personal_bonus_hunt', 'label', 'Personal Bonus Hunt', 'player', true, 'streamer', true),
      jsonb_build_object('code', 'personal_statistics', 'label', 'Personal statistics', 'player', true, 'streamer', true),
      jsonb_build_object('code', 'win_history', 'label', 'Win history', 'player', true, 'streamer', true),
      jsonb_build_object('code', 'obs_browser_sources', 'label', 'OBS browser sources', 'player', false, 'streamer', true),
      jsonb_build_object('code', 'overlay_customisation', 'label', 'Overlay customisation', 'player', false, 'streamer', true),
      jsonb_build_object('code', 'slot_requests', 'label', 'Slot requests', 'player', false, 'streamer', true),
      jsonb_build_object('code', 'giveaways', 'label', 'Giveaways', 'player', false, 'streamer', true),
      jsonb_build_object('code', 'viewer_games', 'label', 'Viewer games', 'player', false, 'streamer', true),
      jsonb_build_object('code', 'multi_chat', 'label', 'Multi-chat', 'player', false, 'streamer', true),
      jsonb_build_object('code', 'priority_support', 'label', 'Priority support', 'player', false, 'streamer', true)
    ),
    'faq_title', 'Questions before you start',
    'legal_note', 'Secure recurring billing is handled by Mollie. Trials are internal entitlements and never create an automatic paid subscription.',
    'faq', jsonb_build_array(
      jsonb_build_object('question', 'Does the trial require a card?', 'answer', 'No. Sign in and use your selected service for 15 days without adding payment details.'),
      jsonb_build_object('question', 'Will I be charged automatically?', 'answer', 'No. The trial ends unless you manually purchase a plan.'),
      jsonb_build_object('question', 'Can I change from Player to Streamer?', 'answer', 'Yes. You can upgrade to Streamer. Changing the selected product does not restart your free trial.'),
      jsonb_build_object('question', 'What happens to my data after the trial?', 'answer', 'Your saved data remains attached to your account, but premium access ends until you choose a plan.'),
      jsonb_build_object('question', 'Can I cancel?', 'answer', 'Yes. You can stop future renewal and retain access until the end of the paid billing period.')
    )
  ),
  true
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO public.subscription_plan_features (plan_id, feature_id, included)
SELECT plan.id, feature.id, true
FROM public.subscription_plans plan
JOIN public.subscription_features feature
  ON (plan.product_type_code = 'player' AND feature.player_available = true)
  OR (plan.product_type_code = 'streamer' AND feature.streamer_available = true)
ON CONFLICT (plan_id, feature_id) DO UPDATE SET included = EXCLUDED.included;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_product_types_updated_at ON public.subscription_product_types;
CREATE TRIGGER subscription_product_types_updated_at
  BEFORE UPDATE ON public.subscription_product_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS subscription_features_updated_at ON public.subscription_features;
CREATE TRIGGER subscription_features_updated_at
  BEFORE UPDATE ON public.subscription_features
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS subscription_page_content_updated_at ON public.subscription_page_content;
CREATE TRIGGER subscription_page_content_updated_at
  BEFORE UPDATE ON public.subscription_page_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_trials_updated_at ON public.user_trials;
CREATE TRIGGER user_trials_updated_at
  BEFORE UPDATE ON public.user_trials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscription_product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_price_changes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.subscription_product_types TO anon, authenticated;
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT SELECT ON public.subscription_features TO anon, authenticated;
GRANT SELECT ON public.subscription_plan_features TO anon, authenticated;
GRANT SELECT ON public.subscription_page_content TO anon, authenticated;
GRANT SELECT ON public.user_trials TO authenticated;
GRANT SELECT ON public.subscription_plan_price_changes TO authenticated;

DROP POLICY IF EXISTS "Public reads active subscription product types" ON public.subscription_product_types;
CREATE POLICY "Public reads active subscription product types"
  ON public.subscription_product_types FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Admins manage subscription product types" ON public.subscription_product_types;
CREATE POLICY "Admins manage subscription product types"
  ON public.subscription_product_types FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ));

DROP POLICY IF EXISTS "Public reads active subscription plans" ON public.subscription_plans;
CREATE POLICY "Public reads active subscription plans"
  ON public.subscription_plans FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Admins manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins manage subscription plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ));

DROP POLICY IF EXISTS "Public reads active subscription features" ON public.subscription_features;
CREATE POLICY "Public reads active subscription features"
  ON public.subscription_features FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Admins manage subscription features" ON public.subscription_features;
CREATE POLICY "Admins manage subscription features"
  ON public.subscription_features FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ));

DROP POLICY IF EXISTS "Public reads included plan features" ON public.subscription_plan_features;
CREATE POLICY "Public reads included plan features"
  ON public.subscription_plan_features FOR SELECT
  TO anon, authenticated
  USING (included = true);

DROP POLICY IF EXISTS "Admins manage subscription plan features" ON public.subscription_plan_features;
CREATE POLICY "Admins manage subscription plan features"
  ON public.subscription_plan_features FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ));

DROP POLICY IF EXISTS "Public reads active subscription page content" ON public.subscription_page_content;
CREATE POLICY "Public reads active subscription page content"
  ON public.subscription_page_content FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Admins manage subscription page content" ON public.subscription_page_content;
CREATE POLICY "Admins manage subscription page content"
  ON public.subscription_page_content FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ));

DROP POLICY IF EXISTS "Users read own trial" ON public.user_trials;
CREATE POLICY "Users read own trial"
  ON public.user_trials FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins read trials" ON public.user_trials;
CREATE POLICY "Admins read trials"
  ON public.user_trials FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ));

DROP POLICY IF EXISTS "Admins read subscription price changes" ON public.subscription_plan_price_changes;
CREATE POLICY "Admins read subscription price changes"
  ON public.subscription_plan_price_changes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ));