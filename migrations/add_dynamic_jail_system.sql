-- Add Dynamic Jail System
-- Tracks daily catches and adjusts jail chance based on player stats

-- Add columns for tracking daily catches
ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS daily_catches INTEGER DEFAULT 0;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS last_catch_reset DATE DEFAULT CURRENT_DATE;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS total_times_caught INTEGER DEFAULT 0;

-- Create index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_life_players_last_catch_reset ON the_life_players(last_catch_reset);

-- Function to reset daily catches at midnight
CREATE OR REPLACE FUNCTION reset_daily_catches()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_catch_reset IS NULL OR NEW.last_catch_reset < CURRENT_DATE THEN
    NEW.daily_catches := 0;
    NEW.last_catch_reset := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-reset daily catches on any player update
DROP TRIGGER IF EXISTS trigger_reset_daily_catches ON the_life_players;
CREATE TRIGGER trigger_reset_daily_catches
  BEFORE UPDATE ON the_life_players
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_catches();

-- Comment explaining the system
COMMENT ON COLUMN the_life_players.daily_catches IS 'Number of times player got caught today. Resets at midnight. Increases jail chance.';
COMMENT ON COLUMN the_life_players.last_catch_reset IS 'Last date daily_catches was reset. Used to track daily reset.';
COMMENT ON COLUMN the_life_players.total_times_caught IS 'Total lifetime catches. For stats tracking.';
