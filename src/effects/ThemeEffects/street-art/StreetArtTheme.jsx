import React from 'react';
import { appearanceAttrs, subElementStyle } from '../../../components/OverlayCenter/widgets/shared/appearanceStyles';
import { giveawayFontStack } from '../../../components/OverlayCenter/widgets/giveaway/giveawayFonts';
import { Gift } from 'lucide-react';
import { normalizeStreetArtSettings, STREET_ART_ASSETS } from './streetArtTheme';
import './StreetArtTheme.css';

const HEADINGS = { bonus_hunt: 'BONUS HUNT', slot_requests: 'SLOT REQUESTS', current_slot: 'CURRENT SLOT',
  slideshow_frame: 'SLIDESHOW', chat: 'LIVE CHAT', tournament: 'TOURNAMENT', giveaway: 'GIVEAWAY',
  bets: 'PREDICTIONS', raid_shoutout: 'SHOUTOUT', slot_bingo: 'SLOT BINGO', connect_four: 'CONNECT FOUR' };
export function PaintCorners() {
  return <div className="street-paint" aria-hidden="true">{[0, 1, 2, 3].map(i => <svg key={i} className={`street-splash street-splash--${i}`} viewBox="0 0 120 95">
    <path fill="currentColor" d={[
      'M17 19c-6-3-11 2-8 7l4 4c-6 9 5 13 11 9l6 6c3 7 12 2 10-4 11-1 15-9 5-13l3-7c1-5-6-7-10-2-5-9-15-7-16 1Z',
      'M13 31c-4-9 6-15 13-8l6-6c6-6 13-1 11 5 9-3 19 6 13 11l-10 1c1 9-13 16-16 5-7 6-18 0-17-8Z',
      'M18 21c-11 1-15 10-4 14l11 3c-1 9 10 13 13 2l10-2c9-3 7-14-3-12l-4-7c-4-6-10-4-12 2l-11-1Z',
      'M12 25c-8 5-3 15 6 13l6-1c1 8 14 12 17 2l9-4c8-1 6-10-2-9 2-8-11-11-15-4-3-10-16-8-16 2Z',
    ][i]}/>
    <path d="M25 28c-5 16-7 24-7 47m17-36-2 16m6-23 38 3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    {[[8,7,1],[54,8,2],[69,23,1],[82,36,2],[6,48,2],[15,58,1],[31,65,2],[52,48,1],[47,3,1],[63,57,1],[88,26,1],[94,39,1]].map(([cx,cy,r],n)=><circle key={n} cx={cx} cy={cy} r={r} fill="currentColor"/>)}
  </svg>)}</div>;
}
export function StreetArtModule({ type, config, children }) {
  if (['background', 'slot_window', 'camera'].includes(type)) return children;
  const s = normalizeStreetArtSettings(config), heading = s.heading || HEADINGS[type];
  const headingId = {bonus_hunt:'headerTitle',slot_requests:'header',chat:'header',current_slot:'badge'}[type];
  const headingAttrs = headingId ? appearanceAttrs({config,widgetType:type,widgetId:config.__betterInstanceId,elementId:headingId}) : {};
  return <section className={`street-module street-module--${type}${heading ? ' street-module--headed' : ''}`} data-street-props={s.props&&['chat','current_slot'].includes(type)?'on':'off'} data-street-splashes={s.splashes ? 'on' : 'off'}>
    <div className="street-material" aria-hidden="true"/>
    {heading && <header className="street-heading"><span {...headingAttrs} style={headingId?subElementStyle(config,headingId,{color:'#090C0E',fontFamily:s.headerFont}):{fontFamily:s.headerFont}}>{heading}</span><svg viewBox="0 0 100 36" aria-hidden="true"><path d="m5 27 72-9-12-9m13 9-12 12"/>{type==='bonus_hunt' && <path className="street-crown" d="m73 28-5-21 12 10L86 2l5 17 7-9-2 20Z"/>}</svg></header>}
    <div className="street-module-content">{children}</div>
    {s.splashes && <PaintCorners/>}
    {s.props && type === 'chat' && <div className="street-chat-props" aria-hidden="true"><img className="street-prop street-prop--extra-can" src={STREET_ART_ASSETS.can} alt="" draggable={false}/><img className="street-prop street-prop--cluster" src={STREET_ART_ASSETS.props} alt="" draggable={false}/></div>}
    {s.props && type === 'current_slot' && <><img className="street-prop street-prop--can" src={STREET_ART_ASSETS.can} alt="" draggable={false} aria-hidden="true"/><svg className="street-sticker-tag" viewBox="0 0 90 50" aria-hidden="true"><path d="m5 4 77 3-3 9 7 6-6 8 5 13-75 4 2-10-8-4 7-11Z" fill="#F1EFE8"/><path d="m25 33-4-18 14 9 6-15 9 16 14-9-3 21Z" fill="none" stroke="#090C0E" strokeWidth="4" strokeLinejoin="round"/></svg></>}
  </section>;
}
export function StreetArtEnvironment({ config, canvasAttrs, canvasStyle }) {
  const s = normalizeStreetArtSettings(config), r = s.gameplay;
  const mask = s.gameplayFrame && s.transparentGameplay ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none"><defs><mask id="opening"><rect width="1920" height="1080" fill="white"/><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.radius}" fill="black"/></mask></defs><rect width="1920" height="1080" fill="white" mask="url(#opening)"/></svg>`)}")` : undefined;
  return <div {...canvasAttrs} className="oc-bg-widget street-environment" style={canvasStyle}>
    {s.background && <img className="street-environment-image" src={STREET_ART_ASSETS.background} alt="" draggable={false} style={{ maskImage: mask, maskSize: '100% 100%' }}/>}
    {s.gameplayFrame && <div className="street-gameplay-frame" data-chroma-key={s.gameplayChromaKey?'on':'off'} style={{ left: `${r.x / 19.2}%`, top: `${r.y / 10.8}%`, width: `${r.width / 19.2}%`, height: `${r.height / 10.8}%`, borderRadius:r.radius, borderWidth:s.borderWidth,background:s.gameplayChromaKey?s.gameplayChromaColor:'transparent' }} aria-hidden="true">{s.splashes && <PaintCorners/>}</div>}
  </div>;
}
export function StreetArtGiveawayNotice({ config }) {
  const part=elementId=>appearanceAttrs({config,widgetType:'giveaway',elementId});
  return <div className="street-giveaway-notice" {...part('container')} style={subElementStyle(config,'container',{background:config.bgColor,color:config.textColor,borderColor:config.lineColor,fontFamily:giveawayFontStack(config.bodyFont,'inter')})}><Gift aria-hidden="true" style={{color:config.deepAccentColor}}/><strong {...part('title')} style={subElementStyle(config,'title',{color:'var(--street-yellow,#FFE600)',fontFamily:giveawayFontStack(config.titleFont,'inter'),fontSize:'min('+ (Number(config.titleSize)||22) +'px,4cqw)'})}>{config.title || 'GIVEAWAY'}</strong><span {...part('keyword')} style={subElementStyle(config,'keyword',{})}>{config.isActive ? '!'+String(config.keyword || 'join').replace(/^!/, '') : 'Next giveaway soon'}</span>{config.isActive && <b {...part('participantCount')} style={subElementStyle(config,'participantCount',{color:config.deepAccentColor})}>{config.participants?.length || 0} ENTRIES</b>}</div>;
}
