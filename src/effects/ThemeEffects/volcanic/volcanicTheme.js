import { normalizeEffectQuality } from '../presets/performancePresets.js';

export const VOLCANIC_TOKENS = Object.freeze({
  background: '#090B0E', surface: '#11161B', raised: '#1A2026',
  border: '#F36A0A', accent: '#FF950F', secondary: '#B92508',
  text: '#F5F5F2', muted: '#B4BAC0',
});
export const VOLCANIC_SCENERY = '/theme-effects/volcanic/basalt-perimeter.png';
export const VOLCANIC_VIEWPORT = Object.freeze({ x: 496, y: 100, width: 960, height: 690 });
export function normalizeVolcanicSettings(config = {}) {
  const raw = config.volcanic || {};
  return {
    scenery: raw.scenery !== false,
    referenceFrame: raw.referenceFrame === true,
    idleBackground: raw.idleBackground === true,
    motion: raw.motion === true && config.themeEffects?.enabled !== false,
    widgetLife: raw.widgetLife !== false && config.themeEffects?.enabled !== false,
    surfaceTexture: raw.surfaceTexture !== false,
    quality: normalizeEffectQuality(config.themeEffects?.quality),
  };
}
export function volcanicSurfaceBackground(config, top, bottom = top) {
  // Keep configured gradient/image backgrounds and use their colours underneath the grain.
  if (top.includes('url(')) return top;
  const base = top.includes('gradient(') ? top : `linear-gradient(180deg, ${top}, ${bottom})`;
  if (!normalizeVolcanicSettings(config).surfaceTexture) return base;
  const accent = config.glow || config.accentColor || VOLCANIC_TOKENS.accent;
  return `radial-gradient(ellipse at 12% 0%, color-mix(in srgb, ${accent} 18%, transparent), transparent 65%), radial-gradient(ellipse at 95% 85%, color-mix(in srgb, ${accent} 16%, transparent), transparent 55%), url('/theme-effects/volcanic/basalt-surface.svg'), ${base}`;
}
export function volcanicStyleVariables(palette, config = {}) {
  return {
    '--volcanic-bg': palette.background, '--volcanic-panel': palette.surface,
    '--volcanic-raised': palette.raised, '--volcanic-border': palette.border,
    '--volcanic-accent': palette.accent, '--volcanic-lava': palette.secondary,
    '--volcanic-text': palette.text, '--volcanic-muted': palette.muted,
    '--volcanic-font': config.fontFamily || "'Inter', Arial, sans-serif",
    '--volcanic-radius': '12px', '--volcanic-line': '1px',
  };
}
