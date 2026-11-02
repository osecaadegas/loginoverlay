BEGIN;

-- Keep the existing broadcaster-wide advisory lock and reservation flow. A
-- viewer's fourth active choice is rejected in the same transaction that
-- reserves a slot, before any external points operation can begin.
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
  IF (SELECT count(*) FROM public.slot_requests WHERE user_id = p_user_id
    AND status IN ('pending','charging','charge_unknown')
    AND (lower(requested_by) = lower(p_viewer)
      OR (nullif(p_viewer_id, '') IS NOT NULL AND requester_twitch_id = p_viewer_id))) >= 3 THEN
    RETURN jsonb_build_object('result','viewer_limit','limit',3);
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
