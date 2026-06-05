-- ═══════════════════════════════════════════════════════════════════
-- DROP ORPHANED TABLES (Round 5 — Final)
--
-- Run in Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- Only referenced in a doc file, not in actual src/ or api/ code
DROP TABLE IF EXISTS widget_state           CASCADE;

-- spotify_tokens is active (ProfileSection.jsx), but this separate
-- connections table has zero references anywhere
DROP TABLE IF EXISTS spotify_connections    CASCADE;

-- user_inventory joins 'items' (FK) but 'items' table was never created
-- (or was the_life_items, now dropped). ProfilePage.jsx query silently fails.
DROP TABLE IF EXISTS user_inventory         CASCADE;
DROP TABLE IF EXISTS items                  CASCADE;

-- ─── Twitch Extension tables (extension fully deleted) ───────────
DROP TABLE IF EXISTS ext_bh_prediction_entries  CASCADE;
DROP TABLE IF EXISTS ext_bh_predictions         CASCADE;
DROP TABLE IF EXISTS ext_bh_total_guess_entries CASCADE;
DROP TABLE IF EXISTS ext_bh_total_guess         CASCADE;
DROP TABLE IF EXISTS ext_live_bet_entries        CASCADE;
DROP TABLE IF EXISTS ext_live_bets              CASCADE;
DROP TABLE IF EXISTS ext_predictor_leaderboard  CASCADE;
DROP TABLE IF EXISTS ext_session_slots          CASCADE;
DROP TABLE IF EXISTS ext_slot_suggestions       CASCADE;
DROP TABLE IF EXISTS ext_slot_votes             CASCADE;
DROP TABLE IF EXISTS ext_stream_sessions        CASCADE;
DROP TABLE IF EXISTS ext_streamer_stats         CASCADE;
DROP TABLE IF EXISTS ext_viewer_points          CASCADE;
DROP TABLE IF EXISTS ext_wheel_spins            CASCADE;
DROP TABLE IF EXISTS ext_config                 CASCADE;

-- ─── Games removed ───────────────────────────────────────────────
DROP TABLE IF EXISTS blackjack_games        CASCADE;
DROP TABLE IF EXISTS mines_games            CASCADE;

-- ─── Verify: show remaining tables ───────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
