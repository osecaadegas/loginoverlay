-- ═══════════════════════════════════════════════════════════════════
-- DROP ORPHANED TABLES (Round 4)
--
-- All tables below have zero references in src/ or api/.
-- Run in Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Slot system orphans ─────────────────────────────────────────
-- (slots, slot_providers, slot_requests, pending_slots KEPT — active)
DROP TABLE IF EXISTS detected_slots         CASCADE;
DROP TABLE IF EXISTS slot_audit_log         CASCADE;
DROP TABLE IF EXISTS slot_history           CASCADE;

-- ─── Providers table (old, replaced by slot_providers) ───────────
DROP TABLE IF EXISTS providers              CASCADE;

-- ─── Highlights / Rewards (features removed) ─────────────────────
DROP TABLE IF EXISTS stream_highlights      CASCADE;
DROP TABLE IF EXISTS reward_redemptions     CASCADE;
DROP TABLE IF EXISTS rewards                CASCADE;

-- ─── Theme / widget tables (superseded) ──────────────────────────
-- (overlay_themes, overlay_widgets, overlay_state, widget_state are KEPT — active)
DROP TABLE IF EXISTS user_themes            CASCADE;
DROP TABLE IF EXISTS widget_theme_overrides CASCADE;

-- ─── Verify: show remaining tables ───────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
