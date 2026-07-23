import { getByPath, setByPath } from "./appearanceModel";
import {
  getAppearanceDocumentConfigValue,
  isAppearanceDocumentRoute,
  migrateLegacyAppearanceToDocument,
  removeAppearanceDocumentConfigElement,
  removeAppearanceDocumentConfigValue,
  setAppearanceDocumentConfigValue,
} from "./appearanceDocument";
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
    widgetId: selectedTarget?.widgetId,
    elementId,
    propertyId: controlId,
    stateId: selectedStateId || "default",
  };
}

export function normalizeScopedConfigAtRoot(source, root, route) {
  const current = getByPath(source, root) || {};
  if (isAppearanceDocumentRoute(route)) {
    return migrateLegacyAppearanceToDocument(current, {
      widgetId: route.widgetId,
      widgetType: route.widgetType,
      widgetVariant: route.widgetVariant,
    });
  }
  return normalizeScopedAppearanceConfig(current, {
    widgetType: route.widgetType,
    widgetVariant: route.widgetVariant,
  });
}

export function getScopedConfigValueAtRoot(source, root, route) {
  if (!root) return undefined;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  if (isAppearanceDocumentRoute(route)) {
    return getAppearanceDocumentConfigValue(normalized, route);
  }
  return getScopedAppearanceConfigValue(normalized, route);
}

export function setScopedConfigAtRoot(source, root, route, value) {
  if (!root) return source;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  if (isAppearanceDocumentRoute(route)) {
    return setByPath(
      source,
      root,
      setAppearanceDocumentConfigValue(normalized, route, value),
    );
  }
  return setByPath(
    source,
    root,
    setScopedAppearanceConfigValue(normalized, route, value),
  );
}

export function removeScopedConfigValueAtRoot(source, root, route) {
  if (!root) return source;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  if (isAppearanceDocumentRoute(route)) {
    return setByPath(
      source,
      root,
      removeAppearanceDocumentConfigValue(normalized, route),
    );
  }
  return setByPath(
    source,
    root,
    removeScopedAppearanceConfigValue(normalized, route),
  );
}

export function removeScopedConfigElementAtRoot(source, root, route) {
  if (!root) return source;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  if (isAppearanceDocumentRoute(route)) {
    return setByPath(
      source,
      root,
      removeAppearanceDocumentConfigElement(normalized, route),
    );
  }
  return setByPath(
    source,
    root,
    removeScopedAppearanceConfigElement(normalized, route),
  );
}
