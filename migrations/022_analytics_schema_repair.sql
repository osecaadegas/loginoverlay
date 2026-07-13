-- Analytics schema repair and compatibility bridge.
-- Safely upgrades older live analytics tables to the current dashboard/API shape.

CREATE TABLE IF NOT EXISTS public.analytics_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  twitch_id TEXT,
  twitch_username TEXT,
  twitch_avatar TEXT,
  fingerprint TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_sessions INT NOT NULL DEFAULT 0,
  total_events INT NOT NULL DEFAULT 0,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.analytics_visitors
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS twitch_id TEXT,
  ADD COLUMN IF NOT EXISTS twitch_username TEXT,
  ADD COLUMN IF NOT EXISTS twitch_avatar TEXT,
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS total_sessions INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_events INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_visitors_fingerprint_unique
  ON public.analytics_visitors(fingerprint)
  WHERE fingerprint IS NOT NULL;

ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS visitor_id UUID,
  ADD COLUMN IF NOT EXISTS anonymous_id TEXT,
  ADD COLUMN IF NOT EXISTS session_token TEXT,
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS gpu_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_secs INT,
  ADD COLUMN IF NOT EXISTS page_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_bounce BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS risk_score SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS entry_route TEXT,
  ADD COLUMN IF NOT EXISTS last_route TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS visitor_id UUID,
  ADD COLUMN IF NOT EXISTS page_title TEXT,
  ADD COLUMN IF NOT EXISTS element_id TEXT,
  ADD COLUMN IF NOT EXISTS element_text TEXT,
  ADD COLUMN IF NOT EXISTS target_url TEXT,
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS event_name TEXT,
  ADD COLUMN IF NOT EXISTS event_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS anonymous_id TEXT,
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT,
  ADD COLUMN IF NOT EXISTS route TEXT,
  ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 1;

UPDATE public.analytics_sessions
SET
  created_at = COALESCE(created_at, started_at, now()),
  started_at = COALESCE(started_at, created_at, now()),
  last_seen_at = COALESCE(last_seen_at, ended_at, started_at, created_at, now()),
  ended_at = COALESCE(ended_at, last_seen_at),
  duration_secs = COALESCE(duration_secs, GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(last_seen_at, ended_at, started_at, created_at, now()) - COALESCE(started_at, created_at, now())))::INT)),
  entry_route = COALESCE(entry_route, landing_page),
  last_route = COALESCE(last_route, landing_page),
  experience = COALESCE(
    experience,
    CASE
      WHEN COALESCE(landing_page, entry_route, '') LIKE '/player%' THEN 'player'
      WHEN COALESCE(landing_page, entry_route, '') LIKE '/overlay-center%' OR COALESCE(landing_page, entry_route, '') LIKE '/overlay/%' THEN 'overlay'
      WHEN COALESCE(landing_page, entry_route, '') LIKE '/analytics%' OR COALESCE(landing_page, entry_route, '') LIKE '/admin%' THEN 'admin'
      WHEN COALESCE(landing_page, entry_route, '') LIKE '/offers%' OR COALESCE(landing_page, entry_route, '') LIKE '/premium%' THEN 'streamer'
      ELSE 'public'
    END
  );

WITH session_keys AS (
  SELECT
    id,
    user_id,
    COALESCE(NULLIF(device_fingerprint, ''), NULLIF(gpu_fingerprint, ''), NULLIF(session_token, ''), NULLIF(anonymous_id, ''), id::text) AS fingerprint_key,
    COALESCE(started_at, created_at, now()) AS first_seen_at,
    COALESCE(last_seen_at, ended_at, started_at, created_at, now()) AS last_seen_at,
    COALESCE(event_count, 0) AS event_count,
    COALESCE(is_suspicious, false) AS is_suspicious
  FROM public.analytics_sessions
), visitor_rollup AS (
  SELECT
    fingerprint_key,
    (array_agg(session_keys.user_id) FILTER (WHERE auth_user.id IS NOT NULL))[1] AS user_id,
    MIN(first_seen_at) AS first_seen_at,
    MAX(last_seen_at) AS last_seen_at,
    COUNT(*)::INT AS total_sessions,
    SUM(event_count)::INT AS total_events,
    BOOL_OR(is_suspicious) AS is_bot
  FROM session_keys
  LEFT JOIN auth.users auth_user ON auth_user.id = session_keys.user_id
  WHERE fingerprint_key IS NOT NULL
  GROUP BY fingerprint_key
)
INSERT INTO public.analytics_visitors (fingerprint, user_id, first_seen_at, last_seen_at, total_sessions, total_events, is_bot)
SELECT fingerprint_key, user_id, first_seen_at, last_seen_at, total_sessions, total_events, is_bot
FROM visitor_rollup
ON CONFLICT (fingerprint) WHERE fingerprint IS NOT NULL DO UPDATE SET
  user_id = COALESCE(public.analytics_visitors.user_id, EXCLUDED.user_id),
  first_seen_at = LEAST(public.analytics_visitors.first_seen_at, EXCLUDED.first_seen_at),
  last_seen_at = GREATEST(public.analytics_visitors.last_seen_at, EXCLUDED.last_seen_at),
  total_sessions = GREATEST(public.analytics_visitors.total_sessions, EXCLUDED.total_sessions),
  total_events = GREATEST(public.analytics_visitors.total_events, EXCLUDED.total_events),
  is_bot = public.analytics_visitors.is_bot OR EXCLUDED.is_bot;

