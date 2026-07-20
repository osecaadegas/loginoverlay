import { getWidgetDef } from '../widgets/widgetRegistry';
import {
  COMMON_APPEARANCE_PROPERTY_DEFINITIONS,
  RESET_VALUE,
  getByPath,
  getWidgetSubElementDefinitions,
  normalizeAppearanceControlValue,
} from './appearanceModel';
import {
  getWidgetAppearanceV2Elements,
  isWidgetAppearanceV2Enabled,
} from './v2/widgetAppearanceRegistry';
import { CUSTOM_FONT_OPTIONS } from './customFontOptions';

export const EDITOR_SCHEMA_VERSION = 1;

export { RESET_VALUE };

export const WIDGET_CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'bonus_hunt', label: 'Bonus Hunt' },
  { id: 'slot_requests', label: 'Slot Requests' },
  { id: 'giveaways', label: 'Giveaways' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'chat', label: 'Chat' },
  { id: 'games', label: 'Games' },
  { id: 'goals', label: 'Goals' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'other', label: 'Other' },
];

export const FONT_OPTIONS = [
  { value: "'Inter', 'Segoe UI', sans-serif", label: 'Inter' },
  { value: "'Rajdhani', 'Segoe UI', sans-serif", label: 'Rajdhani' },
  { value: "'Montserrat', 'Segoe UI', sans-serif", label: 'Montserrat' },
  { value: "'Poppins', 'Segoe UI', sans-serif", label: 'Poppins' },
  { value: "'Space Grotesk', 'Segoe UI', sans-serif", label: 'Space Grotesk' },
  { value: "'Orbitron', 'Segoe UI', sans-serif", label: 'Orbitron' },
  { value: "'Oxanium', 'Segoe UI', sans-serif", label: 'Oxanium' },
  { value: "'Bebas Neue', 'Arial Narrow', sans-serif", label: 'Bebas Neue' },
  { value: "'Oswald', 'Arial Narrow', sans-serif", label: 'Oswald' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'system-ui', label: 'System' },
  ...CUSTOM_FONT_OPTIONS,
];

export const EDITOR_MODE_CAPABILITIES = Object.freeze({
  simple: Object.freeze({
    showLayers: false,
    showElementControls: false,
    showTechnicalValues: false,
    previewMode: 'fit-widget',
  }),
  advanced: Object.freeze({
    showLayers: true,
    showElementControls: true,
    showTechnicalValues: true,
    previewMode: 'focus-widget',
  }),
});

export const SIMPLE_MATERIAL_PRESETS = [
  {
    id: 'original',
    name: 'Original',
    tip: 'Recommended production design.',
    finish: 'stream-ready baseline',
    protected: true,
  },
  {
    id: 'matte',
    name: 'Matte',
    tip: 'Clean, flat, and easy to read.',
    finish: 'soft solid background',
  },
  {
    id: 'metallic',
    name: 'Metallic',
    tip: 'Premium shine with controlled highlights.',
    finish: 'reflective gradient',
  },
  {
    id: 'gradient',
    name: 'Gradient',
    tip: 'Two balanced colours with readable content.',
    finish: 'smooth colour blend',
  },
  {
    id: 'glass',
    name: 'Glass',
    tip: 'Transparent panels for OBS scenes.',
    finish: 'blurred transparent surface',
  },
  {
    id: 'neon',
    name: 'Neon',
    tip: 'Bright glow on a dark surface.',
    finish: 'controlled glow',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    tip: 'Small, quiet, and unobtrusive.',
    finish: 'simple outline',
  },
  {
    id: 'soft_shadow',
    name: 'Soft Shadow',
    tip: 'Readable cards with gentle depth.',
    finish: 'elevated card',
  },
  {
    id: 'transparent_obs',
    name: 'Transparent OBS',
    tip: 'Only the widget content stays visible.',
    finish: 'transparent background',
  },
];

export const SIMPLE_COLOR_PALETTE = [
  { id: 'cyan', label: 'Cyan', value: '#14d8d8' },
  { id: 'blue', label: 'Blue', value: '#3b82f6' },
  { id: 'purple', label: 'Purple', value: '#8b5cf6' },
  { id: 'pink', label: 'Pink', value: '#ec4899' },
  { id: 'red', label: 'Red', value: '#ef4444' },
  { id: 'orange', label: 'Orange', value: '#f97316' },
  { id: 'gold', label: 'Gold', value: '#f5b301' },
  { id: 'green', label: 'Green', value: '#22c55e' },
  { id: 'white', label: 'White', value: '#f8fafc' },
  { id: 'dark', label: 'Dark grey', value: '#334155' },
];

export const SIMPLE_SHAPES = [
  { id: 'square', label: 'Square', radius: 0 },
  { id: 'slightly_rounded', label: 'Slightly rounded', radius: 8 },
  { id: 'rounded', label: 'Rounded', radius: 16 },
  { id: 'pill', label: 'Pill', radius: 80 },
];

export const SIMPLE_DENSITIES = [
  { id: 'compact', label: 'Compact', padding: 9, gap: 7, buttonHeight: 34 },
  { id: 'standard', label: 'Standard', padding: 14, gap: 10, buttonHeight: 44 },
  { id: 'large', label: 'Large', padding: 20, gap: 15, buttonHeight: 54 },
];

export const SIMPLE_TEXT_SIZES = [
  { id: 'small', label: 'Small', baseSize: 12, headingScale: 1.12 },
  { id: 'standard', label: 'Standard', baseSize: 14, headingScale: 1.22 },
  { id: 'large', label: 'Large', baseSize: 17, headingScale: 1.3 },
];

export const SIMPLE_STRENGTHS = [
  { id: 'off', label: 'Off' },
  { id: 'subtle', label: 'Subtle' },
  { id: 'soft', label: 'Soft' },
  { id: 'medium', label: 'Medium' },
  { id: 'strong', label: 'Strong' },
];

export const SIMPLE_MOTION_SPEEDS = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
];

export const SIMPLE_IMAGE_SIZES = [
  { id: 'hidden', label: 'Hidden' },
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

export const SIMPLE_IMAGE_SHAPES = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'circle', label: 'Circle' },
];

