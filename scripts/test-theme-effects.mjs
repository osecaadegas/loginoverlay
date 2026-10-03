import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer";
import { createServer } from "vite";
import {
  getWidgetEffectsThemeKey,
  normalizeThemeEffectsConfig,
  patchThemeEffectsConfig,
} from "../src/effects/ThemeEffects/themeEffectsConfig.js";
import { getEffectQualityPreset, getEffectResolution } from "../src/effects/ThemeEffects/presets/performancePresets.js";
import { supportsThemeEffects } from "../src/effects/ThemeEffects/themes/themeDefinitions.js";

assert.equal(supportsThemeEffects("arctic"), true);
assert.equal(supportsThemeEffects("gladiator"), true);
assert.equal(supportsThemeEffects("old_rome"), true);
assert.equal(supportsThemeEffects("neon"), false);
assert.equal(getWidgetEffectsThemeKey("bets", { theme: "gladiator" }), "gladiator");
assert.equal(getWidgetEffectsThemeKey("bonus_hunt", { colour: "theme_arctic" }), "arctic");

const legacy = normalizeThemeEffectsConfig("arctic", undefined);
assert.equal(legacy.enabled, true, "old saved widgets receive safe defaults");
assert.equal(legacy.quality, "balanced");
assert.equal(legacy.ice.cracks, true);
assert.equal(legacy.greek.architecture, true);
assert.equal(
  normalizeThemeEffectsConfig("old_rome", { greek: { architecture: false } }).greek.architecture,
  false,
);
assert.equal(normalizeThemeEffectsConfig("arctic", { particleIntensity: 8 }).particleIntensity, 1);
assert.equal(normalizeThemeEffectsConfig("arctic", { animationSpeed: 0 }).animationSpeed, 0.25);
assert.equal(patchThemeEffectsConfig("arctic", legacy, { ice: { snow: 0.2 } }).ice.frost, legacy.ice.frost);
assert.equal(getEffectQualityPreset("low").fps, 30);
assert.equal(getEffectResolution("low", 3), 1);
assert.equal(getEffectResolution("balanced", 3), 1.25);
assert.equal(getEffectResolution("ultra", 3), 1.5);
assert.equal(getEffectResolution("balanced", 3, "obs-single"), 2);
assert.equal(getEffectResolution("ultra", 3, "obs-single"), 2);

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
assert(packageJson.dependencies["pixi.js"], "PixiJS is a runtime dependency");
assert(packageJson.dependencies.gsap, "GSAP is a runtime dependency");
const css = readFileSync(new URL("../src/effects/ThemeEffects/ThemeEffects.css", import.meta.url), "utf8");
assert.match(css, /pointer-events:\s*none/);
const engineSource = readFileSync(new URL("../src/effects/ThemeEffects/PixiEngine/createPixiThemeEngine.js", import.meta.url), "utf8");
assert.match(engineSource, /pixi\.js\/unsafe-eval/, "strict-CSP overlays load Pixi's static shader synchronizers");
const obsOverlaySource = readFileSync(new URL("../src/components/OverlayCenter/editor/BetterObsOverlay.jsx", import.meta.url), "utf8");
const editorSource = readFileSync(new URL("../src/components/OverlayCenter/editor/WidgetEditorPage.jsx", import.meta.url), "utf8");
assert.match(obsOverlaySource, /runtime="obs-full"/, "full OBS route uses the shared effects renderer");
assert.match(obsOverlaySource, /runtime="obs-single"/, "standalone widget route uses the shared effects renderer");
assert.match(editorSource, /runtime="editor"/, "editor preview uses the shared effects renderer");

