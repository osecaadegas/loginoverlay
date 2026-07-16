import {
  clamp,
  darkenHex,
  deriveAccentColor,
  desaturateHex,
  getContrastRatio,
  getReadableTextColor,
  lightenHex,
  mixHex,
  normalizeHexColor,
  toRgba,
  validateReadableText,
} from './colorUtils';

export const APPEARANCE_V2_SCHEMA_VERSION = 1;

export const MATERIAL_IDS = Object.freeze([
  'original',
  'matte',
  'metallic',
  'gradient',
  'glass',
  'neon',
  'minimal',
  'transparent_obs',
]);

export const DEFAULT_SIMPLE_APPEARANCE_V2 = Object.freeze({
  material: 'matte',
  primaryColor: '#14d8d8',
  accentColor: null,
  useAccentColor: false,
  shape: 'rounded',
  density: 'standard',
  scale: 1,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
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
});

export const SHAPE_RADII = Object.freeze({
  square: 0,
  slightly_rounded: 8,
  rounded: 16,
  pill: 80,
});

export const DENSITY_TOKENS = Object.freeze({
  compact: { densityMultiplier: 0.84, rootPadding: 10, cardPadding: 8, sectionGap: 7, itemGap: 5 },
  standard: { densityMultiplier: 1, rootPadding: 14, cardPadding: 11, sectionGap: 10, itemGap: 7 },
  large: { densityMultiplier: 1.16, rootPadding: 18, cardPadding: 15, sectionGap: 14, itemGap: 10 },
});

export const TEXT_SIZE_TOKENS = Object.freeze({
  small: { bodySize: 12, labelSize: 10, valueSize: 14, headerSize: 16, lineHeight: 1.24 },
  standard: { bodySize: 14, labelSize: 11, valueSize: 17, headerSize: 19, lineHeight: 1.28 },
  large: { bodySize: 17, labelSize: 13, valueSize: 21, headerSize: 24, lineHeight: 1.32 },
});

export const CAROUSEL_SPEED_TOKENS = Object.freeze({
  slow: { intervalMs: 4200, label: 'Slow' },
  normal: { intervalMs: 2600, label: 'Normal' },
  fast: { intervalMs: 1400, label: 'Fast' },
});

export const ANIMATION_SPEED_TOKENS = Object.freeze({
  slow: { durationMultiplier: 1.35, transitionDuration: 260 },
  normal: { durationMultiplier: 1, transitionDuration: 180 },
  fast: { durationMultiplier: 0.72, transitionDuration: 120 },
});

export const STRENGTH_TOKENS = Object.freeze({
  off: 0,
  subtle: 0.16,
  soft: 0.2,
  medium: 0.34,
  strong: 0.52,
});

export const IMAGE_SIZE_TOKENS = Object.freeze({
  hidden: 0,
  small: 0.82,
  medium: 1,
  large: 1.18,
});

export const IMAGE_SHAPE_TOKENS = Object.freeze({
  square: 0,
  rounded: 12,
  circle: 999,
});

