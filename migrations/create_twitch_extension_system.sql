-- ═══════════════════════════════════════════════════════════════════════
-- TWITCH EXTENSION SYSTEM — Full Database Schema
-- Covers: Channel Points, Predictions, Slot Voting, Giveaway, Stats, Leaderboards
-- ═══════════════════════════════════════════════════════════════════════

-- ─── VIEWER POINTS (Internal Channel Points) ────────────────────────

CREATE TABLE IF NOT EXISTS ext_viewer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  twitch_display_name TEXT NOT NULL DEFAULT '',
  twitch_avatar TEXT DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broadcaster_id, twitch_user_id)
);

CREATE INDEX idx_ext_vp_broadcaster ON ext_viewer_points(broadcaster_id);
CREATE INDEX idx_ext_vp_points ON ext_viewer_points(broadcaster_id, points DESC);

-- ─── BONUS HUNT PREDICTIONS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ext_bh_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL,               -- e.g. "hunt_2026-03-19_1"
  bonus_index INTEGER NOT NULL,         -- which bonus in the hunt
  slot_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'    -- open, locked, resolved
    CHECK (status IN ('open', 'locked', 'resolved')),
  actual_multiplier NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_ext_bhp_broadcaster ON ext_bh_predictions(broadcaster_id, round_id);

CREATE TABLE IF NOT EXISTS ext_bh_prediction_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES ext_bh_predictions(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  twitch_display_name TEXT NOT NULL DEFAULT '',
  predicted_multiplier NUMERIC(10,2) NOT NULL,
  points_wagered INTEGER NOT NULL DEFAULT 0,
  points_won INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(10,4),              -- how close (lower = better)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, twitch_user_id)
);

CREATE INDEX idx_ext_bhpe_prediction ON ext_bh_prediction_entries(prediction_id);

-- ─── GUESS THE TOTAL PAY ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ext_bh_total_guess (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'locked', 'resolved')),
  actual_total NUMERIC(12,2),
  winner_twitch_id TEXT,
  winner_display_name TEXT,
  prize_points INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ext_bh_total_guess_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guess_id UUID NOT NULL REFERENCES ext_bh_total_guess(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  twitch_display_name TEXT NOT NULL DEFAULT '',
  guessed_total NUMERIC(12,2) NOT NULL,
  difference NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guess_id, twitch_user_id)
);

CREATE INDEX idx_ext_bhtg_round ON ext_bh_total_guess(broadcaster_id, round_id);
CREATE INDEX idx_ext_bhtge_guess ON ext_bh_total_guess_entries(guess_id);

-- ─── PREDICTOR LEADERBOARD ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ext_predictor_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  twitch_display_name TEXT NOT NULL DEFAULT '',
  total_predictions INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  total_points_won INTEGER NOT NULL DEFAULT 0,
  best_accuracy NUMERIC(10,4),
  avg_accuracy NUMERIC(10,4),
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broadcaster_id, twitch_user_id)
);

CREATE INDEX idx_ext_pl_leaderboard ON ext_predictor_leaderboard(broadcaster_id, total_points_won DESC);

-- ─── COMMUNITY SLOT PICKER ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ext_slot_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,             -- group suggestions by session
  twitch_user_id TEXT NOT NULL,
  twitch_display_name TEXT NOT NULL DEFAULT '',
  slot_name TEXT NOT NULL,
  slot_provider TEXT,
  slot_image TEXT,
  votes INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'played', 'rejected')),
  locked_by_user TEXT,                  -- who locked it with points
  lock_cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, twitch_user_id)   -- one suggestion per viewer per session
);

CREATE INDEX idx_ext_ss_session ON ext_slot_suggestions(broadcaster_id, session_id, votes DESC);

CREATE TABLE IF NOT EXISTS ext_slot_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES ext_slot_suggestions(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(suggestion_id, twitch_user_id)
);

