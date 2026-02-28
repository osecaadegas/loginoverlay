import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
];

export default function RandomSlotPickerConfig({ config, onChange, allWidgets, mode }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });

  const allTabs = [
    { id: 'content', label: '🎰 Slots' },
    { id: 'style', label: '🎨 Style' },
  ];
  const SIDEBAR_TABS = new Set(['content']);
  const WIDGET_TABS = new Set(['style']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
    : mode === 'widget' ? allTabs.filter(t => WIDGET_TABS.has(t.id))
    : allTabs;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'content');

  // DB slot search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) { setSearchResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase.from('slots').select('id, name, provider, image')
          .ilike('name', `%${searchTerm}%`).limit(15);
        setSearchResults(data || []);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [searchTerm]);

  const slotPool = c.slotPool || [];
  const addSlot = (slot) => {
    if (slotPool.find(s => s.id === slot.id)) return;
    set('slotPool', [...slotPool, { id: slot.id, name: slot.name, provider: slot.provider, image: slot.image }]);
    setSearchTerm('');
    setSearchResults([]);
  };
  const removeSlot = (id) => set('slotPool', slotPool.filter(s => s.id !== id));

  const pickRandom = () => {
    if (slotPool.length === 0) return;
    setMulti({ picking: true, pickedSlot: null, _pickStart: Date.now() });
    setTimeout(() => {
      const picked = slotPool[Math.floor(Math.random() * slotPool.length)];
      setMulti({ picking: false, pickedSlot: picked });
    }, 1800);
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
          <h4 className="nb-subtitle">Slot Pool ({slotPool.length})</h4>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search slots from database..." style={{
                width: '100%', padding: '8px 10px', fontSize: 12, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#e2e8f0', boxSizing: 'border-box' }} />
            {searching && <span style={{ position: 'absolute', right: 10, top: 8, fontSize: 12, color: '#94a3b8' }}>⏳</span>}
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                {searchResults.map(s => (
                  <div key={s.id} onClick={() => addSlot(s)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    {s.image && <img src={s.image} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />}
                    <div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{s.name}</div>
                      {s.provider && <div style={{ fontSize: 10, color: '#64748b' }}>{s.provider}</div>}
                    </div>
                    {slotPool.find(x => x.id === s.id) && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#22c55e' }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pool list */}
          {slotPool.length > 0 ? (
            <div style={{ maxHeight: 200, overflowY: 'auto', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 4, marginBottom: 10 }}>
              {slotPool.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                  background: c.pickedSlot?.id === s.id ? 'rgba(245,158,11,0.12)' : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderRadius: 4 }}>
                  {s.image && <img src={s.image} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />}
                  <span style={{ flex: 1, fontSize: 12, color: c.pickedSlot?.id === s.id ? '#fbbf24' : '#e2e8f0',
                    fontWeight: c.pickedSlot?.id === s.id ? 700 : 400 }}>{s.name}</span>
                  {c.pickedSlot?.id === s.id && <span style={{ fontSize: 10 }}>🎯</span>}
                  <button onClick={() => removeSlot(s.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12,
              background: 'rgba(255,255,255,0.02)', borderRadius: 8, marginBottom: 10 }}>
              Search and add slots to the pool
            </div>
          )}

          {/* Pick button */}
          <button onClick={pickRandom} disabled={slotPool.length === 0 || c.picking} style={{
            width: '100%', padding: '14px 0', background: slotPool.length > 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#333',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800,
            cursor: slotPool.length > 0 ? 'pointer' : 'not-allowed', opacity: slotPool.length > 0 ? 1 : 0.5, marginBottom: 6 }}>
            {c.picking ? '🎲 Picking...' : '🎲 Pick Random Slot'}
          </button>

          {c.pickedSlot && (
            <div style={{ textAlign: 'center', marginTop: 6, padding: '10px 12px',
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Picked Slot</div>
              {c.pickedSlot.image && <img src={c.pickedSlot.image} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', margin: '6px 0' }} />}
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>{c.pickedSlot.name}</div>
              {c.pickedSlot.provider && <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.pickedSlot.provider}</div>}
              <button onClick={() => set('pickedSlot', null)} style={{ marginTop: 6, padding: '3px 10px', fontSize: 10,
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, cursor: 'pointer' }}>Clear</button>
            </div>
          )}

          {slotPool.length > 0 && (
            <button onClick={() => setMulti({ slotPool: [], pickedSlot: null })} style={{
              width: '100%', padding: '8px', marginTop: 8, background: 'rgba(239,68,68,0.12)', color: '#f87171',
              border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              🗑️ Clear Pool
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
