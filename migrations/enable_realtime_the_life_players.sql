-- Enable Realtime for The Life Players table
-- This allows real-time subscriptions to player data changes

-- Enable realtime replication on the_life_players table
ALTER PUBLICATION supabase_realtime ADD TABLE the_life_players;

-- Ensure RLS is enabled
ALTER TABLE the_life_players ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own updates in realtime
DROP POLICY IF EXISTS "Users can view realtime updates to their player" ON the_life_players;
CREATE POLICY "Users can view realtime updates to their player"
ON the_life_players
FOR SELECT
USING (auth.uid() = user_id);

-- Also allow viewing other players for PvP (needed for online player list)
DROP POLICY IF EXISTS "Users can view other players for PvP" ON the_life_players;
CREATE POLICY "Users can view other players for PvP"
ON the_life_players
FOR SELECT
USING (true);
