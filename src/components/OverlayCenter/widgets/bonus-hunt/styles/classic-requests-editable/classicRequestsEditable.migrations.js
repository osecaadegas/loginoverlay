import { classicRequestsEditableDefaults } from './classicRequestsEditable.defaults.js';

const SAFE_MATERIALS = new Set(['original', 'matte', 'metallic', 'gradient', 'glass', 'neon', 'minimal', 'transparent_obs']);
const SAFE_SPEEDS = new Set(['slow', 'normal', 'fast']);

export function migrateClassicRequestsEditableSettings(source = {}) {
  return {
    ...classicRequestsEditableDefaults,
    ...(source || {}),
    version: classicRequestsEditableDefaults.version,
    displayStyle: 'v12_classic_sr_editable',
  };
}

export function validateClassicRequestsEditableSettings(source = {}) {
  const settings = migrateClassicRequestsEditableSettings(source);
  const errors = [];
  const fontSize = Number(settings.fontSize);
  if (Number.isFinite(fontSize) && (fontSize < 11 || fontSize > 22)) errors.push('fontSize outside safe range');
  if (settings.material && !SAFE_MATERIALS.has(settings.material)) errors.push('material is not supported');
  if (settings.carouselSpeed && !SAFE_SPEEDS.has(settings.carouselSpeed)) errors.push('carouselSpeed must be slow, normal, or fast');
  if (settings.cardGap !== undefined || settings.slotImageHeight !== undefined) errors.push('structural carousel spacing and image height are not editable');
  return { valid: errors.length === 0, errors, settings };
}

export default migrateClassicRequestsEditableSettings;
