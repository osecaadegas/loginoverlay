import React, { useEffect, useRef } from 'react';
import { Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { normalizeSolverdeSettings, SOLVERDE_GAMEPLAY } from './solverdeTheme.js';
import { appearanceAttrs, subElementStyle } from '../../../components/OverlayCenter/widgets/shared/appearanceStyles.js';
import { giveawayFontStack } from '../../../components/OverlayCenter/widgets/giveaway/giveawayFonts.js';
import './SolverdeTheme.css';

export function SolverdeSun({ className = '' }) {
  return <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><g fill="currentColor">{Array.from({ length: 16 }, (_, i) => <path key={i} d="M47 24 50 5 57 25Z" transform={`rotate(${i * 22.5} 50 50)`} />)}</g><circle cx="50" cy="50" r="23" fill="none" stroke="currentColor" strokeWidth="1" /></svg>;
}
export function SolverdeEnvironment({ config, canvasAttrs, canvasStyle }) {
  const settings = normalizeSolverdeSettings(config), rect = SOLVERDE_GAMEPLAY;
  return <div {...canvasAttrs} className="oc-bg-widget solverde-environment" style={canvasStyle} data-gameplay-frame={settings.gameplayFrame ? 'on' : 'off'} data-decorations={settings.decorations ? 'on' : 'off'}>
    {settings.decorations && <div className="solverde-scenery" aria-hidden="true"><SolverdeSun className="solverde-engraving" /></div>}
    {settings.gameplayFrame && <div className="solverde-gameplay-frame" data-idle={settings.idleBackground ? 'on' : 'off'} style={{ left: `${rect.x / 19.2}%`, top: `${rect.y / 10.8}%`, width: `${rect.width / 19.2}%`, height: `${rect.height / 10.8}%` }}>
      {settings.decorations && <><SolverdeSun className="solverde-frame-sun solverde-frame-sun--top" /><SolverdeSun className="solverde-frame-sun solverde-frame-sun--bottom" /></>}
    </div>}
  </div>;
}
export function SolverdeHuntDock({ config, cards, activeIndex, opened, total, start, actual, breakEven, part }) {
  const track = useRef(null), settings = normalizeSolverdeSettings(config);
  useEffect(() => {
    const element = track.current;
    const follow = () => { const current = element?.querySelector('[data-active=true]'); if (current) element.scrollTo({ left: Math.max(0, current.offsetLeft - element.offsetLeft - (element.clientWidth - current.clientWidth) / 2), behavior: 'instant' }); };
    follow(); const observer = new ResizeObserver(follow); if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [activeIndex, cards.length, settings.dockCards]);
  return <section className="solverde-hunt-dock" aria-label="Bonus Hunt" {...part('container')} style={{ '--slv-dock-cards': settings.dockCards, fontFamily:config.fontFamily, fontSize:Number(config.fontSize)||14, ...part('container').style }}>
    <div className="solverde-hunt-progress"><h2 {...part('headerTitle')}>{config.solverde?.dockTitle || 'BONUS HUNT'}</h2><span {...part('progressCount')}>{String(opened).padStart(2, '0')} / {total} ABERTOS</span>
      <div className="solverde-progress-ring" role="progressbar" aria-label="Bónus abertos" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={opened} style={{ '--slv-progress': `${total ? opened / total * 100 : 0}%` }}><SolverdeSun /></div>
    </div>
    <dl className="solverde-hunt-session">{[['START', start], ['ATUAL', actual], ['B.E.', breakEven]].map(([label, value]) => <div key={label} {...part('statCell')}><dt {...part('statLabel')}>{label}</dt><dd {...part('statValue')}>{value}</dd></div>)}</dl>
    <div className="solverde-dock-window"><div className="solverde-dock-track" ref={track} role="list">
      {cards.map((card, index) => <article key={card.id} className="solverde-dock-card" role="listitem" data-active={index === activeIndex} {...part('slotRow')}>
        <div className="solverde-dock-art">{card.art}</div><div className="solverde-dock-name"><span className="solverde-dock-status" {...part('slotStatus')}>{card.opened?'ABERTO':index===activeIndex?'ATUAL':'POR ABRIR'}</span><strong {...part('slotTitle')}>{card.name}</strong><small {...part('providerText')}>{card.provider}</small></div>
        <div className="solverde-dock-values"><span>BET<strong {...part('betValue')}>{card.bet}</strong></span><span>MULTI<strong {...part('multiplierValue')}>{card.multiplier}</strong></span></div>
      </article>)}
      {!cards.length && <div className="solverde-dock-empty">À espera dos dados do hunt</div>}
    </div>{cards.length > settings.dockCards && <div className="solverde-dock-nav"><button type="button" aria-label="Slots anteriores" onClick={() => track.current?.scrollBy({ left: -track.current.clientWidth, behavior: 'instant' })}><ChevronLeft size={14} /></button><button type="button" aria-label="Slots seguintes" onClick={() => track.current?.scrollBy({ left: track.current.clientWidth, behavior: 'instant' })}><ChevronRight size={14} /></button></div>}</div>
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
