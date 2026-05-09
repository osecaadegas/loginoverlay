-- ============================================================
-- FIX OFFER_CLICKS TABLE - ADD MISSING GEO COLUMNS
-- ============================================================
-- The offer_clicks table is missing geo location columns
-- that the code is trying to insert and display
-- ============================================================

-- Add missing columns to offer_clicks table
ALTER TABLE offer_clicks 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add indexes for the new columns to improve analytics query performance
CREATE INDEX IF NOT EXISTS idx_offer_clicks_country ON offer_clicks(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offer_clicks_city ON offer_clicks(city) WHERE city IS NOT NULL;

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
