-- ═══════════════════════════════════════════════════════════════════════════
-- PARI-MUTUEL BETTING CONTESTS — SE POINTS ONLY
-- All currency operations (deduct/credit) are handled by the API via the
-- StreamElements API. The RPCs only handle state transitions and return
-- winner/refund arrays for the API to act on.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. CONTESTS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS betting_contests (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  question            TEXT        NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  status              TEXT        NOT NULL DEFAULT 'open'
                                  CHECK (status IN ('open', 'locked', 'resolved', 'cancelled')),
  total_pool          BIGINT      NOT NULL DEFAULT 0 CHECK (total_pool >= 0),
  winning_outcome_id  UUID,
  starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locks_at            TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── 2. OUTCOMES ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS betting_contest_outcomes (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id  UUID    NOT NULL REFERENCES betting_contests(id) ON DELETE CASCADE,
  label       TEXT    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  pool        BIGINT  NOT NULL DEFAULT 0 CHECK (pool >= 0),
  bet_count   INTEGER NOT NULL DEFAULT 0 CHECK (bet_count >= 0),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Forward-reference FK (ADD CONSTRAINT IF NOT EXISTS is not valid PG syntax)
ALTER TABLE betting_contests
  ADD CONSTRAINT fk_betting_contests_winning_outcome
  FOREIGN KEY (winning_outcome_id) REFERENCES betting_contest_outcomes(id);


-- ─── 3. BETS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS betting_contest_bets (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id    UUID        NOT NULL REFERENCES betting_contests(id)          ON DELETE CASCADE,
  outcome_id    UUID        NOT NULL REFERENCES betting_contest_outcomes(id)   ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id)                ON DELETE CASCADE,
  amount        BIGINT      NOT NULL CHECK (amount >= 1),
  payout_amount BIGINT,
  profit        BIGINT,
  is_winner     BOOLEAN,
  placed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at    TIMESTAMPTZ,
  UNIQUE (contest_id, user_id)
);


-- ─── 4. PAYOUT AUDIT LOG ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS betting_contest_payouts (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id    UUID        NOT NULL REFERENCES betting_contests(id)   ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id)         ON DELETE CASCADE,
  bet_amount    BIGINT      NOT NULL,
  payout_amount BIGINT      NOT NULL,
  profit        BIGINT      NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── 5. INDEXES ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_betting_contests_status
  ON betting_contests(status) WHERE status IN ('open', 'locked');

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

CREATE POLICY "Public read betting_contests"
  ON betting_contests FOR SELECT USING (true);

CREATE POLICY "Admins manage betting_contests"
  ON betting_contests FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  ));

CREATE POLICY "Public read betting_contest_outcomes"
  ON betting_contest_outcomes FOR SELECT USING (true);

CREATE POLICY "Admins manage betting_contest_outcomes"
  ON betting_contest_outcomes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  ));

CREATE POLICY "Users read own betting_contest_bets"
  ON betting_contest_bets FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM betting_contests bc
      WHERE bc.id = contest_id AND bc.status = 'resolved'
    )
  );

CREATE POLICY "Public read betting_contest_payouts"
  ON betting_contest_payouts FOR SELECT USING (true);


-- ─── 7. RPC: PLACE BET ──────────────────────────────────────────────────────
-- SE points are deducted by the API BEFORE calling this.
-- This RPC only validates state and records the bet.

DROP FUNCTION IF EXISTS place_betting_bet_se(UUID, UUID, UUID, BIGINT);

