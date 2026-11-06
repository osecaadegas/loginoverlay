import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import { createServer } from "vite";

const server = await createServer({ logLevel: "silent", server: { host: "127.0.0.1", port: 0, hmr: false } });
await server.listen();
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(server.resolvedUrls.local[0], { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const TournamentWidget = (await import("/src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx")).default;
    document.body.innerHTML = '<div id="pro-host" style="width:560px;height:1080px"></div>';
    window.__React = React;
    window.__Widget = TournamentWidget;
    window.__root = ReactDOM.createRoot(document.getElementById("pro-host"));
    window.__match = {
      id: "cinematic-live", type: "bonus_bo3", status: "pending", winner: null,
      player1: "Player One", player2: "Player Two",
      slot1: { name: "Slot One" }, slot2: { name: "Slot Two" },
      rounds: Array.from({ length: 3 }, (_, index) => ({ roundNum: index + 1,
        player1: { bonusCost: 10, bonusPayout: null }, player2: { bonusCost: 10, bonusPayout: null } })),
    };
    window.__phase = "setup";
    window.__preset = "cinematic";
    window.__render = (layout = "pro") => window.__root.render(React.createElement(TournamentWidget, {
      config: { layout, bracketPhase: window.__phase, animationPreset: window.__preset, currency: "€", data: { matches: [window.__match], currentMatchIdx: 0 } },
    }));
    window.__render();
    window.__phases = [];
    new MutationObserver(() => window.__phases.push(document.querySelector(".tw-pro")?.dataset.cinematicPhase))
      .observe(document.getElementById("pro-host"), { subtree: true, attributes: true, attributeFilter: ["data-cinematic-phase"] });
  });
  await page.waitForSelector(".tw-pro");
  assert.equal(await page.$eval(".tw-pro", (node) => node.dataset.cinematicPhase), "idle", "Initial hydration is static");
  await page.evaluate(() => { window.__phase = "active"; window.__render(); });
  await page.waitForFunction(() => window.__phases.includes("intro"));
  await page.waitForFunction(() => document.querySelector(".tw-pro")?.dataset.cinematicPhase === "idle", { timeout: 5000 });
  await page.evaluate(() => { window.__match = { ...window.__match, status: "in_progress" }; window.__render(); });
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(await page.evaluate(() => window.__phases.filter((phase) => phase === "intro").length), 1, "Start status update does not repeat introduction");

  await page.evaluate(() => {
    window.__match = { ...window.__match, rounds: window.__match.rounds.map((round, index) => index === 0
      ? { ...round, revision: (round.revision || 0) + 1, player1: { ...round.player1, bonusPayout: 30 } } : round) };
    window.__render();
  });
  await page.waitForFunction(() => window.__phases.includes("payout"));
  await page.waitForFunction(() => document.querySelector(".tw-pro")?.dataset.cinematicPhase === "idle", { timeout: 5000 });
  assert.equal(await page.$eval('[data-pro-round="0"] [data-pro-side="left"] [data-pro-pay-value]', (node) => node.textContent), "€30.00");

  await page.evaluate(() => {
    window.__match = { ...window.__match, rounds: window.__match.rounds.map((round, index) => index === 0
      ? { ...round, revision: (round.revision || 0) + 1, player2: { ...round.player2, bonusPayout: 10 } } : round) };
    window.__render();
  });
  await page.waitForFunction(() => window.__phases.includes("result"));
  await page.waitForSelector(".tw-pro canvas", { timeout: 5000 });
  await page.waitForFunction(() => !document.querySelector(".tw-pro canvas") && document.querySelector(".tw-pro")?.dataset.cinematicPhase === "idle", { timeout: 15000 });
  const state = await page.evaluate(() => ({
    score: document.querySelector(".tw-pro-score")?.textContent,
    phases: window.__phases.filter(Boolean),
    fragmentCount: document.querySelectorAll(".tw-pro canvas").length,
    pay: document.querySelector('[data-pro-round="0"] [data-pro-side="right"] [data-pro-pay-value]')?.textContent,
  }));
  assert.equal(state.score, "1–0");
  assert.equal(state.pay, "€10.00");
  assert.equal(state.fragmentCount, 0);
  assert.deepEqual(state.phases.filter((phase) => phase !== "idle"), ["intro", "payout", "result"]);

  await page.evaluate(() => window.__render());
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(await page.evaluate(() => window.__phases.filter((phase) => phase === "result").length), 1, "Duplicate delivery does not replay");
  await page.evaluate(() => {
    window.__match = { ...window.__match, rounds: window.__match.rounds.map((round, index) => index === 1
      ? { ...round, revision: (round.revision || 0) + 1, player1: { ...round.player1, bonusPayout: 20 }, player2: { ...round.player2, bonusPayout: 20 } } : round) };
    window.__render();
  });
  await page.waitForFunction(() => window.__phases.filter((phase) => phase === "result").length === 2);
  await page.waitForFunction(() => document.querySelector(".tw-pro")?.dataset.cinematicPhase === "idle", { timeout: 7000 });
  assert.equal(await page.$(".tw-pro canvas"), null, "Tied round does not shatter either card");
  await page.evaluate(() => {
    window.__match = { ...window.__match, status: "completed", winner: "player1", rounds: window.__match.rounds.map((round, index) => index === 2
      ? { ...round, revision: (round.revision || 0) + 1, player1: { ...round.player1, bonusPayout: 40 }, player2: { ...round.player2, bonusPayout: 10 } } : round) };
    window.__render();
  });
  await page.waitForFunction(() => window.__phases.filter((phase) => phase === "result").length === 3);
  await page.waitForSelector(".tw-pro canvas", { timeout: 5000 });
  await page.waitForFunction(() => !document.querySelector(".tw-pro canvas") && document.querySelector(".tw-pro")?.dataset.cinematicPhase === "idle", { timeout: 15000 });
  assert.match(await page.$eval(".tw-pro-footer", (node) => node.textContent), /TOURNAMENT CHAMPION.*Player One/);
  assert.equal(await page.$eval(".tw-pro-score", (node) => node.textContent), "2–0");
  assert.equal(await page.$eval(".tw-pro-champion-crown", (node) => node.textContent), "♛");
  if (process.argv[2]) await (await page.$(".tw-pro")).screenshot({ path: process.argv[2] });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.evaluate(() => {
    window.__match = { ...window.__match, winner: "draw", rounds: window.__match.rounds.map((round, index) => index === 2
      ? { ...round, revision: (round.revision || 0) + 1, player2: { ...round.player2, bonusPayout: 50 } } : round) };
    window.__render();
  });
  await page.waitForFunction(() => document.querySelector(".tw-pro-score")?.textContent === "1–1");
  assert.equal(await page.$(".tw-pro canvas"), null, "Reduced motion shows corrected result without shatter");
  assert.equal(await page.$eval(".tw-pro", (node) => node.dataset.cinematicPhase), "idle");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.evaluate(async () => { window.__root.unmount(); window.__root = (await import("/node_modules/.vite/deps/react-dom_client.js")).default.createRoot(document.getElementById("pro-host")); window.__render(); });
  await page.waitForSelector(".tw-pro");
  assert.equal(await page.$eval(".tw-pro", (node) => node.dataset.cinematicPhase), "idle", "Refresh shows canonical result");
  await page.evaluate(() => {
    window.__match = { ...window.__match, winner: "player1", rounds: window.__match.rounds.map((round, index) => index === 2
      ? { ...round, revision: (round.revision || 0) + 1, player2: { ...round.player2, bonusPayout: 10 } } : round) };
    window.__render();
  });
  await page.waitForSelector(".tw-pro canvas", { timeout: 5000 });
  await page.evaluate(() => { window.__preset = "none"; window.__render(); });
  await page.waitForFunction(() => document.querySelector(".tw-pro")?.dataset.animationPreset === "none");
  await page.waitForFunction(() => !document.querySelector(".tw-pro canvas"), { timeout: 5000 });
  assert.equal(await page.$eval('[data-pro-round="2"] [data-pro-side="right"]', (node) => node.style.visibility), "", "Preset switch restores the interrupted losing card");
  await page.evaluate(() => window.__render("vertical"));
  await page.waitForSelector(".tw-root");
  assert.equal(await page.$(".tw-pro"), null, "Classic layout remains independent");
  console.log("PRO cinematic browser introduction, payouts, shatter, tie, champion, dedup, refresh and preset/layout switches passed");
} finally {
  await browser?.close();
  await server.close();
}
