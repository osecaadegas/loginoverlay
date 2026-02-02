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
  
  -- Bribe is base 5% + 2% per 30 minutes remaining, max 50%
  -- This matches frontend calculation in gameUtils.js
  v_bribe_percentage := LEAST(5 + (FLOOR(v_remaining_minutes / 30) * 2), 50);
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

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own cooldowns" ON the_life_action_cooldowns;
DROP POLICY IF EXISTS "Users can insert own cooldowns" ON the_life_action_cooldowns;
DROP POLICY IF EXISTS "Users can update own cooldowns" ON the_life_action_cooldowns;

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


-- =====================================================
-- 10. SERVER-SIDE STREET SELLING (Black Market)
-- =====================================================
CREATE OR REPLACE FUNCTION execute_street_sell(
  p_inventory_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_inventory RECORD;
  v_item RECORD;
  v_street_price INTEGER;
  v_xp_reward INTEGER;
  v_jail_risk INTEGER := 35;
  v_roll NUMERIC;
  v_caught BOOLEAN;
  v_jail_time INTEGER := 45;
  v_new_quantity INTEGER;
BEGIN
  -- Get player with lock
  SELECT * INTO v_player 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Check hospital
  IF v_player.hospital_until IS NOT NULL AND v_player.hospital_until > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot sell while in hospital');
  END IF;
  
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity');
  END IF;
  
  -- Get inventory item with lock
  SELECT * INTO v_inventory
  FROM the_life_player_inventory
  WHERE id = p_inventory_id AND player_id = v_player.id
  FOR UPDATE;
  
  IF v_inventory IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found in inventory');
  END IF;
  
  IF v_inventory.quantity < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough items');
  END IF;
  
  -- Get item data for price (SERVER-SIDE lookup!)
  SELECT * INTO v_item
  FROM the_life_items
  WHERE id = v_inventory.item_id;
  
  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item data not found');
  END IF;
  
  -- SERVER calculates price and XP
  v_street_price := p_quantity * COALESCE(v_item.resell_price, 150);
  v_xp_reward := p_quantity * 10;
  
  -- SERVER-SIDE random roll for jail
  v_roll := random() * 100;
  v_caught := v_roll < v_jail_risk;
  
  -- Update inventory
  v_new_quantity := v_inventory.quantity - p_quantity;
  IF v_new_quantity <= 0 THEN
    DELETE FROM the_life_player_inventory WHERE id = p_inventory_id;
  ELSE
    UPDATE the_life_player_inventory SET quantity = v_new_quantity WHERE id = p_inventory_id;
  END IF;
  
  IF v_caught THEN
    -- Caught! Go to jail, lose items, no money
    UPDATE the_life_players
    SET jail_until = NOW() + (v_jail_time || ' minutes')::INTERVAL,
        hp = GREATEST(0, hp - 15)
    WHERE user_id = auth.uid();
    
    RETURN jsonb_build_object(
      'success', true,
      'caught', true,
      'jail_time', v_jail_time,
      'items_lost', p_quantity,
      'message', 'Busted! The cops caught you selling on the street!'
    );
  ELSE
    -- Success! Get money and XP
    UPDATE the_life_players
    SET cash = cash + v_street_price,
        xp = xp + v_xp_reward
    WHERE user_id = auth.uid();
    
    RETURN jsonb_build_object(
      'success', true,
      'caught', false,
      'cash_earned', v_street_price,
      'xp_earned', v_xp_reward,
      'message', 'Sold successfully on the street!'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION execute_street_sell(UUID, INTEGER) TO authenticated;


-- =====================================================
-- 11. SERVER-SIDE BROTHEL INCOME COLLECTION
-- =====================================================
CREATE OR REPLACE FUNCTION collect_brothel_income()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_brothel RECORD;
  v_hours_passed NUMERIC;
  v_full_hours INTEGER;
  v_income INTEGER;
BEGIN
  -- Get player with lock
  SELECT * INTO v_player 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Get brothel with lock (SERVER TIME!)
  SELECT * INTO v_brothel
  FROM the_life_brothels
  WHERE player_id = v_player.id
  FOR UPDATE;
  
  IF v_brothel IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No brothel found');
  END IF;
  
  IF COALESCE(v_brothel.income_per_hour, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hire workers first');
  END IF;
  
  -- SERVER calculates time passed (not client clock!)
  v_hours_passed := EXTRACT(EPOCH FROM (NOW() - v_brothel.last_collection)) / 3600;
  
  IF v_hours_passed < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Collection available in ' || CEIL((1 - v_hours_passed) * 60) || ' minutes'
    );
  END IF;
  
  v_full_hours := FLOOR(v_hours_passed)::INTEGER;
  v_income := v_full_hours * v_brothel.income_per_hour;
  
  IF v_income <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No income to collect');
  END IF;
  
  -- Update brothel
  UPDATE the_life_brothels
  SET last_collection = NOW(),
      total_earned = COALESCE(total_earned, 0) + v_income
  WHERE id = v_brothel.id;
  
  -- Add income to player
  UPDATE the_life_players
  SET cash = cash + v_income
  WHERE user_id = auth.uid();
  
  RETURN jsonb_build_object(
    'success', true,
    'income', v_income,
    'hours_collected', v_full_hours,
    'message', 'Collected $' || v_income || ' (' || v_full_hours || ' hours)'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION collect_brothel_income() TO authenticated;


-- =====================================================
-- 12. LEVEL/XP PROTECTION SYSTEM
-- =====================================================

-- Add level cap constraint (max level 200)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'the_life_players_level_cap'
  ) THEN
    -- First fix any existing invalid data
    UPDATE the_life_players SET level = 200 WHERE level > 200;
    UPDATE the_life_players SET level = 1 WHERE level < 1;
    
    ALTER TABLE the_life_players 
    ADD CONSTRAINT the_life_players_level_cap CHECK (level >= 1 AND level <= 200);
  END IF;
END $$;

-- Add XP bounds constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'the_life_players_xp_bounds'
  ) THEN
    -- Fix any existing negative XP
    UPDATE the_life_players SET xp = 0 WHERE xp < 0;
    
    ALTER TABLE the_life_players 
    ADD CONSTRAINT the_life_players_xp_bounds CHECK (xp >= 0);
  END IF;
END $$;


-- =====================================================
-- 13. AUTO LEVEL-UP TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION auto_level_up()
RETURNS TRIGGER AS $$
BEGIN
  -- Safety: cap level at 200
  IF NEW.level > 200 THEN
    NEW.level := 200;
    NEW.xp := 0;
    RETURN NEW;
  END IF;
  
  -- Auto level-up while XP >= required (level * 100)
  WHILE NEW.xp >= (NEW.level * 100) AND NEW.level < 200 LOOP
    NEW.xp := NEW.xp - (NEW.level * 100);
    NEW.level := NEW.level + 1;
    -- Grant small stat bonuses on level up
    NEW.max_hp := COALESCE(NEW.max_hp, 100) + 5;
    NEW.max_stamina := COALESCE(NEW.max_stamina, 300) + 2;
  END LOOP;
  
  -- If at max level, cap XP at threshold - 1
  IF NEW.level >= 200 THEN
    NEW.xp := LEAST(NEW.xp, 19999);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_level_up ON the_life_players;
CREATE TRIGGER trigger_auto_level_up
  BEFORE INSERT OR UPDATE OF xp, level ON the_life_players
  FOR EACH ROW
  EXECUTE FUNCTION auto_level_up();


-- =====================================================
-- 14. BLOCK DIRECT PLAYER STAT UPDATES (CRITICAL!)
-- =====================================================
-- This prevents players from using supabase.update() to cheat

-- First, drop ALL permissive update policies
DROP POLICY IF EXISTS "Users can update own player" ON the_life_players;
DROP POLICY IF EXISTS "Users can update own player data" ON the_life_players;
DROP POLICY IF EXISTS "Users can update own player - safe columns only" ON the_life_players;
DROP POLICY IF EXISTS "Users can update own player - restricted" ON the_life_players;

-- Create a policy that ONLY allows updating safe columns
-- Protected columns: level, xp, cash, bank_balance, power, defense, intelligence
-- Safe columns: avatar_url, se_username, twitch_username, equipped items, etc.
CREATE POLICY "Users can update own player - safe columns only" ON the_life_players
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
      auth.uid() = user_id AND
      -- These columns MUST NOT be changed via direct update
      -- They must equal their current database values
      level IS NOT DISTINCT FROM (SELECT level FROM the_life_players WHERE user_id = auth.uid()) AND
      xp IS NOT DISTINCT FROM (SELECT xp FROM the_life_players WHERE user_id = auth.uid()) AND
      cash IS NOT DISTINCT FROM (SELECT cash FROM the_life_players WHERE user_id = auth.uid()) AND
      bank_balance IS NOT DISTINCT FROM (SELECT bank_balance FROM the_life_players WHERE user_id = auth.uid()) AND
      power IS NOT DISTINCT FROM (SELECT power FROM the_life_players WHERE user_id = auth.uid()) AND
      defense IS NOT DISTINCT FROM (SELECT defense FROM the_life_players WHERE user_id = auth.uid()) AND
      intelligence IS NOT DISTINCT FROM (SELECT intelligence FROM the_life_players WHERE user_id = auth.uid()) AND
      hp IS NOT DISTINCT FROM (SELECT hp FROM the_life_players WHERE user_id = auth.uid()) AND
      max_hp IS NOT DISTINCT FROM (SELECT max_hp FROM the_life_players WHERE user_id = auth.uid()) AND
      stamina IS NOT DISTINCT FROM (SELECT stamina FROM the_life_players WHERE user_id = auth.uid()) AND
      max_stamina IS NOT DISTINCT FROM (SELECT max_stamina FROM the_life_players WHERE user_id = auth.uid()) AND
      pvp_wins IS NOT DISTINCT FROM (SELECT pvp_wins FROM the_life_players WHERE user_id = auth.uid()) AND
      pvp_losses IS NOT DISTINCT FROM (SELECT pvp_losses FROM the_life_players WHERE user_id = auth.uid()) AND
      total_robberies IS NOT DISTINCT FROM (SELECT total_robberies FROM the_life_players WHERE user_id = auth.uid()) AND
      successful_robberies IS NOT DISTINCT FROM (SELECT successful_robberies FROM the_life_players WHERE user_id = auth.uid())
    );


