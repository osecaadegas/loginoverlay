import React, { useState } from 'react';
import TabBar from './shared/TabBar';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { CHAT_STYLE_KEYS } from './styleKeysRegistry';
import useTwitchChannel from '../../../hooks/useTwitchChannel';

export default function ChatConfig({ config, onChange }) {
  const c = config || {};
  const currentStyle = c.chatStyle || 'classic';
  const { set, setMulti } = makePerStyleSetters(onChange, c, currentStyle, CHAT_STYLE_KEYS);
  const [activeTab, setActiveTab] = useState('platforms');
  const autoChannel = useTwitchChannel();

  // ─── Preset system ───
  const [presetName, setPresetName] = useState('');
  const PRESET_KEYS = [
    'chatStyle', 'bonusHuntColorSync', 'bgColor', 'textColor', 'headerBg', 'headerText', 'borderColor',
    'fontFamily', 'fontSize', 'useNativeColors', 'nameBold', 'msgLineHeight', 'msgPadH',
    'width', 'height', 'borderRadius', 'borderWidth', 'msgSpacing', 'maxMessages',
    'showHeader', 'showLegend', 'showBadges',
    'brightness', 'contrast', 'saturation',
    'raidBgColor', 'raidBorderColor', 'raidTextColor', 'showRaidAvatar',
    'cardBg', 'cardBorder', 'cardHoverBg', 'cardHoverBorder', 'cardTextColor',
    'headerBorder', 'headerChannelColor',
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
    { id: 'presets', label: '💾 Presets' },
  ];
  const styleOptions = [
    { id: 'classic', icon: '📺', label: 'Classic' },
    { id: 'glow_panel', icon: '💠', label: 'Glow Panel' },
    { id: 'metal', icon: '⚙️', label: 'Metal' },
    { id: 'StyleSecaChat', icon: '✦', label: 'StyleSeca' },
    { id: 'cards', icon: '🃏', label: 'Cards' },
    { id: 'floating', icon: '☁️', label: 'Floating' },
    { id: 'bubble', icon: '💬', label: 'Bubble' },
    { id: 'stack', icon: '📚', label: 'Stack' },
    { id: 'sidebar', icon: '📌', label: 'Sidebar' },
    { id: 'typewriter', icon: '⌨️', label: 'Terminal' },
    { id: 'bh_stats', icon: '🎰', label: 'Hunt' },
  ];

  return (
    <div className="bh-config">
      {/* Tab nav */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} style={{ marginTop: 4 }} />

      {/* ═══════ PLATFORMS TAB ═══════ */}
      {activeTab === 'platforms' && (
        <div className="nb-section">

          <h4 className="nb-subtitle">Display Style</h4>
          <div className="nb-style-toggle" style={{ marginBottom: 12 }}>
            {styleOptions.map(option => (
              <button
                key={option.id}
                type="button"
                className={`nb-style-btn${currentStyle === option.id ? ' nb-style-btn--active' : ''}`}
                onClick={() => set('chatStyle', option.id)}
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>

          <h4 className="nb-subtitle">Platforms & Channels</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Channel names are managed in your <b>Profile</b>. Click <b>Sync All</b> there to update.
          </p>

          {/* Twitch */}
          <div className="ov-chat-cfg-platform">
            <label className="ov-chat-cfg-platform-header">
              <span className="ov-chat-cfg-platform-dot" style={{ background: (c.twitchChannel || autoChannel) ? '#64748b' : '#333' }} />
              <span>Twitch</span>
              {(c.twitchChannel || autoChannel) ? (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{c.twitchChannel || autoChannel}</span>
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

          {!(c.twitchChannel || autoChannel) && !c.kickChannelId && !c.youtubeVideoId && (
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
          {(c.chatStyle) === 'cards' && (
            <>
              <label className="ov-chat-cfg-platform-header" style={{ gap: 8 }}>
                <input type="checkbox" checked={c.showHeader !== false} onChange={e => set('showHeader', e.target.checked)} />
                <span>Show Header Bar</span>
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
          <label className="ov-chat-cfg-platform-header" style={{ gap: 8 }}>
            <input type="checkbox" checked={c.showRaidAvatar !== false} onChange={e => set('showRaidAvatar', e.target.checked)} />
            <span>Show Raider's Avatar</span>
          </label>
          <SliderField label="Max Messages" value={c.maxMessages ?? 50} min={5} max={200} step={5} unit=""
            onChange={v => set('maxMessages', v)} />
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
