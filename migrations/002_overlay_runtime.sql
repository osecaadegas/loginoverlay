-- Consolidated migration: 002_overlay_runtime.sql
-- Generated from active source migrations retained after cleanup

-- ============================================================================
-- Source: 20260225_overlay_control_center.sql
-- ============================================================================
-- =====================================================
-- Overlay Control Center ÔÇö Database Schema
-- Supabase / PostgreSQL
-- =====================================================

-- 1. overlay_instances ÔÇö one row per user, stores unique overlay token
CREATE TABLE IF NOT EXISTS overlay_instances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overlay_token VARCHAR(64) NOT NULL UNIQUE,
  display_name  VARCHAR(100),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Index for fast token lookups (OBS overlay page)
CREATE INDEX IF NOT EXISTS idx_overlay_instances_token ON overlay_instances(overlay_token);
CREATE INDEX IF NOT EXISTS idx_overlay_instances_user  ON overlay_instances(user_id);

-- 2. overlay_themes ÔÇö per-user customization settings
CREATE TABLE IF NOT EXISTS overlay_themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  primary_color   VARCHAR(9) DEFAULT '#9346ff',
  secondary_color VARCHAR(9) DEFAULT '#1a1b2e',
  accent_color    VARCHAR(9) DEFAULT '#00e1ff',
  text_color      VARCHAR(9) DEFAULT '#ffffff',
  opacity         REAL DEFAULT 0.9,
  blur_intensity  REAL DEFAULT 12.0,
  shadow_strength REAL DEFAULT 0.5,
  glow_intensity  REAL DEFAULT 0.4,
  border_radius   INTEGER DEFAULT 12,
  bg_texture      VARCHAR(40) DEFAULT 'none',
  style_preset    VARCHAR(20) DEFAULT 'glass',
  font_family     VARCHAR(60) DEFAULT 'Inter',
  font_weight     INTEGER DEFAULT 500,
  animation_speed REAL DEFAULT 1.0,
  custom_css      TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. overlay_widgets ÔÇö modular widget rows
CREATE TABLE IF NOT EXISTS overlay_widgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type     VARCHAR(40) NOT NULL,
  label           VARCHAR(80) DEFAULT '',
  is_visible      BOOLEAN DEFAULT true,
  position_x      REAL DEFAULT 0,
  position_y      REAL DEFAULT 0,
  width           REAL DEFAULT 400,
  height          REAL DEFAULT 300,
  z_index         INTEGER DEFAULT 1,
  config          JSONB DEFAULT '{}',
  animation       VARCHAR(30) DEFAULT 'fade',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overlay_widgets_user ON overlay_widgets(user_id);

-- 4. overlay_state ÔÇö ephemeral real-time state (what the overlay currently shows)
CREATE TABLE IF NOT EXISTS overlay_state (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  state       JSONB DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE overlay_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_themes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_widgets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_state     ENABLE ROW LEVEL SECURITY;

-- overlay_instances: owner can CRUD, anyone can SELECT by token (for OBS)
CREATE POLICY "Users manage own instance"
  ON overlay_instances FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public read by token"
  ON overlay_instances FOR SELECT
  USING (true);

-- overlay_themes: owner only
CREATE POLICY "Users manage own theme"
  ON overlay_themes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public read themes by overlay join"
  ON overlay_themes FOR SELECT
  USING (true);

-- overlay_widgets: owner manages, public reads for rendering
CREATE POLICY "Users manage own widgets"
  ON overlay_widgets FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public read widgets"
  ON overlay_widgets FOR SELECT
  USING (true);

-- overlay_state: owner manages, public reads for overlay rendering
CREATE POLICY "Users manage own state"
  ON overlay_state FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public read state"
  ON overlay_state FOR SELECT
  USING (true);

-- =====================================================
-- Realtime ÔÇö enable for overlay_state + overlay_widgets
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE overlay_state;
ALTER PUBLICATION supabase_realtime ADD TABLE overlay_widgets;
ALTER PUBLICATION supabase_realtime ADD TABLE overlay_themes;

-- =====================================================
-- Helper function to auto-create overlay instance on signup
-- =====================================================
CREATE OR REPLACE FUNCTION generate_overlay_token()
RETURNS TEXT AS $$
  SELECT encode(gen_random_bytes(24), 'hex');
$$ LANGUAGE sql;

-- ============================================================================
-- Source: create_user_overlay_system.sql
-- ============================================================================
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

-- ============================================================================
-- Source: add_canvas_resolution.sql
-- ============================================================================
-- Add canvas resolution columns to overlay_themes
ALTER TABLE overlay_themes
  ADD COLUMN IF NOT EXISTS canvas_width  INTEGER DEFAULT 1920,
  ADD COLUMN IF NOT EXISTS canvas_height INTEGER DEFAULT 1080;

-- ============================================================================
-- Source: add_metal_color_to_themes.sql
-- ============================================================================
-- Add metal_color preset name to overlay_themes (e.g. 'cobalt', 'chrome', 'gold')
ALTER TABLE overlay_themes
  ADD COLUMN IF NOT EXISTS metal_color VARCHAR(20) DEFAULT 'chrome';

-- ============================================================================
-- Source: add_shared_overlay_presets.sql
-- ============================================================================
-- ============================================================
-- Shared Overlay Presets  ÔÇô available to ALL authenticated users
-- Only admins can insert / update / delete
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_overlay_presets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  snapshot    JSONB NOT NULL,         -- same format as globalPresets snapshot
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Everyone can read shared presets
ALTER TABLE shared_overlay_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared presets"
  ON shared_overlay_presets FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert shared presets"
  ON shared_overlay_presets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update shared presets"
  ON shared_overlay_presets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete shared presets"
  ON shared_overlay_presets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
    )
  );
