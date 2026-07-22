import {
  APPEARANCE_V2_SCHEMA_VERSION,
  DEFAULT_SIMPLE_APPEARANCE_V2,
  generateAppearanceTokens,
  normalizeSimpleAppearanceV2,
} from './materialGenerators';
import {
  getWidgetAppearanceCapability,
  isWidgetAppearanceV2Enabled,
} from './widgetAppearanceRegistry';
import { mixHex, toRgba } from './colorUtils';

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function deepMergeV2(...sources) {
  const output = {};
  for (const source of sources) {
    if (!isObject(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      if (isObject(value) && isObject(output[key])) {
        output[key] = deepMergeV2(output[key], value);
      } else if (isObject(value)) {
        output[key] = deepMergeV2(value);
      } else if (Array.isArray(value)) {
        output[key] = [...value];
      } else if (value !== undefined) {
        output[key] = value;
      }
    }
  }
  return output;
}

function clamp(number, min, max) {
  const value = Number(number);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function readEntryAppearanceV2(entry) {
  if (!isObject(entry)) return {};
  if (isObject(entry.appearanceV2)) return entry.appearanceV2;
  if (isObject(entry.appearance?.appearanceV2)) return entry.appearance.appearanceV2;
  return {};
}

function readLegacySimpleSettings(entry) {
  if (!isObject(entry)) return {};
  if (isObject(entry.appearance?.simpleSettings)) return entry.appearance.simpleSettings;
  if (isObject(entry.simpleSettings)) return entry.simpleSettings;
  return {};
}

function readCandidateEntries(appearance = {}, widget, styleId, options = {}) {
  const widgetType = widget?.widget_type;
  const widgetId = widget?.id;
  const typeEntries = options.allowWidgetTypeAppearance === true
    ? [
      appearance.widgetTypes?.[widgetType],
      appearance.widgetTypes?.[widgetType]?.styles?.[styleId],
    ]
    : [];
  return [
    ...typeEntries,
    appearance.widgets?.[widgetId],
    appearance.widgets?.[widgetId]?.styles?.[styleId],
  ].filter(Boolean);
}

function migrateLegacySimpleToV2(widgetType, entry = {}) {
  const legacy = readLegacySimpleSettings(entry);
  if (!Object.keys(legacy).length) return {};
  return createDefaultWidgetAppearanceV2(widgetType, legacy);
}

export function createDefaultWidgetAppearanceV2(widgetType, simple = {}) {
  const capability = getWidgetAppearanceCapability(widgetType);
  const defaults = capability?.defaultAppearance || DEFAULT_SIMPLE_APPEARANCE_V2;
  const normalizedSimple = normalizeSimpleAppearanceV2({ ...defaults, ...simple });
  return {
    schemaVersion: APPEARANCE_V2_SCHEMA_VERSION,
    widgetId: widgetType,
    simple: normalizedSimple,
    savedPreset: {},
    widgetOverrides: {},
    elementOverrides: {},
    stateOverrides: {},
    responsiveOverrides: {},
    generatedTokens: generateAppearanceTokens(normalizedSimple, capability || {}),
  };
}

export function normalizeWidgetAppearanceV2(widgetType, source = {}) {
  const defaults = createDefaultWidgetAppearanceV2(widgetType);
  const simple = normalizeSimpleAppearanceV2({
    ...defaults.simple,
    ...(source.simple || source.simpleSettings || {}),
  });
  const capability = getWidgetAppearanceCapability(widgetType);
  const generatedTokens = generateAppearanceTokens(simple, capability || {});
  const resolvedTokens = deepMergeV2(
    generatedTokens,
    isObject(source.savedPreset?.tokens) ? source.savedPreset.tokens : {},
    isObject(source.widgetOverrides?.tokens) ? source.widgetOverrides.tokens : {}
  );
  return {
    ...defaults,
    ...source,
    schemaVersion: APPEARANCE_V2_SCHEMA_VERSION,
    widgetId: source.widgetId || widgetType,
    simple,
    savedPreset: isObject(source.savedPreset) ? source.savedPreset : {},
    widgetOverrides: isObject(source.widgetOverrides) ? source.widgetOverrides : {},
    elementOverrides: isObject(source.elementOverrides) ? source.elementOverrides : {},
    stateOverrides: isObject(source.stateOverrides) ? source.stateOverrides : {},
    responsiveOverrides: isObject(source.responsiveOverrides) ? source.responsiveOverrides : {},
    generatedTokens: resolvedTokens,
  };
}

export function resolveWidgetAppearanceV2(widget, appearance = {}, options = {}) {
  if (!widget || !isWidgetAppearanceV2Enabled(widget.widget_type)) return null;
  const capability = getWidgetAppearanceCapability(widget.widget_type);
  const styleId = options.styleId || widget.config?.__appearanceStyleId || widget.config?.displayStyle || capability?.defaultStyleId || 'default';
  const entries = readCandidateEntries(appearance, widget, styleId, options);
  const hasStoredV2OrLegacySimple = entries.some(entry => (
    Object.keys(readEntryAppearanceV2(entry)).length > 0
    || Object.keys(readLegacySimpleSettings(entry)).length > 0
  ));
  if (!hasStoredV2OrLegacySimple) return null;
  const migrated = entries.map(entry => migrateLegacySimpleToV2(widget.widget_type, entry));
  const explicit = entries.map(readEntryAppearanceV2);
  const source = deepMergeV2(...migrated, ...explicit);
  const normalized = normalizeWidgetAppearanceV2(widget.widget_type, source);
  return {
    styleId,
    capability,
    appearance: normalized,
    tokens: normalized.generatedTokens,
  };
}

function px(number) {
  return `${Math.round(Number(number) || 0)}px`;
}

function shadowSize(tokens) {
  return Math.round(clamp(tokens.materialTokens?.shadowIntensity || 0, 0, 0.65) * 52);
}

function shadowIntensity(tokens) {
  return Math.round(clamp(tokens.materialTokens?.shadowIntensity || 0, 0, 0.8) * 100);
}

function commonVisualPatch(tokens) {
  return {
    accentColor: tokens.colors.accent,
    bgColor: tokens.colors.surface,
    cardBg: tokens.colors.secondarySurface,
    textColor: tokens.colors.text,
    mutedColor: tokens.colors.mutedText,
    borderColor: tokens.colors.border,
    borderRadius: tokens.shape.rootRadius,
    borderWidth: tokens.shape.borderWidth,
    cardRadius: tokens.shape.cardRadius,
    cardBorder: tokens.colors.border,
    cardBorderWidth: tokens.shape.borderWidth,
    fontFamily: tokens.typography.bodyFont,
    fontSize: tokens.typography.bodySize,
    fontWeight: tokens.typography.bodyWeight,
    progressColor: tokens.colors.primary,
    progressBgColor: tokens.colors.secondarySurface,
    bestColor: tokens.colors.positive,
    worstColor: tokens.colors.negative,
    shadowSize: shadowSize(tokens),
    shadowIntensity: shadowIntensity(tokens),
    widgetScale: tokens.spacing.scale,
  };
}

function commonSubElements(tokens) {
  const cardShadow = tokens.materialTokens?.shadowIntensity > 0.02
    ? `0 ${px(tokens.materialTokens.shadowIntensity * 18)} ${px(tokens.materialTokens.shadowIntensity * 44)} ${tokens.colors.shadow}`
    : undefined;
  const glowShadow = tokens.materialTokens?.glowIntensity > 0.01
    ? `0 0 ${px(tokens.materialTokens.glowIntensity * 46)} ${tokens.colors.glow}`
    : undefined;
  const shadow = [cardShadow, glowShadow].filter(Boolean).join(', ') || undefined;
  return {
    container: {
      background: tokens.colors.surface,
      textColor: tokens.colors.text,
      fontFamily: tokens.typography.bodyFont,
      fontSize: tokens.typography.bodySize,
      fontWeight: tokens.typography.bodyWeight,
      radius: tokens.shape.rootRadius,
      padding: tokens.spacing.rootPadding,
      gap: tokens.spacing.sectionGap,
      borderColor: tokens.colors.border,
      borderWidth: tokens.shape.borderWidth,
      shadow,
      ...(tokens.materialTokens?.blurStrength ? { backdropBlur: tokens.materialTokens.blurStrength } : {}),
    },
    statsCard: {
      background: tokens.colors.secondarySurface,
      textColor: tokens.colors.text,
      accentColor: tokens.colors.accent,
      radius: tokens.shape.cardRadius,
      padding: tokens.spacing.cardPadding,
      gap: tokens.spacing.itemGap,
      borderColor: tokens.colors.border,
      borderWidth: tokens.shape.borderWidth,
      shadow,
    },
    card: {
      background: tokens.colors.secondarySurface,
      textColor: tokens.colors.text,
      accentColor: tokens.colors.accent,
      radius: tokens.shape.cardRadius,
      padding: tokens.spacing.cardPadding,
      borderColor: tokens.colors.border,
      borderWidth: tokens.shape.borderWidth,
    },
    label: {
      textColor: tokens.colors.mutedText,
      fontFamily: tokens.typography.labelFont,
      fontSize: tokens.typography.labelSize,
      fontWeight: tokens.typography.labelWeight,
      lineHeight: tokens.typography.lineHeight,
    },
    value: {
      textColor: tokens.colors.text,
      fontFamily: tokens.typography.valueFont,
      fontSize: tokens.typography.valueSize,
      fontWeight: tokens.typography.valueWeight,
      lineHeight: tokens.typography.lineHeight,
      states: {
        positive: { textColor: tokens.colors.positive },
        negative: { textColor: tokens.colors.negative },
      },
    },
    progressBar: {
      background: tokens.colors.secondarySurface,
      fillColor: tokens.colors.primary,
      radius: tokens.shape.badgeRadius,
    },
    bestStat: { textColor: tokens.colors.positive },
    worstStat: { textColor: tokens.colors.negative },
  };
}

function buildBetsPatch(tokens, styleId) {
  const cardShadow = tokens.materialTokens?.shadowIntensity > 0.02
    ? `0 ${px(tokens.materialTokens.shadowIntensity * 14)} ${px(tokens.materialTokens.shadowIntensity * 34)} ${tokens.colors.shadow}`
    : undefined;
  const glowShadow = tokens.materialTokens?.glowIntensity > 0.01
    ? `0 0 ${px(tokens.materialTokens.glowIntensity * 38)} ${tokens.colors.glow}`
    : undefined;
  const shadow = [cardShadow, glowShadow].filter(Boolean).join(', ') || undefined;
  const statSurface = {
    background: tokens.colors.secondarySurface,
    textColor: tokens.colors.text,
    fontFamily: tokens.typography.valueFont,
    fontSize: tokens.typography.labelSize,
    fontWeight: tokens.typography.valueWeight,
    radius: tokens.shape.cardRadius,
    padding: tokens.spacing.cardPadding,
    borderColor: tokens.colors.border,
    borderWidth: tokens.shape.borderWidth,
  };
  const textBase = {
    textColor: tokens.colors.text,
    fontFamily: tokens.typography.bodyFont,
    fontSize: tokens.typography.bodySize,
    fontWeight: tokens.typography.bodyWeight,
    lineHeight: tokens.typography.lineHeight,
  };
  return {
    ...commonVisualPatch(tokens),
    displayStyle: styleId || 'v3_grid_2x3',
    bgColor: tokens.colors.surface,
    headerBg: tokens.colors.secondarySurface,
    headerText: tokens.colors.text,
    textColor: tokens.colors.text,
    mutedColor: tokens.colors.mutedText,
    borderColor: tokens.colors.border,
    borderRadius: tokens.shape.rootRadius,
    cardRadius: tokens.shape.cardRadius,
    cardBg: tokens.colors.secondarySurface,
    progressColor: tokens.colors.primary,
    progressBgColor: tokens.colors.elevatedSurface,
    subElements: {
      widgetBackground: {
        background: tokens.colors.surface,
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        fontWeight: tokens.typography.bodyWeight,
        radius: tokens.shape.rootRadius,
        padding: tokens.spacing.rootPadding,
        gap: tokens.spacing.sectionGap,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        shadow,
        ...(tokens.materialTokens?.blurStrength ? { backdropBlur: tokens.materialTokens.blurStrength } : {}),
      },
      header: {
        background: tokens.colors.secondarySurface,
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
      },
      poolStat: statSurface,
      timerStat: statSurface,
      betsStat: statSurface,
      status: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.primary,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
        radius: tokens.shape.badgeRadius,
        padding: tokens.spacing.itemGap,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        states: {
          open: { background: tokens.colors.elevatedSurface, textColor: tokens.colors.primary },
          locked: { background: tokens.colors.elevatedSurface, textColor: tokens.colors.negative },
          result: { background: tokens.colors.elevatedSurface, textColor: tokens.colors.positive },
        },
      },
      betCards: {
        background: tokens.colors.secondarySurface,
        textColor: tokens.colors.text,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        gap: tokens.spacing.itemGap,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        shadow,
        states: {
          leading: { borderColor: tokens.colors.primary, shadow: glowShadow },
          winner: { borderColor: tokens.colors.positive, shadow: glowShadow },
          loser: { opacity: 0.72 },
          closed: { opacity: 0.88 },
        },
      },
      cardNumberBadge: {
        background: tokens.colors.primary,
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.valueWeight,
        radius: tokens.shape.badgeRadius,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
      },
      cardRangeText: {
        ...textBase,
        fontWeight: tokens.typography.valueWeight,
      },
      cardPercentageText: {
        textColor: tokens.colors.primary,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
        lineHeight: tokens.typography.lineHeight,
      },
      cardLabel: {
        ...textBase,
        textColor: tokens.colors.mutedText,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
      },
      footerInstruction: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.mutedText,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.itemGap,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
      },
    },
  };
}

