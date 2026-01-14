-- Add inventory system for The Life game
-- Each player gets their own inventory with items from businesses

-- Create TheLife items table (items specific to The Life game)
CREATE TABLE IF NOT EXISTS the_life_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'consumable', 'special', 'business_reward', etc.
  icon TEXT NOT NULL, -- emoji or URL
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  tradeable BOOLEAN DEFAULT false,
  usable BOOLEAN DEFAULT true,
  effect TEXT, -- JSON string describing what the item does
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create TheLife player inventory (items owned by each player)
CREATE TABLE IF NOT EXISTS the_life_player_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES the_life_items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, item_id)
);

-- Enable RLS
ALTER TABLE the_life_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE the_life_player_inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view TheLife items" ON the_life_items;
DROP POLICY IF EXISTS "Admins can manage TheLife items" ON the_life_items;
DROP POLICY IF EXISTS "Players can view own inventory" ON the_life_player_inventory;
DROP POLICY IF EXISTS "Players can manage own inventory" ON the_life_player_inventory;

-- Policies for items (everyone can view)
CREATE POLICY "Anyone can view TheLife items"
  ON the_life_items FOR SELECT
  USING (true);

-- Admins can insert, update, delete items
CREATE POLICY "Admins can manage TheLife items"
  ON the_life_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Policies for player inventory
CREATE POLICY "Players can view own inventory"
  ON the_life_player_inventory FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can manage own inventory"
  ON the_life_player_inventory FOR ALL
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_thelife_inventory_player ON the_life_player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_thelife_inventory_item ON the_life_player_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_thelife_items_type ON the_life_items(type);

-- Add reward_item_id to businesses table (what item they give)
-- Also add reward_type to choose between cash or items
ALTER TABLE the_life_businesses 
ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'cash', -- 'cash' or 'items'
ADD COLUMN IF NOT EXISTS reward_item_id UUID,
ADD COLUMN IF NOT EXISTS reward_item_quantity INTEGER DEFAULT 1;

-- Add foreign key constraint with ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'the_life_businesses_reward_item_id_fkey'
  ) THEN
    ALTER TABLE the_life_businesses 
    ADD CONSTRAINT the_life_businesses_reward_item_id_fkey 
    FOREIGN KEY (reward_item_id) 
    REFERENCES the_life_items(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Insert default items
INSERT INTO the_life_items (name, description, type, icon, rarity, tradeable, usable, effect) VALUES
  ('Jail Free Card', 'Get out of jail instantly, no questions asked', 'special', 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400', 'legendary', false, true, '{"type": "jail_free"}'),
  ('Cash Stack', 'A bundle of cash from your business', 'business_reward', 'https://images.unsplash.com/photo-1607863680198-23d4b2565df0?w=400', 'common', true, false, '{"type": "currency", "value": 1000}'),
  ('Drug Package', 'Sealed package of high-quality product', 'business_reward', 'https://images.unsplash.com/photo-1606400082777-ef05f3c5cde9?w=400', 'rare', true, false, '{"type": "currency", "value": 5000}'),
  ('Luxury Watch', 'Expensive timepiece from jewelry store', 'business_reward', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400', 'epic', true, false, '{"type": "currency", "value": 10000}'),
  ('Gold Bar', 'Pure gold from the vault', 'business_reward', 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400', 'legendary', true, false, '{"type": "currency", "value": 25000}'),
  ('Health Pack', 'Restores 50 HP instantly', 'consumable', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 'rare', true, true, '{"type": "heal", "value": 50}'),
  ('Energy Drink', 'Restores 100 stamina', 'consumable', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', 'common', true, true, '{"type": "stamina", "value": 100}'),
  ('Lucky Charm', 'Increases success rate by 10% for next crime', 'consumable', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400', 'epic', false, true, '{"type": "luck_boost", "value": 10}')
ON CONFLICT DO NOTHING;

-- Update existing businesses to give items
-- Get the item IDs first
DO $$
DECLARE
  cash_stack_id UUID;
  drug_package_id UUID;
  luxury_watch_id UUID;
  gold_bar_id UUID;
BEGIN
  -- Get item IDs
  SELECT id INTO cash_stack_id FROM the_life_items WHERE name = 'Cash Stack';
  SELECT id INTO drug_package_id FROM the_life_items WHERE name = 'Drug Package';
  SELECT id INTO luxury_watch_id FROM the_life_items WHERE name = 'Luxury Watch';
  SELECT id INTO gold_bar_id FROM the_life_items WHERE name = 'Gold Bar';

  -- Update businesses with item rewards
  UPDATE the_life_businesses 
  SET reward_item_id = cash_stack_id,
      reward_item_quantity = 2
  WHERE min_level_required = 1;

  UPDATE the_life_businesses 
  SET reward_item_id = drug_package_id,
      reward_item_quantity = 1
  WHERE min_level_required = 5;

  UPDATE the_life_businesses 
  SET reward_item_id = luxury_watch_id,
      reward_item_quantity = 1
  WHERE min_level_required >= 10 AND min_level_required < 20;

  UPDATE the_life_businesses 
  SET reward_item_id = gold_bar_id,
      reward_item_quantity = 1
  WHERE min_level_required >= 20;
END $$;
