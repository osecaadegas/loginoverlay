-- Daily Wheel System for StreamElements Points Integration

-- Table for wheel prize configuration (admin managed)
CREATE TABLE IF NOT EXISTS daily_wheel_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎁',
  color TEXT NOT NULL DEFAULT '#1a1a1a',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  se_points INTEGER NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking user spins
CREATE TABLE IF NOT EXISTS daily_wheel_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prize_id UUID REFERENCES daily_wheel_prizes(id) ON DELETE SET NULL,
  prize_label TEXT NOT NULL,
  se_points_won INTEGER NOT NULL DEFAULT 0,
  spin_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wheel_spins_user_date ON daily_wheel_spins(user_id, spin_date DESC);
CREATE INDEX IF NOT EXISTS idx_wheel_prizes_active ON daily_wheel_prizes(is_active, display_order);

-- Insert default prizes (8 segments like the example)
INSERT INTO daily_wheel_prizes (label, icon, color, text_color, se_points, probability, display_order) VALUES
('500 Points', '💰', '#1a1a1a', '#ffffff', 500, 15, 1),
('FREE SPIN', '🔄', '#e63946', '#ffffff', 0, 5, 2),
('100 Points', '🔥', '#1a1a1a', '#ffffff', 100, 20, 3),
('1,000 Points', '💵', '#ffcf40', '#000000', 1000, 10, 4),
('NOTHING', '💀', '#1a1a1a', '#ffffff', 0, 25, 5),
('JACKPOT', '👑', '#8e44ad', '#ffffff', 5000, 2, 6),
('TRY AGAIN', '❌', '#1a1a1a', '#ffffff', 0, 18, 7),
('250 Points', '💎', '#3498db', '#ffffff', 250, 5, 8)
ON CONFLICT DO NOTHING;

-- RLS Policies

-- Anyone can view active prizes
CREATE POLICY "Anyone can view active wheel prizes"
  ON daily_wheel_prizes FOR SELECT
  USING (is_active = true);

-- Admins can manage prizes
CREATE POLICY "Admins can manage wheel prizes"
  ON daily_wheel_prizes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Users can view their own spins
CREATE POLICY "Users can view their own spins"
  ON daily_wheel_spins FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own spins
CREATE POLICY "Users can record their spins"
  ON daily_wheel_spins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own unclaimed spins
CREATE POLICY "Users can claim their spins"
  ON daily_wheel_spins FOR UPDATE
  USING (auth.uid() = user_id AND claimed = false)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all spins
CREATE POLICY "Admins can view all spins"
  ON daily_wheel_spins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to check if user can spin today
CREATE OR REPLACE FUNCTION can_user_spin_today(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_spin_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT MAX(spin_date) INTO last_spin_time
  FROM daily_wheel_spins
  WHERE user_id = p_user_id;
  
  IF last_spin_time IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed
  RETURN (NOW() - last_spin_time) >= INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next spin time for user
CREATE OR REPLACE FUNCTION get_next_spin_time(p_user_id UUID)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  last_spin_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT MAX(spin_date) INTO last_spin_time
  FROM daily_wheel_spins
  WHERE user_id = p_user_id;
  
  IF last_spin_time IS NULL THEN
    RETURN NOW();
  END IF;
  
  RETURN last_spin_time + INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE daily_wheel_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_wheel_spins ENABLE ROW LEVEL SECURITY;
