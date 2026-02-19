-- SIMPLE FIX: Remove circular dependency on user_roles
-- Run this in Supabase SQL editor

-- Drop ALL existing policies on user_roles
DROP POLICY IF EXISTS "Anyone can view roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Service role bypass" ON user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON user_roles;

-- Create simple policies without circular dependency
-- Everyone can SELECT roles (needed for permission checks everywhere)
CREATE POLICY "Public read access" ON user_roles FOR SELECT USING (true);

-- Users can INSERT their own role (for new user signup)
CREATE POLICY "Users can insert own role" ON user_roles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own role
CREATE POLICY "Users can update own role" ON user_roles FOR UPDATE 
  USING (auth.uid() = user_id);

-- Service role has full access (for backend operations)
-- Note: Service role bypasses RLS by default, so this is just for documentation

-- Verify it worked
SELECT 'user_roles policies fixed' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_roles';
