-- Atomic scheduled draws for the legacy ticket-based giveaway model.
-- The current production project uses user_giveaways instead; this function
-- deliberately does not create or mutate the absent legacy tables.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.draw_expired_giveaways()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  giveaway_row record;
  existing_count integer;
  remaining_count integer;
  selected_count integer;
  draw_count integer := 0;
  winner_count integer := 0;
BEGIN
  IF to_regclass('public.giveaways') IS NULL
     OR to_regclass('public.giveaway_entries') IS NULL
     OR to_regclass('public.giveaway_winners') IS NULL THEN
    RETURN jsonb_build_object('status', 'legacy_schema_absent', 'drawn', 0, 'winners', 0);
  END IF;

  -- Row locks serialize concurrent cron calls. The insertion and completion
  -- update share this transaction, so a failed call cannot leave half a draw.
  FOR giveaway_row IN
    SELECT id, max_winners
    FROM public.giveaways
    WHERE is_active = true AND winners_drawn = false AND ends_at <= now()
    ORDER BY ends_at, id
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT count(*) INTO existing_count
    FROM public.giveaway_winners
    WHERE giveaway_id = giveaway_row.id;
    remaining_count := greatest(0, coalesce(giveaway_row.max_winners, 1) - existing_count);
    selected_count := 0;

    IF remaining_count > 0 THEN
      -- Exponential race: -ln(U)/tickets yields a ticket-weighted sample
      -- without replacement. One random 56-bit cryptographic draw per user,
      -- independent of the number of tickets. Grouping also prevents the
      -- same user from receiving multiple winning positions.
      WITH weights AS (
        SELECT e.user_id, sum(e.tickets_count)::numeric AS tickets
        FROM public.giveaway_entries e
        WHERE e.giveaway_id = giveaway_row.id AND e.tickets_count > 0
          AND e.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.giveaway_winners w
            WHERE w.giveaway_id = giveaway_row.id AND w.user_id = e.user_id
          )
        GROUP BY e.user_id
      ), ranked AS (
        SELECT user_id,
          -ln((1 + (('x' || encode(gen_random_bytes(7), 'hex'))::bit(56)::bigint)::numeric)
              / 72057594037927937::numeric) / tickets AS score
        FROM weights
      )
      INSERT INTO public.giveaway_winners (giveaway_id, user_id)
      SELECT giveaway_row.id, user_id
      FROM ranked
      ORDER BY score, user_id
      LIMIT remaining_count;
      GET DIAGNOSTICS selected_count = ROW_COUNT;
    END IF;

    UPDATE public.giveaways
    SET winners_drawn = true, drawn_at = now(), is_active = false
    WHERE id = giveaway_row.id;
    draw_count := draw_count + 1;
    winner_count := winner_count + selected_count;
  END LOOP;

  RETURN jsonb_build_object('status', 'ok', 'drawn', draw_count, 'winners', winner_count);
END;
$$;

REVOKE ALL ON FUNCTION public.draw_expired_giveaways() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.draw_expired_giveaways() TO service_role;
NOTIFY pgrst, 'reload schema';
