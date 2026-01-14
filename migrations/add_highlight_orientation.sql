-- Add orientation column to stream_highlights for portrait/landscape tracking
ALTER TABLE stream_highlights 
ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT 'portrait' CHECK (orientation IN ('portrait', 'landscape'));

-- Add comment
COMMENT ON COLUMN stream_highlights.orientation IS 'Video orientation: portrait (9:16) or landscape (16:9)';
