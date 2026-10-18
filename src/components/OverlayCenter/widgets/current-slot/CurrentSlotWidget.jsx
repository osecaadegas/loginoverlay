import { useEffect, useState } from 'react';
import { Award, Info, Play } from 'lucide-react';
import { supabase } from '../../../../config/supabaseClient';
import useSlotPersonalBest from '../../../../hooks/useSlotPersonalBest';
import { getProviderImage } from '../../../../utils/gameProviders';
import { appearanceAttrs, subElementStyle, subValue } from '../shared/appearanceStyles';
import { currentSlotConfig, currentSlotIdentity, safeArtworkUrl, resolveCurrentSlotMetadata } from './currentSlotModel';
import CompactSlotPortrait from './CompactSlotPortrait';
import './CurrentSlotWidget.css';

export default function CurrentSlotWidget({ config, userId, widgetId, publicOverlayId, overlayToken, previewOnly = false }) {
  const c = currentSlotConfig(config);
  const isPortraitCard = c.displayStyle === 'portrait_card';
  const selected = currentSlotIdentity(c);
  const key = `${selected.id || ''}|${selected.name}|${selected.provider}`;
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (previewOnly) return undefined;
    if (!selected.id && !selected.name) return undefined;
    (async () => {
      let query = supabase.from('slots').select('id,name,provider,image,rtp,volatility,max_win_multiplier');
      query = selected.id ? query.eq('id', selected.id) : query.eq('name', selected.name);
      if (selected.provider) query = query.eq('provider', selected.provider);
      const { data, error } = await query.limit(1).maybeSingle();
      if (!cancelled && !error) setCatalog({ key, data });
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [key, previewOnly]);
  const slot = resolveCurrentSlotMetadata(selected,catalog?.key===key?catalog.data:null);
  const liveBest = useSlotPersonalBest({ userId: previewOnly ? null : userId, slot, publicOverlayId: previewOnly ? undefined : publicOverlayId, overlayToken: previewOnly ? undefined : overlayToken });
  const best = previewOnly && c.__previewPersonalBest
    ? c.__previewPersonalBest
    : liveBest;
  const art = c.artworkBySlot?.[slot.id] || {};
  const hasProviderArtwork = ['arctic', 'candy'].includes(String(c.colourTheme || '').replace(/^theme_/, ''));
  const cover = safeArtworkUrl(subValue(c, 'slotImage', 'imageUrl', art.coverUrl || slot.image || ''));
  const backdrop = safeArtworkUrl(subValue(c, 'backdrop', 'imageUrl', art.backgroundUrl || slot.image || ''));
  const logo = safeArtworkUrl(subValue(c, 'titleImage', 'imageUrl', art.titleUrl || ''));
  const providerLogo = hasProviderArtwork ? safeArtworkUrl(getProviderImage(slot.provider) || '') : '';
  const [failed, setFailed] = useState({});
  const showProviderLogo = providerLogo && !failed[providerLogo];
  const part = elementId => ({ ...appearanceAttrs({ config: c, widgetId, widgetType: 'current_slot', elementId }), style: subElementStyle(c, elementId, {}) });
  const number = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const money = value => value == null ? '—' : `${c.currency} ${number(value)}`;
  const row = (id, label, value, bet) => <div className="cg-stat" {...part(id)}><span {...part(`${id}Label`)}>{label}</span><strong {...part(`${id}Value`)} style={{...(id==='bestWin'?{color:c.textColor}:id==='bestMulti'?{color:c.accentColor}:{}),...part(`${id}Value`).style}}>{bet > 0 && <small className="cg-record-bet">({money(bet)}) </small>}{value}</strong></div>;
  const portraitLayout=isPortraitCard?{width:'calc(225 * var(--cg-px))',height:'calc(400 * var(--cg-px))',gridTemplateColumns:'minmax(0,1fr)',gridTemplateRows:'minmax(0,1fr) calc(119 * var(--cg-px))',padding:'calc(5 * var(--cg-px))'}:{};
  const rootStyle = { ...portraitLayout, '--cg-panel': c.panelColor, '--cg-badge': c.badgeColor, '--cg-cover': c.coverColor, '--cg-accent': c.accentColor, '--cg-bg': c.backgroundColor, '--cg-text': c.textColor, '--cg-muted': c.mutedColor, '--cg-border': c.borderColor, '--cg-portrait-accent': c.portraitAccentColor, '--cg-portrait-panel': c.portraitPanelColor, fontFamily: c.fontFamily, ...subElementStyle(c, 'container', {}) };
  if(c.displayStyle==='street_art_card') return <section className="street-current-card" {...part('container')} style={rootStyle} aria-label={slot.name || 'Current slot'}>
    <div className="street-current-art" {...part('coverFrame')}>{c.showArtwork && cover && !failed[cover] ? <img src={cover} alt={slot.name} onError={()=>setFailed(prev=>({...prev,[cover]:true}))} {...part('slotImage')}/> : <div className="street-current-fallback" {...part('fallback')}><strong {...part('slotTitle')}>{slot.name || 'Select a slot'}</strong><small {...part('provider')}>{slot.provider || '—'}</small></div>}</div>
    <div className="street-current-stats" {...part('info')}>{c.showPersonalRecords && row('bestMulti','BEST WIN',best?.best_multiplier != null ? number(best.best_multiplier)+'x' : '—')}{c.statVisibility?.rtp!==false && row('rtp','RTP',slot.rtp != null ? number(slot.rtp)+'%' : '—')}</div>
  </section>;
  if(c.displayStyle==='portrait_compact') return <CompactSlotPortrait config={c} slot={slot} best={best} cover={safeArtworkUrl(subValue(c,'slotImage','imageUrl',art.portraitCoverUrl||art.coverUrl||slot.image||''))} failed={failed} onImageError={event=>setFailed(prev=>({...prev,[event.currentTarget.getAttribute('src')]:true}))} widgetId={widgetId}/>;
  if (c.colourTheme === 'solverde' && c.solverde?.footer) return <div className="cg-viewport cg-viewport--solverde"><section className="cg-widget cg-widget--solverde" {...part('container')} style={rootStyle}>
    {c.showArtwork && cover && !failed[cover] ? <img className="solverde-footer-art" src={cover} alt={slot.name} onError={()=>setFailed(prev=>({...prev,[cover]:true}))} {...part('slotImage')} /> : <div />}
    <div className="solverde-footer-name"><strong {...part('slotTitle')}>{slot.name || 'Seleciona um slot'}</strong><small {...part('provider')}>{slot.provider || '—'}</small></div>
    {row('rtp','RTP',slot.rtp > 0 ? `${number(slot.rtp)}%` : '—')}
    {row('potential','POTENCIAL',slot.max_win_multiplier > 0 ? `${number(slot.max_win_multiplier)}x` : '—')}
    {c.showPersonalRecords && row('bestWin','MELHOR WIN',money(best?.best_win))}
  </section></div>;
  if (isPortraitCard) return <div className="cg-viewport cg-viewport--portrait"><section className="cg-widget cg-widget--portrait" data-records={c.showPersonalRecords ? 'visible' : 'hidden'} data-style="portrait-card" {...part('container')} style={rootStyle} aria-label={slot.name ? `Current game: ${slot.name}` : 'Choose a current game'}>
    <div className="cg-portrait-art" {...part('coverFrame')}>
      {c.showArtwork && cover && !failed[cover]
        ? <img className="cg-portrait-cover" src={cover} alt={slot.name} onError={() => setFailed(prev => ({ ...prev, [cover]: true }))} {...part('slotImage')} />
        : <div className="cg-portrait-fallback" {...part('fallback')}><strong>{slot.name || 'Current game'}</strong><span>{slot.provider || 'Select a slot'}</span></div>}
      <span className="cg-portrait-shine" aria-hidden="true" />
    </div>
    <div className="cg-portrait-stats" {...part('info')}>
      {row('potential', 'Max win', slot.max_win_multiplier > 0 ? `${number(slot.max_win_multiplier)}x` : '—')}
      {row('rtp', 'RTP', slot.rtp > 0 ? `${number(slot.rtp)}%` : '—')}
      {row('volatility', 'Volat.', slot.volatility || '—')}
      {c.showPersonalRecords && row('bestMulti', 'Best', best?.best_multiplier != null ? `${number(best.best_multiplier)}x` : '—')}
    </div>
  </section></div>;
  return <div className="cg-viewport"><section className="cg-widget" data-records={c.showPersonalRecords ? 'visible' : 'hidden'} data-style="immersive-current" {...part('container')} style={rootStyle} aria-label={slot.name ? `Current game: ${slot.name}` : 'Choose a current game'}>
    {c.showBackdrop && backdrop && !failed[backdrop] && <img className="cg-backdrop" src={backdrop} alt="" onError={() => setFailed(prev => ({ ...prev, [backdrop]: true }))} {...part('backdrop')} style={{ opacity: c.backgroundOpacity, ...subElementStyle(c, 'backdrop', {}) }} />}
    <div className="cg-identity" {...part('identity')}>
      {c.showArtwork && <div className="cg-cover" {...part('coverFrame')}>{cover && !failed[cover] ? <img src={cover} alt={slot.name} onError={() => setFailed(prev => ({ ...prev, [cover]: true }))} {...part('slotImage')} /> : <span>SC</span>}</div>}
      <div className="cg-name-block"><span className="cg-current" {...part('badge')}><Play aria-hidden="true" /> Current game</span>
        {logo && !failed[logo] ? <img className="cg-title-art" src={logo} alt={slot.name} onError={() => setFailed(prev => ({ ...prev, [logo]: true }))} {...part('titleImage')} /> : <h2 {...part('slotTitle')}>{slot.name || 'Select a slot'}</h2>}
        <p className={showProviderLogo ? 'cg-provider cg-provider--logo' : 'cg-provider'} {...part('provider')}>
          {showProviderLogo
            ? <img className="cg-provider-logo" src={providerLogo} alt={slot.provider || 'Provider'} onError={() => setFailed(prev => ({ ...prev, [providerLogo]: true }))} />
            : slot.provider || 'Your next game, on screen'}
        </p>
      </div>
    </div>
    <div className="cg-info" {...part('info')}><h3 {...part('infoTitle')}><Info aria-hidden="true" /> Info</h3>
      {row('potential', 'Potential', slot.max_win_multiplier > 0 ? `${number(slot.max_win_multiplier)}x` : '—')}
      {row('rtp', 'RTP', slot.rtp > 0 ? `${number(slot.rtp)}%` : '—')}
      {row('volatility', 'Volatility', slot.volatility || '—')}
    </div>
    {c.showPersonalRecords && <div className="cg-records" {...part('records')}><h3 {...part('recordsTitle')}><Award aria-hidden="true" /> Personal record</h3>
      {row('bestWin', 'Win', money(best?.best_win), best?.best_win_bet)}
      {row('bestMulti', 'X', best?.best_multiplier != null ? `${number(best.best_multiplier)}x` : '—', best?.best_multiplier_bet)}
      {row('averageWin', 'Avg. win', money(best?.average_win))}
    </div>}
  </section></div>;
}
