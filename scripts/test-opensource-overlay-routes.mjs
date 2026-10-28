import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const app = read("../src/App.jsx");
const page = read("../src/components/OpenSourceOverlay/OpenSourceOverlayPage.jsx");
const preview = read("../src/components/OpenSourceOverlay/OpenSourceOverlayPreview.jsx");
const build = read("../src/components/OpenSourceOverlay/openSourceOverlayBuild.js");
const apps = read("../src/components/AppsPage/AppsPage.jsx");
const notes = read("../api/_lib/release-notes.js");
const roleMigration = read("../migrations/20261028190000_twitch_free_tier_overlay.sql");
const roleGrantMigration = read("../migrations/20261028190500_twitch_free_tier_rpc_revoke_anon.sql");
const roleHook = read("../src/hooks/useAdmin.js");
const routeGuard = read("../src/components/ProtectedRoute/ProtectedAdminRoute.jsx");

for (const path of ["/opensource", "/opensource_preview"]) {
  assert.match(app, new RegExp(`path="${path}"[\\s\\S]{0,160}<ProtectedAdminRoute allowFreeTier>[\\s\\S]*?<OpenSource`), `${path} allows freeTier accounts`);
}
assert.match(apps, /isAdmin \|\| isFreeTier[\s\S]{0,100}to: "\/opensource"[\s\S]{0,80}label: "Open Source Overlay"/);
assert.match(app, /path="\/overlay-center\/\*"[\s\S]{0,260}allowFreeTier/);
assert.match(routeGuard, /allowFreeTier && isFreeTier/);
assert.match(roleHook, /supabase\.rpc\("ensure_twitch_free_tier"\)/);
assert.match(roleMigration, /FROM auth\.identities[\s\S]*WHERE provider = 'twitch'/);
assert.match(roleMigration, /account_id uuid := auth\.uid\(\)/);
assert.match(roleMigration, /GRANT EXECUTE ON FUNCTION public\.ensure_twitch_free_tier\(\) TO authenticated/);
assert.match(roleGrantMigration, /REVOKE ALL ON FUNCTION public\.ensure_twitch_free_tier\(\) FROM anon/);
assert.doesNotMatch(app, /path="\/editor"[\s\S]{0,200}allowFreeTier/);
assert.match(page, /"\/overlay-center\/widgets\/bonus-hunt"/);
assert.match(page, /"\/overlay-center\/widgets\/chat"/);
assert.match(page, /"\/overlay-center\/widgets\/giveaway"/);
assert.match(page, /"\/overlay-center\/widgets\/navbar"/);
assert.match(page, /"\/overlay-center\/integrations"/);
assert.match(page, /"\/overlay-center\/slots"/);
assert.match(page, /"\/overlay-center\/widgets\/background"/);
assert.match(page, /"\/overlay-center\/widgets\/raid-shoutout"/);
assert.match(page, /"\/overlay-center\/widgets\/tournament"/);
assert.match(page, /"\/overlay-center\/widgets\/current-slot"/);
assert.match(page, /to="\/opensource_preview"/);
assert.match(build, /hasStreamerOverlayComposition\(fullBuild\.draftLayout\)/);
assert.match(build, /isLegacyStreamerOverlayComposition\(fullBuild\.draftLayout\)/);
assert.match(build, /saveBetterDraft\(/);
assert.match(build, /createBetterEditorOverlay\(/);
assert.match(build, /selectBetterEditorOverlay\(/);
assert.match(preview, /getBetterEditorLiveSource\(user\.id\)/);
assert.match(preview, /subscribeToBetterLiveSource/);
assert.match(preview, /renderBetterWidgetInstance\(/);
assert.match(preview, /runtime: "obs"/);
assert.match(preview, /draftLayout/);
assert.match(notes, /opensource-overlay-dedicated-admin-studio-2026-10-22/);
assert.doesNotMatch(page, /Fever|fever/i, "the admin dashboard does not expose the streamer name as a feature label");

console.log("Open Source Overlay route checks passed: Twitch free tier grant, source routes and controls, dedicated Apps entry, draft-backed preview, and restricted editor route.");
