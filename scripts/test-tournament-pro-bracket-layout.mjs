import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import { createServer } from "vite";

const server = await createServer({ logLevel: "silent", server: { host: "127.0.0.1", port: 0, hmr: false } });
await server.listen();
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1250, height: 1150 });
  await page.goto(server.resolvedUrls.local[0], { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const TournamentWidget = (await import("/src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx")).default;
    const { generateBracket, propagateWinner } = await import("/src/components/TournamentsPage/bracketUtils.js");
    const { setManualWinner } = await import("/src/components/OverlayCenter/widgets/tournament/tournamentEngine.js");
    const { updateRoundData } = await import("/src/components/OverlayCenter/widgets/tournament/tournamentEngine.js");
    const players = Array.from({ length: 8 }, (_, index) => ({ id: `p${index + 1}`, name: `Player_${index + 1}`, avatarUrl: "/player.webp", slot: { name: `Slot_${index + 1}`, image: "/player.webp", provider: `Provider ${index + 1}` } }));
    let bracket = generateBracket(players, "bonus_bo3");
    bracket = bracket.map((stage, stageIndex) => stageIndex === 0 ? { ...stage, matches: stage.matches.map((match) => ({ ...match, status: "in_progress", rounds: match.rounds.map((round) => ({ ...round, player1: { ...round.player1, bonusCost: 20 }, player2: { ...round.player2, bonusCost: 20 } })) })) } : stage);
    document.body.innerHTML = '<div class="better-widget-colour-scope" data-colour-theme="arctic" data-widget-type="tournament" style="width:680px;height:1080px"><div id="bracket-host" style="width:680px;height:1080px"></div></div><div id="pro-host" style="width:560px;height:1080px"></div>';
    const root = ReactDOM.createRoot(document.getElementById("bracket-host"));
    const proRoot = ReactDOM.createRoot(document.getElementById("pro-host"));
    window.__render = () => {
      const data = { tournamentId: "visual-test", matches: bracket.flatMap((stage) => stage.matches), currentMatchIdx: 0 };
      root.render(React.createElement(TournamentWidget, { config: { layout: "pro_bracket", colourTheme: "arctic", bracketData: bracket, data, currency: "€", animationPreset: "none" } }));
      proRoot.render(React.createElement(TournamentWidget, { config: { layout: "pro", bracketData: bracket, data, currency: "€", animationPreset: "none" } }));
    };
    window.__advance = (stageIndex) => {
      bracket = bracket.map((stage, index) => index === stageIndex ? { ...stage, matches: stage.matches.map((match) => setManualWinner(match, "player1")) } : stage);
      stageIndex < bracket.length - 1 && bracket[stageIndex].matches.forEach((_, index) => { bracket = propagateWinner(bracket, stageIndex, index); });
      window.__render();
    };
    window.__startCinematic = () => {
      bracket = generateBracket(players, "bonus_bo3");
      window.__cinematicMatchId = bracket[0].matches[0].id;
      window.__render = () => {
        const data = { tournamentId: "cinematic-test", matches: bracket.flatMap((stage) => stage.matches), currentMatchIdx: 0 };
        root.render(React.createElement(TournamentWidget, { config: { layout: "pro_bracket", colourTheme: "arctic", bracketData: bracket, data, currency: "€", animationPreset: "cinematic", bracketPhase: "active" } }));
      };
      window.__render();
    };
    window.__confirmCinematic = () => {
      const original = bracket[0].matches[0];
      const left = updateRoundData(original, 0, "player1", { bonusCost: 20, bonusPayout: 80 });
      const both = updateRoundData(left, 0, "player2", { bonusCost: 20, bonusPayout: 30 });
      bracket = bracket.map((stage, index) => index === 0 ? { ...stage, matches: [both, ...stage.matches.slice(1)] } : stage);
      window.__render();
    };
    window.__render();
  });
  const stages = [
    { label: "quarter", count: 4, expected: "QUARTER-FINALS" },
    { label: "semi", count: 2, expected: "SEMI-FINALS" },
    { label: "final", count: 1, expected: "GRAND FINAL" },
    { label: "champion", count: 1, expected: "TOURNAMENT CHAMPION" },
  ];
  for (let index = 0; index < stages.length; index += 1) {
    if (index) await page.evaluate((stageIndex) => window.__advance(stageIndex), index - 1);
    await page.waitForFunction((count) => document.querySelectorAll("#bracket-host .tw-pro-bracket-match").length === count, {}, stages[index].count);
    const metrics = await page.evaluate(() => {
      const host = document.getElementById("bracket-host");
      const bounds = host.getBoundingClientRect();
      const cards = [...host.querySelectorAll(".tw-pro-card")];
      return {
        stage: host.querySelector(".tw-pro-bracket-stage-title")?.textContent,
        champion: host.querySelector(".tw-pro-bracket-champion")?.textContent,
        cards: cards.length,
        providers: [...host.querySelectorAll(".tw-pro-provider")].map((node) => node.textContent),
        values: [...host.querySelectorAll(".tw-pro-values b")].map((node) => node.textContent),
        cardsInside: cards.every((card) => { const box = card.getBoundingClientRect(); return box.width > 0 && box.height > 0 && box.left >= bounds.left && box.right <= bounds.right && box.bottom <= bounds.bottom; }),
        valueInside: cards.every((card) => [...card.querySelectorAll(".tw-pro-values b")].every((value) => value.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom - 1)),
        minValueSize: Math.min(...[...host.querySelectorAll(".tw-pro-values b")].map((node) => parseFloat(getComputedStyle(node).fontSize))),
        noTitleRows: !host.querySelector(".tw-pro-slot-name"),
        verticalVs: [...host.querySelectorAll(".tw-pro-vs")].every((node) => node.innerText.replace(/\s/g, "") === "VS" && node.getBoundingClientRect().height > node.getBoundingClientRect().width),
      };
    });
    assert.match(index === 3 ? metrics.champion : metrics.stage, new RegExp(stages[index].expected));
    assert.equal(metrics.cards, stages[index].count * 2);
    assert.ok(metrics.cardsInside && metrics.valueInside && metrics.noTitleRows && metrics.verticalVs, JSON.stringify(metrics));
    assert.ok(metrics.minValueSize >= 18, `COST/PAY must stay readable: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.providers.every((provider) => provider.startsWith("Provider ")));
    if (process.argv[2]) await (await page.$("#bracket-host")).screenshot({ path: `${process.argv[2]}-${stages[index].label}.png` });
  }
  assert.equal(await page.evaluate(() => document.querySelectorAll("#pro-host .tw-pro-round").length), 3, "Existing PRO remains available");
  await page.evaluate(() => window.__startCinematic());
  await page.waitForFunction(() => document.querySelector("#bracket-host .tw-pro-bracket-match")?.dataset.proMatchId);
  await page.evaluate(() => window.__confirmCinematic());
  await page.waitForSelector('#bracket-host [data-pro-shatter-target="true"]', { timeout: 8000 });
  const shatterMatch = await page.evaluate(() => document.querySelector('#bracket-host [data-pro-shatter-target="true"]')?.closest("[data-pro-match-id]")?.dataset.proMatchId);
  assert.equal(shatterMatch, await page.evaluate(() => window.__cinematicMatchId), "The deciding-card shatter stays inside the updated match panel");
  await page.waitForFunction(() => !document.querySelector('#bracket-host [data-pro-shatter-target="true"]'), { timeout: 10000 });
  console.log("PRO BRACKET four/two/one match layouts, champion, text bounds and original PRO checks passed.");
} finally {
  await browser?.close();
  await server.close();
}
