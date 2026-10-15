import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";
import { createServer } from "vite";

const port = 3013;
const base = `http://127.0.0.1:${port}`;
const token = "0123456789abcdef0123456789abcdef0123456789abcdef";
const sourceUrl = `http://127.0.0.1:17832/view/panel-2?token=${token}`;
const server = await createServer({
  logLevel: "silent",
  server: { host: "127.0.0.1", port, strictPort: true },
});
await server.listen();
const browser = await puppeteer.launch({ headless: true });

async function readAlpha(page, selector, points) {
  const element = await page.$(selector);
  assert.ok(element, `Missing ${selector}`);
  const base64 = await element.screenshot({ encoding: "base64", omitBackground: true });
  return page.evaluate(async ({ data, points: samplePoints }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return samplePoints.map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]);
  }, { data: base64, points });
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1040, height: 420, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/__slot-window-mask-test") {
      return request.respond({
        contentType: "text/html",
        body: `<html><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>`,
      });
    }
    if (url.hostname === "127.0.0.1" && url.port === "17832") {
      return request.respond({
        contentType: "text/html",
        body: `<html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#f43f5e}</style></html>`,
      });
    }
    return request.continue();
  });
  await page.goto(`${base}/__slot-window-mask-test`, { waitUntil: "domcontentloaded" });
  const { browserHash } = JSON.parse(
    readFileSync(new URL("../node_modules/.vite/deps/_metadata.json", import.meta.url), "utf8"),
  );
  await page.evaluate(async ({ version, sourceUrl: source }) => {
    document.documentElement.style.background = "transparent";
    document.body.style.cssText = "margin:0;background:transparent";
    document.getElementById("root").style.cssText = "display:grid;grid-template-columns:repeat(2,240px);gap:24px;padding:12px";
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { default: SlotWindowWidget } = await import("/src/components/OverlayCenter/widgets/slot-window/SlotWindowWidget.jsx");
    const rounded = {
      sourceUrl: source,
      maskShape: "rounded",
      cornerTopLeft: 80,
      cornerTopRight: 0,
      cornerBottomRight: 0,
      cornerBottomLeft: 0,
    };
    const angled = { sourceUrl: source, maskShape: "angled" };
    const samples = [
      ["rounded-editor", rounded, "editor"],
      ["rounded-obs", rounded, "obs"],
      ["angled-editor", angled, "editor"],
      ["angled-obs", angled, "obs"],
    ];
    ReactDOM.createRoot(document.getElementById("root")).render(
      React.createElement(
        React.Fragment,
        null,
        ...samples.map(([id, config, runtime]) => React.createElement(
          "div",
          { id, key: id, style: { width: 240, height: 160 } },
          React.createElement(SlotWindowWidget, { config, runtime }),
        )),
      ),
    );
  }, { version: browserHash, sourceUrl });
  await page.waitForSelector("#angled-obs iframe");
  await new Promise((resolve) => setTimeout(resolve, 300));

  for (const runtime of ["editor", "obs"]) {
    const roundedAlpha = await readAlpha(page, `#rounded-${runtime}`, [
      [1, 1],
      [238, 1],
      [238, 158],
      [1, 158],
      [120, 80],
    ]);
    assert.equal(roundedAlpha[0], 0, `${runtime} hides the selected rounded corner`);
    assert.ok(roundedAlpha.slice(1).every((alpha) => alpha > 240), `${runtime} leaves the other three corners and content visible`);

    const angledAlpha = await readAlpha(page, `#angled-${runtime}`, [
      [1, 1],
      [238, 1],
      [238, 158],
      [1, 158],
      [120, 80],
    ]);
    assert.ok(angledAlpha.slice(0, 4).every((alpha) => alpha === 0), `${runtime} angled cutouts are transparent`);
    assert.ok(angledAlpha[4] > 240, `${runtime} angled mask keeps the slot visible`);
  }
  await page.screenshot({ path: ".codex-dev/slot-window-corner-masks.png", omitBackground: true });
  console.log("Slot Window corner masks passed independent-radius and transparent-cutout checks in editor and OBS runtimes.");
} finally {
  await browser.close();
  await server.close();
}
