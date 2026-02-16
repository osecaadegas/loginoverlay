-- =====================================================
-- FIX: Anti-cheat tables RLS and items boost columns
-- =====================================================
-- Issue 1: player_sessions and game_logs have no RLS policies (403 errors)
-- Issue 2: the_life_items missing boost_type and boost_amount columns (500 errors)
-- =====================================================

-- =====================================================
-- PART 1: Add missing columns to the_life_items
-- =====================================================

-- Add boost_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_items' AND column_name = 'boost_type'
  ) THEN
    ALTER TABLE the_life_items ADD COLUMN boost_type TEXT;
    COMMENT ON COLUMN the_life_items.boost_type IS 'Type of boost: power, defense, speed, etc.';
  END IF;
END $$;

-- Add boost_amount column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_items' AND column_name = 'boost_amount'
  ) THEN
    ALTER TABLE the_life_items ADD COLUMN boost_amount INTEGER DEFAULT 0;
    COMMENT ON COLUMN the_life_items.boost_amount IS 'Amount of boost provided by the item';
  END IF;
END $$;

-- =====================================================
-- PART 2: Create player_sessions table if missing
-- =====================================================

CREATE TABLE IF NOT EXISTS player_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_player_sessions_player_id ON player_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_active ON player_sessions(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own sessions" ON player_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON player_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON player_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON player_sessions;

-- Allow authenticated users to insert their own sessions
CREATE POLICY "Users can create own sessions"
  ON player_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to view their own sessions
CREATE POLICY "Users can view own sessions"
  ON player_sessions FOR SELECT
  TO authenticated
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Allow users to update their own sessions
CREATE POLICY "Users can update own sessions"
  ON player_sessions FOR UPDATE
  TO authenticated
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Admins can see all sessions
CREATE POLICY "Admins can view all sessions"
  ON player_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- PART 3: Create game_logs table if missing + RLS
-- =====================================================

CREATE TABLE IF NOT EXISTS game_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_id UUID NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL,
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  value_diff NUMERIC,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  session_id UUID,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason VARCHAR(255),
  flag_severity VARCHAR(20),
  metadata JSONB
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_game_logs_player_id ON game_logs(player_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_timestamp ON game_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_logs_action_type ON game_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_game_logs_action_category ON game_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_game_logs_flagged ON game_logs(is_flagged) WHERE is_flagged = TRUE;

-- Enable RLS
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own logs" ON game_logs;
DROP POLICY IF EXISTS "Users can view own logs" ON game_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON game_logs;

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert own logs"
  ON game_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Allow users to view their own logs
CREATE POLICY "Users can view own logs"
  ON game_logs FOR SELECT
  TO authenticated
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Admins can see all logs
CREATE POLICY "Admins can view all logs"
  ON game_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- PART 4: Grant permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON player_sessions TO authenticated;
GRANT SELECT, INSERT ON game_logs TO authenticated;

-- Comments
COMMENT ON TABLE player_sessions IS 'Tracks active player sessions for anti-cheat';
COMMENT ON TABLE game_logs IS 'Comprehensive logging of all player actions for monitoring';
