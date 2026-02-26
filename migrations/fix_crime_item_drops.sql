-- =====================================================
-- FIX: Wire up crime item drops in execute_crime()
-- =====================================================
-- The the_life_crime_drops table already exists but execute_crime()
-- had a TODO and returned an empty array. This migration replaces
-- the function with proper item drop logic that:
--   1. Queries the_life_crime_drops for the crime
--   2. Rolls each item against its drop_chance
--   3. Calculates random quantity between min/max
--   4. Upserts into the_life_player_inventory (ON CONFLICT add qty)
--   5. Returns dropped item names in the response
-- =====================================================

CREATE OR REPLACE FUNCTION execute_crime(
  p_crime_id UUID,
  p_stamina_cost INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_crime RECORD;
  v_success BOOLEAN;
  v_roll NUMERIC;
  v_base_success_chance NUMERIC;
  v_final_success_chance NUMERIC;
  v_level_difference INTEGER;
  v_hp_percentage NUMERIC;
  v_daily_catches INTEGER;
  v_total_wealth BIGINT;
  v_reward_cash INTEGER;
  v_xp_earned INTEGER;
  v_jail_time INTEGER;
  v_jail_multiplier NUMERIC;
  v_new_hp INTEGER;
  v_new_daily_catches INTEGER;
  v_today DATE;
  v_dropped_items TEXT[];
  v_result JSONB;
  v_drop RECORD;
  v_drop_roll NUMERIC;
  v_drop_qty INTEGER;
  v_item_name TEXT;
BEGIN
  -- Get player data with row lock
  SELECT * INTO v_player 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Check if player is in jail
  IF v_player.jail_until IS NOT NULL AND v_player.jail_until > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are in jail');
  END IF;
  
  -- Check if player is in hospital
  IF v_player.hospital_until IS NOT NULL AND v_player.hospital_until > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are in hospital');
  END IF;
  
  -- Get crime data from the_life_robberies table
  SELECT * INTO v_crime 
  FROM the_life_robberies 
  WHERE id = p_crime_id;
  
  IF v_crime IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Crime not found');
  END IF;
  
  -- Check stamina
  IF v_player.stamina < v_crime.stamina_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough stamina');
  END IF;
  
  -- Check level requirement
  IF v_player.level < v_crime.min_level_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Level too low');
  END IF;
  
  -- === CALCULATE SUCCESS CHANCE (SERVER-SIDE!) ===
  v_base_success_chance := v_crime.success_rate;
  
  -- Crime difficulty factor
  IF v_crime.min_level_required <= 10 THEN
    v_base_success_chance := v_base_success_chance + 5;
  ELSIF v_crime.min_level_required <= 30 THEN
    v_base_success_chance := v_base_success_chance + 0;
  ELSIF v_crime.min_level_required <= 60 THEN
    v_base_success_chance := v_base_success_chance - 3;
  ELSIF v_crime.min_level_required <= 100 THEN
    v_base_success_chance := v_base_success_chance - 6;
  ELSE
    v_base_success_chance := v_base_success_chance - 10;
  END IF;
  
  -- Level difference bonus/penalty
  v_level_difference := v_player.level - v_crime.min_level_required;
  IF v_level_difference >= 0 THEN
    v_base_success_chance := v_base_success_chance + LEAST(v_level_difference * 2, 10);
  ELSE
    v_base_success_chance := v_base_success_chance + (v_level_difference * 5);
  END IF;
  
  -- HP penalty for being low health
  v_hp_percentage := v_player.hp::NUMERIC / v_player.max_hp::NUMERIC;
  IF v_hp_percentage < 0.5 THEN
    v_base_success_chance := v_base_success_chance - ((0.5 - v_hp_percentage) * 20);
  END IF;
  
  -- Daily catches penalty
  v_daily_catches := COALESCE(v_player.daily_catches, 0);
  v_base_success_chance := v_base_success_chance - LEAST(v_daily_catches * 3, 15);
  
  -- Wealth-based risk factor
  v_total_wealth := COALESCE(v_player.cash, 0) + COALESCE(v_player.bank_balance, 0);
  IF v_total_wealth > 1000000 THEN
    v_base_success_chance := v_base_success_chance - LEAST(FLOOR(LOG(v_total_wealth::NUMERIC / 1000000) + 1), 5);
  END IF;
  
  -- Level-based notoriety penalty
  IF v_player.level > 20 THEN
    v_base_success_chance := v_base_success_chance - LEAST(FLOOR((v_player.level - 20) * 0.1), 5);
  END IF;
  
  -- Clamp between 10% and 85%
  v_final_success_chance := GREATEST(10, LEAST(85, v_base_success_chance));
  
  -- SERVER-SIDE RANDOM ROLL
  v_roll := random() * 100;
  v_success := v_roll < v_final_success_chance;
  
  IF v_success THEN
    -- Calculate reward
    v_reward_cash := v_crime.base_reward + FLOOR(random() * (v_crime.max_reward - v_crime.base_reward));
    v_xp_earned := v_crime.xp_reward;
    
    -- Update player - successful crime
    UPDATE the_life_players 
    SET stamina = stamina - v_crime.stamina_cost,
        cash = cash + v_reward_cash,
        xp = xp + v_xp_earned,
        total_robberies = COALESCE(total_robberies, 0) + 1,
        successful_robberies = COALESCE(successful_robberies, 0) + 1
    WHERE user_id = auth.uid();
    
    -- === ITEM DROPS ===
    v_dropped_items := ARRAY[]::TEXT[];
    
    FOR v_drop IN
      SELECT cd.item_id, cd.drop_chance, cd.min_quantity, cd.max_quantity, i.name AS item_name
      FROM the_life_crime_drops cd
      JOIN the_life_items i ON i.id = cd.item_id
      WHERE cd.crime_id = p_crime_id
    LOOP
      -- Roll for each possible drop
      v_drop_roll := random() * 100;
      IF v_drop_roll < v_drop.drop_chance THEN
        -- Calculate quantity
        IF v_drop.max_quantity > v_drop.min_quantity THEN
          v_drop_qty := v_drop.min_quantity + FLOOR(random() * (v_drop.max_quantity - v_drop.min_quantity + 1))::INTEGER;
        ELSE
          v_drop_qty := v_drop.min_quantity;
        END IF;
        
        -- Upsert into player inventory (add quantity if already owned)
        INSERT INTO the_life_player_inventory (player_id, item_id, quantity)
        VALUES (v_player.id, v_drop.item_id, v_drop_qty)
        ON CONFLICT (player_id, item_id)
        DO UPDATE SET quantity = the_life_player_inventory.quantity + v_drop_qty;
        
        -- Track dropped item name for response
        v_dropped_items := array_append(v_dropped_items, v_drop.item_name || ' x' || v_drop_qty);
      END IF;
    END LOOP;
    
    v_result := jsonb_build_object(
      'success', true,
      'crime_success', true,
      'reward', v_reward_cash,
      'xp_gained', v_xp_earned,
      'success_chance', v_final_success_chance,
      'dropped_items', v_dropped_items,
      'leveled_up', false,
      'message', 'Crime successful!'
    );
  ELSE
    -- === DYNAMIC JAIL TIME SYSTEM ===
    v_jail_multiplier := 1;
    
    -- Crime difficulty affects jail time
    IF v_crime.min_level_required <= 10 THEN
      v_jail_multiplier := v_jail_multiplier * 0.7;
    ELSIF v_crime.min_level_required <= 30 THEN
      v_jail_multiplier := v_jail_multiplier * 1.0;
    ELSIF v_crime.min_level_required <= 60 THEN
      v_jail_multiplier := v_jail_multiplier * 1.2;
    ELSIF v_crime.min_level_required <= 100 THEN
      v_jail_multiplier := v_jail_multiplier * 1.4;
    ELSE
      v_jail_multiplier := v_jail_multiplier * 1.7;
    END IF;
    
    -- Under-leveled = longer jail time
    IF v_level_difference < 0 THEN
      v_jail_multiplier := v_jail_multiplier + (ABS(v_level_difference) * 0.3);
    END IF;
    
    -- Low HP = longer jail
    IF v_hp_percentage < 0.5 THEN
      v_jail_multiplier := v_jail_multiplier + ((0.5 - v_hp_percentage) * 0.5);
    END IF;
    
    -- Daily catches increase jail time
    v_jail_multiplier := v_jail_multiplier + LEAST(v_daily_catches * 0.1, 0.3);
    
    -- Wealth-based jail time
    IF v_total_wealth > 1000000 THEN
      v_jail_multiplier := v_jail_multiplier + LEAST(LOG(v_total_wealth::NUMERIC / 1000000) * 0.1, 0.3);
    END IF;
    
    -- High level = more notorious
    IF v_player.level > 30 THEN
      v_jail_multiplier := v_jail_multiplier + LEAST((v_player.level - 30) * 0.002, 0.25);
    END IF;
    
    -- Calculate final jail time
    v_jail_time := GREATEST(5, LEAST(FLOOR(v_crime.jail_time_minutes * v_jail_multiplier)::INTEGER, v_crime.jail_time_minutes * 3));
    
    -- Calculate HP loss
    v_new_hp := GREATEST(0, v_player.hp - v_crime.hp_loss_on_fail);
    
    -- Handle daily catches reset
    v_today := CURRENT_DATE;
    IF v_player.last_catch_reset IS NULL OR v_player.last_catch_reset::DATE < v_today THEN
      v_new_daily_catches := 1;
    ELSE
      v_new_daily_catches := COALESCE(v_player.daily_catches, 0) + 1;
    END IF;
    
    v_xp_earned := FLOOR(v_crime.xp_reward / 2);
    
    -- Check if HP reaches 0 - hospital instead of jail
    IF v_new_hp = 0 THEN
      UPDATE the_life_players 
      SET stamina = stamina - v_crime.stamina_cost,
          hp = 0,
          hospital_until = NOW() + INTERVAL '30 minutes',
          xp = xp + v_xp_earned,
          total_robberies = COALESCE(total_robberies, 0) + 1,
          daily_catches = v_new_daily_catches,
          last_catch_reset = v_today,
          total_times_caught = COALESCE(total_times_caught, 0) + 1
      WHERE user_id = auth.uid();
      
      v_result := jsonb_build_object(
        'success', true,
        'crime_success', false,
        'in_hospital', true,
        'xp_gained', v_xp_earned,
        'success_chance', v_final_success_chance,
        'hp_lost', v_crime.hp_loss_on_fail,
        'message', 'You passed out and were sent to hospital!'
      );
    ELSE
      UPDATE the_life_players 
      SET stamina = stamina - v_crime.stamina_cost,
          hp = v_new_hp,
          jail_until = NOW() + (v_jail_time || ' minutes')::INTERVAL,
          xp = xp + v_xp_earned,
          total_robberies = COALESCE(total_robberies, 0) + 1,
          daily_catches = v_new_daily_catches,
          last_catch_reset = v_today,
          total_times_caught = COALESCE(total_times_caught, 0) + 1
      WHERE user_id = auth.uid();
      
      v_result := jsonb_build_object(
        'success', true,
        'crime_success', false,
        'in_hospital', false,
        'jail_time', v_jail_time,
        'xp_gained', v_xp_earned,
        'success_chance', v_final_success_chance,
        'hp_lost', v_crime.hp_loss_on_fail,
        'daily_catches', v_new_daily_catches,
        'message', 'Crime failed! You got caught!'
      );
    END IF;
  END IF;
  
  -- Log the crime attempt
  INSERT INTO the_life_robbery_history (player_id, robbery_id, success, reward, xp_gained, jail_time_minutes)
  VALUES (v_player.id, p_crime_id, v_success, COALESCE(v_reward_cash, 0), v_xp_earned, CASE WHEN v_success THEN 0 ELSE v_jail_time END);
  
  RETURN v_result;
END;
$$;

-- Re-grant execute permission
GRANT EXECUTE ON FUNCTION execute_crime(UUID, INTEGER) TO authenticated;
