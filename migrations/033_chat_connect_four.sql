-- Trusted Twitch EventSub commands drive this game. OBS clients can only read
-- the sanitized snapshot table; internal identities and point operations stay private.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS twitch_id text,
  ADD COLUMN IF NOT EXISTS twitch_username text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_twitch_id_unique
  ON public.user_profiles(twitch_id)
  WHERE twitch_id IS NOT NULL AND twitch_id <> '';

CREATE TABLE IF NOT EXISTS public.connect_four_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcaster_twitch_id text NOT NULL,
  status text NOT NULL DEFAULT 'funding_start'
    CHECK (status IN ('funding_start', 'waiting', 'funding_join', 'active', 'settling', 'completed', 'cancelled', 'error')),
  completion_reason text CHECK (completion_reason IS NULL OR completion_reason IN ('win', 'draw', 'reset', 'funding_failed')),
  wager bigint NOT NULL CHECK (wager > 0 AND wager <= 1000000000),
  board jsonb NOT NULL DEFAULT '[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]]'::jsonb,
  player_one_twitch_id text NOT NULL,
  player_one_login text NOT NULL,
  player_one_display_name text NOT NULL,
  player_two_twitch_id text,
  player_two_login text,
  player_two_display_name text,
  current_player smallint CHECK (current_player IS NULL OR current_player IN (1, 2)),
  winner smallint CHECK (winner IS NULL OR winner IN (1, 2)),
  move_count smallint NOT NULL DEFAULT 0 CHECK (move_count BETWEEN 0 AND 42),
  last_move jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_four_one_live_match_per_streamer
  ON public.connect_four_matches(streamer_id)
  WHERE status IN ('funding_start', 'waiting', 'funding_join', 'active', 'settling');

