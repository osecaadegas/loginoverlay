import {
  createAppearanceRoute,
  validateAppearanceRoute,
} from "./v2/appearanceRouting";
import { getWidgetAppearanceV2Elements } from "./v2/widgetAppearanceRegistry";

export const APPEARANCE_DOCUMENT_SCHEMA_VERSION = 3;
export const APPEARANCE_DOCUMENT_CONFIG_KEY = "__appearanceDocument";

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function cloneObject(value) {
  return isObject(value) ? structuredClone(value) : {};
}

function isEmptyObject(value) {
  return isObject(value) && Object.keys(value).length === 0;
}

function setNestedValue(source, path, value) {
  const [head, ...tail] = path;
  if (!head) return source;
  const next = cloneObject(source);
  if (!tail.length) {
    if (value === undefined) delete next[head];
    else next[head] = value;
    return next;
  }
  next[head] = setNestedValue(next[head], tail, value);
  if (isEmptyObject(next[head])) delete next[head];
  return next;
}

function getDocumentFromConfig(config = {}) {
  return isObject(config[APPEARANCE_DOCUMENT_CONFIG_KEY])
    ? config[APPEARANCE_DOCUMENT_CONFIG_KEY]
    : {};
}

function createEmptyDocument({ route, widgetId }) {
  return {
    schemaVersion: APPEARANCE_DOCUMENT_SCHEMA_VERSION,
    widgetId: widgetId || route.widgetId || null,
    widgetType: route.registryWidgetType,
    styleId: route.registryWidgetVariant,
    layout: {},
    simple: {},
    elements: {},
  };
}

function normalizeDocumentMetadata(document, route, widgetId) {
  return {
    ...createEmptyDocument({ route, widgetId }),
    ...cloneObject(document),
    schemaVersion: APPEARANCE_DOCUMENT_SCHEMA_VERSION,
    widgetId: document?.widgetId || widgetId || route.widgetId || null,
    widgetType: document?.widgetType || route.registryWidgetType,
    styleId: document?.styleId || route.registryWidgetVariant,
    layout: cloneObject(document?.layout),
    simple: cloneObject(document?.simple),
    elements: cloneObject(document?.elements),
  };
}

function getDocumentPath(route, stateId = "default") {
  return stateId && stateId !== "default"
    ? ["elements", route.elementId, "states", stateId, route.propertyId]
    : ["elements", route.elementId, "base", route.propertyId];
}

function validateRoute(rawRoute) {
  const validation = validateAppearanceRoute(rawRoute);
  if (!validation.valid) {
    throw new Error(
      `Invalid appearance route: ${validation.errors.join(", ")}`,
    );
  }
}

export function isAppearanceDocumentRoute(rawRoute = {}) {
  const route = createAppearanceRoute(rawRoute);
  return (
    route.registryWidgetType === "bonus_hunt" &&
    ["v12_classic_sr", "v12_classic_sr_editable"].includes(
      route.registryWidgetVariant,
    )
  );
}

export function normalizeAppearanceDocumentConfig(
  config,
  { widgetType, widgetVariant, widgetId } = {},
) {
  const route = createAppearanceRoute({
    widgetId,
    widgetType,
    widgetVariant,
    elementId: "container",
    propertyId: "background",
  });
  let document = normalizeDocumentMetadata(
    getDocumentFromConfig(config),
    route,
    widgetId,
  );
  const next = cloneObject(config);
  next[APPEARANCE_DOCUMENT_CONFIG_KEY] = document;
  return next;
}

export function getAppearanceDocumentConfigValue(config, rawRoute) {
  const route = createAppearanceRoute(rawRoute);
  const document = getDocumentFromConfig(config);
  const element = document?.elements?.[route.elementId];
  const stateId = rawRoute.stateId || "default";
  if (stateId && stateId !== "default") {
    const stateValue = element?.states?.[stateId]?.[route.propertyId];
    if (stateValue !== undefined) return stateValue;
  }
  return element?.base?.[route.propertyId];
}

export function setAppearanceDocumentConfigValue(config, rawRoute, value) {
  validateRoute(rawRoute);
  const route = createAppearanceRoute(rawRoute);
  const next = normalizeAppearanceDocumentConfig(config, {
    widgetId: rawRoute.widgetId,
    widgetType: rawRoute.widgetType,
    widgetVariant: rawRoute.widgetVariant,
  });
  const document = next[APPEARANCE_DOCUMENT_CONFIG_KEY];
  next[APPEARANCE_DOCUMENT_CONFIG_KEY] = setNestedValue(
    document,
    getDocumentPath(route, rawRoute.stateId || "default"),
    value,
  );
  return next;
}

