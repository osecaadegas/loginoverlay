import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildResultFromBonus, getSlotIdentity, queryUserSlotRecord, readSlotPersonalBest, recordMatchesSlot } from '../shared/slotPersonalBest.js';
import handler, { loadOverlayPersonalBest } from '../api/_lib/routes/slot-personal-best.js';

const slotId = '11111111-1111-4111-8111-111111111111';
const slot = { id: slotId, name: 'Mad Blast', provider: 'Reel Gaming' };
const publicA = `bo_${'a'.repeat(48)}`;
const publicB = `bo_${'b'.repeat(48)}`;
const legacyB = 'c'.repeat(48);

function database(tables) {
  const reads = [];
  return {
    reads,
    from(table) {
      let columns = '*', single = false, start = 0, end = Infinity;
      const filters = [], orders = [];
      const query = {
        select(value) { columns = value; return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        is(key, value) { return query.eq(key, value); },
        ilike(key, value) {
          const literal = value.replace(/\\([\\%_])/g, '$1').toLowerCase();
          filters.push((row) => String(row[key] || '').toLowerCase() === literal);
          return query;
        },
        order(key, { ascending = true } = {}) { orders.push([key, ascending]); return query; },
        limit(count) { end = count; return query; },
        range(from, to) { start = from; end = to + 1; return query; },
        maybeSingle() { single = true; return query; },
        then(resolve, reject) {
          reads.push({ table, columns, start });
          let rows = (tables[table] || []).filter((row) => filters.every((filter) => filter(row)));
          rows.sort((a, b) => {
            for (const [key, ascending] of orders) {
              if (a[key] !== b[key]) return (a[key] > b[key] ? 1 : -1) * (ascending ? 1 : -1);
            }
            return 0;
          });
          rows = rows.slice(start, end).map((row) => columns === '*' ? row :
            Object.fromEntries(columns.split(',').map((key) => [key.trim(), row[key.trim()]])));
          return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve, reject);
        },
      };
      // Deliberately no insert/update methods: the display path must be read-only.
      return query;
    },
  };
}

const record = (userId, bestWin, overrides = {}) => ({
  user_id: userId, slot_id: slotId, slot_name: slot.name, slot_provider: slot.provider,
  best_win: bestWin, best_multiplier: bestWin / 2, ...overrides,
});
const tables = {
  user_slot_records: [record('owner-a', 100), record('owner-b', 900)],
  better_overlay_publications: [
    { public_overlay_id: publicA, owner_user_id: 'owner-a', revoked_at: null },
    { public_overlay_id: publicB, owner_user_id: 'owner-b', revoked_at: null },
  ],
  overlay_instances: [{ overlay_token: legacyB, user_id: 'owner-b', is_active: true }],
};
const client = database(tables);
assert.equal((await readSlotPersonalBest(client, 'owner-a', slot)).best_win, 100);
assert.equal((await readSlotPersonalBest(client, 'owner-b', slot)).best_win, 900);
assert.equal(client.reads.some((read) => read.table === 'bonus_hunt_history'), false, 'Known best avoids history download');
assert.equal(getSlotIdentity({ id: 1234, slot }).id, slotId, 'Bonus row ID must not shadow slot ID');
assert.equal(buildResultFromBonus({ slot: 'Legacy Slot', bet: 2, result: 500 }).multiplier, 250);
assert.equal(recordMatchesSlot(record('owner-a', 100, { slot_id: null }), { ...slot, provider: 'Other Provider' }), false);
assert.equal(recordMatchesSlot({ slot_name: 'Some Slot' }, { id: slotId }), false);

const olderHistory = Array.from({ length: 260 }, (_, index) => ({
  id: index, user_id: 'history-owner', created_at: String(1000 - index), bonuses: [],
}));
olderHistory.push({ id: 260, user_id: 'history-owner', created_at: '000', bonuses: [
  { id: 999, slot, betSize: 2, payout: 1200 },
  { slot: 'Mad Blast', provider: slot.provider, bet: 1, result: 500 },
  { slot: { name: 'Mad Blast', provider: 'Other Provider' }, betSize: 1, payout: 99999 },
] });
const historyClient = database({
  user_slot_records: [record('history-owner', 0)],
  bonus_hunt_history: olderHistory,
});
assert.equal((await readSlotPersonalBest(historyClient, 'history-owner', slot)).best_win, 1200,
  'Zero aggregate falls back to history beyond the old 250-hunt cap, without writing');
assert.equal((await readSlotPersonalBest(historyClient, 'history-owner', slot)).best_multiplier, 600);
assert.equal(await readSlotPersonalBest(historyClient, 'other-owner', slot), null);
assert.equal(await readSlotPersonalBest(historyClient, 'history-owner', { name: 'Never Played' }), null);
const escaped = database({ user_slot_records: [record('owner-a', 50, { slot_id: null, slot_name: '100%_Slot' })] });
assert.equal((await queryUserSlotRecord(escaped, 'owner-a', { name: '100%_Slot' })).best_win, 50);

const request = (query) => ({ query: { slotName: slot.name, slotId, provider: slot.provider, ...query } });
let response = await loadOverlayPersonalBest(request({ publicOverlayId: publicA, userId: 'owner-b' }), client);
assert.equal(response.status, 200);
assert.equal(response.body.best.best_win, 100, 'Caller cannot select a different owner');
assert.equal('user_id' in response.body.best, false, 'Only the display record is returned');
response = await loadOverlayPersonalBest(request({ publicOverlayId: publicB }), client);
assert.equal(response.body.best.best_win, 900);
response = await loadOverlayPersonalBest(request({ overlayToken: legacyB }), client);
assert.equal(response.body.best.best_win, 900, 'Legacy token resolves the same owner');
const freshRequest = request({ publicOverlayId: publicB, slotName: 'Fresh Slot', slotId: '' });
assert.equal((await loadOverlayPersonalBest(freshRequest, client)).body.best, null);
tables.user_slot_records.push(record('owner-b', 700, { slot_id: null, slot_name: 'Fresh Slot' }));
assert.equal((await loadOverlayPersonalBest(freshRequest, client)).body.best.best_win, 700,
  'A newly saved record overrides cached missing history immediately');
tables.better_overlay_publications[0].revoked_at = '2026-01-01';
assert.equal((await loadOverlayPersonalBest(request({ publicOverlayId: publicA }), client)).status, 404, 'Revocation checked before cached best');
tables.overlay_instances[0].is_active = false;
assert.equal((await loadOverlayPersonalBest(request({ overlayToken: legacyB }), client)).status, 404);
const beforeInvalid = client.reads.length;
for (const query of [{ userId: 'owner-a' }, { publicOverlayId: 'invalid' }, { publicOverlayId: publicB, overlayToken: legacyB }]) {
  assert.equal((await loadOverlayPersonalBest(request(query), client)).status, 400);
}
assert.equal(client.reads.length, beforeInvalid);
const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; }, end() {} };
await handler({ method: 'POST' }, res);
assert.equal(res.code, 405);
await handler({ method: 'OPTIONS' }, res);
assert.equal(res.code, 204);
assert.match(readFileSync(new URL('../api/[...path].js', import.meta.url), 'utf8'), /"slot-personal-best": slotPersonalBestHandler/);
console.log('Personal best data and API tests passed: owner isolation, tokens, history, legacy records, read-only fallback.');

if (process.env.TEST_BASE_URL) await import('./test-rtp-personal-best-browser.mjs');
