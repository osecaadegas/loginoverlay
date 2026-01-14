-- Create function to get user metadata including provider info
CREATE OR REPLACE FUNCTION get_user_metadata(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data JSON;
BEGIN
  SELECT json_build_object(
    'app_metadata', raw_app_meta_data,
    'user_metadata', raw_user_meta_data,
    'identities', (
      SELECT json_agg(
        json_build_object(
          'provider', provider,
          'identity_data', identity_data
        )
      )
      FROM auth.identities
      WHERE auth.identities.user_id = get_user_metadata.user_id
    )
  )
  INTO user_data
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_data;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_metadata(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_metadata IS 'Returns user metadata including app_metadata, user_metadata, and provider identities';
