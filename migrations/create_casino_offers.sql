-- Create casino_offers table
CREATE TABLE IF NOT EXISTS casino_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  casino_name VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  bonus_link TEXT NOT NULL,
  badge VARCHAR(50),
  badge_class VARCHAR(50),
  min_deposit VARCHAR(50),
  cashback VARCHAR(50),
  bonus_value VARCHAR(50),
  free_spins VARCHAR(100),
  is_premium BOOLEAN DEFAULT false,
  details TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index on is_active for faster queries
CREATE INDEX idx_casino_offers_active ON casino_offers(is_active);
CREATE INDEX idx_casino_offers_order ON casino_offers(display_order);

-- Enable Row Level Security
ALTER TABLE casino_offers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active offers
CREATE POLICY "Anyone can view active casino offers"
  ON casino_offers
  FOR SELECT
  USING (is_active = true);

-- Policy: Admins can view all offers
CREATE POLICY "Admins can view all casino offers"
  ON casino_offers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert offers
CREATE POLICY "Admins can insert casino offers"
  ON casino_offers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update offers
CREATE POLICY "Admins can update casino offers"
  ON casino_offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can delete offers
CREATE POLICY "Admins can delete casino offers"
  ON casino_offers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_casino_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_casino_offers_updated_at
  BEFORE UPDATE ON casino_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_casino_offers_updated_at();
