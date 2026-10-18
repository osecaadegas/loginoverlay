import {getProviderImage} from '../../../utils/gameProviders';
import useForwardCarousel from '../../../components/OverlayCenter/widgets/shared/useForwardCarousel';
import React, { useRef, useState } from 'react';
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
  const mask=opening?'url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none"><defs><mask id="hole"><rect width="1920" height="1080" fill="white"/><rect x="'+rect.x+'" y="'+rect.y+'" width="'+rect.width+'" height="'+rect.height+'" rx="23" fill="black"/></mask></defs><rect width="1920" height="1080" fill="white" mask="url(#hole)"/></svg>')+'")':undefined;
  return <div {...canvasAttrs} className="oc-bg-widget solverde-environment" style={canvasStyle} data-gameplay-frame={settings.gameplayFrame ? 'on' : 'off'} data-decorations={settings.decorations ? 'on' : 'off'}>
    {settings.scenery && <div className="solverde-atmosphere" style={{maskImage:mask,maskSize:"100% 100%"}} aria-hidden="true"/>}
    {settings.decorations && <div className="solverde-scenery" style={{maskImage:mask,maskSize:"100% 100%"}} aria-hidden="true"><SolverdeSun className="solverde-engraving" /></div>}
    {settings.gameplayFrame && <div className="solverde-gameplay-frame" data-idle={settings.idleBackground ? 'on' : 'off'} style={{ left: `${rect.x / 19.2}%`, top: `${rect.y / 10.8}%`, width: `${rect.width / 19.2}%`, height: `${rect.height / 10.8}%` }}>
      {settings.decorations && <><SolverdeSun className="solverde-frame-sun solverde-frame-sun--top" /><SolverdeSun className="solverde-frame-sun solverde-frame-sun--bottom" /></>}
    </div>}
  </div>;
}
function SolverdeProvider({provider,enabled,part}) {
 const url=enabled?getProviderImage(provider):'',[failed,setFailed]=useState('');
 return url&&failed!==url?<img className="solverde-provider-logo" src={url} alt={provider} {...part('providerLogo')} onError={()=>setFailed(url)}/>:<small {...part('providerText')}>{provider}</small>;
}
export function SolverdeHuntDock({ config, cards, activeIndex, opened, total, start, actual, breakEven, superOpened=0,superCount=0,extremeOpened=0,extremeCount=0,part }) {
  const track=useRef(null),settings=normalizeSolverdeSettings(config),enabled=config.solverde?.autoCarousel!==false;
  const clones=enabled&&cards.length>settings.dockCards?cards.slice(0,settings.dockCards):[];
  useForwardCarousel(track,{count:cards.length,visible:settings.dockCards,axis:'x',enabled,interval:config.carouselMs,activeIndex});
  return <section className="solverde-hunt-dock" aria-label="Bonus Hunt" {...part('container')} style={{ '--slv-dock-cards': settings.dockCards, fontFamily:config.fontFamily, fontSize:Number(config.fontSize)||14, ...part('container').style }}>
    <div className="solverde-hunt-progress"><h2 {...part('headerTitle')}>{config.solverde?.dockTitle || 'BONUS HUNT'}</h2><span {...part('progressCount')}>{String(opened).padStart(2, '0')} / {total} ABERTOS</span>
      <div className="solverde-progress-ring" role="progressbar" aria-label="Bónus abertos" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={opened} style={{ '--slv-progress': `${total ? opened / total * 100 : 0}%` }}><SolverdeSun /></div>
      <div className="solverde-hunt-tiers"><span {...part('superCount')}>♛ SUPER <b>{superOpened}/{superCount}</b></span><span {...part('extremeCount')}>ϟ EXTREME <b>{extremeOpened}/{extremeCount}</b></span></div>
    </div>
    <dl className="solverde-hunt-session">{[['START', start], ['ATUAL', actual], ['B.E.', breakEven]].map(([label, value]) => <div key={label} {...part('statCell')}><dt {...part('statLabel')}>{label}</dt><dd {...part('statValue')}>{value}</dd></div>)}</dl>
    <div className="solverde-dock-window"><div className="solverde-dock-track" ref={track} role="list">
      {[...cards,...clones].map((card, index) => <article key={index>=cards.length?'clone-'+card.id:card.id} data-carousel-item data-carousel-clone={index>=cards.length?'true':undefined} aria-hidden={index>=cards.length?true:undefined} className="solverde-dock-card" role="listitem" data-active={index%Math.max(1,cards.length) === activeIndex} data-tier={card.tier} data-opened={card.opened?'true':'false'} {...part('slotRow')}>
        <div className="solverde-dock-art">{card.art}</div><div className="solverde-dock-name"><span className="solverde-dock-status" {...part('slotStatus')}>{card.tier==='super'?'♛ SUPER · ':card.tier==='extreme'?'ϟ EXTREME · ':''}{card.opened?'ABERTO':index%Math.max(1,cards.length)===activeIndex?'ATUAL':'POR ABRIR'}</span><strong {...part('slotTitle')}>{card.name}</strong><SolverdeProvider provider={card.provider} enabled={config.solverde?.providerLogos!==false} part={part}/></div>
        <div className="solverde-dock-values"><span>BET<strong {...part('betValue')}>{card.bet}</strong></span><span>PAYOUT<strong {...part('payoutValue')}>{card.payout}</strong></span><span>MULTI<strong {...part('multiplierValue')}>{card.multiplier}</strong></span></div>
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
  return <div className="solverde-giveaway-notice premium-giveaway-notice" {...part('container')} style={subElementStyle(config,'container',{
    background:config.bgColor,color:config.textColor,borderColor:config.lineColor,
    borderRadius:config.borderRadius,fontFamily:giveawayFontStack(config.bodyFont,'inter'),
  })}><Gift aria-hidden="true" style={{color:config.accentColor}} /><div><strong {...part('title')} style={subElementStyle(config,'title',{
    color:config.titleColor||config.textColor,fontFamily:giveawayFontStack(config.titleFont,'serif'),
    fontSize:`min(${Number(config.titleSize)||22}px,6cqw)`,fontWeight:config.titleWeight||600,
  })}>{config.title || 'SORTEIO'}</strong><p {...part('subtitle')} style={subElementStyle(config,'subtitle',{fontSize:`min(${Number(config.subSize)||16}px,4.5cqw)`,color:config.textColor})}>{config.isActive ? <>Participa com <b style={{color:config.accentColor}}>!{String(config.keyword || 'sorteio').replace(/^!/, '')}</b></> : 'À espera do próximo sorteio'}</p>{config.prize&&<small>{config.prize}</small>}</div></div>;
}
