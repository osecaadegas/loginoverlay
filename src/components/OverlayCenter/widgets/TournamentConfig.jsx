import React, { useState, useEffect, useCallback } from 'react';
import { getAllSlots, sortSlotsByProviderPriority } from '../../../utils/slotUtils';
import ColorPickerBase from './shared/ColorPicker';
import TabBar from './shared/TabBar';
import {
  TOURNAMENT_TYPES,
  MATCH_STATUS,
  setManualWinner,
  resetMatch,
  calcRoundResult,
  calcMatchWinner,
  getBoScoreboard,
  formatResult,
  getRoundInputFields,
} from './tournament/tournamentEngine';
import {
  generateBracket,
  updateBracketMatch,
  propagateWinner,
  getBracketStats,
  getChampion,
  seedPlayers,
} from '../../TournamentsPage/bracketUtils';

const ColorPicker = (props) => <ColorPickerBase {...props} showHex={false} className="nb-color-item" />;

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Arial', sans-serif", label: 'Arial' },
];

/* ─── Helpers ─── */
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

/* ─── Numeric input with controlled value ─── */
function NumInput({ value, onChange, placeholder = '0', prefix = '€', style = {} }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => { setLocal(value ?? ''); }, [value]);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, ...style }}>
      {prefix && <span style={{ fontSize: 11, color: '#94a3b8' }}>{prefix}</span>}
      <input
        type="number"
        step="any"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          const v = parseFloat(local);
          onChange(isNaN(v) ? null : v);
        }}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
    </label>
  );
}

