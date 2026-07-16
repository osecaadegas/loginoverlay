export const compactEditableQuickSchema = Object.freeze([
  Object.freeze({
    id: 'style',
    label: 'Style',
    controls: ['material', 'primaryColor', 'accentColor'],
  }),
  Object.freeze({
    id: 'textAndImages',
    label: 'Text and images',
    controls: ['fontFamily', 'textSize', 'boldText', 'imageVisibility', 'imageSize', 'imageShape', 'imageFit'],
  }),
  Object.freeze({
    id: 'shapeEffects',
    label: 'Shape and effects',
    controls: ['shape', 'density', 'scale', 'shadowStrength', 'glowStrength'],
  }),
  Object.freeze({
    id: 'motion',
    label: 'Motion',
    controls: ['carouselAutoplay', 'carouselSpeed', 'animationEnabled', 'animationSpeed'],
  }),
]);

export default compactEditableQuickSchema;
