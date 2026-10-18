const FONT_STACKS = Object.freeze({
  rubik: "'Rubik', Arial, sans-serif",
  orbitron: "'Orbitron', sans-serif",
  rajdhani: "'Rajdhani', sans-serif",
  chakra: "'Chakra Petch', sans-serif",
  audiowide: "'Audiowide', cursive",
  bebas: "'Bebas Neue', sans-serif",
  inter: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, 'Courier New', monospace",
  serif: "Georgia, 'Times New Roman', serif",
});

export function giveawayFontStack(key, fallback = 'rajdhani') {
  return FONT_STACKS[key] || FONT_STACKS[fallback] || FONT_STACKS.rajdhani;
}
