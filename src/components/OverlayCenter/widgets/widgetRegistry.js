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

export function registerWidget(definition) {
  if (!definition.type) throw new Error('Widget must have a type');
  _registry.set(definition.type, {
    label: definition.type,
    icon: '📦',
    category: 'general',
    defaults: {},
    ...definition,
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
