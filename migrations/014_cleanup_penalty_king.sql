-- Cleanup migration: 014_cleanup_penalty_king.sql
-- Retire old mini-game schema after the feature was removed.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS penalty_king_shots;
    EXCEPTION
      WHEN undefined_table OR invalid_parameter_value OR object_not_in_prerequisite_state THEN
        NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS penalty_king_sessions;
    EXCEPTION
      WHEN undefined_table OR invalid_parameter_value OR object_not_in_prerequisite_state THEN
        NULL;
    END;
  END IF;
END $$;

DROP TABLE IF EXISTS penalty_king_shots CASCADE;
DROP TABLE IF EXISTS penalty_king_sessions CASCADE;
