-- Create brothel workers system for The Life game

-- Template table for all available workers
CREATE TABLE IF NOT EXISTS the_life_brothel_workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  hire_cost INTEGER DEFAULT 1000,
  income_per_hour INTEGER DEFAULT 100,
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  min_level_required INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which workers each player has hired
CREATE TABLE IF NOT EXISTS the_life_player_brothel_workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES the_life_brothel_workers(id) ON DELETE CASCADE NOT NULL,
  hired_at TIMESTAMPTZ DEFAULT NOW(),
  total_earned BIGINT DEFAULT 0,
  UNIQUE(player_id, worker_id)
);

-- Enable RLS
ALTER TABLE the_life_brothel_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE the_life_player_brothel_workers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view workers" ON the_life_brothel_workers;
DROP POLICY IF EXISTS "Admins can manage workers" ON the_life_brothel_workers;
DROP POLICY IF EXISTS "Users can view own hired workers" ON the_life_player_brothel_workers;
DROP POLICY IF EXISTS "Users can manage own hired workers" ON the_life_player_brothel_workers;

-- Policies for workers (public read)
CREATE POLICY "Anyone can view workers"
  ON the_life_brothel_workers FOR SELECT
  USING (is_active = true);

-- Admins can manage workers
CREATE POLICY "Admins can manage workers"
  ON the_life_brothel_workers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policies for player hired workers
CREATE POLICY "Users can view own hired workers"
  ON the_life_player_brothel_workers FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own hired workers"
  ON the_life_player_brothel_workers FOR ALL
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brothel_workers_rarity ON the_life_brothel_workers(rarity);
CREATE INDEX IF NOT EXISTS idx_brothel_workers_active ON the_life_brothel_workers(is_active);
CREATE INDEX IF NOT EXISTS idx_player_brothel_workers_player ON the_life_player_brothel_workers(player_id);
CREATE INDEX IF NOT EXISTS idx_player_brothel_workers_worker ON the_life_player_brothel_workers(worker_id);

-- Insert default workers
INSERT INTO the_life_brothel_workers (name, description, image_url, hire_cost, income_per_hour, rarity, min_level_required) VALUES
  ('Amber', 'Friendly and reliable starter', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 500, 50, 'common', 1),
  ('Crystal', 'Professional with regular clientele', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', 1000, 100, 'common', 1),
  ('Jade', 'Experienced with VIP clients', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', 2500, 200, 'rare', 5),
  ('Diamond', 'Elite escort with wealthy connections', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400', 5000, 400, 'epic', 10),
  ('Sapphire', 'Celebrity-level companion', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400', 8000, 600, 'epic', 12),
  ('Ruby', 'Legendary performer with international fame', 'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=400', 15000, 1000, 'legendary', 15)
ON CONFLICT DO NOTHING;