function buildBHStatsPatch(tokens) {
  return {
    ...commonVisualPatch(tokens),
    displayStyle: tokens.material === 'metallic'
      ? 'metal'
      : tokens.material === 'glass' ? 'glass' : 'default',
    subElements: commonSubElements(tokens),
  };
}

const STYLE_CONFIG_KEYS = Object.freeze({
  chat: 'chatStyle',
  tournament: 'layout',
  container: null,
});

function styleKeyForWidget(widgetType) {
  if (Object.prototype.hasOwnProperty.call(STYLE_CONFIG_KEYS, widgetType)) return STYLE_CONFIG_KEYS[widgetType];
  return 'displayStyle';
}

function imageSubElement(tokens, extra = {}) {
  return {
    borderColor: tokens.colors.border,
    borderWidth: tokens.shape.borderWidth,
    radius: tokens.shape.cardRadius,
    imageFit: tokens.image?.fit || 'cover',
    imageSize: Math.round(44 * (tokens.image?.sizeMultiplier || 1)),
    ...extra,
  };
}

function textSubElement(tokens, tone = 'text', extra = {}) {
  const isMuted = tone === 'muted';
  const isAccent = tone === 'accent';
  const isPositive = tone === 'positive';
  const isNegative = tone === 'negative';
  return {
    textColor: isPositive
      ? tokens.colors.positive
      : isNegative
        ? tokens.colors.negative
        : isAccent
          ? tokens.colors.primary
          : isMuted
            ? tokens.colors.mutedText
            : tokens.colors.text,
    fontFamily: tokens.typography.bodyFont,
    fontSize: tokens.typography.bodySize,
    fontWeight: isAccent ? tokens.typography.valueWeight : tokens.typography.bodyWeight,
    lineHeight: tokens.typography.lineHeight,
    ...extra,
  };
}

function surfaceSubElement(tokens, variant = 'card', extra = {}) {
  const common = commonSubElements(tokens);
  if (variant === 'container') return { ...common.container, ...extra };
  if (variant === 'header') return {
    ...common.card,
    background: tokens.colors.secondarySurface,
    fontFamily: tokens.typography.headerFont,
    fontSize: tokens.typography.headerSize,
    fontWeight: tokens.typography.headerWeight,
    ...extra,
  };
  if (variant === 'badge') return {
    background: tokens.colors.primary,
    textColor: tokens.colors.text,
    accentColor: tokens.colors.accent,
    radius: tokens.shape.badgeRadius,
    padding: tokens.spacing.itemGap,
    borderColor: tokens.colors.border,
    borderWidth: tokens.shape.borderWidth,
    ...extra,
  };
  return { ...common.card, ...extra };
}

