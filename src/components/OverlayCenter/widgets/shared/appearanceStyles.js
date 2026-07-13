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

export function subValue(config = {}, elementId, property, fallback, stateId = 'default') {
  const aliased = STATE_ELEMENT_ALIASES[elementId];
  const sourceElementId = aliased?.[0] || elementId;
  const sourceStateId = stateId !== 'default' ? stateId : (aliased?.[1] || stateId);
  const value = getSubElementState(config, sourceElementId, sourceStateId)?.[property];
  return value === undefined || value === null || value === '' ? fallback : value;
}

function px(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export function subElementStyle(config = {}, elementId, fallback = {}, stateId = 'default') {
  const aliased = STATE_ELEMENT_ALIASES[elementId];
  const sourceElementId = aliased?.[0] || elementId;
  const sourceStateId = stateId !== 'default' ? stateId : (aliased?.[1] || stateId);
  const element = getSubElementState(config, sourceElementId, sourceStateId);
  const style = { ...fallback };
  if (element.background != null) style.background = element.background;
  if (element.textColor != null) style.color = element.textColor;
  if (element.fontFamily != null) style.fontFamily = element.fontFamily;
  if (element.fontSize != null) style.fontSize = px(element.fontSize);
  if (element.fontWeight != null) style.fontWeight = element.fontWeight;
  if (element.fontStyle != null) style.fontStyle = element.fontStyle;
  if (element.lineHeight != null) style.lineHeight = element.lineHeight;
  if (element.letterSpacing != null) style.letterSpacing = typeof element.letterSpacing === 'number' ? `${element.letterSpacing}em` : element.letterSpacing;
  if (element.textTransform != null) style.textTransform = element.textTransform;
  if (element.textAlign != null) style.textAlign = element.textAlign;
  if (element.radius != null) style.borderRadius = px(element.radius);
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
  if (element.shadow != null) style.boxShadow = typeof element.shadow === 'number'
    ? `0 ${Math.round(element.shadow * 0.35)}px ${Math.round(element.shadow * 0.7)}px rgba(0,0,0,0.35)`
    : element.shadow;
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
  if (element.fillColor != null) style.fill = element.fillColor;
  return style;
}

export function subElementVars(config = {}, elementId, prefix, stateId = 'default') {
  const aliased = STATE_ELEMENT_ALIASES[elementId];
  const sourceElementId = aliased?.[0] || elementId;
  const sourceStateId = stateId !== 'default' ? stateId : (aliased?.[1] || stateId);
  const element = getSubElementState(config, sourceElementId, sourceStateId);
  return Object.fromEntries(Object.entries(element).map(([key, value]) => ([`--${prefix}-${key}`, typeof value === 'number' && !['opacity', 'fontWeight', 'brightness', 'contrast', 'saturation'].includes(key) ? `${value}px` : value])));
}