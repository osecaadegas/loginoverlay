# Stripe Webhook Recovery

## Scope

The observed failure is HTTP 500 from `/api/stripe-webhook`, with Supabase error
`PGRST205` for `public.stripe_webhook_events`. The handler checks this table before
dispatching every verified event, including `customer.updated`.

Migration `migrations/042_restore_stripe_webhook_events.sql` restores the table
definition from migration 015, explicitly configures access, and refreshes the
PostgREST schema cache. It does not change prices, subscriptions, account access,
Stripe keys, or application code. Existing event records are not deleted.

Preparing or pushing this file does not apply it to Supabase. The following
database and Stripe steps must be performed separately.

## 1. Confirm the Database

1. Open the Vercel project serving `streamerscenter.com`.
2. In Settings > Environment Variables, check the **Production** `SUPABASE_URL`.
   Do not change it or share service-role keys.
3. Open the Supabase project whose project reference matches that URL's hostname.
   For example, `https://PROJECT_REF.supabase.co` belongs to `PROJECT_REF`.
4. Confirm this is the production project, not a development branch or another site.

Do not run older cleanup migrations or rerun the whole billing migration to repair
this one table. Migration 011 includes removal of legacy Stripe tables.

## 2. Apply the Repair

1. In that Supabase project, open SQL Editor > New query using the `postgres` role.
2. Paste the entire contents of `migrations/042_restore_stripe_webhook_events.sql`.
3. Run the whole query, including `BEGIN` and `COMMIT`.
4. Expect a success result. A notice that the policy does not exist on first run,
   or that the table already exists on a repeat run, is normal.
5. If an error appears, stop and capture the exact error. Do not run individual
   statements after a failure; the transaction prevents a partial repair.

The table stays protected by row-level security. Authenticated admins retain
read access; ordinary users cannot read its records. Only the server service role
receives the read/insert/update privileges needed by the webhook.

## 3. Verify the Database

Run this as a separate SQL Editor query:

```sql
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('service_role', c.oid, 'SELECT') AS server_can_read,
  has_table_privilege('service_role', c.oid, 'INSERT') AS server_can_insert,
  has_table_privilege('service_role', c.oid, 'UPDATE') AS server_can_update,
  has_table_privilege('anon', c.oid, 'SELECT') AS anonymous_can_read,
  has_table_privilege('authenticated', c.oid, 'INSERT') AS client_can_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') AS client_can_update
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'stripe_webhook_events';
```

Expect exactly one row: `stripe_webhook_events`, RLS and the three server checks
`true`, and the last three checks `false`. This checks table permissions; the
admin-only SELECT policy additionally controls which authenticated users see rows.

## 4. Retry the Event in the Screenshot

1. Open the same Stripe account and Live/Test mode as the failed delivery.
2. Open Workbench > Events, then the failed `customer.updated` event.
3. Under Deliveries to webhook endpoints, find
   `https://streamerscenter.com/api/stripe-webhook` and click Resend.
4. Open the newest delivery attempt. Expect HTTP **200** and `{"received":true}`.
   A response also containing `"duplicate":true` is a successful deduplicated retry.
5. Confirm the receipt in Supabase:

```sql
SELECT stripe_event_id, event_type, processed_at
FROM public.stripe_webhook_events
ORDER BY processed_at DESC
LIMIT 20;
```

Match the row's `stripe_event_id` to the Stripe event ID. Do not insert receipts
manually: doing so would make the handler skip events that it has not processed.

Opening the webhook URL in a browser sends GET and returns 405 by design; that is
not a webhook health test. Do not disable signature verification to test it.

## 5. Recover Affected Subscription Access

`customer.updated` is only acknowledged and audited by this application. A 200 for
that event proves the missing-table failure is resolved, not that paid access has
been synchronized.

Remove the `customer.updated` event filter and inspect failed deliveries to the
same endpoint. The subscription-related events handled by the current code are:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

For each affected subscription, review its current status in Stripe before
replaying. Resend relevant failed events one at a time, oldest to newest, waiting
for each 200 response. Stop on any failure. Check for a newer successful
subscription event before replaying an older failed one: the current handler
applies subscription event snapshots and a replay can overwrite newer access.
If newer state exists, reconcile against the current Stripe subscription instead
of blindly replaying the backlog. Never delete receipt rows to force a replay.

After recovery, compare Stripe's current subscription status and billing period
against the site's subscription/admin display, then verify the affected user's
actual access after refreshing their session. A successful HTTP response alone
does not prove the correct user was matched or their access is correct.

Stripe supports Dashboard resends for up to 15 days after event creation and CLI
resends for up to 30 days. Older failures need current-state reconciliation, not
fake events or replacement payments. Do not create a new charge or subscription
to test recovery.

## Troubleshooting

- **Same PGRST205:** verify the production project again. Run
  `NOTIFY pgrst, 'reload schema';`, allow the refresh to complete, then resend.
- **42501 / permission denied:** capture the exact table name and the verification
  query results. Do not disable RLS or grant public write access.
- **400 / signature error:** inspect Vercel's production webhook-secret
  configuration against this exact Stripe destination. Do not post secrets or
  rotate them as part of the missing-table repair.
- **Another 500:** expand the newest Stripe delivery, capture its response body,
  and inspect Vercel runtime logs for `/api/stripe-webhook` at that timestamp.
- **200 but access wrong:** inspect the checkout/subscription's existing user
  metadata and current subscription state before resending more events.

No redeploy is required for this database-only repair, provided the deployed
handler is the version inspected here. Keep the migration in source control so
future database setup includes it. Preparing this guide did not modify production
or verify a real event delivery.

## References

- [Stripe webhook retries, ordering and manual resend](https://docs.stripe.com/webhooks)
- [Stripe Workbench event destinations](https://docs.stripe.com/workbench/event-destinations)
- [Supabase schema cache refresh](https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema)
- [Supabase API security and grants](https://supabase.com/docs/guides/api/securing-your-api)
