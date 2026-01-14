-- Create businesses system for The Life game (replaces drug operations)

-- Template table for all available businesses
CREATE TABLE IF NOT EXISTS the_life_businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cost INTEGER DEFAULT 500,
  profit INTEGER DEFAULT 1500,
  duration_minutes INTEGER DEFAULT 30,
  min_level_required INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE the_life_businesses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view businesses" ON the_life_businesses;
DROP POLICY IF EXISTS "Admins can manage businesses" ON the_life_businesses;

-- Policies for businesses (public read)
CREATE POLICY "Anyone can view businesses"
  ON the_life_businesses FOR SELECT
  USING (is_active = true);

-- Admins can manage businesses
CREATE POLICY "Admins can manage businesses"
  ON the_life_businesses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_businesses_active ON the_life_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_level ON the_life_businesses(min_level_required);

-- Insert default businesses (replacing old drug operations)
INSERT INTO the_life_businesses (name, description, image_url, cost, profit, duration_minutes, min_level_required) VALUES
  ('Weed Farm', 'Grow and sell cannabis products', 'https://images.unsplash.com/photo-1566890579320-47fad3d2880c?w=400', 500, 1500, 30, 1),
  ('Meth Lab', 'Produce and distribute methamphetamine', 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400', 2000, 7000, 60, 5),
  ('Cocaine Factory', 'Process and export cocaine', 'https://images.unsplash.com/photo-1519671845924-1fd18db430b8?w=400', 5000, 20000, 120, 10)
ON CONFLICT DO NOTHING;
