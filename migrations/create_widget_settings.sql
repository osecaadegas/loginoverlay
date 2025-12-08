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

-- Create spotify_connections table for Spotify OAuth
CREATE TABLE IF NOT EXISTS spotify_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own widget settings" ON widget_settings;
DROP POLICY IF EXISTS "Users can insert their own widget settings" ON widget_settings;
DROP POLICY IF EXISTS "Users can update their own widget settings" ON widget_settings;
DROP POLICY IF EXISTS "Users can delete their own widget settings" ON widget_settings;
DROP POLICY IF EXISTS "Anyone can view widget settings for display" ON widget_settings;
DROP POLICY IF EXISTS "Users can view their own Spotify connection" ON spotify_connections;
DROP POLICY IF EXISTS "Users can insert their own Spotify connection" ON spotify_connections;
DROP POLICY IF EXISTS "Users can update their own Spotify connection" ON spotify_connections;
DROP POLICY IF EXISTS "Users can delete their own Spotify connection" ON spotify_connections;

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

-- RLS Policies for spotify_connections
CREATE POLICY "Users can view their own Spotify connection"
  ON spotify_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Spotify connection"
  ON spotify_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Spotify connection"
  ON spotify_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Spotify connection"
  ON spotify_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_widget_settings_user_id ON widget_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_settings_widget_type ON widget_settings(widget_type);
CREATE INDEX IF NOT EXISTS idx_spotify_connections_user_id ON spotify_connections(user_id);

-- Add comments
COMMENT ON TABLE widget_settings IS 'Stores user-specific widget configurations for OBS overlays';
COMMENT ON TABLE spotify_connections IS 'Stores Spotify OAuth tokens for currently playing track widgets';
