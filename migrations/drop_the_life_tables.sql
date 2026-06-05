-- ═══════════════════════════════════════════════════════════════════
-- DROP ALL "THE LIFE" TABLES
-- 
-- Removes every table, function, and RPC introduced by the game.
-- Run in Supabase → SQL Editor.
-- CASCADE handles FK dependencies automatically.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Roulette (references the_life_players) ──────────────────────
DROP TABLE IF EXISTS roulette_player_stats     CASCADE;
DROP TABLE IF EXISTS roulette_chat             CASCADE;
DROP TABLE IF EXISTS roulette_history          CASCADE;
DROP TABLE IF EXISTS roulette_bets             CASCADE;
DROP TABLE IF EXISTS roulette_game_state       CASCADE;

-- ─── PVP / Social ────────────────────────────────────────────────
DROP TABLE IF EXISTS the_life_pvp_chat         CASCADE;
DROP TABLE IF EXISTS the_life_pvp_presence     CASCADE;
DROP TABLE IF EXISTS the_life_pvp_logs         CASCADE;

-- ─── Inventory & Items ───────────────────────────────────────────
DROP TABLE IF EXISTS the_life_player_inventory CASCADE;
DROP TABLE IF EXISTS the_life_crime_drops      CASCADE;
DROP TABLE IF EXISTS the_life_avatars          CASCADE;
DROP TABLE IF EXISTS the_life_items            CASCADE;

-- ─── Business system ─────────────────────────────────────────────
DROP TABLE IF EXISTS the_life_business_productions      CASCADE;
DROP TABLE IF EXISTS the_life_business_required_items   CASCADE;
DROP TABLE IF EXISTS the_life_player_businesses         CASCADE;
DROP TABLE IF EXISTS the_life_businesses                CASCADE;

-- ─── Brothel system ──────────────────────────────────────────────
DROP TABLE IF EXISTS the_life_player_brothel_workers    CASCADE;
DROP TABLE IF EXISTS the_life_brothel_workers           CASCADE;
DROP TABLE IF EXISTS the_life_brothels                  CASCADE;

-- ─── Docks & Boats ───────────────────────────────────────────────
DROP TABLE IF EXISTS the_life_dock_shipments   CASCADE;
DROP TABLE IF EXISTS the_life_dock_boats       CASCADE;

-- ─── Store / Economy ─────────────────────────────────────────────
DROP TABLE IF EXISTS the_life_store_items      CASCADE;

-- ─── Crimes & Robberies ──────────────────────────────────────────
DROP TABLE IF EXISTS the_life_robbery_history  CASCADE;
DROP TABLE IF EXISTS the_life_robberies        CASCADE;
DROP TABLE IF EXISTS the_life_drug_ops         CASCADE;

-- ─── News / Events / Misc ────────────────────────────────────────
DROP TABLE IF EXISTS the_life_news_feed        CASCADE;
DROP TABLE IF EXISTS the_life_event_messages   CASCADE;
DROP TABLE IF EXISTS the_life_action_cooldowns CASCADE;
DROP TABLE IF EXISTS the_life_category_info    CASCADE;

-- ─── Season Wipe system ──────────────────────────────────────────
DROP TABLE IF EXISTS the_life_wipe_table_config CASCADE;
DROP TABLE IF EXISTS the_life_wipe_backups      CASCADE;
DROP TABLE IF EXISTS the_life_wipe_history      CASCADE;
DROP TABLE IF EXISTS the_life_wipe_settings     CASCADE;
DROP TABLE IF EXISTS the_life_system_locks      CASCADE;

-- ─── Market / Trading / Stocks ───────────────────────────────────
DROP TABLE IF EXISTS the_life_trade_offers          CASCADE;
DROP TABLE IF EXISTS the_life_market_transactions   CASCADE;
DROP TABLE IF EXISTS the_life_market_listings       CASCADE;
DROP TABLE IF EXISTS the_life_stock_transactions    CASCADE;
DROP TABLE IF EXISTS the_life_stock_portfolios      CASCADE;

-- ─── Security / Metrics / Flags ──────────────────────────────────
DROP TABLE IF EXISTS the_life_security_logs    CASCADE;
DROP TABLE IF EXISTS the_life_rate_limits      CASCADE;
DROP TABLE IF EXISTS the_life_player_metrics   CASCADE;
DROP TABLE IF EXISTS the_life_player_flags     CASCADE;

-- ─── Core player table (drop last — others FK into this) ─────────
DROP TABLE IF EXISTS the_life_players          CASCADE;

-- ─── RPCs / Functions ────────────────────────────────────────────
DROP FUNCTION IF EXISTS perform_crime(UUID, UUID)               CASCADE;
DROP FUNCTION IF EXISTS rob_player(UUID, UUID)                  CASCADE;
DROP FUNCTION IF EXISTS buy_business(UUID, UUID)                CASCADE;
DROP FUNCTION IF EXISTS process_business_production(UUID)       CASCADE;
DROP FUNCTION IF EXISTS perform_robbery(UUID, UUID)             CASCADE;
DROP FUNCTION IF EXISTS wipe_season(TEXT)                       CASCADE;
DROP FUNCTION IF EXISTS get_leaderboard()                       CASCADE;
DROP FUNCTION IF EXISTS spin_roulette(INT)                      CASCADE;
DROP FUNCTION IF EXISTS place_roulette_bet(UUID, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS settle_roulette_round(INT)              CASCADE;

-- ─── Verify nothing remains ──────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'the_life_%'
ORDER BY table_name;
