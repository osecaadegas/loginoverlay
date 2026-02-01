-- Allow all authenticated users to view recent spins (for the leaderboard/recent spins display)
-- This enables the "Recent Spins" feature to show other players' wins

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view their own spins" ON daily_wheel_spins;

-- Create a more permissive policy - all authenticated users can view all spins
CREATE POLICY "Authenticated users can view all spins"
  ON daily_wheel_spins FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: Insert and Update policies remain restricted to own user
