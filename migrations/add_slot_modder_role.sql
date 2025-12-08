-- Add slot_modder role to user_roles enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'user_roles' AND e.enumlabel = 'slot_modder'
  ) THEN
    ALTER TYPE user_roles ADD VALUE 'slot_modder';
  END IF;
END $$;

-- Update RLS policy on slots table to allow slot_modders to manage slots
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.slots;

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
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'slot_modder')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'slot_modder')
    )
  );

-- Add comment
COMMENT ON POLICY "Allow slot management for admins and slot_modders" ON public.slots 
IS 'Allows admins and slot_modders to add, edit, and delete slots';
