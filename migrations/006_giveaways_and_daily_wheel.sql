-- Consolidated migration: 006_giveaways_and_daily_wheel.sql
-- Generated from active source migrations retained after cleanup

-- ============================================================================
-- Source: create_giveaways.sql
-- ============================================================================
-- Create giveaways table
CREATE TABLE IF NOT EXISTS giveaways (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    ticket_cost INTEGER DEFAULT 0,
    allow_multiple_tickets BOOLEAN DEFAULT false,
    max_winners INTEGER DEFAULT 1,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    winners_drawn BOOLEAN DEFAULT false,
    drawn_at TIMESTAMP WITH TIME ZONE
);

-- Create giveaway entries table
CREATE TABLE IF NOT EXISTS giveaway_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    giveaway_id UUID REFERENCES giveaways(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    tickets_count INTEGER DEFAULT 1,
    total_cost INTEGER DEFAULT 0,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(giveaway_id, user_id)
);

-- Create giveaway winners table
CREATE TABLE IF NOT EXISTS giveaway_winners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    giveaway_id UUID REFERENCES giveaways(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_winners ENABLE ROW LEVEL SECURITY;

-- Policies for giveaways
CREATE POLICY "Anyone can view active giveaways"
    ON giveaways FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage giveaways"
    ON giveaways FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policies for giveaway_entries
CREATE POLICY "Users can view all entries"
    ON giveaway_entries FOR SELECT
    USING (true);

CREATE POLICY "Users can create their own entries"
    ON giveaway_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
    ON giveaway_entries FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for giveaway_winners
CREATE POLICY "Anyone can view winners"
    ON giveaway_winners FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage winners"
    ON giveaway_winners FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Create indexes
CREATE INDEX idx_giveaways_active ON giveaways(is_active, ends_at);
CREATE INDEX idx_giveaway_entries_giveaway ON giveaway_entries(giveaway_id);
CREATE INDEX idx_giveaway_entries_user ON giveaway_entries(user_id);
CREATE INDEX idx_giveaway_winners_giveaway ON giveaway_winners(giveaway_id);

-- ============================================================================
-- Source: ensure_user_profiles_for_giveaway_entries.sql
-- ============================================================================
-- Ensure all users who entered giveaways have a user_profiles record with twitch_username
INSERT INTO user_profiles (user_id, twitch_username, created_at, updated_at)
SELECT DISTINCT 
  ge.user_id,
  au.raw_user_meta_data->>'twitch_username' as twitch_username,
  NOW(),
  NOW()
FROM giveaway_entries ge
JOIN auth.users au ON au.id = ge.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = ge.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Also ensure for giveaway winners
INSERT INTO user_profiles (user_id, twitch_username, created_at, updated_at)
SELECT DISTINCT 
  gw.user_id,
  au.raw_user_meta_data->>'twitch_username' as twitch_username,
  NOW(),
  NOW()
FROM giveaway_winners gw
JOIN auth.users au ON au.id = gw.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = gw.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- Source: fix_giveaways_rls_policy.sql
-- ============================================================================
-- ============================================================
-- Fix Giveaways RLS Policy
-- ============================================================
-- Issue: Current policy only shows active giveaways
-- Fix: Allow viewing recently ended giveaways (last 7 days) with winners
-- ============================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view active giveaways" ON giveaways;

-- Create new policy that allows viewing:
-- 1. Admins/Moderators can see ALL giveaways (for creator panel)
-- 2. Regular users can see active giveaways
-- 3. Regular users can see recently ended giveaways (last 7 days) with winners
CREATE POLICY "Anyone can view active or recent giveaways"
    ON giveaways FOR SELECT
    USING (
        -- Admins and moderators can see everything
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
            AND is_active = true
        )
        OR
        -- Regular users can see active giveaways
        is_active = true 
        OR 
        -- Regular users can see recently ended giveaways with winners
        (
            winners_drawn = true 
            AND ends_at >= NOW() - INTERVAL '7 days'
        )
    );

-- ============================================================
-- Verification Query
-- ============================================================
-- Run this to verify the fix:
-- SELECT 
--   id,
--   title,
--   is_active,
--   winners_drawn,
--   ends_at,
--   CASE 
--     WHEN is_active THEN 'Active'
--     WHEN winners_drawn AND ends_at >= NOW() - INTERVAL '7 days' THEN 'Recent Winner'
--     ELSE 'Hidden'
--   END as visibility_status
-- FROM giveaways
-- ORDER BY created_at DESC;

-- ============================================================================
-- Source: create_daily_wheel_system.sql
-- ============================================================================
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

-- ============================================================================
-- Source: fix_daily_wheel_spins_policy.sql
-- ============================================================================
-- Allow all authenticated users to view recent spins (for the leaderboard/recent spins display)
-- This enables the "Recent Spins" feature to show other players' wins

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view their own spins" ON daily_wheel_spins;

-- Create a more permissive policy - all authenticated users can view all spins
CREATE POLICY "Authenticated users can view all spins"
  ON daily_wheel_spins FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: Insert and Update policies remain restricted to own user
