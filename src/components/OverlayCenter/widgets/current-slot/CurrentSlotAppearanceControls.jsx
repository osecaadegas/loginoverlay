import { currentSlotConfig } from './currentSlotModel';

const CURRENT_SLOT_FONTS = [
  ["'Rajdhani', sans-serif", 'Rajdhani'],
  ["'Barlow Condensed', sans-serif", 'Barlow Condensed'],
  ["'Orbitron', sans-serif", 'Orbitron'],
  ["'Inter', sans-serif", 'Inter'],
];

export function CurrentSlotAppearanceControls({ config, onChange }) {
  const c = currentSlotConfig(config);
  const isPortraitCard = c.displayStyle === 'portrait_card';
  const set = patch => onChange({ ...c, ...patch });
  return <div className="cg-appearance">
    <p>Select games and record results on the <a href="/overlay-center/widgets/current-slot">Current Game page</a>.</p>
    {[[ 'showArtwork', 'Slot cover' ], ...(!isPortraitCard ? [['showBackdrop', 'Immersive slot background']] : []), ['showPersonalRecords', isPortraitCard ? 'Best multiplier row' : 'Personal records']].map(([key, label]) => <label key={key}><input type="checkbox" checked={c[key]} onChange={event => set({ [key]: event.target.checked })} />{label}</label>)}
    {!isPortraitCard && c.showBackdrop && <label>Background image strength<input type="range" min="0" max="0.6" step="0.01" value={c.backgroundOpacity} onChange={event => set({ backgroundOpacity: Number(event.target.value) })} /></label>}
    <label>Font family<select value={c.fontFamily} onChange={event => set({ fontFamily: event.target.value })}>{CURRENT_SLOT_FONTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {(isPortraitCard
      ? ['portraitAccentColor', 'portraitPanelColor', 'coverColor', 'borderColor', 'textColor', 'mutedColor']
      : ['accentColor', 'backgroundColor', 'panelColor', 'badgeColor', 'coverColor', 'borderColor', 'textColor', 'mutedColor']
    ).map(key => <label key={key}>{key.replace(/([A-Z])/g, ' $1')}<input type="color" value={c[key]} onChange={event => set({ [key]: event.target.value })} /></label>)}
  </div>;
}