function buildGenericWidgetPatch(widgetType, tokens, styleId) {
  const styleKey = styleKeyForWidget(widgetType);
  const common = commonVisualPatch(tokens);
  const sub = commonSubElements(tokens);
  const patch = {
    ...common,
    bgColor: tokens.colors.surface,
    textColor: tokens.colors.text,
    mutedColor: tokens.colors.mutedText,
    borderColor: tokens.colors.border,
    borderWidth: tokens.shape.borderWidth,
    borderRadius: tokens.shape.rootRadius,
    cardRadius: tokens.shape.cardRadius,
    fontFamily: tokens.typography.bodyFont,
    fontSize: tokens.typography.bodySize,
    subElements: {
      ...sub,
      header: surfaceSubElement(tokens, 'header'),
      title: textSubElement(tokens, 'text', {
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
      }),
      bodyText: textSubElement(tokens, 'text'),
      badge: surfaceSubElement(tokens, 'badge'),
      image: imageSubElement(tokens),
    },
  };
  if (styleKey) patch[styleKey] = styleId;

  if (widgetType === 'current_slot') {
    patch.subElements = {
      ...patch.subElements,
      slotImage: imageSubElement(tokens, { borderColor: tokens.colors.primary }),
      slotTitle: textSubElement(tokens, 'text', {
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
      }),
      provider: textSubElement(tokens, 'muted'),
      stake: surfaceSubElement(tokens, 'badge', {
        textColor: tokens.colors.primary,
        accentColor: tokens.colors.primary,
        borderColor: tokens.colors.primary,
      }),
      stat: textSubElement(tokens, 'accent'),
    };
  }

  if (widgetType === 'chat') {
    const isGlowPanel = styleId === 'glow_panel';
    patch.headerBg = isGlowPanel ? 'rgba(2,12,25,0.82)' : tokens.colors.secondarySurface;
    patch.headerText = isGlowPanel ? tokens.colors.primary : tokens.colors.mutedText;
    patch.msgSpacing = tokens.spacing.itemGap;
    patch.msgPadH = tokens.spacing.cardPadding;
    patch.msgLineHeight = tokens.typography.lineHeight;
    patch.subElements = {
      ...patch.subElements,
      message: surfaceSubElement(tokens, 'card', {
        background: isGlowPanel ? 'transparent' : tokens.colors.secondarySurface,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        textColor: tokens.colors.text,
        borderColor: isGlowPanel ? 'rgba(34,211,238,0.045)' : tokens.colors.border,
        gap: tokens.spacing.itemGap,
      }),
      messageList: {
        background: 'transparent',
        gap: tokens.spacing.itemGap,
      },
      messageText: textSubElement(tokens, 'text', {
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        lineHeight: tokens.typography.lineHeight,
      }),
      username: textSubElement(tokens, 'accent', { fontWeight: tokens.typography.valueWeight }),
      avatar: surfaceSubElement(tokens, 'badge'),
      badge: surfaceSubElement(tokens, 'badge', { background: isGlowPanel ? tokens.colors.primary : tokens.colors.secondarySurface }),
      highlightedMessage: surfaceSubElement(tokens, 'card', {
        background: tokens.colors.accent,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.primary,
      }),
      platformLegend: surfaceSubElement(tokens, 'header', {
        textColor: tokens.colors.mutedText,
      }),
    };
  }

  if (widgetType === 'tournament') {
    patch.subElements = {
      ...patch.subElements,
      matchCard: surfaceSubElement(tokens, 'card'),
      playerName: textSubElement(tokens, 'text', { fontWeight: tokens.typography.valueWeight }),
      slotImage: imageSubElement(tokens),
      scoreValue: textSubElement(tokens, 'accent', { fontWeight: tokens.typography.valueWeight }),
      bracketLine: {
        background: tokens.colors.secondarySurface,
        fillColor: tokens.colors.primary,
        radius: tokens.shape.badgeRadius,
      },
      statusBadge: surfaceSubElement(tokens, 'badge'),
    };
  }

  if (widgetType === 'image_slideshow') {
    patch.gradientColor = tokens.colors.surface;
    patch.captionColor = tokens.colors.text;
    patch.captionSize = tokens.typography.bodySize;
    patch.captionFont = tokens.typography.bodyFont;
    patch.borderRadius = tokens.shape.rootRadius;
    patch.borderColor = tokens.colors.border;
    patch.borderWidth = tokens.shape.borderWidth;
    patch.subElements = {
      ...patch.subElements,
      image: imageSubElement(tokens, {
        borderColor: tokens.colors.border,
        radius: tokens.shape.rootRadius,
      }),
      caption: surfaceSubElement(tokens, 'card', {
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
      }),
      dots: surfaceSubElement(tokens, 'badge', { background: tokens.colors.primary }),
    };
  }

  if (widgetType === 'raid_shoutout') {
    patch.accentColor = tokens.colors.primary;
    patch.bgColor = tokens.colors.surface;
    patch.subtextColor = tokens.colors.mutedText;
    patch.alertDuration = undefined;
    patch.subElements = {
      ...patch.subElements,
      avatar: imageSubElement(tokens, { borderColor: tokens.colors.primary, radius: tokens.shape.badgeRadius }),
      subtitle: textSubElement(tokens, 'muted'),
      viewerCount: surfaceSubElement(tokens, 'badge', { background: tokens.colors.primary }),
      clipFrame: surfaceSubElement(tokens, 'card'),
    };
  }

  if (widgetType === 'bonus_buys') {
    patch.subElements = {
      ...patch.subElements,
      sessionCard: surfaceSubElement(tokens, 'container', {
        accentColor: tokens.colors.primary,
        fontFamily: tokens.typography.bodyFont,
      }),
      header: surfaceSubElement(tokens, 'header', {
        textColor: tokens.colors.primary,
        accentColor: tokens.colors.primary,
      }),
      slotArtwork: imageSubElement(tokens, { radius: tokens.shape.cardRadius }),
      label: textSubElement(tokens, 'muted'),
      status: surfaceSubElement(tokens, 'card'),
      profit: textSubElement(tokens, 'positive', { fontWeight: tokens.typography.valueWeight }),
      loss: textSubElement(tokens, 'negative', { fontWeight: tokens.typography.valueWeight }),
      payout: textSubElement(tokens, 'positive', { fontWeight: tokens.typography.valueWeight }),
      progressBar: {
        background: tokens.colors.secondarySurface,
        fillColor: tokens.colors.primary,
        radius: tokens.shape.badgeRadius,
      },
    };
  }

  if (widgetType === 'container') {
    patch.bgColor = tokens.colors.surface;
    patch.bgOpacity = Math.round((tokens.surfaces?.opacity || 0.94) * 100);
    patch.gap = tokens.spacing.itemGap;
    patch.padding = tokens.spacing.rootPadding;
    patch.cardRadius = tokens.shape.rootRadius;
    patch.subElements = {
      container: surfaceSubElement(tokens, 'container'),
      childArea: surfaceSubElement(tokens, 'card'),
    };
  }

  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
}

function buildBackgroundPatch(tokens, styleId) {
  const specialStyles = new Set(['aurora', 'matrix', 'starfield', 'waves', 'geometric']);
  const isSpecial = specialStyles.has(styleId);
  const primary = tokens.colors?.primary || '#0f172a';
  const accent = tokens.colors?.accent || '#14d8d8';
  const fill = tokens.colors?.secondarySurface || tokens.colors?.elevatedSurface || '#1e293b';
  const bgMode = isSpecial ? 'special' : 'texture';
  const displayStyle = isSpecial ? styleId : 'v1';
  return {
    displayStyle,
    bgMode,
    textureType: tokens.material === 'metallic'
      ? 'metallic'
      : tokens.material === 'glass'
        ? 'gloss'
        : 'gradient',
    color1: primary,
    color2: accent,
    color3: fill,
    gradientAngle: tokens.material === 'gradient' ? 135 : 145,
    animSpeed: tokens.motion?.durationMultiplier
      ? Math.round(clamp(8 * tokens.motion.durationMultiplier, 2, 30))
      : 8,
    opacity: 100,
    borderRadius: tokens.shape?.rootRadius || 0,
    overlayColor: tokens.material === 'glass' ? '#020617' : '#000000',
    overlayOpacity: tokens.material === 'glass' ? 10 : 0,
    imageFit: tokens.image?.fit || 'cover',
    imagePosition: 'center',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hueRotate: 0,
    grayscale: 0,
    sepia: 0,
    fxParticles: 'none',
    fxFog: 'none',
    fxGlimpse: 'none',
    fxGlimpseColor: accent,
    fxGlimpseSpeed: 50,
    subElements: {
      canvas: {
        background: primary,
        opacity: 1,
        radius: tokens.shape?.rootRadius || 0,
      },
      source: {
        bgMode,
      },
      texture: {
        textureType: tokens.material === 'metallic'
          ? 'metallic'
          : tokens.material === 'glass'
            ? 'gloss'
            : 'gradient',
        background: primary,
        accentColor: accent,
        fillColor: fill,
        gradientAngle: tokens.material === 'gradient' ? 135 : 145,
        patternSize: 24,
        animSpeed: tokens.motion?.durationMultiplier
          ? Math.round(clamp(8 * tokens.motion.durationMultiplier, 2, 30))
          : 8,
      },
      media: {
        imageFit: tokens.image?.fit || 'cover',
        backgroundPosition: 'center',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        hueRotate: 0,
        grayscale: 0,
        sepia: 0,
        opacity: 1,
      },
      tint: {
        background: tokens.material === 'glass' ? '#020617' : '#000000',
        opacity: tokens.material === 'glass' ? 0.1 : 0,
      },
      effects: {
        fxParticles: 'none',
        fxParticleColor: accent,
        fxParticleCount: 25,
        fxParticleSpeed: 50,
        fxParticleSize: 50,
        fxFog: 'none',
        fxFogColor: '#000000',
        fxGlimpse: 'none',
        fxGlimpseColor: accent,
        fxGlimpseSpeed: 50,
      },
    },
  };
}

