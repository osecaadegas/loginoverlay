import assert from 'node:assert/strict';
import { build } from 'esbuild';
import Module from 'node:module';

const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.SUPABASE_URL = 'https://test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';

const source = await build({
  entryPoints: ['api/chat-commands.js'], bundle: true, write: false, platform: 'node', format: 'cjs',
  plugins: [{ name: 'refund-dependencies', setup(plugin) {
    plugin.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: 'supabase', namespace: 'test' }));
    plugin.onResolve({ filter: /^\.\/_lib\// }, args => ({ path: args.path, namespace: 'test' }));
    plugin.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.path === 'supabase'
      ? 'export const createClient = () => globalThis.__refundClient;'
      : 'export default () => {}; export const processConnectFourCommand=()=>{}; export const slotRequestHandler=()=>{}; export const streamElementsConnectionHandler=()=>{};', loader: 'js' }));
  } }],
});
const testModule = new Module('chat-commands-refund-test.cjs');
testModule.filename = 'chat-commands-refund-test.cjs';
testModule.paths = Module._nodeModulePaths(process.cwd());
testModule._compile(source.outputFiles[0].text, testModule.filename);
const handler = testModule.exports.default;

const widget = { id: 'widget-1', updated_at: 'start', config: {
  gameStatus: 'open', _roundId: 'round-1', _roundUsesPoints: true,
  betters: { alice: { amount: 20 }, bob: { amount: 30 } },
} };
const ledger = new Map();
const credits = [];
let rejectBob = true;
let uncertainAlice = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = async url => {
  const match = String(url).match(/\/points\/channel\/([^/]+)\/(\d+)$/);
  assert.ok(match, `Unexpected external call ${url}`);
  if (match[1] === 'alice' && uncertainAlice) throw new Error('connection lost after sending credit');
  if (match[1] === 'bob' && rejectBob) return { ok: false, status: 400 };
  credits.push(`${match[1]}:${match[2]}`);
  return { ok: true, status: 200 };
};
function query(table) {
  const state = { conditions: {}, action: 'read', payload: null, ignoreDuplicates: false };
  const q = {
    select() { return q; }, eq(key, value) { state.conditions[key] = value; return q; },
    match(values) { Object.assign(state.conditions, values); return q; },
    limit() { return q; }, maybeSingle() { state.single = true; return q; }, single() { state.single = true; return q; },
    update(payload) { state.action = 'update'; state.payload = payload; return q; },
    upsert(payload, options) { state.action = 'upsert'; state.payload = payload; state.ignoreDuplicates = options?.ignoreDuplicates; return q; },
    then(resolve, reject) {
      try {
        if (table === 'overlay_widgets') {
          if (state.action === 'update') {
            if (state.conditions.updated_at !== widget.updated_at) return Promise.resolve({ data: [] }).then(resolve, reject);
            widget.config = state.payload.config; widget.updated_at = state.payload.updated_at;
            return Promise.resolve({ data: [{ id: widget.id }] }).then(resolve, reject);
          }
          return Promise.resolve({ data: widget }).then(resolve, reject);
        }
        if (table === 'streamelements_connections') return Promise.resolve({ data: { se_channel_id: 'channel', se_jwt_token: 'secret' } }).then(resolve, reject);
        const key = `${state.conditions.widget_id || state.payload.widget_id}:${state.conditions.round_id || state.payload.round_id}:${state.conditions.username || state.payload.username}`;
        const prior = ledger.get(key);
        if (state.action === 'upsert') {
          if (prior && state.ignoreDuplicates) return Promise.resolve({ data: [] }).then(resolve, reject);
          ledger.set(key, { ...state.payload });
          return Promise.resolve({ data: [state.payload] }).then(resolve, reject);
        }
        if (state.action === 'update') {
          if (!prior || (state.conditions.status && state.conditions.status !== prior.status)) return Promise.resolve({ data: [] }).then(resolve, reject);
          Object.assign(prior, state.payload);
          return Promise.resolve({ data: [prior] }).then(resolve, reject);
        }
        return Promise.resolve({ data: prior }).then(resolve, reject);
      } catch (error) { return Promise.reject(error).then(resolve, reject); }
    },
  };
  return q;
}
globalThis.__refundClient = { auth: { getUser: async token => ({ data: { user: token === 'valid' ? { id: 'owner' } : null }, error: null }) }, from: query };
async function request(token = 'valid') {
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  await handler({ method: 'POST', query: { cmd: 'bet-refund' }, body: { user_id: 'owner', round_id: 'round-1' }, headers: { authorization: `Bearer ${token}` } }, res);
  return res;
}
try {
  assert.equal((await request('invalid')).code, 401);
  const first = await request();
  assert.equal(first.code, 207);
  assert.deepEqual(credits, ['alice:20']);
  assert.equal(widget.config.gameStatus, 'locked');
  assert.equal(ledger.get('widget-1:round-1:alice').status, 'refunded');
  assert.equal(ledger.get('widget-1:round-1:bob').status, 'failed');
  rejectBob = false;
  const second = await request();
  assert.equal(second.code, 200);
  assert.deepEqual(credits, ['alice:20', 'bob:30']);
  assert.equal(second.body.alreadyRefunded, 1);
  assert.equal((await request()).body.refunded, 0);
  assert.deepEqual(credits, ['alice:20', 'bob:30']);
  widget.config = { ...widget.config, gameStatus: 'open', _roundId: 'round-2', betters: { alice: { amount: 40 } } };
  uncertainAlice = true;
  const uncertainRequest = async () => {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
    await handler({ method: 'POST', query: { cmd: 'bet-refund' }, body: { user_id: 'owner', round_id: 'round-2' }, headers: { authorization: 'Bearer valid' } }, res);
    return res;
  };
  assert.equal((await uncertainRequest()).body.needsReview, 1);
  uncertainAlice = false;
  assert.equal((await uncertainRequest()).body.needsReview, 1);
  assert.deepEqual(credits, ['alice:20', 'bob:30']);
  console.log('PASS authenticated refunds, partial retry, locked round and duplicate-credit prevention');
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.__refundClient;
  process.env.SUPABASE_URL = originalUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
}
