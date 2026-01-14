-- Games System Database Setup
-- NOTE: All betting and payouts use StreamElements points
-- Points are managed via StreamElements API, not stored in our database

-- Table: game_sessions
-- Track individual game sessions (points are handled by StreamElements)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  se_channel_id TEXT NOT NULL, -- StreamElements channel ID for point transactions
  game_type TEXT NOT NULL, -- 'coinflip', 'dice', 'roulette', 'slots'
  bet_amount INTEGER NOT NULL, -- Points deducted from StreamElements
  result TEXT NOT NULL, -- game-specific result (e.g., 'win', 'loss', 'heads', 'tails', number)
  payout INTEGER NOT NULL, -- 0 for loss, points added to StreamElements for win
  multiplier DECIMAL(10,2) DEFAULT 0,
  points_before INTEGER, -- StreamElements points balance before game
  points_after INTEGER, -- StreamElements points balance after game
  played_at TIMESTAMPTZ DEFAULT NOW(),
  session_data JSONB -- store game-specific details
);

-- Table: game_stats
-- Aggregate statistics per user per game
CREATE TABLE IF NOT EXISTS game_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_wagered INTEGER DEFAULT 0,
  total_won INTEGER DEFAULT 0,
  net_profit INTEGER DEFAULT 0,
  biggest_win INTEGER DEFAULT 0,
  biggest_loss INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0, -- positive for wins, negative for losses
  best_win_streak INTEGER DEFAULT 0,
  worst_loss_streak INTEGER DEFAULT 0,
  last_played TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_type)
);

-- Table: leaderboard
-- Global leaderboard for competitive rankings
CREATE TABLE IF NOT EXISTS game_leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_net_profit INTEGER DEFAULT 0,
  total_games_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  rank INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_sessions
CREATE POLICY "Users can view their own game sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all game sessions"
  ON game_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_active = true
    )
  );

-- RLS Policies for game_stats
CREATE POLICY "Users can view their own game stats"
  ON game_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own game stats"
  ON game_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game stats"
  ON game_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can view leaderboard stats"
  ON game_stats FOR SELECT
  USING (true);

-- RLS Policies for game_leaderboard
CREATE POLICY "Everyone can view the leaderboard"
  ON game_leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own leaderboard entry"
  ON game_leaderboard FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leaderboard entry"
  ON game_leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update game stats after each game
CREATE OR REPLACE FUNCTION update_game_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update game stats
  INSERT INTO game_stats (
    user_id,
    game_type,
    total_games,
    total_wins,
    total_losses,
    total_wagered,
    total_won,
    net_profit,
    biggest_win,
    biggest_loss,
    current_streak,
    best_win_streak,
    worst_loss_streak,
    last_played,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.game_type,
    1,
    CASE WHEN NEW.payout > NEW.bet_amount THEN 1 ELSE 0 END,
    CASE WHEN NEW.payout = 0 THEN 1 ELSE 0 END,
    NEW.bet_amount,
    NEW.payout,
    NEW.payout - NEW.bet_amount,
    CASE WHEN NEW.payout > NEW.bet_amount THEN NEW.payout - NEW.bet_amount ELSE 0 END,
    CASE WHEN NEW.payout = 0 THEN NEW.bet_amount ELSE 0 END,
    CASE WHEN NEW.payout > NEW.bet_amount THEN 1 ELSE -1 END,
    CASE WHEN NEW.payout > NEW.bet_amount THEN 1 ELSE 0 END,
    CASE WHEN NEW.payout = 0 THEN 1 ELSE 0 END,
    NEW.played_at,
    NEW.played_at
  )
  ON CONFLICT (user_id, game_type)
  DO UPDATE SET
    total_games = game_stats.total_games + 1,
    total_wins = game_stats.total_wins + CASE WHEN NEW.payout > NEW.bet_amount THEN 1 ELSE 0 END,
    total_losses = game_stats.total_losses + CASE WHEN NEW.payout = 0 THEN 1 ELSE 0 END,
    total_wagered = game_stats.total_wagered + NEW.bet_amount,
    total_won = game_stats.total_won + NEW.payout,
    net_profit = game_stats.net_profit + (NEW.payout - NEW.bet_amount),
    biggest_win = GREATEST(game_stats.biggest_win, CASE WHEN NEW.payout > NEW.bet_amount THEN NEW.payout - NEW.bet_amount ELSE 0 END),
    biggest_loss = GREATEST(game_stats.biggest_loss, CASE WHEN NEW.payout = 0 THEN NEW.bet_amount ELSE 0 END),
    current_streak = CASE 
      WHEN NEW.payout > NEW.bet_amount THEN 
        CASE WHEN game_stats.current_streak > 0 THEN game_stats.current_streak + 1 ELSE 1 END
      ELSE 
        CASE WHEN game_stats.current_streak < 0 THEN game_stats.current_streak - 1 ELSE -1 END
    END,
    best_win_streak = CASE 
      WHEN NEW.payout > NEW.bet_amount THEN 
        GREATEST(game_stats.best_win_streak, CASE WHEN game_stats.current_streak > 0 THEN game_stats.current_streak + 1 ELSE 1 END)
      ELSE game_stats.best_win_streak
    END,
    worst_loss_streak = CASE 
      WHEN NEW.payout = 0 THEN 
        GREATEST(game_stats.worst_loss_streak, CASE WHEN game_stats.current_streak < 0 THEN ABS(game_stats.current_streak) + 1 ELSE 1 END)
      ELSE game_stats.worst_loss_streak
    END,
    last_played = NEW.played_at,
    updated_at = NEW.played_at;

  -- Update leaderboard
  INSERT INTO game_leaderboard (
    user_id,
    total_net_profit,
    total_games_played,
    total_wins,
    last_updated
  )
  VALUES (
    NEW.user_id,
    NEW.payout - NEW.bet_amount,
    1,
    CASE WHEN NEW.payout > NEW.bet_amount THEN 1 ELSE 0 END,
    NEW.played_at
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_net_profit = game_leaderboard.total_net_profit + (NEW.payout - NEW.bet_amount),
    total_games_played = game_leaderboard.total_games_played + 1,
    total_wins = game_leaderboard.total_wins + CASE WHEN NEW.payout > NEW.bet_amount THEN 1 ELSE 0 END,
    last_updated = NEW.played_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update stats after each game session
CREATE TRIGGER update_stats_after_game
  AFTER INSERT ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_game_stats();

-- Function to update leaderboard ranks (call this periodically)
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS void AS $$
BEGIN
  UPDATE game_leaderboard
  SET rank = subquery.new_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_net_profit DESC, total_wins DESC) as new_rank
    FROM game_leaderboard
  ) AS subquery
  WHERE game_leaderboard.user_id = subquery.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type ON game_sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_game_sessions_played_at ON game_sessions(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_game_type ON game_stats(game_type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON game_leaderboard(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_profit ON game_leaderboard(total_net_profit DESC);

-- Insert some example game configurations (optional)
-- You can add this to a separate config table if needed
COMMENT ON TABLE game_sessions IS 'Stores individual game play sessions with results';
COMMENT ON TABLE game_stats IS 'Aggregate statistics per user per game type';
COMMENT ON TABLE game_leaderboard IS 'Global leaderboard rankings based on total net profit';
