import React,{useEffect,useState} from 'react';
import {Orbit,Gamepad2,Trophy,MessageSquare,Video,Gift,Star,Zap,UserRound,Info} from 'lucide-react';
import {appearanceAttrs,subElementStyle} from '../../../components/OverlayCenter/widgets/shared/appearanceStyles';
import GiveawayWinnerCard from '../../../components/OverlayCenter/widgets/giveaway/GiveawayWinnerCard';
import {calculateBonusHuntStats} from '../../../utils/bonusHuntStats';
import {safeArtworkUrl} from '../../../components/OverlayCenter/widgets/current-slot/currentSlotModel';
import './GalacticCommandTheme.css';
const headings={bonus_hunt:['SESSION STATS',Orbit],current_slot:['CURRENT GAME',Gamepad2],slideshow_frame:['VIDEO / SLIDESHOW',Video],chat:['CHAT / ALERTS',MessageSquare],giveaway:['LATEST WIN',Trophy],slot_requests:['SLOT REQUESTS',Gamepad2],tournament:['TOURNAMENT',Trophy],bets:['PREDICTIONS',Info],raid_shoutout:['TRANSMISSION',Video]};
export function galacticPart(c,type,id){return {...appearanceAttrs({config:c,widgetType:type,widgetId:c.__betterInstanceId,elementId:id}),style:subElementStyle(c,id,{})};}
export function GalacticCommandModule({type,config:c,layout,children}){
 if(type==='background'){
  if(c.gameplayFrame?.enabled)return children;
  if(c.galactic?.background===false)return null;
  const holes=(layout?.instances||[]).filter(i=>i.visible!==false&&i.widgetType==='slot_window'&&i.config?.colourTheme==='galactic_command'&&i.config.galactic?.transparent!==false);
  const polygon=i=>{const x=Number(i.x),y=Number(i.y),w=Number(i.width),h=Number(i.height),b=Math.min(28,w/4,h/4);return `<polygon points="${x+b},${y} ${x+w-b},${y} ${x+w},${y+b} ${x+w},${y+h-b} ${x+w-b},${y+h} ${x+b},${y+h} ${x},${y+h-b} ${x},${y+b}" fill="black"/>`;};
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none"><defs><mask id="m"><rect width="1920" height="1080" fill="white"/>${holes.map(polygon).join('')}</mask></defs><rect width="1920" height="1080" fill="white" mask="url(#m)"/></svg>`;
  return <div className="gc-environment" style={{maskImage:`url("data:image/svg+xml,${encodeURIComponent(svg)}")`,maskSize:'100% 100%',opacity:Math.max(0,Math.min(100,c.opacity??100))/100}}/>;
 }
 let [title,Icon]=headings[type]||[];
 if(type==='bonus_hunt'&&c.galactic?.role==='result')title='PLAYING NOW';
 if(type==='bonus_hunt'&&c.galactic?.role==='summary')title=null;
 if(type==='current_slot'&&['galactic_max','galactic_rail','galactic_info'].includes(c.displayStyle))title=null;
 const headed=title&&c.galactic?.showHeader!==false;
 return <section className={`gc-frame gc-frame--${type}`} data-role={c.galactic?.role} data-framed={c.galactic?.borderWidth===0?'off':'on'} data-headed={headed?'true':'false'} data-lights={c.galactic?.lights===false?'off':'on'}>
  <i className="gc-mechanical-frame" aria-hidden="true"/><i className="gc-frame-lights" aria-hidden="true"/>
  {headed&&<header className="gc-heading"><Icon/><span>{c.galactic?.heading||title}</span></header>}
  <div className="gc-content">{type==='giveaway'&&c.galactic?.latestWin?(c.winner?<><GiveawayWinnerCard config={c}/><GalacticWinnerTime value={c.winnerSelectedAt}/></>:<div className="gc-empty">Awaiting a giveaway winner</div>):children}</div>
 </section>;
}
export function GalacticNavbar({config:c,time,allWidgets=[]}){
 const avatar=safeArtworkUrl(c.avatarUrl||c.streamerAvatar||c.avatarImageUrl||'');
 const [failedAvatar,setFailedAvatar]=useState('');
 const hunt=allWidgets.find(w=>w.widget_type==='bonus_hunt')?.config;
 const known=v=>v!==''&&v!=null&&Number.isFinite(Number(v));
 const start=known(hunt?.startMoney)?Number(hunt.startMoney):known(c.startBalance)?Number(c.startBalance):null;
 const stats=hunt?calculateBonusHuntStats(hunt.bonuses||[],Number(hunt.startMoney)||0,Number(hunt.stopLoss)||0):null;
 const balance=hunt&&known(hunt.stopLoss)?Number(hunt.stopLoss)+stats.totalWin:known(c.balance)?Number(c.balance):null;
 const profit=balance!=null&&start!=null?balance-start:null;
 const money=v=>v==null?'—':`${hunt?.currency||c.balanceCurrency||'€'}${v.toLocaleString(undefined,{maximumFractionDigits:2})}`;
 const part=id=>galacticPart(c,'navbar',id);
 return <nav className="gc-navbar" {...part('container')}>
  {c.showIdentity!==false&&<div className="gc-nav-identity">{c.showAvatar!==false&&(avatar&&failedAvatar!==avatar?<img src={avatar} alt="Streamer emblem" onError={()=>setFailedAvatar(avatar)} {...part('avatar')}/>:<Orbit/>)}<div><strong {...part('displayName')}>{c.streamerName||c.twitchUsername||c.brandName||'Your channel'}</strong><small>{c.galactic?.subtitle||'GALACTIC COMMAND'}</small></div></div>}
  {c.galactic?.showBalance!==false&&<div className="gc-nav-value" {...part('balance')}><span>BALANCE</span><b>{money(balance)}</b></div>}
  {c.galactic?.showProfit!==false&&<div className="gc-nav-value" data-positive={profit>=0}><span>PROFIT</span><b>{profit>0?'+':''}{money(profit)}</b></div>}
  {c.showClock!==false&&<div className="gc-nav-clock" {...part('clock')}><b>{time||'—'}</b><small>{c.live===false?'SESSION':'LIVE SESSION'}</small></div>}
  {c.showStartBalance!==false&&<div className="gc-nav-value gc-nav-start"><span>START</span><b>{money(start)}</b></div>}
  {c.showCTA!==false&&<div className="gc-nav-responsible" {...part('cta')}>{c.ctaText||'PLAY RESPONSIBLY'}</div>}
 </nav>;
}
export function GalacticHunt({config:c,start,stop,be,average,superOpened,superCount,extremeOpened,extremeCount,total,best,current,currentBest,renderList}){
 const part=id=>galacticPart(c,'bonus_hunt',id);
 const cell=(label,value)=><div className="gc-stat" key={label} {...part('statCell')}><span {...part('statLabel')}>{label}</span><b {...part('statValue')}>{value}</b></div>;
 const [expanded,setExpanded]=useState(false);
 if(c.galactic?.role==='result'||c.galactic?.role==='summary'){
  const summary=c.galactic.role==='summary',card=summary?best:current;
  return <div className="gc-hunt-result" {...part('container')}>
   {summary&&<div className="gc-session-total"><span>SESSION TOTAL</span><b>{total}</b></div>}
   {card?<><div className="gc-result-art" {...part('slotImage')}>{card.art}</div><div className="gc-result-info"><strong {...part('slotTitle')}>{card.name}</strong><small {...part('provider')}>{card.provider||'—'}</small>{[['WIN',card.payout],['MULTI',card.multiplier],['BET',card.bet],...(!summary?[['BEST',currentBest||'—']]:[])].map(([label,value])=>cell(label,value))}</div></>:<div className="gc-empty">No {summary?'opened bonus':'current bonus'} yet</div>}
   {summary&&<button className="gc-view-all" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?'CLOSE':'VIEW ALL'}</button>}
   {expanded&&<div className="gc-session-list">{renderList()}</div>}
  </div>;
 }
 return <div className="gc-hunt-stats" {...part('container')}>{[['START',start],['STOP',stop],['BREAK EVEN',be],['AVG WIN',average]].map(([label,value])=>cell(label,value))}<div className="gc-category-counters"><span><Star/> SUPER <b>{superOpened}/{superCount}</b></span><span><Zap/> EXTREME <b>{extremeOpened}/{extremeCount}</b></span></div></div>;
}
export function GalacticCurrent({config:c,slot,best,cover,failed,onError,row,money,number}){
 const part=id=>galacticPart(c,'current_slot',id),mode=c.displayStyle;
 const art=c.showArtwork&&<div className="gc-current-art" {...part('coverFrame')}>{cover&&!failed[cover]?<img src={cover} alt={slot.name} onError={onError} {...part('slotImage')}/>:<Gamepad2 aria-label="Artwork unavailable"/>}</div>;
 const metric=(v,suffix)=>v!==''&&v!=null&&Number.isFinite(Number(v))?number(v)+suffix:'—';
 const potential=metric(slot.max_win_multiplier,'x'),rtp=metric(slot.rtp,'%');
 const volatility=slot.volatility??'—',levelKey=String(volatility).toLowerCase().replace(/[ -]/g,'_');
 const rawRating=slot.volatility_rating??slot.volatilityRating;
 const rating=rawRating!=null&&Number.isInteger(Number(rawRating))&&Number(rawRating)>=0&&Number(rawRating)<=5?Number(rawRating):({low:1,medium:2,high:3,very_high:4,extreme:5})[levelKey];
 const vol=<>{String(volatility).replace(/_/g,' ')}{rating!=null&&<span className="gc-volatility-bars" aria-label={`${rating} of 5 volatility`} >{Array.from({length:5},(_,i)=><i key={i} data-active={i<rating}/>)}</span>}</>;
 const bestWin=money(best?.best_win),bestMulti=best?.best_multiplier!=null?number(best.best_multiplier)+'x':'—';
 const bet=c.betSize??c.bet??c.stake??slot.betSize??slot.bet??slot.stake;
 const stat=(id,label,value)=>c.statVisibility?.[id]!==false&&row(id,label,value);
 const identity=<div className="gc-current-name"><small {...part('badge')}>CURRENT GAME</small><strong {...part('slotTitle')}>{slot.name||'Select a slot'}</strong><span {...part('provider')}>{slot.provider||'—'}</span></div>;
 if(mode==='galactic_max')return <div className="gc-max-showcase" {...part('container')}><span>MAX WIN</span><strong {...part('potentialValue')}>{potential}</strong><small>GAME POTENTIAL</small></div>;
 if(mode==='galactic_rail')return <div className="gc-info-rail" {...part('container')}><Gamepad2/>{identity}{stat('rtp','RTP',rtp)}{stat('potential','POTENTIAL',potential)}{stat('volatility','VOLATILITY',vol)}{c.showPersonalRecords&&<div className="gc-rail-best"><Trophy/>{stat('bestWin','BEST WIN',bestWin)}{stat('bestMulti','BEST X',bestMulti)}</div>}</div>;
 if(mode==='galactic_info')return <div className="gc-game-info" {...part('container')}><div className="gc-game-identity">{art}{identity}</div><div {...part('info')}><h3><Info/> GAME INFO</h3>{stat('potential','POTENTIAL',potential)}{stat('rtp','RTP',rtp)}{stat('volatility','VOLATILITY',vol)}</div>{c.showPersonalRecords&&<div {...part('records')}><h3><UserRound/> PERSONAL RECORD</h3>{stat('bestWin','WIN',bestWin)}{stat('bestMulti','X',bestMulti)}{stat('averageWin','AVG. WIN',money(best?.average_win))}</div>}</div>;
 return <div className="gc-scanner" {...part('container')}>{art}<div className="gc-scanner-info">{identity}{stat('bet','BET',bet!==''&&bet!=null&&Number.isFinite(Number(bet))?money(Number(bet)):'—')}{stat('rtp','RTP',rtp)}{stat('volatility','VOLATILITY',vol)}{stat('potential','MAX WIN',potential)}{c.showPersonalRecords&&<>{stat('bestWin','BEST',bestWin)}{stat('bestMulti','BEST X',bestMulti)}</>}</div></div>;
}
export function GalacticGiveawayNotice({config:c}){const part=id=>galacticPart(c,'giveaway',id);return <div className="gc-giveaway-notice" {...part('container')} style={subElementStyle(c,'container',{background:c.bgColor,color:c.textColor,borderColor:c.lineColor})}><Gift/><strong {...part('title')}>{c.title||'GIVEAWAY'}</strong><b {...part('keyword')}>{c.isActive===false?'CLOSED':'!'+String(c.keyword||'join').replace(/^!/,'')}</b><span {...part('participantCount')}>{c.entries??c.participantCount??c.participants?.length??0} ENTRIES</span></div>;}

function GalacticWinnerTime({value}){const[now,setNow]=useState(Date.now);const timestamp=value?Date.parse(value):NaN;useEffect(()=>{if(!Number.isFinite(timestamp))return undefined;const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[timestamp]);if(!Number.isFinite(timestamp))return null;const minutes=Math.max(0,Math.floor((now-timestamp)/60000));return <time className="gc-winner-time" dateTime={value}>{minutes<1?'JUST NOW':minutes<60?minutes+' MIN AGO':minutes<1440?Math.floor(minutes/60)+' H AGO':Math.floor(minutes/1440)+' D AGO'}</time>;}
