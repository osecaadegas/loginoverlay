import { applyWidgetColourTheme } from './widgetColourThemes.js';

export const VOLCANIC_COMPOSITION = Object.freeze({
  background: { x: 0, y: 0, width: 1920, height: 1080 },
  navbar: { x: 12, y: 10, width: 1896, height: 78 },
  bonus_hunt: { x: 16, y: 100, width: 468, height: 834 },
  slideshow_frame: { x: 1468, y: 100, width: 438, height: 246 },
  chat: { x: 1468, y: 358, width: 438, height: 430 },
  rtp_stats: { x: 496, y: 800, width: 1410, height: 58 },
  current_slot: { x: 496, y: 864, width: 980, height: 214 },
  bets: { x: 1488, y: 864, width: 418, height: 214 },
});

// Explicit and undoable. Theme selection itself never changes user geometry.
export function applyVolcanicComposition(layout) {
  const counts = new Map();
  for (const item of layout.instances) if (item.visible !== false) counts.set(item.widgetType, (counts.get(item.widgetType) || 0) + 1);
  return { ...layout, instances: layout.instances.map(instance => {
    const type = instance.widgetType, geometry = VOLCANIC_COMPOSITION[type];
    if (!geometry || instance.visible === false || (instance.locked && type !== 'background') || counts.get(type) !== 1) return instance;
    const config = applyWidgetColourTheme(type, instance.config, 'volcanic');
    if (type === 'background') config.volcanic = { ...config.volcanic, referenceFrame: true };
    if (type === 'bonus_hunt') Object.assign(config, { orientation: 'mainstream', statsLayout: 'grid', showRequests: false, carouselMode: 'imagestats', listMode: 'image', visibleRows: 3, fontSize: 16, volcanic: { ...config.volcanic, compactHunt: true }, widgetWidth: geometry.width, panelWidth: geometry.width, widgetHeight: geometry.height, panelHeight: geometry.height, drawerMode: 'contain' });
    if (type === 'navbar') config.barHeight = 70;
    if (type === 'bets') config.displayStyle = 'compact_scoreboard';
    if (type === 'bonus_hunt' && !config.mainstreamTitle) config.mainstreamTitle = 'Bonus Hunt';
    if (type === 'chat') Object.assign(config, { showHeader: true, showHeaderName: false, showLiveLabel: false });
    if (type === 'rtp_stats') Object.assign(config, { barHeight: 56, barPadY: 3 });
    if (type === 'chat') Object.assign(config, { width: geometry.width, height: geometry.height, giveawayInChat: true, giveawayPosition: 'top', giveawayHeight: 150, giveawayWinnerHeight: 130, giveawayMargin: 2 });
    if (type === 'slideshow_frame') config.fit = 'contain';
    return { ...instance, ...geometry, config };
  }) };
}
