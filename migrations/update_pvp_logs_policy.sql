-- Update PVP logs policy to allow viewing all battles (public battle history)
DROP POLICY IF EXISTS "Users can view PvP logs they're involved in" ON the_life_pvp_logs;

CREATE POLICY "Users can view all PvP logs"
  ON the_life_pvp_logs FOR SELECT
  USING (true);
