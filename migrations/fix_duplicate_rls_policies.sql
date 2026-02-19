-- Fix multiple permissive policies warnings from Supabase
-- This consolidates duplicate policies to improve performance
-- Run this in your Supabase SQL editor

-- =====================================================
-- CASINO_OFFERS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view casino offers" ON casino_offers;
DROP POLICY IF EXISTS "Everyone can view offers" ON casino_offers;
DROP POLICY IF EXISTS "Public can view offers" ON casino_offers;
DROP POLICY IF EXISTS "Authenticated can view offers" ON casino_offers;
CREATE POLICY "Anyone can view casino offers" ON casino_offers FOR SELECT USING (true);

-- =====================================================
-- CASINO_SEATS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view seats" ON casino_seats;
DROP POLICY IF EXISTS "Everyone can view seats" ON casino_seats;
DROP POLICY IF EXISTS "Public can view seats" ON casino_seats;
CREATE POLICY "Anyone can view seats" ON casino_seats FOR SELECT USING (true);

-- =====================================================
-- DAILY_WHEEL_PRIZES - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view prizes" ON daily_wheel_prizes;
DROP POLICY IF EXISTS "Everyone can view prizes" ON daily_wheel_prizes;
DROP POLICY IF EXISTS "Public can view prizes" ON daily_wheel_prizes;
CREATE POLICY "Anyone can view prizes" ON daily_wheel_prizes FOR SELECT USING (true);

-- =====================================================
-- DAILY_WHEEL_SPINS - Consolidate SELECT policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view spins" ON daily_wheel_spins;
DROP POLICY IF EXISTS "Everyone can view spins" ON daily_wheel_spins;
DROP POLICY IF EXISTS "Authenticated users can view all spins" ON daily_wheel_spins;
DROP POLICY IF EXISTS "Users can view spins" ON daily_wheel_spins;
CREATE POLICY "Anyone can view spins" ON daily_wheel_spins FOR SELECT USING (true);

-- =====================================================
-- GAME_SESSIONS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view sessions" ON game_sessions;
DROP POLICY IF EXISTS "Everyone can view sessions" ON game_sessions;
DROP POLICY IF EXISTS "Public can view sessions" ON game_sessions;
CREATE POLICY "Anyone can view sessions" ON game_sessions FOR SELECT USING (true);

-- =====================================================
-- GAME_STATS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view stats" ON game_stats;
DROP POLICY IF EXISTS "Everyone can view stats" ON game_stats;
DROP POLICY IF EXISTS "Public can view stats" ON game_stats;
CREATE POLICY "Anyone can view stats" ON game_stats FOR SELECT USING (true);

-- =====================================================
-- GIVEAWAY_WINNERS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view winners" ON giveaway_winners;
DROP POLICY IF EXISTS "Everyone can view winners" ON giveaway_winners;
DROP POLICY IF EXISTS "Public can view winners" ON giveaway_winners;
CREATE POLICY "Anyone can view winners" ON giveaway_winners FOR SELECT USING (true);

-- =====================================================
-- GIVEAWAYS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view giveaways" ON giveaways;
DROP POLICY IF EXISTS "Everyone can view giveaways" ON giveaways;
DROP POLICY IF EXISTS "Public can view giveaways" ON giveaways;
CREATE POLICY "Anyone can view giveaways" ON giveaways FOR SELECT USING (true);

-- =====================================================
-- GUESS_BALANCE_GUESSES - Consolidate SELECT policies
-- =====================================================
DROP POLICY IF EXISTS "users can view all guesses" ON guess_balance_guesses;
DROP POLICY IF EXISTS "everyone can view guesses" ON guess_balance_guesses;
DROP POLICY IF EXISTS "Anyone can view guesses" ON guess_balance_guesses;
-- Keep the main policy that handles the logic
DROP POLICY IF EXISTS "users can view guesses" ON guess_balance_guesses;
CREATE POLICY "users can view guesses" ON guess_balance_guesses FOR SELECT USING (true);

-- =====================================================
-- GUESS_BALANCE_SLOT_VOTES - Consolidate policies
-- =====================================================
-- SELECT
DROP POLICY IF EXISTS "everyone can view votes" ON guess_balance_slot_votes;
DROP POLICY IF EXISTS "Anyone can view votes" ON guess_balance_slot_votes;
DROP POLICY IF EXISTS "Users can view votes" ON guess_balance_slot_votes;
CREATE POLICY "Anyone can view votes" ON guess_balance_slot_votes FOR SELECT USING (true);