-- =====================================================
-- 15. SERVER-SIDE ITEM USAGE (XP BOOST FIX)
-- =====================================================
CREATE OR REPLACE FUNCTION use_consumable_item(
  p_inventory_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_inventory RECORD;
  v_item RECORD;
  v_effect JSONB;
  v_effect_type TEXT;
  v_effect_value INTEGER;
  v_new_hp INTEGER;
  v_new_stamina INTEGER;
  v_new_addiction INTEGER;
BEGIN
  -- Get player with lock
  SELECT * INTO v_player 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Get inventory item with lock (verify ownership!)
  SELECT * INTO v_inventory
  FROM the_life_player_inventory
  WHERE id = p_inventory_id AND player_id = v_player.id
  FOR UPDATE;
  
  IF v_inventory IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not in your inventory');
  END IF;
  
  -- Get item data FROM DATABASE (NOT from client!)
  SELECT * INTO v_item
  FROM the_life_items
  WHERE id = v_inventory.item_id;
  
  IF v_item IS NULL OR v_item.effect IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item has no effect');
  END IF;
  
  -- Parse effect from SERVER-STORED value
  v_effect := v_item.effect::JSONB;
  v_effect_type := v_effect->>'type';
  v_effect_value := COALESCE((v_effect->>'value')::INTEGER, 0);
  
  -- Apply effect based on type
  CASE v_effect_type
    WHEN 'heal' THEN
      v_new_hp := LEAST(v_player.max_hp, v_player.hp + v_effect_value);
      UPDATE the_life_players SET hp = v_new_hp WHERE user_id = auth.uid();
      
    WHEN 'stamina' THEN
      v_new_stamina := LEAST(v_player.max_stamina, v_player.stamina + v_effect_value);
      v_new_addiction := v_player.addiction;
      
      -- Handle addiction if item has it
      IF (v_effect->>'addiction') IS NOT NULL THEN
        v_new_addiction := LEAST(
          COALESCE(v_player.max_addiction, 100), 
          COALESCE(v_player.addiction, 0) + (v_effect->>'addiction')::INTEGER
        );
        
        -- Overdose check
        IF v_new_addiction >= 100 THEN
          UPDATE the_life_players 
          SET stamina = v_new_stamina,
              addiction = v_new_addiction,
              hp = 0,
              hospital_until = NOW() + INTERVAL '30 minutes'
          WHERE user_id = auth.uid();
          
          -- Consume item
          IF v_inventory.quantity > 1 THEN
            UPDATE the_life_player_inventory SET quantity = quantity - 1 WHERE id = p_inventory_id;
          ELSE
            DELETE FROM the_life_player_inventory WHERE id = p_inventory_id;
          END IF;
          
          RETURN jsonb_build_object(
            'success', true,
            'overdose', true,
            'message', 'OVERDOSE! Your addiction hit 100! You collapsed!'
          );
        END IF;
      END IF;
      
      UPDATE the_life_players 
      SET stamina = v_new_stamina, addiction = v_new_addiction 
      WHERE user_id = auth.uid();
      
    WHEN 'xp_boost' THEN
      -- SERVER controls XP amount - no client manipulation possible!
      UPDATE the_life_players 
      SET xp = xp + v_effect_value  -- This triggers auto_level_up
      WHERE user_id = auth.uid();
      
    WHEN 'cash' THEN
      UPDATE the_life_players 
      SET cash = cash + v_effect_value 
      WHERE user_id = auth.uid();
      
    WHEN 'jail_free' THEN
      IF v_player.jail_until IS NULL OR v_player.jail_until <= NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not in jail');
      END IF;
      UPDATE the_life_players SET jail_until = NULL WHERE user_id = auth.uid();
      
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown effect type');
  END CASE;
  
  -- Consume item from inventory
  IF v_inventory.quantity > 1 THEN
    UPDATE the_life_player_inventory SET quantity = quantity - 1 WHERE id = p_inventory_id;
  ELSE
    DELETE FROM the_life_player_inventory WHERE id = p_inventory_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'effect_type', v_effect_type,
    'effect_value', v_effect_value,
    'message', 'Used ' || v_item.name || '!'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION use_consumable_item(UUID) TO authenticated;


-- =====================================================
-- 16. SERVER-SIDE SEASON PASS REWARD CLAIM
-- =====================================================
CREATE OR REPLACE FUNCTION claim_season_pass_reward(
  p_tier INTEGER,
  p_reward_type TEXT,  -- 'free' or 'premium' or 'budget'
  p_season_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_progress RECORD;
  v_reward RECORD;
  v_player RECORD;
  v_season_id INTEGER;
  v_reward_column TEXT;
  v_claimed_array INTEGER[];
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get current season if not specified
  v_season_id := COALESCE(p_season_id, 1);
  
  -- Get user's season pass progress with lock
  SELECT * INTO v_progress
  FROM season_pass_progress
  WHERE user_id = v_user_id AND season_id = v_season_id
  FOR UPDATE;
  
  IF v_progress IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No season pass progress found');
  END IF;
  
  -- Check if tier is unlocked
  IF v_progress.current_tier < p_tier THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tier not yet unlocked');
  END IF;
  
  -- Check if user has access to this reward track
  IF p_reward_type = 'premium' AND NOT v_progress.has_premium THEN
    RETURN jsonb_build_object('success', false, 'error', 'Premium not purchased');
  END IF;
  
  IF p_reward_type = 'budget' AND NOT v_progress.has_budget THEN
    RETURN jsonb_build_object('success', false, 'error', 'Budget pass not purchased');
  END IF;
  
  -- Determine which claimed array to check
  v_reward_column := CASE p_reward_type
    WHEN 'free' THEN 'claimed_free_rewards'
    WHEN 'premium' THEN 'claimed_premium_rewards'
    WHEN 'budget' THEN 'claimed_budget_rewards'
    ELSE 'claimed_free_rewards'
  END;
  
  -- Check if already claimed
  EXECUTE format('SELECT %I FROM season_pass_progress WHERE user_id = $1 AND season_id = $2', v_reward_column)
  INTO v_claimed_array
  USING v_user_id, v_season_id;
  
  IF p_tier = ANY(COALESCE(v_claimed_array, ARRAY[]::INTEGER[])) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed');
  END IF;
  
  -- Get reward data FROM DATABASE (not client!)
  SELECT * INTO v_reward
  FROM season_pass_rewards
  WHERE season_id = v_season_id 
    AND tier = p_tier 
    AND track = p_reward_type;
  
  IF v_reward IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward not found');
  END IF;
  
  -- Get player for TheLife rewards
  SELECT * INTO v_player
  FROM the_life_players
  WHERE user_id = v_user_id
  FOR UPDATE;
  
  -- Grant the reward based on type (SERVER controls amounts!)
  CASE v_reward.type
    WHEN 'xp' THEN
      IF v_player IS NOT NULL THEN
        UPDATE the_life_players 
        SET xp = xp + COALESCE(v_reward.xp_amount, v_reward.quantity, 0)
        WHERE user_id = v_user_id;
      END IF;
      
    WHEN 'cash' THEN
      IF v_player IS NOT NULL THEN
        UPDATE the_life_players 
        SET cash = cash + COALESCE(v_reward.cash_amount, v_reward.quantity, 0)
        WHERE user_id = v_user_id;
      END IF;
      
    WHEN 'stamina' THEN
      IF v_player IS NOT NULL THEN
        UPDATE the_life_players 
        SET stamina = LEAST(max_stamina, stamina + COALESCE(v_reward.quantity, 0))
        WHERE user_id = v_user_id;
      END IF;
      
    WHEN 'item' THEN
      IF v_player IS NOT NULL AND v_reward.item_id IS NOT NULL THEN
        INSERT INTO the_life_player_inventory (player_id, item_id, quantity)
        VALUES (v_player.id, v_reward.item_id, COALESCE(v_reward.quantity, 1))
        ON CONFLICT (player_id, item_id)
        DO UPDATE SET quantity = the_life_player_inventory.quantity + COALESCE(v_reward.quantity, 1);
      END IF;
      
    ELSE
      -- Unknown reward type - log but don't fail
      NULL;
  END CASE;
  
  -- Mark as claimed
  EXECUTE format(
    'UPDATE season_pass_progress SET %I = array_append(COALESCE(%I, ARRAY[]::INTEGER[]), $1) WHERE user_id = $2 AND season_id = $3',
    v_reward_column, v_reward_column
  )
  USING p_tier, v_user_id, v_season_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reward_type', v_reward.type,
    'quantity', COALESCE(v_reward.quantity, v_reward.xp_amount, v_reward.cash_amount),
    'message', 'Reward claimed!'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION claim_season_pass_reward(INTEGER, TEXT, INTEGER) TO authenticated;
