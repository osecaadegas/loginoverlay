/**
 * BHStatsConfig.jsx — Config panel for the standalone Bonus Hunt Stats widget.
 * Customise colors, fonts, layout, and which stats to show.
 */
import React from 'react';
import ColorPicker from './shared/ColorPicker';

const FONT_OPTIONS = [
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Bebas Neue', cursive", label: 'Bebas Neue' },
  { value: "'Press Start 2P', cursive", label: 'Press Start 2P' },
];

const S = {
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' },
  hint: { fontSize: '0.7rem', color: '#64748b', margin: 0, lineHeight: 1.4 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  field: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0' },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: '#e2e8f0', padding: '4px 6px', fontSize: '0.78rem',
  },
};

export default function BHStatsConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });

  const navbarConfig = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;

  const syncFromNavbar = () => {
    if (!navbarConfig) return;
    const nb = navbarConfig;
    setMulti({
      bgColor: nb.bgColor || '#0f172a',
      textColor: nb.textColor || '#f1f5f9',
      mutedColor: nb.mutedColor || '#64748b',
      accentColor: nb.accentColor || '#818cf8',
      borderColor: nb.borderColor || 'rgba(255,255,255,0.06)',
      fontFamily: nb.fontFamily || "'Poppins', sans-serif",
      fontSize: nb.fontSize ?? 14,
    });
  };

  return (
    <div style={S.section}>
      {/* Info */}
      <div>
        <p style={S.label}>📊 Bonus Hunt Stats</p>
        <p style={S.hint}>
          Standalone stats overlay. Reads data from your Bonus Hunt widget automatically.
          Make sure you have a Bonus Hunt widget added to this overlay.
        </p>
      </div>

      {/* Sync from Navbar */}
      {navbarConfig && (
        <button
          onClick={syncFromNavbar}
          style={{
            width: '100%', padding: '8px 12px', fontSize: '0.78rem', fontWeight: 700,
            background: 'rgba(129,140,248,0.15)', color: '#818cf8',
            border: '1px solid rgba(129,140,248,0.25)', borderRadius: 8,
            cursor: 'pointer', transition: 'opacity 0.2s',
          }}
        >
          🔗 Sync Colors from Navbar
        </button>
      )}

      {/* Hunt Number override */}
      <div>
        <p style={S.label}>Hunt Number (override)</p>
        <p style={S.hint}>Leave empty to read from Bonus Hunt config.</p>
        <input
          type="text"
          value={c.huntNumber || ''}
          onChange={e => set('huntNumber', e.target.value)}
          placeholder="e.g. 42"
          style={{ ...S.input, marginTop: 4, flex: 'none', width: 100 }}
        />
      </div>

      {/* Toggle title */}
      <label style={{ ...S.field, cursor: 'pointer' }}>
        <input type="checkbox" checked={c.showTitle !== false} onChange={e => set('showTitle', e.target.checked)} />
        Show title bar
      </label>

      {/* Typography */}
      <div>
        <p style={S.label}>🔤 Typography</p>
        <label style={{ ...S.field, marginBottom: 6 }}>
          Font
          <select value={c.fontFamily || "'Poppins', sans-serif"} onChange={e => set('fontFamily', e.target.value)} style={S.input}>
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label style={{ ...S.field, marginBottom: 6 }}>
          Size
          <input type="range" min={8} max={24} step={1} value={c.fontSize || 14}
            onChange={e => set('fontSize', +e.target.value)}
            style={{ flex: 1, accentColor: '#818cf8' }}
          />
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', minWidth: 30 }}>{c.fontSize || 14}px</span>
        </label>
        <label style={S.field}>
          Weight
          <select value={c.fontWeight || '600'} onChange={e => set('fontWeight', e.target.value)} style={S.input}>
            <option value="400">Normal</option>
            <option value="600">Semi Bold</option>
            <option value="700">Bold</option>
            <option value="800">Extra Bold</option>
          </select>
        </label>
      </div>

      {/* Colors */}
      <div>
        <p style={S.label}>🎨 Colors</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <ColorPicker label="Background" value={c.bgColor || 'rgba(15,23,42,0.9)'} onChange={v => set('bgColor', v)} />
          <ColorPicker label="Card BG" value={c.cardBg || 'rgba(255,255,255,0.04)'} onChange={v => set('cardBg', v)} />
          <ColorPicker label="Text" value={c.textColor || '#f1f5f9'} onChange={v => set('textColor', v)} />
          <ColorPicker label="Muted" value={c.mutedColor || '#64748b'} onChange={v => set('mutedColor', v)} />
          <ColorPicker label="Accent" value={c.accentColor || '#818cf8'} onChange={v => set('accentColor', v)} />
          <ColorPicker label="Border" value={c.borderColor || 'rgba(255,255,255,0.06)'} onChange={v => set('borderColor', v)} />
          <ColorPicker label="Progress Bar" value={c.progressColor || '#22c55e'} onChange={v => set('progressColor', v)} />
          <ColorPicker label="Progress BG" value={c.progressBgColor || 'rgba(255,255,255,0.08)'} onChange={v => set('progressBgColor', v)} />
          <ColorPicker label="Best Color" value={c.bestColor || '#22c55e'} onChange={v => set('bestColor', v)} />
          <ColorPicker label="Worst Color" value={c.worstColor || '#f87171'} onChange={v => set('worstColor', v)} />
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <p style={S.label}>📐 Dimensions</p>
        <label style={{ ...S.field, marginBottom: 6 }}>
          Border Radius
          <input type="range" min={0} max={28} step={1} value={c.borderRadius ?? 14}
            onChange={e => set('borderRadius', +e.target.value)}
            style={{ flex: 1, accentColor: '#818cf8' }}
          />
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', minWidth: 30 }}>{c.borderRadius ?? 14}px</span>
        </label>
      </div>
    </div>
  );
}
