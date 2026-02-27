-- =====================================================
-- Pending Slots — Approval queue for premium user submissions
-- =====================================================

CREATE TABLE IF NOT EXISTS pending_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Submitter
  submitted_by  UUID NOT NULL REFERENCES auth.users(id),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Slot data (mirrors slots table)
  name          TEXT NOT NULL,
  provider      TEXT NOT NULL,
  image         TEXT NOT NULL DEFAULT '',
  rtp           DECIMAL(5,2),
  volatility    TEXT CHECK (volatility IN ('low','medium','high','very_high')),
  max_win_multiplier DECIMAL(10,2),
  reels         TEXT,
  min_bet       DECIMAL(10,2) DEFAULT 0.10,
  max_bet       DECIMAL(10,2) DEFAULT 100.00,
  features      JSONB DEFAULT '[]',
  tags          TEXT[] DEFAULT '{}',
  description   TEXT,
  release_date  DATE,
  paylines      TEXT,
  theme         TEXT,
  -- Approval workflow
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  reviewed_by   UUID REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  review_note   TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_slots_status ON pending_slots(status);
CREATE INDEX IF NOT EXISTS idx_pending_slots_submitted_by ON pending_slots(submitted_by);
CREATE INDEX IF NOT EXISTS idx_pending_slots_submitted_at ON pending_slots(submitted_at DESC);

-- RLS
ALTER TABLE pending_slots ENABLE ROW LEVEL SECURITY;

-- Premium users can insert their own rows
CREATE POLICY pending_slots_insert ON pending_slots
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Users can read their own submissions
CREATE POLICY pending_slots_select_own ON pending_slots
  FOR SELECT TO authenticated
  USING (auth.uid() = submitted_by);

-- Admins can read all
CREATE POLICY pending_slots_select_admin ON pending_slots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update (approve/deny)
CREATE POLICY pending_slots_update_admin ON pending_slots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
