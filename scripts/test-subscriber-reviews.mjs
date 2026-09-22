import assert from 'node:assert/strict';
import { createReviewsHandler, applyReviewReward } from '../api/_lib/routes/reviews.js';
import { validateReview, rewardPlan, rewardUpdateParams, verifyReviewSubscription, REVIEW_REWARD_SECONDS } from '../api/_lib/review-rewards.js';
import { handleStripeEvent } from '../api/stripe-webhook.js';

const now = Math.floor(Date.now() / 1000);
const base = {
  id: 'sub_test', customer: 'cus_test', status: 'active', current_period_end: now + 864000,
  items: { data: [{ price: { recurring: { usage_type: 'licensed' } } }] }, metadata: { user_id: 'user-a' },
  cancel_at_period_end: false, cancel_at: null,
};
const record = { user_id: 'user-a', stripe_subscription_id: 'sub_test', stripe_customer_id: 'cus_test', provider: 'stripe', product_code: 'streamer_premium', status: 'active', current_period_end: new Date(base.current_period_end * 1000).toISOString() };
const valid = { displayName: 'Test subscriber', rating: 1, body: 'A useful tool, but setup could be clearer.', consent: true };

// Supabase contract double: real handlers, auth checks, filters and persistent reward state.
function database() {
  const tables = { billing_subscriptions: [structuredClone(record)], service_reviews: [] };
  let failAppliedSave = false;
  const db = {
    tables, failNextAppliedSave: () => { failAppliedSave = true; },
    rpc: async () => {
      const published = tables.service_reviews.filter((r) => r.published);
      return { data: { count: published.length, average: published.length ? published.reduce((sum, r) => sum + r.rating, 0) / published.length : null } };
    },
    from(table) {
      let filters = [], operation = 'select', values, fields = '*', from = 0, to = Infinity, single = false;
      const q = {
        select(v = '*') { fields = v; return q; },
        eq(k, v) { filters.push((r) => r[k] === v); return q; },
        in(k, v) { filters.push((r) => v.includes(r[k])); return q; },
        gt(k, v) { filters.push((r) => r[k] > v); return q; },
        order() { return q; }, limit(n) { to = n - 1; return q; }, range(a, b) { from = a; to = b; return q; },
        maybeSingle() { single = true; return q; }, single() { single = true; return q; },
        insert(v) { operation = 'insert'; values = v; return q; }, update(v) { operation = 'update'; values = v; return q; },
        async then(resolve, reject) {
          try {
            let rows;
            if (operation === 'insert') {
              if (tables[table].some((r) => r.user_id === values.user_id)) return resolve({ error: { code: '23505' } });
              rows = [{ id: '12345678-1234-4234-8234-123456789012', published: true, reward_status: 'pending', created_at: new Date().toISOString(), ...values }];
              tables[table].push(...rows);
            } else {
              rows = tables[table].filter((r) => filters.every((filter) => filter(r)));
              if (operation === 'update') {
                if (failAppliedSave && values.reward_status === 'applied') { failAppliedSave = false; return resolve({ error: { code: 'DB_FAILURE' } }); }
                rows.forEach((r) => Object.assign(r, values));
              }
            }
            rows = rows.slice(from, to + 1).map((r) => fields === '*' ? structuredClone(r) : Object.fromEntries(fields.split(',').map((key) => [key, r[key]])));
            resolve({ data: single ? rows[0] || null : rows, error: null });
          } catch (err) { reject(err); }
        },
      };
      return q;
    },
  };
  return db;
}

function fixture() {
  const db = database(); let stripe = structuredClone(base); let writes = 0; let failUpdate = false; let failSync = false;
  const idempotency = new Map();
  const deps = {
    createDb: () => db,
    authenticate: async (req) => { if (!req.headers.authorization) throw Object.assign(new Error('Authentication required'), { statusCode: 401 }); return { id: req.headers.authorization }; },
    isAdmin: async (_, userId) => userId === 'admin',
    retrieve: async () => structuredClone(stripe),
    updateStripe: async (_, { params, idempotencyKey }) => {
      if (failUpdate) throw new Error('Stripe unavailable');
      if (idempotency.has(idempotencyKey)) return structuredClone(idempotency.get(idempotencyKey));
      writes++;
      assert.equal(params.proration_behavior, 'none');
      stripe = { ...stripe, current_period_end: params.trial_end, trial_end: params.trial_end, status: 'trialing', metadata: { ...stripe.metadata, service_review_reward: params['metadata[service_review_reward]'] } };
      idempotency.set(idempotencyKey, stripe);
      return structuredClone(stripe);
    },
    sync: async () => { if (failSync) throw new Error('Sync unavailable'); },
  };
  const handler = createReviewsHandler(deps);
  async function request(method = 'POST', action = 'public', body = valid, user = 'user-a') {
    const req = { method, query: { action }, body, headers: user ? { authorization: user } : {} };
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(v) { this.statusCode = v; return this; }, json(v) { this.body = v; return this; }, end() { return this; } };
    await handler(req, res); return res;
  }
  return { db, deps, request, writes: () => writes, stripe: () => stripe, setStripe: (v) => { stripe = v; }, setFailUpdate: (v) => { failUpdate = v; }, setFailSync: (v) => { failSync = v; } };
}

