import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { configStyles } from './shared/configStyles';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
];

export default function BonusBuysConfig({ config, onChange, allWidgets, mode }) {
  const { user } = useAuth();
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [winInput, setWinInput] = useState('');
  const [message, setMessage] = useState('');

  const allTabs = [
    { id: 'slot', label: '🎰 Setup' },
    { id: 'bonuses', label: '🛒 Bonuses' },
    { id: 'style', label: '🎨 Style' },
  ];

  const SIDEBAR_TABS = new Set(['slot', 'bonuses']);
  const WIDGET_TABS = new Set(['style']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
    : mode === 'widget' ? allTabs.filter(t => WIDGET_TABS.has(t.id))
    : allTabs;

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'slot');

  // Search slots from DB
  const searchSlots = useCallback(async (term) => {
    if (!term || term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase.from('slots').select('id, name, provider, image, rtp')
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
    setMulti({
      slotName: slot.name,
      provider: slot.provider || '',
      imageUrl: slot.image || '',
      slotId: slot.id,
      rtp: slot.rtp || '',
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  // Sync colors from navbar
  const nb = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!nb) return;
    setMulti({
      bgColor: nb.bgColor || '#0a0e1a',
      accentColor: nb.accentColor || '#3b82f6',
      textColor: nb.textColor || '#ffffff',
      mutedColor: nb.mutedColor || '#64748b',
      fontFamily: nb.fontFamily || "'Inter', sans-serif",
    });
  };

  const currency = c.currency || '$';
  const betCost = Number(c.betCost) || 0;
  const bonuses = c.bonuses || [];
  const plannedBonuses = Number(c.plannedBonuses) || 5;

  // Computed stats
  const filledBonuses = bonuses.filter(b => b && b.win !== undefined && b.win !== null && b.win !== '');
  const totalCost = filledBonuses.length * betCost;
  const totalWin = filledBonuses.reduce((sum, b) => sum + (Number(b.win) || 0), 0);
  const profitLoss = totalWin - totalCost;
  const avgMulti = filledBonuses.length > 0
    ? filledBonuses.reduce((sum, b) => sum + (betCost > 0 ? (Number(b.win) || 0) / betCost : 0), 0) / filledBonuses.length
    : 0;

  const handleAddBonus = () => {
    if (!winInput && winInput !== '0') return;
    const win = Number(winInput);
    const newBonuses = [...bonuses, { id: Date.now(), win }];
    set('bonuses', newBonuses);
    setWinInput('');
    setMessage(`✅ Bonus #${newBonuses.length} added — ${betCost > 0 ? (win / betCost).toFixed(2) : '0.00'}x`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRemoveBonus = (index) => {
    const newBonuses = bonuses.filter((_, i) => i !== index);
    set('bonuses', newBonuses);
  };

  const handleEditBonus = (index, newWin) => {
    const newBonuses = [...bonuses];
    newBonuses[index] = { ...newBonuses[index], win: Number(newWin) };
    set('bonuses', newBonuses);
  };

  const handleResetSession = () => {
    setMulti({
      bonuses: [],
      sessionNumber: (Number(c.sessionNumber) || 1) + 1,
    });
    setMessage('🔄 Session reset! Starting fresh.');
    setTimeout(() => setMessage(''), 3000);
  };

  const S = configStyles('#3b82f6');

  return (
    <div style={{ padding: 2 }}>
      {/* Tab navigation */}
      <div style={S.tabs}>
        {tabs.map(t => (
          <button key={t.id} style={S.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Setup Tab ─── */}
      {activeTab === 'slot' && (
        <div>
          {/* Slot search */}
          <div style={S.section}>
            <label style={S.label}>Search Slot</label>
            <input
              style={S.input}
              placeholder="Type slot name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searching && <div style={{ color: '#a0a0b4', fontSize: '0.75rem', marginTop: 4 }}>Searching...</div>}

            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                {searchResults.map(slot => (
                  <div key={slot.id} style={S.searchResult(c.slotId === slot.id)} onClick={() => selectSlot(slot)}>
                    {slot.image && <img src={slot.image} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slot.name}</div>
                      {slot.provider && <div style={{ fontSize: '0.7rem', color: '#a0a0b4' }}>{slot.provider}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current selection */}
          {c.slotName && (
            <div style={{ ...S.section, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {c.imageUrl && <img src={c.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{c.slotName}</div>
                  {c.provider && <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>{c.provider}</div>}
                </div>
              </div>
            </div>
          )}

          <div style={S.section}>
            <label style={S.label}>Manual Slot Name</label>
            <input style={S.input} value={c.slotName || ''} onChange={e => set('slotName', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={S.section}>
              <label style={S.label}>Provider</label>
              <input style={S.input} value={c.provider || ''} onChange={e => set('provider', e.target.value)} />
            </div>
            <div style={S.section}>
              <label style={S.label}>Currency</label>
              <input style={S.input} value={c.currency || '$'} onChange={e => set('currency', e.target.value)} />
            </div>
          </div>

          <div style={S.section}>
            <label style={S.label}>Image URL</label>
            <input style={S.input} value={c.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
          </div>

          {/* Session settings */}
          <div style={{ ...S.section, padding: 12, background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)' }}>
            <label style={{ ...S.label, color: '#3b82f6' }}>🛒 Bonus Buy Settings</label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ ...S.label, fontSize: '0.72rem' }}>Bet / Cost ({currency})</label>
                <input
                  style={S.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.betCost || ''}
                  onChange={e => set('betCost', e.target.value)}
                  placeholder="300"
                />
              </div>
              <div>
                <label style={{ ...S.label, fontSize: '0.72rem' }}>Planned Bonuses</label>
                <input
                  style={S.input}
                  type="number"
                  min="1"
                  max="50"
                  value={c.plannedBonuses || ''}
                  onChange={e => set('plannedBonuses', e.target.value)}
                  placeholder="5"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ ...S.label, fontSize: '0.72rem' }}>Start Money ({currency})</label>
                <input
                  style={S.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.startMoney || ''}
                  onChange={e => set('startMoney', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={{ ...S.label, fontSize: '0.72rem' }}>Session #</label>
                <input
                  style={S.input}
                  type="number"
                  min="1"
                  value={c.sessionNumber || ''}
                  onChange={e => set('sessionNumber', e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bonuses Tab ─── */}
      {activeTab === 'bonuses' && (
        <div>
          {!c.slotName ? (
            <div style={{ color: '#a0a0b4', fontSize: '0.82rem', textAlign: 'center', padding: 20 }}>
              Select a slot first in the Setup tab
            </div>
          ) : (
            <>
              {/* Quick stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#a0a0b4', textTransform: 'uppercase' }}>Bonuses</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{filledBonuses.length}/{plannedBonuses}</div>
                </div>
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#a0a0b4', textTransform: 'uppercase' }}>Avg Multi</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#3b82f6' }}>{avgMulti.toFixed(2)}x</div>
                </div>
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#a0a0b4', textTransform: 'uppercase' }}>Profit</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: profitLoss >= 0 ? '#4ade80' : '#f87171' }}>
                    {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}{currency}
                  </div>
                </div>
              </div>

              {/* Add bonus */}
              <div style={{ ...S.section, padding: 12, background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)' }}>
                <label style={{ ...S.label, color: '#3b82f6' }}>
                  ➕ Add Bonus #{filledBonuses.length + 1}
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      style={S.input}
                      type="number"
                      step="0.01"
                      placeholder={`Win amount (${currency})`}
                      value={winInput}
                      onChange={e => setWinInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddBonus()}
                    />
                  </div>
                  <button
                    style={{ ...S.btn, background: '#3b82f6', color: '#fff', padding: '8px 14px', opacity: (!winInput && winInput !== '0') ? 0.5 : 1 }}
                    onClick={handleAddBonus}
                    disabled={!winInput && winInput !== '0'}
                  >
                    Add
                  </button>
                </div>
                {winInput !== '' && betCost > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#a0a0b4', marginTop: 4 }}>
                    Multi: {(Number(winInput) / betCost).toFixed(2)}x
                    {Number(winInput) >= betCost ? ' ✅' : ' ❌'}
                    &nbsp;| Profit: {(Number(winInput) - betCost).toFixed(2)}{currency}
                  </div>
                )}
                {message && <div style={S.msg}>{message}</div>}
              </div>

              {/* Bonus list */}
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ color: '#fff', fontSize: '0.85rem', margin: 0 }}>
                    🛒 Bonus Results ({filledBonuses.length})
                  </h4>
                  {bonuses.length > 0 && (
                    <button
                      style={{ ...S.btn, background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.72rem', padding: '4px 10px' }}
                      onClick={handleResetSession}
                    >
                      🔄 Reset
                    </button>
                  )}
                </div>

                {bonuses.length === 0 ? (
                  <div style={{ color: '#a0a0b4', fontSize: '0.8rem', textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                    No bonuses added yet. Enter a win amount above to start tracking!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                    {bonuses.map((b, i) => {
                      const win = Number(b.win) || 0;
                      const multi = betCost > 0 ? win / betCost : 0;
                      const isProfit = win >= betCost;
                      return (
                        <div key={b.id || i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem',
                        }}>
                          <span style={{ color: '#3b82f6', fontWeight: 800, minWidth: 28 }}>#{i + 1}</span>
                          <span style={{ color: '#a0a0b4', fontSize: '0.75rem' }}>{betCost.toFixed(2)}{currency}</span>
                          <span style={{ flex: 1, textAlign: 'right', color: isProfit ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                            {win.toFixed(2)}{currency}
                          </span>
                          <span style={{ color: '#3b82f6', fontWeight: 700, minWidth: 48, textAlign: 'right' }}>
                            {multi.toFixed(2)}x
                          </span>
                          <button
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px 4px', fontSize: '0.75rem' }}
                            onClick={() => handleRemoveBonus(i)}
                            title="Remove"
                          >✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Summary */}
              {filledBonuses.length > 0 && (
                <div style={{ marginTop: 14, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Total Cost</span>
                    <span style={{ ...S.statValue, color: '#f87171' }}>{totalCost.toFixed(2)}{currency}</span>
                  </div>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Total Won</span>
                    <span style={{ ...S.statValue, color: '#4ade80' }}>{totalWin.toFixed(2)}{currency}</span>
                  </div>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Average Multi</span>
                    <span style={{ ...S.statValue, color: '#3b82f6' }}>{avgMulti.toFixed(2)}x</span>
                  </div>
                  <div style={{ ...S.statRow, borderBottom: 'none' }}>
                    <span style={S.statLabel}>Profit / Loss</span>
                    <span style={{ ...S.statValue, color: profitLoss >= 0 ? '#4ade80' : '#f87171' }}>
                      {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}{currency}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Style Tab ─── */}
      {activeTab === 'style' && (
        <div>
          {nb && (
            <button
              style={{ ...S.btn, background: 'rgba(255,255,255,0.06)', color: '#fff', width: '100%', marginBottom: 14 }}
              onClick={syncFromNavbar}
            >
              🔗 Sync Colors from Navbar
            </button>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <label style={S.label}>Accent</label>
              <input type="color" value={c.accentColor || '#3b82f6'} onChange={e => set('accentColor', e.target.value)}
                style={{ width: '100%', height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={S.label}>Background</label>
              <input type="color" value={c.bgColor || '#0a0e1a'} onChange={e => set('bgColor', e.target.value)}
                style={{ width: '100%', height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={S.label}>Text</label>
              <input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)}
                style={{ width: '100%', height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={S.label}>Muted</label>
              <input type="color" value={c.mutedColor || '#64748b'} onChange={e => set('mutedColor', e.target.value)}
                style={{ width: '100%', height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
            </div>
          </div>

          <div style={S.section}>
            <label style={S.label}>Font</label>
            <select style={S.select} value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
