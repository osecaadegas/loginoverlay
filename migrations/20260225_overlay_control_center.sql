-- =====================================================
-- Overlay Control Center — Database Schema
-- Supabase / PostgreSQL
-- =====================================================

-- 1. overlay_instances — one row per user, stores unique overlay token
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

-- 2. overlay_themes — per-user customization settings
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

-- 3. overlay_widgets — modular widget rows
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

-- 4. overlay_state — ephemeral real-time state (what the overlay currently shows)
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
-- Realtime — enable for overlay_state + overlay_widgets
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
