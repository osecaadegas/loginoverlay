import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import TabBar from './shared/TabBar';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
];

export default function CurrentSlotConfig({ config, onChange, allWidgets, mode }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const allTabs = [
    { id: 'content', label: '🎰 Slot' },
    { id: 'style', label: '🎨 Style' },
  ];
  const SIDEBAR_TABS = new Set(['content']);
  const WIDGET_TABS = new Set(['style']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
    : mode === 'widget' ? allTabs.filter(t => WIDGET_TABS.has(t.id))
    : allTabs;

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'content');

  const searchSlots = useCallback(async (term) => {
    if (!term || term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase.from('slots').select('id, name, provider, image')
        .ilike('name', `%${term}%`).order('name').limit(20);
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchSlots(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchSlots]);

  const selectSlot = (slot) => {
    setMulti({ slotName: slot.name, provider: slot.provider || '', imageUrl: slot.image || '', slotId: slot.id });
    setSearchTerm(''); setSearchResults([]);
  };

  const nb = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!nb) return;
    setMulti({ bgColor: nb.bgColor || '#111318', accentColor: nb.accentColor || '#f59e0b',
      textColor: nb.textColor || '#f1f5f9', mutedColor: nb.mutedColor || '#94a3b8',
      fontFamily: nb.fontFamily || "'Inter', sans-serif" });
  };

  return (
    <div className="nb-config">
      {tabs.length > 1 && (
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      )}

      {activeTab === 'content' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Search Slots Database</h4>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 Search slot by name..."
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e2e8f0', boxSizing: 'border-box' }} />
            {searching && <div style={{ position: 'absolute', right: 12, top: 10, fontSize: 11, color: '#94a3b8' }}>...</div>}
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 50,
                background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                maxHeight: 240, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {searchResults.map(slot => (
                  <button key={slot.id} onClick={() => selectSlot(slot)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    background: 'transparent', border: 'none', color: '#e2e8f0', cursor: 'pointer', textAlign: 'left', fontSize: 12 }}>
                    {slot.image && <img src={slot.image} alt="" style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 4 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slot.name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{slot.provider}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {c.slotName && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              {c.imageUrl && <img src={c.imageUrl} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 6 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{c.slotName}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.provider}</div>
              </div>
              <button onClick={() => setMulti({ slotName: '', provider: '', imageUrl: '', slotId: null })}
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>
            </div>
          )}

          <h4 className="nb-subtitle">Manual Override</h4>
          <label className="nb-field"><span>Slot Name</span>
            <input value={c.slotName || ''} onChange={e => set('slotName', e.target.value)} placeholder="Sweet Bonanza" /></label>
          <label className="nb-field"><span>Provider</span>
            <input value={c.provider || ''} onChange={e => set('provider', e.target.value)} placeholder="Pragmatic Play" /></label>
          <label className="nb-field"><span>Bet Size</span>
            <input type="number" step="0.01" value={c.betSize || 0} onChange={e => set('betSize', +e.target.value)} /></label>
          <label className="nb-field"><span>RTP (%)</span>
            <input value={c.rtp || ''} onChange={e => set('rtp', e.target.value)} placeholder="96.50" /></label>
          <label className="nb-field"><span>Image URL</span>
            <input value={c.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." /></label>
          <label className="nb-field"><span>Currency</span>
            <input value={c.currency || '€'} onChange={e => set('currency', e.target.value)} placeholder="€" style={{ width: 60 }} /></label>
        </div>
      )}

      {activeTab === 'style' && (
        <div className="nb-section">
          {nb && <button className="oc-btn-sync" onClick={syncFromNavbar} style={{
            width: '100%', padding: '8px 12px', marginBottom: 10, background: 'rgba(147,70,255,0.15)',
            color: '#c4b5fd', border: '1px solid rgba(147,70,255,0.3)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🔗 Sync Colors from Navbar</button>}
          <h4 className="nb-subtitle">Colors</h4>
          <label className="nb-field"><span>Background</span><input type="color" value={c.bgColor || '#13151e'} onChange={e => set('bgColor', e.target.value)} /></label>
          <label className="nb-field"><span>Card BG</span><input type="color" value={c.cardBg || '#1a1d2e'} onChange={e => set('cardBg', e.target.value)} /></label>
          <label className="nb-field"><span>Accent</span><input type="color" value={c.accentColor || '#f59e0b'} onChange={e => set('accentColor', e.target.value)} /></label>
          <label className="nb-field"><span>Text</span><input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} /></label>
          <label className="nb-field"><span>Muted</span><input type="color" value={c.mutedColor || '#94a3b8'} onChange={e => set('mutedColor', e.target.value)} /></label>
          <label className="nb-field"><span>Border</span><input type="color" value={c.borderColor || '#1e293b'} onChange={e => set('borderColor', e.target.value)} /></label>
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
