-- Fix function search_path warnings
-- This adds SET search_path = public to all functions that are missing it
-- Run this in your Supabase SQL editor

-- =====================================================
-- Fix all functions with mutable search_path
-- Using ALTER FUNCTION to add search_path without recreating
-- =====================================================

ALTER FUNCTION IF EXISTS public.get_available_seats SET search_path = public;
ALTER FUNCTION IF EXISTS public.cleanup_old_news SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_anticheat_rules_updated_at SET search_path = public;
ALTER FUNCTION IF EXISTS public.create_player_risk_score SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_session_activity SET search_path = public;
ALTER FUNCTION IF EXISTS public.prevent_admin_action_deletion SET search_path = public;
ALTER FUNCTION IF EXISTS public.handle_player_timeout SET search_path = public;
ALTER FUNCTION IF EXISTS public.cleanup_empty_tables SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_round_bet_totals SET search_path = public;
ALTER FUNCTION IF EXISTS public.calculate_session_profit SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_admin_role_level SET search_path = public;
ALTER FUNCTION IF EXISTS public.expire_old_listings SET search_path = public;
ALTER FUNCTION IF EXISTS public.has_admin_permission SET search_path = public;
ALTER FUNCTION IF EXISTS public.generate_crime_news SET search_path = public;
ALTER FUNCTION IF EXISTS public.process_roulette_round SET search_path = public;
ALTER FUNCTION IF EXISTS public.start_new_roulette_round SET search_path = public;
ALTER FUNCTION IF EXISTS public.cleanup_old_roulette_bets SET search_path = public;
ALTER FUNCTION IF EXISTS public.generate_leaderboard_news SET search_path = public;
ALTER FUNCTION IF EXISTS public.generate_pvp_news SET search_path = public;
ALTER FUNCTION IF EXISTS public.generate_kingpin_news SET search_path = public;
ALTER FUNCTION IF EXISTS public.execute_the_life_wipe SET search_path = public;
ALTER FUNCTION IF EXISTS public.calculate_guess_balance_winner SET search_path = public;
ALTER FUNCTION IF EXISTS public.sync_season_with_wipe SET search_path = public;
ALTER FUNCTION IF EXISTS public.grant_season_pass_xp SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_session_slot_stats SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_translation SET search_path = public;
ALTER FUNCTION IF EXISTS public.upsert_translation SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_record_translations SET search_path = public;
ALTER FUNCTION IF EXISTS public.create_trial_on_signup SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_next_spin_time SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_online_players_count SET search_path = public;
ALTER FUNCTION IF EXISTS public.log_payment SET search_path = public;
ALTER FUNCTION IF EXISTS public.rotate_overlay_token SET search_path = public;
ALTER FUNCTION IF EXISTS public.set_initial_durability SET search_path = public;
ALTER FUNCTION IF EXISTS public.reset_daily_catches SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_bonus_hunt_session_stats SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_casino_offers_updated_at SET search_path = public;
ALTER FUNCTION IF EXISTS public.add_item_to_inventory SET search_path = public;
ALTER FUNCTION IF EXISTS public.can_user_spin_today SET search_path = public;
ALTER FUNCTION IF EXISTS public.cancel_subscription SET search_path = public;
ALTER FUNCTION IF EXISTS public.cleanup_old_pvp_chat SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_slots_updated_at SET search_path = public;
ALTER FUNCTION IF EXISTS public.cleanup_stale_pvp_presence SET search_path = public;
ALTER FUNCTION IF EXISTS public.execute_pvp_attack SET search_path = public;
ALTER FUNCTION IF EXISTS public.generate_secure_token SET search_path = public;
ALTER FUNCTION IF EXISTS public.search_slots SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_active_boats SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_upcoming_boats SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_user_metadata SET search_path = public;
ALTER FUNCTION IF EXISTS public.handle_new_user SET search_path = public;
ALTER FUNCTION IF EXISTS public.handle_new_user_profile SET search_path = public;
ALTER FUNCTION IF EXISTS public.handle_stripe_customer_update SET search_path = public;
ALTER FUNCTION IF EXISTS public.handle_stripe_subscription_update SET search_path = public;
ALTER FUNCTION IF EXISTS public.has_active_subscription SET search_path = public;
ALTER FUNCTION IF EXISTS public.increment_highlight_views SET search_path = public;
ALTER FUNCTION IF EXISTS public.initialize_the_life_player SET search_path = public;
ALTER FUNCTION IF EXISTS public.process_premium_redemption SET search_path = public;
ALTER FUNCTION IF EXISTS public.reactivate_subscription SET search_path = public;
ALTER FUNCTION IF EXISTS public.sync_widget_layout_jsonb SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_leaderboard_ranks SET search_path = public;
ALTER FUNCTION IF EXISTS public.recalculate_bonus_hunt_stats SET search_path = public;
ALTER FUNCTION IF EXISTS public.auto_level_up SET search_path = public;
ALTER FUNCTION IF EXISTS public.refresh_mock_users SET search_path = public;
ALTER FUNCTION IF EXISTS public.start_trial SET search_path = public;
ALTER FUNCTION IF EXISTS public.track_widget_view SET search_path = public;
ALTER FUNCTION IF EXISTS public.trigger_recalculate_bonus_hunt_stats SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_game_stats SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_pvp_presence SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_slot_stats SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_stream_highlights_updated_at SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_updated_at_column SET search_path = public;
ALTER FUNCTION IF EXISTS public.compute_security_log_hash SET search_path = public;

