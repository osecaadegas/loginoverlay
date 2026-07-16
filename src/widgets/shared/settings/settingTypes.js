export const SETTING_TYPES = Object.freeze({
  TEXT: 'text',
  NUMBER: 'number',
  COLOR: 'color',
  SELECT: 'select',
  BOOLEAN: 'boolean',
  RANGE: 'range',
});

export const COMMON_SETTING_GROUPS = Object.freeze({
  CONTENT: 'Content',
  TYPOGRAPHY: 'Typography',
  COLORS: 'Colors',
  BACKGROUND: 'Background',
  BORDER: 'Border',
  EFFECTS: 'Effects',
  LAYOUT: 'Layout',
  IMAGES: 'Images',
  PROGRESS: 'Progress',
  ANIMATION: 'Animation',
  VISIBILITY: 'Visibility',
});

export const FONT_FAMILY_OPTIONS = Object.freeze([
  { value: "'Inter', 'Segoe UI', sans-serif", label: 'Inter' },
  { value: "'Montserrat', 'Inter', sans-serif", label: 'Montserrat' },
  { value: "'Rajdhani', 'Inter', sans-serif", label: 'Rajdhani' },
  { value: "'Orbitron', 'Inter', sans-serif", label: 'Orbitron' },
  { value: "'Arial', sans-serif", label: 'Arial' },
]);

export const FONT_WEIGHT_OPTIONS = Object.freeze([
  { value: 400, label: 'Regular' },
  { value: 600, label: 'Medium' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
]);

export const TEXT_ALIGN_OPTIONS = Object.freeze([
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]);

export const TEXT_TRANSFORM_OPTIONS = Object.freeze([
  { value: 'none', label: 'Normal' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'capitalize', label: 'Title Case' },
]);

export const BORDER_STYLE_OPTIONS = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
]);

export const IMAGE_FIT_OPTIONS = Object.freeze([
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
]);

export const ANIMATION_OPTIONS = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'pulse', label: 'Pulse' },
]);

export function defineSetting(definition) {
  return Object.freeze({
    responsive: false,
    reset: 'default',
    ...definition,
  });
}
