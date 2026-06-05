# Migration Catalog

This folder contains active schema history plus consolidated cleanup migrations for retired systems.

The repository audit on 2026-06-05 removed old broad drop scripts because they were too risky and contradicted live runtime behavior. Cleanup is now split into targeted migrations.

## Active runtime groups

### Core auth, admin, and profiles

- `create_user_profiles.sql`
- `add_admin_users_table.sql`
- `add_admin_actions_table.sql`
- `enable_multiple_roles.sql`
- `fix_user_roles_simple.sql`
- profile and role follow-up migrations

### Overlay Control Center and overlay runtime

- `20260225_overlay_control_center.sql`
- `create_user_overlay_system.sql`
- `add_canvas_resolution.sql`
- `add_metal_color_to_themes.sql`
- `add_shared_overlay_presets.sql`
- overlay/widget hardening and RLS fixes tied to current tables

### Slots, offers, and stream features

- `create_slots_table.sql`
- `enhance_slots_table.sql`
- `add_slot_providers_and_extra_fields.sql`
- `add_pending_slots.sql`
- `add_slot_requests.sql`
- `harden_slot_requests_*.sql`
- `create_casino_offers.sql`
- `add_casino_offers_*.sql`
- `offer_click_tracking.sql`
- `slot_ingestion_schema.sql`

### Community systems and integrations

- `create_giveaways.sql`
- `fix_giveaway_tables.sql`
- `add_betting_contests_final.sql`
- `create_daily_wheel_system.sql`
- `add_bonus_hunt_history.sql`
- `add_bonus_hunt_sessions.sql`
- `add_shoutout_alerts.sql`
- `add_penalty_king.sql`
- `STREAMELEMENTS_SETUP.sql`
- `add_spotify_tokens.sql`
- `analytics_system.sql`
- `analytics_rpcs.sql`

### Landing page and streamer tooling

- `add_landing_page_customization.sql`
- `add_landing_partner_controls.sql`
- `add_streamer_api_keys.sql`
- `create_stream_highlights.sql`
- `add_clip_video_url.sql`

## Mixed migrations intentionally kept

Some older migrations still remain because they continue to support active schema even if they mention retired tables in comments or in legacy compatibility paths.

- `add_betting_contests.sql`, `add_betting_contests_se_mode.sql`, and `add_betting_contests_final.sql`
- `fix_giveaway_tables.sql`
- `create_games_system.sql`
- `add_twitch_id_auto_populate.sql` and `add_twitch_username_to_profiles.sql`

## Retired system cleanup

Use [20260605_remove_legacy_dead_schema.sql](./20260605_remove_legacy_dead_schema.sql) to remove verified dead schema from an existing database:

- Stripe/payment and subscription tables/functions
- old SaaS overlay tables such as `overlays`, `widgets`, `widget_state`, and `widget_types`
- abandoned theme tables that depend on the old overlay schema
- roulette, blackjack, and mines tables

Use [20260605_remove_thelife_and_twitch_extension_schema.sql](./20260605_remove_thelife_and_twitch_extension_schema.sql) to remove retired The Life, season pass, and Twitch extension schema from an older database after code cleanup.

The dedicated The Life and Twitch extension migration lineage was removed from this folder after retirement. If an older database still contains those objects, use the cleanup migration above instead of replaying deleted feature migrations.

## Do not remove without code cleanup first

- current overlay tables: `overlay_instances`, `overlay_widgets`, `overlay_themes`, `overlay_state`, `shared_overlay_presets`, `user_overlay_state`
- current auth/profile tables and helpers: `user_profiles`, `user_roles`, `streamelements_connections`, Twitch OAuth/profile sync functions
- active community tables: `betting_contests`, `giveaways`, `daily_wheel_prizes`, `bonus_hunt_sessions`, `slot_requests`, `shoutout_alerts`