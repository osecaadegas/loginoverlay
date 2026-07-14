-- Streamer Partnerships marketplace
-- Extends the existing casino_offers table instead of replacing it, so current
-- offer data and admin flows can migrate into the new marketplace safely.

ALTER TABLE public.casino_offers
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS partner_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS partnership_category TEXT DEFAULT 'casino',
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hot BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_direct_manager BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS streamer_balance_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS applications_close_at DATE,
  ADD COLUMN IF NOT EXISTS application_url TEXT,
  ADD COLUMN IF NOT EXISTS terms_url TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS deal_model TEXT,
  ADD COLUMN IF NOT EXISTS cpa_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cpa_currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS revenue_share_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS fixed_fee_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fixed_fee_currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS hybrid_terms TEXT,
  ADD COLUMN IF NOT EXISTS min_ftd_requirement INTEGER,
  ADD COLUMN IF NOT EXISTS minimum_deposit NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS minimum_deposit_currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS cookie_duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS payment_frequency TEXT,
  ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS player_promotion TEXT,
  ADD COLUMN IF NOT EXISTS traffic_requirements TEXT,
  ADD COLUMN IF NOT EXISTS restrictions TEXT,
  ADD COLUMN IF NOT EXISTS supported_geos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS supported_platforms JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS public_notes TEXT,
  ADD COLUMN IF NOT EXISTS private_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE public.casino_offers
