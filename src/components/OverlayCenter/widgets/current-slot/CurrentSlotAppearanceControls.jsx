import { currentSlotConfig } from './currentSlotModel';

export function CurrentSlotAppearanceControls({ config, onChange }) {
  const c = currentSlotConfig(config);
  const set = patch => onChange({ ...c, ...patch });
  return <div className="cg-appearance">
    <p>Select games and record results on the <a href="/overlay-center/widgets/current-slot">Current Game page</a>.</p>
    {[[ 'showArtwork', 'Slot cover' ], ['showBackdrop', 'Immersive slot background'], ['showPersonalRecords', 'Personal records']].map(([key, label]) => <label key={key}><input type="checkbox" checked={c[key]} onChange={event => set({ [key]: event.target.checked })} />{label}</label>)}
    <label>Background image strength<input type="range" min="0" max="0.6" step="0.01" value={c.backgroundOpacity} onChange={event => set({ backgroundOpacity: Number(event.target.value) })} /></label>
    {['accentColor', 'backgroundColor', 'panelColor', 'badgeColor', 'coverColor', 'borderColor', 'textColor', 'mutedColor'].map(key => <label key={key}>{key.replace(/([A-Z])/g, ' $1')}<input type="color" value={c[key]} onChange={event => set({ [key]: event.target.value })} /></label>)}
  </div>;
}
