const HEX_6 = /^#[0-9a-f]{6}$/i;
const HEX_3 = /^#[0-9a-f]{3}$/i;

export function clamp(number, min, max) {
  const value = Number(number);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeHexColor(value, fallback = '#14d8d8') {
  const raw = String(value || '').trim();
  if (HEX_6.test(raw)) return raw.toLowerCase();
  if (HEX_3.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  return fallback;
}

export function isValidHexColor(value) {
  return HEX_6.test(String(value || '').trim()) || HEX_3.test(String(value || '').trim());
}

export function hexToRgb(value, fallback = '#14d8d8') {
  const hex = normalizeHexColor(value, fallback).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const toHex = channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mixHex(first, second, weight = 0.5) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const amount = clamp(weight, 0, 1);
  return rgbToHex({
    r: a.r * (1 - amount) + b.r * amount,
    g: a.g * (1 - amount) + b.g * amount,
    b: a.b * (1 - amount) + b.b * amount,
  });
}

export function lightenHex(value, amount = 0.2) {
  return mixHex(value, '#ffffff', amount);
}

export function darkenHex(value, amount = 0.2) {
  return mixHex(value, '#020617', amount);
}

export function desaturateHex(value, amount = 0.3) {
  const gray = mixHex(value, '#94a3b8', 0.5);
  return mixHex(value, gray, amount);
}

export function toRgba(value, alpha = 1) {
  const { r, g, b } = hexToRgb(value);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(2)})`;
}

function relativeLuminance(value) {
  const { r, g, b } = hexToRgb(value);
  const transform = channel => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function getContrastRatio(first, second) {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
}

export function getReadableTextColor(background, light = '#f8fafc', dark = '#07111f') {
  return getContrastRatio(background, light) >= getContrastRatio(background, dark) ? light : dark;
}

export function validateReadableText(background, text, minimum = 4.5) {
  const ratio = getContrastRatio(background, text);
  return {
    status: ratio >= minimum ? 'valid' : 'low-contrast',
    ratio,
    minimum,
    suggestedText: ratio >= minimum ? text : getReadableTextColor(background),
  };
}

export function deriveAccentColor(primary, accent, useAccentColor = false) {
  if (useAccentColor && isValidHexColor(accent)) return normalizeHexColor(accent);
  return lightenHex(primary, 0.24);
}
