-- =====================================================
-- FIX: Hospital Recovery Button Not Working
-- =====================================================
-- Issue: Frontend uses direct supabase.update() which is blocked by RLS
-- 
-- The RLS policy prevents updating: hp, cash, bank_balance, hospital_until
-- Need a secure server-side RPC function like we have for jail bribe
-- =====================================================

-- =====================================================
-- 1. EMERGENCY RECOVERY (when HP = 0 & in hospital)
-- =====================================================
CREATE OR REPLACE FUNCTION execute_hospital_recovery()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_player the_life_players%ROWTYPE;
  v_recovery_cost integer;
  v_total_wealth integer;
  v_new_cash integer;
  v_new_bank integer;
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
  
  -- Verify player is actually in hospital
  IF v_player.hospital_until IS NULL OR v_player.hospital_until <= NOW() THEN
    -- Log suspicious attempt
    INSERT INTO the_life_security_logs (player_id, action_type, details, is_suspicious)
    VALUES (v_player.id, 'recovery_attempt_not_in_hospital', 
      jsonb_build_object('request_id', v_request_id), true);
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are not in hospital'
    );
  END IF;
  
  -- Check if this is an overdose (addiction = 100) - requires intense treatment instead
  IF COALESCE(v_player.addiction, 0) >= 100 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Overdose patients require Intense Treatment, not Emergency Recovery'
    );
  END IF;
  
  -- SERVER calculates recovery cost (15% of total wealth)
  v_total_wealth := COALESCE(v_player.cash, 0) + COALESCE(v_player.bank_balance, 0);
  v_recovery_cost := GREATEST(100, FLOOR(v_total_wealth * 0.15));
  
  -- Check if player can afford
  IF v_total_wealth < v_recovery_cost THEN
    INSERT INTO the_life_security_logs (player_id, action_type, details, is_suspicious)
    VALUES (v_player.id, 'recovery_failed', jsonb_build_object(
      'request_id', v_request_id,
      'reason', 'insufficient_funds',
      'required', v_recovery_cost,
      'had', v_total_wealth
    ), false);
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough money for recovery',
      'required', v_recovery_cost,
      'available', v_total_wealth
    );
  END IF;
  
  -- Calculate how to deduct (cash first, then bank)
  v_new_cash := v_player.cash;
  v_new_bank := v_player.bank_balance;
  
  IF v_new_cash >= v_recovery_cost THEN
    v_new_cash := v_new_cash - v_recovery_cost;
  ELSE
    -- Use all cash, then take from bank
    v_new_bank := v_new_bank - (v_recovery_cost - v_new_cash);
    v_new_cash := 0;
  END IF;
  
  -- Apply recovery
  UPDATE the_life_players
  SET 
    hp = max_hp,
    cash = v_new_cash,
    bank_balance = v_new_bank,
    hospital_until = NULL,
    updated_at = NOW()
  WHERE id = v_player.id;
  
  -- Log success
  INSERT INTO the_life_security_logs (player_id, action_type, details, is_suspicious)
  VALUES (v_player.id, 'hospital_recovery_success', jsonb_build_object(
    'request_id', v_request_id,
    'cost', v_recovery_cost,
    'from_cash', v_player.cash - v_new_cash,
    'from_bank', v_player.bank_balance - v_new_bank
  ), false);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fully recovered! You''re back in action!',
    'cost', v_recovery_cost
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_hospital_recovery() TO authenticated;

COMMENT ON FUNCTION execute_hospital_recovery() IS 
'Secure hospital emergency recovery - server calculates and deducts cost (15% of wealth)';


-- =====================================================
-- 2. INTENSE TREATMENT (for overdose patients)
-- =====================================================
CREATE OR REPLACE FUNCTION execute_intense_treatment()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_player the_life_players%ROWTYPE;
  v_treatment_cost integer;
  v_total_wealth integer;
  v_new_cash integer;
  v_new_bank integer;
  v_request_id text;
BEGIN
  v_request_id := gen_random_uuid()::text;
  v_player_id := auth.uid();
  
  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  SELECT * INTO v_player
  FROM the_life_players
  WHERE user_id = v_player_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Must be in hospital
  IF v_player.hospital_until IS NULL OR v_player.hospital_until <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not in hospital');
  END IF;
  
  -- Must have overdose (addiction >= 100)
  IF COALESCE(v_player.addiction, 0) < 100 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Intense treatment is only for overdose patients. Use Emergency Recovery instead.'
    );
  END IF;
  
  -- Calculate cost: 50% of wealth + $5,000 × level
  v_total_wealth := COALESCE(v_player.cash, 0) + COALESCE(v_player.bank_balance, 0);
  v_treatment_cost := FLOOR(v_total_wealth * 0.5) + (5000 * COALESCE(v_player.level, 1));
  
  IF v_total_wealth < v_treatment_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough money for treatment',
      'required', v_treatment_cost,
      'available', v_total_wealth
    );
  END IF;
  
  -- Calculate deduction
  v_new_cash := v_player.cash;
  v_new_bank := v_player.bank_balance;
  
  IF v_new_cash >= v_treatment_cost THEN
    v_new_cash := v_new_cash - v_treatment_cost;
  ELSE
    v_new_bank := v_new_bank - (v_treatment_cost - v_new_cash);
    v_new_cash := 0;
  END IF;
  
  -- Apply intense treatment: full HP, clear addiction, clear hospital
  UPDATE the_life_players
  SET 
    hp = max_hp,
    addiction = 0,
    cash = v_new_cash,
    bank_balance = v_new_bank,
    hospital_until = NULL,
    updated_at = NOW()
  WHERE id = v_player.id;
  
  -- Log success
  INSERT INTO the_life_security_logs (player_id, action_type, details, is_suspicious)
  VALUES (v_player.id, 'intense_treatment_success', jsonb_build_object(
    'request_id', v_request_id,
    'cost', v_treatment_cost,
    'addiction_cured', v_player.addiction
  ), false);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Intensive treatment successful! HP and addiction fully restored.',
    'cost', v_treatment_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_intense_treatment() TO authenticated;

