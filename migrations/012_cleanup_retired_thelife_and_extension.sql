-- Consolidated migration: 012_cleanup_retired_thelife_and_extension.sql
-- Generated from active source migrations retained after cleanup

-- ============================================================================
-- Source: 20260605_remove_thelife_and_twitch_extension_schema.sql
-- ============================================================================
-- Remove retired The Life and Twitch extension schema after runtime cleanup on 2026-06-05.
-- Safe scope:
--   * public tables, views, materialized views, and sequences named the_life_*, ext_*, or season_pass_*
--   * public functions whose names or definitions still reference those retired schemas
-- Explicitly not touched:
--   * generic game tables such as game_sessions and game_leaderboard
--   * user_profiles.twitch_id and Twitch OAuth/profile sync helpers
--   * current overlay, analytics, StreamElements, offers, slots, giveaways, and betting schema

DO $$
DECLARE
  retired_table text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOR retired_table IN
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND (
          tablename LIKE 'the_life\_%' ESCAPE '\'
          OR tablename LIKE 'ext\_%' ESCAPE '\'
          OR tablename LIKE 'season_pass\_%' ESCAPE '\'
        )
    LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', retired_table);
      EXCEPTION
        WHEN undefined_table OR invalid_parameter_value OR object_not_in_prerequisite_state THEN
          NULL;
      END;
    END LOOP;
  END IF;
END $$;

DO $$
DECLARE
  retired_function record;
BEGIN
  FOR retired_function IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS arg_list
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname ~ '^(the_life_|ext_|season_pass_)'
        OR pg_get_functiondef(p.oid) ~* '(^|[^a-z0-9_])(the_life_[a-z0-9_]+|ext_[a-z0-9_]+|season_pass_[a-z0-9_]+)([^a-z0-9_]|$)'
      )
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      retired_function.schema_name,
      retired_function.function_name,
      retired_function.arg_list
    );
  END LOOP;
END $$;

DO $$
DECLARE
  retired_view record;
BEGIN
  FOR retired_view IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS object_name,
      c.relkind AS relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('v', 'm')
      AND (
        c.relname ~ '^(the_life_|ext_|season_pass_)'
        OR pg_get_viewdef(c.oid, true) ~* '(^|[^a-z0-9_])(the_life_[a-z0-9_]+|ext_[a-z0-9_]+|season_pass_[a-z0-9_]+)([^a-z0-9_]|$)'
      )
  LOOP
    IF retired_view.relkind = 'm' THEN
      EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', retired_view.schema_name, retired_view.object_name);
    ELSE
      EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', retired_view.schema_name, retired_view.object_name);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  retired_table record;
BEGIN
  FOR retired_table IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (
        tablename LIKE 'the_life\_%' ESCAPE '\'
        OR tablename LIKE 'ext\_%' ESCAPE '\'
        OR tablename LIKE 'season_pass\_%' ESCAPE '\'
      )
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', retired_table.schemaname, retired_table.tablename);
  END LOOP;
END $$;

DO $$
DECLARE
  retired_sequence record;
BEGIN
  FOR retired_sequence IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
      AND (
        sequence_name LIKE 'the_life\_%' ESCAPE '\'
        OR sequence_name LIKE 'ext\_%' ESCAPE '\'
        OR sequence_name LIKE 'season_pass\_%' ESCAPE '\'
      )
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I CASCADE', retired_sequence.sequence_schema, retired_sequence.sequence_name);
  END LOOP;
END $$;

DO $$
DECLARE
  retired_type record;
BEGIN
  FOR retired_type IN
    SELECT n.nspname AS schema_name, t.typname AS type_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype IN ('e', 'c', 'd')
      AND t.typname ~ '^(the_life_|ext_|season_pass_)'
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE', retired_type.schema_name, retired_type.type_name);
  END LOOP;
END $$;
