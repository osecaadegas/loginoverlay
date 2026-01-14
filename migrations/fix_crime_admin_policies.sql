-- Add admin policies to allow managing crimes

-- Drop any existing admin policy
DROP POLICY IF EXISTS "Admins can manage robberies" ON the_life_robberies;

-- Allow admins to INSERT, UPDATE, DELETE crimes
CREATE POLICY "Admins can manage robberies"
  ON the_life_robberies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'owner')
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'owner')
      AND user_roles.is_active = true
    )
  );
