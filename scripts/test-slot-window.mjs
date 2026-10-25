import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

globalThis.window = { location: { origin: "https://streamerscenter.com" } };

const TOKEN = "0123456789abcdef0123456789abcdef0123456789abcdef";
const SOURCE = `http://127.0.0.1:17832/view/panel-2?token=${TOKEN}`;

const server = await createServer({
  logLevel: "silent",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const model = await server.ssrLoadModule(
    "/src/components/OverlayCenter/widgets/slot-window/slotWindowModel.js",
  );
  const registry = await server.ssrLoadModule(
    "/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx",
  );
  const controls = await server.ssrLoadModule(
    "/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx",
  );
  const templates = await server.ssrLoadModule(
    "/src/components/OverlayCenter/editor/sharedOverlayTemplates.js",
  );

  assert.deepEqual(model.fitSlotWindowSource(1920,1080,240,160), {width:240,height:135});
  assert.deepEqual(model.fitSlotWindowSource(1080,1920,240,160), {width:90,height:160});
  assert.equal(model.fitSlotWindowSource(0,1080,240,160), null);
  assert.equal(model.fitSlotWindowSource(1920,1080,0,160), null);
  assert.equal(model.normalizeSlotWindowSourceUrl(SOURCE), SOURCE);
  assert.equal(model.sanitizeSlotWindowConfig({ fps: 60 }).fps, 60);
  assert.equal(model.sanitizeSlotWindowConfig({ fps: 120 }).fps, 60);
  assert.equal(model.normalizeSlotWindowSourceUrl("https://evil.example/view/panel-2?token=" + TOKEN), "");
  assert.equal(model.normalizeSlotWindowSourceUrl("http://127.0.0.1:17899/view/panel-2?token=" + TOKEN), "");

  const configured = model.buildSlotWindowSourceUrl({
    sourceUrl: SOURCE,
    maskShape: "rounded",
    cornerTopLeft: 72,
    cornerTopRight: 0,
    cornerBottomRight: 18,
    cornerBottomLeft: 0,
    feather: 8,
    cropTop: 3,
    cropLeft: 4,
    fps: 24,
  });
  const configuredUrl = new URL(configured);
  assert.equal(configuredUrl.searchParams.get("shape"), "rounded");
  assert.equal(configuredUrl.searchParams.get("radius"), "0");
  assert.equal(configuredUrl.searchParams.get("radiusTopLeft"), "72");
  assert.equal(configuredUrl.searchParams.get("radiusTopRight"), "0");
  assert.equal(configuredUrl.searchParams.get("radiusBottomRight"), "18");
  assert.equal(configuredUrl.searchParams.get("radiusBottomLeft"), "0");
  assert.equal(configuredUrl.searchParams.get("feather"), "8");
  assert.equal(configuredUrl.searchParams.get("cropTop"), "3");
  assert.equal(configuredUrl.searchParams.get("cropLeft"), "4");
  assert.equal(configuredUrl.searchParams.get("fps"), "24");

  const first = registry.createBetterInstance("slot_window", {
    config: { sourceUrl: SOURCE, cropTop: 2 },
  });
  const second = registry.createBetterInstance("slot_window", {
    config: {
      ...first.config,
      sourceUrl: SOURCE.replace("panel-2", "panel-3"),
    },
  });
  assert.ok(first && second, "Slot Window instances can be created and duplicated");
  assert.notEqual(first.instanceId, second.instanceId, "Each Slot Window keeps an independent instance ID");
  assert.notEqual(first.config.sourceUrl, second.config.sourceUrl, "Each Slot Window keeps an independent panel source");

  const definition = registry.getBetterWidgetDefinition("slot_window");
  assert.ok(definition.controlSchema.includes("performance"), "Slot Window registers performance controls");
  const editorMarkup = renderToStaticMarkup(
    createElement(definition.component, { config: first.config, runtime: "editor" }),
  );
  const obsMarkup = renderToStaticMarkup(
    createElement(definition.component, { config: first.config, runtime: "obs" }),
  );
  for (const markup of [editorMarkup, obsMarkup]) {
    assert.ok(markup.includes("slot-window-widget__capture"));
    assert.ok(markup.includes("local-network-access; local-network; loopback-network"));
    assert.ok(markup.includes("127.0.0.1:17832"));
    assert.ok(markup.includes("panel-2"));
  }

  const independentlyRounded = {
    ...first.config,
    maskShape: "rounded",
    cornerTopLeft: 72,
    cornerTopRight: 0,
    cornerBottomRight: 18,
    cornerBottomLeft: 0,
  };
  for (const runtime of ["editor", "obs"]) {
    const markup = renderToStaticMarkup(
      createElement(definition.component, { config: independentlyRounded, runtime }),
    );
    assert.match(markup, /border-radius:72px 0px 18px 0px/);
    assert.match(markup, /clip-path:inset\(0 round 72px 0px 18px 0px\)/);
  }
  const angledMarkup = renderToStaticMarkup(
    createElement(definition.component, {
      config: { ...first.config, maskShape: "angled" },
      runtime: "obs",
    }),
  );
  assert.match(angledMarkup, /clip-path:polygon\(/, "Angled OBS corners are clipped to transparency by the widget shell");

  const emptyEditor = renderToStaticMarkup(
    createElement(definition.component, { config: {}, runtime: "editor" }),
  );
  const emptyObs = renderToStaticMarkup(
    createElement(definition.component, { config: {}, runtime: "obs" }),
  );
  assert.ok(emptyEditor.includes("In ScreenSplit, isolate the slot and press Export."));
  assert.equal(emptyObs, "", "An unconfigured Slot Window stays transparent in OBS");

  const controlMarkup = renderToStaticMarkup(
    createElement(controls.BetterWidgetControls, {
      type: "slot_window",
      config: first.config,
      onChange: () => {},
    }),
  );
  for (const label of ["Source URL", "Shape", "Top-left corner", "Top-right corner", "Bottom-right corner", "Bottom-left corner", "Soft edge"]) {
    assert.ok(controlMarkup.includes(label), `Slot Window exposes ${label}`);
  }
  assert.ok(controlMarkup.includes("Paste &amp; connect"));
  assert.ok(!controlMarkup.includes("Colour Theme"));

  const layout = registry.normalizeBetterLayout({
    name: "Slot windows",
    instances: [first, second],
  });
  const shareable = templates.createShareableBetterLayout(layout);
  for (const slotWindow of shareable.instances.filter((item) => item.widgetType === "slot_window")) {
    assert.equal(slotWindow.config.sourceUrl, "", "Community templates strip local ScreenSplit URLs and tokens");
  }

  const vercel = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
  assert.match(vercel, /local-network-access=\*/);
  assert.match(vercel, /local-network=\*/);
  assert.match(vercel, /loopback-network=\*/);
  assert.match(vercel, /frame-src[^\n]+http:\/\/127\.0\.0\.1:\*/);
  assert.match(vercel, /frame-src[^\n]+http:\/\/localhost:\*/);

  console.log("Slot Window checks passed: URL security, multiple instances, controls, editor/OBS parity, local framing and sharing privacy.");
} finally {
  await server.close();
}