COMMENT ON FUNCTION execute_intense_treatment() IS 
'Secure intense treatment for overdose - cures addiction and restores HP (50% wealth + $5k × level)';


-- =====================================================
-- 3. BUY HOSPITAL SERVICE (regular HP healing when not hospitalized)
-- =====================================================
CREATE OR REPLACE FUNCTION execute_hospital_service(
  p_service_type text -- 'basic', 'standard', 'premium', 'full'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_player the_life_players%ROWTYPE;
  v_cost integer;
  v_hp_restore integer;
  v_request_id text;
BEGIN
  v_request_id := gen_random_uuid()::text;
  v_player_id := auth.uid();
  
  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  SELECT * INTO v_player
  FROM the_life_players
  WHERE user_id = v_player_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Cannot use services if in hospital/jail
  IF v_player.hospital_until IS NOT NULL AND v_player.hospital_until > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are hospitalized - use Emergency Recovery');
  END IF;
  
  IF v_player.jail_until IS NOT NULL AND v_player.jail_until > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use hospital services while in jail');
  END IF;
  
  -- Already at full HP?
  IF v_player.hp >= v_player.max_hp THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already at full HP');
  END IF;
  
  -- Determine service cost and HP restoration
  CASE p_service_type
    WHEN 'basic' THEN
      v_cost := 100;
      v_hp_restore := 25;
    WHEN 'standard' THEN
      v_cost := 300;
      v_hp_restore := 60;
    WHEN 'premium' THEN
      v_cost := 750;
      v_hp_restore := 100;
    WHEN 'full' THEN
      v_cost := 1500;
      v_hp_restore := v_player.max_hp; -- Full restore
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid service type');
  END CASE;
  
  -- Check affordability
  IF v_player.cash < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough cash',
      'required', v_cost,
      'available', v_player.cash
    );
  END IF;
  
  -- Apply healing
  UPDATE the_life_players
  SET 
    hp = LEAST(max_hp, hp + v_hp_restore),
    cash = cash - v_cost,
    updated_at = NOW()
  WHERE id = v_player.id;
  
  -- Log
  INSERT INTO the_life_security_logs (player_id, action_type, details, is_suspicious)
  VALUES (v_player.id, 'hospital_service', jsonb_build_object(
    'request_id', v_request_id,
    'service', p_service_type,
    'cost', v_cost,
    'hp_restored', LEAST(v_player.max_hp - v_player.hp, v_hp_restore)
  ), false);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Treatment successful!',
    'hp_restored', LEAST(v_player.max_hp - v_player.hp, v_hp_restore),
    'cost', v_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_hospital_service(text) TO authenticated;

COMMENT ON FUNCTION execute_hospital_service(text) IS 
'Secure hospital service purchase - basic/standard/premium/full healing options';


-- =====================================================
-- 4. CURE ADDICTION (when not overdosed)
-- =====================================================
CREATE OR REPLACE FUNCTION execute_cure_addiction()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_player the_life_players%ROWTYPE;
  v_cure_cost integer;
  v_stats integer;
  v_stats_discount numeric;
  v_base_cost integer;
  v_request_id text;
BEGIN
  v_request_id := gen_random_uuid()::text;
  v_player_id := auth.uid();
  
  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  SELECT * INTO v_player
  FROM the_life_players
  WHERE user_id = v_player_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Check addiction level
  IF COALESCE(v_player.addiction, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have no addiction to cure');
  END IF;
  
  -- If overdosed, need intense treatment
  IF COALESCE(v_player.addiction, 0) >= 100 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Overdose requires Intense Treatment at the hospital'
    );
  END IF;
  
  -- Calculate cure cost (same as frontend formula):
  -- Base = level × addiction × 30
  -- Stats give up to 25% discount
  v_base_cost := COALESCE(v_player.level, 1) * COALESCE(v_player.addiction, 0) * 30;
  v_stats := COALESCE(v_player.power, 0) + COALESCE(v_player.intelligence, 0) + COALESCE(v_player.defense, 0);
  v_stats_discount := LEAST(v_stats::numeric / 400, 0.25);
  v_cure_cost := GREATEST(100, FLOOR(v_base_cost * (1 - v_stats_discount)));
  
  -- Check affordability
  IF v_player.cash < v_cure_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough cash',
      'required', v_cure_cost,
      'available', v_player.cash
    );
  END IF;
  
  -- Apply cure
  UPDATE the_life_players
  SET 
    addiction = 0,
    cash = cash - v_cure_cost,
    updated_at = NOW()
  WHERE id = v_player.id;
  
  -- Log
  INSERT INTO the_life_security_logs (player_id, action_type, details, is_suspicious)
  VALUES (v_player.id, 'addiction_cured', jsonb_build_object(
    'request_id', v_request_id,
    'cost', v_cure_cost,
    'addiction_was', v_player.addiction
  ), false);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Addiction cured! You feel clean and refreshed!',
    'cost', v_cure_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_cure_addiction() TO authenticated;

COMMENT ON FUNCTION execute_cure_addiction() IS 
'Secure addiction cure - costs level × addiction × 30, stats give up to 25% discount';
