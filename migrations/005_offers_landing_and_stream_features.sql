-- Consolidated migration: 005_offers_landing_and_stream_features.sql
-- Generated from active source migrations retained after cleanup

-- ============================================================================
-- Source: create_casino_offers.sql
-- ============================================================================
-- Create casino_offers table
CREATE TABLE IF NOT EXISTS casino_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  casino_name VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  bonus_link TEXT NOT NULL,
  badge VARCHAR(50),
  badge_class VARCHAR(50),
  min_deposit VARCHAR(50),
  cashback VARCHAR(50),
  bonus_value VARCHAR(50),
  free_spins VARCHAR(100),
  is_premium BOOLEAN DEFAULT false,
  details TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index on is_active for faster queries
CREATE INDEX idx_casino_offers_active ON casino_offers(is_active);
CREATE INDEX idx_casino_offers_order ON casino_offers(display_order);

-- Enable Row Level Security
ALTER TABLE casino_offers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active offers
CREATE POLICY "Anyone can view active casino offers"
  ON casino_offers
  FOR SELECT
  USING (is_active = true);

-- Policy: Admins can view all offers
CREATE POLICY "Admins can view all casino offers"
  ON casino_offers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert offers
CREATE POLICY "Admins can insert casino offers"
  ON casino_offers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update offers
CREATE POLICY "Admins can update casino offers"
  ON casino_offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can delete offers
CREATE POLICY "Admins can delete casino offers"
  ON casino_offers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_casino_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_casino_offers_updated_at
  BEFORE UPDATE ON casino_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_casino_offers_updated_at();

-- ============================================================================
-- Source: add_casino_offer_details.sql
-- ============================================================================
-- Add additional fields for casino offers
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS game_providers VARCHAR(255),
ADD COLUMN IF NOT EXISTS total_games VARCHAR(50),
ADD COLUMN IF NOT EXISTS license VARCHAR(100),
ADD COLUMN IF NOT EXISTS welcome_bonus TEXT;

COMMENT ON COLUMN casino_offers.game_providers IS 'Number of game providers (e.g., "90+")';
COMMENT ON COLUMN casino_offers.total_games IS 'Total number of games available (e.g., "5000+")';
COMMENT ON COLUMN casino_offers.license IS 'License location (e.g., "Cura├ºao", "Malta")';
COMMENT ON COLUMN casino_offers.welcome_bonus IS 'Welcome bonus details';

-- ============================================================================
-- Source: add_casino_offers_extended_fields.sql
-- ============================================================================
-- Add extended fields to casino_offers table for detailed info modal
-- Run this migration in your Supabase SQL editor

-- Add new columns for extended casino info
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS game_providers JSONB DEFAULT '[]';
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS total_games VARCHAR(50);
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS license VARCHAR(100);
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS deposit_methods JSONB;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS vpn_friendly BOOLEAN DEFAULT false;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS max_withdrawal VARCHAR(100);
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS withdrawal_time VARCHAR(100);
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS crypto_friendly BOOLEAN DEFAULT true;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS live_support VARCHAR(50) DEFAULT '24/7';
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS established VARCHAR(10);
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS languages TEXT DEFAULT 'English';
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '["Exclusive offer", "VIP program", "Big bonuses"]';
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS welcome_bonus TEXT;

-- Add comments for clarity
COMMENT ON COLUMN casino_offers.game_providers IS 'Array of game provider slugs, e.g. ["pragmatic-play", "hacksaw", "evolution"]';
COMMENT ON COLUMN casino_offers.total_games IS 'Total number of games, e.g. "15000+"';
COMMENT ON COLUMN casino_offers.license IS 'License jurisdiction, e.g. "Cura├ºao", "Malta MGA"';
COMMENT ON COLUMN casino_offers.deposit_methods IS 'String or array of deposit methods';
COMMENT ON COLUMN casino_offers.max_withdrawal IS 'Maximum withdrawal, e.g. "Ôé¼5,000 per week"';
COMMENT ON COLUMN casino_offers.withdrawal_time IS 'Withdrawal processing time, e.g. "Up to 24h"';
COMMENT ON COLUMN casino_offers.crypto_friendly IS 'Whether the casino accepts crypto';
COMMENT ON COLUMN casino_offers.live_support IS 'Live support availability, e.g. "24/7"';
COMMENT ON COLUMN casino_offers.established IS 'Year established, e.g. "2024"';
COMMENT ON COLUMN casino_offers.languages IS 'Supported languages';
COMMENT ON COLUMN casino_offers.highlights IS 'Array of highlight strings for the offer row';

