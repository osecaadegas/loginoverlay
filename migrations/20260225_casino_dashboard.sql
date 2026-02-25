-- ============================================================================
-- CASINO DASHBOARD MIGRATION
-- Adds fields to slots table + creates tournaments & leaderboard tables
-- ============================================================================

-- 1. Extend the existing slots table with dashboard-specific fields
ALTER TABLE slots ADD COLUMN IF NOT EXISTS hit_rate NUMERIC(5, 2);
ALTER TABLE slots ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'slots';

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_slots_popularity ON slots(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_slots_category ON slots(category);
CREATE INDEX IF NOT EXISTS idx_slots_provider ON slots(provider);
CREATE INDEX IF NOT EXISTS idx_slots_is_featured ON slots(is_featured);

-- ============================================================================
-- 2. TOURNAMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  prize_pool NUMERIC(12, 2) DEFAULT 0,
  entry_fee NUMERIC(8, 2) DEFAULT 0,
  max_players INTEGER DEFAULT 32,
  status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, active, completed, cancelled
  bracket_structure_json JSONB DEFAULT '{}',
  game_id UUID REFERENCES slots(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON tournaments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game_id);

-- ============================================================================
-- 3. LEADERBOARD ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  score NUMERIC(12, 2) DEFAULT 0,
  rank INTEGER,
  prize_won NUMERIC(10, 2) DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  best_multiplier NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_tournament ON leaderboard_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard_entries(tournament_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_entries(tournament_id, rank);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Tournaments: anyone can read, admins can write
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments are viewable by everyone"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "Tournaments are manageable by admins"
  ON tournaments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin')
    )
  );

-- Leaderboard: anyone can read, system/admins can write
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard is viewable by everyone"
  ON leaderboard_entries FOR SELECT
  USING (true);

CREATE POLICY "Leaderboard is manageable by admins"
  ON leaderboard_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin')
    )
  );

-- ============================================================================
-- 5. ENABLE REALTIME for leaderboard (live updates)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Get trending slots (highest popularity in last 7 days)
CREATE OR REPLACE FUNCTION get_trending_slots(p_limit INTEGER DEFAULT 20)
RETURNS SETOF slots
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM slots
  WHERE status = 'active'
  ORDER BY popularity_score DESC, created_at DESC
  LIMIT p_limit;
$$;

-- Get slots by category with pagination
CREATE OR REPLACE FUNCTION get_slots_by_category(
  p_category VARCHAR DEFAULT NULL,
  p_provider VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF slots
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM slots
  WHERE status = 'active'
    AND (p_category IS NULL OR category = p_category)
    AND (p_provider IS NULL OR provider = p_provider)
  ORDER BY popularity_score DESC, name ASC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Get tournament leaderboard
CREATE OR REPLACE FUNCTION get_tournament_leaderboard(p_tournament_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username VARCHAR,
  avatar_url TEXT,
  score NUMERIC,
  rank INTEGER,
  prize_won NUMERIC,
  games_played INTEGER,
  best_multiplier NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    le.id, le.user_id, le.username, le.avatar_url,
    le.score, le.rank, le.prize_won, le.games_played, le.best_multiplier
  FROM leaderboard_entries le
  WHERE le.tournament_id = p_tournament_id
  ORDER BY le.score DESC;
$$;