-- =====================================================
-- Fix "always true" INSERT/UPDATE policies
-- These should check for authenticated users, not just TRUE
-- =====================================================

-- casino_chat - Chat messages
DROP POLICY IF EXISTS "Chat messages" ON casino_chat;
CREATE POLICY "Chat messages" ON casino_chat FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- casino_seats - Seat management
DROP POLICY IF EXISTS "Seat management" ON casino_seats;
CREATE POLICY "Seat management" ON casino_seats FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- casino_tables - Table updates
DROP POLICY IF EXISTS "Table updates" ON casino_tables;
CREATE POLICY "Table updates" ON casino_tables FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- economy_transactions - Allow authenticated inserts
DROP POLICY IF EXISTS "Allow authenticated inserts to economy_transactions" ON economy_transactions;
CREATE POLICY "Allow authenticated inserts to economy_transactions" ON economy_transactions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- game_logs - Allow authenticated inserts
DROP POLICY IF EXISTS "Allow authenticated inserts to game_logs" ON game_logs;
CREATE POLICY "Allow authenticated inserts to game_logs" ON game_logs FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- inventory_changes_log - Allow authenticated inserts
DROP POLICY IF EXISTS "Allow authenticated inserts to inventory_changes_log" ON inventory_changes_log;
CREATE POLICY "Allow authenticated inserts to inventory_changes_log" ON inventory_changes_log FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- player_risk_scores - Allow authenticated inserts
DROP POLICY IF EXISTS "Allow authenticated inserts to player_risk_scores" ON player_risk_scores;
CREATE POLICY "Allow authenticated inserts to player_risk_scores" ON player_risk_scores FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- player_sessions - Allow authenticated inserts
DROP POLICY IF EXISTS "Allow authenticated inserts to player_sessions" ON player_sessions;
CREATE POLICY "Allow authenticated inserts to player_sessions" ON player_sessions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- player_sessions - Allow authenticated updates to own sessions
DROP POLICY IF EXISTS "Allow authenticated updates to own sessions" ON player_sessions;
CREATE POLICY "Allow authenticated updates to own sessions" ON player_sessions FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- roulette_bets - Place roulette bets
DROP POLICY IF EXISTS "Place roulette bets" ON roulette_bets;
CREATE POLICY "Place roulette bets" ON roulette_bets FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- roulette_bets - Update bets
DROP POLICY IF EXISTS "Update bets" ON roulette_bets;
CREATE POLICY "Update bets" ON roulette_bets FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- roulette_chat - Send roulette chat
DROP POLICY IF EXISTS "Send roulette chat" ON roulette_chat;
CREATE POLICY "Send roulette chat" ON roulette_chat FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- roulette_game_state - Update game state (admin only)
DROP POLICY IF EXISTS "Update game state" ON roulette_game_state;
CREATE POLICY "Update game state" ON roulette_game_state FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- roulette_player_stats - Manage player stats
DROP POLICY IF EXISTS "Manage player stats" ON roulette_player_stats;
CREATE POLICY "Manage player stats" ON roulette_player_stats FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- slot_audit_log - Allow insert audit for authenticated
DROP POLICY IF EXISTS "Allow insert audit for authenticated" ON slot_audit_log;
CREATE POLICY "Allow insert audit for authenticated" ON slot_audit_log FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- the_life_avatars - Allow authenticated full access avatars
DROP POLICY IF EXISTS "Allow authenticated full access avatars" ON the_life_avatars;
CREATE POLICY "Allow authenticated full access avatars" ON the_life_avatars FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- the_life_crime_drops - Allow service role full access (keep as system function)
-- This is used by server functions, keep it
DROP POLICY IF EXISTS "Allow service role full access to crime drops" ON the_life_crime_drops;
CREATE POLICY "Allow service role full access to crime drops" ON the_life_crime_drops FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- the_life_market_transactions - System can insert transactions
DROP POLICY IF EXISTS "System can insert transactions" ON the_life_market_transactions;
CREATE POLICY "System can insert transactions" ON the_life_market_transactions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- the_life_news_feed - System can insert news
DROP POLICY IF EXISTS "System can insert news" ON the_life_news_feed;
CREATE POLICY "System can insert news" ON the_life_news_feed FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- the_life_store_items - Allow authenticated full access (admin only)
DROP POLICY IF EXISTS "Allow authenticated full access" ON the_life_store_items;
CREATE POLICY "Admins can manage store items" ON the_life_store_items FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- user_roles - Service role bypass (keep as admin only)
DROP POLICY IF EXISTS "Service role bypass" ON user_roles;
-- Already handled by "Admins can manage roles" policy