-- ─── LIVE BET / PREDICTION SYSTEM ───────────────────────────────────

CREATE TABLE IF NOT EXISTS ext_live_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_type TEXT NOT NULL               -- 'profit_loss', 'over_under', 'exact_multi'
    CHECK (bet_type IN ('profit_loss', 'over_under', 'exact_multi', 'custom')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]',  -- [{id, label, odds}]
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'locked', 'resolved', 'cancelled')),
  winning_option TEXT,                  -- option id that won
  total_pool INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_ext_lb_broadcaster ON ext_live_bets(broadcaster_id, status);

CREATE TABLE IF NOT EXISTS ext_live_bet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id UUID NOT NULL REFERENCES ext_live_bets(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  twitch_display_name TEXT NOT NULL DEFAULT '',
  option_id TEXT NOT NULL,
  points_wagered INTEGER NOT NULL,
  points_won INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bet_id, twitch_user_id)
);

CREATE INDEX idx_ext_lbe_bet ON ext_live_bet_entries(bet_id);

-- ─── EXTENSION GIVEAWAY SYSTEM ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS ext_giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prize TEXT NOT NULL DEFAULT '',
  description TEXT,
  image_url TEXT,
  ticket_cost INTEGER NOT NULL DEFAULT 0,
  max_tickets_per_user INTEGER NOT NULL DEFAULT 1,
  max_winners INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'drawing', 'completed')),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  drawn_at TIMESTAMPTZ
);

CREATE INDEX idx_ext_ga_broadcaster ON ext_giveaways(broadcaster_id, status);

CREATE TABLE IF NOT EXISTS ext_giveaway_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id UUID NOT NULL REFERENCES ext_giveaways(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  twitch_display_name TEXT NOT NULL DEFAULT '',
  tickets INTEGER NOT NULL DEFAULT 1,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(giveaway_id, twitch_user_id)
);

CREATE INDEX idx_ext_ge_giveaway ON ext_giveaway_entries(giveaway_id);

CREATE TABLE IF NOT EXISTS ext_giveaway_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id UUID NOT NULL REFERENCES ext_giveaways(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  twitch_display_name TEXT NOT NULL DEFAULT '',
  selected_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STREAMER STATS / SESSION TRACKING ──────────────────────────────

CREATE TABLE IF NOT EXISTS ext_stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_wagered NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_won NUMERIC(12,2) NOT NULL DEFAULT 0,
  biggest_win NUMERIC(12,2) NOT NULL DEFAULT 0,
  biggest_win_slot TEXT,
  biggest_multiplier NUMERIC(10,2) NOT NULL DEFAULT 0,
  biggest_multi_slot TEXT,
  slots_played INTEGER NOT NULL DEFAULT 0,
  bonus_hunts_completed INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT '€',
  stats JSONB NOT NULL DEFAULT '{}',    -- extra stats bucket
  is_live BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_ext_sessions_broadcaster ON ext_stream_sessions(broadcaster_id, started_at DESC);

CREATE TABLE IF NOT EXISTS ext_session_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ext_stream_sessions(id) ON DELETE CASCADE,
  slot_name TEXT NOT NULL,
  provider TEXT,
  image_url TEXT,
  bet_size NUMERIC(10,2),
  total_wagered NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_won NUMERIC(12,2) NOT NULL DEFAULT 0,
  spins INTEGER NOT NULL DEFAULT 0,
  biggest_win NUMERIC(12,2) NOT NULL DEFAULT 0,
  biggest_multiplier NUMERIC(10,2) NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ext_sesslots_session ON ext_session_slots(session_id);

-- ─── ALL-TIME STATS (AGGREGATED) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS ext_streamer_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_wagered NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_won NUMERIC(14,2) NOT NULL DEFAULT 0,
  biggest_win_ever NUMERIC(12,2) NOT NULL DEFAULT 0,
  biggest_win_slot TEXT,
  biggest_multiplier_ever NUMERIC(10,2) NOT NULL DEFAULT 0,
  biggest_multi_slot TEXT,
  total_slots_played INTEGER NOT NULL DEFAULT 0,
  total_bonus_hunts INTEGER NOT NULL DEFAULT 0,
  favourite_slots JSONB NOT NULL DEFAULT '[]',  -- [{name, provider, times_played, total_won}]
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broadcaster_id)
);

