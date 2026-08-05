import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import apiHandler from "../api/[...path].js";

const apiDirectory = new URL("../api/", import.meta.url);
const functionEntries = readdirSync(apiDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
  .map((entry) => entry.name)
  .sort();

assert.ok(
  functionEntries.length <= 12,
  `Vercel Hobby supports at most 12 functions; found ${functionEntries.length}: ${functionEntries.join(", ")}`,
);

const routerSource = readFileSync(
  new URL("../api/[...path].js", import.meta.url),
  "utf8",
);

for (const routeName of [
  "create-billing-portal-session",
  "public-slot-count",
]) {
  assert.ok(
    routerSource.includes(`"${routeName}"`),
    `Catch-all router must register ${routeName}`,
  );
  assert.equal(
    existsSync(new URL(`../api/${routeName}.js`, import.meta.url)),
    false,
    `${routeName} must stay consolidated under api/_lib/routes`,
  );
}

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end() {
      return this;
    },
  };
}

for (const [routeName, expectedStatus] of [
  ["create-billing-portal-session", 200],
  ["public-slot-count", 204],
]) {
  const response = createResponse();
  await apiHandler(
    { method: "OPTIONS", query: { path: [routeName] }, headers: {} },
    response,
  );
  assert.equal(response.statusCode, expectedStatus);
  assert.match(response.headers["Access-Control-Allow-Methods"], /OPTIONS/);
}

console.log(
  `Vercel function limit check passed (${functionEntries.length}/12 functions).`,
);