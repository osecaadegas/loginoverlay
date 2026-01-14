/**
 * Theme Manager Utility
 * Applies theme tokens to document root
 * Syncs with Supabase realtime
 */

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
}

/**
 * Apply theme to document root
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  
  // Color tokens
  if (theme.color_primary) {
    root.style.setProperty('--color-primary', theme.color_primary);
    root.style.setProperty('--primary-rgb', hexToRgb(theme.color_primary));
  }
  if (theme.color_secondary) {
    root.style.setProperty('--color-secondary', theme.color_secondary);
    root.style.setProperty('--secondary-rgb', hexToRgb(theme.color_secondary));
  }
  if (theme.color_accent) {
    root.style.setProperty('--color-accent', theme.color_accent);
    root.style.setProperty('--accent-rgb', hexToRgb(theme.color_accent));
  }
  if (theme.color_surface) {
    root.style.setProperty('--color-surface', theme.color_surface);
  }
  if (theme.color_text_primary) {
    root.style.setProperty('--color-text-primary', theme.color_text_primary);
  }
  if (theme.color_text_secondary) {
    root.style.setProperty('--color-text-secondary', theme.color_text_secondary);
  }
  if (theme.color_success) {
    root.style.setProperty('--color-success', theme.color_success);
  }
  if (theme.color_danger) {
    root.style.setProperty('--color-danger', theme.color_danger);
  }
  if (theme.color_warning) {
    root.style.setProperty('--color-warning', theme.color_warning);
  }
  if (theme.color_glow) {
    root.style.setProperty('--color-glow', theme.color_glow);
    root.style.setProperty('--glow-rgb', hexToRgb(theme.color_glow));
  }
  if (theme.color_shadow) {
    root.style.setProperty('--color-shadow', theme.color_shadow);
  }
  
  // Typography tokens
  if (theme.font_family) {
    root.style.setProperty('--font-family', theme.font_family);
  }
  if (theme.font_weight_normal) {
    root.style.setProperty('--font-weight-normal', theme.font_weight_normal);
  }
  if (theme.font_weight_bold) {
    root.style.setProperty('--font-weight-bold', theme.font_weight_bold);
  }
  if (theme.font_numeric) {
    root.style.setProperty('--font-numeric', theme.font_numeric);
  }
  if (theme.letter_spacing) {
    root.style.setProperty('--letter-spacing', theme.letter_spacing);
  }
  
  // Material settings
  if (theme.material_type) {
    root.setAttribute('data-material', theme.material_type);
    root.style.setProperty('--material-type', theme.material_type);
  }
  if (theme.material_intensity !== undefined) {
    root.style.setProperty('--material-intensity', theme.material_intensity);
  }
  
  // Visual effects
  if (theme.border_radius !== undefined) {
    root.style.setProperty('--border-radius', `${theme.border_radius}px`);
  }
  if (theme.glow_intensity !== undefined) {
    root.style.setProperty('--glow-intensity', theme.glow_intensity);
  }
  if (theme.shadow_depth !== undefined) {
    root.style.setProperty('--shadow-depth', theme.shadow_depth);
  }
  if (theme.backdrop_blur !== undefined) {
    root.style.setProperty('--backdrop-blur', theme.backdrop_blur);
  }
  
  // Animation settings
  if (theme.animation_intensity) {
    root.setAttribute('data-animation', theme.animation_intensity);
    const intensityMap = {
      off: 0,
      subtle: 0.5,
      standard: 1,
      impactful: 1.5
    };
    root.style.setProperty('--animation-intensity', intensityMap[theme.animation_intensity] || 1);
  }
  if (theme.animation_duration !== undefined) {
    root.style.setProperty('--animation-duration', `${theme.animation_duration}ms`);
  }
  
  // High contrast mode
  if (theme.high_contrast !== undefined) {
    root.setAttribute('data-high-contrast', theme.high_contrast ? 'true' : 'false');
  }
}

/**
 * Apply widget-specific overrides
 */
export function applyWidgetOverride(widgetElement, overrides) {
  if (!widgetElement || !overrides) return;
  
  // Set override data attributes
  if (overrides.override_color_primary) {
    widgetElement.setAttribute('data-override-primary', overrides.override_color_primary);
    widgetElement.style.setProperty('--widget-primary', overrides.override_color_primary);
  }
  if (overrides.override_color_secondary) {
    widgetElement.style.setProperty('--widget-secondary', overrides.override_color_secondary);
  }
  if (overrides.override_color_accent) {
    widgetElement.style.setProperty('--widget-accent', overrides.override_color_accent);
  }
  if (overrides.override_color_surface) {
    widgetElement.style.setProperty('--widget-surface', overrides.override_color_surface);
  }
  if (overrides.override_color_text_primary) {
    widgetElement.style.setProperty('--widget-text-primary', overrides.override_color_text_primary);
  }
  if (overrides.override_color_text_secondary) {
    widgetElement.style.setProperty('--widget-text-secondary', overrides.override_color_text_secondary);
  }
  if (overrides.override_color_glow) {
    widgetElement.style.setProperty('--widget-glow', overrides.override_color_glow);
  }
  
  // Material override
  if (overrides.override_material_type) {
    widgetElement.setAttribute('data-material', overrides.override_material_type);
  }
  if (overrides.override_material_intensity !== undefined) {
    widgetElement.style.setProperty('--material-intensity', overrides.override_material_intensity);
  }
  
  // Visual overrides
  if (overrides.override_border_radius !== undefined) {
    widgetElement.style.setProperty('--widget-border-radius', overrides.override_border_radius);
  }
  if (overrides.override_glow_intensity !== undefined) {
    widgetElement.style.setProperty('--widget-glow-intensity', overrides.override_glow_intensity);
  }
  if (overrides.override_shadow_depth !== undefined) {
    widgetElement.style.setProperty('--widget-shadow-depth', overrides.override_shadow_depth);
  }
  if (overrides.override_opacity !== undefined) {
    widgetElement.style.setProperty('--widget-opacity', overrides.override_opacity);
  }
}

