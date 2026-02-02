-- =====================================================
-- FIX: Bribe Calculation Formula Mismatch (v2)
-- =====================================================
-- Issue: Frontend showed one bribe price, backend charged different amount
-- 
-- Frontend formula (gameUtils.js):
--   Base 5% + 2% per 30 minutes remaining, max 50%
--
-- OLD Backend formula (WRONG):
--   5% * remaining_minutes (so 10 min = 50%!)
--
-- NEW Backend formula (FIXED - matches frontend):
--   Base 5% + 2% per 30 minutes remaining, max 50%
--
-- NOTE: Uses correct column names for the_life_security_logs:
--   event_type, action_name, metadata, is_flagged (not action_type, details, is_suspicious)
-- =====================================================

-- Drop and recreate the function with corrected formula
CREATE OR REPLACE FUNCTION execute_jail_bribe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_player the_life_players%ROWTYPE;
  v_bribe_amount integer;
  v_bribe_percentage numeric;
  v_remaining_minutes numeric;
  v_total_wealth integer;
  v_last_bribe_attempt timestamptz;
  v_request_id text;
BEGIN
  -- Generate unique request ID for logging
  v_request_id := gen_random_uuid()::text;
  
  -- Get authenticated user
  v_player_id := auth.uid();
  
  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Get player with row lock
  SELECT * INTO v_player
  FROM the_life_players
  WHERE user_id = v_player_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Player not found'
    );
  END IF;
  
  -- Check if actually in jail
  IF v_player.jail_until IS NULL OR v_player.jail_until <= NOW() THEN
    -- Log suspicious attempt
    INSERT INTO the_life_security_logs (player_id, user_id, event_type, action_name, metadata, is_flagged, flag_reason)
    VALUES (v_player.id, v_player_id, 'exploit_attempt', 'jail_bribe', 
      jsonb_build_object('request_id', v_request_id, 'reason', 'not_in_jail'), 
      true, 'Tried to bribe when not in jail');
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are not in jail'
    );
  END IF;
  
  -- Rate limit: prevent spam bribe attempts (2 second cooldown)
  SELECT MAX(created_at) INTO v_last_bribe_attempt
  FROM the_life_security_logs
  WHERE player_id = v_player.id
    AND action_name IN ('jail_bribe', 'bribe_success', 'bribe_failed')
    AND created_at > NOW() - INTERVAL '2 seconds';
  
  IF v_last_bribe_attempt IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Please wait before trying again'
    );
  END IF;
  
  -- SERVER calculates bribe amount (not client!)
  v_remaining_minutes := EXTRACT(EPOCH FROM (v_player.jail_until - NOW())) / 60;
  v_total_wealth := COALESCE(v_player.cash, 0) + COALESCE(v_player.bank_balance, 0);
  
  -- FIXED: Bribe is base 5% + 2% per 30 minutes remaining, max 50%
  -- This matches frontend calculation in gameUtils.js
  v_bribe_percentage := LEAST(5 + (FLOOR(v_remaining_minutes / 30) * 2), 50);
  v_bribe_amount := GREATEST(
    100,
    FLOOR(v_total_wealth * (v_bribe_percentage / 100))
  );
  
  -- Log the attempt
  INSERT INTO the_life_security_logs (player_id, user_id, event_type, action_name, metadata, is_flagged)
  VALUES (v_player.id, v_player_id, 'action', 'jail_bribe_attempt', jsonb_build_object(
    'request_id', v_request_id,
    'remaining_minutes', v_remaining_minutes,
    'total_wealth', v_total_wealth,
    'bribe_percentage', v_bribe_percentage,
    'bribe_amount', v_bribe_amount
  ), false);
  
  -- Check if player can afford
  IF v_player.cash < v_bribe_amount THEN
    INSERT INTO the_life_security_logs (player_id, user_id, event_type, action_name, metadata, is_flagged)
    VALUES (v_player.id, v_player_id, 'action', 'jail_bribe_failed', jsonb_build_object(
      'request_id', v_request_id,
      'reason', 'insufficient_funds',
      'required', v_bribe_amount,
      'had', v_player.cash
    ), false);
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough cash for bribe',
      'required', v_bribe_amount,
      'available', v_player.cash
    );
  END IF;
  
  -- 50% chance of success
  IF random() < 0.5 THEN
    -- Bribe failed - lose money, stay in jail
    UPDATE the_life_players
    SET cash = cash - v_bribe_amount,
        updated_at = NOW()
    WHERE id = v_player.id;
    
    INSERT INTO the_life_security_logs (player_id, user_id, event_type, action_name, old_values, new_values, metadata, is_flagged)
    VALUES (v_player.id, v_player_id, 'action', 'jail_bribe_failed',
      jsonb_build_object('cash', v_player.cash),
      jsonb_build_object('cash', v_player.cash - v_bribe_amount),
      jsonb_build_object('request_id', v_request_id, 'reason', 'rng_failed', 'amount_lost', v_bribe_amount),
      false);
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'The guard took your money and reported you!',
      'bribe_failed', true,
      'amount_lost', v_bribe_amount
    );
  ELSE
    -- Bribe succeeded - release from jail
    UPDATE the_life_players
    SET cash = cash - v_bribe_amount,
        jail_until = NULL,
        updated_at = NOW()
    WHERE id = v_player.id;
    
    INSERT INTO the_life_security_logs (player_id, user_id, event_type, action_name, old_values, new_values, metadata, is_flagged)
    VALUES (v_player.id, v_player_id, 'action', 'jail_bribe_success',
      jsonb_build_object('cash', v_player.cash, 'jail_until', v_player.jail_until),
      jsonb_build_object('cash', v_player.cash - v_bribe_amount, 'jail_until', NULL),
      jsonb_build_object('request_id', v_request_id, 'amount_paid', v_bribe_amount),
      false);
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Bribe successful! You are free.',
      'amount_paid', v_bribe_amount
    );
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_jail_bribe() TO authenticated;

-- Add comment
COMMENT ON FUNCTION execute_jail_bribe() IS 
'Secure jail bribe function - server calculates amount (fixed formula to match frontend)';
