export const IMAGE_CARDS_DEFAULTS = Object.freeze({displayStyle:'image_cards',rowHeight:140,artworkWidth:110,artworkHeight:120,artworkFit:'cover',titleSize:23,usernameSize:19,cardGap:8,visibleRequests:3,showAvatars:true,showPositions:true,fontFamily:"'Inter', Arial, sans-serif",backgroundColor:'#101d1a',cardColor:'#13221f',borderColor:'#68d8b0',textColor:'#f6f7f4',mutedColor:'#c3c7cc',borderRadius:14,borderWidth:1,opacity:100});
export function imageCardsSettings(config={}) {
 const c={...IMAGE_CARDS_DEFAULTS,...config,...config.requestImageCards};
 const scale=c.displayStyle==='better_bonus_hunt'?1:Math.max(1,Number(config.__obsRenderScale)||1);
 const number=(key,min,max)=>{const factor=key==='visibleRequests'?1:scale;return Math.max(min*factor,Math.min(max*factor,Number(c[key])||IMAGE_CARDS_DEFAULTS[key]*factor))};
 return {...c,rowHeight:number('rowHeight',90,260),artworkWidth:number('artworkWidth',50,180),artworkHeight:number('artworkHeight',60,240),titleSize:number('titleSize',14,36),usernameSize:number('usernameSize',12,30),cardGap:Math.max(0,Math.min(30*scale,Number(c.cardGap)||0)),visibleRequests:Math.round(number('visibleRequests',1,10)),artworkFit:c.artworkFit==='contain'?'contain':'cover'};
}
const text=label=>({label,kind:'text',capabilities:['typography']});
export const IMAGE_CARDS_STYLE=Object.freeze({id:'image_cards',label:'Image Cards',strictElementIds:true,elements:{container:{label:'Request frame',kind:'surface',capabilities:['surface','border','spacing']},header:text('Header'),command:text('Request command'),playerCount:text('Player count'),requestCard:{label:'Request card',kind:'surface',capabilities:['surface','border','spacing']},slotImage:{label:'Artwork',kind:'image',capabilities:['image','border']},slotTitle:text('Slot title'),viewerName:text('Username'),position:text('Queue position'),emptyState:text('Empty queue')},capabilities:{colours:true,fonts:true,fontSizes:true,borders:true,opacity:true}});
export const requestTitle=r=>r.slot_name||r.slotName||r.slot?.name||r.game||r.title||'Slot';
export const requester=r=>r.requested_by||r.requestedBy||r.username||r.user?.display_name||r.user?.name||'Viewer';
export const requestArtwork=r=>r.slot_image||r.image||r.slotImage||r.slot?.image||'';

export const EMBEDDED_IMAGE_CARD_ELEMENTS=Object.fromEntries(Object.entries(IMAGE_CARDS_STYLE.elements).map(([id,element])=>[`requestImage${id[0].toUpperCase()+id.slice(1)}`,{...element,label:`Requests: ${element.label}`} ]));
