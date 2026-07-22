export function getSubElement(config = {}, elementId) {
  const subElements = Object.prototype.hasOwnProperty.call(config || {}, '__appearanceExplicitSubElements')
    ? config.__appearanceExplicitSubElements
    : config?.subElements;
  return subElements?.[elementId] || {};
}

const STATE_ELEMENT_ALIASES = {
  openedState: ['bonusCard', 'opened'],
  unopenedState: ['bonusCard', 'unopened'],
  currentState: ['bonusCard', 'current'],
  selectedState: ['optionCard', 'selected'],
  winningState: ['optionCard', 'winner'],
  losingState: ['optionCard', 'loser'],
  pendingState: ['requestCard', 'pending'],
  playingState: ['requestCard', 'playing'],
  completedState: ['requestCard', 'completed'],
  rejectedState: ['requestCard', 'rejected'],
  winnerHighlight: ['participantCard', 'winner'],
  eliminatedState: ['participantCard', 'eliminated'],
  highlightedMessage: ['message', 'highlighted'],
  botMessage: ['message', 'bot'],
  subscriberMessage: ['message', 'subscriber'],
  moderatorMessage: ['message', 'moderator'],
};

export function getSubElementState(config = {}, elementId, stateId = 'default') {
  const element = getSubElement(config, elementId);
  if (!stateId || stateId === 'default') return element;
  return { ...element, ...(element?.states?.[stateId] || {}) };
}

function getElementProperty(element = {}, property) {
  if (element?.[property] !== undefined) return element[property];
  if (property === 'background' && element.backgroundColor !== undefined) return element.backgroundColor;
  if (property === 'backgroundColor' && element.background !== undefined) return element.background;
  if (property === 'radius' && element.borderRadius !== undefined) return element.borderRadius;
  if (property === 'borderRadius' && element.radius !== undefined) return element.radius;
  if (property === 'shadowBlur' && element.shadowSize !== undefined) return element.shadowSize;
  if (property === 'shadowOpacity' && element.shadowIntensity !== undefined) return element.shadowIntensity;
  if (property === 'glowBlur' && element.glowSize !== undefined) return element.glowSize;
  if (property === 'glowOpacity' && element.glowIntensity !== undefined) return element.glowIntensity;
  if (property === 'backgroundPosition' && element.imagePosition !== undefined) return element.imagePosition;
  if (property === 'imagePosition' && element.backgroundPosition !== undefined) return element.backgroundPosition;
  return undefined;
}

export function subValue(config = {}, elementId, property, fallback, stateId = 'default') {
  const aliased = STATE_ELEMENT_ALIASES[elementId];
  const sourceElementId = aliased?.[0] || elementId;
  const sourceStateId = stateId !== 'default' ? stateId : (aliased?.[1] || stateId);
  const value = getElementProperty(getSubElementState(config, sourceElementId, sourceStateId), property);
  return value === undefined || value === null || value === '' ? fallback : value;
}

