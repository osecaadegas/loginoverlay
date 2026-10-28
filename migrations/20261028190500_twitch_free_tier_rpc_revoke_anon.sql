-- Supabase grants new public functions to anon explicitly by default.
-- Role assignment is available only to authenticated sessions.
REVOKE ALL ON FUNCTION public.ensure_twitch_free_tier() FROM anon;
