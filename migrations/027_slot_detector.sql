-- Slot Detector MVP
-- Adds scoped device pairing, sanitized detection events, alias/game-code maps,
-- and the detected_slots bridge consumed by src/hooks/useOverlay.js.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.slot_detector_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.slot_detector_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_update_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_bonus_hunt_updates BOOLEAN NOT NULL DEFAULT false,
  default_target TEXT NOT NULL DEFAULT 'current_slot',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slot_detector_settings_target_check
    CHECK (default_target IN ('current_slot', 'single_slot', 'bonus_hunt'))
);

CREATE TABLE IF NOT EXISTS public.slot_detector_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL DEFAULT 'Browser extension',
  browser_name TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  token_version INTEGER NOT NULL DEFAULT 1,
  token_scopes TEXT[] NOT NULL DEFAULT ARRAY['slot:detect'],
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  last_seen_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.slot_detector_pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  device_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  consumed_by_device_id UUID REFERENCES public.slot_detector_devices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.slot_detector_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_normalized TEXT NOT NULL,
  provider_name TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  confidence_weight INTEGER NOT NULL DEFAULT 94,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slot_detector_alias_weight_check
    CHECK (confidence_weight BETWEEN 1 AND 100)
);

CREATE TABLE IF NOT EXISTS public.slot_detector_provider_game_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  domain TEXT,
  game_code TEXT NOT NULL,
  game_code_normalized TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  confidence_weight INTEGER NOT NULL DEFAULT 98,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slot_detector_game_code_weight_check
    CHECK (confidence_weight BETWEEN 1 AND 100)
);

CREATE TABLE IF NOT EXISTS public.slot_detection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.slot_detector_devices(id) ON DELETE CASCADE,
  client_event_id TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  domain TEXT,
  path_pattern TEXT,
  safe_game_id TEXT,
  device_panel_id TEXT,
  provider_hint TEXT,
  slot_hint TEXT,
  page_title_hint TEXT,
  iframe_supported BOOLEAN NOT NULL DEFAULT false,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  server_confidence INTEGER NOT NULL DEFAULT 0,
  match_status TEXT NOT NULL DEFAULT 'unmatched',
  match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  target TEXT NOT NULL DEFAULT 'current_slot',
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  slot_name TEXT,
  provider_name TEXT,
  stale_rejected BOOLEAN NOT NULL DEFAULT false,
  duplicate_rejected BOOLEAN NOT NULL DEFAULT false,
  live_update_applied BOOLEAN NOT NULL DEFAULT false,
  suggestion_dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slot_detection_events_confidence_check
    CHECK (server_confidence BETWEEN 0 AND 100),
  CONSTRAINT slot_detection_events_status_check
    CHECK (match_status IN ('matched', 'low_confidence', 'unmatched', 'stale', 'duplicate', 'unsupported', 'confirmed')),
  CONSTRAINT slot_detection_events_target_check
    CHECK (target IN ('current_slot', 'single_slot', 'bonus_hunt'))
);

