-- Track Slot Detector API fan-out into GTB sessions and Player Bonus Hunt rows.
-- Nullable columns keep existing manual rows unchanged while making detector
-- events idempotent when a browser or API client retries the same event.
--
-- Some deployments do not have the older GTB or Player Bonus Hunt tables yet.
-- Keep this migration safe to run there; apply the base feature migrations and
-- rerun this file later if those optional sync destinations are added.

DO $$
BEGIN
  IF to_regclass('public.guess_balance_slots') IS NOT NULL THEN
    IF to_regclass('public.slot_detection_events') IS NOT NULL THEN
      ALTER TABLE public.guess_balance_slots
        ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES public.slot_detection_events(id) ON DELETE SET NULL;
    ELSE
      ALTER TABLE public.guess_balance_slots
        ADD COLUMN IF NOT EXISTS source_event_id UUID;
    END IF;

    ALTER TABLE public.guess_balance_slots
      ADD COLUMN IF NOT EXISTS source TEXT;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_guess_balance_slots_source_event
      ON public.guess_balance_slots(session_id, source_event_id)
      WHERE source_event_id IS NOT NULL;
  END IF;

  IF to_regclass('public.player_hunt_bonuses') IS NOT NULL THEN
    IF to_regclass('public.slot_detection_events') IS NOT NULL THEN
      ALTER TABLE public.player_hunt_bonuses
        ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES public.slot_detection_events(id) ON DELETE SET NULL;
    ELSE
      ALTER TABLE public.player_hunt_bonuses
        ADD COLUMN IF NOT EXISTS source_event_id UUID;
    END IF;

    ALTER TABLE public.player_hunt_bonuses
      ADD COLUMN IF NOT EXISTS source TEXT;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_player_hunt_bonuses_source_event
      ON public.player_hunt_bonuses(hunt_id, source_event_id)
      WHERE source_event_id IS NOT NULL;
  END IF;
END $$;
