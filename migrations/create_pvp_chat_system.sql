-- Create PVP Chat System for The Life game
-- Players can send messages visible to everyone in PVP area

CREATE TABLE IF NOT EXISTS the_life_pvp_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pvp_chat_created_at ON the_life_pvp_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pvp_chat_player_id ON the_life_pvp_chat(player_id);

-- Enable RLS
ALTER TABLE the_life_pvp_chat ENABLE ROW LEVEL SECURITY;

-- Policies for chat
DROP POLICY IF EXISTS "Anyone can view chat messages" ON the_life_pvp_chat;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON the_life_pvp_chat;

CREATE POLICY "Anyone can view chat messages"
  ON the_life_pvp_chat FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON the_life_pvp_chat FOR INSERT
  WITH CHECK (
    player_id IN (SELECT id FROM the_life_players WHERE user_id = auth.uid())
  );

-- Function to clean up old messages (keep only last 100 messages)
CREATE OR REPLACE FUNCTION cleanup_old_pvp_chat()
RETURNS void AS $$
BEGIN
  DELETE FROM the_life_pvp_chat
  WHERE id NOT IN (
    SELECT id FROM the_life_pvp_chat
    ORDER BY created_at DESC
    LIMIT 100
  );
END;
$$ LANGUAGE plpgsql;

-- Note: You can schedule this function to run periodically
-- Example: SELECT cleanup_old_pvp_chat();