export function removeAppearanceDocumentConfigValue(config, rawRoute) {
  validateRoute(rawRoute);
  const route = createAppearanceRoute(rawRoute);
  const next = normalizeAppearanceDocumentConfig(config, {
    widgetId: rawRoute.widgetId,
    widgetType: rawRoute.widgetType,
    widgetVariant: rawRoute.widgetVariant,
  });
  const document = next[APPEARANCE_DOCUMENT_CONFIG_KEY];
  next[APPEARANCE_DOCUMENT_CONFIG_KEY] = setNestedValue(
    document,
    getDocumentPath(route, rawRoute.stateId || "default"),
    undefined,
  );
  return next;
}

export function removeAppearanceDocumentConfigElement(config, rawRoute) {
  const route = createAppearanceRoute({ ...rawRoute, propertyId: "background" });
  const next = normalizeAppearanceDocumentConfig(config, {
    widgetId: rawRoute.widgetId,
    widgetType: rawRoute.widgetType,
    widgetVariant: rawRoute.widgetVariant,
  });
  const stateId = rawRoute.stateId || "default";
  const path =
    stateId && stateId !== "default"
      ? ["elements", route.elementId, "states", stateId]
      : ["elements", route.elementId];
  next[APPEARANCE_DOCUMENT_CONFIG_KEY] = setNestedValue(
    next[APPEARANCE_DOCUMENT_CONFIG_KEY],
    path,
    undefined,
  );
  return next;
}

function migrateElementProperty(config, context, elementId, propertyId, value, stateId) {
  if (value === undefined || propertyId === "states") return config;
  const route = { ...context, elementId, propertyId, stateId };
  if (!validateAppearanceRoute(route).valid) return config;
  return setAppearanceDocumentConfigValue(config, route, value);
}

function migrateElement(config, context, elementId, element) {
  if (!isObject(element)) return config;
  let next = config;
  for (const [propertyId, value] of Object.entries(element)) {
    next = migrateElementProperty(next, context, elementId, propertyId, value);
  }
  if (!isObject(element.states)) return next;
  for (const [stateId, stateValues] of Object.entries(element.states)) {
    if (!isObject(stateValues)) continue;
    for (const [propertyId, value] of Object.entries(stateValues)) {
      next = migrateElementProperty(
        next,
        context,
        elementId,
        propertyId,
        value,
        stateId,
      );
    }
  }
  return next;
}

export function migrateLegacyAppearanceToDocument(
  config,
  { widgetType, widgetVariant, widgetId } = {},
) {
  if (!isAppearanceDocumentRoute({ widgetType, widgetVariant, elementId: "container", propertyId: "background" })) {
    return config;
  }
  const context = { widgetId, widgetType, widgetVariant };
  let next = normalizeAppearanceDocumentConfig(config, context);
  for (const elements of [
    config?.subElements,
    config?.elements,
    config?.appearanceV2?.elementOverrides,
    config?.__appearanceExplicitSubElements,
  ]) {
    if (!isObject(elements)) continue;
    for (const [elementId, element] of Object.entries(elements)) {
      next = migrateElement(next, context, elementId, element);
    }
  }
  return next;
}

function getRuntimeElementIdMap(widgetType, widgetVariant) {
  const pairs = getWidgetAppearanceV2Elements(widgetType, widgetVariant).map(
    (element) => {
      const route = createAppearanceRoute({
        widgetType,
        widgetVariant,
        elementId: element.id,
        propertyId: "background",
      });
      return [route.elementId, route.registryElementId];
    },
  );
  return Object.fromEntries(pairs);
}

export function projectAppearanceDocumentToSubElements(
  config,
  { widgetType, widgetVariant } = {},
) {
  const document = getDocumentFromConfig(config);
  if (!isObject(document.elements)) return {};
  const runtimeElementByCanonical = getRuntimeElementIdMap(
    widgetType || document.widgetType,
    widgetVariant || document.styleId,
  );
  const projected = {};
  for (const [canonicalElementId, element] of Object.entries(document.elements)) {
    const runtimeElementId = runtimeElementByCanonical[canonicalElementId];
    if (!runtimeElementId || !isObject(element)) continue;
    projected[runtimeElementId] = {
      ...cloneObject(element.base),
      ...(isObject(element.states) ? { states: cloneObject(element.states) } : {}),
    };
  }
  return projected;
}
