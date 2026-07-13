-- Harden analytics SECURITY DEFINER helper RPCs.
-- These are called from server-side service-role API handlers, not directly by clients.

DO $$
DECLARE
  has_anon BOOLEAN := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  has_authenticated BOOLEAN := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
  has_service_role BOOLEAN := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role');
BEGIN
  IF to_regprocedure('public.analytics_increment_session(uuid, boolean)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.analytics_increment_session(UUID, BOOLEAN) SET search_path = public, pg_temp';
    EXECUTE 'REVOKE ALL ON FUNCTION public.analytics_increment_session(UUID, BOOLEAN) FROM PUBLIC';
    IF has_anon THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.analytics_increment_session(UUID, BOOLEAN) FROM anon';
    END IF;
    IF has_authenticated THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.analytics_increment_session(UUID, BOOLEAN) FROM authenticated';
    END IF;
    IF has_service_role THEN
      EXECUTE 'GRANT EXECUTE ON FUNCTION public.analytics_increment_session(UUID, BOOLEAN) TO service_role';
    END IF;
  END IF;

  IF to_regprocedure('public.analytics_increment_visitor_events(uuid, integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.analytics_increment_visitor_events(UUID, INTEGER) SET search_path = public, pg_temp';
    EXECUTE 'REVOKE ALL ON FUNCTION public.analytics_increment_visitor_events(UUID, INTEGER) FROM PUBLIC';
    IF has_anon THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.analytics_increment_visitor_events(UUID, INTEGER) FROM anon';
    END IF;
    IF has_authenticated THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.analytics_increment_visitor_events(UUID, INTEGER) FROM authenticated';
    END IF;
    IF has_service_role THEN
      EXECUTE 'GRANT EXECUTE ON FUNCTION public.analytics_increment_visitor_events(UUID, INTEGER) TO service_role';
    END IF;
  END IF;

  IF to_regprocedure('public.increment_field(text, uuid, text, integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.increment_field(TEXT, UUID, TEXT, INTEGER) SET search_path = public, pg_temp';
    EXECUTE 'REVOKE ALL ON FUNCTION public.increment_field(TEXT, UUID, TEXT, INTEGER) FROM PUBLIC';
    IF has_anon THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.increment_field(TEXT, UUID, TEXT, INTEGER) FROM anon';
    END IF;
    IF has_authenticated THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.increment_field(TEXT, UUID, TEXT, INTEGER) FROM authenticated';
    END IF;
    IF has_service_role THEN
      EXECUTE 'GRANT EXECUTE ON FUNCTION public.increment_field(TEXT, UUID, TEXT, INTEGER) TO service_role';
    END IF;
  END IF;

  IF to_regprocedure('public.delete_ip_analytics(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.delete_ip_analytics(TEXT) SET search_path = public, pg_temp';
    EXECUTE 'REVOKE ALL ON FUNCTION public.delete_ip_analytics(TEXT) FROM PUBLIC';
    IF has_anon THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.delete_ip_analytics(TEXT) FROM anon';
    END IF;
    IF has_authenticated THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.delete_ip_analytics(TEXT) FROM authenticated';
    END IF;
    IF has_service_role THEN
      EXECUTE 'GRANT EXECUTE ON FUNCTION public.delete_ip_analytics(TEXT) TO service_role';
    END IF;
  END IF;

  IF to_regprocedure('public.delete_user_analytics(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.delete_user_analytics(UUID) SET search_path = public, pg_temp';
    EXECUTE 'REVOKE ALL ON FUNCTION public.delete_user_analytics(UUID) FROM PUBLIC';
    IF has_anon THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.delete_user_analytics(UUID) FROM anon';
    END IF;
    IF has_authenticated THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.delete_user_analytics(UUID) FROM authenticated';
    END IF;
    IF has_service_role THEN
      EXECUTE 'GRANT EXECUTE ON FUNCTION public.delete_user_analytics(UUID) TO service_role';
    END IF;
  END IF;
END $$;