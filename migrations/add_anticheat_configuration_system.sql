-- Anti-Cheat Configuration System
-- Allows runtime configuration of detection rules, thresholds, and feature flags

-- Configuration Categories Table
CREATE TABLE IF NOT EXISTS anticheat_config_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuration Settings Table
CREATE TABLE IF NOT EXISTS anticheat_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES anticheat_config_categories(id) ON DELETE CASCADE,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    last_modified_by UUID,
    last_modified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Whitelist (Trusted players exempt from certain checks)
CREATE TABLE IF NOT EXISTS anticheat_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES the_life_players(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    whitelisted_checks TEXT[] DEFAULT '{}', -- Array of check types to exempt
    added_by UUID NOT NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id)
);

-- IP Blacklist/Whitelist
CREATE TABLE IF NOT EXISTS anticheat_ip_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address INET NOT NULL,
    list_type TEXT NOT NULL CHECK (list_type IN ('blacklist', 'whitelist', 'watchlist')),
    reason TEXT NOT NULL,
    added_by UUID NOT NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ip_address, list_type)
);

-- Device Fingerprint Blacklist
CREATE TABLE IF NOT EXISTS anticheat_device_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_fingerprint TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    added_by UUID NOT NULL,
    associated_players UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Flags (Enable/disable anti-cheat features dynamically)
CREATE TABLE IF NOT EXISTS anticheat_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_name TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN DEFAULT true,
    description TEXT,
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_roles TEXT[] DEFAULT '{}', -- If empty, applies to all
    last_toggled_by UUID,
    last_toggled_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detection Thresholds (Configurable limits for various detections)
CREATE TABLE IF NOT EXISTS anticheat_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    threshold_name TEXT NOT NULL UNIQUE,
    threshold_value NUMERIC NOT NULL,
    threshold_unit TEXT, -- e.g., 'per_minute', 'per_hour', 'total'
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    last_modified_by UUID,
    last_modified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert Suppression Rules (Prevent alert fatigue)
