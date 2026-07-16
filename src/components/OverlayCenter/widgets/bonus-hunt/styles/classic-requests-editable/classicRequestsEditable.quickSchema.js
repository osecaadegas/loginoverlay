export const classicRequestsEditableQuickSchema = Object.freeze([
  Object.freeze({
    id: 'style',
    label: 'Style',
    controls: ['material', 'primaryColor', 'accentColor'],
  }),
  Object.freeze({
    id: 'text',
    label: 'Text',
    controls: ['fontFamily', 'textSize', 'boldText'],
  }),
  Object.freeze({
    id: 'shapeEffects',
    label: 'Shape and effects',
    controls: ['shape', 'density', 'scale', 'shadowStrength', 'glowStrength'],
  }),
  Object.freeze({
    id: 'motion',
    label: 'Carousel motion',
    controls: ['carouselAutoplay', 'carouselSpeed', 'animationEnabled', 'animationSpeed'],
  }),
]);

export default classicRequestsEditableQuickSchema;
