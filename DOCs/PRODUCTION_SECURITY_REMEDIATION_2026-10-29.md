# Privileged function remediation gate

Target project: `dkfllpjfrhdfvtbltrsy`. The migration
`migrations/20261029130000_harden_exposed_privileged_functions.sql` has not
been applied to production. The connected project reports no development
branches, and the available API did not provide a verifiable backup record.

Before application, an operator must verify a restorable database backup in
Supabase, record its recovery point and retention, and test restoration into
an isolated project. Test the migration there with admin, ordinary authenticated,
anonymous and service-role JWTs. Confirm the admin user directory, pending slot
approvals and affiliate admin overview still work. Confirm ordinary users cannot
read auth-user metadata or call the three restricted functions. Do not log or
export returned auth-user rows.

Read-only post-migration check:

```sql
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN
  ('get_all_auth_users', 'add_viewer_points',
   'admin_get_player_timeline', 'acquire_wipe_lock');
```

Expected: anonymous false for all; authenticated true only for
`get_all_auth_users`, which now checks the caller's active admin role;
service true for all. Test an authenticated non-admin call separately and
require SQLSTATE `42501`.

If a legitimate caller fails, restore the prior function definition and grants
from the verified backup in the isolated project first, then apply the tested
correction to production. Do not grant `PUBLIC` access as a quick rollback:
that restores the confirmed exposure. The migration changes no tables or rows.

The retired giveaway cron is removed from `vercel.json`. Its existing endpoint
remains secret-protected for compatibility and returns HTTP 503 when the
legacy giveaway tables are absent. Manual giveaway behavior is untouched.
