-- Theme and Material Design System
-- Production-grade customization for all widgets
-- Real-time sync, GPU-safe, design-token based

-- Theme Presets Table
CREATE TABLE IF NOT EXISTS theme_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Global Color Tokens
  color_primary VARCHAR(50) DEFAULT '#667eea',
  color_secondary VARCHAR(50) DEFAULT '#764ba2',
  color_accent VARCHAR(50) DEFAULT '#00d4ff',
  color_surface VARCHAR(50) DEFAULT 'rgba(30, 30, 40, 0.9)',
  color_text_primary VARCHAR(50) DEFAULT '#ffffff',
  color_text_secondary VARCHAR(50) DEFAULT 'rgba(255, 255, 255, 0.7)',
  color_success VARCHAR(50) DEFAULT '#4caf50',
  color_danger VARCHAR(50) DEFAULT '#ff6b6b',
  color_warning VARCHAR(50) DEFAULT '#ffc107',
  color_glow VARCHAR(50) DEFAULT '#667eea',
  color_shadow VARCHAR(50) DEFAULT 'rgba(0, 0, 0, 0.5)',
  
  -- Typography Tokens
  font_family VARCHAR(200) DEFAULT '''Inter'', -apple-system, sans-serif',
  font_weight_normal INTEGER DEFAULT 400,
  font_weight_bold INTEGER DEFAULT 600,
  font_numeric VARCHAR(200) DEFAULT '''Roboto Mono'', ''Courier New'', monospace',
  letter_spacing VARCHAR(10) DEFAULT '0',
  
  -- Material Settings
  material_type VARCHAR(50) DEFAULT 'glass',
  material_intensity NUMERIC(3, 2) DEFAULT 1.0,
  
  -- Visual Effects
  border_radius INTEGER DEFAULT 12,
  glow_intensity NUMERIC(3, 2) DEFAULT 0.5,
  shadow_depth NUMERIC(3, 2) DEFAULT 1.0,
  backdrop_blur INTEGER DEFAULT 10,
  
  -- Animation Settings
  animation_intensity VARCHAR(20) DEFAULT 'standard', -- off, subtle, standard, impactful
  animation_duration INTEGER DEFAULT 300, -- milliseconds
  
  -- High Contrast Mode
  high_contrast BOOLEAN DEFAULT false,
  
  UNIQUE(name)
);

-- User Theme Customizations
CREATE TABLE IF NOT EXISTS user_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overlay_id UUID REFERENCES overlays(id) ON DELETE CASCADE,
  theme_preset_id UUID REFERENCES theme_presets(id) ON DELETE SET NULL,
  name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Custom Overrides (same structure as theme_presets)
  color_primary VARCHAR(50),
  color_secondary VARCHAR(50),
  color_accent VARCHAR(50),
  color_surface VARCHAR(50),
  color_text_primary VARCHAR(50),
  color_text_secondary VARCHAR(50),
  color_success VARCHAR(50),
  color_danger VARCHAR(50),
  color_warning VARCHAR(50),
  color_glow VARCHAR(50),
  color_shadow VARCHAR(50),
  
  font_family VARCHAR(200),
  font_weight_normal INTEGER,
  font_weight_bold INTEGER,
  font_numeric VARCHAR(200),
  letter_spacing VARCHAR(10),
  
  material_type VARCHAR(50),
  material_intensity NUMERIC(3, 2),
  
  border_radius INTEGER,
  glow_intensity NUMERIC(3, 2),
  shadow_depth NUMERIC(3, 2),
  backdrop_blur INTEGER,
  
  animation_intensity VARCHAR(20),
  animation_duration INTEGER,
  
  high_contrast BOOLEAN,
  
  UNIQUE(user_id, overlay_id)
);

