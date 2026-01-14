-- Add profile, avatar, and equipment system to The Life

-- Add avatar selection field
ALTER TABLE the_life_players
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '/thelife/avatars/avatar1.png';

-- Add equipment slots
ALTER TABLE the_life_players
ADD COLUMN IF NOT EXISTS equipped_weapon_id UUID REFERENCES the_life_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS equipped_gear_id UUID REFERENCES the_life_items(id) ON DELETE SET NULL;

-- Create avatar options table
CREATE TABLE IF NOT EXISTS the_life_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for avatars
ALTER TABLE the_life_avatars ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read avatars" ON the_life_avatars;
DROP POLICY IF EXISTS "Allow authenticated full access avatars" ON the_life_avatars;

-- Allow everyone to view avatars
CREATE POLICY "Allow public read avatars"
  ON the_life_avatars
  FOR SELECT
  TO public
  USING (is_active = true);

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated full access avatars"
  ON the_life_avatars
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default avatars
INSERT INTO the_life_avatars (name, image_url, display_order) VALUES
('Avatar 1', '/thelife/avatars/avatar1.png', 1),
('Avatar 2', '/thelife/avatars/avatar2.png', 2),
('Avatar 3', '/thelife/avatars/avatar3.png', 3),
('Avatar 4', '/thelife/avatars/avatar4.png', 4),
('Avatar 5', '/thelife/avatars/avatar5.png', 5),
('Avatar 6', '/thelife/avatars/avatar6.png', 6),
('Avatar 7', '/thelife/avatars/avatar7.png', 7),
('Avatar 8', '/thelife/avatars/avatar8.png', 8)
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN the_life_players.avatar_url IS 'Player selected avatar image';
COMMENT ON COLUMN the_life_players.equipped_weapon_id IS 'Currently equipped weapon for power boost';
COMMENT ON COLUMN the_life_players.equipped_gear_id IS 'Currently equipped gear for defense boost';
COMMENT ON TABLE the_life_avatars IS 'Available avatar options for players';
