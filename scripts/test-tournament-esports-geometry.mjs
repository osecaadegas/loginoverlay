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
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(server.resolvedUrls.local[0], { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const TournamentWidget = (await import("/src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx")).default;
    await import("/src/effects/ThemeEffects/ThemeEffects.css");
    await import("/src/effects/ThemeEffects/ArcticPremium.css");
    const match = {
      id: "geometry-check", player1: "First Player", player2: "Second Player",
      status: "in_progress", type: "bonus", winner: null,
      rounds: [{ player1: { bonusCost: 20, bonusPayout: 40 }, player2: { bonusCost: 20, bonusPayout: 30 } }],
    };
    document.body.innerHTML = '<div class="better-widget-colour-scope" data-colour-theme="arctic" data-widget-type="tournament"><div id="tournament-test" style="width:900px;height:600px"></div></div><div class="better-widget-colour-scope" data-colour-theme="arctic" data-widget-type="bonus_hunt"><div class="better-hunt-panel"></div></div><div class="better-widget-colour-scope" data-colour-theme="arctic" data-widget-type="chat"><div class="ov-chat-msg"></div></div>';
    ReactDOM.createRoot(document.getElementById("tournament-test")).render(
      React.createElement(TournamentWidget, { config: { layout: "esports", data: { matches: [match], currentMatchIdx: 0 } } }),
    );
  });
  await page.waitForSelector(".tw-ice-material-card");
  await page.addStyleTag({ content: "#tournament-test *, #tournament-test *::before, #tournament-test *::after { animation: none !important; transition: none !important; }" });
  const measure = () => page.evaluate(() => {
    const root = document.querySelector(".tw-root");
    const card = document.querySelector(".tw-ice-material-card");
    const header = [...root.querySelectorAll("span")].find((node) => node.textContent.includes("Now Playing"));
    return {
      rootWidth: root.getBoundingClientRect().width,
      cardWidth: card.getBoundingClientRect().width,
      cardHeight: card.getBoundingClientRect().height,
      headerFontSize: getComputedStyle(header).fontSize,
      containerType: getComputedStyle(root).containerType,
    };
  });
  const editor = await measure();
  await page.setViewport({ width: 1920, height: 1080 });
  const obs = await measure();
  assert.equal(editor.containerType, "size");
  assert.deepEqual(obs, editor, "Esports geometry must not depend on the editor or OBS window size");
  const materials = await page.evaluate(() => {
    const tournament = document.querySelector('[data-widget-type="tournament"] .tw-root');
    const card = tournament.querySelector(".tw-ice-material-card");
    const bonus = document.querySelector('[data-widget-type="bonus_hunt"] .better-hunt-panel');
    const chat = document.querySelector('[data-widget-type="chat"] .ov-chat-msg');
    return {
      tournamentGlass: getComputedStyle(tournament).backgroundImage,
      bonusGlass: getComputedStyle(bonus).backgroundImage,
      tournamentRim: getComputedStyle(tournament).borderColor,
      bonusRim: getComputedStyle(bonus).borderColor,
      tournamentCard: getComputedStyle(card).backgroundImage,
      chatCard: getComputedStyle(chat).backgroundImage,
    };
  });
  assert.equal(materials.tournamentGlass, materials.bonusGlass, "Tournament and Bonus Hunt use the same Arctic glass layers");
  assert.equal(materials.tournamentRim, materials.bonusRim, "Tournament and Bonus Hunt use the same ice rim");
  assert.equal(materials.tournamentCard, materials.chatCard, "Tournament cards use the same fractured material as Chat");
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const TournamentWidget = (await import("/src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx")).default;
    const host = document.createElement("div");
    host.id = "tournament-portrait";
    host.style.cssText = "width:320px;height:820px";
    document.body.append(host);
    const matches = Array.from({ length: 4 }, (_, index) => ({
      id: `portrait-${index}`, player1: `Left ${index}`, player2: `Right ${index}`,
      status: index === 3 ? "in_progress" : "pending", type: "bonus", winner: null,
      rounds: [{ player1: { bonusCost: 20 }, player2: { bonusCost: 20 } }],
    }));
    window.__portraitMatches = matches;
    window.__portraitRoot = ReactDOM.createRoot(host);
    window.__portraitRoot.render(React.createElement(TournamentWidget, {
      config: { layout: "esports", data: { matches, currentMatchIdx: 3 } },
    }));
  });
  await page.waitForSelector("#tournament-portrait .tw-ice-material-card");
  await page.addStyleTag({ content: "#tournament-portrait *, #tournament-portrait *::before, #tournament-portrait *::after { animation: none !important; transition: none !important; }" });
  const measurePortrait = () => page.evaluate(() => {
    const host = document.getElementById("tournament-portrait");
    const root = host.querySelector(".tw-root");
    const cards = [...root.querySelectorAll(".tw-ice-material-card")];
    const first = cards[0].getBoundingClientRect();
    const current = cards.at(-1).getBoundingClientRect();
    const statBar = cards[0].querySelector(".tw-es-stat-bar");
    return {
      cardCount: cards.length,
      firstAspect: first.width / first.height,
      currentAspect: current.width / current.height,
      statLabelSize: parseFloat(getComputedStyle(statBar.firstElementChild.firstElementChild).fontSize),
      statValueSize: parseFloat(getComputedStyle(statBar.firstElementChild.lastElementChild).fontSize),
      statBackground: getComputedStyle(statBar).backgroundImage,
      historyCount: root.querySelectorAll(".tw-es-done-row").length,
      historyFontSize: parseFloat(getComputedStyle(root.querySelector(".tw-es-done-row span") || cards[0]).fontSize),
      historyText: [...root.querySelectorAll(".tw-es-done-row")].map((row) => row.textContent),
    };
  });
  const portrait = await measurePortrait();
  assert.equal(portrait.cardCount, 8);
  assert.ok(portrait.statLabelSize >= 12 && portrait.statValueSize >= 16, `Card stats must be readable: ${JSON.stringify(portrait)}`);
  assert.match(portrait.statBackground, /linear-gradient/, "Card stats need an opaque reading surface over bright artwork");
  if (process.env.TOURNAMENT_CAPTURE_DIR) {
    fs.mkdirSync(process.env.TOURNAMENT_CAPTURE_DIR, { recursive: true });
    await (await page.$("#tournament-portrait")).screenshot({ path: path.join(process.env.TOURNAMENT_CAPTURE_DIR, "queued.png") });
  }
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const TournamentWidget = (await import("/src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx")).default;
    const matches = window.__portraitMatches.map((match, index) => index === 3 ? match : {
      ...match, status: "completed", winner: "player1",
    });
    window.__portraitRoot.render(React.createElement(TournamentWidget, {
      config: { layout: "esports", data: { matches, currentMatchIdx: 3 } },
    }));
  });
  await page.waitForFunction(() => document.querySelectorAll("#tournament-portrait .tw-es-done-row").length === 3);
  const progressed = await measurePortrait();
  assert.equal(progressed.cardCount, 2);
  assert.equal(progressed.historyCount, 3);
  assert.ok(progressed.historyFontSize >= 16, `Winner and loser history must be readable: ${JSON.stringify(progressed)}`);
  assert.ok(progressed.historyText.every((row) => row.includes("WIN") && row.includes("OUT")), "History must identify winners and eliminated players");
  assert.ok(Math.abs(portrait.currentAspect - progressed.currentAspect) < 0.03,
    `Current cards must keep their aspect ratio as matches finish: ${JSON.stringify({ portrait, progressed })}`);
  if (process.env.TOURNAMENT_CAPTURE_DIR) {
    await (await page.$("#tournament-portrait")).screenshot({ path: path.join(process.env.TOURNAMENT_CAPTURE_DIR, "progressed.png") });
  }
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const TournamentWidget = (await import("/src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx")).default;
    await import("/src/components/OverlayCenter/editor/WidgetEditorPage.css");
    await import("/src/components/OverlayCenter/editor/BetterObsOverlay.css");
    const matches = Array.from({ length: 4 }, (_, index) => ({
      id: `parity-${index}`, player1: `Left ${index}`, player2: `Right ${index}`,
      status: index === 3 ? "in_progress" : "pending", type: "bonus", winner: null,
      rounds: [{ player1: { bonusCost: 20 }, player2: { bonusCost: 20 } }],
    }));
    const config = { layout: "esports", colourTheme: "arctic", data: { matches, currentMatchIdx: 3 } };
    const editorHost = document.createElement("div");
    editorHost.innerHTML = '<div class="better-editor-canvas-instance" data-effect-widget-type="tournament" style="position:relative;width:320px;height:820px"><div class="better-editor-canvas-instance__content"><div class="better-widget-colour-scope" data-colour-theme="arctic" data-widget-type="tournament" id="editor-parity"></div></div></div>';
    document.body.append(editorHost);
    const obsHost = document.createElement("div");
    obsHost.innerHTML = '<div class="better-obs-overlay better-obs-overlay--single" data-render-mode="logical" style="position:relative;width:640px;height:1640px"><div class="better-obs-frame" style="width:640px;height:1640px"><div class="better-obs-canvas better-obs-canvas--single" style="width:320px;height:820px;transform:scale(2)"><div class="better-obs-instance" data-effect-widget-type="tournament" style="left:0;top:0;width:320px;height:820px"><div class="better-widget-colour-scope" data-colour-theme="arctic" data-widget-type="tournament" id="obs-parity"></div></div></div></div></div>';
    document.body.append(obsHost);
    ReactDOM.createRoot(document.getElementById("editor-parity")).render(React.createElement(TournamentWidget, { config }));
    ReactDOM.createRoot(document.getElementById("obs-parity")).render(React.createElement(TournamentWidget, { config }));
  });
  await page.waitForSelector("#obs-parity .tw-ice-material-card");
  await page.addStyleTag({ content: "#editor-parity *, #obs-parity *, #editor-parity *::before, #obs-parity *::before { animation: none !important; transition: none !important; }" });
  const parity = await page.evaluate(() => {
    const measure = (id, scale) => {
      const root = document.querySelector(`#${id} .tw-root`);
      const cards = [...root.querySelectorAll(".tw-ice-material-card")];
      const bounds = root.getBoundingClientRect();
      return {
        width: bounds.width / scale,
        height: bounds.height / scale,
        cards: cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return {
            x: Math.round((rect.left - bounds.left) / scale),
            y: Math.round((rect.top - bounds.top) / scale),
            width: Math.round(rect.width / scale),
            height: Math.round(rect.height / scale),
          };
        }),
      };
    };
    return { editor: measure("editor-parity", 1), obs: measure("obs-parity", 2) };
  });
  assert.deepEqual(parity.obs, parity.editor, `Editor and OBS tournament layout should match at the saved widget size: ${JSON.stringify(parity)}`);
  console.log("Esports geometry and Arctic tournament glass match the shared widget materials.");
} finally {
  await browser.close();
  await server.close();
}
