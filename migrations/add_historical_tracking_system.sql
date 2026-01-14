-- Historical Tracking System for Slots, Bonuses, and Tournaments
-- Production-grade persistent stats with real-time updates

-- ============================================================================
-- SLOT HISTORY TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS slot_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Slot Identification
  slot_name VARCHAR(200) NOT NULL,
  provider VARCHAR(100),
  image_url VARCHAR(500),
  
  -- Cumulative Stats
  total_plays INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_wagered NUMERIC(12, 2) DEFAULT 0,
  total_won NUMERIC(12, 2) DEFAULT 0,
  total_profit_loss NUMERIC(12, 2) DEFAULT 0,
  
  -- Best Ever Records
  biggest_win_amount NUMERIC(12, 2) DEFAULT 0,
  best_multiplier NUMERIC(8, 2) DEFAULT 0,
  best_multiplier_bet_size NUMERIC(8, 2) DEFAULT 0,
  
  -- Calculated Averages
  average_payout NUMERIC(8, 2) DEFAULT 0,
  win_rate NUMERIC(5, 2) DEFAULT 0, -- Percentage
  rtp NUMERIC(5, 2) DEFAULT 0, -- Return to player percentage
  
  -- Timestamps
  first_played_at TIMESTAMPTZ DEFAULT NOW(),
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, slot_name, provider)
);

CREATE INDEX idx_slot_history_user ON slot_history(user_id);
CREATE INDEX idx_slot_history_provider ON slot_history(provider);
CREATE INDEX idx_slot_history_total_plays ON slot_history(total_plays DESC);
CREATE INDEX idx_slot_history_profit_loss ON slot_history(total_profit_loss DESC);

-- ============================================================================
-- BONUS HUNT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS bonus_hunt_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Hunt Session Info
  hunt_name VARCHAR(200),
  hunt_date DATE DEFAULT CURRENT_DATE,
  
  -- Bonus Details
  slot_name VARCHAR(200) NOT NULL,
  provider VARCHAR(100),
  bet_size NUMERIC(8, 2) NOT NULL,
  bonus_cost NUMERIC(10, 2) NOT NULL,
  bonus_win NUMERIC(10, 2) DEFAULT 0,
  bonus_multiplier NUMERIC(8, 2) DEFAULT 0,
  
  -- Outcome
  is_win BOOLEAN DEFAULT false,
  profit_loss NUMERIC(10, 2) DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  video_url VARCHAR(500),
  
  -- Timestamps
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bonus_hunt_user ON bonus_hunt_history(user_id);
CREATE INDEX idx_bonus_hunt_date ON bonus_hunt_history(hunt_date DESC);
CREATE INDEX idx_bonus_hunt_slot ON bonus_hunt_history(slot_name);
CREATE INDEX idx_bonus_hunt_multiplier ON bonus_hunt_history(bonus_multiplier DESC);

