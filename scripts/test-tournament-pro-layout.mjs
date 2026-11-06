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
      player1Avatar: "/images/widgets/freeze-shatter/demo-streamer.png",
      player2Avatar: "/player.webp",
      slot1: { name: "First Real Slot", provider: "Studio One", image: "/images/widgets/freeze-shatter/demo-streamer.png" },
      slot2: { name: "Second Real Slot", provider: "Studio Two", image: "/player.webp" },
      rounds: [
        { roundNum: 1, player1: { bonusCost: 20, bonusPayout: 80 }, player2: { bonusCost: 20, bonusPayout: 30 } },
        { roundNum: 2, player1: { bonusCost: 20, bonusPayout: null }, player2: { bonusCost: 20, bonusPayout: null } },
        { roundNum: 3, player1: { bonusCost: 20, bonusPayout: null }, player2: { bonusCost: 20, bonusPayout: null } },
      ],
    };
    document.body.innerHTML = '<div id="pro-host" style="width:560px;height:1080px"></div><div id="old-host" style="width:440px;height:820px"></div>';
    window.__match = match;
    window.__upcoming = { id: "pro-next", type: "bonus_bo3", status: "pending", player1: "TurboSpin", player2: "DiamondDan", rounds: [] };
    window.__React = React;
    window.__TournamentWidget = TournamentWidget;
    window.__proRoot = ReactDOM.createRoot(document.getElementById("pro-host"));
    window.__oldRoot = ReactDOM.createRoot(document.getElementById("old-host"));
    window.__proAppearance = {};
    window.__renderPro = () => window.__proRoot.render(React.createElement(TournamentWidget, { config: { layout: "pro", ...window.__proAppearance, data: { matches: [window.__match, window.__upcoming], currentMatchIdx: 0 } } }));
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
    cardBounds: [...document.querySelectorAll("#pro-host .tw-pro-card")].map((node) => node.getBoundingClientRect().toJSON()),
    artBounds: [...document.querySelectorAll("#pro-host .tw-pro-art")].map((node) => node.getBoundingClientRect().toJSON()),
    roundGridBounds: [...document.querySelectorAll("#pro-host .tw-pro-round-grid")].map((node) => node.getBoundingClientRect().toJSON()),
    valuesVisible: [...document.querySelectorAll(".tw-pro-card")].every((card) => {
      const cardBottom = card.getBoundingClientRect().bottom;
      return [...card.querySelectorAll(".tw-pro-values b")].every((value) => value.getBoundingClientRect().bottom <= cardBottom - 1);
    }),
    firstCardMetrics: (() => { const card = document.querySelector(".tw-pro-card"); return { card: card.getBoundingClientRect().height, art: card.querySelector(".tw-pro-art").getBoundingClientRect().height, copy: card.querySelector(".tw-pro-card-copy").getBoundingClientRect().height, lastValueBottom: card.querySelector(".tw-pro-values b:last-child").getBoundingClientRect().bottom - card.getBoundingClientRect().top }; })(),
  }));
  assert.equal(initial.score, "1–0");
  assert.equal(initial.rounds, 3);
  assert.equal(initial.oldLayout, true, "Vertical layout remains available");
  assert.ok(initial.artBounds.every((bounds) => bounds.height >= 190), "All six PRO artwork areas use the available round height");
  assert.ok(initial.cardBounds.every((bounds, index) => bounds.width >= 200 && bounds.height >= initial.roundGridBounds[Math.floor(index / 2)].height - 1), "All six cards fill their round columns vertically");
  assert.ok(initial.roundGridBounds.every((grid, index) => initial.cardBounds[index * 2].left <= grid.left + 1 && initial.cardBounds[index * 2 + 1].right >= grid.right - 1), "Cards reach both edges of each round grid");
  assert.ok(initial.firstCardMetrics.art / initial.firstCardMetrics.card >= .7, "Artwork dominates the card height");
  assert.equal(initial.valuesVisible, true, `Cost and pay values remain inside every card: ${JSON.stringify(initial.firstCardMetrics)}`);
  assert.match(initial.footer, /ROUND 2/);
  assert.match(initial.footer, /UP NEXT.*TurboSpin.*DiamondDan/);
  const versus = await page.evaluate(() => [...document.querySelectorAll("#pro-host .tw-pro-vs")].map((badge) => ({
    text: badge.innerText.replace(/\s/g, ""), width: badge.getBoundingClientRect().width,
    height: badge.getBoundingClientRect().height,
  })));
  assert.equal(versus.length, 3, "Every PRO round has a versus marker");
  assert.ok(versus.every((badge) => badge.text === "VS" && badge.height > badge.width), "Every V/S marker is vertical without taking artwork width");
  assert.ok(initial.values.includes("—"), "Unpaid rounds display dashes");
  assert.ok(initial.values.includes("€80.00"), "Recorded payouts appear in the cards");
  assert.ok(initial.cardBounds.every((bounds) => bounds.width > 0 && bounds.height > 0 && bounds.y >= 0 && bounds.y + bounds.height <= 1080), "All six cards fit within the recommended widget height");
  await page.waitForFunction(() => [...document.querySelectorAll("#pro-host .tw-pro-person img, #pro-host .tw-pro-art-main")].every((image) => image.complete && image.naturalWidth > 0));
  const imagery = await page.evaluate(() => ({
    avatars: document.querySelectorAll("#pro-host .tw-pro-person img").length,
    backdropFit: getComputedStyle(document.querySelector("#pro-host .tw-pro-art-backdrop")).objectFit,
    mainFit: getComputedStyle(document.querySelector("#pro-host .tw-pro-art-main")).objectFit,
    avatarRadius: getComputedStyle(document.querySelector("#pro-host .tw-pro-person")).borderRadius,
  }));
  assert.equal(imagery.avatars, 2, "Both player avatars render from match data");
  assert.equal(imagery.backdropFit, "cover");
  assert.equal(imagery.mainFit, "contain");
  assert.notEqual(imagery.avatarRadius, "0px", "Player avatars remain circular");
  const headerBounds = await page.evaluate(() => {
    const leftName = document.querySelector("#pro-host .tw-pro-player strong").getBoundingClientRect();
    const score = document.querySelector("#pro-host .tw-pro-score").getBoundingClientRect();
    return { nameRight: leftName.right, scoreLeft: score.left };
  });
  assert.ok(headerBounds.nameRight <= headerBounds.scoreLeft, "Long usernames do not overlap the score");
  await page.evaluate(() => {
    window.__match = { ...window.__match, player2Avatar: "/missing-tournament-avatar.png" };
    window.__renderPro();
  });
  await page.waitForSelector("#pro-host .tw-pro-player--right .tw-pro-person svg");
  await page.evaluate(() => {
    window.__match = { ...window.__match, player2Avatar: "/player.webp" };
    window.__renderPro();
  });
  await page.waitForSelector("#pro-host .tw-pro-player--right .tw-pro-person img");
  const resolved = await page.evaluate(async () => {
    const { resolveTournamentPlayers } = await import('/src/services/tournamentParticipantService.js');
    return resolveTournamentPlayers([{ name: 'Custom label', twitchUsername: 'TurboSpin' }, { name: 'Guest player' }]);
  });
  assert.equal(resolved[0].name, 'TurboSpin', 'Entered Twitch username appears in the header');
  assert.equal(resolved[0].avatarUrl, 'https://unavatar.io/twitch/turbospin', 'Tournament avatars use the chat widget image service');
  assert.equal(resolved[1].name, 'Guest player', 'Non-Twitch names remain unchanged');
  assert.equal(resolved[1].avatarUrl, '', 'Non-Twitch names use the icon fallback');
  if (process.argv[2]) {
    if (process.argv[3] === "reference") {
      const host = await page.$("#pro-host");
      await page.evaluate(() => { document.getElementById("pro-host").style.cssText = "width:680px;height:1380px"; });
      const referenceMetrics = await page.evaluate(() => ({
        valuesVisible: [...document.querySelectorAll("#pro-host .tw-pro-card")].every((card) => [...card.querySelectorAll(".tw-pro-values b")].every((value) => value.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom - 1)),
        largeArt: [...document.querySelectorAll("#pro-host .tw-pro-art")].every((art) => art.getBoundingClientRect().height >= 230),
      }));
      assert.equal(referenceMetrics.valuesVisible, true, "680 × 1380 cards show full cost and pay values");
      assert.equal(referenceMetrics.largeArt, true, "680 × 1380 cards use the available height for larger artwork");
      await host.screenshot({ path: process.argv[2] });
      await page.evaluate(() => { document.getElementById("pro-host").style.cssText = "width:560px;height:1080px"; });
    } else {
      await (await page.$("#pro-host")).screenshot({ path: process.argv[2] });
    }
  }
  await page.setViewport({ width: 1920, height: 1080 });
  const afterViewport = await page.evaluate(() => [...document.querySelectorAll(".tw-pro-card")].map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  assert.ok(afterViewport.every((bounds, index) => Math.abs(bounds.width - initial.cardBounds[index].width) < 1 && Math.abs(bounds.height - initial.cardBounds[index].height) < 1), "PRO dimensions depend on saved widget size, not OBS viewport");
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
      valuesVisible: [...host.querySelectorAll(".tw-pro-card")].every((card) => [...card.querySelectorAll(".tw-pro-values b")].every((value) => value.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom - 1)),
      firstCardMetrics: (() => { const card = host.querySelector(".tw-pro-card"); return { card: card.getBoundingClientRect().height, art: card.querySelector(".tw-pro-art").getBoundingClientRect().height, copy: card.querySelector(".tw-pro-card-copy").getBoundingClientRect().height, valueBottom: card.querySelector(".tw-pro-values b:last-child").getBoundingClientRect().bottom - card.getBoundingClientRect().top }; })(),
    };
  });
  assert.equal(narrow.overflow, false, "Narrow PRO widget has no vertical overflow");
  assert.equal(narrow.cardsInside, true, "Narrow PRO cards stay inside the widget");
  assert.equal(narrow.valuesVisible, true, `Narrow PRO widget keeps cost and pay readable: ${JSON.stringify(narrow.firstCardMetrics)}`);
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
  await page.waitForSelector('.tw-pro [data-pro-shatter-target="true"]');
  await page.waitForSelector('.tw-pro canvas');
  const targetSide = await page.evaluate(() => [...document.querySelectorAll('.tw-pro-round:nth-child(2) .tw-pro-card')].findIndex((card) => card.dataset.proShatterTarget === "true"));
  assert.equal(targetSide, 1, "The shatter targets the losing card in the deciding round");
  const complete = await page.evaluate(() => ({ footer: document.querySelector(".tw-pro-footer").textContent, winnerCards: document.querySelectorAll(".tw-pro-card--winner").length, pending: document.querySelectorAll(".tw-pro-round--pending").length }));
  assert.match(complete.footer, /MATCH COMPLETE.*Long Player One Username/);
  assert.equal(complete.winnerCards, 2);
  assert.equal(complete.pending, 1);
  await page.waitForFunction(() => !document.querySelector('.tw-pro canvas'), { timeout: 7000 });
  const restoredVisibility = await page.evaluate(() => document.querySelector('[data-pro-shatter-target="true"]')?.style.visibility || "");
  assert.equal(restoredVisibility, "", "Shatter cleanup restores the card visibility");
  console.log("PRO tournament card fill, BO3 progression, artwork scaling, and legacy Vertical checks passed.");
} finally {
  await browser?.close();
  await server.close();
}
