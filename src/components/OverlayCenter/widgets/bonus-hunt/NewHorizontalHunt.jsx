import { Crown, Zap, PlayCircle, Circle } from 'lucide-react';
import SlotImage from '../SlotImage';
import {appearanceAttrs,subElementStyle} from '../shared/appearanceStyles';
import {newHorizontalPalette,newHorizontalSequence} from './shared/newHorizontalHunt';
import './NewHorizontalHunt.css';

export default function NewHorizontalHunt({config:c,cards,state,totalPayout,startBE,average,opened,superOpened,superCount,extremeOpened,extremeCount,font}) {
  const palette=newHorizontalPalette(c),sequence=newHorizontalSequence(cards,state);
  const part=id=>({...appearanceAttrs({config:{...c,__appearanceStyleId:'new_horizontal'},widgetId:c.__betterInstanceId,widgetType:'bonus_hunt',elementId:id}),style:subElementStyle(c,id,{})});
  const card=(item,index,side)=>{
    if(!item)return <div key={`empty-${index}`} className="nh-placeholder" aria-hidden="true"/>;
    const status=item.opened?'opened':side==='right'&&index===0?'current':'upcoming';
    const Icon=item.tier==='super'?Crown:item.tier==='extreme'?Zap:Circle;
    return <article className="nh-card" key={item.id} data-state={status} data-bonus-id={item.id} aria-label={`${item.name} — ${status}`} {...part('slotRow')}>
      {item.image?<SlotImage src={item.image} alt={item.name} {...part('slotImage')}/>:<span className="nh-fallback" {...part('slotTitle')}>{item.name||'Slot'}</span>}
      <div className="nh-card-shade" aria-hidden="true"/>
      <div className="nh-card-info"><strong {...part(item.opened?'winValue':'betValue')} title={item.opened?item.payout:item.bet}>{item.opened?item.payout:item.bet}</strong>{item.opened&&<small {...part('multiplierValue')}>{item.multiplier}</small>}</div>
      <span className={`nh-type nh-type--${item.tier}`} title={item.tier}><Icon aria-hidden="true"/></span><span className="nh-number" {...part('cardNumber')}>{item.number}</span>
    </article>;
  };
  return <div className="nh-viewport"><section className="nh-hunt" data-motion={c.animations===false?'off':'on'} data-session={state} {...part('container')} style={{
    '--nh-u':'min(.1369863014cqw,.6666666667cqh)','--nh-bg':palette.background,'--nh-accent':palette.accent,'--nh-text':palette.text,'--nh-muted':palette.muted,'--nh-line':palette.line,'--nh-tile':palette.tile,
    fontFamily:c.fontFamily||font,opacity:Math.max(0,Math.min(1,Number(c.opacity??100)/100)),borderWidth:`calc(${Math.max(0,Number(c.borderWidth??1.5)||0)} * var(--nh-u))`,borderRadius:`calc(${Math.max(0,Number(c.edgeRadius??12)||0)} * var(--nh-u))`,...part('container').style,
  }}>
    <div className="nh-cards nh-cards--opened">{sequence.left.map((item,i)=>card(item,i,'left'))}</div>
    <div className="nh-summary">
      <header><PlayCircle aria-hidden="true"/><strong {...part('headerTitle')}>BONUS <em>{state==='ended'?'COMPLETED':state==='opening'?'OPENING':'COLLECTING'}</em></strong>{c.huntNumber!=null&&c.huntNumber!==''&&<small {...part('huntNumber')}>#{c.huntNumber}</small>}</header>
      <div className="nh-total"><strong {...part('totalPayout')} title={totalPayout}>{totalPayout}</strong><span {...part('progressCount')}>{opened}/{cards.length}</span></div>
      <div className="nh-progress" role="progressbar" aria-label="Opened bonuses" aria-valuemin={0} aria-valuemax={cards.length||1} aria-valuenow={opened} {...part('progressBar')}><i {...part('progressBarFill')} style={{...part('progressBarFill').style,width:`${cards.length?opened/cards.length*100:0}%`}}/></div>
      <div className="nh-counters"><span {...part('tierCounter')} aria-label="Super bonuses opened"><Crown/><b {...part('tierValue')}>{superOpened}/{superCount}</b></span><span {...part('tierCounter')} aria-label="Extreme bonuses opened"><Zap/><b {...part('tierValue')}>{extremeOpened}/{extremeCount}</b></span></div>
      <div className="nh-stats">{[['START BE',startBE],['AVG',average]].map(([label,value])=><div key={label} {...part('statCell')}><small {...part('statLabel')}>{label}</small><strong {...part('statValue')} title={value}>{value}</strong></div>)}</div>
    </div>
    <div className="nh-cards nh-cards--queue">{sequence.right.map((item,i)=>card(item,i,'right'))}</div>
  </section></div>;
}
