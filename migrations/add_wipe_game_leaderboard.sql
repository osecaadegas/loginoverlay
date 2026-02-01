-- Add wipe_game_leaderboard column to wipe settings table
ALTER TABLE the_life_wipe_settings
ADD COLUMN IF NOT EXISTS wipe_game_leaderboard BOOLEAN DEFAULT false;

COMMENT ON COLUMN the_life_wipe_settings.wipe_game_leaderboard IS 'Whether to wipe the game leaderboard and history during server wipe';
