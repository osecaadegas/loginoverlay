import {
  getWidgetAppearanceCapability,
  getWidgetAppearanceV2Elements,
  getWidgetStyleCapability,
} from "./widgetAppearanceRegistry";

export const SCOPED_APPEARANCE_SCHEMA_VERSION = 3;

const WIDGET_TYPE_ALIASES = Object.freeze({
  bonus_hunt: "bonusHunt",
  current_slot: "currentSlot",
  tournament: "tournament",
  giveaway: "giveaway",
  navbar: "navbar",
  chat: "multiChat",
  image_slideshow: "imageSlideshow",
  rtp_stats: "rtpStats",
  background: "overlayBackground",
  raid_shoutout: "raidShoutout",
  spotify_now_playing: "spotifyNowPlaying",
  slot_requests: "slotRequests",
  bh_stats: "bonusHuntStats",
  bonus_buys: "bonusBuys",
  bets: "bets",
  container: "containerWidget",
});

const ELEMENT_ALIASES = Object.freeze({
  default: Object.freeze({
    container: "widgetBackground",
    progressBar: "progressTrack",
    progressBarFill: "progressFill",
  }),
  bonus_hunt: Object.freeze({
    container: "widgetBackground",
    headerContainer: "header",
    mainStatsContainer: "statsGroup",
    statCell: "statsCard",
    slotListContainer: "slotList",
    slotRow: "slotCard",
    carouselBackdrop: "slotCarouselBackdrop",
    progressBar: "rtpBarTrack",
    progressBarFill: "rtpBarFill",
    footerContainer: "footer",
    requestsSectionContainer: "requestsPanel",
  }),
  bets: Object.freeze({
    individualBetCard: "betCard",
    cardNumberBadge: "betCardBadge",
    cardRangeText: "betCardRange",
    cardPercentageText: "betCardPercentage",
    cardLabel: "betCardLabel",
    progressBar: "progressTrack",
  }),
  rtp_stats: Object.freeze({
    container: "widgetBackground",
    slotTitle: "slotTitle",
    rtpValue: "rtpValue",
    statCard: "statCard",
    progressBar: "track",
  }),
  slot_requests: Object.freeze({
    container: "widgetBackground",
    queueContainer: "queue",
    requestCard: "requestCard",
    position: "positionBadge",
  }),
  background: Object.freeze({
    canvas: "canvas",
    source: "source",
    texture: "texture",
    media: "media",
    tint: "tint",
    effects: "effects",
  }),
  bh_stats: Object.freeze({
    container: "widgetBackground",
    statsCard: "statsCard",
    progressBar: "progressTrack",
  }),
  bonus_buys: Object.freeze({
    sessionCard: "sessionCard",
    slotArtwork: "slotArtwork",
    progressBar: "progressTrack",
  }),
});

const PROPERTY_CONTROL_ALIASES = Object.freeze({
  backgroundColor: "background",
  borderRadius: "radius",
  trackColor: "background",
  fillColor: "fillColor",
  textColor: "textColor",
});

function toCamelId(value) {
  const source = String(value || "").trim();
  if (!source) return "default";
  const words = source
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (!words.length) return "default";
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index === 0) return lower;
      return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
    })
    .join("");
}

function toKebabId(value) {
  const normalized = String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  let start = 0;
  let end = normalized.length;
  while (normalized[start] === "-") start += 1;
  while (end > start && normalized[end - 1] === "-") end -= 1;
  return normalized.slice(start, end);
}

function registryWidgetTypeFor(widgetType) {
  const input = String(widgetType || "");
  if (getWidgetAppearanceCapability(input)) return input;
  return (
    Object.entries(WIDGET_TYPE_ALIASES).find(
      ([, canonical]) => canonical === input,
    )?.[0] || input
  );
}

export function canonicalWidgetType(widgetType) {
  const registryType = registryWidgetTypeFor(widgetType);
  return WIDGET_TYPE_ALIASES[registryType] || toCamelId(registryType);
}

export function canonicalVariantId(variantId) {
  return toCamelId(variantId || "default");
}

export function canonicalElementId(widgetType, elementId) {
  const registryType = registryWidgetTypeFor(widgetType);
  return (
    ELEMENT_ALIASES[registryType]?.[elementId] ||
    ELEMENT_ALIASES.default[elementId] ||
    toCamelId(elementId || "widgetBackground")
  );
}

function resolveRegistryStyleId(widgetType, variantId) {
  const capability = getWidgetAppearanceCapability(widgetType);
  const styles = Array.isArray(capability?.styles) ? capability.styles : [];
  if (!variantId)
    return capability?.defaultStyleId || styles[0]?.id || "default";
  return (
    styles.find((style) => style.id === variantId)?.id ||
    styles.find((style) => canonicalVariantId(style.id) === variantId)?.id ||
    variantId
  );
}

function resolveElement(widgetType, styleId, elementId) {
  const elements = getWidgetAppearanceV2Elements(widgetType, styleId);
  return elements.find(
    (element) =>
      element.id === elementId ||
      canonicalElementId(widgetType, element.id) === elementId,
  );
}

export function getAppearanceId({ widgetType, widgetVariant, elementId }) {
  const registryType = registryWidgetTypeFor(widgetType);
  const registryVariant = resolveRegistryStyleId(registryType, widgetVariant);
  return [
    canonicalWidgetType(registryType),
    canonicalVariantId(registryVariant),
    canonicalElementId(registryType, elementId),
  ].join(".");
}

