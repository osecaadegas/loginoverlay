-- Insert Default Anti-Cheat Rules
-- These rules will be active immediately to protect the game

-- Rule 1: Abnormal Money Gain
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'abnormal_money_gain',
  'Detects players gaining money at impossible rates indicating exploitation or hacking',
  'threshold',
  '{
    "field": "money_gained",
    "time_windows": [
      {"duration_seconds": 60, "max_gain": 100000},
      {"duration_seconds": 300, "max_gain": 500000},
      {"duration_seconds": 3600, "max_gain": 2000000}
    ],
    "comparison": "greater_than"
  }'::jsonb,
  'high',
  'suspend',
  1
) ON CONFLICT (rule_name) DO NOTHING;

-- Rule 2: Rapid Action Execution (Bot Detection)
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'rapid_action_execution',
  'Detects bots, macros, or auto-clickers by monitoring action timing patterns',
  'rate_limit',
  '{
    "actions_monitored": ["commit_crime", "use_item", "craft_item", "train_stat"],
    "max_count": 10,
    "window_seconds": 60,
    "min_interval_ms": 500
  }'::jsonb,
  'high',
  'flag',
  2
) ON CONFLICT (rule_name) DO NOTHING;

-- Rule 3: Impossible Success Rates
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'impossible_success_rate',
  'Detects players with statistically impossible success rates on crimes or other RNG-based actions',
  'pattern',
  '{
    "action": "commit_crime",
    "expected_success_rate_field": "crime.base_success_rate",
    "sample_size_min": 20,
    "deviation_threshold": 2.5,
    "confidence_level": 0.95
  }'::jsonb,
  'critical',
  'suspend',
  1
) ON CONFLICT (rule_name) DO NOTHING;

-- Rule 4: Inventory Duplication
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'inventory_duplication',
  'Detects item duplication exploits by monitoring rapid inventory additions',
  'comparison',
  '{
    "monitor": "inventory_changes",
    "check_for": "identical_additions",
    "time_window_seconds": 10,
    "min_occurrences": 2,
    "check_transaction_ids": true
  }'::jsonb,
  'critical',
  'ban',
  1
) ON CONFLICT (rule_name) DO NOTHING;

-- Rule 5: API Abuse / Tampered Requests
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'api_abuse_detection',
  'Detects tampered API requests, missing tokens, or manipulated payloads',
  'pattern',
  '{
    "monitor_endpoints": ["/api/complete-crime", "/api/purchase-item", "/api/upgrade-business"],
    "indicators": [
      {"type": "missing_client_token", "weight": 40},
      {"type": "tampered_payload", "weight": 50},
      {"type": "excessive_requests", "max_per_minute": 30, "weight": 30},
      {"type": "invalid_sequence", "weight": 60},
      {"type": "manipulated_timestamps", "weight": 70}
    ],
    "total_weight_threshold": 100,
    "window_seconds": 300
  }'::jsonb,
  'critical',
  'ban',
  1
) ON CONFLICT (rule_name) DO NOTHING;

-- Rule 6: Multi-Account Detection
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'multi_account_detection',
  'Detects players using multiple accounts for farming or advantage',
  'pattern',
  '{
    "indicators": [
      {"type": "same_device_fingerprint", "weight": 60},
      {"type": "same_ip_address", "weight": 40},
      {"type": "money_transfer_between_accounts", "weight": 80},
      {"type": "same_email_pattern", "weight": 50},
      {"type": "login_time_correlation", "weight": 30}
    ],
    "total_weight_threshold": 120,
    "max_accounts_per_device": 3
  }'::jsonb,
  'medium',
  'flag',
  1
) ON CONFLICT (rule_name) DO NOTHING;

-- Rule 7: Excessive Failed Login Attempts
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'excessive_failed_logins',
  'Detects brute force login attempts or credential stuffing attacks',
  'rate_limit',
  '{
    "action": "failed_login",
    "max_count": 5,
    "window_seconds": 300,
    "lock_duration_seconds": 900
  }'::jsonb,
  'medium',
  'flag',
  1
) ON CONFLICT (rule_name) DO NOTHING;

-- Rule 8: Negative Balance Exploit
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'negative_balance_exploit',
  'Detects attempts to exploit integer overflow or bypass balance checks',
  'comparison',
  '{
    "field": "player.cash",
    "check_for": "negative_value",
    "also_check": "player.bank"
  }'::jsonb,
  'critical',
  'ban',
  1
) ON CONFLICT (rule_name) DO NOTHING;

-- Rule 9: Rapid Level Progression
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'rapid_level_progression',
  'Detects impossibly fast leveling indicating XP exploitation',
  'threshold',
  '{
    "field": "xp_gained",
    "time_windows": [
      {"duration_seconds": 300, "max_levels": 5},
      {"duration_seconds": 3600, "max_levels": 15},
      {"duration_seconds": 86400, "max_levels": 50}
    ]
  }'::jsonb,
  'high',
  'suspend',
  1
) ON CONFLICT (rule_name) DO NOTHING;

-- Rule 10: Suspicious Item Sell Pattern
INSERT INTO anticheat_rules (rule_name, description, rule_type, detection_config, severity, auto_action, alert_threshold)
VALUES (
  'suspicious_item_sell_pattern',
  'Detects selling items player never purchased or obtained legitimately',
  'comparison',
  '{
    "monitor": "item_sales",
    "verify_inventory_source": true,
    "check_acquisition_log": true,
    "time_window_seconds": 3600
  }'::jsonb,
  'high',
  'flag',
  2
) ON CONFLICT (rule_name) DO NOTHING;
