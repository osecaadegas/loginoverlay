import {
  deepMerge,
  getByPath,
  getWidgetActiveStyleId,
  normalizeAppearance,
  setByPath,
} from './appearanceModel';
import { getWidgetDef } from '../widgets/widgetRegistry';

export const WIDGET_STYLE_PACK_KIND = 'streamers-center.widget-style-pack';
export const WIDGET_STYLE_PACK_VERSION = 1;

const STYLE_ENTRY_KEYS = new Set([
  'activeStyleId',
  'appearance',
  'appearanceV2',
  'elements',
  'subElements',
  'visual',
  'customStyles',
]);

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

function sanitizeStyleEntry(entry = {}) {
  if (!isPlainObject(entry)) return {};
  const next = {};
  for (const [key, value] of Object.entries(entry)) {
    if (key === 'styles' && isPlainObject(value)) {
      const styles = {};
      for (const [styleId, styleEntry] of Object.entries(value)) {
        const cleanStyle = sanitizeStyleEntry(styleEntry);
        if (Object.keys(cleanStyle).length) styles[styleId] = cleanStyle;
      }
      if (Object.keys(styles).length) next.styles = styles;
      continue;
    }
    if (!STYLE_ENTRY_KEYS.has(key)) continue;
    const cloned = cloneJson(value);
    if (cloned !== undefined) next[key] = cloned;
  }
  return next;
}

export function createWidgetStylePack({ appearance, widgets = [], exportedAt = new Date().toISOString() } = {}) {
  const normalized = normalizeAppearance(appearance || {});
  const exportedWidgets = (widgets || [])
    .filter(widget => widget?.id && widget?.widget_type)
    .map(widget => {
      const entry = sanitizeStyleEntry(normalized.widgets?.[widget.id] || {});
      const activeStyleId = entry.activeStyleId || getWidgetActiveStyleId(widget, normalized);
      return {
        widgetType: widget.widget_type,
        widgetLabel: getWidgetDef(widget.widget_type)?.label || widget.widget_type,
        activeStyleId,
        style: {
          ...entry,
          activeStyleId,
        },
      };
    })
    .filter(item => Object.keys(item.style || {}).length > 0);

  return {
    kind: WIDGET_STYLE_PACK_KIND,
    schemaVersion: WIDGET_STYLE_PACK_VERSION,
    exportedAt,
    widgets: exportedWidgets,
  };
}

export function validateWidgetStylePack(pack) {
  if (!isPlainObject(pack)) return { valid: false, error: 'The selected file is not a valid JSON object.' };
  if (pack.kind !== WIDGET_STYLE_PACK_KIND) return { valid: false, error: 'This is not a Streamers Center widget style pack.' };
  if (pack.schemaVersion !== WIDGET_STYLE_PACK_VERSION) return { valid: false, error: 'This style pack version is not supported.' };
  if (!Array.isArray(pack.widgets)) return { valid: false, error: 'This style pack has no widget styles.' };
  return { valid: true, error: '' };
}

export function applyWidgetStylePack({ appearance, widgets = [], pack } = {}) {
  const validation = validateWidgetStylePack(pack);
  if (!validation.valid) {
    return { appearance: normalizeAppearance(appearance || {}), applied: 0, skipped: [], error: validation.error };
  }

  const importsByType = new Map();
  for (const item of pack.widgets) {
    if (!item?.widgetType) continue;
    const cleanStyle = sanitizeStyleEntry(item.style || {});
    if (!Object.keys(cleanStyle).length) continue;
    if (!importsByType.has(item.widgetType)) importsByType.set(item.widgetType, []);
    importsByType.get(item.widgetType).push({ ...item, style: cleanStyle });
  }

  let next = normalizeAppearance(appearance || {});
  const usedByType = new Map();
  let applied = 0;

  for (const widget of widgets || []) {
    if (!widget?.id || !widget?.widget_type) continue;
    const available = importsByType.get(widget.widget_type);
    if (!available?.length) continue;
    const index = usedByType.get(widget.widget_type) || 0;
    const source = available[Math.min(index, available.length - 1)];
    usedByType.set(widget.widget_type, index + 1);
    const root = `widgets.${widget.id}`;
    const existing = getByPath(next, root) || {};
    next = setByPath(next, root, deepMerge(existing, source.style));
    applied += 1;
  }

  const skipped = [];
  for (const [widgetType, entries] of importsByType.entries()) {
    const localCount = widgets.filter(widget => widget.widget_type === widgetType).length;
    if (localCount === 0) {
      skipped.push({
        widgetType,
        count: entries.length,
      });
    } else if (entries.length > 1 && localCount < entries.length) {
      skipped.push({
        widgetType,
        count: entries.length - localCount,
      });
    }
  }

  return {
    appearance: normalizeAppearance(next),
    applied,
    skipped,
    error: '',
  };
}
