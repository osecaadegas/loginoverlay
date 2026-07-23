import { getAppearanceDomAttributes } from "../../appearance/v2/appearanceRouting";

const STYLE_KEY_BY_WIDGET_TYPE = Object.freeze({
  bonus_hunt: "displayStyle",
  current_slot: "displayStyle",
  tournament: "layout",
  giveaway: "displayStyle",
  navbar: "displayStyle",
  chat: "chatStyle",
  image_slideshow: "displayStyle",
  rtp_stats: "displayStyle",
  background: "displayStyle",
  raid_shoutout: "displayStyle",
  spotify_now_playing: "displayStyle",
  slot_requests: "displayStyle",
  bh_stats: "displayStyle",
  bonus_buys: "displayStyle",
  bets: "displayStyle",
  container: "displayStyle",
});

export function getAppearanceVariant(config = {}, widgetType = "") {
  const key = STYLE_KEY_BY_WIDGET_TYPE[widgetType] || "displayStyle";
  return (
    config.__appearanceStyleId ||
    config[key] ||
    config.displayStyle ||
    config.chatStyle ||
    config.layout ||
    "default"
  );
}

export function appearanceAttrs({
  config = {},
  widgetId,
  widgetType,
  elementId,
  stateId,
}) {
  return getAppearanceDomAttributes({
    widgetId,
    widgetType,
    widgetVariant: getAppearanceVariant(config, widgetType),
    elementId,
    stateId,
  });
}

export function getSubElement(config, elementId) {
  const sourceConfig = config || {};
  const subElements = Object.hasOwn(
    sourceConfig,
    "__appearanceExplicitSubElements",
  )
    ? sourceConfig.__appearanceExplicitSubElements
    : sourceConfig.subElements;
  return subElements?.[elementId] || {};
}

const STATE_ELEMENT_ALIASES = {
  openedState: ["bonusCard", "opened"],
  unopenedState: ["bonusCard", "unopened"],
  currentState: ["bonusCard", "current"],
  selectedState: ["optionCard", "selected"],
  winningState: ["optionCard", "winner"],
  losingState: ["optionCard", "loser"],
  pendingState: ["requestCard", "pending"],
  playingState: ["requestCard", "playing"],
  completedState: ["requestCard", "completed"],
  rejectedState: ["requestCard", "rejected"],
  winnerHighlight: ["participantCard", "winner"],
  eliminatedState: ["participantCard", "eliminated"],
  highlightedMessage: ["message", "highlighted"],
  botMessage: ["message", "bot"],
  subscriberMessage: ["message", "subscriber"],
  moderatorMessage: ["message", "moderator"],
};

const ELEMENT_PROPERTY_ALIASES = Object.freeze({
  background: "backgroundColor",
  backgroundColor: "background",
  radius: "borderRadius",
  borderRadius: "radius",
  shadowBlur: "shadowSize",
  shadowOpacity: "shadowIntensity",
  glowBlur: "glowSize",
  glowOpacity: "glowIntensity",
  backgroundPosition: "imagePosition",
  imagePosition: "backgroundPosition",
});

export function getSubElementState(config, elementId, stateId = "default") {
  const element = getSubElement(config, elementId);
  if (!stateId || stateId === "default") return element;
  const stateOverride = element?.states?.[stateId];
  if (!stateOverride) return element;
  return { ...element, ...stateOverride };
}

function getElementProperty(element, property) {
  const sourceElement = element || {};
  if (sourceElement[property] !== undefined) return sourceElement[property];
  const alias = ELEMENT_PROPERTY_ALIASES[property];
  if (alias && sourceElement[alias] !== undefined) return sourceElement[alias];
  return undefined;
}

export function subValue(
  config,
  elementId,
  property,
  fallback,
  stateId = "default",
) {
  const aliased = STATE_ELEMENT_ALIASES[elementId];
  const sourceElementId = aliased?.[0] || elementId;
  const sourceStateId =
    stateId !== "default" ? stateId : aliased?.[1] || stateId;
  const value = getElementProperty(
    getSubElementState(config, sourceElementId, sourceStateId),
    property,
  );
  return value === undefined || value === null || value === ""
    ? fallback
    : value;
}

