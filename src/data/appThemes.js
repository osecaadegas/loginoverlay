/**
 * App Theme Definitions â€” 5 core themes
 *
 * Each theme defines:
 *   colors: { primary, secondary, accent, background, surface, text, muted, border }
 *   font:   CSS font-family string
 *   material: surface treatment class applied to widgets
 *
 * The "metallic" theme also supports a configurable metal color via
 * the `metallicPresets` map. Users pick a preset (or custom hex) on
 * the Themes page and it tints all metallic surfaces.
 */

/* â”€â”€ Metallic colour presets â”€â”€ */
export const metallicPresets = {
  chrome:   { label: 'Chrome',   hex: '#c0c0c0', gradient: 'linear-gradient(135deg, #e8e8e8 0%, #9e9e9e 40%, #c0c0c0 60%, #e8e8e8 100%)' },
  gold:     { label: 'Gold',     hex: '#ffd700', gradient: 'linear-gradient(135deg, #ffe066 0%, #b8860b 40%, #ffd700 60%, #ffe066 100%)' },
  bronze:   { label: 'Bronze',   hex: '#cd7f32', gradient: 'linear-gradient(135deg, #e8a85c 0%, #8b5e24 40%, #cd7f32 60%, #e8a85c 100%)' },
  copper:   { label: 'Copper',   hex: '#b87333', gradient: 'linear-gradient(135deg, #d4955a 0%, #7a4e24 40%, #b87333 60%, #d4955a 100%)' },
  steel:    { label: 'Steel',    hex: '#71797e', gradient: 'linear-gradient(135deg, #a8b0b5 0%, #4a5258 40%, #71797e 60%, #a8b0b5 100%)' },
  platinum: { label: 'Platinum', hex: '#e5e4e2', gradient: 'linear-gradient(135deg, #f5f5f3 0%, #b0afad 40%, #e5e4e2 60%, #f5f5f3 100%)' },
  cobalt:   { label: 'Cobalt',   hex: '#0047ab', gradient: 'linear-gradient(135deg, #3373c4 0%, #002d6e 40%, #0047ab 60%, #3373c4 100%)' },
  gunmetal: { label: 'Gunmetal', hex: '#2a3439', gradient: 'linear-gradient(135deg, #4a5459 0%, #1a2024 40%, #2a3439 60%, #4a5459 100%)' },
  rose:     { label: 'Rose Gold',hex: '#b76e79', gradient: 'linear-gradient(135deg, #d4949d 0%, #8a4a53 40%, #b76e79 60%, #d4949d 100%)' },
};

const THEMES = {
  /* â”€â”€ Classic â”€â”€
     Clean, modern, dark. Neutral tones, subtle glass surfaces. */
  'classic': {
    colors: {
      primary: '#6366f1', secondary: '#1e1b4b', accent: '#818cf8',
      background: '#0f0f1a', surface: 'rgba(20, 20, 35, 0.92)',
      text: '#f1f5f9', muted: '#94a3b8', border: 'rgba(255,255,255,0.08)',
    },
    font: "'Inter', 'Segoe UI', sans-serif",
    material: 'classic',
  },

  /* â”€â”€ Metallic â”€â”€
     Brushed-metal surfaces with configurable tint. Inset highlights,
     directional sheen animation. Default tint = chrome. */
  'metallic': {
    colors: {
      primary: '#c0c0c0', secondary: '#3a3a3a', accent: '#e0e0e0',
      background: '#0a0a0e', surface: 'rgba(30,30,36,0.95)',
      text: '#f0f0f0', muted: '#9e9e9e', border: 'rgba(255,255,255,0.15)',
    },
    font: "'Rajdhani', 'Segoe UI', sans-serif",
    material: 'metallic',
  },

  /* â”€â”€ Carbon â”€â”€
     Carbon-fibre weave texture, dark matte surfaces, sharp accent lines. */
  'carbon': {
    colors: {
      primary: '#ef4444', secondary: '#1c1c1c', accent: '#f87171',
      background: '#080808', surface: 'rgba(18,18,18,0.96)',
      text: '#e4e4e7', muted: '#71717a', border: 'rgba(255,255,255,0.06)',
    },
    font: "'Exo 2', 'Segoe UI', sans-serif",
    material: 'carbon',
  },

  /* â”€â”€ Retro â”€â”€
     Pixel-art inspired, warm CRT glow, scan-line overlay, chunky borders. */
  'retro': {
    colors: {
      primary: '#facc15', secondary: '#78350f', accent: '#fb923c',
      background: '#1a1205', surface: 'rgba(40,30,12,0.94)',
      text: '#fef3c7', muted: '#a8a29e', border: 'rgba(250,204,21,0.25)',
    },
    font: "'Press Start 2P', 'Courier New', monospace",
    material: 'retro',
  },

  /* â”€â”€ Futuristic â”€â”€
     Holographic glows, neon edges, translucent panels with blur.  */
  'futuristic': {
    colors: {
      primary: '#00e1ff', secondary: '#0a0e27', accent: '#7c3aed',
      background: '#030712', surface: 'rgba(10,14,39,0.85)',
      text: '#e0f2fe', muted: '#64748b', border: 'rgba(0,225,255,0.2)',
    },
    font: "'Orbitron', 'Segoe UI', sans-serif",
    material: 'futuristic',
  },
};

/** Ordered list for UI */
export const themeList = Object.entries(THEMES).map(([id, data]) => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
  ...data,
}));

/** Quick lookup by id */
export const themeMap = THEMES;

export default THEMES;
