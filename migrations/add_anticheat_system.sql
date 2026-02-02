-- =====================================================
-- THE LIFE ANTI-CHEAT & DETECTION SYSTEM
-- Run this migration in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. SECURITY AUDIT LOG TABLE (Tamper-Proof)
-- =====================================================
CREATE TABLE IF NOT EXISTS the_life_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player_id UUID REFERENCES the_life_players(id) ON DELETE SET NULL,
  session_id TEXT,  -- Track across requests
  ip_address INET,
  user_agent TEXT,
  
  -- What
  event_type TEXT NOT NULL,  -- 'xp_gain', 'level_up', 'cash_change', 'action', 'anomaly', 'exploit_attempt'
  action_name TEXT NOT NULL,  -- 'crime', 'bank_transfer', 'item_use', 'pvp_attack', etc.
  endpoint TEXT,              -- API endpoint or RPC function called
  
  -- Values (before/after for audit trail)
  old_values JSONB DEFAULT '{}',
  new_values JSONB DEFAULT '{}',
  delta JSONB DEFAULT '{}',    -- Calculated changes
  
  -- Context
  request_data JSONB DEFAULT '{}',  -- Sanitized request parameters
  metadata JSONB DEFAULT '{}',       -- Additional context
  
  -- Flags
  severity TEXT DEFAULT 'info',  -- 'info', 'warning', 'critical', 'exploit'
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Redundant for tamper detection
  
  -- Integrity (tamper-proof chain)
  previous_hash TEXT,
  row_hash TEXT  -- Computed by trigger
);

-- Trigger to compute row_hash (since generated columns require immutable functions)
CREATE OR REPLACE FUNCTION compute_security_log_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.row_hash := encode(sha256(
    (COALESCE(NEW.user_id::TEXT, '') || 
     COALESCE(NEW.event_type, '') || 
     COALESCE(NEW.action_name, '') ||
     COALESCE(NEW.old_values::TEXT, '') ||
     COALESCE(NEW.new_values::TEXT, '') ||
     COALESCE(NEW.created_at::TEXT, '') ||
     COALESCE(NEW.previous_hash, 'GENESIS'))::BYTEA
  ), 'hex');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_security_log_hash ON the_life_security_logs;
CREATE TRIGGER trg_compute_security_log_hash
  BEFORE INSERT ON the_life_security_logs
  FOR EACH ROW
  EXECUTE FUNCTION compute_security_log_hash();

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON the_life_security_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON the_life_security_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_flagged ON the_life_security_logs(is_flagged, severity) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_security_logs_session ON the_life_security_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON the_life_security_logs(action_name, created_at DESC);

-- Enable RLS - only service role can write, nobody can delete
ALTER TABLE the_life_security_logs ENABLE ROW LEVEL SECURITY;

-- Nobody can select directly (use functions)
DROP POLICY IF EXISTS "No direct access to security logs" ON the_life_security_logs;
CREATE POLICY "No direct access to security logs" ON the_life_security_logs
    FOR ALL USING (false);


