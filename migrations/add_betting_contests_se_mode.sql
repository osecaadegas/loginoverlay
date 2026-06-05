-- ═══════════════════════════════════════════════════════════════════════════
-- BETTING CONTESTS — STREAMELEMENTS POINTS MODE
-- Adds currency_mode to contests and SE-mode RPCs that record bets/payouts
-- without touching any internal wallet table. Point debit/credit is handled in the
-- API layer via the SE HTTP API so the DB stays consistent.
--
-- Run this AFTER add_betting_contests.sql.
-- Created: 2026-06-04
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. CURRENCY MODE COLUMN ─────────────────────────────────────────────────

ALTER TABLE betting_contests
  ADD COLUMN IF NOT EXISTS currency_mode TEXT NOT NULL DEFAULT 'se_points'
    CHECK (currency_mode = 'se_points');

COMMENT ON COLUMN betting_contests.currency_mode IS
  'Only StreamElements-backed betting contests are supported.';


-- ─── 2. RPC: PLACE BET (SE mode) ─────────────────────────────────────────────
-- Identical to the legacy wallet-backed version but skips any internal balance check and
-- deduction. The API has already verified and deducted SE points before calling
-- this function.

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
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required');
  END IF;
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
    UPDATE betting_contests SET status = 'locked', updated_at = NOW() WHERE id = p_contest_id;
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

  -- Record the bet (SE points already deducted by API before this call)
  INSERT INTO betting_contest_bets (contest_id, outcome_id, user_id, amount)
  VALUES (p_contest_id, p_outcome_id, p_user_id, p_amount)
  RETURNING id INTO v_bet_id;

  UPDATE betting_contest_outcomes
  SET pool      = pool + p_amount,
      bet_count = bet_count + 1
  WHERE id = p_outcome_id;

  UPDATE betting_contests
  SET total_pool = total_pool + p_amount,
      updated_at = NOW()
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


-- ─── 3. RPC: RESOLVE CONTEST (SE mode) ───────────────────────────────────────
-- Same pari-mutuel math as the legacy wallet-backed resolver but does NOT
-- credit any internal wallet. Returns winners array so the API can credit SE points.

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
  v_last_winner_id UUID;
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
  FROM betting_contest_outcomes WHERE id = p_winning_outcome_id;

  v_total_pool  := v_contest.total_pool;
  v_losing_pool := v_total_pool - v_winning_pool;

  UPDATE betting_contests
  SET status             = 'resolved',
      winning_outcome_id = p_winning_outcome_id,
      resolved_at        = NOW(),
      updated_at         = NOW()
  WHERE id = p_contest_id;

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
      'winners',     '[]'::JSONB,
      'message',     'No bets on winning outcome. House retains all points.'
    );
  END IF;

  FOR v_bet IN
    SELECT id, user_id, amount
    FROM betting_contest_bets
    WHERE contest_id = p_contest_id
      AND outcome_id = p_winning_outcome_id
    ORDER BY amount ASC, placed_at DESC
  LOOP
    v_profit := FLOOR(
      (v_bet.amount::NUMERIC / v_winning_pool::NUMERIC) * v_losing_pool::NUMERIC
    );
    v_payout := v_bet.amount + v_profit;

    v_running_payout := v_running_payout + v_payout;
    v_winner_count   := v_winner_count   + 1;
    v_last_winner_id := v_bet.id;

    -- Record settlement; the API handles SE point crediting.
    UPDATE betting_contest_bets
    SET payout_amount = v_payout,
        profit        = v_profit,
        is_winner     = true,
        settled_at    = NOW()
    WHERE id = v_bet.id;

    INSERT INTO betting_contest_payouts (contest_id, user_id, bet_amount, payout_amount, profit)
    VALUES (p_contest_id, v_bet.user_id, v_bet.amount, v_payout, v_profit);

    v_winners := v_winners || jsonb_build_array(
      jsonb_build_object('user_id', v_bet.user_id, 'payout_amount', v_payout)
    );
  END LOOP;

  v_remainder := v_total_pool - v_running_payout;

  IF v_remainder > 0 AND v_last_winner_id IS NOT NULL THEN
    UPDATE betting_contest_bets
    SET payout_amount = payout_amount + v_remainder,
        profit        = profit        + v_remainder
    WHERE id = v_last_winner_id;

    UPDATE betting_contest_payouts bcp
    SET payout_amount = bcp.payout_amount + v_remainder,
        profit        = bcp.profit        + v_remainder
    FROM betting_contest_bets bcb
    WHERE bcb.id        = v_last_winner_id
      AND bcp.contest_id = p_contest_id
      AND bcp.user_id    = bcb.user_id;

    -- Update the last winner's entry in v_winners to include the remainder
    -- (update the last element: set payout_amount += remainder)
    SELECT jsonb_set(
      v_winners,
      ARRAY[(jsonb_array_length(v_winners) - 1)::TEXT],
      jsonb_build_object(
        'user_id',       (v_winners -> (jsonb_array_length(v_winners) - 1)) ->> 'user_id',
        'payout_amount', ((v_winners -> (jsonb_array_length(v_winners) - 1) ->> 'payout_amount')::BIGINT) + v_remainder
      )
    ) INTO v_winners;
  END IF;

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
    'remainder',   v_remainder,
    'winners',     v_winners
  );
END;
$$;


-- ─── 4. RPC: CANCEL CONTEST (SE mode) ────────────────────────────────────────
-- Same as the legacy wallet-backed cancellation flow but does NOT credit an internal wallet.
-- Returns refunds array so the API can refund SE points.

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
  v_refunded INTEGER := 0;
  v_refunds  JSONB   := '[]'::JSONB;
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
    WHERE contest_id = p_contest_id
      AND settled_at IS NULL
  LOOP
    UPDATE betting_contest_bets
    SET payout_amount = v_bet.amount,
        profit        = 0,
        is_winner     = NULL,
        settled_at    = NOW()
    WHERE id = v_bet.id;

    v_refunds  := v_refunds  || jsonb_build_array(
      jsonb_build_object('user_id', v_bet.user_id, 'amount', v_bet.amount)
    );
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
