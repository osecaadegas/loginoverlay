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
    const match = {
      id: "pro-check", type: "bonus_bo3", status: "in_progress", winner: null,
      player1: "Long Player One Username", player2: "Second Player",
      slot1: { name: "First Real Slot", provider: "Studio One", image: null },
      slot2: { name: "Second Real Slot", provider: "Studio Two", image: null },
      rounds: [
        { roundNum: 1, player1: { bonusCost: 20, bonusPayout: 80 }, player2: { bonusCost: 20, bonusPayout: 30 } },
        { roundNum: 2, player1: { bonusCost: 20, bonusPayout: null }, player2: { bonusCost: 20, bonusPayout: null } },
        { roundNum: 3, player1: { bonusCost: 20, bonusPayout: null }, player2: { bonusCost: 20, bonusPayout: null } },
      ],
    };
    document.body.innerHTML = '<div id="pro-host" style="width:440px;height:820px"></div><div id="old-host" style="width:440px;height:820px"></div>';
    window.__match = match;
    window.__React = React;
    window.__TournamentWidget = TournamentWidget;
    window.__proRoot = ReactDOM.createRoot(document.getElementById("pro-host"));
    window.__oldRoot = ReactDOM.createRoot(document.getElementById("old-host"));
    window.__proAppearance = {};
    window.__renderPro = () => window.__proRoot.render(React.createElement(TournamentWidget, { config: { layout: "pro", ...window.__proAppearance, data: { matches: [window.__match], currentMatchIdx: 0 } } }));
    window.__renderPro();
    window.__oldRoot.render(React.createElement(TournamentWidget, { config: { layout: "vertical", data: { matches: [match], currentMatchIdx: 0 } } }));
  });
  await page.waitForSelector(".tw-pro-round");
  const initial = await page.evaluate(() => ({
    score: document.querySelector(".tw-pro-score").textContent,
    rounds: document.querySelectorAll(".tw-pro-round").length,
    values: [...document.querySelectorAll(".tw-pro-values b")].map((node) => node.textContent),
    footer: document.querySelector(".tw-pro-footer").textContent,
    oldLayout: Boolean(document.querySelector("#old-host .tw-root")),
    cardBounds: [...document.querySelectorAll(".tw-pro-card")].map((node) => node.getBoundingClientRect().toJSON()),
  }));
  assert.equal(initial.score, "1–0");
  assert.equal(initial.rounds, 3);
  assert.equal(initial.oldLayout, true, "Vertical layout remains available");
  assert.match(initial.footer, /ROUND 2/);
  assert.ok(initial.values.includes("—"), "Unpaid rounds display dashes");
  assert.ok(initial.values.includes("€80.00"), "Recorded payouts appear in the cards");
  assert.ok(initial.cardBounds.every((bounds) => bounds.width > 0 && bounds.height > 0 && bounds.y >= 0 && bounds.y + bounds.height <= 820), "All six cards fit within portrait widget height");
  if (process.argv[2]) {
    await (await page.$("#pro-host")).screenshot({ path: process.argv[2] });
  }
  await page.setViewport({ width: 1920, height: 1080 });
  const afterViewport = await page.evaluate(() => [...document.querySelectorAll(".tw-pro-card")].map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  assert.deepEqual(afterViewport, initial.cardBounds.map(({ width, height }) => ({ width, height })), "PRO dimensions depend on saved widget size, not OBS viewport");
  const narrow = await page.evaluate(() => {
    const host = document.getElementById("pro-host");
    host.style.width = "320px";
    host.style.height = "600px";
    const bounds = host.getBoundingClientRect();
    return {
      overflow: host.firstElementChild.scrollHeight > host.firstElementChild.clientHeight,
      cardsInside: [...host.querySelectorAll(".tw-pro-card")].every((card) => {
        const box = card.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.left >= bounds.left && box.right <= bounds.right && box.bottom <= bounds.bottom;
      }),
    };
  });
  assert.equal(narrow.overflow, false, "Narrow PRO widget has no vertical overflow");
  assert.equal(narrow.cardsInside, true, "Narrow PRO cards stay inside the widget");
  await page.evaluate(() => {
    window.__proAppearance = { subElements: { statValue: { fontSize: 17, textColor: "#ffdd55" } } };
    window.__renderPro();
  });
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".tw-pro-values b")).fontSize === "17px");
  const editedValueColor = await page.evaluate(() => getComputedStyle(document.querySelector(".tw-pro-values b")).color);
  assert.equal(editedValueColor, "rgb(255, 221, 85)", "PRO stat controls update the live renderer");
  await page.evaluate(() => {
    window.__match = {
      ...window.__match, status: "completed", winner: "player1",
      rounds: window.__match.rounds.map((round, index) => index === 1 ? { ...round, player1: { bonusCost: 20, bonusPayout: 90 }, player2: { bonusCost: 20, bonusPayout: 10 } } : round),
    };
    window.__renderPro();
  });
  await page.waitForFunction(() => document.querySelector(".tw-pro-score")?.textContent === "2–0");
  const complete = await page.evaluate(() => ({ footer: document.querySelector(".tw-pro-footer").textContent, winnerCards: document.querySelectorAll(".tw-pro-card--winner").length, pending: document.querySelectorAll(".tw-pro-round--pending").length }));
  assert.match(complete.footer, /MATCH COMPLETE.*Long Player One Username/);
  assert.equal(complete.winnerCards, 2);
  assert.equal(complete.pending, 1);
  console.log("PRO tournament layout, BO3 progression, portrait bounds, and legacy Vertical checks passed.");
} finally {
  await browser?.close();
  await server.close();
}