-- ─── DAILY WHEEL EXTENSION SPINS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS ext_wheel_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  twitch_display_name TEXT NOT NULL DEFAULT '',
  prize_label TEXT NOT NULL,
  points_won INTEGER NOT NULL DEFAULT 0,
  spun_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ext_ws_broadcaster ON ext_wheel_spins(broadcaster_id, twitch_user_id);

-- ─── EXTENSION CONFIG (per broadcaster) ─────────────────────────────

CREATE TABLE IF NOT EXISTS ext_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_points_reward INTEGER NOT NULL DEFAULT 100,
  total_guess_prize INTEGER NOT NULL DEFAULT 1000,
  slot_lock_cost INTEGER NOT NULL DEFAULT 500,
  slot_vote_enabled BOOLEAN NOT NULL DEFAULT true,
  predictions_enabled BOOLEAN NOT NULL DEFAULT true,
  bets_enabled BOOLEAN NOT NULL DEFAULT true,
  giveaway_enabled BOOLEAN NOT NULL DEFAULT true,
  wheel_enabled BOOLEAN NOT NULL DEFAULT true,
  games_enabled BOOLEAN NOT NULL DEFAULT true,
  starting_points INTEGER NOT NULL DEFAULT 500,
  points_per_minute_watching INTEGER NOT NULL DEFAULT 5,
  theme_primary TEXT NOT NULL DEFAULT '#9146FF',
  theme_bg TEXT NOT NULL DEFAULT '#0e0e10',
  theme_card TEXT NOT NULL DEFAULT '#18181b',
  theme_text TEXT NOT NULL DEFAULT '#efeff1',
  theme_accent TEXT NOT NULL DEFAULT '#bf94ff',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broadcaster_id)
);

-- ─── RLS POLICIES ───────────────────────────────────────────────────

ALTER TABLE ext_viewer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_bh_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_bh_prediction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_bh_total_guess ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_bh_total_guess_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_predictor_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_slot_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_slot_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_live_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_live_bet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_giveaway_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_stream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_session_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_streamer_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_config ENABLE ROW LEVEL SECURITY;

-- Broadcaster can manage their own data
CREATE POLICY "Broadcaster manages own data" ON ext_viewer_points FOR ALL
  USING (broadcaster_id = auth.uid());
CREATE POLICY "Broadcaster manages predictions" ON ext_bh_predictions FOR ALL
  USING (broadcaster_id = auth.uid());
CREATE POLICY "Anyone reads prediction entries" ON ext_bh_prediction_entries FOR SELECT USING (true);
CREATE POLICY "Service inserts prediction entries" ON ext_bh_prediction_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Broadcaster manages total guess" ON ext_bh_total_guess FOR ALL
  USING (broadcaster_id = auth.uid());
CREATE POLICY "Anyone reads guess entries" ON ext_bh_total_guess_entries FOR SELECT USING (true);
CREATE POLICY "Service inserts guess entries" ON ext_bh_total_guess_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone reads leaderboard" ON ext_predictor_leaderboard FOR SELECT USING (true);
CREATE POLICY "Broadcaster manages leaderboard" ON ext_predictor_leaderboard FOR ALL
  USING (broadcaster_id = auth.uid());
CREATE POLICY "Broadcaster manages slot suggestions" ON ext_slot_suggestions FOR ALL
  USING (broadcaster_id = auth.uid());

-- ─── RPC FUNCTIONS ──────────────────────────────────────────────────

