import { themeMap } from '../../../data/appThemes';
import { getWidgetDef } from '../widgets/widgetRegistry';

export const APPEARANCE_SCHEMA_VERSION = 1;

export const RESET_VALUE = '__inherit__';

export const SYSTEM_APPEARANCE = {
  schemaVersion: APPEARANCE_SCHEMA_VERSION,
  themeId: 'classic',
  mode: 'dark',
  canvas: {
    width: 1920,
    height: 1080,
    backgroundType: 'transparent',
    backgroundColor: '#000000',
    gradientType: 'linear',
    gradientAngle: 135,
    gradientFrom: '#080d14',
    gradientTo: '#111827',
    imageUrl: '',
    videoUrl: '',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 1,
    tintColor: '#000000',
    tintOpacity: 0,
    blur: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    vignette: 0,
    safeArea: false,
    overflow: 'hidden',
  },
  colors: {
    primary: '#14b8a6',
    secondary: '#0f172a',
    accent: '#f59e0b',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#60a5fa',
    background: '#080d14',
    backgroundAlt: '#0f172a',
    surface: 'rgba(15,23,42,0.86)',
    elevated: 'rgba(30,41,59,0.9)',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    muted: '#94a3b8',
    border: 'rgba(148,163,184,0.22)',
    divider: 'rgba(148,163,184,0.16)',
    inputBg: 'rgba(2,6,23,0.64)',
    buttonBg: '#14b8a6',
    buttonText: '#ffffff',
    positive: '#86efac',
    negative: '#fca5a5',
    highlight: '#fde68a',
    focus: '#5eead4',
  },
  typography: {
    headingFont: "'Inter', 'Segoe UI', sans-serif",
    bodyFont: "'Inter', 'Segoe UI', sans-serif",
    numberFont: "'Inter', 'Segoe UI', sans-serif",
    buttonFont: "'Inter', 'Segoe UI', sans-serif",
    headingWeight: 850,
    bodyWeight: 600,
    buttonWeight: 800,
    baseSize: 14,
    headingScale: 1.22,
    lineHeight: 1.45,
    letterSpacing: 0,
    textTransform: 'none',
    textAlign: 'left',
    textShadow: 'none',
    mobileScale: 0.92,
  },
  surfaces: {
    preset: 'soft',
    containerBg: 'rgba(15,23,42,0.86)',
    cardBg: 'rgba(255,255,255,0.05)',
    headerBg: 'rgba(255,255,255,0.06)',
    footerBg: 'rgba(2,6,23,0.35)',
    opacity: 0.92,
    glass: false,
    blur: 10,
    padding: 14,
    gap: 10,
    density: 'standard',
    minWidth: 0,
    minHeight: 0,
  },
  borders: {
    enabled: true,
    width: 1,
    style: 'solid',
    color: 'rgba(148,163,184,0.22)',
    opacity: 1,
    radius: 12,
    linkedCorners: true,
    topLeft: 12,
    topRight: 12,
    bottomRight: 12,
    bottomLeft: 12,
    accentEdge: false,
    edgeColor: '#14b8a6',
    shape: 'rounded',
  },
  spacing: {
    scale: 1,
    widgetScale: 1,
    padding: 14,
    gap: 10,
    margin: 0,
    headerHeight: 44,
    buttonHeight: 44,
    iconSize: 18,
    badgeSize: 22,
    statSize: 22,
  },
  effects: {
    preset: 'soft_shadow',
    shadowEnabled: true,
    shadowColor: '#000000',
    shadowBlur: 24,
    shadowSpread: 0,
    shadowX: 0,
    shadowY: 12,
    shadowOpacity: 0.32,
    innerShadow: false,
    glowEnabled: false,
    glowColor: '#14b8a6',
    glowBlur: 20,
    glowOpacity: 0.24,
    backdropBlur: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    textureOpacity: 0,
  },
  motion: {
    enabled: true,
    intensity: 'subtle',
    entrance: 'fade',
    exit: 'fade',
    update: 'fade',
    hover: 'lift',
    celebration: 'subtle',
    duration: 350,
    delay: 0,
    easing: 'ease-out',
    stagger: 40,
    reducedMotion: false,
  },
  controls: {
    primaryBg: '#14b8a6',
    primaryText: '#ffffff',
    secondaryBg: 'rgba(15,23,42,0.72)',
    secondaryText: '#e5edf6',
    destructiveBg: 'rgba(127,29,29,0.45)',
    destructiveText: '#fecaca',
    inputBg: 'rgba(2,6,23,0.64)',
    inputText: '#f8fafc',
    radius: 8,
    borderColor: 'rgba(148,163,184,0.22)',
    focusColor: '#5eead4',
    disabledOpacity: 0.48,
  },
  responsive: {
    previewWidth: 1920,
    previewHeight: 1080,
    fontScale: 1,
    compactBelow: 1280,
    mobileScale: 0.88,
    safeZone: 48,
    overflow: 'clip',
    hideDecorativeOnSmall: true,
  },
  branding: {
    displayName: '',
    logoUrl: '',
    avatarUrl: '',
    sponsorLogoUrl: '',
    watermark: '',
    socialHandle: '',
    fallbackImageUrl: '',
  },
  widgetTypes: {},
  widgets: {},
  advanced: {
    customCss: '',
  },
};

