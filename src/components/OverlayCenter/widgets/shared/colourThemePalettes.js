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
    key: "sunset", name: "Sunset", icon: "sunset", swatches: ["#301910", "#fb7185", "#ffb477"],
    background: "#1a0d09", surface: "#301910", raised: "#48251b", border: "#b96542",
    accent: "#ffb477", secondary: "#fb7185", text: "#fff4e9", muted: "#edc3a4", hue: 25,
  },
  {
    key: "cyberpunk", name: "Cyberpunk", icon: "cyberpunk", swatches: ["#111616", "#ff65d6", "#d1f65a"],
    background: "#090b0b", surface: "#111616", raised: "#202622", border: "#bd4ca0",
    accent: "#d1f65a", secondary: "#ff65d6", text: "#f8ffe8", muted: "#c4d7b5", hue: 95,
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
  {
    key: "gold", name: "Gold", icon: "gold", swatches: ["#212015", "#bd8f2c", "#f5d36a"],
    background: "#11110b", surface: "#212015", raised: "#302d19", border: "#8c7730",
    accent: "#f5d36a", secondary: "#bd8f2c", text: "#fff8df", muted: "#d6c693", hue: 45,
  },
  {
    key: "violet", name: "Violet", icon: "violet", swatches: ["#211a30", "#9d65d4", "#d0a4ff"],
    background: "#130f1c", surface: "#211a30", raised: "#302442", border: "#76559e",
    accent: "#d0a4ff", secondary: "#9d65d4", text: "#f7f0ff", muted: "#cdb7e4", hue: 275,
  },
  {
    key: "rose", name: "Rose", icon: "rose", swatches: ["#2b1925", "#d66b9d", "#ffacd1"],
    background: "#1a1017", surface: "#2b1925", raised: "#402437", border: "#995978",
    accent: "#ffacd1", secondary: "#d66b9d", text: "#fff1f7", muted: "#dfb5ca", hue: 330,
  },
  {
    key: "arctic", name: "Arctic", icon: "arctic", swatches: ["#071a28", "#4aaed0", "#d8f8ff"],
    background: "#030b14", surface: "#071a28", raised: "#0d2b3d", border: "#4b91ad",
    accent: "#d8f8ff", secondary: "#63cceb", text: "#f3fbff", muted: "#aac9d6", hue: 195,
  },
  {
    key: "lime", name: "Lime", icon: "lime", swatches: ["#202914", "#98bf42", "#d5f68a"],
    background: "#13170c", surface: "#202914", raised: "#303c1d", border: "#728b3a",
    accent: "#d5f68a", secondary: "#98bf42", text: "#f6ffe7", muted: "#c4d5a6", hue: 82,
  },
  {
    key: "luxe", name: "Luxe", icon: "luxe", swatches: ["#050505", "#f0cd70", "#aeb4bd"],
    background: "#050505", surface: "#0e0e0f", raised: "#1a1a1c", border: "#8f7840",
    accent: "#f0cd70", secondary: "#aeb4bd", text: "#f7f3e8", muted: "#c5c0b5", hue: 43,
  },
  {
    key: "gladiator", name: "Gladiator", icon: "gladiator", swatches: ["#c48a24", "#8a531d", "#7e1518"],
    background: "#071018", surface: "#0d141a", raised: "#d8a43a", border: "#8a531d",
    accent: "#7e1518", secondary: "#c48a24", text: "#f4e3ba", muted: "#f0c75e", hue: 356,
  },
  {
    key: "old_rome", name: "Old Rome", icon: "old_rome", swatches: ["#f1e1bb", "#ad8645", "#5a3520"],
    background: "#e7d3a3", surface: "#f1e1bb", raised: "#faedcf", border: "#ad8645",
    accent: "#76500d", secondary: "#5a3520", text: "#2c1b12", muted: "#624b36", hue: 38,
  },
].map((theme) => Object.freeze({ ...theme, swatches: Object.freeze(theme.swatches) })));

// Retired selector choices still render saved overlay builds without recolouring them.
const LEGACY_WIDGET_COLOUR_THEMES = Object.freeze([
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
].map((theme) => Object.freeze({ ...theme, swatches: Object.freeze(theme.swatches) })));

export function getWidgetColourTheme(key) {
  return WIDGET_COLOUR_THEMES.find((theme) => theme.key === key)
    || LEGACY_WIDGET_COLOUR_THEMES.find((theme) => theme.key === key) || null;
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
