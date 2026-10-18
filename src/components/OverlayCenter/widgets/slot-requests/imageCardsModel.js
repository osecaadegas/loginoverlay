import {getWidgetColourTheme} from '../shared/colourThemePalettes';
import {candyWidgetPalette} from '../../../../effects/ThemeEffects/candy/candyTheme';
export const IMAGE_CARDS_DEFAULTS = Object.freeze({displayStyle:'image_cards',rowHeight:90,artworkWidth:68,artworkHeight:70,artworkFit:'cover',titleSize:19,usernameSize:16,cardGap:8,visibleRequests:2,showAvatars:true,showPositions:true,fontFamily:"'Inter', Arial, sans-serif",backgroundColor:'#101d1a',cardColor:'#13221f',borderColor:'#68d8b0',textColor:'#f6f7f4',mutedColor:'#c3c7cc',borderRadius:14,borderWidth:1,opacity:100});
export function imageCardsSettings(config={}) {
 const legacy={rowHeight:140,artworkWidth:110,artworkHeight:120,titleSize:23,usernameSize:19,visibleRequests:3};
 const oldScale=config.requestView==='image_cards'?1:Math.max(1,Number(config.__obsRenderScale)||1);
 const migrate=values=>Object.entries(legacy).every(([key,value])=>values?.[key]===value*(key==='visibleRequests'?1:oldScale))?{...values,...Object.fromEntries(Object.keys(legacy).map(key=>[key,IMAGE_CARDS_DEFAULTS[key]*(key==='visibleRequests'?1:oldScale)]))}:values;
 config=migrate(config);
 const nested={...migrate(config.requestImageCards)};
 const palette=candyWidgetPalette('slot_requests',getWidgetColourTheme(config.colourTheme||String(config.colour||'').replace(/^theme_/,'')));
 const colours=palette?{backgroundColor:palette.background,cardColor:palette.surface,borderColor:palette.border,textColor:palette.text,mutedColor:palette.muted}:{};
 // Old embedded defaults are inherited values, not a deliberate colour override.
 if(palette)for(const key of Object.keys(colours))if(nested[key]===IMAGE_CARDS_DEFAULTS[key])delete nested[key];
 const embedded=config.requestView==='image_cards';
 const c={...IMAGE_CARDS_DEFAULTS,...config,...(embedded?{rowHeight:90,artworkWidth:68,artworkHeight:70,titleSize:19,usernameSize:16,visibleRequests:2,...(config.colourTheme==='solverde'&&config.solverde?.huntDock?{rowHeight:70,artworkWidth:56,artworkHeight:60,titleSize:16,usernameSize:13,cardGap:5}:{}),...colours}:{}),...nested};
 const scale=c.displayStyle==='better_bonus_hunt'?1:Math.max(1,Number(config.__obsRenderScale)||1);
 const number=(key,min,max)=>{const factor=key==='visibleRequests'?1:scale;return Math.max(min*factor,Math.min(max*factor,Number(c[key])||IMAGE_CARDS_DEFAULTS[key]*factor))};
 return {...c,rowHeight:number('rowHeight',70,260),artworkWidth:number('artworkWidth',50,180),artworkHeight:number('artworkHeight',60,240),titleSize:number('titleSize',14,36),usernameSize:number('usernameSize',12,30),cardGap:Math.max(0,Math.min(30*scale,Number(c.cardGap)||0)),visibleRequests:Math.round(number('visibleRequests',1,10)),artworkFit:c.artworkFit==='contain'?'contain':'cover'};
}
const text=label=>({label,kind:'text',capabilities:['typography']});
export const IMAGE_CARDS_STYLE=Object.freeze({id:'image_cards',label:'Image Cards',strictElementIds:true,elements:{container:{label:'Request frame',kind:'surface',capabilities:['surface','border','spacing']},header:text('Header'),command:text('Request command'),playerCount:text('Player count'),requestCard:{label:'Request card',kind:'surface',capabilities:['surface','border','spacing']},slotImage:{label:'Artwork',kind:'image',capabilities:['image','border']},slotTitle:text('Slot title'),viewerName:text('Username'),position:text('Queue position'),emptyState:text('Empty queue')},capabilities:{colours:true,fonts:true,fontSizes:true,borders:true,opacity:true}});
export const requestTitle=r=>r.slot_name||r.slotName||r.slot?.name||r.game||r.title||'Slot';
export const requester=r=>r.requested_by||r.requestedBy||r.username||r.user?.display_name||r.user?.name||'Viewer';
export const requestArtwork=r=>r.slot_image||r.image||r.slotImage||r.slot?.image||'';

export const EMBEDDED_IMAGE_CARD_ELEMENTS=Object.fromEntries(Object.entries(IMAGE_CARDS_STYLE.elements).map(([id,element])=>[`requestImage${id[0].toUpperCase()+id.slice(1)}`,{...element,label:`Requests: ${element.label}`} ]));