CREATE OR REPLACE FUNCTION place_betting_bet_se(
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
  v_bet_id   UUID;
BEGIN
  IF p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum bet is 1 point');
  END IF;

  SELECT * INTO v_contest
  FROM betting_contests
  WHERE id = p_contest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found');
  END IF;

  IF v_contest.status <> 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Contest is ' || v_contest.status || ' and not accepting bets'
    );
  END IF;

  IF v_contest.locks_at IS NOT NULL AND NOW() >= v_contest.locks_at THEN
    UPDATE betting_contests
    SET status = 'locked', updated_at = NOW()
    WHERE id = p_contest_id;
    RETURN jsonb_build_object('success', false, 'error', 'Contest betting period has ended');
  END IF;

  SELECT * INTO v_outcome
  FROM betting_contest_outcomes
  WHERE id = p_outcome_id AND contest_id = p_contest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this contest');
  END IF;

  IF EXISTS (
    SELECT 1 FROM betting_contest_bets
    WHERE contest_id = p_contest_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already placed a bet on this contest');
  END IF;

  INSERT INTO betting_contest_bets (contest_id, outcome_id, user_id, amount)
  VALUES (p_contest_id, p_outcome_id, p_user_id, p_amount)
  RETURNING id INTO v_bet_id;

  UPDATE betting_contest_outcomes
  SET pool = pool + p_amount, bet_count = bet_count + 1
  WHERE id = p_outcome_id;

  UPDATE betting_contests
  SET total_pool = total_pool + p_amount, updated_at = NOW()
  WHERE id = p_contest_id;

  RETURN jsonb_build_object(
    'success',   true,
    'betId',     v_bet_id,
    'amount',    p_amount,
    'contestId', p_contest_id,
    'outcomeId', p_outcome_id
  );
END;
$$;


-- ─── 8. RPC: RESOLVE CONTEST ────────────────────────────────────────────────
-- Does pari-mutuel math, settles bet rows, writes audit log.
-- Returns { winners: [{user_id, payout_amount}] } for the API to credit via SE.

DROP FUNCTION IF EXISTS resolve_betting_contest_se(UUID, UUID);

CREATE OR REPLACE FUNCTION resolve_betting_contest_se(
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
  v_last_bet_id    UUID;
  v_last_user_id   UUID;
  v_remainder      BIGINT;
  v_winners        JSONB   := '[]'::JSONB;
BEGIN
  SELECT * INTO v_contest
  FROM betting_contests
  WHERE id = p_contest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found');
  END IF;

  IF v_contest.status = 'resolved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest is already resolved');
  END IF;

  IF v_contest.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot resolve a cancelled contest');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM betting_contest_outcomes
    WHERE id = p_winning_outcome_id AND contest_id = p_contest_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Winning outcome does not belong to this contest');
  END IF;

  SELECT COALESCE(pool, 0) INTO v_winning_pool
  FROM betting_contest_outcomes
  WHERE id = p_winning_outcome_id;

  v_total_pool  := v_contest.total_pool;
  v_losing_pool := v_total_pool - v_winning_pool;

  -- Mark resolved immediately (prevents concurrent resolution)
  UPDATE betting_contests
  SET status             = 'resolved',
      winning_outcome_id = p_winning_outcome_id,
      resolved_at        = NOW(),
      updated_at         = NOW()
  WHERE id = p_contest_id;

  -- Edge case: no bets on winning outcome
  IF v_winning_pool = 0 THEN
    UPDATE betting_contest_bets
    SET is_winner = false, profit = 0, payout_amount = 0, settled_at = NOW()
    WHERE contest_id = p_contest_id;

    RETURN jsonb_build_object(
      'success',     true,
      'resolved',    true,
      'winnerCount', 0,
      'totalPool',   v_total_pool,
      'winners',     '[]'::JSONB,
      'message',     'No bets on winning outcome.'
    );
  END IF;

  -- Pari-mutuel loop (ASC amount so last-processed = largest bet gets remainder)
  FOR v_bet IN
    SELECT id, user_id, amount
    FROM betting_contest_bets
    WHERE contest_id = p_contest_id AND outcome_id = p_winning_outcome_id
    ORDER BY amount ASC, placed_at DESC
  LOOP
    v_profit := FLOOR(
      (v_bet.amount::NUMERIC / v_winning_pool::NUMERIC) * v_losing_pool::NUMERIC
    );
    v_payout := v_bet.amount + v_profit;

    v_running_payout := v_running_payout + v_payout;
    v_winner_count   := v_winner_count   + 1;
    v_last_bet_id    := v_bet.id;
    v_last_user_id   := v_bet.user_id;

    UPDATE betting_contest_bets
    SET payout_amount = v_payout, profit = v_profit, is_winner = true, settled_at = NOW()
    WHERE id = v_bet.id;

    INSERT INTO betting_contest_payouts (contest_id, user_id, bet_amount, payout_amount, profit)
    VALUES (p_contest_id, v_bet.user_id, v_bet.amount, v_payout, v_profit);

    v_winners := v_winners || jsonb_build_object(
      'user_id',       v_bet.user_id,
      'payout_amount', v_payout
    );
  END LOOP;

  -- Rounding remainder → goes to largest-bet winner
  v_remainder := v_total_pool - v_running_payout;

  IF v_remainder > 0 AND v_last_bet_id IS NOT NULL THEN
    UPDATE betting_contest_bets
    SET payout_amount = payout_amount + v_remainder,
        profit        = profit        + v_remainder
    WHERE id = v_last_bet_id;

    UPDATE betting_contest_payouts
    SET payout_amount = payout_amount + v_remainder,
        profit        = profit        + v_remainder
    WHERE contest_id = p_contest_id AND user_id = v_last_user_id;

    -- Patch the last element of v_winners with the extra remainder
    SELECT jsonb_agg(
      CASE WHEN (w->>'user_id')::UUID = v_last_user_id
        THEN jsonb_set(w, '{payout_amount}', to_jsonb((w->>'payout_amount')::BIGINT + v_remainder))
        ELSE w
      END
    ) INTO v_winners
    FROM jsonb_array_elements(v_winners) w;
  END IF;

  -- Settle losing bets
  UPDATE betting_contest_bets
  SET is_winner = false, profit = 0, payout_amount = 0, settled_at = NOW()
  WHERE contest_id = p_contest_id
    AND outcome_id <> p_winning_outcome_id
    AND settled_at IS NULL;

  RETURN jsonb_build_object(
    'success',     true,
    'resolved',    true,
    'winnerCount', v_winner_count,
    'totalPool',   v_total_pool,
    'winningPool', v_winning_pool,
    'losingPool',  v_losing_pool,
    'remainder',   v_remainder,
    'winners',     v_winners
  );
END;
$$;


-- ─── 9. RPC: CANCEL CONTEST ─────────────────────────────────────────────────
-- Marks contest cancelled. Returns { refunds: [{user_id, amount}] } for the
-- API to refund SE points to each bettor.

DROP FUNCTION IF EXISTS cancel_betting_contest_se(UUID);

CREATE OR REPLACE FUNCTION cancel_betting_contest_se(p_contest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contest  RECORD;
  v_bet      RECORD;
  v_refunds  JSONB   := '[]'::JSONB;
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

  UPDATE betting_contests
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_contest_id;

  FOR v_bet IN
    SELECT id, user_id, amount
    FROM betting_contest_bets
    WHERE contest_id = p_contest_id AND settled_at IS NULL
  LOOP
    UPDATE betting_contest_bets
    SET payout_amount = v_bet.amount,
        profit        = 0,
        is_winner     = NULL,
        settled_at    = NOW()
    WHERE id = v_bet.id;

    v_refunds  := v_refunds  || jsonb_build_object('user_id', v_bet.user_id, 'amount', v_bet.amount);
    v_refunded := v_refunded + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',      true,
    'cancelled',    true,
    'refundedBets', v_refunded,
    'refunds',      v_refunds
  );
END;
$$;
