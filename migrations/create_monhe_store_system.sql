-- Create Monhe Store system with categories

CREATE TABLE IF NOT EXISTS the_life_store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES the_life_items(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('weapons', 'gear', 'healing', 'valuable', 'limited_time')),
  price INTEGER NOT NULL,
  stock_quantity INTEGER, -- NULL means unlimited stock
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  limited_time_until TIMESTAMPTZ, -- For limited time items
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id)
);

-- Enable RLS
ALTER TABLE the_life_store_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to store items" ON the_life_store_items;
DROP POLICY IF EXISTS "Allow authenticated read access" ON the_life_store_items;
DROP POLICY IF EXISTS "Allow authenticated full access" ON the_life_store_items;
DROP POLICY IF EXISTS "Allow service role full access" ON the_life_store_items;

-- Allow public read access to active items
CREATE POLICY "Allow public read access to store items"
  ON the_life_store_items
  FOR SELECT
  TO public
  USING (is_active = true);

-- Allow authenticated users full access (for admin panel)
CREATE POLICY "Allow authenticated full access"
  ON the_life_store_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access"
  ON the_life_store_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_store_items_category ON the_life_store_items(category);
CREATE INDEX IF NOT EXISTS idx_store_items_active ON the_life_store_items(is_active);

COMMENT ON TABLE the_life_store_items IS 'Items available in the Monhe Store with categories and pricing';
COMMENT ON COLUMN the_life_store_items.category IS 'Item category: weapons, gear, healing, valuable, limited_time';
COMMENT ON COLUMN the_life_store_items.stock_quantity IS 'NULL means unlimited, number means limited stock';
COMMENT ON COLUMN the_life_store_items.limited_time_until IS 'When limited time items expire';