function normalizeMaterialInput(input = {}) {
  const primary = normalizeHexColor(input.primaryColor, DEFAULT_SIMPLE_APPEARANCE_V2.primaryColor);
  return {
    ...DEFAULT_SIMPLE_APPEARANCE_V2,
    ...input,
    material: MATERIAL_IDS.includes(input.material) ? input.material : DEFAULT_SIMPLE_APPEARANCE_V2.material,
    primaryColor: primary,
    accentColor: deriveAccentColor(primary, input.accentColor, input.useAccentColor),
    useAccentColor: !!input.useAccentColor,
    shape: Object.prototype.hasOwnProperty.call(SHAPE_RADII, input.shape) ? input.shape : DEFAULT_SIMPLE_APPEARANCE_V2.shape,
    density: Object.prototype.hasOwnProperty.call(DENSITY_TOKENS, input.density) ? input.density : DEFAULT_SIMPLE_APPEARANCE_V2.density,
    scale: clamp(input.scale ?? DEFAULT_SIMPLE_APPEARANCE_V2.scale, 0.75, 1.5),
    textSize: Object.prototype.hasOwnProperty.call(TEXT_SIZE_TOKENS, input.textSize) ? input.textSize : DEFAULT_SIMPLE_APPEARANCE_V2.textSize,
    fontFamily: input.fontFamily || DEFAULT_SIMPLE_APPEARANCE_V2.fontFamily,
    boldText: !!input.boldText,
    carouselSpeed: Object.prototype.hasOwnProperty.call(CAROUSEL_SPEED_TOKENS, input.carouselSpeed) ? input.carouselSpeed : DEFAULT_SIMPLE_APPEARANCE_V2.carouselSpeed,
    carouselDirection: ['left', 'right'].includes(input.carouselDirection) ? input.carouselDirection : DEFAULT_SIMPLE_APPEARANCE_V2.carouselDirection,
    carouselAutoplay: input.carouselAutoplay !== false,
    carouselPauseOnHover: input.carouselPauseOnHover !== false,
    animationEnabled: input.animationEnabled !== false,
    animationSpeed: Object.prototype.hasOwnProperty.call(ANIMATION_SPEED_TOKENS, input.animationSpeed) ? input.animationSpeed : DEFAULT_SIMPLE_APPEARANCE_V2.animationSpeed,
    animationIntensity: ['subtle', 'normal', 'strong'].includes(input.animationIntensity) ? input.animationIntensity : DEFAULT_SIMPLE_APPEARANCE_V2.animationIntensity,
    shadowStrength: Object.prototype.hasOwnProperty.call(STRENGTH_TOKENS, input.shadowStrength) ? input.shadowStrength : DEFAULT_SIMPLE_APPEARANCE_V2.shadowStrength,
    glowStrength: Object.prototype.hasOwnProperty.call(STRENGTH_TOKENS, input.glowStrength) ? input.glowStrength : DEFAULT_SIMPLE_APPEARANCE_V2.glowStrength,
    imageVisibility: ['show', 'hidden'].includes(input.imageVisibility) ? input.imageVisibility : DEFAULT_SIMPLE_APPEARANCE_V2.imageVisibility,
    imageSize: Object.prototype.hasOwnProperty.call(IMAGE_SIZE_TOKENS, input.imageSize) ? input.imageSize : DEFAULT_SIMPLE_APPEARANCE_V2.imageSize,
    imageShape: Object.prototype.hasOwnProperty.call(IMAGE_SHAPE_TOKENS, input.imageShape) ? input.imageShape : DEFAULT_SIMPLE_APPEARANCE_V2.imageShape,
    imageFit: ['cover', 'contain'].includes(input.imageFit) ? input.imageFit : DEFAULT_SIMPLE_APPEARANCE_V2.imageFit,
  };
}

export function generateOriginalTokens(input = {}) {
  const settings = normalizeMaterialInput({ ...input, material: 'original' });
  return {
    schemaVersion: APPEARANCE_V2_SCHEMA_VERSION,
    material: 'original',
    isOriginalBaseline: true,
    colors: {},
    materialTokens: {},
    typography: {},
    shape: {},
    spacing: { scale: settings.scale || 1 },
    motion: {},
    validation: [{
      code: 'original-baseline',
      severity: 'info',
      message: 'Using the widget original production styling.',
    }],
  };
}

function baseTokens(input) {
  const settings = normalizeMaterialInput(input);
  const radius = SHAPE_RADII[settings.shape];
  const density = DENSITY_TOKENS[settings.density];
  const text = TEXT_SIZE_TOKENS[settings.textSize];
  return {
    schemaVersion: APPEARANCE_V2_SCHEMA_VERSION,
    material: settings.material,
    validation: [],
    colors: {
      primary: settings.primaryColor,
      accent: settings.accentColor,
      positive: '#22c55e',
      negative: '#f87171',
      warning: '#f59e0b',
    },
    materialTokens: {
      surfaceOpacity: 0.96,
      highlightOpacity: 0.18,
      borderIntensity: 0.36,
      shadowIntensity: 0.34,
      glowIntensity: 0,
      blurStrength: 0,
      reflectionStrength: 0,
      gradientDirection: '145deg',
      gradientStops: [],
    },
    typography: {
      headerFont: settings.fontFamily,
      bodyFont: settings.fontFamily,
      labelFont: settings.fontFamily,
      valueFont: settings.fontFamily,
      headerSize: text.headerSize,
      bodySize: text.bodySize,
      labelSize: text.labelSize,
      valueSize: text.valueSize,
      headerWeight: settings.boldText ? 800 : 700,
      bodyWeight: settings.boldText ? 700 : 600,
      labelWeight: 700,
      valueWeight: settings.boldText ? 900 : 800,
      lineHeight: text.lineHeight,
    },
    shape: {
      rootRadius: radius,
      cardRadius: Math.max(0, Math.round(radius * 0.72)),
      badgeRadius: radius >= 40 ? 999 : Math.max(6, Math.round(radius * 0.55)),
      borderWidth: radius === 0 ? 1 : 1,
    },
    spacing: {
      ...density,
      scale: settings.scale,
    },
    motion: {
      motionEnabled: true,
      durationMultiplier: 1,
      transitionDuration: 180,
      glowPulseIntensity: 0,
      carouselSpeed: settings.carouselSpeed,
      carouselIntervalMs: CAROUSEL_SPEED_TOKENS[settings.carouselSpeed].intervalMs,
      carouselDirection: settings.carouselDirection,
      carouselAutoplay: settings.carouselAutoplay,
      carouselPauseOnHover: settings.carouselPauseOnHover,
      animationSpeed: settings.animationSpeed,
      animationIntensity: settings.animationIntensity,
    },
    image: {
      visible: settings.imageVisibility !== 'hidden',
      sizeMultiplier: IMAGE_SIZE_TOKENS[settings.imageSize],
      radius: IMAGE_SHAPE_TOKENS[settings.imageShape],
      fit: settings.imageFit,
    },
  };
}

