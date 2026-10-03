import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import puppeteer from "puppeteer";
import {
  BACKGROUND_IMAGE_LIBRARY,
  BACKGROUND_VIDEO_LIBRARY,
} from "../src/components/OverlayCenter/widgets/background/backgroundLibrary.js";

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3010";
const publicId = `bo_${"c".repeat(48)}`;
const selector = 'img[data-better-element="media"]';
const mediaLibrary = [...BACKGROUND_IMAGE_LIBRARY, ...BACKGROUND_VIDEO_LIBRARY];
assert.deepEqual(
  BACKGROUND_VIDEO_LIBRARY.slice(0, 2).map(({ label }) => label),
  ["Old Rome video 1", "Old Rome video 2"],
  "Old Rome videos remain immediately visible at the top of the video picker",
);
const listBundledMedia = (directory, prefix = "") => readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory()
      ? listBundledMedia(new URL(`${encodeURIComponent(entry.name)}/`, directory), relativePath)
      : (/\.(png|jpe?g|gif|webp|avif|mp4|webm)$/i.test(entry.name) ? [relativePath] : []);
  });
const libraryFiles = mediaLibrary.map(({ url }) => decodeURIComponent(url).replace(/^\/backgrounds\//, ""));
assert.deepEqual(libraryFiles.toSorted(), listBundledMedia(new URL("../public/backgrounds/", import.meta.url)).toSorted());
for (const { url } of mediaLibrary) {
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
    const { createBetterInstance, normalizeBetterInstance, normalizeBetterLayout } = await import("/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx");
    const { default: Editor } = await import("/src/components/OverlayCenter/editor/WidgetEditorPage.jsx");
    const { default: Obs } = await import("/src/components/OverlayCenter/editor/BetterObsOverlay.jsx");
    const layout = normalizeBetterLayout({ name: "Background Build", instances: [createBetterInstance("background", {
      label: "Backdrop", config: {
        colourTheme: "old_rome",
        themeEffects: { greek: { architecture: false } },
        fxSmoke: false,
        fxParticles: "none",
        fxScanlines: false,
        fxVignette: false,
      },
    }), createBetterInstance("bets", { visible: false })] });
    const backgroundConfig = layout.instances.find(instance => instance.widgetType === "background")?.config;
    if (backgroundConfig?.mediaOpacity !== 100 || backgroundConfig?.overlayOpacity !== 0) {
      throw new Error(`Background media defaults are not neutral: ${JSON.stringify(backgroundConfig)}`);
    }
    const legacyBackground = normalizeBetterInstance({
      widgetType: "background",
      config: { mediaOpacity: 88, overlayOpacity: 18, overlayColor: "#020611" },
    });
    if (legacyBackground.config.mediaOpacity !== 100 || legacyBackground.config.overlayOpacity !== 0) {
      throw new Error(`Legacy background defaults were not migrated: ${JSON.stringify(legacyBackground.config)}`);
    }
    const customizedBackground = normalizeBetterInstance({
      widgetType: "background",
      config: { mediaOpacity: 76, overlayOpacity: 23, overlayColor: "#020611" },
    });
    if (customizedBackground.config.mediaOpacity !== 76 || customizedBackground.config.overlayOpacity !== 23) {
      throw new Error(`Customized background values were not preserved: ${JSON.stringify(customizedBackground.config)}`);
    }
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
  const waitVideo = async (url, scope = ".better-editor-canvas") => {
    await page.waitForFunction(({ url, scope }) => {
      const video = document.querySelector(`${scope} video[data-better-element="media"]`);
      return video?.getAttribute("src") === url && video.readyState >= 1 && video.videoWidth > 0;
    }, {}, { url, scope }).catch(async error => {
      console.error(await page.evaluate(() => ({
        videos: [...document.querySelectorAll(".better-editor-canvas video")].map(video => ({
          src: video.getAttribute("src"),
          readyState: video.readyState,
          width: video.videoWidth,
          error: video.error?.message || null,
        })),
        config: window.backgroundTest.state.tables.better_editor_overlays[0].draft_layout.instances[0].config,
      })));
      console.error(errors);
      throw error;
    });
  };
  const assertGreekMediaReplacesEnvironment = async (sourceMode, scope = ".better-editor-canvas") => {
    const state = await page.$eval(
      `${scope} .better-widget-colour-scope[data-colour-theme="old_rome"] .oc-bg-widget`,
      element => ({
        source: element.dataset.backgroundSource,
        environmentLayer: getComputedStyle(element, "::before").backgroundImage,
        architecture: element.closest(".better-widget-colour-scope")?.dataset.greekArchitecture,
        architectureDisplay: getComputedStyle(element, "::after").display,
      }),
    );
    assert.equal(state.source, sourceMode);
    assert.equal(state.architecture, "off");
    assert.equal(state.architectureDisplay, "none");
    assert.equal(
      state.environmentLayer.includes("temple-environment"),
      false,
      `Selected ${sourceMode} replaces the fixed Old Rome environment artwork`,
    );
  };
  const assertExternalSource = async (mode, scope = ".better-editor-canvas") => {
    await page.waitForSelector(`${scope} [data-background-source="${mode}"]`);
    const state = await page.$eval(`${scope} .oc-bg-widget`, element => ({
      background: getComputedStyle(element).backgroundColor,
      texture: Boolean(element.querySelector('[data-better-element="texture"]')),
      tint: Boolean(element.querySelector('[data-better-element="tint"]')),
      media: Boolean(element.querySelector('[data-better-element="media"]')),
      effects: Boolean(element.querySelector('[data-better-element="effects"]')),
      before: getComputedStyle(element, "::before").content,
    }));
    assert.equal(state.background, mode === "chroma" ? "rgb(0, 255, 0)" : "rgba(0, 0, 0, 0)");
    assert.equal(state.texture, false);
    assert.equal(state.tint, false);
    assert.equal(state.media, false);
    assert.equal(state.effects, true);
    assert.ok(["none", "normal"].includes(state.before), "Opaque theme scenery is removed");
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
  await page.select('[data-control-section="Background source"] select', "image");
  assert.equal(await page.$$eval(".bp-background-library button", buttons => buttons.length), BACKGROUND_IMAGE_LIBRARY.length);
  for (const { label, url } of BACKGROUND_IMAGE_LIBRARY) {
    await page.click(`[aria-label="${label}"]`);
    await waitImage(url);
    await assertGreekMediaReplacesEnvironment("image");
    assert.equal(await page.$eval(`[aria-label="${label}"]`, button => button.getAttribute("aria-pressed")), "true");
  }
  const chosenUrl = BACKGROUND_IMAGE_LIBRARY.at(-1).url;
  await page.waitForFunction(url => window.backgroundTest.state.tables.better_editor_overlays[0].draft_layout.instances[0].config.imageUrl === url, {}, chosenUrl);
  assert.equal((await tables()).better_editor_overlays[1].draft_layout.instances[0].config.imageUrl, "", "Other builds are unchanged");
  await reload(await tables());
  await waitImage(chosenUrl);
  await assertGrid(false);
  await page.click('.better-editor-widget-row__main:has([title="Backdrop"])');
  await page.type('[aria-label="Search settings"]', "Background source");
  await clickText("Advanced", ".editor-inspector");
  assert.equal(await page.$$eval(".bp-background-library button", buttons => buttons.length), BACKGROUND_IMAGE_LIBRARY.length, "Library also works in Advanced mode");

  await page.select('[data-control-section="Background source"] select', "video");
  assert.equal(await page.$$eval('.bp-background-library[data-media-type="video"] button', buttons => buttons.length), BACKGROUND_VIDEO_LIBRARY.length);
  for (const { label, url } of BACKGROUND_VIDEO_LIBRARY) {
    await page.click(`[aria-label="${label}"]`);
    await waitVideo(url);
    await assertGreekMediaReplacesEnvironment("video");
    assert.equal(await page.$eval(`[aria-label="${label}"]`, button => button.getAttribute("aria-pressed")), "true");
  }
  const chosenVideoUrl = BACKGROUND_VIDEO_LIBRARY.at(-1).url;
  await page.waitForFunction(url => window.backgroundTest.state.tables.better_editor_overlays[0].draft_layout.instances[0].config.videoUrl === url, {}, chosenVideoUrl);
  await reload(await tables());
  await waitVideo(chosenVideoUrl);
  await page.click('.better-editor-widget-row__main:has([title="Backdrop"])');
  await page.type('[aria-label="Search settings"]', "Background source");

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
  assert.equal(saved.better_overlay_publications[0].published_layout.instances[0].config.videoUrl, chosenVideoUrl);
  assert.equal(saved.better_overlay_publications[0].published_layout.instances[0].config.bgMode, "video");
  assert.equal(JSON.stringify(saved.better_overlay_publications).includes("showGrid"), false, "Grid preference is never published");
  await reload(saved, "background-user", true);
  await waitVideo(chosenVideoUrl, ".better-obs-canvas");
  assert.equal(await page.$$(".better-editor-canvas-line").then(elements => elements.length), 0);
  // Exercise both external-background modes through the real editor save/publish path.
  let externalSaved = saved;
  for (const mode of ["transparent", "chroma"]) {
    await reload(externalSaved);
    await page.click('.better-editor-widget-row__main:has([title="Backdrop"])');
    await clickText("Simple", ".editor-inspector");
    assert.equal(await page.$('.editor-inspector .editor-geometry'), null, "Fixed background has no disabled frame controls");
    await page.type('[aria-label="Search settings"]', "Background source");
    await page.select('[data-control-section="Background source"] select', mode);
    await assertExternalSource(mode);
    await page.click('[aria-label="Clear settings search"]');
    await page.type('[aria-label="Search settings"]', "Colour Theme");
    const themeKeys = await page.$$eval('[data-colour-theme-key]', buttons => buttons.map(button => button.dataset.colourThemeKey));
    assert.equal(themeKeys.length, 14);
    for (const themeKey of themeKeys) {
      await page.click(`[data-colour-theme-key="${themeKey}"]`);
      await assertExternalSource(mode);
    }
    await page.click('[aria-label="Clear settings search"]');
    await page.type('[aria-label="Search settings"]', "Background source");
    if (mode === "chroma") {
      await page.waitForSelector(".bp-download", { visible: true });
      const png = await page.evaluate(async () => {
        const original = HTMLAnchorElement.prototype.click;
        let downloaded;
        HTMLAnchorElement.prototype.click = function () { downloaded = { name: this.download, url: this.href }; };
        try {
          [...document.querySelectorAll('button')].find(button => button.textContent.includes('Download key image')).click();
        } finally { HTMLAnchorElement.prototype.click = original; }
        const image = new Image(); image.src = downloaded.url; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        return { width: image.width, height: image.height, pixel: [...ctx.getImageData(0, 0, 1, 1).data], name: downloaded.name };
      });
      assert.equal(png.width, 1920); assert.equal(png.height, 1080);
      assert.deepEqual(png.pixel, [0, 255, 0, 255]);
      assert.ok(png.name.endsWith('.png'));
    }
    await page.waitForFunction(mode => window.backgroundTest.state.tables.better_editor_overlays[0].draft_layout.instances[0].config.bgMode === mode, {}, mode);
    if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.TEST_SCREENSHOT_DIR}/editor-background-${mode}.png` });
    externalSaved = await tables();
    assert.equal(externalSaved.better_editor_overlays[0].draft_layout.instances[0].config.videoUrl, chosenVideoUrl, "Switching source preserves media settings");
    await reload(externalSaved);
    await assertExternalSource(mode);
    await clickText("Publish to OBS", ".editor-publish-actions");
    await page.waitForFunction(mode => window.backgroundTest.state.tables.better_overlay_publications[0].published_layout.instances[0].config.bgMode === mode, {}, mode);
    externalSaved = await tables();
    await reload(externalSaved, "background-user", true);
    await assertExternalSource(mode, ".better-obs-canvas");
  }
  await reload(undefined, "different-user");
  await assertGrid(true);
  assert.deepEqual(errors, []);
  console.log(`Editor grid persistence, account/build isolation, all ${BACKGROUND_IMAGE_LIBRARY.length} image and ${BACKGROUND_VIDEO_LIBRARY.length} video backgrounds, responsive picker, save/reload, both external background modes across all 14 themes, key PNG and OBS publication passed.`);
} finally {
  await browser.close();
}