-- ============================================================================
-- BONUS HUNT SUMMARY STATS (Aggregated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bonus_hunt_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Cumulative Totals
  total_hunts INTEGER DEFAULT 0,
  total_bonuses INTEGER DEFAULT 0,
  total_bet NUMERIC(12, 2) DEFAULT 0,
  total_cost NUMERIC(12, 2) DEFAULT 0,
  total_won NUMERIC(12, 2) DEFAULT 0,
  total_profit_loss NUMERIC(12, 2) DEFAULT 0,
  
  -- Averages
  average_bet_size NUMERIC(8, 2) DEFAULT 0,
  average_bonus_cost NUMERIC(8, 2) DEFAULT 0,
  average_bonus_win NUMERIC(8, 2) DEFAULT 0,
  average_multiplier NUMERIC(8, 2) DEFAULT 0,
  
  -- Best Ever Records
  best_bonus_payout NUMERIC(10, 2) DEFAULT 0,
  best_bonus_multiplier NUMERIC(8, 2) DEFAULT 0,
  best_bonus_slot VARCHAR(200),
  
  -- Win Rates
  win_rate NUMERIC(5, 2) DEFAULT 0,
  breakeven_rate NUMERIC(5, 2) DEFAULT 0,
  
  -- Required Stats
  required_multiplier NUMERIC(8, 2) DEFAULT 0,
  required_average NUMERIC(8, 2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_bonus_hunt_stats_user ON bonus_hunt_stats(user_id);

-- ============================================================================
-- TOURNAMENT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS tournament_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tournament Info
  tournament_name VARCHAR(200) NOT NULL,
  tournament_date DATE DEFAULT CURRENT_DATE,
  entry_fee NUMERIC(8, 2) DEFAULT 0,
  prize_pool NUMERIC(10, 2) DEFAULT 0,
  
  -- Player Performance
  total_rounds INTEGER DEFAULT 0,
  rounds_won INTEGER DEFAULT 0,
  total_score NUMERIC(10, 2) DEFAULT 0,
  final_placement INTEGER,
  prize_won NUMERIC(10, 2) DEFAULT 0,
  
  -- Per-Round Stats
  average_score_per_round NUMERIC(8, 2) DEFAULT 0,
  best_round_score NUMERIC(8, 2) DEFAULT 0,
  best_round_slot VARCHAR(200),
  
  -- Profit Analysis
  net_profit NUMERIC(10, 2) DEFAULT 0,
  roi NUMERIC(5, 2) DEFAULT 0, -- Return on investment percentage
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed', -- active, completed, abandoned
  
  -- Metadata
  notes TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournament_history_user ON tournament_history(user_id);
CREATE INDEX idx_tournament_history_date ON tournament_history(tournament_date DESC);
CREATE INDEX idx_tournament_history_status ON tournament_history(status);

-- ============================================================================
-- TOURNAMENT ROUND DETAILS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tournament_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournament_history(id) ON DELETE CASCADE,
  
  -- Round Info
  round_number INTEGER NOT NULL,
  slot_name VARCHAR(200) NOT NULL,
  bet_size NUMERIC(8, 2) NOT NULL,
  
  -- Results
  score NUMERIC(8, 2) DEFAULT 0,
  multiplier NUMERIC(8, 2) DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  
  -- Timestamps
  played_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tournament_id, round_number)
);

CREATE INDEX idx_tournament_rounds_tournament ON tournament_rounds(tournament_id);
CREATE INDEX idx_tournament_rounds_score ON tournament_rounds(score DESC);

-- ============================================================================
-- DAILY SESSION TRACKING (Bonus Feature)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session Info
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Totals
  total_wagered NUMERIC(12, 2) DEFAULT 0,
  total_won NUMERIC(12, 2) DEFAULT 0,
  total_profit_loss NUMERIC(12, 2) DEFAULT 0,
  
  -- Counts
  total_spins INTEGER DEFAULT 0,
  total_bonuses INTEGER DEFAULT 0,
  unique_slots_played INTEGER DEFAULT 0,
  
  -- Best Records
  biggest_win NUMERIC(10, 2) DEFAULT 0,
  best_slot VARCHAR(200),
  
  -- Duration
  session_duration_minutes INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, session_date)
);

CREATE INDEX idx_daily_sessions_user ON daily_sessions(user_id);
CREATE INDEX idx_daily_sessions_date ON daily_sessions(session_date DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE slot_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_hunt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_hunt_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sessions ENABLE ROW LEVEL SECURITY;

-- Slot History Policies
CREATE POLICY "Users can view own slot history"
  ON slot_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own slot history"
  ON slot_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slot history"
  ON slot_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own slot history"
  ON slot_history FOR DELETE
  USING (auth.uid() = user_id);

-- Bonus Hunt History Policies
CREATE POLICY "Users can view own bonus hunt history"
  ON bonus_hunt_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bonus hunt history"
  ON bonus_hunt_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bonus hunt history"
  ON bonus_hunt_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bonus hunt history"
  ON bonus_hunt_history FOR DELETE
  USING (auth.uid() = user_id);

-- Bonus Hunt Stats Policies
CREATE POLICY "Users can view own bonus hunt stats"
  ON bonus_hunt_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bonus hunt stats"
  ON bonus_hunt_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bonus hunt stats"
  ON bonus_hunt_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Tournament History Policies
CREATE POLICY "Users can view own tournament history"
  ON tournament_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tournament history"
  ON tournament_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tournament history"
  ON tournament_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tournament history"
  ON tournament_history FOR DELETE
  USING (auth.uid() = user_id);

-- Tournament Rounds Policies
CREATE POLICY "Users can view own tournament rounds"
  ON tournament_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_history
      WHERE tournament_history.id = tournament_rounds.tournament_id
        AND tournament_history.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tournament rounds"
  ON tournament_rounds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament_history
      WHERE tournament_history.id = tournament_rounds.tournament_id
        AND tournament_history.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tournament rounds"
  ON tournament_rounds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournament_history
      WHERE tournament_history.id = tournament_rounds.tournament_id
        AND tournament_history.user_id = auth.uid()
    )
  );

