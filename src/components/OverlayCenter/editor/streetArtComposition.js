import { STREET_ART_GAMEPLAY, STREET_ART_TOKENS } from '../../../effects/ThemeEffects/street-art/streetArtTheme.js';
import { createBetterInstance } from './betterWidgetRegistry.jsx';
import { applyWidgetColourTheme } from './widgetColourThemes.js';
export const STREET_ART_COMPOSITION = Object.freeze({
  background: { x:0,y:0,width:1920,height:1080 }, navbar: { x:128,y:12,width:1680,height:68 },
  bonus_hunt: { x:40,y:106,width:394,height:328 }, slot_requests: { x:40,y:458,width:394,height:222 },
  current_slot: { x:40,y:708,width:394,height:282 }, rtp_stats: { x:496,y:924,width:942,height:76 },
  slideshow_frame: { x:1508,y:106,width:370,height:208 }, chat: { x:1508,y:344,width:370,height:510 },
});
// Geometry changes only through this explicit, undoable preset. Existing data and IDs survive.
export function applyStreetArtComposition(layout) {
  const instances = [...layout.instances];
  for (const type of Object.keys(STREET_ART_COMPOSITION)) if (!instances.some(i => i.widgetType === type)) instances.push(createBetterInstance(type));
  const counts = new Map();
  for (const i of instances) counts.set(i.widgetType,(counts.get(i.widgetType)||0)+1);
  return { ...layout, instances: instances.map(instance => {
    const type = instance.widgetType, geometry = STREET_ART_COMPOSITION[type] || (type==='slot_window'?STREET_ART_GAMEPLAY:null);
    if (!geometry || (instance.locked && type !== 'background') || counts.get(type) !== 1) return instance;
    const config = type==='slot_window' ? {...instance.config} : applyWidgetColourTheme(type,instance.config,'street_art');
    config.streetArt = { ...config.streetArt };
    if (type === 'background') Object.assign(config.streetArt,{gameplayFrame:true});
    if (type === 'navbar') Object.assign(config,{barHeight:68,showCrypto:false,showClock:true,showStartBalance:true,showCTA:true});
    if (type === 'bonus_hunt') Object.assign(config,{orientation:'mainstream',statsLayout:'grid',showRequests:false,listMode:'compact',visibleRows:3,fontSize:16,drawerMode:'contain',widgetWidth:geometry.width,widgetHeight:geometry.height,streetArt:{...config.streetArt,compactHunt:true}});
    if (type === 'slot_requests') Object.assign(config,{displayStyle:'image_cards',rowHeight:70,artworkWidth:86,artworkHeight:60,titleSize:18,usernameSize:15,cardGap:5,visibleRequests:2});
    if (type === 'current_slot') Object.assign(config,{displayStyle:'street_art_card',showBackdrop:false,accentColor:STREET_ART_TOKENS.highlight});
    if (type === 'chat') Object.assign(config,{streetArt:{...config.streetArt,compactChat:true},chatStyle:'broadcast_chat',width:geometry.width,height:geometry.height,showHeader:false,showLegend:false,showAvatars:false,flow:'top-to-bottom',fontSize:16,msgSpacing:2,giveawayInChat:true,giveawayPosition:'top',giveawayHeight:54,giveawayWinnerHeight:116,giveawayMargin:2});
    if (type === 'rtp_stats') Object.assign(config,{barHeight:76,barPadY:4,showRtp:true,showMaxWin:true,showVolatility:true,showBestWin:true,streetArt:{...config.streetArt,statStrip:true}});
    return { ...instance,...geometry,config,visible:true };
  }) };
}
