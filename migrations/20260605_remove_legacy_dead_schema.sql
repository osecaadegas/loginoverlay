-- Remove legacy dead schema verified by runtime audit on 2026-06-05.
-- Safe scope only:
--   * Stripe/payment and subscription schema
--   * old SaaS overlay/widget-types schema
--   * abandoned theme tables tied to the old overlay schema
--   * abandoned roulette, blackjack, and mines tables
-- Explicitly not touched:
--   * current Overlay Control Center tables
--   * The Life tables
--   * Twitch extension tables
--   * StreamElements, slots, betting, analytics, giveaways, offers

ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS overlays;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS widgets;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS widget_state;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS subscriptions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS roulette_game_state;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS roulette_bets;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS roulette_chat;

DROP FUNCTION IF EXISTS handle_stripe_subscription_update(text, text, timestamptz, timestamptz, boolean, timestamptz);
DROP FUNCTION IF EXISTS handle_stripe_customer_update(uuid, text, text, text, text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS log_payment(uuid, uuid, text, integer, text, text, text);
DROP FUNCTION IF EXISTS cancel_subscription(uuid, boolean);
DROP FUNCTION IF EXISTS reactivate_subscription(uuid);
DROP FUNCTION IF EXISTS start_trial(uuid, integer);
DROP FUNCTION IF EXISTS track_widget_view(uuid);
DROP FUNCTION IF EXISTS has_active_subscription(uuid);
DROP FUNCTION IF EXISTS generate_secure_token();
DROP FUNCTION IF EXISTS rotate_overlay_token(uuid);

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS stripe_webhook_events CASCADE;
DROP TABLE IF EXISTS widget_usage_stats CASCADE;

DROP TABLE IF EXISTS widget_theme_overrides CASCADE;
DROP TABLE IF EXISTS user_themes CASCADE;
DROP TABLE IF EXISTS material_definitions CASCADE;
DROP TABLE IF EXISTS theme_presets CASCADE;
DROP TABLE IF EXISTS custom_themes CASCADE;
DROP TABLE IF EXISTS overlay_events CASCADE;

DROP TABLE IF EXISTS widget_state CASCADE;
DROP TABLE IF EXISTS widgets CASCADE;
DROP TABLE IF EXISTS widget_types CASCADE;
DROP TABLE IF EXISTS overlays CASCADE;

DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

DROP TABLE IF EXISTS roulette_chat CASCADE;
DROP TABLE IF EXISTS roulette_bets CASCADE;
DROP TABLE IF EXISTS roulette_history CASCADE;
DROP TABLE IF EXISTS roulette_player_stats CASCADE;
DROP TABLE IF EXISTS roulette_game_state CASCADE;

DROP TABLE IF EXISTS mines_games CASCADE;
DROP TABLE IF EXISTS blackjack_games CASCADE;