-- Daily Sessions Policies
CREATE POLICY "Users can view own daily sessions"
  ON daily_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily sessions"
  ON daily_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily sessions"
  ON daily_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger for updated_at on slot_history
CREATE TRIGGER update_slot_history_updated_at
  BEFORE UPDATE ON slot_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on bonus_hunt_history
CREATE TRIGGER update_bonus_hunt_history_updated_at
  BEFORE UPDATE ON bonus_hunt_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on bonus_hunt_stats
CREATE TRIGGER update_bonus_hunt_stats_updated_at
  BEFORE UPDATE ON bonus_hunt_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on tournament_history
CREATE TRIGGER update_tournament_history_updated_at
  BEFORE UPDATE ON tournament_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on daily_sessions
CREATE TRIGGER update_daily_sessions_updated_at
  BEFORE UPDATE ON daily_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS FOR AUTOMATIC STAT CALCULATIONS
-- ============================================================================

-- Function to update slot history after a play
CREATE OR REPLACE FUNCTION update_slot_stats(
  p_user_id UUID,
  p_slot_name VARCHAR,
  p_provider VARCHAR,
  p_image_url VARCHAR,
  p_bet_amount NUMERIC,
  p_win_amount NUMERIC,
  p_multiplier NUMERIC
)
RETURNS void AS $$
DECLARE
  v_profit_loss NUMERIC;
  v_is_win BOOLEAN;
BEGIN
  v_profit_loss := p_win_amount - p_bet_amount;
  v_is_win := p_win_amount > 0;
  
  INSERT INTO slot_history (
    user_id, slot_name, provider, image_url,
    total_plays, total_wins, total_wagered, total_won, total_profit_loss,
    biggest_win_amount, best_multiplier, best_multiplier_bet_size,
    last_played_at
  )
  VALUES (
    p_user_id, p_slot_name, p_provider, p_image_url,
    1, CASE WHEN v_is_win THEN 1 ELSE 0 END, p_bet_amount, p_win_amount, v_profit_loss,
    p_win_amount, p_multiplier, p_bet_amount,
    NOW()
  )
  ON CONFLICT (user_id, slot_name, provider) DO UPDATE SET
    total_plays = slot_history.total_plays + 1,
    total_wins = slot_history.total_wins + CASE WHEN v_is_win THEN 1 ELSE 0 END,
    total_wagered = slot_history.total_wagered + p_bet_amount,
    total_won = slot_history.total_won + p_win_amount,
    total_profit_loss = slot_history.total_profit_loss + v_profit_loss,
    biggest_win_amount = GREATEST(slot_history.biggest_win_amount, p_win_amount),
    best_multiplier = GREATEST(slot_history.best_multiplier, p_multiplier),
    best_multiplier_bet_size = CASE 
      WHEN p_multiplier > slot_history.best_multiplier THEN p_bet_amount
      ELSE slot_history.best_multiplier_bet_size
    END,
    average_payout = (slot_history.total_won + p_win_amount) / (slot_history.total_plays + 1),
    win_rate = ((slot_history.total_wins + CASE WHEN v_is_win THEN 1 ELSE 0 END)::NUMERIC / (slot_history.total_plays + 1)) * 100,
    rtp = CASE 
      WHEN (slot_history.total_wagered + p_bet_amount) > 0 
      THEN ((slot_history.total_won + p_win_amount) / (slot_history.total_wagered + p_bet_amount)) * 100
      ELSE 0
    END,
    last_played_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update bonus hunt stats
