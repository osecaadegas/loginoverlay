# Migration Catalog

This folder contains a mix of active schema history and older legacy migrations.

The repository audit on 2026-06-05 found an important boundary:

- The Life schema is still active in code and admin flows.
- Twitch extension schema is still active in serverless code.
- Old Stripe/subscription, widget-types, roulette, blackjack, and mines schema is not part of the current runtime.

Because of that, the old broad drop scripts were removed. They were too risky and contradicted the current codebase.

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

### The Life runtime

- `create_the_life_game.sql`
- `add_thelife_inventory_system.sql`
- business, crime, pvp, dock, wipe, category, and security follow-up migrations

### Twitch extension runtime

- `create_twitch_extension_system.sql`
- extension-related follow-up migrations that still back the EBS endpoints

## Historical legacy migrations still kept for lineage

These remain in the repo because other older migrations still reference them, but they are not the current source of truth for runtime behavior:

- `create_saas_overlay_system.sql`
- `create_stripe_integration.sql`
- `create_overlays_table.sql`
- `create_widget_settings.sql`
- `seed_widget_types.sql`
- `delete_all_widget_types.sql`
- `enable_auto_trial.sql`
- `add_theme_system.sql`
- abandoned game migrations such as roulette, blackjack, and mines

## Legacy cleanup

Use [20260605_remove_legacy_dead_schema.sql](./20260605_remove_legacy_dead_schema.sql) to remove verified dead schema from an existing database:

- Stripe/payment and subscription tables/functions
- old SaaS overlay tables such as `overlays`, `widgets`, `widget_state`, and `widget_types`
- abandoned theme tables that depend on the old overlay schema
- roulette, blackjack, and mines tables

## Do not remove without code cleanup first

- Any `the_life_*` schema
- `ext_*` Twitch extension schema
- current overlay tables: `overlay_instances`, `overlay_widgets`, `overlay_themes`, `overlay_state`, `shared_overlay_presets`, `user_overlay_state`