# Landing runtime error audit — 22 September 2026

## Reported failures and fixes

- Twitch: `ChatWidget` resolved the signed-in channel even when `twitchEnabled` was false. Giveaway sample previews also opened live connections and restarted with their animation. The shared IRC hook reconnected whenever callbacks changed and could reconnect after unmount. It now keeps callbacks current independently of the normalized channel, cancels reconnect timers, and retires connecting sockets after their handshake without joining. Chat respects its enabled setting; giveaway mock rendering cannot connect or write participants. Live editor/OBS defaults and the existing parsers are preserved.
- Profile HTTP 406: language preferences used a required single-row lookup, although profiles are optional. Production schema inspection confirmed missing profiles and owner-scoped insert/update policies. The lookup now uses `maybeSingle`, follows the authenticated account, ignores stale results, and upserts the language when the user selects it. Other profile fields are untouched.
- StreamElements HTTP 404: the global provider fetched the broadcaster's own loyalty balance on every page, although its only current consumer reads `seAccount`. Connection loading now only loads the verified connection. Explicit balance refresh remains available and tested. It uses a Twitch username, never a Supabase UUID, and distinguishes a missing loyalty record from other failures. A 404 is not treated as proof that a valid balance is zero. Charge/refund handlers were not changed.
- Analytics: production logs showed `supabase.rpc(...).catch is not a function`. The installed PostgREST builders are thenables. Optional database operations now use `await` with error handling; successfully inserted sessions continue through their counters. Visitor insert failures use the existing explicitly unpersisted fallback instead of a 500. Geo HTTP requests have bounded timeouts. The old generic visitor-counter RPC is absent in production, so a narrowly scoped replacement increments only after a saved session.

## Changed application files

- `api/_lib/routes/analytics.js`
- `src/hooks/useTwitchChat.js`
- `src/contexts/LanguageContext.jsx`
- `src/context/StreamElementsContext.jsx`
- `src/components/OverlayCenter/widgets/chat/ChatWidget.jsx`
- `src/components/OverlayCenter/widgets/giveaway/GiveawayWidget.jsx`
- `src/components/OverlayCenter/editor/betterWidgetRegistry.jsx`

Added `migrations/20260922025500_analytics_visitor_session_counter.sql` and documented it in `migrations/README.md`. Applied to the configured production Supabase project and verified that only `service_role` can execute it; anonymous/authenticated clients cannot. Existing records were not rewritten.

Added `scripts/test-analytics-runtime.mjs`, `scripts/test-client-runtime-browser.mjs`, this audit, and package scripts for the two checks. The database test uses PGlite: set `PGLITE_MODULE` to its installed module when not using the local verification dependency directory. Browser checks require the existing Vite app at `TEST_BASE_URL` (default port 3012).

## Verification

- Production build passed; existing bundle-size warning remains.
- Analytics contract tests passed using the actual Supabase SDK with intercepted test HTTP responses: saved sessions, failed visitor/session inserts, optional RPC failure, legacy columns, event counters, validation and dashboard authentication.
- PGlite migration checks passed: repeated application, correct increment and denial to client roles.
- Browser runtime checks passed: StrictMode, unstable callbacks, channel change, unexpected disconnect/reconnect, handshake cleanup, IRC identity fields, raids, badges, emotes, disabled chat, isolated giveaway previews, real giveaway entry processing, absent profiles, first preference save, stale profile replies, verified StreamElements connection and explicit points refresh.
- Existing analytics, landing carousel, widget validation, Broadcast/Community chat and onboarding checks passed. The two existing browser scripts initially timed out under the restricted shell, then passed with browser launch permission and the running server URL.
- All 18 subscriber-review checks and 12 slot-request points integration groups passed.

Browser regression fixtures deliberately intercept external requests; no real loyalty points, subscriptions or customer settings were changed. Production smoke results are recorded after deployment. The unrelated provider-image deletion and `.codex-dev/` files are excluded from the commit.
