import {createBetterInstance} from './betterWidgetRegistry.jsx';
import { applyWidgetColourTheme } from './widgetColourThemes.js';
export const SOLVERDE_COMPOSITION = Object.freeze({
  background: { x: 0, y: 0, width: 1920, height: 1080 }, navbar: { x: 0, y: 0, width: 1920, height: 86 },
  slot_window: { x: 22, y: 98, width: 1354, height: 610 }, rtp_stats: { x: 20, y: 710, width: 1358, height: 86 },
  slideshow_frame: { x: 1392, y: 96, width: 508, height: 236 }, chat: { x: 1392, y: 346, width: 508, height: 450 },
  bonus_hunt: { x: 20, y: 810, width: 1358, height: 246 }, bets: { x: 1392, y: 810, width: 508, height: 246 },
});
export function applySolverdeComposition(layout) {
  const instances=layout.instances.some(i=>i.widgetType==='rtp_stats')?layout.instances:[...layout.instances,createBetterInstance('rtp_stats')];
  const counts = new Map();
  for (const item of instances) if (item.visible !== false || item.widgetType==='rtp_stats') counts.set(item.widgetType, (counts.get(item.widgetType) || 0) + 1);
  return { ...layout, instances: instances.map(instance => {
    const type = instance.widgetType;
    if (type === 'current_slot' && !instance.locked && instance.visible !== false) return { ...instance, visible: false };
    const geometry = SOLVERDE_COMPOSITION[type];
    if (!geometry || (instance.visible === false && type !== 'rtp_stats') || (instance.locked && type !== 'background') || counts.get(type) !== 1) return instance;
    const config = type === 'slot_window' ? { ...instance.config } : applyWidgetColourTheme(type, instance.config, 'solverde');
    if (type === 'background') config.solverde = { ...config.solverde, gameplayFrame: true };
    if (type === 'rtp_stats') Object.assign(config,{barHeight:geometry.height,showRtp:true,showMaxWin:true,showVolatility:true,showBestWin:true});
    if (type === 'bonus_hunt') Object.assign(config, { orientation: 'horizontal', horizontalHeight: geometry.height, widgetWidth: geometry.width, widgetHeight: geometry.height, showRequests: false, solverde: { ...config.solverde, huntDock: true } });
    if (type === 'navbar') Object.assign(config, { barHeight: 86, showCrypto: false, showStartBalance: false, showCasino: false, showClock: true, showCTA: true, ctaText: config.ctaText || 'JOGA COM RESPONSABILIDADE', sectionLayout: [{id:'identity',zone:'left'},{id:'clock',zone:'left'},{id:'nowPlaying',zone:'right'},{id:'cta',zone:'right'}] });
    if (type === 'chat') Object.assign(config, { showHeader: true, showHeaderName: true, flow: 'top-to-bottom', solverde: { ...config.solverde, communityHeading: config.solverde?.communityHeading || 'COMUNIDADE' }, giveawayInChat: true, giveawayPosition: 'top', giveawayHeight: 102, giveawayWinnerHeight: 130, giveawayMargin: 10, fontSize: 18, msgSpacing: 12 });
    if (type === 'slideshow_frame' && !config.mediaItems?.length && !config.mediaUrls?.length && !config.mediaText?.trim()) Object.assign(config, { fit: 'contain' });
    if (type === 'bets') {
      Object.assign(config, { question: 'QUAL SERÁ O MULTIPLICADOR?', solverde: { ...config.solverde, predictions: true, predictionHeading:'QUAL SERÁ O MULTIPLICADOR?' } });
      if (config.gameStatus !== 'result' && !Object.values(config.bets || {}).some(value=>Number(value)>0)) config.options = ['0–99x','100–499x','500x+'].map(label=>({label}));
    }
    return { ...instance, ...geometry, config, visible:true };
  }) };
}
