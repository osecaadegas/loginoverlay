-- Restrict four confirmed exposed SECURITY DEFINER functions. Apply only after
-- verifying a recoverable production backup and testing this migration on a
-- database branch or restored copy. No tables or user records are changed.

CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE (
  id uuid, email text, created_at timestamptz,
  app_metadata jsonb, user_metadata jsonb, identities jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at,
         u.raw_app_meta_data, u.raw_user_meta_data,
         (SELECT COALESCE(json_agg(json_build_object(
             'provider', i.provider, 'identity_data', i.identity_data
           ))::jsonb, '[]'::jsonb)
          FROM auth.identities i WHERE i.user_id = u.id)
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- PUBLIC grants are inherited by anon and authenticated. Revoke that default
-- first, then restore only the roles whose existing callers need access.
REVOKE ALL ON FUNCTION public.get_all_auth_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_auth_users() TO authenticated, service_role;

-- No application caller of these three functions exists in this repository.
-- Keep server-side access, while removing direct browser/anonymous execution.
REVOKE ALL ON FUNCTION public.add_viewer_points(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_viewer_points(uuid, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.admin_get_player_timeline(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_player_timeline(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.acquire_wipe_lock(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_wipe_lock(uuid, text) TO service_role;
