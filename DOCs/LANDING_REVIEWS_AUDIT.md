# Landing page and subscriber reviews

## Delivered

- Redesigned the existing `/` landing page with a calmer layout, clear Streamer/Player paths, the existing widget renderers, a three-step start guide, FAQs and reviews.
- Replaced image-based home pricing with the same `/api/premium?action=page` catalogue used by the subscription page. Product descriptions, prices, intervals, badges and feature availability remain admin-managed. Streamer cards prioritise Streamer-specific features.
- Kept the existing age gate, shared navigation, authentication routes, widget carousel, audience pages, offers and contact footer.
- Added public paginated reviews and aggregate ratings. Public responses contain only the review ID, chosen display name, rating, text, product and date. Reviews disclose the three-day incentive. There are no seeded testimonials or ratings.
- Added subscriber review moderation and pending reward retry in the existing subscription admin page. Hiding a review retains its reward ledger and does not reverse earned days.

## Eligibility and reward behaviour

`/api/reviews` uses server-verified Supabase identity and owned Stripe billing records. An active or trialing Player/Streamer Stripe subscription with a future period end qualifies. Cardless signup trials, manual premium/admin roles, expired and past-due subscriptions do not qualify on their own. Where both products are subscribed, Streamer is extended first because it includes Player access.

The first review earns exactly three days regardless of rating. The public name, review text and explicit publication consent are validated before saving. A unique `user_id` constraint prevents repeat rewards. Client-supplied account IDs, subscription IDs, reward days and target dates are never used.

The reward uses the existing Stripe integration: `trial_end = original current_period_end + 259200`, `proration_behavior = none`. This moves the next billing cycle three days later and temporarily puts the subscription in Stripe's `trialing` status, already supported by the existing entitlement system. Subscription prices are not changed. Scheduled end-of-period cancellation is retained. The existing `syncStripeSubscription` updates billing records, Player access or Streamer premium roles and remains compatible with the existing webhook.

The original end, exact target end and cancellation state are saved before contacting Stripe. A per-review idempotency key and persistent Stripe metadata receipt prevent duplicate extensions, including retry after a Stripe success followed by a database/sync failure. Receipt recovery also checks the actual Stripe trial end. Current ownership is checked on every attempt. Changed billing periods or cancellation intent are not overwritten on retry.

Custom schedules, metered/multiple-item plans, paused collection, pending subscription changes, custom early cancellation or dates beyond Stripe's trial limit require support review before submission. The current catalogue uses standard recurring plans. If billing fails after the review is saved, the UI displays a pending reward and provides a retry; admins can retry too. Retries do not silently change a subscription that has changed since the reward was reserved.

## Files

Modified:
- `src/components/LandingPage/LandingPage.jsx`
- `src/components/AdminSubscriptions/AdminSubscriptionsPage.jsx`
- `api/[...path].js`
- `api/_lib/stripe-billing.js` (optional idempotency header; existing callers unchanged)
- `api/stripe-webhook.js` (retrieve current subscription state before processing subscription events, avoiding stale event snapshots overwriting extensions/cancellations)
- `api/_lib/routes/premium.js` (await asynchronous handlers so authentication and upstream errors return controlled JSON; do not expose upstream HTML in responses)
- `package.json`
- `migrations/README.md`

Created:
- `src/components/LandingPage/LandingModern.css`
- `src/components/LandingPage/LandingPlans.jsx`
- `src/components/LandingPage/SubscriberReviews.jsx`
- `src/components/LandingPage/SubscriberReviews.css`
- `src/components/LandingPage/reviewApi.js`
- `src/components/AdminSubscriptions/SubscriberReviewsAdmin.jsx`
- `api/_lib/review-rewards.js`
- `api/_lib/routes/reviews.js`
- `scripts/test-subscriber-reviews.mjs`
- `scripts/test-subscriber-reviews-browser.mjs`
- `scripts/test-subscriber-reviews-db.mjs`
- `migrations/20260922014434_subscriber_reviews.sql`
- This audit document.

## Database and configuration

Migration `20260922014434_subscriber_reviews.sql` creates the private review/reward ledger and a service-only public-summary function. RLS is enabled; anon/authenticated roles have no direct table or function grants. The server selects a restricted public field list. The service role has select/insert/update, but no delete grant. Rating, length, exact reward duration and applied timestamp constraints are enforced in PostgreSQL.

Applied to `dkfllpjfrhdfvtbltrsy`, confirmed against the deployed site's Supabase URL and the linked Vercel project. Live introspection confirmed RLS enabled, client read/write and summary execution denied, service writes allowed and service deletion denied. Supabase's advisory that this table has RLS without client policies is expected: access intentionally passes through the authenticated server API ([RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)).

No new environment variables. Production Vercel configuration contains the existing Stripe secret/webhook secret, price IDs and Supabase service credentials. Values were not changed.

## Validation

- `npm.cmd run build` — passed; existing large-bundle advisory remains.
- `npm.cmd run test:subscriber-reviews` — 18 behavioural checks passed: validation, ownership, exact duration, eligibility, low ratings, duplicate/concurrent submission, billing failure, sync/DB recovery, stale cancellation state, receipt verification, public field privacy, moderation, Player access, invalid requests, delayed webhook state, asynchronous Premium authentication errors and upstream timeout responses.
- `npm.cmd run test:subscriber-reviews-browser` — passed with controlled browser-only API fixtures: actual form submission, pending/retry/success, one-star rating, escaped HTML, incentive disclosure, mobile layout, non-subscribers, signed-out users and load-error recovery.
- `node scripts/test-subscriber-reviews-db.mjs` — passed in isolated PGlite PostgreSQL: migration SQL, uniqueness, checks, grants, RLS, summary and retained ledger. No test reviews were inserted into production. To reproduce, install PGlite temporarily with `npm.cmd install --prefix .codex-dev/review-test-deps --no-save --package-lock=false @electric-sql/pglite`.
- Existing `test:landing-widget-carousel`, `test:stripe-trials`, `test:global-navigation`, `test:contact-messages` — passed.
- Real local API handlers against the configured database: public review GET returned 200 and an empty summary; unauthenticated account GET and submission POST returned 401.
- Browser inspection at 1264px and 390px: real catalogue prices/features rendered, no horizontal overflow, no Vite error overlay or page runtime errors. Existing navigation, widgets and consent controls remain present. Local screenshots are under `.codex-dev/` and excluded from the commit.

## Verification limits

Production smoke checks encountered intermittent Supabase REST connection timeouts (Cloudflare 522), also visible on existing pricing and slot-count APIs. Database SQL checks remained responsive. The review API returned 200 on successful reads and safely rejected unauthenticated requests. Public read failures present retry controls; server-side review failures report 503 for upstream unavailability. The Premium handler was corrected to await its asynchronous branches so errors are caught rather than becoming unhandled function failures. An upstream timeout is distinct from completed billing verification.

The connected Stripe account is live-only. No real customer was charged, extended or canceled as a test. Billing mutations are covered by behavioural fixtures and the existing Stripe API contract, not a completed live renewal. A controlled Stripe sandbox lifecycle remains the appropriate follow-up for external billing verification. The implementation follows [Stripe's subscription update API](https://docs.stripe.com/api/subscriptions/update) and [existing-subscription free periods](https://docs.stripe.com/billing/subscriptions/trials/free-trials).

Unrelated deletion of `public/providers/spage_gaming.png` and `.codex-dev/` artifacts are excluded from the release.