const VISUAL_CONFIG_KEYS = [
  'accentColor',
  'bgColor',
  'cardBg',
  'textColor',
  'mutedColor',
  'borderColor',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'borderRadius',
  'cardRadius',
  'borderWidth',
  'cardBorderWidth',
  'containerPadding',
  'cardGap',
  'paddingX',
  'paddingY',
  'brightness',
  'contrast',
  'saturation',
  'blur',
  'shadowSize',
  'shadowIntensity',
  'animSpeed',
  'barBgFrom',
  'barBgVia',
  'barBgTo',
  'providerColor',
  'slotNameColor',
  'labelColor',
  'dividerColor',
  'progressColor',
  'progressBgColor',
  'bestColor',
  'worstColor',
  'headerBg',
  'headerText',
  'buttonBg',
  'buttonText',
];

const WIDGET_ONLY_KEYS = new Set(['displayStyle', 'layout', 'chatStyle']);

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge(...sources) {
  const result = {};
  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue;
      if (value === RESET_VALUE) {
        delete result[key];
      } else if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = deepMerge(result[key], value);
      } else if (isPlainObject(value)) {
        result[key] = deepMerge(value);
      } else if (Array.isArray(value)) {
        result[key] = [...value];
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

export function getByPath(source, path) {
  return String(path || '').split('.').filter(Boolean).reduce((acc, part) => acc?.[part], source);
}

export function setByPath(source, path, value) {
  const parts = String(path || '').split('.').filter(Boolean);
  if (parts.length === 0) return source;
  const next = Array.isArray(source) ? [...source] : { ...(source || {}) };
  let cursor = next;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      if (value === RESET_VALUE) delete cursor[part];
      else cursor[part] = value;
      return;
    }
    cursor[part] = Array.isArray(cursor[part])
      ? [...cursor[part]]
      : { ...(cursor[part] || {}) };
    cursor = cursor[part];
  });
  return next;
}

export function omitPath(source, path) {
  return setByPath(source, path, RESET_VALUE);
}

export function clampNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function isColorLike(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)
    || /^rgba?\([^)]+\)$/i.test(v)
    || /^hsla?\([^)]+\)$/i.test(v)
    || v === 'transparent';
}

function sanitizeColor(value, fallback) {
  if (isColorLike(value)) return value.trim();
  return fallback;
}

export function getThemeAppearance(themeId = 'classic') {
  const theme = themeMap[themeId] || themeMap.classic || {};
  const colors = theme.colors || {};
  return {
    themeId,
    colors: {
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      background: colors.background,
      backgroundAlt: colors.secondary,
      surface: colors.surface,
      elevated: colors.surface,
      text: colors.text,
      textSecondary: colors.text,
      muted: colors.muted,
      border: colors.border,
      divider: colors.border,
      buttonBg: colors.primary,
      focus: colors.accent,
    },
    typography: {
      headingFont: theme.font,
      bodyFont: theme.font,
      numberFont: theme.font,
      buttonFont: theme.font,
    },
    surfaces: {
      preset: theme.material || 'soft',
      containerBg: colors.surface,
      cardBg: colors.surface,
    },
    borders: {
      color: colors.border,
      edgeColor: colors.accent,
    },
    controls: {
      primaryBg: colors.primary,
      focusColor: colors.accent,
      borderColor: colors.border,
    },
  };
}

