-- Active turns last 60 seconds. Browser sources only wake the server; this
-- function atomically decides whether a reminder or timeout is actually due.

ALTER TABLE public.connect_four_matches
  ADD COLUMN IF NOT EXISTS turn_reminder_sent_at timestamptz;

ALTER TABLE public.connect_four_public_state
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.connect_four_matches
  DROP CONSTRAINT IF EXISTS connect_four_matches_completion_reason_check;

ALTER TABLE public.connect_four_matches
  ADD CONSTRAINT connect_four_matches_completion_reason_check
  CHECK (completion_reason IS NULL OR completion_reason IN ('win', 'draw', 'reset', 'funding_failed', 'timeout'));

CREATE OR REPLACE FUNCTION public.connect_four_set_turn_deadline()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'active'
     AND (
       OLD.status IS DISTINCT FROM 'active'
       OR OLD.current_player IS DISTINCT FROM NEW.current_player
       OR OLD.move_count IS DISTINCT FROM NEW.move_count
     ) THEN
    NEW.expires_at := now() + interval '60 seconds';
    NEW.turn_reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connect_four_set_turn_deadline ON public.connect_four_matches;
CREATE TRIGGER connect_four_set_turn_deadline
  BEFORE UPDATE ON public.connect_four_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.connect_four_set_turn_deadline();

CREATE OR REPLACE FUNCTION public.connect_four_sync_public_state(p_match_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.connect_four_public_state (
    streamer_id,
    match_id,
    status,
    wager,
    board,
    player_one_display_name,
    player_two_display_name,
    current_player,
    winner,
    move_count,
    last_move,
    completion_reason,
    expires_at,
    updated_at
  )
  SELECT
    streamer_id,
    id,
    status,
    wager,
    board,
    player_one_display_name,
    player_two_display_name,
    current_player,
    winner,
    move_count,
    last_move,
    completion_reason,
    expires_at,
    updated_at
  FROM public.connect_four_matches
  WHERE id = p_match_id
  ON CONFLICT (streamer_id) DO UPDATE SET
    match_id = EXCLUDED.match_id,
    status = EXCLUDED.status,
    wager = EXCLUDED.wager,
    board = EXCLUDED.board,
    player_one_display_name = EXCLUDED.player_one_display_name,
    player_two_display_name = EXCLUDED.player_two_display_name,
    current_player = EXCLUDED.current_player,
    winner = EXCLUDED.winner,
    move_count = EXCLUDED.move_count,
    last_move = EXCLUDED.last_move,
    completion_reason = EXCLUDED.completion_reason,
    expires_at = EXCLUDED.expires_at,
    updated_at = EXCLUDED.updated_at;
$$;

CREATE OR REPLACE FUNCTION public.process_connect_four_turn_deadline(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  active_match public.connect_four_matches%ROWTYPE;
  winning_player smallint;
  point_operation_id uuid;
  pending_operations jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO active_match
  FROM public.connect_four_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF active_match.id IS NULL OR active_match.status <> 'active' THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF active_match.expires_at <= now() THEN
    winning_player := 3 - active_match.current_player;

    UPDATE public.connect_four_matches
    SET status = 'settling',
        completion_reason = 'timeout',
        winner = winning_player,
        current_player = NULL,
        updated_at = now()
    WHERE id = active_match.id;

    INSERT INTO public.connect_four_point_operations (
      match_id, twitch_user_id, twitch_login, operation_type, player_number, amount
    ) VALUES (
      active_match.id,
      CASE WHEN winning_player = 1 THEN active_match.player_one_twitch_id ELSE active_match.player_two_twitch_id END,
      CASE WHEN winning_player = 1 THEN active_match.player_one_login ELSE active_match.player_two_login END,
      'payout',
      winning_player,
      active_match.wager * 2
    )
    ON CONFLICT (match_id, twitch_user_id, operation_type) DO NOTHING
    RETURNING id INTO point_operation_id;

    IF point_operation_id IS NOT NULL THEN
      pending_operations := jsonb_build_array(jsonb_build_object('id', point_operation_id));
    END IF;

    PERFORM public.connect_four_sync_public_state(active_match.id);
    RETURN jsonb_build_object('ok', true, 'action', 'timeout', 'operations', pending_operations);
  END IF;

  IF active_match.expires_at <= now() + interval '10 seconds'
     AND active_match.turn_reminder_sent_at IS NULL THEN
    UPDATE public.connect_four_matches
    SET turn_reminder_sent_at = now(), updated_at = now()
    WHERE id = active_match.id;
    RETURN jsonb_build_object('ok', true, 'action', 'reminder', 'operations', pending_operations);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.connect_four_set_turn_deadline() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connect_four_sync_public_state(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_connect_four_turn_deadline(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_connect_four_turn_deadline(uuid) TO service_role;