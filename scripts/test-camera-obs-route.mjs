import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3010";
const publicOverlayId = `bo_${"e".repeat(48)}`;
const browser = await puppeteer.launch({ headless: true });

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
        body: `<html><body style="margin:0"><div id="root"></div>
          <script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>`,
      });
    }
    if (url.origin === new URL(base).origin) return request.continue();
    return request.abort();
  });
  await page.goto(`${base}/__camera-obs-route-test`, { waitUntil: "domcontentloaded" });
  const { browserHash } = JSON.parse(readFileSync(new URL("../node_modules/.vite/deps/_metadata.json", import.meta.url), "utf8"));

  await page.evaluate(async ({ version, publicOverlayId }) => {
    const requestedConstraints = [];
    const cameraStream = (deviceId) => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const context = canvas.getContext("2d");
      context.fillStyle = "#00ff00";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#4aa8ff";
      context.beginPath();
      context.arc(320, 95, 48, 0, Math.PI * 2);
      context.fill();
      context.fillRect(250, 140, 140, 205);
      const stream = canvas.captureStream(30);
      const track = stream.getVideoTracks()[0];
      Object.defineProperty(track, "getSettings", { configurable: true, value: () => ({ deviceId }) });
      return stream;
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: async () => [{ kind: "videoinput", deviceId: "obs-camera", label: "OBS Camera" }],
        getUserMedia: async (constraints) => {
          requestedConstraints.push(constraints);
          if (constraints?.video?.deviceId?.exact === "browser-profile-device-id") {
            throw new DOMException("Unknown browser-profile camera", "OverconstrainedError");
          }
          return cameraStream(constraints?.video?.deviceId?.exact || "obs-default-camera");
        },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });

    await import("/src/index.css");
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
        displayStyle: "ice_shatter",
        iceConfig: {
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
  }, { version: browserHash, publicOverlayId });

  await page.waitForSelector('.better-obs-overlay--single .freeze-shatter-widget[data-runtime="obs"][data-ready="true"]', { timeout: 15000 }).catch(async (failure) => {
    console.error("Camera OBS route diagnostics", await page.evaluate(() => ({
      body: document.body.innerText,
      html: document.getElementById("root")?.innerHTML.slice(0, 3000),
      requests: window.cameraObsAudit?.requestedConstraints,
    })));
    console.error(errors);
    throw failure;
  });
  assert.equal(await page.$(".better-obs-overlay--empty"), null, "The published Camera widget must not render the empty OBS shell");
  assert.equal(await page.$eval(".freeze-shatter-widget__renderer canvas", (canvas) => canvas.width), 1280);
  assert.ok(await page.evaluate(() => window.cameraObsAudit.requestedConstraints.some((item) => item?.video?.deviceId?.exact === "obs-camera")), "The OBS route resolves the saved camera label to the OBS browser profile device");
  assert.equal(await page.$(".freeze-shatter-widget__error"), null, "A ready camera does not retain the OBS permission notice");
  await page.screenshot({ path: ".codex-dev/camera-published-obs-route.png", omitBackground: true });
  assert.deepEqual(errors, []);
  console.log("Published Camera widget rendered through the real Better OBS route with the OBS-local camera source.");
} finally {
  await browser.close();
}
