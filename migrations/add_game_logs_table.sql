-- Game Logs Table - Primary logging table for all player actions
CREATE TABLE IF NOT EXISTS game_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_id UUID NOT NULL REFERENCES the_life_players(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL, -- 'economy', 'inventory', 'crime', 'admin', 'auth'
  description TEXT,
  
  -- Value tracking
  old_value JSONB,
  new_value JSONB,
  value_diff NUMERIC,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  session_id UUID,
  
  -- Security
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason VARCHAR(255),
  flag_severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  
  -- Metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_logs_player_id ON game_logs(player_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_timestamp ON game_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_logs_action_type ON game_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_game_logs_action_category ON game_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_game_logs_flagged ON game_logs(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_game_logs_player_timestamp ON game_logs(player_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_logs_session_id ON game_logs(session_id) WHERE session_id IS NOT NULL;

-- Comments
COMMENT ON TABLE game_logs IS 'Comprehensive logging of all player actions for monitoring and anti-cheat';
COMMENT ON COLUMN game_logs.action_category IS 'Broad category for filtering: economy, inventory, crime, admin, auth';
COMMENT ON COLUMN game_logs.value_diff IS 'Numeric difference for money/xp changes (positive = gain, negative = loss)';
COMMENT ON COLUMN game_logs.is_flagged IS 'Auto-flagged by anti-cheat system for suspicious activity';
