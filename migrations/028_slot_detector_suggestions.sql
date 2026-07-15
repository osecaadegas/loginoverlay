-- Slot Detector suggestions
-- Adds dismissible, panel-aware suggestion metadata for matched detector events.

ALTER TABLE public.slot_detection_events
  ADD COLUMN IF NOT EXISTS device_panel_id TEXT;

ALTER TABLE public.slot_detection_events
  ADD COLUMN IF NOT EXISTS suggestion_dismissed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_slot_detection_events_suggestions
  ON public.slot_detection_events(user_id, received_at DESC)
  WHERE slot_id IS NOT NULL
    AND suggestion_dismissed_at IS NULL
    AND live_update_applied = false;
