/**
 * themeVarsBuilder.js — Builds CSS custom-property object from a theme row.
 * Shared between OverlayRenderer (OBS) and WidgetManager / OverlayPreview (admin).
 */
export default function buildThemeVars(theme) {
  if (!theme) return {};
  const vars = {
    '--oc-primary': theme.primary_color || '#9346ff',
    '--oc-secondary': theme.secondary_color || '#1a1b2e',
    '--oc-accent': theme.accent_color || '#00e1ff',
    '--oc-text': theme.text_color || '#ffffff',
    '--oc-opacity': theme.opacity ?? 0.9,
    '--oc-blur': `${theme.blur_intensity ?? 12}px`,
    '--oc-shadow': theme.shadow_strength ?? 0.5,
    '--oc-glow': theme.glow_intensity ?? 0.4,
    '--oc-radius': `${theme.border_radius ?? 12}px`,
    '--oc-font': theme.font_family || 'Inter',
    '--oc-font-weight': theme.font_weight || 500,
    '--oc-anim-speed': theme.animation_speed ?? 1,
    // Mirror DB colors into --t-* vars so theme-system.css works
    '--t-primary': theme.primary_color || '#9346ff',
    '--t-secondary': theme.secondary_color || '#1a1b2e',
    '--t-accent': theme.accent_color || '#00e1ff',
    '--t-text': theme.text_color || '#ffffff',
    '--t-font': theme.font_family || 'Inter',
  };

  // When metallic theme is active, pipe the stored color into --t-metal-* vars
  if (theme.style_preset === 'metallic' && theme.primary_color) {
    const hex = theme.primary_color;
    vars['--t-metal-hex'] = hex;
    vars['--t-metal-gradient'] = `linear-gradient(135deg, ${hex}cc 0%, ${hex}66 40%, ${hex}99 60%, ${hex}cc 100%)`;
  }

  return vars;
}
