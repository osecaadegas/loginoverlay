import {createBetterInstance} from './betterWidgetRegistry.jsx';
import {applyWidgetColourTheme} from './widgetColourThemes.js';
export const STARTER_STUDIO_COMPOSITION=Object.freeze({background:{x:0,y:0,width:1920,height:1080},navbar:{x:0,y:0,width:1920,height:70},bonus_hunt:{x:24,y:88,width:410,height:602},slot_requests:{x:24,y:704,width:410,height:320},slot_window:{x:448,y:88,width:1024,height:594},current_slot:{x:918,y:700,width:554,height:324},slideshow_frame:{x:1488,y:88,width:410,height:274},chat:{x:1488,y:378,width:410,height:646}});
export function applyStarterStudioComposition(layout){
 const instances=[...layout.instances];for(const type of Object.keys(STARTER_STUDIO_COMPOSITION))if(!instances.some(i=>i.widgetType===type))instances.push(createBetterInstance(type));
 const counts=new Map();for(const i of instances)counts.set(i.widgetType,(counts.get(i.widgetType)||0)+1);
 return {...layout,instances:instances.map(i=>{if(['rtp_stats','bets','giveaway'].includes(i.widgetType)&&!i.locked)return {...i,visible:false};const geometry=STARTER_STUDIO_COMPOSITION[i.widgetType];if(!geometry||counts.get(i.widgetType)!==1||(i.locked&&i.widgetType!=='background'))return i;
 const config=applyWidgetColourTheme(i.widgetType,i.config,'starter_studio');config.studio={...config.studio};
 if(i.widgetType==='navbar')Object.assign(config,{displayStyle:'better_navbar',showStartBalance:false,showCrypto:false,showNowPlaying:false,showClock:true,showCTA:true,ctaText:'18+ PLAY RESPONSIBLY',studio:{...config.studio,masthead:true}});
 if(i.widgetType==='bonus_hunt')Object.assign(config,{orientation:'mainstream',listMode:'compact',visibleRows:4,showRequests:false,winEffects:false,fontSize:18,widgetWidth:geometry.width,widgetHeight:geometry.height,studio:{...config.studio,hunt:true}});
 if(i.widgetType==='slot_requests')Object.assign(config,{displayStyle:'image_cards',rowHeight:82,artworkWidth:106,artworkHeight:70,titleSize:20,usernameSize:17,cardGap:7,visibleRequests:3,showAvatars:false,showPositions:false});
 if(i.widgetType==='current_slot')Object.assign(config,{displayStyle:'starter_studio_card',showBackdrop:false});
 if(i.widgetType==='chat')Object.assign(config,{studio:{...config.studio,compactChat:true},chatStyle:'broadcast_chat',showHeader:false,showLegend:false,showAvatars:false,flow:'top-to-bottom',fontSize:20,msgSpacing:2,giveawayInChat:true,giveawayHeight:60,giveawayWinnerHeight:116,giveawayMargin:2});
 if(i.widgetType==='slideshow_frame')Object.assign(config,{showCounter:false});
 return {...i,...geometry,config,visible:true};})};
}
