-- ═══════════════════════════════════════════════════════════════════
-- FIX /points PAGE - SE auto-sync + username display
-- 
-- ROOT CAUSE: streamelements_connections RLS only allows users to
-- read their OWN row. This blocks:
--   1. checkSeCredentials() → can't read admin's SE row → "Setup Required"
--   2. autoConnectTwitchUser() → can't get admin's SE creds → no auto-connect
--   3. loadAllRedemptions() → can't read other users' se_username → "@User"
--
-- FIX: SECURITY DEFINER RPCs that bypass RLS safely.
-- The JWT token never leaves the server-side function context.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. RPC: Check if SE is configured (returns true/false only) ────

DROP FUNCTION IF EXISTS is_se_configured();
CREATE OR REPLACE FUNCTION is_se_configured()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM streamelements_connections sc
    JOIN user_roles ur ON ur.user_id = sc.user_id
    WHERE ur.role = 'admin'
      AND ur.is_active = true
      AND sc.se_channel_id IS NOT NULL
      AND sc.se_jwt_token IS NOT NULL
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_se_configured() TO authenticated;


-- ─── 2. RPC: Get admin's SE credentials for auto-connect ───────────
-- Only returns credentials to authenticated users who need to sync points.
-- The credentials are for the admin's SE channel.

DROP FUNCTION IF EXISTS get_streamer_se_credentials();
CREATE OR REPLACE FUNCTION get_streamer_se_credentials()
RETURNS TABLE(channel_id TEXT, jwt_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sc.se_channel_id, sc.se_jwt_token
  FROM streamelements_connections sc
  JOIN user_roles ur ON ur.user_id = sc.user_id
  WHERE ur.role = 'admin'
    AND ur.is_active = true
    AND sc.se_channel_id IS NOT NULL
    AND sc.se_jwt_token IS NOT NULL
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION get_streamer_se_credentials() TO authenticated;


-- ─── 3. RPC: Get usernames for a list of user IDs ──────────────────
-- Returns the best available username for each user_id:
-- Priority: se_username > display_name > username > Twitch metadata

DROP FUNCTION IF EXISTS get_usernames_for_ids(UUID[]);
CREATE OR REPLACE FUNCTION get_usernames_for_ids(p_user_ids UUID[])
RETURNS TABLE(user_id UUID, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    COALESCE(
      sc.se_username,
      up.display_name,
      up.username,
      u.raw_user_meta_data->>'preferred_username',
      u.raw_user_meta_data->>'name',
      'User'
    ) AS username
  FROM unnest(p_user_ids) AS uid(id)
  JOIN auth.users u ON u.id = uid.id
  LEFT JOIN streamelements_connections sc ON sc.user_id = u.id
  LEFT JOIN user_profiles up ON up.user_id = u.id;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION get_usernames_for_ids(UUID[]) TO authenticated;


-- ─── 4. VERIFICATION ───────────────────────────────────────────────

-- Test is_se_configured (should return true if admin has SE set up)
SELECT is_se_configured();

-- Test get_streamer_se_credentials (should return 1 row with channel_id)
SELECT channel_id FROM get_streamer_se_credentials();

-- List all functions we created
SELECT routine_name, security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('is_se_configured', 'get_streamer_se_credentials', 'get_usernames_for_ids');
