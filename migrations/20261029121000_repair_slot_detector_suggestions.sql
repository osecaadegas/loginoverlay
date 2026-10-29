-- Production repair for projects whose slot detector predates migrations 027/028.
-- Preserve all existing events and tenant-scoped RLS policies.
ALTER TABLE public.slot_detection_events
  ADD COLUMN IF NOT EXISTS device_panel_id text;

ALTER TABLE public.slot_detection_events
  ADD COLUMN IF NOT EXISTS suggestion_dismissed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_slot_detection_events_suggestions
  ON public.slot_detection_events (user_id, received_at DESC)
  WHERE slot_id IS NOT NULL
    AND suggestion_dismissed_at IS NULL
    AND live_update_applied = false;

NOTIFY pgrst, 'reload schema';
