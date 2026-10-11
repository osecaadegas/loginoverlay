# Exclusive overlay roles

## Admin workflow

1. Open **Admin Panel → Overlay roles** and create a named role.
2. Select a colour theme, background, or banner. Enable **Exclusive to selected roles**, select one or more roles, and save asset access.
3. Open **User Management**, edit the streamer, and check the role under **Exclusive overlay roles**. Assignment saves immediately.

Use **Add banner or background URL** for additional hosted image/video media. Existing media stays at its current URL. Allowed backgrounds appear in the background library; allowed banners appear in the slideshow's available banner library.

Multiple role memberships combine access. Administrators can use all registered assets. These groups never grant admin, moderator, subscription or billing privileges. An exclusive asset with no roles is admin-only. Deleting the last granting role does not make its assets public: explicitly turn exclusivity off to release an asset.

Unmanaged assets keep their existing availability, including the legacy Brutus banner rule. Once a Brutus banner is managed here, its explicit asset access replaces that legacy rule for the banner.

## Enforcement and persistence

- `overlay_access_roles`, `overlay_access_members`, `overlay_access_assets`, and `overlay_access_grants` have admin-only RLS. Expired admin privileges cannot manage these tables.
- Atomic `save_overlay_access_asset` runs with caller privileges and checks admin access. It replaces grants without an intermediate public state.
- Database triggers validate normal widget configurations, Better editor drafts, and published layouts, including nested configurations and encoded media URLs. Direct API writes cannot bypass restricted-asset checks.
- Editor and both OBS renderers share the asset checks. Existing configurations are preserved when membership is removed; a widget using a denied asset stops rendering until access returns or the asset is replaced. Effects are also gated.
- Permission snapshots refresh every 15 seconds and on focus/reconnection. Identical snapshots do not re-render widgets or restart effects. Failed/timed-out checks fail closed and retry; the editor exposes an error/retry state.
- The public OBS RPC exposes asset availability, not role membership lists. It does not grant write permissions.

This controls access within Streamers Center. Existing static files and externally hosted URLs remain publicly fetchable; it is not private-file delivery or DRM.

## Deployment and verification

Apply both migrations in order before deploying the frontend:

- `migrations/20261011055318_overlay_access_roles.sql`
- `migrations/20261011060556_overlay_access_privileges.sql`

No environment variables or existing user assignments change. The second migration removes explicit Supabase default function grants as well as PUBLIC grants.

Run `npm run test:overlay-access` with `PGLITE_MODULE` pointing to an installed `@electric-sql/pglite/dist/index.js` (default: the isolated `streamers-overlay-access-sql-test` directory in the OS temp folder). It uses a disposable local database; it never creates production test users or roles. It verifies RLS, function grants, admin expiry, role union, save/publish rejection, revocation and URL normalization.

Run `npm run test:overlay-access-browser` for admin forms, membership persistence, desktop/mobile overflow and live OBS grant/revocation checks using browser fixtures. Also run the production build, widget validation, slideshow and colour-theme regression tests.

## Implementation files

Created the two migrations above, this document, and:

- `src/components/AdminPanel/OverlayRolesAdmin.jsx`
- `src/components/AdminPanel/OverlayRolesAdmin.css`
- `src/components/OverlayCenter/editor/OverlayAssetGate.jsx`
- `src/hooks/useOverlayAssetAccess.js`
- `src/utils/overlayAssetAccess.js`
- `scripts/test-overlay-access.mjs`
- `scripts/test-overlay-access-browser.mjs`

Updated the existing integration points:

- `src/components/AdminPanel/AdminPanel.jsx`
- `src/components/OverlayCenter/OverlayRenderer.jsx`
- `src/components/OverlayCenter/editor/BackgroundLibraryPicker.jsx`
- `src/components/OverlayCenter/editor/BetterObsOverlay.jsx`
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`
- `src/components/OverlayCenter/editor/betterWidgetRegistry.jsx`
- `src/components/OverlayCenter/widgets/slot-bingo/SlotBingoConfig.jsx`
- `src/effects/ThemeEffects/ThemeEffectsLayer.jsx`
- `scripts/test-brutus-slideshow.mjs`
- `scripts/test-widget-colour-themes.mjs`
- `package.json`
