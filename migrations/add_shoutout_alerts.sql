-- ============================================================
-- Raid Shoutout Alerts System
-- Stores triggered shoutout alerts with raider info + clip data.
-- The overlay widget subscribes to this table via Supabase Realtime.
-- ============================================================

-- 1. Create the shoutout_alerts table
CREATE TABLE IF NOT EXISTS shoutout_alerts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Raider info (from Twitch API)
  raider_username     TEXT NOT NULL,
  raider_display_name TEXT,
  raider_avatar_url   TEXT,
  raider_game         TEXT,           -- last game the raider was streaming

  -- Clip info (from Twitch API /helix/clips)
  clip_id             TEXT,
  clip_url            TEXT,
  clip_embed_url      TEXT,
  clip_thumbnail_url  TEXT,
  clip_title          TEXT,
  clip_duration       REAL,           -- seconds
  clip_view_count     INTEGER,
  clip_game_name      TEXT,

  -- Alert lifecycle
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | shown | dismissed
  triggered_by  TEXT DEFAULT 'manual',             -- manual | chat_command | auto_raid
  shown_at      TIMESTAMPTZ,
  dismissed_at  TIMESTAMPTZ,

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for fast lookups by user + status
CREATE INDEX IF NOT EXISTS idx_shoutout_alerts_user_status
  ON shoutout_alerts (user_id, status, created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE shoutout_alerts ENABLE ROW LEVEL SECURITY;

-- Users can read their own alerts
CREATE POLICY "Users can read own shoutout alerts"
  ON shoutout_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update (API endpoints use service role)
CREATE POLICY "Service role full access on shoutout alerts"
  ON shoutout_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Enable Realtime for this table (required for live overlay updates)
ALTER PUBLICATION supabase_realtime ADD TABLE shoutout_alerts;

-- 5. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shoutout_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shoutout_alerts_updated_at
  BEFORE UPDATE ON shoutout_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_shoutout_alerts_updated_at();
