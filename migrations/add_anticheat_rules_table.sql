-- Anti-Cheat Rules Table - Configurable detection rules
CREATE TABLE IF NOT EXISTS anticheat_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Rule logic
  rule_type VARCHAR(100) NOT NULL CHECK (rule_type IN ('rate_limit', 'threshold', 'pattern', 'comparison')),
  detection_config JSONB NOT NULL,
  
  -- Response configuration
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_action VARCHAR(50) DEFAULT 'flag' CHECK (auto_action IN ('flag', 'suspend', 'ban', 'none')),
  alert_threshold INTEGER DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER,
  
  -- Statistics
  trigger_count INTEGER DEFAULT 0,
  false_positive_count INTEGER DEFAULT 0,
  
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_anticheat_rules_rule_type ON anticheat_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_anticheat_rules_active ON anticheat_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_anticheat_rules_severity ON anticheat_rules(severity);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_anticheat_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_anticheat_rules_timestamp
  BEFORE UPDATE ON anticheat_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_anticheat_rules_updated_at();

-- Comments
COMMENT ON TABLE anticheat_rules IS 'Configurable detection rules for anti-cheat system';
COMMENT ON COLUMN anticheat_rules.detection_config IS 'Rule-specific configuration in JSON format (thresholds, patterns, etc.)';
COMMENT ON COLUMN anticheat_rules.alert_threshold IS 'Number of violations before triggering an alert';
COMMENT ON COLUMN anticheat_rules.trigger_count IS 'Total times this rule has been triggered';
COMMENT ON COLUMN anticheat_rules.false_positive_count IS 'Times this rule was marked as false positive';