-- =====================================================
-- 2. PLAYER FLAGS & WATCHLIST TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS the_life_player_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES the_life_players(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Flag info
  flag_type TEXT NOT NULL,  -- 'suspicious', 'under_review', 'shadow_banned', 'banned', 'cleared'
  reason TEXT NOT NULL,
  evidence JSONB DEFAULT '{}',  -- Supporting data
  
  -- Auto-detection info
  detection_rule TEXT,  -- Which rule triggered this
  confidence_score NUMERIC(5,2),  -- 0-100
  
  -- Action taken
  action_taken TEXT,  -- 'none', 'warned', 'rewards_revoked', 'shadow_ban', 'full_ban'
  action_by UUID,  -- Admin who took action (NULL = automatic)
  action_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_flags_player ON the_life_player_flags(player_id, is_active);
CREATE INDEX IF NOT EXISTS idx_player_flags_type ON the_life_player_flags(flag_type, is_active);

ALTER TABLE the_life_player_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct access to player flags" ON the_life_player_flags;
CREATE POLICY "No direct access to player flags" ON the_life_player_flags FOR ALL USING (false);


-- =====================================================
-- 3. RATE LIMITING METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS the_life_player_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES the_life_players(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- XP Metrics
  xp_gained_total INTEGER DEFAULT 0,
  xp_gained_from_crimes INTEGER DEFAULT 0,
  xp_gained_from_items INTEGER DEFAULT 0,
  xp_gained_from_season_pass INTEGER DEFAULT 0,
  xp_gained_from_other INTEGER DEFAULT 0,
  
  -- Level Metrics
  levels_gained INTEGER DEFAULT 0,
  starting_level INTEGER,
  ending_level INTEGER,
  
  -- Action Counts
  crimes_attempted INTEGER DEFAULT 0,
  crimes_successful INTEGER DEFAULT 0,
  bank_transactions INTEGER DEFAULT 0,
  items_used INTEGER DEFAULT 0,
  pvp_attacks INTEGER DEFAULT 0,
  market_transactions INTEGER DEFAULT 0,
  
  -- Cash Flow
  cash_earned INTEGER DEFAULT 0,
  cash_spent INTEGER DEFAULT 0,
  cash_transferred INTEGER DEFAULT 0,
  
  -- Session Info
  session_count INTEGER DEFAULT 0,
  total_active_minutes INTEGER DEFAULT 0,
  first_action_at TIMESTAMPTZ,
  last_action_at TIMESTAMPTZ,
  
  -- Anomaly Tracking
  rate_limit_hits INTEGER DEFAULT 0,
  validation_failures INTEGER DEFAULT 0,
  suspicious_actions INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(player_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_player_metrics_date ON the_life_player_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_metrics_player ON the_life_player_metrics(player_id, metric_date DESC);

ALTER TABLE the_life_player_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct access to metrics" ON the_life_player_metrics;
CREATE POLICY "No direct access to metrics" ON the_life_player_metrics FOR ALL USING (false);


-- =====================================================
-- 4. HARD LIMITS CONFIGURATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS the_life_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_name TEXT UNIQUE NOT NULL,
  limit_type TEXT NOT NULL,  -- 'per_minute', 'per_hour', 'per_day', 'per_action'
  max_value INTEGER NOT NULL,
  action_on_exceed TEXT DEFAULT 'block',  -- 'block', 'flag', 'shadow_ban', 'log_only'
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default hard limits
INSERT INTO the_life_rate_limits (limit_name, limit_type, max_value, action_on_exceed, description) VALUES
  -- XP Limits
  ('xp_per_minute', 'per_minute', 500, 'flag', 'Max XP gain per minute'),
  ('xp_per_hour', 'per_hour', 10000, 'flag', 'Max XP gain per hour'),
  ('xp_per_day', 'per_day', 100000, 'block', 'Max XP gain per day'),
  
  -- Level Limits
  ('levels_per_hour', 'per_hour', 5, 'flag', 'Max levels gained per hour'),
  ('levels_per_day', 'per_day', 20, 'block', 'Max levels gained per day'),
  
  -- Action Rate Limits
  ('crimes_per_minute', 'per_minute', 20, 'block', 'Max crimes per minute'),
  ('crimes_per_hour', 'per_hour', 500, 'flag', 'Max crimes per hour'),
  ('bank_transfers_per_minute', 'per_minute', 10, 'block', 'Max bank transfers per minute'),
  ('items_used_per_minute', 'per_minute', 30, 'flag', 'Max items used per minute'),
  ('pvp_attacks_per_minute', 'per_minute', 5, 'block', 'Max PvP attacks per minute'),
  
  -- Cash Limits
  ('cash_earned_per_hour', 'per_hour', 10000000, 'flag', 'Max cash earned per hour'),
  ('cash_earned_per_day', 'per_day', 50000000, 'block', 'Max cash earned per day'),
  
  -- Session Limits
  ('actions_per_minute', 'per_minute', 60, 'block', 'Max total actions per minute'),
  ('api_calls_per_minute', 'per_minute', 120, 'block', 'Max API calls per minute')
ON CONFLICT (limit_name) DO NOTHING;


-- =====================================================
-- 5. CORE LOGGING FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_player_id UUID,
  p_event_type TEXT,
  p_action_name TEXT,
  p_old_values JSONB DEFAULT '{}',
  p_new_values JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info',
  p_flag_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_previous_hash TEXT;
  v_delta JSONB;
  v_session_id TEXT;
BEGIN
  -- Get previous hash for chain integrity
  SELECT row_hash INTO v_previous_hash
  FROM the_life_security_logs
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS';
  END IF;
  
  -- Calculate delta
  v_delta := jsonb_build_object(
    'xp_delta', COALESCE((p_new_values->>'xp')::INTEGER, 0) - COALESCE((p_old_values->>'xp')::INTEGER, 0),
    'cash_delta', COALESCE((p_new_values->>'cash')::INTEGER, 0) - COALESCE((p_old_values->>'cash')::INTEGER, 0),
    'level_delta', COALESCE((p_new_values->>'level')::INTEGER, 0) - COALESCE((p_old_values->>'level')::INTEGER, 0)
  );
  
  -- Generate session ID from JWT if available
  v_session_id := current_setting('request.jwt.claim.session_id', true);
  
  INSERT INTO the_life_security_logs (
    user_id, player_id, session_id,
    event_type, action_name,
    old_values, new_values, delta,
    metadata, severity,
    is_flagged, flag_reason,
    previous_hash
  ) VALUES (
    p_user_id, p_player_id, v_session_id,
    p_event_type, p_action_name,
    p_old_values, p_new_values, v_delta,
    p_metadata, p_severity,
    p_flag_reason IS NOT NULL, p_flag_reason,
    v_previous_hash
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


-- =====================================================
-- 6. METRIC UPDATE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_player_metrics(
  p_player_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_xp_gained INTEGER DEFAULT 0,
  p_cash_earned INTEGER DEFAULT 0,
  p_levels_gained INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO the_life_player_metrics (
    player_id, user_id, metric_date,
    xp_gained_total, cash_earned, levels_gained,
    first_action_at, last_action_at
  ) VALUES (
    p_player_id, p_user_id, CURRENT_DATE,
    p_xp_gained, p_cash_earned, p_levels_gained,
    NOW(), NOW()
  )
  ON CONFLICT (player_id, metric_date)
  DO UPDATE SET
    xp_gained_total = the_life_player_metrics.xp_gained_total + p_xp_gained,
    cash_earned = the_life_player_metrics.cash_earned + p_cash_earned,
    levels_gained = the_life_player_metrics.levels_gained + p_levels_gained,
    last_action_at = NOW(),
    updated_at = NOW(),
    -- Increment action counters based on type
    crimes_attempted = CASE WHEN p_action_type = 'crime' 
      THEN the_life_player_metrics.crimes_attempted + 1 
      ELSE the_life_player_metrics.crimes_attempted END,
    bank_transactions = CASE WHEN p_action_type = 'bank' 
      THEN the_life_player_metrics.bank_transactions + 1 
      ELSE the_life_player_metrics.bank_transactions END,
    items_used = CASE WHEN p_action_type = 'item' 
      THEN the_life_player_metrics.items_used + 1 
      ELSE the_life_player_metrics.items_used END,
    pvp_attacks = CASE WHEN p_action_type = 'pvp' 
      THEN the_life_player_metrics.pvp_attacks + 1 
      ELSE the_life_player_metrics.pvp_attacks END;
END;
$$;


-- =====================================================
-- 7. HARD LIMIT CHECK FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_player_id UUID,
  p_limit_name TEXT,
  p_current_value INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit RECORD;
  v_current_total INTEGER;
  v_time_window INTERVAL;
  v_exceeded BOOLEAN := false;
  v_action TEXT;
BEGIN
  -- Get limit configuration
  SELECT * INTO v_limit
  FROM the_life_rate_limits
  WHERE limit_name = p_limit_name AND is_active = true;
  
  IF v_limit IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'limit_name', p_limit_name);
  END IF;
  
  -- Determine time window
  v_time_window := CASE v_limit.limit_type
    WHEN 'per_minute' THEN INTERVAL '1 minute'
    WHEN 'per_hour' THEN INTERVAL '1 hour'
    WHEN 'per_day' THEN INTERVAL '1 day'
    ELSE INTERVAL '1 hour'
  END;
  
  -- Count recent actions
  SELECT COUNT(*) INTO v_current_total
  FROM the_life_security_logs
  WHERE user_id = p_user_id
    AND action_name = SPLIT_PART(p_limit_name, '_per_', 1)
    AND created_at > NOW() - v_time_window;
  
  v_exceeded := (v_current_total + p_current_value) > v_limit.max_value;
  
  IF v_exceeded THEN
    -- Log the rate limit hit
    PERFORM log_security_event(
      p_user_id, p_player_id,
      'rate_limit_exceeded', p_limit_name,
      jsonb_build_object('current_total', v_current_total),
      jsonb_build_object('attempted_value', p_current_value),
      jsonb_build_object('max_allowed', v_limit.max_value, 'time_window', v_limit.limit_type),
      'warning',
      'Rate limit exceeded: ' || p_limit_name
    );
    
    -- Update metrics
    UPDATE the_life_player_metrics
    SET rate_limit_hits = rate_limit_hits + 1, updated_at = NOW()
    WHERE player_id = p_player_id AND metric_date = CURRENT_DATE;
    
    -- Take action based on configuration
    IF v_limit.action_on_exceed = 'flag' THEN
      PERFORM flag_player(p_player_id, p_user_id, 'suspicious', 
        'Rate limit exceeded: ' || p_limit_name, 
        jsonb_build_object('limit', p_limit_name, 'value', v_current_total));
    ELSIF v_limit.action_on_exceed = 'shadow_ban' THEN
      PERFORM flag_player(p_player_id, p_user_id, 'shadow_banned', 
        'Auto shadow-banned for rate limit abuse: ' || p_limit_name,
        jsonb_build_object('limit', p_limit_name, 'value', v_current_total));
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', NOT (v_exceeded AND v_limit.action_on_exceed = 'block'),
    'exceeded', v_exceeded,
    'current_total', v_current_total,
    'max_allowed', v_limit.max_value,
    'limit_name', p_limit_name,
    'action', CASE WHEN v_exceeded THEN v_limit.action_on_exceed ELSE 'none' END
  );
END;
$$;


-- =====================================================
-- 8. FLAG PLAYER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION flag_player(
  p_player_id UUID,
  p_user_id UUID,
  p_flag_type TEXT,
  p_reason TEXT,
  p_evidence JSONB DEFAULT '{}',
  p_detection_rule TEXT DEFAULT NULL,
  p_confidence NUMERIC DEFAULT 50
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flag_id UUID;
  v_existing_flag UUID;
BEGIN
  -- Check if similar active flag exists
  SELECT id INTO v_existing_flag
  FROM the_life_player_flags
  WHERE player_id = p_player_id
    AND flag_type = p_flag_type
    AND is_active = true
    AND created_at > NOW() - INTERVAL '24 hours';
  
  IF v_existing_flag IS NOT NULL THEN
    -- Update existing flag with additional evidence
    UPDATE the_life_player_flags
    SET evidence = evidence || p_evidence,
        confidence_score = GREATEST(confidence_score, p_confidence),
        updated_at = NOW()
    WHERE id = v_existing_flag;
    RETURN v_existing_flag;
  END IF;
  
  -- Create new flag
  INSERT INTO the_life_player_flags (
    player_id, user_id, flag_type, reason,
    evidence, detection_rule, confidence_score
  ) VALUES (
    p_player_id, p_user_id, p_flag_type, p_reason,
    p_evidence, p_detection_rule, p_confidence
  )
  RETURNING id INTO v_flag_id;
  
  -- Log the flag
  PERFORM log_security_event(
    p_user_id, p_player_id,
    'player_flagged', p_flag_type,
    '{}'::JSONB,
    jsonb_build_object('flag_id', v_flag_id, 'reason', p_reason),
    p_evidence,
    CASE 
      WHEN p_flag_type = 'shadow_banned' THEN 'critical'
      WHEN p_flag_type = 'banned' THEN 'exploit'
      ELSE 'warning'
    END,
    p_reason
  );
  
  RETURN v_flag_id;
END;
$$;


-- =====================================================
-- 9. CHECK IF PLAYER IS FLAGGED/BANNED
-- =====================================================
CREATE OR REPLACE FUNCTION is_player_allowed(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_flag RECORD;
BEGIN
  -- Get player
  SELECT * INTO v_player
  FROM the_life_players
  WHERE user_id = p_user_id;
  
  IF v_player IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_player');
  END IF;
  
  -- Check for active bans
  SELECT * INTO v_flag
  FROM the_life_player_flags
  WHERE player_id = v_player.id
    AND flag_type IN ('banned', 'shadow_banned')
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_flag IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', v_flag.flag_type = 'shadow_banned',  -- Shadow ban allows actions but no rewards
      'shadow_banned', v_flag.flag_type = 'shadow_banned',
      'banned', v_flag.flag_type = 'banned',
      'reason', v_flag.reason,
      'flag_id', v_flag.id
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'reason', 'clean');
END;
$$;


-- =====================================================
-- 10. ANOMALY DETECTION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION detect_anomalies(p_player_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_metrics RECORD;
  v_avg_metrics RECORD;
  v_anomalies JSONB := '[]'::JSONB;
  v_severity TEXT := 'info';
BEGIN
  -- Get player data
  SELECT * INTO v_player FROM the_life_players WHERE id = p_player_id;
  
  -- Get today's metrics
  SELECT * INTO v_metrics
  FROM the_life_player_metrics
  WHERE player_id = p_player_id AND metric_date = CURRENT_DATE;
  
  -- Get average metrics for all players (baseline)
  SELECT 
    AVG(xp_gained_total) as avg_xp,
    AVG(crimes_attempted) as avg_crimes,
    AVG(levels_gained) as avg_levels,
    STDDEV(xp_gained_total) as stddev_xp,
    STDDEV(crimes_attempted) as stddev_crimes
  INTO v_avg_metrics
  FROM the_life_player_metrics
  WHERE metric_date = CURRENT_DATE;
  
  IF v_metrics IS NULL OR v_avg_metrics IS NULL THEN
    RETURN jsonb_build_object('anomalies', '[]'::JSONB, 'severity', 'info');
  END IF;
  
  -- Check for XP anomaly (more than 3 standard deviations)
  IF v_avg_metrics.stddev_xp > 0 AND 
     v_metrics.xp_gained_total > (v_avg_metrics.avg_xp + 3 * v_avg_metrics.stddev_xp) THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'xp_outlier',
      'value', v_metrics.xp_gained_total,
      'expected', v_avg_metrics.avg_xp,
      'stddev', v_avg_metrics.stddev_xp,
      'z_score', (v_metrics.xp_gained_total - v_avg_metrics.avg_xp) / v_avg_metrics.stddev_xp
    );
    v_severity := 'warning';
  END IF;
  
  -- Check for impossible XP/Crime ratio (legitimate play ~50-200 XP per crime)
  IF v_metrics.crimes_attempted > 10 THEN
    DECLARE
      v_xp_per_crime NUMERIC;
    BEGIN
      v_xp_per_crime := v_metrics.xp_gained_total::NUMERIC / v_metrics.crimes_attempted;
      IF v_xp_per_crime > 500 THEN  -- Impossible ratio
        v_anomalies := v_anomalies || jsonb_build_object(
          'type', 'impossible_xp_ratio',
          'xp_per_crime', v_xp_per_crime,
          'expected_max', 500,
          'crimes', v_metrics.crimes_attempted,
          'xp', v_metrics.xp_gained_total
        );
        v_severity := 'critical';
      END IF;
    END;
  END IF;
  
  -- Check for level vs robbery mismatch
  IF v_player.level > 50 AND v_player.total_robberies < v_player.level * 5 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'level_robbery_mismatch',
      'level', v_player.level,
      'total_robberies', v_player.total_robberies,
      'expected_min_robberies', v_player.level * 10,
      'ratio', v_player.total_robberies::NUMERIC / v_player.level
    );
    v_severity := 'critical';
  END IF;
  
  -- Check for rapid level gain (more than 10 levels in an hour)
  DECLARE
    v_levels_last_hour INTEGER;
  BEGIN
    SELECT COALESCE(SUM((delta->>'level_delta')::INTEGER), 0) INTO v_levels_last_hour
    FROM the_life_security_logs
    WHERE user_id = p_user_id
      AND event_type = 'level_up'
      AND created_at > NOW() - INTERVAL '1 hour';
    
    IF v_levels_last_hour > 10 THEN
      v_anomalies := v_anomalies || jsonb_build_object(
        'type', 'rapid_leveling',
        'levels_last_hour', v_levels_last_hour,
        'max_expected', 10
      );
      v_severity := 'critical';
    END IF;
  END;
  
  -- Check for bot-like behavior (consistent timing between actions)
  DECLARE
    v_action_intervals NUMERIC[];
    v_avg_interval NUMERIC;
    v_stddev_interval NUMERIC;
  BEGIN
    SELECT ARRAY_AGG(interval_ms) INTO v_action_intervals
    FROM (
      SELECT EXTRACT(MILLISECONDS FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) as interval_ms
      FROM the_life_security_logs
      WHERE user_id = p_user_id
        AND created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY created_at
      LIMIT 50
    ) intervals
    WHERE interval_ms IS NOT NULL AND interval_ms > 0;
    
    IF array_length(v_action_intervals, 1) > 20 THEN
      SELECT AVG(x), STDDEV(x) INTO v_avg_interval, v_stddev_interval
      FROM unnest(v_action_intervals) x;
      
      -- Bot-like: very low standard deviation (too consistent)
      IF v_stddev_interval < v_avg_interval * 0.1 THEN
        v_anomalies := v_anomalies || jsonb_build_object(
          'type', 'bot_like_timing',
          'avg_interval_ms', v_avg_interval,
          'stddev_ms', v_stddev_interval,
          'consistency_ratio', v_stddev_interval / NULLIF(v_avg_interval, 0)
        );
        v_severity := 'critical';
      END IF;
    END IF;
  END;
  
  -- If anomalies found, flag the player
  IF jsonb_array_length(v_anomalies) > 0 THEN
    PERFORM flag_player(
      p_player_id, p_user_id,
      CASE WHEN v_severity = 'critical' THEN 'under_review' ELSE 'suspicious' END,
      'Anomaly detection triggered',
      v_anomalies,
      'detect_anomalies',
      CASE WHEN v_severity = 'critical' THEN 90 ELSE 60 END
    );
  END IF;
  
  RETURN jsonb_build_object(
    'anomalies', v_anomalies,
    'severity', v_severity,
    'count', jsonb_array_length(v_anomalies)
  );
END;
$$;


-- =====================================================
-- 11. ENHANCED CRIME EXECUTION WITH ANTI-CHEAT
-- =====================================================
CREATE OR REPLACE FUNCTION execute_crime_secure(
  p_crime_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_old_player RECORD;
  v_allowed JSONB;
  v_rate_check JSONB;
  v_crime_result JSONB;
  v_log_id UUID;
BEGIN
  -- 1. Check if player is allowed to play
  v_allowed := is_player_allowed(auth.uid());
  IF NOT (v_allowed->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account restricted');
  END IF;
  
  -- 2. Check rate limits
  SELECT * INTO v_player FROM the_life_players WHERE user_id = auth.uid();
  
  v_rate_check := check_rate_limit(auth.uid(), v_player.id, 'crimes_per_minute');
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Slow down!');
  END IF;
  
  v_rate_check := check_rate_limit(auth.uid(), v_player.id, 'actions_per_minute');
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many actions. Please wait.');
  END IF;
  
  -- 3. Store old values for logging
  v_old_player := v_player;
  
  -- 4. Execute the crime (using existing function)
  v_crime_result := execute_crime_rate_limited(p_crime_id);
  
  -- 5. Get new player state
  SELECT * INTO v_player FROM the_life_players WHERE user_id = auth.uid();
  
  -- 6. Log the action
  v_log_id := log_security_event(
    auth.uid(), v_player.id,
    CASE WHEN (v_crime_result->>'crime_success')::BOOLEAN THEN 'xp_gain' ELSE 'action' END,
    'crime',
    jsonb_build_object('xp', v_old_player.xp, 'cash', v_old_player.cash, 'level', v_old_player.level),
    jsonb_build_object('xp', v_player.xp, 'cash', v_player.cash, 'level', v_player.level),
    jsonb_build_object('crime_id', p_crime_id, 'result', v_crime_result),
    'info',
    NULL
  );
  
  -- 7. Update metrics
  PERFORM update_player_metrics(
    v_player.id, auth.uid(), 'crime',
    COALESCE((v_crime_result->>'xp_gained')::INTEGER, 0),
    COALESCE((v_crime_result->>'reward')::INTEGER, 0),
    v_player.level - v_old_player.level
  );
  
  -- 8. Check for anomalies (async in production, inline for demo)
  IF v_player.level - v_old_player.level > 0 THEN
    PERFORM detect_anomalies(v_player.id, auth.uid());
  END IF;
  
  -- 9. If shadow banned, reduce rewards
  IF (v_allowed->>'shadow_banned')::BOOLEAN THEN
    -- Silently reduce rewards by 90%
    IF (v_crime_result->>'crime_success')::BOOLEAN THEN
      UPDATE the_life_players
      SET cash = cash - FLOOR((v_crime_result->>'reward')::INTEGER * 0.9),
          xp = xp - FLOOR((v_crime_result->>'xp_gained')::INTEGER * 0.9)
      WHERE user_id = auth.uid();
    END IF;
  END IF;
  
  RETURN v_crime_result;
END;
$$;

GRANT EXECUTE ON FUNCTION execute_crime_secure(UUID) TO authenticated;


-- =====================================================
-- 12. ADMIN QUERY FUNCTIONS
-- =====================================================

-- Get suspicious players
CREATE OR REPLACE FUNCTION admin_get_suspicious_players(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  player_id UUID,
  user_id UUID,
  se_username TEXT,
  level INTEGER,
  total_robberies INTEGER,
  flag_count BIGINT,
  latest_flag_type TEXT,
  latest_flag_reason TEXT,
  anomaly_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin (implement your admin check)
  -- IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  
  RETURN QUERY
  SELECT 
    p.id as player_id,
    p.user_id,
    sec.se_username,  -- Get SE username from streamelements_connections
    p.level,
    p.total_robberies,
    COUNT(f.id) as flag_count,
    (SELECT flag_type FROM the_life_player_flags WHERE player_id = p.id ORDER BY created_at DESC LIMIT 1),
    (SELECT reason FROM the_life_player_flags WHERE player_id = p.id ORDER BY created_at DESC LIMIT 1),
    COALESCE(
      (p.level::NUMERIC / NULLIF(p.total_robberies, 0)::NUMERIC) * 100 +
      COUNT(f.id) * 10,
      0
    ) as anomaly_score
  FROM the_life_players p
  LEFT JOIN streamelements_connections sec ON sec.user_id = p.user_id
  LEFT JOIN the_life_player_flags f ON f.player_id = p.id AND f.is_active = true
  WHERE p.level > 20 OR EXISTS (SELECT 1 FROM the_life_player_flags WHERE player_id = p.id AND is_active = true)
  GROUP BY p.id, sec.se_username
  ORDER BY anomaly_score DESC
  LIMIT p_limit;
END;
$$;


-- Get player activity timeline
CREATE OR REPLACE FUNCTION admin_get_player_timeline(
  p_player_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  event_time TIMESTAMPTZ,
  event_type TEXT,
  action_name TEXT,
  xp_delta INTEGER,
  cash_delta INTEGER,
  level_delta INTEGER,
  severity TEXT,
  is_flagged BOOLEAN,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.created_at,
    l.event_type,
    l.action_name,
    COALESCE((l.delta->>'xp_delta')::INTEGER, 0),
    COALESCE((l.delta->>'cash_delta')::INTEGER, 0),
    COALESCE((l.delta->>'level_delta')::INTEGER, 0),
    l.severity,
    l.is_flagged,
    l.metadata
  FROM the_life_security_logs l
  WHERE l.player_id = p_player_id
    AND l.created_at > NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY l.created_at DESC;
END;
$$;


-- Find exploit source
CREATE OR REPLACE FUNCTION admin_find_exploit_source(p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_total_logged_xp INTEGER;
  v_xp_sources JSONB;
  v_suspicious_events JSONB;
BEGIN
  SELECT * INTO v_player FROM the_life_players WHERE id = p_player_id;
  
  -- Sum all logged XP gains
  SELECT COALESCE(SUM((delta->>'xp_delta')::INTEGER), 0) INTO v_total_logged_xp
  FROM the_life_security_logs
  WHERE player_id = p_player_id AND (delta->>'xp_delta')::INTEGER > 0;
  
  -- Get XP by source
  SELECT jsonb_object_agg(action_name, total_xp) INTO v_xp_sources
  FROM (
    SELECT action_name, SUM((delta->>'xp_delta')::INTEGER) as total_xp
    FROM the_life_security_logs
    WHERE player_id = p_player_id AND (delta->>'xp_delta')::INTEGER > 0
    GROUP BY action_name
  ) sources;
  
  -- Find suspicious events (large XP gains)
  SELECT jsonb_agg(row_to_json(t)) INTO v_suspicious_events
  FROM (
    SELECT created_at, action_name, delta, metadata, severity
    FROM the_life_security_logs
    WHERE player_id = p_player_id 
      AND ((delta->>'xp_delta')::INTEGER > 1000 OR severity IN ('warning', 'critical', 'exploit'))
    ORDER BY created_at DESC
    LIMIT 50
  ) t;
  
  RETURN jsonb_build_object(
    'player_level', v_player.level,
    'player_xp', v_player.xp,
    'expected_total_xp', (v_player.level - 1) * 50 + v_player.xp,  -- Rough estimate
    'total_logged_xp', v_total_logged_xp,
    'xp_discrepancy', ((v_player.level - 1) * 50 + v_player.xp) - v_total_logged_xp,
    'xp_by_source', v_xp_sources,
    'total_robberies', v_player.total_robberies,
    'suspicious_events', v_suspicious_events,
    'likely_exploited', v_total_logged_xp < ((v_player.level - 1) * 50 + v_player.xp) * 0.5
  );
END;
$$;


-- =====================================================
-- 13. SCHEDULED ANOMALY SCAN (Run via pg_cron or external)
-- =====================================================
CREATE OR REPLACE FUNCTION scheduled_anomaly_scan()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_flagged_count INTEGER := 0;
  v_scanned_count INTEGER := 0;
BEGIN
  -- Scan all active players from today
  FOR v_player IN 
    SELECT DISTINCT p.id, p.user_id
    FROM the_life_players p
    JOIN the_life_player_metrics m ON m.player_id = p.id
    WHERE m.metric_date = CURRENT_DATE
      AND m.xp_gained_total > 1000  -- Only check active players
  LOOP
    PERFORM detect_anomalies(v_player.id, v_player.user_id);
    v_scanned_count := v_scanned_count + 1;
  END LOOP;
  
  SELECT COUNT(*) INTO v_flagged_count
  FROM the_life_player_flags
  WHERE created_at > NOW() - INTERVAL '1 hour' AND is_active = true;
  
  RETURN jsonb_build_object(
    'scanned', v_scanned_count,
    'flagged_last_hour', v_flagged_count,
    'scan_time', NOW()
  );
END;
$$;


-- =====================================================
-- 14. INTEGRITY CHECK FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION verify_log_integrity(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log RECORD;
  v_prev_hash TEXT := 'GENESIS';
  v_expected_hash TEXT;
  v_tampered_count INTEGER := 0;
  v_total_count INTEGER := 0;
BEGIN
  FOR v_log IN 
    SELECT * FROM the_life_security_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    ORDER BY created_at ASC
  LOOP
    v_total_count := v_total_count + 1;
    
    -- Verify chain
    IF v_log.previous_hash != v_prev_hash THEN
      v_tampered_count := v_tampered_count + 1;
    END IF;
    
    v_prev_hash := v_log.row_hash;
  END LOOP;
  
  RETURN jsonb_build_object(
    'total_logs', v_total_count,
    'tampered_logs', v_tampered_count,
    'integrity_valid', v_tampered_count = 0,
    'checked_at', NOW()
  );
END;
$$;
