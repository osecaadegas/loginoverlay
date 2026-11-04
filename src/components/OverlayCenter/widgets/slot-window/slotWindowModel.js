export const SLOT_WINDOW_DEFAULTS = Object.freeze({
  displayStyle: "screen_split",
  sourceUrl: "",
  fallbackImageUrl: "",
  showFallbackImage: false,
  maskShape: "rounded",
  cornerRadius: 24,
  feather: 0,
  cropTop: 0,
  cropRight: 0,
  cropBottom: 0,
  cropLeft: 0,
  fps: 60,
  fit: "cover",
});

export const SLOT_WINDOW_MASK_OPTIONS = Object.freeze([
  { value: "rectangle", label: "Rectangle" },
  { value: "rounded", label: "Rounded" },
  { value: "ellipse", label: "Ellipse" },
  { value: "angled", label: "Angled" },
]);

const VALID_SHAPES = new Set(SLOT_WINDOW_MASK_OPTIONS.map(({ value }) => value));

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function normalizeSlotWindowSourceUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  try {
    const url = new URL(input);
    const port = Number(url.port);
    const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    const isCapturePort = port >= 17832 && port <= 17841;
    const isPanel = /^\/view\/panel-[1-8]$/.test(url.pathname);
    const token = url.searchParams.get("token") || "";
    if (
      url.protocol !== "http:" ||
      !isLoopback ||
      !isCapturePort ||
      !isPanel ||
      !/^[a-f0-9]{48}$/i.test(token)
    ) {
      return "";
    }
    url.hostname = "127.0.0.1";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

export function sanitizeSlotWindowConfig(config = {}) {
  const cornerRadius = clampNumber(
    config.cornerRadius,
    0,
    240,
    SLOT_WINDOW_DEFAULTS.cornerRadius,
  );
  return {
    ...SLOT_WINDOW_DEFAULTS,
    ...config,
    displayStyle: "screen_split",
    sourceUrl: normalizeSlotWindowSourceUrl(config.sourceUrl),
    fallbackImageUrl: normalizeSlotWindowFallbackImageUrl(config.fallbackImageUrl),
    showFallbackImage: config.showFallbackImage === true,
    maskShape: VALID_SHAPES.has(config.maskShape)
      ? config.maskShape
      : SLOT_WINDOW_DEFAULTS.maskShape,
    fit: config.fit === "contain" ? "contain" : "cover",
    cornerRadius,
    cornerTopLeft: clampNumber(config.cornerTopLeft, 0, 240, cornerRadius),
    cornerTopRight: clampNumber(config.cornerTopRight, 0, 240, cornerRadius),
    cornerBottomRight: clampNumber(config.cornerBottomRight, 0, 240, cornerRadius),
    cornerBottomLeft: clampNumber(config.cornerBottomLeft, 0, 240, cornerRadius),
    feather: clampNumber(config.feather, 0, 80, SLOT_WINDOW_DEFAULTS.feather),
    cropTop: clampNumber(config.cropTop, 0, 45, SLOT_WINDOW_DEFAULTS.cropTop),
    cropRight: clampNumber(config.cropRight, 0, 45, SLOT_WINDOW_DEFAULTS.cropRight),
    cropBottom: clampNumber(config.cropBottom, 0, 45, SLOT_WINDOW_DEFAULTS.cropBottom),
    cropLeft: clampNumber(config.cropLeft, 0, 45, SLOT_WINDOW_DEFAULTS.cropLeft),
    fps: clampNumber(config.fps, 5, 60, SLOT_WINDOW_DEFAULTS.fps),
  };
}

export function normalizeSlotWindowFallbackImageUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  if (input.startsWith("/") && !input.startsWith("//")) return input;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function buildSlotWindowSourceUrl(config = {}) {
  const normalized = sanitizeSlotWindowConfig(config);
  if (!normalized.sourceUrl) return "";
  const url = new URL(normalized.sourceUrl);
  // The parent widget owns the visible mask. Masking the source as well leaves
  // antialiased white fringes in OBS where the two rounded edges overlap.
  const sourceFeather = normalized.feather > 0;
  url.searchParams.set("shape", sourceFeather ? normalized.maskShape : "rectangle");
  const corners = sourceFeather
    ? [normalized.cornerTopLeft, normalized.cornerTopRight, normalized.cornerBottomRight, normalized.cornerBottomLeft]
    : [0, 0, 0, 0];
  url.searchParams.set("radius", String(corners.every((radius) => radius === corners[0]) ? corners[0] : 0));
  url.searchParams.set("radiusTopLeft", String(corners[0]));
  url.searchParams.set("radiusTopRight", String(corners[1]));
  url.searchParams.set("radiusBottomRight", String(corners[2]));
  url.searchParams.set("radiusBottomLeft", String(corners[3]));
  url.searchParams.set("feather", String(normalized.feather));
  url.searchParams.set("cropTop", String(normalized.cropTop));
  url.searchParams.set("cropRight", String(normalized.cropRight));
  url.searchParams.set("cropBottom", String(normalized.cropBottom));
  url.searchParams.set("cropLeft", String(normalized.cropLeft));
  url.searchParams.set("fps", String(normalized.fps));
  return url.toString();
}

export function getSlotWindowPanelLabel(config = {}) {
  const sourceUrl = normalizeSlotWindowSourceUrl(config.sourceUrl);
  if (!sourceUrl) return "Not connected";
  const panel = new URL(sourceUrl).pathname.match(/panel-([1-8])$/)?.[1];
  return panel ? `ScreenSplit panel ${panel}` : "ScreenSplit connected";
}

export function fitSlotWindowSource(sourceWidth, sourceHeight, width, height, fit = "contain") {
  if (![sourceWidth, sourceHeight, width, height].every(value => Number.isFinite(value) && value > 0)) return null;
  const scale = (fit === "cover" ? Math.max : Math.min)(width / sourceWidth, height / sourceHeight);
  return { width: sourceWidth * scale, height: sourceHeight * scale };
}
