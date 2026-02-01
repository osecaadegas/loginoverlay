-- Add wipe_player_progress column to wipe settings table
ALTER TABLE the_life_wipe_settings 
ADD COLUMN IF NOT EXISTS wipe_player_progress BOOLEAN DEFAULT false;

COMMENT ON COLUMN the_life_wipe_settings.wipe_player_progress IS 'Full leaderboard reset - wipes level, xp, cash, bank_balance, pvp_wins, pvp_losses, total_robberies, total_crimes';