function applySimpleControlStrengths(tokens, settings) {
  if (tokens.isOriginalBaseline || tokens.material === 'original') return tokens;
  const shadow = STRENGTH_TOKENS[settings.shadowStrength];
  const glow = STRENGTH_TOKENS[settings.glowStrength];
  const speed = ANIMATION_SPEED_TOKENS[settings.animationSpeed];
  return {
    ...tokens,
    materialTokens: {
      ...tokens.materialTokens,
      shadowIntensity: settings.shadowStrength === DEFAULT_SIMPLE_APPEARANCE_V2.shadowStrength
        ? tokens.materialTokens.shadowIntensity
        : shadow,
      glowIntensity: settings.glowStrength === DEFAULT_SIMPLE_APPEARANCE_V2.glowStrength
        ? tokens.materialTokens.glowIntensity
        : glow,
    },
    motion: {
      ...tokens.motion,
      motionEnabled: settings.animationEnabled,
      durationMultiplier: speed.durationMultiplier,
      transitionDuration: speed.transitionDuration,
      carouselSpeed: settings.carouselSpeed,
      carouselIntervalMs: CAROUSEL_SPEED_TOKENS[settings.carouselSpeed].intervalMs,
      carouselDirection: settings.carouselDirection,
      carouselAutoplay: settings.carouselAutoplay,
      carouselPauseOnHover: settings.carouselPauseOnHover,
      animationSpeed: settings.animationSpeed,
      animationIntensity: settings.animationIntensity,
    },
    image: {
      ...tokens.image,
      visible: settings.imageVisibility !== 'hidden',
      sizeMultiplier: IMAGE_SIZE_TOKENS[settings.imageSize],
      radius: IMAGE_SHAPE_TOKENS[settings.imageShape],
      fit: settings.imageFit,
    },
  };
}

function finishTokens(tokens, surfaceReference) {
  const readableText = getReadableTextColor(surfaceReference);
  const contrast = validateReadableText(surfaceReference, readableText);
  return {
    ...tokens,
    colors: {
      ...tokens.colors,
      text: contrast.suggestedText,
      mutedText: contrast.suggestedText === '#f8fafc'
        ? 'rgba(226, 232, 240, 0.72)'
        : 'rgba(15, 23, 42, 0.72)',
    },
    validation: [
      ...(tokens.validation || []),
      {
        code: contrast.status,
        severity: contrast.status === 'valid' ? 'info' : 'warning',
        message: contrast.status === 'valid' ? 'Readable text contrast.' : 'Text contrast was corrected to a safe value.',
        ratio: Number(contrast.ratio.toFixed(2)),
      },
    ],
  };
}

