-- Add missing casino detail columns to casino_offers
-- Run this in Supabase SQL Editor

ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS max_withdrawal TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS withdrawal_time TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS crypto_friendly BOOLEAN DEFAULT true;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS live_support TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS established TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS languages TEXT;

COMMENT ON COLUMN casino_offers.max_withdrawal IS 'Max withdrawal amount, e.g. €5,000/week';
COMMENT ON COLUMN casino_offers.withdrawal_time IS 'Withdrawal processing time, e.g. Up to 24h';
COMMENT ON COLUMN casino_offers.crypto_friendly IS 'Whether the casino accepts cryptocurrency';
COMMENT ON COLUMN casino_offers.live_support IS 'Live support availability, e.g. 24/7';
COMMENT ON COLUMN casino_offers.established IS 'Year the casino was established';
COMMENT ON COLUMN casino_offers.languages IS 'Supported languages, e.g. English, Portuguese';
