import {useEffect,useMemo,useState} from 'react';
import {Shuffle,UserRound,ImageOff} from 'lucide-react';
import SlotImage from '../SlotImage';
import {getAllSlots} from '../../../../utils/slotUtils';
import {appearanceAttrs,subElementStyle,getSubElement} from '../shared/appearanceStyles';
import {imageCardsSettings,requestTitle,requester,requestArtwork} from './imageCardsModel';
import './ImageCards.css';

export default function ImageCards({config={},requests=[],widgetType='slot_requests',compact=false}) {
 const scale=Math.max(1,Number(config.__obsRenderScale)||1),c=imageCardsSettings(config);
 if(widgetType==='bonus_hunt')for(const key of ['rowHeight','artworkWidth','artworkHeight','titleSize','usernameSize','cardGap'])c[key]*=scale;
 const [catalogue,setCatalogue]=useState([]),[failedAvatars,setFailedAvatars]=useState({});
 const missing=useMemo(()=>requests.some(r=>!requestArtwork(r)),[requests]);
 useEffect(()=>{if(!missing)return;let active=true;getAllSlots().then(rows=>{if(active)setCatalogue(rows||[])}).catch(()=>{});return()=>{active=false}},[missing]);
 const catalogueIndex=useMemo(()=>{const ids=new Map(),names=new Map();for(const slot of catalogue){ids.set(String(slot.id),slot);const key=String(slot.name).trim().toLowerCase();names.set(key,[...(names.get(key)||[]),slot])}return {ids,names}},[catalogue]);
 const catalogueArtwork=request=>{const id=request.slot_id||request.slotId||request.slot?.id;if(id&&catalogueIndex.ids.has(String(id)))return catalogueIndex.ids.get(String(id)).image;let matches=catalogueIndex.names.get(requestTitle(request).trim().toLowerCase())||[];const provider=request.provider||request.slot?.provider;if(provider)matches=matches.filter(slot=>String(slot.provider).toLowerCase()===String(provider).toLowerCase());return matches.length===1?matches[0].image:''};
 const part=id=>({...appearanceAttrs({config,widgetType,widgetId:config.__betterInstanceId,elementId:widgetType==='bonus_hunt'?`requestImage${id[0].toUpperCase()+id.slice(1)}`:id}),style:subElementStyle(config,widgetType==='bonus_hunt'?`requestImage${id[0].toUpperCase()+id.slice(1)}`:id,{})});
 const artOverride=getSubElement(config,widgetType==='bonus_hunt'?'requestImageSlotImage':'slotImage');
 const height=compact?58*scale:c.rowHeight,players=new Set(requests.map(requester).map(name=>name.toLowerCase())).size;
 return <section className={`sr-image-cards${compact?' sr-image-cards--compact':''}`} data-narrow={Number(config.__betterInstanceWidth)/scale<=340?'true':'false'} {...part('container')} style={{'--sr-scale':scale,'--sr-row':`${height}px`,'--sr-art-width':`${compact?42*scale:c.artworkWidth}px`,'--sr-art-height':`${compact?42*scale:c.artworkHeight}px`,'--sr-title':`${compact?16*scale:c.titleSize}px`,'--sr-user':`${compact?13*scale:c.usernameSize}px`,'--sr-gap':`${c.cardGap}px`,'--sr-bg':c.backgroundColor,'--sr-card':c.cardColor,'--sr-border':c.borderColor,'--sr-text':c.textColor,'--sr-muted':c.mutedColor,fontFamily:c.fontFamily,borderRadius:c.borderRadius,borderWidth:c.borderWidth,opacity:Math.max(0,Math.min(100,Number(c.opacity)))/100,height:36*scale+(requests.length?Math.min(c.visibleRequests,requests.length)*(height+c.cardGap):36*scale)+16*scale,...part('container').style}}>
  <header className="sr-image-header"><Shuffle aria-hidden="true"/><strong {...part('header')}>{config.requestsTitle||'Requests'}</strong><span className="sr-image-command" {...part('command')} title={config.commandTrigger||'!sr'}>{config.commandTrigger||'!sr'} SLOT</span><span className="sr-image-players" {...part('playerCount')} aria-label={`${players} players`}>PLAYERS <b>{players}</b></span></header>
  <div className="sr-image-list" role="list" aria-label="Slot request queue">
   {requests.map((request,index)=>{const name=requestTitle(request),viewer=requester(request),key=String(request.id||`${request.created_at||''}:${viewer}:${name}`),art=artOverride.imageUrl||requestArtwork(request)||catalogueArtwork(request),avatar=request.avatar_url||request.requester_avatar||request.user?.avatar_url;
    return <article className="sr-image-card" role="listitem" key={key} data-request-id={key} {...part('requestCard')}>
     <div className="sr-image-art" {...part('slotImage')}>{art?<SlotImage src={art} alt={name} fit={artOverride.imageFit||c.artworkFit} style={{objectPosition:artOverride.backgroundPosition||artOverride.imagePosition}}/>:<ImageOff aria-label="Artwork unavailable"/>}</div>
     <strong className="sr-image-title" title={name} {...part('slotTitle')}>{name}</strong>
     <div className="sr-image-viewer">{c.showAvatars!==false&&<span className="sr-image-avatar">{avatar&&!failedAvatars[avatar]?<img src={avatar} alt="" loading="lazy" onError={()=>setFailedAvatars(previous=>({...previous,[avatar]:true}))}/>:<UserRound aria-hidden="true"/>}</span>}<span title={viewer} {...part('viewerName')}>{viewer}</span></div>
     {c.showPositions!==false&&<span className="sr-image-position" {...part('position')}>{String(index+1).padStart(2,'0')}</span>}
    </article>})}
   {!requests.length&&<p className="sr-image-empty" {...part('emptyState')}>No requests yet.</p>}
  </div>
 </section>;
}