-- Per-Widget Theme Overrides
CREATE TABLE IF NOT EXISTS widget_theme_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Override flags (NULL = inherit from global)
  override_color_primary VARCHAR(50),
  override_color_secondary VARCHAR(50),
  override_color_accent VARCHAR(50),
  override_color_surface VARCHAR(50),
  override_color_text_primary VARCHAR(50),
  override_color_text_secondary VARCHAR(50),
  override_color_glow VARCHAR(50),
  
  override_material_type VARCHAR(50),
  override_material_intensity NUMERIC(3, 2),
  
  override_border_radius INTEGER,
  override_glow_intensity NUMERIC(3, 2),
  override_shadow_depth NUMERIC(3, 2),
  override_opacity NUMERIC(3, 2),
  
  UNIQUE(widget_id)
);

-- Material Definitions (presets)
CREATE TABLE IF NOT EXISTS material_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_premium BOOLEAN DEFAULT false,
  
  -- CSS Properties (stored as JSON for flexibility)
  surface_style JSONB DEFAULT '{}'::jsonb,
  gradient_style JSONB DEFAULT '{}'::jsonb,
  shadow_style JSONB DEFAULT '{}'::jsonb,
  border_style JSONB DEFAULT '{}'::jsonb,
  glow_style JSONB DEFAULT '{}'::jsonb,
  
  preview_image VARCHAR(500),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_themes_user ON user_themes(user_id);
CREATE INDEX idx_user_themes_overlay ON user_themes(overlay_id);
CREATE INDEX idx_widget_overrides_widget ON widget_theme_overrides(widget_id);

-- RLS Policies
ALTER TABLE theme_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_theme_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_definitions ENABLE ROW LEVEL SECURITY;

-- Theme presets: public read, admin write
CREATE POLICY "Theme presets are viewable by everyone"
  ON theme_presets FOR SELECT
  USING (true);

-- User themes: users can CRUD their own
CREATE POLICY "Users can view their own themes"
  ON user_themes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own themes"
  ON user_themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes"
  ON user_themes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own themes"
  ON user_themes FOR DELETE
  USING (auth.uid() = user_id);

-- Widget overrides: users can CRUD their own widgets' overrides
CREATE POLICY "Users can view their widget overrides"
  ON widget_theme_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM widgets w
      JOIN overlays o ON w.overlay_id = o.id
      WHERE w.id = widget_theme_overrides.widget_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create widget overrides"
  ON widget_theme_overrides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widgets w
      JOIN overlays o ON w.overlay_id = o.id
      WHERE w.id = widget_theme_overrides.widget_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update widget overrides"
  ON widget_theme_overrides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM widgets w
      JOIN overlays o ON w.overlay_id = o.id
      WHERE w.id = widget_theme_overrides.widget_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete widget overrides"
  ON widget_theme_overrides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM widgets w
      JOIN overlays o ON w.overlay_id = o.id
      WHERE w.id = widget_theme_overrides.widget_id
        AND o.user_id = auth.uid()
    )
  );

-- Material definitions: public read
CREATE POLICY "Material definitions are viewable by everyone"
  ON material_definitions FOR SELECT
  USING (true);

-- Seed Default Theme Presets
INSERT INTO theme_presets (name, description, is_default, material_type, color_primary, color_secondary, color_accent)
VALUES
('Default Dark', 'Clean dark theme with purple gradient', true, 'glass', '#667eea', '#764ba2', '#00d4ff'),
('Neon Cyberpunk', 'High-glow neon aesthetic', false, 'neon', '#00ffff', '#ff00ff', '#ffff00'),
('Carbon Pro', 'Professional carbon fiber look', false, 'carbon', '#1a1a1a', '#2d2d2d', '#00d4ff'),
('Ice Glass', 'Frosted glass with cool tones', false, 'glass', '#3b82f6', '#60a5fa', '#93c5fd'),
('Gold Metallic', 'Luxurious brushed gold', false, 'metallic', '#fbbf24', '#f59e0b', '#fde047');

-- Seed Material Definitions
INSERT INTO material_definitions (name, display_name, description, surface_style, gradient_style, shadow_style, border_style, glow_style)
VALUES
('matte', 'Matte', 'Flat surface with soft shadows', 
  '{"background": "var(--surface-color)", "boxShadow": "0 2px 8px var(--shadow-color)"}',
  '{"background": "linear-gradient(135deg, var(--primary), var(--secondary))"}',
  '{"boxShadow": "0 4px 12px var(--shadow-color)"}',
  '{"border": "1px solid rgba(255,255,255,0.1)"}',
  '{"boxShadow": "0 0 20px var(--glow-color)"}'),