export function generateMatteTokens(input = {}) {
  const tokens = baseTokens({ ...input, material: 'matte' });
  const primary = tokens.colors.primary;
  const surfaceRef = darkenHex(primary, 0.78);
  return finishTokens({
    ...tokens,
    colors: {
      ...tokens.colors,
      surface: toRgba(surfaceRef, 0.96),
      surfaceReference: surfaceRef,
      secondarySurface: toRgba(darkenHex(primary, 0.7), 0.88),
      elevatedSurface: toRgba(darkenHex(primary, 0.62), 0.9),
      border: toRgba(lightenHex(primary, 0.32), 0.34),
      highlight: toRgba(lightenHex(primary, 0.22), 0.28),
      shadow: 'rgba(0, 0, 0, 0.38)',
      glow: toRgba(primary, 0.12),
    },
    materialTokens: {
      ...tokens.materialTokens,
      surfaceOpacity: 0.96,
      shadowIntensity: 0.26,
    },
  }, surfaceRef);
}

export function generateMetallicTokens(input = {}) {
  const tokens = baseTokens({ ...input, material: 'metallic' });
  const primary = tokens.colors.primary;
  const dark = darkenHex(primary, 0.82);
  const mid = desaturateHex(darkenHex(primary, 0.5), 0.18);
  const shine = lightenHex(primary, 0.48);
  return finishTokens({
    ...tokens,
    colors: {
      ...tokens.colors,
      surface: `linear-gradient(145deg, ${toRgba(shine, 0.2)} 0%, ${toRgba(mid, 0.9)} 34%, ${toRgba(dark, 0.97)} 100%)`,
      surfaceReference: dark,
      secondarySurface: `linear-gradient(160deg, ${toRgba(shine, 0.16)} 0%, ${toRgba(dark, 0.88)} 100%)`,
      elevatedSurface: `linear-gradient(155deg, ${toRgba(lightenHex(primary, 0.35), 0.18)}, ${toRgba(darkenHex(primary, 0.72), 0.92)})`,
      border: toRgba(shine, 0.46),
      highlight: toRgba(shine, 0.42),
      shadow: 'rgba(0, 0, 0, 0.48)',
      glow: toRgba(primary, 0.18),
    },
    materialTokens: {
      ...tokens.materialTokens,
      reflectionStrength: 0.42,
      shadowIntensity: 0.44,
      gradientStops: [shine, mid, dark],
    },
  }, dark);
}

export function generateGradientTokens(input = {}) {
  const tokens = baseTokens({ ...input, material: 'gradient' });
  const primary = tokens.colors.primary;
  const secondary = tokens.colors.accent || lightenHex(primary, 0.28);
  const surfaceRef = darkenHex(mixHex(primary, secondary, 0.45), 0.66);
  return finishTokens({
    ...tokens,
    colors: {
      ...tokens.colors,
      surface: `linear-gradient(135deg, ${toRgba(darkenHex(primary, 0.52), 0.95)}, ${toRgba(darkenHex(secondary, 0.5), 0.95)})`,
      surfaceReference: surfaceRef,
      secondarySurface: toRgba(darkenHex(primary, 0.72), 0.84),
      elevatedSurface: toRgba(darkenHex(secondary, 0.68), 0.86),
      border: toRgba(lightenHex(secondary, 0.24), 0.38),
      highlight: toRgba(lightenHex(primary, 0.32), 0.35),
      shadow: 'rgba(0, 0, 0, 0.42)',
      glow: toRgba(primary, 0.22),
    },
    materialTokens: {
      ...tokens.materialTokens,
      gradientStops: [primary, secondary],
      gradientDirection: '135deg',
      shadowIntensity: 0.36,
    },
  }, surfaceRef);
}

export function generateGlassTokens(input = {}) {
  const tokens = baseTokens({ ...input, material: 'glass' });
  const primary = tokens.colors.primary;
  const surfaceRef = '#0b1220';
  return finishTokens({
    ...tokens,
    colors: {
      ...tokens.colors,
      surface: toRgba(darkenHex(primary, 0.82), 0.42),
      surfaceReference: surfaceRef,
      secondarySurface: toRgba(lightenHex(primary, 0.1), 0.16),
      elevatedSurface: toRgba(lightenHex(primary, 0.18), 0.2),
      border: toRgba(lightenHex(primary, 0.5), 0.34),
      highlight: toRgba(lightenHex(primary, 0.65), 0.26),
      shadow: 'rgba(0, 0, 0, 0.34)',
      glow: toRgba(primary, 0.16),
    },
    materialTokens: {
      ...tokens.materialTokens,
      surfaceOpacity: 0.42,
      blurStrength: 14,
      highlightOpacity: 0.26,
      shadowIntensity: 0.3,
    },
  }, surfaceRef);
}

