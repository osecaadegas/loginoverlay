-- Create table for user overlay state (bonus hunt, widgets, customization)
CREATE TABLE IF NOT EXISTS user_overlay_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bonus Hunt State
  bonuses JSONB DEFAULT '[]'::jsonb,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  total_payout DECIMAL(10, 2) DEFAULT 0,
  hunt_multiplier DECIMAL(10, 2) DEFAULT 0,
  hunt_started BOOLEAN DEFAULT false,
  current_opening_bonus JSONB,
  
  -- Customization
  theme VARCHAR(100) DEFAULT 'cyberpunk',
  layout_mode VARCHAR(50) DEFAULT 'modern',
  custom_slot_images JSONB DEFAULT '{}'::jsonb,
  
  -- Widget Visibility & Positions
  show_bh_stats BOOLEAN DEFAULT true,
  show_bh_cards BOOLEAN DEFAULT true,
  show_spotify BOOLEAN DEFAULT false,
  show_twitch_chat BOOLEAN DEFAULT false,
  
  spotify_position JSONB DEFAULT '{"x": 20, "y": 20}'::jsonb,
  twitch_chat_settings JSONB DEFAULT '{"position": "bottom-right", "width": 350, "height": 500}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create table for user tournaments
CREATE TABLE IF NOT EXISTS user_tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  tournament_size INTEGER DEFAULT 8,
  tournament_format VARCHAR(50) DEFAULT 'single-elimination',
  participants JSONB DEFAULT '[]'::jsonb,
  matches JSONB DEFAULT '[]'::jsonb,
  current_round VARCHAR(50),
  current_match_index INTEGER DEFAULT 0,
  tournament_started BOOLEAN DEFAULT false,
  winner JSONB,
  show_setup BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create table for user giveaways
CREATE TABLE IF NOT EXISTS user_giveaways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  giveaway_active BOOLEAN DEFAULT false,
  giveaway_type VARCHAR(50), -- 'raffle' or 'instant'
  giveaway_title VARCHAR(255),
  giveaway_prize VARCHAR(255),
  giveaway_entries JSONB DEFAULT '[]'::jsonb,
  giveaway_winner JSONB,
  giveaway_timer INTEGER,
  giveaway_entry_command VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create table for random slot picker state
CREATE TABLE IF NOT EXISTS user_random_slot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  current_slot JSONB,
  is_spinning BOOLEAN DEFAULT false,
  selected_providers JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_overlay_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_random_slot ENABLE ROW LEVEL SECURITY;

-- Policies for user_overlay_state
CREATE POLICY "Users can view their own overlay state"
  ON user_overlay_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own overlay state"
  ON user_overlay_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overlay state"
  ON user_overlay_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overlay state"
  ON user_overlay_state FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for user_tournaments
CREATE POLICY "Users can view their own tournaments"
  ON user_tournaments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tournaments"
  ON user_tournaments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tournaments"
  ON user_tournaments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tournaments"
  ON user_tournaments FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for user_giveaways
CREATE POLICY "Users can view their own giveaways"
  ON user_giveaways FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own giveaways"
  ON user_giveaways FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own giveaways"
  ON user_giveaways FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own giveaways"
  ON user_giveaways FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for user_random_slot
CREATE POLICY "Users can view their own random slot state"
  ON user_random_slot FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own random slot state"
  ON user_random_slot FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own random slot state"
  ON user_random_slot FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own random slot state"
  ON user_random_slot FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_overlay_state_updated_at BEFORE UPDATE ON user_overlay_state
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_tournaments_updated_at BEFORE UPDATE ON user_tournaments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_giveaways_updated_at BEFORE UPDATE ON user_giveaways
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_random_slot_updated_at BEFORE UPDATE ON user_random_slot
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_user_overlay_state_user_id ON user_overlay_state(user_id);
CREATE INDEX idx_user_tournaments_user_id ON user_tournaments(user_id);
CREATE INDEX idx_user_giveaways_user_id ON user_giveaways(user_id);
CREATE INDEX idx_user_random_slot_user_id ON user_random_slot(user_id);
