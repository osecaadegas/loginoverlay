-- Add business ownership system
-- Players must buy businesses before they can run them

-- Add purchase price to businesses (separate from production cost)
ALTER TABLE the_life_businesses 
ADD COLUMN IF NOT EXISTS purchase_price INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS production_cost INTEGER DEFAULT 500;

-- Update existing businesses: move 'cost' to 'production_cost', add purchase prices
UPDATE the_life_businesses 
SET production_cost = cost,
    purchase_price = CASE 
      WHEN min_level_required = 1 THEN 5000
      WHEN min_level_required = 5 THEN 20000
      WHEN min_level_required >= 10 THEN 100000
      ELSE cost * 10
    END
WHERE production_cost IS NULL OR purchase_price IS NULL;

-- Create table to track player-owned businesses
CREATE TABLE IF NOT EXISTS the_life_player_businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES the_life_businesses(id) ON DELETE CASCADE NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  total_productions INTEGER DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  UNIQUE(player_id, business_id)
);

-- Enable RLS
ALTER TABLE the_life_player_businesses ENABLE ROW LEVEL SECURITY;

-- Policies for player businesses
CREATE POLICY "Users can view own businesses"
  ON the_life_player_businesses FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own businesses"
  ON the_life_player_businesses FOR ALL
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_player_businesses_player ON the_life_player_businesses(player_id);
CREATE INDEX IF NOT EXISTS idx_player_businesses_business ON the_life_player_businesses(business_id);
