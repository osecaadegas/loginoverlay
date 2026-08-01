BEGIN;

DELETE FROM public.overlay_widgets
WHERE widget_type = 'connect_four';

UPDATE public.better_editor_overlays
SET draft_layout = jsonb_set(
  draft_layout,
  '{instances}',
  COALESCE(
    (
      SELECT jsonb_agg(instance)
      FROM jsonb_array_elements(COALESCE(draft_layout->'instances', '[]'::jsonb)) AS instance
      WHERE instance->>'widgetType' <> 'connect_four'
    ),
    '[]'::jsonb
  )
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(draft_layout->'instances', '[]'::jsonb)) AS instance
  WHERE instance->>'widgetType' = 'connect_four'
);

UPDATE public.better_editor_overlays
SET published_layout = jsonb_set(
  published_layout,
  '{instances}',
  COALESCE(
    (
      SELECT jsonb_agg(instance)
      FROM jsonb_array_elements(COALESCE(published_layout->'instances', '[]'::jsonb)) AS instance
      WHERE instance->>'widgetType' <> 'connect_four'
    ),
    '[]'::jsonb
  )
)
WHERE published_layout IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(published_layout->'instances', '[]'::jsonb)) AS instance
    WHERE instance->>'widgetType' = 'connect_four'
  );

UPDATE public.better_overlay_publications
SET published_layout = jsonb_set(
  published_layout,
  '{instances}',
  COALESCE(
    (
      SELECT jsonb_agg(instance)
      FROM jsonb_array_elements(COALESCE(published_layout->'instances', '[]'::jsonb)) AS instance
      WHERE instance->>'widgetType' <> 'connect_four'
    ),
    '[]'::jsonb
  )
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(published_layout->'instances', '[]'::jsonb)) AS instance
  WHERE instance->>'widgetType' = 'connect_four'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication publication
    JOIN pg_publication_rel publication_relation
      ON publication_relation.prpubid = publication.oid
    JOIN pg_class relation
      ON relation.oid = publication_relation.prrelid
    JOIN pg_namespace namespace
      ON namespace.oid = relation.relnamespace
    WHERE publication.pubname = 'supabase_realtime'
      AND namespace.nspname = 'public'
      AND relation.relname = 'connect_four_public_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      DROP TABLE public.connect_four_public_state;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.connect_four_matches') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS connect_four_set_turn_deadline
      ON public.connect_four_matches;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.process_connect_four_turn_deadline(uuid);
DROP FUNCTION IF EXISTS public.complete_connect_four_point_operation(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.claim_connect_four_point_operation(uuid);
DROP FUNCTION IF EXISTS public.process_connect_four_command(text, text, text, text, text, text, text, bigint, integer);
DROP FUNCTION IF EXISTS public.connect_four_sync_public_state(uuid);
DROP FUNCTION IF EXISTS public.connect_four_has_winner(jsonb, integer);
DROP FUNCTION IF EXISTS public.connect_four_set_turn_deadline();

DROP TABLE IF EXISTS public.connect_four_command_events;
DROP TABLE IF EXISTS public.connect_four_point_operations;
DROP TABLE IF EXISTS public.connect_four_public_state;
DROP TABLE IF EXISTS public.connect_four_matches;

COMMIT;