/**
 * Clear widget overrides
 */
export function clearWidgetOverride(widgetElement) {
  if (!widgetElement) return;
  
  // Remove override attributes
  widgetElement.removeAttribute('data-override-primary');
  widgetElement.removeAttribute('data-material');
  
  // Reset CSS variables to inherit
  const overrideProps = [
    '--widget-primary',
    '--widget-secondary',
    '--widget-accent',
    '--widget-surface',
    '--widget-text-primary',
    '--widget-text-secondary',
    '--widget-glow',
    '--material-intensity',
    '--widget-border-radius',
    '--widget-glow-intensity',
    '--widget-shadow-depth',
    '--widget-opacity'
  ];
  
  overrideProps.forEach(prop => {
    widgetElement.style.removeProperty(prop);
  });
}

/**
 * Get current theme from root
 */
export function getCurrentTheme() {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  return {
    color_primary: computedStyle.getPropertyValue('--color-primary').trim(),
    color_secondary: computedStyle.getPropertyValue('--color-secondary').trim(),
    color_accent: computedStyle.getPropertyValue('--color-accent').trim(),
    color_surface: computedStyle.getPropertyValue('--color-surface').trim(),
    color_text_primary: computedStyle.getPropertyValue('--color-text-primary').trim(),
    color_text_secondary: computedStyle.getPropertyValue('--color-text-secondary').trim(),
    color_success: computedStyle.getPropertyValue('--color-success').trim(),
    color_danger: computedStyle.getPropertyValue('--color-danger').trim(),
    color_warning: computedStyle.getPropertyValue('--color-warning').trim(),
    color_glow: computedStyle.getPropertyValue('--color-glow').trim(),
    color_shadow: computedStyle.getPropertyValue('--color-shadow').trim(),
    material_type: root.getAttribute('data-material') || 'glass',
    animation_intensity: root.getAttribute('data-animation') || 'standard',
    high_contrast: root.getAttribute('data-high-contrast') === 'true'
  };
}

/**
 * Preset themes
 */
export const THEME_PRESETS = {
  default: {
    name: 'Default Dark',
    color_primary: '#667eea',
    color_secondary: '#764ba2',
    color_accent: '#00d4ff',
    material_type: 'glass',
    animation_intensity: 'standard'
  },
  neon: {
    name: 'Neon Cyberpunk',
    color_primary: '#00ffff',
    color_secondary: '#ff00ff',
    color_accent: '#ffff00',
    color_glow: '#00ffff',
    material_type: 'neon',
    glow_intensity: 1.5,
    animation_intensity: 'impactful'
  },
  carbon: {
    name: 'Carbon Pro',
    color_primary: '#1a1a1a',
    color_secondary: '#2d2d2d',
    color_accent: '#00d4ff',
    material_type: 'carbon',
    animation_intensity: 'subtle'
  },
  glass: {
    name: 'Ice Glass',
    color_primary: '#3b82f6',
    color_secondary: '#60a5fa',
    color_accent: '#93c5fd',
    material_type: 'glass',
    backdrop_blur: 20,
    animation_intensity: 'standard'
  },
  gold: {
    name: 'Gold Metallic',
    color_primary: '#fbbf24',
    color_secondary: '#f59e0b',
    color_accent: '#fde047',
    material_type: 'metallic',
    animation_intensity: 'standard'
  }
};

/**
 * Validate color format
 */
export function isValidColor(color) {
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}

/**
 * Get contrast ratio between two colors
 */
export function getContrastRatio(color1, color2) {
  // Simplified contrast calculation
  // For production, use a proper WCAG contrast algorithm
  const rgb1 = hexToRgb(color1).split(',').map(Number);
  const rgb2 = hexToRgb(color2).split(',').map(Number);
  
  const lum1 = 0.299 * rgb1[0] + 0.587 * rgb1[1] + 0.114 * rgb1[2];
  const lum2 = 0.299 * rgb2[0] + 0.587 * rgb2[1] + 0.114 * rgb2[2];
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}
