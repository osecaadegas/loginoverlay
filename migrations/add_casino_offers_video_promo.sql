-- Add video_url and promo_code columns to casino_offers
-- Run this in Supabase SQL Editor

ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS promo_code VARCHAR(100);

COMMENT ON COLUMN casino_offers.video_url IS 'Direct .mp4 link for the offer promo video';
COMMENT ON COLUMN casino_offers.promo_code IS 'Optional promo/bonus code to display on the offer';
