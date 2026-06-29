-- Repair pending slot submission/approval workflow.
--
-- Restores the intended flow:
--   * user submissions enter pending_slots for admin review
--   * metadata scraped from public sources may be incomplete
--   * admins and superadmins can see and update the approval queue

ALTER TABLE public.pending_slots
  ALTER COLUMN rtp DROP NOT NULL,
  ALTER COLUMN volatility DROP NOT NULL,
  ALTER COLUMN max_win_multiplier DROP NOT NULL;

DROP POLICY IF EXISTS pending_slots_select_admin ON public.pending_slots;
CREATE POLICY pending_slots_select_admin ON public.pending_slots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS pending_slots_update_admin ON public.pending_slots;
CREATE POLICY pending_slots_update_admin ON public.pending_slots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin', 'superadmin')
    )
  );
