-- ============================================================
-- Per-user Slot Records — tracks personal bests per slot
-- ============================================================

CREATE TABLE IF NOT EXISTS user_slot_records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id       UUID REFERENCES slots(id) ON DELETE SET NULL,
  slot_name     TEXT NOT NULL,
  slot_provider TEXT,
  slot_image    TEXT,

  -- Aggregated stats
  total_bonuses    INTEGER DEFAULT 0,         -- how many times this slot appeared in hunts
  total_wagered    NUMERIC(12,2) DEFAULT 0,   -- sum of all bets on this slot
  total_won        NUMERIC(12,2) DEFAULT 0,   -- sum of all payouts
  best_multiplier  NUMERIC(10,2) DEFAULT 0,   -- best X ever hit
  best_win         NUMERIC(12,2) DEFAULT 0,   -- highest payout amount
  average_multi    NUMERIC(10,2) DEFAULT 0,   -- running average X
  last_bet_size    NUMERIC(10,2) DEFAULT 0,   -- most recent bet size
  last_payout      NUMERIC(12,2) DEFAULT 0,   -- most recent payout
  last_multi       NUMERIC(10,2) DEFAULT 0,   -- most recent multiplier

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, slot_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_slot_records_user ON user_slot_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_slot_records_slot ON user_slot_records(user_id, slot_name);

-- RLS
ALTER TABLE user_slot_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own slot records"
  ON user_slot_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own slot records"
  ON user_slot_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slot records"
  ON user_slot_records FOR UPDATE
  USING (auth.uid() = user_id);

-- Individual bonus results log (detailed per-bonus record)
CREATE TABLE IF NOT EXISTS user_slot_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_name     TEXT NOT NULL,
  slot_provider TEXT,
  bet_size      NUMERIC(10,2) NOT NULL,
  payout        NUMERIC(12,2) NOT NULL DEFAULT 0,
  multiplier    NUMERIC(10,2) NOT NULL DEFAULT 0,
  hunt_name     TEXT,
  is_super_bonus BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_slot_results_user ON user_slot_results(user_id);
CREATE INDEX IF NOT EXISTS idx_user_slot_results_slot ON user_slot_results(user_id, slot_name);

ALTER TABLE user_slot_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own slot results"
  ON user_slot_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own slot results"
  ON user_slot_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);
