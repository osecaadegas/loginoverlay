import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
assert.equal(normalizeThemeEffectsConfig("arctic", { particleIntensity: 8 }).particleIntensity, 1);
assert.equal(normalizeThemeEffectsConfig("arctic", { animationSpeed: 0 }).animationSpeed, 0.25);
assert.equal(patchThemeEffectsConfig("arctic", legacy, { ice: { snow: 0.2 } }).ice.frost, legacy.ice.frost);
assert.equal(getEffectQualityPreset("low").fps, 30);
assert.equal(getEffectResolution("low", 3), 1);
assert.equal(getEffectResolution("balanced", 3), 1.25);
assert.equal(getEffectResolution("ultra", 3), 1.5);

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
assert(packageJson.dependencies["pixi.js"], "PixiJS is a runtime dependency");
assert(packageJson.dependencies.gsap, "GSAP is a runtime dependency");
const css = readFileSync(new URL("../src/effects/ThemeEffects/ThemeEffects.css", import.meta.url), "utf8");
assert.match(css, /pointer-events:\s*none/);
const obsOverlaySource = readFileSync(new URL("../src/components/OverlayCenter/editor/BetterObsOverlay.jsx", import.meta.url), "utf8");
const editorSource = readFileSync(new URL("../src/components/OverlayCenter/editor/WidgetEditorPage.jsx", import.meta.url), "utf8");
assert.match(obsOverlaySource, /runtime="obs-full"/, "full OBS route uses the shared effects renderer");
assert.match(obsOverlaySource, /runtime="obs-single"/, "standalone widget route uses the shared effects renderer");
assert.match(editorSource, /runtime="editor"/, "editor preview uses the shared effects renderer");

const server = await createServer({
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
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
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/__theme-effects") {
      await request.respond({
        contentType: "text/html",
        body: '<html><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;</script></body></html>',
      });
    } else {
      await request.continue();
    }
  });
  await page.goto(`${baseUrl}/__theme-effects?fxDebug=1`, { waitUntil: "networkidle0" });
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const ThemeEffectsLayer = (await import("/src/effects/ThemeEffects/ThemeEffectsLayer.jsx")).default;
    const registry = await import("/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx");
    const { switchChatStyle } = await import("/src/components/OverlayCenter/widgets/chat/chatStyles.js");
    await import("/src/components/OverlayCenter/OverlayRenderer.css");
    await import("/src/components/OverlayCenter/editor/BetterWidgetPackages.css");
    const root = ReactDOM.createRoot(document.getElementById("root"));
    const instance = (theme, quality = "balanced") => {
      const created = registry.createBetterInstance("slot_bingo", {
        x: 40, y: 30, width: 520, height: 360,
        config: { ...registry.getBetterWidgetDefinition("slot_bingo").defaultConfig, colourTheme: theme, themeEffects: { quality } },
      });
      return { ...created, instanceId: "bingo-fx-test", visible: true };
    };
    window.fxTest = {
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
  });
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
  }));
  assert.deepEqual(first, { canvases: 1, pointerEvents: "none", alpha: true, bufferWidth: 800 });

  await page.evaluate(() => window.fxTest.render("gladiator", "ultra"));
  await page.waitForFunction(() => document.querySelector(".theme-effects-layer__debug")?.textContent.includes("ULTRA"));
  assert.equal(await page.$$eval(".theme-effects-layer__canvas", (nodes) => nodes.length), 1, "theme switching reuses one renderer");
  assert.equal(await page.$eval("canvas", (canvas) => canvas.width), 960, "Ultra updates the DPR cap without another renderer");
  assert.deepEqual(errors, [], `browser errors: ${errors.join(" | ")}`);
  console.log("Theme effects engine checks passed.");
} finally {
  await browser.close();
  await server.close();
}