UPDATE public.analytics_sessions session_row
SET visitor_id = visitor.id
FROM public.analytics_visitors visitor
WHERE session_row.visitor_id IS NULL
  AND visitor.fingerprint = COALESCE(NULLIF(session_row.device_fingerprint, ''), NULLIF(session_row.gpu_fingerprint, ''), NULLIF(session_row.session_token, ''), NULLIF(session_row.anonymous_id, ''), session_row.id::text);

UPDATE public.analytics_events event_row
SET
  visitor_id = COALESCE(event_row.visitor_id, session_row.visitor_id),
  event_name = COALESCE(event_row.event_name, event_row.metadata->>'canonical_event_name',
    CASE event_row.event_type
      WHEN 'pageview' THEN 'page_view'
      WHEN 'offer_click' THEN 'offer_clicked'
      WHEN 'button_click' THEN 'ui_button_clicked'
      WHEN 'click' THEN 'ui_button_clicked'
      WHEN 'external_link' THEN 'external_link_clicked'
      ELSE event_row.event_type
    END
  ),
  occurred_at = COALESCE(event_row.occurred_at, event_row.created_at, now()),
  route = COALESCE(event_row.route, event_row.page_url, event_row.metadata->>'route'),
  experience = COALESCE(event_row.experience, event_row.metadata->>'experience',
    CASE
      WHEN COALESCE(event_row.route, event_row.page_url, '') LIKE '/player%' THEN 'player'
      WHEN COALESCE(event_row.route, event_row.page_url, '') LIKE '/overlay-center%' OR COALESCE(event_row.route, event_row.page_url, '') LIKE '/overlay/%' THEN 'overlay'
      WHEN COALESCE(event_row.route, event_row.page_url, '') LIKE '/analytics%' OR COALESCE(event_row.route, event_row.page_url, '') LIKE '/admin%' THEN 'admin'
      WHEN COALESCE(event_row.route, event_row.page_url, '') LIKE '/offers%' OR COALESCE(event_row.route, event_row.page_url, '') LIKE '/premium%' THEN 'streamer'
      ELSE 'public'
    END
  ),
  properties = CASE WHEN event_row.properties = '{}'::jsonb THEN COALESCE(event_row.metadata, '{}'::jsonb) ELSE event_row.properties END,
  schema_version = COALESCE(event_row.schema_version, 1)
FROM public.analytics_sessions session_row
WHERE event_row.session_id = session_row.id;

UPDATE public.analytics_events event_row
SET
  event_name = COALESCE(event_name, metadata->>'canonical_event_name', event_type),
  occurred_at = COALESCE(occurred_at, created_at, now()),
  route = COALESCE(route, page_url, metadata->>'route'),
  properties = CASE WHEN properties = '{}'::jsonb THEN COALESCE(metadata, '{}'::jsonb) ELSE properties END,
  schema_version = COALESCE(schema_version, 1)
WHERE event_name IS NULL OR occurred_at IS NULL OR route IS NULL;

