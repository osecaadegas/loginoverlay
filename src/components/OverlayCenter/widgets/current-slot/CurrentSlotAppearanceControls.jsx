import {GALACTIC_MODE_ROWS} from '../../../../effects/ThemeEffects/galactic-command/galacticCommandTheme.js';
import { currentSlotConfig, CURRENT_SLOT_DEFAULTS, COMPACT_SLOT_DEFAULTS } from './currentSlotModel';

const CURRENT_SLOT_FONTS = [
  ["'Rajdhani', sans-serif", 'Rajdhani'],
  ["'Barlow Condensed', sans-serif", 'Barlow Condensed'],
  ["'Orbitron', sans-serif", 'Orbitron'],
  ["'Inter', sans-serif", 'Inter'],
];

export function CurrentSlotAppearanceControls({ config, onChange, onWidgetChange }) {
  const c = currentSlotConfig(config);
  const compact=c.displayStyle==='portrait_compact';
  const isGalactic=c.displayStyle?.startsWith('galactic_');
  const isStudio=c.displayStyle==='starter_studio_card';
  const isStreet = c.displayStyle === 'street_art_card';
  const isPortraitCard = c.displayStyle === 'portrait_card' || compact || isStreet || isStudio || isGalactic;
  const isFooter = c.colourTheme === 'solverde' && c.solverde?.footer;
  const set = patch => onChange({ ...c, ...patch });
  return <div className="cg-appearance">
    <label>Orientation / layout<select aria-label="Current Slot orientation" value={c.displayStyle} onChange={event=>{
      const displayStyle=event.target.value,next={...c,displayStyle,solverde:{...c.solverde,footer:false}};
      delete next.__appearanceStyleId;
      if(displayStyle==='portrait_compact'&&!c.colourTheme&&c.borderColor===CURRENT_SLOT_DEFAULTS.borderColor) Object.assign(next,COMPACT_SLOT_DEFAULTS);
      const size=displayStyle.startsWith('galactic_')?{width:displayStyle==='galactic_scanner'?344:displayStyle==='galactic_max'?344:1158,height:displayStyle==='galactic_scanner'?270:displayStyle==='galactic_max'?140:displayStyle==='galactic_rail'?66:226}:displayStyle==='starter_studio_card'?{width:554,height:324}:displayStyle==='portrait_compact'?{width:145,height:370}:displayStyle==='street_art_card'?{width:394,height:282}:displayStyle==='portrait_card'?{width:225,height:400}:{width:1100,height:240};
      if(onWidgetChange) onWidgetChange({...size,config:next});else onChange(next);
    }}><option value="galactic_scanner">Command scanner</option><option value="galactic_max">Max win showcase</option><option value="galactic_rail">Command information rail</option><option value="galactic_info">Command game information</option><option value="immersive_current">Immersive</option><option value="portrait_card">Portrait Card</option><option value="portrait_compact">Portrait</option><option value="starter_studio_card">Starter Studio card</option><option value="street_art_card">Street Art cover</option></select></label>
    <p>Select games and record results on the <a href="/overlay-center/widgets/current-slot">Current Game page</a>.</p>
    {[...(!['galactic_max','galactic_rail'].includes(c.displayStyle)?[[ 'showArtwork', 'Slot cover' ]]:[]), ...(!isPortraitCard && !isFooter ? [['showBackdrop', 'Immersive slot background']] : []), ...(!['galactic_max'].includes(c.displayStyle)?[['showPersonalRecords', isPortraitCard&&!isGalactic ? 'Best multiplier row' : 'Personal records']]:[])].map(([key, label]) => <label key={key}><input type="checkbox" checked={c[key]} onChange={event => set({ [key]: event.target.checked })} />{label}</label>)}
    {!isPortraitCard && !isFooter && c.showBackdrop && <label>Background image strength<input type="range" min="0" max="0.6" step="0.01" value={c.backgroundOpacity} onChange={event => set({ backgroundOpacity: Number(event.target.value) })} /></label>}
    <label>Font family<select value={c.fontFamily} onChange={event => set({ fontFamily: event.target.value })}>{!CURRENT_SLOT_FONTS.some(([value])=>value===c.fontFamily)&&<option value={c.fontFamily}>Theme / custom font</option>}{CURRENT_SLOT_FONTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {isGalactic&&(GALACTIC_MODE_ROWS[c.displayStyle]||[]).map(id=><label key={id}><input type="checkbox" checked={c.statVisibility?.[id]!==false} onChange={event=>set({statVisibility:{...c.statVisibility,[id]:event.target.checked}})}/>{id} row</label>)}
    {isStudio&&[['bet','BET'],['rtp','RTP'],['volatility','VOLATILITY']].map(([id,label])=><label key={id}><input type="checkbox" checked={c.statVisibility?.[id]!==false} onChange={event=>set({statVisibility:{...c.statVisibility,[id]:event.target.checked}})}/>{label} row</label>)}
    {isStreet && [['bet','BET'],['rtp','RTP'],['volatility','VOLATILITY'],['potential','MAX WIN'],['bestWin','BEST PAYOUT'],['bestMulti','BEST X']].map(([id,label])=><label key={id}><input type="checkbox" checked={c.statVisibility?.[id]!==false} onChange={event=>set({statVisibility:{...c.statVisibility,[id]:event.target.checked}})}/>{label} row</label>)}
    {compact && <>
      <label>Artwork lettering<select value={c.portraitLettering||'embedded'} onChange={event=>set({portraitLettering:event.target.value})}><option value="embedded">Already in the cover</option><option value="separate">Add title and provider</option></select></label>
      <label>Artwork crop<select value={c.portraitArtworkFit||'cover'} onChange={event=>set({portraitArtworkFit:event.target.value})}><option value="cover">Fill and crop</option><option value="contain">Show complete artwork</option></select></label>
      {[['potential','MAX WIN'],['rtp','RTP'],['volatility','VOL']].map(([id,label])=><label key={id}><input type="checkbox" checked={c.statVisibility?.[id]!==false} onChange={event=>set({statVisibility:{...c.statVisibility,[id]:event.target.checked}})}/>{label} row</label>)}
      {[['borderWidth','Border thickness',0,8,1],['borderRadius','Corner radius',0,40,9],['opacity','Opacity (%)',0,100,100]].map(([key,label,min,max,fallback])=><label key={key}>{label}<input type="number" min={min} max={max} value={c[key]??fallback} onChange={event=>set({[key]:Math.max(min,Math.min(max,event.target.valueAsNumber||0))})}/></label>)}
    </>}
    {(isGalactic?['accentColor','backgroundColor','panelColor','borderColor','textColor','mutedColor']:isStreet ? ['accentColor','panelColor','coverColor','borderColor','textColor','mutedColor'] : compact ? ['portraitPanelColor','coverColor','borderColor','textColor','mutedColor'] : isFooter ? ['backgroundColor','borderColor','textColor','mutedColor'] : isPortraitCard
      ? ['portraitAccentColor', 'portraitPanelColor', 'coverColor', 'borderColor', 'textColor', 'mutedColor']
      : ['accentColor', 'backgroundColor', 'panelColor', 'badgeColor', 'coverColor', 'borderColor', 'textColor', 'mutedColor']
    ).map(key => <label key={key}>{key.replace(/([A-Z])/g, ' $1')}<input type="color" value={c[key]} onChange={event => set({ [key]: event.target.value })} /></label>)}
  </div>;
}
