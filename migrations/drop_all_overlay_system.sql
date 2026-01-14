-- ============================================================================
-- DROP ALL OVERLAY AND BONUS HUNT SYSTEM
-- WARNING: This will delete all data permanently. No recovery possible.
-- ============================================================================

-- Drop all overlay-related tables
DROP TABLE IF EXISTS overlay_widgets CASCADE;
DROP TABLE IF EXISTS overlays CASCADE;
DROP TABLE IF EXISTS widget_types CASCADE;

-- Drop all bonus hunt tables
DROP TABLE IF EXISTS bonus_hunt_history CASCADE;
DROP TABLE IF EXISTS bonus_hunt_sessions CASCADE;
DROP TABLE IF EXISTS bonus_hunt_stats CASCADE;

-- Drop any indexes that might remain
DROP INDEX IF EXISTS idx_overlay_widgets_overlay_id;
DROP INDEX IF EXISTS idx_overlay_widgets_widget_type;
DROP INDEX IF EXISTS idx_overlays_user_id;
DROP INDEX IF EXISTS idx_overlays_public_id;
DROP INDEX IF EXISTS idx_bonus_hunt_history_session;
DROP INDEX IF EXISTS idx_bonus_hunt_history_user;
DROP INDEX IF EXISTS idx_bonus_hunt_sessions_user;
DROP INDEX IF EXISTS idx_bonus_hunt_sessions_status;
DROP INDEX IF EXISTS idx_bonus_hunt_sessions_active;
DROP INDEX IF EXISTS idx_bonus_hunt_stats_user;

-- Drop any functions related to overlays
DROP FUNCTION IF EXISTS generate_public_id() CASCADE;

COMMENT ON SCHEMA public IS 'Overlay system completely removed';
