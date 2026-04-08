-- Fix streamelements_connections RLS: credentials must be private per-user
-- The "Anyone can view connections" policy leaks SE JWT tokens to all users.
-- Drop ALL public-read policies and keep only the per-user one.

DROP POLICY IF EXISTS "Anyone can view connections" ON streamelements_connections;
DROP POLICY IF EXISTS "Anyone can view SE usernames" ON streamelements_connections;
DROP POLICY IF EXISTS "Everyone can view connections" ON streamelements_connections;
DROP POLICY IF EXISTS "Public can view connections" ON streamelements_connections;

-- Ensure the per-user SELECT policy exists
DROP POLICY IF EXISTS "Users can view their own SE connection" ON streamelements_connections;
CREATE POLICY "Users can view their own SE connection" ON streamelements_connections
    FOR SELECT
    USING ((select auth.uid()) = user_id);
