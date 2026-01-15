-- Secure Mines Game Table
-- Mine positions are stored server-side and NEVER sent to client until game ends

CREATE TABLE IF NOT EXISTS mines_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_amount INTEGER NOT NULL CHECK (bet_amount >= 10 AND bet_amount <= 1000),
  mine_count INTEGER NOT NULL CHECK (mine_count >= 1 AND mine_count <= 24),
  mine_positions INTEGER[] NOT NULL, -- Array of cell indices (0-24) where mines are
  revealed_cells INTEGER[] DEFAULT '{}', -- Cells the player has clicked
  multiplier DECIMAL(10,4) DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  result_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Index for finding active games by user
CREATE INDEX IF NOT EXISTS idx_mines_games_user_active ON mines_games(user_id, status) WHERE status = 'active';

-- RLS Policies
ALTER TABLE mines_games ENABLE ROW LEVEL SECURITY;

-- Users can only see their own games
CREATE POLICY "Users can view own mines games" ON mines_games
  FOR SELECT USING (auth.uid() = user_id);

-- Only server can insert/update (via service role key)
-- Frontend cannot directly modify this table

-- IMPORTANT: The mine_positions column should NEVER be exposed to the client
-- until the game status changes from 'active' to 'won' or 'lost'
-- This is enforced at the API level, not database level
