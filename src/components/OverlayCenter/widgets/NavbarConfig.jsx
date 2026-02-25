import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { startSpotifyAuth } from '../../../utils/spotifyAuth';

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
  const [activeTab, setActiveTab] = useState('content');
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState('');

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

  const connectSpotify = async () => {
    setSpotifyLoading(true);
    setSpotifyError('');
    try {
      const tokens = await startSpotifyAuth();
      setMulti({
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
        spotify_expires_at: tokens.expires_at,
        musicSource: 'spotify',
      });
    } catch (err) {
      setSpotifyError(err.message);
    } finally {
      setSpotifyLoading(false);
    }
  };

  const disconnectSpotify = () => {
    setMulti({
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_expires_at: null,
      musicSource: 'manual',
    });
  };

  const toggleCrypto = (id) => {
    const current = c.cryptoCoins || [];
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    set('cryptoCoins', next);
  };

  const tabs = [
    { id: 'content', label: '📋 Content', },
    { id: 'music', label: '🎵 Music' },
    { id: 'style', label: '🎨 Style' },
    { id: 'filters', label: '✨ Filters' },
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

      {/* ═══════ CONTENT TAB ═══════ */}
      {activeTab === 'content' && (
        <div className="nb-section">
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

          {c.showCrypto && (
            <>
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

      {/* ═══════ MUSIC TAB ═══════ */}
      {activeTab === 'music' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Music Source</h4>
          <div className="nb-radio-row">
            <label className="nb-radio">
              <input type="radio" name="musicSrc" value="manual"
                checked={c.musicSource !== 'spotify'} onChange={() => set('musicSource', 'manual')} />
              <span>Manual</span>
            </label>
            <label className="nb-radio">
              <input type="radio" name="musicSrc" value="spotify"
                checked={c.musicSource === 'spotify'} onChange={() => set('musicSource', 'spotify')} />
              <span>Spotify</span>
            </label>
          </div>

          {c.musicSource === 'spotify' ? (
            <div className="nb-spotify-section">
              {c.spotify_access_token ? (
                <div className="nb-spotify-connected">
                  <span className="nb-spotify-status">✅ Spotify Connected</span>
                  <button className="oc-btn oc-btn--sm oc-btn--danger" onClick={disconnectSpotify}>Disconnect</button>
                </div>
              ) : (
                <>
                  <button className="nb-spotify-btn" onClick={connectSpotify} disabled={spotifyLoading}>
                    {spotifyLoading ? 'Connecting...' : '🎵 Connect Spotify'}
                  </button>
                  {spotifyError && <p className="nb-error">{spotifyError}</p>}
                  <p className="oc-config-hint">
                    Requires VITE_SPOTIFY_CLIENT_ID env variable. Add your app's redirect URI as: {window.location.origin}/spotify-callback
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <h4 className="nb-subtitle">Manual Track Info</h4>
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
        </div>
      )}

      {/* ═══════ STYLE TAB ═══════ */}
      {activeTab === 'style' && (
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

          <h4 className="nb-subtitle">Typography</h4>
          <label className="nb-field">
            <span>Font</span>
            <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <SliderField label="Font Size" value={c.fontSize ?? 12} min={8} max={20} step={1} unit="px"
            onChange={v => set('fontSize', v)} />

          <h4 className="nb-subtitle">Dimensions</h4>
          <SliderField label="Bar Height" value={c.barHeight ?? 64} min={40} max={100} step={2} unit="px"
            onChange={v => set('barHeight', v)} />
          <SliderField label="Border Width" value={c.borderWidth ?? 3} min={0} max={8} step={1} unit="px"
            onChange={v => set('borderWidth', v)} />
          <SliderField label="Border Radius" value={c.borderRadius ?? 999} min={0} max={999} step={1} unit="px"
            onChange={v => set('borderRadius', v)} />
          <SliderField label="Max Width" value={c.maxWidth ?? 1200} min={600} max={3840} step={10} unit="px"
            onChange={v => set('maxWidth', v)} />
        </div>
      )}

      {/* ═══════ FILTERS TAB ═══════ */}
      {activeTab === 'filters' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Image Filters</h4>
          <p className="oc-config-hint" style={{ marginBottom: 12 }}>
            Adjust the overall look of the entire navbar on the OBS overlay.
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
