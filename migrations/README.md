# Migration Catalog

The `migrations/` folder has been reduced to a numbered baseline that keeps only the active schema needed by the current app and the two explicit cleanup passes for older databases.

## Ordered baseline

1. `001_core_auth_profiles.sql`
	Core profiles, public avatar storage bucket, user roles, Twitch profile sync, and auth helper RPCs.

2. `002_overlay_runtime.sql`
	Overlay instances, themes, widgets, runtime state, user overlay state, giveaways, tournaments, and shared presets.

3. `003_slots_ingestion_and_requests.sql`
	Slots catalog, providers, pending slots, slot requests, ingestion cache/logs, user slot records, and slot modder access.

4. `004_streamelements_inventory_and_api_access.sql`
	Inventory, StreamElements connections, redemption items/history, points helpers, streamer API keys, and Spotify tokens.

5. `005_offers_landing_and_stream_features.sql`
	Casino offers, offer click tracking, landing page pricing/configuration, stream highlights, clip support, and shoutout alerts.

6. `006_giveaways_and_daily_wheel.sql`
	Public giveaways, profile backfill for giveaway users, giveaway visibility policy, daily wheel prizes, and daily wheel spins.

7. `007_guess_balance_and_bonus_hunt.sql`
	Guess-the-balance sessions, guesses, slot votes, transfer passwords, moderator policy fixes, and bonus hunt history.

8. `008_betting_and_penalty_king.sql`
	Betting contests, StreamElements betting mode/finalization RPCs, payouts, outcomes, and penalty king sessions/shots.

9. `009_analytics.sql`
	Analytics tables, views, RPC helpers, and the compatibility `increment_field` RPC still used by the analytics API.

10. `010_translation_and_localization.sql`
	 Translation tables, supported languages, and profile language preference support.

11. `011_cleanup_legacy_dead_schema.sql`
	 Drops verified dead Stripe/subscription, old overlay/widget, and retired game schema from older databases.

12. `012_cleanup_retired_thelife_and_extension.sql`
	 Drops retired The Life, season pass, and Twitch extension schema from older databases.

## Notes

- The numbered files are the only migration files that should remain active going forward.
- `011` and `012` are cleanup migrations for existing databases, not baseline schema required by a fresh install.
- If a future change adds schema, continue the numbering with `013_...`, `014_...`, and so on.