/**
 * Minimal Better widget data-source registry.
 *
 * /editor owns rendering, layout, and style controls. The registry here only
 * keeps the live data-source configuration panels for the seven Better widgets.
 */

const registry = new Map();

export function registerWidget(definition) {
  if (!definition?.type) throw new Error("Widget must have a type");
  registry.set(definition.type, {
    label: definition.type,
    icon: "W",
    category: "better",
    defaults: {},
    styles: [],
    ...definition,
  });
}

export function getWidgetDef(type) {
  return registry.get(type) || null;
}

export function getWidgetStyleDefaultSize(type, styleId) {
  const def = getWidgetDef(type);
  const style = Array.isArray(def?.styles)
    ? def.styles.find((item) => item.id === styleId)
    : null;
  const size = style?.defaultSize || style?.recommendedSize;
  const width = Number(size?.width);
  const height = Number(size?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

export function getAllWidgetDefs() {
  return Array.from(registry.values());
}

export function getWidgetsByCategory() {
  const map = {};
  for (const def of registry.values()) {
    const category = def.category || "better";
    if (!map[category]) map[category] = [];
    map[category].push(def);
  }
  return map;
}

export default registry;
