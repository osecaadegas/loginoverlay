import React, { useState } from 'react';
import ColorPickerBase from './shared/ColorPicker';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { RTP_STATS_STYLE_KEYS } from './styleKeysRegistry';
import TabBar from './shared/TabBar';
const ColorPicker = (props) => <ColorPickerBase {...props} showHex={false} className="nb-color-item" />;

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
  { value: "'Bebas Neue', cursive", label: 'Bebas Neue' },
  { value: "'Press Start 2P', cursive", label: 'Press Start 2P' },
  { value: "'Arial', sans-serif", label: 'Arial' },
  { value: "'Georgia', serif", label: 'Georgia' },
];

/* ─── Helpers ─── */
function SliderField({ label, value, onChange, min = 0, max = 100, step = 1, suffix = '' }) {
  return (
    <label className="nb-slider-field">
      <span>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
        <span className="nb-slider-val">{value}{suffix}</span>
      </div>
    </label>
  );
}

export default function RtpStatsConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const currentStyle = c.displayStyle || 'v1';
  const { set, setMulti } = makePerStyleSetters(onChange, c, currentStyle, RTP_STATS_STYLE_KEYS);
  const [activeTab, setActiveTab] = useState('visibility');

  /* ─── Check if bonus hunt widget exists ─── */
  const bhWidget = (allWidgets || []).find(w => w.widget_type === 'bonus_hunt');
  const bhConfig = bhWidget?.config || {};

  /* ─── Navbar sync ─── */
  const navbarConfig = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;

  const syncFromNavbar = () => {
    if (!navbarConfig) return;
    const nb = navbarConfig;
    setMulti({
      barBgFrom: nb.bgColor || '#111827',
      barBgVia: nb.bgColor || '#1e3a5f',
      barBgTo: nb.bgColor || '#111827',
      borderColor: nb.accentColor || '#1d4ed8',
      textColor: nb.textColor || '#ffffff',
      providerColor: nb.textColor || '#ffffff',
      slotNameColor: nb.textColor || '#ffffff',
      fontFamily: nb.fontFamily || "'Inter', sans-serif",
      fontSize: nb.fontSize ?? 14,
    });
  };

  /* ─── Preset system ─── */
  const [presetName, setPresetName] = useState('');
  const PRESET_KEYS = [
    'barBgFrom', 'barBgVia', 'barBgTo', 'borderColor', 'borderWidth', 'borderRadius',
    'textColor', 'providerColor', 'slotNameColor', 'labelColor',
    'rtpIconColor', 'potentialIconColor', 'volatilityIconColor', 'bestWinIconColor', 'dividerColor', 'spinnerColor',
    'fontFamily', 'fontSize', 'providerFontSize', 'paddingX', 'paddingY',
    'showSpinner', 'showProvider', 'showRtp', 'showPotential', 'showVolatility', 'showBestWin',
    'brightness', 'contrast', 'saturation',
    'displayStyle',
  ];

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const snapshot = {};
    PRESET_KEYS.forEach(k => { if (c[k] !== undefined) snapshot[k] = c[k]; });
    const existing = c.rtpPresets || [];
    const idx = existing.findIndex(p => p.name === name);
    const updated = idx >= 0
      ? existing.map((p, i) => i === idx ? { name, values: snapshot, savedAt: Date.now() } : p)
      : [...existing, { name, values: snapshot, savedAt: Date.now() }];
    set('rtpPresets', updated);
    setPresetName('');
  };

  const loadPreset = (preset) => setMulti(preset.values);
  const deletePreset = (name) => set('rtpPresets', (c.rtpPresets || []).filter(p => p.name !== name));

  const tabs = [
    { id: 'visibility', label: '👁️ Visibility' },
    { id: 'style', label: '🎨 Style' },
    { id: 'layout', label: '📐 Layout' },
    { id: 'filters', label: '✨ Filters' },
    { id: 'presets', label: '💾 Presets' },
  ];

  return (
    <div className="bh-config">
      {/* Status indicator */}
      <div style={{
        padding: '8px 12px',
        borderRadius: 8,
        background: bhConfig.bonusOpening ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${bhConfig.bonusOpening ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        color: bhConfig.bonusOpening ? '#4ade80' : '#f87171',
        fontSize: 12,
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ fontSize: 10 }}>{bhConfig.bonusOpening ? '🟢' : '🔴'}</span>
        {bhConfig.bonusOpening
          ? `Bonus Opening ACTIVE — showing bar for: ${(bhConfig.bonuses || []).find(b => !b.opened)?.slotName || '(none)'}`
          : 'Bonus Opening not active — bar is hidden. Enable it in Bonus Hunt config.'}
      </div>

      {!bhWidget && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(251,191,36,0.15)',
          border: '1px solid rgba(251,191,36,0.3)',
          color: '#fbbf24',
          fontSize: 12,
          marginBottom: 8,
        }}>
          ⚠️ No Bonus Hunt widget found. Add one first — the RTP bar reads slot data from it.
        </div>
      )}

      {/* Tab nav */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} style={{ marginTop: 4 }} />

      {/* ═══════ VISIBILITY TAB ═══════ */}
      {activeTab === 'visibility' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Show / Hide Sections</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Toggle which info sections appear on the bar.
          </p>

          <label className="ov-chat-cfg-platform-header" style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <input type="checkbox" checked={!!c.previewMode} onChange={e => set('previewMode', e.target.checked)} />
            <span style={{ fontWeight: 600 }}>👁️ Always Show (Preview Mode)</span>
          </label>
          <p className="oc-config-hint" style={{ marginBottom: 12, marginTop: -4, fontSize: 11 }}>
            When ON, the bar always shows with demo data so you can position and style it.
            Turn OFF for live — bar will only appear during Bonus Opening.
          </p>

          <label className="ov-chat-cfg-platform-header" style={{ marginBottom: 6 }}>
            <input type="checkbox" checked={c.showProvider !== false} onChange={e => set('showProvider', e.target.checked)} />
            <span>Show Provider Name</span>
          </label>

          <label className="ov-chat-cfg-platform-header" style={{ marginBottom: 6 }}>
            <input type="checkbox" checked={c.showSpinner !== false} onChange={e => set('showSpinner', e.target.checked)} />
            <span>Show Spinner Icon</span>
          </label>

          <label className="ov-chat-cfg-platform-header" style={{ marginBottom: 6 }}>
            <input type="checkbox" checked={c.showRtp !== false} onChange={e => set('showRtp', e.target.checked)} />
            <span>Show RTP</span>
          </label>

          <label className="ov-chat-cfg-platform-header" style={{ marginBottom: 6 }}>
            <input type="checkbox" checked={c.showPotential !== false} onChange={e => set('showPotential', e.target.checked)} />
            <span>Show Potential (Max Win)</span>
          </label>

          <label className="ov-chat-cfg-platform-header" style={{ marginBottom: 6 }}>
            <input type="checkbox" checked={c.showVolatility !== false} onChange={e => set('showVolatility', e.target.checked)} />
            <span>Show Volatility</span>
          </label>

          <label className="ov-chat-cfg-platform-header" style={{ marginBottom: 6 }}>
            <input type="checkbox" checked={c.showBestWin !== false} onChange={e => set('showBestWin', e.target.checked)} />
            <span>Show Best Win (Personal Record)</span>
          </label>
        </div>
      )}

      {/* ═══════ STYLE TAB ═══════ */}
      {activeTab === 'style' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Colors & Fonts</h4>

          {navbarConfig && (
            <button className="nb-preset-load-btn" onClick={syncFromNavbar} style={{ marginBottom: 10, width: '100%' }}>
              🔗 Sync Colors from Navbar
            </button>
          )}

          <h5 style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Bar Background (Gradient)</h5>
          <div className="nb-color-grid">
            <ColorPicker label="From" value={c.barBgFrom || '#111827'} onChange={v => set('barBgFrom', v)} />
            <ColorPicker label="Via" value={c.barBgVia || '#1e3a5f'} onChange={v => set('barBgVia', v)} />
            <ColorPicker label="To" value={c.barBgTo || '#111827'} onChange={v => set('barBgTo', v)} />
          </div>

          <h5 style={{ color: '#94a3b8', fontSize: 11, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Border</h5>
          <div className="nb-color-grid">
            <ColorPicker label="Border" value={c.borderColor || '#1d4ed8'} onChange={v => set('borderColor', v)} />
            <ColorPicker label="Divider" value={c.dividerColor || '#3b82f6'} onChange={v => set('dividerColor', v)} />
          </div>

          <h5 style={{ color: '#94a3b8', fontSize: 11, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Text Colors</h5>
          <div className="nb-color-grid">
            <ColorPicker label="Text" value={c.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
            <ColorPicker label="Provider" value={c.providerColor || '#ffffff'} onChange={v => set('providerColor', v)} />
            <ColorPicker label="Slot Name" value={c.slotNameColor || '#ffffff'} onChange={v => set('slotNameColor', v)} />
            <ColorPicker label="Labels" value={c.labelColor || '#94a3b8'} onChange={v => set('labelColor', v)} />
          </div>

          <h5 style={{ color: '#94a3b8', fontSize: 11, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Icon Colors</h5>
          <div className="nb-color-grid">
            <ColorPicker label="RTP ⚡" value={c.rtpIconColor || '#60a5fa'} onChange={v => set('rtpIconColor', v)} />
            <ColorPicker label="Potential ⚡" value={c.potentialIconColor || '#facc15'} onChange={v => set('potentialIconColor', v)} />
            <ColorPicker label="Volatility ⚡" value={c.volatilityIconColor || '#3b82f6'} onChange={v => set('volatilityIconColor', v)} />
            <ColorPicker label="Best Win 🏆" value={c.bestWinIconColor || '#22c55e'} onChange={v => set('bestWinIconColor', v)} />
            <ColorPicker label="Spinner" value={c.spinnerColor || '#60a5fa'} onChange={v => set('spinnerColor', v)} />
          </div>

          <h5 style={{ color: '#94a3b8', fontSize: 11, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Typography</h5>
          <label className="nb-field">
            <span>Font Family</span>
            <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>

          <SliderField label="Font Size" value={c.fontSize ?? 14} onChange={v => set('fontSize', v)} min={8} max={24} suffix="px" />
          <SliderField label="Provider Font Size" value={c.providerFontSize ?? 16} onChange={v => set('providerFontSize', v)} min={10} max={32} suffix="px" />

          <h4 className="nb-subtitle" style={{ marginTop: 18 }}>Custom CSS</h4>
          <p className="oc-config-hint" style={{ marginBottom: 6, fontSize: 11 }}>Override styles for this widget in OBS.</p>
          <textarea
            className="oc-widget-css-input"
            value={c.custom_css || ''}
            onChange={e => set('custom_css', e.target.value)}
            rows={4}
            placeholder={`/* custom CSS for this widget */`}
            spellCheck={false}
          />
        </div>
      )}

      {/* ═══════ LAYOUT TAB ═══════ */}
      {activeTab === 'layout' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Spacing & Dimensions</h4>

          <SliderField label="Border Width" value={c.borderWidth ?? 1} onChange={v => set('borderWidth', v)} min={0} max={6} suffix="px" />
          <SliderField label="Border Radius" value={c.borderRadius ?? 8} onChange={v => set('borderRadius', v)} min={0} max={24} suffix="px" />
          <SliderField label="Padding X" value={c.paddingX ?? 16} onChange={v => set('paddingX', v)} min={4} max={48} suffix="px" />
          <SliderField label="Padding Y" value={c.paddingY ?? 8} onChange={v => set('paddingY', v)} min={2} max={32} suffix="px" />
        </div>
      )}

      {/* ═══════ FILTERS TAB ═══════ */}
      {activeTab === 'filters' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Image Filters</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>Adjust brightness, contrast and saturation of the entire bar.</p>
          <SliderField label="Brightness" value={c.brightness ?? 100} onChange={v => set('brightness', v)} min={20} max={200} suffix="%" />
          <SliderField label="Contrast" value={c.contrast ?? 100} onChange={v => set('contrast', v)} min={20} max={200} suffix="%" />
          <SliderField label="Saturation" value={c.saturation ?? 100} onChange={v => set('saturation', v)} min={0} max={200} suffix="%" />

          <button className="nb-preset-load-btn" style={{ marginTop: 10 }}
            onClick={() => setMulti({ brightness: 100, contrast: 100, saturation: 100 })}>
            Reset Filters
          </button>
        </div>
      )}

      {/* ═══════ PRESETS TAB ═══════ */}
      {activeTab === 'presets' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Presets</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>Save and load style presets for the RTP bar.</p>

          <div className="nb-preset-save-row">
            <input className="nb-preset-input"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="Preset name…"
              maxLength={30}
              onKeyDown={e => e.key === 'Enter' && savePreset()} />
            <button className="nb-preset-save-btn" onClick={savePreset} disabled={!presetName.trim()}>💾 Save</button>
          </div>

          {(c.rtpPresets || []).length === 0 ? (
            <p className="oc-config-hint" style={{ marginTop: 8, opacity: 0.6 }}>No saved presets yet.</p>
          ) : (
            <div className="nb-preset-list" style={{ marginTop: 8 }}>
              {(c.rtpPresets || []).map(p => (
                <div key={p.name} className="nb-preset-pill">
                  <div className="nb-preset-pill__info">
                    <span className="nb-preset-pill__name">{p.name}</span>
                    <span className="nb-preset-pill__date">{new Date(p.savedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="nb-preset-pill__actions">
                    <button className="nb-preset-pill__load" onClick={() => loadPreset(p)}>Load</button>
                    <button className="nb-preset-pill__delete" onClick={() => deletePreset(p.name)} title="Delete preset">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
