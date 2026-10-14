import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3011";
const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    const isViteTransportNoise =
      text.includes("WebSocket connection to 'ws://127.0.0.1:3011") ||
      text.includes("[vite] failed to connect to websocket");
    if (message.type() === "error" && !isViteTransportNoise) errors.push(text);
  });
  await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/__freeze-shatter-test") {
      return request.respond({
        contentType: "text/html",
        body: `<html><body style="margin:0;background:#07111e;color:white"><div id="root"></div>
          <script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>`,
      });
    }
    if (url.origin === new URL(base).origin) return request.continue();
    return request.abort();
  });

  await page.goto(`${base}/__freeze-shatter-test`, { waitUntil: "networkidle0" });
  const { browserHash } = JSON.parse(
    readFileSync(new URL("../node_modules/.vite/deps/_metadata.json", import.meta.url), "utf8"),
  );

  await page.evaluate(async (version) => {
    await import("/src/index.css");
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const registry = await import("/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx");
    const { BetterWidgetControls } = await import("/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx");
    const shared = await import("/src/components/OverlayCenter/editor/sharedOverlayTemplates.js");

    const initial = registry.createBetterInstance("freeze_shatter", {
      width: 640,
      height: 360,
      config: {
        source: "demo",
        duration: 0.7,
        freezeDuration: 0.16,
        fractureDelay: 0.12,
        shatterDuration: 0.28,
        reconstructionDuration: 0.55,
        triggerMode: "manual",
        fragmentCount: 60,
        maxParticles: 90,
        cleanup: false,
      },
    });
    const sharedLayout = shared.createShareableBetterLayout({ instances: [initial] });
    window.freezeAudit = {
      registry,
      sharedLayout,
      config: initial.config,
      renderObs: null,
    };

    function TestApp() {
      const [config, setConfig] = React.useState(initial.config);
      const [obs, setObs] = React.useState(false);
      const instance = registry.createBetterInstance("freeze_shatter", {
        ...initial,
        config: { ...config, source: "demo", triggerMode: obs ? "on_load" : config.triggerMode },
      });
      window.freezeAudit.config = config;
      window.freezeAudit.renderObs = () => setObs(true);
      return React.createElement(
        React.Fragment,
        null,
        !obs && React.createElement("aside", { style: { width: 340, height: 820, overflow: "auto", float: "left" } },
          React.createElement(BetterWidgetControls, {
            type: "freeze_shatter",
            config,
            widget: { id: instance.instanceId, instanceId: instance.instanceId },
            onChange: setConfig,
          }),
        ),
        React.createElement("main", {
          id: "stage",
          "data-runtime": obs ? "obs" : "editor",
          style: { marginLeft: obs ? 0 : 360, width: 640, height: 360, background: "linear-gradient(135deg,#071425,#0d2940)" },
        }, registry.renderBetterWidgetInstance({
          instance,
          layout: { instances: [instance] },
          mode: obs ? "live" : "mock",
          runtime: obs ? "obs" : "editor",
          accessVerified: true,
        })),
      );
    }
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(TestApp));
  }, browserHash);

  await page.waitForSelector('.freeze-shatter-widget[data-ready="true"]', { timeout: 15000 }).catch(async (failure) => {
    console.error("Freeze renderer diagnostics", await page.evaluate(() => ({
      body: document.body.innerText,
      widget: document.querySelector(".freeze-shatter-widget")?.outerHTML.slice(0, 2000),
    })));
    console.error(errors);
    throw failure;
  });
  assert.equal(await page.$eval(".freeze-shatter-widget__renderer canvas", (canvas) => canvas.width), 1280);
  const geometry = await page.$eval("#stage", (stage) => {
    const widget = stage.querySelector(".freeze-shatter-widget");
    const canvas = widget.querySelector("canvas");
    return {
      stage: stage.getBoundingClientRect().toJSON(),
      widget: widget.getBoundingClientRect().toJSON(),
      canvas: canvas.getBoundingClientRect().toJSON(),
      overflow: getComputedStyle(widget).overflow,
      background: getComputedStyle(widget).backgroundColor,
    };
  });
  assert.equal(geometry.widget.width, 640);
  assert.equal(geometry.widget.height, 360);
  assert.equal(geometry.canvas.width, 640);
  assert.equal(geometry.canvas.height, 360);
  assert.equal(geometry.overflow, "hidden");
  assert.equal(geometry.background, "rgba(0, 0, 0, 0)");

  const visibleSections = () => page.$$eval("[data-control-section]", (sections) =>
    sections.filter((section) => getComputedStyle(section).display !== "none").map((section) => section.getAttribute("data-control-section")),
  );
  assert.ok((await visibleSections()).includes("Camera"));
  await page.click('.bp-panel-tabs[data-level="primary"] button[data-category="appearance"]');
  assert.ok((await visibleSections()).includes("Ice material"));
  await page.click('.bp-panel-tabs[data-level="primary"] button[data-category="behavior"]');
  assert.ok((await visibleSections()).includes("Preview & trigger"));
  assert.equal((await visibleSections()).includes("Colour Theme"), false);

  await page.click(".bp-freeze-actions button:first-child");
  await page.waitForFunction(() => document.querySelector(".freeze-shatter-widget")?.dataset.state !== "visible");
  await new Promise((resolve) => setTimeout(resolve, 230));
  await page.screenshot({ path: ".codex-dev/freeze-shatter-editor.png" });
  await page.waitForFunction(() => document.querySelector(".freeze-shatter-widget")?.dataset.state === "visible", { timeout: 5000 });

  await page.click('.bp-segmented button:nth-child(1)');
  await page.waitForFunction(() => window.freezeAudit.config.quality === "Low");
  assert.deepEqual(
    await page.evaluate(() => ({
      quality: window.freezeAudit.config.quality,
      resolution: window.freezeAudit.config.resolution,
      particles: window.freezeAudit.config.maxParticles,
      fragments: window.freezeAudit.config.fragmentCount,
    })),
    { quality: "Low", resolution: 0.5, particles: 50, fragments: 45 },
  );
  assert.equal(
    await page.evaluate(() => window.freezeAudit.sharedLayout.instances.find((instance) => instance.widgetType === "freeze_shatter")?.config.source),
    "default",
    "Community copies reset the machine-specific camera device",
  );

  await page.evaluate(() => window.freezeAudit.renderObs());
  await page.waitForSelector('#stage[data-runtime="obs"] .freeze-shatter-widget[data-ready="true"]', { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector(".freeze-shatter-widget")?.dataset.state !== "visible", { timeout: 5000 }).catch(async (failure) => {
    console.error("OBS trigger diagnostics", await page.evaluate(() => ({
      state: document.querySelector(".freeze-shatter-widget")?.dataset.state,
      triggerMode: document.querySelector(".freeze-shatter-widget")?.dataset.triggerMode,
      error: document.querySelector(".freeze-shatter-widget__error")?.textContent,
      config: window.freezeAudit.config,
    })));
    throw failure;
  });
  await new Promise((resolve) => setTimeout(resolve, 230));
  await page.screenshot({ path: ".codex-dev/freeze-shatter-obs.png" });
  assert.equal(await page.$eval("#stage .freeze-shatter-widget", (widget) => widget.dataset.runtime), "obs");
  assert.deepEqual(errors, []);
  console.log("Freeze & Shatter widget passed registry, controls, WebGL preview, transition, sharing, and OBS-renderer checks.");
} finally {
  await browser.close();
}
