# Slot Provider Management

The existing `/webmod/slot-manager` page manages provider names, logos, websites,
selected-slot moves and whole-provider moves. Its route permissions are unchanged.
Database writes require an active, unexpired admin, superadmin or slot_modder role.

## Deployment

Apply `migrations/20260914074432_slot_provider_management.sql` to the same database
configured by `VITE_SUPABASE_URL` before deploying the frontend. The migration adds
provider aliases, restores the missing audit table when necessary, and creates
invoker-security RPCs. It does not rename, move or delete existing catalog data.

The repository keeps migrations in `migrations/`; no second Supabase project is
needed. The filename was generated with the Supabase CLI.

## Behavior

- Renames update matching slots and preserve old aliases in one transaction.
- Selected moves affect only the selected IDs. Empty or stale selections fail.
- Whole-provider moves include recorded aliases and can remove the source in the
  same transaction. Slot IDs, images, game statistics and hunt history are retained.
- Removing a provider never deletes slots. A provider with slots must be moved
  first. Removed providers remain available in the Removed view for restoration.
- Managed names and logos take precedence over bundled provider defaults. Removed
  defaults are not automatically re-added. An empty logo URL means no logo; null
  means use the bundled default, if present.
- Logo metadata is shared through a five-minute React Query cache. Saves invalidate
  that cache. Slot Manager, Bonus Hunt forms, player hunts and RTP widgets use it.
  Explicit per-widget RTP logo overrides still take precedence.
- Counts are aggregated in the database instead of downloading the entire slot
  catalog. Audit entries record the acting moderator and affected slot providers.
- Errors remain visible in the editor and do not close the unsaved form.

## Verification

The SQL tests use an isolated PGlite database, not production. The browser test
mounts the real Slot Manager and routes its database requests to those actual SQL
functions. It covers create, rename, logo replacement/removal, duplicate errors,
full/selected moves, removal, restoration, reload persistence and responsive widths.

Install the test-only runtime outside the application, then run from the repository:

```powershell
npm.cmd install --prefix "$env:TEMP/streamers-provider-sql-tests" --no-save --package-lock=false @electric-sql/pglite@0.5.8
$env:PGLITE_MODULE = "$env:TEMP/streamers-provider-sql-tests/node_modules/@electric-sql/pglite/dist/index.js"
npm.cmd run test:slot-providers
# With the existing Vite server running on port 3010:
npm.cmd run test:slot-providers-browser
npm.cmd run build
```

`TEST_BASE_URL` can select another local Vite server. `PROVIDER_SCREENSHOT` is an
optional screenshot output path. No application dependencies or secrets are needed
for the temporary database runtime.
