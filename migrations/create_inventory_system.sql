-- Create inventory system for users

-- Create items table (defines all available items in the game)
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'achievement', 'item', 'badge', 'skin', etc.
  icon TEXT NOT NULL, -- emoji or URL to icon
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  tradeable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_inventory table (items owned by users)
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  equipped BOOLEAN DEFAULT false,
  UNIQUE(user_id, item_id)
);

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view items" ON items;
DROP POLICY IF EXISTS "Admins can insert items" ON items;
DROP POLICY IF EXISTS "Users can view own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can insert own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON user_inventory;

-- Policy: Everyone can view items
CREATE POLICY "Anyone can view items"
  ON items
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert items
CREATE POLICY "Admins can insert items"
  ON items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Users can view their own inventory
CREATE POLICY "Users can view own inventory"
  ON user_inventory
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert into their own inventory
CREATE POLICY "Users can insert own inventory"
  ON user_inventory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own inventory
CREATE POLICY "Users can update own inventory"
  ON user_inventory
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item_id ON user_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);

-- Insert some default items
INSERT INTO items (name, description, type, icon, rarity, tradeable) VALUES
  ('Golden Trophy', 'Awarded for outstanding achievement', 'achievement', '🏆', 'legendary', false),
  ('Silver Medal', 'Second place finish', 'achievement', '🥈', 'rare', false),
  ('Bronze Medal', 'Third place finish', 'achievement', '🥉', 'common', false),
  ('Lucky Charm', 'Increases your luck in games', 'item', '🍀', 'common', true),
  ('Diamond Ring', 'A precious gem', 'item', '💎', 'epic', true),
  ('Fire Badge', 'For being on fire!', 'badge', '🔥', 'rare', false),
  ('Crown', 'King of the casino', 'badge', '👑', 'legendary', false),
  ('Star Badge', 'Rising star achievement', 'badge', '⭐', 'common', false),
  ('Money Bag', 'Big win achievement', 'achievement', '💰', 'epic', false),
  ('Gem Stone', 'A beautiful gem', 'item', '💠', 'rare', true)
ON CONFLICT DO NOTHING;
