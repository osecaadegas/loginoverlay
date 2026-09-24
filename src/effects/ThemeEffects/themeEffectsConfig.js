import { normalizeEffectQuality } from "./presets/performancePresets.js";
import {
  getThemeEffectDefinition,
  normalizeEffectsThemeKey,
  supportsThemeEffects,
} from "./themes/themeDefinitions.js";

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export const DEFAULT_THEME_EFFECTS_CONFIG = Object.freeze({
  enabled: true,
  quality: "balanced",
  particleIntensity: 0.5,
  glowIntensity: 0.5,
  animationSpeed: 1,
  ice: Object.freeze({
    snow: 0.55,
    frost: 0.55,
    fog: 0.25,
    glow: 0.5,
    cracks: true,
    icicles: true,
    shimmer: true,
  }),
  gladiator: Object.freeze({
    embers: 0.42,
    smoke: 0.22,
    goldParticles: 0.28,
    metalShimmer: true,
    heatDistortion: false,
  }),
  greek: Object.freeze({
    dust: 0.28,
    fog: 0.16,
    torchFlicker: 0.18,
    lightRays: false,
    marbleShimmer: true,
  }),
});

/**
 * Resolves the saved colour-theme key used by every current widget family.
 */
export function getWidgetEffectsThemeKey(widgetType, config = {}) {
  const value =
    config.colourTheme ||
    (widgetType === "bets" ? config.theme || config.betTheme : "") ||
    (widgetType === "bonus_hunt" ? config.colour : "") ||
    "";
  return normalizeEffectsThemeKey(value);
}

export function normalizeThemeEffectsConfig(themeKey, source = {}) {
  const theme = getThemeEffectDefinition(themeKey);
  if (!theme) return null;
  const raw = source && typeof source === "object" ? source : {};
  const ice = raw.ice && typeof raw.ice === "object" ? raw.ice : {};
  const gladiator = raw.gladiator && typeof raw.gladiator === "object" ? raw.gladiator : {};
  const greek = raw.greek && typeof raw.greek === "object" ? raw.greek : {};

  return {
    enabled: raw.enabled !== false,
    quality: normalizeEffectQuality(raw.quality),
    particleIntensity: clamp(raw.particleIntensity, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.particleIntensity),
    glowIntensity: clamp(raw.glowIntensity, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.glowIntensity),
    animationSpeed: clamp(raw.animationSpeed, 0.25, 2, DEFAULT_THEME_EFFECTS_CONFIG.animationSpeed),
    ice: {
      snow: clamp(ice.snow, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.ice.snow),
      frost: clamp(ice.frost, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.ice.frost),
      fog: clamp(ice.fog, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.ice.fog),
      glow: clamp(ice.glow, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.ice.glow),
      cracks: ice.cracks !== false,
      icicles: ice.icicles !== false,
      shimmer: ice.shimmer !== false,
    },
    gladiator: {
      embers: clamp(gladiator.embers, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.gladiator.embers),
      smoke: clamp(gladiator.smoke, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.gladiator.smoke),
      goldParticles: clamp(gladiator.goldParticles, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.gladiator.goldParticles),
      metalShimmer: gladiator.metalShimmer !== false,
      heatDistortion: gladiator.heatDistortion === true,
    },
    greek: {
      dust: clamp(greek.dust, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.greek.dust),
      fog: clamp(greek.fog, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.greek.fog),
      torchFlicker: clamp(greek.torchFlicker, 0, 1, DEFAULT_THEME_EFFECTS_CONFIG.greek.torchFlicker),
      lightRays: greek.lightRays === true,
      marbleShimmer: greek.marbleShimmer !== false,
    },
  };
}

export function resolveInstanceThemeEffects(instance) {
  if (!instance?.config) return null;
  const themeKey = getWidgetEffectsThemeKey(instance.widgetType, instance.config);
  if (!supportsThemeEffects(themeKey)) return null;
  const effects = normalizeThemeEffectsConfig(themeKey, instance.config.themeEffects);
  if (!effects?.enabled) return null;
  return { themeKey, theme: getThemeEffectDefinition(themeKey), effects };
}

export function patchThemeEffectsConfig(themeKey, source, patch) {
  const normalized = normalizeThemeEffectsConfig(themeKey, source);
  if (!normalized) return source || {};
  return {
    ...normalized,
    ...patch,
    ice: { ...normalized.ice, ...(patch.ice || {}) },
    gladiator: { ...normalized.gladiator, ...(patch.gladiator || {}) },
    greek: { ...normalized.greek, ...(patch.greek || {}) },
  };
}
