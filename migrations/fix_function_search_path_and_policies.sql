-- Fix function search_path warnings
-- This adds SET search_path = public to all functions that are missing it
-- Run this in your Supabase SQL editor

-- =====================================================
-- Fix all functions with mutable search_path
-- Using DO block with exception handling
-- =====================================================

DO $$
DECLARE
  func_names TEXT[] := ARRAY[
    'get_available_seats',
    'cleanup_old_news',
    'update_anticheat_rules_updated_at',
    'create_player_risk_score',
    'update_session_activity',
    'prevent_admin_action_deletion',
    'handle_player_timeout',
    'cleanup_empty_tables',
    'get_round_bet_totals',
    'calculate_session_profit',
    'get_admin_role_level',
    'expire_old_listings',
    'has_admin_permission',
    'generate_crime_news',
    'process_roulette_round',
    'start_new_roulette_round',
    'cleanup_old_roulette_bets',
    'generate_leaderboard_news',
    'generate_pvp_news',
    'generate_kingpin_news',
    'execute_the_life_wipe',
    'calculate_guess_balance_winner',
    'sync_season_with_wipe',
    'grant_season_pass_xp',
    'update_session_slot_stats',
    'get_translation',
    'upsert_translation',
    'get_record_translations',
    'create_trial_on_signup',
    'get_next_spin_time',
    'get_online_players_count',
    'log_payment',
    'rotate_overlay_token',
    'set_initial_durability',
    'reset_daily_catches',
    'update_bonus_hunt_session_stats',
    'update_casino_offers_updated_at',
    'add_item_to_inventory',
    'can_user_spin_today',
    'cancel_subscription',
    'cleanup_old_pvp_chat',
    'update_slots_updated_at',
    'cleanup_stale_pvp_presence',
    'execute_pvp_attack',
    'generate_secure_token',
    'search_slots',
    'get_active_boats',
    'get_upcoming_boats',
    'get_user_metadata',
    'handle_new_user',
    'handle_new_user_profile',
    'handle_stripe_customer_update',
    'handle_stripe_subscription_update',
    'has_active_subscription',
    'increment_highlight_views',
    'initialize_the_life_player',
    'process_premium_redemption',
    'reactivate_subscription',
    'sync_widget_layout_jsonb',
    'update_leaderboard_ranks',
    'recalculate_bonus_hunt_stats',
    'auto_level_up',
    'refresh_mock_users',
    'start_trial',
    'track_widget_view',
    'trigger_recalculate_bonus_hunt_stats',
    'update_game_stats',
    'update_pvp_presence',
    'update_slot_stats',
    'update_stream_highlights_updated_at',
    'update_updated_at_column',
    'compute_security_log_hash'
  ];
  func_name TEXT;
  func_oid OID;
BEGIN
  FOREACH func_name IN ARRAY func_names
  LOOP
    -- Find all overloaded versions of this function
    FOR func_oid IN 
      SELECT p.oid 
      FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = func_name
    LOOP
      BEGIN
        EXECUTE format('ALTER FUNCTION %s SET search_path = public', func_oid::regprocedure);
        RAISE NOTICE 'Updated search_path for %', func_oid::regprocedure;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not update %: %', func_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;

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