export const DEFAULT_SIMPLE_SETTINGS = Object.freeze({
  material: 'matte',
  primaryColor: '#14d8d8',
  accentColor: '#f5b301',
  useSecondColor: false,
  shape: 'rounded',
  density: 'standard',
  scale: 1,
  fontFamily: FONT_OPTIONS[0].value,
  textSize: 'standard',
  boldText: false,
  carouselSpeed: 'normal',
  carouselDirection: 'right',
  carouselAutoplay: true,
  carouselPauseOnHover: true,
  animationEnabled: true,
  animationSpeed: 'normal',
  animationIntensity: 'normal',
  shadowStrength: 'medium',
  glowStrength: 'off',
  imageVisibility: 'show',
  imageSize: 'medium',
  imageShape: 'rounded',
  imageFit: 'cover',
  barHeight: null,
  maxWidth: null,
  musicDisplayStyle: 'text',
});

function clamp(number, min, max) {
  const value = Number(number);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeHexColor(value, fallback = '#14d8d8') {
  const raw = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  return fallback;
}

export function hexToRgb(value, fallback = '#14d8d8') {
  const hex = normalizeHexColor(value, fallback).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const toHex = channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mixHex(first, second, weight = 0.5) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const amount = clamp(weight, 0, 1);
  return rgbToHex({
    r: a.r * (1 - amount) + b.r * amount,
    g: a.g * (1 - amount) + b.g * amount,
    b: a.b * (1 - amount) + b.b * amount,
  });
}

export function toRgba(value, alpha = 1) {
  const { r, g, b } = hexToRgb(value);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(2)})`;
}

function relativeLuminance(value) {
  const { r, g, b } = hexToRgb(value);
  const transform = channel => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function getContrastRatio(first, second) {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
}

export function getReadableTextColor(background, light = '#f8fafc', dark = '#07111f') {
  return getContrastRatio(background, light) >= getContrastRatio(background, dark) ? light : dark;
}

function deriveAccent(primary, accent, useSecondColor) {
  if (useSecondColor) return normalizeHexColor(accent, '#f5b301');
  const primaryContrast = getContrastRatio(primary, '#ffffff');
  if (primaryContrast < 1.6) return '#14d8d8';
  return mixHex(primary, '#ffffff', 0.38);
}

export function normalizeSimpleSettings(settings = {}) {
  const materialIds = new Set(SIMPLE_MATERIAL_PRESETS.map(item => item.id));
  const shapeIds = new Set(SIMPLE_SHAPES.map(item => item.id));
  const densityIds = new Set(SIMPLE_DENSITIES.map(item => item.id));
  const textSizeIds = new Set(SIMPLE_TEXT_SIZES.map(item => item.id));
  const strengthIds = new Set(SIMPLE_STRENGTHS.map(item => item.id));
  const motionSpeedIds = new Set(SIMPLE_MOTION_SPEEDS.map(item => item.id));
  const imageSizeIds = new Set(SIMPLE_IMAGE_SIZES.map(item => item.id));
  const imageShapeIds = new Set(SIMPLE_IMAGE_SHAPES.map(item => item.id));
  const fontValues = new Set(FONT_OPTIONS.map(item => item.value));
  const next = { ...DEFAULT_SIMPLE_SETTINGS, ...(settings || {}) };
  return {
    ...next,
    material: materialIds.has(next.material) ? next.material : DEFAULT_SIMPLE_SETTINGS.material,
    primaryColor: normalizeHexColor(next.primaryColor, DEFAULT_SIMPLE_SETTINGS.primaryColor),
    accentColor: normalizeHexColor(next.accentColor, DEFAULT_SIMPLE_SETTINGS.accentColor),
    useSecondColor: !!next.useSecondColor,
    shape: shapeIds.has(next.shape) ? next.shape : DEFAULT_SIMPLE_SETTINGS.shape,
    density: densityIds.has(next.density) ? next.density : DEFAULT_SIMPLE_SETTINGS.density,
    scale: clamp(next.scale, 0.75, 1.5),
    fontFamily: fontValues.has(next.fontFamily) ? next.fontFamily : DEFAULT_SIMPLE_SETTINGS.fontFamily,
    textSize: textSizeIds.has(next.textSize) ? next.textSize : DEFAULT_SIMPLE_SETTINGS.textSize,
    boldText: !!next.boldText,
    carouselSpeed: motionSpeedIds.has(next.carouselSpeed) ? next.carouselSpeed : DEFAULT_SIMPLE_SETTINGS.carouselSpeed,
    carouselDirection: ['left', 'right'].includes(next.carouselDirection) ? next.carouselDirection : DEFAULT_SIMPLE_SETTINGS.carouselDirection,
    carouselAutoplay: next.carouselAutoplay !== false,
    carouselPauseOnHover: next.carouselPauseOnHover !== false,
    animationEnabled: next.animationEnabled !== false,
    animationSpeed: motionSpeedIds.has(next.animationSpeed) ? next.animationSpeed : DEFAULT_SIMPLE_SETTINGS.animationSpeed,
    animationIntensity: ['subtle', 'normal', 'strong'].includes(next.animationIntensity) ? next.animationIntensity : DEFAULT_SIMPLE_SETTINGS.animationIntensity,
    shadowStrength: strengthIds.has(next.shadowStrength) ? next.shadowStrength : DEFAULT_SIMPLE_SETTINGS.shadowStrength,
    glowStrength: strengthIds.has(next.glowStrength) ? next.glowStrength : DEFAULT_SIMPLE_SETTINGS.glowStrength,
    imageVisibility: ['show', 'hidden'].includes(next.imageVisibility) ? next.imageVisibility : DEFAULT_SIMPLE_SETTINGS.imageVisibility,
    imageSize: imageSizeIds.has(next.imageSize) ? next.imageSize : DEFAULT_SIMPLE_SETTINGS.imageSize,
    imageShape: imageShapeIds.has(next.imageShape) ? next.imageShape : DEFAULT_SIMPLE_SETTINGS.imageShape,
    imageFit: ['cover', 'contain'].includes(next.imageFit) ? next.imageFit : DEFAULT_SIMPLE_SETTINGS.imageFit,
    barHeight: next.barHeight != null && next.barHeight !== '' && Number.isFinite(Number(next.barHeight)) ? clamp(Number(next.barHeight), 32, 220) : null,
    maxWidth: next.maxWidth != null && next.maxWidth !== '' && Number.isFinite(Number(next.maxWidth)) ? clamp(Number(next.maxWidth), 240, 1920) : null,
    musicDisplayStyle: ['text', 'pill', 'marquee', 'albumart', 'equalizer', 'vinyl', 'minimal', 'wave'].includes(next.musicDisplayStyle)
      ? next.musicDisplayStyle
      : DEFAULT_SIMPLE_SETTINGS.musicDisplayStyle,
  };
}

function buildSimpleBase(settings) {
  const primary = normalizeHexColor(settings.primaryColor);
  const accent = deriveAccent(primary, settings.accentColor, settings.useSecondColor);
  const shape = SIMPLE_SHAPES.find(item => item.id === settings.shape) || SIMPLE_SHAPES[2];
  const density = SIMPLE_DENSITIES.find(item => item.id === settings.density) || SIMPLE_DENSITIES[1];
  const textSize = SIMPLE_TEXT_SIZES.find(item => item.id === settings.textSize) || SIMPLE_TEXT_SIZES[1];
  const dark = mixHex(primary, '#020617', 0.82);
  const darker = mixHex(primary, '#020617', 0.9);
  const soft = mixHex(primary, '#0f172a', 0.62);
  const light = mixHex(primary, '#ffffff', 0.72);
  const readable = getReadableTextColor(dark);
  const muted = readable === '#f8fafc' ? '#cbd5e1' : '#334155';
  return { primary, accent, shape, density, textSize, dark, darker, soft, light, readable, muted };
}

export function generateMatteTheme(settings) {
  const base = buildSimpleBase(settings);
  return {
    colors: {
      primary: base.primary,
      secondary: base.dark,
      accent: base.accent,
      background: base.darker,
      backgroundAlt: base.dark,
      surface: toRgba(base.dark, 0.92),
      elevated: toRgba(base.soft, 0.8),
      text: base.readable,
      textSecondary: base.muted,
      muted: base.muted,
      border: toRgba(base.light, 0.3),
      divider: toRgba(base.light, 0.18),
      buttonBg: base.primary,
      buttonText: getReadableTextColor(base.primary),
      positive: '#86efac',
      negative: '#fca5a5',
      highlight: base.accent,
      focus: base.light,
    },
    surfaces: {
      preset: 'matte',
      containerBg: toRgba(base.dark, 0.92),
      cardBg: toRgba(base.soft, 0.58),
      headerBg: toRgba(base.primary, 0.16),
      footerBg: toRgba(base.darker, 0.7),
      opacity: 0.94,
      glass: false,
      blur: 0,
    },
    borders: { enabled: true, width: 1, color: toRgba(base.light, 0.32), style: 'solid' },
    effects: { shadowEnabled: true, shadowColor: '#000000', shadowBlur: 20, shadowOpacity: 0.22, glowEnabled: false, backdropBlur: 0 },
  };
}

export function generateMetallicTheme(settings) {
  const base = buildSimpleBase(settings);
  const mid = mixHex(base.primary, '#111827', 0.52);
  return {
    colors: {
      primary: base.primary,
      secondary: mid,
      accent: base.accent,
      background: base.darker,
      backgroundAlt: base.dark,
      surface: toRgba(mid, 0.94),
      elevated: toRgba(base.light, 0.16),
      text: getReadableTextColor(mid),
      textSecondary: '#e5edf6',
      muted: '#cbd5e1',
      border: toRgba(base.light, 0.52),
      divider: toRgba(base.light, 0.22),
      buttonBg: base.primary,
      buttonText: getReadableTextColor(base.primary),
      positive: '#bbf7d0',
      negative: '#fecaca',
      highlight: base.light,
      focus: base.accent,
    },
    surfaces: {
      preset: 'metallic',
      containerBg: `linear-gradient(135deg, ${toRgba(base.light, 0.25)} 0%, ${toRgba(mid, 0.95)} 28%, ${toRgba(base.darker, 0.94)} 52%, ${toRgba(base.primary, 0.28)} 100%)`,
      cardBg: `linear-gradient(135deg, ${toRgba(base.light, 0.18)}, ${toRgba(base.dark, 0.72)})`,
      headerBg: toRgba(base.light, 0.22),
      footerBg: toRgba(base.darker, 0.72),
      opacity: 0.96,
      glass: false,
      blur: 2,
    },
    borders: { enabled: true, width: 1, color: toRgba(base.light, 0.56), style: 'solid' },
    effects: { shadowEnabled: true, shadowColor: '#000000', shadowBlur: 34, shadowOpacity: 0.34, glowEnabled: true, glowColor: base.primary, glowBlur: 14, glowOpacity: 0.12, backdropBlur: 0 },
  };
}

export function generateGradientTheme(settings) {
  const base = buildSimpleBase(settings);
  const second = settings.useSecondColor ? base.accent : mixHex(base.primary, '#8b5cf6', 0.45);
  const surfaceDark = mixHex(base.primary, '#020617', 0.74);
  return {
    colors: {
      primary: base.primary,
      secondary: second,
      accent: second,
      background: base.darker,
      backgroundAlt: surfaceDark,
      surface: toRgba(surfaceDark, 0.92),
      elevated: toRgba(second, 0.16),
      text: getReadableTextColor(surfaceDark),
      textSecondary: '#dbeafe',
      muted: '#bfdbfe',
      border: toRgba(base.light, 0.38),
      divider: toRgba(second, 0.22),
      buttonBg: second,
      buttonText: getReadableTextColor(second),
      positive: '#86efac',
      negative: '#fda4af',
      highlight: base.light,
      focus: second,
    },
    surfaces: {
      preset: 'gradient',
      containerBg: `linear-gradient(135deg, ${toRgba(base.primary, 0.9)}, ${toRgba(second, 0.78)} 52%, ${toRgba('#020617', 0.92)})`,
      cardBg: toRgba('#020617', 0.44),
      headerBg: toRgba(second, 0.2),
      footerBg: toRgba('#020617', 0.62),
      opacity: 0.94,
      glass: false,
      blur: 4,
    },
    borders: { enabled: true, width: 1, color: toRgba(base.light, 0.34), style: 'solid' },
    effects: { shadowEnabled: true, shadowColor: '#000000', shadowBlur: 26, shadowOpacity: 0.28, glowEnabled: true, glowColor: second, glowBlur: 18, glowOpacity: 0.16, backdropBlur: 0 },
  };
}

export function generateGlassTheme(settings) {
  const base = buildSimpleBase(settings);
  return {
    colors: {
      primary: base.primary,
      secondary: base.dark,
      accent: base.accent,
      background: '#020617',
      backgroundAlt: base.dark,
      surface: toRgba(base.dark, 0.44),
      elevated: toRgba(base.primary, 0.12),
      text: '#f8fafc',
      textSecondary: '#dbeafe',
      muted: '#b6c8da',
      border: toRgba(base.light, 0.44),
      divider: toRgba(base.light, 0.22),
      buttonBg: toRgba(base.primary, 0.82),
      buttonText: getReadableTextColor(base.primary),
      positive: '#bbf7d0',
      negative: '#fecaca',
      highlight: base.light,
      focus: base.primary,
    },
    surfaces: {
      preset: 'glass',
      containerBg: toRgba(base.dark, 0.46),
      cardBg: toRgba(base.primary, 0.1),
      headerBg: toRgba('#ffffff', 0.08),
      footerBg: toRgba('#020617', 0.36),
      opacity: 0.82,
      glass: true,
      blur: 14,
    },
    borders: { enabled: true, width: 1, color: toRgba(base.light, 0.48), style: 'solid' },
    effects: { shadowEnabled: true, shadowColor: '#000000', shadowBlur: 28, shadowOpacity: 0.24, glowEnabled: true, glowColor: base.primary, glowBlur: 18, glowOpacity: 0.12, backdropBlur: 14 },
  };
}

export function generateNeonTheme(settings) {
  const base = buildSimpleBase(settings);
  return {
    colors: {
      primary: base.primary,
      secondary: '#020617',
      accent: base.accent,
      background: '#020617',
      backgroundAlt: '#08111f',
      surface: 'rgba(2, 6, 23, 0.94)',
      elevated: toRgba(base.primary, 0.1),
      text: '#f8fafc',
      textSecondary: '#e0f2fe',
      muted: '#9fb6c8',
      border: toRgba(base.primary, 0.62),
      divider: toRgba(base.primary, 0.26),
      buttonBg: base.primary,
      buttonText: getReadableTextColor(base.primary),
      positive: '#bbf7d0',
      negative: '#fecaca',
      highlight: base.accent,
      focus: base.primary,
    },
    surfaces: {
      preset: 'neon',
      containerBg: 'rgba(2, 6, 23, 0.94)',
      cardBg: toRgba(base.primary, 0.11),
      headerBg: toRgba(base.primary, 0.18),
      footerBg: 'rgba(2, 6, 23, 0.72)',
      opacity: 0.95,
      glass: false,
      blur: 0,
    },
    borders: { enabled: true, width: 1, color: toRgba(base.primary, 0.68), style: 'solid' },
    effects: { shadowEnabled: true, shadowColor: '#000000', shadowBlur: 28, shadowOpacity: 0.34, glowEnabled: true, glowColor: base.primary, glowBlur: 28, glowOpacity: 0.28, backdropBlur: 0 },
  };
}

export function generateMinimalTheme(settings) {
  const base = buildSimpleBase(settings);
  return {
    colors: {
      primary: base.primary,
      secondary: '#0f172a',
      accent: base.accent,
      background: '#020617',
      backgroundAlt: '#0f172a',
      surface: 'rgba(2, 6, 23, 0.62)',
      elevated: 'rgba(15, 23, 42, 0.44)',
      text: '#f8fafc',
      textSecondary: '#cbd5e1',
      muted: '#94a3b8',
      border: toRgba(base.primary, 0.22),
      divider: 'rgba(148, 163, 184, 0.14)',
      buttonBg: base.primary,
      buttonText: getReadableTextColor(base.primary),
      positive: '#86efac',
      negative: '#fca5a5',
      highlight: base.accent,
      focus: base.primary,
    },
    surfaces: {
      preset: 'minimal',
      containerBg: 'rgba(2, 6, 23, 0.54)',
      cardBg: 'rgba(2, 6, 23, 0.28)',
      headerBg: 'transparent',
      footerBg: 'transparent',
      opacity: 0.86,
      glass: false,
      blur: 0,
    },
    borders: { enabled: true, width: 1, color: toRgba(base.primary, 0.24), style: 'solid' },
    effects: { shadowEnabled: false, glowEnabled: false, backdropBlur: 0 },
  };
}

export function generateSoftShadowTheme(settings) {
  const baseTheme = generateMatteTheme(settings);
  return deepMergeSimple(baseTheme, {
    surfaces: {
      preset: 'soft_shadow',
      containerBg: toRgba(buildSimpleBase(settings).dark, 0.9),
      cardBg: toRgba(buildSimpleBase(settings).primary, 0.12),
    },
    borders: { width: 1 },
    effects: { shadowEnabled: true, shadowColor: '#000000', shadowBlur: 42, shadowOpacity: 0.3, glowEnabled: false },
  });
}

export function generateTransparentTheme(settings) {
  const base = buildSimpleBase(settings);
  return {
    canvas: { backgroundType: 'transparent', tintOpacity: 0 },
    colors: {
      primary: base.primary,
      secondary: '#020617',
      accent: base.accent,
      background: '#020617',
      backgroundAlt: '#0f172a',
      surface: 'transparent',
      elevated: toRgba('#020617', 0.36),
      text: '#f8fafc',
      textSecondary: '#e2e8f0',
      muted: '#cbd5e1',
      border: 'transparent',
      divider: toRgba(base.primary, 0.22),
      buttonBg: base.primary,
      buttonText: getReadableTextColor(base.primary),
      positive: '#bbf7d0',
      negative: '#fecaca',
      highlight: base.accent,
      focus: base.primary,
    },
    surfaces: {
      preset: 'transparent_obs',
      containerBg: 'transparent',
      cardBg: toRgba('#020617', 0.38),
      headerBg: 'transparent',
      footerBg: 'transparent',
      opacity: 1,
      glass: false,
      blur: 0,
    },
    borders: { enabled: false, width: 0, color: 'transparent', style: 'none' },
    effects: { shadowEnabled: true, shadowColor: '#000000', shadowBlur: 20, shadowOpacity: 0.24, glowEnabled: false, backdropBlur: 0 },
  };
}

function deepMergeSimple(base, override) {
  const output = { ...(base || {}) };
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = deepMergeSimple(output[key] || {}, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

export function generateSimpleAppearance(input = {}) {
  const settings = normalizeSimpleSettings(input);
  if (settings.material === 'original') {
    return {
      simpleSettings: settings,
      generatedTokens: {
        material: 'original',
        primaryColor: settings.primaryColor,
        accentColor: settings.accentColor,
        readableTextColor: '#f8fafc',
        contrastRatio: 7,
      },
    };
  }
  const materialGenerators = {
    matte: generateMatteTheme,
    metallic: generateMetallicTheme,
    gradient: generateGradientTheme,
    glass: generateGlassTheme,
    neon: generateNeonTheme,
    minimal: generateMinimalTheme,
    soft_shadow: generateSoftShadowTheme,
    transparent_obs: generateTransparentTheme,
  };
  const generated = (materialGenerators[settings.material] || generateMatteTheme)(settings);
  const base = buildSimpleBase(settings);
  const textColor = generated.colors?.text || getReadableTextColor(base.dark);
  const contrastBackground = generated.surfaces?.containerBg === 'transparent'
    ? '#020617'
    : base.dark;
  const contrastRatio = getContrastRatio(contrastBackground, textColor);
  const radius = base.shape.radius;
  const bodyWeight = settings.boldText ? 800 : 650;

  return deepMergeSimple(generated, {
    simpleSettings: settings,
    generatedTokens: {
      material: settings.material,
      primaryColor: base.primary,
      accentColor: base.accent,
      readableTextColor: textColor,
      contrastRatio,
    },
    typography: {
      headingFont: settings.fontFamily,
      bodyFont: settings.fontFamily,
      numberFont: settings.fontFamily,
      buttonFont: settings.fontFamily,
      baseSize: base.textSize.baseSize,
      headingScale: base.textSize.headingScale,
      bodyWeight,
      headingWeight: settings.boldText ? 900 : 820,
      buttonWeight: 850,
      lineHeight: 1.42,
      letterSpacing: 0,
      textTransform: 'none',
    },
    surfaces: {
      padding: base.density.padding,
      gap: base.density.gap,
      density: settings.density,
    },
    borders: {
      radius,
      linkedCorners: true,
      topLeft: radius,
      topRight: radius,
      bottomRight: radius,
      bottomLeft: radius,
      shape: settings.shape,
    },
    spacing: {
      scale: settings.scale,
      widgetScale: settings.scale,
      padding: base.density.padding,
      gap: base.density.gap,
      buttonHeight: base.density.buttonHeight,
    },
    controls: {
      primaryBg: generated.colors?.buttonBg || base.primary,
      primaryText: generated.colors?.buttonText || getReadableTextColor(base.primary),
      secondaryBg: generated.surfaces?.cardBg || toRgba(base.dark, 0.54),
      secondaryText: generated.colors?.textSecondary || textColor,
      inputBg: generated.surfaces?.cardBg || toRgba(base.dark, 0.54),
      inputText: textColor,
      radius: Math.min(radius, 24),
      borderColor: generated.borders?.color || toRgba(base.light, 0.32),
      focusColor: base.primary,
    },
  });
}

export const CONTROL_DEFINITIONS = {
  fontFamily: { id: 'fontFamily', label: 'Font', type: 'font', simple: true, group: 'Text' },
  fontSize: { id: 'fontSize', label: 'Text size', type: 'range', min: 8, max: 96, step: 1, unit: 'px', simple: true, group: 'Text' },
  fontWeight: { id: 'fontWeight', label: 'Text weight', type: 'select', options: ['300', '400', '500', '600', '700', '800', '900'], group: 'Text' },
  fontStyle: { id: 'fontStyle', label: 'Italic', type: 'toggle-value', onValue: 'italic', offValue: 'normal', group: 'Text' },
  textColor: { id: 'textColor', label: 'Text color', type: 'color', simple: true, group: 'Color' },
  textAlign: { id: 'textAlign', label: 'Alignment', type: 'segmented', options: ['left', 'center', 'right'], simple: true, group: 'Text' },
  lineHeight: { id: 'lineHeight', label: 'Line height', type: 'range', min: 0.8, max: 2.4, step: 0.05, group: 'Text' },
  letterSpacing: { id: 'letterSpacing', label: 'Letter spacing', type: 'range', min: -0.04, max: 0.16, step: 0.01, unit: 'em', group: 'Text' },
  textTransform: { id: 'textTransform', label: 'Uppercase', type: 'toggle-value', onValue: 'uppercase', offValue: 'none', group: 'Text' },
  textShadow: { id: 'textShadow', label: 'Text shadow', type: 'text', group: 'Effects' },

  background: { id: 'background', label: 'Background', type: 'color', simple: true, group: 'Background' },
  backgroundColor: { id: 'backgroundColor', label: 'Background color', type: 'color', simple: true, group: 'Background' },
  backgroundOpacity: { id: 'backgroundOpacity', label: 'Background opacity', type: 'range', min: 0, max: 1, step: 0.05, group: 'Background' },
  backgroundType: { id: 'backgroundType', label: 'Background type', type: 'segmented', options: ['transparent', 'solid', 'gradient'], simple: true, group: 'Background' },
  gradientFrom: { id: 'gradientFrom', label: 'Gradient start', type: 'color', group: 'Background' },
  gradientTo: { id: 'gradientTo', label: 'Gradient end', type: 'color', group: 'Background' },
  gradientAngle: { id: 'gradientAngle', label: 'Gradient angle', type: 'range', min: 0, max: 360, step: 1, unit: 'deg', group: 'Background' },
  imageUrl: { id: 'imageUrl', label: 'Image URL', type: 'text', group: 'Image' },
  imageSize: { id: 'imageSize', label: 'Image size', type: 'range', min: 30, max: 220, step: 1, unit: 'px', group: 'Background' },
  imageFit: { id: 'imageFit', label: 'Image fit', type: 'segmented', options: ['cover', 'contain', 'fill'], group: 'Image' },
  backgroundSize: { id: 'backgroundSize', label: 'Image fit', type: 'segmented', options: ['cover', 'contain', 'fill'], group: 'Background' },
  backgroundPosition: { id: 'backgroundPosition', label: 'Image position', type: 'select', options: ['center', 'top', 'bottom', 'left', 'right'], group: 'Background' },

  borderColor: { id: 'borderColor', label: 'Border color', type: 'color', simple: true, group: 'Border and shape' },
  borderWidth: { id: 'borderWidth', label: 'Border width', type: 'range', min: 0, max: 12, step: 1, unit: 'px', simple: true, group: 'Border and shape' },
  borderStyle: { id: 'borderStyle', label: 'Border style', type: 'segmented', options: ['none', 'solid', 'gradient'], simple: true, group: 'Border and shape' },
  radius: { id: 'radius', label: 'Rounded corners', type: 'range', min: 0, max: 48, step: 1, unit: 'px', simple: true, group: 'Border and shape' },
  topLeft: { id: 'topLeft', label: 'Top left corner', type: 'range', min: 0, max: 64, step: 1, unit: 'px', group: 'Border and shape' },
  topRight: { id: 'topRight', label: 'Top right corner', type: 'range', min: 0, max: 64, step: 1, unit: 'px', group: 'Border and shape' },
  bottomRight: { id: 'bottomRight', label: 'Bottom right corner', type: 'range', min: 0, max: 64, step: 1, unit: 'px', group: 'Border and shape' },
  bottomLeft: { id: 'bottomLeft', label: 'Bottom left corner', type: 'range', min: 0, max: 64, step: 1, unit: 'px', group: 'Border and shape' },

  width: { id: 'width', label: 'Width', type: 'range', min: 160, max: 1920, step: 1, unit: 'px', simple: true, group: 'Size and spacing' },
  height: { id: 'height', label: 'Height', type: 'range', min: 60, max: 1080, step: 1, unit: 'px', simple: true, group: 'Size and spacing' },
  minWidth: { id: 'minWidth', label: 'Minimum width', type: 'range', min: 0, max: 1920, step: 1, unit: 'px', group: 'Size and spacing' },
  minHeight: { id: 'minHeight', label: 'Minimum height', type: 'range', min: 0, max: 1080, step: 1, unit: 'px', group: 'Size and spacing' },
  padding: { id: 'padding', label: 'Space inside', type: 'range', min: 0, max: 80, step: 1, unit: 'px', simple: true, group: 'Size and spacing' },
  margin: { id: 'margin', label: 'Space outside', type: 'range', min: 0, max: 80, step: 1, unit: 'px', group: 'Size and spacing' },
  gap: { id: 'gap', label: 'Space between items', type: 'range', min: 0, max: 60, step: 1, unit: 'px', simple: true, group: 'Size and spacing' },
  opacity: { id: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.05, simple: true, group: 'Effects', help: 'How see-through this part is.' },
  shadowBlur: { id: 'shadowBlur', label: 'Shadow softness', type: 'range', min: 0, max: 100, step: 1, unit: 'px', group: 'Effects' },
  shadowOpacity: { id: 'shadowOpacity', label: 'Shadow strength', type: 'range', min: 0, max: 1, step: 0.05, group: 'Effects' },
  glowBlur: { id: 'glowBlur', label: 'Glow size', type: 'range', min: 0, max: 100, step: 1, unit: 'px', group: 'Effects' },
  glowOpacity: { id: 'glowOpacity', label: 'Glow strength', type: 'range', min: 0, max: 1, step: 0.05, group: 'Effects' },
  blur: { id: 'blur', label: 'Blur', type: 'range', min: 0, max: 40, step: 1, unit: 'px', group: 'Effects' },

  animation: { id: 'animation', label: 'Animation', type: 'segmented', options: ['none', 'fade', 'slide', 'scale', 'pulse', 'glow'], group: 'Animation' },
  duration: { id: 'duration', label: 'Duration', type: 'range', min: 0, max: 3000, step: 50, unit: 'ms', group: 'Animation' },
  delay: { id: 'delay', label: 'Delay', type: 'range', min: 0, max: 3000, step: 50, unit: 'ms', group: 'Animation' },
};

const TEXT_IDS = /title|heading|header|subtitle|label|value|text|name|footer|caption|question|status|percentage|number|timer|count|amount|requester|description/i;
const SURFACE_IDS = /container|background|card|row|section|box|cell|button|panel|footer|header|wrapper|shell/i;
const IMAGE_IDS = /image|avatar|thumb|thumbnail|icon|logo|media/i;
const PROGRESS_IDS = /progress|bar|fill|meter/i;

const TEXT_CONTROLS = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'textColor', 'textAlign', 'lineHeight', 'letterSpacing', 'textTransform', 'textShadow'];
const SURFACE_CONTROLS = ['background', 'backgroundColor', 'borderColor', 'borderWidth', 'borderStyle', 'radius', 'padding', 'gap', 'opacity', 'shadowBlur', 'shadowOpacity', 'glowBlur', 'glowOpacity', 'blur'];
const IMAGE_CONTROLS = ['imageUrl', 'imageSize', 'imageFit', 'backgroundSize', 'backgroundPosition', 'radius', 'opacity', 'borderColor', 'borderWidth'];
const PROGRESS_CONTROLS = ['background', 'backgroundColor', 'borderColor', 'borderWidth', 'radius', 'height', 'opacity'];
const SIZE_CONTROLS = ['width', 'height', 'minWidth', 'minHeight', 'padding', 'margin', 'gap'];
const ADVANCED_CORNER_CONTROLS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
const ANIMATION_CONTROLS = ['animation', 'duration', 'delay'];

export const BUILT_IN_STYLE_PRESETS = [
  {
    id: 'clean_dark',
    name: 'Clean Dark',
    description: 'Readable dark stream layout with soft cards.',
    tint: '#14b8a6',
    appearance: {
      colors: { primary: '#14b8a6', accent: '#f59e0b', text: '#f8fafc', muted: '#94a3b8' },
      surfaces: { containerBg: 'rgba(15,23,42,0.9)', cardBg: 'rgba(255,255,255,0.06)', opacity: 0.94, blur: 8 },
      borders: { radius: 12, width: 1, color: 'rgba(148,163,184,0.24)' },
      effects: { shadowEnabled: true, shadowBlur: 24, shadowOpacity: 0.28, glowEnabled: false },
    },
  },
  {
    id: 'clean_light',
    name: 'Clean Light',
    description: 'Bright panels for daytime streams and light OBS scenes.',
    tint: '#2563eb',
    appearance: {
      colors: { primary: '#2563eb', accent: '#0f766e', text: '#0f172a', muted: '#475569' },
      surfaces: { containerBg: 'rgba(248,250,252,0.94)', cardBg: 'rgba(255,255,255,0.88)', opacity: 0.96, blur: 4 },
      borders: { radius: 10, width: 1, color: 'rgba(15,23,42,0.16)' },
      effects: { shadowEnabled: true, shadowBlur: 18, shadowOpacity: 0.16, glowEnabled: false },
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'High contrast cyan and pink with controlled glow.',
    tint: '#22d3ee',
    appearance: {
      colors: { primary: '#22d3ee', accent: '#f472b6', text: '#f8fafc', muted: '#a5b4fc' },
      surfaces: { containerBg: 'rgba(8,13,28,0.9)', cardBg: 'rgba(34,211,238,0.08)', opacity: 0.9, blur: 12 },
      borders: { radius: 14, width: 1, color: 'rgba(34,211,238,0.38)' },
      effects: { shadowEnabled: true, shadowBlur: 26, shadowOpacity: 0.32, glowEnabled: true, glowColor: '#22d3ee', glowBlur: 28, glowOpacity: 0.32 },
    },
  },
  {
    id: 'neon_casino',
    name: 'Neon Casino',
    description: 'Casino green with bright gold accents.',
    tint: '#2dd4bf',
    appearance: {
      colors: { primary: '#2dd4bf', accent: '#facc15', positive: '#86efac', negative: '#fca5a5', text: '#ffffff' },
      surfaces: { containerBg: 'rgba(1,35,32,0.88)', cardBg: 'rgba(250,204,21,0.08)', opacity: 0.92, blur: 10 },
      borders: { radius: 16, width: 1, color: 'rgba(45,212,191,0.36)' },
      effects: { glowEnabled: true, glowColor: '#2dd4bf', glowBlur: 26, glowOpacity: 0.26 },
    },
  },
  {
    id: 'gold_luxury',
    name: 'Gold Luxury',
    description: 'Warm gold and black for premium casino streams.',
    tint: '#f59e0b',
    appearance: {
      colors: { primary: '#f59e0b', accent: '#fde68a', text: '#fff7ed', muted: '#fed7aa' },
      surfaces: { containerBg: 'rgba(24,15,3,0.9)', cardBg: 'rgba(245,158,11,0.1)', opacity: 0.94, blur: 8 },
      borders: { radius: 12, width: 1, color: 'rgba(245,158,11,0.42)' },
      effects: { shadowEnabled: true, shadowBlur: 30, shadowOpacity: 0.36, glowEnabled: true, glowColor: '#f59e0b', glowBlur: 18, glowOpacity: 0.18 },
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Small, flat and easy to read.',
    tint: '#94a3b8',
    appearance: {
      colors: { primary: '#e2e8f0', accent: '#38bdf8', text: '#f8fafc', muted: '#cbd5e1' },
      surfaces: { containerBg: 'rgba(2,6,23,0.72)', cardBg: 'rgba(2,6,23,0.36)', opacity: 0.88, blur: 0, padding: 8, gap: 6 },
      borders: { radius: 6, width: 0, color: 'transparent' },
      effects: { shadowEnabled: false, glowEnabled: false },
      typography: { baseSize: 13, headingScale: 1.12 },
    },
  },
  {
    id: 'transparent_obs',
    name: 'Transparent OBS',
    description: 'Transparent background with only the widget content visible.',
    tint: '#5eead4',
    appearance: {
      canvas: { backgroundType: 'transparent', tintOpacity: 0 },
      surfaces: { containerBg: 'transparent', cardBg: 'rgba(2,6,23,0.4)', opacity: 1, blur: 0 },
      borders: { width: 0, color: 'transparent' },
      effects: { shadowEnabled: true, shadowBlur: 18, shadowOpacity: 0.28, glowEnabled: false },
    },
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Tighter spacing for crowded scenes.',
    tint: '#60a5fa',
    appearance: {
      surfaces: { padding: 8, gap: 6 },
      spacing: { padding: 8, gap: 6, widgetScale: 0.92, buttonHeight: 34 },
      typography: { baseSize: 12, headingScale: 1.12 },
      borders: { radius: 8 },
    },
  },
  {
    id: 'large_stream',
    name: 'Large Stream Layout',
    description: 'Bigger text and spacing for full-screen scenes.',
    tint: '#a78bfa',
    appearance: {
      surfaces: { padding: 18, gap: 14 },
      spacing: { padding: 18, gap: 14, widgetScale: 1.08, buttonHeight: 50 },
      typography: { baseSize: 17, headingScale: 1.28 },
      borders: { radius: 16 },
    },
  },
];

export function getWidgetCategory(widgetOrType) {
  const type = typeof widgetOrType === 'string' ? widgetOrType : widgetOrType?.widget_type || widgetOrType?.type || '';
  const def = getWidgetDef(type);
  const haystack = `${type} ${def?.label || ''} ${def?.category || ''}`.toLowerCase();
  if (/bonus.?hunt|current.?slot|single.?slot|rtp|bonus.?buy|slot.?manager/.test(haystack)) return 'bonus_hunt';
  if (/request/.test(haystack)) return 'slot_requests';
  if (/giveaway|wheel.?of.?names/.test(haystack)) return 'giveaways';
  if (/alert|raid|shout/.test(haystack)) return 'alerts';
  if (/chat|spotify|ai/.test(haystack)) return 'chat';
  if (/game|bets|coin|wheel|prediction|keno|mines|slotmachine|picker/.test(haystack)) return 'games';
  if (/goal/.test(haystack)) return 'goals';
  if (/stat|analytics|wins|session/.test(haystack)) return 'statistics';
  return 'other';
}

export function getWidgetDisplayName(widget) {
  const def = getWidgetDef(widget?.widget_type);
  return widget?.name || widget?.config?.title || widget?.config?.label || def?.label || widget?.widget_type || 'Widget';
}

export function getWidgetIcon(widgetOrType) {
  const type = typeof widgetOrType === 'string' ? widgetOrType : widgetOrType?.widget_type;
  const def = getWidgetDef(type);
  return def?.icon || 'PanelTop';
}

export function getFriendlyElementLabel(elementId, fallback = '') {
  const value = fallback || elementId || 'Element';
  return String(value)
    .replace(/^root$/i, 'Widget background')
    .replace(/^container$/i, 'Widget background')
    .replace(/^headercontainer$/i, 'Header')
    .replace(/^headerTitle$/i, 'Title')
    .replace(/^mainStatsContainer$/i, 'Stat cards')
    .replace(/^statCell$/i, 'Stat card')
    .replace(/^statLabel$/i, 'Stat label')
    .replace(/^statValue$/i, 'Stat value')
    .replace(/^slotListContainer$/i, 'Slot list')
    .replace(/^slotRow$/i, 'Slot row')
    .replace(/^slotImage$/i, 'Slot image')
    .replace(/^progressBarFill$/i, 'Progress fill')
    .replace(/^progressBar$/i, 'Progress bar')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, char => char.toUpperCase());
}

export function inferElementKind(element = {}) {
  const id = `${element.id || ''} ${element.label || ''}`;
  if (IMAGE_IDS.test(id)) return 'image';
  if (PROGRESS_IDS.test(id)) return 'progress';
  if (TEXT_IDS.test(id)) return 'text';
  if (SURFACE_IDS.test(id)) return 'surface';
  return 'mixed';
}

function declaredProperties(element = {}) {
  return new Set(Array.isArray(element.properties) ? element.properties : []);
}

export function elementSupportsControl(element = {}, controlId) {
  const explicitControls = Array.isArray(element.controls) && element.controls.length ? element.controls : null;
  const kind = inferElementKind(element);
  if (explicitControls && kind === 'image' && [...IMAGE_CONTROLS, ...SIZE_CONTROLS].includes(controlId)) return explicitControls.includes(controlId);
  if (explicitControls && kind === 'progress' && [...PROGRESS_CONTROLS, ...SIZE_CONTROLS].includes(controlId)) return explicitControls.includes(controlId);
  const props = declaredProperties(element);
  if (props.has(controlId)) return true;
  const definition = CONTROL_DEFINITIONS[controlId];
  if (!definition) return false;
  if (kind === 'text') return TEXT_CONTROLS.includes(controlId) || ['opacity', 'shadowBlur', 'shadowOpacity'].includes(controlId);
  if (kind === 'surface') return SURFACE_CONTROLS.includes(controlId) || SIZE_CONTROLS.includes(controlId);
  if (kind === 'image') return IMAGE_CONTROLS.includes(controlId) || SIZE_CONTROLS.includes(controlId);
  if (kind === 'progress') return PROGRESS_CONTROLS.includes(controlId) || SIZE_CONTROLS.includes(controlId);
  return definition.simple || props.size === 0;
}

export function getElementControlGroups(element = {}, mode = 'simple') {
  const advanced = mode === 'advanced';
  const explicitControls = Array.isArray(element.controls) ? element.controls : [];
  const base = [
    ...explicitControls,
    ...TEXT_CONTROLS,
    ...SURFACE_CONTROLS,
    ...IMAGE_CONTROLS,
    ...PROGRESS_CONTROLS,
    ...SIZE_CONTROLS,
    ...(advanced ? [...ADVANCED_CORNER_CONTROLS, ...ANIMATION_CONTROLS] : []),
  ];
  const seen = new Set();
  const controls = base
    .filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      const definition = CONTROL_DEFINITIONS[id];
      if (!definition) return false;
      if (!advanced && !definition.simple) return false;
      return elementSupportsControl(element, id);
    })
    .map(id => CONTROL_DEFINITIONS[id]);

  return Object.values(controls.reduce((groups, control) => {
    const groupName = control.group || 'Style';
    if (!groups[groupName]) groups[groupName] = { id: groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: groupName, controls: [] };
    groups[groupName].controls.push(control);
    return groups;
  }, {}));
}

export function getWidgetElementSchema(widgetType) {
  if (isWidgetAppearanceV2Enabled(widgetType)) {
    const v2Elements = getWidgetAppearanceV2Elements(widgetType);
    if (v2Elements.length) {
      return v2Elements.map(element => ({
        ...element,
        label: getFriendlyElementLabel(element.id, element.label),
        kind: element.kind || inferElementKind(element),
        controls: element.controls || getElementControlGroups(element, 'advanced').flatMap(group => group.controls.map(control => control.id)),
      }));
    }
  }
  const elements = getWidgetSubElementDefinitions(widgetType).map(element => ({
    ...element,
    label: getFriendlyElementLabel(element.id, element.label),
    kind: inferElementKind(element),
    controls: getElementControlGroups(element, 'advanced').flatMap(group => group.controls.map(control => control.id)),
  }));
  if (!elements.length) {
    return [{
      id: 'container',
      label: 'Widget background',
      properties: ['background', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'opacity'],
      kind: 'surface',
      controls: SURFACE_CONTROLS,
    }];
  }
  return elements;
}

export function getElementValue(appearance, targetRoot, elementId, property, fallback) {
  const definition = COMMON_APPEARANCE_PROPERTY_DEFINITIONS.find(item => item.path === property);
  const groupedPath = definition?.path || property;
  const value = getByPath(appearance, `${targetRoot}.elements.${elementId}.${groupedPath}`);
  if (value !== undefined) return value;
  const legacy = getByPath(appearance, `${targetRoot}.subElements.${elementId}.${property}`);
  return legacy !== undefined ? legacy : fallback;
}

export function validateEditorValue(control, value) {
  if (!control) return value;
  if (value === RESET_VALUE) return value;
  if (control.type === 'color') {
    const next = String(value || '').trim();
    if (!next) return 'transparent';
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(next) || /^rgba?\(/i.test(next) || /^hsla?\(/i.test(next) || next === 'transparent') return next;
    return '#ffffff';
  }
  if (control.type === 'range' || control.type === 'number') {
    const number = Number(value);
    const fallback = Number(control.min) || 0;
    const next = Number.isFinite(number) ? number : fallback;
    return Math.min(Number(control.max ?? next), Math.max(Number(control.min ?? next), next));
  }
  if (control.type === 'segmented' || control.type === 'select') {
    const options = (control.options || []).map(option => (typeof option === 'object' ? option.value : option));
    return options.includes(value) ? value : options[0] || '';
  }
  return normalizeAppearanceControlValue(control.id, value, control.type);
}

export function getModeLabel(mode) {
  return mode === 'advanced' ? 'Advanced Mode' : 'Simple Mode';
}
