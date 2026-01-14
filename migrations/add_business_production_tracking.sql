-- Track active business productions in database
-- This persists across browser refreshes

CREATE TABLE IF NOT EXISTS the_life_business_productions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES the_life_businesses(id) ON DELETE CASCADE NOT NULL,
  reward_item_id UUID REFERENCES the_life_items(id),
  reward_item_quantity INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL,
  collected BOOLEAN DEFAULT false,
  UNIQUE(player_id, business_id)
);

-- Enable RLS
ALTER TABLE the_life_business_productions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Players can view own productions" ON the_life_business_productions;
DROP POLICY IF EXISTS "Players can manage own productions" ON the_life_business_productions;

-- Policies
CREATE POLICY "Players can view own productions"
  ON the_life_business_productions FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can manage own productions"
  ON the_life_business_productions FOR ALL
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_productions_player ON the_life_business_productions(player_id);
CREATE INDEX IF NOT EXISTS idx_business_productions_business ON the_life_business_productions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_productions_collected ON the_life_business_productions(collected);
