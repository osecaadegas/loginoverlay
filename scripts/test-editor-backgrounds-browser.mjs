import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import puppeteer from "puppeteer";
import { BACKGROUND_LIBRARY } from "../src/components/OverlayCenter/widgets/background/backgroundLibrary.js";

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3010";
const publicId = `bo_${"c".repeat(48)}`;
const selector = 'img[data-better-element="media"]';
const libraryFiles = BACKGROUND_LIBRARY.map(({ url }) => decodeURIComponent(url.split("/").pop()));
assert.deepEqual(libraryFiles.toSorted(), readdirSync(new URL("../public/backgrounds/", import.meta.url)).filter(file => /\.(png|jpe?g|webp|avif)$/i.test(file)).toSorted());
for (const { url } of BACKGROUND_LIBRARY) {
  assert.ok(existsSync(new URL(`../public${url}`, import.meta.url)), `Bundled asset exists: ${url}`);
}

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setRequestInterception(true);
  page.on("request", async request => {
    const url = new URL(request.url());
    if (url.pathname === "/__editor-background-test") {
      await request.respond({ contentType: "text/html", body: `<html><body style="margin:0"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    } else if (url.origin === new URL(baseUrl).origin) {
      await request.continue();
    } else {
      await request.abort();
    }
  });
  await page.goto(`${baseUrl}/__editor-background-test`, { waitUntil: "networkidle0" });
  const { browserHash } = JSON.parse(readFileSync(new URL("../node_modules/.vite/deps/_metadata.json", import.meta.url), "utf8"));
  const mount = (tables, userId = "background-user", obs = false) => page.evaluate(async ({ tables, userId, obs, publicId, version }) => {
    await import("/src/index.css");
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { MemoryRouter, Routes, Route } = await import(`/node_modules/.vite/deps/react-router-dom.js?v=${version}`);
    const { AuthProvider } = await import("/src/context/AuthContext.jsx");
    const { supabase } = await import("/src/config/supabaseClient.js");
    const { createOverlayTestDatabase } = await import("/scripts/helpers/overlay-build-test-db.mjs");
    const { createBetterInstance, normalizeBetterLayout } = await import("/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx");
    const { default: Editor } = await import("/src/components/OverlayCenter/editor/WidgetEditorPage.jsx");
    const { default: Obs } = await import("/src/components/OverlayCenter/editor/BetterObsOverlay.jsx");
    const layout = normalizeBetterLayout({ name: "Background Build", instances: [createBetterInstance("background", {
      label: "Backdrop", config: { fxSmoke: false, fxParticles: "none", fxScanlines: false, fxVignette: false },
    }), createBetterInstance("bets", { visible: false })] });
    const defaults = {
      better_editor_overlays: [
        { id: "background-a", user_id: userId, public_overlay_id: publicId, draft_layout: layout, draft_version: 1, published_version: 0 },
        { id: "background-b", user_id: userId, public_overlay_id: `bo_${"d".repeat(48)}`, draft_layout: { ...layout, name: "Other Build" }, draft_version: 1, published_version: 0 },
      ],
      overlay_instances: [{ id: "legacy", user_id: userId, is_active: true }],
      overlay_themes: [{ user_id: userId, overlay_id: "legacy" }],
      overlay_widgets: [],
    };
    const { client, state } = createOverlayTestDatabase(tables || defaults);
    supabase.from = client.from;
    supabase.channel = client.channel;
    supabase.removeChannel = client.removeChannel;
    supabase.auth.getSession = async () => ({ data: { session: { user: { id: userId, user_metadata: {} }, access_token: "test-fixture" } } });
    supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
    const root = ReactDOM.createRoot(document.getElementById("root"));
    window.backgroundTest = { state, unmount: () => root.unmount() };
    root.render(obs
      ? React.createElement(MemoryRouter, { initialEntries: [`/obs/${publicId}`] }, React.createElement(Routes, null, React.createElement(Route, { path: "/obs/:publicOverlayId", element: React.createElement(Obs) })))
      : React.createElement(AuthProvider, null, React.createElement(MemoryRouter, null, React.createElement(Editor))));
  }, { tables, userId, obs, publicId, version: browserHash });
  const reload = async (tables, userId, obs) => {
    await page.evaluate(() => window.backgroundTest.unmount());
    await page.reload({ waitUntil: "networkidle0" });
    await mount(tables, userId, obs);
  };
  const clickText = (text, scope = "body") => page.evaluate(({ text, scope }) => {
    const button = [...document.querySelector(scope).querySelectorAll("button")].find(button => button.textContent.trim() === text || button.title === text);
    if (!button) throw new Error(`Missing button: ${text}`);
    button.click();
  }, { text, scope });
  const assertGrid = async visible => {
    await page.waitForFunction(value => document.querySelector(".better-editor-canvas")?.dataset.grid === String(value), {}, visible);
    assert.equal(await page.$eval(".better-editor-canvas", element => getComputedStyle(element, "::before").display !== "none"), visible);
    assert.equal(await page.$$eval(".better-editor-canvas-line", elements => elements.length), visible ? 2 : 0);
  };
  const waitImage = async (url, scope = ".better-editor-canvas") => {
    await page.waitForFunction(({ url, scope, selector }) => {
      const image = document.querySelector(`${scope} ${selector}`);
      return image?.getAttribute("src") === url && image.complete && image.naturalWidth > 0;
    }, {}, { url, scope, selector }).catch(async error => {
      console.error(await page.evaluate(() => ({
        images: [...document.querySelectorAll(".better-editor-canvas img")].map(image => ({ src: image.getAttribute("src"), complete: image.complete, width: image.naturalWidth })),
        config: window.backgroundTest.state.tables.better_editor_overlays[0].draft_layout.instances[0].config,
      })));
      console.error(errors);
      throw error;
    });
  };
  const tables = () => page.evaluate(() => window.backgroundTest.state.tables);

  await mount();
  await page.waitForSelector('[aria-label="Show editor grid"]');
  await assertGrid(true);
  await page.click('[aria-label="Show editor grid"]');
  await assertGrid(false);
  assert.equal(await page.$eval('[aria-label="Snapping"]', button => button.getAttribute("aria-pressed")), "true");
  assert.equal((await tables()).better_editor_overlays[0].draft_version, 1, "Grid changes do not save overlay data");
  await reload(await tables());
  await assertGrid(false);

  await page.click('[aria-label="Choose overlay build"]');
  await clickText("Other Build", ".better-editor-builds__list");
  await assertGrid(true);
  await page.click('[aria-label="Choose overlay build"]');
  await clickText("Background Build", ".better-editor-builds__list");
  await assertGrid(false);

  await page.click('[aria-label="Show editor grid"]');
  await clickText("Preview", ".editor-publish-actions");
  await assertGrid(false);
  await clickText("Edit", ".editor-publish-actions");
  await assertGrid(true);
  await page.click('[aria-label="Show editor grid"]');
  await page.click('.better-editor-widget-row__main:has([title="Backdrop"])');
  await page.type('[aria-label="Search settings"]', "Background source");
  await clickText("image", ".editor-scoped-controls");
  assert.equal(await page.$$eval(".bp-background-library button", buttons => buttons.length), BACKGROUND_LIBRARY.length);
  for (const { label, url } of BACKGROUND_LIBRARY) {
    await page.click(`[aria-label="${label}"]`);
    await waitImage(url);
    assert.equal(await page.$eval(`[aria-label="${label}"]`, button => button.getAttribute("aria-pressed")), "true");
  }
  const chosenUrl = BACKGROUND_LIBRARY.at(-1).url;
  await page.waitForFunction(url => window.backgroundTest.state.tables.better_editor_overlays[0].draft_layout.instances[0].config.imageUrl === url, {}, chosenUrl);
  assert.equal((await tables()).better_editor_overlays[1].draft_layout.instances[0].config.imageUrl, "", "Other builds are unchanged");
  await reload(await tables());
  await waitImage(chosenUrl);
  await assertGrid(false);
  await page.click('.better-editor-widget-row__main:has([title="Backdrop"])');
  await page.type('[aria-label="Search settings"]', "Background source");
  await clickText("Advanced", ".editor-inspector");
  assert.equal(await page.$$eval(".bp-background-library button", buttons => buttons.length), 8, "Library also works in Advanced mode");

  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewport({ width, height: 900 });
    if (width <= 1100) await page.click('[aria-label="Toggle settings"]');
    await page.waitForSelector(".bp-background-library", { visible: true });
    const overflow = await page.$eval(".bp-background-library", element => element.scrollWidth > element.clientWidth + 1);
    assert.equal(overflow, false, `Library fits at ${width}px`);
    if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.TEST_SCREENSHOT_DIR}/editor-background-${width}.png` });
    if (width <= 1100) await page.click('[aria-label="Close settings"]');
    const grid = await page.$eval('[aria-label="Show editor grid"]', element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    });
    assert.ok(grid.left >= 0 && grid.right <= width, `Grid toggle fits at ${width}px`);
  }
  await page.setViewport({ width: 1440, height: 1000 });
  await clickText("Publish to OBS", ".editor-publish-actions");
  await page.waitForFunction(() => window.backgroundTest.state.tables.better_overlay_publications?.length === 1);
  const saved = await tables();
  assert.equal(saved.better_overlay_publications[0].published_layout.instances[0].config.imageUrl, chosenUrl);
  assert.equal(JSON.stringify(saved.better_overlay_publications).includes("showGrid"), false, "Grid preference is never published");
  await reload(saved, "background-user", true);
  await waitImage(chosenUrl, ".better-obs-canvas");
  assert.equal(await page.$$(".better-editor-canvas-line").then(elements => elements.length), 0);
  await reload(undefined, "different-user");
  await assertGrid(true);
  assert.deepEqual(errors, []);
  console.log("Editor grid persistence, account/build isolation, all 8 backgrounds, responsive picker, save/reload and OBS publication passed.");
} finally {
  await browser.close();
}
