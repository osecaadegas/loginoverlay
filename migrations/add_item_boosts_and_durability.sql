-- Add boost system and durability to items
-- Allows items to temporarily boost skills (power, defense, intelligence)

-- Add columns to the_life_items for boosts
ALTER TABLE the_life_items
ADD COLUMN IF NOT EXISTS boost_type TEXT, -- 'power', 'defense', 'intelligence', null for non-boost items
ADD COLUMN IF NOT EXISTS boost_amount INTEGER DEFAULT 0, -- How many points to boost
ADD COLUMN IF NOT EXISTS max_durability INTEGER DEFAULT 0, -- Max uses before item breaks (0 = infinite)
ADD COLUMN IF NOT EXISTS consumable_on_break BOOLEAN DEFAULT true; -- Whether item disappears when durability reaches 0

-- Add durability tracking to player inventory
ALTER TABLE the_life_player_inventory
ADD COLUMN IF NOT EXISTS current_durability INTEGER, -- Current remaining uses
ADD COLUMN IF NOT EXISTS is_equipped BOOLEAN DEFAULT false; -- Whether item is currently equipped

-- Create index for equipped items lookup
CREATE INDEX IF NOT EXISTS idx_player_inventory_equipped ON the_life_player_inventory(player_id, is_equipped) WHERE is_equipped = true;

-- Update existing items to have durability if they have max_durability
-- This trigger will set current_durability when items are acquired
CREATE OR REPLACE FUNCTION set_initial_durability()
RETURNS TRIGGER AS $$
BEGIN
  -- Get max_durability from the item
  SELECT max_durability INTO NEW.current_durability
  FROM the_life_items
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_initial_durability ON the_life_player_inventory;
CREATE TRIGGER trigger_set_initial_durability
  BEFORE INSERT ON the_life_player_inventory
  FOR EACH ROW
  EXECUTE FUNCTION set_initial_durability();

-- Comment on columns for documentation
COMMENT ON COLUMN the_life_items.boost_type IS 'Type of temporary boost: power, defense, or intelligence';
COMMENT ON COLUMN the_life_items.boost_amount IS 'Amount of points to boost the skill by';
COMMENT ON COLUMN the_life_items.max_durability IS 'Maximum number of uses (0 = infinite durability)';
COMMENT ON COLUMN the_life_player_inventory.current_durability IS 'Remaining uses before item breaks';
COMMENT ON COLUMN the_life_player_inventory.is_equipped IS 'Whether this item is currently equipped and providing boosts';
