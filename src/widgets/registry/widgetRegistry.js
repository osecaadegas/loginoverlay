import { WIDGET_COMPATIBILITY } from './widgetTypes.js';
import { validateWidgetManifest } from './widgetValidation.js';
import statisticCardV2Manifest from '../statistic-card-v2/manifest.js';

const manifestMap = new Map();

export function registerStudioWidget(manifest) {
  const result = validateWidgetManifest(manifest);
  if (!result.valid) {
    throw new Error(`Invalid Widget Studio manifest: ${result.errors.join('; ')}`);
  }
  manifestMap.set(manifest.id, Object.freeze({
    appearanceEditorVersion: WIDGET_COMPATIBILITY.STUDIO_V2,
    deprecated: false,
    featureFlags: [],
    ...manifest,
  }));
}

registerStudioWidget(statisticCardV2Manifest);

export function getStudioWidgetManifest(widgetId) {
  return manifestMap.get(widgetId) || null;
}

export function getAllStudioWidgetManifests() {
  return Array.from(manifestMap.values());
}

export function getAppearanceStudioWidgets({ includeDeprecated = false } = {}) {
  return getAllStudioWidgetManifests().filter(manifest => (
    manifest.supportsAppearanceStudio === true
    && (includeDeprecated || !manifest.deprecated)
  ));
}

export function validateStudioWidgetRegistry() {
  const errors = [];
  const ids = new Set();
  for (const manifest of getAllStudioWidgetManifests()) {
    if (ids.has(manifest.id)) errors.push(`duplicate widget id ${manifest.id}`);
    ids.add(manifest.id);
    const result = validateWidgetManifest(manifest);
    if (!result.valid) errors.push(...result.errors);
  }
  return { valid: errors.length === 0, errors };
}

export default manifestMap;
