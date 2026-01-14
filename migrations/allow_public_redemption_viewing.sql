-- Allow all authenticated users to view all point redemptions (for public history)
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own redemptions" ON point_redemptions;

-- Create new public viewing policy (for showing redemption history to everyone)
CREATE POLICY "Anyone can view all redemptions"
  ON point_redemptions FOR SELECT
  USING (true);

-- Keep the insert policy for users to create their own redemptions
-- This should already exist but keeping it explicit
DROP POLICY IF EXISTS "Users can create redemptions" ON point_redemptions;
CREATE POLICY "Users can create redemptions"
  ON point_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
