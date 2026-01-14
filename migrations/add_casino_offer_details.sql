-- Add additional fields for casino offers
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS game_providers VARCHAR(255),
ADD COLUMN IF NOT EXISTS total_games VARCHAR(50),
ADD COLUMN IF NOT EXISTS license VARCHAR(100),
ADD COLUMN IF NOT EXISTS welcome_bonus TEXT;

COMMENT ON COLUMN casino_offers.game_providers IS 'Number of game providers (e.g., "90+")';
COMMENT ON COLUMN casino_offers.total_games IS 'Total number of games available (e.g., "5000+")';
COMMENT ON COLUMN casino_offers.license IS 'License location (e.g., "Curaçao", "Malta")';
COMMENT ON COLUMN casino_offers.welcome_bonus IS 'Welcome bonus details';