SET
  slug = COALESCE(
    NULLIF(slug, ''),
    trim(both '-' from lower(regexp_replace(COALESCE(casino_name, 'partner'), '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || left(id::text, 8)
  ),
  cover_image_url = COALESCE(NULLIF(cover_image_url, ''), NULLIF(list_image_url, ''), NULLIF(image_url, '')),
  partner_logo_url = COALESCE(NULLIF(partner_logo_url, ''), NULLIF(image_url, ''), NULLIF(list_image_url, '')),
  short_description = COALESCE(NULLIF(short_description, ''), NULLIF(title, ''), NULLIF(details, '')),
  deal_model = COALESCE(NULLIF(deal_model, ''), NULLIF(landing_model, ''), 'Affiliate'),
  application_url = COALESCE(NULLIF(application_url, ''), NULLIF(bonus_link, '')),
  terms_url = COALESCE(NULLIF(terms_url, ''), NULLIF(bonus_link, '')),
  player_promotion = COALESCE(NULLIF(player_promotion, ''), NULLIF(welcome_bonus, ''), NULLIF(bonus_value, '')),
  is_featured = COALESCE(is_featured, false) OR lower(COALESCE(badge_class, '')) = 'featured' OR lower(COALESCE(badge, '')) LIKE '%featured%',
  is_exclusive = COALESCE(is_exclusive, false) OR lower(COALESCE(badge_class, '')) = 'exclusive' OR lower(COALESCE(badge, '')) LIKE '%exclusive%',
  is_new = COALESCE(is_new, false) OR lower(COALESCE(badge_class, '')) = 'new' OR lower(COALESCE(badge, '')) LIKE '%new%',
  is_hot = COALESCE(is_hot, false) OR lower(COALESCE(badge_class, '')) = 'hot' OR lower(COALESCE(badge, '')) LIKE '%hot%',
  visibility = COALESCE(NULLIF(visibility, ''), CASE WHEN COALESCE(is_premium, false) THEN 'premium' ELSE 'public' END),
  supported_geos = CASE
    WHEN supported_geos IS NULL OR supported_geos = '[]'::jsonb THEN '["PT","EU"]'::jsonb
    ELSE supported_geos
  END,
  supported_platforms = CASE
    WHEN supported_platforms IS NULL OR supported_platforms = '[]'::jsonb THEN '["Twitch","Kick","YouTube"]'::jsonb
    ELSE supported_platforms
  END,
  application_status = COALESCE(NULLIF(application_status, ''), 'open'),
  last_updated_at = COALESCE(last_updated_at, updated_at, created_at, NOW());

CREATE UNIQUE INDEX IF NOT EXISTS idx_casino_offers_slug_unique
  ON public.casino_offers (lower(slug))
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_casino_offers_partnership_category
  ON public.casino_offers(partnership_category)
  WHERE is_active = true AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_casino_offers_visibility
  ON public.casino_offers(visibility)
  WHERE is_active = true AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_casino_offers_featured_order
  ON public.casino_offers(is_featured DESC, display_order ASC)
  WHERE is_active = true AND archived_at IS NULL;

ALTER TABLE public.casino_offers
  DROP CONSTRAINT IF EXISTS casino_offers_visibility_check,
  ADD CONSTRAINT casino_offers_visibility_check
    CHECK (visibility IN ('public', 'registered', 'premium', 'admin', 'hidden')) NOT VALID;

ALTER TABLE public.casino_offers
  DROP CONSTRAINT IF EXISTS casino_offers_application_status_check,
  ADD CONSTRAINT casino_offers_application_status_check
    CHECK (application_status IN ('draft', 'open', 'limited', 'closed')) NOT VALID;

ALTER TABLE public.casino_offers
  DROP CONSTRAINT IF EXISTS casino_offers_partnership_category_check,
  ADD CONSTRAINT casino_offers_partnership_category_check
    CHECK (partnership_category IN ('casino', 'gaming', 'streaming_tools', 'creator_services')) NOT VALID;

ALTER TABLE public.casino_offers
  DROP CONSTRAINT IF EXISTS casino_offers_percentages_check,
  ADD CONSTRAINT casino_offers_percentages_check
    CHECK (
      (revenue_share_percent IS NULL OR revenue_share_percent BETWEEN 0 AND 100)
      AND (cpa_amount IS NULL OR cpa_amount >= 0)
      AND (fixed_fee_amount IS NULL OR fixed_fee_amount >= 0)
      AND (minimum_deposit IS NULL OR minimum_deposit >= 0)
      AND (min_ftd_requirement IS NULL OR min_ftd_requirement >= 0)
      AND (cookie_duration_days IS NULL OR cookie_duration_days >= 0)
    ) NOT VALID;

ALTER TABLE public.casino_offers
  DROP CONSTRAINT IF EXISTS casino_offers_partnership_urls_check,
  ADD CONSTRAINT casino_offers_partnership_urls_check
    CHECK (
      (application_url IS NULL OR application_url = '' OR application_url ~* '^https?://')
      AND (terms_url IS NULL OR terms_url = '' OR terms_url ~* '^https?://')
      AND (partner_logo_url IS NULL OR partner_logo_url = '' OR partner_logo_url ~* '^https?://')
      AND (cover_image_url IS NULL OR cover_image_url = '' OR cover_image_url ~* '^https?://')
    ) NOT VALID;

COMMENT ON COLUMN public.casino_offers.partnership_category IS 'Marketplace category: casino, gaming, streaming_tools, creator_services.';
COMMENT ON COLUMN public.casino_offers.visibility IS 'Visibility: public, registered, premium, admin, hidden.';
COMMENT ON COLUMN public.casino_offers.private_notes IS 'Confidential admin-only partnership notes. Never expose in public clients.';
COMMENT ON COLUMN public.casino_offers.supported_geos IS 'JSON array of supported countries or GEO labels.';
COMMENT ON COLUMN public.casino_offers.supported_platforms IS 'JSON array of supported streamer platforms and traffic sources.';

DROP POLICY IF EXISTS "Anyone can view active casino offers" ON public.casino_offers;
DROP POLICY IF EXISTS "Public can view public active partnerships" ON public.casino_offers;
CREATE POLICY "Public can view public active partnerships"
  ON public.casino_offers
  FOR SELECT
  USING (
    is_active = true
    AND archived_at IS NULL
    AND COALESCE(visibility, 'public') = 'public'
  );

DROP POLICY IF EXISTS "Registered users can view registered partnerships" ON public.casino_offers;
CREATE POLICY "Registered users can view registered partnerships"
  ON public.casino_offers
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND is_active = true
    AND archived_at IS NULL
    AND COALESCE(visibility, 'public') IN ('public', 'registered')
  );

DROP POLICY IF EXISTS "Premium users can view premium partnerships" ON public.casino_offers;
CREATE POLICY "Premium users can view premium partnerships"
  ON public.casino_offers
  FOR SELECT
  USING (
    is_active = true
    AND archived_at IS NULL
    AND COALESCE(visibility, 'public') IN ('public', 'registered', 'premium')
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('premium', 'admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );

CREATE TABLE IF NOT EXISTS public.partnership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.casino_offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted',
  message TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (offer_id, user_id),
  CONSTRAINT partnership_applications_status_check
    CHECK (status IN ('draft', 'submitted', 'under_review', 'more_information_required', 'approved', 'rejected', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_partnership_applications_offer
  ON public.partnership_applications(offer_id);

CREATE INDEX IF NOT EXISTS idx_partnership_applications_user
  ON public.partnership_applications(user_id);

CREATE OR REPLACE FUNCTION public.update_partnership_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_partnership_applications_updated_at ON public.partnership_applications;
CREATE TRIGGER set_partnership_applications_updated_at
  BEFORE UPDATE ON public.partnership_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_partnership_applications_updated_at();

ALTER TABLE public.partnership_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own partnership applications" ON public.partnership_applications;
CREATE POLICY "Users can view own partnership applications"
  ON public.partnership_applications
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own partnership applications" ON public.partnership_applications;
CREATE POLICY "Users can create own partnership applications"
  ON public.partnership_applications
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can manage partnership applications" ON public.partnership_applications;
CREATE POLICY "Admins can manage partnership applications"
  ON public.partnership_applications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );
