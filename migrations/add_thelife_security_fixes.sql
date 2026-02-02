-- =====================================================
-- THE LIFE GAME SECURITY FIXES
-- Run this migration in Supabase SQL Editor
-- =====================================================

-- 1. ADD DATABASE CONSTRAINTS (Prevents negative balances even if exploited)
-- =====================================================

-- Add constraint for non-negative cash (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'the_life_players_cash_non_negative'
  ) THEN
    ALTER TABLE the_life_players 
    ADD CONSTRAINT the_life_players_cash_non_negative CHECK (cash >= 0);
  END IF;
END $$;

-- Add constraint for non-negative bank balance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'the_life_players_bank_non_negative'
  ) THEN
    ALTER TABLE the_life_players 
    ADD CONSTRAINT the_life_players_bank_non_negative CHECK (bank_balance >= 0);
  END IF;
END $$;

-- Add constraint for non-negative stamina
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'the_life_players_stamina_non_negative'
  ) THEN
    ALTER TABLE the_life_players 
    ADD CONSTRAINT the_life_players_stamina_non_negative CHECK (stamina >= 0);
  END IF;
END $$;


-- 2. SERVER-SIDE CRIME EXECUTION
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
    
    -- TODO: Handle item drops server-side (optional enhancement)
    v_dropped_items := ARRAY[]::TEXT[];
    
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


-- 3. SERVER-SIDE BANK TRANSFER
-- =====================================================
CREATE OR REPLACE FUNCTION execute_bank_transfer(
  p_amount INTEGER,
  p_transfer_type TEXT -- 'deposit' or 'withdraw'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_new_cash INTEGER;
  v_new_bank INTEGER;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  IF p_transfer_type NOT IN ('deposit', 'withdraw') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transfer type');
  END IF;
  
  -- Get player with row lock
  SELECT * INTO v_player 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Check if player is in jail
  IF v_player.jail_until IS NOT NULL AND v_player.jail_until > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use bank while in jail');
  END IF;
  
  IF p_transfer_type = 'deposit' THEN
    -- SERVER validates cash available
    IF v_player.cash < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not enough cash');
    END IF;
    
    v_new_cash := v_player.cash - p_amount;
    v_new_bank := v_player.bank_balance + p_amount;
    
  ELSE -- withdraw
    -- SERVER validates bank balance
    IF v_player.bank_balance < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not enough in bank');
    END IF;
    
    v_new_cash := v_player.cash + p_amount;
    v_new_bank := v_player.bank_balance - p_amount;
  END IF;
  
  -- Execute transfer atomically
  UPDATE the_life_players 
  SET cash = v_new_cash,
      bank_balance = v_new_bank
  WHERE user_id = auth.uid();
  
  RETURN jsonb_build_object(
    'success', true,
    'new_cash', v_new_cash,
    'new_bank', v_new_bank,
    'message', CASE WHEN p_transfer_type = 'deposit' 
                    THEN 'Deposited $' || p_amount 
                    ELSE 'Withdrew $' || p_amount END
  );
END;
$$;


-- 4. SERVER-SIDE BUSINESS COLLECTION
-- =====================================================
CREATE OR REPLACE FUNCTION collect_business_production(
  p_production_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_production RECORD;
  v_business RECORD;
  v_ownership RECORD;
  v_reward_cash INTEGER;
  v_reward_item_id UUID;
  v_reward_item_qty INTEGER;
BEGIN
  -- Get player with lock
  SELECT * INTO v_player 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Get production record
  SELECT * INTO v_production 
  FROM the_life_business_productions 
  WHERE id = p_production_id
  FOR UPDATE;
  
  IF v_production IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Production not found');
  END IF;
  
  -- Verify ownership
  SELECT * INTO v_ownership
  FROM the_life_player_businesses
  WHERE id = v_production.player_business_id
    AND player_id = v_player.id;
  
  IF v_ownership IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not your business');
  END IF;
  
  -- Check if already collected
  IF v_production.collected_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already collected');
  END IF;
  
  -- Check if production is complete
  IF v_production.completed_at IS NULL OR v_production.completed_at > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Production not complete');
  END IF;
  
  -- Get business data to calculate rewards SERVER-SIDE
  SELECT * INTO v_business
  FROM the_life_businesses
  WHERE id = v_ownership.business_id;
  
  -- SERVER calculates rewards based on business config (not client values!)
  v_reward_cash := COALESCE(v_business.base_income, 100) * COALESCE(v_production.quantity, 1);
  v_reward_item_id := v_production.reward_item_id;
  v_reward_item_qty := COALESCE(v_production.reward_item_quantity, 1);
  
  -- Mark as collected
  UPDATE the_life_business_productions
  SET collected_at = NOW()
  WHERE id = p_production_id;
  
  -- Add cash reward
  IF v_reward_cash > 0 THEN
    UPDATE the_life_players 
    SET cash = cash + v_reward_cash
    WHERE user_id = auth.uid();
  END IF;
  
  -- Add item reward if applicable
  IF v_reward_item_id IS NOT NULL AND v_reward_item_qty > 0 THEN
    INSERT INTO the_life_player_inventory (player_id, item_id, quantity)
    VALUES (v_player.id, v_reward_item_id, v_reward_item_qty)
    ON CONFLICT (player_id, item_id) 
    DO UPDATE SET quantity = the_life_player_inventory.quantity + v_reward_item_qty;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'reward_cash', v_reward_cash,
    'reward_item_id', v_reward_item_id,
    'reward_item_quantity', v_reward_item_qty,
    'message', 'Production collected!'
  );
END;
$$;


-- 5. SERVER-SIDE MARKET PURCHASE (With Locking)
-- =====================================================
CREATE OR REPLACE FUNCTION execute_market_purchase(
  p_listing_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer RECORD;
  v_listing RECORD;
  v_seller RECORD;
  v_total_cost INTEGER;
  v_actual_quantity INTEGER;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity');
  END IF;
  
  -- Lock buyer row first
  SELECT * INTO v_buyer 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_buyer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Lock listing row (prevents race condition!)
  SELECT * INTO v_listing 
  FROM the_life_market_listings 
  WHERE id = p_listing_id
    AND status = 'active'
  FOR UPDATE;
  
  IF v_listing IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing not available');
  END IF;
  
  -- Cannot buy own listing
  IF v_listing.seller_id = v_buyer.id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot buy your own listing');
  END IF;
  
  -- Calculate actual quantity (cannot exceed available)
  v_actual_quantity := LEAST(p_quantity, v_listing.quantity);
  v_total_cost := v_listing.price_per_unit * v_actual_quantity;
  
  -- Check buyer has enough cash
  IF v_buyer.cash < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough cash');
  END IF;
  
  -- Lock seller row
  SELECT * INTO v_seller 
  FROM the_life_players 
  WHERE id = v_listing.seller_id
  FOR UPDATE;
  
  -- Execute the trade atomically
  -- 1. Deduct cash from buyer
  UPDATE the_life_players 
  SET cash = cash - v_total_cost
  WHERE id = v_buyer.id;
  
  -- 2. Add cash to seller
  UPDATE the_life_players 
  SET cash = cash + v_total_cost
  WHERE id = v_listing.seller_id;
  
  -- 3. Add item to buyer inventory
  INSERT INTO the_life_player_inventory (player_id, item_id, quantity)
  VALUES (v_buyer.id, v_listing.item_id, v_actual_quantity)
  ON CONFLICT (player_id, item_id) 
  DO UPDATE SET quantity = the_life_player_inventory.quantity + v_actual_quantity;
  
  -- 4. Update or close listing
  IF v_listing.quantity <= v_actual_quantity THEN
    UPDATE the_life_market_listings 
    SET status = 'sold', 
        quantity = 0,
        sold_at = NOW(),
        buyer_id = v_buyer.id
    WHERE id = p_listing_id;
  ELSE
    UPDATE the_life_market_listings 
    SET quantity = quantity - v_actual_quantity
    WHERE id = p_listing_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'quantity_bought', v_actual_quantity,
    'total_cost', v_total_cost,
    'message', 'Purchase successful!'
  );
END;
$$;


-- 6. SERVER-SIDE JAIL BRIBE
-- =====================================================
CREATE OR REPLACE FUNCTION execute_jail_bribe()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_bribe_amount INTEGER;
  v_remaining_minutes NUMERIC;
  v_bribe_percentage NUMERIC;
  v_total_wealth INTEGER;
BEGIN
  -- Get player with lock
  SELECT * INTO v_player 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Check if actually in jail
  IF v_player.jail_until IS NULL OR v_player.jail_until <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in jail');
  END IF;
  
  -- SERVER calculates bribe amount (not client!)
  v_remaining_minutes := EXTRACT(EPOCH FROM (v_player.jail_until - NOW())) / 60;
  v_total_wealth := COALESCE(v_player.cash, 0) + COALESCE(v_player.bank_balance, 0);
  
  -- Bribe is 5% of wealth per minute remaining, min 100, max 50% of wealth
  v_bribe_percentage := LEAST(v_remaining_minutes * 5, 50);
  v_bribe_amount := GREATEST(
    100,
    FLOOR(v_total_wealth * (v_bribe_percentage / 100))
  );
  
  -- Check if can afford
  IF v_player.cash < v_bribe_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Not enough cash',
      'bribe_required', v_bribe_amount
    );
  END IF;
  
  -- Execute bribe
  UPDATE the_life_players 
  SET cash = cash - v_bribe_amount,
      jail_until = NULL
  WHERE user_id = auth.uid();
  
  RETURN jsonb_build_object(
    'success', true,
    'bribe_paid', v_bribe_amount,
    'message', 'Bribed your way out of jail!'
  );
