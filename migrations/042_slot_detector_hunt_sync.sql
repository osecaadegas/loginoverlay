-- Track Slot Detector API fan-out into GTB sessions and Player Bonus Hunt rows.
-- Nullable columns keep existing manual rows unchanged while making detector
-- events idempotent when a browser or API client retries the same event.

ALTER TABLE IF EXISTS public.guess_balance_slots
  ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES public.slot_detection_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guess_balance_slots_source_event
  ON public.guess_balance_slots(session_id, source_event_id)
  WHERE source_event_id IS NOT NULL;

ALTER TABLE IF EXISTS public.player_hunt_bonuses
  ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES public.slot_detection_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_hunt_bonuses_source_event
  ON public.player_hunt_bonuses(hunt_id, source_event_id)
  WHERE source_event_id IS NOT NULL;
