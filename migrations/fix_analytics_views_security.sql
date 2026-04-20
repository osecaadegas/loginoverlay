-- ============================================================
-- Fix Analytics Views Security Settings
-- ============================================================
-- Issue: Views were defined without explicit security mode
-- Fix: Recreate views with SECURITY INVOKER to respect RLS
-- This ensures views use the permissions of the querying user,
-- not the view creator
-- ============================================================

-- Drop existing views first (in reverse dependency order)
DROP VIEW IF EXISTS analytics_geo_stats;
DROP VIEW IF EXISTS analytics_traffic_sources;
DROP VIEW IF EXISTS analytics_offer_stats;
DROP VIEW IF EXISTS analytics_daily_stats;

-- Recreate with SECURITY INVOKER
-- This ensures RLS policies are enforced for the querying user

-- Daily stats materialized for fast overview queries
CREATE OR REPLACE VIEW analytics_daily_stats
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', s.started_at)::DATE AS day,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT s.visitor_id) AS unique_visitors,
  COUNT(DISTINCT CASE WHEN v.total_sessions > 1 THEN s.visitor_id END) AS returning_visitors,
  COUNT(DISTINCT CASE WHEN s.is_bounce THEN s.id END) AS bounced_sessions,
  AVG(s.duration_secs) FILTER (WHERE s.duration_secs IS NOT NULL) AS avg_duration,
  COUNT(DISTINCT CASE WHEN s.is_suspicious THEN s.id END) AS suspicious_sessions
FROM analytics_sessions s
JOIN analytics_visitors v ON v.id = s.visitor_id
GROUP BY 1;

-- Offer performance summary
CREATE OR REPLACE VIEW analytics_offer_stats
WITH (security_invoker = true) AS
SELECT
  e.offer_id,
  COUNT(*) AS total_clicks,
  COUNT(*) FILTER (WHERE NOT e.is_suspicious) AS clean_clicks,
  COUNT(*) FILTER (WHERE e.is_suspicious) AS suspicious_clicks,
  COUNT(DISTINCT e.visitor_id) AS unique_clickers,
  COUNT(DISTINCT e.session_id) AS sessions_with_clicks,
  MIN(e.created_at) AS first_click,
  MAX(e.created_at) AS last_click
FROM analytics_events e
WHERE e.event_type IN ('offer_click', 'click') AND e.offer_id IS NOT NULL
GROUP BY e.offer_id;

-- Traffic source breakdown
CREATE OR REPLACE VIEW analytics_traffic_sources
WITH (security_invoker = true) AS
SELECT
  COALESCE(s.referrer_source, 'direct') AS source,
  COUNT(*) AS sessions,
  COUNT(DISTINCT s.visitor_id) AS unique_visitors,
  AVG(s.duration_secs) FILTER (WHERE s.duration_secs IS NOT NULL) AS avg_duration,
  COUNT(*) FILTER (WHERE s.is_bounce) AS bounces
FROM analytics_sessions s
GROUP BY 1;

-- Country breakdown
CREATE OR REPLACE VIEW analytics_geo_stats
WITH (security_invoker = true) AS
SELECT
  COALESCE(s.country, 'Unknown') AS country,
  s.country_code,
  COUNT(*) AS sessions,
  COUNT(DISTINCT s.visitor_id) AS unique_visitors,
  COUNT(DISTINCT e.id) FILTER (WHERE e.event_type = 'click') AS clicks
FROM analytics_sessions s
LEFT JOIN analytics_events e ON e.session_id = s.id
GROUP BY 1, 2;

-- ============================================================
-- Verification Query
-- ============================================================
-- Run this to verify the fix:
-- SELECT 
--   schemaname, 
--   viewname, 
--   viewowner,
--   CASE 
--     WHEN definition LIKE '%security_invoker%' THEN 'SECURITY INVOKER'
--     ELSE 'SECURITY DEFINER (default)'
--   END as security_mode
-- FROM pg_views 
-- WHERE viewname IN (
--   'analytics_daily_stats',
--   'analytics_offer_stats', 
--   'analytics_traffic_sources',
--   'analytics_geo_stats'
-- );
