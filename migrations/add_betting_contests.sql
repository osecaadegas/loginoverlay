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
-- One row per user per contest. Cash is deducted immediately on placement.
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


-- ─── 7. RPC: PLACE BET ──────────────────────────────────────────────────────
-- Atomically deducts user cash and records the bet.
-- Called from the API with service role key (p_user_id = verified JWT user).
-- Uses SELECT ... FOR UPDATE to prevent concurrent double-spend races.

DROP FUNCTION IF EXISTS place_betting_bet(UUID, UUID, UUID, BIGINT);

CREATE OR REPLACE FUNCTION place_betting_bet(
  p_user_id    UUID,
  p_contest_id UUID,
  p_outcome_id UUID,
  p_amount     BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contest  RECORD;
  v_outcome  RECORD;
  v_player   RECORD;
  v_bet_id   UUID;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required');
  END IF;
  IF p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum bet is 1 point');
  END IF;

  -- Lock contest row to serialise concurrent bets on this contest
  SELECT * INTO v_contest
  FROM betting_contests
  WHERE id = p_contest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found');
  END IF;

  -- Reject if not open
  IF v_contest.status <> 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Contest is ' || v_contest.status || ' and not accepting bets'
    );
  END IF;

  -- Auto-lock if past lock time
  IF v_contest.locks_at IS NOT NULL AND NOW() >= v_contest.locks_at THEN
    UPDATE betting_contests
    SET status = 'locked', updated_at = NOW()
    WHERE id = p_contest_id;
    RETURN jsonb_build_object('success', false, 'error', 'Contest betting period has ended');
  END IF;

  -- Validate that the outcome belongs to this contest
  SELECT * INTO v_outcome
  FROM betting_contest_outcomes
  WHERE id = p_outcome_id AND contest_id = p_contest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this contest');
  END IF;

  -- Enforce one bet per user per contest
  IF EXISTS (
    SELECT 1 FROM betting_contest_bets
    WHERE contest_id = p_contest_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already placed a bet on this contest');
  END IF;

  -- Lock the player row and verify balance
  SELECT * INTO v_player
  FROM the_life_players
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player account not found');
  END IF;

  IF v_player.cash < p_amount THEN
    RETURN jsonb_build_object(
      'success',  false,
      'error',    'Insufficient balance',
      'balance',  v_player.cash,
      'required', p_amount
    );
  END IF;

  -- Deduct cash immediately (points leave the wallet at bet time)
  UPDATE the_life_players
  SET cash = cash - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record the bet
  INSERT INTO betting_contest_bets (contest_id, outcome_id, user_id, amount)
  VALUES (p_contest_id, p_outcome_id, p_user_id, p_amount)
  RETURNING id INTO v_bet_id;

  -- Increment this outcome's pool
  UPDATE betting_contest_outcomes
  SET pool      = pool + p_amount,
      bet_count = bet_count + 1
  WHERE id = p_outcome_id;

  -- Increment contest total pool
  UPDATE betting_contests
  SET total_pool = total_pool + p_amount,
      updated_at = NOW()
  WHERE id = p_contest_id;

  RETURN jsonb_build_object(
    'success',    true,
    'betId',      v_bet_id,
    'amount',     p_amount,
    'newBalance', v_player.cash - p_amount,
    'contestId',  p_contest_id,
    'outcomeId',  p_outcome_id
  );
END;
$$;

-- NOTE: Not granting to 'authenticated' intentionally — this is called
-- exclusively via the API server using service role key.
-- To allow direct client calls (e.g. Supabase JS SDK), uncomment:
-- GRANT EXECUTE ON FUNCTION place_betting_bet(UUID, UUID, UUID, BIGINT) TO authenticated;


-- ─── 8. RPC: RESOLVE CONTEST ────────────────────────────────────────────────
-- Pari-mutuel payout with rounding correction.
-- Called from API after admin auth check.
-- Entire resolution runs in one transaction: marks resolved → calculates payouts
-- → credits winners → logs audit trail → distributes remainder.
--
-- Rounding: FLOOR on each individual profit; remainder (≤ number_of_winners points)
-- is given to the winner with the largest bet (processed last in ASC amount order).

DROP FUNCTION IF EXISTS resolve_betting_contest(UUID, UUID);

CREATE OR REPLACE FUNCTION resolve_betting_contest(
  p_contest_id         UUID,
  p_winning_outcome_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contest        RECORD;
  v_winning_pool   BIGINT;
  v_total_pool     BIGINT;
  v_losing_pool    BIGINT;
  v_bet            RECORD;
  v_profit         BIGINT;
  v_payout         BIGINT;
  v_running_payout BIGINT  := 0;
  v_winner_count   INTEGER := 0;
  v_last_winner_id UUID;
  v_remainder      BIGINT;
BEGIN
  -- Lock contest row — this is the single-entry gate; prevents double resolution
  SELECT * INTO v_contest
  FROM betting_contests
  WHERE id = p_contest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found');
  END IF;

  -- Idempotency guard
  IF v_contest.status = 'resolved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest is already resolved');
  END IF;
  IF v_contest.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot resolve a cancelled contest');
  END IF;

  -- Validate winning outcome belongs to this contest
  IF NOT EXISTS (
    SELECT 1 FROM betting_contest_outcomes
    WHERE id = p_winning_outcome_id AND contest_id = p_contest_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Winning outcome does not belong to this contest');
  END IF;

  -- Pool math
  SELECT COALESCE(pool, 0) INTO v_winning_pool
  FROM betting_contest_outcomes
  WHERE id = p_winning_outcome_id;

  v_total_pool  := v_contest.total_pool;
  v_losing_pool := v_total_pool - v_winning_pool;

  -- Mark contest resolved immediately — prevents any concurrent resolution attempt
  UPDATE betting_contests
  SET status             = 'resolved',
      winning_outcome_id = p_winning_outcome_id,
      resolved_at        = NOW(),
      updated_at         = NOW()
  WHERE id = p_contest_id;

  -- ── Edge case: nobody bet on the winning outcome ─────────────────────────
  -- House retains the entire pool. All bets settled as losses.
  IF v_winning_pool = 0 THEN
    UPDATE betting_contest_bets
    SET is_winner = false, profit = 0, payout_amount = 0, settled_at = NOW()
    WHERE contest_id = p_contest_id;

    RETURN jsonb_build_object(
      'success',     true,
      'resolved',    true,
      'winnerCount', 0,
      'totalPool',   v_total_pool,
      'winningPool', 0,
      'losingPool',  v_total_pool,
      'houseKeeps',  v_total_pool,
      'message',     'No bets on winning outcome. House retains all points.'
    );
  END IF;

  -- ── Pari-mutuel payout loop ──────────────────────────────────────────────
  -- Iterate in ASC amount order so the LAST processed winner (largest bet)
  -- is the one who receives any rounding remainder.
  FOR v_bet IN
    SELECT id, user_id, amount
    FROM betting_contest_bets
    WHERE contest_id = p_contest_id
      AND outcome_id = p_winning_outcome_id
    ORDER BY amount ASC, placed_at DESC
  LOOP
    -- profit = FLOOR( (userBet / winningPool) * losingPool )
    -- payout = userBet + profit
    -- Using NUMERIC to avoid integer overflow with large pools
    v_profit := FLOOR(
      (v_bet.amount::NUMERIC / v_winning_pool::NUMERIC) * v_losing_pool::NUMERIC
    );
    v_payout := v_bet.amount + v_profit;

    v_running_payout := v_running_payout + v_payout;
    v_winner_count   := v_winner_count   + 1;
    v_last_winner_id := v_bet.id;

    -- Credit winner's cash
    UPDATE the_life_players
    SET cash = cash + v_payout, updated_at = NOW()
    WHERE user_id = v_bet.user_id;

    -- Record settlement on the bet row
    UPDATE betting_contest_bets
    SET payout_amount = v_payout,
        profit        = v_profit,
        is_winner     = true,
        settled_at    = NOW()
    WHERE id = v_bet.id;

    -- Audit log
    INSERT INTO betting_contest_payouts (contest_id, user_id, bet_amount, payout_amount, profit)
    VALUES (p_contest_id, v_bet.user_id, v_bet.amount, v_payout, v_profit);
  END LOOP;

  -- ── Rounding correction ──────────────────────────────────────────────────
  -- Because of FLOOR, sum(payouts) ≤ totalPool.
  -- remainder = totalPool - sum(payouts)  [≤ number_of_winners points]
  -- Distribute to the last-processed winner (= largest bet).
  v_remainder := v_total_pool - v_running_payout;

  IF v_remainder > 0 AND v_last_winner_id IS NOT NULL THEN
    -- Credit remainder to largest-bet winner's cash
    UPDATE the_life_players tlp
    SET cash = cash + v_remainder, updated_at = NOW()
    FROM betting_contest_bets bcb
    WHERE bcb.id     = v_last_winner_id
      AND tlp.user_id = bcb.user_id;

    -- Update bet record
    UPDATE betting_contest_bets
    SET payout_amount = payout_amount + v_remainder,
        profit        = profit        + v_remainder
    WHERE id = v_last_winner_id;

    -- Update audit log row for that winner
    UPDATE betting_contest_payouts bcp
    SET payout_amount = bcp.payout_amount + v_remainder,
        profit        = bcp.profit        + v_remainder
    FROM betting_contest_bets bcb
    WHERE bcb.id        = v_last_winner_id
      AND bcp.contest_id = p_contest_id
      AND bcp.user_id    = bcb.user_id;
  END IF;

  -- ── Mark all losing bets settled ─────────────────────────────────────────
  UPDATE betting_contest_bets
  SET is_winner     = false,
      profit        = 0,
      payout_amount = 0,
      settled_at    = NOW()
  WHERE contest_id  = p_contest_id
    AND outcome_id <> p_winning_outcome_id
    AND settled_at  IS NULL;

  RETURN jsonb_build_object(
    'success',     true,
    'resolved',    true,
    'winnerCount', v_winner_count,
    'totalPool',   v_total_pool,
    'winningPool', v_winning_pool,
    'losingPool',  v_losing_pool,
    'remainder',   v_remainder
  );
END;
$$;

-- Called exclusively via service role from API. NOT granted to authenticated users.


-- ─── 9. RPC: CANCEL CONTEST ─────────────────────────────────────────────────
-- Cancels the contest and issues full refunds to all bettors.
-- Called from API after admin auth check.

DROP FUNCTION IF EXISTS cancel_betting_contest(UUID);

CREATE OR REPLACE FUNCTION cancel_betting_contest(p_contest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contest  RECORD;
  v_bet      RECORD;
  v_refunded INTEGER := 0;
BEGIN
  SELECT * INTO v_contest
  FROM betting_contests
  WHERE id = p_contest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found');
  END IF;

  IF v_contest.status IN ('resolved', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Contest is already ' || v_contest.status
    );
  END IF;

  -- Mark cancelled
  UPDATE betting_contests
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_contest_id;

  -- Full refund: return each bet amount to the bettor's cash
  FOR v_bet IN
    SELECT id, user_id, amount
    FROM betting_contest_bets
    WHERE contest_id = p_contest_id
      AND settled_at IS NULL
  LOOP
    UPDATE the_life_players
    SET cash = cash + v_bet.amount, updated_at = NOW()
    WHERE user_id = v_bet.user_id;

    UPDATE betting_contest_bets
    SET payout_amount = v_bet.amount,
        profit        = 0,
        is_winner     = NULL,    -- NULL distinguishes refund from win/loss
        settled_at    = NOW()
    WHERE id = v_bet.id;

    v_refunded := v_refunded + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',      true,
    'cancelled',    true,
    'refundedBets', v_refunded
  );
END;
$$;

-- Called exclusively via service role from API. NOT granted to authenticated users.