-- Example update for existing casinos (customize as needed):
-- UPDATE casino_offers SET
--   game_providers = '["pragmatic-play", "hacksaw", "evolution", "netent", "quickspin"]',
--   total_games = '15000+',
--   license = 'Cura├ºao',
--   max_withdrawal = 'Ôé¼5,000 per week',
--   withdrawal_time = 'Up to 24h',
--   crypto_friendly = true,
--   live_support = '24/7',
--   established = '2024',
--   languages = 'English',
--   highlights = '["Crypto friendly", "Wide game selection", "24/7 support"]'
-- WHERE casino_name = 'YourCasinoName';

-- ============================================================================
-- Source: add_casino_offers_extra_fields.sql
-- ============================================================================
-- Add missing casino detail columns to casino_offers
-- Run this in Supabase SQL Editor

ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS max_withdrawal TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS withdrawal_time TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS crypto_friendly BOOLEAN DEFAULT true;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS live_support TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS established TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS languages TEXT;

COMMENT ON COLUMN casino_offers.max_withdrawal IS 'Max withdrawal amount, e.g. Ôé¼5,000/week';
COMMENT ON COLUMN casino_offers.withdrawal_time IS 'Withdrawal processing time, e.g. Up to 24h';
COMMENT ON COLUMN casino_offers.crypto_friendly IS 'Whether the casino accepts cryptocurrency';
COMMENT ON COLUMN casino_offers.live_support IS 'Live support availability, e.g. 24/7';
COMMENT ON COLUMN casino_offers.established IS 'Year the casino was established';
COMMENT ON COLUMN casino_offers.languages IS 'Supported languages, e.g. English, Portuguese';

-- ============================================================================
-- Source: add_casino_offers_video_promo.sql
-- ============================================================================
-- Add video_url and promo_code columns to casino_offers
-- Run this in Supabase SQL Editor

ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS promo_code VARCHAR(100);

COMMENT ON COLUMN casino_offers.video_url IS 'Direct .mp4 link for the offer promo video';
COMMENT ON COLUMN casino_offers.promo_code IS 'Optional promo/bonus code to display on the offer';

-- ============================================================================
-- Source: add_list_image_url_to_casino_offers.sql
-- ============================================================================
-- Add list_image_url column to casino_offers table for list view images
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS list_image_url TEXT;

COMMENT ON COLUMN casino_offers.list_image_url IS 'Image URL for list view display (landing page offers list)';

-- ============================================================================
-- Source: add_bonus_link_to_casino_offers.sql
-- ============================================================================
-- Add bonus_link column to existing casino_offers table
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS bonus_link TEXT;

-- Update existing rows to have a default value (you can change these later in admin panel)
UPDATE casino_offers 
SET bonus_link = 'https://example.com' 
WHERE bonus_link IS NULL;

-- Make the column required for new entries
ALTER TABLE casino_offers 
ALTER COLUMN bonus_link SET NOT NULL;

-- ============================================================================
-- Source: add_deposit_methods.sql
-- ============================================================================
-- Add deposit_methods column to casino_offers table
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS deposit_methods TEXT;

COMMENT ON COLUMN casino_offers.deposit_methods IS 'Comma-separated list of accepted deposit methods (e.g., "Visa, Mastercard, Bitcoin, Skrill")';

-- ============================================================================
-- Source: widen_casino_offers_varchar_to_text.sql
-- ============================================================================
-- Widen restrictive VARCHAR columns to TEXT to prevent "value too long" errors
-- Run this in your Supabase SQL editor

ALTER TABLE casino_offers ALTER COLUMN casino_name TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN badge TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN badge_class TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN min_deposit TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN cashback TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN bonus_value TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN free_spins TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN total_games TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN license TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN max_withdrawal TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN withdrawal_time TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN live_support TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN established TYPE TEXT;
ALTER TABLE casino_offers ALTER COLUMN promo_code TYPE TEXT;

-- ============================================================================
-- Source: add_vpn_friendly.sql
-- ============================================================================
-- Add vpn_friendly column to casino_offers table
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS vpn_friendly BOOLEAN DEFAULT false;

COMMENT ON COLUMN casino_offers.vpn_friendly IS 'Indicates if the casino accepts VPN connections';

-- ============================================================================
-- Source: offer_click_tracking.sql
-- ============================================================================
-- offer_click_tracking.sql
-- Tracks every click on casino offer cards