CREATE INDEX IF NOT EXISTS idx_connect_four_matches_broadcaster
  ON public.connect_four_matches(broadcaster_twitch_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.connect_four_public_state (
  streamer_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL UNIQUE REFERENCES public.connect_four_matches(id) ON DELETE CASCADE,
  status text NOT NULL,
  wager bigint NOT NULL,
  board jsonb NOT NULL,
  player_one_display_name text NOT NULL,
  player_two_display_name text,
  current_player smallint,
  winner smallint,
  move_count smallint NOT NULL,
  last_move jsonb,
  completion_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.connect_four_command_events (
  twitch_message_id text PRIMARY KEY,
  broadcaster_twitch_id text NOT NULL,
  chatter_twitch_id text NOT NULL,
  chatter_login text NOT NULL,
  command_text text NOT NULL,
  command_type text,
  match_id uuid REFERENCES public.connect_four_matches(id) ON DELETE SET NULL,
  result text NOT NULL DEFAULT 'received'
    CHECK (result IN ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.connect_four_point_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.connect_four_matches(id) ON DELETE CASCADE,
  twitch_user_id text NOT NULL,
  twitch_login text NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('stake', 'refund', 'payout')),
  player_number smallint NOT NULL CHECK (player_number IN (1, 2)),
  amount bigint NOT NULL CHECK (amount > 0 AND amount <= 2000000000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applying', 'applied', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (match_id, twitch_user_id, operation_type)
);

CREATE INDEX IF NOT EXISTS idx_connect_four_point_operations_match_status
  ON public.connect_four_point_operations(match_id, status);

ALTER TABLE public.connect_four_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_four_public_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_four_command_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_four_point_operations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.connect_four_matches FROM anon, authenticated;
REVOKE ALL ON public.connect_four_command_events FROM anon, authenticated;
REVOKE ALL ON public.connect_four_point_operations FROM anon, authenticated;
GRANT SELECT ON public.connect_four_public_state TO anon, authenticated;

DROP POLICY IF EXISTS "Connect four state is publicly readable" ON public.connect_four_public_state;
CREATE POLICY "Connect four state is publicly readable"
  ON public.connect_four_public_state
  FOR SELECT
  TO anon, authenticated
  USING (true);

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
    updated_at = EXCLUDED.updated_at;
$$;

CREATE OR REPLACE FUNCTION public.connect_four_has_winner(p_board jsonb, p_player integer)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  row_index integer;
  column_index integer;
  direction_index integer;
  offset_index integer;
  direction_row integer;
  direction_column integer;
  matches integer;
  directions integer[][] := ARRAY[[0, 1], [1, 0], [1, 1], [1, -1]];
BEGIN
  FOR row_index IN 0..5 LOOP
    FOR column_index IN 0..6 LOOP
      IF (p_board -> row_index ->> column_index)::integer <> p_player THEN
        CONTINUE;
      END IF;

      FOR direction_index IN 1..4 LOOP
        direction_row := directions[direction_index][1];
        direction_column := directions[direction_index][2];
        matches := 1;

        FOR offset_index IN 1..3 LOOP
          EXIT WHEN row_index + (direction_row * offset_index) NOT BETWEEN 0 AND 5;
          EXIT WHEN column_index + (direction_column * offset_index) NOT BETWEEN 0 AND 6;
          EXIT WHEN (p_board -> (row_index + direction_row * offset_index) ->> (column_index + direction_column * offset_index))::integer <> p_player;
          matches := matches + 1;
        END LOOP;

        IF matches = 4 THEN
          RETURN true;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_connect_four_command(
  p_twitch_message_id text,
  p_broadcaster_twitch_id text,
  p_chatter_twitch_id text,
  p_chatter_login text,
  p_chatter_display_name text,
  p_command_text text,
  p_command_type text,
  p_wager bigint DEFAULT NULL,
  p_column integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  streamer_user_id uuid;
  active_match public.connect_four_matches%ROWTYPE;
  created_match_id uuid;
  point_operation_id uuid;
  player_number integer;
  row_index integer;
  target_row integer := -1;
  next_board jsonb;
  has_winner boolean := false;
  board_is_full boolean := false;
  pending_operations jsonb := '[]'::jsonb;
  error_text text;
BEGIN
  IF p_twitch_message_id IS NULL OR p_twitch_message_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_message_id');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_broadcaster_twitch_id, 0));

  INSERT INTO public.connect_four_command_events (
    twitch_message_id,
    broadcaster_twitch_id,
    chatter_twitch_id,
    chatter_login,
    command_text,
    command_type
  ) VALUES (
    p_twitch_message_id,
    p_broadcaster_twitch_id,
    p_chatter_twitch_id,
    lower(p_chatter_login),
    p_command_text,
    p_command_type
  )
  ON CONFLICT (twitch_message_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  SELECT user_id
  INTO streamer_user_id
  FROM public.user_profiles
  WHERE twitch_id = p_broadcaster_twitch_id
  LIMIT 1;

  IF streamer_user_id IS NULL THEN
    error_text := 'broadcaster_not_connected';
  END IF;

  IF error_text IS NULL THEN
    SELECT *
    INTO active_match
    FROM public.connect_four_matches
    WHERE streamer_id = streamer_user_id
      AND status IN ('funding_start', 'waiting', 'funding_join', 'active', 'settling')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF error_text IS NULL AND p_command_type = 'start' THEN
    IF active_match.id IS NOT NULL THEN
      error_text := 'match_already_open';
    ELSIF p_wager IS NULL OR p_wager <= 0 OR p_wager > 1000000000 THEN
      error_text := 'invalid_wager';
    ELSE
      INSERT INTO public.connect_four_matches (
        streamer_id,
        broadcaster_twitch_id,
        wager,
        player_one_twitch_id,
        player_one_login,
        player_one_display_name
      ) VALUES (
        streamer_user_id,
        p_broadcaster_twitch_id,
        p_wager,
        p_chatter_twitch_id,
        lower(p_chatter_login),
        p_chatter_display_name
      )
      RETURNING id INTO created_match_id;

      DELETE FROM public.connect_four_command_events
      WHERE broadcaster_twitch_id = p_broadcaster_twitch_id
        AND twitch_message_id <> p_twitch_message_id;

      DELETE FROM public.connect_four_matches
      WHERE streamer_id = streamer_user_id
        AND id <> created_match_id;

      INSERT INTO public.connect_four_point_operations (
        match_id, twitch_user_id, twitch_login, operation_type, player_number, amount
      ) VALUES (
        created_match_id, p_chatter_twitch_id, lower(p_chatter_login), 'stake', 1, p_wager
      )
      RETURNING id INTO point_operation_id;

      PERFORM public.connect_four_sync_public_state(created_match_id);
      pending_operations := jsonb_build_array(jsonb_build_object('id', point_operation_id));
      active_match.id := created_match_id;
    END IF;
  ELSIF error_text IS NULL AND p_command_type = 'join' THEN
    IF active_match.id IS NULL OR active_match.status <> 'waiting' THEN
      error_text := 'no_match_waiting';
    ELSIF active_match.player_one_twitch_id = p_chatter_twitch_id THEN
      error_text := 'cannot_play_yourself';
    ELSE
      UPDATE public.connect_four_matches
      SET status = 'funding_join',
          player_two_twitch_id = p_chatter_twitch_id,
          player_two_login = lower(p_chatter_login),
          player_two_display_name = p_chatter_display_name,
          expires_at = now() + interval '15 minutes',
          updated_at = now()
      WHERE id = active_match.id;

      INSERT INTO public.connect_four_point_operations (
        match_id, twitch_user_id, twitch_login, operation_type, player_number, amount
      ) VALUES (
        active_match.id, p_chatter_twitch_id, lower(p_chatter_login), 'stake', 2, active_match.wager
      )
      RETURNING id INTO point_operation_id;

      PERFORM public.connect_four_sync_public_state(active_match.id);
      pending_operations := jsonb_build_array(jsonb_build_object('id', point_operation_id));
    END IF;
  ELSIF error_text IS NULL AND p_command_type = 'drop' THEN
    IF active_match.id IS NULL OR active_match.status <> 'active' THEN
      error_text := 'no_active_match';
    ELSIF p_column IS NULL OR p_column NOT BETWEEN 0 AND 6 THEN
      error_text := 'invalid_column';
    ELSE
      player_number := CASE
        WHEN active_match.player_one_twitch_id = p_chatter_twitch_id THEN 1
        WHEN active_match.player_two_twitch_id = p_chatter_twitch_id THEN 2
        ELSE 0
      END;

      IF player_number = 0 THEN
        error_text := 'not_a_player';
      ELSIF player_number <> active_match.current_player THEN
        error_text := 'not_your_turn';
      ELSE
        FOR row_index IN REVERSE 5..0 LOOP
          IF (active_match.board -> row_index ->> p_column)::integer = 0 THEN
            target_row := row_index;
            EXIT;
          END IF;
        END LOOP;

        IF target_row < 0 THEN
          error_text := 'column_full';
        ELSE
          next_board := jsonb_set(
            active_match.board,
            ARRAY[target_row::text, p_column::text],
            to_jsonb(player_number),
            false
          );
          has_winner := public.connect_four_has_winner(next_board, player_number);
          board_is_full := active_match.move_count + 1 = 42;

          UPDATE public.connect_four_matches
          SET board = next_board,
              move_count = move_count + 1,
              last_move = jsonb_build_object('row', target_row, 'column', p_column, 'player', player_number),
              winner = CASE WHEN has_winner THEN player_number ELSE NULL END,
              current_player = CASE WHEN has_winner OR board_is_full THEN NULL ELSE 3 - player_number END,
              status = CASE WHEN has_winner OR board_is_full THEN 'settling' ELSE 'active' END,
              completion_reason = CASE WHEN has_winner THEN 'win' WHEN board_is_full THEN 'draw' ELSE NULL END,
              expires_at = now() + interval '15 minutes',
              updated_at = now()
          WHERE id = active_match.id;

          IF has_winner THEN
            INSERT INTO public.connect_four_point_operations (
              match_id, twitch_user_id, twitch_login, operation_type, player_number, amount
            ) VALUES (
              active_match.id,
              CASE WHEN player_number = 1 THEN active_match.player_one_twitch_id ELSE active_match.player_two_twitch_id END,
              CASE WHEN player_number = 1 THEN active_match.player_one_login ELSE active_match.player_two_login END,
              'payout',
              player_number,
              active_match.wager * 2
            )
            RETURNING id INTO point_operation_id;
            pending_operations := jsonb_build_array(jsonb_build_object('id', point_operation_id));
          ELSIF board_is_full THEN
            INSERT INTO public.connect_four_point_operations (
              match_id, twitch_user_id, twitch_login, operation_type, player_number, amount
            ) VALUES
              (active_match.id, active_match.player_one_twitch_id, active_match.player_one_login, 'refund', 1, active_match.wager),
              (active_match.id, active_match.player_two_twitch_id, active_match.player_two_login, 'refund', 2, active_match.wager);

            SELECT coalesce(jsonb_agg(jsonb_build_object('id', id)), '[]'::jsonb)
            INTO pending_operations
            FROM public.connect_four_point_operations
            WHERE match_id = active_match.id AND status = 'pending';
          END IF;

          PERFORM public.connect_four_sync_public_state(active_match.id);
        END IF;
      END IF;
    END IF;
  ELSIF error_text IS NULL AND p_command_type = 'reset' THEN
    IF p_chatter_twitch_id <> p_broadcaster_twitch_id THEN
      error_text := 'reset_requires_broadcaster';
    ELSIF active_match.id IS NULL THEN
      error_text := 'no_match_to_reset';
    ELSE
      UPDATE public.connect_four_matches
      SET status = 'settling', completion_reason = 'reset', current_player = NULL, updated_at = now()
      WHERE id = active_match.id;

      INSERT INTO public.connect_four_point_operations (
        match_id, twitch_user_id, twitch_login, operation_type, player_number, amount
      )
      SELECT active_match.id, stake.twitch_user_id, stake.twitch_login, 'refund', stake.player_number, stake.amount
      FROM public.connect_four_point_operations stake
      WHERE stake.match_id = active_match.id
        AND stake.operation_type = 'stake'
        AND stake.status = 'applied'
      ON CONFLICT (match_id, twitch_user_id, operation_type) DO NOTHING;

      SELECT coalesce(jsonb_agg(jsonb_build_object('id', id)), '[]'::jsonb)
      INTO pending_operations
      FROM public.connect_four_point_operations
      WHERE match_id = active_match.id AND status = 'pending';

      IF jsonb_array_length(pending_operations) = 0 THEN
        UPDATE public.connect_four_matches
        SET status = 'cancelled', completed_at = now(), updated_at = now()
        WHERE id = active_match.id;
      END IF;

      PERFORM public.connect_four_sync_public_state(active_match.id);
    END IF;
  ELSIF error_text IS NULL THEN
    error_text := 'unsupported_command';
  END IF;

  IF error_text IS NOT NULL AND active_match.id IS NULL THEN
    DELETE FROM public.connect_four_command_events
    WHERE twitch_message_id = p_twitch_message_id;
  ELSE
    UPDATE public.connect_four_command_events
    SET match_id = active_match.id,
        result = CASE WHEN error_text IS NULL THEN 'processed' ELSE 'ignored' END,
        error_message = error_text,
        processed_at = now()
    WHERE twitch_message_id = p_twitch_message_id;
  END IF;

  IF error_text IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', error_text);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'matchId', active_match.id,
    'operations', pending_operations
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_connect_four_point_operation(p_operation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claimed public.connect_four_point_operations%ROWTYPE;
  streamer_user_id uuid;
BEGIN
  UPDATE public.connect_four_point_operations
  SET status = 'applying', attempts = attempts + 1, updated_at = now()
  WHERE id = p_operation_id AND status = 'pending'
  RETURNING * INTO claimed;

  IF claimed.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT streamer_id INTO streamer_user_id
  FROM public.connect_four_matches
  WHERE id = claimed.match_id;

  RETURN jsonb_build_object(
    'id', claimed.id,
    'matchId', claimed.match_id,
    'streamerId', streamer_user_id,
    'twitchLogin', claimed.twitch_login,
    'operationType', claimed.operation_type,
    'amount', claimed.amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_connect_four_point_operation(
  p_operation_id uuid,
  p_succeeded boolean,
  p_error_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  completed_operation public.connect_four_point_operations%ROWTYPE;
  active_match public.connect_four_matches%ROWTYPE;
  pending_operations jsonb := '[]'::jsonb;
BEGIN
  UPDATE public.connect_four_point_operations
  SET status = CASE WHEN p_succeeded THEN 'applied' ELSE 'failed' END,
      error_message = CASE WHEN p_succeeded THEN NULL ELSE left(coalesce(p_error_message, 'point_operation_failed'), 500) END,
      completed_at = now(),
      updated_at = now()
  WHERE id = p_operation_id AND status = 'applying'
  RETURNING * INTO completed_operation;

  IF completed_operation.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'operations', pending_operations);
  END IF;

  SELECT * INTO active_match
  FROM public.connect_four_matches
  WHERE id = completed_operation.match_id
  FOR UPDATE;

  IF NOT p_succeeded THEN
    IF completed_operation.operation_type = 'stake' AND completed_operation.player_number = 1 THEN
      UPDATE public.connect_four_matches
      SET status = 'cancelled', completion_reason = 'funding_failed', completed_at = now(), updated_at = now()
      WHERE id = active_match.id;
    ELSIF completed_operation.operation_type = 'stake' AND completed_operation.player_number = 2 THEN
      INSERT INTO public.connect_four_point_operations (
        match_id, twitch_user_id, twitch_login, operation_type, player_number, amount
      ) VALUES (
        active_match.id, active_match.player_one_twitch_id, active_match.player_one_login, 'refund', 1, active_match.wager
      )
      ON CONFLICT (match_id, twitch_user_id, operation_type) DO NOTHING;

      UPDATE public.connect_four_matches
      SET status = 'settling', completion_reason = 'funding_failed', current_player = NULL, updated_at = now()
      WHERE id = active_match.id;
    ELSE
      UPDATE public.connect_four_matches
      SET status = 'error', updated_at = now()
      WHERE id = active_match.id;
    END IF;
  ELSIF completed_operation.operation_type = 'stake' THEN
    IF active_match.completion_reason = 'reset' THEN
      INSERT INTO public.connect_four_point_operations (
        match_id, twitch_user_id, twitch_login, operation_type, player_number, amount
      ) VALUES (
        active_match.id,
        completed_operation.twitch_user_id,
        completed_operation.twitch_login,
        'refund',
        completed_operation.player_number,
        completed_operation.amount
      )
      ON CONFLICT (match_id, twitch_user_id, operation_type) DO NOTHING;

      UPDATE public.connect_four_matches
      SET status = 'settling', current_player = NULL, updated_at = now()
      WHERE id = active_match.id;
    ELSIF completed_operation.player_number = 1 AND active_match.status = 'funding_start' THEN
      UPDATE public.connect_four_matches
      SET status = 'waiting', expires_at = now() + interval '15 minutes', updated_at = now()
      WHERE id = active_match.id;
    ELSIF completed_operation.player_number = 2 AND active_match.status = 'funding_join' THEN
      UPDATE public.connect_four_matches
      SET status = 'active', current_player = 1, expires_at = now() + interval '15 minutes', updated_at = now()
      WHERE id = active_match.id;
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.connect_four_point_operations
    WHERE match_id = active_match.id AND status IN ('pending', 'applying')
  ) THEN
    UPDATE public.connect_four_matches
    SET status = CASE WHEN completion_reason IN ('reset', 'funding_failed') THEN 'cancelled' ELSE 'completed' END,
        completed_at = now(),
        updated_at = now()
    WHERE id = active_match.id;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id)), '[]'::jsonb)
  INTO pending_operations
  FROM public.connect_four_point_operations
  WHERE match_id = active_match.id AND status = 'pending';

  PERFORM public.connect_four_sync_public_state(active_match.id);

  RETURN jsonb_build_object('ok', true, 'operations', pending_operations);
END;
$$;

REVOKE ALL ON FUNCTION public.connect_four_sync_public_state(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connect_four_has_winner(jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_connect_four_command(text, text, text, text, text, text, text, bigint, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_connect_four_point_operation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_connect_four_point_operation(uuid, boolean, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.process_connect_four_command(text, text, text, text, text, text, text, bigint, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_connect_four_point_operation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_connect_four_point_operation(uuid, boolean, text) TO service_role;

DROP FUNCTION IF EXISTS public.__connect_four_enable_realtime();
CREATE FUNCTION public.__connect_four_enable_realtime()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.connect_four_public_state;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

SELECT public.__connect_four_enable_realtime();
DROP FUNCTION public.__connect_four_enable_realtime();