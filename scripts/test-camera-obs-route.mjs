import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3010";
const style = process.env.CAMERA_STYLE || 'ice_shatter';
const widgetClass = style === 'money_explosion' ? 'money-explosion-widget' : 'freeze-shatter-widget';
const selector = value => value.replaceAll('freeze-shatter-widget', widgetClass);
const publicOverlayId = `bo_${"e".repeat(48)}`;
const browser = await puppeteer.launch({ headless: true });
let relayFrameBody = Buffer.alloc(0);
let relayFrameRequests = 0;
let relayFrameDelayMs = 0;

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" &&
      !text.includes("WebSocket connection") &&
      !text.includes("[vite] failed to connect to websocket")
    ) {
      errors.push(text);
    }
  });
  await page.setViewport({ width: 640, height: 360, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/__camera-obs-route-test") {
      return request.respond({
        contentType: "text/html",
        headers: {
          // Match the production overlay CSP: Pixi must initialize without unsafe-eval.
          "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:* http://localhost:* ws: wss:;",
        },
        body: `<html><head><link rel="stylesheet" href="/src/index.css"></head><body style="margin:0;background:#ff00ff"><div id="root"></div>
          <script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>`,
      });
    }
    if (url.origin === "http://127.0.0.1:17832" && url.pathname.startsWith("/camera/")) {
      const corsHeaders = {
        "Access-Control-Allow-Origin": new URL(base).origin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Private-Network": "true",
        "Cross-Origin-Resource-Policy": "cross-origin",
      };
      if (request.method() === "OPTIONS") return request.respond({ status: 204, headers: corsHeaders });
      if (url.pathname === "/camera/status") {
        return request.respond({ status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, active: true }) });
      }
      if (url.pathname === "/camera/frame") {
        relayFrameRequests += 1;
        if (relayFrameDelayMs) await new Promise(resolve => setTimeout(resolve, relayFrameDelayMs));
        return request.respond({ status: 200, headers: { ...corsHeaders, "Content-Type": "image/jpeg", "Cache-Control": "no-store" }, body: relayFrameBody });
      }
    }
    if (url.origin === new URL(base).origin) return request.continue();
    return request.abort();
  });
  await page.goto(`${base}/__camera-obs-route-test`, { waitUntil: "domcontentloaded" });
  relayFrameBody = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
    const context = canvas.getContext("2d"); context.fillStyle = "#00ff00"; context.fillRect(0, 0, 640, 360);
    context.fillStyle = "#4aa8ff"; context.beginPath(); context.arc(320, 95, 48, 0, Math.PI * 2); context.fill();
    context.fillRect(250, 140, 140, 205);
    return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
  }).then((base64) => Buffer.from(base64, "base64"));
  const { browserHash } = JSON.parse(readFileSync(new URL("../node_modules/.vite/deps/_metadata.json", import.meta.url), "utf8"));

  await page.evaluate(async ({ version, publicOverlayId, style }) => {
    const { CanvasSource, Application } = await import('/node_modules/.vite/deps/pixi__js.js?v=' + version);
    const originalRender = Application.prototype.render;
    window.relayRenders = 0;
    Application.prototype.render = function (...args) {
      window.relayRenders++;
      return originalRender.apply(this, args);
    };
    const originalUpdate = CanvasSource.prototype.update;
    window.relayCanvasUploads = 0;
    CanvasSource.prototype.update = function (...args) {
      window.relayCanvasUploads++;
      return originalUpdate.apply(this, args);
    };
    const requestedConstraints = [];
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: async () => [{ kind: "videoinput", deviceId: "obs-camera", label: "OBS Camera" }],
        getUserMedia: async (constraints) => {
          requestedConstraints.push(constraints);
          throw new DOMException("OBS Browser Source must not request a camera directly", "NotAllowedError");
        },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });

    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { MemoryRouter, Routes, Route } = await import(`/node_modules/.vite/deps/react-router-dom.js?v=${version}`);
    const { supabase } = await import("/src/config/supabaseClient.js");
    const { createOverlayTestDatabase } = await import("/scripts/helpers/overlay-build-test-db.mjs");
    const { createBetterInstance, normalizeBetterLayout } = await import("/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx");
    const { default: BetterObsOverlay } = await import("/src/components/OverlayCenter/editor/BetterObsOverlay.jsx");

    const camera = createBetterInstance("camera", {
      x: 0,
      y: 0,
      width: 640,
      height: 360,
      config: {
        displayStyle: style,
        [style === "money_explosion" ? "moneyConfig" : "iceConfig"]: {
          enabled: true,
          source: "browser-profile-device-id",
          sourceLabel: "OBS Camera",
          triggerMode: "manual",
        },
      },
    });
    const layout = normalizeBetterLayout({ name: "Camera OBS", instances: [camera] });
    const ownerUserId = "camera-owner";
    const { client } = createOverlayTestDatabase({
      better_overlay_publications: [{
        public_overlay_id: publicOverlayId,
        owner_user_id: ownerUserId,
        published_layout: layout,
        published_version: 1,
        updated_at: new Date().toISOString(),
        revoked_at: null,
      }],
      overlay_instances: [{ id: "camera-live", user_id: ownerUserId, is_active: true, created_at: new Date().toISOString() }],
      overlay_widgets: [],
      overlay_themes: [],
    });
    supabase.from = client.from;
    supabase.rpc = async (name, args) => name === "get_overlay_asset_access"
      ? { data: [], error: null }
      : client.rpc(name, args);
    supabase.channel = client.channel;
    supabase.removeChannel = client.removeChannel;
    window.cameraObsAudit = { requestedConstraints, instanceId: camera.instanceId };
    const route = `/obs/overlay/${publicOverlayId}/widget/${camera.instanceId}`;
    ReactDOM.createRoot(document.getElementById("root")).render(
      React.createElement(MemoryRouter, { initialEntries: [route] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: "/obs/overlay/:publicOverlayId/widget/:instanceId", element: React.createElement(BetterObsOverlay) }),
        ),
      ),
    );
  }, { version: browserHash, publicOverlayId, style });

  await page.waitForSelector(selector('.better-obs-overlay--single .freeze-shatter-widget[data-runtime="obs"][data-ready="true"]'), { timeout: 15000 }).catch(async (failure) => {
    console.error("Camera OBS route diagnostics", await page.evaluate(() => ({
      body: document.body.innerText,
      html: document.getElementById("root")?.innerHTML.slice(0, 3000),
      requests: window.cameraObsAudit?.requestedConstraints,
    })));
    console.error(errors);
    throw failure;
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(await page.$(".better-obs-overlay--empty"), null, "The published Camera widget must not render the empty OBS shell");
  assert.equal(await page.$eval(selector(`.freeze-shatter-widget__renderer canvas`), (canvas) => canvas.width), 1280);
  assert.equal(await page.$eval(selector(`.freeze-shatter-widget`), (widget) => widget.dataset.ready), "true", "The Camera renderer initializes under a CSP that blocks unsafe-eval");
  assert.deepEqual(await page.evaluate(() => window.cameraObsAudit.requestedConstraints), [], "OBS uses the local ScreenSplit camera relay instead of prompting CEF for camera access");
  assert.ok(relayFrameRequests > 0, "The OBS widget must fetch camera frames from the local relay");
  assert.equal(await page.$(selector(`.freeze-shatter-widget__error`)), null, "A ready camera does not retain the OBS permission notice");
  assert.ok(await page.evaluate(() => window.relayCanvasUploads) > 0, 'New camera frames must reach the GPU');
  relayFrameDelayMs = 1200;
  await new Promise(resolve => setTimeout(resolve, 150));
  const before = await page.evaluate(() => window.relayCanvasUploads);
  const rendersBefore = await page.evaluate(() => window.relayRenders);
  await new Promise(resolve => setTimeout(resolve, 500));
  const uploadsWhileWaiting = await page.evaluate(() => window.relayCanvasUploads) - before;
  assert.ok(uploadsWhileWaiting <= 1, 'Waiting for a camera frame must not reupload unchanged pixels on every render tick');
  const idleRenders = await page.evaluate(() => window.relayRenders) - rendersBefore;
  assert.ok(idleRenders <= 1, 'An idle relay camera must not continuously redraw while waiting for a new frame');
  console.log(style + ': uploads while waiting=' + uploadsWhileWaiting + ', renders while waiting=' + idleRenders);
  relayFrameDelayMs = 0;
  await new Promise(resolve => setTimeout(resolve, 1400));
  await page.evaluate(style => window.StreamersCenter[style === 'money_explosion' ? 'moneyExplosion' : 'freezeAndShatter'](), style);
  await page.waitForFunction(cls => document.querySelector('.' + cls)?.dataset.state === 'hidden', {timeout:15000}, widgetClass);
  await page.evaluate(style => window.StreamersCenter[style === 'money_explosion' ? 'moneyReconstruction' : 'reconstructWebcam'](), style);
  await page.waitForFunction(cls => document.querySelector('.' + cls)?.dataset.state === 'visible', {timeout:15000}, widgetClass);
  assert.equal(await page.$('.' + widgetClass + '__error'), null, 'Effects and reconstruction still work after idle rendering stops');
  console.log(style + ': steady relay frames upload once, and forward/reverse transitions complete');
  await page.screenshot({ path: ".codex-dev/camera-published-obs-route.png", omitBackground: true });
  assert.deepEqual(errors, []);
  console.log("Published Camera widget rendered through the Better OBS route using a local ScreenSplit camera-relay feed, without getUserMedia in CEF.");
} finally {
  await browser.close();
}
