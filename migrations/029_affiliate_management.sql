-- Affiliate link management, tracking, and partner-reported statistics.
-- Creates the affiliate role data model and hardens user role writes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
      AND role IN ('admin', 'superadmin')
      AND is_active = true
      AND (access_expires_at IS NULL OR access_expires_at > NOW())
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_role(role_name TEXT, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
      AND role = role_name
      AND is_active = true
      AND (access_expires_at IS NULL OR access_expires_at > NOW())
  );
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles(user_id, role);

DROP POLICY IF EXISTS "Public read access" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;
DROP POLICY IF EXISTS "Affiliate role owners read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user roles" ON public.user_roles;

CREATE POLICY "Affiliate role owners read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins manage user roles" ON public.user_roles
  FOR ALL USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  payment_currency TEXT NOT NULL DEFAULT 'EUR',
  affiliate_access_granted_at TIMESTAMPTZ,
  affiliate_access_granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suspension_reason TEXT,
  last_dashboard_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  affiliate_platform_name TEXT,
  affiliate_manager_name TEXT,
  affiliate_manager_email TEXT,
  default_currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  reporting_mode TEXT NOT NULL DEFAULT 'manual' CHECK (reporting_mode IN ('manual', 'csv', 'api', 'postback')),
  parameter_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  tracking_notes TEXT,
  postback_secret_hash TEXT,
  postback_allowed_ips TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.affiliate_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT,
  description TEXT,
  geo TEXT,
  allowed_countries TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  restricted_countries TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  offer_type TEXT NOT NULL DEFAULT 'hybrid' CHECK (offer_type IN ('cpa', 'revenue_share', 'hybrid', 'flat_fee')),
  cpa_amount_minor INTEGER,
  revenue_share_percentage NUMERIC(5,2),
  hybrid_terms TEXT,
  minimum_deposit_minor INTEGER,
  currency TEXT NOT NULL DEFAULT 'EUR',
  terms_url TEXT,
  public_status TEXT NOT NULL DEFAULT 'public' CHECK (public_status IN ('public', 'private', 'hidden')),
  affiliate_status TEXT NOT NULL DEFAULT 'active' CHECK (affiliate_status IN ('active', 'paused', 'ended')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, slug)
);

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.affiliate_brands(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.affiliate_offers(id) ON DELETE SET NULL,
  destination_url TEXT NOT NULL CHECK (destination_url ~* '^https?://'),
  short_code TEXT NOT NULL UNIQUE CHECK (short_code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{3,63}$'),
  campaign_name TEXT,
  source_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disabled', 'archived')),
  expires_at TIMESTAMPTZ,
  affiliate_can_create_variants BOOLEAN NOT NULL DEFAULT false,
  last_clicked_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  tracking_link_id UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.affiliate_brands(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.affiliate_offers(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  campaign TEXT,
  country_code TEXT,
  referrer_domain TEXT,
  device_type TEXT,
  browser_family TEXT,
  os_family TEXT,
  is_unique BOOLEAN NOT NULL DEFAULT false,
  is_suspected_bot BOOLEAN NOT NULL DEFAULT false,
  bot_reason TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  referrer_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.affiliate_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  brand_id UUID NOT NULL REFERENCES public.affiliate_brands(id) ON DELETE CASCADE,
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_matched INTEGER NOT NULL DEFAULT 0,
  rows_unmatched INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processed', 'reversed', 'failed')),
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, file_hash)
);

CREATE TABLE IF NOT EXISTS public.affiliate_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  brand_id UUID NOT NULL REFERENCES public.affiliate_brands(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.affiliate_offers(id) ON DELETE SET NULL,
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  partner_clicks INTEGER NOT NULL DEFAULT 0,
  registrations INTEGER NOT NULL DEFAULT 0,
  qualified_registrations INTEGER NOT NULL DEFAULT 0,
  ftds INTEGER NOT NULL DEFAULT 0,
  deposit_amount_minor BIGINT NOT NULL DEFAULT 0,
  withdrawal_amount_minor BIGINT NOT NULL DEFAULT 0,
  cpa_commission_minor BIGINT NOT NULL DEFAULT 0,
  revenue_share_commission_minor BIGINT NOT NULL DEFAULT 0,
  adjustments_minor BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'api', 'postback')),
  external_reference TEXT,
  import_id UUID REFERENCES public.affiliate_imports(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  brand_id UUID NOT NULL REFERENCES public.affiliate_brands(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.affiliate_offers(id) ON DELETE SET NULL,
  click_id UUID,
  external_event_id TEXT,
  event_type TEXT NOT NULL DEFAULT 'registration',
  amount_minor BIGINT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, external_event_id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.affiliate_imports(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('matched', 'unmatched', 'ignored', 'error')),
  matched_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  matched_affiliate_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_postback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.affiliate_brands(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  click_id UUID,
  tracking_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  affiliate_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  external_event_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processed BOOLEAN NOT NULL DEFAULT false,
  unmatched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.affiliate_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_daily_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.affiliate_brands(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  human_clicks INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  suspected_bot_clicks INTEGER NOT NULL DEFAULT 0,
  registrations INTEGER NOT NULL DEFAULT 0,
  ftds INTEGER NOT NULL DEFAULT 0,
  commission_minor BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (affiliate_user_id, tracking_link_id, brand_id, day, currency)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_user_id ON public.affiliate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_brands_slug ON public.affiliate_brands(slug);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_brand ON public.affiliate_offers(brand_id, affiliate_status);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_shortcode ON public.affiliate_links(short_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_active_lookup ON public.affiliate_links(short_code, brand_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate ON public.affiliate_links(affiliate_user_id, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link_time ON public.affiliate_clicks(tracking_link_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_time ON public.affiliate_clicks(affiliate_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_click_id ON public.affiliate_clicks(click_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_stats_affiliate_period ON public.affiliate_stats(affiliate_user_id, reporting_period_start, reporting_period_end);
CREATE INDEX IF NOT EXISTS idx_affiliate_postbacks_brand_key ON public.affiliate_postback_events(brand_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_affiliate_rollups_affiliate_day ON public.affiliate_daily_rollups(affiliate_user_id, day DESC);

CREATE OR REPLACE FUNCTION public.touch_affiliate_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'affiliate_profiles',
    'affiliate_brands',
    'affiliate_offers',
    'affiliate_links',
    'affiliate_imports',
    'affiliate_stats',
    'affiliate_daily_rollups'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS touch_%I_updated_at ON public.%I', target_table, target_table);
    EXECUTE format(
      'CREATE TRIGGER touch_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_affiliate_updated_at()',
      target_table,
      target_table
    );
  END LOOP;
END $$;

ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_postback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_daily_rollups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage affiliate profiles" ON public.affiliate_profiles;
CREATE POLICY "Admins manage affiliate profiles" ON public.affiliate_profiles
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Affiliates read own active profile" ON public.affiliate_profiles;
CREATE POLICY "Affiliates read own active profile" ON public.affiliate_profiles
  FOR SELECT USING (auth.uid() = user_id AND status = 'active');

DROP POLICY IF EXISTS "Admins manage affiliate brands" ON public.affiliate_brands;
CREATE POLICY "Admins manage affiliate brands" ON public.affiliate_brands
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Affiliates read assigned brands" ON public.affiliate_brands;
CREATE POLICY "Affiliates read assigned brands" ON public.affiliate_brands
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.affiliate_links al
      JOIN public.affiliate_profiles ap ON ap.user_id = al.affiliate_user_id
      WHERE al.brand_id = affiliate_brands.id
        AND al.affiliate_user_id = auth.uid()
        AND ap.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins manage affiliate offers" ON public.affiliate_offers;
CREATE POLICY "Admins manage affiliate offers" ON public.affiliate_offers
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Affiliates read assigned offers" ON public.affiliate_offers;
CREATE POLICY "Affiliates read assigned offers" ON public.affiliate_offers
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.affiliate_links al
      JOIN public.affiliate_profiles ap ON ap.user_id = al.affiliate_user_id
      WHERE al.offer_id = affiliate_offers.id
        AND al.affiliate_user_id = auth.uid()
        AND ap.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins manage affiliate links" ON public.affiliate_links;
CREATE POLICY "Admins manage affiliate links" ON public.affiliate_links
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Affiliates read own links" ON public.affiliate_links;
CREATE POLICY "Affiliates read own links" ON public.affiliate_links
  FOR SELECT USING (
    affiliate_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.affiliate_profiles ap
      WHERE ap.user_id = auth.uid() AND ap.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins manage affiliate clicks" ON public.affiliate_clicks;
CREATE POLICY "Admins manage affiliate clicks" ON public.affiliate_clicks
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Affiliates read own clicks" ON public.affiliate_clicks;
CREATE POLICY "Affiliates read own clicks" ON public.affiliate_clicks
  FOR SELECT USING (affiliate_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage affiliate stats" ON public.affiliate_stats;
CREATE POLICY "Admins manage affiliate stats" ON public.affiliate_stats
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Affiliates read own stats" ON public.affiliate_stats;
CREATE POLICY "Affiliates read own stats" ON public.affiliate_stats
  FOR SELECT USING (affiliate_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage affiliate conversions" ON public.affiliate_conversions;
CREATE POLICY "Admins manage affiliate conversions" ON public.affiliate_conversions
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Affiliates read own conversions" ON public.affiliate_conversions;
CREATE POLICY "Affiliates read own conversions" ON public.affiliate_conversions
  FOR SELECT USING (affiliate_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage affiliate imports" ON public.affiliate_imports;
CREATE POLICY "Admins manage affiliate imports" ON public.affiliate_imports
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Admins manage affiliate import rows" ON public.affiliate_import_rows;
CREATE POLICY "Admins manage affiliate import rows" ON public.affiliate_import_rows
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Admins manage affiliate postbacks" ON public.affiliate_postback_events;
CREATE POLICY "Admins manage affiliate postbacks" ON public.affiliate_postback_events
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Admins read affiliate audit logs" ON public.affiliate_audit_logs;
CREATE POLICY "Admins read affiliate audit logs" ON public.affiliate_audit_logs
  FOR SELECT USING (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Admins insert affiliate audit logs" ON public.affiliate_audit_logs;
CREATE POLICY "Admins insert affiliate audit logs" ON public.affiliate_audit_logs
  FOR INSERT WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Admins manage affiliate notes" ON public.affiliate_admin_notes;
CREATE POLICY "Admins manage affiliate notes" ON public.affiliate_admin_notes
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins manage affiliate rollups" ON public.affiliate_daily_rollups;
CREATE POLICY "Admins manage affiliate rollups" ON public.affiliate_daily_rollups
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Affiliates read own affiliate rollups" ON public.affiliate_daily_rollups;
CREATE POLICY "Affiliates read own affiliate rollups" ON public.affiliate_daily_rollups
  FOR SELECT USING (affiliate_user_id = auth.uid());

COMMENT ON TABLE public.affiliate_clicks IS 'Privacy-safe redirect clicks. Raw IP addresses and raw user-agents are not stored.';
COMMENT ON TABLE public.affiliate_stats IS 'Partner-reported stats and commissions. These can differ from first-party tracked clicks.';
