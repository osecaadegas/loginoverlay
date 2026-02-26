-- Function to return ALL auth users with their metadata in a single call
-- This replaces the N+1 query pattern (get_user_email + get_user_metadata per user)
CREATE OR REPLACE FUNCTION get_all_auth_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  app_metadata JSONB,
  user_metadata JSONB,
  identities JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.created_at,
    u.raw_app_meta_data  AS app_metadata,
    u.raw_user_meta_data AS user_metadata,
    (
      SELECT COALESCE(json_agg(
        json_build_object(
          'provider', i.provider,
          'identity_data', i.identity_data
        )
      )::JSONB, '[]'::JSONB)
      FROM auth.identities i
      WHERE i.user_id = u.id
    ) AS identities
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (admin check happens in app)
GRANT EXECUTE ON FUNCTION get_all_auth_users() TO authenticated;

COMMENT ON FUNCTION get_all_auth_users IS 'Returns all auth users with email, metadata, and provider identities. Used by admin panel.';