export function migrateThemeToAppearance(theme = {}) {
  const themeId = theme?.style_preset || 'classic';
  return deepMerge(getThemeAppearance(themeId), {
    themeId,
    canvas: {
      width: Number(theme?.canvas_width) || 1920,
      height: Number(theme?.canvas_height) || 1080,
      backgroundType: theme?.background_type || 'transparent',
    },
    colors: {
      primary: theme?.primary_color,
      secondary: theme?.secondary_color,
      accent: theme?.accent_color,
      text: theme?.text_color,
      textSecondary: theme?.text_color,
      buttonBg: theme?.primary_color,
      focus: theme?.accent_color,
    },
    typography: {
      headingFont: theme?.font_family,
      bodyFont: theme?.font_family,
      numberFont: theme?.font_family,
      buttonFont: theme?.font_family,
      bodyWeight: theme?.font_weight,
    },
    surfaces: {
      opacity: theme?.opacity,
      blur: theme?.blur_intensity,
    },
    borders: {
      radius: theme?.border_radius,
      topLeft: theme?.border_radius,
      topRight: theme?.border_radius,
      bottomRight: theme?.border_radius,
      bottomLeft: theme?.border_radius,
    },
    effects: {
      shadowOpacity: theme?.shadow_strength,
      glowOpacity: theme?.glow_intensity,
      backdropBlur: theme?.blur_intensity,
    },
    motion: {
      duration: theme?.animation_speed ? Math.round(Number(theme.animation_speed) * 350) : undefined,
    },
    advanced: {
      customCss: theme?.custom_css || '',
    },
  });
}

