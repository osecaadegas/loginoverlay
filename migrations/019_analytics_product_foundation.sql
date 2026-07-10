-- Analytics v2 product reporting foundation.
-- Additive migration: keeps existing analytics_events/event_type consumers working.

ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS anonymous_id TEXT,
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS entry_route TEXT,
  ADD COLUMN IF NOT EXISTS last_route TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS event_name TEXT,
  ADD COLUMN IF NOT EXISTS event_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS anonymous_id TEXT,
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT,
  ADD COLUMN IF NOT EXISTS route TEXT,
  ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 1;

UPDATE public.analytics_events
SET
  event_name = COALESCE(event_name, metadata->>'canonical_event_name', event_type),
  occurred_at = COALESCE(occurred_at, created_at),
  route = COALESCE(route, page_url),
  experience = COALESCE(experience, metadata->>'experience'),
  properties = CASE
    WHEN properties = '{}'::jsonb THEN COALESCE(metadata, '{}'::jsonb)
    ELSE properties
  END
WHERE event_name IS NULL
   OR occurred_at IS NULL
   OR route IS NULL
   OR experience IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_event_id
  ON public.analytics_events(event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time
  ON public.analytics_events(event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_experience_time
  ON public.analytics_events(experience, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_route_time
  ON public.analytics_events(route, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_experience_time
  ON public.analytics_sessions(experience, started_at DESC);

CREATE OR REPLACE VIEW public.analytics_product_daily
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', COALESCE(e.occurred_at, e.created_at))::date AS day,
  COALESCE(e.experience, e.metadata->>'experience', 'public') AS experience,
  COALESCE(e.event_name, e.metadata->>'canonical_event_name', e.event_type) AS event_name,
  COUNT(*) AS events,
  COUNT(DISTINCT e.visitor_id) AS visitors,
  COUNT(DISTINCT e.session_id) AS sessions
FROM public.analytics_events e
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW public.analytics_offer_click_daily
WITH (security_invoker = true) AS
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

CREATE POLICY "Service role manages analytics visitors"
  ON public.analytics_visitors FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages analytics sessions"
  ON public.analytics_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages analytics events"
  ON public.analytics_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages analytics fraud logs"
  ON public.analytics_fraud_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages analytics geo cache"
  ON public.analytics_geo_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages analytics config"
  ON public.analytics_config FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages analytics funnels"
  ON public.analytics_funnels FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages analytics deletion requests"
  ON public.analytics_deletion_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can read analytics visitors"
  ON public.analytics_visitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can read analytics sessions"
  ON public.analytics_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can read analytics fraud logs"
  ON public.analytics_fraud_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can read analytics deletion requests"
  ON public.analytics_deletion_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );
