import {getProviderImage} from '../../../utils/gameProviders';
import React, { useEffect, useRef, useState } from 'react';
import { Gift } from 'lucide-react';
import { normalizeSolverdeSettings, SOLVERDE_GAMEPLAY } from './solverdeTheme.js';
import { appearanceAttrs, subElementStyle } from '../../../components/OverlayCenter/widgets/shared/appearanceStyles.js';
import { giveawayFontStack } from '../../../components/OverlayCenter/widgets/giveaway/giveawayFonts.js';
import './SolverdeTheme.css';

export function SolverdeSun({ className = '' }) {
  return <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><g fill="currentColor">{Array.from({ length: 16 }, (_, i) => <path key={i} d="M47 24 50 5 57 25Z" transform={`rotate(${i * 22.5} 50 50)`} />)}</g><circle cx="50" cy="50" r="23" fill="none" stroke="currentColor" strokeWidth="1" /></svg>;
}
export function SolverdeEnvironment({ config, canvasAttrs, canvasStyle }) {
  const settings = normalizeSolverdeSettings(config), rect = SOLVERDE_GAMEPLAY;
  const opening=settings.gameplayFrame&&!settings.idleBackground;
  const x=rect.x/19.2,y=rect.y/10.8,right=(rect.x+rect.width)/19.2,bottom=(rect.y+rect.height)/10.8;
  const cutout=opening?`polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${x}% ${y}%,${right}% ${y}%,${right}% ${bottom}%,${x}% ${bottom}%,${x}% ${y}%,0 0)`:undefined;
  return <div {...canvasAttrs} className="oc-bg-widget solverde-environment" style={canvasStyle} data-gameplay-frame={settings.gameplayFrame ? 'on' : 'off'} data-decorations={settings.decorations ? 'on' : 'off'}>
    {settings.scenery && <div className="solverde-atmosphere" style={{clipPath:cutout}} aria-hidden="true"/>}
    {settings.decorations && <div className="solverde-scenery" aria-hidden="true"><SolverdeSun className="solverde-engraving" /></div>}
    {settings.gameplayFrame && <div className="solverde-gameplay-frame" data-idle={settings.idleBackground ? 'on' : 'off'} style={{ left: `${rect.x / 19.2}%`, top: `${rect.y / 10.8}%`, width: `${rect.width / 19.2}%`, height: `${rect.height / 10.8}%` }}>
      {settings.decorations && <><SolverdeSun className="solverde-frame-sun solverde-frame-sun--top" /><SolverdeSun className="solverde-frame-sun solverde-frame-sun--bottom" /></>}
    </div>}
  </div>;
}
const providerTones=new Map();
function SolverdeProvider({provider,enabled,part}) {
 const url=enabled?getProviderImage(provider):'', [failed,setFailed]=useState(''),[tone,setTone]=useState('light');
 const loaded=event=>{if(providerTones.has(url)){setTone(providerTones.get(url));return}let next='light';try{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=16;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(event.currentTarget,0,0,32,16);const pixels=context.getImageData(0,0,32,16).data;let light=0,weight=0;for(let i=0;i<pixels.length;i+=4){const alpha=pixels[i+3]/255;if(alpha<.2)continue;light+=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)*alpha;weight+=alpha}if(weight&&light/weight>150)next='dark'}catch{/* Cross-origin/custom logos retain the safe default chip. */}providerTones.set(url,next);setTone(next)};
 return url&&failed!==url?<span className="solverde-provider-chip" data-tone={providerTones.get(url)||tone}><img onLoad={loaded} src={url} alt={provider} {...part('providerLogo')} onError={()=>setFailed(url)}/></span>:<small {...part('providerText')}>{provider}</small>;
}
export function SolverdeHuntDock({ config, cards, activeIndex, opened, total, start, actual, breakEven, part }) {
  const track=useRef(null),previous=useRef(null),settings=normalizeSolverdeSettings(config);
  useEffect(()=>{
    const element=track.current;if(!element)return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const follow=(instant=false)=>{const current=element.querySelector('[data-active=true]')||element.lastElementChild;if(current)element.scrollTo({left:Math.max(0,current.offsetLeft-element.offsetLeft-(element.clientWidth-current.clientWidth)/2),behavior:instant||media.matches?'instant':'smooth'})};
    follow(previous.current===null);previous.current=activeIndex;
    let observed=false;const observer=new ResizeObserver(()=>{if(observed)follow(true);observed=true});observer.observe(element);
    const interval=config.solverde?.autoCarousel!==false&&cards.length>settings.dockCards?window.setInterval(()=>{
      if(document.hidden||media.matches)return;
      const rows=[...element.querySelectorAll('.solverde-dock-card')],max=Math.max(0,rows.length-settings.dockCards),pitch=(rows[1]?.offsetLeft||0)-(rows[0]?.offsetLeft||0);
      if(!pitch)return;const current=Math.round(element.scrollLeft/pitch),next=current>=max?0:current+1;element.scrollTo({left:rows[next].offsetLeft-element.offsetLeft,behavior:'smooth'});
    },Math.max(2000,Math.min(15000,Number(config.carouselMs)||3200))):null;
    const reduce=()=>{if(media.matches)follow(true)};media.addEventListener('change',reduce);
    return()=>{observer.disconnect();window.clearInterval(interval);media.removeEventListener('change',reduce)};
  },[activeIndex,cards.length,settings.dockCards,config.solverde?.autoCarousel,config.carouselMs]);
  return <section className="solverde-hunt-dock" aria-label="Bonus Hunt" {...part('container')} style={{ '--slv-dock-cards': settings.dockCards, fontFamily:config.fontFamily, fontSize:Number(config.fontSize)||14, ...part('container').style }}>
    <div className="solverde-hunt-progress"><h2 {...part('headerTitle')}>{config.solverde?.dockTitle || 'BONUS HUNT'}</h2><span {...part('progressCount')}>{String(opened).padStart(2, '0')} / {total} ABERTOS</span>
      <div className="solverde-progress-ring" role="progressbar" aria-label="Bónus abertos" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={opened} style={{ '--slv-progress': `${total ? opened / total * 100 : 0}%` }}><SolverdeSun /></div>
    </div>
    <dl className="solverde-hunt-session">{[['START', start], ['ATUAL', actual], ['B.E.', breakEven]].map(([label, value]) => <div key={label} {...part('statCell')}><dt {...part('statLabel')}>{label}</dt><dd {...part('statValue')}>{value}</dd></div>)}</dl>
    <div className="solverde-dock-window"><div className="solverde-dock-track" ref={track} role="list">
      {cards.map((card, index) => <article key={card.id} className="solverde-dock-card" role="listitem" data-active={index === activeIndex} data-opened={card.opened?'true':'false'} {...part('slotRow')}>
        <div className="solverde-dock-art">{card.art}</div><div className="solverde-dock-name"><span className="solverde-dock-status" {...part('slotStatus')}>{card.opened?'ABERTO':index===activeIndex?'ATUAL':'POR ABRIR'}</span><strong {...part('slotTitle')}>{card.name}</strong><SolverdeProvider provider={card.provider} enabled={config.solverde?.providerLogos!==false} part={part}/></div>
        <div className="solverde-dock-values"><span>BET<strong {...part('betValue')}>{card.bet}</strong></span><span>MULTI<strong {...part('multiplierValue')}>{card.multiplier}</strong></span></div>
      </article>)}
      {!cards.length && <div className="solverde-dock-empty">À espera dos dados do hunt</div>}
    </div></div>
  </section>;
}
export function SolverdePredictions({ config, options, percentages, status, part }) {
  const accents = ['var(--slv-accent)', '#71E3BA', 'var(--slv-ivory)'];
  return <section className="solverde-predictions" {...part('widgetBackground')} style={{fontFamily:config.fontFamily,fontSize:Number(config.fontSize)||14,'--slv-options':Math.max(1,options.length),'--slv-range-size':`${Number(config.solverde?.rangeSize)||Number(config.fontSize)||14}px`,'--slv-percentage-size':`${Number(config.solverde?.percentageSize)||Number(config.fontSize)||14}px`,...part('widgetBackground').style}}><header><strong {...part('title')}>{config.solverde?.predictionHeading || config.question || 'QUAL SERÁ O MULTIPLICADOR?'}</strong><span {...part('statusBadge')}>{status === 'open' ? 'ABERTO' : status === 'result' ? 'RESULTADO' : 'FECHADO'}</span></header>
    <div className="solverde-prediction-options">{options.map((option, index) => <div className="solverde-prediction-row" key={index} {...part('individualBetCard')}><span {...part('cardRangeText')}>{option}</span><span className="solverde-prediction-track"><i {...part('progressBar')} style={{ background: accents[index % accents.length], ...part('progressBar').style, width: `${percentages[index]}%` }} /></span><strong {...part('cardPercentageText')}>{percentages[index]}%</strong></div>)}</div>
  </section>;
}
export function SolverdeGiveawayNotice({ config }) {
  const part = elementId => appearanceAttrs({config,widgetType:'giveaway',elementId});
  return <div className="solverde-giveaway-notice" {...part('container')} style={subElementStyle(config,'container',{
    background:config.bgColor,color:config.textColor,borderColor:config.lineColor,
    borderRadius:config.borderRadius,fontFamily:giveawayFontStack(config.bodyFont,'inter'),
  })}><Gift aria-hidden="true" style={{color:config.accentColor}} /><div><strong {...part('title')} style={subElementStyle(config,'title',{
    color:config.titleColor||config.textColor,fontFamily:giveawayFontStack(config.titleFont,'serif'),
    fontSize:config.titleSize||26,fontWeight:config.titleWeight||600,
  })}>{config.title || 'SORTEIO'}</strong><p {...part('subtitle')} style={subElementStyle(config,'subtitle',{fontSize:config.subSize||19,color:config.textColor})}>{config.isActive ? <>Participa com <b style={{color:config.accentColor}}>!{String(config.keyword || 'sorteio').replace(/^!/, '')}</b></> : 'À espera do próximo sorteio'}</p></div></div>;
}
