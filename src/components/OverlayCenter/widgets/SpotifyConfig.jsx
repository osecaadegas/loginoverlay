import React, { useState } from 'react';
import { startSpotifyAuth } from '../../../utils/spotifyAuth';

export default function SpotifyConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [activeTab, setActiveTab] = useState('content');
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState('');

  const TABS = [
    { id: 'content', label: '🎵 Content' },
    { id: 'style',   label: '🎨 Style' },
  ];

  const isConnected = !!c.spotify_access_token;

  const connectSpotify = async () => {
    setSpotifyLoading(true);
    setSpotifyError('');
    try {
      const tokens = await startSpotifyAuth();
      setMulti({
        spotify_access_token:  tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
        spotify_expires_at:    tokens.expires_at,
      });
    } catch (err) {
      setSpotifyError(err.message);
    } finally {
      setSpotifyLoading(false);
    }
  };

  const disconnectSpotify = () => {
    setMulti({
      spotify_access_token:  null,
      spotify_refresh_token: null,
      spotify_expires_at:    null,
    });
  };

  return (
    <div className="nb-config">
      <div className="nb-tabs">
        {TABS.map(t => (
          <button key={t.id}
            className={`nb-tab${activeTab === t.id ? ' nb-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Content Tab ─── */}
      {activeTab === 'content' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Spotify Connection</h4>

          {!isConnected ? (
            <button className="nb-spotify-btn nb-spotify-btn--connect"
              onClick={connectSpotify} disabled={spotifyLoading}>
              {spotifyLoading ? '⏳ Connecting…' : '🟢 Connect Spotify'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#1DB954' }}>✓ Connected</span>
              <button className="nb-spotify-btn nb-spotify-btn--disconnect"
                onClick={disconnectSpotify}>
                Disconnect
              </button>
            </div>
          )}

          {spotifyError && (
            <p style={{ fontSize: 11, color: '#ff4444', marginTop: 6 }}>{spotifyError}</p>
          )}

          <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Manual Fallback</h4>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
            Shows when Spotify is not connected or nothing is playing
          </p>
          <label className="nb-field">
            <span>Artist</span>
            <input value={c.manualArtist || ''} onChange={e => set('manualArtist', e.target.value)}
              placeholder="e.g. The Weeknd" />
          </label>
          <label className="nb-field">
            <span>Track</span>
            <input value={c.manualTrack || ''} onChange={e => set('manualTrack', e.target.value)}
              placeholder="e.g. Blinding Lights" />
          </label>
          <label className="nb-field">
            <span>Album Art URL</span>
            <input value={c.manualAlbumArt || ''} onChange={e => set('manualAlbumArt', e.target.value)}
              placeholder="https://..." />
          </label>
        </div>
      )}

      {/* ─── Style Tab ─── */}
      {activeTab === 'style' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Accent Color</h4>
          <label className="nb-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input type="color" value={c.accentColor || '#1DB954'}
              onChange={e => set('accentColor', e.target.value)}
              style={{ width: 36, height: 28, border: 'none', background: 'none', cursor: 'pointer' }} />
            <input value={c.accentColor || '#1DB954'}
              onChange={e => set('accentColor', e.target.value)}
              placeholder="#1DB954" style={{ flex: 1 }} />
          </label>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Custom CSS</h4>
          <textarea className="oc-widget-css-input"
            value={c.custom_css || ''}
            onChange={e => set('custom_css', e.target.value)}
            rows={4} placeholder={`/* custom CSS for this widget */`} spellCheck={false} />
        </div>
      )}
    </div>
  );
}
