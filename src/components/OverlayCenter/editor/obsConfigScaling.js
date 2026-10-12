const ROOT_PIXEL_CONFIG_KEYS = new Set([
  "avatarSize", "badgeSize", "barHeight", "barPadX", "barPadY",
  "bodySize", "borderRadius", "borderWidth", "bracketSize", "bracketWidth",
  "cardGap", "cardRadius", "containerPadding", "edgeRadius", "fontSize",
  "headerSize", "innerInset", "labelSize", "logoHeight", "logoMaxW",
  "logoOffsetX", "logoOffsetY", "logoPadX", "logoPadY", "mainCardPadding",
  "mainShadowBlur", "messageSize", "multiSize", "nameSize", "padX", "padY",
  "padding", "prizeSize", "radius", "reelHeight", "slotImageRadius",
  "slotNameSize", "statRadius", "subSize", "subtitleSize", "swordSize",
  "tileGap", "tileRadius", "timestampSize", "titleSize", "usernameSize",
  "valueSize",
]);

// Advanced appearance values live inside element-scoped buckets rather than
// on the widget root. Keep unitless values such as opacity, lineHeight and
// letterSpacing out of this list.
const SCOPED_PIXEL_CONFIG_KEYS = new Set([
  "fontSize", "borderWidth", "radius", "borderRadius", "padding",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop",
  "marginRight", "marginBottom", "marginLeft", "gap", "width", "height",
  "minWidth", "maxWidth", "minHeight", "maxHeight", "imageSize",
  "shadowBlur", "shadowSize", "glowBlur", "glowSize", "blur", "offsetX",
  "offsetY",
]);

function scaleScopedAppearanceValue(value, scale) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const scaled = { ...value };
  SCOPED_PIXEL_CONFIG_KEYS.forEach((key) => {
    const numericValue = Number(value[key]);
    if (Number.isFinite(numericValue)) scaled[key] = numericValue * scale;
  });
  if (value.states && typeof value.states === "object") {
    scaled.states = Object.fromEntries(
      Object.entries(value.states).map(([stateId, state]) => [
        stateId,
        scaleScopedAppearanceValue(state, scale),
      ]),
    );
  }
  return scaled;
}

export function scaleStandaloneWidgetConfig({
  widgetType,
  config = {},
  instance = {},
  renderScale = 1,
}) {
  const scale = Number(renderScale) || 1;
  if (scale === 1 || widgetType === "bonus_hunt") return config;

  const next = { ...config };
  ROOT_PIXEL_CONFIG_KEYS.forEach((key) => {
    const value = Number(config[key]);
    if (Number.isFinite(value)) next[key] = value * scale;
  });

  for (const bucket of [
    "subElements",
    "__appearanceExplicitSubElements",
    "elements",
  ]) {
    if (!config[bucket] || typeof config[bucket] !== "object") continue;
    next[bucket] = Object.fromEntries(
      Object.entries(config[bucket]).map(([elementId, element]) => [
        elementId,
        scaleScopedAppearanceValue(element, scale),
      ]),
    );
  }

  if (widgetType === "giveaway") {
    next.width = instance.width;
    next.height = instance.height;
  }

  return next;
}
