-- Enhanced business required items system
-- Allows multiple items per business with individual rewards
-- E.g., Car Stripping can accept: Old Car ($500), Sports Car ($2000), Luxury Car ($5000)

-- Create junction table for business required items with their individual rewards
CREATE TABLE IF NOT EXISTS the_life_business_required_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES the_life_businesses(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES the_life_items(id) ON DELETE CASCADE,
  quantity_required INTEGER DEFAULT 1,
  reward_cash INTEGER DEFAULT 0,
  reward_item_id UUID REFERENCES the_life_items(id) ON DELETE SET NULL,
  reward_item_quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, item_id)
);

-- Add conversion_rate field to businesses (for money laundering, etc.)
-- This is a percentage that gets subtracted (e.g., 0.18 means 18% fee, player gets 82%)
ALTER TABLE the_life_businesses 
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,4) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_upgradeable BOOLEAN DEFAULT true;

-- Add username columns to players table for display in profile
ALTER TABLE the_life_players
ADD COLUMN IF NOT EXISTS se_username TEXT,
ADD COLUMN IF NOT EXISTS twitch_username TEXT;

-- Add reward_cash to productions table to store calculated cash rewards
ALTER TABLE the_life_business_productions
ADD COLUMN IF NOT EXISTS reward_cash INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE the_life_business_required_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view business required items" ON the_life_business_required_items;
DROP POLICY IF EXISTS "Admins can manage business required items" ON the_life_business_required_items;

-- Anyone can view required items
CREATE POLICY "Anyone can view business required items"
  ON the_life_business_required_items FOR SELECT
  USING (true);

-- Admins can manage required items
CREATE POLICY "Admins can manage business required items"
  ON the_life_business_required_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_required_items_business ON the_life_business_required_items(business_id);
CREATE INDEX IF NOT EXISTS idx_business_required_items_item ON the_life_business_required_items(item_id);

-- Add comments
COMMENT ON TABLE the_life_business_required_items IS 'Junction table for businesses that accept multiple items with different rewards (e.g., different car types)';
COMMENT ON COLUMN the_life_businesses.conversion_rate IS 'Conversion rate for businesses (e.g., 0.18 = 18% fee for money laundering, player receives 82%)';
COMMENT ON COLUMN the_life_businesses.is_upgradeable IS 'Whether this business can be upgraded to increase production/rewards';
COMMENT ON COLUMN the_life_business_required_items.reward_cash IS 'Cash reward for submitting this specific item';
COMMENT ON COLUMN the_life_business_required_items.reward_item_id IS 'Item reward for submitting this specific item (optional)';
