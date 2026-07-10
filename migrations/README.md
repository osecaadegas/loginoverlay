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

8. `008_betting.sql`
	Betting contests, StreamElements betting mode/finalization RPCs, payouts, and outcomes.

9. `009_analytics.sql`
	Analytics tables, views, RPC helpers, and the compatibility `increment_field` RPC still used by the analytics API.

10. `010_translation_and_localization.sql`
	 Translation tables, supported languages, and profile language preference support.

11. `011_cleanup_legacy_dead_schema.sql`
	 Drops verified dead Stripe/subscription, old overlay/widget, and retired game schema from older databases.

12. `012_cleanup_retired_thelife_and_extension.sql`
	 Drops retired The Life, season pass, and Twitch extension schema from older databases.

13. `013_pending_slot_submission_repair.sql`
	 Repairs pending slot submissions by allowing incomplete scraped metadata and aligning approval queue policies with admin/superadmin roles.

14. `014_cleanup_penalty_king.sql`
	 Drops retired mini-game tables from older databases.

15. `015_stripe_subscriptions.sql`
	Adds Stripe customer/subscription tracking, webhook idempotency, and source-aware premium role rows for recurring billing.

16. `016_player_bonus_hunt.sql`
	Adds the player-facing Bonus Hunt tables, subscription product tables, access policies, and player slot result view.

17. `017_player_bonus_hunt_slot_metadata.sql`
	Adds database-backed slot metadata snapshots to player hunt bonuses for RTP, max win, volatility, theme, and features.

18. `018_player_hunt_bonus_type.sql`
	Ensures player hunt bonus type metadata and result view fields stay aligned after the two-step hunt/opening flow.

19. `019_analytics_product_foundation.sql`
	Adds analytics v2 event context, product reporting views, indexes, idempotency support, and stricter analytics RLS policies.

## Notes

- The numbered files are the only migration files that should remain active going forward.
- `011`, `012`, and `014` are cleanup migrations for existing databases, not baseline schema required by a fresh install.
- If a future change adds schema, continue the numbering with the next available migration number.
