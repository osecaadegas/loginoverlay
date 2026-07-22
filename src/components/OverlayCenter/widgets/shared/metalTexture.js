export function colorToRgbString(value, fallback = '232,160,32') {
  const raw = String(value || '').trim();
  const rgbMatch = raw.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgbMatch) return `${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]}`;

  const hexMatch = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hexMatch) return fallback;

  const hex = hexMatch[1].length === 3
    ? hexMatch[1].split('').map(char => `${char}${char}`).join('')
    : hexMatch[1];
  const int = Number.parseInt(hex, 16);
  return `${(int >> 16) & 255},${(int >> 8) & 255},${int & 255}`;
}

export function metalBorderColor(accentColor, opacity = 0.28) {
  return `rgba(${colorToRgbString(accentColor)},${opacity})`;
}

export function brushedMetalBackground(baseBackground, accentColor = '#e8a020', options = {}) {
  const accentRgb = colorToRgbString(accentColor);
  const highlight = options.highlightOpacity ?? 0.08;
  const grain = options.grainOpacity ?? 0.035;
  const angle = options.angle || '145deg';
  const base = baseBackground || 'linear-gradient(145deg, #1e1e22 0%, #1a1a1e 42%, #222226 100%)';

  return [
    `linear-gradient(${angle}, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.025) 14%, transparent 30%, rgba(0,0,0,0.22) 54%, rgba(255,255,255,0.065) 73%, rgba(0,0,0,0.28) 100%)`,
    `repeating-linear-gradient(90deg, rgba(255,255,255,${grain}) 0px, rgba(255,255,255,${grain}) 1px, rgba(0,0,0,0.025) 2px, transparent 5px)`,
    `linear-gradient(180deg, rgba(${accentRgb},${highlight}) 0%, transparent 36%, rgba(${accentRgb},${highlight * 0.55}) 74%, rgba(0,0,0,0.18) 100%)`,
    base,
  ].join(', ');
}

export function brushedMetalTextBackground(textColor = '#d4d4d8', accentColor = '#e8a020') {
  const accentRgb = colorToRgbString(accentColor);
  return [
    `linear-gradient(110deg, ${textColor} 0%, rgba(255,255,255,0.92) 26%, rgba(${accentRgb},0.95) 47%, ${textColor} 68%, rgba(255,255,255,0.76) 100%)`,
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 1px, transparent 1px, transparent 4px)',
  ].join(', ');
}

export function metalSurfaceShadow(accentColor = '#e8a020', strength = 1) {
  const accentRgb = colorToRgbString(accentColor);
  return [
    'inset 0 1px 0 rgba(255,255,255,0.08)',
    'inset 0 -1px 0 rgba(0,0,0,0.35)',
    `0 ${Math.round(4 * strength)}px ${Math.round(22 * strength)}px rgba(0,0,0,0.46)`,
    `0 0 ${Math.round(18 * strength)}px rgba(${accentRgb},0.1)`,
  ].join(', ');
}