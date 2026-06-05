-- ═══════════════════════════════════════════════════════════════════════════
-- PARI-MUTUEL BETTING CONTESTS SYSTEM
-- Pool-based betting identical to StreamElements contest model.
-- All math is zero-sum: the losing pool is redistributed proportionally
-- to winners. No points are created or destroyed.
--
-- Math:
--   winningPool = SUM(amount) for bets on winning outcome
--   losingPool  = totalPool - winningPool
--   userShare   = userBet / winningPool
--   profit      = FLOOR(userShare * losingPool)
--   payout      = userBet + profit
--   remainder   = losingPool - SUM(profits) → given to largest-bet winner
--
-- Created: 2026-06-04
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. CONTESTS ────────────────────────────────────────────────────────────
-- One row per contest. total_pool is the running sum of all bets.

CREATE TABLE IF NOT EXISTS betting_contests (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  question            TEXT        NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  status              TEXT        NOT NULL DEFAULT 'open'
                                  CHECK (status IN ('open', 'locked', 'resolved', 'cancelled')),
  total_pool          BIGINT      NOT NULL DEFAULT 0 CHECK (total_pool >= 0),
  winning_outcome_id  UUID,                           -- FK added after outcomes table exists
  starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locks_at            TIMESTAMPTZ,                    -- NULL = manual lock only; set for timed contests
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── 2. OUTCOMES ────────────────────────────────────────────────────────────
-- Each contest has 2–10 outcomes. pool tracks points wagered on this outcome.

CREATE TABLE IF NOT EXISTS betting_contest_outcomes (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id  UUID    NOT NULL REFERENCES betting_contests(id) ON DELETE CASCADE,
  label       TEXT    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  pool        BIGINT  NOT NULL DEFAULT 0 CHECK (pool >= 0),
  bet_count   INTEGER NOT NULL DEFAULT 0 CHECK (bet_count >= 0),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now add the forward-reference FK for winning_outcome_id
ALTER TABLE betting_contests
  ADD CONSTRAINT IF NOT EXISTS fk_betting_contests_winning_outcome
  FOREIGN KEY (winning_outcome_id) REFERENCES betting_contest_outcomes(id);


-- ─── 3. BETS ────────────────────────────────────────────────────────────────
-- One row per user per contest. Wallet movement is handled by follow-up
-- RPC migrations for the supported contest currency mode.
-- Resolution fields (payout_amount, profit, is_winner) are filled at settle time.

CREATE TABLE IF NOT EXISTS betting_contest_bets (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id    UUID        NOT NULL REFERENCES betting_contests(id)         ON DELETE CASCADE,
  outcome_id    UUID        NOT NULL REFERENCES betting_contest_outcomes(id)  ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id)               ON DELETE CASCADE,
  amount        BIGINT      NOT NULL CHECK (amount >= 1),
  -- Resolution fields (NULL until settled)
  payout_amount BIGINT,
  profit        BIGINT,
  is_winner     BOOLEAN,    -- NULL = refunded (cancelled contest), TRUE = won, FALSE = lost
  placed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at    TIMESTAMPTZ,
  -- Enforce one bet per user per contest
  UNIQUE (contest_id, user_id)
);


-- ─── 4. PAYOUT AUDIT LOG ────────────────────────────────────────────────────
-- Immutable record of every credit issued on resolution.
-- Allows post-mortem verification that totalPool == sum(payouts) + house_keeps.

CREATE TABLE IF NOT EXISTS betting_contest_payouts (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id    UUID        NOT NULL REFERENCES betting_contests(id)   ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id)         ON DELETE CASCADE,
  bet_amount    BIGINT      NOT NULL,
  payout_amount BIGINT      NOT NULL,
  profit        BIGINT      NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── 5. PERFORMANCE INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_betting_contests_status
  ON betting_contests(status)
  WHERE status IN ('open', 'locked');

CREATE INDEX IF NOT EXISTS idx_betting_contests_created_at
  ON betting_contests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_betting_contest_outcomes_contest
  ON betting_contest_outcomes(contest_id);

CREATE INDEX IF NOT EXISTS idx_betting_contest_bets_contest
  ON betting_contest_bets(contest_id);

CREATE INDEX IF NOT EXISTS idx_betting_contest_bets_user_contest
  ON betting_contest_bets(user_id, contest_id);

CREATE INDEX IF NOT EXISTS idx_betting_contest_bets_outcome
  ON betting_contest_bets(outcome_id);

CREATE INDEX IF NOT EXISTS idx_betting_contest_payouts_contest
  ON betting_contest_payouts(contest_id);

CREATE INDEX IF NOT EXISTS idx_betting_contest_payouts_user
  ON betting_contest_payouts(user_id);


-- ─── 6. ROW-LEVEL SECURITY ──────────────────────────────────────────────────

ALTER TABLE betting_contests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_contest_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_contest_bets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_contest_payouts  ENABLE ROW LEVEL SECURITY;

-- Contests: anyone can read; only admins can write via RLS
-- (API uses service role for writes, so these admin policies are a safety net)
CREATE POLICY "Public read betting_contests"
  ON betting_contests FOR SELECT
  USING (true);

CREATE POLICY "Admins manage betting_contests"
  ON betting_contests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
  );

-- Outcomes: anyone can read
CREATE POLICY "Public read betting_contest_outcomes"
  ON betting_contest_outcomes FOR SELECT
  USING (true);

CREATE POLICY "Admins manage betting_contest_outcomes"
  ON betting_contest_outcomes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
  );

-- Bets: users see their own; all bets become visible after resolution (transparency)
CREATE POLICY "Users read own betting_contest_bets"
  ON betting_contest_bets FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM betting_contests bc
      WHERE bc.id = contest_id AND bc.status = 'resolved'
    )
  );

-- Payouts: public read (full transparency on who won what)
CREATE POLICY "Public read betting_contest_payouts"
  ON betting_contest_payouts FOR SELECT
  USING (true);


-- ─── 7. RPCs ───────────────────────────────────────────────────────────────
-- Wallet-specific betting RPCs are defined in follow-up migrations.
-- The supported runtime uses the StreamElements-backed implementation in
-- add_betting_contests_se_mode.sql.