const server = await createServer({
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0, hmr: false },
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await puppeteer.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 700, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (error) => { errors.push(error.message); console.error(error.stack); });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    console.error(message.text());
    if (message.text().includes("[ThemeEffects]")) errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    console.error(`HTTP ${response.status()}: ${response.url()}`);
    if (response.url().includes('/theme-effects/')) errors.push(`Texture HTTP ${response.status()}: ${response.url()}`);
  });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/__theme-effects") {
      await request.respond({
        contentType: "text/html",
        headers: {
          "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ws:;",
        },
        body: '<html><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;</script></body></html>',
      });
    } else if (url.pathname === "/@vite/client") {
      // No HMR socket is needed in a read-only regression page.
      await request.respond({ contentType: "application/javascript", body: "export const createHotContext = () => ({on(){},accept(){},dispose(){},prune(){},invalidate(){}}); export const updateStyle = (id, css) => { let el=document.getElementById(id); if(!el){el=document.createElement('style');el.id=id;document.head.append(el)}el.textContent=css; }; export const removeStyle = (id) => document.getElementById(id)?.remove(); export const injectQuery = (url) => url;" });
    } else {
      await request.continue();
    }
  });
  await page.goto(`${baseUrl}/__theme-effects?fxDebug=1`, { waitUntil: "networkidle0" });
  if (process.env.ICE_PERF_REPORT) await page.evaluate(() => {
    window.fxCounters = { rectReads: 0, draws: 0 };
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (...args) { window.fxCounters.rectReads++; return rect.apply(this, args); };
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function (...args) { window.fxCounters.draws++; return original.apply(this, args); };
    }
  });
  const initialDependencyHash = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8')).browserHash;
  await page.evaluate(async (dependencyHash) => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const { gsap } = await import(`/node_modules/.vite/deps/gsap.js?v=${dependencyHash}`);
    const ThemeEffectsLayer = (await import("/src/effects/ThemeEffects/ThemeEffectsLayer.jsx")).default;
    const registry = await import("/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx");
    const { switchChatStyle } = await import("/src/components/OverlayCenter/widgets/chat/chatStyles.js");
    await import("/src/components/OverlayCenter/OverlayRenderer.css");
    await import("/src/components/OverlayCenter/editor/BetterWidgetPackages.css");
    await import("/src/index.css");
    await import("/src/styles/custom-fonts.css");
    const root = ReactDOM.createRoot(document.getElementById("root"));
    const instance = (theme, quality = "balanced") => {
      const created = registry.createBetterInstance("slot_bingo", {
        x: 40, y: 30, width: 520, height: 360,
        config: { ...registry.getBetterWidgetDefinition("slot_bingo").defaultConfig, colourTheme: theme, themeEffects: { quality } },
      });
      return { ...created, instanceId: "bingo-fx-test", visible: true };
    };
    window.fxTest = {
      eventSpeed(speed) { gsap.globalTimeline.timeScale(speed); },
      renderScene({ quality = "balanced", scale = 1, moved = false, single = "", theme = "arctic", tournamentLayout = "esports", winner = null, media = false, chatEvent = "", results = false, dense = false } = {}) {
        const specifications = [
          ["background", 0, 0, 1920, 1080, { backgroundStyle: "better", texture: "none" }],
          ["navbar", 12, 8, 1896, 74, { navbarStyle: "better", showNowPlaying: false, showCrypto: false }],
          ["bonus_hunt", moved ? 75 : 10, moved ? 120 : 88, moved ? 410 : 360, moved ? 800 : 900, { bonusHuntStyle: "better", orientation: "mainstream", widgetHeight: moved ? 800 : 900, bonuses: single === 'bonus_hunt' || dense ? [
            { id: 'ice-normal', slotName: 'Ice review normal', betSize: 1, payout: 25, opened: true },
            { id: 'ice-super', slotName: 'Ice review super', betSize: 1, payout: 50, opened: true, isSuperBonus: true },
            { id: 'ice-extreme', slotName: 'Ice review extreme', betSize: 1, payout: 75, opened: true, isExtremeBonus: true },
          ] : [], showRequests: false, ...(results ? { sessionState: "ended", drawerAlwaysVisible: true } : {}) }],
          ["slot_bingo", 470, 320, 870, 380, { boardRows: 3 }],
          ["slideshow_frame", 1500, 94, 402, 278, { mediaText: media ? "/player.webp" : "" }],
          ["chat", 1500, 388, 402, 624, { live: true, twitchEnabled: false, kickEnabled: false, youtubeEnabled: false, bttvEnabled: false, animation: "none",
            giveawayInChat: chatEvent === "giveaway", shoutoutInChat: chatEvent === "shoutout",
            __previewGiveawayConfig: { title: "Frozen giveaway", prize: "Channel points", keyword: "join", participants: [{ name: "North", avatarUrl: "/player.webp" }, { name: "Frost", avatarUrl: "/player.webp" }], winner: chatEvent === "giveaway" ? "North" : "", isActive: chatEvent !== "giveaway" },
            __previewShoutoutAlert: chatEvent === "shoutout" ? { id: "ice-shoutout", raider_username: "north", raider_display_name: "North", game_name: "Just Chatting" } : undefined,
            __appearancePreviewMessages: [
            { id: 'ice-mod', username: 'Moderator', isMod: true, message: 'Welcome! Enjoy the stream.', platform: 'twitch', avatarUrl: '/player.webp' },
            { id: 'ice-sub', username: 'Subscriber', isSub: true, message: 'That FREE tile looks promising!', platform: 'twitch', avatarUrl: '/player.webp' },
            { id: 'ice-vip', username: 'CommunityVIP', isVip: true, message: 'Good luck with the next bonus.', platform: 'twitch', avatarUrl: '/player.webp' },
            { id: 'ice-request', username: 'SlotFan', message: '!sr Stormforged', platform: 'twitch', avatarUrl: '/player.webp' },
          ] }],
          ["rtp_stats", 392, 814, 1068, 64, {}],
          ["bets", 392, 890, 620, 176, {
            displayStyle: "better_bets", theme, betTheme: theme,
            orientation: "horizontal", layoutMode: "bars", columns: 2,
            question: "Where will the bonus land?", gameStatus: "result", winnerOption: 2,
            options: ["0 - 99x", "100 - 199x", "200 - 299x", "300x+"],
            bets: { opt_0: 120, opt_1: 260, opt_2: 540, opt_3: 80 },
            betters: { north: { option: 2, amount: 300 }, frost: { option: 1, amount: 200 } },
          }],
          ["tournament", dense ? 470 : 0, dense ? 90 : 0, dense ? 870 : 1000, dense ? 215 : 620, {
            ...registry.resolveBetterWidgetConfig("tournament", {}, "mock"),
            layout: tournamentLayout,
            data: { currentMatchIdx: 0, matches: [{ id: "ice-match", player1: "North", player2: "Frost", type: "bonus", status: "in_progress", winner, config: {}, rounds: [{ player1: { bonusCost: 20, bonusPayout: 45 }, player2: { bonusCost: 20, bonusPayout: 30 } }], slot1: { name: "Frozen glass", image: "/theme-effects/ice/ice-glass.webp" }, slot2: { name: "Cold crystal", image: "/theme-effects/ice/ice-glass.webp" } }] },
          }],
        ];
        const widgets = specifications.filter(([type]) => single ? type === single : dense || type !== "tournament").map(([type, x, y, w, h, config]) => ({
          ...registry.createBetterInstance(type),
          instanceId: `ice-${type}`, widgetType: type, visible: true,
          x: single ? 0 : x, y: single ? 0 : y, width: w, height: h, opacity: 1, zIndex: type === "background" ? 0 : 10,
          config: { ...registry.getBetterWidgetDefinition(type).defaultConfig, ...config, colourTheme: theme, colour: `theme_${theme}`, themeEffects: { quality } },
        }));
        const width = single ? widgets[0].width : 1920;
        const height = single ? widgets[0].height : 1080;
        this.lastScene = widgets;
        root.render(React.createElement("div", { className: "better-obs-canvas", style: { position: "relative", width, height, transform: `scale(${scale})`, transformOrigin: "top left", background: single ? "transparent" : "radial-gradient(ellipse at 50% 40%, #102433, #02060c 76%)" } },
          React.createElement(ThemeEffectsLayer, { instances: widgets, width, height, runtime: single ? "obs-single" : "editor", singleInstanceId: single ? widgets[0].instanceId : "" }),
          ...widgets.map((widget) => React.createElement("div", { key: widget.instanceId, "data-effect-target-id": widget.instanceId, style: { position: "absolute", left: widget.x, top: widget.y, width: widget.width, height: widget.height } },
            registry.renderBetterWidgetInstance({ instance: widget, layout: { instances: widgets }, mode: "live", runtime: "editor" }))),
        ));
      },
      async mountEditor(version) {
        root.unmount();
        const { MemoryRouter } = await import(`/node_modules/.vite/deps/react-router-dom.js?v=${version}`);
        const { AuthProvider } = await import('/src/context/AuthContext.jsx');
        const { supabase } = await import('/src/config/supabaseClient.js');
        const { createOverlayTestDatabase } = await import('/scripts/helpers/overlay-build-test-db.mjs');
        const Editor = (await import('/src/components/OverlayCenter/editor/WidgetEditorPage.jsx')).default;
        const user = { id: 'ice-visual-regression', user_metadata: {} };
        const layout = registry.normalizeBetterLayout({ name: 'Ice material verification', instances: this.lastScene });
        const { client } = createOverlayTestDatabase({
          better_editor_overlays: [{ id: 'ice-test-build', user_id: user.id, public_overlay_id: `bo_${'a'.repeat(48)}`, draft_layout: layout, draft_version: 1, published_version: 0 }],
          overlay_instances: [{ id: 'ice-legacy', user_id: user.id, is_active: true }],
          overlay_themes: [{ user_id: user.id, overlay_id: 'ice-legacy' }], overlay_widgets: [],
        });
        // Existing in-memory test database: never reads or saves a real account.
        supabase.from = client.from;
        supabase.channel = client.channel;
        supabase.removeChannel = client.removeChannel;
        supabase.auth.getSession = async () => ({ data: { session: { user, access_token: 'test-fixture' } } });
        supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
        const editorRoot = ReactDOM.createRoot(document.getElementById('root'));
        editorRoot.render(React.createElement(AuthProvider, null, React.createElement(MemoryRouter, null, React.createElement(Editor))));
      },
      preservedChatEffects: (() => {
        const community = switchChatStyle({
          chatStyle: "broadcast_chat",
          themeEffects: { enabled: false, quality: "low" },
        }, "community_chat");
        return switchChatStyle(community, "broadcast_chat").themeEffects;
      })(),
      render(theme, quality) {
        const widget = instance(theme, quality);
        this.lastWidget = widget;
        root.render(React.createElement("div", { style: { position: "relative", width: 640, height: 480, background: "#05090f" } },
          React.createElement("div", { "data-effect-target-id": "bingo-fx-test", style: { position: "absolute", left: 40, top: 30, width: 520, height: 360 } },
            registry.renderBetterWidgetInstance({ instance: widget, layout: { instances: [widget] }, mode: "live", runtime: "editor" })),
          React.createElement(ThemeEffectsLayer, { instances: [widget], width: 640, height: 480, runtime: "test" }),
        ));
      },
    };
    window.fxTest.render("arctic", "balanced");
  }, initialDependencyHash);
  assert.deepEqual(
    await page.evaluate(() => window.fxTest.preservedChatEffects),
    { enabled: false, quality: "low" },
    "chat style changes restore the saved effects for that style",
  );
  await page.waitForSelector(".theme-effects-layer__canvas");
  await page.waitForFunction(() => document.querySelector("canvas")?.width >= 640);
  await page.waitForFunction(() => document.querySelector(".theme-effects-layer__debug")?.textContent.includes("BALANCED"));
  const first = await page.evaluate(() => ({
    canvases: document.querySelectorAll(".theme-effects-layer__canvas").length,
    pointerEvents: getComputedStyle(document.querySelector(".theme-effects-layer")).pointerEvents,
    alpha: document.querySelector("canvas").getContext("webgl2", { alpha: true })?.getContextAttributes().alpha ?? true,
    bufferWidth: document.querySelector("canvas").width,
    fallback: document.querySelector(".theme-effects-layer").dataset.effectsFallback || "",
    zIndex: getComputedStyle(document.querySelector(".theme-effects-layer")).zIndex,
  }));
  assert.deepEqual(first, {
    canvases: 1,
    pointerEvents: "none",
    alpha: true,
    bufferWidth: 800,
    fallback: "",
    zIndex: "1000000",
  });

  await page.evaluate(() => window.fxTest.render("gladiator", "ultra"));
  await page.waitForFunction(() => document.querySelector(".theme-effects-layer__debug")?.textContent.includes("ULTRA"));
  assert.equal(await page.$$eval(".theme-effects-layer__canvas", (nodes) => nodes.length), 1, "theme switching reuses one renderer");
  assert.equal(await page.$eval("canvas", (canvas) => canvas.width), 960, "Ultra updates the DPR cap without another renderer");
  assert.deepEqual(errors, [], `browser errors: ${errors.join(" | ")}`);
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.evaluate(() => window.fxTest.renderScene());
  await page.waitForFunction(() => document.querySelectorAll('.theme-effects-layer__target-debug').length === 8);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const checkBounds = async () => {
    const mismatches = await page.evaluate(async () => {
      const { findEffectSurface } = await import('/src/effects/ThemeEffects/targetBounds.js');
      return [...document.querySelectorAll('.theme-effects-layer__target-debug')].flatMap((outline) => {
        const type = outline.textContent.split(' · ')[0];
        const element = findEffectSurface(document, { id: `ice-${type}`, widgetType: type, theme: { family: 'ice' } });
        const actual = element.getBoundingClientRect();
        const measured = outline.getBoundingClientRect();
        return ['x', 'y', 'width', 'height'].filter((key) => Math.abs(actual[key] - measured[key]) > 1).map((key) => `${type}.${key}: ${actual[key]} vs ${measured[key]}`);
      });
    });
    assert.deepEqual(mismatches, [], 'FX match the painted DOM surface, including fitted Bonus Hunt');
  };
  await checkBounds();
  if (process.env.ICE_PERF_REPORT) {
    const samples = [];
    for (const scenario of ['idle', 'child-animation']) {
      await page.evaluate((scenario) => {
        window.fxCounters.rectReads = window.fxCounters.draws = 0;
        if (scenario === 'child-animation') {
          const child = document.createElement('span');
          document.querySelector('.slot-bingo-widget__header').append(child);
          window.fxChurn = setInterval(() => { child.style.opacity = String(performance.now() % 100 / 100); }, 16);
          window.fxChurnElement = child;
        }
      }, scenario);
      const before = await page.metrics();
      await new Promise(resolve => setTimeout(resolve, 4000));
      const after = await page.metrics();
      samples.push({ scenario, seconds: after.Timestamp - before.Timestamp,
        taskMs: (after.TaskDuration - before.TaskDuration) * 1000,
        scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
        layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000,
        heapBytes: after.JSHeapUsedSize,
        ...await page.evaluate(() => ({ ...window.fxCounters, stats: document.querySelector('.theme-effects-layer__debug')?.textContent })) });
      await page.evaluate(() => { clearInterval(window.fxChurn); window.fxChurnElement?.remove(); });
    }
    writeFileSync(process.env.ICE_PERF_REPORT, JSON.stringify(samples, null, 2));
  }
  const shotDirectory = process.env.ICE_SCREENSHOTS;
  if (shotDirectory) mkdirSync(shotDirectory, { recursive: true });
  const screenshot = async (name, clip) => {
    if (!shotDirectory) return;
    await page.addStyleTag({ content: '.theme-effects-layer__debug,.theme-effects-layer__target-debug { visibility:hidden }' });
    await page.screenshot({ path: `${shotDirectory}/${name}.png`, ...(clip ? { clip } : {}) });
  };
  for (const quality of ['low', 'balanced', 'ultra']) {
    await page.evaluate((quality) => window.fxTest.renderScene({ quality }), quality);
    await page.waitForFunction((quality) => document.querySelector('.theme-effects-layer__debug')?.textContent.includes(quality.toUpperCase()), {}, quality);
    await new Promise((resolve) => setTimeout(resolve, 750));
    await screenshot(`ice-full-${quality}`);
    if (quality === 'balanced') {
      const chatMaterial = await page.$eval('[data-widget-type="chat"] [data-better-element="highlightedMessage"]', element => getComputedStyle(element).backgroundImage);
      assert(chatMaterial.includes('mist.png'), 'role-highlighted chat cards use alpha mist, not an opaque nested shell');
      const tile = await page.$eval('.slot-bingo-widget__square.is-complete', element => ({
        blend: getComputedStyle(element).backgroundBlendMode,
        animation: getComputedStyle(element, '::after').animationName,
        labelSize: parseFloat(getComputedStyle(element.querySelector('.slot-bingo-widget__label')).fontSize),
      }));
      assert(!tile.blend.includes('screen'), 'completed tiles keep a dark reading zone');
      assert.equal(tile.animation, 'none', 'completed Ice tiles do not run permanent DOM sheen loops');
      assert(tile.labelSize >= 16, 'reference Bingo uses its readable configured label size');
      await screenshot('ice-bonus-hunt', { x: 0, y: 80, width: 385, height: 930 });
      await screenshot('ice-topbar', { x: 0, y: 0, width: 1920, height: 112 });
      await screenshot('ice-bingo', { x: 465, y: 315, width: 880, height: 390 });
      await screenshot('ice-chat', { x: 1495, y: 383, width: 412, height: 634 });
    }
  }
  for (const width of [1920, 1280, 960]) {
    await page.setViewport({ width, height: Math.round(width * 9 / 16) });
    await page.evaluate(scale => window.fxTest.renderScene({ dense: true, chatEvent: 'giveaway', media: true, scale }), width / 1920);
    await page.waitForSelector(':is(.better-gw-result-card,.better-giveaway-widget)');
    await new Promise(resolve => setTimeout(resolve, 750));
    await checkBounds();
    const embedded = await page.evaluate(() => {
      const winnerCard = document.querySelector('.better-gw-result-card');
      if (winnerCard) {
        const frame = winnerCard.closest('.ov-chat-giveaway').getBoundingClientRect();
        const rect = winnerCard.getBoundingClientRect();
        return {
          winner: true,
          message: winnerCard.querySelector('.better-gw-result-message')?.textContent,
          hasAvatar: Boolean(winnerCard.querySelector('.better-gw-result-avatar')),
          fits: rect.top >= frame.top && rect.bottom <= frame.bottom && rect.left >= frame.left && rect.right <= frame.right,
        };
      }
      const card = document.querySelector('.better-giveaway-widget');
      const header = card.querySelector('.better-gw-header');
      const label = card.querySelector('.better-gw-keyword-value');
      const rect = label.getBoundingClientRect();
      const frame = card.closest('.ov-chat-giveaway').getBoundingClientRect();
      return { inset: getComputedStyle(card, '::before').content,
        dividerDot: getComputedStyle(card.querySelector('.better-gw-rule'), '::before').content,
        headerImage: getComputedStyle(header).backgroundImage,
        keyword: label.textContent, fits: rect.top >= frame.top && rect.bottom <= frame.bottom && rect.left >= frame.left && rect.right <= frame.right };
    });
    if (embedded.winner) {
      assert.equal(embedded.message, 'won the giveaway');
      assert(embedded.hasAvatar, 'completed giveaway keeps the winner avatar');
      assert(embedded.fits, 'winner popup remains inside the compact chat slot');
      await screenshot(`ice-dense-${width}`);
      continue;
    }
    assert.equal(embedded.inset, 'none', 'embedded giveaway has no standalone inset frame');
    assert.equal(embedded.dividerDot, 'none', 'embedded divider has no standalone neon endpoints');
    assert.equal(embedded.headerImage, 'none', 'giveaway header inherits the chat material');
    assert.equal(embedded.keyword, '!join');
    assert(embedded.fits, 'giveaway entry instruction remains inside the visible module');
    await screenshot(`ice-dense-${width}`);
  }
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluate(() => window.fxTest.renderScene({ moved: true, scale: 0.65 }));
  await new Promise((resolve) => setTimeout(resolve, 750));
  await checkBounds();
  await page.setViewport({ width: 1400, height: 900 });
  await checkBounds();
  for (const type of ['slot_bingo', 'bonus_hunt', 'slideshow_frame', 'chat', 'bets', 'tournament']) {
    await page.evaluate((single) => window.fxTest.renderScene({ single }), type);
    await new Promise((resolve) => setTimeout(resolve, 750));
    await checkBounds();
    assert.equal(await page.$$eval('.theme-effects-layer__canvas', (nodes) => nodes.length), 1);
    await screenshot(`ice-standalone-${type}`);
  }
  for (const theme of ['gladiator', 'arctic', 'gladiator', 'arctic']) {
    await page.evaluate((theme) => window.fxTest.renderScene({ theme }), theme);
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  await page.evaluate(() => window.fxTest.renderScene({ single: 'slideshow_frame', media: true }));
  await page.waitForSelector('.better-slideshow-frame__media');
  await page.waitForFunction(() => { const image = document.querySelector('.better-slideshow-frame__media'); return image?.complete && image.naturalWidth > 0; });
  await screenshot('ice-media-loaded');
  for (const chatEvent of ['giveaway', 'shoutout']) {
    await page.evaluate(chatEvent => window.fxTest.renderScene({ single: 'chat', chatEvent }), chatEvent);
    await page.waitForSelector(chatEvent === 'giveaway' ? ':is(.better-gw-result-card,.better-giveaway-widget)' : '.better-shoutout-card');
    await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(await page.$$eval('canvas', nodes => nodes.length), 1, 'embedded events reuse the shared renderer');
    await screenshot(`ice-chat-${chatEvent}`);
  }
  await page.evaluate(() => window.fxTest.renderScene({ single: 'tournament' }));
  await new Promise(resolve => setTimeout(resolve, 800));
  await page.evaluate(() => {
    window.iceEvents = [];
    document.addEventListener('theme-effects:burst', event => window.iceEvents.push(event.detail.kind));
    window.fxTest.eventSpeed(0.15);
    window.fxTest.renderScene({ single: 'tournament', winner: 'player1' });
  });
  await page.waitForFunction(() => window.iceEvents.includes('tournament'));
  await page.waitForFunction(() => document.querySelector('.theme-effects-layer__debug')?.dataset.lastEvent === 'tournament');
  assert.equal(await page.$$eval('canvas', nodes => nodes.length), 1, 'Ice tournament does not allocate a second canvas');
  await screenshot('ice-tournament-impact');
  await page.evaluate(() => window.fxTest.eventSpeed(1));
  await new Promise(resolve => setTimeout(resolve, 3600));
  assert.equal(await page.$('.tw-ice-impact'), null, 'tournament impact cleans up after hand-off');
  await page.evaluate(() => window.fxTest.renderScene({ single: 'bets' }));
  await page.waitForFunction(() => window.iceEvents.includes('bets'));
  assert.equal(await page.$$eval('canvas', nodes => nodes.length), 1, 'Ice Bets result reuses the shared renderer');
  await screenshot('ice-bets-result');
  await page.evaluate(() => window.fxTest.renderScene({ single: 'bonus_hunt' }));
  await new Promise(resolve => setTimeout(resolve, 800));
  await page.evaluate(() => window.__boTriggerWin(1000));
  await page.waitForSelector('.better-hunt-win-badge');
  assert.equal(await page.$$eval('.better-hunt-win-confetti', nodes => nodes.length), 0, 'Ice wins use pooled shards instead of DOM confetti');
  assert.ok(await page.$('.better-hunt-win-ice-cracks'), 'Ice wins expose the finite crack layer');
  await screenshot('ice-hunt-event');
  // Intersection pausing prevents offscreen previews consuming a full ticker.
  await page.evaluate(() => { document.querySelector('.better-obs-canvas').style.transform = 'translateY(5000px)'; });
  await new Promise(resolve => setTimeout(resolve, 1000));
  const pausedFrame = await page.$eval('.theme-effects-layer__debug', node => node.dataset.frames);
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal(await page.$eval('.theme-effects-layer__debug', node => node.dataset.frames), pausedFrame);
  await page.evaluate(() => { document.querySelector('.better-obs-canvas').style.transform = ''; });
  await page.waitForFunction(frame => document.querySelector('.theme-effects-layer__debug')?.dataset.frames !== frame, {}, pausedFrame);
  await page.evaluate(() => window.fxTest.renderScene({ single: 'bonus_hunt', results: true }));
  await page.waitForSelector('.better-hunt-result');
  await page.waitForSelector('.better-hunt-win-badge', { hidden: true });
  await page.setViewport({ width: 1400, height: 1200 });
  await new Promise(resolve => setTimeout(resolve, 700));
  const bestResult = await page.$eval('.better-hunt-result-flipper', element => ({
    face: element.dataset.face,
    label: element.getAttribute('aria-label'),
    activeText: element.querySelector('.better-hunt-result-face:not([aria-hidden="true"])')?.textContent,
  }));
  assert.equal(bestResult.face, 'best', 'Mainstream results begin on the Best slot');
  assert.match(bestResult.label, /Best slot/i);
  assert.match(bestResult.activeText, /Best/i);
  await screenshot('ice-best-slot');
  await page.waitForFunction(
    () => document.querySelector('.better-hunt-result-flipper')?.dataset.face === 'worst',
    { timeout: 12000 },
  );
  const worstResult = await page.$eval('.better-hunt-result-flipper', element => ({
    face: element.dataset.face,
    label: element.getAttribute('aria-label'),
    activeText: element.querySelector('.better-hunt-result-face:not([aria-hidden="true"])')?.textContent,
  }));
  assert.equal(worstResult.face, 'worst', 'Mainstream results flip to the Worst slot');
  assert.match(worstResult.label, /Worst slot/i);
  assert.match(worstResult.activeText, /Worst/i);
  await screenshot('ice-worst-slot');
  await page.setViewport({ width: 1400, height: 900 });
  for (const tournamentLayout of ['vertical', 'minimal', 'arena', 'scoreboard', 'grid']) {
    await page.evaluate((tournamentLayout) => window.fxTest.renderScene({ single: 'tournament', tournamentLayout }), tournamentLayout);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await checkBounds();
    assert(await page.$eval('.tw-root', element => getComputedStyle(element).backgroundImage.includes('ice-glass.webp')));
    await screenshot(`ice-tournament-${tournamentLayout}`);
  }
  await page.evaluate(() => window.fxTest.renderScene());
  await new Promise((resolve) => setTimeout(resolve, 750));
  await checkBounds();
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  await page.evaluate((version) => window.fxTest.mountEditor(version), browserHash);
  await page.waitForSelector('.better-editor-canvas [data-effect-target-id="ice-slot_bingo"]');
  await page.click('.better-editor-canvas [data-effect-target-id="ice-slot_bingo"]');
  await page.waitForSelector('.better-editor-selection-layer .better-editor-resize-handle--se');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.equal(await page.evaluate(() => {
    const control = document.querySelector('.better-editor-selection-layer .better-editor-resize-handle--se');
    const rect = control.getBoundingClientRect();
    return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === control;
  }), true, 'selection handles stay above the pointer-transparent FX canvas');
  const selectedZ = await page.$eval('.better-editor-canvas-instance.is-selected', (element) => Number(getComputedStyle(element).zIndex));
  assert(selectedZ < 1000000, 'selecting a widget no longer lifts its opaque surface above the FX canvas');
  await checkBounds();
  await screenshot('ice-editor-preview');
  const handle = await page.$('.better-editor-selection-layer .better-editor-resize-handle--se');
  const sizeBefore = await page.$eval('.better-editor-canvas-instance.is-selected', (element) => element.getBoundingClientRect().width);
  const handleRect = await handle.boundingBox();
  await page.mouse.move(handleRect.x + handleRect.width / 2, handleRect.y + handleRect.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleRect.x + 35, handleRect.y + 20, { steps: 5 });
  await page.mouse.up();
  await new Promise((resolve) => setTimeout(resolve, 600));
  const sizeAfter = await page.$eval('.better-editor-canvas-instance.is-selected', (element) => element.getBoundingClientRect().width);
  assert(sizeAfter > sizeBefore + 5, 'the real editor resize handler still changes the widget width');
  await checkBounds();
  const widgetRect = await (await page.$('.better-editor-canvas-instance.is-selected')).boundingBox();
  await page.mouse.move(widgetRect.x + 40, widgetRect.y + 30);
  await page.mouse.down();
  await page.mouse.move(widgetRect.x + 65, widgetRect.y + 50, { steps: 5 });
  await page.mouse.up();
  await new Promise((resolve) => setTimeout(resolve, 600));
  const movedRect = await (await page.$('.better-editor-canvas-instance.is-selected')).boundingBox();
  assert(movedRect.x > widgetRect.x + 5, 'the real editor drag handler still moves the widget');
  await checkBounds();
  assert.equal(await page.$$eval('.theme-effects-layer__canvas', (nodes) => nodes.length), 1);
  assert.deepEqual(errors, [], `browser errors: ${errors.join(' | ')}`);
  console.log("Theme effects engine checks passed.");
} finally {
  await browser.close();
  await server.close();
}
