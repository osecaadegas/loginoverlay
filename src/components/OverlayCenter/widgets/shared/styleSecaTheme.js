export const STYLE_SECA = Object.freeze({
  primary: '#f2b84b',
  secondary: '#4d7cff',
  surface: '#081434',
  elevated: 'rgba(16,34,79,0.94)',
  secondarySurface: 'rgba(21,44,95,0.88)',
  cardSurface: 'rgba(12,28,66,0.88)',
  text: '#f7fbff',
  muted: '#9db2e3',
  darkText: '#06142e',
  border: 'rgba(86,132,230,0.42)',
  glow: 'rgba(69,124,255,0.32)',
  font: "'Rajdhani', 'Barlow Condensed', sans-serif",
});

const LEGACY_STYLE_SECA_MARKERS = [
  '#111114',
  '#e8a020',
  '#f8ecd2',
  '#8f7b56',
  '39,34,21',
  '17,18,22',
  '18,18,20',
  '232,160,32',
];

export function styleSecaSurfaceGradient(angle = '145deg') {
  return `linear-gradient(${angle}, ${STYLE_SECA.surface}, ${STYLE_SECA.elevated})`;
}

export function styleSecaHeaderGradient(angle = '135deg') {
  return `linear-gradient(${angle}, rgba(77,124,255,0.24), rgba(242,184,75,0.10))`;
}

export function resolveStyleSecaValue(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).replace(/\s+/g, '').toLowerCase();
  if (LEGACY_STYLE_SECA_MARKERS.some(marker => normalized.includes(marker))) return fallback;
  return value;
}