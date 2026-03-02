import React, { useState } from 'react';
import ColorPicker from './shared/ColorPicker';
import TabBar from './shared/TabBar';

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

export default function ChatConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [activeTab, setActiveTab] = useState('platforms');

  // ─── Navbar sync ───
  const navbarConfig = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;

  const syncFromNavbar = () => {
    if (!navbarConfig) return;
    const nb = navbarConfig;
    setMulti({
      bgColor: nb.bgColor || '#111318',
      textColor: nb.textColor || '#f1f5f9',
      headerBg: nb.bgColor || '#111318',
      headerText: nb.mutedColor || '#94a3b8',
      borderColor: nb.accentColor || '#f59e0b',
      fontFamily: nb.fontFamily || "'Inter', sans-serif",
      fontSize: nb.fontSize ?? 13,
    });
  };

  // ─── Preset system ───
  const [presetName, setPresetName] = useState('');
  const PRESET_KEYS = [
    'chatStyle', 'bgColor', 'textColor', 'headerBg', 'headerText', 'borderColor',
    'fontFamily', 'fontSize', 'useNativeColors', 'nameBold', 'msgLineHeight', 'msgPadH',
    'width', 'height', 'borderRadius', 'borderWidth', 'msgSpacing', 'maxMessages',
    'showHeader', 'showLegend', 'showBadges',
    'brightness', 'contrast', 'saturation',
    'raidBgColor', 'raidBorderColor', 'raidTextColor', 'showRaidAvatar',
  ];

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const snapshot = {};
    PRESET_KEYS.forEach(k => { if (c[k] !== undefined) snapshot[k] = c[k]; });
    const existing = c.chatPresets || [];
    const idx = existing.findIndex(p => p.name === name);
    const updated = idx >= 0
      ? existing.map((p, i) => i === idx ? { name, values: snapshot, savedAt: Date.now() } : p)
      : [...existing, { name, values: snapshot, savedAt: Date.now() }];
    set('chatPresets', updated);
    setPresetName('');
  };

  const loadPreset = (preset) => setMulti(preset.values);
  const deletePreset = (name) => set('chatPresets', (c.chatPresets || []).filter(p => p.name !== name));

  const tabs = [
    { id: 'platforms', label: '📡 Platforms' },
    { id: 'style', label: '🎨 Style' },
    { id: 'layout', label: '📐 Layout' },
    { id: 'filters', label: '✨ Filters' },
    { id: 'presets', label: '💾 Presets' },
  ];

  return (
    <div className="bh-config">
      {/* Tab nav */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} style={{ marginTop: 4 }} />

      {/* ═══════ PLATFORMS TAB ═══════ */}
      {activeTab === 'platforms' && (
        <div className="nb-section">

          <h4 className="nb-subtitle">Platforms & Channels</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Channel names are managed in your <b>Profile</b>. Click <b>Sync All</b> there to update.
          </p>

          {/* Twitch */}
          <div className="ov-chat-cfg-platform">
            <label className="ov-chat-cfg-platform-header">
              <span className="ov-chat-cfg-platform-dot" style={{ background: c.twitchChannel ? '#a855f7' : '#333' }} />
              <span>Twitch</span>
              {c.twitchChannel ? (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#a855f7', fontWeight: 600 }}>{c.twitchChannel}</span>
              ) : (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>Set in Profile</span>
              )}
            </label>
          </div>

          {/* YouTube */}
          <div className="ov-chat-cfg-platform">
            <label className="ov-chat-cfg-platform-header">
              <span className="ov-chat-cfg-platform-dot" style={{ background: c.youtubeVideoId ? '#ef4444' : '#333' }} />
              <span>YouTube</span>
              {c.youtubeVideoId ? (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{c.youtubeVideoId}</span>
              ) : (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>Set in Profile</span>
              )}
            </label>
          </div>

          {/* Kick */}
          <div className="ov-chat-cfg-platform">
            <label className="ov-chat-cfg-platform-header">
              <span className="ov-chat-cfg-platform-dot" style={{ background: c.kickChannelId ? '#22c55e' : '#333' }} />
              <span>Kick</span>
              {c.kickChannelId ? (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22c55e', fontWeight: 600 }}>{c.kickChannelId}</span>
              ) : (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>Set in Profile</span>
              )}
            </label>
          </div>

          {!c.twitchChannel && !c.kickChannelId && !c.youtubeVideoId && (
            <p className="oc-config-hint" style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
              ⚠️ No platforms configured — go to Profile and add your channels, then Sync.
            </p>
          )}

          <h4 className="nb-subtitle">Display</h4>
          {(c.chatStyle || 'classic') === 'classic' && (
            <>
              <label className="ov-chat-cfg-platform-header" style={{ gap: 8 }}>
                <input type="checkbox" checked={c.showHeader !== false} onChange={e => set('showHeader', e.target.checked)} />
                <span>Show Header Bar</span>
              </label>
              <label className="ov-chat-cfg-platform-header" style={{ gap: 8 }}>
                <input type="checkbox" checked={c.showLegend !== false} onChange={e => set('showLegend', e.target.checked)} />
                <span>Show Platform Legend</span>
              </label>
              <label className="ov-chat-cfg-platform-header" style={{ gap: 8 }}>
                <input type="checkbox" checked={c.showBadges !== false} onChange={e => set('showBadges', e.target.checked)} />
                <span>Show Platform Badges</span>
              </label>
            </>
          )}
          <label className="ov-chat-cfg-platform-header" style={{ gap: 8 }}>
            <input type="checkbox" checked={!!c.useNativeColors} onChange={e => set('useNativeColors', e.target.checked)} />
            <span>Use Native Username Colors</span>
          </label>
          <label className="ov-chat-cfg-platform-header" style={{ gap: 8 }}>
            <input type="checkbox" checked={c.nameBold !== false} onChange={e => set('nameBold', e.target.checked)} />
            <span>Bold Usernames</span>
          </label>
        </div>
      )}

      {/* ═══════ STYLE TAB ═══════ */}
      {activeTab === 'style' && (
        <div className="nb-section">
          {navbarConfig && (
            <button className="oc-btn oc-btn--sm oc-btn--primary" style={{ marginBottom: 12, width: '100%' }} onClick={syncFromNavbar}>
              🔗 Sync Colors from Navbar
            </button>
          )}

          <h4 className="nb-subtitle">Widget Colors</h4>
          <div className="nb-color-grid">
            <ColorPicker label="Background" value={c.bgColor || '#0f172a'} onChange={v => set('bgColor', v)} />
            <ColorPicker label="Text Color" value={c.textColor || '#e2e8f0'} onChange={v => set('textColor', v)} />
            <ColorPicker label="Border" value={c.borderColor || '#334155'} onChange={v => set('borderColor', v)} />
          </div>

          <h4 className="nb-subtitle">Header Colors</h4>
          <div className="nb-color-grid">
            <ColorPicker label="Header BG" value={c.headerBg || '#1e293b'} onChange={v => set('headerBg', v)} />
            <ColorPicker label="Header Text" value={c.headerText || '#94a3b8'} onChange={v => set('headerText', v)} />
          </div>

          <h4 className="nb-subtitle">Raid Highlight</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Customize how incoming raid events appear in chat.
          </p>
          <div className="nb-color-grid">
            <ColorPicker label="Raid BG" value={c.raidBgColor || '#7c3aed'} onChange={v => set('raidBgColor', v)} />
            <ColorPicker label="Raid Border" value={c.raidBorderColor || '#a855f7'} onChange={v => set('raidBorderColor', v)} />
            <ColorPicker label="Raid Text" value={c.raidTextColor || '#ffffff'} onChange={v => set('raidTextColor', v)} />
          </div>
          <label className="ov-chat-cfg-platform-header" style={{ gap: 8, marginTop: 6 }}>
            <input type="checkbox" checked={c.showRaidAvatar !== false} onChange={e => set('showRaidAvatar', e.target.checked)} />
            <span>Show Raider's Avatar</span>
          </label>

          <h4 className="nb-subtitle">Typography</h4>
          <label className="nb-field">
            <span>Font Family</span>
            <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <SliderField label="Font Size" value={c.fontSize ?? 13} min={8} max={24} step={1} unit="px"
            onChange={v => set('fontSize', v)} />

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
          <h4 className="nb-subtitle">Dimensions</h4>
          <SliderField label="Width" value={c.width ?? 350} min={150} max={800} step={10} unit="px"
            onChange={v => set('width', v)} />
          <SliderField label="Height" value={c.height ?? 500} min={150} max={1200} step={10} unit="px"
            onChange={v => set('height', v)} />
          <SliderField label="Border Radius" value={c.borderRadius ?? 12} min={0} max={50} step={1} unit="px"
            onChange={v => set('borderRadius', v)} />
          <SliderField label="Border Width" value={c.borderWidth ?? 1} min={0} max={8} step={1} unit="px"
            onChange={v => set('borderWidth', v)} />

          <h4 className="nb-subtitle">Messages</h4>
          <SliderField label="Msg Spacing" value={c.msgSpacing ?? 2} min={0} max={16} step={1} unit="px"
            onChange={v => set('msgSpacing', v)} />
          <SliderField label="Msg Padding" value={c.msgPadH ?? 10} min={4} max={30} step={1} unit="px"
            onChange={v => set('msgPadH', v)} />
          <SliderField label="Line Height" value={c.msgLineHeight ?? 1.45} min={1} max={2.5} step={0.05} unit=""
            onChange={v => set('msgLineHeight', v)} />
          <SliderField label="Max Messages" value={c.maxMessages ?? 50} min={5} max={200} step={5} unit=""
            onChange={v => set('maxMessages', v)} />
        </div>
      )}

      {/* ═══════ FILTERS TAB ═══════ */}
      {activeTab === 'filters' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Image Filters</h4>
          <p className="oc-config-hint" style={{ marginBottom: 12 }}>
            Adjust the overall look of the chat widget on the OBS overlay.
          </p>
          <SliderField label="Brightness" value={c.brightness ?? 100} min={0} max={200} step={1} unit="%"
            onChange={v => set('brightness', v)} />
          <SliderField label="Contrast" value={c.contrast ?? 100} min={0} max={200} step={1} unit="%"
            onChange={v => set('contrast', v)} />
          <SliderField label="Saturation" value={c.saturation ?? 100} min={0} max={200} step={1} unit="%"
            onChange={v => set('saturation', v)} />

          <button className="oc-btn oc-btn--sm" style={{ marginTop: 12 }}
            onClick={() => setMulti({ brightness: 100, contrast: 100, saturation: 100 })}>
            Reset Filters
          </button>
        </div>
      )}

      {/* ═══════ PRESETS TAB ═══════ */}
      {activeTab === 'presets' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Save Current Style</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Save your current colors, fonts, dimensions and filters as a reusable preset.
          </p>
          <div className="nb-preset-save-row">
            <input
              className="nb-preset-input"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="Preset name..."
              maxLength={30}
              onKeyDown={e => e.key === 'Enter' && savePreset()}
            />
            <button className="nb-preset-save-btn" onClick={savePreset} disabled={!presetName.trim()}>
              💾 Save
            </button>
          </div>

          <h4 className="nb-subtitle">Saved Presets</h4>
          {(!c.chatPresets || c.chatPresets.length === 0) ? (
            <p className="oc-config-hint">No presets saved yet. Customize your style and save it above.</p>
          ) : (
            <div className="nb-preset-list">
              {c.chatPresets.map(p => (
                <div key={p.name} className="nb-preset-pill">
                  <div className="nb-preset-pill__info">
                    <span className="nb-preset-pill__name">{p.name}</span>
                    <span className="nb-preset-pill__date">
                      {p.savedAt ? new Date(p.savedAt).toLocaleDateString() : ''}
                    </span>
                    <div className="nb-preset-pill__swatches">
                      {['bgColor', 'headerBg', 'textColor', 'borderColor'].map(k =>
                        p.values[k] ? (
                          <span key={k} className="nb-preset-pill__swatch" style={{ background: p.values[k] }} title={k} />
                        ) : null
                      )}
                    </div>
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

/* ─── Helper: SliderField ─── */
function SliderField({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="nb-slider-field">
      <div className="nb-slider-head">
        <span>{label}</span>
        <span className="nb-slider-val">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}
