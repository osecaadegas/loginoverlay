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

export default function SingleSlotConfig({ config, onChange, allWidgets, mode }) {
  const { user } = useAuth();
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [records, setRecords] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [message, setMessage] = useState('');

  const allTabs = [
    { id: 'slot', label: '🎰 Slot' },
    { id: 'records', label: '📊 Records' },
    { id: 'style', label: '🎨 Style' },
  ];

  const SIDEBAR_TABS = new Set(['slot', 'records']);
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

  // Load user records for selected slot
  const loadRecords = useCallback(async (slotName) => {
    if (!user || !slotName) return;
    setLoadingRecords(true);
    try {
      // Load aggregate record
      const { data: rec } = await supabase
        .from('user_slot_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('slot_name', slotName)
        .maybeSingle();

      setRecords(rec || null);

      // Load recent results
      const { data: results } = await supabase
        .from('user_slot_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('slot_name', slotName)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentResults(results || []);

      // Update widget config with record data
      if (rec) {
        setMulti({
          averageMulti: Math.round((rec.average_multi || 0) * 10) / 10,
          bestMulti: Math.round((rec.best_multiplier || 0) * 10) / 10,
          totalBonuses: rec.total_bonuses || 0,
          bestWin: Math.round((rec.best_win || 0) * 10) / 10,
          lastBet: Number(rec.last_bet_size) || 0,
          lastPay: Math.round((rec.last_payout || 0) * 10) / 10,
          lastMulti: Math.round((rec.last_multi || 0) * 10) / 10,
          lastWinIndex: rec.total_bonuses || 0,
        });
      }
    } catch (err) {
      console.warn('Failed to load slot records:', err);
    }
    setLoadingRecords(false);
  }, [user]);

  // Re-load when slot changes
  useEffect(() => {
    if (c.slotName) loadRecords(c.slotName);
  }, [c.slotName, loadRecords]);

  const selectSlot = (slot) => {
    setMulti({
      slotName: slot.name,
      provider: slot.provider || '',
      imageUrl: slot.image || '',
      slotId: slot.id,
      rtp: slot.rtp || '',
      // Reset stats until loaded
      averageMulti: 0,
      bestMulti: 0,
      totalBonuses: 0,
      bestWin: 0,
      lastBet: 0,
      lastPay: 0,
      lastMulti: 0,
      lastWinIndex: 0,
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  // Manual result entry (add a result directly)
  const [manualBet, setManualBet] = useState('');
  const [manualPay, setManualPay] = useState('');
  const [addingResult, setAddingResult] = useState(false);

  const handleAddResult = async () => {
    if (!user || !c.slotName || !manualBet || !manualPay) return;
    setAddingResult(true);
    setMessage('');

    const bet = Number(manualBet);
    const pay = Number(manualPay);
    const multi = bet > 0 ? Math.round((pay / bet) * 100) / 100 : 0;

    try {
      // Insert individual result
      await supabase.from('user_slot_results').insert({
        user_id: user.id,
        slot_name: c.slotName,
        slot_provider: c.provider || null,
        bet_size: bet,
        payout: pay,
        multiplier: multi,
      });

      // Upsert aggregate record
      const { data: existing } = await supabase
        .from('user_slot_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('slot_name', c.slotName)
        .maybeSingle();

      if (existing) {
        const newTotal = (existing.total_bonuses || 0) + 1;
        const newWagered = Number(existing.total_wagered || 0) + bet;
        const newWon = Number(existing.total_won || 0) + pay;
        const newBestMulti = Math.max(Number(existing.best_multiplier || 0), multi);
        const newBestWin = Math.max(Number(existing.best_win || 0), pay);
        const newAvg = newTotal > 0 ? Math.round(((Number(existing.average_multi || 0) * (newTotal - 1) + multi) / newTotal) * 100) / 100 : multi;

        await supabase.from('user_slot_records')
          .update({
            total_bonuses: newTotal,
            total_wagered: newWagered,
            total_won: newWon,
            best_multiplier: newBestMulti,
            best_win: newBestWin,
            average_multi: newAvg,
            last_bet_size: bet,
            last_payout: pay,
            last_multi: multi,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_slot_records').insert({
          user_id: user.id,
          slot_id: c.slotId || null,
          slot_name: c.slotName,
          slot_provider: c.provider || null,
          slot_image: c.imageUrl || null,
          total_bonuses: 1,
          total_wagered: bet,
          total_won: pay,
          best_multiplier: multi,
          best_win: pay,
          average_multi: multi,
          last_bet_size: bet,
          last_payout: pay,
          last_multi: multi,
        });
      }

      setManualBet('');
      setManualPay('');
      setMessage('✅ Result added!');
      setTimeout(() => setMessage(''), 3000);

      // Reload records
      await loadRecords(c.slotName);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('42P01')) {
        setMessage('⚠️ Table not found. Run migration: add_user_slot_records.sql');
      } else {
        setMessage('⚠️ ' + (msg || 'Failed to add result'));
      }
    }
    setAddingResult(false);
  };

  // Sync colors from navbar
  const nb = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!nb) return;
    setMulti({
      bgColor: nb.bgColor || '#111318',
      accentColor: nb.accentColor || '#7c3aed',
      textColor: nb.textColor || '#f1f5f9',
      mutedColor: nb.mutedColor || '#94a3b8',
      fontFamily: nb.fontFamily || "'Inter', sans-serif",
    });
  };

  const currency = c.currency || '€';

  const S = configStyles('#7c3aed');

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

      {/* ─── Slot Tab ─── */}
      {activeTab === 'slot' && (
        <div>
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
                  {c.provider && <div style={{ fontSize: '0.72rem', color: '#7c3aed' }}>{c.provider}</div>}
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
              <input style={S.input} value={c.currency || '€'} onChange={e => set('currency', e.target.value)} />
            </div>
          </div>

          <div style={S.section}>
            <label style={S.label}>Image URL</label>
            <input style={S.input} value={c.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
          </div>

          <div style={S.section}>
            <label style={S.label}>RTP %</label>
            <input style={S.input} value={c.rtp || ''} onChange={e => set('rtp', e.target.value)} placeholder="96.5" />
          </div>

          {/* Add result manually */}
          <div style={{ ...S.section, padding: 12, background: 'rgba(124,58,237,0.06)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.15)' }}>
            <label style={{ ...S.label, color: '#7c3aed' }}>➕ Add Result</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input style={S.input} type="number" placeholder={`Bet (${currency})`} value={manualBet} onChange={e => setManualBet(e.target.value)} />
              <input style={S.input} type="number" placeholder={`Payout (${currency})`} value={manualPay} onChange={e => setManualPay(e.target.value)} />
            </div>
            {manualBet > 0 && manualPay > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#a0a0b4', marginBottom: 6 }}>
                Multi: {Math.round((Number(manualPay) / Number(manualBet)) * 100) / 100}X
              </div>
            )}
            <button
              style={{ ...S.btn, background: '#7c3aed', color: '#fff', width: '100%', opacity: addingResult ? 0.6 : 1 }}
              onClick={handleAddResult}
              disabled={addingResult || !c.slotName || !manualBet || !manualPay}
            >
              {addingResult ? 'Saving...' : 'Add Result'}
            </button>
            {message && <div style={S.msg}>{message}</div>}
          </div>
        </div>
      )}

      {/* ─── Records Tab ─── */}
      {activeTab === 'records' && (
        <div>
          {!c.slotName ? (
            <div style={{ color: '#a0a0b4', fontSize: '0.82rem', textAlign: 'center', padding: 20 }}>
              Select a slot first to see records
            </div>
          ) : loadingRecords ? (
            <div style={{ color: '#a0a0b4', fontSize: '0.82rem', textAlign: 'center', padding: 20 }}>
              Loading records...
            </div>
          ) : (
            <>
              <h4 style={{ color: '#fff', fontSize: '0.85rem', marginBottom: 12 }}>
                📊 Your Records — {c.slotName}
              </h4>

              {records ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Total Bonuses</span>
                    <span style={S.statValue}>{records.total_bonuses}</span>
                  </div>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Total Wagered</span>
                    <span style={S.statValue}>{Number(records.total_wagered).toFixed(2)}{currency}</span>
                  </div>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Total Won</span>
                    <span style={S.statValue}>{Number(records.total_won).toFixed(2)}{currency}</span>
                  </div>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Average Multi</span>
                    <span style={S.statValue}>{Number(records.average_multi).toFixed(1)}X</span>
                  </div>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Best Multiplier</span>
                    <span style={{ ...S.statValue, color: '#7c3aed' }}>{Number(records.best_multiplier).toFixed(1)}X</span>
                  </div>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Best Win</span>
                    <span style={{ ...S.statValue, color: '#7c3aed' }}>{Number(records.best_win).toFixed(2)}{currency}</span>
                  </div>
                  <div style={{ ...S.statRow, borderBottom: 'none' }}>
                    <span style={S.statLabel}>Profit / Loss</span>
                    <span style={{ ...S.statValue, color: (records.total_won - records.total_wagered) >= 0 ? '#4ade80' : '#f87171' }}>
                      {(records.total_won - records.total_wagered) >= 0 ? '+' : ''}{(records.total_won - records.total_wagered).toFixed(2)}{currency}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#a0a0b4', fontSize: '0.8rem', marginBottom: 16, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  No records yet. Add results to start tracking!
                </div>
              )}

              {/* Recent results */}
              {recentResults.length > 0 && (
                <>
                  <h4 style={{ color: '#fff', fontSize: '0.82rem', marginBottom: 8 }}>📋 Recent Results</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 250, overflowY: 'auto' }}>
                    {recentResults.map((r, i) => (
                      <div key={r.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem',
                      }}>
                        <span style={{ color: '#a0a0b4' }}>#{recentResults.length - i}</span>
                        <span style={{ color: '#fff' }}>Bet: {Number(r.bet_size)}{currency}</span>
                        <span style={{ color: '#7c3aed', fontWeight: 700 }}>Pay: {Number(r.payout)}{currency}</span>
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>{Number(r.multiplier).toFixed(1)}X</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button
                style={{ ...S.btn, background: 'rgba(255,255,255,0.06)', color: '#a0a0b4', width: '100%', marginTop: 12 }}
                onClick={() => loadRecords(c.slotName)}
              >
                🔄 Refresh Records
              </button>
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
              <input type="color" value={c.accentColor || '#7c3aed'} onChange={e => set('accentColor', e.target.value)}
                style={{ width: '100%', height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={S.label}>Background</label>
              <input type="color" value={c.bgColor || '#0d0d1e'} onChange={e => set('bgColor', e.target.value)}
                style={{ width: '100%', height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={S.label}>Text</label>
              <input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)}
                style={{ width: '100%', height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={S.label}>Muted</label>
              <input type="color" value={c.mutedColor || '#94a3b8'} onChange={e => set('mutedColor', e.target.value)}
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