CREATE TABLE IF NOT EXISTS offer_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id      UUID NOT NULL REFERENCES casino_offers(id) ON DELETE CASCADE,
  casino_name   TEXT,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  se_username   TEXT,
  twitch_username TEXT,
  ip_address    INET,
  user_agent    TEXT,
  page_source   TEXT DEFAULT 'offers',   -- 'offers', 'landing', 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_offer_clicks_offer   ON offer_clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_created ON offer_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_ip      ON offer_clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_user    ON offer_clicks(user_id) WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE offer_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (track clicks)
CREATE POLICY "Anyone can log a click"
  ON offer_clicks FOR INSERT
  WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can read click analytics"
  ON offer_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- Source: add_geo_to_offer_clicks.sql
-- ============================================================================
-- Add geolocation columns to offer_clicks
ALTER TABLE offer_clicks ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE offer_clicks ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE offer_clicks ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE offer_clicks ADD COLUMN IF NOT EXISTS city TEXT;

-- ============================================================================
-- Source: fix_offer_clicks_geo_columns.sql
-- ============================================================================
-- ============================================================
-- CREATE OFFER_CLICKS TABLE WITH GEO COLUMNS
-- ============================================================
-- Complete table creation with all required columns
-- Run this ONCE to set up the offer click tracking system
-- ============================================================

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS offer_clicks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        UUID NOT NULL REFERENCES casino_offers(id) ON DELETE CASCADE,
  casino_name     TEXT,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  se_username     TEXT,
  twitch_username TEXT,
  ip_address      INET,
  country         TEXT,
  country_code    TEXT,
  region          TEXT,
  city            TEXT,
  user_agent      TEXT,
  page_source     TEXT DEFAULT 'offers',   -- 'offers', 'landing', 'admin'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add geo columns if table already exists (migration safe)
ALTER TABLE offer_clicks 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Create indexes for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_offer_clicks_offer   ON offer_clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_created ON offer_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_ip      ON offer_clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_user    ON offer_clicks(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offer_clicks_country ON offer_clicks(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offer_clicks_city    ON offer_clicks(city) WHERE city IS NOT NULL;

-- Enable RLS
ALTER TABLE offer_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can log a click" ON offer_clicks;
CREATE POLICY "Anyone can log a click"
  ON offer_clicks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read click analytics" ON offer_clicks;
CREATE POLICY "Admins can read click analytics"
  ON offer_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- Run this after the migration to verify the schema is correct

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'offer_clicks'
ORDER BY ordinal_position;

-- Check if any existing clicks have NULL geo data (they probably all do)
SELECT 
    COUNT(*) as total_clicks,
    COUNT(country) as clicks_with_country,
    COUNT(ip_address) as clicks_with_ip,
    COUNT(*) - COUNT(country) as clicks_missing_geo
FROM offer_clicks;

-- ============================================================
-- OPTIONAL: BACKFILL GEO DATA FOR EXISTING CLICKS
-- ============================================================
-- If you want to backfill geo data for existing clicks with IP addresses,
-- you would need to create a function that calls the geo API
-- This is optional and can be done later if needed
-- For now, new clicks will have geo data automatically

-- ============================================================================
-- Source: add_landing_page_customization.sql
-- ============================================================================
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- LANDING PAGE CUSTOMIZATION
-- Adds landing card display fields to casino_offers
-- Creates landing_pricing_plans table for admin-managed pricing
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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
    'Ôé¼15', '/month',
    NULL, NULL, NULL,
    '["All Overlay Center access","Basic widgets & themes","Email support","Regular updates"]'::jsonb,
    'Get Started', false, 1
  ),
  (
    'Creator',
    'For growing content creators',
    'Ôé¼60', '/6 months',
    'Ôé¼10,00 /month', 'MOST POPULAR', 'popular',
    '["All Starter features","Advanced widgets","Priority support","Early access to new features"]'::jsonb,
    'Choose Plan', true, 2
  ),
  (
    'Professional',
    'For full-time streamers',
    'Ôé¼120', '/year',
    'Ôé¼10,00 /month', 'BEST VALUE', 'value',
    '["All Creator features","Exclusive partnerships","Custom branding","Dedicated account manager"]'::jsonb,
    'Choose Plan', false, 3
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Source: add_pricing_annual_fields.sql
-- ============================================================================
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- PRICING PLAN ANNUAL BILLING FIELDS
-- Adds annual price columns to landing_pricing_plans
-- so the Monthly/Annual toggle on the landing page works
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

ALTER TABLE landing_pricing_plans ADD COLUMN IF NOT EXISTS price_annual     TEXT;
ALTER TABLE landing_pricing_plans ADD COLUMN IF NOT EXISTS period_annual    TEXT;
ALTER TABLE landing_pricing_plans ADD COLUMN IF NOT EXISTS sub_price_annual TEXT;

-- ============================================================================
-- Source: add_landing_partner_controls.sql
-- ============================================================================
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- LANDING PARTNER CARD CONTROLS
-- Adds show_on_landing and landing_order to casino_offers
-- so admins can control which offers appear on the landing page
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS show_on_landing BOOLEAN DEFAULT false;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS landing_order   INTEGER DEFAULT 0;

-- Optional: enable the first 5 active offers by default so the
-- landing page doesn't go blank before you configure them.
-- Comment this out if you want to start with a blank slate.
UPDATE casino_offers
SET show_on_landing = true
WHERE id IN (
  SELECT id FROM casino_offers
  WHERE is_active = true
  ORDER BY display_order ASC
  LIMIT 5
);

-- ============================================================================
-- Source: create_stream_highlights.sql
-- ============================================================================
-- Create stream_highlights table
CREATE TABLE IF NOT EXISTS stream_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration VARCHAR(10), -- e.g., "0:30", "1:00"
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE stream_highlights ENABLE ROW LEVEL SECURITY;

-- Allow public to read active highlights
CREATE POLICY "Anyone can view active highlights"
  ON stream_highlights
  FOR SELECT
  USING (is_active = true);

-- Admin can manage all highlights
CREATE POLICY "Admins can manage highlights"
  ON stream_highlights
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'owner')
      AND user_roles.is_active = true
    )
  );

