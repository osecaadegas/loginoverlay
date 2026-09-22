-- Production has event counters but lacks the old generic increment_field RPC.
-- Count only saved sessions without exposing arbitrary table/column updates.
CREATE OR REPLACE FUNCTION public.analytics_increment_visitor_sessions(p_visitor_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.analytics_visitors
  SET total_sessions = total_sessions + 1
  WHERE id = p_visitor_id;
$$;

REVOKE ALL ON FUNCTION public.analytics_increment_visitor_sessions(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_increment_visitor_sessions(UUID) TO service_role;