export function generateNeonTokens(input = {}) {
  const tokens = baseTokens({ ...input, material: 'neon' });
  const primary = tokens.colors.primary;
  const surfaceRef = '#020617';
  return finishTokens({
    ...tokens,
    colors: {
      ...tokens.colors,
      surface: 'rgba(2, 6, 23, 0.96)',
      surfaceReference: surfaceRef,
      secondarySurface: toRgba(darkenHex(primary, 0.78), 0.5),
      elevatedSurface: toRgba(darkenHex(primary, 0.7), 0.64),
      border: toRgba(primary, 0.52),
      highlight: toRgba(lightenHex(primary, 0.22), 0.42),
      shadow: 'rgba(0, 0, 0, 0.55)',
      glow: toRgba(primary, 0.44),
    },
    materialTokens: {
      ...tokens.materialTokens,
      glowIntensity: 0.42,
      shadowIntensity: 0.5,
      glowPulseIntensity: 0.18,
    },
  }, surfaceRef);
}

export function generateMinimalTokens(input = {}) {
  const tokens = baseTokens({ ...input, material: 'minimal' });
  const primary = tokens.colors.primary;
  const surfaceRef = getContrastRatio(primary, '#f8fafc') > 2 ? '#f8fafc' : '#111827';
  const text = getReadableTextColor(surfaceRef);
  const finished = finishTokens({
    ...tokens,
    colors: {
      ...tokens.colors,
      surface: toRgba(surfaceRef, 0.94),
      surfaceReference: surfaceRef,
      secondarySurface: text === '#f8fafc' ? 'rgba(15, 23, 42, 0.56)' : 'rgba(255, 255, 255, 0.72)',
      elevatedSurface: text === '#f8fafc' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.84)',
      border: toRgba(primary, 0.3),
      highlight: toRgba(primary, 0.18),
      shadow: 'rgba(0, 0, 0, 0.18)',
      glow: toRgba(primary, 0.08),
    },
    materialTokens: {
      ...tokens.materialTokens,
      shadowIntensity: 0.1,
      borderIntensity: 0.2,
    },
  }, surfaceRef);
  return {
    ...finished,
    colors: {
      ...finished.colors,
      text,
      mutedText: text === '#f8fafc' ? 'rgba(226, 232, 240, 0.72)' : 'rgba(15, 23, 42, 0.68)',
    },
  };
}

export function generateTransparentTokens(input = {}) {
  const tokens = baseTokens({ ...input, material: 'transparent_obs' });
  const primary = tokens.colors.primary;
  return finishTokens({
    ...tokens,
    colors: {
      ...tokens.colors,
      surface: 'transparent',
      surfaceReference: '#020617',
      secondarySurface: toRgba(darkenHex(primary, 0.82), 0.54),
      elevatedSurface: toRgba(darkenHex(primary, 0.78), 0.68),
      border: toRgba(lightenHex(primary, 0.34), 0.28),
      highlight: toRgba(primary, 0.25),
      shadow: 'rgba(0, 0, 0, 0.4)',
      glow: toRgba(primary, 0.12),
    },
    materialTokens: {
      ...tokens.materialTokens,
      surfaceOpacity: 0,
      shadowIntensity: 0.2,
      borderIntensity: 0.24,
    },
  }, '#020617');
}

export function generateAppearanceTokens(input = {}, capability = {}) {
  const normalized = normalizeMaterialInput(input);
  const generators = {
    original: generateOriginalTokens,
    matte: generateMatteTokens,
    metallic: generateMetallicTokens,
    gradient: generateGradientTokens,
    glass: generateGlassTokens,
    neon: generateNeonTokens,
    minimal: generateMinimalTokens,
    transparent_obs: generateTransparentTokens,
  };
  const generated = applySimpleControlStrengths(
    (generators[normalized.material] || generateMatteTokens)(normalized),
    normalized
  );
  return filterUnsupportedTokens(generated, capability);
}

export function filterUnsupportedTokens(tokens, capability = {}) {
  const unsupported = new Set(capability.unsupportedProperties || []);
  const next = structuredCloneSafe(tokens);
  for (const property of unsupported) {
    const [group, key] = String(property).split('.');
    if (group && key && next[group]) delete next[group][key];
  }
  return next;
}

export function normalizeSimpleAppearanceV2(input = {}) {
  return normalizeMaterialInput(input);
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
