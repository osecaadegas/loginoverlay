import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler, { hasValidCronAuthorization } from '../api/_lib/routes/auto-draw-winners.js';

const original = {
  CRON_SECRET: process.env.CRON_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function response() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

function restore() {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

test('cron authorization is exact and fails closed', () => {
  assert.equal(hasValidCronAuthorization('Bearer secret', 'secret'), true);
  for (const header of ['Bearer secret ', 'bearer secret', 'Bearer secretx', '', undefined]) {
    assert.equal(hasValidCronAuthorization(header, 'secret'), false);
  }
  assert.equal(hasValidCronAuthorization('Bearer secret', ''), false);
});

test('draw route rejects unauthenticated and unconfigured requests before database access', async () => {
  try {
    const createClientImpl = () => { throw new Error('database should not be called'); };
    delete process.env.CRON_SECRET;
    let res = response();
    await handler({ method: 'GET', headers: {} }, res, { createClientImpl });
    assert.equal(res.statusCode, 503);
    process.env.CRON_SECRET = 'local-test-secret';
    res = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer wrong' } }, res, { createClientImpl });
    assert.equal(res.statusCode, 401);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
  } finally { restore(); }
});

test('authorized cron delegates one atomic database draw and returns its result', async () => {
  try {
    process.env.CRON_SECRET = 'local-test-secret';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-test-key';
    let calls = 0;
    const res = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer local-test-secret' } }, res, {
      createClientImpl: () => ({ rpc: async name => {
        assert.equal(name, 'draw_expired_giveaways');
        calls += 1;
        return { data: { status: 'ok', drawn: 1, winners: 2 }, error: null };
      } }),
    });
    assert.equal(calls, 1);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { status: 'ok', drawn: 1, winners: 2 });
  } finally { restore(); }
});

test('missing database migration does not report a successful draw', async () => {
  try {
    process.env.CRON_SECRET = 'local-test-secret';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-test-key';
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer local-test-secret' } }, res, {
      createClientImpl: () => ({ rpc: async () => ({ data: null, error: { code: 'PGRST202' } }) }),
    });
    assert.equal(res.statusCode, 503);
  } finally { restore(); }
});
