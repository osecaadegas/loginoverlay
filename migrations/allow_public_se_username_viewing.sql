-- Allow users to view SE usernames for the redemption history
-- This enables showing who redeemed what in the public history

CREATE POLICY "Anyone can view SE usernames"
  ON streamelements_connections FOR SELECT
  USING (true);
