-- Harden Player Bonus Hunt public entities flagged by Supabase security advisor.

ALTER TABLE IF EXISTS public.player_hunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_hunt_bonuses ENABLE ROW LEVEL SECURITY;

ALTER VIEW IF EXISTS public.player_slot_results SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.player_bonus_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_product_subscriptions ups
    WHERE ups.user_id = p_user_id
      AND ups.product_code = 'player_bonus_hunt'
      AND (
        ups.status = 'active'
        OR (
          ups.status = 'trialing'
          AND (ups.trial_ends_at IS NULL OR ups.trial_ends_at > now())
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role IN ('admin', 'superadmin')
      AND ur.is_active = true
  );
$$;

DROP POLICY IF EXISTS "Users can read own player hunts" ON public.player_hunts;
CREATE POLICY "Users can read own player hunts"
  ON public.player_hunts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own player hunts" ON public.player_hunts;
CREATE POLICY "Users can insert own player hunts"
  ON public.player_hunts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.player_bonus_access(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own player hunts" ON public.player_hunts;
CREATE POLICY "Users can update own player hunts"
  ON public.player_hunts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.player_bonus_access(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.player_bonus_access(auth.uid())
  );

DROP POLICY IF EXISTS "Users can read own player bonuses" ON public.player_hunt_bonuses;
CREATE POLICY "Users can read own player bonuses"
  ON public.player_hunt_bonuses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own player bonuses" ON public.player_hunt_bonuses;
CREATE POLICY "Users can insert own player bonuses"
  ON public.player_hunt_bonuses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.player_bonus_access(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.player_hunts h
      WHERE h.id = hunt_id
        AND h.user_id = auth.uid()
        AND h.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update own player bonuses" ON public.player_hunt_bonuses;
CREATE POLICY "Users can update own player bonuses"
  ON public.player_hunt_bonuses
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.player_bonus_access(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.player_bonus_access(auth.uid())
  );
