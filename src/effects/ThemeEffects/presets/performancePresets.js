export const EFFECT_QUALITY = Object.freeze({
  LOW: "low",
  BALANCED: "balanced",
  ULTRA: "ultra",
});

export const EFFECT_QUALITY_PRESETS = Object.freeze({
  [EFFECT_QUALITY.LOW]: Object.freeze({
    fps: 30,
    resolutionCap: 1,
    maxParticles: 32,
    fogLayers: 1,
    shimmer: false,
    displacement: false,
    bloom: false,
  }),
  [EFFECT_QUALITY.BALANCED]: Object.freeze({
    fps: 60,
    resolutionCap: 1.25,
    maxParticles: 84,
    fogLayers: 1,
    shimmer: true,
    displacement: false,
    bloom: false,
  }),
  [EFFECT_QUALITY.ULTRA]: Object.freeze({
    fps: 60,
    resolutionCap: 1.5,
    maxParticles: 156,
    fogLayers: 2,
    shimmer: true,
    displacement: true,
    bloom: true,
  }),
});

export function normalizeEffectQuality(value) {
  return Object.hasOwn(EFFECT_QUALITY_PRESETS, value)
    ? value
    : EFFECT_QUALITY.BALANCED;
}

export function getEffectQualityPreset(value) {
  return EFFECT_QUALITY_PRESETS[normalizeEffectQuality(value)];
}

export function getEffectResolution(value, devicePixelRatio = 1) {
  const preset = getEffectQualityPreset(value);
  const safeDpr = Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
  return Math.max(0.75, Math.min(safeDpr, preset.resolutionCap));
}
