import {createBetterInstance} from './betterWidgetRegistry.jsx';
import {applyWidgetColourTheme} from './widgetColourThemes.js';
// Roles permit several independently editable views of the same live source.
export const GALACTIC_COMMAND_COMPOSITION=Object.freeze([
 {type:'background',role:'scene',x:0,y:0,width:1920,height:1080},
 {type:'navbar',role:'masthead',x:0,y:0,width:1920,height:76},
 {type:'bonus_hunt',role:'stats',x:12,y:80,width:344,height:236},
 {type:'current_slot',role:'scanner',x:12,y:320,width:344,height:252},
 {type:'current_slot',role:'max',x:12,y:576,width:344,height:136},
 {type:'bonus_hunt',role:'result',x:12,y:716,width:344,height:172},
 {type:'bonus_hunt',role:'summary',x:12,y:892,width:344,height:176},
 {type:'slot_window',role:'viewport',x:360,y:80,width:1166,height:700},
 {type:'current_slot',role:'rail',x:364,y:776,width:1158,height:66},
 {type:'current_slot',role:'info',x:364,y:842,width:1158,height:226},
 {type:'slideshow_frame',role:'slideshow',x:1530,y:80,width:378,height:282},
 {type:'giveaway',role:'winner',x:1530,y:366,width:378,height:212},
 {type:'chat',role:'chat',x:1530,y:582,width:378,height:486},
]);
export function applyGalacticCommandComposition(layout){
 const instances=[...layout.instances],used=new Set();
 for(const spec of GALACTIC_COMMAND_COMPOSITION){
  const {type,role,...geometry}=spec;
  let index=instances.findIndex((i,n)=>!used.has(n)&&i.widgetType===type&&i.config?.galactic?.role===role);
  if(index<0)index=instances.findIndex((i,n)=>!used.has(n)&&i.widgetType===type&&(!i.locked||type==='background'));
  if(index<0){const source=instances.find(i=>i.widgetType===type);instances.push(createBetterInstance(type,{config:source?structuredClone(source.config):undefined}));index=instances.length-1;}
  used.add(index);const i=instances[index];if(i.locked&&type!=='background')continue;
  const config=applyWidgetColourTheme(type,i.config,'galactic_command');config.galactic={...config.galactic,role};
  if(type==='navbar')Object.assign(config,{displayStyle:'better_navbar',showStartBalance:true,showCrypto:false,showClock:true,showCTA:true});
  if(type==='bonus_hunt')Object.assign(config,{displayStyle:'better_bonus_hunt',orientation:'mainstream',showRequests:false,winEffects:false,animations:false,visibleRows:5,widgetWidth:geometry.width,widgetHeight:geometry.height,__appearanceStyleId:'galactic_hunt_'+role});
  if(type==='current_slot')Object.assign(config,{displayStyle:'galactic_'+role,showBackdrop:false});
  if(type==='slot_window'){config.galactic.transparent=config.galactic.transparent??true;config.galactic.borderWidth=config.galactic.borderWidth??24;}
  if(type==='giveaway')Object.assign(config,{displayStyle:'better_giveaway',galactic:{...config.galactic,latestWin:true}});
  if(type==='chat')Object.assign(config,{galactic:{...config.galactic,compactChat:true},chatStyle:'broadcast_chat',showHeader:false,showLegend:false,showAvatars:false,flow:'top-to-bottom',fontSize:18,msgSpacing:2,giveawayInChat:true,giveawayHeight:66,giveawayWinnerHeight:120,giveawayMargin:2});
  instances[index]={...i,...geometry,config,visible:true,label:role==='winner'?'Latest Win':role==='max'?'Max Win':role==='rail'?'Game information rail':i.label};
 }
 return {...layout,instances:instances.map((i,n)=>!used.has(n)&&!i.locked?{...i,visible:false}:i)};
}