CREATE TABLE IF NOT EXISTS anticheat_alert_suppression (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type TEXT NOT NULL,
    player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE,
    suppressed_until TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log for Configuration Changes
CREATE TABLE IF NOT EXISTS anticheat_config_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID NOT NULL,
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration categories
INSERT INTO anticheat_config_categories (name, description, display_order) VALUES
    ('detection', 'Detection rule parameters and thresholds', 1),
    ('rate_limiting', 'Rate limiting and velocity check settings', 2),
    ('risk_scoring', 'Risk score calculation parameters', 3),
    ('automated_actions', 'Automatic response system settings', 4),
    ('monitoring', 'Monitoring and alerting configuration', 5),
    ('security', 'Security hardening settings', 6),
    ('privacy', 'Privacy and data retention settings', 7)
ON CONFLICT (name) DO NOTHING;

-- Insert default configuration values
INSERT INTO anticheat_config (category_id, key, value, value_type, description, is_enabled)
SELECT 
    c.id,
    cfg.key,
    cfg.value,
    cfg.value_type,
    cfg.description,
    true
FROM anticheat_config_categories c
CROSS JOIN (
    VALUES
        -- Detection settings
        ('detection', 'velocity_check_enabled', 'true', 'boolean', 'Enable velocity checking for rapid actions'),
        ('detection', 'velocity_max_actions_per_minute', '30', 'number', 'Maximum actions allowed per minute'),
        ('detection', 'clock_drift_tolerance_seconds', '30', 'number', 'Allowed clock drift between client and server'),
        ('detection', 'multi_account_detection_enabled', 'true', 'boolean', 'Enable multi-account detection'),
        ('detection', 'bot_detection_enabled', 'true', 'boolean', 'Enable bot behavior detection'),
        ('detection', 'pattern_matching_enabled', 'true', 'boolean', 'Enable pattern-based detection'),
        
        -- Rate limiting
        ('rate_limiting', 'global_rate_limit_per_minute', '60', 'number', 'Global API rate limit per minute per player'),
        ('rate_limiting', 'crime_action_cooldown_seconds', '60', 'number', 'Cooldown between crime actions'),
        ('rate_limiting', 'transaction_rate_limit_per_minute', '20', 'number', 'Maximum transactions per minute'),
        ('rate_limiting', 'login_rate_limit_per_hour', '10', 'number', 'Maximum login attempts per hour'),
        
        -- Risk scoring
        ('risk_scoring', 'velocity_violation_points', '10', 'number', 'Points added per velocity violation'),
        ('risk_scoring', 'suspicious_money_points', '8', 'number', 'Points added per suspicious money gain'),
        ('risk_scoring', 'failed_validation_points', '5', 'number', 'Points added per failed validation'),
        ('risk_scoring', 'multi_account_points', '5', 'number', 'Points added per multi-account indicator'),
        ('risk_scoring', 'bot_behavior_points', '5', 'number', 'Points added per bot-like behavior'),
        ('risk_scoring', 'risk_decay_days', '30', 'number', 'Days for risk score to decay to 50%'),
        ('risk_scoring', 'low_risk_threshold', '20', 'number', 'Risk score threshold for low risk'),
        ('risk_scoring', 'medium_risk_threshold', '50', 'number', 'Risk score threshold for medium risk'),
        ('risk_scoring', 'high_risk_threshold', '80', 'number', 'Risk score threshold for high risk'),
        ('risk_scoring', 'critical_risk_threshold', '150', 'number', 'Risk score threshold for critical risk'),
        
        -- Automated actions
        ('automated_actions', 'auto_flag_enabled', 'true', 'boolean', 'Automatically flag high-risk players'),
        ('automated_actions', 'auto_flag_threshold', '150', 'number', 'Risk score for automatic flagging'),
        ('automated_actions', 'auto_temp_ban_enabled', 'false', 'boolean', 'Enable automatic temporary bans'),
        ('automated_actions', 'auto_temp_ban_threshold', '200', 'number', 'Risk score for automatic temp ban'),
        ('automated_actions', 'temp_ban_duration_hours', '24', 'number', 'Duration of automatic temporary ban'),
        ('automated_actions', 'rate_limit_aggressive_enabled', 'true', 'boolean', 'Enable aggressive rate limiting for high-risk players'),
        
        -- Monitoring
        ('monitoring', 'real_time_alerts_enabled', 'true', 'boolean', 'Enable real-time admin alerts'),
        ('monitoring', 'alert_severity_threshold', 'high', 'string', 'Minimum severity for admin alerts'),
        ('monitoring', 'log_retention_days', '90', 'number', 'Days to retain game logs'),
        ('monitoring', 'alert_retention_days', '365', 'number', 'Days to retain security alerts'),
        
        -- Security
        ('security', 'request_signing_enabled', 'true', 'boolean', 'Require signed requests'),
        ('security', 'nonce_expiry_minutes', '5', 'number', 'Expiry time for anti-replay nonces'),
        ('security', 'honeypot_enabled', 'true', 'boolean', 'Enable honeypot variables'),
        ('security', 'devtools_detection_enabled', 'true', 'boolean', 'Detect DevTools usage'),
        
        -- Privacy
        ('privacy', 'ip_pseudonymization_days', '30', 'number', 'Days before IP addresses are pseudonymized'),
        ('privacy', 'data_export_enabled', 'true', 'boolean', 'Allow players to export their data'),
        ('privacy', 'deletion_retention_days', '7', 'number', 'Days to retain data after deletion request')
) cfg(category_name, key, value, value_type, description)
WHERE c.name = cfg.category_name
ON CONFLICT (key) DO NOTHING;

-- Insert default feature flags
INSERT INTO anticheat_feature_flags (feature_name, is_enabled, description, rollout_percentage) VALUES
    ('anti_replay_protection', true, 'Request replay attack prevention', 100),
    ('device_fingerprinting', true, 'Browser fingerprint collection', 100),
    ('mouse_entropy_analysis', true, 'Mouse movement pattern analysis', 100),
    ('timing_variance_check', true, 'Action timing consistency checks', 100),
    ('inventory_state_machine', true, 'Strict inventory state transitions', 100),
    ('honeypot_variables', true, 'Fake variables to detect tampering', 100),
    ('aggressive_logging', false, 'Verbose logging for debugging', 0),
    ('shadow_ban', false, 'Shadow ban functionality (hide cheater from others)', 0)
ON CONFLICT (feature_name) DO NOTHING;

-- Insert default thresholds
INSERT INTO anticheat_thresholds (threshold_name, threshold_value, threshold_unit, severity, description) VALUES
    ('max_cash_per_crime', 50000, 'per_action', 'high', 'Maximum cash allowed from single crime'),
    ('max_level_gain_per_hour', 5, 'per_hour', 'high', 'Maximum level gains per hour'),
    ('max_inventory_items_per_minute', 10, 'per_minute', 'medium', 'Maximum inventory additions per minute'),
    ('max_failed_validations_per_hour', 10, 'per_hour', 'high', 'Failed validations before flagging'),
    ('max_concurrent_sessions', 3, 'total', 'medium', 'Maximum concurrent sessions per player'),
    ('min_action_interval_ms', 100, 'milliseconds', 'critical', 'Minimum time between actions (bot detection)'),
    ('max_money_transfer_per_day', 1000000, 'per_day', 'high', 'Maximum money transfer between players per day')
ON CONFLICT (threshold_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_anticheat_config_key ON anticheat_config(key) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_anticheat_config_category ON anticheat_config(category_id);
CREATE INDEX IF NOT EXISTS idx_anticheat_whitelist_player ON anticheat_whitelist(player_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_anticheat_ip_list_ip ON anticheat_ip_list(ip_address) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_anticheat_device_blacklist_fingerprint ON anticheat_device_blacklist(device_fingerprint) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_anticheat_feature_flags_enabled ON anticheat_feature_flags(feature_name) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_anticheat_alert_suppression_lookup ON anticheat_alert_suppression(alert_type, player_id, suppressed_until);

-- RLS Policies
ALTER TABLE anticheat_config_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE anticheat_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE anticheat_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE anticheat_ip_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE anticheat_device_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE anticheat_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE anticheat_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE anticheat_alert_suppression ENABLE ROW LEVEL SECURITY;
ALTER TABLE anticheat_config_audit ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to anticheat config" ON anticheat_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to categories" ON anticheat_config_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to whitelist" ON anticheat_whitelist FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ip_list" ON anticheat_ip_list FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to device_blacklist" ON anticheat_device_blacklist FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to feature_flags" ON anticheat_feature_flags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to thresholds" ON anticheat_thresholds FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to alert_suppression" ON anticheat_alert_suppression FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to config_audit" ON anticheat_config_audit FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read enabled configs and feature flags (for client-side checks)
CREATE POLICY "Authenticated read enabled config" ON anticheat_config FOR SELECT TO authenticated USING (is_enabled = true);
CREATE POLICY "Authenticated read enabled feature flags" ON anticheat_feature_flags FOR SELECT TO authenticated USING (is_enabled = true);

-- Function to get config value by key
CREATE OR REPLACE FUNCTION get_anticheat_config(config_key TEXT)
RETURNS JSONB AS $$
DECLARE
    config_value JSONB;
BEGIN
    SELECT value INTO config_value
    FROM anticheat_config
    WHERE key = config_key AND is_enabled = true;
    
    RETURN config_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if player is whitelisted
CREATE OR REPLACE FUNCTION is_player_whitelisted(p_player_id UUID, check_type TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    is_whitelisted BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM anticheat_whitelist
        WHERE player_id = p_player_id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (check_type IS NULL OR check_type = ANY(whitelisted_checks))
    ) INTO is_whitelisted;
    
    RETURN is_whitelisted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if IP is blacklisted
CREATE OR REPLACE FUNCTION is_ip_blacklisted(p_ip_address INET)
RETURNS BOOLEAN AS $$
DECLARE
    is_blacklisted BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM anticheat_ip_list
        WHERE ip_address = p_ip_address
        AND list_type = 'blacklist'
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO is_blacklisted;
    
    RETURN is_blacklisted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if device is blacklisted
CREATE OR REPLACE FUNCTION is_device_blacklisted(p_fingerprint TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_blacklisted BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM anticheat_device_blacklist
        WHERE device_fingerprint = p_fingerprint
        AND is_active = true
    ) INTO is_blacklisted;
    
    RETURN is_blacklisted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_enabled BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM anticheat_feature_flags
        WHERE feature_name = p_feature_name
        AND is_enabled = true
    ) INTO is_enabled;
    
    RETURN is_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to audit configuration changes
CREATE OR REPLACE FUNCTION audit_config_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.value IS DISTINCT FROM NEW.value THEN
        INSERT INTO anticheat_config_audit (config_key, old_value, new_value, changed_by)
        VALUES (NEW.key, OLD.value, NEW.value, NEW.last_modified_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER config_change_audit
AFTER UPDATE ON anticheat_config
FOR EACH ROW
EXECUTE FUNCTION audit_config_change();

COMMENT ON TABLE anticheat_config IS 'Central configuration for anti-cheat system parameters';
COMMENT ON TABLE anticheat_whitelist IS 'Players exempt from certain anti-cheat checks';
COMMENT ON TABLE anticheat_ip_list IS 'IP addresses blacklisted, whitelisted, or under watch';
COMMENT ON TABLE anticheat_device_blacklist IS 'Banned device fingerprints';
COMMENT ON TABLE anticheat_feature_flags IS 'Feature toggles for anti-cheat capabilities';
COMMENT ON TABLE anticheat_thresholds IS 'Configurable detection thresholds';
COMMENT ON TABLE anticheat_alert_suppression IS 'Temporary alert suppression to prevent spam';
COMMENT ON TABLE anticheat_config_audit IS 'Audit trail of configuration changes';
