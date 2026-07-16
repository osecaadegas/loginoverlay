import { compactEditableDefaults } from './compactEditable.defaults.js';

export function migrateCompactEditableSettings(source = {}) {
  return {
    ...compactEditableDefaults,
    ...(source || {}),
    version: compactEditableDefaults.version,
    displayStyle: 'v3_compact_editable',
  };
}

export function validateCompactEditableSettings(source = {}) {
  const settings = migrateCompactEditableSettings(source);
  const errors = [];
  if (Number(settings.fontSize) < 8 || Number(settings.fontSize) > 32) errors.push('fontSize outside safe range');
  if (Number(settings.imageSize) < 20 || Number(settings.imageSize) > 80) errors.push('imageSize outside safe range');
  if (!['cover', 'contain'].includes(settings.imageFit)) errors.push('imageFit must be cover or contain');
  return { valid: errors.length === 0, errors, settings };
}

export default migrateCompactEditableSettings;