function px(value) {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

function hasLayoutSizing(element = {}) {
  return [
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
  ].some(
    (key) =>
      element[key] !== undefined &&
      element[key] !== null &&
      element[key] !== "",
  );
}

function clamp01(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(value) {
  const raw = String(value || "").trim();
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
  if (!match) return null;
  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : match[1];
  const int = Number.parseInt(hex, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function alphaColor(value, opacity) {
  const rgb = hexToRgb(value);
  if (rgb) return `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`;
  if (/^rgba?\(/i.test(String(value || ""))) return value;
  return `rgba(45,212,191,${opacity})`;
}

function elementAnimation(element = {}) {
  const animation = String(element.animation || "none");
  if (!animation || animation === "none") return undefined;
  const duration = Math.max(0, Number(element.duration ?? 450));
  const delay = Math.max(0, Number(element.delay ?? 0));
  const timing = "ease-out";
  const common = `${Math.round(duration)}ms ${timing} ${Math.round(delay)}ms both`;
  if (animation === "fade") return `ov-fade-in ${common}`;
  if (animation === "slide") return `ov-slide-left ${common}`;
  if (animation === "scale") return `ov-pop ${common}`;
  if (animation === "pulse")
    return `wm-pulse ${Math.max(900, Math.round(duration || 1200))}ms ease-in-out ${Math.round(delay)}ms infinite`;
  if (animation === "glow")
    return `ov-raid-glow ${Math.max(1000, Math.round(duration || 1600))}ms ease-in-out ${Math.round(delay)}ms infinite`;
  return undefined;
}

const DIRECT_STYLE_PROPERTIES = Object.freeze([
  ["textColor", "color"],
  ["fontFamily", "fontFamily"],
  ["fontSize", "fontSize", px],
  ["fontWeight", "fontWeight"],
  ["fontStyle", "fontStyle"],
  ["lineHeight", "lineHeight"],
  ["textTransform", "textTransform"],
  ["textAlign", "textAlign"],
  ["opacity", "opacity"],
]);

const BOX_STYLE_PROPERTIES = Object.freeze([
  ["padding", "padding"],
  ["paddingTop", "paddingTop"],
  ["paddingRight", "paddingRight"],
  ["paddingBottom", "paddingBottom"],
  ["paddingLeft", "paddingLeft"],
  ["marginTop", "marginTop"],
  ["marginRight", "marginRight"],
  ["marginBottom", "marginBottom"],
  ["marginLeft", "marginLeft"],
  ["gap", "gap"],
]);

const SIZE_STYLE_PROPERTIES = Object.freeze([
  ["width", "width"],
  ["height", "height"],
  ["minWidth", "minWidth"],
  ["maxWidth", "maxWidth"],
  ["minHeight", "minHeight"],
  ["maxHeight", "maxHeight"],
]);

const FILTER_STYLE_PROPERTIES = Object.freeze([
  ["blur", (value) => `blur(${px(value)})`],
  ["brightness", (value) => `brightness(${value}%)`],
  ["contrast", (value) => `contrast(${value}%)`],
  ["saturation", (value) => `saturate(${value}%)`],
  ["hueRotate", (value) => `hue-rotate(${value}deg)`],
  ["grayscale", (value) => `grayscale(${value}%)`],
  ["sepia", (value) => `sepia(${value}%)`],
]);

function assignMappedStyleProperties(element, style, properties) {
  for (const [source, target, formatter] of properties) {
    if (element[source] == null) continue;
    style[target] = formatter ? formatter(element[source]) : element[source];
  }
}

function applyTypographyStyles(element, style) {
  assignMappedStyleProperties(element, style, DIRECT_STYLE_PROPERTIES);
  if (element.letterSpacing == null) return;
  style.letterSpacing =
    typeof element.letterSpacing === "number"
      ? `${element.letterSpacing}em`
      : element.letterSpacing;
}

function applyBoxStyles(element, style, radius) {
  if (radius != null) style.borderRadius = px(radius);
  assignMappedStyleProperties(
    element,
    style,
    BOX_STYLE_PROPERTIES.map(([source, target]) => [source, target, px]),
  );
}

function resolveLegacyShadow(shadow) {
  if (shadow == null) return null;
  if (typeof shadow !== "number") return shadow;
  return `0 ${Math.round(shadow * 0.35)}px ${Math.round(shadow * 0.7)}px rgba(0,0,0,0.35)`;
}

function resolveOptionalOpacity(opacity, blur, blurredFallback) {
  if (opacity != null) return clamp01(opacity, 0);
  if (blur > 0) return blurredFallback;
  return 0;
}

function applyShadowStyles(element, style) {
  const shadows = [];
  const legacyShadow = resolveLegacyShadow(element.shadow);
  if (legacyShadow) shadows.push(legacyShadow);
  const shadowBlur = getElementProperty(element, "shadowBlur");
  const shadowOpacity = getElementProperty(element, "shadowOpacity");
  const resolvedShadowBlur = Number(
    shadowBlur ?? (shadowOpacity != null ? 24 : 0),
  );
  const resolvedShadowOpacity = resolveOptionalOpacity(
    shadowOpacity,
    resolvedShadowBlur,
    0.28,
  );
  if (resolvedShadowBlur > 0 && resolvedShadowOpacity > 0) {
    shadows.push(
      `0 ${Math.round(resolvedShadowBlur * 0.35)}px ${Math.round(resolvedShadowBlur)}px rgba(0,0,0,${resolvedShadowOpacity.toFixed(2)})`,
    );
  }
  const glowBlur = getElementProperty(element, "glowBlur");
  const glowOpacity = getElementProperty(element, "glowOpacity");
  const resolvedGlowBlur = Number(glowBlur ?? (glowOpacity != null ? 24 : 0));
  const resolvedGlowOpacity = resolveOptionalOpacity(
    glowOpacity,
    resolvedGlowBlur,
    0.24,
  );
  if (resolvedGlowBlur > 0 && resolvedGlowOpacity > 0) {
    const color =
      element.glowColor ||
      element.accentColor ||
      element.fillColor ||
      element.backgroundColor ||
      element.background ||
      "#2dd4bf";
    shadows.push(
      `0 0 ${Math.round(resolvedGlowBlur)}px ${alphaColor(color, resolvedGlowOpacity)}`,
    );
  }
  if (shadows.length > 0) style.boxShadow = shadows.join(", ");
}

function applyBorderStyles(element, style, fallback) {
  if (element.borderColor == null && element.borderWidth == null) return;
  const width = element.borderWidth ?? fallback.borderWidth ?? 1;
  const color = element.borderColor ?? fallback.borderColor ?? "currentColor";
  const borderStyle = element.borderStyle ?? fallback.borderStyle ?? "solid";
  style.border = `${px(width)} ${borderStyle} ${color}`;
}

function applySizingStyles(element, style) {
  if (element.imageSize != null) {
    style.width = px(element.imageSize);
    style.height = px(element.imageSize);
  }
  assignMappedStyleProperties(
    element,
    style,
    SIZE_STYLE_PROPERTIES.map(([source, target]) => [source, target, px]),
  );
}

function applyOffsetStyles(element, style) {
  const offsetX = Number(element.offsetX || 0);
  const offsetY = Number(element.offsetY || 0);
  const hasOffset =
    (Number.isFinite(offsetX) && offsetX !== 0) ||
    (Number.isFinite(offsetY) && offsetY !== 0);
  if (!hasOffset) return;
  style.position = style.position || "relative";
  style.zIndex = style.zIndex ?? 3;
  style.transform = [
    style.transform,
    `translate3d(${Number.isFinite(offsetX) ? Math.round(offsetX) : 0}px, ${Number.isFinite(offsetY) ? Math.round(offsetY) : 0}px, 0)`,
  ]
    .filter(Boolean)
    .join(" ");
}

function applyImageStyles(element, style, backgroundPosition) {
  if (element.imageUrl != null && String(element.imageUrl).trim()) {
    style.backgroundImage = `url("${String(element.imageUrl).replaceAll('"', "")}")`;
    style.backgroundRepeat = "no-repeat";
  }
  if (element.imageFit != null) {
    style.objectFit = element.imageFit;
    style.backgroundSize = element.imageFit;
  }
  if (element.backgroundSize != null)
    style.backgroundSize = element.backgroundSize;
  if (backgroundPosition == null) return;
  style.objectPosition = backgroundPosition;
  style.backgroundPosition = backgroundPosition;
}

function applyAnimationStyle(element, style) {
  const animation = elementAnimation(element);
  if (animation) style.animation = animation;
}

function applyFilterStyles(element, style, fallback) {
  const filters = [];
  for (const [source, formatter] of FILTER_STYLE_PROPERTIES) {
    if (element[source] != null) filters.push(formatter(element[source]));
  }
  if (filters.length > 0)
    style.filter = [fallback.filter, ...filters].filter(Boolean).join(" ");
  if (element.backdropBlur != null)
    style.backdropFilter = `blur(${px(element.backdropBlur)})`;
}

function applyFillStyle(element, style) {
  if (element.fillColor == null) return;
  style.fill = element.fillColor;
  if (style.background == null) style.background = element.fillColor;
}

export function subElementStyle(
  config,
  elementId,
  fallback,
  stateId = "default",
) {
  const aliased = STATE_ELEMENT_ALIASES[elementId];
  const sourceElementId = aliased?.[0] || elementId;
  const sourceStateId =
    stateId !== "default" ? stateId : aliased?.[1] || stateId;
  const element = getSubElementState(config, sourceElementId, sourceStateId);
  const fallbackStyle = fallback || {};
  const style = { ...fallbackStyle };
  if (element.visible === false) return { ...style, display: "none" };
  const background = getElementProperty(element, "background");
  const radius = getElementProperty(element, "radius");
  const backgroundPosition = getElementProperty(element, "backgroundPosition");
  if (background != null) style.background = background;
  applyTypographyStyles(element, style);
  applyBoxStyles(element, style, radius);
  applyShadowStyles(element, style);
  applyBorderStyles(element, style, fallbackStyle);
  applySizingStyles(element, style);
  applyOffsetStyles(element, style);
  if (hasLayoutSizing(element) && style.display == null) {
    style.display = "inline-block";
  }
  applyImageStyles(element, style, backgroundPosition);
  applyAnimationStyle(element, style);
  applyFilterStyles(element, style, fallbackStyle);
  applyFillStyle(element, style);
  return style;
}

export function subElementVars(config, elementId, prefix, stateId = "default") {
  const aliased = STATE_ELEMENT_ALIASES[elementId];
  const sourceElementId = aliased?.[0] || elementId;
  const sourceStateId =
    stateId !== "default" ? stateId : aliased?.[1] || stateId;
  const element = getSubElementState(config, sourceElementId, sourceStateId);
  return Object.fromEntries(
    Object.entries(element).map(([key, value]) => [
      `--${prefix}-${key}`,
      typeof value === "number" &&
      ![
        "opacity",
        "fontWeight",
        "brightness",
        "contrast",
        "saturation",
      ].includes(key)
        ? `${value}px`
        : value,
    ]),
  );
}
