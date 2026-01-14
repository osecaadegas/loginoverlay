-- Add BH Tracker List Vertical Widget
-- Vertical scrolling list of bonuses from active hunt

INSERT INTO widget_types (
  name,
  display_name,
  description,
  icon,
  category,
  default_config,
  premium_only,
  active
) VALUES (
  'bh_tracker_list_vertical',
  'BH Tracker List Vertical',
  'Vertical scrolling list of bonuses from active hunt. Shows slot images, bets, payouts, and multipliers with super bonus animations.',
  '🎰',
  'bhtrackers',
  '{
    "scrollSpeed": 30,
    "pauseOnHover": true,
    "widgetHeight": 500,
    "widgetWidth": 320
  }'::jsonb,
  false,
  true
);
