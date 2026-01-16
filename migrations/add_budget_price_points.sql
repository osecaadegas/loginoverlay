-- Add budget_price_points column to season_pass_seasons
-- This defines the SE Points cost for the Budget track

ALTER TABLE season_pass_seasons 
ADD COLUMN IF NOT EXISTS budget_price_points INTEGER DEFAULT 5000;

-- Add comment for clarity
COMMENT ON COLUMN season_pass_seasons.budget_price_points IS 'SE Points cost for Budget track access';