-- Atomically increment vote count on slot suggestions
CREATE OR REPLACE FUNCTION increment_suggestion_votes(suggestion_uuid UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE ext_slot_suggestions SET votes = votes + 1 WHERE id = suggestion_uuid;
END;
$$;

-- Atomically add points to a viewer's balance (used by EBS via service role)
CREATE OR REPLACE FUNCTION add_viewer_points(
  p_broadcaster_id UUID,
  p_twitch_user_id TEXT,
  p_amount INTEGER
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_points INTEGER;
BEGIN
  UPDATE ext_viewer_points
  SET points = points + p_amount,
      lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
      updated_at = NOW()
  WHERE broadcaster_id = p_broadcaster_id AND twitch_user_id = p_twitch_user_id
  RETURNING points INTO new_points;
  RETURN new_points;
END;
$$;
CREATE POLICY "Anyone reads suggestions" ON ext_slot_suggestions FOR SELECT USING (true);
CREATE POLICY "Service inserts suggestions" ON ext_slot_suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone reads slot votes" ON ext_slot_votes FOR SELECT USING (true);
CREATE POLICY "Service inserts votes" ON ext_slot_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Broadcaster manages bets" ON ext_live_bets FOR ALL
  USING (broadcaster_id = auth.uid());
CREATE POLICY "Anyone reads bets" ON ext_live_bets FOR SELECT USING (true);
CREATE POLICY "Anyone reads bet entries" ON ext_live_bet_entries FOR SELECT USING (true);
CREATE POLICY "Service inserts bet entries" ON ext_live_bet_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Broadcaster manages ext giveaways" ON ext_giveaways FOR ALL
  USING (broadcaster_id = auth.uid());
CREATE POLICY "Anyone reads ext giveaways" ON ext_giveaways FOR SELECT USING (true);
CREATE POLICY "Service inserts ga entries" ON ext_giveaway_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone reads ga entries" ON ext_giveaway_entries FOR SELECT USING (true);
CREATE POLICY "Anyone reads ga winners" ON ext_giveaway_winners FOR SELECT USING (true);
CREATE POLICY "Broadcaster manages ga winners" ON ext_giveaway_winners FOR ALL
  USING (giveaway_id IN (SELECT id FROM ext_giveaways WHERE broadcaster_id = auth.uid()));
CREATE POLICY "Broadcaster manages sessions" ON ext_stream_sessions FOR ALL
  USING (broadcaster_id = auth.uid());
CREATE POLICY "Anyone reads sessions" ON ext_stream_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone reads session slots" ON ext_session_slots FOR SELECT USING (true);
CREATE POLICY "Broadcaster manages session slots" ON ext_session_slots FOR ALL
  USING (session_id IN (SELECT id FROM ext_stream_sessions WHERE broadcaster_id = auth.uid()));
CREATE POLICY "Broadcaster manages own stats" ON ext_streamer_stats FOR ALL
  USING (broadcaster_id = auth.uid());
CREATE POLICY "Anyone reads streamer stats" ON ext_streamer_stats FOR SELECT USING (true);
CREATE POLICY "Anyone reads ext wheel spins" ON ext_wheel_spins FOR SELECT USING (true);
CREATE POLICY "Service inserts ext wheel spins" ON ext_wheel_spins FOR INSERT WITH CHECK (true);
CREATE POLICY "Broadcaster manages ext config" ON ext_config FOR ALL
  USING (broadcaster_id = auth.uid());
CREATE POLICY "Anyone reads ext config" ON ext_config FOR SELECT USING (true);

-- ─── REALTIME ENABLEMENT ────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE ext_bh_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_bh_prediction_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_bh_total_guess;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_slot_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_slot_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_live_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_live_bet_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_giveaways;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_giveaway_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_giveaway_winners;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_predictor_leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_viewer_points;
ALTER PUBLICATION supabase_realtime ADD TABLE ext_wheel_spins;
