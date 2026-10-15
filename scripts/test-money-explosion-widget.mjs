import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import puppeteer from "puppeteer";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3011";
mkdirSync(new URL("../.codex-dev", import.meta.url), { recursive: true });
const vercelConfig = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const policy = vercelConfig.headers.find((entry) => entry.source === "/(.*)")?.headers.find((header) => header.key === "Permissions-Policy")?.value;
assert.match(policy || "", /(?:^|,\s*)camera=\(self\)(?:,|$)/);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--disable-extensions", "--disable-background-networking"],
});
try {
  const page = await browser.newPage(); const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { const value = message.text(); if (message.type() === "error" && !value.includes("WebSocket connection") && !value.includes("[vite] failed")) errors.push(value); });
  await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/__money-explosion-test") return request.respond({ contentType: "text/html", body: `<html><body style="margin:0;background:#07111e;color:white"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>` });
    if (url.origin === new URL(base).origin) return request.continue(); return request.abort();
  });
  await page.goto(`${base}/__money-explosion-test`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const { browserHash } = JSON.parse(readFileSync(new URL("../node_modules/.vite/deps/_metadata.json", import.meta.url), "utf8"));
  await page.evaluate(async (version) => {
    let cameraRequests = 0; const cameraConstraints = [];
    const stream = () => { const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360; const ctx = canvas.getContext("2d"); ctx.fillStyle = "#00ff00"; ctx.fillRect(0, 0, 640, 360); const gradient = ctx.createLinearGradient(260, 45, 390, 320); gradient.addColorStop(0, "#ffce9b"); gradient.addColorStop(1, "#7e2f46"); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(320, 92, 45, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(252, 132, 136, 220); const result = canvas.captureStream(30); const track = result.getVideoTracks()[0]; Object.defineProperty(track, "getSettings", { configurable: true, value: () => ({ deviceId: "money-camera" }) }); return result; };
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { enumerateDevices: async () => [{ kind: "videoinput", deviceId: "money-camera", label: cameraRequests ? "Money Camera" : "" }], getUserMedia: async (constraints) => { cameraRequests++; cameraConstraints.push(constraints); if (constraints?.video?.deviceId?.exact === "stale-money-camera") throw new DOMException("Unknown browser camera", "OverconstrainedError"); return stream(); }, addEventListener: () => undefined, removeEventListener: () => undefined } });
    await import("/src/index.css"); await import("/src/components/OverlayCenter/editor/BetterWidgetPackages.css");
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`); const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const registry = await import("/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx"); const { BetterWidgetControls } = await import("/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx"); const shared = await import("/src/components/OverlayCenter/editor/sharedOverlayTemplates.js");
    const initial = registry.createBetterInstance("camera", { width: 640, height: 360, config: { displayStyle: "money_explosion", moneyConfig: { source: "demo", duration: 1.5, reconstructionDuration: 1.5, banknoteCount: 80, particleDensity: 0.25, quality: "Low", cleanup: false, triggerMode: "manual" } } });
    const shareable = shared.createShareableBetterLayout({ instances: [initial] });
    window.moneyAudit = { registry, shareable, config: initial.config, setObs: null, requests: () => cameraRequests, constraints: () => cameraConstraints };
    function App() { const [config, setConfig] = React.useState(initial.config); const [obs, setObs] = React.useState(false); window.moneyAudit.config = config; window.moneyAudit.setObs = () => setObs(true); const instance = registry.createBetterInstance("camera", { ...initial, config: { ...config, moneyConfig: { ...config.moneyConfig, source: obs ? "stale-money-camera" : "demo", sourceLabel: obs ? "Money Camera" : config.moneyConfig.sourceLabel, triggerMode: obs ? "on_load" : config.moneyConfig.triggerMode, triggerDelay: obs ? 0.05 : config.moneyConfig.triggerDelay } } }); return React.createElement(React.Fragment, null, !obs && React.createElement("aside", { style: { width: 340, height: 820, overflow: "auto", float: "left" } }, React.createElement(BetterWidgetControls, { type: "camera", config, widget: { id: instance.instanceId, instanceId: instance.instanceId }, onChange: setConfig })), React.createElement("main", { id: "stage", "data-runtime": obs ? "obs" : "editor", style: { marginLeft: obs ? 0 : 360, width: 640, height: 360, background: "linear-gradient(135deg,#06111c,#17304a)" } }, registry.renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, mode: obs ? "live" : "mock", runtime: obs ? "obs" : "editor", accessVerified: true }))); }
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
  }, browserHash);

  await page.waitForSelector('.money-explosion-widget[data-ready="true"]', { timeout: 15000 });
  assert.equal(await page.$eval(".money-explosion-widget__renderer canvas", (canvas) => canvas.width), 1280);
  const geometry = await page.$eval("#stage", (stage) => { const widget = stage.querySelector(".money-explosion-widget"); const canvas = widget.querySelector("canvas"); return { widget: widget.getBoundingClientRect().toJSON(), canvas: canvas.getBoundingClientRect().toJSON(), overflow: getComputedStyle(widget).overflow, background: getComputedStyle(widget).backgroundColor }; });
  assert.equal(geometry.widget.width, 640); assert.equal(geometry.widget.height, 360); assert.equal(geometry.canvas.width, 640); assert.equal(geometry.canvas.height, 360); assert.equal(geometry.overflow, "hidden"); assert.equal(geometry.background, "rgba(0, 0, 0, 0)");
  await page.click('.bp-panel-tabs[data-level="primary"] button[data-category="behavior"]');
  await page.waitForSelector(".bp-freeze-actions__test");
  assert.equal(await page.$eval(".bp-freeze-actions__test", (button) => button.textContent.trim()), "Test effect in overlay");
  await page.click(".bp-freeze-actions__test"); await page.waitForFunction(() => document.querySelector(".money-explosion-widget")?.dataset.state === "exploding", { timeout: 2500 });
  assert.ok(Number(await page.$eval(".money-explosion-widget", (widget) => widget.dataset.banknotes)) >= 50);
  await page.screenshot({ path: ".codex-dev/money-explosion-editor.png" });
  await page.waitForFunction(() => document.querySelector(".money-explosion-widget")?.dataset.state === "falling", { timeout: 2500 });
  await page.screenshot({ path: ".codex-dev/money-explosion-rain.png" });
  await page.waitForFunction(() => document.querySelector(".money-explosion-widget")?.dataset.state === "visible", { timeout: 7000 }).catch(async (failure) => {
    console.error("Money reconstruction diagnostics", await page.evaluate(() => ({ state: document.querySelector(".money-explosion-widget")?.dataset.state, error: document.querySelector(".money-explosion-widget__error")?.textContent, feedback: document.querySelector(".bp-freeze-test-feedback")?.textContent })));
    throw failure;
  });
  await page.evaluate(() => window.StreamersCenter.moneyExplosion());
  await page.waitForFunction(() => document.querySelector(".money-explosion-widget")?.dataset.state === "hidden", { timeout: 4000 });
  assert.equal(await page.$eval(".money-explosion-widget", (widget) => Number(widget.dataset.visibleBanknotes)), 0, "The completed transition leaves no visible note sprites");
  await page.evaluate(() => window.StreamersCenter.moneyReconstruction());
  await page.waitForFunction(() => document.querySelector(".money-explosion-widget")?.dataset.state === "visible", { timeout: 4000 });
  const sanitized = await page.evaluate(async () => {
    const module = await import("/src/components/OverlayCenter/widgets/money-explosion/config.ts");
    return module.sanitizeMoneyExplosionConfig({ banknoteCount: 999, minBanknoteSize: 80, maxBanknoteSize: 20, gravity: -4, customFrontTexture: "javascript:bad" });
  });
  assert.equal(sanitized.banknoteCount, 400); assert.equal(sanitized.gravity, 0.1); assert.equal(sanitized.maxBanknoteSize, 80); assert.equal(sanitized.customFrontTexture, "");
  assert.equal(await page.evaluate(() => window.moneyAudit.shareable.instances.find((instance) => instance.widgetType === "camera")?.config.moneyConfig.source), "default");
  assert.equal(await page.evaluate(() => window.moneyAudit.shareable.instances.find((instance) => instance.widgetType === "camera")?.config.moneyConfig.sourceLabel), "");
  await page.evaluate(() => window.moneyAudit.setObs()); await page.waitForSelector('#stage[data-runtime="obs"] .money-explosion-widget[data-ready="true"]', { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector(".money-explosion-widget")?.dataset.state !== "visible", { timeout: 4000 }); await page.screenshot({ path: ".codex-dev/money-explosion-obs.png" });
  assert.equal(await page.$(".money-explosion-widget__error"), null); assert.ok(await page.evaluate(() => window.moneyAudit.constraints().some((value) => value?.video?.deviceId?.exact === "stale-money-camera"))); assert.ok(await page.evaluate(() => window.moneyAudit.constraints().some((value) => value?.video && !value.video.deviceId)));
  assert.deepEqual(errors, []);
  console.log("Money Explosion passed registry, settings, silhouette animation, clean reconstruction, sharing, and OBS-renderer checks.");
} finally { await browser.close(); }
