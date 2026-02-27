-- Add direct .mp4 video URL column to shoutout_alerts
-- This is resolved server-side by the API via HEAD request to bypass CORS
ALTER TABLE shoutout_alerts ADD COLUMN IF NOT EXISTS clip_video_url TEXT;
