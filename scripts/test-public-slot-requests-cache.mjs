import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createPublicSlotRequestsHandler,
  PUBLIC_SLOT_REQUESTS_CACHE_CONTROL,
} from "../api/_lib/routes/public-slot-requests.js";

function makeResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}

function makeClient({ publication = { owner_user_id: "owner-1" }, failRequests = false } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const query = {
        filters: {},
        statusList: null,
        single: false,
        select() { return query; },
        eq(key, value) { query.filters[key] = value; return query; },
        is(key, value) { query.filters[key] = value; return query; },
        in(key, value) { query.filters[key] = value; query.statusList = value; return query; },
        gte() { return query; },
        order() { return query; },
        limit(value) { query.limitValue = value; return query; },
        maybeSingle() { query.single = true; return query; },
        then(resolve, reject) {
          calls.push({ table, ...query.filters, statusList: query.statusList, limit: query.limitValue });
          if (table === "better_overlay_publications") {
            return Promise.resolve({ data: publication, error: null })
              .then(resolve, reject);
          }
          if (failRequests) {
            return Promise.resolve({ data: null, error: new Error("database unavailable") })
              .then(resolve, reject);
          }
          const row = query.statusList
            ? { id: "action-1", status: "played", updated_at: new Date().toISOString() }
            : { id: "request-1", slot_name: "Test Slot", status: "pending" };
          return Promise.resolve({ data: [row], error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

const validId = `bo_${"a".repeat(48)}`;
const client = makeClient();
const handler = createPublicSlotRequestsHandler({
  createClient: () => client,
  applyCors: () => {},
});
const success = makeResponse();
await handler({ method: "GET", query: { publicOverlayId: validId, limit: "8" } }, success);
assert.equal(success.statusCode, 200);
assert.equal(success.headers["cache-control"], PUBLIC_SLOT_REQUESTS_CACHE_CONTROL);
assert.equal(success.body.requests[0].id, "request-1");
assert.equal(success.body.actions[0].action, "accepted");
assert.equal(client.calls.length, 3, "each uncached refresh resolves the publication and both live lists");
assert.equal(client.calls[1].limit, 8);

const invalid = makeResponse();
await handler({ method: "GET", query: { publicOverlayId: "invalid" } }, invalid);
assert.equal(invalid.statusCode, 400);
assert.equal(invalid.headers["cache-control"], "no-store, max-age=0");

const revoked = makeResponse();
await createPublicSlotRequestsHandler({
  createClient: () => makeClient({ publication: null }),
  applyCors: () => {},
})({ method: "GET", query: { publicOverlayId: validId } }, revoked);
assert.equal(revoked.statusCode, 404);
assert.equal(revoked.headers["cache-control"], "no-store, max-age=0");

const failed = makeResponse();
const originalError = console.error;
console.error = () => {};
try {
  await createPublicSlotRequestsHandler({
    createClient: () => makeClient({ failRequests: true }),
    applyCors: () => {},
  })({ method: "GET", query: { publicOverlayId: validId } }, failed);
} finally {
  console.error = originalError;
}
assert.equal(failed.statusCode, 500);
assert.equal(failed.headers["cache-control"], "no-store, max-age=0");

const hook = await readFile(
  new URL("../src/components/OverlayCenter/widgets/slot-requests/shared/useSlotRequestsData.js", import.meta.url),
  "utf8",
);
assert.match(hook, /fetch\(`\/api\/public-slot-requests\?\$\{params\}`\)/);
assert.doesNotMatch(hook, /public-slot-requests[\s\S]{0,100}cache:\s*["']no-store/);
assert.match(hook, /PUBLIC_REQUEST_IDLE_POLL_MS = 10000/);
assert.match(hook, /PUBLIC_REQUEST_ACTIVE_POLL_MS = 5000/);
assert.match(hook, /requests\.length\s*\?\s*PUBLIC_REQUEST_ACTIVE_POLL_MS\s*:\s*PUBLIC_REQUEST_IDLE_POLL_MS/);

console.log("Public slot requests: idle OBS widgets poll every 10s, populated queues every 5s, successful responses use a short CDN cache, and invalid/revoked/failed responses remain uncached.");