CREATE TABLE IF NOT EXISTS public.slot_detector_active_slots (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target TEXT NOT NULL DEFAULT 'current_slot',
  event_id UUID REFERENCES public.slot_detection_events(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.slot_detector_devices(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  slot_name TEXT NOT NULL,
  provider_name TEXT,
  image_url TEXT,
  server_confidence INTEGER NOT NULL DEFAULT 0,
  detected_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, target),
  CONSTRAINT slot_detector_active_target_check
    CHECK (target IN ('current_slot', 'single_slot', 'bonus_hunt')),
  CONSTRAINT slot_detector_active_confidence_check
    CHECK (server_confidence BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS public.detected_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  slot_name TEXT NOT NULL,
  provider TEXT,
  target TEXT NOT NULL DEFAULT 'current_slot',
  bet_size NUMERIC(14,2),
  last_win NUMERIC(14,2),
  source_event_id UUID REFERENCES public.slot_detection_events(id) ON DELETE SET NULL,
  detection_confidence INTEGER NOT NULL DEFAULT 0,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT detected_slots_target_check
    CHECK (target IN ('current_slot', 'single_slot', 'bonus_hunt')),
  CONSTRAINT detected_slots_confidence_check
    CHECK (detection_confidence BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_slot_detector_devices_user
  ON public.slot_detector_devices(user_id, is_revoked, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_slot_detector_pairing_user
  ON public.slot_detector_pairing_codes(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_slot_detector_pairing_expires
  ON public.slot_detector_pairing_codes(expires_at) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_slot_detector_alias_norm
  ON public.slot_detector_aliases(alias_normalized, provider_name);
CREATE INDEX IF NOT EXISTS idx_slot_detector_alias_user
  ON public.slot_detector_aliases(user_id, alias_normalized);
CREATE INDEX IF NOT EXISTS idx_slot_detector_game_code
  ON public.slot_detector_provider_game_codes(game_code_normalized, provider_key, domain);
CREATE INDEX IF NOT EXISTS idx_slot_detector_game_code_user
  ON public.slot_detector_provider_game_codes(user_id, game_code_normalized);
CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_detection_events_device_client
  ON public.slot_detection_events(device_id, client_event_id);
CREATE INDEX IF NOT EXISTS idx_slot_detection_events_user_time
  ON public.slot_detection_events(user_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_slot_detection_events_unmatched
  ON public.slot_detection_events(user_id, received_at DESC)
  WHERE match_status IN ('unmatched', 'low_confidence', 'unsupported');
CREATE INDEX IF NOT EXISTS idx_slot_detection_events_suggestions
  ON public.slot_detection_events(user_id, received_at DESC)
  WHERE slot_id IS NOT NULL
    AND suggestion_dismissed_at IS NULL
    AND live_update_applied = false;
CREATE INDEX IF NOT EXISTS idx_detected_slots_user_time
  ON public.detected_slots(user_id, detected_at DESC);

DROP TRIGGER IF EXISTS slot_detector_settings_updated_at ON public.slot_detector_settings;
CREATE TRIGGER slot_detector_settings_updated_at
  BEFORE UPDATE ON public.slot_detector_settings
  FOR EACH ROW EXECUTE FUNCTION public.slot_detector_set_updated_at();

DROP TRIGGER IF EXISTS slot_detector_devices_updated_at ON public.slot_detector_devices;
CREATE TRIGGER slot_detector_devices_updated_at
  BEFORE UPDATE ON public.slot_detector_devices
  FOR EACH ROW EXECUTE FUNCTION public.slot_detector_set_updated_at();

DROP TRIGGER IF EXISTS slot_detector_aliases_updated_at ON public.slot_detector_aliases;
CREATE TRIGGER slot_detector_aliases_updated_at
  BEFORE UPDATE ON public.slot_detector_aliases
  FOR EACH ROW EXECUTE FUNCTION public.slot_detector_set_updated_at();

DROP TRIGGER IF EXISTS slot_detector_provider_game_codes_updated_at ON public.slot_detector_provider_game_codes;
CREATE TRIGGER slot_detector_provider_game_codes_updated_at
  BEFORE UPDATE ON public.slot_detector_provider_game_codes
  FOR EACH ROW EXECUTE FUNCTION public.slot_detector_set_updated_at();

DROP TRIGGER IF EXISTS slot_detection_events_updated_at ON public.slot_detection_events;
CREATE TRIGGER slot_detection_events_updated_at
  BEFORE UPDATE ON public.slot_detection_events
  FOR EACH ROW EXECUTE FUNCTION public.slot_detector_set_updated_at();

DROP TRIGGER IF EXISTS detected_slots_updated_at ON public.detected_slots;
CREATE TRIGGER detected_slots_updated_at
  BEFORE UPDATE ON public.detected_slots
  FOR EACH ROW EXECUTE FUNCTION public.slot_detector_set_updated_at();

ALTER TABLE public.slot_detector_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_detector_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_detector_pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_detector_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_detector_provider_game_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_detection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_detector_active_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detected_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own detector settings" ON public.slot_detector_settings;
CREATE POLICY "Users manage own detector settings"
  ON public.slot_detector_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own detector devices" ON public.slot_detector_devices;
CREATE POLICY "Users read own detector devices"
  ON public.slot_detector_devices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own detector devices" ON public.slot_detector_devices;
CREATE POLICY "Users update own detector devices"
  ON public.slot_detector_devices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own detector devices" ON public.slot_detector_devices;
CREATE POLICY "Users delete own detector devices"
  ON public.slot_detector_devices FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own pairing codes" ON public.slot_detector_pairing_codes;
CREATE POLICY "Users read own pairing codes"
  ON public.slot_detector_pairing_codes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own pairing codes" ON public.slot_detector_pairing_codes;
CREATE POLICY "Users create own pairing codes"
  ON public.slot_detector_pairing_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own/global detector aliases" ON public.slot_detector_aliases;
CREATE POLICY "Users read own/global detector aliases"
  ON public.slot_detector_aliases FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own detector aliases" ON public.slot_detector_aliases;
CREATE POLICY "Users manage own detector aliases"
  ON public.slot_detector_aliases FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own/global provider codes" ON public.slot_detector_provider_game_codes;
CREATE POLICY "Users read own/global provider codes"
  ON public.slot_detector_provider_game_codes FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own provider codes" ON public.slot_detector_provider_game_codes;
CREATE POLICY "Users manage own provider codes"
  ON public.slot_detector_provider_game_codes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own detection events" ON public.slot_detection_events;
CREATE POLICY "Users read own detection events"
  ON public.slot_detection_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own active slot" ON public.slot_detector_active_slots;
CREATE POLICY "Users read own active slot"
  ON public.slot_detector_active_slots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own detected slots" ON public.detected_slots;
CREATE POLICY "Users read own detected slots"
  ON public.detected_slots FOR SELECT
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'detected_slots'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.detected_slots;
    END IF;
  END IF;
END $$;
