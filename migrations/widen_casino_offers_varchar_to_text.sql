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
