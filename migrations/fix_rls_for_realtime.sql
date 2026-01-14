-- Fix RLS policies for Realtime on the_life_players
-- Allow authenticated users to receive realtime updates

-- Drop existing policies that might be blocking realtime
DROP POLICY IF EXISTS "Users can view realtime updates to their player" ON the_life_players;
DROP POLICY IF EXISTS "Users can view other players for PvP" ON the_life_players;
DROP POLICY IF EXISTS "Players can view own data" ON the_life_players;
DROP POLICY IF EXISTS "Players can view all players" ON the_life_players;

-- Create comprehensive SELECT policy for realtime
CREATE POLICY "Enable realtime for all authenticated users"
ON the_life_players
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own player data
DROP POLICY IF EXISTS "Users can update own player" ON the_life_players;
CREATE POLICY "Users can update own player"
ON the_life_players
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own player data
DROP POLICY IF EXISTS "Users can insert own player" ON the_life_players;
CREATE POLICY "Users can insert own player"
ON the_life_players
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Important: Grant SELECT on the table to authenticated role
GRANT SELECT ON the_life_players TO authenticated;
GRANT UPDATE ON the_life_players TO authenticated;
GRANT INSERT ON the_life_players TO authenticated;

-- Verify the publication is set up correctly
-- This ensures realtime events are broadcasted
DO $$
BEGIN
  -- Check if table is in publication, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'the_life_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE the_life_players;
  END IF;
END $$;

-- Show current policies (for verification)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'the_life_players';