function px(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

function clamp01(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split('').map(char => `${char}${char}`).join('')
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
  if (/^rgba?\(/i.test(String(value || ''))) return value;
  return `rgba(45,212,191,${opacity})`;
}

export function subElementStyle(config = {}, elementId, fallback = {}, stateId = 'default') {
  const aliased = STATE_ELEMENT_ALIASES[elementId];
  const sourceElementId = aliased?.[0] || elementId;
  const sourceStateId = stateId !== 'default' ? stateId : (aliased?.[1] || stateId);
  const element = getSubElementState(config, sourceElementId, sourceStateId);
  const style = { ...fallback };
  const background = getElementProperty(element, 'background');
  const radius = getElementProperty(element, 'radius');
  const shadowBlur = getElementProperty(element, 'shadowBlur');
  const shadowOpacity = getElementProperty(element, 'shadowOpacity');
  const glowBlur = getElementProperty(element, 'glowBlur');
  const glowOpacity = getElementProperty(element, 'glowOpacity');
  const backgroundPosition = getElementProperty(element, 'backgroundPosition');
  if (background != null) style.background = background;
  if (element.textColor != null) style.color = element.textColor;
  if (element.fontFamily != null) style.fontFamily = element.fontFamily;
  if (element.fontSize != null) style.fontSize = px(element.fontSize);
  if (element.fontWeight != null) style.fontWeight = element.fontWeight;
  if (element.fontStyle != null) style.fontStyle = element.fontStyle;
  if (element.lineHeight != null) style.lineHeight = element.lineHeight;
  if (element.letterSpacing != null) style.letterSpacing = typeof element.letterSpacing === 'number' ? `${element.letterSpacing}em` : element.letterSpacing;
  if (element.textTransform != null) style.textTransform = element.textTransform;
  if (element.textAlign != null) style.textAlign = element.textAlign;
  if (radius != null) style.borderRadius = px(radius);
  if (element.padding != null) style.padding = px(element.padding);
  if (element.paddingTop != null) style.paddingTop = px(element.paddingTop);
  if (element.paddingRight != null) style.paddingRight = px(element.paddingRight);
  if (element.paddingBottom != null) style.paddingBottom = px(element.paddingBottom);
  if (element.paddingLeft != null) style.paddingLeft = px(element.paddingLeft);
  if (element.marginTop != null) style.marginTop = px(element.marginTop);
  if (element.marginRight != null) style.marginRight = px(element.marginRight);
  if (element.marginBottom != null) style.marginBottom = px(element.marginBottom);
  if (element.marginLeft != null) style.marginLeft = px(element.marginLeft);
  if (element.gap != null) style.gap = px(element.gap);
  if (element.opacity != null) style.opacity = element.opacity;
  const shadows = [];
  if (element.shadow != null) {
    shadows.push(typeof element.shadow === 'number'
      ? `0 ${Math.round(element.shadow * 0.35)}px ${Math.round(element.shadow * 0.7)}px rgba(0,0,0,0.35)`
      : element.shadow);
  }
  const resolvedShadowBlur = Number(shadowBlur ?? (shadowOpacity != null ? 24 : 0));
  const resolvedShadowOpacity = shadowOpacity != null ? clamp01(shadowOpacity, 0) : (resolvedShadowBlur > 0 ? 0.28 : 0);
  if (resolvedShadowBlur > 0 && resolvedShadowOpacity > 0) {
    const blur = resolvedShadowBlur;
    const opacity = resolvedShadowOpacity;
    shadows.push(`0 ${Math.round(blur * 0.35)}px ${Math.round(blur)}px rgba(0,0,0,${opacity.toFixed(2)})`);
  }
  const resolvedGlowBlur = Number(glowBlur ?? (glowOpacity != null ? 24 : 0));
  const resolvedGlowOpacity = glowOpacity != null ? clamp01(glowOpacity, 0) : (resolvedGlowBlur > 0 ? 0.24 : 0);
  if (resolvedGlowBlur > 0 && resolvedGlowOpacity > 0) {
    const blur = resolvedGlowBlur;
    const opacity = resolvedGlowOpacity;
    const color = element.glowColor || element.accentColor || element.fillColor || element.backgroundColor || element.background || '#2dd4bf';
    shadows.push(`0 0 ${Math.round(blur)}px ${alphaColor(color, opacity)}`);
  }
  if (shadows.length > 0) style.boxShadow = shadows.join(', ');
  if (element.borderColor != null || element.borderWidth != null) {
    const width = element.borderWidth ?? fallback.borderWidth ?? 1;
    const color = element.borderColor ?? fallback.borderColor ?? 'currentColor';
    const borderStyle = element.borderStyle ?? fallback.borderStyle ?? 'solid';
    style.border = `${px(width)} ${borderStyle} ${color}`;
  }
  if (element.width != null) style.width = px(element.width);
  if (element.height != null) style.height = px(element.height);
  if (element.minWidth != null) style.minWidth = px(element.minWidth);
  if (element.maxWidth != null) style.maxWidth = px(element.maxWidth);
  if (element.minHeight != null) style.minHeight = px(element.minHeight);
  if (element.maxHeight != null) style.maxHeight = px(element.maxHeight);
  if (element.imageSize != null) {
    style.width = px(element.imageSize);
    style.height = px(element.imageSize);
  }
  if (element.imageUrl != null && String(element.imageUrl).trim()) {
    style.backgroundImage = `url("${String(element.imageUrl).replace(/"/g, '')}")`;
    style.backgroundRepeat = 'no-repeat';
  }
  if (element.imageFit != null) {
    style.objectFit = element.imageFit;
    style.backgroundSize = element.imageFit;
  }
  if (element.backgroundSize != null) style.backgroundSize = element.backgroundSize;
  if (backgroundPosition != null) {
    style.objectPosition = backgroundPosition;
    style.backgroundPosition = backgroundPosition;
  }
  const filters = [];
  if (element.blur != null) filters.push(`blur(${px(element.blur)})`);
  if (element.brightness != null) filters.push(`brightness(${element.brightness}%)`);
  if (element.contrast != null) filters.push(`contrast(${element.contrast}%)`);
  if (element.saturation != null) filters.push(`saturate(${element.saturation}%)`);
  if (element.hueRotate != null) filters.push(`hue-rotate(${element.hueRotate}deg)`);
  if (element.grayscale != null) filters.push(`grayscale(${element.grayscale}%)`);
  if (element.sepia != null) filters.push(`sepia(${element.sepia}%)`);
  if (filters.length > 0) style.filter = [fallback.filter, ...filters].filter(Boolean).join(' ');
  if (element.backdropBlur != null) style.backdropFilter = `blur(${px(element.backdropBlur)})`;
  if (element.fillColor != null) {
    style.fill = element.fillColor;
    if (style.background == null) style.background = element.fillColor;
  }
  return style;
}

export function subElementVars(config = {}, elementId, prefix, stateId = 'default') {
  const aliased = STATE_ELEMENT_ALIASES[elementId];
  const sourceElementId = aliased?.[0] || elementId;
  const sourceStateId = stateId !== 'default' ? stateId : (aliased?.[1] || stateId);
  const element = getSubElementState(config, sourceElementId, sourceStateId);
  return Object.fromEntries(Object.entries(element).map(([key, value]) => ([`--${prefix}-${key}`, typeof value === 'number' && !['opacity', 'fontWeight', 'brightness', 'contrast', 'saturation'].includes(key) ? `${value}px` : value])));
}
