import React, { useState } from 'react';

export default function SpotifyConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const [activeTab, setActiveTab] = useState('content');

  const TABS = [
    { id: 'content', label: '🎵 Content' },
    { id: 'style',   label: '🎨 Style' },
  ];

  const isConnected = !!c.spotify_access_token;

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

          {isConnected ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#1DB954' }}>✓ Connected</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>Managed in Profile</span>
            </div>
          ) : (
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                🎵 Connect Spotify in the <b style={{ color: '#e2e8f0' }}>Profile</b> section, then click <b style={{ color: '#e2e8f0' }}>Sync</b> to push tokens here.
              </p>
            </div>
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