CREATE TABLE IF NOT EXISTS public.analytics_fraud_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  visitor_id UUID,
  ip_address TEXT,
  reason TEXT NOT NULL,
  rule_name TEXT NOT NULL DEFAULT 'legacy_flag',
  risk_score SMALLINT NOT NULL DEFAULT 0,
  event_count INT,
  time_window TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_fraud_logs
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS visitor_id UUID,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT 'legacy_flag',
  ADD COLUMN IF NOT EXISTS rule_name TEXT NOT NULL DEFAULT 'legacy_flag',
  ADD COLUMN IF NOT EXISTS risk_score SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_count INT,
  ADD COLUMN IF NOT EXISTS time_window TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.analytics_geo_cache (
  ip_address TEXT PRIMARY KEY,
  country TEXT,
  country_code TEXT,
  city TEXT,
  region TEXT,
  isp TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_geo_cache
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS isp TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.analytics_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_clicks_10s INT NOT NULL DEFAULT 15,
  max_same_offer_1m INT NOT NULL DEFAULT 5,
  max_sessions_ip_1h INT NOT NULL DEFAULT 10,
  min_pageviews_ratio NUMERIC(3,2) NOT NULL DEFAULT 0.10,
  risk_score_threshold SMALLINT NOT NULL DEFAULT 60,
  tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  geo_tracking BOOLEAN NOT NULL DEFAULT TRUE,
  ip_tracking BOOLEAN NOT NULL DEFAULT TRUE,
  retention_days INT NOT NULL DEFAULT 365,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_analytics_config_user UNIQUE (user_id)
);

ALTER TABLE public.analytics_config
  ADD COLUMN IF NOT EXISTS max_clicks_10s INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_same_offer_1m INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_sessions_ip_1h INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS min_pageviews_ratio NUMERIC(3,2) NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS risk_score_threshold SMALLINT NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS geo_tracking BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ip_tracking BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS retention_days INT NOT NULL DEFAULT 365,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.analytics_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_funnels
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Default funnel',
  ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.analytics_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_visitor_id UUID REFERENCES public.analytics_visitors(id) ON DELETE SET NULL,
  target_ip TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  deleted_count JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.analytics_deletion_requests
  ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_visitor_id UUID REFERENCES public.analytics_visitors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_ip TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_count JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF to_regclass('public.fraud_logs') IS NOT NULL THEN
    INSERT INTO public.analytics_fraud_logs (session_id, visitor_id, ip_address, reason, rule_name, risk_score, event_count, metadata, resolved, created_at)
    SELECT
      legacy.session_id,
      sessions.visitor_id,
      legacy.ip_address,
      legacy.reason,
      COALESCE(legacy.metadata->>'rule_name', 'legacy_flag'),
      COALESCE(legacy.risk_score, 0),
      CASE
        WHEN COALESCE(legacy.metadata->>'event_count', '') ~ '^[0-9]+$' THEN (legacy.metadata->>'event_count')::INT
        ELSE NULL
      END,
      COALESCE(legacy.metadata, '{}'::jsonb),
      COALESCE(legacy.resolved, false),
      COALESCE(legacy.created_at, now())
    FROM public.fraud_logs legacy
    LEFT JOIN public.analytics_sessions sessions ON sessions.id = legacy.session_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.analytics_fraud_logs target
      WHERE target.created_at = COALESCE(legacy.created_at, now())
        AND target.reason = legacy.reason
        AND target.session_id IS NOT DISTINCT FROM legacy.session_id
    );
  END IF;

  IF to_regclass('public.geo_cache') IS NOT NULL THEN
    INSERT INTO public.analytics_geo_cache (ip_address, country, country_code, city, region, isp, latitude, longitude, fetched_at)
    SELECT ip_address::text, country, country_code, city, region, isp, latitude, longitude, COALESCE(cached_at, now())
    FROM public.geo_cache
    ON CONFLICT (ip_address) DO UPDATE SET
      country = EXCLUDED.country,
      country_code = EXCLUDED.country_code,
      city = EXCLUDED.city,
      region = EXCLUDED.region,
      isp = EXCLUDED.isp,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      fetched_at = EXCLUDED.fetched_at;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_av_user_id ON public.analytics_visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_av_twitch_id ON public.analytics_visitors(twitch_id);
