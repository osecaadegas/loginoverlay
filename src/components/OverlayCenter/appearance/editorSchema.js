import { getWidgetDef } from '../widgets/widgetRegistry';
import {
  COMMON_APPEARANCE_PROPERTY_DEFINITIONS,
  RESET_VALUE,
  getByPath,
  getWidgetSubElementDefinitions,
  normalizeAppearanceControlValue,
} from './appearanceModel';

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
];

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
  imageSize: { id: 'imageSize', label: 'Image size', type: 'range', min: 30, max: 220, step: 1, unit: 'px', group: 'Background' },
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
const IMAGE_CONTROLS = ['imageSize', 'backgroundSize', 'backgroundPosition', 'radius', 'opacity', 'borderColor', 'borderWidth'];
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
  const props = declaredProperties(element);
  if (props.has(controlId)) return true;
  const definition = CONTROL_DEFINITIONS[controlId];
  if (!definition) return false;
  const kind = inferElementKind(element);
  if (kind === 'text') return TEXT_CONTROLS.includes(controlId) || ['opacity', 'shadowBlur', 'shadowOpacity'].includes(controlId);
  if (kind === 'surface') return SURFACE_CONTROLS.includes(controlId) || SIZE_CONTROLS.includes(controlId);
  if (kind === 'image') return IMAGE_CONTROLS.includes(controlId) || SIZE_CONTROLS.includes(controlId);
  if (kind === 'progress') return PROGRESS_CONTROLS.includes(controlId) || SIZE_CONTROLS.includes(controlId);
  return definition.simple || props.size === 0;
}

export function getElementControlGroups(element = {}, mode = 'simple') {
  const advanced = mode === 'advanced';
  const base = [
    ...TEXT_CONTROLS,
    ...SURFACE_CONTROLS,
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
