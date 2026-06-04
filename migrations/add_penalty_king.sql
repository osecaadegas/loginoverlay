-- ============================================================
-- Penalty King – Football Penalty Shootout Mini-Game
-- Run this once in your Supabase SQL editor.
-- ============================================================

-- ─── Sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS penalty_king_sessions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_username   TEXT        NOT NULL,
  wager             BIGINT      NOT NULL CHECK (wager >= 1),
  streak            INTEGER     NOT NULL DEFAULT 0,
  multiplier_idx    INTEGER     NOT NULL DEFAULT 0,
  -- Status flow: shooting → waiting_decision → ended
  status            TEXT        NOT NULL DEFAULT 'shooting'
                                CHECK (status IN ('shooting', 'waiting_decision', 'ended')),
  -- Current shot data (pre-computed before animation plays)
  shot_spot         INTEGER     CHECK (shot_spot BETWEEN 1 AND 6),
  gk_spot           INTEGER     CHECK (gk_spot BETWEEN 1 AND 6),
  is_goal           BOOLEAN,
  -- Timing
  shot_at           TIMESTAMPTZ,
  decision_deadline TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  final_payout      BIGINT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pk_sessions_streamer_active
  ON penalty_king_sessions(streamer_id, status)
  WHERE status IN ('shooting', 'waiting_decision');

CREATE INDEX IF NOT EXISTS idx_pk_sessions_created
  ON penalty_king_sessions(created_at DESC);

-- ─── Shots History ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS penalty_king_shots (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   UUID         NOT NULL REFERENCES penalty_king_sessions(id) ON DELETE CASCADE,
  shot_number  INTEGER      NOT NULL,
  spot_chosen  INTEGER      NOT NULL CHECK (spot_chosen BETWEEN 1 AND 6),
  gk_spot      INTEGER      NOT NULL CHECK (gk_spot BETWEEN 1 AND 6),
  is_goal      BOOLEAN      NOT NULL,
  multiplier   NUMERIC(6,2) NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pk_shots_session
  ON penalty_king_shots(session_id, shot_number);

-- ─── Row Level Security ──────────────────────────────────────
ALTER TABLE penalty_king_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalty_king_shots     ENABLE ROW LEVEL SECURITY;

-- Anyone can read (for overlay / leaderboard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'penalty_king_sessions' AND policyname = 'pk_sessions_public_read'
  ) THEN
    CREATE POLICY pk_sessions_public_read
      ON penalty_king_sessions FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'penalty_king_shots' AND policyname = 'pk_shots_public_read'
  ) THEN
    CREATE POLICY pk_shots_public_read
      ON penalty_king_shots FOR SELECT USING (true);
  END IF;
END $$;

-- Service role (backend) can write everything
-- (The service role bypasses RLS by default; these are for completeness)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'penalty_king_sessions' AND policyname = 'pk_sessions_admin_all'
  ) THEN
    CREATE POLICY pk_sessions_admin_all
      ON penalty_king_sessions FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'penalty_king_shots' AND policyname = 'pk_shots_admin_all'
  ) THEN
    CREATE POLICY pk_shots_admin_all
      ON penalty_king_shots FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
        )
      );
  END IF;
END $$;
