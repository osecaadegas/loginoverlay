import { getWidgetEffectsThemeKey } from '../../../effects/ThemeEffects/themeEffectsConfig.js';

// Reference composition in the editor's existing 1920 x 1080 coordinate space.
// Applied explicitly as a normal, undoable layout edit; never during rendering.
export const ORBITAL_COMPOSITION = Object.freeze({
  navbar: { x: 12, y: 8, width: 1896, height: 90 },
  bonus_hunt: { x: 0, y: 100, width: 396, height: 978 },
  slideshow_frame: { x: 1544, y: 112, width: 364, height: 284 },
  giveaway: { x: 1544, y: 410, width: 364, height: 282 },
  chat: { x: 1544, y: 706, width: 364, height: 362 },
  rtp_stats: { x: 406, y: 688, width: 1118, height: 80 },
  current_slot: { x: 406, y: 778, width: 1118, height: 290 },
  bets: { x: 636, y: 274, width: 650, height: 380 },
});

export function isOrbitalCompositionWidget(instance) {
  return Boolean(ORBITAL_COMPOSITION[instance.widgetType]) && instance.visible !== false
    && !instance.locked && getWidgetEffectsThemeKey(instance.widgetType, instance.config) === 'orbital';
}

export function applyOrbitalComposition(layout) {
  const counts = new Map();
  layout.instances.filter(isOrbitalCompositionWidget).forEach(instance => counts.set(instance.widgetType, (counts.get(instance.widgetType) || 0) + 1));
  return {
    ...layout,
    instances: layout.instances.map(instance => {
      // Do not stack duplicate widgets or move locked, hidden or other-theme items.
      if (!isOrbitalCompositionWidget(instance) || counts.get(instance.widgetType) !== 1) return instance;
      const geometry = ORBITAL_COMPOSITION[instance.widgetType];
      const config = { ...instance.config };
      if (instance.widgetType === 'bonus_hunt') Object.assign(config, {
        widgetWidth: geometry.width, panelWidth: geometry.width,
        widgetHeight: geometry.height, panelHeight: geometry.height,
        uiScale: Math.max(Number(config.uiScale) || 1, 1.15),
        avatarSize: Math.max(Number(config.avatarSize) || 28, 36),
      });
      if (['giveaway', 'chat'].includes(instance.widgetType)) Object.assign(config, { width: geometry.width, height: geometry.height });
      if (instance.widgetType === 'navbar') Object.assign(config, { barHeight: 78, fontSize: Math.max(Number(config.fontSize) || 14, 17) });
      if (instance.widgetType === 'rtp_stats') config.barHeight = 80;
      if (instance.widgetType === 'bets') config.fontScale = Math.max(Number(config.fontScale) || 100, 115);
      return { ...instance, ...geometry, config };
    }),
  };
}
