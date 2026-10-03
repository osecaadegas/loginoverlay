import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getObsRenderGeometry } from "../src/components/OverlayCenter/editor/obsRenderGeometry.js";

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
assert.match(overlaySource, /data-render-mode="native"/);
assert.match(overlaySource, /renderScale: geometry\.renderScale/);
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

console.log("OBS high-DPI geometry and renderer checks passed.");