export function normalizeAppearance(input = {}, context = {}) {
  const themeId = input?.themeId || context.theme?.style_preset || 'classic';
  const migrated = migrateThemeToAppearance(context.theme || {});
  const merged = deepMerge(
    SYSTEM_APPEARANCE,
    getThemeAppearance(themeId),
    migrated,
    input,
    { schemaVersion: APPEARANCE_SCHEMA_VERSION, themeId }
  );

  return {
    ...merged,
    canvas: {
      ...merged.canvas,
      width: clampNumber(merged.canvas.width, 320, 7680, 1920),
      height: clampNumber(merged.canvas.height, 240, 4320, 1080),
      opacity: clampNumber(merged.canvas.opacity, 0, 1, 1),
      tintOpacity: clampNumber(merged.canvas.tintOpacity, 0, 1, 0),
      blur: clampNumber(merged.canvas.blur, 0, 40, 0),
      brightness: clampNumber(merged.canvas.brightness, 0, 200, 100),
      contrast: clampNumber(merged.canvas.contrast, 0, 200, 100),
      saturation: clampNumber(merged.canvas.saturation, 0, 200, 100),
      vignette: clampNumber(merged.canvas.vignette, 0, 100, 0),
    },
    colors: Object.fromEntries(Object.entries(merged.colors).map(([key, value]) => (
      [key, sanitizeColor(value, SYSTEM_APPEARANCE.colors[key] || '#ffffff')]
    ))),
    typography: {
      ...merged.typography,
      baseSize: clampNumber(merged.typography.baseSize, 8, 40, 14),
      headingScale: clampNumber(merged.typography.headingScale, 0.8, 3, 1.22),
      lineHeight: clampNumber(merged.typography.lineHeight, 1, 2.4, 1.45),
      letterSpacing: clampNumber(merged.typography.letterSpacing, 0, 0.2, 0),
      mobileScale: clampNumber(merged.typography.mobileScale, 0.6, 1.4, 0.92),
    },
    surfaces: {
      ...merged.surfaces,
      opacity: clampNumber(merged.surfaces.opacity, 0, 1, 0.92),
      blur: clampNumber(merged.surfaces.blur, 0, 40, 10),
      padding: clampNumber(merged.surfaces.padding, 0, 80, 14),
      gap: clampNumber(merged.surfaces.gap, 0, 64, 10),
    },
    borders: {
      ...merged.borders,
      width: clampNumber(merged.borders.width, 0, 16, 1),
      opacity: clampNumber(merged.borders.opacity, 0, 1, 1),
      radius: clampNumber(merged.borders.radius, 0, 80, 12),
      topLeft: clampNumber(merged.borders.topLeft, 0, 80, 12),
      topRight: clampNumber(merged.borders.topRight, 0, 80, 12),
      bottomRight: clampNumber(merged.borders.bottomRight, 0, 80, 12),
      bottomLeft: clampNumber(merged.borders.bottomLeft, 0, 80, 12),
    },
    spacing: {
      ...merged.spacing,
      scale: clampNumber(merged.spacing.scale, 0.5, 2, 1),
      widgetScale: clampNumber(merged.spacing.widgetScale, 0.5, 2, 1),
      padding: clampNumber(merged.spacing.padding, 0, 80, 14),
      gap: clampNumber(merged.spacing.gap, 0, 64, 10),
      buttonHeight: clampNumber(merged.spacing.buttonHeight, 28, 90, 44),
    },
    effects: {
      ...merged.effects,
      shadowBlur: clampNumber(merged.effects.shadowBlur, 0, 100, 24),
      shadowOpacity: clampNumber(merged.effects.shadowOpacity, 0, 1, 0.32),
      glowBlur: clampNumber(merged.effects.glowBlur, 0, 100, 20),
      glowOpacity: clampNumber(merged.effects.glowOpacity, 0, 1, 0.24),
      backdropBlur: clampNumber(merged.effects.backdropBlur, 0, 40, 0),
      brightness: clampNumber(merged.effects.brightness, 0, 200, 100),
      contrast: clampNumber(merged.effects.contrast, 0, 200, 100),
      saturation: clampNumber(merged.effects.saturation, 0, 200, 100),
    },
    motion: {
      ...merged.motion,
      duration: clampNumber(merged.motion.duration, 0, 3000, 350),
      delay: clampNumber(merged.motion.delay, 0, 3000, 0),
      stagger: clampNumber(merged.motion.stagger, 0, 1000, 40),
    },
    widgets: isPlainObject(merged.widgets) ? merged.widgets : {},
    widgetTypes: isPlainObject(merged.widgetTypes) ? merged.widgetTypes : {},
  };
}

export function buildOverlayAppearanceState(rawState = {}, context = {}) {
  const root = rawState?.overlayAppearance || {};
  const published = normalizeAppearance(root.published || root.draft || {}, context);
  const draft = normalizeAppearance(root.draft || root.published || {}, context);
  return {
    schemaVersion: APPEARANCE_SCHEMA_VERSION,
    draft,
    published,
    liveEditing: !!root.liveEditing,
    revision: Number(root.revision) || 0,
    updatedAt: root.updatedAt || null,
    publishedAt: root.publishedAt || null,
    versions: Array.isArray(root.versions) ? root.versions : [],
    presets: Array.isArray(root.presets) ? root.presets : [],
    sourceClientId: root.sourceClientId || null,
  };
}

export function projectAppearanceToThemePatch(appearance) {
  const a = normalizeAppearance(appearance);
  return {
    style_preset: a.themeId || 'classic',
    primary_color: a.colors.primary,
    secondary_color: a.colors.secondary || a.colors.backgroundAlt,
    accent_color: a.colors.accent,
    text_color: a.colors.text,
    opacity: a.surfaces.opacity,
    blur_intensity: a.surfaces.blur,
    shadow_strength: a.effects.shadowOpacity,
    glow_intensity: a.effects.glowOpacity,
    border_radius: a.borders.radius,
    font_family: a.typography.bodyFont,
    font_weight: a.typography.bodyWeight,
    animation_speed: Math.max(0.2, Math.min(3, Number(a.motion.duration || 350) / 350)),
    canvas_width: a.canvas.width,
    canvas_height: a.canvas.height,
    custom_css: a.advanced.customCss || '',
  };
}

