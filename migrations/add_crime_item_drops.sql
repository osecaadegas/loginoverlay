-- Create table for crime item drops
-- Allows crimes to drop items with configurable drop chances

CREATE TABLE IF NOT EXISTS the_life_crime_drops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crime_id UUID REFERENCES the_life_robberies(id) ON DELETE CASCADE,
  item_id UUID REFERENCES the_life_items(id) ON DELETE CASCADE,
  drop_chance INTEGER NOT NULL CHECK (drop_chance >= 0 AND drop_chance <= 100), -- Percentage 0-100
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_crime_drops_crime ON the_life_crime_drops(crime_id);

-- Add RLS policies
ALTER TABLE the_life_crime_drops ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read crime drops"
  ON the_life_crime_drops
  FOR SELECT
  USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to crime drops"
  ON the_life_crime_drops
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE the_life_crime_drops IS 'Items that can drop from crimes with drop chances';
COMMENT ON COLUMN the_life_crime_drops.drop_chance IS 'Percentage chance (0-100) that this item drops';
COMMENT ON COLUMN the_life_crime_drops.min_quantity IS 'Minimum quantity awarded when item drops';
COMMENT ON COLUMN the_life_crime_drops.max_quantity IS 'Maximum quantity awarded when item drops';
