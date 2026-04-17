-- Helper RPC for incrementing session counters atomically
CREATE OR REPLACE FUNCTION analytics_increment_session(
  p_session_id UUID,
  p_is_pageview BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE analytics_sessions
  SET
    event_count = event_count + 1,
    page_count = CASE WHEN p_is_pageview THEN page_count + 1 ELSE page_count END,
    is_bounce = CASE WHEN page_count + (CASE WHEN p_is_pageview THEN 1 ELSE 0 END) > 1 THEN FALSE ELSE is_bounce END,
    ended_at = now(),
    duration_secs = EXTRACT(EPOCH FROM (now() - started_at))::INT
  WHERE id = p_session_id;
END;
$$;

-- Helper RPC for incrementing visitor event count
CREATE OR REPLACE FUNCTION analytics_increment_visitor_events(
  p_visitor_id UUID,
  p_amount INT DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE analytics_visitors
  SET total_events = total_events + p_amount,
      last_seen_at = now()
  WHERE id = p_visitor_id;
END;
$$;
