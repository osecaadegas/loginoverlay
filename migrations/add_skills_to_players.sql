-- Add skill columns to the_life_players table
-- Players can upgrade Power, Intelligence, and Defense

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS power INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS intelligence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS defense INTEGER DEFAULT 0;

-- Create index for skill lookups
CREATE INDEX IF NOT EXISTS idx_player_skills ON the_life_players(power, intelligence, defense);
