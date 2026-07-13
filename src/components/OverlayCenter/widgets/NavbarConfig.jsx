import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { NAVBAR_STYLE_KEYS } from './styleKeysRegistry';
import TabBar from './shared/TabBar';

const DEFAULT_SECTION_LAYOUT = [
  { id: 'identity', zone: 'left' },
  { id: 'badge', zone: 'left' },
  { id: 'clock', zone: 'center' },
  { id: 'nowPlaying', zone: 'center' },
  { id: 'crypto', zone: 'right' },
  { id: 'cta', zone: 'right' },
  { id: 'balance', zone: 'right' },
  { id: 'casino', zone: 'right' },
];

const SECTION_LABELS = {
  identity: '👤 Identity',
  badge: '🏅 Badge',
  clock: '🕐 Clock',
  nowPlaying: '🎵 Now Playing',
  crypto: '📈 Crypto',
  cta: '📢 CTA',
  balance: '💰 Balance',
  casino: '🎰 Casino',
};

export default function NavbarConfig({ config, onChange }) {
  const c = config || {};
  const { user } = useAuth();
  const currentStyle = c.displayStyle || 'v1';
  const { set, setMulti } = makePerStyleSetters(onChange, c, currentStyle, NAVBAR_STYLE_KEYS);
  const [activeTab, setActiveTab] = useState('setup');

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



  // ─── Section layout helpers ───
  const sectionLayout = (c.sectionLayout || DEFAULT_SECTION_LAYOUT).filter(s => s.id !== 'socials');
  const setLayout = (newLayout) => set('sectionLayout', newLayout.filter(s => s.id !== 'socials'));

  const setSectionZone = (sectionId, newZone) => {
    const updated = sectionLayout.map(s => s.id === sectionId ? { ...s, zone: newZone } : s);
    setLayout(updated);
  };

  const moveSectionUp = (sectionId) => {
    const idx = sectionLayout.findIndex(s => s.id === sectionId);
    if (idx <= 0) return;
    const item = sectionLayout[idx];
    // Find previous item in same zone
    let prevIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (sectionLayout[i].zone === item.zone) { prevIdx = i; break; }
    }
    if (prevIdx === -1) return;
    const updated = [...sectionLayout];
    updated.splice(idx, 1);
    updated.splice(prevIdx, 0, item);
    setLayout(updated);
  };

  const moveSectionDown = (sectionId) => {
    const idx = sectionLayout.findIndex(s => s.id === sectionId);
    if (idx === -1 || idx >= sectionLayout.length - 1) return;
    const item = sectionLayout[idx];
    // Find next item in same zone
    let nextIdx = -1;
    for (let i = idx + 1; i < sectionLayout.length; i++) {
      if (sectionLayout[i].zone === item.zone) { nextIdx = i; break; }
    }
    if (nextIdx === -1) return;
    const updated = [...sectionLayout];
    updated.splice(idx, 1);
    updated.splice(nextIdx, 0, item);
    setLayout(updated);
  };

  // ─── Preset system ───
  const [presetName, setPresetName] = useState('');
  const PRESET_KEYS = [
    'accentColor', 'bgColor', 'textColor', 'mutedColor', 'ctaColor',
    'cryptoUpColor', 'cryptoDownColor', 'fontFamily', 'fontSize',
    'barHeight', 'borderWidth', 'borderRadius', 'maxWidth',
    'brightness', 'contrast', 'saturation',
    'showAvatar', 'showClock', 'showNowPlaying', 'showCrypto', 'showCTA',
    'showStartBalance', 'showCasino',
    'cryptoDisplayMode', 'ctaText', 'motto', 'badgeImage',
    'avatarSize', 'badgeSize',
    'displayStyle', 'musicDisplayStyle',
    'startBalance', 'balanceCurrency',
    'casinoName', 'casinoLogoUrl',
    'sectionLayout',
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
    { id: 'presets', label: '💾 Presets' },
  ];

  return (
    <div className="nb-config">
      {/* Tab nav */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

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
          <label className="nb-toggle-row">
            <input type="checkbox" checked={!!c.showStartBalance} onChange={e => set('showStartBalance', e.target.checked)} />
            <span>Show Start Balance</span>
          </label>
          <label className="nb-toggle-row">
            <input type="checkbox" checked={!!c.showCasino} onChange={e => set('showCasino', e.target.checked)} />
            <span>Show Casino</span>
          </label>

          {c.showCTA && (
            <label className="nb-field" style={{ marginTop: 6 }}>
              <span>CTA Text</span>
              <input value={c.ctaText || ''} onChange={e => set('ctaText', e.target.value)} placeholder="Be Gamble Aware!" />
            </label>
          )}

          {/* ─── Start ─── */}
          {c.showStartBalance && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Start</h4>
              <label className="nb-field">
                <span>Value</span>
                <input type="number" min="0" step="0.01" value={c.startBalance || ''} onChange={e => set('startBalance', e.target.value)} placeholder="1000" />
              </label>
              <label className="nb-field">
                <span>Currency</span>
                <select value={c.balanceCurrency || '€'} onChange={e => set('balanceCurrency', e.target.value)}>
                  <option value="€">€ EUR</option>
                  <option value="zł">zł PLN</option>
                  <option value="$">$ USD</option>
                </select>
              </label>
            </>
          )}

          {/* ─── Casino ─── */}
          {c.showCasino && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Casino</h4>
              <label className="nb-field">
                <span>Casino Name</span>
                <input value={c.casinoName || ''} onChange={e => set('casinoName', e.target.value)} placeholder="Stake" />
              </label>
              <label className="nb-field">
                <span>Casino Logo URL</span>
                <input value={c.casinoLogoUrl || ''} onChange={e => set('casinoLogoUrl', e.target.value)} placeholder="https://..." />
              </label>
            </>
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

              <p className="nb-muted" style={{ fontSize: 12, marginTop: 8 }}>
                All top 15 cryptocurrencies cycle automatically.
              </p>
            </>
          )}
        </div>
      )}

      {/* ═══════ LAYOUT TAB — section arrangement ═══════ */}
      {activeTab === 'layout' && (
        <div className="nb-section">
          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Arrange Sections</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Drag sections between Left, Center and Right. Use arrows to reorder.
          </p>
          {['left', 'center', 'right'].map(zone => {
            const zoneSections = sectionLayout.filter(s => s.zone === zone);
            return (
              <div key={zone} style={{
                marginBottom: 12, padding: '8px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: zone === 'left' ? '#60a5fa' : zone === 'center' ? '#94a3b8' : '#34d399',
                  marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {zone === 'left' ? '← Left Zone' : zone === 'center' ? '◆ Center Zone' : '→ Right Zone'}
                </div>
                {zoneSections.length === 0 && (
                  <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', padding: '6px 0' }}>No sections — drop one here</div>
                )}
                {zoneSections.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', marginBottom: 3,
                    borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                      {SECTION_LABELS[s.id] || s.id}
                    </span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[
                        { z: 'left', label: 'L', color: '#60a5fa' },
                        { z: 'center', label: 'C', color: '#94a3b8' },
                        { z: 'right', label: 'R', color: '#34d399' },
                      ].map(({ z, label, color }) => (
                        <button key={z} type="button"
                          onClick={() => setSectionZone(s.id, z)}
                          title={`Move to ${z}`}
                          style={{
                            width: 26, height: 24, fontSize: 10, fontWeight: 800,
                            borderRadius: 5,
                            border: s.zone === z ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.12)',
                            cursor: 'pointer',
                            background: s.zone === z ? `${color}22` : 'rgba(255,255,255,0.04)',
                            color: s.zone === z ? color : '#94a3b8',
                            transition: 'all 0.15s ease',
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 3, marginLeft: 2 }}>
                      <button type="button" onClick={() => moveSectionUp(s.id)} title="Move up"
                        style={{
                          width: 26, height: 24, fontSize: 13, fontWeight: 700,
                          borderRadius: 5, border: '1px solid rgba(255,255,255,0.15)',
                          cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>▲</button>
                      <button type="button" onClick={() => moveSectionDown(s.id)} title="Move down"
                        style={{
                          width: 26, height: 24, fontSize: 13, fontWeight: 700,
                          borderRadius: 5, border: '1px solid rgba(255,255,255,0.15)',
                          cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>▼</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          <button type="button" className="oc-btn oc-btn--sm" style={{ marginTop: 4 }}
            onClick={() => setLayout(DEFAULT_SECTION_LAYOUT)}>
            ↺ Reset Layout
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
