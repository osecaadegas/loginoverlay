-- Create PVP Presence System for tracking online players
-- This replaces the unreliable 'updated_at' method with active heartbeats

CREATE TABLE IF NOT EXISTS the_life_pvp_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_pvp_presence_player_id ON the_life_pvp_presence(player_id);
CREATE INDEX IF NOT EXISTS idx_pvp_presence_heartbeat ON the_life_pvp_presence(last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_pvp_presence_user_id ON the_life_pvp_presence(user_id);

-- Enable RLS
ALTER TABLE the_life_pvp_presence ENABLE ROW LEVEL SECURITY;

-- Policies for presence
DROP POLICY IF EXISTS "Anyone can view presence" ON the_life_pvp_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON the_life_pvp_presence;

CREATE POLICY "Anyone can view presence"
  ON the_life_pvp_presence FOR SELECT
  USING (true);

CREATE POLICY "Users can update own presence"
  ON the_life_pvp_presence FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to update or insert presence (upsert with heartbeat)
CREATE OR REPLACE FUNCTION update_pvp_presence(p_player_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO the_life_pvp_presence (player_id, user_id, last_heartbeat)
  VALUES (p_player_id, p_user_id, NOW())
  ON CONFLICT (player_id)
  DO UPDATE SET last_heartbeat = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up stale presence (older than 90 seconds)
CREATE OR REPLACE FUNCTION cleanup_stale_pvp_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM the_life_pvp_presence
  WHERE last_heartbeat < NOW() - INTERVAL '90 seconds';
END;
$$ LANGUAGE plpgsql;

-- Function to get online players count
CREATE OR REPLACE FUNCTION get_online_players_count()
RETURNS INTEGER AS $$
BEGIN
  -- Clean up first
  PERFORM cleanup_stale_pvp_presence();
  
  -- Return count
  RETURN (SELECT COUNT(*) FROM the_life_pvp_presence);
END;
$$ LANGUAGE plpgsql;

-- Note: Set up a cron job or periodic task to call cleanup_stale_pvp_presence()
-- Or call it before querying online players
-- Example: SELECT cleanup_stale_pvp_presence();
