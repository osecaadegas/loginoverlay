-- Player Sessions Table - Session tracking for device fingerprinting
CREATE TABLE IF NOT EXISTS player_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES the_life_players(id) ON DELETE CASCADE,
  
  -- Session info
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Device info
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  
  -- Geolocation
  country_code VARCHAR(2),
  city VARCHAR(100),
  
  -- Security flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  vpn_detected BOOLEAN DEFAULT FALSE,
  proxy_detected BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_sessions_player_id ON player_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_active ON player_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_player_sessions_device_fingerprint ON player_sessions(device_fingerprint) WHERE device_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_player_sessions_ip_address ON player_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_player_sessions_started_at ON player_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_sessions_suspicious ON player_sessions(is_suspicious) WHERE is_suspicious = TRUE;

-- Auto-update last activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_activity
  BEFORE UPDATE ON player_sessions
  FOR EACH ROW
  WHEN (OLD.is_active = TRUE AND NEW.is_active = TRUE)
  EXECUTE FUNCTION update_session_activity();

-- Comments
COMMENT ON TABLE player_sessions IS 'Track player sessions for device fingerprinting and multi-account detection';
COMMENT ON COLUMN player_sessions.device_fingerprint IS 'Hash of browser characteristics (canvas, WebGL, fonts, etc.)';
COMMENT ON COLUMN player_sessions.vpn_detected IS 'Whether VPN/proxy was detected for this session';
