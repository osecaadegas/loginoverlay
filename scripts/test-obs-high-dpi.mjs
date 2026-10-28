import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getObsRenderGeometry } from "../src/components/OverlayCenter/editor/obsRenderGeometry.js";
import { scaleStandaloneWidgetConfig } from "../src/components/OverlayCenter/editor/obsConfigScaling.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const sharpBonus = getObsRenderGeometry({
  viewportWidth: 748,
  viewportHeight: 1894,
  targetWidth: 374,
  targetHeight: 947,
  scaleMode: "fit",
  standalone: true,
});
assert.equal(sharpBonus.renderScale, 2);
assert.equal(sharpBonus.layoutWidth, 748);
assert.equal(sharpBonus.layoutHeight, 1894);
assert.equal(sharpBonus.transform, "none");
assert.equal(sharpBonus.nativeLayout, true);

const clearIceBonus = getObsRenderGeometry({
  viewportWidth: 748,
  viewportHeight: 1894,
  targetWidth: 374,
  targetHeight: 947,
  scaleMode: "fit",
  standalone: false,
});
assert.equal(clearIceBonus.layoutWidth, 374);
assert.equal(clearIceBonus.layoutHeight, 947);
assert.equal(clearIceBonus.renderScale, 2);
assert.equal(clearIceBonus.transform, "scale(2)");

const nativeBonus = getObsRenderGeometry({
  viewportWidth: 748,
  viewportHeight: 1894,
  targetWidth: 374,
  targetHeight: 947,
  scaleMode: "native",
  standalone: true,
});
assert.equal(nativeBonus.renderScale, 1);
assert.equal(nativeBonus.layoutWidth, 374);
assert.equal(nativeBonus.layoutHeight, 947);

const fullOverlay = getObsRenderGeometry({
  viewportWidth: 1280,
  viewportHeight: 720,
  targetWidth: 1920,
  targetHeight: 1080,
  scaleMode: "fit",
  standalone: false,
});
assert.equal(fullOverlay.renderScale, 2 / 3);
assert.equal(fullOverlay.layoutWidth, 1920);
assert.equal(fullOverlay.layoutHeight, 1080);
assert.match(fullOverlay.transform, /^scale\(/);

const overlaySource = fs.readFileSync(
  path.join(root, "src/components/OverlayCenter/editor/BetterObsOverlay.jsx"),
  "utf8",
);
assert.match(overlaySource, /data-render-mode=\{preserveLogicalLayout \? "logical" : "native"\}/);
assert.match(overlaySource, /targetInstance\.config\?\.colourTheme === "clear_ice"/);
assert.match(overlaySource, /standalone: isSingleWidget && !preserveLogicalLayout/);
assert.match(overlaySource, /renderScale: preserveLogicalLayout \? 1 : geometry\.renderScale/);
assert.match(overlaySource, /renderScale: preserveLogicalLayout \? 1 : geometry\.renderScale/);
assert.doesNotMatch(
  overlaySource.slice(
    overlaySource.indexOf("if (isSingleWidget)"),
    overlaySource.indexOf('className="better-obs-overlay better-obs-overlay--full"'),
  ),
  /translate3d|scale\(\$\{obsScale\}\)/,
);

const presetSource = fs.readFileSync(
  path.join(root, "src/effects/ThemeEffects/presets/performancePresets.js"),
  "utf8",
);
assert.match(presetSource, /runtime === "obs-single"/);
assert.match(presetSource, /\? 2/);

const obsCss = fs.readFileSync(
  path.join(root, "src/components/OverlayCenter/editor/BetterObsOverlay.css"),
  "utf8",
);
assert.match(obsCss, /\[data-render-mode="native"\] \.better-hunt-image-stats-panel/);
assert.doesNotMatch(obsCss, /\.better-obs-overlay--single \.better-hunt-image-stats-panel/);

for (const widgetType of ["chat", "giveaway", "navbar", "rtp_stats", "bets"]) {
  const instance = { width: 720, height: 480 };
  const rendered = scaleStandaloneWidgetConfig({
    widgetType,
    instance,
    renderScale: 2,
    config: {
      fontSize: 14,
      __appearanceExplicitSubElements: {
        primary: {
          fontSize: 13,
          padding: 6,
          borderWidth: 2,
          radius: 7,
          opacity: 0.7,
          lineHeight: 1.25,
          states: {
            active: { fontSize: 15, glowSize: 8, opacity: 0.9 },
          },
        },
      },
    },
  });
  const primary = rendered.__appearanceExplicitSubElements.primary;
  assert.equal(rendered.fontSize, 28, `${widgetType}: root font size scales`);
  assert.equal(primary.fontSize, 26, `${widgetType}: scoped font size scales`);
  assert.equal(primary.padding, 12, `${widgetType}: scoped padding scales`);
  assert.equal(primary.borderWidth, 4, `${widgetType}: scoped border scales`);
  assert.equal(primary.radius, 14, `${widgetType}: scoped radius scales`);
  assert.equal(primary.states.active.fontSize, 30, `${widgetType}: state font size scales`);
  assert.equal(primary.states.active.glowSize, 16, `${widgetType}: state glow scales`);
  assert.equal(primary.opacity, 0.7, `${widgetType}: opacity remains unitless`);
  assert.equal(primary.lineHeight, 1.25, `${widgetType}: line height remains unitless`);
}

console.log("OBS high-DPI geometry and renderer checks passed.");