-- INSERT - Keep one policy for authenticated users
DROP POLICY IF EXISTS "users can create votes" ON guess_balance_slot_votes;
DROP POLICY IF EXISTS "Authenticated users can vote" ON guess_balance_slot_votes;
CREATE POLICY "Authenticated users can vote" ON guess_balance_slot_votes FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- OVERLAY_PRESETS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view presets" ON overlay_presets;
DROP POLICY IF EXISTS "Everyone can view presets" ON overlay_presets;
DROP POLICY IF EXISTS "Public can view presets" ON overlay_presets;
CREATE POLICY "Anyone can view presets" ON overlay_presets FOR SELECT USING (true);

-- =====================================================
-- POINT_REDEMPTIONS - Consolidate SELECT policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Everyone can view redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Allow all authenticated users to read all redemptions" ON point_redemptions;
CREATE POLICY "Anyone can view redemptions" ON point_redemptions FOR SELECT USING (true);

-- =====================================================
-- REDEMPTION_ITEMS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view items" ON redemption_items;
DROP POLICY IF EXISTS "Everyone can view items" ON redemption_items;
DROP POLICY IF EXISTS "Public can view items" ON redemption_items;
CREATE POLICY "Anyone can view items" ON redemption_items FOR SELECT USING (true);

-- =====================================================
-- ROULETTE_PLAYER_STATS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view roulette stats" ON roulette_player_stats;
DROP POLICY IF EXISTS "Everyone can view roulette stats" ON roulette_player_stats;
DROP POLICY IF EXISTS "Public can view roulette stats" ON roulette_player_stats;
CREATE POLICY "Anyone can view roulette stats" ON roulette_player_stats FOR SELECT USING (true);

-- =====================================================
-- SEASON_PASS_PROGRESS - Consolidate policies
-- =====================================================
-- SELECT
DROP POLICY IF EXISTS "Anyone can view progress" ON season_pass_progress;
DROP POLICY IF EXISTS "Everyone can view progress" ON season_pass_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON season_pass_progress;
DROP POLICY IF EXISTS "Admins can manage all progress" ON season_pass_progress;
CREATE POLICY "Anyone can view progress" ON season_pass_progress FOR SELECT USING (true);

-- INSERT - Single policy
DROP POLICY IF EXISTS "Users can insert own progress" ON season_pass_progress;
DROP POLICY IF EXISTS "Anyone can insert progress" ON season_pass_progress;
CREATE POLICY "Users can insert own progress" ON season_pass_progress FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- UPDATE - Single policy
DROP POLICY IF EXISTS "Users can update own progress" ON season_pass_progress;
DROP POLICY IF EXISTS "Anyone can update progress" ON season_pass_progress;
CREATE POLICY "Users can update own progress" ON season_pass_progress FOR UPDATE 
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- SEASON_PASS_REWARDS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view rewards" ON season_pass_rewards;
DROP POLICY IF EXISTS "Everyone can view rewards" ON season_pass_rewards;
DROP POLICY IF EXISTS "Public can view rewards" ON season_pass_rewards;
CREATE POLICY "Anyone can view rewards" ON season_pass_rewards FOR SELECT USING (true);

-- =====================================================
-- SEASON_PASS_SEASONS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view seasons" ON season_pass_seasons;
DROP POLICY IF EXISTS "Everyone can view seasons" ON season_pass_seasons;
DROP POLICY IF EXISTS "Public can view seasons" ON season_pass_seasons;
CREATE POLICY "Anyone can view seasons" ON season_pass_seasons FOR SELECT USING (true);

-- =====================================================
-- SEASON_PASS_TIERS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view tiers" ON season_pass_tiers;
DROP POLICY IF EXISTS "Everyone can view tiers" ON season_pass_tiers;
DROP POLICY IF EXISTS "Public can view tiers" ON season_pass_tiers;
CREATE POLICY "Anyone can view tiers" ON season_pass_tiers FOR SELECT USING (true);

-- =====================================================
-- SLOTS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view slots" ON slots;
DROP POLICY IF EXISTS "Everyone can view slots" ON slots;
DROP POLICY IF EXISTS "Public can view slots" ON slots;
CREATE POLICY "Anyone can view slots" ON slots FOR SELECT USING (true);

-- =====================================================
-- STREAM_HIGHLIGHTS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view highlights" ON stream_highlights;
DROP POLICY IF EXISTS "Everyone can view highlights" ON stream_highlights;
DROP POLICY IF EXISTS "Public can view highlights" ON stream_highlights;
CREATE POLICY "Anyone can view highlights" ON stream_highlights FOR SELECT USING (true);

