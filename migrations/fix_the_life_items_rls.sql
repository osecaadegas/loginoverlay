-- Fix RLS policies for the_life_items to allow public read access
-- This fixes the 400 errors when querying items

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view TheLife items" ON the_life_items;

-- Create new policy that allows public (unauthenticated) reads
CREATE POLICY "Public can view TheLife items"
  ON the_life_items FOR SELECT
  TO public
  USING (true);

-- Also ensure authenticated users can view
CREATE POLICY "Authenticated can view TheLife items"
  ON the_life_items FOR SELECT
  TO authenticated
  USING (true);

-- Recreate admin policy if needed
DROP POLICY IF EXISTS "Admins can manage TheLife items" ON the_life_items;

CREATE POLICY "Admins can manage TheLife items"
  ON the_life_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );
