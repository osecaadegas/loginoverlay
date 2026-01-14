-- Add slot_modder role support
-- Roles are stored in user_roles table, not user_profiles

-- Update RLS policy on slots table to allow slot_modders to manage slots
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.slots;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.slots;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to authenticated users"
  ON public.slots
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert/update/delete only for admins and slot_modders
CREATE POLICY "Allow slot management for admins and slot_modders"
  ON public.slots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'slot_modder')
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'slot_modder')
      AND user_roles.is_active = true
    )
  );

-- Add comment
COMMENT ON POLICY "Allow slot management for admins and slot_modders" ON public.slots 
IS 'Allows admins and slot_modders to add, edit, and delete slots';

-- Note: To assign slot_modder role to a user:
-- INSERT INTO user_roles (user_id, role, is_active) 
-- VALUES ('user-uuid', 'slot_modder', true)
-- ON CONFLICT (user_id) DO UPDATE SET role = 'slot_modder', is_active = true;
