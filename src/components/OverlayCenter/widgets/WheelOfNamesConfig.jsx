import React, { useState } from 'react';
import TabBar from './shared/TabBar';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
];

export default function WheelOfNamesConfig({ config, onChange, allWidgets, mode }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [newEntry, setNewEntry] = useState('');

  const allTabs = [
    { id: 'entries', label: '🎡 Entries' },
    { id: 'style', label: '🎨 Style' },
  ];
  const SIDEBAR_TABS = new Set(['entries']);
  const WIDGET_TABS = new Set(['style']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
    : mode === 'widget' ? allTabs.filter(t => WIDGET_TABS.has(t.id))
    : allTabs;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'entries');

  const entries = c.entries || [];

  const addEntry = () => {
    const name = newEntry.trim();
    if (!name) return;
    set('entries', [...entries, name]);
    setNewEntry('');
  };

  const removeEntry = (idx) => set('entries', entries.filter((_, i) => i !== idx));

  const spinWheel = () => {
    if (entries.length === 0) return;
    setMulti({ spinning: true, winner: '', _spinStart: Date.now() });
    setTimeout(() => {
      const winner = entries[Math.floor(Math.random() * entries.length)];
      setMulti({ spinning: false, winner });
    }, 3400);
  };

  const nb = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!nb) return;
    setMulti({ accentColor: nb.accentColor || '#f59e0b', textColor: nb.textColor || '#f1f5f9',
      mutedColor: nb.mutedColor || '#94a3b8', fontFamily: nb.fontFamily || "'Inter', sans-serif" });
  };

  return (
    <div className="nb-config">
      {tabs.length > 1 && (
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      )}

      {activeTab === 'entries' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Wheel Entries ({entries.length})</h4>

          {/* Add entry */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input value={newEntry} onChange={e => setNewEntry(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEntry()}
              placeholder="Add name or prize..."
              style={{ flex: 1, padding: '8px 10px', fontSize: 12, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#e2e8f0' }} />
            <button onClick={addEntry} style={{
              padding: '8px 14px', background: 'rgba(147,70,255,0.2)', color: '#c4b5fd',
              border: '1px solid rgba(147,70,255,0.3)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+</button>
          </div>

          {/* Entry list */}
          {entries.length > 0 ? (
            <div style={{ maxHeight: 200, overflowY: 'auto', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 4, marginBottom: 10 }}>
              {entries.map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', gap: 6,
                  background: name === c.winner ? 'rgba(147,70,255,0.12)' : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderRadius: 4 }}>
                  <span style={{ fontSize: 10, color: '#64748b', minWidth: 20 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 12, color: name === c.winner ? '#c4b5fd' : '#e2e8f0', fontWeight: name === c.winner ? 700 : 400 }}>{name}</span>
                  {name === c.winner && <span style={{ fontSize: 10 }}>🏆</span>}
                  <button onClick={() => removeEntry(i)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12,
              background: 'rgba(255,255,255,0.02)', borderRadius: 8, marginBottom: 10 }}>
              Add entries to spin the wheel
            </div>
          )}

          {/* Spin button */}
          <button onClick={spinWheel} disabled={entries.length === 0 || c.spinning} style={{
            width: '100%', padding: '12px', background: entries.length > 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#333',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: entries.length > 0 ? 'pointer' : 'not-allowed', opacity: entries.length > 0 ? 1 : 0.5, marginBottom: 6 }}>
            {c.spinning ? '🎡 Spinning...' : '🎡 Spin the Wheel'}
          </button>

          {c.winner && (
            <div style={{ textAlign: 'center', padding: '8px 12px', background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Winner</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>{c.winner}</div>
              <button onClick={() => set('winner', '')} style={{ marginTop: 4, padding: '3px 10px', fontSize: 10,
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, cursor: 'pointer' }}>Clear</button>
            </div>
          )}

          {/* Quick add */}
          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>📋 Bulk add (one per line)</summary>
            <textarea placeholder="Name 1&#10;Name 2&#10;Name 3" rows={4}
              style={{ width: '100%', marginTop: 6, padding: 8, fontSize: 12, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#e2e8f0', resize: 'vertical', boxSizing: 'border-box' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
                  if (lines.length) { set('entries', [...entries, ...lines]); e.target.value = ''; }
                }
              }} />
            <p style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Press Ctrl+Enter to add all</p>
          </details>

          {entries.length > 0 && (
            <button onClick={() => setMulti({ entries: [], winner: '' })} style={{
              width: '100%', padding: '8px', marginTop: 8, background: 'rgba(239,68,68,0.12)', color: '#f87171',
              border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              🗑️ Clear All
            </button>
          )}
        </div>
      )}

      {activeTab === 'style' && (
        <div className="nb-section">
          {nb && <button onClick={syncFromNavbar} style={{
            width: '100%', padding: '8px 12px', marginBottom: 10, background: 'rgba(147,70,255,0.15)',
            color: '#c4b5fd', border: '1px solid rgba(147,70,255,0.3)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🔗 Sync Colors from Navbar</button>}
          <h4 className="nb-subtitle">Colors</h4>
          <label className="nb-field"><span>Accent</span><input type="color" value={c.accentColor || '#f59e0b'} onChange={e => set('accentColor', e.target.value)} /></label>
          <label className="nb-field"><span>Text</span><input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} /></label>
          <label className="nb-field"><span>Muted</span><input type="color" value={c.mutedColor || '#94a3b8'} onChange={e => set('mutedColor', e.target.value)} /></label>
          <h4 className="nb-subtitle">Typography</h4>
          <label className="nb-field"><span>Font</span>
            <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select></label>
          <h4 className="nb-subtitle">Custom CSS</h4>
          <textarea className="oc-widget-css-input" value={c.custom_css || ''} onChange={e => set('custom_css', e.target.value)}
            rows={4} placeholder="/* custom CSS */" spellCheck={false} />
        </div>
      )}
    </div>
  );
}
