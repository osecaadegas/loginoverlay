-- Add Power, Intelligence, and Defense stats to the_life_players table
ALTER TABLE the_life_players
ADD COLUMN IF NOT EXISTS power INTEGER DEFAULT 0 CHECK (power >= 0 AND power <= 100),
ADD COLUMN IF NOT EXISTS intelligence INTEGER DEFAULT 0 CHECK (intelligence >= 0 AND intelligence <= 100),
ADD COLUMN IF NOT EXISTS defense INTEGER DEFAULT 0 CHECK (defense >= 0 AND defense <= 100);

-- Update existing players to have starting stats
UPDATE the_life_players
SET 
  power = 10,
  intelligence = 10,
  defense = 10
WHERE power IS NULL OR intelligence IS NULL OR defense IS NULL;
