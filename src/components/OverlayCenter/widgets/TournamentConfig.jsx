import React, { useState, useEffect } from 'react';
import { getAllSlots } from '../../../utils/slotUtils';

export default function TournamentConfig({ config, onChange }) {
  const c = config || {};
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="oc-config-form">
      <label className="oc-config-field">
        <span>Title</span>
        <input value={c.title || ''} onChange={e => onChange({ ...c, title: e.target.value })} placeholder="Tournament name" />
      </label>
      <label className="oc-config-field">
        <span>Prize</span>
        <input value={c.prize || ''} onChange={e => onChange({ ...c, prize: e.target.value })} placeholder="€1,000" />
      </label>
      <button className="oc-btn oc-btn--primary" style={{ marginTop: 8, width: '100%' }} onClick={() => setShowModal(true)}>
        🏆 Configure Tournament Bracket
      </button>
      {showModal && (
        <TournamentBracketModal config={c} onChange={onChange} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

/* ─── Full Tournament Bracket Modal (ported from old system) ─── */
function TournamentBracketModal({ config, onChange, onClose }) {
  const c = config || {};
  const [players, setPlayers] = useState(c.players || ['', '', '', '', '', '', '', '']);
  const [selectedSlots, setSelectedSlots] = useState(c.slots || [null, null, null, null, null, null, null, null]);
  const [slotSearches, setSlotSearches] = useState(Array(8).fill(''));
  const [showSlotSuggestions, setShowSlotSuggestions] = useState(Array(8).fill(false));
  const [matchFormat, setMatchFormat] = useState(c.format || 'single');
  const [tournamentStarted, setTournamentStarted] = useState(!!c.active);
  const [editMode, setEditMode] = useState(false);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllSlots();
        setSlots(data || []);
      } catch { setSlots([]); }
    };
    load();
  }, []);

  // Init slot searches from selected slots
  useEffect(() => {
    if (c.slots) {
      setSlotSearches(c.slots.map(s => s?.name || ''));
    }
  }, []);

  const save = (extras = {}) => {
    onChange({
      ...config,
      players,
      slots: selectedSlots,
      format: matchFormat,
      active: tournamentStarted,
      ...extras,
    });
  };

  const handlePlayerChange = (index, value) => {
    const next = [...players];
    next[index] = value;
    setPlayers(next);
    if (tournamentStarted && c.data) {
      onChange({ ...config, players: next, data: { ...c.data, players: next } });
    }
  };

  const handleSlotSearch = (index, value) => {
    const next = [...slotSearches];
    next[index] = value;
    setSlotSearches(next);
    const show = [...showSlotSuggestions];
    show[index] = value.length > 0;
    setShowSlotSuggestions(show);
  };

  const handleSlotSelect = (index, slot) => {
    const nextSlots = [...selectedSlots];
    nextSlots[index] = slot;
    setSelectedSlots(nextSlots);
    const nextSearches = [...slotSearches];
    nextSearches[index] = slot.name;
    setSlotSearches(nextSearches);
    const show = [...showSlotSuggestions];
    show[index] = false;
    setShowSlotSuggestions(show);
    if (tournamentStarted && c.data) {
      onChange({ ...config, slots: nextSlots, data: { ...c.data, slots: nextSlots } });
    }
  };

  const filteredSlots = (term) => {
    if (!term || term.length === 0) return [];
    return slots.filter(s => s && s.name && s.name.toLowerCase().includes(term.toLowerCase())).slice(0, 5);
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
      players,
      slots: selectedSlots,
      format: matchFormat,
      phase: 'quarterfinals',
      matches: generateBracket(),
      history: [],
    };
    onChange({ ...config, active: true, players, slots: selectedSlots, format: matchFormat, data });
    setTournamentStarted(true);
  };

  const advanceToNextPhase = () => {
    const data = c.data;
    if (!data) return;
    const { matches, phase } = data;
    if (matches.some(m => m.winner === null)) {
      alert('Complete all matches before advancing');
      return;
    }
    const winners = matches.map(m => m.winner);
    let newPhase = phase;
    let newMatches = [];
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
    onChange({ ...config, data: { ...data, phase: newPhase, matches: newMatches, history: [...(data.history || []), { phase, matches }] } });
  };

  const calcMulti = (bet, payout) => {
    const b = parseFloat(bet), p = parseFloat(payout);
    if (isNaN(b) || isNaN(p) || b === 0) return 0;
    return p / b;
  };

  const autoCalcWinner = (matchIndex) => {
    const data = c.data;
    if (!data) return;
    const match = data.matches[matchIndex];
    const md = match.data || {};
    const p1 = md.player1 || {}, p2 = md.player2 || {};
    const isBo3 = data.format === 'bo3';
    let p1X, p2X;
    if (isBo3) {
      const p1Total = (parseFloat(p1.payout1) || 0) + (parseFloat(p1.payout2) || 0) + (parseFloat(p1.payout3) || 0);
      const p2Total = (parseFloat(p2.payout1) || 0) + (parseFloat(p2.payout2) || 0) + (parseFloat(p2.payout3) || 0);
      p1X = calcMulti(p1.bet, p1Total);
      p2X = calcMulti(p2.bet, p2Total);
    } else {
      p1X = calcMulti(p1.bet, p1.payout);
      p2X = calcMulti(p2.bet, p2.payout);
    }
    if (p1X > 0 || p2X > 0) {
      const updated = { ...data };
      updated.matches = [...data.matches];
      updated.matches[matchIndex] = { ...match, winner: p1X > p2X ? match.player1 : match.player2 };
      onChange({ ...config, data: updated });
    }
  };

  const setMatchWinner = (matchIndex, winnerId) => {
    const data = c.data;
    if (!data) return;
    const updated = { ...data };
    updated.matches = [...data.matches];
    updated.matches[matchIndex] = { ...data.matches[matchIndex], winner: winnerId };
    onChange({ ...config, data: updated });
  };

  const savePlayerData = (matchIndex, playerKey, field, value) => {
    const data = c.data;
    if (!data) return;
    const updated = { ...data };
    updated.matches = [...data.matches];
    const match = { ...data.matches[matchIndex] };
    const md = { ...(match.data || {}) };
    md[playerKey] = { ...(md[playerKey] || {}), [field]: parseFloat(value) || 0 };
    match.data = md;
    updated.matches[matchIndex] = match;
    onChange({ ...config, data: updated });
  };

  const phaseLabels = { quarterfinals: 'Quarter-Finals', semifinals: 'Semi-Finals', finals: 'Finals' };

  return (
    <div className="tm-modal-overlay" onClick={onClose}>
      <div className="tm-modal" onClick={e => e.stopPropagation()}>
        <div className="tm-modal-header">
          <h2>🏆 Tournament Manager</h2>
          <button className="tm-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tm-modal-body">
          {!tournamentStarted ? (
            <>
              {/* Format */}
              <div className="tm-section">
                <h3>Match Format</h3>
                <div className="tm-format-row">
                  <button className={`tm-format-btn ${matchFormat === 'single' ? 'active' : ''}`}
                    onClick={() => setMatchFormat('single')}>Single Match</button>
                  <button className={`tm-format-btn ${matchFormat === 'bo3' ? 'active' : ''}`}
                    onClick={() => setMatchFormat('bo3')}>Best of 3</button>
                </div>
              </div>

              {/* Players & Slots */}
              <div className="tm-section">
                <h3>Players & Slots</h3>
                <div className="tm-players-grid">
                  {players.map((player, i) => (
                    <div key={i} className="tm-player-entry">
                      <div className="tm-player-header">
                        <span className="tm-player-num">#{i + 1}</span>
                        <span className="tm-player-label">Player {i + 1}</span>
                      </div>
                      <input type="text" value={player}
                        onChange={e => handlePlayerChange(i, e.target.value)}
                        placeholder="Player name" className="tm-player-input" />
                      <div className="tm-slot-wrapper">
                        <input type="text" value={slotSearches[i]}
                          onChange={e => handleSlotSearch(i, e.target.value)}
                          onFocus={() => { const s = [...showSlotSuggestions]; s[i] = slotSearches[i].length > 0; setShowSlotSuggestions(s); }}
                          placeholder="Search slot..." className="tm-slot-input" />
                        {selectedSlots[i] && (
                          <div className="tm-slot-preview">
                            <img src={selectedSlots[i].image} alt={selectedSlots[i].name} />
                          </div>
                        )}
                        {showSlotSuggestions[i] && filteredSlots(slotSearches[i]).length > 0 && (
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
              </div>

              <button className="tm-start-btn" onClick={startTournament}>🚀 Start Tournament</button>
            </>
          ) : (
            <>
              {(() => {
                const data = c.data || {};
                const phase = data.phase || 'quarterfinals';
                return (
                  <>
                    <div className="tm-section">
                      <h3>Current Phase: {phaseLabels[phase]}</h3>
                      <div className="tm-phase-badge">
                        {data.matches?.length || 0} {data.matches?.length === 1 ? 'Match' : 'Matches'}
                      </div>
                    </div>

                    <div className="tm-section">
                      <h3>Match Results</h3>
                      <div className="tm-matches-grid">
                        {data.matches?.map((match, idx) => {
                          const md = match.data || {};
                          const p1d = md.player1 || {}, p2d = md.player2 || {};
                          const isBo3 = data.format === 'bo3';
                          return (
                            <div key={idx} className={`tm-match-card ${match.winner !== null ? '' : 'tm-match-active'}`}>
                              <div className="tm-match-title">Match {idx + 1}</div>
                              <div className="tm-match-players">
                                {/* Player 1 */}
                                <div className="tm-match-player">
                                  {selectedSlots[match.player1]?.image && (
                                    <img className="tm-match-slot-img" src={selectedSlots[match.player1].image} alt="" />
                                  )}
                                  <div className="tm-match-inputs">
                                    <div className="tm-input-group">
                                      <label>Bet (€)</label>
                                      <input type="number" defaultValue={p1d.bet || ''} placeholder="0.00"
                                        onBlur={e => savePlayerData(idx, 'player1', 'bet', e.target.value)} />
                                    </div>
                                    {isBo3 ? (
                                      <div className="tm-bo3-inputs">
                                        {['payout1', 'payout2', 'payout3'].map((f, gi) => (
                                          <div key={f} className="tm-input-group">
                                            <label>G{gi + 1}</label>
                                            <input type="number" defaultValue={p1d[f] || ''} placeholder="0"
                                              onBlur={e => { savePlayerData(idx, 'player1', f, e.target.value); setTimeout(() => autoCalcWinner(idx), 100); }} />
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="tm-input-group">
                                        <label>Payout (€)</label>
                                        <input type="number" defaultValue={p1d.payout || ''} placeholder="0.00"
                                          onBlur={e => { savePlayerData(idx, 'player1', 'payout', e.target.value); setTimeout(() => autoCalcWinner(idx), 100); }} />
                                      </div>
                                    )}
                                  </div>
                                  <button className={`tm-winner-btn ${match.winner === match.player1 ? 'tm-winner' : ''}`}
                                    onClick={() => setMatchWinner(idx, match.winner === match.player1 ? null : match.player1)}>
                                    {match.winner === match.player1 && '👑 '}{players[match.player1]}
                                  </button>
                                </div>

                                <span className="tm-vs">VS</span>

                                {/* Player 2 */}
                                <div className="tm-match-player">
                                  {selectedSlots[match.player2]?.image && (
                                    <img className="tm-match-slot-img" src={selectedSlots[match.player2].image} alt="" />
                                  )}
                                  <div className="tm-match-inputs">
                                    <div className="tm-input-group">
                                      <label>Bet (€)</label>
                                      <input type="number" defaultValue={p2d.bet || ''} placeholder="0.00"
                                        onBlur={e => savePlayerData(idx, 'player2', 'bet', e.target.value)} />
                                    </div>
                                    {isBo3 ? (
                                      <div className="tm-bo3-inputs">
                                        {['payout1', 'payout2', 'payout3'].map((f, gi) => (
                                          <div key={f} className="tm-input-group">
                                            <label>G{gi + 1}</label>
                                            <input type="number" defaultValue={p2d[f] || ''} placeholder="0"
                                              onBlur={e => { savePlayerData(idx, 'player2', f, e.target.value); setTimeout(() => autoCalcWinner(idx), 100); }} />
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="tm-input-group">
                                        <label>Payout (€)</label>
                                        <input type="number" defaultValue={p2d.payout || ''} placeholder="0.00"
                                          onBlur={e => { savePlayerData(idx, 'player2', 'payout', e.target.value); setTimeout(() => autoCalcWinner(idx), 100); }} />
                                      </div>
                                    )}
                                  </div>
                                  <button className={`tm-winner-btn ${match.winner === match.player2 ? 'tm-winner' : ''}`}
                                    onClick={() => setMatchWinner(idx, match.winner === match.player2 ? null : match.player2)}>
                                    {match.winner === match.player2 && '👑 '}{players[match.player2]}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="tm-actions">
                      {phase !== 'finals' && (
                        <button className="tm-advance-btn" onClick={advanceToNextPhase}>⏭️ Advance</button>
                      )}
                      <button className="tm-edit-btn" onClick={() => setEditMode(!editMode)}>
                        {editMode ? '✓ Done' : '✏️ Edit'}
                      </button>
                    </div>

                    {editMode && (
                      <div className="tm-section">
                        <div className="tm-players-grid tm-edit-grid">
                          {players.map((player, i) => (
                            <div key={i} className="tm-player-entry">
                              <div className="tm-player-header">
                                <span className="tm-player-num">#{i + 1}</span>
                              </div>
                              <input type="text" value={player}
                                onChange={e => handlePlayerChange(i, e.target.value)}
                                className="tm-player-input" />
                              <div className="tm-slot-wrapper">
                                <input type="text" value={slotSearches[i]}
                                  onChange={e => handleSlotSearch(i, e.target.value)}
                                  className="tm-slot-input" />
                                {selectedSlots[i] && (
                                  <div className="tm-slot-preview">
                                    <img src={selectedSlots[i].image} alt={selectedSlots[i].name} />
                                  </div>
                                )}
                                {showSlotSuggestions[i] && filteredSlots(slotSearches[i]).length > 0 && (
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
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
