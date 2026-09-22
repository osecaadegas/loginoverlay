import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the real Supabase SDK's thenable builders, not Promise-shaped database mocks.
process.env.SUPABASE_URL = 'https://analytics-test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const { default: handler } = await import('../api/_lib/routes/analytics.js');
const originalFetch = globalThis.fetch;
const calls = [];
const visitorId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
let failTable = '', failRpc = false, legacySession = false;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input instanceof Request ? input.url : input);
  assert.equal(url.host, 'analytics-test.supabase.co', 'Tests never contact external services');
  const table = url.pathname.split('/').at(-1);
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ table, body, method: init.method });
  let result = null, status = 200;
  if (table === failTable || (failRpc && url.pathname.includes('/rpc/'))) {
    status = 503; result = { code: 'TEST_UNAVAILABLE', message: 'Test persistence outage' };
  } else if (legacySession && table === 'analytics_sessions' && body?.anonymous_id !== undefined) {
    status = 400; result = { code: 'PGRST204', message: 'Could not find the anonymous_id column' };
  } else if (table === 'analytics_visitors') result = { id: visitorId };
  else if (table === 'analytics_sessions') result = { id: sessionId };
  else if (table === 'analytics_events') result = { id: 'event-1' };
  else if (!url.pathname.includes('/rpc/')) result = [];
  return new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } });
};

async function request(action, body, method = 'POST') {
  const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method, query: { action }, headers: {}, body }, res);
  return res;
}
const sessionBody = { fingerprint: 'runtime-test', anonymous_id: 'runtime-anonymous', landing_page: '/' };
try {
  let res = await request('session', sessionBody);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.session_id, sessionId);
  assert.notEqual(res.body.persisted, false, 'Normal sessions must actually persist');
  assert.ok(calls.findIndex(c => c.table === 'analytics_sessions') < calls.findIndex(c => c.table === 'analytics_increment_visitor_sessions'));
  assert.equal(calls.filter(c => c.table === 'analytics_increment_visitor_sessions').length, 1);
  console.log('PASS: real SDK builders save a session and increment its visitor after persistence');

  calls.length = 0; failTable = 'analytics_visitors';
  res = await request('session', sessionBody);
  assert.equal(res.statusCode, 200); assert.equal(res.body.persisted, false);
  assert.ok(res.body.session_id);
  assert.ok(!calls.some(c => c.table === 'analytics_sessions' || c.table.startsWith('analytics_increment_')));
  console.log('PASS: visitor outage returns an explicitly temporary session without writes or HTTP 500');

  calls.length = 0; failTable = 'analytics_sessions';
  res = await request('session', sessionBody);
  assert.equal(res.body.persisted, false);
  assert.ok(!calls.some(c => c.table === 'analytics_increment_visitor_sessions'));
  console.log('PASS: failed session inserts do not inflate visitor counters');

  failTable = ''; failRpc = true;
  res = await request('session', sessionBody);
  assert.equal(res.body.session_id, sessionId); assert.notEqual(res.body.persisted, false);
  console.log('PASS: optional counter outage does not discard an otherwise saved session');

  failRpc = false; legacySession = true; calls.length = 0;
  res = await request('session', sessionBody);
  assert.equal(res.body.session_id, sessionId);
  assert.equal(calls.filter(c => c.table === 'analytics_sessions').length, 2);
  console.log('PASS: legacy session-column fallback remains supported');

  legacySession = false; calls.length = 0;
  res = await request('track', { session_id: sessionId, visitor_id: visitorId, event_type: 'pageview', page_url: '/' });
  assert.equal(res.statusCode, 200);
  assert.ok(calls.some(c => c.table === 'analytics_increment_session'));
  assert.ok(calls.some(c => c.table === 'analytics_increment_visitor_events'));
  console.log('PASS: event tracking awaits both real SDK counter builders');

  res = await request('session', {}); assert.equal(res.statusCode, 400);
  res = await request('session', sessionBody, 'GET'); assert.equal(res.statusCode, 405);
  res = await request('overview', {}, 'GET'); assert.equal(res.statusCode, 401);
  console.log('PASS: validation, HTTP methods and dashboard authentication remain enforced');

  const { PGlite } = await import(process.env.PGLITE_MODULE || '../.codex-dev/review-test-deps/node_modules/@electric-sql/pglite/dist/index.js');
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE analytics_visitors (id UUID PRIMARY KEY, total_sessions INT NOT NULL DEFAULT 0);
    INSERT INTO analytics_visitors(id) VALUES ('${visitorId}');`);
  const migration = readFileSync(new URL('../migrations/20260922025500_analytics_visitor_session_counter.sql', import.meta.url), 'utf8');
  await db.exec(migration); await db.exec(migration);
  await db.exec(`SET ROLE service_role; SELECT public.analytics_increment_visitor_sessions('${visitorId}'); RESET ROLE;`);
  assert.equal((await db.query('SELECT total_sessions FROM analytics_visitors')).rows[0].total_sessions, 1);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query(`SELECT public.analytics_increment_visitor_sessions('${visitorId}')`), /permission denied/);
    await db.exec('RESET ROLE');
  }
  await db.close();
  console.log('PASS: migration is repeatable, increments correctly and rejects client roles');
} finally {
  globalThis.fetch = originalFetch;
}