CREATE INDEX IF NOT EXISTS idx_as_visitor ON public.analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_as_user ON public.analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_as_ip ON public.analytics_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_as_started ON public.analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_as_country ON public.analytics_sessions(country_code);
CREATE INDEX IF NOT EXISTS idx_as_suspicious ON public.analytics_sessions(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX IF NOT EXISTS idx_ae_session ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ae_visitor ON public.analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_ae_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ae_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_offer ON public.analytics_events(offer_id) WHERE offer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ae_suspicious ON public.analytics_events(is_suspicious) WHERE is_suspicious = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_event_id ON public.analytics_events(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time ON public.analytics_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_experience_time ON public.analytics_events(experience, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_route_time ON public.analytics_events(route, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_experience_time ON public.analytics_sessions(experience, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_afl_session ON public.analytics_fraud_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_afl_ip ON public.analytics_fraud_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_afl_created ON public.analytics_fraud_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_afl_unresolved ON public.analytics_fraud_logs(resolved) WHERE resolved = FALSE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_sessions_visitor_id_fkey') THEN
    ALTER TABLE public.analytics_sessions
      ADD CONSTRAINT analytics_sessions_visitor_id_fkey
      FOREIGN KEY (visitor_id) REFERENCES public.analytics_visitors(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_events_visitor_id_fkey') THEN
    ALTER TABLE public.analytics_events
      ADD CONSTRAINT analytics_events_visitor_id_fkey
      FOREIGN KEY (visitor_id) REFERENCES public.analytics_visitors(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_fraud_logs_visitor_id_fkey') THEN
    ALTER TABLE public.analytics_fraud_logs
      ADD CONSTRAINT analytics_fraud_logs_visitor_id_fkey
      FOREIGN KEY (visitor_id) REFERENCES public.analytics_visitors(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

DROP VIEW IF EXISTS public.analytics_offer_click_daily;
DROP VIEW IF EXISTS public.analytics_product_daily;
DROP VIEW IF EXISTS public.analytics_geo_stats;
DROP VIEW IF EXISTS public.analytics_traffic_sources;
DROP VIEW IF EXISTS public.analytics_offer_stats;
DROP VIEW IF EXISTS public.analytics_daily_stats;

CREATE OR REPLACE VIEW public.analytics_daily_stats WITH (security_invoker = true) AS
SELECT
  date_trunc('day', s.started_at)::date AS day,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT s.visitor_id) AS unique_visitors,
  COUNT(DISTINCT CASE WHEN v.total_sessions > 1 THEN s.visitor_id END) AS returning_visitors,
  COUNT(DISTINCT CASE WHEN s.is_bounce THEN s.id END) AS bounced_sessions,
  AVG(s.duration_secs) FILTER (WHERE s.duration_secs IS NOT NULL) AS avg_duration,
  COUNT(DISTINCT CASE WHEN s.is_suspicious THEN s.id END) AS suspicious_sessions
FROM public.analytics_sessions s
LEFT JOIN public.analytics_visitors v ON v.id = s.visitor_id
GROUP BY 1;

CREATE OR REPLACE VIEW public.analytics_offer_stats WITH (security_invoker = true) AS
SELECT
  e.offer_id,
  COUNT(*) AS total_clicks,
  COUNT(*) FILTER (WHERE NOT e.is_suspicious) AS clean_clicks,
  COUNT(*) FILTER (WHERE e.is_suspicious) AS suspicious_clicks,
  COUNT(DISTINCT e.visitor_id) AS unique_clickers,
  COUNT(DISTINCT e.session_id) AS sessions_with_clicks,
  MIN(e.created_at) AS first_click,
  MAX(e.created_at) AS last_click
FROM public.analytics_events e
WHERE COALESCE(e.event_name, e.metadata->>'canonical_event_name', e.event_type) IN ('offer_clicked', 'offer_click')
  AND e.offer_id IS NOT NULL
GROUP BY e.offer_id;

CREATE OR REPLACE VIEW public.analytics_traffic_sources WITH (security_invoker = true) AS
SELECT
  COALESCE(s.referrer_source, 'direct') AS source,
  COUNT(*) AS sessions,
  COUNT(DISTINCT s.visitor_id) AS unique_visitors,
  AVG(s.duration_secs) FILTER (WHERE s.duration_secs IS NOT NULL) AS avg_duration,
  COUNT(*) FILTER (WHERE s.is_bounce) AS bounces
FROM public.analytics_sessions s
GROUP BY 1;

CREATE OR REPLACE VIEW public.analytics_geo_stats WITH (security_invoker = true) AS
SELECT
  COALESCE(s.country, 'Unknown') AS country,
  s.country_code,
  COUNT(*) AS sessions,
  COUNT(DISTINCT s.visitor_id) AS unique_visitors,
  COUNT(DISTINCT e.id) FILTER (WHERE COALESCE(e.event_name, e.metadata->>'canonical_event_name', e.event_type) IN ('ui_button_clicked', 'offer_clicked', 'external_link_clicked', 'click', 'button_click', 'offer_click')) AS clicks
FROM public.analytics_sessions s
LEFT JOIN public.analytics_events e ON e.session_id = s.id
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.analytics_product_daily WITH (security_invoker = true) AS
SELECT
  date_trunc('day', COALESCE(e.occurred_at, e.created_at))::date AS day,
  COALESCE(e.experience, e.metadata->>'experience', 'public') AS experience,
  COALESCE(e.event_name, e.metadata->>'canonical_event_name', e.event_type) AS event_name,
  COUNT(*) AS events,
  COUNT(DISTINCT e.visitor_id) AS visitors,
  COUNT(DISTINCT e.session_id) AS sessions
FROM public.analytics_events e
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW public.analytics_offer_click_daily WITH (security_invoker = true) AS
SELECT
  date_trunc('day', COALESCE(e.occurred_at, e.created_at))::date AS day,
  e.offer_id,
  COUNT(*) AS clicks,
  COUNT(DISTINCT e.visitor_id) AS unique_visitors,
  COUNT(*) FILTER (WHERE e.is_suspicious) AS suspicious_clicks
FROM public.analytics_events e
WHERE COALESCE(e.event_name, e.metadata->>'canonical_event_name', e.event_type) IN ('offer_clicked', 'offer_click')
  AND e.offer_id IS NOT NULL
GROUP BY 1, 2;

CREATE OR REPLACE FUNCTION public.analytics_increment_session(
  p_session_id UUID,
  p_is_pageview BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_sessions
  SET
    event_count = COALESCE(event_count, 0) + 1,
    page_count = COALESCE(page_count, 0) + CASE WHEN p_is_pageview THEN 1 ELSE 0 END,
    is_bounce = CASE WHEN COALESCE(page_count, 0) + CASE WHEN p_is_pageview THEN 1 ELSE 0 END > 1 THEN FALSE ELSE is_bounce END,
    ended_at = now(),
    last_seen_at = now(),
    duration_secs = GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(started_at, created_at, now())))::INT)
  WHERE id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_increment_visitor_events(
  p_visitor_id UUID,
  p_amount INT DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_visitors
  SET total_events = COALESCE(total_events, 0) + COALESCE(p_amount, 1),
      last_seen_at = now()
  WHERE id = p_visitor_id;
END;
$$;

ALTER TABLE public.analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_geo_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.analytics_visitors;
DROP POLICY IF EXISTS "Service role full access" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Service role full access" ON public.analytics_events;
DROP POLICY IF EXISTS "Service role full access" ON public.analytics_fraud_logs;
DROP POLICY IF EXISTS "Service role full access" ON public.analytics_geo_cache;
DROP POLICY IF EXISTS "Service role full access" ON public.analytics_config;
DROP POLICY IF EXISTS "Service role full access" ON public.analytics_funnels;
DROP POLICY IF EXISTS "Service role full access" ON public.analytics_deletion_requests;
DROP POLICY IF EXISTS "Service role manages analytics visitors" ON public.analytics_visitors;
DROP POLICY IF EXISTS "Service role manages analytics sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Service role manages analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Service role manages analytics fraud logs" ON public.analytics_fraud_logs;
DROP POLICY IF EXISTS "Service role manages analytics geo cache" ON public.analytics_geo_cache;
DROP POLICY IF EXISTS "Service role manages analytics config" ON public.analytics_config;
DROP POLICY IF EXISTS "Service role manages analytics funnels" ON public.analytics_funnels;
DROP POLICY IF EXISTS "Service role manages analytics deletion requests" ON public.analytics_deletion_requests;
DROP POLICY IF EXISTS "Admins can read analytics visitors" ON public.analytics_visitors;
DROP POLICY IF EXISTS "Admins can read analytics sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Admins can read analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can read analytics fraud logs" ON public.analytics_fraud_logs;
DROP POLICY IF EXISTS "Admins can read analytics deletion requests" ON public.analytics_deletion_requests;

CREATE POLICY "Service role manages analytics visitors" ON public.analytics_visitors FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages analytics sessions" ON public.analytics_sessions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages analytics events" ON public.analytics_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages analytics fraud logs" ON public.analytics_fraud_logs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages analytics geo cache" ON public.analytics_geo_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages analytics config" ON public.analytics_config FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages analytics funnels" ON public.analytics_funnels FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages analytics deletion requests" ON public.analytics_deletion_requests FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can read analytics visitors" ON public.analytics_visitors FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin') AND user_roles.is_active = true)
);
CREATE POLICY "Admins can read analytics sessions" ON public.analytics_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin') AND user_roles.is_active = true)
);
CREATE POLICY "Admins can read analytics events" ON public.analytics_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin') AND user_roles.is_active = true)
);
CREATE POLICY "Admins can read analytics fraud logs" ON public.analytics_fraud_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin') AND user_roles.is_active = true)
);
CREATE POLICY "Admins can read analytics deletion requests" ON public.analytics_deletion_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin') AND user_roles.is_active = true)
);