END;
$$;


-- 7. GRANT EXECUTE PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION execute_crime(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_bank_transfer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION collect_business_production(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_market_purchase(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_jail_bribe() TO authenticated;


-- 8. ADD RATE LIMITING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS the_life_action_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  last_action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, action_type)
);

-- Enable RLS
ALTER TABLE the_life_action_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cooldowns"
  ON the_life_action_cooldowns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cooldowns"
  ON the_life_action_cooldowns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cooldowns"
  ON the_life_action_cooldowns FOR UPDATE
  USING (auth.uid() = user_id);


-- 9. RATE-LIMITED CRIME EXECUTION
-- =====================================================
CREATE OR REPLACE FUNCTION execute_crime_rate_limited(
  p_crime_id UUID,
  p_stamina_cost INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_action TIMESTAMPTZ;
  v_cooldown_seconds INTEGER := 3; -- Minimum 3 seconds between crimes
BEGIN
  -- Check cooldown
  SELECT last_action_at INTO v_last_action
  FROM the_life_action_cooldowns
  WHERE user_id = auth.uid() AND action_type = 'crime';
  
  IF v_last_action IS NOT NULL AND 
     v_last_action > NOW() - (v_cooldown_seconds || ' seconds')::INTERVAL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Too fast! Wait ' || v_cooldown_seconds || ' seconds between crimes'
    );
  END IF;
  
  -- Update cooldown
  INSERT INTO the_life_action_cooldowns (user_id, action_type, last_action_at)
  VALUES (auth.uid(), 'crime', NOW())
  ON CONFLICT (user_id, action_type) 
  DO UPDATE SET last_action_at = NOW();
  
  -- Execute the crime
  RETURN execute_crime(p_crime_id, p_stamina_cost);
END;
$$;

GRANT EXECUTE ON FUNCTION execute_crime_rate_limited(UUID, INTEGER) TO authenticated;
