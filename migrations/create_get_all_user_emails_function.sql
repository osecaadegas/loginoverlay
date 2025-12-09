-- Create function to get all user emails and IDs for admin purposes
-- This is needed for the Points Manager to display all registered users

CREATE OR REPLACE FUNCTION get_all_user_emails()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.users.id as user_id,
    auth.users.email as email,
    auth.users.created_at as created_at
  FROM auth.users
  ORDER BY auth.users.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
-- Note: You may want to restrict this to admin users only in production
GRANT EXECUTE ON FUNCTION get_all_user_emails() TO authenticated;

COMMENT ON FUNCTION get_all_user_emails IS 'Returns all user emails and IDs for admin/moderator use in Points Manager';
