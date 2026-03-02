import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAllProviders, getSlotsByProviders } from '../../../utils/slotUtils';
import TabBar from './shared/TabBar';

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
    { id: 'content', label: '🎰 Pick' },
    { id: 'style', label: '🎨 Style' },
  ];
  const SIDEBAR_TABS = new Set(['content']);
  const WIDGET_TABS = new Set(['style']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
    : mode === 'widget' ? allTabs.filter(t => WIDGET_TABS.has(t.id))
    : allTabs;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'content');

  /* ── Provider list from DB ── */
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providerSearch, setProviderSearch] = useState('');
  const selectedProviders = c.selectedProviders || [];

  useEffect(() => {
    let cancelled = false;
    setLoadingProviders(true);
    getAllProviders().then(list => {
      if (!cancelled) { setProviders(list); setLoadingProviders(false); }
    }).catch(() => { if (!cancelled) setLoadingProviders(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleProvider = (prov) => {
    const next = selectedProviders.includes(prov)
      ? selectedProviders.filter(p => p !== prov)
      : [...selectedProviders, prov];
    set('selectedProviders', next);
  };

  const selectAll = () => set('selectedProviders', [...providers]);
  const selectNone = () => set('selectedProviders', []);

  /* ── Shuffle / Pick ── */
  const [shuffling, setShuffling] = useState(false);
  const shuffleTimerRef = useRef(null);

  const pickRandom = useCallback(async () => {
    const provs = selectedProviders.length > 0 ? selectedProviders : providers;
    if (provs.length === 0) return;

    setShuffling(true);
    setMulti({ picking: true, pickedSlot: null, _pickStart: Date.now() });

    try {
      const slots = await getSlotsByProviders(provs);
      if (slots.length === 0) {
        setShuffling(false);
        setMulti({ picking: false });
        return;
      }

      /* quick visual shuffle — flash 6 random names then land on winner */
      let count = 0;
      const flashInterval = setInterval(() => {
        const preview = slots[Math.floor(Math.random() * slots.length)];
        setMulti({ picking: true, pickedSlot: preview, _pickStart: Date.now() });
        count++;
        if (count >= 8) {
          clearInterval(flashInterval);
          const winner = slots[Math.floor(Math.random() * slots.length)];
          setMulti({ picking: false, pickedSlot: winner });
          setShuffling(false);
        }
      }, 200);
      shuffleTimerRef.current = flashInterval;
    } catch {
      setShuffling(false);
      setMulti({ picking: false });
    }
  }, [selectedProviders, providers, setMulti]);

  useEffect(() => {
    return () => { if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current); };
  }, []);

  /* ── Navbar sync ── */
  const nb = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!nb) return;
    setMulti({ accentColor: nb.accentColor || '#f59e0b', textColor: nb.textColor || '#f1f5f9',
      mutedColor: nb.mutedColor || '#94a3b8', fontFamily: nb.fontFamily || "'Inter', sans-serif" });
  };

  /* ── Filter providers by search ── */
  const filteredProviders = providerSearch.trim()
    ? providers.filter(p => p.toLowerCase().includes(providerSearch.toLowerCase()))
    : providers;

  return (
    <div className="nb-config">
      {tabs.length > 1 && (
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      )}

      {activeTab === 'content' && (
        <div className="nb-section">
          {/* Provider checkboxes */}
          <h4 className="nb-subtitle">Providers ({selectedProviders.length}/{providers.length})</h4>

          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button onClick={selectAll} style={{
              flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600,
              background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer',
            }}>Select All</button>
            <button onClick={selectNone} style={{
              flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600,
              background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer',
            }}>Clear All</button>
          </div>

          {/* Provider search */}
          <input
            value={providerSearch}
            onChange={e => setProviderSearch(e.target.value)}
            placeholder="Search providers..."
            style={{
              width: '100%', padding: '7px 10px', fontSize: 12, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#e2e8f0',
              boxSizing: 'border-box', marginBottom: 8,
            }}
          />

          {loadingProviders ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12 }}>⏳ Loading providers...</div>
          ) : (
            <div style={{
              maxHeight: 260, overflowY: 'auto', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 6, marginBottom: 12,
            }}>
              {filteredProviders.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                  {providerSearch ? 'No providers match your search' : 'No providers found in database'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {filteredProviders.map(prov => {
                    const checked = selectedProviders.includes(prov);
                    return (
                      <label key={prov} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
                        background: checked ? 'rgba(245,158,11,0.12)' : 'transparent',
                        borderRadius: 6, cursor: 'pointer', fontSize: 11, color: checked ? '#fbbf24' : '#cbd5e1',
                        fontWeight: checked ? 600 : 400,
                        border: `1px solid ${checked ? 'rgba(245,158,11,0.25)' : 'transparent'}`,
                        transition: 'all 0.15s ease',
                      }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleProvider(prov)}
                          style={{ accentColor: '#f59e0b', width: 14, height: 14, cursor: 'pointer' }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prov}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Info text */}
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, lineHeight: 1.4 }}>
            {selectedProviders.length === 0
              ? '💡 No providers selected — shuffle will pick from ALL slots'
              : `🎯 ${selectedProviders.length} provider${selectedProviders.length > 1 ? 's' : ''} selected`}
          </div>

          {/* Shuffle button */}
          <button onClick={pickRandom} disabled={shuffling || providers.length === 0}
            style={{
              width: '100%', padding: '16px 0',
              background: providers.length > 0
                ? (shuffling ? 'linear-gradient(135deg, #d97706, #b45309)' : 'linear-gradient(135deg, #f59e0b, #d97706)')
                : '#333',
              color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800,
              cursor: providers.length > 0 && !shuffling ? 'pointer' : 'not-allowed',
              opacity: providers.length > 0 ? 1 : 0.5, marginBottom: 8,
              letterSpacing: '0.04em',
              boxShadow: shuffling ? '0 0 24px rgba(245,158,11,0.4)' : '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
            }}>
            {shuffling ? '🎰 Shuffling...' : '🎲 Shuffle'}
          </button>

          {/* Picked slot result */}
          {c.pickedSlot && !shuffling && (
            <div style={{
              textAlign: 'center', marginTop: 8, padding: '12px 14px',
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10,
            }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>🎯 Picked Slot</div>
              {c.pickedSlot.image && <img src={c.pickedSlot.image} alt="" style={{
                width: 64, height: 64, borderRadius: 10, objectFit: 'cover', margin: '6px 0',
                border: '2px solid rgba(245,158,11,0.3)',
              }} />}
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24' }}>{c.pickedSlot.name}</div>
              {c.pickedSlot.provider && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{c.pickedSlot.provider}</div>}
              <button onClick={() => set('pickedSlot', null)} style={{
                marginTop: 8, padding: '4px 14px', fontSize: 11,
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer',
              }}>Clear</button>
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