export function getAppearanceCssVariableName(route) {
  return `--${[
    canonicalWidgetType(route.widgetType),
    canonicalVariantId(route.widgetVariant),
    canonicalElementId(route.widgetType, route.elementId),
    route.propertyId,
  ]
    .map(toKebabId)
    .join("-")}`;
}

export function createAppearanceRoute({
  widgetId = null,
  widgetType,
  widgetVariant,
  elementId,
  propertyId,
}) {
  const registryType = registryWidgetTypeFor(widgetType);
  const registryVariant = resolveRegistryStyleId(registryType, widgetVariant);
  const sourceElement = resolveElement(
    registryType,
    registryVariant,
    elementId,
  );
  const sourceElementId = sourceElement?.id || elementId;
  const canonicalElement = canonicalElementId(registryType, sourceElementId);
  return {
    widgetId,
    widgetType: canonicalWidgetType(registryType),
    registryWidgetType: registryType,
    widgetVariant: canonicalVariantId(registryVariant),
    registryWidgetVariant: registryVariant,
    elementId: canonicalElement,
    registryElementId: sourceElementId,
    propertyId,
    appearanceId: getAppearanceId({
      widgetType: registryType,
      widgetVariant: registryVariant,
      elementId: sourceElementId,
    }),
  };
}

export function validateAppearanceRoute(route) {
  const errors = [];
  if (!route?.widgetType) errors.push("Missing widgetType");
  if (!route?.widgetVariant) errors.push("Missing widgetVariant");
  if (!route?.elementId) errors.push("Missing elementId");
  if (!route?.propertyId) errors.push("Missing propertyId");
  if (errors.length) return { valid: false, errors };

  const registryType = registryWidgetTypeFor(route.widgetType);
  const capability = getWidgetAppearanceCapability(registryType);
  if (!capability) errors.push(`Unknown widget type: ${route.widgetType}`);

  const registryVariant = resolveRegistryStyleId(
    registryType,
    route.widgetVariant,
  );
  if (!getWidgetStyleCapability(registryType, registryVariant)) {
    errors.push(`Invalid widget variant: ${route.widgetVariant}`);
  }

  const element = resolveElement(
    registryType,
    registryVariant,
    route.elementId,
  );
  if (!element) errors.push(`Invalid element id: ${route.elementId}`);

  const controls = new Set(element?.controls || []);
  const validationProperty =
    PROPERTY_CONTROL_ALIASES[route.propertyId] || route.propertyId;
  if (element && controls.size && !controls.has(validationProperty)) {
    errors.push(
      `Unsupported property ${route.propertyId} for ${route.elementId}`,
    );
  }

  return { valid: errors.length === 0, errors };
}

function cloneState(state) {
  return structuredClone(state || {});
}

export function setScopedAppearanceValue(state, rawRoute, value) {
  const validation = validateAppearanceRoute(rawRoute);
  if (!validation.valid) {
    throw new Error(
      `Invalid appearance route: ${validation.errors.join(", ")}`,
    );
  }
  const route = createAppearanceRoute(rawRoute);
  const next = cloneState(state);
  next.schemaVersion = SCOPED_APPEARANCE_SCHEMA_VERSION;
  next.widgets ??= {};
  next.widgets[route.widgetType] ??= { variants: {} };
  next.widgets[route.widgetType].variants[route.widgetVariant] ??= {
    elements: {},
  };
  next.widgets[route.widgetType].variants[route.widgetVariant].elements[
    route.elementId
  ] ??= {};
  next.widgets[route.widgetType].variants[route.widgetVariant].elements[
    route.elementId
  ][route.propertyId] = value;
  return next;
}

export function getScopedAppearanceValue(state, rawRoute) {
  const route = createAppearanceRoute(rawRoute);
  return state?.widgets?.[route.widgetType]?.variants?.[route.widgetVariant]
    ?.elements?.[route.elementId]?.[route.propertyId];
}

export function getAppearanceDomAttributes({
  widgetId,
  widgetType,
  widgetVariant,
  elementId,
  stateId,
}) {
  const route = createAppearanceRoute({
    widgetId,
    widgetType,
    widgetVariant,
    elementId,
    propertyId: "backgroundColor",
  });
  return {
    "data-widget-id": widgetId || undefined,
    "data-widget-type": toKebabId(route.widgetType),
    "data-widget-variant": toKebabId(route.widgetVariant),
    "data-widget-element": elementId,
    "data-appearance-element": toKebabId(route.elementId),
    "data-appearance-id": route.appearanceId,
    ...(stateId ? { "data-widget-state": stateId } : {}),
  };
}

export function getAppearanceRoutingWarnings(routes = []) {
  const seen = new Set();
  const warnings = [];
  for (const route of routes) {
    const validation = validateAppearanceRoute(route);
    if (!validation.valid)
      warnings.push({
        type: "invalid-route",
        route,
        errors: validation.errors,
      });
    const appearanceId =
      route?.appearanceId || createAppearanceRoute(route).appearanceId;
    if (seen.has(appearanceId))
      warnings.push({ type: "duplicate-appearance-id", appearanceId });
    seen.add(appearanceId);
  }
  return warnings;
}
