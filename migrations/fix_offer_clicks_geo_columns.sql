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
