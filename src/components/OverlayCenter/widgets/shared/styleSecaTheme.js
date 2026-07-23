export const STYLE_SECA = Object.freeze({
  primary: "#f2b84b",
  secondary: "#22d3ee",
  surface: "#081434",
  elevated: "rgba(11,29,72,0.94)",
  secondarySurface: "rgba(12,32,78,0.9)",
  cardSurface: "rgba(8,26,67,0.9)",
  text: "#f7fbff",
  muted: "#9fb7d8",
  darkText: "#06142e",
  border: "rgba(34,211,238,0.46)",
  glow: "rgba(34,211,238,0.28)",
  font: "'Rajdhani', 'Barlow Condensed', sans-serif",
});

const LEGACY_STYLE_SECA_MARKERS = [
  "#111114",
  "#e8a020",
  "#f8ecd2",
  "#8f7b56",
  "39,34,21",
  "17,18,22",
  "18,18,20",
  "232,160,32",
];

export function styleSecaSurfaceGradient(angle = "145deg") {
  return `linear-gradient(${angle}, ${STYLE_SECA.surface}, ${STYLE_SECA.elevated})`;
}

export function styleSecaHeaderGradient(angle = "135deg") {
  return `linear-gradient(${angle}, rgba(77,124,255,0.24), rgba(242,184,75,0.10))`;
}

export function resolveStyleSecaValue(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).replace(/\s+/g, "").toLowerCase();
  if (LEGACY_STYLE_SECA_MARKERS.some((marker) => normalized.includes(marker)))
    return fallback;
  return value;
}
