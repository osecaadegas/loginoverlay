-- ============================================================
-- Bonus Hunt History — per-user archive of completed hunts
-- Each record stores the full snapshot so hunts can be reviewed
-- ============================================================

CREATE TABLE IF NOT EXISTS bonus_hunt_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Hunt metadata
  hunt_name   TEXT NOT NULL DEFAULT 'Untitled Hunt',
  currency    TEXT NOT NULL DEFAULT '€',

  -- Financial summary
  start_money NUMERIC(12,2) DEFAULT 0,
  stop_loss   NUMERIC(12,2) DEFAULT 0,
  total_bet   NUMERIC(12,2) DEFAULT 0,
  total_win   NUMERIC(12,2) DEFAULT 0,
  profit      NUMERIC(12,2) DEFAULT 0,

  -- Hunt stats
  bonus_count     INT DEFAULT 0,
  bonuses_opened  INT DEFAULT 0,
  avg_multi       NUMERIC(8,2) DEFAULT 0,
  best_multi      NUMERIC(8,2) DEFAULT 0,
  best_slot_name  TEXT DEFAULT '',

  -- Full snapshot of bonuses array (for loading back)
  bonuses     JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at  TIMESTAMPTZ DEFAULT now(),
  hunt_date   DATE DEFAULT CURRENT_DATE
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_bh_history_user ON bonus_hunt_history(user_id, created_at DESC);

-- RLS: users can only access their own history
ALTER TABLE bonus_hunt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own hunt history"
  ON bonus_hunt_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hunt history"
  ON bonus_hunt_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hunt history"
  ON bonus_hunt_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own hunt history"
  ON bonus_hunt_history FOR UPDATE
  USING (auth.uid() = user_id);
