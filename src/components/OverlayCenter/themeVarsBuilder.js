/**
 * themeVarsBuilder.js — Builds CSS custom-property object from a theme row
 * plus the central appearance object. Shared by OBS, pop-out preview and the
 * inline editor preview.
 */
import { buildCanvasBackground, normalizeAppearance } from './appearance/appearanceModel';

function hexToRgb(value, fallback = '20, 184, 166') {
  if (typeof value !== 'string') return fallback;
  const hex = value.trim().replace('#', '');
  if (![3, 6].includes(hex.length)) return fallback;
  const full = hex.length === 3 ? hex.split('').map(ch => ch + ch).join('') : hex;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return fallback;
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function shadowFromAppearance(appearance) {
  const fx = appearance.effects;
  if (!fx.shadowEnabled || fx.shadowOpacity <= 0 || fx.shadowBlur <= 0) return 'none';
  return `${fx.shadowX}px ${fx.shadowY}px ${fx.shadowBlur}px ${fx.shadowSpread}px rgba(0, 0, 0, ${fx.shadowOpacity})`;
}

export default function buildThemeVars(theme, appearance) {
  if (!theme && !appearance) return {};
  const a = normalizeAppearance(appearance || {}, { theme });
  const legacyPrimary = theme?.primary_color || a.colors.primary;
  const legacySecondary = theme?.secondary_color || a.colors.secondary;
  const legacyAccent = theme?.accent_color || a.colors.accent;
  const legacyText = theme?.text_color || a.colors.text;
  const vars = {
    '--oc-primary': legacyPrimary || '#9346ff',
    '--oc-secondary': legacySecondary || '#1a1b2e',
    '--oc-accent': legacyAccent || '#00e1ff',
    '--oc-text': legacyText || '#ffffff',
    '--oc-opacity': a.surfaces.opacity ?? theme?.opacity ?? 0.9,
    '--oc-blur': `${a.surfaces.blur ?? theme?.blur_intensity ?? 12}px`,
    '--oc-shadow': a.effects.shadowOpacity ?? theme?.shadow_strength ?? 0.5,
    '--oc-glow': a.effects.glowOpacity ?? theme?.glow_intensity ?? 0.4,
    '--oc-radius': `${a.borders.radius ?? theme?.border_radius ?? 12}px`,
    '--oc-font': a.typography.bodyFont || theme?.font_family || 'Inter',
    '--oc-font-weight': a.typography.bodyWeight || theme?.font_weight || 500,
    '--oc-anim-speed': Math.max(0.2, (a.motion.duration || 350) / 350),
    // Mirror DB colors into --t-* vars so theme-system.css works
    '--t-primary': legacyPrimary || '#9346ff',
    '--t-secondary': legacySecondary || '#1a1b2e',
    '--t-accent': legacyAccent || '#00e1ff',
    '--t-text': legacyText || '#ffffff',
    '--t-font': a.typography.bodyFont || theme?.font_family || 'Inter',
    '--theme-background': a.colors.background,
    '--theme-surface': a.colors.surface,
    '--theme-border': a.colors.border,
    '--theme-text': a.colors.text,
    '--theme-muted': a.colors.muted,
    '--theme-secondary-rgb': hexToRgb(a.colors.secondary),
    '--theme-accent-rgb': hexToRgb(a.colors.accent),
    '--overlay-color-primary': a.colors.primary,
    '--overlay-color-secondary': a.colors.secondary,
    '--overlay-color-accent': a.colors.accent,
    '--overlay-color-success': a.colors.success,
    '--overlay-color-warning': a.colors.warning,
    '--overlay-color-danger': a.colors.danger,
    '--overlay-color-info': a.colors.info,
    '--overlay-color-positive': a.colors.positive,
    '--overlay-color-negative': a.colors.negative,
    '--overlay-bg-main': a.colors.background,
    '--overlay-bg-alt': a.colors.backgroundAlt,
    '--overlay-surface': a.colors.surface,
    '--overlay-surface-elevated': a.colors.elevated,
    '--overlay-card-bg': a.surfaces.cardBg,
    '--overlay-text-primary': a.colors.text,
    '--overlay-text-secondary': a.colors.textSecondary,
    '--overlay-text-muted': a.colors.muted,
    '--overlay-border': a.colors.border,
    '--overlay-divider': a.colors.divider,
    '--overlay-focus-ring': a.colors.focus,
    '--overlay-font-heading': a.typography.headingFont,
    '--overlay-font-body': a.typography.bodyFont,
    '--overlay-font-number': a.typography.numberFont,
    '--overlay-font-button': a.typography.buttonFont,
    '--overlay-font-size': `${a.typography.baseSize}px`,
    '--overlay-line-height': a.typography.lineHeight,
    '--overlay-letter-spacing': `${a.typography.letterSpacing}em`,
    '--overlay-radius': `${a.borders.radius}px`,
    '--overlay-radius-top-left': `${a.borders.linkedCorners ? a.borders.radius : a.borders.topLeft}px`,
    '--overlay-radius-top-right': `${a.borders.linkedCorners ? a.borders.radius : a.borders.topRight}px`,
    '--overlay-radius-bottom-right': `${a.borders.linkedCorners ? a.borders.radius : a.borders.bottomRight}px`,
    '--overlay-radius-bottom-left': `${a.borders.linkedCorners ? a.borders.radius : a.borders.bottomLeft}px`,
    '--overlay-border-width': `${a.borders.enabled ? a.borders.width : 0}px`,
    '--overlay-border-color': a.borders.color,
    '--overlay-spacing': `${a.spacing.gap}px`,
    '--overlay-padding': `${a.spacing.padding}px`,
    '--overlay-widget-scale': a.spacing.widgetScale,
    '--overlay-shadow-card': shadowFromAppearance(a),
    '--overlay-glow-color': a.effects.glowColor,
    '--overlay-glow-blur': `${a.effects.glowBlur}px`,
    '--overlay-glow-opacity': a.effects.glowOpacity,
    '--overlay-backdrop-blur': `${a.effects.backdropBlur}px`,
    '--overlay-motion-duration': `${a.motion.enabled ? a.motion.duration : 0}ms`,
    '--overlay-control-primary-bg': a.controls.primaryBg,
    '--overlay-control-primary-text': a.controls.primaryText,
    '--overlay-control-radius': `${a.controls.radius}px`,
    '--overlay-control-height': `${a.spacing.buttonHeight}px`,
    '--overlay-canvas-background': buildCanvasBackground(a.canvas),
    '--overlay-canvas-opacity': a.canvas.opacity,
    '--overlay-canvas-filter': `brightness(${a.canvas.brightness}%) contrast(${a.canvas.contrast}%) saturate(${a.canvas.saturation}%) blur(${a.canvas.blur}px)`,
  };

  // When metallic theme is active, pipe the stored color into --t-metal-* vars
  if ((theme?.style_preset || a.themeId) === 'metallic' && legacyPrimary) {
    const hex = legacyPrimary;
    vars['--t-metal-hex'] = hex;
    vars['--t-metal-gradient'] = `linear-gradient(135deg, ${hex}cc 0%, ${hex}66 40%, ${hex}99 60%, ${hex}cc 100%)`;
  }

  return vars;
}
