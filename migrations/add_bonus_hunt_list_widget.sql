-- Add Bonus Hunt List Widget to widget_types
-- Category: BHtrackers (Bonus Hunt Trackers)

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
  'bonus_hunt_list',
  'Bonus Hunt List',
  'Infinite scrolling carousel of bonuses with super bonus animations. Shows slot images, bets, payouts, and multipliers.',
  '🎰',
  'bhtrackers',
  '{
    "scrollSpeed": 30,
    "pauseOnHover": true,
    "cardHeight": 120
  }'::jsonb,
  false,
  true
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  default_config = EXCLUDED.default_config,
  premium_only = EXCLUDED.premium_only,
  active = EXCLUDED.active;

COMMENT ON COLUMN widget_types.category IS 'Widget categories: stats, counters, lists, alerts, panels, info, progress, history, goals, bhtrackers';
