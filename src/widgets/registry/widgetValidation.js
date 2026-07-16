import { SETTING_TYPES } from '../shared/settings/settingTypes.js';

const REQUIRED_MANIFEST_KEYS = [
  'id',
  'name',
  'version',
  'category',
  'description',
  'renderer',
  'previewRenderer',
  'defaultSettings',
  'settingsSchema',
  'dataSchema',
  'validate',
  'responsive',
  'documentation',
];

export function validateWidgetManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['manifest must be an object'] };
  }
  for (const key of REQUIRED_MANIFEST_KEYS) {
    if (manifest[key] === undefined || manifest[key] === null) errors.push(`${manifest.id || 'widget'}: missing ${key}`);
  }
  if (manifest.supportsAppearanceStudio !== true) errors.push(`${manifest.id || 'widget'}: supportsAppearanceStudio must be true`);
  if (!Number.isInteger(manifest.version) || manifest.version < 1) errors.push(`${manifest.id || 'widget'}: version must be a positive integer`);
  if (!Array.isArray(manifest.settingsSchema)) errors.push(`${manifest.id || 'widget'}: settingsSchema must be an array`);

  const keys = new Set();
  for (const setting of manifest.settingsSchema || []) {
    if (!setting.key) errors.push(`${manifest.id}: setting missing key`);
    if (setting.key && keys.has(setting.key)) errors.push(`${manifest.id}: duplicate setting ${setting.key}`);
    if (setting.key) keys.add(setting.key);
    if (!Object.values(SETTING_TYPES).includes(setting.type)) errors.push(`${manifest.id}.${setting.key}: unknown setting type ${setting.type}`);
    if (!setting.label) errors.push(`${manifest.id}.${setting.key}: missing label`);
    if (!setting.group) errors.push(`${manifest.id}.${setting.key}: missing group`);
    if (!setting.target) errors.push(`${manifest.id}.${setting.key}: missing target`);
    if ((setting.type === 'number' || setting.type === 'range') && typeof setting.defaultValue !== 'number') {
      errors.push(`${manifest.id}.${setting.key}: numeric setting requires numeric default`);
    }
    if (setting.type === 'select' && (!Array.isArray(setting.options) || setting.options.length === 0)) {
      errors.push(`${manifest.id}.${setting.key}: select setting requires options`);
    }
  }

  return { valid: errors.length === 0, errors };
}
