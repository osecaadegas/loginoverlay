const ROOT = "/theme-effects";

export const THEME_EFFECT_DEFINITIONS = Object.freeze({
  arctic: Object.freeze({
    id: "arctic",
    family: "ice",
    label: "Ice",
    supportsEffects: true,
    colors: Object.freeze({
      primary: 0x73d9ff,
      highlight: 0xb9f3ff,
      shadow: 0x143844,
      particle: 0xe8fbff,
    }),
    textures: Object.freeze({
      panel: `${ROOT}/ice/frozen-glass.webp`,
      edge: `${ROOT}/ice/frost-corners.png`,
      detail: `${ROOT}/ice/ice-cracks.png`,
      decor: `${ROOT}/ice/icicles.png`,
      noise: `${ROOT}/ice/ice-noise.webp`,
      fog: `${ROOT}/ice/mist.png`,
      particle: `${ROOT}/ice/snow-particle.png`,
      corners: `${ROOT}/ice/frost-corners.png`,
      specular: `${ROOT}/ice/specular.png`,
      burst: `${ROOT}/ice/ice-shard.png`,
    }),
  }),
  gladiator: Object.freeze({
    id: "gladiator",
    family: "gladiator",
    label: "Gladiator",
    supportsEffects: true,
    colors: Object.freeze({
      primary: 0xc48a24,
      highlight: 0xf0c75e,
      shadow: 0x5c3518,
      particle: 0xe4a63c,
    }),
    textures: Object.freeze({
      panel: `${ROOT}/gladiator/dark-marble.webp`,
      edge: `${ROOT}/gladiator/scratched-gold.webp`,
      detail: `${ROOT}/gladiator/metal-noise.webp`,
      decor: `${ROOT}/gladiator/laurel.webp`,
      noise: `${ROOT}/gladiator/bronze.webp`,
      fog: `${ROOT}/gladiator/smoke.webp`,
      particle: `${ROOT}/gladiator/ember.png`,
    }),
  }),
  old_rome: Object.freeze({
    id: "old_rome",
    family: "greek",
    label: "Greek / Stoic",
    supportsEffects: true,
    colors: Object.freeze({
      primary: 0xad8645,
      highlight: 0xf1e1bb,
      shadow: 0x5a3520,
      particle: 0xe3c77f,
    }),
    textures: Object.freeze({
      panel: `${ROOT}/greek/aged-marble.webp`,
      edge: `${ROOT}/greek/greek-key.webp`,
      detail: `${ROOT}/greek/marble-cracks.webp`,
      decor: `${ROOT}/greek/laurel.webp`,
      noise: `${ROOT}/greek/stone.webp`,
      fog: `${ROOT}/greek/mist.webp`,
      particle: `${ROOT}/greek/dust.png`,
    }),
  }),
});

const THEME_ALIASES = Object.freeze({
  ice: "arctic",
  frozen: "arctic",
  greek: "old_rome",
  stoic: "old_rome",
  oldrome: "old_rome",
});

export function normalizeEffectsThemeKey(value) {
  const source = String(value || "").replace(/^theme_/, "").toLowerCase();
  return THEME_ALIASES[source] || source;
}

export function getThemeEffectDefinition(value) {
  return THEME_EFFECT_DEFINITIONS[normalizeEffectsThemeKey(value)] || null;
}

export function supportsThemeEffects(value) {
  return getThemeEffectDefinition(value)?.supportsEffects === true;
}
