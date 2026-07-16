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

function readCandidateEntries(appearance = {}, widget, styleId) {
  const widgetType = widget?.widget_type;
  const widgetId = widget?.id;
  return [
    appearance.widgetTypes?.[widgetType],
    appearance.widgetTypes?.[widgetType]?.styles?.[styleId],
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
  const entries = readCandidateEntries(appearance, widget, styleId);
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

function buildBHStatsPatch(tokens) {
  return {
    ...commonVisualPatch(tokens),
    displayStyle: tokens.material === 'metallic'
      ? 'metal'
      : tokens.material === 'glass' ? 'glass' : 'default',
    subElements: commonSubElements(tokens),
  };
}

function buildBonusHuntPatch(tokens) {
  const common = commonSubElements(tokens);
  const headerBg = tokens.material === 'transparent_obs'
    ? tokens.colors.secondarySurface
    : tokens.colors.surface;
  return {
    ...commonVisualPatch(tokens),
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
    statValueColor: tokens.colors.text,
    mutedTextColor: tokens.colors.mutedText,
    cardOutlineColor: tokens.colors.border,
    cardOutlineWidth: tokens.shape.borderWidth,
    cardPadding: tokens.spacing.cardPadding,
    cardGap: tokens.spacing.itemGap,
    subElements: {
      ...common,
      header: {
        background: headerBg,
        accentColor: tokens.colors.accent,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
      },
      headerContainer: {
        background: headerBg,
        accentColor: tokens.colors.accent,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
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
      mainStatsContainer: {
        background: 'transparent',
        gap: tokens.spacing.itemGap,
      },
      statCell: {
        background: tokens.colors.elevatedSurface,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: Math.max(4, Math.round(tokens.spacing.cardPadding * 0.75)),
      },
      statLabel: common.label,
      statValue: common.value,
      tagContainer: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.badgeRadius,
      },
      tagText: {
        textColor: tokens.colors.text,
        fontWeight: tokens.typography.valueWeight,
      },
      bonusCard: {
        ...common.statsCard,
        background: tokens.colors.secondarySurface,
      },
      slotListContainer: {
        ...common.statsCard,
        background: tokens.colors.secondarySurface,
      },
      slotCarouselContainer: {
        gap: tokens.spacing.itemGap,
        padding: tokens.spacing.itemGap,
      },
      slotRow: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.text,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: Math.max(4, Math.round(tokens.spacing.cardPadding * 0.72)),
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
      slotThumbnail: {
        radius: Math.max(4, Math.round(tokens.shape.cardRadius * 0.72)),
      },
      slotImage: {
        radius: Math.max(4, Math.round(tokens.shape.cardRadius * 0.72)),
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
        radius: tokens.shape.badgeRadius,
      },
      progressCount: {
        textColor: tokens.colors.mutedText,
        fontSize: tokens.typography.labelSize,
        fontWeight: tokens.typography.labelWeight,
      },
      profit: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.positive,
        accentColor: tokens.colors.positive,
      },
      loss: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.negative,
        accentColor: tokens.colors.negative,
      },
      openedState: {
        accentColor: '#f5b301',
      },
      footer: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.accent,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
      },
      footerContainer: {
        background: tokens.colors.elevatedSurface,
        textColor: tokens.colors.accent,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
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
      requestsSectionContainer: {
        background: tokens.colors.secondarySurface,
        borderColor: tokens.colors.border,
        borderWidth: tokens.shape.borderWidth,
        radius: tokens.shape.cardRadius,
        padding: tokens.spacing.cardPadding,
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
        textColor: tokens.colors.mutedText,
        background: tokens.colors.elevatedSurface,
        borderColor: tokens.colors.border,
        radius: tokens.shape.cardRadius,
      },
    },
  };
}

function buildPatchForWidget(widgetType, tokens) {
  if (widgetType === 'bh_stats') return buildBHStatsPatch(tokens);
  if (widgetType === 'bonus_hunt') return buildBonusHuntPatch(tokens);
  return {};
}

export function buildWidgetV2CssVars(tokens = {}) {
  if (!tokens.colors) return {};
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
  const patch = buildPatchForWidget(widget.widget_type, resolved.tokens);
  const explicitSubElements = config.__appearanceExplicitSubElements || {};
  const generatedSubElements = patch.subElements || {};
  const v2ElementOverrides = resolved.appearance.elementOverrides || {};
  const finalSubElements = deepMergeV2(
    config.subElements || {},
    generatedSubElements,
    explicitSubElements,
    v2ElementOverrides
  );
  const next = {
    ...config,
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
