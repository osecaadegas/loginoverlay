-- Twitch accounts receive a separate, non-Premium role for the source overlay.
-- Keep this role independent of manually assigned and subscription roles.
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_free_tier_unique
  ON public.user_roles (user_id, role)
  WHERE role = 'freeTier';

CREATE OR REPLACE FUNCTION public.ensure_twitch_free_tier()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  account_id uuid := auth.uid();
BEGIN
  IF account_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = account_id AND provider = 'twitch'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role, source, source_ref, is_active)
  VALUES (account_id, 'freeTier', 'twitch', 'oauth', true)
  ON CONFLICT (user_id, role) WHERE role = 'freeTier'
  DO UPDATE SET is_active = true, updated_at = now();
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_twitch_free_tier() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_twitch_free_tier() TO authenticated;

-- Existing Twitch accounts receive the same role without replacing their roles.
INSERT INTO public.user_roles (user_id, role, source, source_ref, is_active)
SELECT DISTINCT user_id, 'freeTier', 'twitch', 'oauth', true
FROM auth.identities
WHERE provider = 'twitch'
ON CONFLICT (user_id, role) WHERE role = 'freeTier'
DO UPDATE SET is_active = true, updated_at = now();
