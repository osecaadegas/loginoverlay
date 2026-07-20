# Affiliate Management System

This system adds role-gated affiliate dashboards, admin link management, privacy-safe redirects, partner-reported statistics, CSV import foundations, and postback foundations.

## Routes

- `/affiliate` is the affiliate dashboard for users with the active `affiliate` role.
- `/admin/affiliates` is the admin console for affiliate access, brands, offers, links, manual stats, CSV import, and audit notes.
- `/go/:brandSlug/:shortCode` is the public tracking redirect. It rewrites to `/api/affiliate?action=redirect`.
- `/api/affiliate/postback/:brandSlug` receives partner postback events when a brand has a configured `postback_secret_hash`.

## Database

Migration `029_affiliate_management.sql` creates:

- `affiliate_profiles`
- `affiliate_brands`
- `affiliate_offers`
- `affiliate_links`
- `affiliate_clicks`
- `affiliate_stats`
- `affiliate_conversions`
- `affiliate_imports`
- `affiliate_import_rows`
- `affiliate_postback_events`
- `affiliate_audit_logs`
- `affiliate_admin_notes`
- `affiliate_daily_rollups`

The migration also hardens `user_roles` so users cannot grant or update their own roles. Admin and service-role flows now manage role changes, and a unique `(user_id, role)` index supports safe upserts.

## Security And Privacy

- Redirect tracking stores hashed IP and user-agent values only.
- Raw visitor IP addresses and raw user-agent strings are not persisted.
- Affiliate users can read their own profile, links, and reporting data only.
- Admins can manage all affiliate data.
- Service-role API routes perform privileged writes server-side.
- Suspended affiliates fail access checks in `requireAffiliateUser`.
- Destination URLs must be HTTP or HTTPS and cannot contain header injection characters.
- Short codes are URL-safe and reserve platform paths such as `admin`, `api`, `go`, `login`, and `privacy`.

## Redirect Flow

1. A visitor opens `/go/:brandSlug/:shortCode`.
2. The API checks that the brand, link, and offer are active.
3. A click id is generated.
4. The destination URL is rebuilt with configured tracking params:
   - `source_parameter`
   - `campaign_parameter`
   - `click_id_parameter`
5. A privacy-safe click row is inserted asynchronously.
6. The visitor receives a `302` redirect to the partner URL.

## Partner Stats

Streamers Center click totals are first-party redirect metrics. Registrations, FTDs, deposits, and commissions are partner-reported and stored in `affiliate_stats`.

Admins can add stats manually or import CSV rows. CSV import supports matching by:

- `tracking_link_id`
- `short_code`
- affiliate email

Common column aliases are recognized, including `clicks`, `registrations`, `signups`, `ftds`, `deposit_amount`, `cpa`, `revshare`, `period_start`, and `period_end`.

## Postbacks

Postbacks are accepted at `/api/affiliate/postback/:brandSlug`. If `postback_secret_hash` is set on the brand, the incoming token is hashed with the same server-side salt and compared using timing-safe equality.

When a postback includes a known click id, the system stores a conversion row. Unknown events are retained in `affiliate_postback_events` as unmatched.

## Deployment Checklist

1. Apply `migrations/029_affiliate_management.sql` in Supabase.
2. Ensure these env vars exist on Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - optional `AFFILIATE_HASH_SALT`
3. Deploy the updated `vercel.json` rewrites.
4. Use `/admin/affiliates` to create brands, offers, and tracking links.
5. Grant the `affiliate` role to approved users only.
6. Test one redirect per brand and confirm the partner receives the expected click parameter.

## Verification

Run:

```bash
npm run test:affiliate
npm run build
```

## Notes

Partner dashboards may not exactly match Streamers Center clicks because partners filter traffic, delay reporting, deduplicate differently, or reject conversions after compliance review. The UI labels Streamers Center tracked clicks separately from partner-reported registrations, deposits, and commission.
