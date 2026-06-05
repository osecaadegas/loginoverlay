-- ══════════════════════════════════════════════════════════════
-- LANDING PAGE CUSTOMIZATION
-- Adds landing card display fields to casino_offers
-- Creates landing_pricing_plans table for admin-managed pricing
-- ══════════════════════════════════════════════════════════════

-- 1. New landing card columns on casino_offers
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS landing_tag TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS landing_tag_color TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS landing_model TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS landing_badges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS landing_accent_color TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS landing_logo_bg TEXT;

-- 2. Pricing plans table
CREATE TABLE IF NOT EXISTS landing_pricing_plans (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  price         TEXT NOT NULL,
  period        TEXT NOT NULL,
  sub_price     TEXT,
  badge         TEXT,
  badge_type    TEXT,          -- 'popular' | 'value' | NULL
  features      JSONB DEFAULT '[]'::jsonb,
  cta           TEXT DEFAULT 'Get Started',
  is_highlighted BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE landing_pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active plans"
  ON landing_pricing_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage plans"
  ON landing_pricing_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')));

-- 4. Seed default plans
INSERT INTO landing_pricing_plans
  (name, description, price, period, sub_price, badge, badge_type, features, cta, is_highlighted, display_order)
VALUES
  (
    'Starter',
    'Perfect for new streamers',
    '€15', '/month',
    NULL, NULL, NULL,
    '["All Overlay Center access","Basic widgets & themes","Email support","Regular updates"]'::jsonb,
    'Get Started', false, 1
  ),
  (
    'Creator',
    'For growing content creators',
    '€60', '/6 months',
    '€10,00 /month', 'MOST POPULAR', 'popular',
    '["All Starter features","Advanced widgets","Priority support","Early access to new features"]'::jsonb,
    'Choose Plan', true, 2
  ),
  (
    'Professional',
    'For full-time streamers',
    '€120', '/year',
    '€10,00 /month', 'BEST VALUE', 'value',
    '["All Creator features","Exclusive partnerships","Custom branding","Dedicated account manager"]'::jsonb,
    'Choose Plan', false, 3
  )
ON CONFLICT DO NOTHING;
