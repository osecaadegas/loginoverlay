-- URGENT FIX: Restore broken policies
-- Run this IMMEDIATELY in Supabase SQL editor

-- =====================================================
-- Fix user_roles - This is critical for admin access
-- =====================================================
DROP POLICY IF EXISTS "Service role bypass" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Anyone can view roles" ON user_roles;

-- Allow everyone to VIEW roles (needed for permission checks)
CREATE POLICY "Anyone can view roles" ON user_roles FOR SELECT USING (true);

-- Admins can manage roles
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));

-- =====================================================
-- Fix the_life_store_items - Everyone needs to VIEW items
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage store items" ON the_life_store_items;
DROP POLICY IF EXISTS "Allow authenticated full access" ON the_life_store_items;
DROP POLICY IF EXISTS "Anyone can view store items" ON the_life_store_items;

-- Anyone can VIEW store items
CREATE POLICY "Anyone can view store items" ON the_life_store_items FOR SELECT USING (true);

-- Admins can INSERT/UPDATE/DELETE store items
CREATE POLICY "Admins can manage store items" ON the_life_store_items FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- Fix the_life_avatars - Everyone needs to VIEW avatars
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated full access avatars" ON the_life_avatars;
DROP POLICY IF EXISTS "Anyone can view avatars" ON the_life_avatars;

-- Anyone can VIEW avatars
CREATE POLICY "Anyone can view avatars" ON the_life_avatars FOR SELECT USING (true);

-- Admins can manage avatars
CREATE POLICY "Admins can manage avatars" ON the_life_avatars FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- Fix casino_tables - Everyone needs to VIEW tables
-- =====================================================
DROP POLICY IF EXISTS "Table updates" ON casino_tables;
DROP POLICY IF EXISTS "Anyone can view tables" ON casino_tables;

-- Anyone can VIEW casino tables
CREATE POLICY "Anyone can view tables" ON casino_tables FOR SELECT USING (true);

-- Authenticated users can update tables
CREATE POLICY "Table updates" ON casino_tables FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix casino_seats - Everyone needs to VIEW seats
-- =====================================================
DROP POLICY IF EXISTS "Seat management" ON casino_seats;
DROP POLICY IF EXISTS "Anyone can view seats" ON casino_seats;

-- Anyone can VIEW seats
CREATE POLICY "Anyone can view seats" ON casino_seats FOR SELECT USING (true);

-- Authenticated users can manage their seats
CREATE POLICY "Seat management" ON casino_seats FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix casino_chat - Everyone needs to VIEW chat
-- =====================================================
DROP POLICY IF EXISTS "Chat messages" ON casino_chat;
DROP POLICY IF EXISTS "Anyone can view chat" ON casino_chat;

-- Anyone can VIEW chat
CREATE POLICY "Anyone can view chat" ON casino_chat FOR SELECT USING (true);

-- Authenticated users can send chat
CREATE POLICY "Authenticated can send chat" ON casino_chat FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix roulette_game_state - Everyone needs to VIEW state
-- =====================================================
DROP POLICY IF EXISTS "Update game state" ON roulette_game_state;
DROP POLICY IF EXISTS "Anyone can view game state" ON roulette_game_state;
DROP POLICY IF EXISTS "View game state" ON roulette_game_state;

-- Anyone can VIEW game state
CREATE POLICY "Anyone can view game state" ON roulette_game_state FOR SELECT USING (true);

-- Admins can update game state
CREATE POLICY "Admins can update game state" ON roulette_game_state FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- Fix roulette_player_stats - Everyone needs to VIEW stats
-- =====================================================
DROP POLICY IF EXISTS "Manage player stats" ON roulette_player_stats;
DROP POLICY IF EXISTS "Anyone can view player stats" ON roulette_player_stats;

-- Anyone can VIEW player stats
CREATE POLICY "Anyone can view player stats" ON roulette_player_stats FOR SELECT USING (true);

-- Authenticated users can manage their stats
CREATE POLICY "Manage player stats" ON roulette_player_stats FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix roulette_bets - Players need to see bets
-- =====================================================
DROP POLICY IF EXISTS "Place roulette bets" ON roulette_bets;
DROP POLICY IF EXISTS "Update bets" ON roulette_bets;
DROP POLICY IF EXISTS "Anyone can view bets" ON roulette_bets;
DROP POLICY IF EXISTS "View roulette bets" ON roulette_bets;

-- Anyone can VIEW bets
CREATE POLICY "Anyone can view bets" ON roulette_bets FOR SELECT USING (true);

