export function getSubElement(config = {}, elementId) {
  return config?.subElements?.[elementId] || {};
}

export function subValue(config = {}, elementId, property, fallback) {
  const value = getSubElement(config, elementId)?.[property];
  return value === undefined || value === null || value === '' ? fallback : value;
}

function px(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export function subElementStyle(config = {}, elementId, fallback = {}) {
  const element = getSubElement(config, elementId);
  const style = { ...fallback };
  if (element.background != null) style.background = element.background;
  if (element.textColor != null) style.color = element.textColor;
  if (element.fontFamily != null) style.fontFamily = element.fontFamily;
  if (element.fontSize != null) style.fontSize = px(element.fontSize);
  if (element.fontWeight != null) style.fontWeight = element.fontWeight;
  if (element.radius != null) style.borderRadius = px(element.radius);
  if (element.padding != null) style.padding = px(element.padding);
  if (element.gap != null) style.gap = px(element.gap);
  if (element.opacity != null) style.opacity = element.opacity;
  if (element.shadow != null) style.boxShadow = typeof element.shadow === 'number'
    ? `0 ${Math.round(element.shadow * 0.35)}px ${Math.round(element.shadow * 0.7)}px rgba(0,0,0,0.35)`
    : element.shadow;
  if (element.borderColor != null || element.borderWidth != null) {
    const width = element.borderWidth ?? fallback.borderWidth ?? 1;
    const color = element.borderColor ?? fallback.borderColor ?? 'currentColor';
    style.border = `${width}px solid ${color}`;
  }
  if (element.width != null) style.width = px(element.width);
  if (element.height != null) style.height = px(element.height);
  if (element.imageSize != null) {
    style.width = px(element.imageSize);
    style.height = px(element.imageSize);
  }
  return style;
}

export function subElementVars(config = {}, elementId, prefix) {
  const element = getSubElement(config, elementId);
  return Object.fromEntries(Object.entries(element).map(([key, value]) => ([`--${prefix}-${key}`, typeof value === 'number' && !['opacity', 'fontWeight', 'brightness', 'contrast', 'saturation'].includes(key) ? `${value}px` : value])));
}