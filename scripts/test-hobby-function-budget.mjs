import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const apiDir = fileURLToPath(new URL('../api/', import.meta.url));
const functions = readdirSync(apiDir).filter((name) => name.endsWith('.js'));
assert.equal(functions.length, 12, `Hobby deployment must have at most 12 top-level functions: ${functions.join(', ')}`);
assert.ok(!functions.includes('tournament-participants.js'));
assert.ok(!functions.includes('crypto-prices.js'));

const { default: handler } = await import('../api/[...path].js');
const headers = {};
const response = {
  statusCode: 200,
  setHeader(key, value) { headers[key] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; },
  end() { return this; },
};
await handler({ method: 'OPTIONS', url: '/api/crypto-prices', query: { path: ['crypto-prices'] } }, response);
assert.equal(response.statusCode, 204);
assert.equal(headers['Access-Control-Allow-Methods'], 'GET, OPTIONS');

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ bitcoin: { usd: 65000, usd_24h_change: 1.25 } }),
});
try {
  await handler({ method: 'GET', url: '/api/crypto-prices', query: { path: ['crypto-prices'] } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.prices.btc.price, 65000);
  assert.equal(response.payload.prices.btc.change, 1.25);
  assert.match(headers['Cache-Control'], /stale-while-revalidate=300/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Hobby function count and existing crypto-prices API contract passed.');