-- =====================================================
-- STREAMELEMENTS_CONNECTIONS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view connections" ON streamelements_connections;
DROP POLICY IF EXISTS "Everyone can view connections" ON streamelements_connections;
DROP POLICY IF EXISTS "Public can view connections" ON streamelements_connections;
CREATE POLICY "Anyone can view connections" ON streamelements_connections FOR SELECT USING (true);

-- =====================================================
-- THE_LIFE_* TABLES - Consolidate SELECT policies
-- =====================================================

-- the_life_avatars
DROP POLICY IF EXISTS "Anyone can view avatars" ON the_life_avatars;
DROP POLICY IF EXISTS "Everyone can view avatars" ON the_life_avatars;
CREATE POLICY "Anyone can view avatars" ON the_life_avatars FOR SELECT USING (true);

-- the_life_brothel_workers
DROP POLICY IF EXISTS "Anyone can view brothel workers" ON the_life_brothel_workers;
DROP POLICY IF EXISTS "Everyone can view brothel workers" ON the_life_brothel_workers;
CREATE POLICY "Anyone can view brothel workers" ON the_life_brothel_workers FOR SELECT USING (true);

-- the_life_brothels
DROP POLICY IF EXISTS "Anyone can view brothels" ON the_life_brothels;
DROP POLICY IF EXISTS "Everyone can view brothels" ON the_life_brothels;
CREATE POLICY "Anyone can view brothels" ON the_life_brothels FOR SELECT USING (true);

-- the_life_business_productions
DROP POLICY IF EXISTS "Anyone can view business productions" ON the_life_business_productions;
DROP POLICY IF EXISTS "Everyone can view business productions" ON the_life_business_productions;
CREATE POLICY "Anyone can view business productions" ON the_life_business_productions FOR SELECT USING (true);

-- the_life_business_required_items
DROP POLICY IF EXISTS "Anyone can view required items" ON the_life_business_required_items;
DROP POLICY IF EXISTS "Everyone can view required items" ON the_life_business_required_items;
CREATE POLICY "Anyone can view required items" ON the_life_business_required_items FOR SELECT USING (true);

-- the_life_businesses
DROP POLICY IF EXISTS "Anyone can view businesses" ON the_life_businesses;
DROP POLICY IF EXISTS "Everyone can view businesses" ON the_life_businesses;
CREATE POLICY "Anyone can view businesses" ON the_life_businesses FOR SELECT USING (true);

-- the_life_category_info
DROP POLICY IF EXISTS "Anyone can view category info" ON the_life_category_info;
DROP POLICY IF EXISTS "Everyone can view category info" ON the_life_category_info;
CREATE POLICY "Anyone can view category info" ON the_life_category_info FOR SELECT USING (true);

-- the_life_crime_drops
DROP POLICY IF EXISTS "Anyone can view crime drops" ON the_life_crime_drops;
DROP POLICY IF EXISTS "Everyone can view crime drops" ON the_life_crime_drops;
CREATE POLICY "Anyone can view crime drops" ON the_life_crime_drops FOR SELECT USING (true);

-- the_life_drug_ops
DROP POLICY IF EXISTS "Anyone can view drug ops" ON the_life_drug_ops;
DROP POLICY IF EXISTS "Everyone can view drug ops" ON the_life_drug_ops;
CREATE POLICY "Anyone can view drug ops" ON the_life_drug_ops FOR SELECT USING (true);

-- the_life_event_messages
DROP POLICY IF EXISTS "Anyone can view event messages" ON the_life_event_messages;
DROP POLICY IF EXISTS "Everyone can view event messages" ON the_life_event_messages;
CREATE POLICY "Anyone can view event messages" ON the_life_event_messages FOR SELECT USING (true);

-- the_life_items
DROP POLICY IF EXISTS "Anyone can view items" ON the_life_items;
DROP POLICY IF EXISTS "Everyone can view items" ON the_life_items;
CREATE POLICY "Anyone can view items" ON the_life_items FOR SELECT USING (true);

-- the_life_player_brothel_workers
DROP POLICY IF EXISTS "Anyone can view player brothel workers" ON the_life_player_brothel_workers;
DROP POLICY IF EXISTS "Everyone can view player brothel workers" ON the_life_player_brothel_workers;
CREATE POLICY "Anyone can view player brothel workers" ON the_life_player_brothel_workers FOR SELECT USING (true);

-- the_life_player_businesses
DROP POLICY IF EXISTS "Anyone can view player businesses" ON the_life_player_businesses;
DROP POLICY IF EXISTS "Everyone can view player businesses" ON the_life_player_businesses;
CREATE POLICY "Anyone can view player businesses" ON the_life_player_businesses FOR SELECT USING (true);

