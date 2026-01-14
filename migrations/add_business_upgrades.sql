-- Add upgrade system to businesses
ALTER TABLE the_life_player_businesses
ADD COLUMN IF NOT EXISTS upgrade_level INTEGER DEFAULT 1;

-- Add comment
COMMENT ON COLUMN the_life_player_businesses.upgrade_level IS 'Business upgrade level (1-10), increases production output';
