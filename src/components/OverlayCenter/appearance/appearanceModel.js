import { themeMap } from '../../../data/appThemes';
import { getWidgetDef } from '../widgets/widgetRegistry';
import { applyWidgetAppearanceV2ToConfig } from './v2/appearanceResolver';

export const APPEARANCE_SCHEMA_VERSION = 2;

export const RESET_VALUE = '__inherit__';

export const VISUAL_VALUE_CLASSIFICATIONS = Object.freeze([
  'structural',
  'global-customisable',
  'widget-type-customisable',
  'style-customisable',
  'instance-customisable',
  'element-customisable',
  'responsive-customisable',
  'state-customisable',
]);

export const COMMON_APPEARANCE_PROPERTY_DEFINITIONS = Object.freeze([
  { path: 'background', label: 'Background', category: 'colour', control: 'color', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'textColor', label: 'Text colour', category: 'colour', control: 'color', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'accentColor', label: 'Accent colour', category: 'colour', control: 'color', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'borderColor', label: 'Border colour', category: 'border', control: 'color', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'borderWidth', label: 'Border width', category: 'border', control: 'slider', min: 0, max: 16, step: 1, unit: 'px', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'radius', label: 'Radius', category: 'border', control: 'radius', min: 0, max: 120, step: 1, unit: 'px', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'padding', label: 'Padding', category: 'spacing', control: 'spacing', min: 0, max: 120, step: 1, unit: 'px', scope: ['global', 'widget-type', 'style', 'instance', 'element'] },
  { path: 'gap', label: 'Gap', category: 'spacing', control: 'slider', min: 0, max: 96, step: 1, unit: 'px', scope: ['global', 'widget-type', 'style', 'instance', 'element'] },
  { path: 'fontFamily', label: 'Font', category: 'typography', control: 'font', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'fontSize', label: 'Font size', category: 'typography', control: 'slider', min: 8, max: 96, step: 1, unit: 'px', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'fontWeight', label: 'Font weight', category: 'typography', control: 'select', options: [300, 400, 500, 600, 700, 800, 900], scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'fontStyle', label: 'Font style', category: 'typography', control: 'select', options: ['normal', 'italic', 'oblique'], scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'lineHeight', label: 'Line height', category: 'typography', control: 'slider', min: 0.8, max: 2.4, step: 0.05, scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'letterSpacing', label: 'Letter spacing', category: 'typography', control: 'slider', min: 0, max: 0.2, step: 0.005, unit: 'em', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'textTransform', label: 'Text transform', category: 'typography', control: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'], scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'textAlign', label: 'Text alignment', category: 'typography', control: 'select', options: ['left', 'center', 'right', 'justify'], scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'height', label: 'Height', category: 'size', control: 'slider', min: 0, max: 720, step: 1, unit: 'px', scope: ['widget-type', 'style', 'instance', 'element'] },
  { path: 'width', label: 'Width', category: 'size', control: 'slider', min: 0, max: 1280, step: 1, unit: 'px', scope: ['widget-type', 'style', 'instance', 'element'] },
  { path: 'imageSize', label: 'Image or icon size', category: 'size', control: 'slider', min: 0, max: 512, step: 1, unit: 'px', scope: ['widget-type', 'style', 'instance', 'element'] },
  { path: 'opacity', label: 'Opacity', category: 'effects', control: 'slider', min: 0, max: 1, step: 0.05, scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'shadow', label: 'Shadow', category: 'effects', control: 'shadow', min: 0, max: 160, step: 1, unit: 'px', scope: ['global', 'widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'blur', label: 'Blur', category: 'effects', control: 'slider', min: 0, max: 40, step: 1, unit: 'px', scope: ['widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'brightness', label: 'Brightness', category: 'effects', control: 'slider', min: 0, max: 200, step: 1, unit: '%', scope: ['widget-type', 'style', 'instance', 'element'] },
  { path: 'contrast', label: 'Contrast', category: 'effects', control: 'slider', min: 0, max: 200, step: 1, unit: '%', scope: ['widget-type', 'style', 'instance', 'element'] },
  { path: 'saturation', label: 'Saturation', category: 'effects', control: 'slider', min: 0, max: 200, step: 1, unit: '%', scope: ['widget-type', 'style', 'instance', 'element'] },
  { path: 'fillColor', label: 'Fill colour', category: 'progress', control: 'color', scope: ['widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'mutedColor', label: 'Muted colour', category: 'colour', control: 'color', scope: ['widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'negativeColor', label: 'Negative colour', category: 'colour', control: 'color', scope: ['widget-type', 'style', 'instance', 'element', 'state'] },
  { path: 'overlayOpacity', label: 'Overlay opacity', category: 'effects', control: 'slider', min: 0, max: 100, step: 1, unit: '%', scope: ['widget-type', 'style', 'instance'] },
  { path: 'hueRotate', label: 'Hue rotation', category: 'effects', control: 'slider', min: 0, max: 360, step: 1, unit: 'deg', scope: ['widget-type', 'style', 'instance', 'element'] },
  { path: 'grayscale', label: 'Grayscale', category: 'effects', control: 'slider', min: 0, max: 100, step: 1, unit: '%', scope: ['widget-type', 'style', 'instance', 'element'] },
  { path: 'sepia', label: 'Sepia', category: 'effects', control: 'slider', min: 0, max: 100, step: 1, unit: '%', scope: ['widget-type', 'style', 'instance', 'element'] },
  { path: 'patternSize', label: 'Pattern size', category: 'size', control: 'slider', min: 4, max: 120, step: 1, unit: 'px', scope: ['widget-type', 'style', 'instance'] },
  { path: 'barHeight', label: 'Bar height', category: 'size', control: 'slider', min: 32, max: 160, step: 1, unit: 'px', scope: ['widget-type', 'style', 'instance'] },
  { path: 'maxWidth', label: 'Max width', category: 'size', control: 'slider', min: 320, max: 1920, step: 10, unit: 'px', scope: ['widget-type', 'style', 'instance'] },
  { path: 'avatarSize', label: 'Avatar size', category: 'size', control: 'slider', min: 40, max: 180, step: 1, unit: '%', scope: ['widget-type', 'style', 'instance'] },
  { path: 'badgeSize', label: 'Badge size', category: 'size', control: 'slider', min: 40, max: 180, step: 1, unit: '%', scope: ['widget-type', 'style', 'instance'] },
  { path: 'casinoImageSize', label: 'Casino image size', category: 'size', control: 'slider', min: 40, max: 180, step: 1, unit: '%', scope: ['widget-type', 'style', 'instance'] },
  { path: 'showBg', label: 'Show background', category: 'advanced', control: 'boolean', scope: ['widget-type', 'style', 'instance'] },
  { path: 'showSlotName', label: 'Show slot names', category: 'advanced', control: 'boolean', scope: ['widget-type', 'style', 'instance'] },
  { path: 'esCyan', label: 'Esports cyan', category: 'colour', control: 'color', scope: ['widget-type', 'style', 'instance'] },
  { path: 'esPurple', label: 'Esports purple', category: 'colour', control: 'color', scope: ['widget-type', 'style', 'instance'] },
  { path: 'esGold', label: 'Esports gold', category: 'colour', control: 'color', scope: ['widget-type', 'style', 'instance'] },
  { path: 'sbTabActive', label: 'Scoreboard active tab', category: 'colour', control: 'color', scope: ['widget-type', 'style', 'instance'] },
]);

export const ELEMENT_APPEARANCE_GROUPS = Object.freeze({
  typography: Object.freeze(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform', 'fontStyle']),
  colors: Object.freeze(['text', 'background', 'accent', 'muted', 'fill']),
  container: Object.freeze(['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gap']),
  borders: Object.freeze(['width', 'style', 'color', 'radius']),
  effects: Object.freeze(['opacity', 'shadow', 'blur', 'backdropBlur']),
  sizing: Object.freeze(['scale', 'iconSize', 'imageSize']),
  motion: Object.freeze(['enabled', 'duration', 'delay', 'easing']),
});

const FLAT_TO_ELEMENT_PATH = Object.freeze({
  fontFamily: 'typography.fontFamily',
  fontSize: 'typography.fontSize',
  fontWeight: 'typography.fontWeight',
  fontStyle: 'typography.fontStyle',
  lineHeight: 'typography.lineHeight',
  letterSpacing: 'typography.letterSpacing',
  textTransform: 'typography.textTransform',
  textAlign: 'typography.textAlign',
  textColor: 'colors.text',
  background: 'colors.background',
  accentColor: 'colors.accent',
  mutedColor: 'colors.muted',
  fillColor: 'colors.fill',
  width: 'container.width',
  height: 'container.height',
  minWidth: 'container.minWidth',
  maxWidth: 'container.maxWidth',
  minHeight: 'container.minHeight',
  maxHeight: 'container.maxHeight',
  padding: 'container.padding',
  paddingTop: 'container.paddingTop',
  paddingRight: 'container.paddingRight',
  paddingBottom: 'container.paddingBottom',
  paddingLeft: 'container.paddingLeft',
  marginTop: 'container.marginTop',
  marginRight: 'container.marginRight',
  marginBottom: 'container.marginBottom',
  marginLeft: 'container.marginLeft',
  gap: 'container.gap',
  borderWidth: 'borders.width',
  borderStyle: 'borders.style',
  borderColor: 'borders.color',
  radius: 'borders.radius',
  opacity: 'effects.opacity',
  shadow: 'effects.shadow',
  blur: 'effects.blur',
  backdropBlur: 'effects.backdropBlur',
  scale: 'sizing.scale',
  iconSize: 'sizing.iconSize',
  imageSize: 'sizing.imageSize',
  motionEnabled: 'motion.enabled',
  duration: 'motion.duration',
  delay: 'motion.delay',
  easing: 'motion.easing',
});

const ELEMENT_PATH_TO_FLAT = Object.freeze(Object.fromEntries(Object.entries(FLAT_TO_ELEMENT_PATH).map(([flat, path]) => [path, flat])));

function isControlObject(value) {
  return value && typeof value === 'object';
}

function isControlColorProperty(property) {
  const name = String(property || '').toLowerCase();
  if (/size|width|height|weight|spacing|lineheight|opacity|padding|radius|blur|shadow|angle|speed|transform|align/.test(name)) return false;
  return /color|background|fill|bg|text|caption|provider|slotname|accent|primary|secondary|muted|divider|progress|spinner|sword|button|best|worst|positive|negative|border/.test(name);
}

function hasNumericControl(property, control) {
  const definition = COMMON_APPEARANCE_PROPERTY_DEFINITIONS.find(item => item.path === property);
  if (control === 'slider' || control === 'number' || definition?.control === 'slider') return true;
  return /opacity|animSpeed|duration|delay|brightness|contrast|saturation|fontWeight|lineHeight|letterSpacing|borderWidth|radius|padding|gap|fontSize|imageSize|height|width|blur|shadow|spacing|pad|Size/i.test(String(property || ''));
}

export function normalizeAppearanceControlValue(property, value, control = '') {
  if (value === RESET_VALUE) return value;
  if (hasNumericControl(property, control)) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
  if (control === 'boolean') return Boolean(value);
  if (control === 'color' || isControlColorProperty(property)) {
    if (isControlObject(value)) return '';
    return String(value || '').trim();
  }
  if (isControlObject(value)) return '';
  return value ?? '';
}

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
  'headerBg',
  'headerText',
  'textColor',
  'mutedTextColor',
  'mutedColor',
  'borderColor',
  'cardBorder',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'headingFont',
  'bodyFont',
  'numberFont',
  'headingScale',
  'lineHeight',
  'letterSpacing',
  'textTransform',
  'textAlign',
  'borderRadius',
  'cardRadius',
  'borderWidth',
  'cardBorderWidth',
  'containerPadding',
  'cardPadding',
  'cardGap',
  'gap',
  'padding',
  'paddingX',
  'paddingY',
  'width',
  'height',
  'widgetWidth',
  'widgetHeight',
  'widgetScale',
  'barHeight',
  'maxWidth',
  'opacity',
  'brightness',
  'contrast',
  'saturation',
  'blur',
  'hueRotate',
  'grayscale',
  'sepia',
  'overlayColor',
  'overlayOpacity',
  'shadowSize',
  'shadowIntensity',
  'animSpeed',
  'color1',
  'color2',
  'color3',
  'gradientAngle',
  'patternSize',
  'imageFit',
  'imagePosition',
  'fxParticleColor',
  'fxFogColor',
  'fxGlimpseColor',
  'barBgFrom',
  'barBgVia',
  'barBgTo',
  'barBg',
  'barFill',
  'providerColor',
  'slotNameColor',
  'slotNameSize',
  'labelColor',
  'dividerColor',
  'progressColor',
  'progressBgColor',
  'bestColor',
  'worstColor',
  'rtpIconColor',
  'potentialIconColor',
  'volatilityIconColor',
  'bestWinIconColor',
  'spinnerColor',
  'nameColor',
  'nameSize',
  'multiColor',
  'multiSize',
  'subtextColor',
  'captionColor',
  'captionSize',
  'captionFont',
  'ctaColor',
  'cryptoUpColor',
  'cryptoDownColor',
  'avatarSize',
  'badgeSize',
  'casinoImageSize',
  'eliminatedOpacity',
  'showBg',
  'showSlotName',
  'tabBg',
  'tabActiveBg',
  'tabColor',
  'tabActiveColor',
  'tabBorder',
  'swordColor',
  'swordBg',
  'swordSize',
  'xIconColor',
  'xIconBg',
  'arenaAccent',
  'arenaWinColor',
  'arenaCardBg',
  'arenaLoseOpacity',
  'esCyan',
  'esPurple',
  'esGold',
  'esBg',
  'esCardBg',
  'esBorder',
  'sbAccent',
  'sbHeaderBg',
  'sbCardBg',
  'sbTextColor',
  'sbPayColor',
  'sbMultiColor',
  'sbWinColor',
  'sbLoseColor',
  'sbTabBg',
  'sbTabActive',
  'headerBg',
  'headerText',
  'raidBgColor',
  'raidBorderColor',
  'raidTextColor',
  'cardHoverBg',
  'cardHoverBorder',
  'cardTextColor',
  'headerBorder',
  'headerChannelColor',
  'buttonBg',
  'buttonText',
  'msgSpacing',
  'msgPadH',
  'msgLineHeight',
];

const WIDGET_ONLY_KEYS = new Set(['displayStyle', 'layout', 'chatStyle']);

const SCOPED_APPEARANCE_ROOTS = new Set([
  'colors',
  'typography',
  'surfaces',
  'borders',
  'spacing',
  'effects',
  'controls',
  'motion',
]);

const VISUAL_TO_APPEARANCE_PATH = {
  accentColor: 'colors.accent',
  bgColor: 'surfaces.containerBg',
  cardBg: 'surfaces.cardBg',
  headerBg: 'surfaces.headerBg',
  headerText: 'colors.textSecondary',
  textColor: 'colors.text',
  mutedTextColor: 'colors.muted',
  mutedColor: 'colors.muted',
  borderColor: 'borders.color',
  cardBorder: 'borders.color',
  fontFamily: 'typography.bodyFont',
  fontSize: 'typography.baseSize',
  fontWeight: 'typography.bodyWeight',
  headingFont: 'typography.headingFont',
  bodyFont: 'typography.bodyFont',
  numberFont: 'typography.numberFont',
  headingScale: 'typography.headingScale',
  lineHeight: 'typography.lineHeight',
  letterSpacing: 'typography.letterSpacing',
  textTransform: 'typography.textTransform',
  textAlign: 'typography.textAlign',
  borderRadius: 'borders.radius',
  cardRadius: 'borders.radius',
  borderWidth: 'borders.width',
  cardBorderWidth: 'borders.width',
  containerPadding: 'surfaces.padding',
  cardPadding: 'surfaces.padding',
  padding: 'spacing.padding',
  paddingX: 'spacing.padding',
  paddingY: 'spacing.padding',
  cardGap: 'surfaces.gap',
  gap: 'spacing.gap',
  opacity: 'surfaces.opacity',
  brightness: 'effects.brightness',
  contrast: 'effects.contrast',
  saturation: 'effects.saturation',
  blur: 'effects.backdropBlur',
  shadowSize: 'effects.shadowBlur',
  shadowIntensity: 'effects.shadowOpacity',
  animSpeed: 'motion.duration',
  progressColor: 'colors.success',
  progressBgColor: 'colors.divider',
  barFill: 'colors.success',
  barBg: 'colors.divider',
  bestColor: 'colors.positive',
  worstColor: 'colors.negative',
  providerColor: 'colors.textSecondary',
  slotNameColor: 'colors.text',
  labelColor: 'colors.muted',
  dividerColor: 'colors.divider',
  buttonBg: 'controls.primaryBg',
  buttonText: 'controls.primaryText',
};

const APPEARANCE_PATH_TO_VISUAL = Object.entries(VISUAL_TO_APPEARANCE_PATH).reduce((acc, [key, path]) => {
  if (!acc[path]) acc[path] = key;
  return acc;
}, {});

const COMMON_TEXT_PROPERTIES = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign'];
const COMMON_FILTER_PROPERTIES = ['brightness', 'contrast', 'saturation'];

const COMMON_SUB_ELEMENT_DEFINITIONS = [
  { id: 'container', label: 'Container', properties: ['background', 'textColor', 'accentColor', 'mutedColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'opacity', 'shadow', ...COMMON_FILTER_PROPERTIES, ...COMMON_TEXT_PROPERTIES] },
  { id: 'header', label: 'Header', properties: ['background', 'textColor', 'accentColor', 'mutedColor', 'borderColor', 'borderWidth', ...COMMON_TEXT_PROPERTIES, 'padding', 'radius', 'shadow', 'opacity'] },
  { id: 'card', label: 'Card', properties: ['background', 'textColor', 'accentColor', 'mutedColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'shadow', 'opacity', ...COMMON_TEXT_PROPERTIES] },
  { id: 'label', label: 'Labels', properties: ['textColor', 'mutedColor', 'accentColor', ...COMMON_TEXT_PROPERTIES] },
  { id: 'value', label: 'Values', properties: ['textColor', 'accentColor', 'negativeColor', ...COMMON_TEXT_PROPERTIES] },
];

const WIDGET_SUB_ELEMENT_DEFINITIONS = {
  bonus_hunt: [
    { id: 'container', label: 'Root widget container', properties: ['background', 'textColor', 'accentColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'opacity', 'shadow', ...COMMON_TEXT_PROPERTIES] },
    { id: 'headerContainer', label: 'Header container', properties: ['background', 'textColor', 'accentColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'shadow'] },
    { id: 'headerIcon', label: 'Header icon', properties: ['background', 'textColor', 'accentColor', 'imageSize', 'radius', 'opacity'] },
    { id: 'headerTitle', label: 'Header title', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'mainStatsContainer', label: 'Main stats container', properties: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap'] },
    { id: 'statCell', label: 'Stat cell', properties: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap'] },
    { id: 'statLabel', label: 'Stat labels', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'statValue', label: 'Stat values', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'tagContainer', label: 'Tag or badge container', properties: ['background', 'textColor', 'accentColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap'] },
    { id: 'tagText', label: 'Tag text', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'slotCarouselContainer', label: 'Slot carousel container', properties: ['background', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap'] },
    { id: 'slotImage', label: 'Slot image', properties: ['radius', 'imageSize', 'height', 'opacity'] },
    { id: 'progressBar', label: 'Progress bar track', properties: ['background', 'fillColor', 'radius', 'height'] },
    { id: 'progressBarFill', label: 'Progress bar fill', properties: ['background', 'fillColor', 'radius', 'height', 'opacity'] },
    { id: 'progressCount', label: 'Progress count', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'slotListContainer', label: 'Slot list container', properties: ['background', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap'] },
    { id: 'slotRow', label: 'Slot row', properties: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'opacity'] },
    { id: 'slotPositionNumber', label: 'Slot position number', properties: ['background', 'textColor', ...COMMON_TEXT_PROPERTIES, 'radius'] },
    { id: 'slotThumbnail', label: 'Slot thumbnail', properties: ['radius', 'imageSize', 'height', 'opacity'] },
    { id: 'slotTitle', label: 'Slot title', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'winLabel', label: 'Win label', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'winValue', label: 'Win value', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'multiplierLabel', label: 'Multiplier label', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'betValue', label: 'Bet values', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'betLabel', label: 'Bet label', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'payoutValue', label: 'Payout values', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'multiplierValue', label: 'Multiplier values', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'requestsSectionContainer', label: 'Requests section container', properties: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap'] },
    { id: 'requestsHeader', label: 'Requests header', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'requestsDescription', label: 'Requests description', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'requestsEmpty', label: 'Requests empty state', properties: ['background', 'textColor', ...COMMON_TEXT_PROPERTIES, 'padding', 'radius', 'opacity'] },
    { id: 'footerContainer', label: 'Footer container', properties: ['background', 'textColor', 'fontSize', 'fontWeight', 'padding', 'radius'] },
    { id: 'footerLabel', label: 'Footer label', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'footerTotalValue', label: 'Footer total value', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'card', label: 'Legacy card surfaces', properties: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'shadow'] },
    { id: 'label', label: 'Legacy labels', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'value', label: 'Legacy values', properties: ['background', 'textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'huntTitle', label: 'Legacy hunt title', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'carousel', label: 'List and carousel', properties: ['gap', 'padding'] },
    { id: 'footer', label: 'Legacy footer totals', properties: ['background', 'textColor', 'fontSize', 'fontWeight', 'padding', 'radius'] },
    { id: 'bonusCard', label: 'Bonus card', properties: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'shadow'] },
    { id: 'profit', label: 'Profit values', properties: ['background', 'textColor', 'accentColor', 'fontSize', 'fontWeight'] },
    { id: 'loss', label: 'Loss values', properties: ['background', 'textColor', 'accentColor', 'fontSize', 'fontWeight'] },
    { id: 'highlight', label: 'Best-win highlight', properties: ['background', 'textColor', 'borderColor', 'accentColor', 'shadow'] },
  ],
  bets: [
    { id: 'container', label: 'Container', properties: ['background', 'textColor', 'accentColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'opacity', 'shadow', ...COMMON_TEXT_PROPERTIES] },
    { id: 'title', label: 'Title', properties: ['background', 'textColor', ...COMMON_TEXT_PROPERTIES, 'padding', 'radius'] },
    { id: 'status', label: 'Status badge', properties: ['background', 'textColor', ...COMMON_TEXT_PROPERTIES, 'padding', 'radius'] },
    { id: 'optionCard', label: 'Option card fallback', properties: ['background', 'textColor', 'accentColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'shadow', ...COMMON_TEXT_PROPERTIES] },
    { id: 'statistics', label: 'Statistics strip', properties: ['background', 'textColor', 'accentColor', ...COMMON_TEXT_PROPERTIES, 'padding', 'gap', 'borderColor', 'borderWidth'] },
    { id: 'optionRow', label: 'Option row', properties: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'shadow'] },
    { id: 'optionNumber', label: 'Option number', properties: ['background', 'textColor', 'accentColor', ...COMMON_TEXT_PROPERTIES, 'radius', 'imageSize'] },
    { id: 'optionLabel', label: 'Option label', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'percentage', label: 'Percentage', properties: ['textColor', 'accentColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'footer', label: 'Footer hint', properties: ['background', 'textColor', ...COMMON_TEXT_PROPERTIES, 'padding', 'radius', 'borderColor', 'borderWidth'] },
    { id: 'progressBar', label: 'Progress bars', properties: ['background', 'fillColor', 'radius', 'height'] },
  ],
  slot_requests: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'requestCard', label: 'Request card', properties: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap'] },
    { id: 'position', label: 'Position number', properties: ['background', 'textColor', 'accentColor', ...COMMON_TEXT_PROPERTIES, 'radius'] },
    { id: 'viewerName', label: 'Viewer name', properties: ['textColor', 'mutedColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'slotTitle', label: 'Slot title', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'provider', label: 'Provider text', properties: ['textColor', 'mutedColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'slotImage', label: 'Slot image', properties: ['radius', 'imageSize', 'opacity'] },
  ],
  giveaway: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'prize', label: 'Prize area', properties: ['background', 'textColor', 'fontSize', 'fontWeight', 'radius'] },
    { id: 'keyword', label: 'Keyword', properties: ['background', 'textColor', 'fontSize', 'fontWeight', 'radius'] },
    { id: 'counter', label: 'Counters', properties: ['background', 'textColor', 'fontSize', 'fontWeight', 'radius'] },
    { id: 'timer', label: 'Timer', properties: ['background', 'textColor', 'fontSize', 'fontWeight', 'radius'] },
    { id: 'winnerCard', label: 'Winner card', properties: ['background', 'textColor', 'borderColor', 'radius', 'shadow'] },
    { id: 'participantList', label: 'Participant list', properties: ['background', 'textColor', 'borderColor', 'radius', 'padding', 'gap'] },
    { id: 'celebration', label: 'Celebration visuals', properties: ['accentColor', 'fillColor', 'opacity', 'shadow'] },
    { id: 'emptyState', label: 'Empty state', properties: ['background', 'textColor', 'opacity'] },
  ],
  rtp_stats: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'provider', label: 'Provider text', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'slotTitle', label: 'Slot title', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'rtpValue', label: 'RTP value', properties: ['textColor', 'accentColor', 'fontSize', 'fontWeight'] },
    { id: 'volatility', label: 'Volatility', properties: ['textColor', 'accentColor', 'fontSize', 'fontWeight'] },
    { id: 'maxWin', label: 'Max win', properties: ['textColor', 'accentColor', 'fontSize', 'fontWeight'] },
    { id: 'personalBest', label: 'Personal best', properties: ['textColor', 'accentColor', 'fontSize', 'fontWeight'] },
    { id: 'statCard', label: 'Stat cards', properties: ['background', 'textColor', 'borderColor', 'radius', 'padding', 'gap'] },
    { id: 'icon', label: 'Icons', properties: ['textColor', 'fontSize'] },
    { id: 'spinner', label: 'Spinner', properties: ['accentColor', 'opacity'] },
    { id: 'positive', label: 'Positive values', properties: ['textColor', 'fontWeight'] },
    { id: 'negative', label: 'Negative values', properties: ['textColor', 'fontWeight'] },
    { id: 'chart', label: 'Chart', properties: ['background', 'textColor', 'borderColor', 'accentColor'] },
  ],
  navbar: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'logo', label: 'Logo', properties: ['accentColor', 'imageSize', 'radius', 'opacity'] },
    { id: 'avatar', label: 'Avatar', properties: ['imageSize', 'radius', 'borderColor', 'borderWidth'] },
    { id: 'displayName', label: 'Display name', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'clock', label: 'Clock', properties: ['background', 'textColor', 'fontSize', 'fontWeight', 'radius'] },
    { id: 'music', label: 'Music information', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'sponsor', label: 'Sponsor area', properties: ['background', 'textColor', 'radius', 'padding'] },
    { id: 'crypto', label: 'Crypto ticker', properties: ['textColor', 'accentColor', 'fillColor', 'fontSize', 'fontWeight'] },
    { id: 'separator', label: 'Separators', properties: ['borderColor', 'borderWidth', 'opacity'] },
  ],
  background: [
    { id: 'canvas', label: 'Background layer', properties: ['background', 'opacity', 'radius', 'blur', 'brightness', 'contrast', 'saturation'] },
    { id: 'gradient', label: 'Gradient', properties: ['background', 'accentColor', 'fillColor'] },
    { id: 'media', label: 'Image/video', properties: ['opacity', 'blur', 'brightness', 'contrast', 'saturation', 'hueRotate', 'grayscale', 'sepia'] },
    { id: 'tint', label: 'Tint', properties: ['background', 'opacity'] },
    { id: 'vignette', label: 'Vignette', properties: ['background', 'opacity'] },
    { id: 'texture', label: 'Texture', properties: ['background', 'accentColor', 'fillColor', 'opacity'] },
  ],
  bonus_buys: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'sessionCard', label: 'Session card', properties: ['background', 'textColor', 'borderColor', 'radius', 'padding', 'shadow'] },
    { id: 'cost', label: 'Cost', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'payout', label: 'Payout', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'profit', label: 'Profit', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'loss', label: 'Loss', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'slotArtwork', label: 'Slot artwork', properties: ['radius', 'imageSize', 'opacity'] },
    { id: 'status', label: 'Status', properties: ['background', 'textColor', 'radius', 'padding'] },
    { id: 'progressBar', label: 'Progress', properties: ['background', 'fillColor', 'radius', 'height'] },
  ],
  tournament: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'bracket', label: 'Bracket background', properties: ['background', 'borderColor', 'radius', 'padding', 'gap'] },
    { id: 'roundHeading', label: 'Round headings', properties: ['background', 'textColor', 'fontSize', 'fontWeight', 'radius'] },
    { id: 'participantCard', label: 'Participant cards', properties: ['background', 'textColor', 'borderColor', 'radius', 'padding', 'gap'] },
    { id: 'slotImage', label: 'Slot image', properties: ['background', 'radius', 'imageSize', 'opacity'] },
    { id: 'connector', label: 'Match connector lines', properties: ['background', 'textColor', 'borderColor', 'borderWidth', 'opacity'] },
    { id: 'score', label: 'Score text', properties: ['textColor', 'mutedColor', 'negativeColor', 'fontSize', 'fontWeight'] },
    { id: 'timer', label: 'Timer', properties: ['background', 'textColor', 'radius'] },
    { id: 'finalWinner', label: 'Final winner', properties: ['background', 'textColor', 'borderColor', 'shadow'] },
    { id: 'emptyState', label: 'Empty state', properties: ['background', 'textColor', 'fontSize', 'opacity'] },
  ],
  current_slot: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'slotImage', label: 'Slot image', properties: ['radius', 'imageSize', 'borderColor', 'borderWidth', 'opacity'] },
    { id: 'slotTitle', label: 'Slot title', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'provider', label: 'Provider', properties: ['textColor', 'mutedColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'stake', label: 'Stake', properties: ['textColor', 'accentColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'stat', label: 'RTP and stats', properties: ['textColor', 'accentColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'imageFrame', label: 'Image frame', properties: ['background', 'borderColor', 'borderWidth', 'radius', 'shadow'] },
    { id: 'fallback', label: 'Missing-image fallback', properties: ['background', 'textColor', 'radius'] },
  ],
  chat: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'message', label: 'Message', properties: ['background', 'textColor', 'borderColor', 'radius', 'padding', 'gap', 'shadow', ...COMMON_TEXT_PROPERTIES] },
    { id: 'username', label: 'Username', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'timestamp', label: 'Timestamp', properties: ['textColor', 'fontSize', 'opacity'] },
    { id: 'avatar', label: 'Avatar', properties: ['imageSize', 'radius', 'borderColor', 'borderWidth'] },
    { id: 'badge', label: 'Badges', properties: ['background', 'textColor', 'fontSize', 'radius', 'padding'] },
    { id: 'emote', label: 'Emotes', properties: ['imageSize', 'opacity'] },
  ],
  image_slideshow: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'image', label: 'Image', properties: ['radius', 'borderColor', 'borderWidth', 'opacity', 'blur', 'brightness', 'contrast', 'saturation'] },
    { id: 'caption', label: 'Caption', properties: ['background', 'textColor', 'fontFamily', 'fontSize', 'fontWeight', 'padding', 'radius'] },
    { id: 'dots', label: 'Dots', properties: ['background', 'accentColor', 'imageSize', 'opacity'] },
  ],
  raid_shoutout: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'title', label: 'Title', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'clip', label: 'Clip', properties: ['radius', 'borderColor', 'borderWidth', 'shadow'] },
    { id: 'game', label: 'Game', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'viewers', label: 'Viewers', properties: ['background', 'textColor', 'radius'] },
  ],
  spotify_now_playing: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'albumArt', label: 'Album art', properties: ['imageSize', 'radius', 'shadow'] },
    { id: 'trackTitle', label: 'Track title', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'artistName', label: 'Artist name', properties: ['textColor', ...COMMON_TEXT_PROPERTIES] },
    { id: 'playbackState', label: 'Playback state', properties: ['background', 'textColor', 'accentColor', 'fontSize', 'fontWeight', 'radius'] },
    { id: 'progressBar', label: 'Progress', properties: ['background', 'fillColor', 'radius', 'height'] },
  ],
  bh_stats: [
    ...COMMON_SUB_ELEMENT_DEFINITIONS,
    { id: 'statsCard', label: 'Stats cards', properties: ['background', 'textColor', 'accentColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'shadow'] },
    { id: 'progressBar', label: 'Progress', properties: ['background', 'fillColor', 'radius', 'height'] },
    { id: 'bestStat', label: 'Best result', properties: ['textColor', 'fontSize', 'fontWeight'] },
    { id: 'worstStat', label: 'Worst result', properties: ['textColor', 'fontSize', 'fontWeight'] },
  ],
  container: [
    { id: 'container', label: 'Container', properties: ['background', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'opacity', 'shadow'] },
    { id: 'children', label: 'Child spacing', properties: ['gap', 'padding'] },
  ],
};

const COMMON_STATE_DEFINITIONS = {
  container: [{ id: 'default', label: 'Default' }, { id: 'loading', label: 'Loading' }, { id: 'empty', label: 'Empty' }, { id: 'error', label: 'Error' }],
  header: [{ id: 'default', label: 'Default' }],
  card: [{ id: 'default', label: 'Default' }, { id: 'hover', label: 'Hover' }, { id: 'active', label: 'Active' }, { id: 'selected', label: 'Selected' }],
  label: [{ id: 'default', label: 'Default' }],
  value: [{ id: 'default', label: 'Default' }, { id: 'positive', label: 'Positive' }, { id: 'negative', label: 'Negative' }],
};

const WIDGET_STATE_DEFINITIONS = {
  bonus_hunt: {
    headerContainer: [{ id: 'default', label: 'Default' }],
    headerTitle: [{ id: 'default', label: 'Default' }],
    statCell: [{ id: 'default', label: 'Default' }, { id: 'hover', label: 'Hover' }, { id: 'active', label: 'Active' }],
    bonusCard: [
      { id: 'default', label: 'Default' },
      { id: 'opened', label: 'Opened' },
      { id: 'unopened', label: 'Unopened' },
      { id: 'current', label: 'Current' },
      { id: 'best-win', label: 'Best win' },
      { id: 'worst-win', label: 'Worst win' },
    ],
    statValue: [{ id: 'default', label: 'Default' }, { id: 'positive', label: 'Positive' }, { id: 'negative', label: 'Negative' }],
    tagContainer: [{ id: 'default', label: 'Default' }, { id: 'success', label: 'Success' }, { id: 'warning', label: 'Warning' }, { id: 'error', label: 'Error' }],
    slotRow: [{ id: 'default', label: 'Default' }, { id: 'hover', label: 'Hover' }, { id: 'active', label: 'Active' }, { id: 'opened', label: 'Opened' }],
    slotTitle: [{ id: 'default', label: 'Default' }, { id: 'active', label: 'Active' }],
    progressBar: [{ id: 'default', label: 'Default' }, { id: 'complete', label: 'Complete' }],
    progressBarFill: [{ id: 'default', label: 'Default' }, { id: 'complete', label: 'Complete' }],
    requestsSectionContainer: [{ id: 'default', label: 'Default' }, { id: 'empty', label: 'Empty' }],
    requestsEmpty: [{ id: 'default', label: 'Default' }, { id: 'empty', label: 'Empty' }],
    footerTotalValue: [{ id: 'default', label: 'Default' }, { id: 'success', label: 'Success' }, { id: 'warning', label: 'Warning' }, { id: 'error', label: 'Error' }],
    container: COMMON_STATE_DEFINITIONS.container,
  },
  bets: {
    optionCard: [{ id: 'default', label: 'Default' }, { id: 'selected', label: 'Selected' }, { id: 'winner', label: 'Winner' }, { id: 'loser', label: 'Loser' }, { id: 'closed', label: 'Closed' }, { id: 'leading', label: 'Leading' }],
    optionRow: [{ id: 'default', label: 'Default' }, { id: 'selected', label: 'Selected' }, { id: 'winner', label: 'Winner' }, { id: 'loser', label: 'Loser' }, { id: 'closed', label: 'Closed' }, { id: 'leading', label: 'Leading' }],
    optionNumber: [{ id: 'default', label: 'Default' }, { id: 'selected', label: 'Selected' }, { id: 'winner', label: 'Winner' }, { id: 'loser', label: 'Loser' }],
    optionLabel: [{ id: 'default', label: 'Default' }, { id: 'winner', label: 'Winner' }, { id: 'loser', label: 'Loser' }],
    percentage: [{ id: 'default', label: 'Default' }, { id: 'winner', label: 'Winner' }, { id: 'loser', label: 'Loser' }, { id: 'leading', label: 'Leading' }],
    status: [{ id: 'default', label: 'Default' }, { id: 'open', label: 'Open' }, { id: 'locked', label: 'Locked' }, { id: 'result', label: 'Result' }],
    progressBar: [{ id: 'default', label: 'Default' }, { id: 'winner', label: 'Winner' }, { id: 'loser', label: 'Loser' }],
    container: COMMON_STATE_DEFINITIONS.container,
  },
  slot_requests: {
    requestCard: [{ id: 'default', label: 'Default' }, { id: 'pending', label: 'Pending' }, { id: 'selected', label: 'Selected' }, { id: 'playing', label: 'Playing' }, { id: 'completed', label: 'Completed' }, { id: 'rejected', label: 'Rejected' }],
    container: COMMON_STATE_DEFINITIONS.container,
  },
  giveaway: {
    winnerCard: [{ id: 'default', label: 'Default' }, { id: 'winner', label: 'Winner' }, { id: 'drawing', label: 'Drawing' }],
    participantList: [{ id: 'default', label: 'Default' }, { id: 'empty', label: 'Empty' }],
    container: COMMON_STATE_DEFINITIONS.container,
  },
  rtp_stats: {
    statCard: [{ id: 'default', label: 'Default' }, { id: 'positive', label: 'Positive' }, { id: 'negative', label: 'Negative' }, { id: 'highlight', label: 'Highlight' }],
    chart: [{ id: 'default', label: 'Default' }, { id: 'loading', label: 'Loading' }],
    container: COMMON_STATE_DEFINITIONS.container,
  },
  navbar: {
    music: [{ id: 'default', label: 'Default' }, { id: 'connected', label: 'Connected' }, { id: 'disconnected', label: 'Disconnected' }],
    crypto: [{ id: 'default', label: 'Default' }, { id: 'positive', label: 'Positive' }, { id: 'negative', label: 'Negative' }],
  },
  bonus_buys: {
    sessionCard: [{ id: 'default', label: 'Default' }, { id: 'profit', label: 'Profit' }, { id: 'loss', label: 'Loss' }],
    progressBar: [{ id: 'default', label: 'Default' }, { id: 'complete', label: 'Complete' }],
    container: COMMON_STATE_DEFINITIONS.container,
  },
  tournament: {
    participantCard: [{ id: 'default', label: 'Default' }, { id: 'winner', label: 'Winner' }, { id: 'eliminated', label: 'Eliminated' }, { id: 'active', label: 'Active' }],
    connector: [{ id: 'default', label: 'Default' }, { id: 'winner-path', label: 'Winner path' }],
    container: COMMON_STATE_DEFINITIONS.container,
  },
  current_slot: {
    imageFrame: [{ id: 'default', label: 'Default' }, { id: 'missing-image', label: 'Missing image' }, { id: 'changing', label: 'Changing' }],
    container: COMMON_STATE_DEFINITIONS.container,
  },
  chat: {
    message: [{ id: 'default', label: 'Default' }, { id: 'highlighted', label: 'Highlighted' }, { id: 'bot', label: 'Bot' }, { id: 'subscriber', label: 'Subscriber' }, { id: 'moderator', label: 'Moderator' }],
    container: [{ id: 'default', label: 'Default' }, { id: 'entrance', label: 'Entrance' }, { id: 'exit', label: 'Exit' }, { id: 'fade', label: 'Fade' }],
  },
};

const WIDGET_TYPE_APPEARANCE_DEFAULTS = {
  giveaway: {
    appearance: {
      colors: {
        accent: '#9346ff',
        text: '#ffffff',
        muted: '#94a3b8',
      },
      typography: {
        bodyFont: "'Inter', sans-serif",
      },
      surfaces: {
        containerBg: '#13151e',
        cardBg: 'rgba(255,255,255,0.04)',
      },
      borders: {
        color: 'rgba(255,255,255,0.08)',
        radius: 12,
      },
    },
    subElements: {
      container: {
        background: '#13151e',
        textColor: '#ffffff',
        borderColor: 'rgba(255,255,255,0.08)',
        radius: 12,
      },
      card: {
        background: 'rgba(255,255,255,0.04)',
        textColor: '#ffffff',
        borderColor: 'rgba(255,255,255,0.08)',
        radius: 12,
      },
      keyword: {
        background: 'rgba(255,255,255,0.04)',
        textColor: '#ffffff',
        radius: 12,
      },
      counter: {
        background: 'rgba(255,255,255,0.04)',
        textColor: '#ffffff',
        radius: 12,
      },
      emptyState: {
        textColor: '#94a3b8',
      },
    },
  },
  tournament: {
    appearance: {
      colors: {
        accent: '#facc15',
        text: '#ffffff',
        muted: '#94a3b8',
        positive: '#22c55e',
        negative: '#ef4444',
      },
      typography: {
        bodyFont: "'Inter', sans-serif",
        baseSize: 12,
      },
      surfaces: {
        containerBg: '#13151e',
        cardBg: '#1a1d2e',
        padding: 6,
        gap: 6,
      },
      borders: {
        color: 'transparent',
        radius: 12,
        width: 0,
      },
    },
    subElements: {
      container: {
        background: '#13151e',
        borderColor: 'transparent',
        borderWidth: 0,
        radius: 12,
        padding: 6,
      },
      participantCard: {
        background: '#1a1d2e',
        textColor: '#ffffff',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        radius: 10,
        fontSize: 12,
        gap: 6,
        states: {
          winner: { textColor: '#22c55e' },
          eliminated: {
            opacity: 0.35,
            textColor: '#eab308',
            background: 'rgba(0,0,0,0.7)',
          },
        },
      },
      score: {
        textColor: '#facc15',
        fontSize: 13,
        mutedColor: '#94a3b8',
        negativeColor: '#ef4444',
      },
      label: {
        textColor: '#ffffff',
        fontSize: 10,
      },
      connector: {
        textColor: '#eab308',
        background: 'rgba(0,0,0,0.85)',
        imageSize: 20,
      },
      timer: {
        textColor: '#818cf8',
        background: 'rgba(0,0,0,0.85)',
      },
      slotImage: {
        background: 'rgba(0,0,0,0.3)',
        radius: 6,
      },
      emptyState: {
        textColor: '#64748b',
        fontSize: 14,
      },
    },
  },
};

const SUB_ELEMENT_DEFAULT_PATHS = {
  background: 'surfaces.cardBg',
  textColor: 'colors.text',
  mutedColor: 'colors.muted',
  borderColor: 'borders.color',
  fillColor: 'colors.success',
  accentColor: 'colors.accent',
  radius: 'borders.radius',
  borderWidth: 'borders.width',
  fontFamily: 'typography.bodyFont',
  fontSize: 'typography.baseSize',
  fontWeight: 'typography.bodyWeight',
  fontStyle: 'typography.fontStyle',
  lineHeight: 'typography.lineHeight',
  letterSpacing: 'typography.letterSpacing',
  textTransform: 'typography.textTransform',
  textAlign: 'typography.textAlign',
  padding: 'surfaces.padding',
  gap: 'surfaces.gap',
  opacity: 'surfaces.opacity',
  shadow: 'effects.shadowBlur',
  shadowColor: 'effects.shadowColor',
  height: 'spacing.buttonHeight',
  imageSize: 'spacing.statSize',
  blur: 'effects.backdropBlur',
  brightness: 'effects.brightness',
  contrast: 'effects.contrast',
  saturation: 'effects.saturation',
};

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

export function getElementAppearancePropertyPath(property) {
  return FLAT_TO_ELEMENT_PATH[property] || property;
}

function isElementGroupKey(key) {
  return Object.prototype.hasOwnProperty.call(ELEMENT_APPEARANCE_GROUPS, key);
}

function flattenElementAppearance(appearance = {}) {
  if (!isPlainObject(appearance)) return {};
  const { states, responsive, ...rest } = appearance;
  let flat = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === RESET_VALUE) continue;
    if (isElementGroupKey(key) && isPlainObject(value)) {
      for (const [groupProperty, groupValue] of Object.entries(value)) {
        if (groupValue === undefined || groupValue === RESET_VALUE) continue;
        const flatProperty = ELEMENT_PATH_TO_FLAT[`${key}.${groupProperty}`] || groupProperty;
        flat[flatProperty] = groupValue;
      }
    } else {
      flat[key] = value;
    }
  }
  if (isPlainObject(states)) {
    const flatStates = Object.fromEntries(Object.entries(states).map(([stateId, stateAppearance]) => [stateId, flattenElementAppearance(stateAppearance)]));
    if (Object.keys(flatStates).length > 0) flat.states = flatStates;
  }
  if (isPlainObject(responsive)) flat.responsive = responsive;
  return flat;
}

export function elementsAppearanceToSubElements(elements = {}) {
  if (!isPlainObject(elements)) return {};
  return Object.fromEntries(Object.entries(elements).map(([elementId, elementAppearance]) => [elementId, flattenElementAppearance(elementAppearance)]));
}

function expandSubElementAppearance(subElement = {}) {
  if (!isPlainObject(subElement)) return {};
  const { states, responsive, ...rest } = subElement;
  let expanded = {};
  for (const [property, value] of Object.entries(rest)) {
    if (value === undefined || value === RESET_VALUE) continue;
    const groupedPath = getElementAppearancePropertyPath(property);
    expanded = groupedPath === property
      ? setByPath(expanded, property, value)
      : setByPath(expanded, groupedPath, value);
  }
  if (isPlainObject(states)) {
    expanded.states = Object.fromEntries(Object.entries(states).map(([stateId, stateValue]) => [stateId, expandSubElementAppearance(stateValue)]));
  }
  if (isPlainObject(responsive)) expanded.responsive = responsive;
  return expanded;
}

export function subElementsToElementsAppearance(subElements = {}) {
  if (!isPlainObject(subElements)) return {};
  return Object.fromEntries(Object.entries(subElements).map(([elementId, subElement]) => [elementId, expandSubElementAppearance(subElement)]));
}

export function getEntrySubElements(entry = {}) {
  if (!isPlainObject(entry)) return {};
  return deepMerge(
    isPlainObject(entry.subElements) ? entry.subElements : {},
    elementsAppearanceToSubElements(entry.elements)
  );
}

function migrateOverrideEntryElements(entry = {}) {
  if (!isPlainObject(entry)) return entry;
  const migrated = { ...entry };
  if (isPlainObject(entry.subElements)) {
    migrated.elements = deepMerge(subElementsToElementsAppearance(entry.subElements), entry.elements || {});
  } else if (!isPlainObject(entry.elements)) {
    migrated.elements = {};
  }
  if (isPlainObject(entry.styles)) {
    migrated.styles = Object.fromEntries(Object.entries(entry.styles).map(([styleId, styleEntry]) => [styleId, migrateOverrideEntryElements(styleEntry)]));
  }
  return migrated;
}

function migrateAppearanceSchema(input = {}) {
  if (!isPlainObject(input)) return {};
  const next = { ...input, schemaVersion: APPEARANCE_SCHEMA_VERSION };
  if (isPlainObject(input.widgetTypes)) {
    next.widgetTypes = Object.fromEntries(Object.entries(input.widgetTypes).map(([widgetType, entry]) => [widgetType, migrateOverrideEntryElements(entry)]));
  }
  if (isPlainObject(input.widgets)) {
    next.widgets = Object.fromEntries(Object.entries(input.widgets).map(([widgetId, entry]) => [widgetId, migrateOverrideEntryElements(entry)]));
  }
  return next;
}

export function isScopedAppearancePath(path) {
  const [root] = String(path || '').split('.');
  return SCOPED_APPEARANCE_ROOTS.has(root);
}

export function getTargetOverrideRoot(target) {
  if (!target || target.scope === 'overlay' || target.scope === 'all_widgets') return '';
  if (target.scope === 'widget_type' && target.widgetType) {
    return target.styleId
      ? `widgetTypes.${target.widgetType}.styles.${target.styleId}`
      : `widgetTypes.${target.widgetType}`;
  }
  if (target.scope === 'widget_instance' && target.widgetId) {
    return target.styleId
      ? `widgets.${target.widgetId}.styles.${target.styleId}`
      : `widgets.${target.widgetId}`;
  }
  return '';
}

export function getScopedAppearancePath(target, path) {
  const root = getTargetOverrideRoot(target);
  if (!root || !isScopedAppearancePath(path)) return path;
  return `${root}.appearance.${path}`;
}

export function getScopedVisualPath(target, key) {
  const root = getTargetOverrideRoot(target);
  if (!root) return '';
  return `${root}.visual.${key}`;
}

export function getAppearancePathForVisualKey(key) {
  return VISUAL_TO_APPEARANCE_PATH[key] || '';
}

function stripScopedOverrides(appearance = {}) {
  const { widgetTypes, widgets, ...rest } = appearance || {};
  return rest;
}

function visualToAppearance(visual = {}) {
  let next = {};
  for (const [key, value] of Object.entries(visual || {})) {
    const path = VISUAL_TO_APPEARANCE_PATH[key];
    if (!path || value === undefined || value === RESET_VALUE) continue;
    const normalizedValue = key === 'shadowIntensity'
      ? clampNumber(value, 0, 100, 0) / 100
      : key === 'animSpeed'
        ? Math.round(clampNumber(value, 0, 10, 1) * 350)
        : value;
    next = setByPath(next, path, normalizedValue);
  }
  return next;
}

function appearanceToVisualOverride(appearance = {}) {
  const visual = {};
  for (const [path, key] of Object.entries(APPEARANCE_PATH_TO_VISUAL)) {
    const value = getByPath(appearance, path);
    if (value === undefined || value === RESET_VALUE) continue;
    visual[key] = key === 'shadowIntensity'
      ? Math.round(clampNumber(value, 0, 1, 0) * 100)
      : key === 'animSpeed'
        ? Math.max(0, Number(value) / 350)
        : value;
  }
  return visual;
}

function readOverrideEntry(entry = {}) {
  if (!isPlainObject(entry)) return { appearance: {}, visual: {} };
  const visual = getVisualOverride({ current: entry }, 'current');
  const elements = isPlainObject(entry.elements) ? entry.elements : {};
  return {
    appearance: deepMerge(visualToAppearance(visual), entry.appearance || {}),
    visual,
    elements,
    subElements: getEntrySubElements(entry),
  };
}

export function getWidgetStyleConfigKey(widgetType) {
  const def = getWidgetDef(widgetType);
  return def?.styleConfigKey || 'displayStyle';
}

export function getWidgetStyleOptions(widgetType, appearance, widgetId) {
  const def = getWidgetDef(widgetType);
  const registeredStyles = Array.isArray(def?.styles) ? def.styles : [];
  const customStyles = widgetId
    ? normalizeAppearance(appearance).widgets?.[widgetId]?.customStyles || {}
    : {};
  return [
    ...registeredStyles.map(style => ({
      id: style.id,
      label: style.label || style.id,
      icon: style.icon || '',
      baseStyleId: style.id,
      custom: false,
    })),
    ...Object.values(customStyles).filter(Boolean).map(style => ({
      id: style.id,
      label: style.label || style.id,
      icon: style.icon || '*',
      baseStyleId: style.baseStyleId || style.id,
      custom: true,
    })),
  ];
}

export function getWidgetActiveStyleId(widget, appearance) {
  if (!widget) return '';
  const normalized = normalizeAppearance(appearance);
  const entry = normalized.widgets?.[widget.id] || {};
  const key = getWidgetStyleConfigKey(widget.widget_type);
  return entry.activeStyleId || widget.config?.[key] || getWidgetDef(widget.widget_type)?.styles?.[0]?.id || 'default';
}

export function getWidgetStyleRenderId(widget, styleId, appearance) {
  if (!widget) return styleId || 'default';
  const normalized = normalizeAppearance(appearance);
  const custom = normalized.widgets?.[widget.id]?.customStyles?.[styleId];
  return custom?.baseStyleId || styleId || getWidgetActiveStyleId(widget, appearance);
}

export function getTargetStyleId(target, appearance, widgets = []) {
  if (!target || target.scope === 'overlay' || target.scope === 'all_widgets') return '';
  if (target.styleId) return target.styleId;
  if (target.scope === 'widget_instance') {
    const widget = widgets.find(item => item.id === target.widgetId) || { id: target.widgetId, widget_type: target.widgetType, config: {} };
    return getWidgetActiveStyleId(widget, appearance);
  }
  return getWidgetDef(target.widgetType)?.styles?.[0]?.id || 'default';
}

export function getWidgetSubElementDefinitions(widgetType) {
  const def = getWidgetDef(widgetType);
  const explicitDefinitions = WIDGET_SUB_ELEMENT_DEFINITIONS[widgetType] || COMMON_SUB_ELEMENT_DEFINITIONS;
  const registryDefinitions = [
    ...(Array.isArray(def?.appearanceElements) ? def.appearanceElements : []),
    ...inferSubElementDefinitions(WIDGET_TYPE_APPEARANCE_DEFAULTS[widgetType]),
    ...inferSubElementDefinitions(def?.appearanceDefaults),
  ];
  return mergeSubElementDefinitions(explicitDefinitions, registryDefinitions).map(definition => ({
    ...definition,
    states: definition.states || getWidgetStateDefinitions(widgetType, definition.id),
  }));
}

function mergeSubElementDefinitions(...groups) {
  const map = new Map();
  for (const definition of groups.flat().filter(Boolean)) {
    if (!definition.id) continue;
    const existing = map.get(definition.id) || { id: definition.id, label: formatElementDefinitionLabel(definition.id), properties: [] };
    map.set(definition.id, {
      ...existing,
      ...definition,
      label: definition.label || existing.label,
      properties: [...new Set([...(existing.properties || []), ...(definition.properties || [])])],
      states: definition.states || existing.states,
    });
  }
  return [...map.values()];
}

function inferSubElementDefinitions(entry = {}) {
  if (!isPlainObject(entry)) return [];
  const root = readOverrideEntry(entry);
  const styleDefinitions = isPlainObject(entry.styles)
    ? Object.values(entry.styles).flatMap(styleEntry => inferSubElementDefinitions(styleEntry))
    : [];
  const ownDefinitions = Object.entries(root.subElements || {}).map(([elementId, values]) => ({
    id: elementId,
    label: formatElementDefinitionLabel(elementId),
    properties: collectSubElementProperties(values),
  }));
  return [...ownDefinitions, ...styleDefinitions];
}

function collectSubElementProperties(values = {}) {
  if (!isPlainObject(values)) return [];
  const keys = Object.keys(values).filter(key => key !== 'states' && key !== 'responsive');
  const stateKeys = isPlainObject(values.states)
    ? Object.values(values.states).flatMap(stateValue => collectSubElementProperties(stateValue))
    : [];
  return [...new Set([...keys, ...stateKeys])];
}

function formatElementDefinitionLabel(value) {
  return String(value || '').replace(/([A-Z])/g, ' $1').replace(/^./, character => character.toUpperCase());
}

export function getWidgetStateDefinitions(widgetType, elementId) {
  return WIDGET_STATE_DEFINITIONS[widgetType]?.[elementId]
    || COMMON_STATE_DEFINITIONS[elementId]
    || [{ id: 'default', label: 'Default' }];
}

export function getWidgetAppearanceDefinition(widgetType) {
  const def = getWidgetDef(widgetType);
  return {
    type: widgetType,
    styles: Array.isArray(def?.styles) ? def.styles : [],
    elements: getWidgetSubElementDefinitions(widgetType),
    supportedProperties: COMMON_APPEARANCE_PROPERTY_DEFINITIONS,
    stateDefinitions: WIDGET_STATE_DEFINITIONS[widgetType] || {},
    responsiveCapabilities: def?.appearanceCapabilities?.responsive === false
      ? { enabled: false, modes: [] }
      : { enabled: true, modes: ['viewport', 'compact', 'mobile'] },
    defaults: {
      ...(def?.defaults || {}),
      appearance: WIDGET_TYPE_APPEARANCE_DEFAULTS[widgetType] || def?.appearanceDefaults || {},
    },
  };
}

function getElementTypographyRole(elementId = '') {
  const id = String(elementId || '').toLowerCase();
  if (/title|heading|header|question|prize/.test(id)) return 'heading';
  if (/number|percent|percentage|value|amount|total|stat|score|cost|payout|profit|loss|multi|rtp|timer|clock/.test(id)) return 'number';
  return 'body';
}

export function getSubElementPropertyDefault(property, appearance, elementId = '') {
  const a = normalizeAppearance(appearance);
  const id = String(elementId || '').toLowerCase();
  const typographyRole = getElementTypographyRole(elementId);
  if (property === 'background') {
    if (/container|canvas|root/.test(id)) return a.surfaces.containerBg || a.colors.surface;
    if (/title|heading|header|status/.test(id)) return a.surfaces.headerBg || a.surfaces.cardBg;
    if (/progress|bar/.test(id)) return a.colors.divider;
    return a.surfaces.cardBg;
  }
  if (property === 'fontFamily') {
    if (typographyRole === 'heading') return a.typography.headingFont || a.typography.bodyFont;
    if (typographyRole === 'number') return a.typography.numberFont || a.typography.bodyFont;
    return a.typography.bodyFont;
  }
  if (property === 'fontSize' && typographyRole === 'heading') {
    return Math.round((Number(a.typography.baseSize) || 14) * (Number(a.typography.headingScale) || 1.22));
  }
  const path = SUB_ELEMENT_DEFAULT_PATHS[property];
  if (!path) return undefined;
  return getByPath(a, path);
}

export function buildSubElementDefaults(widgetType, appearance) {
  const a = normalizeAppearance(appearance);
  return getWidgetSubElementDefinitions(widgetType).reduce((acc, definition) => {
    const values = {};
    for (const property of definition.properties || []) {
      const value = getSubElementPropertyDefault(property, a, definition.id);
      if (value !== undefined) values[property] = value;
    }
    acc[definition.id] = values;
    return acc;
  }, {});
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
  const migratedInput = migrateAppearanceSchema(input);
  const merged = deepMerge(
    SYSTEM_APPEARANCE,
    getThemeAppearance(themeId),
    migrated,
    migratedInput,
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
    headingFont: a.typography.headingFont,
    bodyFont: a.typography.bodyFont,
    numberFont: a.typography.numberFont,
    headingScale: a.typography.headingScale,
    lineHeight: a.typography.lineHeight,
    letterSpacing: a.typography.letterSpacing,
    textTransform: a.typography.textTransform,
    textAlign: a.typography.textAlign,
    borderRadius: a.borders.radius,
    cardRadius: a.borders.radius,
    borderWidth: a.borders.enabled ? a.borders.width : 0,
    cardBorderWidth: a.borders.enabled ? a.borders.width : 0,
    containerPadding: a.surfaces.padding,
    cardGap: a.surfaces.gap,
    ...(Number.isFinite(Number(a.container?.width)) ? { widgetWidth: Number(a.container.width) } : {}),
    ...(Number.isFinite(Number(a.container?.height)) ? { widgetHeight: Number(a.container.height) } : {}),
    widgetScale: a.spacing.widgetScale,
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

export function resolveAppearance({
  systemDefaults = SYSTEM_APPEARANCE,
  theme = {},
  globalAppearance = {},
  widgetTypeAppearance = {},
  widgetInstanceAppearance = {},
  draftAppearance = {},
} = {}) {
  const themeAppearance = typeof theme === 'string'
    ? getThemeAppearance(theme)
    : theme;
  const themeId = globalAppearance?.themeId
    || themeAppearance?.themeId
    || systemDefaults?.themeId
    || 'classic';
  return normalizeAppearance(deepMerge(
    systemDefaults,
    themeAppearance,
    stripScopedOverrides(globalAppearance),
    widgetTypeAppearance,
    widgetInstanceAppearance,
    draftAppearance,
    { schemaVersion: APPEARANCE_SCHEMA_VERSION, themeId }
  ));
}

export function resolveAppearanceForTarget(appearance, target, theme) {
  const normalized = normalizeAppearance(appearance, { theme });
  const styleId = target?.styleId || '';
  const typeStyleId = target?.scope === 'widget_instance'
    ? normalized.widgets?.[target.widgetId]?.customStyles?.[styleId]?.baseStyleId || styleId
    : styleId;
  const typeEntry = target?.scope === 'widget_type'
    ? normalized.widgetTypes?.[target.widgetType]
    : target?.scope === 'widget_instance'
      ? normalized.widgetTypes?.[target.widgetType]
      : null;
  const typeStyleEntry = styleId && (target?.scope === 'widget_type' || target?.scope === 'widget_instance')
    ? normalized.widgetTypes?.[target.widgetType]?.styles?.[typeStyleId]
    : null;
  const instanceEntry = target?.scope === 'widget_instance'
    ? normalized.widgets?.[target.widgetId]
    : null;
  const instanceStyleEntry = styleId && target?.scope === 'widget_instance'
    ? normalized.widgets?.[target.widgetId]?.styles?.[styleId]
    : null;
  return resolveAppearance({
    systemDefaults: SYSTEM_APPEARANCE,
    theme: getThemeAppearance(normalized.themeId || theme?.style_preset || 'classic'),
    globalAppearance: normalized,
    widgetTypeAppearance: readOverrideEntry(typeEntry).appearance,
    widgetInstanceAppearance: deepMerge(
      readOverrideEntry(typeStyleEntry).appearance,
      readOverrideEntry(instanceEntry).appearance,
      readOverrideEntry(instanceStyleEntry).appearance
    ),
  });
}

function splitElementState(element = {}) {
  if (!isPlainObject(element)) return { base: {}, states: {} };
  const { states, ...base } = element;
  return {
    base,
    states: isPlainObject(states) ? states : {},
  };
}

function readSubElementOverride(entry = {}, elementId, stateId = 'default') {
  const element = getEntrySubElements(entry)?.[elementId];
  const { base, states } = splitElementState(element);
  const stateValues = stateId && stateId !== 'default' && isPlainObject(states[stateId])
    ? states[stateId]
    : {};
  return deepMerge(base, stateValues);
}

function viewportMatchesOverride(override = {}, viewport = {}) {
  if (!viewport || !isPlainObject(override)) return false;
  const width = Number(viewport.width);
  const height = Number(viewport.height);
  if (override.minWidth != null && (!Number.isFinite(width) || width < Number(override.minWidth))) return false;
  if (override.maxWidth != null && (!Number.isFinite(width) || width > Number(override.maxWidth))) return false;
  if (override.minHeight != null && (!Number.isFinite(height) || height < Number(override.minHeight))) return false;
  if (override.maxHeight != null && (!Number.isFinite(height) || height > Number(override.maxHeight))) return false;
  return override.minWidth != null || override.maxWidth != null || override.minHeight != null || override.maxHeight != null;
}

function collectResponsiveOverrides(source = {}, viewport = {}) {
  const responsive = source?.responsive;
  const overrides = responsive?.overrides;
  if (!overrides) return {};
  if (Array.isArray(overrides)) {
    return overrides.filter(item => viewportMatchesOverride(item, viewport)).reduce((acc, item) => deepMerge(acc, item.appearance || item), {});
  }
  if (isPlainObject(overrides)) {
    return Object.values(overrides).filter(item => viewportMatchesOverride(item, viewport)).reduce((acc, item) => deepMerge(acc, item.appearance || item), {});
  }
  return {};
}

function isColorPropertyName(property) {
  return /color|background|fill/i.test(property);
}

function sanitizeElementTokenValue(property, value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (isColorPropertyName(property)) return sanitizeColor(value, fallback);
  if (/opacity/i.test(property)) return clampNumber(value, 0, 1, fallback ?? 1);
  if (/fontWeight/i.test(property)) return clampNumber(value, 100, 1000, fallback ?? 600);
  if (/brightness|contrast|saturation/i.test(property)) return clampNumber(value, 0, 200, fallback ?? 100);
  if (/radius|padding|gap|fontSize|imageSize|height|width|blur|shadow|borderWidth/i.test(property)) return clampNumber(value, 0, 1000, fallback ?? 0);
  return value;
}

function sanitizeElementTokens(tokens = {}, fallback = {}) {
  const next = {};
  const keys = new Set([...Object.keys(fallback || {}), ...Object.keys(tokens || {})]);
  for (const key of keys) {
    if (key === 'states') continue;
    const value = sanitizeElementTokenValue(key, tokens[key], fallback[key]);
    if (value !== undefined) next[key] = value;
  }
  return next;
}

export function resolveWidgetAppearance({
  widgetType,
  widgetId,
  styleId,
  elementId = 'container',
  stateId = 'default',
  viewport,
  theme,
  globalAppearance = {},
  typeAppearance,
  styleAppearance,
  instanceAppearance,
  elementAppearance = {},
  responsiveAppearance = {},
  draftAppearance = {},
} = {}) {
  const normalized = normalizeAppearance(globalAppearance, { theme });
  const def = getWidgetDef(widgetType);
  const requestedStyleId = styleId || def?.styles?.[0]?.id || 'default';
  const renderStyleId = widgetId
    ? getWidgetStyleRenderId({ id: widgetId, widget_type: widgetType, config: {} }, requestedStyleId, normalized)
    : requestedStyleId;
  const typeEntry = readOverrideEntry(typeAppearance ?? normalized.widgetTypes?.[widgetType]);
  const typeStyleEntry = readOverrideEntry(styleAppearance ?? normalized.widgetTypes?.[widgetType]?.styles?.[renderStyleId]);
  const instanceEntry = readOverrideEntry(instanceAppearance ?? normalized.widgets?.[widgetId]);
  const instanceStyleEntry = readOverrideEntry(widgetId ? normalized.widgets?.[widgetId]?.styles?.[requestedStyleId] : {});
  const responsiveEntry = collectResponsiveOverrides(normalized, viewport);
  const explicitResponsiveEntry = collectResponsiveOverrides({ responsive: responsiveAppearance }, viewport);
  const draftEntry = readOverrideEntry(draftAppearance);
  const appearance = resolveAppearance({
    systemDefaults: SYSTEM_APPEARANCE,
    theme: getThemeAppearance(normalized.themeId || theme?.style_preset || 'classic'),
    globalAppearance: normalized,
    widgetTypeAppearance: deepMerge(typeEntry.appearance, typeStyleEntry.appearance),
    widgetInstanceAppearance: deepMerge(instanceEntry.appearance, instanceStyleEntry.appearance),
    draftAppearance: deepMerge(responsiveEntry, explicitResponsiveEntry, draftEntry.appearance),
  });
  const elementDefaults = buildSubElementDefaults(widgetType, appearance)[elementId] || {};
  const elementTokens = sanitizeElementTokens(deepMerge(
    elementDefaults,
    readSubElementOverride(typeEntry, elementId, stateId),
    readSubElementOverride(typeStyleEntry, elementId, stateId),
    readSubElementOverride(instanceEntry, elementId, stateId),
    readSubElementOverride(instanceStyleEntry, elementId, stateId),
    readSubElementOverride(responsiveEntry, elementId, stateId),
    readSubElementOverride(explicitResponsiveEntry, elementId, stateId),
    elementAppearance,
    readSubElementOverride(draftEntry, elementId, stateId)
  ), elementDefaults);

  return {
    schemaVersion: APPEARANCE_SCHEMA_VERSION,
    widgetType,
    widgetId,
    styleId: requestedStyleId,
    renderStyleId,
    elementId,
    stateId,
    appearance,
    widget: appearanceToWidgetConfigDefaults(appearance),
    element: elementTokens,
    states: getWidgetStateDefinitions(widgetType, elementId),
    sourceOrder: ['system', 'theme', 'global', 'widget-type', 'widget-style', 'widget-instance', 'widget-element', 'responsive', 'draft'],
  };
}

export function getAppearancePropertyState({ appearance, target, path, theme, draftAppearance } = {}) {
  const normalized = normalizeAppearance(appearance, { theme });
  const styleId = target?.styleId || '';
  const typeStyleId = target?.scope === 'widget_instance'
    ? normalized.widgets?.[target.widgetId]?.customStyles?.[styleId]?.baseStyleId || styleId
    : styleId;
  const globalResolved = resolveAppearance({
    systemDefaults: SYSTEM_APPEARANCE,
    theme: getThemeAppearance(normalized.themeId || theme?.style_preset || 'classic'),
    globalAppearance: normalized,
  });
  const typeEntry = target?.scope === 'widget_type'
    ? readOverrideEntry(normalized.widgetTypes?.[target.widgetType]).appearance
    : target?.scope === 'widget_instance'
      ? readOverrideEntry(normalized.widgetTypes?.[target.widgetType]).appearance
      : {};
  const typeStyleEntry = styleId && (target?.scope === 'widget_type' || target?.scope === 'widget_instance')
    ? readOverrideEntry(normalized.widgetTypes?.[target.widgetType]?.styles?.[typeStyleId]).appearance
    : {};
  const instanceEntry = target?.scope === 'widget_instance'
    ? readOverrideEntry(normalized.widgets?.[target.widgetId]).appearance
    : {};
  const instanceStyleEntry = styleId && target?.scope === 'widget_instance'
    ? readOverrideEntry(normalized.widgets?.[target.widgetId]?.styles?.[styleId]).appearance
    : {};
  const typeValue = getByPath(typeEntry, path);
  const typeStyleValue = getByPath(typeStyleEntry, path);
  const instanceValue = getByPath(instanceEntry, path);
  const instanceStyleValue = getByPath(instanceStyleEntry, path);
  const draftValue = getByPath(draftAppearance, path);
  const effective = resolveAppearance({
    systemDefaults: SYSTEM_APPEARANCE,
    theme: getThemeAppearance(normalized.themeId || theme?.style_preset || 'classic'),
    globalAppearance: normalized,
    widgetTypeAppearance: deepMerge(typeEntry, typeStyleEntry),
    widgetInstanceAppearance: deepMerge(instanceEntry, instanceStyleEntry),
    draftAppearance,
  });
  const source = draftValue !== undefined ? 'draft'
    : instanceStyleValue !== undefined ? 'style-instance'
      : instanceValue !== undefined ? 'widget-instance'
        : typeStyleValue !== undefined ? 'style-default'
          : typeValue !== undefined ? 'widget-type'
        : getByPath(normalized, path) !== undefined ? 'global'
          : getByPath(getThemeAppearance(normalized.themeId), path) !== undefined ? 'theme'
            : 'system';
  return {
    inheritedValue: getByPath(globalResolved, path),
    overrideValue: instanceStyleValue ?? instanceValue ?? typeStyleValue ?? typeValue,
    draftValue,
    effectiveValue: getByPath(effective, path),
    source,
  };
}

function getVisualOverride(overrides = {}, typeOrId) {
  const target = overrides?.[typeOrId];
  if (!target) return {};
  const source = target.visual || target.tokens || target;
  return Object.fromEntries(Object.entries(source || {}).filter(([key]) => VISUAL_CONFIG_KEYS.includes(key) || key === 'custom_css'));
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
    || VISUAL_CONFIG_KEYS.includes(key)
    || key === 'custom_css'
  );
  for (const [key, value] of Object.entries(values || {})) {
    if (value === undefined || value === RESET_VALUE) continue;
    if (supportsKey(key)) config[key] = value;
  }
  return config;
}

export function resolveWidgetAppearanceConfig(widget, appearance, theme, options = {}) {
  if (!widget) return {};
  const def = getWidgetDef(widget.widget_type);
  const defaults = def?.defaults || {};
  const base = widget.config || {};
  const normalized = normalizeAppearance(appearance, { theme });
  const requestedStyleId = options.styleId || options.styleSelections?.[widget.id] || normalized.widgets?.[widget.id]?.activeStyleId || base[getWidgetStyleConfigKey(widget.widget_type)] || def?.styles?.[0]?.id || 'default';
  const renderStyleId = getWidgetStyleRenderId(widget, requestedStyleId, normalized);
  const typeEntry = readOverrideEntry(normalized.widgetTypes?.[widget.widget_type]);
  const typeStyleEntry = readOverrideEntry(normalized.widgetTypes?.[widget.widget_type]?.styles?.[renderStyleId]);
  const registryTypeDefaults = readOverrideEntry(WIDGET_TYPE_APPEARANCE_DEFAULTS[widget.widget_type] || def?.appearanceDefaults);
  const registryStyleDefaults = readOverrideEntry((WIDGET_TYPE_APPEARANCE_DEFAULTS[widget.widget_type]?.styles || def?.appearanceDefaults?.styles)?.[renderStyleId]);
  const instanceEntry = readOverrideEntry(normalized.widgets?.[widget.id]);
  const instanceStyleEntry = readOverrideEntry(normalized.widgets?.[widget.id]?.styles?.[requestedStyleId]);
  const resolved = resolveAppearance({
    systemDefaults: SYSTEM_APPEARANCE,
    theme: getThemeAppearance(normalized.themeId || theme?.style_preset || 'classic'),
    globalAppearance: normalized,
    widgetTypeAppearance: deepMerge(registryTypeDefaults.appearance, registryStyleDefaults.appearance, typeEntry.appearance, typeStyleEntry.appearance),
    widgetInstanceAppearance: deepMerge(instanceEntry.appearance, instanceStyleEntry.appearance),
  });
  const inherited = pickSupportedConfig(widget.widget_type, appearanceToWidgetConfigDefaults(resolved));
  const next = {
    ...base,
    [getWidgetStyleConfigKey(widget.widget_type)]: renderStyleId,
    __appearanceStyleId: requestedStyleId,
    __appearanceRenderStyleId: renderStyleId,
  };

  for (const [key, value] of Object.entries(inherited)) {
    if (shouldInheritVisualKey(key, base, defaults)) {
      next[key] = value;
    }
  }

  const typeOverride = pickSupportedConfig(widget.widget_type, {
    ...appearanceToVisualOverride(registryTypeDefaults.appearance),
    ...registryTypeDefaults.visual,
    ...appearanceToVisualOverride(registryStyleDefaults.appearance),
    ...registryStyleDefaults.visual,
    ...appearanceToVisualOverride(typeEntry.appearance),
    ...typeEntry.visual,
    ...appearanceToVisualOverride(typeStyleEntry.appearance),
    ...typeStyleEntry.visual,
  });
  const instanceOverride = pickSupportedConfig(widget.widget_type, {
    ...appearanceToVisualOverride(instanceEntry.appearance),
    ...instanceEntry.visual,
    ...appearanceToVisualOverride(instanceStyleEntry.appearance),
    ...instanceStyleEntry.visual,
  });
  const explicitSubElements = deepMerge(
    registryTypeDefaults.subElements,
    registryStyleDefaults.subElements,
    base.subElements || {},
    base.__appearanceExplicitSubElements || {},
    typeEntry.subElements,
    typeStyleEntry.subElements,
    instanceEntry.subElements,
    instanceStyleEntry.subElements
  );
  const resolvedConfig = {
    ...next,
    ...typeOverride,
    ...instanceOverride,
    __appearanceExplicitSubElements: explicitSubElements,
    subElements: deepMerge(
      buildSubElementDefaults(widget.widget_type, resolved),
      explicitSubElements
    ),
  };
  return applyWidgetAppearanceV2ToConfig(
    { ...widget, config: resolvedConfig },
    resolvedConfig,
    normalized,
    { styleId: requestedStyleId, renderStyleId }
  );
}

export function resolveWidgetsForAppearance(widgets = [], appearance, theme, options = {}) {
  return widgets.map(widget => ({
    ...widget,
    config: resolveWidgetAppearanceConfig(widget, appearance, theme, options),
  }));
}

export function buildWidgetAppearanceVars(config = {}) {
  const shadowSize = Number(config.shadowSize) || 0;
  const shadowIntensity = Number(config.shadowIntensity) || 0;
  const shadowOpacity = Math.max(0, Math.min(1, shadowIntensity / 100));
  const vars = {
    '--widget-accent': config.accentColor || 'var(--overlay-color-accent)',
    '--widget-surface': config.bgColor || 'var(--overlay-surface)',
    '--widget-card-bg': config.cardBg || 'var(--overlay-card-bg)',
    '--widget-header-bg': config.headerBg || config.bgColor || 'var(--overlay-surface-elevated)',
    '--widget-text': config.textColor || 'var(--overlay-text-primary)',
    '--widget-muted': config.mutedColor || config.mutedTextColor || 'var(--overlay-text-muted)',
    '--widget-border-color': config.borderColor || config.cardBorder || 'var(--overlay-border-color)',
    '--widget-border-width': `${Number(config.borderWidth ?? config.cardBorderWidth ?? 0) || 0}px`,
    '--widget-radius': `${Number(config.borderRadius ?? config.cardRadius ?? 0) || 0}px`,
    '--widget-font-family': config.fontFamily || 'var(--overlay-font-body)',
    '--widget-font-size': `${Number(config.fontSize) || 14}px`,
    '--widget-font-weight': config.fontWeight || 'var(--oc-font-weight)',
    '--widget-heading-font': config.headingFont || config.fontFamily || 'var(--overlay-font-heading)',
    '--widget-body-font': config.bodyFont || config.fontFamily || 'var(--overlay-font-body)',
    '--widget-number-font': config.numberFont || config.fontFamily || 'var(--overlay-font-number)',
    '--widget-heading-scale': Number(config.headingScale) || 1.22,
    '--widget-line-height': Number(config.lineHeight) || 1.45,
    '--widget-letter-spacing': typeof config.letterSpacing === 'number' ? `${config.letterSpacing}em` : (config.letterSpacing || '0em'),
    '--widget-text-transform': config.textTransform || 'none',
    '--widget-text-align': config.textAlign || 'left',
    '--widget-padding': `${Number(config.containerPadding ?? config.padding ?? config.paddingX ?? 0) || 0}px`,
    '--widget-gap': `${Number(config.cardGap ?? config.gap ?? 0) || 0}px`,
    '--widget-progress': config.progressColor || 'var(--overlay-color-success)',
    '--widget-progress-bg': config.progressBgColor || 'var(--overlay-divider)',
    '--widget-positive': config.bestColor || 'var(--overlay-color-positive)',
    '--widget-negative': config.worstColor || 'var(--overlay-color-negative)',
    '--widget-shadow': shadowSize > 0 && shadowOpacity > 0
      ? `0 ${Math.round(shadowSize * 0.35)}px ${Math.round(shadowSize * 0.7)}px rgba(0,0,0,${shadowOpacity.toFixed(2)})`
      : 'none',
  };
  const elementSubElements = Object.prototype.hasOwnProperty.call(config || {}, '__appearanceExplicitSubElements')
    ? config.__appearanceExplicitSubElements || {}
    : config.subElements || {};
  for (const [elementId, tokens] of Object.entries(elementSubElements)) {
    const elementPrefix = `--widget-${cssSafeName(elementId)}`;
    Object.assign(vars, buildElementAppearanceVars(tokens, elementPrefix));
    for (const [stateId, stateTokens] of Object.entries(tokens?.states || {})) {
      Object.assign(vars, buildElementAppearanceVars(stateTokens, `${elementPrefix}-${cssSafeName(stateId)}`));
    }
  }
  return {
    ...vars,
    ...(config.__appearanceV2Vars || {}),
  };
}

function cssSafeName(value) {
  return String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function toCssValue(property, value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number' && /letterSpacing/i.test(property)) return `${value}em`;
  if (typeof value === 'number' && /hueRotate/i.test(property)) return `${value}deg`;
  if (typeof value === 'number' && /brightness|contrast|saturation|grayscale|sepia/i.test(property)) return `${value}%`;
  if (typeof value === 'number' && !/opacity|fontWeight|lineHeight|scale/i.test(property)) return `${value}px`;
  return value;
}

export function buildElementAppearanceVars(tokens = {}, prefix = '--element') {
  const safePrefix = prefix.startsWith('--') ? prefix : `--${cssSafeName(prefix)}`;
  return Object.fromEntries(Object.entries(tokens || {}).filter(([key]) => key !== 'states').map(([key, value]) => ([
    `${safePrefix}-${cssSafeName(key)}`,
    toCssValue(key, value),
  ])).filter(([, value]) => value !== undefined));
}

export function buildScopedAppearanceVars(options = {}) {
  const resolved = options.element || resolveWidgetAppearance(options).element;
  return buildElementAppearanceVars(resolved, options.prefix || '--element');
}

function countOverrideEntry(entry = {}) {
  if (!isPlainObject(entry)) return 0;
  return countPlainLeaves(entry.appearance)
    + countPlainLeaves(entry.visual || entry.tokens)
    + countPlainLeaves(getEntrySubElements(entry));
}

function countPlainLeaves(value) {
  if (!isPlainObject(value)) return 0;
  return Object.values(value).reduce((total, item) => {
    if (isPlainObject(item)) return total + countPlainLeaves(item);
    return item === undefined ? total : total + 1;
  }, 0);
}

export function getWidgetOverrideCount(appearance, widgetId, styleId) {
  const entry = normalizeAppearance(appearance).widgets?.[widgetId];
  if (!entry) return 0;
  if (styleId) return countOverrideEntry(entry.styles?.[styleId]);
  return countOverrideEntry(entry) + countPlainLeaves(entry.styles);
}

export function getWidgetTypeOverrideCount(appearance, widgetType, styleId) {
  const entry = normalizeAppearance(appearance).widgetTypes?.[widgetType];
  if (!entry) return 0;
  if (styleId) return countOverrideEntry(entry.styles?.[styleId]);
  return countOverrideEntry(entry) + countPlainLeaves(entry.styles);
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
  const declared = def?.appearanceCapabilities?.customTokens || def?.appearanceCapabilities?.widgetSpecific || [];
  return VISUAL_CONFIG_KEYS.filter(key => (
    Object.prototype.hasOwnProperty.call(defaults, key)
    || declared.includes(key)
    || ['accentColor', 'bgColor', 'cardBg', 'textColor', 'mutedColor', 'borderColor', 'fontFamily', 'fontSize', 'borderRadius', 'borderWidth', 'shadowSize', 'shadowIntensity', 'animSpeed'].includes(key)
  )).filter((key, index, keys) => keys.indexOf(key) === index);
}
