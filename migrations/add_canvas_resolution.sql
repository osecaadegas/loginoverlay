-- Add canvas resolution columns to overlay_themes
ALTER TABLE overlay_themes
  ADD COLUMN IF NOT EXISTS canvas_width  INTEGER DEFAULT 1920,
  ADD COLUMN IF NOT EXISTS canvas_height INTEGER DEFAULT 1080;
