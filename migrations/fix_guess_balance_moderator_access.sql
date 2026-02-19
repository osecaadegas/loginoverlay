-- Fix Guess Balance RLS policies to allow moderators
-- Run this migration in your Supabase SQL editor
-- This allows moderators to create/update/delete guess balance sessions

-- =====================================================
-- 1. UPDATE SESSION POLICIES TO INCLUDE MODERATORS
-- =====================================================

-- Admins AND Moderators can create sessions
DROP POLICY IF EXISTS "admins can create sessions" ON guess_balance_sessions;
CREATE POLICY "admins and mods can create sessions"
  ON guess_balance_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- Admins AND Moderators can update sessions
DROP POLICY IF EXISTS "admins can update sessions" ON guess_balance_sessions;
CREATE POLICY "admins and mods can update sessions"
  ON guess_balance_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- Admins AND Moderators can delete sessions
DROP POLICY IF EXISTS "admins can delete sessions" ON guess_balance_sessions;
CREATE POLICY "admins and mods can delete sessions"
  ON guess_balance_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );


-- =====================================================
-- 2. UPDATE SLOTS POLICIES TO INCLUDE MODERATORS
-- =====================================================

-- Admins AND Moderators can create slots
DROP POLICY IF EXISTS "admins can create slots" ON guess_balance_slots;
CREATE POLICY "admins and mods can create slots"
  ON guess_balance_slots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- Admins AND Moderators can update slots
DROP POLICY IF EXISTS "admins can update slots" ON guess_balance_slots;
CREATE POLICY "admins and mods can update slots"
  ON guess_balance_slots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- Admins AND Moderators can delete slots
DROP POLICY IF EXISTS "admins can delete slots" ON guess_balance_slots;
CREATE POLICY "admins and mods can delete slots"
  ON guess_balance_slots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );


-- =====================================================
-- 3. ALSO UPDATE GUESSES VIEW POLICY FOR MODERATORS
-- =====================================================

-- Admins AND Moderators can view all guesses
DROP POLICY IF EXISTS "users can view guesses" ON guess_balance_guesses;
CREATE POLICY "users can view guesses"
  ON guess_balance_guesses FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM guess_balance_sessions 
      WHERE guess_balance_sessions.id = guess_balance_guesses.session_id 
      AND (reveal_answer = TRUE OR status = 'completed')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );
