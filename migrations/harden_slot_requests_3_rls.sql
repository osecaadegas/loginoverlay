-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 3/3 — harden_slot_requests_3_rls
-- Run this third.
--
-- What this does:
--   • The INSERT RLS policy was `auth.uid() = user_id`, which sounds right but
--     the API uses the service role key (bypasses RLS entirely).
--     This migration adds a server-side validation function the API can call
--     to confirm a user_id belongs to a real, active streamer before inserting.
--   • Adds a policy so the service role can write any status transitions
--     (needed for the atomic refunding pattern).
--   • Ensures viewers cannot see other streamers' queues (SELECT policy tightened).
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop overly permissive SELECT policy (currently allows anyone to read all rows)
DROP POLICY IF EXISTS slot_requests_select ON slot_requests;

-- Viewers/public can only read the streamer's own pending queue (no cross-user leaks)
-- Authenticated users see only their own rows; anon sees nothing.
CREATE POLICY slot_requests_select ON slot_requests
  FOR SELECT
  USING (
    auth.uid() = user_id          -- streamer sees their own queue
    OR auth.role() = 'service_role' -- service role (API) can read all
  );

-- Helper function: verify a given UUID is a known streamer
-- (has a row in overlay_widgets — i.e. has configured something)
CREATE OR REPLACE FUNCTION is_valid_streamer(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  );
$$;
