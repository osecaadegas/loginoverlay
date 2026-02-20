-- StreamElements Integration Database Setup

-- Table: user_roles (if not exists)
-- Required for admin/moderator checks in RLS policies
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  access_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  moderator_permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Table: streamelements_connections
-- Stores user's StreamElements account connections
CREATE TABLE IF NOT EXISTS streamelements_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  se_channel_id TEXT NOT NULL,
  se_jwt_token TEXT NOT NULL,
  se_username TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table: redemption_items
-- Admin-configurable items users can redeem with points
CREATE TABLE IF NOT EXISTS redemption_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  point_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'premium_role', 'premium_duration', 'custom'
  reward_value JSONB, -- e.g., {"duration_days": 30} or {"role": "premium"}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: point_redemptions
-- Track all point redemptions
CREATE TABLE IF NOT EXISTS point_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL REFERENCES redemption_items(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE streamelements_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for streamelements_connections
CREATE POLICY "Users can view their own SE connection"
  ON streamelements_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SE connection"
  ON streamelements_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SE connection"
  ON streamelements_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SE connection"
  ON streamelements_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for redemption_items (everyone can view active items)
CREATE POLICY "Anyone can view active redemption items"
  ON redemption_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage redemption items"
  ON redemption_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- RLS Policies for point_redemptions
CREATE POLICY "Anyone can view all redemptions"
  ON point_redemptions FOR SELECT
  USING (true);

CREATE POLICY "Users can create redemptions"
  ON point_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update redemptions"
  ON point_redemptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_active = true
    )
  );

-- Function to auto-process premium role redemptions
CREATE OR REPLACE FUNCTION process_premium_redemption()
RETURNS TRIGGER AS $$
DECLARE
  reward_data JSONB;
  duration_days INTEGER;
BEGIN
  -- Get the reward details
  SELECT reward_type, reward_value INTO NEW.redemption_id, reward_data
  FROM redemption_items
  WHERE id = NEW.redemption_id;

  -- If it's a premium role redemption, auto-apply it
  IF reward_data->>'reward_type' = 'premium_role' OR reward_data->>'reward_type' = 'premium_duration' THEN
    duration_days := COALESCE((reward_data->>'duration_days')::INTEGER, 30);
    
    -- Update user role to premium with expiration
    UPDATE user_roles
    SET 
      role = 'premium',
      premium_until = NOW() + (duration_days || ' days')::INTERVAL,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Mark redemption as processed
    NEW.processed := true;
    NEW.processed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-process redemptions
CREATE TRIGGER auto_process_redemption
  BEFORE INSERT ON point_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION process_premium_redemption();

-- Insert some default redemption items
INSERT INTO redemption_items (name, description, point_cost, reward_type, reward_value) VALUES
  ('Premium Access (7 Days)', 'Get premium features for 7 days', 5000, 'premium_duration', '{"duration_days": 7, "reward_type": "premium_duration"}'),
  ('Premium Access (30 Days)', 'Get premium features for 30 days', 15000, 'premium_duration', '{"duration_days": 30, "reward_type": "premium_duration"}'),
  ('Premium Access (90 Days)', 'Get premium features for 90 days', 40000, 'premium_duration', '{"duration_days": 90, "reward_type": "premium_duration"}')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_se_connections_user_id ON streamelements_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON point_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_processed ON point_redemptions(processed, redeemed_at);
