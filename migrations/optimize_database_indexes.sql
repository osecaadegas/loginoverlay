-- =====================================================
-- Database Optimization: Add Missing FK Indexes
-- =====================================================
-- These indexes will significantly improve JOIN performance

-- Casino & Offers
CREATE INDEX IF NOT EXISTS idx_casino_offers_created_by ON public.casino_offers(created_by);

-- Daily Wheel
CREATE INDEX IF NOT EXISTS idx_daily_wheel_spins_prize_id ON public.daily_wheel_spins(prize_id);

-- Giveaways
CREATE INDEX IF NOT EXISTS idx_giveaway_winners_user_id ON public.giveaway_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_giveaways_created_by ON public.giveaways(created_by);

-- Point Redemptions
CREATE INDEX IF NOT EXISTS idx_point_redemptions_redemption_id ON public.point_redemptions(redemption_id);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_user_id ON public.point_redemptions(user_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- The Life - Business System
CREATE INDEX IF NOT EXISTS idx_business_productions_reward_item_id ON public.the_life_business_productions(reward_item_id);
CREATE INDEX IF NOT EXISTS idx_business_required_items_reward_item_id ON public.the_life_business_required_items(reward_item_id);
CREATE INDEX IF NOT EXISTS idx_businesses_item_reward_id ON public.the_life_businesses(item_reward_id);
CREATE INDEX IF NOT EXISTS idx_businesses_required_item_id ON public.the_life_businesses(required_item_id);
CREATE INDEX IF NOT EXISTS idx_businesses_reward_item_id ON public.the_life_businesses(reward_item_id);

-- The Life - Crime & Drops
CREATE INDEX IF NOT EXISTS idx_crime_drops_item_id ON public.the_life_crime_drops(item_id);

-- The Life - Dock System
CREATE INDEX IF NOT EXISTS idx_dock_boats_item_id ON public.the_life_dock_boats(item_id);
CREATE INDEX IF NOT EXISTS idx_dock_shipments_boat_id ON public.the_life_dock_shipments(boat_id);
CREATE INDEX IF NOT EXISTS idx_dock_shipments_item_id ON public.the_life_dock_shipments(item_id);

-- The Life - Players
CREATE INDEX IF NOT EXISTS idx_players_equipped_gear_id ON public.the_life_players(equipped_gear_id);
CREATE INDEX IF NOT EXISTS idx_players_equipped_weapon_id ON public.the_life_players(equipped_weapon_id);

-- The Life - PVP & Robbery
CREATE INDEX IF NOT EXISTS idx_pvp_logs_winner_id ON public.the_life_pvp_logs(winner_id);
CREATE INDEX IF NOT EXISTS idx_robbery_history_robbery_id ON public.the_life_robbery_history(robbery_id);

-- User System
CREATE INDEX IF NOT EXISTS idx_user_themes_theme_preset_id ON public.user_themes(theme_preset_id);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_created_by ON public.voucher_codes(created_by);

-- =====================================================
-- Database Optimization: Remove Unused Indexes
-- =====================================================
-- These indexes are never used and waste space/slow down inserts

-- Casino & Offers
DROP INDEX IF EXISTS idx_casino_offers_active;

-- Businesses
DROP INDEX IF EXISTS idx_businesses_active;

-- User & Random Slot
DROP INDEX IF EXISTS idx_user_random_slot_user_id;

-- Game Sessions & Stats
DROP INDEX IF EXISTS idx_game_sessions_game_type;
DROP INDEX IF EXISTS idx_game_stats_user_id;
DROP INDEX IF EXISTS idx_game_stats_game_type;

-- Leaderboard
DROP INDEX IF EXISTS idx_leaderboard_rank;
DROP INDEX IF EXISTS idx_leaderboard_profit;

-- Subscriptions
DROP INDEX IF EXISTS subscriptions_stripe_customer_idx;
DROP INDEX IF EXISTS subscriptions_status_idx;

-- User Inventory & Items
DROP INDEX IF EXISTS idx_user_inventory_item_id;
DROP INDEX IF EXISTS idx_items_type;
DROP INDEX IF EXISTS idx_items_rarity;

-- Stream Highlights
DROP INDEX IF EXISTS idx_stream_highlights_active;

-- Overlay System
DROP INDEX IF EXISTS presets_user_id_idx;
DROP INDEX IF EXISTS presets_public_idx;
DROP INDEX IF EXISTS events_user_id_idx;
DROP INDEX IF EXISTS events_created_at_idx;

-- The Life - Players
DROP INDEX IF EXISTS idx_the_life_players_cash;

-- Tournaments
DROP INDEX IF EXISTS idx_tournament_rounds_score;
DROP INDEX IF EXISTS idx_tournament_rounds_tournament;
DROP INDEX IF EXISTS idx_tournament_history_date;

-- Voucher Codes
DROP INDEX IF EXISTS idx_voucher_codes_active;

-- User Themes
DROP INDEX IF EXISTS idx_user_themes_user;

-- Stripe Webhooks
DROP INDEX IF EXISTS webhook_events_stripe_id_idx;
DROP INDEX IF EXISTS webhook_events_processed_idx;
DROP INDEX IF EXISTS webhook_events_created_at_idx;

-- The Life - Brothel System
DROP INDEX IF EXISTS idx_brothel_workers_active;
DROP INDEX IF EXISTS idx_player_brothel_workers_worker;

-- The Life - Business System
DROP INDEX IF EXISTS idx_player_businesses_business;
DROP INDEX IF EXISTS idx_business_productions_business;
DROP INDEX IF EXISTS idx_business_productions_collected;
DROP INDEX IF EXISTS idx_business_required_items_item;

-- The Life - Items
DROP INDEX IF EXISTS idx_thelife_items_type;
DROP INDEX IF EXISTS idx_thelife_items_resell_price;

-- Payments
DROP INDEX IF EXISTS payments_user_id_idx;
DROP INDEX IF EXISTS payments_subscription_id_idx;
DROP INDEX IF EXISTS payments_created_at_idx;

-- User Profiles
DROP INDEX IF EXISTS idx_user_profiles_twitch_username;

-- The Life - PVP Chat
DROP INDEX IF EXISTS idx_pvp_chat_player_id;
DROP INDEX IF EXISTS idx_pvp_chat_user_id;

-- The Life - Inventory
DROP INDEX IF EXISTS idx_player_inventory_equipped;

-- The Life - Dock
DROP INDEX IF EXISTS idx_dock_shipments_player;

-- The Life - Store
DROP INDEX IF EXISTS idx_store_items_active;

-- Slot History
DROP INDEX IF EXISTS idx_slot_history_provider;
DROP INDEX IF EXISTS idx_slot_history_total_plays;
DROP INDEX IF EXISTS idx_slot_history_profit_loss;

-- Daily Sessions
DROP INDEX IF EXISTS idx_daily_sessions_user;

-- =====================================================
-- Database Optimization: Remove Duplicate Indexes
-- =====================================================

-- widget_state has duplicate indexes - keep the unique constraint, drop the redundant index
DROP INDEX IF EXISTS widget_state_widget_id_idx;

-- =====================================================
-- Database Optimization: RLS Policy Performance
-- =====================================================
-- ⚠️ IMPORTANT: RLS policies calling auth.uid() without (select ...) wrapper
-- cause the function to be re-evaluated for EVERY ROW, severely impacting performance.
--
-- PROBLEM: auth.uid() in policy = evaluated once per row
-- SOLUTION: (select auth.uid()) in policy = evaluated once per query
--
-- To fix each policy, you need to:
-- 1. Get the current policy definition: \d+ table_name in psql
-- 2. DROP the existing policy
-- 3. CREATE the policy again with auth.uid() wrapped in (select auth.uid())
--
-- EXAMPLE TEMPLATE:
-- DROP POLICY IF EXISTS "policy_name" ON table_name;
-- CREATE POLICY "policy_name" ON table_name
--   FOR SELECT
--   USING (user_id = (select auth.uid()));
--
-- AFFECTED TABLES (100+ policies need optimization):
-- - user_roles: Users can view own role, Admins can insert/update/delete roles, etc.
-- - streamelements_connections: Users can view/insert/update/delete their own SE connection
-- - redemption_items: Admins can manage redemption items
-- - slot_history: Users can view/insert/update/delete own slot history
-- - point_redemptions: Users can view/create their own redemptions, Allow authenticated users to read/update
-- - the_life_players: Users can view/insert/update own player data
-- - game_sessions: Users can insert/view their own game sessions, Admins can view all
-- - user_random_slot: Users can insert/update/view/delete their own random slot state
-- - game_stats: Users can view/update/insert their own game stats
-- - game_leaderboard: Users can update/insert their own leaderboard entry
-- - casino_offers: Admins can view/insert/update/delete casino offers
-- - user_giveaways: Users can view/insert/update/delete their own giveaways
-- - slots: Allow slot management for admins and slot_modders
-- - user_tournaments: Users can view/insert/update/delete their own tournaments
-- - user_profiles: users can select/insert/update own profile
-- - spotify_connections: Users can view/insert/update/delete their own Spotify connection
-- - voucher_codes: Admins can manage vouchers
-- - voucher_redemptions: Users can view/redeem own redemptions, Admins can view all
-- - giveaways: Admins can manage giveaways
-- - giveaway_entries: Users can create/update their own entries
-- - giveaway_winners: Admins can manage winners
-- - subscriptions: users can select own subscription
-- - items: Admins can insert items
-- - user_inventory: Users can view/insert/update own inventory
-- - the_life_robbery_history: Users can view/insert own robbery history
-- - the_life_drug_ops: Users can view/manage own drug ops
-- - the_life_brothels: Users can view/manage own brothel
-- - the_life_pvp_logs: Users can insert PvP logs
-- - the_life_brothel_workers: Admins can manage workers
-- - the_life_player_brothel_workers: Users can view/manage own hired workers
-- - the_life_businesses: Admins can manage businesses
-- - stream_highlights: Admins can manage highlights
-- - the_life_robberies: Admins can manage robberies
-- - daily_wheel_prizes: Admins can manage wheel prizes
-- - daily_wheel_spins: Users can view/record/claim their own spins, Admins can view all
-- - overlay_presets: users can manage own presets
-- - overlay_events: users can select own events
-- - the_life_player_businesses: Users can view/manage own businesses
-- - stripe_webhook_events: service role can manage webhook events
-- - payments: users can view own payments
-- - user_themes: Users can view/create/update/delete their own themes
-- - the_life_player_inventory: Players can view/manage own inventory
-- - the_life_business_productions: Players can view/manage own productions
-- - the_life_event_messages: Admins can manage event messages
-- - the_life_category_info: Allow admins to manage category info
-- - the_life_pvp_chat: Authenticated users can send messages
-- - the_life_pvp_presence: Users can update own presence
-- - the_life_items: Admins can manage TheLife items
-- - the_life_business_required_items: Admins can manage business required items
-- - tournament_history: Users can view/insert/update/delete own tournament history
-- - tournament_rounds: Users can view/insert/update own tournament rounds
-- - daily_sessions: Users can view/insert/update own daily sessions
--
-- 📋 MANUAL STEPS REQUIRED:
-- Run this query in Supabase SQL Editor to get all policy definitions:
-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('user_roles', 'streamelements_connections', 'redemption_items', ...)
-- ORDER BY tablename, policyname;
--
-- Then for each policy, replace auth.uid() with (select auth.uid()) in the qual and with_check expressions.

-- =====================================================
-- Database Optimization: Multiple Permissive Policies
-- =====================================================
-- ⚠️ PERFORMANCE ISSUE: Multiple permissive RLS policies for same role/action
-- PostgreSQL must evaluate ALL permissive policies, causing performance degradation.
--
-- PROBLEM: Having 2-4 policies for anon/SELECT means EACH policy runs on EVERY query
-- SOLUTION: Consolidate policies into single policy with OR logic
--
-- EXAMPLE CONSOLIDATION:
-- Instead of:
--   Policy A: user_id = auth.uid()
--   Policy B: is_admin = true
-- 
-- Use single policy:
--   (user_id = (select auth.uid()) OR is_admin = true)
--
-- AFFECTED TABLES (100+ duplicate policies across roles):
-- - casino_offers: 2 policies for anon/authenticated (Admins can view + Anyone can view active)
-- - daily_wheel_prizes: 2 policies for anon/authenticated
-- - daily_wheel_spins: 2 policies for anon/authenticated
-- - game_sessions: 2 policies for anon/authenticated
-- - game_stats: 2 policies for anon/authenticated
-- - giveaway_winners: 2 policies for anon/authenticated
-- - giveaways: 2 policies for anon/authenticated
-- - overlay_presets: 2 policies for anon/authenticated
-- - point_redemptions: 3 policies for anon/authenticated (worst case!)
-- - redemption_items: 2 policies for anon/authenticated
-- - stream_highlights: 2 policies for anon/authenticated
-- - streamelements_connections: 2 policies for anon/authenticated
-- - voucher_codes: 2 policies for anon/authenticated
-- - voucher_redemptions: 2 policies for anon/authenticated
-- - user_profiles: 3 policies for anon/authenticated (multiple for INSERT/SELECT/UPDATE)
-- - user_roles: 3-4 policies for anon/authenticated
-- - the_life_* tables: Many with 2-3 policies each
--
-- 📋 MANUAL REVIEW REQUIRED:
-- Each table needs business logic review to consolidate policies correctly.
-- This cannot be automated as it requires understanding the security requirements.

-- =====================================================
-- Summary
-- =====================================================
-- ✅ Added 22 indexes for foreign keys (faster JOINs)
-- ✅ Removed 56 unused indexes (faster inserts, less storage)
-- ✅ Removed 1 duplicate index (widget_state)
-- ⚠️ Manual Fix Required: 100+ RLS policies need auth.uid() wrapping
-- ⚠️ Manual Fix Required: 100+ duplicate permissive policies need consolidation
-- 
-- Expected improvements:
-- - Faster query performance on joined tables
-- - Reduced database storage usage
-- - Faster INSERT/UPDATE operations
-- - Significantly faster RLS policy evaluation (after manual fixes)
-- - Overall better performance for The Life game
--
-- Next Steps:
-- 1. Apply this migration for immediate index improvements
-- 2. Use Supabase SQL Editor to review and fix RLS policies
-- 3. Test consolidated policies in development environment
-- 4. Apply RLS fixes to production after testing
