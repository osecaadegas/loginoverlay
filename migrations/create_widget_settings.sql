-- Create widget_settings table for storing user widget configurations
CREATE TABLE IF NOT EXISTS widget_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, widget_type)
);

-- Enable RLS
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own widget settings"
  ON widget_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own widget settings"
  ON widget_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own widget settings"
  ON widget_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own widget settings"
  ON widget_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anyone to view widget settings for display (needed for OBS browser sources)
CREATE POLICY "Anyone can view widget settings for display"
  ON widget_settings FOR SELECT
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_widget_settings_user_id ON widget_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_settings_widget_type ON widget_settings(widget_type);

-- Add comment
COMMENT ON TABLE widget_settings IS 'Stores user-specific widget configurations for OBS overlays';
