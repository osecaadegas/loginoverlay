import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import { createServer } from "vite";

const server = await createServer({ logLevel: "silent", server: { host: "127.0.0.1", port: 0, hmr: false } });
await server.listen();
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0], { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const TournamentConfig = (await import("/src/components/OverlayCenter/widgets/tournament/TournamentConfig.jsx")).default;
    const match = (id, player1, player2) => ({ id, player1, player2, type: "bonus_bo3", status: "pending", rounds: Array.from({ length: 3 }, (_, i) => ({ roundNum: i + 1, player1: {}, player2: {} })) });
    const matches = [match("one", "Alpha", "Beta"), match("two", "Gamma", "Delta")];
    window.__changes = [];
    window.__config = { layout: "pro", bracketPhase: "active", bracketType: "bonus_bo3", bracketPlayerCount: 4, bracketActiveRound: 0, bracketActiveMatch: 0,
      bracketData: [{ label: "Semi finals", matches }], data: { active: true, matches, currentMatchIdx: 0 } };
    document.body.innerHTML = '<div id="dashboard"></div>';
    const root = ReactDOM.createRoot(document.getElementById("dashboard"));
    const render = () => root.render(React.createElement(TournamentConfig, { config: window.__config, mode: "widget", onChange: (next) => { window.__changes.push(next); window.__config = next; render(); } }));
    render();
  });
  await page.waitForSelector('section[aria-label="Match queue"]');
  await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Match queue"] button')].find((button) => button.textContent.includes("Next"))?.click());
  await page.waitForFunction(() => document.querySelector('section[aria-label="Match queue"]')?.textContent.includes("Gamma vs Delta"));
  const preview = await page.evaluate(() => ({ changes: window.__changes.length, liveIndex: window.__config.data.currentMatchIdx,
    label: document.querySelector('section[aria-label="Match queue"]').textContent }));
  assert.equal(preview.changes, 0, "Preview navigation does not persist or change OBS data");
  assert.equal(preview.liveIndex, 0);
  assert.match(preview.label, /Preview only/);
  await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Match queue"] button')].find((button) => button.textContent.includes("Activate"))?.click());
  await page.waitForFunction(() => window.__config.data.currentMatchIdx === 1);
  const activated = await page.evaluate(() => ({ index: window.__config.data.currentMatchIdx, round: window.__config.bracketActiveRound, match: window.__config.bracketActiveMatch }));
  assert.deepEqual(activated, { index: 1, round: 0, match: 1 }, "Explicit activation updates only the selected live match pointer");
  console.log("PRO dashboard preview isolation and explicit match activation passed");
} finally {
  await browser?.close();
  await server.close();
}
