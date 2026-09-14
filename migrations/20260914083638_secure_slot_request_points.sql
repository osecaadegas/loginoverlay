BEGIN;

ALTER TABLE public.streamelements_connections
  ADD COLUMN IF NOT EXISTS verified_twitch_id TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Old copied connections stay intact for review, but cannot authorize new charges.
CREATE OR REPLACE FUNCTION public.guard_se_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.verified_twitch_id := NULL;
    NEW.verified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_se_verification ON public.streamelements_connections;
CREATE TRIGGER guard_se_verification BEFORE INSERT OR UPDATE ON public.streamelements_connections
  FOR EACH ROW EXECUTE FUNCTION public.guard_se_verification();
DO $$ BEGIN
  IF to_regprocedure('public.get_streamer_se_credentials()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_streamer_se_credentials() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

ALTER TABLE public.slot_requests
  ADD COLUMN IF NOT EXISTS points_cost INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charged_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS requester_twitch_id TEXT;
ALTER TABLE public.slot_requests DROP CONSTRAINT IF EXISTS chk_sr_status;
ALTER TABLE public.slot_requests ADD CONSTRAINT chk_sr_status CHECK (status IN
  ('pending','played','denied','refunding','refunded','cancelled','refund_failed','charging','charge_unknown','refund_unknown'));

-- Preserve reads/OBS output, but do not let browser writes forge charge/refund records.
REVOKE INSERT, DELETE, UPDATE ON public.slot_requests FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status) ON public.slot_requests TO authenticated;
GRANT ALL ON public.slot_requests TO service_role;
CREATE OR REPLACE FUNCTION public.guard_slot_request_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND
    (OLD.status <> 'pending' OR NEW.status NOT IN ('played','cancelled')) THEN
    RAISE EXCEPTION 'Use the authenticated slot request API for charge and refund operations' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_slot_request_transition ON public.slot_requests;
CREATE TRIGGER guard_slot_request_transition BEFORE UPDATE ON public.slot_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_slot_request_transition();

CREATE OR REPLACE FUNCTION public.reserve_slot_request(
  p_user_id UUID, p_slot_name TEXT, p_slot_image TEXT, p_viewer TEXT, p_viewer_id TEXT,
  p_message_id TEXT, p_cost INTEGER, p_channel_id TEXT, p_max_queue INTEGER, p_cooldown INTEGER
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_row public.slot_requests%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  IF p_cost < 0 OR p_max_queue < 1 OR p_cooldown < 0 OR length(p_message_id) NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION 'Invalid request reservation';
  END IF;
  SELECT * INTO v_row FROM public.slot_requests WHERE idempotency_key = p_user_id::text || ':' || p_message_id;
  IF FOUND THEN RETURN jsonb_build_object('result','replay','request',to_jsonb(v_row)); END IF;
  SELECT * INTO v_row FROM public.slot_requests WHERE user_id = p_user_id
    AND lower(slot_name) = lower(p_slot_name) AND status IN ('pending','charging','charge_unknown') LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('result','duplicate','request',to_jsonb(v_row)); END IF;
  IF EXISTS (SELECT 1 FROM public.slot_requests WHERE user_id = p_user_id AND lower(requested_by) = lower(p_viewer)
    AND status IN ('charging','charge_unknown','refunding','refund_unknown')) THEN
    RETURN jsonb_build_object('result','busy');
  END IF;
  IF (SELECT count(*) FROM public.slot_requests WHERE user_id = p_user_id AND status IN ('pending','charging','charge_unknown')) >= p_max_queue THEN
    RETURN jsonb_build_object('result','full');
  END IF;
  IF p_cooldown > 0 AND EXISTS (SELECT 1 FROM public.slot_requests WHERE user_id = p_user_id
    AND lower(requested_by) = lower(p_viewer) AND created_at > now() - make_interval(secs => p_cooldown)) THEN
    RETURN jsonb_build_object('result','cooldown');
  END IF;
  INSERT INTO public.slot_requests(user_id,slot_name,slot_image,requested_by,requester_twitch_id,
    idempotency_key,points_cost,charged_channel_id,status)
    VALUES(p_user_id,p_slot_name,p_slot_image,lower(p_viewer),p_viewer_id,p_user_id::text || ':' || p_message_id,
      p_cost,p_channel_id,CASE WHEN p_cost > 0 THEN 'charging' ELSE 'pending' END) RETURNING * INTO v_row;
  RETURN jsonb_build_object('result','reserved','request',to_jsonb(v_row));
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_slot_request(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,INTEGER,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_slot_request(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,INTEGER,INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
