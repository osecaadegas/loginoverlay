-- Security Alerts Table - Active alerts for suspicious behavior
CREATE TABLE IF NOT EXISTS security_alerts (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_id UUID NOT NULL REFERENCES the_life_players(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Alert details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Evidence
  evidence JSONB,
  related_log_ids BIGINT[], -- array of game_logs.id
  
  -- Detection
  detection_rule_id INTEGER,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'false_positive', 'banned')),
  assigned_to INTEGER,
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER,
  resolution_notes TEXT,
  
  -- Actions taken
  auto_action_taken VARCHAR(100) DEFAULT 'none',
  
  CONSTRAINT fk_detection_rule FOREIGN KEY (detection_rule_id) REFERENCES anticheat_rules(id) ON DELETE SET NULL,
  CONSTRAINT fk_assigned_to FOREIGN KEY (assigned_to) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_resolved_by FOREIGN KEY (resolved_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_alerts_player_id ON security_alerts(player_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_alert_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_assigned_to ON security_alerts(assigned_to) WHERE assigned_to IS NOT NULL;

-- Comments
COMMENT ON TABLE security_alerts IS 'Real-time security alerts for suspicious player behavior';
COMMENT ON COLUMN security_alerts.confidence_score IS 'AI/rule confidence that this is actual cheating (0.00 to 1.00)';
COMMENT ON COLUMN security_alerts.auto_action_taken IS 'Automatic action taken by system: none, flagged, suspended, banned';
