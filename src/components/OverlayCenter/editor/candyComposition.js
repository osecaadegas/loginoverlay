import { applyWidgetColourTheme } from './widgetColourThemes.js';

export const CANDY_COMPOSITION = Object.freeze({
  background: { x: 0, y: 0, width: 1920, height: 1080 },
  navbar: { x: 12, y: 10, width: 1896, height: 76 },
  bonus_hunt: { x: 15, y: 97, width: 380, height: 913 },
  slideshow_frame: { x: 1530, y: 97, width: 378, height: 248 },
  chat: { x: 1530, y: 351, width: 378, height: 659 },
  rtp_stats: { x: 403, y: 753, width: 1114, height: 76 },
  current_slot: { x: 403, y: 850, width: 1114, height: 190 },
});

// An explicit, undoable preset. Existing instances, data, media and element
// settings survive; duplicated, hidden or locked foreground widgets never move.
export function applyCandyComposition(layout) {
  const counts = new Map();
  for (const instance of layout.instances) {
    if (instance.visible !== false) counts.set(instance.widgetType, (counts.get(instance.widgetType) || 0) + 1);
  }
  return { ...layout, instances: layout.instances.map(instance => {
    const type = instance.widgetType, geometry = CANDY_COMPOSITION[type];
    if (!geometry || instance.visible === false || (instance.locked && type !== 'background') || counts.get(type) !== 1) return instance;
    const config = applyWidgetColourTheme(type, instance.config, 'candy');
    if (type === 'bonus_hunt') Object.assign(config, { orientation: 'vertical', statsLayout: 'grid', showRequests: true, widgetWidth: geometry.width, panelWidth: geometry.width, widgetHeight: geometry.height, panelHeight: geometry.height, drawerMode: 'contain' });
    if (type === 'navbar') config.barHeight = 62;
    if (type === 'rtp_stats') config.barHeight = 58;
    if (type === 'slideshow_frame') config.fit = 'contain';
    if (type === 'chat') Object.assign(config, { width: geometry.width - 24, height: geometry.height - 24 });
    return { ...instance, ...geometry, config };
  }) };
}
