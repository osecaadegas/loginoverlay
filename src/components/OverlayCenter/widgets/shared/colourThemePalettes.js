// Shared colour choices. Rendering options and live data are not part of a palette.
export const WIDGET_COLOUR_THEMES = Object.freeze([
  {
    key: "neon", name: "Neon", icon: "neon", swatches: ["#071a44", "#0a84ff", "#59d6ff"],
    background: "#081228", surface: "#0a1734", raised: "#0d2049", border: "#2f63c9",
    accent: "#45c8ff", secondary: "#1e5ad6", text: "#eef6ff", muted: "#9dbdf2", hue: 205,
  },
  {
    key: "metallic", name: "Metallic", icon: "metallic", swatches: ["#1b232e", "#8fa1b8", "#e8eef6"],
    background: "#0e1318", surface: "#232b35", raised: "#39434f", border: "#8fa1b8",
    accent: "#d7e2f0", secondary: "#9fb0c6", text: "#eef4fb", muted: "#a7b6c9", hue: 210,
  },
  {
    key: "gradient", name: "Gradient", icon: "gradient", swatches: ["#171f5e", "#5b7cfa", "#22d3ee"],
    background: "#081226", surface: "#131a4a", raised: "#1b2566", border: "#4f6cf0",
    accent: "#9db4ff", secondary: "#22d3ee", text: "#f4f7ff", muted: "#aebdf2", hue: 230,
  },
  {
    key: "matte", name: "Matte", icon: "matte", swatches: ["#171b22", "#39424f", "#aab4c2"],
    background: "#181d24", surface: "#181d24", raised: "#232932", border: "#39424f",
    accent: "#aab4c2", secondary: "#8b98a9", text: "#e8ecf1", muted: "#b6bec9", hue: 215,
  },
  {
    key: "crimson", name: "Crimson", icon: "crimson", swatches: ["#1a0610", "#c0192e", "#ff6b81"],
    background: "#100408", surface: "#200810", raised: "#3a0c18", border: "#a01830",
    accent: "#ff6b81", secondary: "#c0192e", text: "#fff0f3", muted: "#f0a0b0", hue: 350,
  },
  {
    key: "emerald", name: "Emerald", icon: "emerald", swatches: ["#041a12", "#059669", "#34d399"],
    background: "#04120d", surface: "#062719", raised: "#0b3b25", border: "#15845b",
    accent: "#6ee7b7", secondary: "#059669", text: "#edfff7", muted: "#9edabe", hue: 155,
  },
].map((theme) => Object.freeze({ ...theme, swatches: Object.freeze(theme.swatches) })));

export function getWidgetColourTheme(key) {
  return WIDGET_COLOUR_THEMES.find((theme) => theme.key === key) || null;
}

export function getHuntColourTheme(colour) {
  const theme = getWidgetColourTheme(String(colour || "").replace(/^theme_/, ""));
  if (!String(colour || "").startsWith("theme_") || !theme) return null;
  return {
    panelHi: theme.raised, panelMid: theme.surface, panelLo: theme.background,
    inset: theme.background, track: theme.raised, cardHi: theme.raised, cardLo: theme.surface,
    line: theme.border, lineHi: theme.border, lineMid: theme.secondary,
    steel: theme.muted, steelDim: theme.muted, steelHi: theme.text,
    ice: theme.accent, iceDeep: theme.secondary, iceMid: theme.accent,
    glowA: theme.secondary, glowB: theme.border,
  };
}
