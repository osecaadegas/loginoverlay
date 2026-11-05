import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { createServer } from "vite";

const server = await createServer({
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0, hmr: false },
});
await server.listen();
const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewport({ width: 640, height: 900 });
  await page.goto(server.resolvedUrls.local[0], { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const TournamentWidget = (await import("/src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx")).default;
    await import("/src/effects/ThemeEffects/ThemeEffects.css");
    await import("/src/effects/ThemeEffects/ArcticPremium.css");
    document.body.innerHTML = '<div class="better-widget-colour-scope" data-colour-theme="arctic" data-widget-type="tournament"><div id="shatter-test" style="width:320px;height:820px"></div></div>';
    const image = "/apps-tiles/bonus-hunt.jpg";
    window.__shatterRoot = ReactDOM.createRoot(document.getElementById("shatter-test"));
    window.__TournamentWidget = TournamentWidget;
    window.__shatterMatches = [
      { id: "first", player1: "Winner", player2: "Loser", status: "in_progress", type: "bonus", winner: null,
        slot1: { image }, slot2: { image }, rounds: [{ player1: { bonusCost: 20 }, player2: { bonusCost: 20 } }] },
      { id: "second", player1: "Next One", player2: "Next Two", status: "pending", type: "bonus", winner: null,
        slot1: { image }, slot2: { image }, rounds: [{ player1: { bonusCost: 20 }, player2: { bonusCost: 20 } }] },
    ];
    window.__renderShatter = (matches) => window.__shatterRoot.render(React.createElement(TournamentWidget, {
      config: { layout: "esports", colourTheme: "arctic", data: { matches, currentMatchIdx: 0 } },
    }));
    window.__renderShatter(window.__shatterMatches);
    window.__finishShatter = () => window.__renderShatter(window.__shatterMatches.map((match, index) =>
      index === 0 ? { ...match, status: "completed", winner: "player1" } : { ...match, status: "in_progress" }));
  });
  await page.waitForSelector("#shatter-test .tw-ice-material-card");
  const scaledBounds = await page.evaluate(async () => {
    const { measureShatterCardRect } = await import("/src/components/OverlayCenter/widgets/tournament/ShatterEffect.jsx");
    return [0.5, 2].map((scale) => {
      const parent = document.createElement("div");
      parent.style.cssText = `position:relative;width:300px;height:180px;transform:scale(${scale});transform-origin:top left`;
      const card = document.createElement("div");
      card.style.cssText = "position:absolute;left:30px;top:20px;width:120px;height:150px";
      parent.append(card);
      document.body.append(parent);
      const bounds = measureShatterCardRect(parent, card);
      parent.remove();
      return Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, Math.round(value)]));
    });
  });
  assert.deepEqual(scaledBounds, [{ x: 30, y: 20, w: 120, h: 150 }, { x: 30, y: 20, w: 120, h: 150 }],
    "Shatter placement must follow logical card bounds in both editor and scaled OBS sources");
  const captureDir = process.env.TOURNAMENT_CAPTURE_DIR;
  const capture = async (name) => {
    if (!captureDir) return;
    fs.mkdirSync(captureDir, { recursive: true });
    await (await page.$("#shatter-test")).screenshot({ path: path.join(captureDir, `${name}.png`) });
  };
  await capture("before");
  const started = Date.now();
  await page.evaluate(() => window.__finishShatter());
  await page.waitForSelector("#shatter-test canvas");
  await new Promise((resolve) => setTimeout(resolve, 800));
  const frost = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#shatter-test .tw-ice-material-card")];
    return { loserVisibility: cards[1]?.style.visibility, loserOpacity: getComputedStyle(cards[1]).opacity,
      winnerAnimation: getComputedStyle(cards[0]).animationName,
      historyCount: document.querySelectorAll("#shatter-test .tw-es-done-row").length };
  });
  assert.equal(frost.loserVisibility, "", "Loser artwork should remain visible while ice forms");
  assert.equal(frost.loserOpacity, "1", "Loser should not fade before the fracture");
  assert.match(frost.winnerAnimation, /tw-ice-winner-reveal/, "Winner should receive the restrained ice reveal");
  assert.equal(frost.historyCount, 0, "The match must not move to history before the shatter");
  await capture("frost");
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const shards = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#shatter-test .tw-ice-material-card")];
    return { loserVisibility: cards[1]?.style.visibility, winnerVisibility: cards[0]?.style.visibility,
      canvasPresent: Boolean(document.querySelector("#shatter-test canvas")) };
  });
  assert.equal(shards.loserVisibility, "hidden", "The loser card should give way to the moving ice shards");
  assert.notEqual(shards.winnerVisibility, "hidden", "The winner should stay visible");
  assert.equal(shards.canvasPresent, true, "Shards should still be animating after the fracture");
  await capture("shards");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.equal(await page.$("#shatter-test .tw-es-done-row"), null, "Shards should disperse before the match enters history");
  await capture("dispersing");
  await page.waitForSelector("#shatter-test .tw-es-done-row", { timeout: 5000 });
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 3900 && elapsed < 6500, `Ice handoff should follow the full animation, got ${elapsed} ms`);
  assert.equal(await page.$("#shatter-test canvas"), null, "The shatter canvas should be removed after the handoff");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.equal(await page.$eval("#shatter-test .tw-ice-material-card", (card) => getComputedStyle(card).visibility),
    "visible", "The next match should be visible after the ice clears");
  await capture("complete");
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const TournamentWidget = (await import("/src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx")).default;
    const host = document.createElement("div");
    host.id = "queue-test";
    host.style.cssText = "width:320px;height:820px";
    document.body.append(host);
    const root = ReactDOM.createRoot(host);
    const image = "/apps-tiles/bonus-hunt.jpg";
    const base = Array.from({ length: 3 }, (_, index) => ({
      id: `queue-${index}`, player1: `Winner ${index}`, player2: `Loser ${index}`,
      status: index === 0 ? "in_progress" : "pending", type: "bonus", winner: null,
      slot1: { image }, slot2: { image }, rounds: [{ player1: { bonusCost: 20 }, player2: { bonusCost: 20 } }],
    }));
    window.__queueRender = (firstDone, secondDone) => {
      const matches = base.map((match, index) => ({ ...match,
        status: index === 0 && firstDone || index === 1 && secondDone ? "completed"
          : index === (secondDone ? 2 : firstDone ? 1 : 0) ? "in_progress" : "pending",
        winner: index === 0 && firstDone || index === 1 && secondDone ? "player1" : null,
      }));
      root.render(React.createElement(TournamentWidget, {
        config: { layout: "esports", colourTheme: "arctic", data: { matches, currentMatchIdx: 0 } },
      }));
    };
    window.__queueRender(false, false);
  });
  await page.waitForSelector("#queue-test .tw-ice-material-card");
  await page.evaluate(() => window.__queueRender(true, false));
  await page.waitForSelector("#queue-test canvas");
  await new Promise((resolve) => setTimeout(resolve, 900));
  await page.evaluate(() => window.__queueRender(true, true));
  await page.waitForFunction(() => document.querySelectorAll("#queue-test .tw-es-done-row").length === 1 &&
    Boolean(document.querySelector("#queue-test canvas")), { timeout: 7500 });
  await page.waitForFunction(() => document.querySelectorAll("#queue-test .tw-es-done-row").length === 2 &&
    !document.querySelector("#queue-test canvas"), { timeout: 10000 });
  assert.deepEqual(errors, [], "The tournament transition should not raise browser errors");
  console.log("Arctic tournament frost, shatter timing, winner visibility and history handoff passed.");
} finally {
  await browser.close();
  await server.close();
}