('metallic', 'Metallic', 'Brushed metal with highlights',
  '{"background": "linear-gradient(135deg, var(--primary), var(--secondary))", "boxShadow": "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.3)"}',
  '{"background": "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 50%, var(--primary) 100%)"}',
  '{"boxShadow": "0 8px 24px var(--shadow-color), inset 0 1px 0 rgba(255,255,255,0.1)"}',
  '{"border": "1px solid rgba(255,255,255,0.2)", "borderBottom": "2px solid rgba(0,0,0,0.3)"}',
  '{"boxShadow": "0 0 30px var(--glow-color), inset 0 0 10px rgba(255,255,255,0.1)"}'),

('anodized', 'Anodized', 'Colored aluminum finish',
  '{"background": "linear-gradient(180deg, var(--primary), var(--secondary))", "boxShadow": "inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)"}',
  '{"background": "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)"}',
  '{"boxShadow": "0 6px 20px var(--shadow-color), inset 0 1px 2px rgba(255,255,255,0.2)"}',
  '{"border": "1px solid rgba(255,255,255,0.3)"}',
  '{"boxShadow": "0 0 25px var(--glow-color), inset 0 0 8px rgba(255,255,255,0.2)"}'),

('glass', 'Glass', 'Frosted glass with blur',
  '{"background": "var(--surface-color)", "backdropFilter": "blur(var(--backdrop-blur)px)", "boxShadow": "0 4px 16px var(--shadow-color), inset 0 0 0 1px rgba(255,255,255,0.1)"}',
  '{"background": "linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--secondary-rgb), 0.1))"}',
  '{"boxShadow": "0 8px 32px var(--shadow-color), inset 0 0 0 1px rgba(255,255,255,0.15)"}',
  '{"border": "1px solid rgba(255,255,255,0.15)"}',
  '{"boxShadow": "0 0 40px var(--glow-color), inset 0 0 20px rgba(255,255,255,0.05)"}'),

('carbon', 'Carbon Fiber', 'Technical carbon pattern',
  '{"background": "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(255,255,255,0.05) 100%), linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)", "backgroundSize": "4px 4px, 100% 100%"}',
  '{"background": "radial-gradient(circle at 20% 50%, rgba(var(--primary-rgb),0.1) 0%, transparent 50%), linear-gradient(135deg, var(--primary), var(--secondary))"}',
  '{"boxShadow": "0 4px 16px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)"}',
  '{"border": "1px solid rgba(255,255,255,0.1)", "borderTop": "1px solid rgba(255,255,255,0.15)"}',
  '{"boxShadow": "0 0 30px var(--glow-color), inset 0 0 10px rgba(var(--glow-rgb),0.2)"}'),

('neon', 'Neon', 'High-glow emissive look',
  '{"background": "rgba(var(--primary-rgb), 0.1)", "boxShadow": "0 0 40px var(--glow-color), inset 0 0 20px rgba(var(--primary-rgb), 0.2)"}',
  '{"background": "linear-gradient(135deg, rgba(var(--primary-rgb), 0.3), rgba(var(--secondary-rgb), 0.3))"}',
  '{"boxShadow": "0 0 60px var(--glow-color), 0 0 30px var(--primary), inset 0 0 20px rgba(var(--glow-rgb), 0.3)"}',
  '{"border": "2px solid var(--glow-color)", "boxShadow": "0 0 20px var(--glow-color), inset 0 0 10px var(--glow-color)"}',
  '{"boxShadow": "0 0 80px var(--glow-color), 0 0 40px var(--primary), inset 0 0 30px rgba(var(--glow-rgb), 0.5)"}');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_user_themes_updated_at
    BEFORE UPDATE ON user_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_theme_overrides_updated_at
    BEFORE UPDATE ON widget_theme_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
