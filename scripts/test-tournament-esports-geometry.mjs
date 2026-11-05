import assert from "node:assert/strict";
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
  console.log("Esports geometry and Arctic tournament glass match the shared widget materials.");
} finally {
  await browser.close();
  await server.close();
}
