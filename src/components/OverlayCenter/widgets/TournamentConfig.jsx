import React, { useState, useEffect } from 'react';
import { getAllSlots } from '../../../utils/slotUtils';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Arial', sans-serif", label: 'Arial' },
];

/* ─── Helpers ─── */
function ColorPicker({ label, value, onChange }) {
  return (
    <label className="nb-color-item">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
      <span>{label}</span>
    </label>
  );
}

function SliderField({ label, value, onChange, min = 0, max = 100, step = 1, suffix = '' }) {
  return (
    <label className="nb-slider-field">
      <span>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
        <span className="nb-slider-val">{value}{suffix}</span>
      </div>
    </label>
  );
}

export default function TournamentConfig({ config, onChange, allWidgets, mode = 'full' }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [activeTab, setActiveTab] = useState(mode === 'widget' ? 'style' : 'setup');

  /* ─── Slot data (for search) ─── */
  const [slots, setSlots] = useState([]);
  useEffect(() => {
    getAllSlots().then(d => setSlots(d || [])).catch(() => setSlots([]));
  }, []);

  /* ─── Player/slot state ─── */
  const [players, setPlayers] = useState(c.players || ['', '', '', '', '', '', '', '']);
  const [selectedSlots, setSelectedSlots] = useState(c.slots || Array(8).fill(null));
  const [slotSearches, setSlotSearches] = useState((c.slots || []).map(s => s?.name || '').concat(Array(8).fill('')).slice(0, 8));
  const [showSuggestions, setShowSuggestions] = useState(Array(8).fill(false));
  const [matchFormat, setMatchFormat] = useState(c.format || 'single');
  const tournamentStarted = !!c.active;

  /* Sync local state if config changes externally */
  useEffect(() => {
    if (c.players) setPlayers(c.players);
    if (c.slots) {
      setSelectedSlots(c.slots);
      setSlotSearches(c.slots.map(s => s?.name || ''));
    }
    if (c.format) setMatchFormat(c.format);
  }, [c.active]);

  const handlePlayerChange = (i, val) => {
    const next = [...players]; next[i] = val; setPlayers(next);
    if (tournamentStarted && c.data) {
      onChange({ ...c, players: next, data: { ...c.data, players: next } });
    }
  };

  const handleSlotSearch = (i, val) => {
    const next = [...slotSearches]; next[i] = val; setSlotSearches(next);
    const sh = [...showSuggestions]; sh[i] = val.length > 0; setShowSuggestions(sh);
  };

  const handleSlotSelect = (i, slot) => {
    const ns = [...selectedSlots]; ns[i] = slot; setSelectedSlots(ns);
    const nq = [...slotSearches]; nq[i] = slot.name; setSlotSearches(nq);
    const sh = [...showSuggestions]; sh[i] = false; setShowSuggestions(sh);
    if (tournamentStarted && c.data) {
      onChange({ ...c, slots: ns, data: { ...c.data, slots: ns } });
    }
  };

  const filteredSlots = (term) => {
    if (!term) return [];
    return slots.filter(s => s?.name?.toLowerCase().includes(term.toLowerCase())).slice(0, 5);
  };

  const generateBracket = () => [
    { player1: 0, player2: 1, winner: null, data: {} },
    { player1: 2, player2: 3, winner: null, data: {} },
    { player1: 4, player2: 5, winner: null, data: {} },
    { player1: 6, player2: 7, winner: null, data: {} },
  ];

  const startTournament = () => {
    if (players.some(p => !p) || selectedSlots.some(s => !s)) {
      alert('Please fill in all player names and select slots for each player');
      return;
    }
    const data = {
      players, slots: selectedSlots, format: matchFormat,
      phase: 'quarterfinals', matches: generateBracket(), history: [],
    };
    onChange({ ...c, active: true, players, slots: selectedSlots, format: matchFormat, data });
  };

  const resetTournament = () => {
    onChange({ ...c, active: false, data: null });
  };

  const calcMulti = (bet, payout) => {
    const b = parseFloat(bet), p = parseFloat(payout);
    return (isNaN(b) || isNaN(p) || b === 0) ? 0 : p / b;
  };

  const autoCalcWinner = (matchIndex) => {
    const data = c.data; if (!data) return;
    const match = data.matches[matchIndex];
    const md = match.data || {};
    const p1 = md.player1 || {}, p2 = md.player2 || {};
    const isBo3 = data.format === 'bo3';
    let p1X, p2X;
    if (isBo3) {
      p1X = calcMulti(p1.bet, (parseFloat(p1.payout1)||0)+(parseFloat(p1.payout2)||0)+(parseFloat(p1.payout3)||0));
      p2X = calcMulti(p2.bet, (parseFloat(p2.payout1)||0)+(parseFloat(p2.payout2)||0)+(parseFloat(p2.payout3)||0));
    } else {
      p1X = calcMulti(p1.bet, p1.payout);
      p2X = calcMulti(p2.bet, p2.payout);
    }
    if (p1X > 0 || p2X > 0) {
      const updated = { ...data, matches: [...data.matches] };
      updated.matches[matchIndex] = { ...match, winner: p1X > p2X ? match.player1 : match.player2 };
      onChange({ ...c, data: updated });
    }
  };

  const setMatchWinner = (matchIndex, winnerId) => {
    const data = c.data; if (!data) return;
    const updated = { ...data, matches: [...data.matches] };
    updated.matches[matchIndex] = { ...data.matches[matchIndex], winner: winnerId };
    onChange({ ...c, data: updated });
  };

  const savePlayerData = (matchIndex, playerKey, field, value) => {
    const data = c.data; if (!data) return;
    const updated = { ...data, matches: [...data.matches] };
    const match = { ...data.matches[matchIndex] };
    const md = { ...(match.data || {}) };
    md[playerKey] = { ...(md[playerKey] || {}), [field]: parseFloat(value) || 0 };
    match.data = md;
    updated.matches[matchIndex] = match;
    onChange({ ...c, data: updated });
  };

  const advanceToNextPhase = () => {
    const data = c.data; if (!data) return;
    const { matches, phase } = data;
    if (matches.some(m => m.winner === null)) { alert('Complete all matches first'); return; }
    const winners = matches.map(m => m.winner);
    let newPhase = phase, newMatches = [];
    if (phase === 'quarterfinals') {
      newPhase = 'semifinals';
      newMatches = [
        { player1: winners[0], player2: winners[1], winner: null, data: {} },
        { player1: winners[2], player2: winners[3], winner: null, data: {} },
      ];
    } else if (phase === 'semifinals') {
      newPhase = 'finals';
      newMatches = [{ player1: winners[0], player2: winners[1], winner: null, data: {} }];
    }
    onChange({ ...c, data: { ...data, phase: newPhase, matches: newMatches, currentMatch: 0, history: [...(data.history || []), { phase, matches }] } });
  };

  const phaseLabels = { quarterfinals: 'Quarter-Finals', semifinals: 'Semi-Finals', finals: 'Finals' };

  /* ─── Navbar sync ─── */
  const navbarConfig = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!navbarConfig) return;
    setMulti({
      bgColor: navbarConfig.bgColor || '#13151e',
      cardBg: navbarConfig.bgColor || '#1a1d2e',
      cardBorder: navbarConfig.accentColor || 'rgba(255,255,255,0.08)',
      nameColor: navbarConfig.textColor || '#ffffff',
      fontFamily: navbarConfig.fontFamily || "'Inter', sans-serif",
    });
  };

  /* ─── Preset system ─── */
  const [presetName, setPresetName] = useState('');
  const PRESET_KEYS = [
    'layout', 'showBg', 'bgColor', 'cardBg', 'cardBorder', 'cardRadius', 'cardBorderWidth',
    'nameColor', 'nameSize', 'multiColor', 'multiSize',
    'tabBg', 'tabActiveBg', 'tabColor', 'tabActiveColor', 'tabBorder',
    'eliminatedOpacity', 'showSlotName', 'slotNameColor', 'slotNameSize',
    'fontFamily', 'borderRadius', 'borderWidth', 'borderColor',
    'cardGap', 'containerPadding', 'swordColor', 'swordBg', 'swordSize',
    'xIconColor', 'xIconBg',
  ];

  /* ─── Built-in presets ─── */
  const BUILTIN_PRESETS = [
    {
      name: '🖼️ Showcase (Large Images)',
      builtin: true,
      values: {
        layout: 'showcase',
        showBg: false,
        cardBg: '#1a1d2e',
        cardBorder: 'rgba(255,255,255,0.1)',
        cardRadius: 14,
        cardBorderWidth: 1,
        nameSize: 18,
        multiSize: 20,
        slotNameSize: 13,
        showSlotName: true,
        swordSize: 28,
        containerPadding: 6,
        cardGap: 6,
        eliminatedOpacity: 0.3,
      },
    },
    {
      name: '📋 Vertical Stack',
      builtin: true,
      values: {
        layout: 'vertical',
        showBg: false,
        cardBg: '#1a1d2e',
        cardBorder: 'rgba(255,255,255,0.08)',
        cardRadius: 10,
        cardBorderWidth: 1,
        nameSize: 13,
        multiSize: 14,
        slotNameSize: 10,
        showSlotName: true,
        swordSize: 18,
        containerPadding: 4,
        cardGap: 4,
        eliminatedOpacity: 0.35,
      },
    },
  ];

  const savePreset = () => {
    const name = presetName.trim(); if (!name) return;
    const snapshot = {};
    PRESET_KEYS.forEach(k => { if (c[k] !== undefined) snapshot[k] = c[k]; });
    const existing = c.tournamentPresets || [];
    const idx = existing.findIndex(p => p.name === name);
    const updated = idx >= 0
      ? existing.map((p, i) => i === idx ? { name, values: snapshot, savedAt: Date.now() } : p)
      : [...existing, { name, values: snapshot, savedAt: Date.now() }];
    set('tournamentPresets', updated);
    setPresetName('');
  };
  const loadPreset = (preset) => setMulti(preset.values);
  const deletePreset = (name) => set('tournamentPresets', (c.tournamentPresets || []).filter(p => p.name !== name));

  const allTabs = [
    { id: 'setup',   label: '⚙️ Setup' },
    { id: 'matches', label: '🏆 Matches' },
    { id: 'style',   label: '🎨 Style' },
    { id: 'presets', label: '💾 Presets' },
  ];
  const SIDEBAR_TABS = new Set(['setup', 'matches']);
  const WIDGET_TABS  = new Set(['style', 'presets']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
             : mode === 'widget'  ? allTabs.filter(t => WIDGET_TABS.has(t.id))
             : allTabs;

  return (
    <div className="bh-config">

      {/* Tab nav */}
      <div className="nb-tabs" style={{ marginTop: 4 }}>
        {tabs.map(t => (
          <button key={t.id}
            className={`nb-tab ${activeTab === t.id ? 'nb-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ SETUP TAB ═══════ */}
      {activeTab === 'setup' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Tournament Info</h4>
          <label className="nb-field">
            <span>Title</span>
            <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Tournament name" />
          </label>
          <label className="nb-field">
            <span>Prize</span>
            <input value={c.prize || ''} onChange={e => set('prize', e.target.value)} placeholder="€1,000" />
          </label>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Match Format</h4>
          <div className="oc-bg-mode-grid">
            {[
              { id: 'single', icon: '🎯', label: 'Single' },
              { id: 'bo3', icon: '🔥', label: 'Best of 3' },
            ].map(f => (
              <button key={f.id}
                className={`oc-bg-mode-btn ${matchFormat === f.id ? 'oc-bg-mode-btn--active' : ''}`}
                onClick={() => { setMatchFormat(f.id); if (!tournamentStarted) {} }}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Players & Slots</h4>
          <p className="oc-config-hint" style={{ marginBottom: 6 }}>
            8 players, each assigned a slot from your database.
          </p>
          <div className="tm-players-inline">
            {players.map((player, i) => (
              <div key={i} className="tm-player-row-inline">
                <span className="tm-player-num-inline">#{i + 1}</span>
                <input type="text" value={player} onChange={e => handlePlayerChange(i, e.target.value)}
                  placeholder="Player name" className="tm-player-input-inline" disabled={tournamentStarted} />
                <div className="tm-slot-wrapper-inline">
                  <input type="text" value={slotSearches[i] || ''} onChange={e => handleSlotSearch(i, e.target.value)}
                    onFocus={() => { const s = [...showSuggestions]; s[i] = (slotSearches[i]||'').length > 0; setShowSuggestions(s); }}
                    placeholder="Search slot..." className="tm-slot-input-inline" disabled={tournamentStarted} />
                  {selectedSlots[i] && (
                    <img src={selectedSlots[i].image} alt="" className="tm-slot-thumb-inline" />
                  )}
                  {showSuggestions[i] && filteredSlots(slotSearches[i]).length > 0 && (
                    <div className="tm-slot-suggestions">
                      {filteredSlots(slotSearches[i]).map(slot => (
                        <div key={slot.id} className="tm-slot-suggestion" onClick={() => handleSlotSelect(i, slot)}>
                          <img src={slot.image} alt={slot.name} />
                          <span>{slot.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {!tournamentStarted ? (
              <button className="nb-preset-load-btn" style={{ flex: 1 }} onClick={startTournament}>
                🚀 Start Tournament
              </button>
            ) : (
              <button className="nb-preset-del-btn" style={{ flex: 1, padding: '10px 16px' }} onClick={resetTournament}>
                🗑️ Reset Tournament
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MATCHES TAB ═══════ */}
      {activeTab === 'matches' && (
        <div className="nb-section">
          {!tournamentStarted ? (
            <p className="oc-config-hint">Start a tournament in the Setup tab first.</p>
          ) : (
            <>
              {(() => {
                const matchList = c.data?.matches || [];
                const currentMatchIdx = c.data?.currentMatch ?? 0;
                const isBo3 = c.data?.format === 'bo3';
                const totalMatches = matchList.length;

                const goToMatch = (idx) => {
                  if (!c.data) return;
                  onChange({ ...c, data: { ...c.data, currentMatch: idx } });
                };

                const match = matchList[currentMatchIdx];
                if (!match) return <p className="oc-config-hint">No matches available.</p>;

                const md = match.data || {};
                const p1d = md.player1 || {}, p2d = md.player2 || {};
                const p1Name = players[match.player1] || '?';
                const p2Name = players[match.player2] || '?';

                return (
                  <>
                    <h4 className="nb-subtitle">
                      {phaseLabels[c.data?.phase] || 'Tournament'} — {totalMatches} match{totalMatches !== 1 ? 'es' : ''}
                    </h4>

                    {/* Match Navigator */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 12, margin: '8px 0 12px', padding: '8px 0',
                    }}>
                      <button
                        className="nb-preset-load-btn"
                        style={{ padding: '6px 14px', opacity: currentMatchIdx === 0 ? 0.4 : 1 }}
                        disabled={currentMatchIdx === 0}
                        onClick={() => goToMatch(currentMatchIdx - 1)}>
                        ◀ Prev
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
                        Match {currentMatchIdx + 1} / {totalMatches}
                      </span>
                      <button
                        className="nb-preset-load-btn"
                        style={{ padding: '6px 14px', opacity: currentMatchIdx >= totalMatches - 1 ? 0.4 : 1 }}
                        disabled={currentMatchIdx >= totalMatches - 1}
                        onClick={() => goToMatch(currentMatchIdx + 1)}>
                        Next ▶
                      </button>
                    </div>

                    {/* Match overview pills */}
                    <div style={{
                      display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10, justifyContent: 'center',
                    }}>
                      {matchList.map((m, i) => {
                        const isCurrent = i === currentMatchIdx;
                        const hasWinner = m.winner !== null && m.winner !== undefined;
                        return (
                          <button key={i} onClick={() => goToMatch(i)} style={{
                            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            border: isCurrent ? '2px solid #9346ff' : '1px solid rgba(255,255,255,0.15)',
                            background: hasWinner ? 'rgba(34,197,94,0.2)' : isCurrent ? 'rgba(147,70,255,0.2)' : 'rgba(255,255,255,0.05)',
                            color: hasWinner ? '#22c55e' : isCurrent ? '#c084fc' : '#94a3b8',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}>
                            {hasWinner ? '✓' : ''} M{i + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active match editing */}
                    <div className="tm-match-inline">
                      <div className="tm-match-inline-header">
                        <span>⚔️ <strong>{p1Name}</strong> vs <strong>{p2Name}</strong></span>
                      </div>

                      <div className="tm-match-inline-body">
                        {/* P1 inputs */}
                        <div className="tm-match-inline-player">
                          <span className="tm-match-inline-pname">{p1Name}</span>
                          <div className="tm-match-inline-inputs">
                            <label>Bet €<input type="number" key={`p1bet-${currentMatchIdx}`} defaultValue={p1d.bet || ''} placeholder="0"
                              onBlur={e => savePlayerData(currentMatchIdx, 'player1', 'bet', e.target.value)} /></label>
                            {isBo3 ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                {['payout1','payout2','payout3'].map((f, gi) => (
                                  <label key={f}>G{gi+1}<input type="number" key={`p1${f}-${currentMatchIdx}`} defaultValue={p1d[f] || ''} placeholder="0"
                                    onBlur={e => { savePlayerData(currentMatchIdx, 'player1', f, e.target.value); setTimeout(() => autoCalcWinner(currentMatchIdx), 100); }} /></label>
                                ))}
                              </div>
                            ) : (
                              <label>Payout €<input type="number" key={`p1pay-${currentMatchIdx}`} defaultValue={p1d.payout || ''} placeholder="0"
                                onBlur={e => { savePlayerData(currentMatchIdx, 'player1', 'payout', e.target.value); setTimeout(() => autoCalcWinner(currentMatchIdx), 100); }} /></label>
                            )}
                          </div>
                          <button className={`tm-winner-inline ${match.winner === match.player1 ? 'tm-winner-active' : ''}`}
                            onClick={() => setMatchWinner(currentMatchIdx, match.winner === match.player1 ? null : match.player1)}>
                            {match.winner === match.player1 ? '👑 Winner' : 'Set Winner'}
                          </button>
                        </div>

                        <span className="tm-vs-inline">VS</span>

                        {/* P2 inputs */}
                        <div className="tm-match-inline-player">
                          <span className="tm-match-inline-pname">{p2Name}</span>
                          <div className="tm-match-inline-inputs">
                            <label>Bet €<input type="number" key={`p2bet-${currentMatchIdx}`} defaultValue={p2d.bet || ''} placeholder="0"
                              onBlur={e => savePlayerData(currentMatchIdx, 'player2', 'bet', e.target.value)} /></label>
                            {isBo3 ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                {['payout1','payout2','payout3'].map((f, gi) => (
                                  <label key={f}>G{gi+1}<input type="number" key={`p2${f}-${currentMatchIdx}`} defaultValue={p2d[f] || ''} placeholder="0"
                                    onBlur={e => { savePlayerData(currentMatchIdx, 'player2', f, e.target.value); setTimeout(() => autoCalcWinner(currentMatchIdx), 100); }} /></label>
                                ))}
                              </div>
                            ) : (
                              <label>Payout €<input type="number" key={`p2pay-${currentMatchIdx}`} defaultValue={p2d.payout || ''} placeholder="0"
                                onBlur={e => { savePlayerData(currentMatchIdx, 'player2', 'payout', e.target.value); setTimeout(() => autoCalcWinner(currentMatchIdx), 100); }} /></label>
                            )}
                          </div>
                          <button className={`tm-winner-inline ${match.winner === match.player2 ? 'tm-winner-active' : ''}`}
                            onClick={() => setMatchWinner(currentMatchIdx, match.winner === match.player2 ? null : match.player2)}>
                            {match.winner === match.player2 ? '👑 Winner' : 'Set Winner'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Auto-advance hint */}
                    {match.winner !== null && match.winner !== undefined && currentMatchIdx < totalMatches - 1 && (
                      <button className="nb-preset-load-btn"
                        style={{ marginTop: 8, width: '100%', padding: '8px 16px' }}
                        onClick={() => goToMatch(currentMatchIdx + 1)}>
                        ✓ Match done — Go to Match {currentMatchIdx + 2} →
                      </button>
                    )}
                  </>
                );
              })()}

              {c.data?.phase !== 'finals' && (
                <button className="nb-preset-load-btn" style={{ marginTop: 10, width: '100%' }} onClick={advanceToNextPhase}>
                  ⏭️ Advance to Next Phase
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════ STYLE TAB ═══════ */}
      {activeTab === 'style' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Sync</h4>
          {navbarConfig && (
            <button className="nb-preset-load-btn" onClick={syncFromNavbar} style={{ marginBottom: 10, width: '100%' }}>
              🔗 Sync Colors from Navbar
            </button>
          )}

          <h4 className="nb-subtitle">Layout Mode</h4>
          <div className="oc-bg-mode-grid" style={{ marginBottom: 10 }}>
            {[
              { id: 'grid',     icon: '⊞', label: 'Grid' },
              { id: 'showcase', icon: '🖼️', label: 'Showcase' },
              { id: 'vertical', icon: '📋', label: 'Vertical' },
            ].map(m => (
              <button key={m.id}
                className={`oc-bg-mode-btn ${(c.layout || 'grid') === m.id ? 'oc-bg-mode-btn--active' : ''}`}
                onClick={() => set('layout', m.id)}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            {(c.layout || 'grid') === 'showcase'
              ? 'One match at a time — large images, great readability.'
              : (c.layout || 'grid') === 'vertical'
              ? 'All matches stacked vertically — compact horizontal rows.'
              : 'Classic 2-column grid — fits all matches at once.'}
          </p>

          <h4 className="nb-subtitle">Container</h4>
          <label className="nb-field">
            <span>Show Background</span>
            <input type="checkbox" checked={c.showBg !== false} onChange={e => set('showBg', e.target.checked)} />
          </label>
          {c.showBg !== false && (
            <>
              <div className="nb-color-grid">
                <ColorPicker label="Background" value={c.bgColor || '#13151e'} onChange={v => set('bgColor', v)} />
                <ColorPicker label="Border" value={c.borderColor || 'transparent'} onChange={v => set('borderColor', v)} />
              </div>
              <SliderField label="Border Radius" value={c.borderRadius ?? 12} onChange={v => set('borderRadius', v)} min={0} max={40} suffix="px" />
              <SliderField label="Border Width" value={c.borderWidth ?? 0} onChange={v => set('borderWidth', v)} min={0} max={6} suffix="px" />
            </>
          )}
          <SliderField label="Padding" value={c.containerPadding ?? 6} onChange={v => set('containerPadding', v)} min={0} max={30} suffix="px" />
          <SliderField label="Card Gap" value={c.cardGap ?? 6} onChange={v => set('cardGap', v)} min={0} max={24} suffix="px" />

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Cards</h4>
          <div className="nb-color-grid">
            <ColorPicker label="Card BG" value={c.cardBg || '#1a1d2e'} onChange={v => set('cardBg', v)} />
            <ColorPicker label="Card Border" value={c.cardBorder || 'rgba(255,255,255,0.08)'} onChange={v => set('cardBorder', v)} />
          </div>
          <SliderField label="Card Radius" value={c.cardRadius ?? 12} onChange={v => set('cardRadius', v)} min={0} max={30} suffix="px" />
          <SliderField label="Card Border Width" value={c.cardBorderWidth ?? 1} onChange={v => set('cardBorderWidth', v)} min={0} max={6} suffix="px" />

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Tabs</h4>
          <div className="nb-color-grid">
            <ColorPicker label="Tab BG" value={c.tabBg || 'rgba(255,255,255,0.05)'} onChange={v => set('tabBg', v)} />
            <ColorPicker label="Active BG" value={c.tabActiveBg || 'rgba(147,70,255,0.2)'} onChange={v => set('tabActiveBg', v)} />
            <ColorPicker label="Tab Text" value={c.tabColor || '#94a3b8'} onChange={v => set('tabColor', v)} />
            <ColorPicker label="Active Text" value={c.tabActiveColor || '#ffffff'} onChange={v => set('tabActiveColor', v)} />
            <ColorPicker label="Active Border" value={c.tabBorder || 'rgba(147,70,255,0.4)'} onChange={v => set('tabBorder', v)} />
          </div>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Text</h4>
          <div className="nb-color-grid">
            <ColorPicker label="Player Name" value={c.nameColor || '#ffffff'} onChange={v => set('nameColor', v)} />
            <ColorPicker label="Multiplier" value={c.multiColor || '#facc15'} onChange={v => set('multiColor', v)} />
            <ColorPicker label="Slot Name" value={c.slotNameColor || '#ffffff'} onChange={v => set('slotNameColor', v)} />
          </div>
          <SliderField label="Name Size" value={c.nameSize ?? 13} onChange={v => set('nameSize', v)} min={8} max={24} suffix="px" />
          <SliderField label="Multi Size" value={c.multiSize ?? 14} onChange={v => set('multiSize', v)} min={8} max={24} suffix="px" />
          <SliderField label="Slot Name Size" value={c.slotNameSize ?? 11} onChange={v => set('slotNameSize', v)} min={8} max={18} suffix="px" />

          <label className="nb-field" style={{ marginTop: 8 }}>
            <span>Font</span>
            <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>

          <label className="nb-field" style={{ marginTop: 6 }}>
            <span>Show Slot Names</span>
            <input type="checkbox" checked={c.showSlotName !== false} onChange={e => set('showSlotName', e.target.checked)} />
          </label>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Sword Icon</h4>
          <SliderField label="Sword Size" value={c.swordSize ?? 22} onChange={v => set('swordSize', v)} min={14} max={40} step={1} suffix="px" />
          <div className="nb-color-grid">
            <ColorPicker label="Sword Color" value={c.swordColor || '#eab308'} onChange={v => set('swordColor', v)} />
            <ColorPicker label="Sword BG" value={c.swordBg || 'rgba(0,0,0,0.85)'} onChange={v => set('swordBg', v)} />
          </div>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Eliminated</h4>
          <SliderField label="Eliminated Opacity" value={c.eliminatedOpacity ?? 0.35} onChange={v => set('eliminatedOpacity', v)} min={0.1} max={1} step={0.05} suffix="" />
          <div className="nb-color-grid">
            <ColorPicker label="X Icon Color" value={c.xIconColor || '#eab308'} onChange={v => set('xIconColor', v)} />
            <ColorPicker label="X Icon BG" value={c.xIconBg || 'rgba(0,0,0,0.7)'} onChange={v => set('xIconBg', v)} />
          </div>
        </div>
      )}

      {/* ═══════ PRESETS TAB ═══════ */}
      {activeTab === 'presets' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Save Current Style</h4>
          <div className="nb-preset-save">
            <input className="nb-preset-input"
              value={presetName} onChange={e => setPresetName(e.target.value)}
              placeholder="Preset name…" onKeyDown={e => e.key === 'Enter' && savePreset()} />
            <button className="nb-preset-save-btn" onClick={savePreset} disabled={!presetName.trim()}>Save</button>
          </div>

          {/* Built-in presets */}
          <h4 className="nb-subtitle" style={{ marginTop: 10 }}>Built-in</h4>
          <div className="nb-preset-list">
            {BUILTIN_PRESETS.map(p => (
              <div key={p.name} className="nb-preset-pill nb-preset-pill--builtin">
                <div className="nb-preset-pill__info">
                  <span className="nb-preset-pill__name">{p.name}</span>
                </div>
                <div className="nb-preset-pill__actions">
                  <button className="nb-preset-pill__load" onClick={() => loadPreset(p)}>Load</button>
                </div>
              </div>
            ))}
          </div>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Saved</h4>
          {(c.tournamentPresets || []).length === 0 ? (
            <p className="oc-config-hint" style={{ marginTop: 4, opacity: 0.6 }}>No saved presets yet.</p>
          ) : (
            <div className="nb-preset-list">
              {(c.tournamentPresets || []).map(p => (
                <div key={p.name} className="nb-preset-pill">
                  <div className="nb-preset-pill__info">
                    <span className="nb-preset-pill__name">{p.name}</span>
                    <span className="nb-preset-pill__date">{new Date(p.savedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="nb-preset-pill__actions">
                    <button className="nb-preset-pill__load" onClick={() => loadPreset(p)}>Load</button>
                    <button className="nb-preset-pill__delete" onClick={() => deletePreset(p.name)} title="Delete preset">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
