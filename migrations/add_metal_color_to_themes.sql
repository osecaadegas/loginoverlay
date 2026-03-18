-- Add metal_color preset name to overlay_themes (e.g. 'cobalt', 'chrome', 'gold')
ALTER TABLE overlay_themes
  ADD COLUMN IF NOT EXISTS metal_color VARCHAR(20) DEFAULT 'chrome';
