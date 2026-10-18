import { Award, Gem, Zap, Activity } from 'lucide-react';
import { appearanceAttrs, subElementStyle } from '../shared/appearanceStyles';
import { slotMetric } from './currentSlotModel';
import './CompactSlotPortrait.css';

export default function CompactSlotPortrait({config:c,slot,best,cover,failed,onImageError,widgetId}) {
  const part=id=>({...appearanceAttrs({config:{...c,__appearanceStyleId:'portrait_compact'},widgetId,widgetType:'current_slot',elementId:id}),style:subElementStyle(c,id,{})});
  const artwork=c.showArtwork && cover && !failed[cover];
  // Existing catalogue covers are title/provider posters. Clean artwork is an explicit per-slot choice.
  const art=c.artworkBySlot?.[slot.id] || {};
  const lettering=(art.lettering || c.portraitLettering || 'embedded')==='separate';
  const rating=Number(slot.volatility_rating ?? slot.volatilityRating);
  const rows=[
    ['potential','MAX WIN',Gem,'#d9b65c',slotMetric(slot.max_win_multiplier,'x')],
    ['rtp','RTP',Activity,'#53c698',slotMetric(slot.rtp,'%')],
    ['volatility','VOL',Zap,'#e6a06b',slot.volatility ?? '—'],
    ['bestMulti','BEST',Award,'#58c5e4',slotMetric(best?.best_multiplier,'x')],
  ].map((row,index)=>c.colourTheme==='candy'?[...row.slice(0,3),['#85600c','#13734c','#a45120','#14708c'][index],row[4]]:row).filter(([id])=>c.statVisibility?.[id]!==false && (id!=='bestMulti'||c.showPersonalRecords));
  return <div className="cg-viewport cg-viewport--compact"><section className="cg-widget cg-widget--compact" data-style="portrait" data-records={c.showPersonalRecords?'visible':'hidden'} {...part('container')} style={{
    '--cp-unit':'min(.6896551724cqw,.2702702703cqh)',
    '--cp-panel':c.portraitPanelColor,'--cp-text':c.textColor,'--cp-muted':c.mutedColor,'--cg-cover':c.coverColor,
    width:'calc(145 * var(--cp-unit))',height:'calc(370 * var(--cp-unit))',
    display:'grid',gridTemplateColumns:'minmax(0,1fr)',gridTemplateRows:'54fr 46fr',padding:0,
    fontFamily:c.fontFamily,color:c.textColor,background:c.coverColor,
    borderWidth:`calc(${Math.max(0,Number(c.borderWidth??1)||0)} * var(--cp-unit))`,
    borderRadius:`calc(${Math.max(0,Number(c.borderRadius??9)||0)} * var(--cp-unit))`,
    opacity:Math.max(0,Math.min(1,Number(c.opacity??100)/100)),
    borderColor:c.borderColor,
    ...part('container').style,
  }} aria-label={slot.name || 'Current slot'}>
    <div className="cp-art" {...part('coverFrame')}>
      {artwork && <img src={cover} alt={slot.name || ''} {...part('slotImage')} style={{objectFit:art.fit || c.portraitArtworkFit || 'cover',objectPosition:art.position || c.portraitArtworkPosition || '50% 50%',...part('slotImage').style}} onError={onImageError} />}
      {(!artwork || lettering) && <div className={`cp-identity${artwork?' cp-identity--overlay':''}`}>
        <strong {...part('slotTitle')} title={slot.name}>{slot.name || 'Current slot'}</strong>
        <small {...part('provider')}>{slot.provider || '—'}</small>
      </div>}
    </div>
    <div className="cp-stats" {...part('info')} style={{gridTemplateRows:`repeat(${Math.max(1,rows.length)},minmax(0,1fr))`,...part('info').style}}>
      {rows.map(([id,label,Icon,color,value])=><div className="cp-stat" key={id} {...part(id)}>
        <span className="cp-label" {...part(`${id}Label`)} style={{color,...part(`${id}Label`).style}}><i aria-hidden="true"><Icon /></i>{label}</span>
        <strong className="cp-value" {...part(`${id}Value`)} title={String(value)}>{value === '' ? '—' : value}
          {id==='volatility' && Number.isInteger(rating) && rating>=0 && rating<=5 && <span className="cp-rating" aria-label={`${rating} / 5`}>{Array.from({length:5},(_,i)=><i key={i} data-active={i<rating}/>)}</span>}
          {id==='bestMulti' && best?.best_multiplier_bet!=null && <small className="cp-bet">({c.currency}{slotMetric(best.best_multiplier_bet)})</small>}
        </strong>
      </div>)}
    </div>
  </section></div>;
}
