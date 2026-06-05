-- ═══════════════════════════════════════════════════════════════════
-- DROP UNUSED / ORPHANED TABLES
-- 
-- These tables have ZERO references in src/ or api/.
-- Run in Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Stripe / Payments (fully removed) ───────────────────────────
DROP TABLE IF EXISTS stripe_webhook_events  CASCADE;
DROP TABLE IF EXISTS subscription_plans     CASCADE;
DROP TABLE IF EXISTS subscriptions          CASCADE;
DROP TABLE IF EXISTS payments               CASCADE;

-- ─── Old admin system (replaced by user_roles) ───────────────────
DROP TABLE IF EXISTS action_rollbacks       CASCADE;
DROP TABLE IF EXISTS admin_action_quotas    CASCADE;
DROP TABLE IF EXISTS admin_quota_configs    CASCADE;
DROP TABLE IF EXISTS admin_notes            CASCADE;
DROP TABLE IF EXISTS admin_permissions      CASCADE;
DROP TABLE IF EXISTS admin_user_roles       CASCADE;
DROP TABLE IF EXISTS admin_roles            CASCADE;
DROP TABLE IF EXISTS admin_actions          CASCADE;
DROP TABLE IF EXISTS admin_users            CASCADE;

-- ─── Casino multiplayer (feature removed) ────────────────────────
DROP TABLE IF EXISTS casino_chat            CASCADE;
DROP TABLE IF EXISTS casino_game_history    CASCADE;
DROP TABLE IF EXISTS casino_seats           CASCADE;
DROP TABLE IF EXISTS casino_tables          CASCADE;

-- ─── The Life player/economy leftovers ───────────────────────────
DROP TABLE IF EXISTS economy_transactions   CASCADE;
DROP TABLE IF EXISTS inventory_changes_log  CASCADE;
DROP TABLE IF EXISTS player_risk_scores     CASCADE;
DROP TABLE IF EXISTS player_sessions        CASCADE;
DROP TABLE IF EXISTS anticheat_rules        CASCADE;
DROP TABLE IF EXISTS api_rate_limits        CASCADE;

-- ─── Misc orphaned tables ─────────────────────────────────────────
DROP TABLE IF EXISTS security_alerts        CASCADE;
DROP TABLE IF EXISTS daily_sessions         CASCADE;
DROP TABLE IF EXISTS source_references      CASCADE;
DROP TABLE IF EXISTS moderation_logs        CASCADE;
DROP TABLE IF EXISTS penalty_king_snots     CASCADE;

-- ─── Verify: show any remaining tables you may want to review ─────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
