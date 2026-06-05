-- ═══════════════════════════════════════════════════════════════════
-- DROP REMAINING ORPHANED TABLES (Round 3)
--
-- All tables below have zero references in src/ or api/.
-- Run in Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Old game system (never queried directly) ────────────────────
DROP TABLE IF EXISTS game_leaderboard   CASCADE;
DROP TABLE IF EXISTS game_logs          CASCADE;
DROP TABLE IF EXISTS game_sessions      CASCADE;
DROP TABLE IF EXISTS game_statistics    CASCADE;
DROP TABLE IF EXISTS game_stats         CASCADE;

-- ─── Unused overlay tables ───────────────────────────────────────
-- NOTE: overlay_instances, overlay_state, overlay_themes,
--       overlay_widgets, shared_overlay_presets are KEPT (active).
DROP TABLE IF EXISTS overlay_events     CASCADE;
DROP TABLE IF EXISTS overlay_presets    CASCADE;

-- ─── Legacy users mirror (no FK or code usage) ───────────────────
DROP TABLE IF EXISTS users              CASCADE;

-- ─── Verify: show remaining tables ──────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
