import React, { useState } from 'react';
import TabBar from './shared/TabBar';

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
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* ─── Content Tab ─── */}
      {activeTab === 'content' && (
        <div className="nb-section">
          {/* Spotify connection status — managed in Profile */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            borderRadius: 8, marginBottom: 4,
            background: isConnected ? 'rgba(29,185,84,0.06)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isConnected ? 'rgba(29,185,84,0.2)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? '#1DB954' : '#333', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: isConnected ? '#1DB954' : '#94a3b8', flex: 1 }}>
              {isConnected ? 'Spotify Connected' : 'Spotify Not Connected'}
            </span>
            <span style={{ fontSize: 10, color: '#64748b' }}>
              Managed in <b style={{ color: '#a78bfa' }}>Profile</b>
            </span>
          </div>

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
