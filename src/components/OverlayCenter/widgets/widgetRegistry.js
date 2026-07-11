/**
 * widgetRegistry.js — Plugin-style widget system.
 *
 * Each widget type registers:
 *  - type:         unique string key
 *  - label:        human display name
 *  - icon:         emoji or Lucide icon name
 *  - component:    React component to render inside the overlay
 *  - configPanel:  React component for the admin config form (optional)
 *  - defaults:     default config JSONB
 *  - category:     grouping for the add-widget menu
 *
 * To add a new widget, just call registerWidget() — no core rewrite required.
 */

const _registry = new Map();

const DEFAULT_APPEARANCE_CAPABILITIES = {
  colors: true,
  typography: true,
  container: true,
  borders: true,
  effects: true,
  sizing: true,
  motion: true,
  controls: false,
  responsive: true,
  customTokens: [],
};

function inferAppearanceCapabilities(definition) {
  const defaults = definition.defaults || {};
  const tokenKeys = Object.keys(defaults).filter(key => (
    /color|bg|radius|font|border|shadow|glow|padding|gap|size|opacity|blur/i.test(key)
  ));

  return {
    ...DEFAULT_APPEARANCE_CAPABILITIES,
    controls: ['buttonBg', 'buttonText', 'inputBg', 'progressColor'].some(key => key in defaults),
    colors: ['accentColor', 'bgColor', 'textColor', 'mutedColor', 'borderColor'].some(key => key in defaults) || DEFAULT_APPEARANCE_CAPABILITIES.colors,
    typography: ['fontFamily', 'fontSize', 'fontWeight'].some(key => key in defaults) || DEFAULT_APPEARANCE_CAPABILITIES.typography,
    container: ['bgColor', 'cardBg', 'containerPadding', 'cardGap'].some(key => key in defaults) || DEFAULT_APPEARANCE_CAPABILITIES.container,
    borders: ['borderColor', 'borderRadius', 'borderWidth', 'cardRadius'].some(key => key in defaults) || DEFAULT_APPEARANCE_CAPABILITIES.borders,
    sizing: ['fontSize', 'paddingX', 'paddingY', 'barHeight', 'width', 'height'].some(key => key in defaults) || DEFAULT_APPEARANCE_CAPABILITIES.sizing,
    customTokens: [
      ...new Set([
        ...(definition.appearanceCapabilities?.customTokens || []),
        ...tokenKeys,
      ]),
    ],
    ...(definition.appearanceCapabilities || {}),
  };
}

export function registerWidget(definition) {
  if (!definition.type) throw new Error('Widget must have a type');
  _registry.set(definition.type, {
    label: definition.type,
    icon: '📦',
    category: 'general',
    defaults: {},
    ...definition,
    appearanceCapabilities: inferAppearanceCapabilities(definition),
  });
}

export function getWidgetDef(type) {
  return _registry.get(type) || null;
}

export function getAllWidgetDefs() {
  return Array.from(_registry.values());
}

export function getWidgetsByCategory() {
  const map = {};
  for (const def of _registry.values()) {
    const cat = def.category || 'general';
    if (!map[cat]) map[cat] = [];
    map[cat].push(def);
  }
  return map;
}

export default _registry;
