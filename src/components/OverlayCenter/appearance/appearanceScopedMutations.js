import { getByPath, setByPath } from "./appearanceModel";
import {
  getScopedAppearanceConfigValue,
  normalizeScopedAppearanceConfig,
  removeScopedAppearanceConfigElement,
  removeScopedAppearanceConfigValue,
  setScopedAppearanceConfigValue,
} from "./v2/appearanceRouting";

export function buildScopedAppearanceRoute({
  controlId,
  elementId,
  selectedStateId,
  selectedTarget,
  selectedWidgetType,
}) {
  return {
    widgetType: selectedWidgetType,
    widgetVariant: selectedTarget?.styleId,
    elementId,
    propertyId: controlId,
    stateId: selectedStateId || "default",
  };
}

export function normalizeScopedConfigAtRoot(source, root, route) {
  const current = getByPath(source, root) || {};
  return normalizeScopedAppearanceConfig(current, {
    widgetType: route.widgetType,
    widgetVariant: route.widgetVariant,
  });
}

export function getScopedConfigValueAtRoot(source, root, route) {
  if (!root) return undefined;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  return getScopedAppearanceConfigValue(normalized, route);
}

export function setScopedConfigAtRoot(source, root, route, value) {
  if (!root) return source;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  return setByPath(
    source,
    root,
    setScopedAppearanceConfigValue(normalized, route, value),
  );
}

export function removeScopedConfigValueAtRoot(source, root, route) {
  if (!root) return source;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  return setByPath(
    source,
    root,
    removeScopedAppearanceConfigValue(normalized, route),
  );
}

export function removeScopedConfigElementAtRoot(source, root, route) {
  if (!root) return source;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  return setByPath(
    source,
    root,
    removeScopedAppearanceConfigElement(normalized, route),
  );
}
