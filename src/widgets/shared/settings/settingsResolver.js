import { WIDGET_STUDIO_SCHEMA_VERSION } from '../../registry/widgetTypes.js';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function getByPath(source, path) {
  if (!path) return source;
  return String(path).split('.').reduce((cursor, segment) => (
    cursor && Object.prototype.hasOwnProperty.call(cursor, segment) ? cursor[segment] : undefined
  ), source);
}

export function setByPath(source, path, value) {
  const segments = String(path).split('.');
  const output = Array.isArray(source) ? [...source] : { ...(source || {}) };
  let cursor = output;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }
    cursor[segment] = isPlainObject(cursor[segment]) ? { ...cursor[segment] } : {};
    cursor = cursor[segment];
  });
  return output;
}

export function unsetByPath(source, path) {
  const segments = String(path).split('.');
  const output = Array.isArray(source) ? [...source] : { ...(source || {}) };
  let cursor = output;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!isPlainObject(cursor[segment])) return output;
    cursor[segment] = { ...cursor[segment] };
    cursor = cursor[segment];
  }
  delete cursor[segments[segments.length - 1]];
  return output;
}

export function deepMerge(...sources) {
  const output = {};
  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      if (isPlainObject(value) && isPlainObject(output[key])) {
        output[key] = deepMerge(output[key], value);
      } else if (isPlainObject(value)) {
        output[key] = deepMerge(value);
      } else if (Array.isArray(value)) {
        output[key] = [...value];
      } else if (value !== undefined) {
        output[key] = value;
      }
    }
  }
  return output;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (typeof min === 'number' && number < min) return min;
  if (typeof max === 'number' && number > max) return max;
  return number;
}

function roundToStep(value, step) {
  if (!step) return value;
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

function normalizeColor(value, fallback) {
  const text = String(value || '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return text;
  if (/^rgba?\([\d\s.,%]+\)$/i.test(text)) return text;
  return fallback;
}

export function validateSettingValue(setting, value) {
  if (!setting) return value;
  if (value === undefined || value === null || value === '') return setting.defaultValue;
  if (setting.type === 'number' || setting.type === 'range') {
    const next = clampNumber(value, setting.min, setting.max, setting.defaultValue);
    return roundToStep(next, setting.step);
  }
  if (setting.type === 'color') return normalizeColor(value, setting.defaultValue);
  if (setting.type === 'boolean') return !!value;
  if (setting.type === 'select') {
    const allowed = new Set((setting.options || []).map(option => option.value));
    return allowed.has(value) ? value : setting.defaultValue;
  }
  return String(value);
}

export function validateWidgetSettings(settings = {}, schema = []) {
  let output = {};
  const errors = [];
  for (const setting of schema) {
    const rawValue = getByPath(settings, setting.key);
    const value = validateSettingValue(setting, rawValue);
    output = setByPath(output, setting.key, value);
    if (rawValue !== undefined && rawValue !== value) {
      errors.push({ key: setting.key, code: 'corrected-value', value });
    }
  }
  return { settings: output, errors };
}

export function defaultsFromSchema(schema = []) {
  return schema.reduce((settings, setting) => setByPath(settings, setting.key, setting.defaultValue), {});
}

export function resolveWidgetSettings({
  systemDefaults = {},
  themeDefaults = {},
  widgetDefaults = {},
  userSettings = {},
  instanceSettings = {},
  previewSettings = {},
  schema = [],
} = {}) {
  const merged = deepMerge(
    systemDefaults,
    themeDefaults,
    widgetDefaults,
    userSettings,
    instanceSettings,
    previewSettings
  );
  return validateWidgetSettings(merged, schema);
}

export function createWidgetStudioRecord({
  widgetId,
  widgetVersion,
  instanceId = 'default',
  settings = {},
  mode = 'draft',
} = {}) {
  return {
    schemaVersion: WIDGET_STUDIO_SCHEMA_VERSION,
    widgetId,
    widgetVersion,
    instanceId,
    mode,
    settings,
    migrationHistory: [],
    updatedAt: new Date().toISOString(),
  };
}

export function settingsToCssVariables(settings = {}, schema = []) {
  const vars = {};
  for (const setting of schema) {
    if (!setting.cssVariable) continue;
    const value = getByPath(settings, setting.key);
    if (value === undefined) continue;
    vars[setting.cssVariable] = setting.unit && typeof value === 'number' ? `${value}${setting.unit}` : value;
  }
  return vars;
}

export function migrateWidgetSettings(manifest, record = {}) {
  const migrations = Array.isArray(manifest?.migrations) ? manifest.migrations : [];
  let next = { ...(record || {}) };
  for (const migration of migrations) {
    if (typeof migration?.migrate !== 'function') continue;
    if ((next.widgetVersion || 0) < migration.toVersion) {
      next = migration.migrate(next);
      next.migrationHistory = [...(next.migrationHistory || []), {
        toVersion: migration.toVersion,
        migratedAt: new Date().toISOString(),
      }];
    }
  }
  return {
    ...next,
    widgetId: next.widgetId || manifest?.id,
    widgetVersion: manifest?.version || next.widgetVersion,
  };
}