CREATE OR REPLACE FUNCTION recalculate_bonus_hunt_stats(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_stats RECORD;
BEGIN
  SELECT
    COUNT(DISTINCT hunt_name) as total_hunts,
    COUNT(*) as total_bonuses,
    SUM(bet_size) as total_bet,
    SUM(bonus_cost) as total_cost,
    SUM(bonus_win) as total_won,
    SUM(profit_loss) as total_profit_loss,
    AVG(bet_size) as average_bet_size,
    AVG(bonus_cost) as average_bonus_cost,
    AVG(bonus_win) as average_bonus_win,
    AVG(bonus_multiplier) as average_multiplier,
    MAX(bonus_win) as best_bonus_payout,
    MAX(bonus_multiplier) as best_bonus_multiplier,
    (SELECT slot_name FROM bonus_hunt_history WHERE user_id = p_user_id ORDER BY bonus_win DESC LIMIT 1) as best_bonus_slot,
    (COUNT(*) FILTER (WHERE is_win = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100 as win_rate,
    (COUNT(*) FILTER (WHERE profit_loss >= 0)::NUMERIC / NULLIF(COUNT(*), 0)) * 100 as breakeven_rate
  INTO v_stats
  FROM bonus_hunt_history
  WHERE user_id = p_user_id;
  
  INSERT INTO bonus_hunt_stats (
    user_id, total_hunts, total_bonuses, total_bet, total_cost, total_won, total_profit_loss,
    average_bet_size, average_bonus_cost, average_bonus_win, average_multiplier,
    best_bonus_payout, best_bonus_multiplier, best_bonus_slot,
    win_rate, breakeven_rate,
    required_multiplier, required_average
  )
  VALUES (
    p_user_id,
    COALESCE(v_stats.total_hunts, 0),
    COALESCE(v_stats.total_bonuses, 0),
    COALESCE(v_stats.total_bet, 0),
    COALESCE(v_stats.total_cost, 0),
    COALESCE(v_stats.total_won, 0),
    COALESCE(v_stats.total_profit_loss, 0),
    COALESCE(v_stats.average_bet_size, 0),
    COALESCE(v_stats.average_bonus_cost, 0),
    COALESCE(v_stats.average_bonus_win, 0),
    COALESCE(v_stats.average_multiplier, 0),
    COALESCE(v_stats.best_bonus_payout, 0),
    COALESCE(v_stats.best_bonus_multiplier, 0),
    v_stats.best_bonus_slot,
    COALESCE(v_stats.win_rate, 0),
    COALESCE(v_stats.breakeven_rate, 0),
    CASE 
      WHEN COALESCE(v_stats.average_bet_size, 0) > 0 
      THEN COALESCE(v_stats.total_cost, 0) / COALESCE(v_stats.average_bet_size, 1)
      ELSE 0
    END,
    CASE
      WHEN COALESCE(v_stats.total_bonuses, 0) > 0
      THEN COALESCE(v_stats.total_cost, 0) / COALESCE(v_stats.total_bonuses, 1)
      ELSE 0
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_hunts = EXCLUDED.total_hunts,
    total_bonuses = EXCLUDED.total_bonuses,
    total_bet = EXCLUDED.total_bet,
    total_cost = EXCLUDED.total_cost,
    total_won = EXCLUDED.total_won,
    total_profit_loss = EXCLUDED.total_profit_loss,
    average_bet_size = EXCLUDED.average_bet_size,
    average_bonus_cost = EXCLUDED.average_bonus_cost,
    average_bonus_win = EXCLUDED.average_bonus_win,
    average_multiplier = EXCLUDED.average_multiplier,
    best_bonus_payout = EXCLUDED.best_bonus_payout,
    best_bonus_multiplier = EXCLUDED.best_bonus_multiplier,
    best_bonus_slot = EXCLUDED.best_bonus_slot,
    win_rate = EXCLUDED.win_rate,
    breakeven_rate = EXCLUDED.breakeven_rate,
    required_multiplier = EXCLUDED.required_multiplier,
    required_average = EXCLUDED.required_average,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate bonus hunt stats after insert/update/delete
CREATE OR REPLACE FUNCTION trigger_recalculate_bonus_hunt_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_bonus_hunt_stats(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_bonus_hunt_stats(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalc_bonus_stats_after_change
  AFTER INSERT OR UPDATE OR DELETE ON bonus_hunt_history
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_bonus_hunt_stats();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE slot_history IS 'Per-slot historical tracking with cumulative stats and best-ever records';
COMMENT ON TABLE bonus_hunt_history IS 'Individual bonus entries with outcomes and metadata';
COMMENT ON TABLE bonus_hunt_stats IS 'Aggregated bonus hunt statistics per user, auto-calculated';
COMMENT ON TABLE tournament_history IS 'Tournament participation history with performance metrics';
COMMENT ON TABLE tournament_rounds IS 'Individual round details within tournaments';
COMMENT ON TABLE daily_sessions IS 'Daily session summaries for performance tracking';
