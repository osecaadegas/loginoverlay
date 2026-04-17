-- ============================================================
-- ANALYTICS SYSTEM — Full Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Analytics visitors (tracked users / anonymous sessions)
CREATE TABLE IF NOT EXISTS analytics_visitors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  twitch_id     TEXT,
  twitch_username TEXT,
  twitch_avatar TEXT,
  fingerprint   TEXT,                     -- browser fingerprint hash
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_sessions INT NOT NULL DEFAULT 0,
  total_events  INT NOT NULL DEFAULT 0,
  is_bot        BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_visitor_fingerprint UNIQUE (fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_av_user_id ON analytics_visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_av_twitch_id ON analytics_visitors(twitch_id);

-- 2. Analytics sessions
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    UUID NOT NULL REFERENCES analytics_visitors(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address    INET,
  user_agent    TEXT,
  browser       TEXT,
  os            TEXT,
  device_type   TEXT,                     -- desktop / mobile / tablet
  country       TEXT,
  country_code  TEXT,
  city          TEXT,
  region        TEXT,
  isp           TEXT,
  referrer      TEXT,
  referrer_source TEXT,                   -- direct / twitch / social / search / other
  landing_page  TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  duration_secs INT,
  page_count    INT NOT NULL DEFAULT 0,
  event_count   INT NOT NULL DEFAULT 0,
  is_bounce     BOOLEAN NOT NULL DEFAULT TRUE,
  risk_score    SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  is_suspicious BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_as_visitor ON analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_as_user ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_as_ip ON analytics_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_as_started ON analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_as_country ON analytics_sessions(country_code);
CREATE INDEX IF NOT EXISTS idx_as_suspicious ON analytics_sessions(is_suspicious) WHERE is_suspicious = TRUE;

-- 3. Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
  visitor_id    UUID NOT NULL REFERENCES analytics_visitors(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL,            -- pageview, click, offer_click, conversion, button_click, external_link
  page_url      TEXT,
  page_title    TEXT,
  offer_id      UUID,
  element_id    TEXT,                     -- CSS selector / button id
  element_text  TEXT,                     -- button label / link text
  target_url    TEXT,                     -- for external links
  metadata      JSONB DEFAULT '{}',
  ip_address    INET,
  country       TEXT,
  city          TEXT,
  is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ae_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ae_visitor ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_ae_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ae_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_offer ON analytics_events(offer_id) WHERE offer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ae_suspicious ON analytics_events(is_suspicious) WHERE is_suspicious = TRUE;

-- 4. Fraud logs
CREATE TABLE IF NOT EXISTS analytics_fraud_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES analytics_sessions(id) ON DELETE SET NULL,
  visitor_id    UUID REFERENCES analytics_visitors(id) ON DELETE SET NULL,
  ip_address    INET,
  reason        TEXT NOT NULL,
  rule_name     TEXT NOT NULL,            -- rapid_clicks, same_offer_spam, multi_session_ip, no_pageviews, bot_pattern
  risk_score    SMALLINT NOT NULL DEFAULT 0,
  event_count   INT,
  time_window   TEXT,                     -- '10s', '1m', '1h'
  metadata      JSONB DEFAULT '{}',
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afl_session ON analytics_fraud_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_afl_ip ON analytics_fraud_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_afl_created ON analytics_fraud_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_afl_unresolved ON analytics_fraud_logs(resolved) WHERE resolved = FALSE;

-- 5. Geo IP cache (avoid repeated API calls)
CREATE TABLE IF NOT EXISTS analytics_geo_cache (
  ip_address    INET PRIMARY KEY,
  country       TEXT,
  country_code  TEXT,
  city          TEXT,
  region        TEXT,
  isp           TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Analytics config (adjustable thresholds per streamer)
CREATE TABLE IF NOT EXISTS analytics_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Fraud thresholds
  max_clicks_10s   INT NOT NULL DEFAULT 15,
  max_same_offer_1m INT NOT NULL DEFAULT 5,
  max_sessions_ip_1h INT NOT NULL DEFAULT 10,
  min_pageviews_ratio NUMERIC(3,2) NOT NULL DEFAULT 0.10,  -- clicks with <10% pageviews = suspicious
  risk_score_threshold SMALLINT NOT NULL DEFAULT 60,
  -- Tracking settings
  tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  geo_tracking     BOOLEAN NOT NULL DEFAULT TRUE,
  ip_tracking      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_analytics_config_user UNIQUE (user_id)
);

-- 7. Funnel definitions (for custom funnels)
CREATE TABLE IF NOT EXISTS analytics_funnels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  steps         JSONB NOT NULL DEFAULT '[]',  -- [{event_type, page_url_pattern, label}]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Data deletion requests (GDPR)
CREATE TABLE IF NOT EXISTS analytics_deletion_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_visitor_id UUID REFERENCES analytics_visitors(id) ON DELETE SET NULL,
  target_ip     INET,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  deleted_count JSONB DEFAULT '{}'        -- {sessions: N, events: N, fraud_logs: N}
);

-- ============================================================
-- HELPER VIEWS for dashboard queries
-- ============================================================

-- Daily stats materialized for fast overview queries
CREATE OR REPLACE VIEW analytics_daily_stats AS
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
CREATE OR REPLACE VIEW analytics_offer_stats AS
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
CREATE OR REPLACE VIEW analytics_traffic_sources AS
SELECT
  COALESCE(s.referrer_source, 'direct') AS source,
  COUNT(*) AS sessions,
  COUNT(DISTINCT s.visitor_id) AS unique_visitors,
  AVG(s.duration_secs) FILTER (WHERE s.duration_secs IS NOT NULL) AS avg_duration,
  COUNT(*) FILTER (WHERE s.is_bounce) AS bounces
FROM analytics_sessions s
GROUP BY 1;

-- Country breakdown
CREATE OR REPLACE VIEW analytics_geo_stats AS
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
-- RLS Policies
-- ============================================================
ALTER TABLE analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_geo_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (API uses service role key)
-- Anon inserts allowed for tracking (via API proxy)
CREATE POLICY "Service role full access" ON analytics_visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON analytics_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON analytics_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON analytics_fraud_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON analytics_geo_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON analytics_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON analytics_funnels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON analytics_deletion_requests FOR ALL USING (true) WITH CHECK (true);