-- the_life_player_inventory
DROP POLICY IF EXISTS "Anyone can view player inventory" ON the_life_player_inventory;
DROP POLICY IF EXISTS "Everyone can view player inventory" ON the_life_player_inventory;
CREATE POLICY "Anyone can view player inventory" ON the_life_player_inventory FOR SELECT USING (true);

-- the_life_players - SELECT
DROP POLICY IF EXISTS "Anyone can view players" ON the_life_players;
DROP POLICY IF EXISTS "Everyone can view players" ON the_life_players;
CREATE POLICY "Anyone can view players" ON the_life_players FOR SELECT USING (true);

-- the_life_players - INSERT (single policy)
DROP POLICY IF EXISTS "Users can insert own player" ON the_life_players;
DROP POLICY IF EXISTS "Users can insert own player data" ON the_life_players;
DROP POLICY IF EXISTS "Anyone can create player" ON the_life_players;
CREATE POLICY "Users can insert own player" ON the_life_players FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- the_life_pvp_presence
DROP POLICY IF EXISTS "Anyone can view pvp presence" ON the_life_pvp_presence;
DROP POLICY IF EXISTS "Everyone can view pvp presence" ON the_life_pvp_presence;
CREATE POLICY "Anyone can view pvp presence" ON the_life_pvp_presence FOR SELECT USING (true);

-- the_life_robberies
DROP POLICY IF EXISTS "Anyone can view robberies" ON the_life_robberies;
DROP POLICY IF EXISTS "Everyone can view robberies" ON the_life_robberies;
CREATE POLICY "Anyone can view robberies" ON the_life_robberies FOR SELECT USING (true);

-- the_life_store_items
DROP POLICY IF EXISTS "Anyone can view store items" ON the_life_store_items;
DROP POLICY IF EXISTS "Everyone can view store items" ON the_life_store_items;
CREATE POLICY "Anyone can view store items" ON the_life_store_items FOR SELECT USING (true);

-- the_life_wipe_settings
DROP POLICY IF EXISTS "Anyone can view wipe settings" ON the_life_wipe_settings;
DROP POLICY IF EXISTS "Everyone can view wipe settings" ON the_life_wipe_settings;
CREATE POLICY "Anyone can view wipe settings" ON the_life_wipe_settings FOR SELECT USING (true);

-- =====================================================
-- USER_PROFILES - Consolidate policies
-- =====================================================
-- SELECT
DROP POLICY IF EXISTS "Anyone can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Everyone can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
CREATE POLICY "Anyone can view profiles" ON user_profiles FOR SELECT USING (true);

-- INSERT (single policy)
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can create profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated can insert profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE (single policy)
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- =====================================================
-- USER_ROLES - Consolidate policies
-- =====================================================
-- SELECT
DROP POLICY IF EXISTS "Anyone can view roles" ON user_roles;
DROP POLICY IF EXISTS "Everyone can view roles" ON user_roles;
DROP POLICY IF EXISTS "Public can view roles" ON user_roles;
CREATE POLICY "Anyone can view roles" ON user_roles FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE - Keep admin-only or existing logic
DROP POLICY IF EXISTS "Users can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Anyone can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update roles" ON user_roles;
DROP POLICY IF EXISTS "Anyone can update roles" ON user_roles;
DROP POLICY IF EXISTS "Users can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Anyone can delete roles" ON user_roles;

-- Single admin policy for modifications
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));

-- =====================================================
-- VOUCHER_CODES - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view voucher codes" ON voucher_codes;
DROP POLICY IF EXISTS "Everyone can view voucher codes" ON voucher_codes;
DROP POLICY IF EXISTS "Public can view voucher codes" ON voucher_codes;
CREATE POLICY "Anyone can view voucher codes" ON voucher_codes FOR SELECT USING (true);

-- =====================================================
-- VOUCHER_REDEMPTIONS - Consolidate to single SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view voucher redemptions" ON voucher_redemptions;
DROP POLICY IF EXISTS "Everyone can view voucher redemptions" ON voucher_redemptions;
DROP POLICY IF EXISTS "Public can view voucher redemptions" ON voucher_redemptions;
CREATE POLICY "Anyone can view voucher redemptions" ON voucher_redemptions FOR SELECT USING (true);

-- =====================================================
-- GUESS_BALANCE_SESSIONS/SLOTS - Already fixed earlier
-- =====================================================
-- These were fixed in fix_guess_balance_moderator_access.sql

-- =====================================================
-- Done! Run this migration to consolidate duplicate policies
-- =====================================================