export function appearanceToWidgetConfigDefaults(appearance) {
  const a = normalizeAppearance(appearance);
  return {
    accentColor: a.colors.accent,
    bgColor: a.surfaces.containerBg || a.colors.surface,
    cardBg: a.surfaces.cardBg || a.colors.elevated,
    textColor: a.colors.text,
    mutedColor: a.colors.muted,
    borderColor: a.borders.color,
    fontFamily: a.typography.bodyFont,
    fontSize: a.typography.baseSize,
    fontWeight: String(a.typography.bodyWeight),
    borderRadius: a.borders.radius,
    cardRadius: a.borders.radius,
    borderWidth: a.borders.enabled ? a.borders.width : 0,
    cardBorderWidth: a.borders.enabled ? a.borders.width : 0,
    containerPadding: a.surfaces.padding,
    cardGap: a.surfaces.gap,
    paddingX: a.spacing.padding,
    paddingY: Math.max(4, Math.round(a.spacing.padding * 0.6)),
    brightness: a.effects.brightness,
    contrast: a.effects.contrast,
    saturation: a.effects.saturation,
    blur: a.canvas.blur,
    shadowSize: a.effects.shadowEnabled ? a.effects.shadowBlur : 0,
    shadowIntensity: a.effects.shadowEnabled ? Math.round(a.effects.shadowOpacity * 100) : 0,
    animSpeed: a.motion.enabled ? Math.max(0.2, Number(a.motion.duration || 350) / 350) : 0,
    barBgFrom: a.colors.backgroundAlt,
    barBgVia: a.colors.secondary,
    barBgTo: a.colors.background,
    providerColor: a.colors.textSecondary,
    slotNameColor: a.colors.text,
    labelColor: a.colors.muted,
    dividerColor: a.colors.divider,
    progressColor: a.colors.success,
    progressBgColor: a.colors.divider,
    bestColor: a.colors.positive,
    worstColor: a.colors.negative,
    headerBg: a.surfaces.headerBg,
    headerText: a.colors.textSecondary,
    buttonBg: a.controls.primaryBg,
    buttonText: a.controls.primaryText,
  };
}

function getVisualOverride(overrides = {}, typeOrId) {
  const target = overrides?.[typeOrId];
  if (!target) return {};
  return target.visual || target.tokens || target;
}

function shouldInheritVisualKey(key, config = {}, defaults = {}) {
  if (WIDGET_ONLY_KEYS.has(key)) return false;
  if (!(key in config)) return true;
  if (defaults && Object.prototype.hasOwnProperty.call(defaults, key)) {
    return config[key] === defaults[key] || config[key] === '' || config[key] == null;
  }
  return config[key] === '' || config[key] == null;
}

function pickSupportedConfig(type, values) {
  const def = getWidgetDef(type);
  const config = {};
  const defaults = def?.defaults || {};
  const supportsKey = key => (
    Object.prototype.hasOwnProperty.call(defaults, key)
    || ['accentColor', 'bgColor', 'textColor', 'mutedColor', 'borderColor', 'fontFamily', 'borderRadius', 'borderWidth', 'custom_css'].includes(key)
  );
  for (const [key, value] of Object.entries(values || {})) {
    if (value === undefined || value === RESET_VALUE) continue;
    if (supportsKey(key)) config[key] = value;
  }
  return config;
}

export function resolveWidgetAppearanceConfig(widget, appearance, theme) {
  if (!widget) return {};
  const def = getWidgetDef(widget.widget_type);
  const defaults = def?.defaults || {};
  const base = widget.config || {};
  const normalized = normalizeAppearance(appearance, { theme });
  const inherited = pickSupportedConfig(widget.widget_type, appearanceToWidgetConfigDefaults(normalized));
  const next = { ...base };

  for (const [key, value] of Object.entries(inherited)) {
    if (shouldInheritVisualKey(key, base, defaults)) {
      next[key] = value;
    }
  }

  const typeOverride = pickSupportedConfig(widget.widget_type, getVisualOverride(normalized.widgetTypes, widget.widget_type));
  const instanceOverride = pickSupportedConfig(widget.widget_type, getVisualOverride(normalized.widgets, widget.id));
  return {
    ...next,
    ...typeOverride,
    ...instanceOverride,
  };
}

