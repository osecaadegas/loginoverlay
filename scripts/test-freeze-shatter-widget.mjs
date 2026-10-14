import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3011";
const vercelConfig = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
);
const globalPermissionsPolicy = vercelConfig.headers
  .find((entry) => entry.source === "/(.*)")
  ?.headers.find((header) => header.key === "Permissions-Policy")?.value;
assert.match(
  globalPermissionsPolicy || "",
  /(?:^|,\s*)camera=\(self\)(?:,|$)/,
  "Production must allow same-origin camera requests so the browser can show its permission prompt",
);
assert.doesNotMatch(globalPermissionsPolicy || "", /camera=\(\)/);
const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    const isViteTransportNoise =
      text.includes("WebSocket connection to 'ws://127.0.0.1:") ||
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

  await page.goto(`${base}/__freeze-shatter-test`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const { browserHash } = JSON.parse(
    readFileSync(new URL("../node_modules/.vite/deps/_metadata.json", import.meta.url), "utf8"),
  );

  await page.evaluate(async (version) => {
    let cameraRequests = 0;
    const cameraConstraints = [];
    const createCameraStream = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const context = canvas.getContext("2d");
      context.fillStyle = "#00ff00";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#e24d5f";
      context.beginPath();
      context.arc(320, 105, 48, 0, Math.PI * 2);
      context.fill();
      context.fillRect(255, 145, 130, 205);
      const stream = canvas.captureStream(30);
      const track = stream.getVideoTracks()[0];
      Object.defineProperty(track, "getSettings", {
        configurable: true,
        value: () => ({ deviceId: "test-camera" }),
      });
      return stream;
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: async () => [{ kind: "videoinput", deviceId: "test-camera", label: cameraRequests ? "Test Camera" : "" }],
        getUserMedia: async (constraints) => {
          cameraRequests += 1;
          cameraConstraints.push(constraints);
          if (constraints?.video?.deviceId?.exact === "stale-browser-camera") {
            throw new DOMException("Unknown browser-local device", "OverconstrainedError");
          }
          return createCameraStream();
        },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
    await import("/src/index.css");
    await import("/src/components/OverlayCenter/editor/BetterWidgetPackages.css");
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
      cameraRequests: () => cameraRequests,
      cameraConstraints: () => cameraConstraints,
    };

    function TestApp() {
      const [config, setConfig] = React.useState(initial.config);
      const [obs, setObs] = React.useState(false);
      const instance = registry.createBetterInstance("freeze_shatter", {
        ...initial,
        config: {
          ...config,
          source: obs ? "stale-browser-camera" : "demo",
          sourceLabel: obs ? "Test Camera" : config.sourceLabel,
          triggerMode: obs ? "on_load" : config.triggerMode,
        },
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
  await page.click(".bp-camera-permission > button");
  await page.waitForFunction(() => document.querySelector(".bp-camera-permission")?.dataset.state === "granted");
  assert.deepEqual(
    await page.evaluate(() => ({
      requests: window.freezeAudit.cameraRequests(),
      source: window.freezeAudit.config.source,
      sourceLabel: window.freezeAudit.config.sourceLabel,
    })),
    { requests: 1, source: "test-camera", sourceLabel: "Test Camera" },
  );
  await page.screenshot({ path: ".codex-dev/freeze-shatter-camera-permission.png" });
  await page.click('.bp-panel-tabs[data-level="primary"] button[data-category="appearance"]');
  assert.ok((await visibleSections()).includes("Ice material"));
  await page.click('.bp-panel-tabs[data-level="primary"] button[data-category="behavior"]');
  assert.ok((await visibleSections()).includes("Preview & trigger"));
  assert.equal((await visibleSections()).includes("Colour Theme"), false);

  assert.equal(
    await page.$eval(".bp-freeze-actions__test", (button) => button.textContent.trim()),
    "Test effect in overlay",
  );
  await page.click(".bp-freeze-actions__test");
  await page.waitForFunction(() => document.querySelector(".freeze-shatter-widget")?.dataset.state !== "visible");
  await new Promise((resolve) => setTimeout(resolve, 230));
  await page.screenshot({ path: ".codex-dev/freeze-shatter-editor.png" });
  await page.waitForFunction(() => document.querySelector(".freeze-shatter-widget")?.dataset.state === "shattering");
  await page.screenshot({ path: ".codex-dev/freeze-shatter-editor-shards.png" });
  await page.waitForFunction(() => document.querySelector(".freeze-shatter-widget")?.dataset.state === "visible", { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector(".bp-freeze-test-feedback")?.textContent.includes("complete"));

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
  assert.equal(
    await page.evaluate(() => window.freezeAudit.sharedLayout.instances.find((instance) => instance.widgetType === "freeze_shatter")?.config.sourceLabel),
    "",
    "Community copies reset the machine-specific camera label",
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
  await page.waitForFunction(() => document.querySelector(".freeze-shatter-widget")?.dataset.state === "shattering");
  await page.screenshot({ path: ".codex-dev/freeze-shatter-obs-shards.png" });
  assert.equal(await page.$eval("#stage .freeze-shatter-widget", (widget) => widget.dataset.runtime), "obs");
  assert.equal(await page.$("#stage .freeze-shatter-widget__error"), null, "OBS output has no stale camera or setup notification");
  assert.ok(
    await page.evaluate(() => window.freezeAudit.cameraConstraints().some((constraints) =>
      constraints?.video?.deviceId?.exact === "stale-browser-camera",
    )),
    "OBS first tries the saved browser camera identifier",
  );
  assert.ok(
    await page.evaluate(() => window.freezeAudit.cameraConstraints().some((constraints) =>
      constraints?.video && !constraints.video.deviceId,
    )),
    "OBS falls back to a camera identifier available in its own browser profile",
  );
  assert.deepEqual(errors, []);
  console.log("Freeze & Shatter widget passed registry, controls, WebGL preview, transition, sharing, and OBS-renderer checks.");
} finally {
  await browser.close();
}