-- Create index for performance
CREATE INDEX idx_stream_highlights_active ON stream_highlights(is_active, created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_stream_highlights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stream_highlights_updated_at
  BEFORE UPDATE ON stream_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_stream_highlights_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_highlight_views(highlight_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE stream_highlights
  SET view_count = view_count + 1
  WHERE id = highlight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Source: add_clip_video_url.sql
-- ============================================================================
-- Add direct .mp4 video URL column to shoutout_alerts
-- This is resolved server-side by the API via HEAD request to bypass CORS
ALTER TABLE shoutout_alerts ADD COLUMN IF NOT EXISTS clip_video_url TEXT;

-- ============================================================================
-- Source: add_shoutout_alerts.sql
-- ============================================================================
-- ============================================================
-- Raid Shoutout Alerts System
-- Stores triggered shoutout alerts with raider info + clip data.
-- The overlay widget subscribes to this table via Supabase Realtime.
-- ============================================================

-- 1. Create the shoutout_alerts table
CREATE TABLE IF NOT EXISTS shoutout_alerts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Raider info (from Twitch API)
  raider_username     TEXT NOT NULL,
  raider_display_name TEXT,
  raider_avatar_url   TEXT,
  raider_game         TEXT,           -- last game the raider was streaming

  -- Clip info (from Twitch API /helix/clips)
  clip_id             TEXT,
  clip_url            TEXT,
  clip_embed_url      TEXT,
  clip_thumbnail_url  TEXT,
  clip_title          TEXT,
  clip_duration       REAL,           -- seconds
  clip_view_count     INTEGER,
  clip_game_name      TEXT,

  -- Alert lifecycle
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | shown | dismissed
  triggered_by  TEXT DEFAULT 'manual',             -- manual | chat_command | auto_raid
  shown_at      TIMESTAMPTZ,
  dismissed_at  TIMESTAMPTZ,

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for fast lookups by user + status
CREATE INDEX IF NOT EXISTS idx_shoutout_alerts_user_status
  ON shoutout_alerts (user_id, status, created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE shoutout_alerts ENABLE ROW LEVEL SECURITY;

-- Users can read their own alerts
CREATE POLICY "Users can read own shoutout alerts"
  ON shoutout_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update (API endpoints use service role)
CREATE POLICY "Service role full access on shoutout alerts"
  ON shoutout_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Enable Realtime for this table (required for live overlay updates)
ALTER PUBLICATION supabase_realtime ADD TABLE shoutout_alerts;

-- 5. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shoutout_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shoutout_alerts_updated_at
  BEFORE UPDATE ON shoutout_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_shoutout_alerts_updated_at();
