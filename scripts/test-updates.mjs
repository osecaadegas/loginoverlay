import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createUpdatesHandler } from '../api/_lib/routes/updates.js';
import { releaseNotes } from '../api/_lib/release-notes.js';

function clientFor({ roles = [], subscription = null, trial = null, player = null, invalid = false, dbError = false } = {}) {
  return {
    auth: { getUser: async token => token !== 'valid-token' || invalid ? { error: new Error('Invalid') } : { data: { user: { id: 'verified-user', user_metadata: { role: 'premium' } } } } },
    from(table) {
      const data = { user_roles: roles, billing_subscriptions: subscription, user_trials: trial, user_product_subscriptions: player }[table];
      const query = { then: resolve => Promise.resolve({ data, error: dbError ? { message: 'Database unavailable' } : null }).then(resolve) };
      for (const method of ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle', 'update']) query[method] = (...args) => {
        if (method === 'eq' && args[0] === 'user_id') assert.equal(args[1], 'verified-user');
        return query;
      };
      return query;
    },
  };
}
async function request(config = {}, method = 'GET', token = 'valid-token') {
  let body, status;
  const headers = {};
  const res = { setHeader: (key, value) => { headers[key] = value; }, status: code => { status = code; return res; }, json: value => { body = value; }, end: () => {} };
  await createUpdatesHandler({ createClient: () => clientFor(config) })({ method, headers: token ? { authorization: `Bearer ${token}` } : {} }, res);
  assert.equal(headers['Cache-Control'], 'private, no-store');
  return { status, body };
}
const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();
for (const [config, token, expected] of [
  [{}, '', 401], [{ invalid: true }, 'valid-token', 401], [{}, 'forged-token', 401],
  [{}, 'valid-token', 403], // user_metadata must never grant access
  [{ roles: [{ role: 'moderator' }] }, 'valid-token', 403],
  [{ roles: [{ role: 'affiliate' }] }, 'valid-token', 403],
  [{ roles: [{ role: 'premium', access_expires_at: past }] }, 'valid-token', 403],
  [{ subscription: { status: 'active', current_period_end: past } }, 'valid-token', 403],
  [{ player: { status: 'active', current_period_end: future } }, 'valid-token', 403],
  [{ roles: [{ role: 'premium', access_expires_at: future }] }, 'valid-token', 200],
  [{ roles: [{ role: 'admin' }] }, 'valid-token', 200],
  [{ roles: [{ role: 'superadmin' }] }, 'valid-token', 200],
  [{ subscription: { status: 'active', current_period_end: future } }, 'valid-token', 200],
  [{ trial: { status: 'active', selected_product_type: 'streamer', expires_at: future } }, 'valid-token', 200],
  [{ dbError: true }, 'valid-token', 503],
]) {
  const result = await request(config, 'GET', token);
  assert.equal(result.status, expected, JSON.stringify(config));
  if (expected === 200) assert.deepEqual(result.body.updates, releaseNotes);
  else assert.equal(result.body.updates, undefined, 'Denied responses must not include any release notes');
}
assert.equal((await request({}, 'POST')).status, 405);
assert.equal((await request({}, 'OPTIONS', '')).status, 204);
assert.equal(new Set(releaseNotes.map(entry => entry.id)).size, releaseNotes.length);
for (const entry of releaseNotes) {
  assert.ok(['website', 'overlays', 'browser'].includes(entry.category));
  assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(entry.title && entry.summary && entry.changes.length);
  if (entry.link) assert.equal(new URL(entry.link.url).protocol, 'https:');
}
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /path="\/updates" element=\{<ProtectedAdminRoute allowPremium>/);
const route = readFileSync(new URL('../api/[...path].js', import.meta.url), 'utf8');
assert.ok(route.includes('updates: updatesHandler'));
console.log('Updates: 15 authorization cases, methods, private caching, catalog and route checks passed.');
