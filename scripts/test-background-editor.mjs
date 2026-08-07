import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getWidgetAppearanceV2Elements } from "../src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js";
import { STANDARD_BETTER_WIDGET_CONTROLS } from "../src/components/OverlayCenter/editor/standardWidgetPresets.js";

const controlsSource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/editor/BetterWidgetPackages.jsx",
    import.meta.url,
  ),
  "utf8",
);
const rendererSource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx",
    import.meta.url,
  ),
  "utf8",
);
const smokeRendererSource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/widgets/background/ChromaKeySmoke.jsx",
    import.meta.url,
  ),
  "utf8",
);

assert.ok(
  controlsSource.includes('const sourceMode = c.bgMode || "texture";') &&
    controlsSource.includes('sourceMode === "image"') &&
    controlsSource.includes('sourceMode === "video"') &&
    controlsSource.includes("isMediaSource &&"),
  "Background controls only show fields relevant to the selected source",
);
assert.ok(
  controlsSource.includes('const texture = c.textureType || c.texture || "aurora";') &&
    controlsSource.includes("onChange={(textureType) => set({ textureType })}"),
  "Background controls write the canonical textureType key with a legacy fallback",
);
for (const texture of ["gradient", "matte", "metallic"]) {
  assert.ok(
    controlsSource.includes(`"${texture}"`),
    `Background editor offers the ${texture} texture`,
  );
  assert.ok(
    rendererSource.includes(`case "${texture}":`),
    `Shared Background renderer implements the ${texture} texture`,
  );
}
for (const control of [
  "gradientAngle",
  "patternSize",
  "fxParticleColor",
  "fxParticleCount",
  "fxParticleSpeed",
  "fxParticleSize",
  "fxFog",
  "fxFogColor",
  "fxGlimpse",
  "fxGlimpseColor",
  "fxGlimpseSpeed",
  "fxScanlines",
  "fxVignette",
  "fxSmoke",
  "fxSmokeOpacity",
  "fxSmokeTolerance",
  "fxSmokeSoftness",
]) {
  assert.ok(
    controlsSource.includes(control),
    `Background editor exposes ${control}`,
  );
}

const defaults = STANDARD_BETTER_WIDGET_CONTROLS.background;
assert.equal(defaults.textureType, "aurora");
assert.equal(defaults.gradientAngle, 135);
assert.equal(defaults.patternSize, 32);
assert.equal(defaults.fxParticles, "bokeh");
assert.equal(defaults.fxFog, "none");
assert.equal(defaults.fxGlimpse, "none");

const elements = Object.fromEntries(
  getWidgetAppearanceV2Elements("background").map((element) => [
    element.id,
    element,
  ]),
);
for (const control of ["gradientAngle", "patternSize"]) {
  assert.ok(
    elements.texture.controls.includes(control),
    `Background texture schema declares ${control}`,
  );
}
for (const control of [
  "fxParticles",
  "fxParticleColor",
  "fxParticleCount",
  "fxParticleSpeed",
  "fxParticleSize",
  "fxFog",
  "fxFogColor",
  "fxGlimpse",
  "fxGlimpseColor",
  "fxGlimpseSpeed",
  "fxScanlines",
  "fxVignette",
  "fxSmoke",
  "fxSmokeOpacity",
  "fxSmokeTolerance",
  "fxSmokeSoftness",
]) {
  assert.ok(
    elements.effects.controls.includes(control),
    `Background effects schema declares ${control}`,
  );
}

assert.ok(
  rendererSource.includes('"textureType",') &&
    rendererSource.includes("gradientAngle,") &&
    rendererSource.includes("patternSize,") &&
    rendererSource.includes("<BetterBackgroundEffects") &&
    rendererSource.includes("oc-fx-fog-layer") &&
    rendererSource.includes("oc-fx-glimpse--"),
  "Shared Background renderer consumes texture geometry and advanced effects",
);
assert.ok(
  rendererSource.includes('if (value === true) return "bokeh";'),
  "Shared Background renderer preserves legacy boolean particle saves",
);
assert.ok(
  existsSync(new URL("../public/smoke_effect.mp4", import.meta.url)),
  "Bundled smoke effect video exists",
);
assert.ok(
  rendererSource.includes("<ChromaKeySmoke") &&
    smokeRendererSource.includes('src="/smoke_effect.mp4"') &&
    smokeRendererSource.includes("getImageData") &&
    smokeRendererSource.includes("putImageData"),
  "Shared Background renderer chroma-keys the bundled smoke video",
);

console.log("Background editor controls and shared renderer checks passed.");
