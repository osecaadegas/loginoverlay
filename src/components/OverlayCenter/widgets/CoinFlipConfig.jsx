import React, { useState } from 'react';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
];

export default function CoinFlipConfig({ config, onChange, allWidgets, mode }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });

  const allTabs = [
    { id: 'content', label: '🪙 Flip' },
    { id: 'style', label: '🎨 Style' },
  ];
  const SIDEBAR_TABS = new Set(['content']);
  const WIDGET_TABS = new Set(['style']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
    : mode === 'widget' ? allTabs.filter(t => WIDGET_TABS.has(t.id))
    : allTabs;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'content');

  const flipCoin = () => {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    /* Set result immediately; save previous result for smooth animation start angle */
    setMulti({ flipping: true, result, _prevResult: c.result || 'heads', _flipStart: Date.now() });
    setTimeout(() => setMulti({ flipping: false }), 2400);
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
        <div className="nb-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`nb-tab${activeTab === t.id ? ' nb-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>
      )}

      {activeTab === 'content' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Coin Labels</h4>
          <label className="nb-field"><span>Heads Label</span>
            <input value={c.headsLabel || 'HEADS'} onChange={e => set('headsLabel', e.target.value)}
              placeholder="HEADS" /></label>
          <label className="nb-field"><span>Tails Label</span>
            <input value={c.tailsLabel || 'TAILS'} onChange={e => set('tailsLabel', e.target.value)}
              placeholder="TAILS" /></label>

          <h4 className="nb-subtitle" style={{ marginTop: 12 }}>Coin Images (optional)</h4>
          <label className="nb-field"><span>Heads Image</span>
            <input value={c.headsImage || ''} onChange={e => set('headsImage', e.target.value)}
              placeholder="https://... or empty for text" /></label>
          <label className="nb-field"><span>Tails Image</span>
            <input value={c.tailsImage || ''} onChange={e => set('tailsImage', e.target.value)}
              placeholder="https://... or empty for text" /></label>

          <h4 className="nb-subtitle" style={{ marginTop: 12 }}>Flip Coin</h4>
          <button onClick={flipCoin} disabled={c.flipping} style={{
            width: '100%', padding: '14px 0', background: c.flipping ? '#444' : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800,
            cursor: c.flipping ? 'not-allowed' : 'pointer', opacity: c.flipping ? 0.6 : 1 }}>
            {c.flipping ? '🪙 Flipping...' : '🪙 Flip the Coin'}
          </button>

          {c.result && (
            <div style={{ textAlign: 'center', marginTop: 10, padding: '10px 12px',
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Result</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase' }}>{c.result}</div>
              <button onClick={() => set('result', '')} style={{ marginTop: 4, padding: '3px 10px', fontSize: 10,
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, cursor: 'pointer' }}>Clear</button>
            </div>
          )}

          {/* Preset shortcuts */}
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>⚡ Quick Presets</summary>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {[
                { l: 'Classic', h: 'HEADS', t: 'TAILS' },
                { l: 'Yes/No', h: 'YES', t: 'NO' },
                { l: 'Win/Lose', h: 'WIN', t: 'LOSE' },
                { l: 'Red/Black', h: 'RED', t: 'BLACK' },
              ].map(p => (
                <button key={p.l} onClick={() => setMulti({ headsLabel: p.h, tailsLabel: p.t })} style={{
                  padding: '4px 10px', fontSize: 11, background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer' }}>{p.l}</button>
              ))}
            </div>
          </details>
        </div>
      )}

      {activeTab === 'style' && (
        <div className="nb-section">
          {nb && <button onClick={syncFromNavbar} style={{
            width: '100%', padding: '8px 12px', marginBottom: 10, background: 'rgba(147,70,255,0.15)',
            color: '#c4b5fd', border: '1px solid rgba(147,70,255,0.3)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🔗 Sync Colors from Navbar</button>}
          <h4 className="nb-subtitle">Colors</h4>
          <label className="nb-field"><span>Heads Color</span><input type="color" value={c.headsColor || '#f59e0b'} onChange={e => set('headsColor', e.target.value)} /></label>
          <label className="nb-field"><span>Tails Color</span><input type="color" value={c.tailsColor || '#3b82f6'} onChange={e => set('tailsColor', e.target.value)} /></label>
          <label className="nb-field"><span>Text Color</span><input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} /></label>
          <label className="nb-field"><span>Accent</span><input type="color" value={c.accentColor || '#f59e0b'} onChange={e => set('accentColor', e.target.value)} /></label>
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