export function resolveWidgetsForAppearance(widgets = [], appearance, theme) {
  return widgets.map(widget => ({
    ...widget,
    config: resolveWidgetAppearanceConfig(widget, appearance, theme),
  }));
}

export function getWidgetOverrideCount(appearance, widgetId) {
  const entry = normalizeAppearance(appearance).widgets?.[widgetId];
  if (!entry) return 0;
  return Object.keys(entry.visual || entry.tokens || entry).length;
}

export function getWidgetTypeOverrideCount(appearance, widgetType) {
  const entry = normalizeAppearance(appearance).widgetTypes?.[widgetType];
  if (!entry) return 0;
  return Object.keys(entry.visual || entry.tokens || entry).length;
}

export function getAppearanceWarnings(appearance) {
  const a = normalizeAppearance(appearance);
  const warnings = [];
  if (a.effects.backdropBlur > 24 || a.canvas.blur > 24) {
    warnings.push({ id: 'heavy_blur', label: 'High blur can reduce OBS performance.' });
  }
  if (a.motion.enabled && a.motion.duration < 120) {
    warnings.push({ id: 'fast_motion', label: 'Very fast motion can look like flashing.' });
  }
  if (a.canvas.backgroundType === 'video' && a.canvas.videoUrl) {
    warnings.push({ id: 'video_bg', label: 'Video backgrounds should be optimized before using in OBS.' });
  }
  if (a.typography.baseSize < 11) {
    warnings.push({ id: 'small_text', label: 'Small base text may be hard to read in stream layouts.' });
  }
  return warnings;
}

export function buildCanvasBackground(canvas = SYSTEM_APPEARANCE.canvas) {
  const c = { ...SYSTEM_APPEARANCE.canvas, ...(canvas || {}) };
  if (c.backgroundType === 'solid') return c.backgroundColor;
  if (c.backgroundType === 'gradient') {
    if (c.gradientType === 'radial') return `radial-gradient(circle, ${c.gradientFrom}, ${c.gradientTo})`;
    return `linear-gradient(${c.gradientAngle}deg, ${c.gradientFrom}, ${c.gradientTo})`;
  }
  if (c.backgroundType === 'image' && c.imageUrl) return `url("${String(c.imageUrl).replace(/"/g, '')}") ${c.backgroundPosition} / ${c.backgroundSize} no-repeat`;
  if (c.backgroundType === 'transparent') return 'transparent';
  return c.backgroundColor || 'transparent';
}

export function getPerformanceTone(appearance) {
  const a = normalizeAppearance(appearance);
  const score = (a.effects.backdropBlur / 12)
    + (a.canvas.blur / 12)
    + (a.effects.glowEnabled ? 1 : 0)
    + (a.canvas.backgroundType === 'video' ? 2 : 0)
    + (a.motion.enabled && a.motion.intensity === 'energetic' ? 1 : 0);
  if (score >= 4) return { tone: 'heavy', label: 'Heavy' };
  if (score >= 2) return { tone: 'moderate', label: 'Moderate' };
  return { tone: 'light', label: 'Lightweight' };
}

export function createAppearanceVersion({ appearance, userId, summary = 'Published appearance' }) {
  return {
    id: `appearance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: APPEARANCE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    userId: userId || null,
    summary,
    themeId: appearance?.themeId || 'classic',
    appearance: normalizeAppearance(appearance),
  };
}

export function createAppearancePreset({ name, appearance, scope = 'overlay', widgetTypes = [] }) {
  return {
    id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || '').trim(),
    schemaVersion: APPEARANCE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scope,
    compatibleWidgetTypes: widgetTypes,
    appearance: normalizeAppearance(appearance),
  };
}

export function getSupportedVisualKeys(widgetType) {
  const def = getWidgetDef(widgetType);
  const defaults = def?.defaults || {};
  return VISUAL_CONFIG_KEYS.filter(key => (
    Object.prototype.hasOwnProperty.call(defaults, key)
    || ['accentColor', 'bgColor', 'textColor', 'mutedColor', 'borderColor', 'fontFamily', 'borderRadius', 'borderWidth'].includes(key)
  ));
}

