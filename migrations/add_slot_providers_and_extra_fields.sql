-- Create slot_providers table for managing provider logos
-- Run this in Supabase SQL Editor

-- Providers table
CREATE TABLE IF NOT EXISTS slot_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  slot_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE slot_providers ENABLE ROW LEVEL SECURITY;

-- Everyone can read providers
CREATE POLICY "Anyone can read providers" ON slot_providers
  FOR SELECT USING (true);

-- Only admins / slot_modders can modify
CREATE POLICY "Admins can manage providers" ON slot_providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'slot_modder')
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_slot_providers_name ON slot_providers(name);
CREATE INDEX IF NOT EXISTS idx_slot_providers_slug ON slot_providers(slug);

-- Seed from existing slots (populate from distinct providers already in DB)
INSERT INTO slot_providers (name, slug, logo_url)
SELECT DISTINCT
  provider AS name,
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(provider, '[^a-zA-Z0-9 ]', '', 'g'), '\s+', '-', 'g')) AS slug,
  NULL AS logo_url
FROM slots
WHERE provider IS NOT NULL AND provider != ''
ON CONFLICT (name) DO NOTHING;

-- Function to update provider slot counts
CREATE OR REPLACE FUNCTION update_provider_slot_counts()
RETURNS void AS $$
BEGIN
  UPDATE slot_providers sp
  SET slot_count = (
    SELECT COUNT(*) FROM slots s
    WHERE s.provider = sp.name
    AND s.status = 'live'
  );
END;
$$ LANGUAGE plpgsql;

-- Run initial count
SELECT update_provider_slot_counts();

-- Add min_bet and max_bet to slots if not already there
ALTER TABLE slots ADD COLUMN IF NOT EXISTS min_bet DECIMAL(10,2) DEFAULT 0.10;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS max_bet DECIMAL(10,2) DEFAULT 100.00;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]';
ALTER TABLE slots ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE slots ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS paylines TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS theme TEXT;

COMMENT ON COLUMN slots.min_bet IS 'Minimum bet amount';
COMMENT ON COLUMN slots.max_bet IS 'Maximum bet amount';
COMMENT ON COLUMN slots.features IS 'JSON array of features like ["Free Spins","Multiplier","Buy Bonus"]';
COMMENT ON COLUMN slots.tags IS 'Text array of tags for categorization';
COMMENT ON COLUMN slots.description IS 'Slot description/summary';
COMMENT ON COLUMN slots.release_date IS 'Slot release date';
COMMENT ON COLUMN slots.paylines IS 'Number of paylines or Megaways etc.';
COMMENT ON COLUMN slots.theme IS 'Slot theme like Egyptian, Fruits, etc.';
