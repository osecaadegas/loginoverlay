-- =====================================================
-- EQUIP ITEM RPC - Secure server-side equipment management
-- Validates item ownership and applies equipment atomically
-- =====================================================

CREATE OR REPLACE FUNCTION equip_item(
  p_inventory_id UUID  -- the_life_player_inventory.id
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
  v_equip_slot TEXT;
BEGIN
  -- Get player with lock
  SELECT * INTO v_player 
  FROM the_life_players 
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  -- Get inventory item (verify ownership)
  SELECT * INTO v_inventory
  FROM the_life_player_inventory
  WHERE id = p_inventory_id AND player_id = v_player.id;
  
  IF v_inventory IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not in your inventory');
  END IF;

  -- Get item data from DB
  SELECT * INTO v_item
  FROM the_life_items
  WHERE id = v_inventory.item_id;
  
  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  IF v_item.boost_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This item cannot be equipped');
  END IF;

  -- Determine equip slot
  IF v_item.boost_type = 'power' THEN
    v_equip_slot := 'equipped_weapon_id';
  ELSIF v_item.boost_type = 'defense' THEN
    v_equip_slot := 'equipped_gear_id';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid equipment type');
  END IF;

  -- Equip the item
  IF v_equip_slot = 'equipped_weapon_id' THEN
    UPDATE the_life_players 
    SET equipped_weapon_id = v_item.id, updated_at = NOW()
    WHERE id = v_player.id;
  ELSE
    UPDATE the_life_players 
    SET equipped_gear_id = v_item.id, updated_at = NOW()
    WHERE id = v_player.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Equipped ' || v_item.name || '!',
    'slot', v_equip_slot,
    'item_id', v_item.id
  );
END;
$$;

-- Unequip item RPC
CREATE OR REPLACE FUNCTION unequip_item(
  p_slot TEXT  -- 'equipped_weapon_id' or 'equipped_gear_id'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_slot NOT IN ('equipped_weapon_id', 'equipped_gear_id') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid equipment slot');
  END IF;

  IF p_slot = 'equipped_weapon_id' THEN
    UPDATE the_life_players 
    SET equipped_weapon_id = NULL, updated_at = NOW()
    WHERE user_id = auth.uid();
  ELSE
    UPDATE the_life_players 
    SET equipped_gear_id = NULL, updated_at = NOW()
    WHERE user_id = auth.uid();
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Item unequipped!');
END;
$$;

GRANT EXECUTE ON FUNCTION equip_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unequip_item(TEXT) TO authenticated;
