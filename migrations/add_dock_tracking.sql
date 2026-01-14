-- Add dock shipment tracking fields to the_life_players table
ALTER TABLE the_life_players
ADD COLUMN IF NOT EXISTS dock_uses_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_dock_date TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN the_life_players.dock_uses_today IS 'Number of dock shipments made today (max 2)';
COMMENT ON COLUMN the_life_players.last_dock_date IS 'Last date the player used the docks';
