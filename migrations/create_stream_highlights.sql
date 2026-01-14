-- Create stream_highlights table
CREATE TABLE IF NOT EXISTS stream_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration VARCHAR(10), -- e.g., "0:30", "1:00"
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE stream_highlights ENABLE ROW LEVEL SECURITY;

-- Allow public to read active highlights
CREATE POLICY "Anyone can view active highlights"
  ON stream_highlights
  FOR SELECT
  USING (is_active = true);

-- Admin can manage all highlights
CREATE POLICY "Admins can manage highlights"
  ON stream_highlights
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'owner')
      AND user_roles.is_active = true
    )
  );

-- Create index for performance
CREATE INDEX idx_stream_highlights_active ON stream_highlights(is_active, created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_stream_highlights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stream_highlights_updated_at
  BEFORE UPDATE ON stream_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_stream_highlights_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_highlight_views(highlight_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE stream_highlights
  SET view_count = view_count + 1
  WHERE id = highlight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
