import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

const AVAILABLE_CRYPTOS = [
  { id: 'btc', label: 'Bitcoin (BTC)' },
  { id: 'eth', label: 'Ethereum (ETH)' },
  { id: 'sol', label: 'Solana (SOL)' },
  { id: 'bnb', label: 'BNB' },
  { id: 'xrp', label: 'XRP' },
  { id: 'ada', label: 'Cardano (ADA)' },
  { id: 'doge', label: 'Dogecoin (DOGE)' },
  { id: 'dot', label: 'Polkadot (DOT)' },
  { id: 'avax', label: 'Avalanche (AVAX)' },
  { id: 'matic', label: 'Polygon (MATIC)' },
  { id: 'ltc', label: 'Litecoin (LTC)' },
  { id: 'link', label: 'Chainlink (LINK)' },
];

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Bebas Neue', cursive", label: 'Bebas Neue' },
  { value: "'Press Start 2P', cursive", label: 'Press Start 2P' },
];

export default function NavbarConfig({ config, onChange }) {
  const c = config || {};
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('setup');

  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });

  // Twitch info
  const isTwitch = user?.app_metadata?.provider === 'twitch';
  const twitchName = user?.user_metadata?.preferred_username || user?.user_metadata?.full_name || '';
  const twitchDisplayName = user?.user_metadata?.full_name || twitchName;
  const twitchAvatar = user?.user_metadata?.avatar_url || '';

  // Auto-fill on first load
  useEffect(() => {
    if (isTwitch && !c.streamerName && twitchDisplayName) {
      setMulti({
        streamerName: twitchDisplayName,
        twitchUsername: twitchName,
        avatarUrl: twitchAvatar,
      });
    }
  }, [isTwitch, twitchDisplayName]);

  const syncFromTwitch = () => {
    if (!isTwitch) return;
    setMulti({
      streamerName: twitchDisplayName,
      twitchUsername: twitchName,
      avatarUrl: twitchAvatar,
    });
  };



  const toggleCrypto = (id) => {
    const current = c.cryptoCoins || [];
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    set('cryptoCoins', next);
  };

  // ─── Preset system ───
  const [presetName, setPresetName] = useState('');
  const PRESET_KEYS = [
    'accentColor', 'bgColor', 'textColor', 'mutedColor', 'ctaColor',
    'cryptoUpColor', 'cryptoDownColor', 'fontFamily', 'fontSize',
    'barHeight', 'borderWidth', 'borderRadius', 'maxWidth',
    'brightness', 'contrast', 'saturation',
    'shadowSize', 'shadowIntensity',
    'showAvatar', 'showClock', 'showNowPlaying', 'showCrypto', 'showCTA',
    'cryptoCoins', 'cryptoDisplayMode', 'ctaText', 'motto', 'badgeImage',
    'avatarSize', 'badgeSize',
    'displayStyle', 'musicDisplayStyle',
  ];

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const snapshot = {};
    PRESET_KEYS.forEach(k => { if (c[k] !== undefined) snapshot[k] = c[k]; });
    const existing = c.savedPresets || [];
    const idx = existing.findIndex(p => p.name === name);
    const updated = idx >= 0
      ? existing.map((p, i) => i === idx ? { name, values: snapshot, savedAt: Date.now() } : p)
      : [...existing, { name, values: snapshot, savedAt: Date.now() }];
    set('savedPresets', updated);
    setPresetName('');
  };

  const loadPreset = (preset) => {
    setMulti(preset.values);
  };

  const deletePreset = (name) => {
    const updated = (c.savedPresets || []).filter(p => p.name !== name);
    set('savedPresets', updated);
  };

  const tabs = [
    { id: 'setup', label: '⚡ Setup' },
    { id: 'layout', label: '📐 Layout' },
    { id: 'colors', label: '🎨 Colors' },
    { id: 'presets', label: '💾 Presets' },
  ];

  return (
    <div className="nb-config">
      {/* Tab nav */}
      <div className="nb-tabs">
        {tabs.map(t => (
          <button key={t.id}
            className={`nb-tab ${activeTab === t.id ? 'nb-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ SETUP TAB — get your navbar working fast ═══════ */}
      {activeTab === 'setup' && (
        <div className="nb-section">
          {/* Display Style Toggle */}
          <h4 className="nb-subtitle">Display Style</h4>
          <div className="nb-style-toggle">
            <button type="button"
              className={`nb-style-btn${(!c.displayStyle || c.displayStyle === 'v1') ? ' nb-style-btn--active' : ''}`}
              onClick={() => set('displayStyle', 'v1')}>
              📌 Classic
            </button>
            <button type="button"
              className={`nb-style-btn${c.displayStyle === 'metallic' ? ' nb-style-btn--active' : ''}`}
              onClick={() => set('displayStyle', 'metallic')}>
              ⚙️ Metallic
            </button>
          </div>

          {/* Twitch sync */}
          {isTwitch && (
            <div className="oc-twitch-info" style={{ marginBottom: 12 }}>
              {twitchAvatar && <img src={twitchAvatar} alt="" className="oc-twitch-avatar" />}
              <div className="oc-twitch-details">
                <span className="oc-twitch-name">{twitchDisplayName}</span>
                <span className="oc-twitch-badge">Twitch</span>
              </div>
              <button type="button" className="oc-btn oc-btn--sm oc-btn--primary" onClick={syncFromTwitch}>Sync</button>
            </div>
          )}
          {!isTwitch && (
            <p className="oc-config-hint" style={{ color: '#f59e0b', marginBottom: 12 }}>
              Log in with Twitch to auto-fill your name and avatar.
            </p>
          )}

          <h4 className="nb-subtitle">Streamer Info</h4>
          <label className="nb-field">
            <span>Name</span>
            <input value={c.streamerName || ''} onChange={e => set('streamerName', e.target.value)} placeholder="Your name" />
          </label>
          <label className="nb-field">
            <span>Motto</span>
            <input value={c.motto || ''} onChange={e => set('motto', e.target.value)} placeholder="Just Content" />
          </label>

          <h4 className="nb-subtitle">Badge Image</h4>
          <p className="oc-config-hint" style={{ marginBottom: 6 }}>Shows next to your name &amp; motto.</p>
          <div className="nb-badge-grid">
            {[
              { value: '', label: 'None' },
              { value: '/badges/content.png', label: 'Content' },
              { value: '/badges/raw.png', label: 'Raw' },
              { value: '/badges/wager.png', label: 'Wager' },
            ].map(b => (
              <button key={b.value}
                className={`nb-badge-option ${(c.badgeImage || '') === b.value ? 'nb-badge-option--active' : ''}`}
                onClick={() => set('badgeImage', b.value)}>
                {b.value ? (
                  <img src={b.value} alt={b.label} className="nb-badge-preview" />
                ) : (
                  <span className="nb-badge-none">✕</span>
                )}
                <span>{b.label}</span>
              </button>
            ))}
          </div>

          <h4 className="nb-subtitle">Sections</h4>
          <label className="nb-toggle-row">
            <input type="checkbox" checked={c.showAvatar !== false} onChange={e => set('showAvatar', e.target.checked)} />
            <span>Show Avatar</span>
          </label>
          <label className="nb-toggle-row">
            <input type="checkbox" checked={c.showClock !== false} onChange={e => set('showClock', e.target.checked)} />
            <span>Show Clock</span>
          </label>
          <label className="nb-toggle-row">
            <input type="checkbox" checked={!!c.showNowPlaying} onChange={e => set('showNowPlaying', e.target.checked)} />
            <span>Show Now Playing</span>
          </label>
          <label className="nb-toggle-row">
            <input type="checkbox" checked={!!c.showCrypto} onChange={e => set('showCrypto', e.target.checked)} />
            <span>Show Crypto Ticker</span>
          </label>
          <label className="nb-toggle-row">
            <input type="checkbox" checked={!!c.showCTA} onChange={e => set('showCTA', e.target.checked)} />
            <span>Show CTA Badge</span>
          </label>

          {c.showCTA && (
            <label className="nb-field" style={{ marginTop: 6 }}>
              <span>CTA Text</span>
              <input value={c.ctaText || ''} onChange={e => set('ctaText', e.target.value)} placeholder="Be Gamble Aware!" />
            </label>
          )}

          {/* ─── Spotify status (connect via Profile) ─── */}
          {c.showNowPlaying && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>🎵 Music Source</h4>
              <div className="nb-spotify-section">
                {c.spotify_access_token ? (
                  <div className="nb-spotify-connected">
                    <span className="nb-spotify-status">✅ Spotify Connected</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Managed in Profile</span>
                  </div>
                ) : (
                  <div className="nb-spotify-connect-card">
                    <div className="nb-spotify-connect-info">
                      <span className="nb-spotify-connect-icon">🎵</span>
                      <div>
                        <strong>Spotify</strong>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Connect via <b>Profile</b> section, then click <b>Sync</b></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Music display style */}
              <h4 className="nb-subtitle" style={{ marginTop: 10 }}>Music Display</h4>
              <div className="nb-music-styles">
                {[
                  { id: 'text',      icon: '📝', label: 'Text' },
                  { id: 'pill',      icon: '💊', label: 'Pill' },
                  { id: 'marquee',   icon: '📜', label: 'Marquee' },
                  { id: 'albumart',  icon: '🖼️', label: 'Album Art' },
                  { id: 'equalizer', icon: '🎛️', label: 'Equalizer' },
                  { id: 'vinyl',     icon: '💿', label: 'Vinyl' },
                  { id: 'minimal',   icon: '✦', label: 'Minimal' },
                  { id: 'wave',      icon: '〰️', label: 'Wave' },
                ].map(s => (
                  <button key={s.id}
                    className={`nb-music-style-btn${(c.musicDisplayStyle || 'text') === s.id ? ' nb-music-style-btn--active' : ''}`}
                    onClick={() => set('musicDisplayStyle', s.id)}>
                    <span className="nb-music-style-icon">{s.icon}</span>
                    <span className="nb-music-style-label">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Manual fallback */}
              <h4 className="nb-subtitle" style={{ marginTop: 10 }}>{c.spotify_access_token ? 'Manual Fallback' : 'Manual Track'}</h4>
              <p className="oc-config-hint" style={{ margin: '0 0 6px' }}>
                {c.spotify_access_token ? 'Shown when Spotify isn\'t playing.' : 'Type the artist & track to display.'}
              </p>
              <label className="nb-field">
                <span>Artist</span>
                <input value={c.manualArtist || ''} onChange={e => set('manualArtist', e.target.value)} placeholder="Red Hot Chili Peppers" />
              </label>
              <label className="nb-field">
                <span>Track</span>
                <input value={c.manualTrack || ''} onChange={e => set('manualTrack', e.target.value)} placeholder="Dark Necessities" />
              </label>
            </>
          )}

          {/* ─── Crypto coins (inline) ─── */}
          {c.showCrypto && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Crypto Transition</h4>
              <div className="nb-radio-row" style={{ flexWrap: 'wrap', gap: '8px 16px' }}>
                {[
                  { value: 'horizontal', label: 'Slide Left' },
                  { value: 'carousel', label: 'Slide Up' },
                  { value: 'fade', label: 'Fade' },
                ].map(m => (
                  <label key={m.value} className="nb-radio">
                    <input type="radio" name="cryptoMode" value={m.value}
                      checked={(c.cryptoDisplayMode || 'horizontal') === m.value}
                      onChange={() => set('cryptoDisplayMode', m.value)} />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>

              <h4 className="nb-subtitle">Crypto Coins</h4>
              <div className="nb-crypto-grid">
                {AVAILABLE_CRYPTOS.map(coin => (
                  <label key={coin.id} className="nb-crypto-chip">
                    <input type="checkbox"
                      checked={(c.cryptoCoins || []).includes(coin.id)}
                      onChange={() => toggleCrypto(coin.id)} />
                    <span>{coin.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════ LAYOUT TAB — sizing & typography ═══════ */}
      {activeTab === 'layout' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Dimensions</h4>
          <SliderField label="Bar Height" value={c.barHeight ?? 64} min={40} max={100} step={2} unit="px"
            onChange={v => set('barHeight', v)} />
          <SliderField label="Max Width" value={c.maxWidth ?? 1200} min={600} max={3840} step={10} unit="px"
            onChange={v => set('maxWidth', v)} />
          <SliderField label="Border Width" value={c.borderWidth ?? 3} min={0} max={8} step={1} unit="px"
            onChange={v => set('borderWidth', v)} />
          <SliderField label="Border Radius" value={c.borderRadius ?? 999} min={0} max={999} step={1} unit="px"
            onChange={v => set('borderRadius', v)} />

          <h4 className="nb-subtitle">Element Sizes</h4>
          <SliderField label="Avatar Size" value={c.avatarSize ?? 100} min={50} max={200} step={5} unit="%"
            onChange={v => set('avatarSize', v)} />
          <SliderField label="Badge Size" value={c.badgeSize ?? 100} min={50} max={200} step={5} unit="%"
            onChange={v => set('badgeSize', v)} />

          <h4 className="nb-subtitle">Typography</h4>
          <label className="nb-field">
            <span>Font</span>
            <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <SliderField label="Font Size" value={c.fontSize ?? 12} min={8} max={20} step={1} unit="px"
            onChange={v => set('fontSize', v)} />
        </div>
      )}

      {/* ═══════ COLORS TAB — colors, filters, custom CSS ═══════ */}
      {activeTab === 'colors' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Colors</h4>
          <div className="nb-color-grid">
            <ColorPicker label="Accent / Border" value={c.accentColor || '#f59e0b'} onChange={v => set('accentColor', v)} />
            <ColorPicker label="Background" value={c.bgColor || '#111318'} onChange={v => set('bgColor', v)} />
            <ColorPicker label="Text" value={c.textColor || '#f1f5f9'} onChange={v => set('textColor', v)} />
            <ColorPicker label="Muted Text" value={c.mutedColor || '#94a3b8'} onChange={v => set('mutedColor', v)} />
            <ColorPicker label="CTA Badge" value={c.ctaColor || '#f43f5e'} onChange={v => set('ctaColor', v)} />
            <ColorPicker label="Crypto Up" value={c.cryptoUpColor || '#34d399'} onChange={v => set('cryptoUpColor', v)} />
            <ColorPicker label="Crypto Down" value={c.cryptoDownColor || '#f87171'} onChange={v => set('cryptoDownColor', v)} />
          </div>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Filters</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Adjust the overall look of the navbar in OBS.
          </p>
          <SliderField label="Brightness" value={c.brightness ?? 100} min={0} max={200} step={1} unit="%"
            onChange={v => set('brightness', v)} />
          <SliderField label="Contrast" value={c.contrast ?? 100} min={0} max={200} step={1} unit="%"
            onChange={v => set('contrast', v)} />
          <SliderField label="Saturation" value={c.saturation ?? 100} min={0} max={200} step={1} unit="%"
            onChange={v => set('saturation', v)} />
          <button className="oc-btn oc-btn--sm" style={{ marginTop: 8 }}
            onClick={() => setMulti({ brightness: 100, contrast: 100, saturation: 100 })}>
            Reset Filters
          </button>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Custom CSS</h4>
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
          {(!c.savedPresets || c.savedPresets.length === 0) ? (
            <p className="oc-config-hint">No presets saved yet. Customize your style and save it above.</p>
          ) : (
            <div className="nb-preset-list">
              {c.savedPresets.map(p => (
                <div key={p.name} className="nb-preset-pill">
                  <div className="nb-preset-pill__info">
                    <span className="nb-preset-pill__name">{p.name}</span>
                    <span className="nb-preset-pill__date">
                      {p.savedAt ? new Date(p.savedAt).toLocaleDateString() : ''}
                    </span>
                    <div className="nb-preset-pill__swatches">
                      {['accentColor', 'bgColor', 'textColor', 'ctaColor'].map(k =>
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

/* ─── Reusable sub-components ─── */
function ColorPicker({ label, value, onChange }) {
  return (
    <div className="nb-color-field">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
      <div className="nb-color-info">
        <span className="nb-color-label">{label}</span>
        <code className="nb-color-hex">{value}</code>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="nb-slider-field">
      <span className="nb-slider-label">{label}</span>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(parseFloat(e.target.value))} />
      <span className="nb-slider-value">{value}{unit}</span>
    </div>
  );
}