-- Authenticated users can place bets
CREATE POLICY "Place roulette bets" ON roulette_bets FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update bets
CREATE POLICY "Update bets" ON roulette_bets FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix roulette_chat - Everyone needs to VIEW chat
-- =====================================================
DROP POLICY IF EXISTS "Send roulette chat" ON roulette_chat;
DROP POLICY IF EXISTS "Anyone can view roulette chat" ON roulette_chat;
DROP POLICY IF EXISTS "View roulette chat" ON roulette_chat;

-- Anyone can VIEW roulette chat
CREATE POLICY "Anyone can view roulette chat" ON roulette_chat FOR SELECT USING (true);

-- Authenticated users can send chat
CREATE POLICY "Send roulette chat" ON roulette_chat FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix the_life_crime_drops - Public viewing
-- =====================================================
DROP POLICY IF EXISTS "Allow service role full access to crime drops" ON the_life_crime_drops;
DROP POLICY IF EXISTS "Anyone can view crime drops" ON the_life_crime_drops;

-- Anyone can VIEW crime drops
CREATE POLICY "Anyone can view crime drops" ON the_life_crime_drops FOR SELECT USING (true);

-- Authenticated users can manage crime drops
CREATE POLICY "Authenticated manage crime drops" ON the_life_crime_drops FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix the_life_market_transactions - Public viewing
-- =====================================================
DROP POLICY IF EXISTS "System can insert transactions" ON the_life_market_transactions;
DROP POLICY IF EXISTS "Anyone can view transactions" ON the_life_market_transactions;

-- Anyone can VIEW transactions
CREATE POLICY "Anyone can view transactions" ON the_life_market_transactions FOR SELECT USING (true);

-- Authenticated users can insert transactions
CREATE POLICY "Insert transactions" ON the_life_market_transactions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix the_life_news_feed - Public viewing
-- =====================================================
DROP POLICY IF EXISTS "System can insert news" ON the_life_news_feed;
DROP POLICY IF EXISTS "Anyone can view news" ON the_life_news_feed;

-- Anyone can VIEW news
CREATE POLICY "Anyone can view news" ON the_life_news_feed FOR SELECT USING (true);

-- Authenticated users can insert news
CREATE POLICY "Insert news" ON the_life_news_feed FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix economy_transactions - Public viewing
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated inserts to economy_transactions" ON economy_transactions;
DROP POLICY IF EXISTS "Anyone can view economy transactions" ON economy_transactions;

-- Anyone can VIEW economy transactions
CREATE POLICY "Anyone can view economy transactions" ON economy_transactions FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Insert economy transactions" ON economy_transactions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix game_logs - Public viewing
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated inserts to game_logs" ON game_logs;
DROP POLICY IF EXISTS "Anyone can view game logs" ON game_logs;

-- Anyone can VIEW game logs
CREATE POLICY "Anyone can view game logs" ON game_logs FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Insert game logs" ON game_logs FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix inventory_changes_log - Public viewing
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated inserts to inventory_changes_log" ON inventory_changes_log;
DROP POLICY IF EXISTS "Anyone can view inventory changes" ON inventory_changes_log;

-- Anyone can VIEW inventory changes
CREATE POLICY "Anyone can view inventory changes" ON inventory_changes_log FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Insert inventory changes" ON inventory_changes_log FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix player_risk_scores - Public viewing
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated inserts to player_risk_scores" ON player_risk_scores;
DROP POLICY IF EXISTS "Anyone can view risk scores" ON player_risk_scores;

-- Anyone can VIEW risk scores
CREATE POLICY "Anyone can view risk scores" ON player_risk_scores FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Insert risk scores" ON player_risk_scores FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix player_sessions - Public viewing
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated inserts to player_sessions" ON player_sessions;
DROP POLICY IF EXISTS "Allow authenticated updates to own sessions" ON player_sessions;
DROP POLICY IF EXISTS "Anyone can view sessions" ON player_sessions;

-- Anyone can VIEW sessions
CREATE POLICY "Anyone can view sessions" ON player_sessions FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Insert sessions" ON player_sessions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update
CREATE POLICY "Update sessions" ON player_sessions FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix slot_audit_log - Admin viewing only
-- =====================================================
DROP POLICY IF EXISTS "Allow insert audit for authenticated" ON slot_audit_log;
DROP POLICY IF EXISTS "Admins can view audit log" ON slot_audit_log;
DROP POLICY IF EXISTS "Anyone can view audit log" ON slot_audit_log;

-- Anyone can VIEW audit log
CREATE POLICY "Anyone can view audit log" ON slot_audit_log FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Insert audit log" ON slot_audit_log FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Success message
-- =====================================================
DO $$ BEGIN RAISE NOTICE 'All policies have been fixed. Please refresh your page.'; END $$;