function buildSpotifyPatch(tokens, styleId) {
  if (!['album_card', 'mini_player', 'vinyl', 'glass', 'wave', 'neon', 'metal', 'compact_bar'].includes(styleId)) return {};
  const cardShadow = tokens.materialTokens?.shadowIntensity > 0.02
    ? `0 ${px(tokens.materialTokens.shadowIntensity * 12)} ${px(tokens.materialTokens.shadowIntensity * 28)} ${tokens.colors.shadow}`
    : undefined;
  const imageSize = Math.round(44 * (tokens.image?.sizeMultiplier || 1));
  const animationDuration = Number((0.4 * clamp(tokens.motion?.durationMultiplier || 1, 0.6, 1.5)).toFixed(2));
  const baseSpotifyPatch = {
    ...commonVisualPatch(tokens),
    accentColor: tokens.colors.primary,
    bgColor: tokens.colors.surface,
    textColor: tokens.colors.text,
    mutedColor: tokens.colors.mutedText,
    fontFamily: tokens.typography.bodyFont,
    fontSize: tokens.typography.bodySize,
    fontWeight: tokens.typography.bodyWeight,
    borderRadius: tokens.shape.rootRadius,
    borderWidth: tokens.shape.borderWidth,
  };
  if (styleId === 'album_card') {
    const albumSizePercent = Math.round(42 * (tokens.image?.sizeMultiplier || 1));
    const pulseDuration = Number((1.5 * clamp(tokens.motion?.durationMultiplier || 1, 0.6, 1.5)).toFixed(2));
    return {
      ...commonVisualPatch(tokens),
      displayStyle: 'album_card',
      accentColor: tokens.colors.primary,
      bgColor: tokens.colors.surface,
      textColor: tokens.colors.text,
      mutedColor: tokens.colors.mutedText,
      fontFamily: tokens.typography.bodyFont,
      fontSize: tokens.typography.bodySize,
      fontWeight: tokens.typography.bodyWeight,
      borderRadius: tokens.shape.rootRadius,
      borderWidth: tokens.shape.borderWidth,
      subElements: {
        container: {
          background: tokens.colors.surface,
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: tokens.typography.bodySize,
          fontWeight: tokens.typography.bodyWeight,
          radius: tokens.shape.rootRadius,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
          ...(tokens.materialTokens?.blurStrength ? { backdropBlur: tokens.materialTokens.blurStrength } : {}),
        },
        albumArt: {
          visible: tokens.image?.visible !== false,
          imageSize: albumSizePercent,
          sizePercent: albumSizePercent,
          imageFit: tokens.image?.fit || 'cover',
          radius: tokens.image?.radius ?? tokens.shape.cardRadius,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
        },
        trackTitle: {
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: Math.max(14, tokens.typography.valueSize + 1),
          fontWeight: tokens.typography.valueWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        artistName: {
          textColor: tokens.colors.mutedText,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(12, tokens.typography.labelSize + 3),
          fontWeight: tokens.typography.labelWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        playbackState: {
          accentColor: tokens.colors.primary,
          textColor: tokens.colors.mutedText,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(11, tokens.typography.labelSize + 1),
          fontWeight: tokens.typography.labelWeight,
          animationEnabled: tokens.motion?.motionEnabled !== false,
          animationDuration: pulseDuration,
        },
        spotifyBadge: {
          accentColor: tokens.colors.primary,
          textColor: tokens.colors.primary,
        },
      },
    };
  }
  if (styleId === 'glass') {
    const glassAnimationDuration = Number((1.2 * clamp(tokens.motion?.durationMultiplier || 1, 0.6, 1.5)).toFixed(2));
    return {
      ...commonVisualPatch(tokens),
      displayStyle: 'glass',
      accentColor: tokens.colors.primary,
      bgColor: tokens.colors.surface,
      textColor: tokens.colors.text,
      mutedColor: tokens.colors.mutedText,
      fontFamily: tokens.typography.bodyFont,
      fontSize: tokens.typography.bodySize,
      fontWeight: tokens.typography.bodyWeight,
      borderRadius: tokens.shape.rootRadius,
      borderWidth: tokens.shape.borderWidth,
      subElements: {
        container: {
          background: tokens.colors.surface,
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: tokens.typography.bodySize,
          fontWeight: tokens.typography.bodyWeight,
          radius: tokens.shape.rootRadius,
          padding: tokens.spacing.rootPadding,
          gap: tokens.spacing.itemGap + 7,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
          backdropBlur: tokens.materialTokens?.blurStrength || 18,
        },
        albumArt: {
          visible: tokens.image?.visible !== false,
          imageSize: Math.round(72 * (tokens.image?.sizeMultiplier || 1)),
          imageFit: tokens.image?.fit || 'cover',
          radius: tokens.image?.radius ?? tokens.shape.cardRadius,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
        },
        trackTitle: {
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: Math.max(13, tokens.typography.bodySize + 3),
          fontWeight: tokens.typography.valueWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        artistName: {
          textColor: tokens.colors.mutedText,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(11, tokens.typography.labelSize + 3),
          fontWeight: tokens.typography.labelWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        playbackState: {
          accentColor: tokens.colors.primary,
          textColor: tokens.colors.mutedText,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(10, tokens.typography.labelSize + 1),
          fontWeight: tokens.typography.labelWeight,
          animationEnabled: tokens.motion?.motionEnabled !== false,
          animationDuration: glassAnimationDuration,
        },
      },
    };
  }
  if (styleId === 'wave') {
    const waveAnimationDuration = Number((0.32 * clamp(tokens.motion?.durationMultiplier || 1, 0.6, 1.5)).toFixed(2));
    return {
      ...baseSpotifyPatch,
      displayStyle: 'wave',
      subElements: {
        container: {
          background: tokens.colors.surface,
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: tokens.typography.bodySize,
          fontWeight: tokens.typography.bodyWeight,
          radius: tokens.shape.rootRadius,
          padding: Math.max(8, Math.round(tokens.spacing.rootPadding * 0.7)),
          gap: tokens.spacing.itemGap + 5,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
        },
        albumArt: {
          visible: tokens.image?.visible !== false,
          imageSize: Math.round(50 * (tokens.image?.sizeMultiplier || 1)),
          imageFit: tokens.image?.fit || 'cover',
          radius: tokens.image?.radius ?? tokens.shape.cardRadius,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
        },
        trackTitle: {
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: Math.max(12, tokens.typography.bodySize + 2),
          fontWeight: tokens.typography.valueWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        artistName: {
          textColor: tokens.colors.primary,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(10, tokens.typography.labelSize + 2),
          fontWeight: tokens.typography.labelWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        waveform: {
          accentColor: tokens.colors.primary,
          animationEnabled: tokens.motion?.motionEnabled !== false,
          animationDuration: waveAnimationDuration,
        },
        equalizer: {
          accentColor: tokens.colors.primary,
          animationEnabled: tokens.motion?.motionEnabled !== false,
          animationDuration,
        },
      },
    };
  }
  if (styleId === 'neon') {
    const pulseDuration = Number((1.1 * clamp(tokens.motion?.durationMultiplier || 1, 0.6, 1.5)).toFixed(2));
    return {
      ...baseSpotifyPatch,
      displayStyle: 'neon',
      subElements: {
        container: {
          background: tokens.colors.surface,
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: tokens.typography.bodySize,
          fontWeight: tokens.typography.bodyWeight,
          radius: tokens.shape.rootRadius,
          padding: Math.max(8, Math.round(tokens.spacing.rootPadding * 0.78)),
          gap: tokens.spacing.itemGap + 7,
          borderColor: tokens.colors.primary,
          borderWidth: Math.max(1, tokens.shape.borderWidth),
          shadow: `0 0 ${px((tokens.materialTokens?.glowIntensity || 0.2) * 44)} ${tokens.colors.primary}`,
        },
        albumArt: {
          visible: tokens.image?.visible !== false,
          imageSize: Math.round(56 * (tokens.image?.sizeMultiplier || 1)),
          imageFit: tokens.image?.fit || 'cover',
          radius: tokens.image?.radius ?? tokens.shape.cardRadius,
          borderColor: tokens.colors.primary,
          borderWidth: 2,
          shadow: `0 0 ${px((tokens.materialTokens?.glowIntensity || 0.22) * 56)} ${tokens.colors.primary}`,
        },
        trackTitle: {
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: Math.max(13, tokens.typography.bodySize + 3),
          fontWeight: tokens.typography.valueWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        artistName: {
          textColor: tokens.colors.primary,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(11, tokens.typography.labelSize + 3),
          fontWeight: tokens.typography.labelWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        playbackState: {
          accentColor: tokens.colors.primary,
          textColor: tokens.colors.primary,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(10, tokens.typography.labelSize + 1),
          fontWeight: tokens.typography.labelWeight,
          animationEnabled: tokens.motion?.motionEnabled !== false,
          animationDuration: pulseDuration,
        },
      },
    };
  }
  if (styleId === 'metal') {
    const metalAnimationDuration = Number((0.4 * clamp(tokens.motion?.durationMultiplier || 1, 0.6, 1.5)).toFixed(2));
    return {
      ...baseSpotifyPatch,
      displayStyle: 'metal',
      subElements: {
        container: {
          background: tokens.colors.surface,
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: tokens.typography.bodySize,
          fontWeight: tokens.typography.bodyWeight,
          radius: tokens.shape.rootRadius,
          padding: Math.max(8, Math.round(tokens.spacing.rootPadding * 0.72)),
          gap: tokens.spacing.itemGap + 5,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
        },
        albumArt: {
          visible: tokens.image?.visible !== false,
          imageSize: Math.round(52 * (tokens.image?.sizeMultiplier || 1)),
          imageFit: tokens.image?.fit || 'cover',
          radius: tokens.image?.radius ?? tokens.shape.cardRadius,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
        },
        trackTitle: {
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: Math.max(12, tokens.typography.bodySize + 2),
          fontWeight: tokens.typography.valueWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        artistName: {
          textColor: tokens.colors.mutedText,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(10, tokens.typography.labelSize + 2),
          fontWeight: tokens.typography.labelWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        playbackState: {
          accentColor: tokens.colors.primary,
          textColor: tokens.colors.mutedText,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(10, tokens.typography.labelSize + 1),
          fontWeight: tokens.typography.labelWeight,
        },
        equalizer: {
          accentColor: tokens.colors.primary,
          animationEnabled: tokens.motion?.motionEnabled !== false,
          animationDuration: metalAnimationDuration,
        },
      },
    };
  }
  if (styleId === 'vinyl') {
    const recordSizePercent = Math.round(55 * clamp(tokens.spacing?.scale || 1, 0.75, 1.3));
    const labelSizePercent = Math.round(38 * (tokens.image?.sizeMultiplier || 1));
    const spinDuration = Number((3 * clamp(tokens.motion?.durationMultiplier || 1, 0.6, 1.5)).toFixed(2));
    return {
      ...baseSpotifyPatch,
      displayStyle: 'vinyl',
      subElements: {
        container: {
          background: tokens.colors.surface,
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: tokens.typography.bodySize,
          fontWeight: tokens.typography.bodyWeight,
          radius: tokens.shape.rootRadius,
          gap: tokens.spacing.itemGap + 3,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
        },
        vinylRecord: {
          background: tokens.colors.secondarySurface,
          accentColor: tokens.colors.primary,
          sizePercent: recordSizePercent,
          radius: 999,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
          animationEnabled: tokens.motion?.motionEnabled !== false,
          animationDuration: spinDuration,
        },
        albumArt: {
          visible: tokens.image?.visible !== false,
          imageSize: labelSizePercent,
          sizePercent: labelSizePercent,
          imageFit: tokens.image?.fit || 'cover',
          radius: tokens.image?.radius ?? 999,
          borderColor: tokens.colors.primary,
          borderWidth: 2,
          shadow: `0 0 ${px((tokens.materialTokens?.glowIntensity || 0.18) * 44)} ${tokens.colors.primary}`,
        },
        trackTitle: {
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: Math.max(12, tokens.typography.bodySize + 2),
          fontWeight: tokens.typography.valueWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        artistName: {
          textColor: tokens.colors.primary,
          fontFamily: tokens.typography.labelFont,
          fontSize: Math.max(10, tokens.typography.labelSize + 2),
          fontWeight: tokens.typography.labelWeight,
          lineHeight: tokens.typography.lineHeight,
        },
      },
    };
  }
  if (styleId === 'mini_player') {
    return {
      ...commonVisualPatch(tokens),
      displayStyle: 'mini_player',
      accentColor: tokens.colors.primary,
      bgColor: tokens.colors.surface,
      textColor: tokens.colors.text,
      mutedColor: tokens.colors.mutedText,
      fontFamily: tokens.typography.bodyFont,
      fontSize: tokens.typography.bodySize,
      fontWeight: tokens.typography.bodyWeight,
      borderRadius: tokens.shape.rootRadius,
      borderWidth: tokens.shape.borderWidth,
      subElements: {
        container: {
          background: tokens.colors.surface,
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: tokens.typography.bodySize,
          fontWeight: tokens.typography.bodyWeight,
          radius: tokens.shape.rootRadius,
          padding: Math.max(6, Math.round(tokens.spacing.rootPadding * 0.58)),
          gap: tokens.spacing.itemGap + 3,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
          ...(tokens.materialTokens?.blurStrength ? { backdropBlur: tokens.materialTokens.blurStrength } : {}),
        },
        albumArt: {
          visible: tokens.image?.visible !== false,
          imageSize,
          imageFit: tokens.image?.fit || 'cover',
          radius: tokens.image?.radius ?? tokens.shape.cardRadius,
          borderColor: tokens.colors.border,
          borderWidth: tokens.shape.borderWidth,
          shadow: cardShadow,
        },
        trackTitle: {
          textColor: tokens.colors.text,
          fontFamily: tokens.typography.bodyFont,
          fontSize: Math.max(12, tokens.typography.bodySize + 1),
          fontWeight: tokens.typography.valueWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        artistName: {
          textColor: tokens.colors.mutedText,
          fontFamily: tokens.typography.labelFont,
          fontSize: tokens.typography.labelSize + 2,
          fontWeight: tokens.typography.labelWeight,
          lineHeight: tokens.typography.lineHeight,
        },
        playbackState: {
          accentColor: tokens.colors.primary,
          textColor: tokens.colors.mutedText,
          fontFamily: tokens.typography.labelFont,
          fontSize: tokens.typography.labelSize,
          fontWeight: tokens.typography.labelWeight,
        },
        equalizer: {
          accentColor: tokens.colors.primary,
          animationEnabled: tokens.motion?.motionEnabled !== false,
          animationDuration,
        },
      },
    };
  }

  const compactAnimationDuration = Number((0.35 * clamp(tokens.motion?.durationMultiplier || 1, 0.6, 1.5)).toFixed(2));
  return {
    ...commonVisualPatch(tokens),
    displayStyle: 'compact_bar',
    accentColor: tokens.colors.primary,
    bgColor: tokens.colors.surface,
    textColor: tokens.colors.text,
    mutedColor: tokens.colors.mutedText,
    progressColor: tokens.colors.primary,
    progressBgColor: tokens.colors.secondarySurface,
    fontFamily: tokens.typography.bodyFont,
    fontSize: tokens.typography.bodySize,
    fontWeight: tokens.typography.bodyWeight,
    borderRadius: tokens.shape.rootRadius,
    borderWidth: tokens.shape.borderWidth,
    subElements: {
      container: {
        background: tokens.colors.surface,
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        fontWeight: tokens.typography.bodyWeight,
        radius: tokens.shape.rootRadius,
        padding: Math.max(6, Math.round(tokens.spacing.rootPadding * 0.66)),
        gap: tokens.spacing.itemGap,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        shadow: cardShadow,
        ...(tokens.materialTokens?.blurStrength ? { backdropBlur: tokens.materialTokens.blurStrength } : {}),
      },
      albumArt: {
        visible: tokens.image?.visible !== false,
        imageSize,
        imageFit: tokens.image?.fit || 'cover',
        radius: tokens.image?.radius ?? tokens.shape.cardRadius,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        shadow: cardShadow,
      },
      spotifyBadge: {
        accentColor: tokens.colors.primary,
        textColor: tokens.colors.primary,
      },
      listenerBadge: {
        textColor: tokens.colors.mutedText,
      },
      trackTitle: {
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        fontWeight: tokens.typography.valueWeight,
        lineHeight: tokens.typography.lineHeight,
      },
      artistName: {
        textColor: tokens.colors.primary,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize + 1,
        fontWeight: tokens.typography.labelWeight,
        lineHeight: tokens.typography.lineHeight,
      },
      progressBar: {
        background: tokens.colors.secondarySurface,
        fillColor: tokens.colors.primary,
        radius: Math.max(2, Math.round(tokens.shape.badgeRadius * 0.25)),
      },
      timeLabel: {
        textColor: tokens.colors.mutedText,
        fontFamily: tokens.typography.labelFont,
        fontSize: Math.max(9, tokens.typography.labelSize - 1),
        fontWeight: tokens.typography.labelWeight,
        lineHeight: tokens.typography.lineHeight,
      },
      equalizer: {
        accentColor: tokens.colors.primary,
        animationEnabled: tokens.motion?.motionEnabled !== false,
        animationDuration: compactAnimationDuration,
      },
    },
  };
}

function buildBonusHuntPatch(tokens) {
  if (tokens?.isOriginalBaseline || tokens?.material === 'original') {
    return {};
  }
  const common = commonSubElements(tokens);
  const headerBg = tokens.material === 'transparent_obs'
    ? tokens.colors.secondarySurface
    : tokens.colors.surface;
  const cardSurface = {
    ...common.card,
    background: tokens.colors.secondarySurface,
    accentColor: tokens.colors.accent,
  };
  const listRowSurface = {
    ...common.card,
    background: tokens.colors.elevatedSurface,
    textColor: tokens.colors.text,
    states: {
      active: {
        borderColor: tokens.colors.primary,
        shadow: tokens.materialTokens?.glowIntensity > 0.01
          ? `0 0 ${px(tokens.materialTokens.glowIntensity * 32)} ${tokens.colors.glow}`
          : undefined,
      },
      opened: {
        opacity: 0.76,
      },
    },
  };
  return {
    accentColor: tokens.colors.accent,
    textColor: tokens.colors.text,
    mutedTextColor: tokens.colors.mutedText,
    statValueColor: tokens.colors.text,
    headerColor: headerBg,
    headerAccent: tokens.colors.accent,
    countCardColor: tokens.colors.secondarySurface,
    currentBonusColor: tokens.colors.elevatedSurface,
    currentBonusAccent: tokens.colors.primary,
    listCardColor: tokens.colors.secondarySurface,
    listCardAccent: tokens.colors.accent,
    summaryColor: tokens.colors.elevatedSurface,
    totalPayColor: tokens.colors.accent,
    totalPayText: tokens.colors.text,
    superBadgeColor: '#f5b301',
    extremeBadgeColor: tokens.colors.negative,
    cardOutlineColor: tokens.colors.border,
    cardOutlineWidth: tokens.material === 'minimal' || tokens.material === 'transparent_obs' ? 0 : 1,
    fontFamily: tokens.typography.bodyFont,
    fontSize: tokens.typography.bodySize,
    fontWeight: tokens.typography.bodyWeight,
    widgetScale: tokens.spacing.scale,
    autoSpeed: tokens.motion?.carouselIntervalMs,
    carouselAutoplay: tokens.motion?.carouselAutoplay,
    subElements: {
      container: {
        ...common.container,
        background: tokens.colors.surface,
      },
      headerContainer: {
        ...common.card,
        background: headerBg,
        accentColor: tokens.colors.accent,
      },
      mainStatsContainer: {
        background: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      statCell: common.statsCard,
      slotCarouselContainer: {
        padding: 0,
        gap: 0,
      },
      carouselBackdrop: {
        ...common.card,
        background: tokens.colors.elevatedSurface,
      },
      slotListContainer: cardSurface,
      bonusCard: cardSurface,
      slotRow: listRowSurface,
      rowStatsContainer: {
        background: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        radius: 0,
        padding: 0,
        opacity: 1,
      },
      requestsSectionContainer: {
        ...cardSurface,
        background: tokens.colors.secondarySurface,
      },
      footerContainer: {
        ...common.card,
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.mutedText,
      },
      huntTitle: {
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
      },
      headerTitle: {
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
      },
      statLabel: common.label,
      statValue: common.value,
      tagText: {
        textColor: tokens.colors.text,
        fontWeight: tokens.typography.valueWeight,
      },
      slotTitle: {
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        fontWeight: tokens.typography.bodyWeight + 100,
      },
      slotPositionNumber: {
        textColor: tokens.colors.mutedText,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
      },
      winLabel: common.label,
      multiplierLabel: common.label,
      betLabel: common.label,
      winValue: common.value,
      payoutValue: common.value,
      multiplierValue: common.value,
      betValue: {
        ...common.value,
        textColor: tokens.colors.mutedText,
      },
      progressBar: common.progressBar,
      progressBarFill: {
        background: tokens.colors.primary,
        fillColor: tokens.colors.primary,
      },
      progressCount: {
        textColor: tokens.colors.mutedText,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
      },
      profit: {
        textColor: tokens.colors.positive,
        accentColor: tokens.colors.positive,
      },
      loss: {
        textColor: tokens.colors.negative,
        accentColor: tokens.colors.negative,
      },
      openedState: {
        accentColor: '#f5b301',
      },
      footer: {
        textColor: tokens.colors.accent,
      },
      footerLabel: common.label,
      footerTotalValue: {
        textColor: tokens.colors.accent,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
        states: {
          success: { textColor: tokens.colors.positive },
          error: { textColor: tokens.colors.negative },
        },
      },
      requestsHeader: {
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.bodySize,
        fontWeight: tokens.typography.headerWeight,
      },
      requestsDescription: {
        textColor: tokens.colors.mutedText,
        fontSize: tokens.typography.labelSize,
      },
      requestsEmpty: {
        ...common.card,
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.mutedText,
      },
    },
  };
}

function buildSlotRequestsPatch(tokens, styleId) {
  const common = commonSubElements(tokens);
  const editableCompact = styleId === 'v3_compact_editable';
  const cardShadow = tokens.materialTokens?.shadowIntensity > 0.02
    ? `0 ${px(tokens.materialTokens.shadowIntensity * 12)} ${px(tokens.materialTokens.shadowIntensity * 30)} ${tokens.colors.shadow}`
    : undefined;
  const activeShadow = tokens.materialTokens?.glowIntensity > 0.01
    ? `0 0 ${px(tokens.materialTokens.glowIntensity * 34)} ${tokens.colors.glow}`
    : cardShadow;
  const rowBackground = tokens.material === 'transparent_obs'
    ? tokens.colors.elevatedSurface
    : tokens.colors.secondarySurface;
  return {
    ...commonVisualPatch(tokens),
    accentColor: tokens.colors.primary,
    bgColor: tokens.colors.surface,
    cardBg: rowBackground,
    mutedColor: tokens.colors.mutedText,
    widgetScale: tokens.spacing.scale,
    autoSpeed: tokens.motion?.carouselIntervalMs,
    carouselAutoplay: tokens.motion?.carouselAutoplay,
    subElements: {
      ...common,
      container: {
        ...common.container,
        background: tokens.colors.surface,
        textColor: tokens.colors.text,
      },
      header: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        gap: tokens.spacing.itemGap,
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
      },
      queueContainer: {
        background: tokens.colors.secondarySurface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        gap: tokens.spacing.itemGap,
        shadow: cardShadow,
      },
      requestCard: {
        background: rowBackground,
        textColor: tokens.colors.text,
        accentColor: tokens.colors.primary,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: Math.max(4, Math.round(tokens.spacing.cardPadding * 0.82)),
        gap: tokens.spacing.itemGap,
        shadow: cardShadow,
        states: {
          selected: { borderColor: tokens.colors.primary, shadow: activeShadow },
          playing: { borderColor: tokens.colors.warning, accentColor: tokens.colors.warning, shadow: activeShadow },
          completed: { borderColor: tokens.colors.positive, accentColor: tokens.colors.positive },
          rejected: { borderColor: tokens.colors.negative, accentColor: tokens.colors.negative },
        },
      },
      position: {
        background: tokens.colors.primary,
        textColor: tokens.colors.surfaceReference === '#f8fafc' ? '#07111f' : '#020617',
        accentColor: tokens.colors.primary,
        borderColor: tokens.colors.highlight,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.badgeRadius,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.valueWeight,
      },
      slotImage: {
        radius: Math.max(4, Math.round(tokens.shape.cardRadius * 0.72)),
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        ...(editableCompact ? {
          visible: tokens.image?.visible !== false,
          imageSize: Math.round(38 * (tokens.image?.sizeMultiplier || 1)),
          imageFit: tokens.image?.fit || 'cover',
          radius: tokens.image?.radius ?? Math.max(4, Math.round(tokens.shape.cardRadius * 0.72)),
        } : {}),
      },
      slotTitle: {
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        fontWeight: tokens.typography.valueWeight,
      },
      viewerName: {
        textColor: tokens.colors.mutedText,
        mutedColor: tokens.colors.mutedText,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
      },
      costBadge: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.text,
        accentColor: tokens.colors.accent,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.badgeRadius,
      },
      emptyState: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.mutedText,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        padding: tokens.spacing.rootPadding,
      },
      footer: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.mutedText,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        gap: tokens.spacing.itemGap,
      },
    },
  };
}

function buildRtpStatsPatch(tokens, styleId) {
  const common = commonSubElements(tokens);
  const isNeon = styleId === 'neon';
  const isMinimal = styleId === 'minimal';
  const isGlass = styleId === 'glass';
  const hasSecondColor = tokens.useAccentColor || tokens.useSecondColor;
  const surface = tokens.colors.surface;
  const secondary = tokens.colors.secondarySurface;
  const elevated = tokens.colors.elevatedSurface;
  const accent = tokens.colors.primary;
  const secondAccent = tokens.colors.accent || accent;
  const accentSurface = isGlass
    ? toRgba(secondAccent, hasSecondColor ? 0.28 : 0.16)
    : hasSecondColor ? mixHex(secondary, secondAccent, 0.28) : secondary;
  const shadow = tokens.materialTokens?.shadowIntensity > 0.02
    ? `0 ${px(tokens.materialTokens.shadowIntensity * 18)} ${px(tokens.materialTokens.shadowIntensity * 48)} ${tokens.colors.shadow}`
    : undefined;
  const glow = tokens.materialTokens?.glowIntensity > 0.01
    ? `0 0 ${px(tokens.materialTokens.glowIntensity * 46)} ${tokens.colors.glow}`
    : undefined;
  const combinedShadow = [shadow, glow].filter(Boolean).join(', ') || undefined;
  const barBgFrom = isNeon ? '#050510' : surface;
  const barBgVia = isMinimal ? surface : accentSurface;
  const barBgTo = isNeon ? '#050510' : surface;
  const warning = tokens.colors.warning;
  const barHeight = tokens.layout?.barHeight || Math.max(42, Math.min(92, Math.round(48 * tokens.spacing.scale)));
  const maxWidth = tokens.layout?.maxWidth || 960;
  const providerLogoHeight = Math.round(34 * (tokens.image?.sizeMultiplier || 1));
  const providerLogoRadius = tokens.image?.radius ?? 0;

  return {
    ...commonVisualPatch(tokens),
    displayStyle: styleId,
    barBgFrom,
    barBgVia,
    barBgTo,
    borderColor: isMinimal ? 'rgba(255,255,255,0.08)' : tokens.colors.border,
    borderWidth: isMinimal ? 0 : tokens.shape.borderWidth,
    borderRadius: tokens.shape.rootRadius,
    textColor: tokens.colors.text,
    providerColor: tokens.colors.text,
    slotNameColor: tokens.colors.text,
    labelColor: tokens.colors.mutedText,
    rtpIconColor: accent,
    potentialIconColor: warning,
    volatilityIconColor: secondAccent,
    bestWinIconColor: tokens.colors.positive,
    dividerColor: hasSecondColor ? secondAccent : tokens.colors.border,
    spinnerColor: accent,
    fontFamily: tokens.typography.bodyFont,
    fontSize: tokens.typography.bodySize,
    providerFontSize: tokens.typography.headerSize,
    fontWeight: tokens.typography.valueWeight,
    labelFontWeight: tokens.typography.labelWeight,
    paddingX: Math.max(2, Math.min(tokens.spacing.rootPadding, 14)),
    paddingY: Math.max(1, Math.min(tokens.spacing.cardPadding, 8)),
    barHeight,
    maxWidth,
    widgetScale: tokens.spacing.scale,
    subElements: {
      ...common,
      container: {
        ...common.container,
        background: surface,
        textColor: tokens.colors.text,
        borderColor: isMinimal ? 'transparent' : tokens.colors.border,
        borderWidth: isMinimal ? 0 : tokens.shape.borderWidth,
        radius: tokens.shape.rootRadius,
        height: barHeight,
        maxWidth,
        shadow: combinedShadow,
        glow,
      },
      provider: {
        textColor: tokens.colors.text,
        accentColor: secondAccent,
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
        imageSize: providerLogoHeight,
        radius: providerLogoRadius,
        imageFit: tokens.image?.fit || 'contain',
      },
      slotTitle: {
        textColor: tokens.colors.text,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
      },
      rtpValue: {
        textColor: tokens.colors.text,
        accentColor: accent,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
      },
      maxWin: {
        textColor: tokens.colors.text,
        accentColor: warning,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
      },
      volatility: {
        textColor: tokens.colors.text,
        accentColor: secondAccent,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
      },
      personalBest: {
        textColor: tokens.colors.text,
        accentColor: tokens.colors.positive,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
      },
      statCard: {
        background: secondary,
        textColor: tokens.colors.text,
        accentColor: accent,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        gap: tokens.spacing.itemGap,
        states: {
          positive: { textColor: tokens.colors.positive, accentColor: tokens.colors.positive },
          negative: { textColor: tokens.colors.negative, accentColor: tokens.colors.negative },
          highlight: { textColor: tokens.colors.warning, accentColor: tokens.colors.warning },
        },
      },
      label: {
        textColor: tokens.colors.mutedText,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
      },
      divider: {
        background: hasSecondColor ? secondAccent : tokens.colors.border,
        borderColor: hasSecondColor ? secondAccent : tokens.colors.border,
        accentColor: hasSecondColor ? secondAccent : tokens.colors.border,
      },
      spinner: {
        textColor: accent,
        accentColor: accent,
      },
    },
  };
}

function buildNavbarPatch(tokens, styleId) {
  const common = commonSubElements(tokens);
  const isRetro = styleId === 'retro';
  const isGlass = styleId === 'glass';
  const isMetallic = styleId === 'metallic';
  const shadow = tokens.materialTokens?.shadowIntensity > 0.02
    ? `0 ${px(tokens.materialTokens.shadowIntensity * 16)} ${px(tokens.materialTokens.shadowIntensity * 42)} ${tokens.colors.shadow}`
    : undefined;
  const glow = tokens.materialTokens?.glowIntensity > 0.01
    ? `0 0 ${px(tokens.materialTokens.glowIntensity * 42)} ${tokens.colors.glow}`
    : undefined;
  const combinedShadow = [shadow, glow].filter(Boolean).join(', ') || undefined;
  const imageSize = Math.round(42 * (tokens.image?.sizeMultiplier || 1));
  const logoImageSize = Math.round(54 * (tokens.image?.sizeMultiplier || 1));
  const barHeight = tokens.layout?.barHeight || Math.max(48, Math.min(92, Math.round(56 * tokens.spacing.scale)));
  const maxWidth = tokens.layout?.maxWidth || 1200;

  return {
    ...commonVisualPatch(tokens),
    displayStyle: styleId,
    accentColor: tokens.colors.primary,
    bgColor: tokens.colors.surface,
    textColor: tokens.colors.text,
    mutedColor: tokens.colors.mutedText,
    ctaColor: isRetro ? tokens.colors.warning : tokens.colors.accent,
    cryptoUpColor: tokens.colors.positive,
    cryptoDownColor: tokens.colors.negative,
    fontFamily: isRetro ? "'Press Start 2P', 'Courier New', monospace" : tokens.typography.bodyFont,
    fontSize: tokens.typography.bodySize,
    borderWidth: isRetro ? Math.max(2, tokens.shape.borderWidth) : tokens.shape.borderWidth,
    borderRadius: tokens.shape.rootRadius,
    barHeight,
    maxWidth,
    musicDisplayStyle: tokens.layout?.musicDisplayStyle || 'text',
    shadowSize: Math.round((tokens.materialTokens?.shadowIntensity || 0) * 32),
    shadowIntensity: Math.round((tokens.materialTokens?.shadowIntensity || 0) * 100),
    subElements: {
      ...common,
      container: {
        ...common.container,
        background: tokens.colors.surface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: isRetro ? Math.max(2, tokens.shape.borderWidth) : tokens.shape.borderWidth,
        radius: tokens.shape.rootRadius,
        padding: tokens.spacing.rootPadding,
        height: barHeight,
        maxWidth,
        gap: tokens.spacing.itemGap,
        shadow: combinedShadow,
        glow,
        ...(isGlass ? { backdropBlur: tokens.materialTokens?.blurStrength || 12 } : {}),
      },
      logo: {
        accentColor: tokens.colors.primary,
        radius: tokens.shape.badgeRadius,
      },
      avatar: {
        imageSize,
        imageFit: tokens.image?.fit || 'cover',
        radius: tokens.image?.radius ?? tokens.shape.badgeRadius,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
      },
      badgeImage: {
        imageSize: logoImageSize,
        imageFit: tokens.image?.fit || 'contain',
        radius: tokens.image?.radius ?? tokens.shape.cardRadius,
      },
      displayName: {
        textColor: tokens.colors.text,
        accentColor: tokens.colors.primary,
        fontFamily: isRetro ? "'Press Start 2P', 'Courier New', monospace" : tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
      },
      clock: {
        background: isMetallic ? tokens.colors.elevatedSurface : tokens.colors.primary,
        textColor: tokens.colors.text,
        accentColor: tokens.colors.primary,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.badgeRadius,
        padding: tokens.spacing.cardPadding,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
        shadow: combinedShadow,
      },
      music: {
        textColor: tokens.colors.mutedText,
        accentColor: tokens.colors.primary,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        fontWeight: tokens.typography.bodyWeight,
        states: {
          connected: { textColor: tokens.colors.text, accentColor: tokens.colors.primary },
          disconnected: { textColor: tokens.colors.mutedText, accentColor: tokens.colors.mutedText },
        },
      },
      sponsor: {
        background: tokens.colors.accent,
        textColor: '#ffffff',
        accentColor: tokens.colors.accent,
        borderColor: tokens.colors.highlight,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.badgeRadius,
        padding: tokens.spacing.cardPadding,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.valueWeight,
        shadow: combinedShadow,
      },
      crypto: {
        textColor: tokens.colors.text,
        accentColor: tokens.colors.negative,
        fillColor: tokens.colors.positive,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        fontWeight: tokens.typography.valueWeight,
        states: {
          positive: { textColor: tokens.colors.positive, fillColor: tokens.colors.positive },
          negative: { textColor: tokens.colors.negative, accentColor: tokens.colors.negative },
        },
      },
      balance: {
        textColor: tokens.colors.text,
        accentColor: tokens.colors.primary,
        borderColor: tokens.colors.mutedText,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
      },
      casino: {
        textColor: tokens.colors.primary,
        accentColor: tokens.colors.primary,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.valueWeight,
        imageSize: logoImageSize,
        imageFit: tokens.image?.fit || 'contain',
        radius: tokens.image?.radius ?? tokens.shape.cardRadius,
      },
      separator: {
        background: tokens.colors.border,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        opacity: 0.7,
      },
    },
  };
}

function buildGiveawayPatch(tokens) {
  const common = commonSubElements(tokens);
  const liveColor = tokens.colors.positive;
  const closedColor = tokens.colors.mutedText;
  const winnerColor = tokens.colors.warning;
  const statusShadow = tokens.materialTokens?.glowIntensity > 0.01
    ? `0 0 ${px(tokens.materialTokens.glowIntensity * 36)} ${tokens.colors.glow}`
    : undefined;
  const cardShadow = tokens.materialTokens?.shadowIntensity > 0.02
    ? `0 ${px(tokens.materialTokens.shadowIntensity * 12)} ${px(tokens.materialTokens.shadowIntensity * 30)} ${tokens.colors.shadow}`
    : undefined;
  return {
    ...commonVisualPatch(tokens),
    accentColor: tokens.colors.primary,
    bgColor: tokens.colors.surface,
    cardBg: tokens.colors.secondarySurface,
    mutedColor: tokens.colors.mutedText,
    widgetScale: tokens.spacing.scale,
    subElements: {
      ...common,
      container: {
        ...common.container,
        background: tokens.colors.surface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.rootRadius,
        padding: tokens.spacing.rootPadding,
      },
      header: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        gap: tokens.spacing.itemGap,
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
      },
      prize: {
        background: tokens.colors.secondarySurface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        fontFamily: tokens.typography.headerFont,
        fontSize: tokens.typography.headerSize,
        fontWeight: tokens.typography.headerWeight,
      },
      keyword: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.primary,
        accentColor: tokens.colors.primary,
        borderColor: tokens.colors.highlight,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.badgeRadius,
        padding: Math.max(3, Math.round(tokens.spacing.cardPadding * 0.65)),
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
        shadow: statusShadow,
      },
      counter: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
      },
      participantCount: {
        textColor: tokens.colors.text,
        accentColor: tokens.colors.primary,
        fontFamily: tokens.typography.valueFont,
        fontSize: tokens.typography.valueSize,
        fontWeight: tokens.typography.valueWeight,
      },
      statusBadge: {
        background: tokens.colors.elevatedSurface,
        textColor: closedColor,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.badgeRadius,
        padding: Math.max(3, Math.round(tokens.spacing.cardPadding * 0.55)),
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
        states: {
          live: {
            background: 'rgba(34,197,94,0.16)',
            textColor: liveColor,
            borderColor: 'rgba(34,197,94,0.36)',
            shadow: statusShadow,
          },
          closed: {
            background: tokens.colors.elevatedSurface,
            textColor: closedColor,
            borderColor: tokens.colors.border,
          },
          winner: {
            background: 'rgba(245,179,1,0.16)',
            textColor: winnerColor,
            borderColor: 'rgba(245,179,1,0.42)',
            shadow: statusShadow,
          },
        },
      },
      timer: {
        textColor: liveColor,
        fontFamily: tokens.typography.labelFont,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
      },
      winnerCard: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.text,
        accentColor: winnerColor,
        borderColor: tokens.colors.highlight,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        shadow: cardShadow || statusShadow,
        states: {
          winner: { accentColor: winnerColor, textColor: tokens.colors.text },
          drawing: { accentColor: tokens.colors.primary, textColor: tokens.colors.text },
        },
      },
      winnerArea: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.text,
        accentColor: winnerColor,
        borderColor: tokens.colors.highlight,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        shadow: cardShadow || statusShadow,
      },
      progressSection: {
        background: tokens.colors.secondarySurface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        gap: tokens.spacing.itemGap,
      },
      participantList: {
        background: tokens.colors.secondarySurface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        gap: tokens.spacing.itemGap,
      },
      emptyState: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.mutedText,
        fontFamily: tokens.typography.bodyFont,
        fontSize: tokens.typography.bodySize,
        padding: tokens.spacing.rootPadding,
      },
      celebration: {
        accentColor: tokens.colors.primary,
        fillColor: tokens.colors.warning,
        shadow: statusShadow,
      },
      footer: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.mutedText,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
        gap: tokens.spacing.itemGap,
      },
    },
  };
}

function buildPatchForWidget(widgetType, tokens, styleId) {
  if (tokens?.isOriginalBaseline || tokens?.material === 'original') return {};
  if (widgetType === 'bh_stats') return buildBHStatsPatch(tokens);
  if (widgetType === 'rtp_stats') return buildRtpStatsPatch(tokens, styleId);
  if (widgetType === 'navbar') return buildNavbarPatch(tokens, styleId);
  if (widgetType === 'spotify_now_playing') return buildSpotifyPatch(tokens, styleId);
  if (widgetType === 'bonus_hunt') return buildBonusHuntPatch(tokens);
  if (widgetType === 'slot_requests') return buildSlotRequestsPatch(tokens, styleId);
  if (widgetType === 'giveaway') return buildGiveawayPatch(tokens);
  if (widgetType === 'bets') return buildBetsPatch(tokens, styleId);
  if (widgetType === 'background') return buildBackgroundPatch(tokens, styleId);
  if ([
    'current_slot',
    'tournament',
    'chat',
    'image_slideshow',
    'raid_shoutout',
    'bonus_buys',
    'container',
  ].includes(widgetType)) return buildGenericWidgetPatch(widgetType, tokens, styleId);
  return {};
}

function filterGeneratedSubElements(widgetType, subElements = {}, styleId = '') {
  const next = deepMergeV2(subElements);
  if (widgetType === 'slot_requests' && styleId !== 'v3_compact_editable' && next.slotImage) {
    delete next.slotImage.imageSize;
    delete next.slotImage.width;
    delete next.slotImage.height;
    delete next.slotImage.imageFit;
    delete next.slotImage.visible;
  }
  if (widgetType === 'bonus_hunt') {
    for (const elementId of ['slotImage', 'slotThumbnail', 'slotListContainer', 'slotRow', 'container', 'headerContainer', 'footerContainer']) {
      if (!next[elementId]) continue;
      delete next[elementId].imageSize;
      delete next[elementId].width;
      delete next[elementId].height;
      delete next[elementId].minHeight;
      delete next[elementId].maxHeight;
    }
    for (const elementId of ['slotListContainer', 'slotRow', 'container', 'headerContainer', 'statCell', 'footerContainer']) {
      if (!next[elementId]) continue;
      delete next[elementId].padding;
      delete next[elementId].gap;
    }
  }
  if (widgetType === 'rtp_stats' && next.container) {
    delete next.container.padding;
    delete next.container.gap;
  }
  return next;
}

function filterUnsupportedSubElements(widgetType, subElements = {}, styleId = '') {
  const next = deepMergeV2(subElements);
  if (widgetType === 'slot_requests' && styleId !== 'v3_compact_editable' && next.slotImage) {
    delete next.slotImage.imageSize;
    delete next.slotImage.width;
    delete next.slotImage.height;
    delete next.slotImage.imageFit;
    delete next.slotImage.visible;
  }
  if (widgetType === 'rtp_stats' && next.container) {
    delete next.container.padding;
    delete next.container.gap;
  }
  return next;
}

function migrateBetsLegacySubElements(subElements = {}) {
  if (!isObject(subElements)) return {};
  const mapped = {};
  const copyLegacy = (from, to) => {
    if (isObject(subElements[from])) mapped[to] = deepMergeV2(mapped[to] || {}, subElements[from]);
  };
  copyLegacy('container', 'widgetBackground');
  copyLegacy('title', 'header');
  copyLegacy('header', 'header');
  copyLegacy('statistics', 'poolStat');
  copyLegacy('statistics', 'timerStat');
  copyLegacy('statistics', 'betsStat');
  copyLegacy('optionCard', 'betCards');
  copyLegacy('optionRow', 'betCards');
  copyLegacy('optionNumber', 'cardNumberBadge');
  copyLegacy('optionLabel', 'cardRangeText');
  copyLegacy('percentage', 'cardPercentageText');
  copyLegacy('footer', 'footerInstruction');
  return deepMergeV2(mapped, subElements);
}

function inheritedSubElementsForWidget(widgetType, config = {}) {
  if (widgetType === 'bonus_hunt') return {};
  if (widgetType === 'bets') return migrateBetsLegacySubElements(config.subElements || {});
  return config.subElements || {};
}

const BONUS_HUNT_GENERIC_VISUAL_KEYS = Object.freeze([
  'accentColor',
  'bgColor',
  'cardBg',
  'textColor',
  'mutedColor',
  'borderColor',
  'borderRadius',
  'borderWidth',
  'cardRadius',
  'cardBorder',
  'cardBorderWidth',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'progressColor',
  'progressBgColor',
  'bestColor',
  'worstColor',
  'shadowSize',
  'shadowIntensity',
  'widgetScale',
  'headerColor',
  'headerAccent',
  'countCardColor',
  'currentBonusColor',
  'currentBonusAccent',
  'listCardColor',
  'listCardAccent',
  'summaryColor',
  'totalPayColor',
  'totalPayText',
  'superBadgeColor',
  'extremeBadgeColor',
  'statValueColor',
  'mutedTextColor',
  'cardOutlineColor',
  'cardOutlineWidth',
  'cardPadding',
  'cardGap',
  'slotImageHeight',
]);

function stripInheritedBonusHuntVisualDefaults(config = {}) {
  const baseKeys = new Set(config.__appearanceBaseConfigKeys || []);
  const next = { ...config };
  for (const key of BONUS_HUNT_GENERIC_VISUAL_KEYS) {
    if (!baseKeys.has(key)) delete next[key];
  }
  return next;
}

export function buildWidgetV2CssVars(tokens = {}) {
  if (!tokens.colors || tokens.isOriginalBaseline || tokens.material === 'original') return {};
  return {
    '--sc-v2-primary': tokens.colors.primary,
    '--sc-v2-accent': tokens.colors.accent,
    '--sc-v2-surface': tokens.colors.surface,
    '--sc-v2-surface-secondary': tokens.colors.secondarySurface,
    '--sc-v2-surface-elevated': tokens.colors.elevatedSurface,
    '--sc-v2-border': tokens.colors.border,
    '--sc-v2-highlight': tokens.colors.highlight,
    '--sc-v2-text': tokens.colors.text,
    '--sc-v2-muted': tokens.colors.mutedText,
    '--sc-v2-positive': tokens.colors.positive,
    '--sc-v2-negative': tokens.colors.negative,
    '--sc-v2-warning': tokens.colors.warning,
    '--sc-v2-shadow': tokens.colors.shadow,
    '--sc-v2-glow': tokens.colors.glow,
    '--sc-v2-root-radius': px(tokens.shape.rootRadius),
    '--sc-v2-card-radius': px(tokens.shape.cardRadius),
    '--sc-v2-border-width': px(tokens.shape.borderWidth),
    '--sc-v2-root-padding': px(tokens.spacing.rootPadding),
    '--sc-v2-card-padding': px(tokens.spacing.cardPadding),
    '--sc-v2-section-gap': px(tokens.spacing.sectionGap),
    '--sc-v2-item-gap': px(tokens.spacing.itemGap),
    '--sc-v2-body-font': tokens.typography.bodyFont,
    '--sc-v2-header-font': tokens.typography.headerFont,
    '--sc-v2-body-size': px(tokens.typography.bodySize),
    '--sc-v2-header-size': px(tokens.typography.headerSize),
    '--sc-v2-value-size': px(tokens.typography.valueSize),
    '--sc-v2-label-size': px(tokens.typography.labelSize),
    '--sc-v2-transition': `${tokens.motion.transitionDuration}ms`,
    '--sc-v2-blur': px(tokens.materialTokens.blurStrength || 0),
  };
}

export function applyWidgetAppearanceV2ToConfig(widget, config, appearance = {}, options = {}) {
  if (!widget || !isWidgetAppearanceV2Enabled(widget.widget_type)) return config;
  const resolved = resolveWidgetAppearanceV2({ ...widget, config }, appearance, options);
  if (!resolved) return config;
  const isOriginalBaseline = resolved.tokens?.isOriginalBaseline || resolved.tokens?.material === 'original';
  const patch = buildPatchForWidget(widget.widget_type, resolved.tokens, resolved.styleId);
  const explicitSubElements = config.__appearanceExplicitSubElements || {};
  const generatedSubElements = filterGeneratedSubElements(widget.widget_type, patch.subElements || {}, resolved.styleId);
  const v2ElementOverrides = resolved.appearance.elementOverrides || {};
  const inheritedSubElements = inheritedSubElementsForWidget(widget.widget_type, config);
  const mergedSubElements = widget.widget_type === 'bets'
    ? deepMergeV2(generatedSubElements, inheritedSubElements, explicitSubElements, v2ElementOverrides)
    : deepMergeV2(inheritedSubElements, generatedSubElements, explicitSubElements, v2ElementOverrides);
  const finalSubElements = filterUnsupportedSubElements(widget.widget_type, mergedSubElements, resolved.styleId);
  const next = {
    ...(isOriginalBaseline && widget.widget_type === 'bonus_hunt'
      ? stripInheritedBonusHuntVisualDefaults(config)
      : config),
    ...patch,
    subElements: finalSubElements,
    __appearanceExplicitSubElements: finalSubElements,
    __appearanceV2: {
      schemaVersion: APPEARANCE_V2_SCHEMA_VERSION,
      widgetId: widget.widget_type,
      material: resolved.appearance.simple.material,
      simple: resolved.appearance.simple,
      tokens: resolved.tokens,
      validation: resolved.tokens.validation || [],
      unsupportedProperties: resolved.capability?.unsupportedProperties || [],
    },
    __appearanceV2Vars: buildWidgetV2CssVars(resolved.tokens),
  };
  return next;
}

export function buildAppearanceV2ForStorage(widgetType, simple, previous = {}) {
  const normalized = normalizeWidgetAppearanceV2(widgetType, {
    ...previous,
    simple,
  });
  return {
    ...previous,
    ...normalized,
    updatedAt: new Date().toISOString(),
  };
}

export function getSimpleAppearanceV2Settings(appearance, root, widgetType) {
  if (!root) return normalizeSimpleAppearanceV2(DEFAULT_SIMPLE_APPEARANCE_V2);
  const segments = root.split('.');
  let cursor = appearance;
  for (const segment of segments) cursor = cursor?.[segment];
  const stored = cursor?.appearanceV2?.simple || cursor?.appearance?.appearanceV2?.simple;
  if (stored) return normalizeSimpleAppearanceV2(stored);
  const legacy = cursor?.appearance?.simpleSettings || cursor?.simpleSettings;
  return normalizeSimpleAppearanceV2({
    ...(getWidgetAppearanceCapability(widgetType)?.defaultAppearance || DEFAULT_SIMPLE_APPEARANCE_V2),
    ...(legacy || {}),
  });
}
