-- Seed widget_types table with all 25 production-ready widgets
-- Run this after create_saas_overlay_system.sql
-- Adds comprehensive widget library for streamers
-- Uses ON CONFLICT to handle re-seeding gracefully

-- Legacy Widgets (Pre-existing)
INSERT INTO widget_types (name, display_name, description, category, default_config, premium_only)
VALUES
('balance_display', 'Balance Display', 'Shows current balance in hunt', 'stats', 
  '{"fontSize": 24, "animated": true, "currency": "USD"}', false),
('wager_counter', 'Wager Counter', 'Tracks total wagered amount with optional goal', 'stats',
  '{"showGoal": true, "animated": true}', false),
('profit_tracker', 'Profit Tracker', 'Displays profit/loss with visual indicators', 'stats',
  '{"showPercentage": true, "animated": true}', false)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_config = EXCLUDED.default_config,
  premium_only = EXCLUDED.premium_only;

-- Core Stats Widgets (Hunt Analytics)
INSERT INTO widget_types (name, display_name, description, category, default_config, premium_only)
VALUES
('average_hunt_betsize', 'Average Hunt Betsize', 'Average bet size across current hunt', 'stats',
  '{"fontSize": 24, "animated": true, "showIcon": true, "currency": "USD"}', false),
('average_bonus_cost', 'Average Bonus Cost', 'Average cost of bonuses in hunt', 'stats',
  '{"fontSize": 24, "animated": true, "showIcon": true, "currency": "USD"}', false),
('current_multiplier', 'Current Multiplier', 'Current overall multiplier of the hunt', 'stats',
  '{"fontSize": 24, "decimals": 2, "animated": true, "showIcon": true}', false),
('required_multiplier', 'Required Multiplier', 'Multiplier needed to break even', 'stats',
  '{"fontSize": 24, "decimals": 2, "animated": true, "showIcon": true}', false),
('best_multiplier', 'Best Multiplier', 'Highest multiplier achieved in hunt', 'stats',
  '{"fontSize": 28, "decimals": 2, "animated": true, "showIcon": true}', true),
('best_bonus_payout', 'Best Bonus Payout', 'Highest single bonus payout amount', 'stats',
  '{"fontSize": 28, "animated": true, "showIcon": true, "currency": "USD"}', true),
('cumulative_multis', 'Cumulative Multis', 'Sum of all multipliers from opened bonuses', 'stats',
  '{"fontSize": 28, "decimals": 2, "animated": true, "showIcon": true}', false)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_config = EXCLUDED.default_config,
  premium_only = EXCLUDED.premium_only;

-- Average & Goal Widgets
INSERT INTO widget_types (name, display_name, description, category, default_config, premium_only)
VALUES
('current_average', 'Current Average', 'Current average win per bonus', 'stats',
  '{"fontSize": 24, "animated": true, "showIcon": true, "currency": "USD"}', false),
('required_average', 'Required Average', 'Average payout needed from remaining bonuses to break even', 'stats',
  '{"fontSize": 24, "animated": true, "showIcon": true, "currency": "USD"}', false),
('required_roll_average', 'Required Roll Average', 'Average roll/multiplier needed from remaining bonuses', 'stats',
  '{"fontSize": 24, "decimals": 2, "animated": true, "showIcon": true}', false),
('goal_progress', 'Goal Progress', 'Visual progress bar towards target amount', 'progress',
  '{"showPercentage": true, "showEstimate": true, "animated": true, "goalType": "balance", "currency": "USD"}', false)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_config = EXCLUDED.default_config,
  premium_only = EXCLUDED.premium_only;

-- Counter Widgets
INSERT INTO widget_types (name, display_name, description, category, default_config, premium_only)
VALUES
('bonuses_count', 'Bonuses Count', 'Total number of bonuses collected', 'counters',
  '{"fontSize": 32, "animated": true, "showIcon": true}', false),
('remaining_bonuses', 'Remaining Bonuses', 'Count of unopened bonuses', 'counters',
  '{"fontSize": 32, "animated": true, "showIcon": true}', false),
('current_start_cost', 'Current Start Cost', 'Starting bankroll/cost for current hunt', 'stats',
  '{"fontSize": 24, "animated": true, "showIcon": true, "currency": "USD"}', false)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_config = EXCLUDED.default_config,
  premium_only = EXCLUDED.premium_only;

-- List & Timeline Widgets
INSERT INTO widget_types (name, display_name, description, category, default_config, premium_only)
VALUES
('simple_bonus_list', 'Simple Bonus List', 'Scrollable list of all bonuses with status indicators', 'lists',
  '{"maxHeight": 400, "showCost": true, "showMultiplier": true, "animated": true, "autoScroll": false}', false),
('recent_wins_feed', 'Recent Wins Feed', 'Scrolling feed of recent winning bonuses', 'lists',
  '{"maxHeight": 300, "maxItems": 10, "showTimestamp": true, "animated": true, "currency": "USD"}', true),
('bonus_history_timeline', 'Bonus History Timeline', 'Visual timeline of all bonuses with completion states', 'lists',
  '{"maxHeight": 400, "showDetails": true, "animated": true}', true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_config = EXCLUDED.default_config,
  premium_only = EXCLUDED.premium_only;

-- Alert & Panel Widgets
INSERT INTO widget_types (name, display_name, description, category, default_config, premium_only)
VALUES
('big_win_alert', 'Big Win Alert', 'Full-screen celebration overlay for significant wins', 'alerts',
  '{"threshold": 1000, "duration": 5000, "animated": true, "currency": "USD"}', true),
('session_stats_panel', 'Session Stats Panel', 'Comprehensive session overview with multiple metrics', 'panels',
  '{"showIcon": true, "animated": true, "currency": "USD"}', false)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_config = EXCLUDED.default_config,
  premium_only = EXCLUDED.premium_only;

-- Info Widgets
INSERT INTO widget_types (name, display_name, description, category, default_config, premium_only)
VALUES
('slot_info', 'Slot Info', 'Shows current slot/game information', 'info',
  '{"showIcon": true}', false),
('casino_info', 'Casino Info', 'Shows casino branding and information', 'info',
  '{"showIcon": true}', false)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_config = EXCLUDED.default_config,
  premium_only = EXCLUDED.premium_only;

-- Verify insertion
SELECT COUNT(*) as total_widget_types FROM widget_types;
SELECT name, display_name, category, premium_only FROM widget_types ORDER BY category, name;
