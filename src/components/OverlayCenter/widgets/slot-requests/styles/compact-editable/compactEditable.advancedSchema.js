export const compactEditableAdvancedSchema = Object.freeze([
  Object.freeze({
    elementId: 'container',
    controls: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'shadowBlur', 'shadowOpacity', 'glowBlur', 'glowOpacity', 'fontFamily', 'fontSize', 'fontWeight'],
  }),
  Object.freeze({
    elementId: 'requestCard',
    controls: ['background', 'borderColor', 'borderWidth', 'radius', 'padding', 'gap', 'shadowBlur', 'shadowOpacity'],
  }),
  Object.freeze({
    elementId: 'position',
    controls: ['background', 'textColor', 'borderColor', 'borderWidth', 'radius', 'fontSize', 'fontWeight'],
  }),
  Object.freeze({
    elementId: 'slotImage',
    controls: ['imageSize', 'backgroundSize', 'radius', 'opacity', 'borderColor', 'borderWidth'],
  }),
  Object.freeze({
    elementId: 'slotTitle',
    controls: ['fontFamily', 'fontSize', 'fontWeight', 'textColor', 'lineHeight'],
  }),
  Object.freeze({
    elementId: 'viewerName',
    controls: ['fontFamily', 'fontSize', 'fontWeight', 'textColor', 'lineHeight'],
  }),
  Object.freeze({
    elementId: 'emptyState',
    controls: ['background', 'textColor', 'padding', 'fontSize'],
  }),
]);

export default compactEditableAdvancedSchema;
