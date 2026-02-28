import React, { useState } from 'react';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
];

const DEFAULT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣', '🔔'];

export default function SlotmachineConfig({ config, onChange, allWidgets, mode }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [newSymbol, setNewSymbol] = useState('');

  const allTabs = [
    { id: 'content', label: '🎰 Reels' },
    { id: 'style', label: '🎨 Style' },
  ];
  const SIDEBAR_TABS = new Set(['content']);
  const WIDGET_TABS = new Set(['style']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
    : mode === 'widget' ? allTabs.filter(t => WIDGET_TABS.has(t.id))
    : allTabs;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'content');

  const symbols = c.symbols || DEFAULT_SYMBOLS;

  const addSymbol = () => {
    const s = newSymbol.trim();
    if (!s) return;
    set('symbols', [...symbols, s]);
    setNewSymbol('');
  };
  const removeSymbol = (idx) => set('symbols', symbols.filter((_, i) => i !== idx));

  const spinReels = () => {
    if (symbols.length === 0) return;
    const rc = c.reelCount || 3;
    setMulti({ spinning: true, results: [], _spinStart: Date.now() });
    const dur = 1500 + (rc - 1) * 400 + 300;
    setTimeout(() => {
      const results = Array.from({ length: rc }, () => symbols[Math.floor(Math.random() * symbols.length)]);
      const isWin = results.every(r => r === results[0]);
      setMulti({ spinning: false, results, lastWin: isWin });
    }, dur);
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
          <h4 className="nb-subtitle">Reel Settings</h4>
          <label className="nb-field"><span>Number of Reels</span>
            <select value={c.reelCount || 3} onChange={e => set('reelCount', +e.target.value)}>
              {[3, 4, 5].map(n => <option key={n} value={n}>{n} Reels</option>)}
            </select></label>

          <h4 className="nb-subtitle" style={{ marginTop: 10 }}>Symbols ({symbols.length})</h4>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input value={newSymbol} onChange={e => setNewSymbol(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSymbol()}
              placeholder="Add emoji or text symbol..."
              style={{ flex: 1, padding: '8px 10px', fontSize: 12, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#e2e8f0' }} />
            <button onClick={addSymbol} style={{
              padding: '8px 14px', background: 'rgba(147,70,255,0.2)', color: '#c4b5fd',
              border: '1px solid rgba(147,70,255,0.3)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {symbols.map((s, i) => (
              <span key={i} onClick={() => removeSymbol(i)} title="Click to remove" style={{
                padding: '4px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6,
                fontSize: 16, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>{s}</span>
            ))}
          </div>

          <button onClick={() => set('symbols', DEFAULT_SYMBOLS)} style={{
            padding: '6px 12px', fontSize: 11, background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', marginBottom: 12 }}>
            Reset to Default Symbols
          </button>

          <h4 className="nb-subtitle">Spin</h4>
          <button onClick={spinReels} disabled={symbols.length === 0 || c.spinning} style={{
            width: '100%', padding: '14px 0', background: symbols.length > 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#333',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800,
            cursor: symbols.length > 0 ? 'pointer' : 'not-allowed', opacity: symbols.length > 0 ? 1 : 0.5 }}>
            {c.spinning ? '🎰 Spinning...' : '🎰 Spin Reels'}
          </button>

          {c.results && c.results.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 10, padding: '10px 12px',
              background: c.lastWin ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
              border: `1px solid ${c.lastWin ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {c.lastWin ? '🎉 JACKPOT!' : 'Result'}
              </div>
              <div style={{ fontSize: 28, marginTop: 4 }}>{c.results.join(' ')}</div>
              <button onClick={() => setMulti({ results: [], lastWin: false })} style={{ marginTop: 4, padding: '3px 10px', fontSize: 10,
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, cursor: 'pointer' }}>Clear</button>
            </div>
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
          <label className="nb-field"><span>Machine Color</span><input type="color" value={c.machineColor || '#dc2626'} onChange={e => set('machineColor', e.target.value)} /></label>
          <label className="nb-field"><span>Reel Background</span><input type="color" value={c.reelBg || '#1a1a2e'} onChange={e => set('reelBg', e.target.value)} /></label>
          <label className="nb-field"><span>Accent / Gold</span><input type="color" value={c.accentColor || '#f59e0b'} onChange={e => set('accentColor', e.target.value)} /></label>
          <label className="nb-field"><span>Text Color</span><input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} /></label>
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
