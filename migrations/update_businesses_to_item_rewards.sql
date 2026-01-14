-- Update businesses to give item rewards instead of cash

-- Add new columns for item rewards
ALTER TABLE the_life_businesses 
ADD COLUMN IF NOT EXISTS item_reward_id UUID REFERENCES items(id),
ADD COLUMN IF NOT EXISTS item_quantity INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS unit_name TEXT DEFAULT 'grams'; -- e.g., 'grams', 'pills', 'bags', 'units'

-- Update existing businesses to reference items
-- First, create the items for business products if they don't exist
INSERT INTO items (name, description, type, icon, rarity, tradeable) VALUES
  ('Weed', 'High quality cannabis', 'item', '🌿', 'common', true),
  ('Meth', 'Pure methamphetamine', 'item', '🧪', 'rare', true),
  ('Cocaine', 'Premium cocaine', 'item', '❄️', 'epic', true)
ON CONFLICT DO NOTHING;

-- Update businesses to link to their item rewards
UPDATE the_life_businesses
SET 
  item_reward_id = (SELECT id FROM items WHERE name = 'Weed' LIMIT 1),
  item_quantity = 20,
  unit_name = 'grams'
WHERE name = 'Weed Farm';

UPDATE the_life_businesses
SET 
  item_reward_id = (SELECT id FROM items WHERE name = 'Meth' LIMIT 1),
  item_quantity = 15,
  unit_name = 'grams'
WHERE name = 'Meth Lab';

UPDATE the_life_businesses
SET 
  item_reward_id = (SELECT id FROM items WHERE name = 'Cocaine' LIMIT 1),
  item_quantity = 10,
  unit_name = 'grams'
WHERE name = 'Cocaine Factory';

-- Create function to add item to inventory (upsert)
CREATE OR REPLACE FUNCTION add_item_to_inventory(
  p_user_id UUID,
  p_item_id UUID,
  p_quantity INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO user_inventory (user_id, item_id, quantity)
  VALUES (p_user_id, p_item_id, p_quantity)
  ON CONFLICT (user_id, item_id)
  DO UPDATE SET 
    quantity = user_inventory.quantity + p_quantity,
    acquired_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION add_item_to_inventory TO authenticated;

COMMENT ON COLUMN the_life_businesses.item_reward_id IS 'The item that this business produces';
COMMENT ON COLUMN the_life_businesses.item_quantity IS 'How many units of the item are produced per cycle';
COMMENT ON COLUMN the_life_businesses.unit_name IS 'Display name for the unit (grams, pills, bags, etc.)';