let checks = 0;
async function test(name, fn) { await fn(); checks++; console.log(`PASS ${name}`); }
await test('validation requires consent, rating, bounded name and meaningful review', () => {
  assert.equal(validateReview(valid).rating, 1);
  for (const input of [{ ...valid, consent: false }, { ...valid, rating: 6 }, { ...valid, rating: '5' }, { ...valid, body: 'short' }, { ...valid, body: 'x'.repeat(1501) }, { ...valid, displayName: 'x'.repeat(61) }]) assert.throws(() => validateReview(input));
});
await test('exact three-day extension without a prorated charge', () => {
  const plan = rewardPlan(base); assert.equal(plan.reward_period_end - plan.original_period_end, REVIEW_REWARD_SECONDS);
  assert.equal(rewardUpdateParams({ id: 'reward', ...plan }).proration_behavior, 'none');
  assert.equal(rewardUpdateParams({ ...plan, cancel_at_period_end: true }).cancel_at_period_end, true);
  assert.equal(rewardUpdateParams({ ...plan, original_cancel_at: plan.original_period_end }).cancel_at, plan.reward_period_end);
});
await test('canceled, expired, past-due and foreign subscriptions rejected', () => {
  for (const sub of [{ ...base, status: 'canceled' }, { ...base, status: 'past_due' }, { ...base, current_period_end: now - 1 }, { ...base, customer: 'foreign' }, { ...base, metadata: { user_id: 'other' } }]) assert.throws(() => verifyReviewSubscription(sub, record, 'user-a'));
  assert.throws(() => verifyReviewSubscription(base, record, 'user-b'));
  verifyReviewSubscription({ ...base, current_period_end: undefined, items: { data: [{ current_period_end: base.current_period_end }] } }, record, 'user-a');
});
await test('custom schedules, metered and paused plans cannot be changed accidentally', () => {
  for (const sub of [{ ...base, schedule: 'sched' }, { ...base, pause_collection: {} }, { ...base, pending_update: {} }, { ...base, cancel_at: now + 60 }, { ...base, items: { data: [{ price: { recurring: { usage_type: 'metered' } } }] } }]) assert.throws(() => rewardPlan(sub));
});
await test('unauthenticated and non-subscribers cannot submit', async () => {
  const f = fixture(); assert.equal((await f.request('POST', 'public', valid, null)).statusCode, 401);
  assert.equal((await f.request('POST', 'public', valid, 'user-b')).statusCode, 403);
  assert.equal(f.db.tables.service_reviews.length, 0); assert.equal(f.writes(), 0);
});
await test('a one-star review earns the same reward and replay cannot change its content', async () => {
  const f = fixture(); const result = await f.request(); assert.equal(result.statusCode, 200);
  assert.equal(result.body.review.rewardStatus, 'applied'); assert.equal(f.writes(), 1);
  await f.request('POST', 'public', { ...valid, rating: 5 }); assert.equal(f.writes(), 1);
  assert.equal(f.db.tables.service_reviews[0].rating, 1); assert.equal(f.db.tables.service_reviews.length, 1);
});
await test('concurrent submissions grant only one fixed extension', async () => {
  const f = fixture(); const results = await Promise.all([f.request(), f.request(), f.request()]);
  assert.ok(results.every((r) => r.statusCode === 200)); assert.equal(f.writes(), 1);
  assert.equal(f.stripe().current_period_end, base.current_period_end + REVIEW_REWARD_SECONDS);
});
await test('Stripe failure saves pending review; retry grants exactly once', async () => {
  const f = fixture(); f.setFailUpdate(true); assert.equal((await f.request()).statusCode, 202);
  assert.equal(f.db.tables.service_reviews.length, 1); f.setFailUpdate(false);
  assert.equal((await f.request()).body.review.rewardStatus, 'applied'); assert.equal(f.writes(), 1);
});
await test('database failure after Stripe success recovers using durable receipt', async () => {
  const f = fixture(); f.db.failNextAppliedSave(); assert.equal((await f.request()).statusCode, 202);
  assert.equal((await f.request()).body.review.rewardStatus, 'applied'); assert.equal(f.writes(), 1);
});
await test('access sync failure cannot duplicate reward, even after later cancellation', async () => {
  const f = fixture(); f.setFailSync(true); await f.request(); f.setFailSync(false);
  f.setStripe({ ...f.stripe(), status: 'canceled' });
  assert.equal((await f.request()).body.review.rewardStatus, 'applied'); assert.equal(f.writes(), 1);
});
await test('changed period or cancellation is not overwritten by pending reward', async () => {
  const f = fixture(); f.setFailUpdate(true); await f.request(); f.setFailUpdate(false);
  f.setStripe({ ...base, cancel_at_period_end: true }); assert.equal((await f.request()).statusCode, 202); assert.equal(f.writes(), 0);
});
await test('a receipt without the confirmed extension cannot mark a reward applied', async () => {
  const f = fixture(); f.setFailUpdate(true); await f.request(); f.setFailUpdate(false);
  f.setStripe({ ...base, metadata: { ...base.metadata, service_review_reward: f.db.tables.service_reviews[0].id }, trial_end: base.current_period_end });
  assert.equal((await f.request()).statusCode, 202);
  assert.equal(f.db.tables.service_reviews[0].reward_status, 'pending'); assert.equal(f.writes(), 0);
});
await test('public API omits account and billing identifiers; moderation keeps reward ledger', async () => {
  const f = fixture(); await f.request(); const response = await f.request('GET', 'public', null, null);
  assert.equal(response.body.summary.count, 1); assert.equal(response.body.summary.average, 1);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  for (const field of ['user_id', 'stripe_subscription_id', 'stripe_customer_id', 'reward_period_end']) assert.equal(response.body.reviews[0][field], undefined);
  const id = f.db.tables.service_reviews[0].id;
  assert.equal((await f.request('PATCH', 'admin', { id, published: false })).statusCode, 403);
  assert.equal((await f.request('PATCH', 'admin', { id, published: false }, 'admin')).statusCode, 200);
  assert.equal((await f.request('GET', 'public', null, null)).body.summary.count, 0);
  await f.request(); assert.equal(f.writes(), 1); assert.equal(f.db.tables.service_reviews.length, 1);
});
await test('Player subscriptions qualify without Streamer or administrator roles', async () => {
  const f = fixture(); f.db.tables.billing_subscriptions[0].product_code = 'player_bonus_hunt';
  const result = await f.request(); assert.equal(result.body.review.productCode, 'player_bonus_hunt'); assert.equal(f.writes(), 1);
});
await test('invalid input and unsupported HTTP methods have no billing side effects', async () => {
  const f = fixture(); assert.equal((await f.request('POST', 'public', { ...valid, consent: false })).statusCode, 400);
  assert.equal((await f.request('DELETE')).statusCode, 405); assert.equal(f.writes(), 0);
});
await test('delayed subscription webhooks sync current Stripe dates and cancellation', async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.STRIPE_SECRET_KEY;
  const latest = { ...base, current_period_end: base.current_period_end + REVIEW_REWARD_SECONDS, trial_end: base.current_period_end + REVIEW_REWARD_SECONDS, status: 'trialing' };
  const writes = [];
  const db = { from: table => ({
    upsert: async value => { writes.push({ table, value }); return {}; },
    select: () => { const q = { eq: () => q, maybeSingle: async () => ({ data: { id: 'role-test' } }) }; return q; },
    update: value => ({ eq: async () => { writes.push({ table, value }); return {}; } }),
  }) };
  try {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fixture_only';
    globalThis.fetch = async url => {
      assert.equal(String(url), 'https://api.stripe.com/v1/subscriptions/sub_test');
      return { ok: true, json: async () => structuredClone(latest) };
    };
    await handleStripeEvent(db, { type: 'customer.subscription.updated', data: { object: base } });
    assert.equal(writes.find(w => w.table === 'billing_subscriptions').value.current_period_end, new Date(latest.current_period_end * 1000).toISOString());
    writes.length = 0; latest.status = 'canceled';
    await handleStripeEvent(db, { type: 'customer.subscription.created', data: { object: base } });
    assert.equal(writes.find(w => w.table === 'user_roles').value.is_active, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = originalSecret;
  }
});
console.log(`${checks} subscriber review and reward checks passed.`);
