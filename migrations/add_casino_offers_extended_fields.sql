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
COMMENT ON COLUMN casino_offers.license IS 'License jurisdiction, e.g. "Curaçao", "Malta MGA"';
COMMENT ON COLUMN casino_offers.deposit_methods IS 'String or array of deposit methods';
COMMENT ON COLUMN casino_offers.max_withdrawal IS 'Maximum withdrawal, e.g. "€5,000 per week"';
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
--   license = 'Curaçao',
--   max_withdrawal = '€5,000 per week',
--   withdrawal_time = 'Up to 24h',
--   crypto_friendly = true,
--   live_support = '24/7',
--   established = '2024',
--   languages = 'English',
--   highlights = '["Crypto friendly", "Wide game selection", "24/7 support"]'
-- WHERE casino_name = 'YourCasinoName';
