// Shared by the palette, DOM materials and the existing Pixi renderer.
export const ORBITAL_TOKENS = Object.freeze({
  background: '#020711', surface: '#071426', raised: '#0B1C34', border: '#1B7DB5',
  accent: '#27C7FF', secondary: '#178CFF', light: '#9DEAFF', text: '#EAF8FF', muted: '#7F9DB3',
  success: '#2FFFA3', warning: '#FFB84D', danger: '#FF4D5E',
});

export const ORBITAL_ENVIRONMENTS = Object.freeze([
  { key: 'off', name: 'Off · transparent' },
  { key: 'earth_orbit', name: 'Earth Orbit' },
  { key: 'deep_space', name: 'Deep Space' },
  { key: 'earth_night', name: 'Earth Night' },
  { key: 'earth_sunrise', name: 'Earth Sunrise' },
]);

export const ORBITAL_DEFAULTS = Object.freeze({
  environment: 'earth_orbit', intensity: 0.7, earthVisibility: 1,
  stars: true, starsIntensity: 0.55, atmosphereGlow: 0.5,
  particles: true, hudGlow: 0.45, backgroundAnimation: true,
});

export function normalizeOrbitalSettings(source = {}) {
  const raw = source && typeof source === 'object' ? source : {};
  return Object.fromEntries(Object.entries(ORBITAL_DEFAULTS).map(([key, fallback]) => [key,
    key === 'environment' ? (ORBITAL_ENVIRONMENTS.some(item => item.key === raw[key]) ? raw[key] : fallback)
      : typeof fallback === 'boolean' ? raw[key] !== false
        : typeof raw[key] === 'number' && Number.isFinite(raw[key]) ? Math.max(0, Math.min(1, raw[key])) : fallback,
  ]));
}

export function orbitalStyleVariables(source, palette = ORBITAL_TOKENS) {
  const settings = normalizeOrbitalSettings(source);
  return {
    ...Object.fromEntries(Object.entries(ORBITAL_TOKENS).map(([key, value]) => [`--orbital-${key}`, palette[key] || value])),
    '--orbital-hud-glow': settings.hudGlow,
  };
}

// A budget for the whole overlay, never a separate 156-particle budget per widget.
export function orbitalParticleBudgets(targets, hardware = {}) {
  const orbital = targets.filter(target => target.theme.family === 'orbital');
  const weak = (hardware.hardwareConcurrency > 0 && hardware.hardwareConcurrency <= 4)
    || (hardware.deviceMemory > 0 && hardware.deviceMemory <= 4);
  const rank = { low: 0, balanced: 1, ultra: 2 };
  const quality = weak ? 'low' : orbital.reduce((best, target) => rank[target.effects.quality] > rank[best] ? target.effects.quality : best, 'low');
  const total = { low: 40, balanced: 90, ultra: 150 }[quality];
  const backgrounds = orbital.filter(target => target.widgetType === 'background');
  const panels = orbital.filter(target => target.widgetType !== 'background');
  return new Map(orbital.map(target => {
    const background = target.widgetType === 'background';
    const share = background ? Math.floor(total * 0.8 / Math.max(1, backgrounds.length))
      : Math.floor(total * (backgrounds.length ? 0.2 : 1) / Math.max(1, panels.length));
    return [target.id, { quality, count: Math.min(share, { low: 40, balanced: 90, ultra: 150 }[target.effects.quality]) }];
  }));
}
