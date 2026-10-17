export const CANDY_ASSETS = Object.freeze({
  background: '/theme-effects/candy/candy-shop.png',
  decorations: '/theme-effects/candy/decorations.png',
});

export function normalizeCandySettings(settings = {}) {
  return {
    background: settings?.background !== false,
    decorations: settings?.decorations !== false,
    motion: settings?.motion === true,
  };
}

export function candyWidgetPalette(type, theme) {
  if (theme?.key !== 'candy') return theme;
  if (type === 'navbar') return { ...theme, surface: '#7CEEFF', background: '#34D8F1', raised: '#C4F8FF', border: '#21DDF3', secondary: '#FF39BE' };
  return ['chat', 'navbar', 'bets', 'connect_four'].includes(type)
    ? { ...theme, surface: '#DDF7FF', background: '#ECFBFF', raised: '#F4FDFF', border: '#21DDF3', secondary: '#FF39BE' }
    : theme;
}

export function candyStyleVariables(palette, config = {}) {
  return {
    '--candy-frame': palette.border,
    '--candy-accent': palette.accent,
    '--candy-surface': palette.surface,
    '--candy-raised': palette.raised,
    '--candy-text': palette.text,
    '--candy-muted': palette.muted,
    '--candy-font': config.fontFamily || "'Rubik', Arial, sans-serif",
  };
}
