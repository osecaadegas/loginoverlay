-- Fix: allow OBS browser source (anon) to read slot requests for display
-- The harden_slot_requests_3_rls migration blocked anon reads, breaking
-- the OBS overlay which runs unauthenticated.

DROP POLICY IF EXISTS slot_requests_select ON slot_requests;

CREATE POLICY slot_requests_select ON slot_requests
  FOR SELECT
  USING (
    auth.uid() = user_id            -- streamer (logged in) sees their own queue
    OR auth.role() = 'service_role' -- API service role
    OR auth.role() = 'anon'         -- OBS browser source (unauthenticated) — public read
  );
