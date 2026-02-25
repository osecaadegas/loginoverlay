import React, { useState } from 'react';

const FONT_OPTIONS = [
  "'Inter', sans-serif",
  "'Roboto', sans-serif",
  "'Poppins', sans-serif",
  "'Montserrat', sans-serif",
  "'Fira Code', monospace",
  "'JetBrains Mono', monospace",
  "'Arial', sans-serif",
  "'Georgia', serif",
];

export default function ChatConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [expandedSection, setExpandedSection] = useState('platforms');

  // Find navbar widget config for sync
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

  const toggle = (section) => setExpandedSection(expandedSection === section ? '' : section);

  const Section = ({ id, icon, title, children }) => (
    <div className="ov-chat-cfg-section">
      <button className="ov-chat-cfg-section-toggle" onClick={() => toggle(id)}>
        <span>{icon} {title}</span>
        <span>{expandedSection === id ? '▾' : '▸'}</span>
      </button>
      {expandedSection === id && <div className="ov-chat-cfg-section-body">{children}</div>}
    </div>
  );

  return (
    <div className="ov-chat-cfg">
      {/* ─── Platforms ─── */}
      <Section id="platforms" icon="📡" title="Platforms & Channels">
        {/* Twitch */}
        <div className="ov-chat-cfg-platform">
          <label className="ov-chat-cfg-platform-header">
            <input type="checkbox" checked={!!c.twitchEnabled} onChange={e => set('twitchEnabled', e.target.checked)} />
            <span className="ov-chat-cfg-platform-dot" style={{ background: '#a855f7' }} />
            <span>Twitch</span>
          </label>
          {c.twitchEnabled && (
            <div className="ov-chat-cfg-platform-fields">
              <label className="oc-config-field">
                <span>Channel</span>
                <input value={c.twitchChannel || ''} onChange={e => set('twitchChannel', e.target.value)} placeholder="e.g. xQc" />
              </label>
            </div>
          )}
        </div>

        {/* YouTube */}
        <div className="ov-chat-cfg-platform">
          <label className="ov-chat-cfg-platform-header">
            <input type="checkbox" checked={!!c.youtubeEnabled} onChange={e => set('youtubeEnabled', e.target.checked)} />
            <span className="ov-chat-cfg-platform-dot" style={{ background: '#ef4444' }} />
            <span>YouTube</span>
          </label>
          {c.youtubeEnabled && (
            <div className="ov-chat-cfg-platform-fields">
              <label className="oc-config-field">
                <span>Video ID</span>
                <input value={c.youtubeVideoId || ''} onChange={e => set('youtubeVideoId', e.target.value)} placeholder="Live stream video ID" />
              </label>
              <label className="oc-config-field">
                <span>API Key</span>
                <input type="password" value={c.youtubeApiKey || ''} onChange={e => set('youtubeApiKey', e.target.value)} placeholder="YouTube Data API key" />
              </label>
            </div>
          )}
        </div>

        {/* Kick */}
        <div className="ov-chat-cfg-platform">
          <label className="ov-chat-cfg-platform-header">
            <input type="checkbox" checked={!!c.kickEnabled} onChange={e => set('kickEnabled', e.target.checked)} />
            <span className="ov-chat-cfg-platform-dot" style={{ background: '#22c55e' }} />
            <span>Kick</span>
          </label>
          {c.kickEnabled && (
            <div className="ov-chat-cfg-platform-fields">
              <label className="oc-config-field">
                <span>Channel ID</span>
                <input value={c.kickChannelId || ''} onChange={e => set('kickChannelId', e.target.value)} placeholder="Kick chatroom ID (number)" />
              </label>
            </div>
          )}
        </div>
      </Section>

      {/* ─── Appearance ─── */}
      <Section id="appearance" icon="🎨" title="Colors & Fonts">
        {navbarConfig && (
          <button className="oc-btn oc-btn--sm oc-btn--primary" style={{ marginBottom: 12, width: '100%' }} onClick={syncFromNavbar}>
            🔗 Sync Colors from Navbar
          </button>
        )}
        <label className="oc-config-field">
          <span>Background</span>
          <input type="color" value={c.bgColor || '#0f172a'} onChange={e => set('bgColor', e.target.value)} />
        </label>
        <label className="oc-config-field">
          <span>Text Color</span>
          <input type="color" value={c.textColor || '#e2e8f0'} onChange={e => set('textColor', e.target.value)} />
        </label>
        <label className="oc-config-field">
          <span>Header BG</span>
          <input type="color" value={c.headerBg || '#1e293b'} onChange={e => set('headerBg', e.target.value)} />
        </label>
        <label className="oc-config-field">
          <span>Header Text</span>
          <input type="color" value={c.headerText || '#94a3b8'} onChange={e => set('headerText', e.target.value)} />
        </label>
        <label className="oc-config-field">
          <span>Border Color</span>
          <input type="color" value={c.borderColor || '#334155'} onChange={e => set('borderColor', e.target.value)} />
        </label>
        <label className="oc-config-field">
          <span>Font</span>
          <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
            {FONT_OPTIONS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f.split("'")[1] || f}</option>)}
          </select>
        </label>
        <label className="oc-config-field">
          <span>Font Size</span>
          <input type="number" min={8} max={24} value={c.fontSize || 13} onChange={e => set('fontSize', parseInt(e.target.value) || 13)} />
        </label>
        <label className="oc-config-field">
          <span>Use Native Colors</span>
          <input type="checkbox" checked={!!c.useNativeColors} onChange={e => set('useNativeColors', e.target.checked)} />
        </label>
      </Section>

      {/* ─── Sizing ─── */}
      <Section id="sizing" icon="📐" title="Size & Layout">
        <label className="oc-config-field">
          <span>Width (px)</span>
          <input type="number" min={150} max={800} value={c.width || 350} onChange={e => set('width', parseInt(e.target.value) || 350)} />
        </label>
        <label className="oc-config-field">
          <span>Height (px)</span>
          <input type="number" min={150} max={1200} value={c.height || 500} onChange={e => set('height', parseInt(e.target.value) || 500)} />
        </label>
        <label className="oc-config-field">
          <span>Border Radius</span>
          <input type="number" min={0} max={50} value={c.borderRadius || 12} onChange={e => set('borderRadius', parseInt(e.target.value) || 12)} />
        </label>
        <label className="oc-config-field">
          <span>Msg Spacing (px)</span>
          <input type="number" min={0} max={12} value={c.msgSpacing || 2} onChange={e => set('msgSpacing', parseInt(e.target.value) || 2)} />
        </label>
        <label className="oc-config-field">
          <span>Max Messages</span>
          <input type="number" min={5} max={200} value={c.maxMessages || 50} onChange={e => set('maxMessages', parseInt(e.target.value) || 50)} />
        </label>
      </Section>

      {/* ─── Display ─── */}
      <Section id="display" icon="👁️" title="Display Options">
        <label className="oc-config-field">
          <span>Show Header</span>
          <input type="checkbox" checked={c.showHeader !== false} onChange={e => set('showHeader', e.target.checked)} />
        </label>
        <label className="oc-config-field">
          <span>Show Legend</span>
          <input type="checkbox" checked={c.showLegend !== false} onChange={e => set('showLegend', e.target.checked)} />
        </label>
      </Section>
    </div>
  );
}

