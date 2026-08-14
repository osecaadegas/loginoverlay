import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const footerSource = read("../src/components/LandingPage/ContactFooter.jsx");
const landingSource = read("../src/components/LandingPage/LandingPage.jsx");
const toolLandingSource = read(
  "../src/components/LandingPage/ToolLandingPage.jsx",
);
const adminSource = read("../src/components/AdminPanel/AdminPanel.jsx");
const inboxSource = read(
  "../src/components/AdminPanel/ContactMessagesAdmin.jsx",
);
const apiSource = read("../api/_lib/routes/contact-messages.js");
const routerSource = read("../api/[...path].js");
const migrationSource = read("../migrations/041_contact_messages.sql");

assert.match(footerSource, /fetch\("\/api\/contact-messages"/);
assert.match(footerSource, /type="email"/);
assert.match(footerSource, /name="website"/);
assert.match(footerSource, /aria-expanded=\{contactOpen\}/);
assert.match(footerSource, /aria-controls="footer-contact-form"/);
assert.match(footerSource, /\{contactOpen && \(/);
assert.match(landingSource, /<ContactFooter \/>/);
assert.match(toolLandingSource, /<ContactFooter \/>/);

assert.match(routerSource, /"contact-messages": contactMessagesHandler/);
assert.match(apiSource, /if \(req\.method === "POST"\)/);
assert.match(apiSource, /if \(req\.method === "GET"\)/);
assert.match(apiSource, /if \(req\.method === "PATCH"\)/);
assert.match(apiSource, /return await submitMessage\(req, res, supabase\)/);
assert.match(apiSource, /return await listMessages\(req, res, supabase\)/);
assert.match(apiSource, /return await updateMessage\(req, res, supabase\)/);
assert.match(apiSource, /await requireAdmin\(req, supabase\)/);
assert.match(apiSource, /EMAIL_PATTERN\.test\(email\)/);

assert.match(adminSource, /"messages"/);
assert.match(adminSource, /<ContactMessagesAdmin \/>/);
assert.match(inboxSource, /Reply by email/);
assert.match(inboxSource, /updateStatus\(item\.id, "resolved"\)/);
assert.match(inboxSource, /updateStatus\(item\.id, "archived"\)/);

assert.match(
  migrationSource,
  /CREATE TABLE IF NOT EXISTS public\.contact_messages/,
);
assert.match(migrationSource, /ENABLE ROW LEVEL SECURITY/);
assert.match(
  migrationSource,
  /REVOKE ALL ON public\.contact_messages FROM anon, authenticated/,
);
assert.match(migrationSource, /Admins read contact messages/);
assert.match(migrationSource, /Admins update contact messages/);
assert.doesNotMatch(migrationSource, /FOR INSERT\s+TO anon/);

console.log("Contact message flow checks passed.");
