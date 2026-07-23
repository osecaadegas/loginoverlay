import React, { useState } from 'react';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { RTP_STATS_STYLE_KEYS } from './styleKeysRegistry';
import TabBar from './shared/TabBar';

export default function RtpStatsConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const currentStyle = c.displayStyle || 'v1';
  const { set, setMulti } = makePerStyleSetters(onChange, c, currentStyle, RTP_STATS_STYLE_KEYS);
  const [activeTab, setActiveTab] = useState('visibility');

  /* ─── Check if bonus hunt widget exists ─── */
  const bhWidget = (allWidgets || []).find(w => w.widget_type === 'bonus_hunt');
  const bhConfig = bhWidget?.config || {};

  /* ─── Preset system ─── */
  const [presetName, setPresetName] = useState('');
  const PRESET_KEYS = [
    'rtpMetal',
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
    { id: 'presets', label: '💾 Presets' },
  ];
  const styleOptions = [
    { id: 'v1', icon: '📊', label: 'Classic' },
    { id: 'metal', icon: '⚙️', label: 'Metal' },
    { id: 'StyleSecaRTP', icon: '✦', label: 'StyleSeca' },
    { id: 'vertical', icon: '📋', label: 'Vertical' },
    { id: 'neon', icon: '💡', label: 'Neon' },
    { id: 'minimal', icon: '✦', label: 'Minimal' },
    { id: 'glass', icon: '🪟', label: 'Glass' },
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
          <h4 className="nb-subtitle">Display Style</h4>
          <div className="nb-style-toggle" style={{ marginBottom: 12 }}>
            {styleOptions.map(option => (
              <button
                key={option.id}
                type="button"
                className={`nb-style-btn${currentStyle === option.id ? ' nb-style-btn--active' : ''}`}
                onClick={() => set('displayStyle', option.id)}
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>

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
            <span>Show Provider Logo / Name</span>
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

      {/* ═══════ PRESETS TAB ═══════ */}
      {activeTab === 'presets' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Presets</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>Save and load presets for the RTP bar.</p>

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
