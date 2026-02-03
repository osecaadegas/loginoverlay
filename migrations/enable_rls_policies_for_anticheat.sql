-- Enable RLS Policies for Anti-Cheat Tables
-- Run this to allow the anti-cheat system to write logs

-- Game Logs - Allow authenticated users to insert their own logs
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated inserts to game_logs"
ON game_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow service role all access to game_logs"
ON game_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Economy Transactions
ALTER TABLE economy_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated inserts to economy_transactions"
ON economy_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow service role all access to economy_transactions"
ON economy_transactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Inventory Changes Log
ALTER TABLE inventory_changes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated inserts to inventory_changes_log"
ON inventory_changes_log FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow service role all access to inventory_changes_log"
ON inventory_changes_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Player Sessions
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated inserts to player_sessions"
ON player_sessions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated updates to own sessions"
ON player_sessions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role all access to player_sessions"
ON player_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Security Alerts
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all access to security_alerts"
ON security_alerts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Player Risk Scores
ALTER TABLE player_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated inserts to player_risk_scores"
ON player_risk_scores FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow service role all access to player_risk_scores"
ON player_risk_scores FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anti-Cheat Rules (read-only for authenticated)
ALTER TABLE anticheat_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to anticheat_rules"
ON anticheat_rules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role all access to anticheat_rules"
ON anticheat_rules FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admin Users (service role only)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all access to admin_users"
ON admin_users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admin Actions (service role only)
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all access to admin_actions"
ON admin_actions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
