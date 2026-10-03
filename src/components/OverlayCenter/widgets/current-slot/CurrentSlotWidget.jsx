import { useEffect, useMemo, useState } from 'react';
import { Award, Info, Play } from 'lucide-react';
import { supabase } from '../../../../config/supabaseClient';
import useSlotPersonalBest from '../../../../hooks/useSlotPersonalBest';
import { appearanceAttrs, subElementStyle, subValue } from '../shared/appearanceStyles';
import { currentSlotConfig, currentSlotIdentity, safeArtworkUrl } from './currentSlotModel';
import './CurrentSlotWidget.css';

export default function CurrentSlotWidget({ config, userId, widgetId, publicOverlayId, overlayToken, previewOnly = false }) {
  const c = currentSlotConfig(config);
  const selected = currentSlotIdentity(c);
  const key = `${selected.id || ''}|${selected.name}|${selected.provider}`;
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!selected.id && !selected.name) return undefined;
    (async () => {
      let query = supabase.from('slots').select('id,name,provider,image,rtp,volatility,max_win_multiplier');
      query = selected.id ? query.eq('id', selected.id) : query.eq('name', selected.name);
      if (selected.provider) query = query.eq('provider', selected.provider);
      const { data, error } = await query.limit(1).maybeSingle();
      if (!cancelled && !error) setCatalog({ key, data });
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [key]);
  const slot = useMemo(() => ({ ...selected, ...(catalog?.key === key ? catalog.data : {}) }), [key, catalog, selected.image, selected.rtp, selected.volatility, selected.max_win_multiplier]);
  const best = useSlotPersonalBest({ userId: previewOnly ? null : userId, slot, publicOverlayId: previewOnly ? undefined : publicOverlayId, overlayToken: previewOnly ? undefined : overlayToken });
  const art = c.artworkBySlot?.[slot.id] || {};
  const cover = safeArtworkUrl(subValue(c, 'slotImage', 'imageUrl', art.coverUrl || slot.image || ''));
  const backdrop = safeArtworkUrl(subValue(c, 'backdrop', 'imageUrl', art.backgroundUrl || slot.image || ''));
  const logo = safeArtworkUrl(subValue(c, 'titleImage', 'imageUrl', art.titleUrl || ''));
  const [failed, setFailed] = useState({});
  const part = elementId => ({ ...appearanceAttrs({ config: c, widgetId, widgetType: 'current_slot', elementId }), style: subElementStyle(c, elementId, {}) });
  const number = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const money = value => value == null ? '—' : `${c.currency} ${number(value)}`;
  const row = (id, label, value, bet) => <div className="cg-stat" {...part(id)}><span {...part(`${id}Label`)}>{label}</span><strong {...part(`${id}Value`)}>{bet > 0 && <small>({money(bet)}) </small>}{value}</strong></div>;
  return <section className="cg-widget" {...part('container')} style={{ '--cg-panel': c.panelColor, '--cg-badge': c.badgeColor, '--cg-cover': c.coverColor, '--cg-accent': c.accentColor, '--cg-bg': c.backgroundColor, '--cg-text': c.textColor, '--cg-muted': c.mutedColor, '--cg-border': c.borderColor, fontFamily: c.fontFamily, ...subElementStyle(c, 'container', {}) }} aria-label={slot.name ? `Current game: ${slot.name}` : 'Choose a current game'}>
    {c.showBackdrop && backdrop && !failed[backdrop] && <img className="cg-backdrop" src={backdrop} alt="" onError={() => setFailed(prev => ({ ...prev, [backdrop]: true }))} {...part('backdrop')} style={{ opacity: c.backgroundOpacity, ...subElementStyle(c, 'backdrop', {}) }} />}
    <div className="cg-identity" {...part('identity')}>
      {c.showArtwork && <div className="cg-cover" {...part('coverFrame')}>{cover && !failed[cover] ? <img src={cover} alt={slot.name} onError={() => setFailed(prev => ({ ...prev, [cover]: true }))} {...part('slotImage')} /> : <span>SC</span>}</div>}
      <div className="cg-name-block"><span className="cg-current" {...part('badge')}><Play aria-hidden="true" /> Current game</span>
        {logo && !failed[logo] ? <img className="cg-title-art" src={logo} alt={slot.name} onError={() => setFailed(prev => ({ ...prev, [logo]: true }))} {...part('titleImage')} /> : <h2 {...part('slotTitle')}>{slot.name || 'Select a slot'}</h2>}
        <p {...part('provider')}>{slot.provider || 'Your next game, on screen'}</p>
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
  </section>;
}
