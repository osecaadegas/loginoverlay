export const QUALITY_PRESETS = Object.freeze({
  performance: { label: 'Desempenho', maxCaptures: 2, fps: 30 },
  balanced: { label: 'Equilibrado', maxCaptures: 4, fps: 30 },
  quality: { label: 'Qualidade', maxCaptures: 4, fps: 60 },
  ultra: { label: 'Ultra', maxCaptures: 4, fps: 60 },
});

export const MASK_DEFAULTS = Object.freeze({
  rectangle: { x: 0.1, y: 0.1, width: 0.8, height: 0.8, radius: 0.03 },
  ellipse: { cx: 0.5, cy: 0.5, rx: 0.4, ry: 0.4 },
  polygon: { points: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] },
  freehand: { brushSize: 0.03, hardness: 0.8, strokes: [] },
  image: { x: 0, y: 0, width: 1, height: 1, rotation: 0, assetPath: '' },
  luminance: { threshold: 0.5, softness: 0.1, gamma: 1, inverted: false },
  chroma: { color: '#00ff00', similarity: 0.35, smoothness: 0.08, spill: 0.25 },
  gradient: { kind: 'linear', angle: 0, startOpacity: 1, endOpacity: 0 },
});

export const FILTER_DEFAULTS = Object.freeze({
  brightness: { amount: 0 }, contrast: { amount: 0 }, saturation: { amount: 0 }, gamma: { amount: 1 },
  exposure: { amount: 0 }, temperature: { amount: 0 }, tint: { amount: 0 }, hue: { amount: 0 },
  sharpen: { amount: 0.25 }, blur: { radius: 2 }, pixelate: { size: 4 }, vignette: { amount: 0.25 },
  glow: { amount: 0.25 }, bloom: { amount: 0.25 }, opacity: { amount: 1 },
  chroma: { color: '#00ff00', similarity: 0.35, smoothness: 0.08, spill: 0.25 },
  luminance: { threshold: 0.5, softness: 0.1, gamma: 1 },
});

export function normalizeBounds(bounds, viewport) {
  const width = Math.max(1, Number(viewport?.width) || 1);
  const height = Math.max(1, Number(viewport?.height) || 1);
  const clamp = (value) => Math.min(1, Math.max(0, value));
  return {
    x: clamp((Number(bounds?.x) || 0) / width),
    y: clamp((Number(bounds?.y) || 0) / height),
    width: clamp((Number(bounds?.width) || 0) / width),
    height: clamp((Number(bounds?.height) || 0) / height),
    viewportWidth: width,
    viewportHeight: height,
    devicePixelRatio: Math.max(0.5, Number(viewport?.devicePixelRatio) || 1),
  };
}

export function makeMask(type, order = 0) {
  if (!MASK_DEFAULTS[type]) throw new Error(`Tipo de máscara não suportado: ${type}`);
  return {
    name: `Máscara ${type}`,
    mask_type: type,
    operation: 'add',
    enabled: true,
    locked: false,
    opacity: 1,
    feather: 0,
    sort_order: order,
    config: structuredClone(MASK_DEFAULTS[type]),
  };
}

export function makeFilter(type, order = 0) {
  if (!FILTER_DEFAULTS[type]) throw new Error(`Filtro não suportado: ${type}`);
  return { filter_type: type, enabled: true, sort_order: order, config: structuredClone(FILTER_DEFAULTS[type]) };
}
