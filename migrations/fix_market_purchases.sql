-- Fix market purchases - create secure RPC functions
-- Run this migration in your Supabase SQL editor
-- This fixes the issue where users cannot buy from the store due to RLS blocking cash updates

-- =====================================================
-- 1. SECURE STORE PURCHASE FUNCTION
-- =====================================================
-- This function allows users to buy from the Monhe Store securely
CREATE OR REPLACE FUNCTION execute_store_purchase(
  p_store_item_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_store_item RECORD;
  v_total_cost INTEGER;
  v_existing_inv RECORD;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity');
  END IF;
  
  -- Lock player row
  SELECT * INTO v_player 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Get store item with item details
  SELECT si.*, i.name as item_name
  INTO v_store_item 
  FROM the_life_store_items si
  JOIN the_life_items i ON i.id = si.item_id
  WHERE si.id = p_store_item_id
    AND si.is_active = true
    AND (si.limited_time_until IS NULL OR si.limited_time_until >= NOW());
  
  IF v_store_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not available');
  END IF;
  
  -- Check stock
  IF v_store_item.stock_quantity IS NOT NULL AND v_store_item.stock_quantity < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough stock');
  END IF;
  
  -- Calculate total cost
  v_total_cost := v_store_item.price * p_quantity;
  
  -- Check player has enough cash
  IF v_player.cash < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough cash');
  END IF;
  
  -- Execute the purchase atomically
  -- 1. Deduct cash from player
  UPDATE the_life_players 
  SET cash = cash - v_total_cost
  WHERE id = v_player.id;
  
  -- 2. Add item to player inventory
  INSERT INTO the_life_player_inventory (player_id, item_id, quantity)
  VALUES (v_player.id, v_store_item.item_id, p_quantity)
  ON CONFLICT (player_id, item_id) 
  DO UPDATE SET quantity = the_life_player_inventory.quantity + p_quantity;
  
  -- 3. Update stock if limited
  IF v_store_item.stock_quantity IS NOT NULL THEN
    UPDATE the_life_store_items 
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_store_item_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'item_name', v_store_item.item_name,
    'quantity', p_quantity,
    'total_cost', v_total_cost,
    'new_cash', v_player.cash - v_total_cost,
    'message', 'Purchase successful!'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_store_purchase(UUID, INTEGER) TO authenticated;


-- =====================================================
-- 2. ADD_PLAYER_CASH HELPER FUNCTION (for seller payments)
-- =====================================================
CREATE OR REPLACE FUNCTION add_player_cash(
  p_player_id UUID,
  p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE the_life_players 
  SET cash = cash + p_amount
  WHERE id = p_player_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_player_cash(UUID, INTEGER) TO authenticated;


-- =====================================================
-- 3. UPDATE execute_market_purchase IF NOT EXISTS
-- =====================================================
-- Make sure the function has proper price handling
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
  v_item_name TEXT;
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
  
  -- Lock listing row
  SELECT ml.*, i.name as item_name
  INTO v_listing 
  FROM the_life_market_listings ml
  JOIN the_life_items i ON i.id = ml.item_id
  WHERE ml.id = p_listing_id
    AND ml.status = 'active'
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
  
  -- Calculate total cost (handle both price and price_per_unit columns)
  v_total_cost := COALESCE(v_listing.price_per_unit, v_listing.price, 0) * v_actual_quantity;
  
  IF v_total_cost <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid listing price');
  END IF;
  
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
  
  -- 5. Record transaction
  INSERT INTO the_life_market_transactions (
    listing_id, item_id, buyer_id, seller_id, 
    price, quantity, total_amount
  ) VALUES (
    p_listing_id, v_listing.item_id, v_buyer.id, v_listing.seller_id,
    COALESCE(v_listing.price_per_unit, v_listing.price, 0), v_actual_quantity, v_total_cost
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'item_name', v_listing.item_name,
    'quantity_bought', v_actual_quantity,
    'total_cost', v_total_cost,
    'new_cash', v_buyer.cash - v_total_cost,
    'message', 'Purchase successful!'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_market_purchase(UUID, INTEGER) TO authenticated;
