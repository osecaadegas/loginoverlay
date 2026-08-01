-- Prevent the same Twitch !so message from creating multiple alerts when a
-- streamer has more than one OBS browser source connected.

ALTER TABLE public.shoutout_alerts
  ADD COLUMN IF NOT EXISTS source_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shoutout_alerts_user_source_event
  ON public.shoutout_alerts (user_id, source_event_id)
  WHERE source_event_id IS NOT NULL;