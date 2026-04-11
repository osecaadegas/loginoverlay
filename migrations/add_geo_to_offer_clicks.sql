-- Add geolocation columns to offer_clicks
ALTER TABLE offer_clicks ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE offer_clicks ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE offer_clicks ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE offer_clicks ADD COLUMN IF NOT EXISTS city TEXT;
