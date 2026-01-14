-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Allow admins to manage category info" ON the_life_category_info;

-- Create policy for admins to manage category info
CREATE POLICY "Allow admins to manage category info"
  ON the_life_category_info
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );
