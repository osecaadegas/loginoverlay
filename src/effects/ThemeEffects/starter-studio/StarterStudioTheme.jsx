import React from 'react';
import {Crown,MessageSquare,Link,Video,Gift,Target,ChartNoAxesColumnIncreasing,Clock} from 'lucide-react';
import {appearanceAttrs,subElementStyle} from '../../../components/OverlayCenter/widgets/shared/appearanceStyles';
import {giveawayFontStack} from '../../../components/OverlayCenter/widgets/giveaway/giveawayFonts';
import './StarterStudioTheme.css';
const titles={bonus_hunt:['BONUS HUNT',Crown],slot_requests:['SLOT REQUESTS',MessageSquare],slideshow_frame:['PARTNERS',Link],chat:['LIVE CHAT',MessageSquare],tournament:['TOURNAMENT',Crown],giveaway:['GIVEAWAY',Gift],bets:['PREDICTIONS',ChartNoAxesColumnIncreasing],raid_shoutout:['SHOUTOUT',MessageSquare]};
export function StarterStudioModule({type,config:c,layout,runtime,children}){
 if(type==='background'){
  if(c.gameplayFrame?.enabled)return children;
  if(c.studio?.background===false)return null;
  const holes=(layout?.instances||[]).filter(i=>i.visible!==false&&i.config?.colourTheme==='starter_studio'&&i.widgetType==='slot_window');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none"><defs><mask id="m"><rect width="1920" height="1080" fill="white"/>${holes.map(i=>`<rect x="${i.x}" y="${i.y}" width="${i.width}" height="${i.height}" rx="${Number(i.config.studio?.radius??12)}" fill="black"/>`).join('')}</mask></defs><rect width="1920" height="1080" fill="white" mask="url(#m)"/></svg>`;
  return <div className="studio-environment" style={{maskImage:`url("data:image/svg+xml,${encodeURIComponent(svg)}")`,maskSize:'100% 100%',opacity:Math.max(0,Math.min(100,c.opacity??100))/100}}/>;
 }
 const [title,Icon]=titles[type]||[],headed=title&&c.studio?.showHeader!==false;
 const attrs=appearanceAttrs({config:c,widgetType:type,widgetId:c.__betterInstanceId,elementId:type==='bonus_hunt'?'headerTitle':'header'});
 return <section className={`studio-frame studio-frame--${type}`} data-corner={c.studio?.cornerAccent===false?'off':'on'} data-headed={headed?'true':'false'}>
  {headed&&<header className="studio-heading"><Icon aria-hidden="true"/><span {...attrs} style={subElementStyle(c,type==='bonus_hunt'?'headerTitle':'header',{})}>{c.studio?.heading||title}</span></header>}
  <div className="studio-content">{type==='camera'&&c.studio?.externalCamera!==false?(runtime!=='obs'&&<Video className="studio-camera-placeholder" aria-label="OBS webcam opening"/>):children}</div>
  {type==='camera'&&<footer className="studio-camera-footer"><Video/><strong>WEBCAM</strong><span>{c.studio?.handle||c.twitchUsername||c.channel||''}</span></footer>}
 </section>;
}
export function StarterStudioHunt({config:c,start,spent,returned,be,average,opened,total,children}){
 const part=id=>({...appearanceAttrs({config:c,widgetType:'bonus_hunt',widgetId:c.__betterInstanceId,elementId:id}),style:subElementStyle(c,id,{})});
 const cell=(label,value)=> <div key={label} {...part('statCell')}><span {...part('statLabel')}>{label}</span><strong {...part('statValue')}>{value}</strong></div>;
 const percentage=total?Math.round(opened/total*100):0;
 return <div className="studio-hunt" {...part('container')} style={{...part('container').style,'--studio-visible-rows':c.visibleRows||4}}>
  {c.studio?.showFinancials!==false&&<div className="studio-financials" {...part('mainStatsContainer')}>{[['START',start],['SPENT',spent],['RETURN',returned]].map(([label,value])=>cell(label,value))}</div>}
  {c.studio?.showPerformance!==false&&<div className="studio-performance"><Target/>{cell('LIVE B.E.',be)}<ChartNoAxesColumnIncreasing/>{cell('AVG',average)}</div>}
  <div className="studio-progress"><span {...part('progressCount')}>OPENED <b>{opened} / {total}</b></span><strong>{percentage}%</strong><div role="progressbar" aria-label="Bonuses opened" aria-valuenow={opened} aria-valuemax={total||1} aria-valuemin={0} {...part('progressBar')}><i {...part('progressBarFill')} style={{...part('progressBarFill').style,width:percentage+'%'}}/></div></div>
  <div className="studio-bonus-list">{children}</div>
 </div>;
}
export function StarterGiveawayNotice({config:c}){
 const part=id=>({...appearanceAttrs({config:c,widgetType:'giveaway',elementId:id}),style:subElementStyle(c,id,{})});
 const count=c.entries??c.participantCount??c.participants?.length??0;
 return <div className="studio-giveaway-notice" {...part('container')} style={subElementStyle(c,'container',{background:c.bgColor,color:c.textColor,borderColor:c.lineColor,fontFamily:giveawayFontStack(c.bodyFont,'inter')})}><Gift/><strong {...part('title')}>{c.title||'GIVEAWAY'}</strong><b {...part('keyword')}>{c.isActive===false?'CLOSED':'!'+String(c.keyword||'join').replace(/^!/,'')}</b><span {...part('participantCount')}>{count} ENTRIES</span></div>;
}
export function StarterStudioNavbar({config:c,time}){
 const part=id=>({...appearanceAttrs({config:c,widgetType:'navbar',widgetId:c.__betterInstanceId,elementId:id}),style:subElementStyle(c,id,{})});
 return <nav className="studio-navbar" {...part('container')}>
  {c.showIdentity!==false&&<><span className="studio-sc">SC</span><strong className="studio-wordmark">STREAMERS<span>CENTER</span></strong><b className="studio-handle" {...part('displayName')}>{c.twitchUsername?'@'+c.twitchUsername:c.streamerName||c.displayName||'Your channel'}</b></>}
  {c.studio?.showLive!==false&&<span className="studio-live">● {c.live===false?'OFFLINE':'LIVE'}</span>}
  {c.showClock!==false&&<span className="studio-clock" {...part('clock')}><Clock/>{time||'—'}</span>}
  {c.showCTA!==false&&<span className="studio-responsible" {...part('cta')}>{c.ctaText||'18+ PLAY RESPONSIBLY'}</span>}
 </nav>;
}
