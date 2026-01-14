-- Drop existing table and recreate
DROP TABLE IF EXISTS game_sessions CASCADE;

-- Create table to track game sessions and results
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type VARCHAR(50) NOT NULL,
  bet_amount INTEGER NOT NULL,
  result_amount INTEGER NOT NULL,
  game_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_game_type ON game_sessions(game_type);
CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at);

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can insert their own game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Admins can view all game sessions" ON game_sessions;

-- RLS Policies
CREATE POLICY "Users can view their own game sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all game sessions
CREATE POLICY "Admins can view all game sessions"
  ON game_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Create a view for game statistics
CREATE OR REPLACE VIEW game_statistics AS
SELECT 
  user_id,
  game_type,
  COUNT(*) as games_played,
  SUM(bet_amount) as total_wagered,
  SUM(result_amount) as net_profit,
  AVG(result_amount) as avg_result,
  MAX(result_amount) as biggest_win,
  MIN(result_amount) as biggest_loss,
  COUNT(CASE WHEN result_amount > 0 THEN 1 END) as wins,
  COUNT(CASE WHEN result_amount < 0 THEN 1 END) as losses,
  COUNT(CASE WHEN result_amount = 0 THEN 1 END) as pushes
FROM game_sessions
GROUP BY user_id, game_type;

-- Grant access to the view
GRANT SELECT ON game_statistics TO authenticated;

COMMENT ON TABLE game_sessions IS 'Tracks all game sessions and their results for users';
COMMENT ON VIEW game_statistics IS 'Provides aggregated statistics for each user per game type';