export default function TournamentConfig({ config, onChange, allWidgets, mode = 'full' }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [activeTab, setActiveTab] = useState(mode === 'widget' ? 'style' : 'bracket');

  /* ─── Slot data (for search) ─── */
  const [slots, setSlots] = useState([]);
  useEffect(() => {
    getAllSlots().then(d => setSlots(d || [])).catch(() => setSlots([]));
  }, []);

  /* ─── Slot search ─── */
  const filteredSlots = useCallback((term) => {
    if (!term || term.length < 1) return [];
    return sortSlotsByProviderPriority(slots.filter(s => s?.name?.toLowerCase().includes(term.toLowerCase()))).slice(0, 5);
  }, [slots]);

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
    'bkHeaderBg', 'bkHeaderColor', 'bkAccent', 'bkDividerColor',
    'bkFinalBg', 'bkFinalBorder', 'bkRowBg', 'tournamentNumber',
    'arenaAccent', 'arenaWinColor', 'arenaCardBg', 'arenaCurrency', 'arenaLoseOpacity',
    'ftAccent', 'ftCyan', 'ftBg', 'ftCardBg', 'ftBorder',
    'esCyan', 'esPurple', 'esGold', 'esBg', 'esCardBg', 'esBorder',
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
    {
      name: '📊 Bracket (OBS)',
      builtin: true,
      values: {
        layout: 'bracket',
        showBg: false,
        cardRadius: 6,
        nameSize: 12,
        multiSize: 13,
        slotNameSize: 11,
        showSlotName: true,
        containerPadding: 6,
        cardGap: 5,
        eliminatedOpacity: 0.35,
        bkHeaderBg: 'rgba(20,24,40,0.95)',
        bkHeaderColor: '#e2e8f0',
        bkAccent: '#6366f1',
        bkDividerColor: 'rgba(255,255,255,0.08)',
        bkFinalBg: 'rgba(59,130,246,0.12)',
        bkFinalBorder: 'rgba(59,130,246,0.35)',
        bkRowBg: 'rgba(255,255,255,0.02)',
      },
    },
    {
      name: '⚔️ Battle Arena',
      builtin: true,
      values: {
        layout: 'arena',
        showBg: true,
        bgColor: '#1a1040',
        cardRadius: 10,
        nameSize: 15,
        multiSize: 16,
        showSlotName: false,
        containerPadding: 8,
        cardGap: 10,
        eliminatedOpacity: 0.55,
        borderRadius: 14,
        borderWidth: 0,
        arenaAccent: '#eab308',
        arenaWinColor: '#22c55e',
        arenaCardBg: '#1e1550',
        arenaCurrency: '$',
      },
    },
    {
      name: '🚀 Futuristic Masters',
      builtin: true,
      values: {
        layout: 'futuristic',
        showBg: true,
        bgColor: '#0a1628',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(0,212,255,0.2)',
        nameSize: 14,
        multiSize: 16,
        showSlotName: true,
        containerPadding: 8,
        cardGap: 6,
        eliminatedOpacity: 0.4,
        ftAccent: '#eab308',
        ftCyan: '#00d4ff',
        ftBg: '#0a1628',
        ftCardBg: '#0f1f3a',
        ftBorder: 'rgba(0,212,255,0.25)',
      },
    },
    {
      name: '🎮 Cyberpunk Esports',
      builtin: true,
      values: {
        layout: 'esports',
        showBg: true,
        bgColor: '#030712',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,229,255,0.15)',
        nameSize: 14,
        multiSize: 16,
        showSlotName: false,
        containerPadding: 6,
        cardGap: 6,
        eliminatedOpacity: 0.35,
        esCyan: '#00e5ff',
        esPurple: '#a855f7',
        esGold: '#fbbf24',
        esBg: '#030712',
        esCardBg: 'rgba(15,23,42,0.75)',
        esBorder: 'rgba(0,229,255,0.18)',
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

  /* ─── Bracket tournament state ─── */
  const bracketPhase = c.bracketPhase || 'setup'; // setup | active | completed
  const bracketData = c.bracketData || [];
  const bracketPlayers = c.bracketPlayers || [];
  const bracketType = c.bracketType || 'bonus';
  const bracketPlayerCount = c.bracketPlayerCount || 8;
  const bracketActiveRound = c.bracketActiveRound ?? 0;
  const bracketActiveMatch = c.bracketActiveMatch ?? 0;
  const bracketTypeConfig = c.bracketTypeConfig || { numSpins: 50, drawRule: 'no_point' };

  /* Init bracket players when count changes */
  const [localBracketPlayers, setLocalBracketPlayers] = useState(() => {
    const arr = [];
    for (let i = 0; i < bracketPlayerCount; i++) {
      arr.push(bracketPlayers[i] || { id: `p${i}`, name: '', twitchUsername: '', slot: { name: '', image: null } });
    }
    return arr;
  });

  useEffect(() => {
    if (bracketPhase !== 'setup') return;
    setLocalBracketPlayers(prev => {
      const arr = [];
      for (let i = 0; i < bracketPlayerCount; i++) {
        arr.push(prev[i] || { id: `p${i}`, name: '', twitchUsername: '', slot: { name: '', image: null } });
      }
      return arr;
    });
  }, [bracketPlayerCount, bracketPhase]);

  /* Bracket slot search state */
  const [bkSlotSearches, setBkSlotSearches] = useState({});
  const [bkShowSuggestions, setBkShowSuggestions] = useState({});

  const updateBracketPlayer = (idx, field, value) => {
    setLocalBracketPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleBkSlotSearch = (idx, term) => {
    setBkSlotSearches(prev => ({ ...prev, [idx]: term }));
    setBkShowSuggestions(prev => ({ ...prev, [idx]: term.length > 0 }));
  };

  const handleBkSlotSelect = (idx, slot) => {
    updateBracketPlayer(idx, 'slot', { name: slot.name, image: slot.image || slot.image_url || null });
    setBkSlotSearches(prev => ({ ...prev, [idx]: slot.name }));
    setBkShowSuggestions(prev => ({ ...prev, [idx]: false }));
  };

  /* ─── Fill random players for testing ─── */
  const RANDOM_NAMES = [
    'xNightmare', 'LuckyDraw', 'SlotKing', 'BonusBeast', 'SpinMaster',
    'CasinoWolf', 'JackpotJoe', 'ReelQueen', 'BigWinBob', 'MegaMulti',
    'WildCard', 'ScatterGod', 'FreeSpin77', 'MaxBetMike', 'TurboSpin',
    'GoldRush', 'DiamondDan', 'CherryPop', 'ThunderWin', 'RoyalFlush',
  ];

  const fillRandomPlayers = () => {
    const shuffled = [...RANDOM_NAMES].sort(() => Math.random() - 0.5);
    const randomSlots = slots.length > 0
      ? [...slots].sort(() => Math.random() - 0.5)
      : [];
    const filled = localBracketPlayers.map((p, i) => ({
      ...p,
      name: shuffled[i % shuffled.length],
      slot: randomSlots[i]
        ? { name: randomSlots[i].name, image: randomSlots[i].image || randomSlots[i].image_url || null }
        : p.slot,
    }));
    setLocalBracketPlayers(filled);
    const newSearches = {};
    filled.forEach((p, i) => { if (p.slot?.name) newSearches[i] = p.slot.name; });
    setBkSlotSearches(newSearches);
  };

  /* ─── Start bracket tournament ─── */
  const canStartBracket = localBracketPlayers.every(p => p.name.trim().length > 0);

  const startBracketTournament = () => {
    if (!canStartBracket) return;
    const seeded = seedPlayers(localBracketPlayers);
    const cfg = bracketType === 'spins'
      ? { numSpins: bracketTypeConfig.numSpins || 50 }
      : bracketType === 'bonus_bo3'
        ? { drawRule: bracketTypeConfig.drawRule || 'no_point' }
        : {};
    const newBracket = generateBracket(seeded, bracketType, cfg);

    // Flatten bracket matches for OBS widget compatibility
    const flatMatches = newBracket.flatMap(r => r.matches);

    setMulti({
      bracketPhase: 'active',
      bracketData: newBracket,
      bracketPlayers: localBracketPlayers,
      bracketType,
      bracketPlayerCount,
      bracketTypeConfig,
      bracketActiveRound: 0,
      bracketActiveMatch: 0,
      // Also write to data so OBS widget can display
      active: true,
      tournamentType: bracketType,
      data: {
        active: true,
        matches: flatMatches,
        currentMatchIdx: 0,
      },
    });
  };

  const resetBracketTournament = () => {
    if (!window.confirm('Reset the bracket tournament?')) return;
    setMulti({
      bracketPhase: 'setup',
      bracketData: [],
      bracketPlayers: [],
      bracketActiveRound: 0,
      bracketActiveMatch: 0,
      active: false,
      data: null,
    });
  };

  /* ─── Bracket match editing ─── */
  const currentBracketMatch = bracketData[bracketActiveRound]?.matches[bracketActiveMatch] || null;

  const handleBracketRoundInput = (roundIdx, playerKey, field, value) => {
    if (!currentBracketMatch) return;
    const { bracket: newBracket, matchCompleted } = updateBracketMatch(
      bracketData, bracketActiveRound, bracketActiveMatch, roundIdx, playerKey, { [field]: value }, localBracketPlayers
    );
    const flatMatches = newBracket.flatMap(r => r.matches);
    const activeFlat = flatMatches.indexOf(newBracket[bracketActiveRound]?.matches[bracketActiveMatch]);
    const updates = {
      bracketData: newBracket,
      data: { ...c.data, matches: flatMatches, currentMatchIdx: activeFlat >= 0 ? activeFlat : (c.data?.currentMatchIdx ?? 0) },
    };
    if (matchCompleted && getChampion(newBracket)) {
      updates.bracketPhase = 'completed';
    }
    setMulti(updates);
  };

  const handleBracketManualWinner = (winner) => {
    if (!currentBracketMatch) return;
    const current = currentBracketMatch.winner;
    const newWinner = current === winner ? null : winner;
    let newBracket = bracketData.map(r => ({
      ...r,
      matches: r.matches.map(m => ({ ...m, rounds: m.rounds.map(rd => ({ ...rd })) })),
    }));
    newBracket[bracketActiveRound].matches[bracketActiveMatch] = setManualWinner(currentBracketMatch, newWinner);
    if (newWinner) {
      newBracket = propagateWinner(newBracket, bracketActiveRound, bracketActiveMatch, localBracketPlayers);
    }
    const flatMatches = newBracket.flatMap(r => r.matches);
    const activeFlat = flatMatches.indexOf(newBracket[bracketActiveRound]?.matches[bracketActiveMatch]);
    const updates = {
      bracketData: newBracket,
      data: { ...c.data, matches: flatMatches, currentMatchIdx: activeFlat >= 0 ? activeFlat : (c.data?.currentMatchIdx ?? 0) },
    };
    if (newWinner && getChampion(newBracket)) {
      updates.bracketPhase = 'completed';
    }
    setMulti(updates);
  };

  const handleBracketResetMatch = () => {
    let newBracket = bracketData.map(r => ({
      ...r,
      matches: r.matches.map(m => ({ ...m, rounds: m.rounds.map(rd => ({ ...rd })) })),
    }));
    newBracket[bracketActiveRound].matches[bracketActiveMatch] = resetMatch(currentBracketMatch);
    const flatMatches = newBracket.flatMap(r => r.matches);
    const activeFlat = flatMatches.indexOf(newBracket[bracketActiveRound]?.matches[bracketActiveMatch]);
    setMulti({
      bracketData: newBracket,
      data: { ...c.data, matches: flatMatches, currentMatchIdx: activeFlat >= 0 ? activeFlat : (c.data?.currentMatchIdx ?? 0) },
    });
  };

  const bracketStats = getBracketStats(bracketData);
  const bracketChampion = getChampion(bracketData);

  const allTabs = [
    { id: 'bracket', label: '🏅 Bracket' },
    { id: 'style',   label: '🎨 Style' },
    { id: 'presets', label: '💾 Presets' },
  ];
  const SIDEBAR_TABS = new Set(['bracket']);
  const WIDGET_TABS  = new Set(['style', 'presets']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
             : mode === 'widget'  ? allTabs.filter(t => WIDGET_TABS.has(t.id))
             : allTabs;

  const currency = c.arenaCurrency || '€';

  return (
    <div className="bh-config">

      {/* Tab nav */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} style={{ marginTop: 4 }} />

      {/* ═══════ BRACKET TAB ═══════ */}
      {activeTab === 'bracket' && (
        <div className="bk-tab">
          {bracketPhase === 'setup' && (
            <div className="bk-setup">
              {/* ── Settings card ── */}
              <div className="bk-card">
                <h4 className="bk-card-title">⚔️ Bracket Tournament</h4>
                <p className="bk-hint">Single-elimination bracket. Players auto-seed into matchups.</p>

                <label className="bk-field">
                  <span className="bk-label">Tournament Name</span>
                  <input className="bk-input" value={c.bracketName || ''} onChange={e => set('bracketName', e.target.value)} placeholder="e.g. Friday Night Showdown" />
                </label>

                <span className="bk-label">Tournament Type</span>
                <div className="bk-type-grid">
                  {Object.values(TOURNAMENT_TYPES).map(t => (
                    <button key={t.id}
                      className={`bk-type-btn ${bracketType === t.id ? 'bk-type-btn--active' : ''}`}
                      onClick={() => set('bracketType', t.id)}>
                      <span className="bk-type-icon">{t.icon}</span>
                      <span className="bk-type-name">{t.label.replace(' Tournament', '')}</span>
                      <span className="bk-type-desc">{t.description}</span>
                    </button>
                  ))}
                </div>

                {bracketType === 'spins' && (
                  <label className="bk-field" style={{ marginTop: 8 }}>
                    <span className="bk-label"># Spins</span>
                    <input className="bk-input bk-input--sm" type="number" min={1} value={bracketTypeConfig.numSpins || 50}
                      onChange={e => set('bracketTypeConfig', { ...bracketTypeConfig, numSpins: parseInt(e.target.value) || 50 })} />
                  </label>
                )}
                {bracketType === 'bonus_bo3' && (
                  <label className="bk-field" style={{ marginTop: 8 }}>
                    <span className="bk-label">Draw Rule</span>
                    <select className="bk-input" value={bracketTypeConfig.drawRule || 'no_point'}
                      onChange={e => set('bracketTypeConfig', { ...bracketTypeConfig, drawRule: e.target.value })}>
                      <option value="no_point">No point (draw = no point)</option>
                      <option value="replay">Replay (draw = round replayed)</option>
                    </select>
                  </label>
                )}

                <span className="bk-label" style={{ marginTop: 12 }}>Player Count</span>
                <div className="bk-count-row">
                  {[4, 8, 16].map(n => (
                    <button key={n}
                      className={`bk-count-btn ${bracketPlayerCount === n ? 'bk-count-btn--active' : ''}`}
                      onClick={() => set('bracketPlayerCount', n)}>
                      {n} Players
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Players card ── */}
              <div className="bk-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 className="bk-card-title" style={{ margin: 0 }}>👥 Players</h4>
                  <button className="bk-fill-btn" onClick={fillRandomPlayers}>🎲 Fill Random</button>
                </div>
                <div className="bk-players-scroll">
                  {localBracketPlayers.map((player, idx) => (
                    <div key={idx} className="bk-player-row">
                      <div className="bk-player-seed">#{idx + 1}</div>
                      <div className="bk-player-fields">
                        <input className="bk-input" type="text" value={player.name} placeholder="Player name"
                          onChange={e => updateBracketPlayer(idx, 'name', e.target.value)} />
                        <div className="bk-slot-wrap">
                          <div className="bk-slot-input-row">
                            {player.slot?.image && (
                              <img src={player.slot.image} alt="" className="bk-slot-thumb" />
                            )}
                            <input className="bk-input bk-input--slot" type="text"
                              value={bkSlotSearches[idx] ?? player.slot?.name ?? ''}
                              placeholder="🎰 Search slot..."
                              onChange={e => handleBkSlotSearch(idx, e.target.value)}
                              onFocus={() => { if ((bkSlotSearches[idx] || '').length > 0) setBkShowSuggestions(p => ({ ...p, [idx]: true })); }}
                              onBlur={() => setTimeout(() => setBkShowSuggestions(p => ({ ...p, [idx]: false })), 200)} />
                          </div>
                          {bkShowSuggestions[idx] && filteredSlots(bkSlotSearches[idx] || '').length > 0 && (
                            <div className="bk-slot-dropdown">
                              {filteredSlots(bkSlotSearches[idx] || '').map(slot => (
                                <button key={slot.id} className="bk-slot-option"
                                  onMouseDown={(e) => { e.preventDefault(); handleBkSlotSelect(idx, slot); }}>
                                  {slot.image && <img src={slot.image} alt={slot.name} className="bk-slot-thumb" />}
                                  <span>{slot.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Start button ── */}
              <div className="bk-start-area">
                <button className={`bk-start-btn ${!canStartBracket ? 'bk-start-btn--disabled' : ''}`}
                  onClick={startBracketTournament} disabled={!canStartBracket}>
                  🏆 Start Bracket Tournament
                </button>
                {!canStartBracket && <p className="bk-hint" style={{ textAlign: 'center', marginTop: 6 }}>Fill in all player names to start</p>}
              </div>
            </div>
          )}

          {(bracketPhase === 'active' || bracketPhase === 'completed') && (
            <div className="bk-active">
              {/* ── Header ── */}
              <div className="bk-active-header">
                <div>
                  <h3 className="bk-active-title">{c.bracketName || 'Bracket Tournament'}</h3>
                  <div className="bk-active-meta">
                    <span className="bk-badge bk-badge--type">{TOURNAMENT_TYPES[bracketType]?.icon} {TOURNAMENT_TYPES[bracketType]?.label}</span>
                    <span className="bk-badge bk-badge--players">{bracketPlayerCount} Players</span>
                    {bracketPhase === 'active' && <span className="bk-badge bk-badge--live">● Live</span>}
                  </div>
                </div>
                <button className="bk-reset-btn" onClick={resetBracketTournament}>🗑️ Reset</button>
              </div>

              {/* ── Progress bar ── */}
              <div className="bk-progress">
                <div className="bk-progress-info">
                  <span>{bracketStats.completed}/{bracketStats.total} matches completed</span>
                  <span>{bracketStats.total > 0 ? Math.round((bracketStats.completed / bracketStats.total) * 100) : 0}%</span>
                </div>
                <div className="bk-progress-track">
                  <div className="bk-progress-fill" style={{ width: `${bracketStats.total > 0 ? (bracketStats.completed / bracketStats.total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* ── Champion banner ── */}
              {bracketPhase === 'completed' && bracketChampion && (
                <div className="bk-champion">
                  <div className="bk-champion-trophy">🏆</div>
                  <div className="bk-champion-name">{bracketChampion}</div>
                  <div className="bk-champion-sub">Tournament Champion</div>
                </div>
              )}

              {/* ── Bracket tree (horizontal scroll) ── */}
              <div className="bk-bracket-card">
                <div className="bk-bracket-scroll">
                  <div className="bk-bracket-rounds">
                    {bracketData.map((round, rIdx) => (
                      <div key={rIdx} className="bk-bracket-round">
                        <div className="bk-round-label">{round.label}</div>
                        <div className="bk-round-matches">
                          {round.matches.map((match, mIdx) => {
                            const isActive = rIdx === bracketActiveRound && mIdx === bracketActiveMatch;
                            const winner = match.winner ?? calcMatchWinner(match);
                            const isComplete = match.status === MATCH_STATUS.COMPLETED || winner != null;

                            return (
                              <button key={mIdx}
                                className={`bk-match-card ${isActive ? 'bk-match-card--active' : ''} ${isComplete ? 'bk-match-card--done' : ''}`}
                                onClick={() => {
                                  const flatIdx = bracketData.slice(0, rIdx).reduce((s, r) => s + r.matches.length, 0) + mIdx;
                                  setMulti({ bracketActiveRound: rIdx, bracketActiveMatch: mIdx, data: { ...c.data, currentMatchIdx: flatIdx } });
                                }}>
                                <div className={`bk-mc-player ${winner === 'player1' ? 'bk-mc-player--win' : ''} ${winner === 'player2' ? 'bk-mc-player--lose' : ''}`}>
                                  <span className="bk-mc-name">{match.player1 || 'TBD'}</span>
                                </div>
                                <div className="bk-mc-vs">VS</div>
                                <div className={`bk-mc-player ${winner === 'player2' ? 'bk-mc-player--win' : ''} ${winner === 'player1' ? 'bk-mc-player--lose' : ''}`}>
                                  <span className="bk-mc-name">{match.player2 || 'TBD'}</span>
                                </div>
                                {isComplete && winner && (
                                  <div className="bk-mc-winner-badge">
                                    ✓ {winner === 'player1' ? match.player1 : winner === 'player2' ? match.player2 : 'Draw'}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Match control panel ── */}
              {currentBracketMatch && bracketPhase === 'active' && (() => {
                const inputFields = getRoundInputFields(currentBracketMatch.type);
                const isBo3 = currentBracketMatch.type === 'bonus_bo3';
                const scoreboard = isBo3 ? getBoScoreboard(currentBracketMatch) : null;
                const matchWinner = currentBracketMatch.winner ?? calcMatchWinner(currentBracketMatch);

                return (
                  <div className="bk-match-panel">
                    <div className="bk-mp-header">
                      <h4 className="bk-mp-title">
                        {bracketData[bracketActiveRound]?.label} — Match {bracketActiveMatch + 1}/{bracketData[bracketActiveRound]?.matches.length}
                      </h4>
                      <div className="bk-mp-status">
                        {currentBracketMatch.status === MATCH_STATUS.COMPLETED
                          ? <span className="bk-badge bk-badge--done">Completed</span>
                          : currentBracketMatch.status === MATCH_STATUS.IN_PROGRESS
                            ? <span className="bk-badge bk-badge--live">In Progress</span>
                            : <span className="bk-badge bk-badge--pending">Pending</span>
                        }
                      </div>
                    </div>

                    {/* Player names banner */}
                    <div className="bk-mp-players">
                      <div className={`bk-mp-p ${matchWinner === 'player1' ? 'bk-mp-p--win' : ''}`}>
                        {currentBracketMatch.slot1?.image && <img src={currentBracketMatch.slot1.image} alt="" className="bk-mp-slot-img" />}
                        <div>
                          <div className="bk-mp-p-name">{currentBracketMatch.player1}</div>
                          {currentBracketMatch.slot1?.name && <div className="bk-mp-p-slot">{currentBracketMatch.slot1.name}</div>}
                        </div>
                      </div>
                      <div className="bk-mp-vs">VS</div>
                      <div className={`bk-mp-p ${matchWinner === 'player2' ? 'bk-mp-p--win' : ''}`}>
                        <div style={{ textAlign: 'right' }}>
                          <div className="bk-mp-p-name">{currentBracketMatch.player2}</div>
                          {currentBracketMatch.slot2?.name && <div className="bk-mp-p-slot">{currentBracketMatch.slot2.name}</div>}
                        </div>
                        {currentBracketMatch.slot2?.image && <img src={currentBracketMatch.slot2.image} alt="" className="bk-mp-slot-img" />}
                      </div>
                    </div>

                    {/* Bo3 scoreboard */}
                    {isBo3 && scoreboard && (
                      <div className="bk-mp-scoreboard">
                        <span className={scoreboard.p1Wins >= 2 ? 'bk-score-win' : ''}>{scoreboard.p1Wins}</span>
                        <span className="bk-score-sep">&ndash;</span>
                        <span className={scoreboard.p2Wins >= 2 ? 'bk-score-win' : ''}>{scoreboard.p2Wins}</span>
                      </div>
                    )}

                    {/* Round inputs */}
                    {currentBracketMatch.rounds.map((round, rIdx) => (
                      <div key={rIdx} className="bk-mp-round">
                        {isBo3 && <div className="bk-mp-round-label">Round {rIdx + 1}</div>}
                        <div className="bk-mp-round-grid">
                          {/* Player 1 */}
                          <div className="bk-mp-round-side">
                            <div className="bk-mp-side-name">{currentBracketMatch.player1}</div>
                            {inputFields.map(f => (
                              <label key={`p1-${rIdx}-${f.key}`} className="bk-mp-input-label">
                                <span>{f.label}</span>
                                <div className="bk-mp-input-wrap">
                                  <span className="bk-mp-input-prefix">{f.prefix}</span>
                                  <NumInput value={round.player1[f.key]} prefix="" placeholder="0"
                                    onChange={v => handleBracketRoundInput(rIdx, 'player1', f.key, v)} />
                                </div>
                              </label>
                            ))}
                            {(() => {
                              const r = calcRoundResult(round.player1, currentBracketMatch.type);
                              return r !== null ? (
                                <div className={`bk-mp-result ${r > 0 ? 'bk-mp-result--pos' : r < 0 ? 'bk-mp-result--neg' : ''}`}>
                                  {formatResult(r, currency)}
                                </div>
                              ) : null;
                            })()}
                          </div>

                          <div className="bk-mp-round-vs">VS</div>

                          {/* Player 2 */}
                          <div className="bk-mp-round-side">
                            <div className="bk-mp-side-name">{currentBracketMatch.player2}</div>
                            {inputFields.map(f => (
                              <label key={`p2-${rIdx}-${f.key}`} className="bk-mp-input-label">
                                <span>{f.label}</span>
                                <div className="bk-mp-input-wrap">
                                  <span className="bk-mp-input-prefix">{f.prefix}</span>
                                  <NumInput value={round.player2[f.key]} prefix="" placeholder="0"
                                    onChange={v => handleBracketRoundInput(rIdx, 'player2', f.key, v)} />
                                </div>
                              </label>
                            ))}
                            {(() => {
                              const r = calcRoundResult(round.player2, currentBracketMatch.type);
                              return r !== null ? (
                                <div className={`bk-mp-result ${r > 0 ? 'bk-mp-result--pos' : r < 0 ? 'bk-mp-result--neg' : ''}`}>
                                  {formatResult(r, currency)}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>

                        {round.winner && (
                          <div className="bk-mp-round-winner">
                            ✓ {round.winner === 'player1' ? currentBracketMatch.player1 : round.winner === 'player2' ? currentBracketMatch.player2 : 'Draw'}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Winner / Manual override + Reset */}
                    <div className="bk-mp-actions">
                      <button className={`bk-mp-winner-btn ${currentBracketMatch.winner === 'player1' ? 'bk-mp-winner-btn--active' : ''}`}
                        onClick={() => handleBracketManualWinner('player1')}>
                        {currentBracketMatch.winner === 'player1' ? '👑 ' : ''}{currentBracketMatch.player1}
                      </button>
                      <button className={`bk-mp-winner-btn bk-mp-winner-btn--draw ${currentBracketMatch.winner === 'draw' ? 'bk-mp-winner-btn--active' : ''}`}
                        onClick={() => handleBracketManualWinner('draw')}>
                        🤝
                      </button>
                      <button className={`bk-mp-winner-btn ${currentBracketMatch.winner === 'player2' ? 'bk-mp-winner-btn--active' : ''}`}
                        onClick={() => handleBracketManualWinner('player2')}>
                        {currentBracketMatch.winner === 'player2' ? '👑 ' : ''}{currentBracketMatch.player2}
                      </button>
                    </div>
                    <button className="bk-reset-match-btn" onClick={handleBracketResetMatch}>
                      🔄 Reset Match
                    </button>
                  </div>
                );
              })()}
            </div>
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
              { id: 'bracket',  icon: '📊', label: 'Bracket' },
              { id: 'arena',    icon: '⚔️', label: 'Arena' },
              { id: 'futuristic', icon: '🚀', label: 'Futuristic' },
              { id: 'esports', icon: '🎮', label: 'Esports' },
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
              : (c.layout || 'grid') === 'bracket'
              ? 'All matches listed with section headers — clean OBS list style.'
              : (c.layout || 'grid') === 'arena'
              ? 'Battle Arena — VS cards with profit display, winner highlights.'
              : (c.layout || 'grid') === 'futuristic'
              ? 'Sci-fi split — large current match + upcoming cards with mini bracket.'
              : (c.layout || 'grid') === 'esports'
              ? 'Cyberpunk 3D glass panels — bracket grid + dramatic current match.'
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

          {/* ── Bracket-specific colors ── */}
          {(c.layout || 'grid') === 'bracket' && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Bracket Colors</h4>
              <div className="nb-color-grid">
                <ColorPicker label="Header BG" value={c.bkHeaderBg || 'rgba(20,24,40,0.95)'} onChange={v => set('bkHeaderBg', v)} />
                <ColorPicker label="Header Text" value={c.bkHeaderColor || '#e2e8f0'} onChange={v => set('bkHeaderColor', v)} />
                <ColorPicker label="Accent" value={c.bkAccent || '#6366f1'} onChange={v => set('bkAccent', v)} />
                <ColorPicker label="Divider" value={c.bkDividerColor || 'rgba(255,255,255,0.08)'} onChange={v => set('bkDividerColor', v)} />
                <ColorPicker label="Row BG" value={c.bkRowBg || 'rgba(255,255,255,0.02)'} onChange={v => set('bkRowBg', v)} />
                <ColorPicker label="Final BG" value={c.bkFinalBg || 'rgba(59,130,246,0.12)'} onChange={v => set('bkFinalBg', v)} />
                <ColorPicker label="Final Border" value={c.bkFinalBorder || 'rgba(59,130,246,0.35)'} onChange={v => set('bkFinalBorder', v)} />
              </div>
            </>
          )}

          {/* ── Arena-specific colors ── */}
          {(c.layout || 'grid') === 'arena' && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Arena Colors</h4>
              <div className="nb-color-grid">
                <ColorPicker label="Accent" value={c.arenaAccent || '#eab308'} onChange={v => set('arenaAccent', v)} />
                <ColorPicker label="Winner" value={c.arenaWinColor || '#22c55e'} onChange={v => set('arenaWinColor', v)} />
                <ColorPicker label="Card BG" value={c.arenaCardBg || '#1e1550'} onChange={v => set('arenaCardBg', v)} />
              </div>
              <label className="nb-field" style={{ marginTop: 6 }}>
                <span>Currency Symbol</span>
                <input value={c.arenaCurrency || '€'} onChange={e => set('arenaCurrency', e.target.value)} style={{ width: 50 }} />
              </label>
              <SliderField label="Loser Opacity" value={Math.round((c.arenaLoseOpacity ?? 0.55) * 100)} onChange={v => set('arenaLoseOpacity', v / 100)} min={20} max={100} suffix="%" />
            </>
          )}

          {/* ── Futuristic-specific colors ── */}
          {(c.layout || 'grid') === 'futuristic' && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Futuristic Colors</h4>
              <div className="nb-color-grid">
                <ColorPicker label="Accent" value={c.ftAccent || '#eab308'} onChange={v => set('ftAccent', v)} />
                <ColorPicker label="Cyan" value={c.ftCyan || '#00d4ff'} onChange={v => set('ftCyan', v)} />
                <ColorPicker label="Background" value={c.ftBg || '#0a1628'} onChange={v => set('ftBg', v)} />
                <ColorPicker label="Card BG" value={c.ftCardBg || '#0f1f3a'} onChange={v => set('ftCardBg', v)} />
                <ColorPicker label="Border" value={c.ftBorder || 'rgba(0,212,255,0.25)'} onChange={v => set('ftBorder', v)} />
              </div>
            </>
          )}

          {/* ── Esports-specific colors ── */}
          {(c.layout || 'grid') === 'esports' && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Esports Colors</h4>
              <div className="nb-color-grid">
                <ColorPicker label="Cyan" value={c.esCyan || '#00e5ff'} onChange={v => set('esCyan', v)} />
                <ColorPicker label="Purple" value={c.esPurple || '#a855f7'} onChange={v => set('esPurple', v)} />
                <ColorPicker label="Gold" value={c.esGold || '#fbbf24'} onChange={v => set('esGold', v)} />
                <ColorPicker label="Background" value={c.esBg || '#030712'} onChange={v => set('esBg', v)} />
                <ColorPicker label="Card BG" value={c.esCardBg || 'rgba(15,23,42,0.75)'} onChange={v => set('esCardBg', v)} />
                <ColorPicker label="Border" value={c.esBorder || 'rgba(0,229,255,0.18)'} onChange={v => set('esBorder', v)} />
              </div>
            </>
          )}

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
            <ColorPicker label="Profit Color" value={c.multiColor || '#facc15'} onChange={v => set('multiColor', v)} />
            <ColorPicker label="Slot Name" value={c.slotNameColor || '#ffffff'} onChange={v => set('slotNameColor', v)} />
          </div>
          <SliderField label="Name Size" value={c.nameSize ?? 13} onChange={v => set('nameSize', v)} min={8} max={24} suffix="px" />
          <SliderField label="Result Size" value={c.multiSize ?? 14} onChange={v => set('multiSize', v)} min={8} max={24} suffix="px" />
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

          <h4 className="nb-subtitle" style={{ marginTop: 18 }}>Custom CSS</h4>
          <p className="oc-config-hint" style={{ marginBottom: 6, fontSize: 11 }}>Override styles for this widget in OBS.</p>
          <textarea
            className="oc-widget-css-input"
            value={c.custom_css || ''}
            onChange={e => set('custom_css', e.target.value)}
            rows={4}
            placeholder={`/* custom CSS for this widget */`}
            spellCheck={false}
          />
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
