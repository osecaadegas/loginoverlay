-- Create server-side function to handle PvP attacks
-- This bypasses RLS and ensures atomic transactions

CREATE OR REPLACE FUNCTION execute_pvp_attack(
  p_attacker_user_id UUID,
  p_defender_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attacker RECORD;
  v_defender RECORD;
  v_attacker_power NUMERIC;
  v_defender_power NUMERIC;
  v_win_chance NUMERIC;
  v_won BOOLEAN;
  v_cash_stolen BIGINT;
  v_result JSON;
BEGIN
  -- Get attacker data
  SELECT * INTO v_attacker
  FROM the_life_players
  WHERE user_id = p_attacker_user_id;

  IF v_attacker IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Attacker not found');
  END IF;

  -- Check attacker stamina
  IF v_attacker.stamina < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Need 3 stamina to attack');
  END IF;

  -- Check attacker HP
  IF v_attacker.hp < 20 THEN
    RETURN json_build_object('success', false, 'error', 'Need at least 20 HP to attack');
  END IF;

  -- Get defender data
  SELECT * INTO v_defender
  FROM the_life_players
  WHERE id = p_defender_id;

  IF v_defender IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Target not found');
  END IF;

  -- Calculate combat powers with HP penalty
  v_attacker_power := (
    (COALESCE(v_attacker.power, 0) * 2) +
    (COALESCE(v_attacker.intelligence, 0) * 1.5) +
    (COALESCE(v_attacker.defense, 0) * 1) +
    (COALESCE(v_attacker.level, 1) * 10)
  );
  
  -- Apply HP penalty for attacker
  IF (v_attacker.hp::NUMERIC / v_attacker.max_hp) < 0.5 THEN
    v_attacker_power := v_attacker_power * (v_attacker.hp::NUMERIC / v_attacker.max_hp * 2);
  END IF;

  v_defender_power := (
    (COALESCE(v_defender.power, 0) * 2) +
    (COALESCE(v_defender.intelligence, 0) * 1.5) +
    (COALESCE(v_defender.defense, 0) * 1) +
    (COALESCE(v_defender.level, 1) * 10)
  );
  
  -- Apply HP penalty for defender
  IF (v_defender.hp::NUMERIC / v_defender.max_hp) < 0.5 THEN
    v_defender_power := v_defender_power * (v_defender.hp::NUMERIC / v_defender.max_hp * 2);
  END IF;

  -- Calculate win chance (5-95%)
  v_win_chance := GREATEST(5, LEAST(95, 
    (v_attacker_power / (v_attacker_power + v_defender_power)) * 100
  ));

  -- Determine battle outcome
  v_won := (random() * 100) < v_win_chance;
  
  -- Calculate cash stolen (10% of defender's cash)
  v_cash_stolen := FLOOR(v_defender.cash * 0.1);

  IF v_won THEN
    -- Attacker wins
    -- Update attacker
    UPDATE the_life_players
    SET 
      stamina = stamina - 3,
      cash = cash + v_cash_stolen,
      pvp_wins = COALESCE(pvp_wins, 0) + 1,
      updated_at = NOW()
    WHERE user_id = p_attacker_user_id;

    -- Update defender (loser goes to hospital with 0 HP)
    UPDATE the_life_players
    SET 
      hp = 0,
      cash = GREATEST(0, cash - v_cash_stolen),
      hospital_until = NOW() + INTERVAL '30 minutes',
      pvp_losses = COALESCE(pvp_losses, 0) + 1,
      updated_at = NOW()
    WHERE id = p_defender_id;

    -- Log battle
    INSERT INTO the_life_pvp_logs (
      attacker_id, 
      defender_id, 
      winner_id, 
      cash_stolen,
      attacker_hp_lost,
      defender_hp_lost
    ) VALUES (
      v_attacker.id,
      v_defender.id,
      v_attacker.id,
      v_cash_stolen,
      0,
      v_defender.hp
    );

    v_result := json_build_object(
      'success', true,
      'won', true,
      'cash_stolen', v_cash_stolen,
      'message', 'Victory! Stole $' || v_cash_stolen || ' and sent them to hospital!'
    );

  ELSE
    -- Attacker loses
    -- Update attacker (loser goes to hospital with 0 HP)
    UPDATE the_life_players
    SET 
      stamina = stamina - 3,
      hp = 0,
      cash = GREATEST(0, cash - v_cash_stolen),
      hospital_until = NOW() + INTERVAL '30 minutes',
      pvp_losses = COALESCE(pvp_losses, 0) + 1,
      updated_at = NOW()
    WHERE user_id = p_attacker_user_id;

    -- Update defender (winner)
    UPDATE the_life_players
    SET 
      cash = cash + v_cash_stolen,
      pvp_wins = COALESCE(pvp_wins, 0) + 1,
      updated_at = NOW()
    WHERE id = p_defender_id;

    -- Log battle
    INSERT INTO the_life_pvp_logs (
      attacker_id, 
      defender_id, 
      winner_id, 
      cash_stolen,
      attacker_hp_lost,
      defender_hp_lost
    ) VALUES (
      v_attacker.id,
      v_defender.id,
      v_defender.id,
      v_cash_stolen,
      v_attacker.hp,
      0
    );

    v_result := json_build_object(
      'success', true,
      'won', false,
      'cash_stolen', v_cash_stolen,
      'message', 'Defeated! Lost $' || v_cash_stolen || ' and sent to hospital!'
    );

  END IF;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', SQLERRM
  );
END;
$$;
