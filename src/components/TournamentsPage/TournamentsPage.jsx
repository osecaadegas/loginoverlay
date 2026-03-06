import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TOURNAMENT_TYPES,
  MATCH_STATUS,
  calcRoundResult,
  calcMatchWinner,
  getBoScoreboard,
  getRoundInputFields,
  formatResult,
  updateRoundData,
  setManualWinner,
  resetMatch,
} from '../OverlayCenter/widgets/tournament/tournamentEngine';
import {
  generateBracket,
  updateBracketMatch,
  propagateWinner,
  getBracketStats,
  getChampion,
  seedPlayers,
} from './bracketUtils';
import { getAllSlots, sortSlotsByProviderPriority } from '../../utils/slotUtils';
import './TournamentsPage.css';

/* ─── LocalStorage key ─── */
const STORAGE_KEY = 'tournament_page_state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════ */
export default function TournamentsPage() {
  const saved = useMemo(() => loadState(), []);

  /* ─── Tournament state ─── */
  const [phase, setPhase] = useState(saved?.phase || 'setup'); // setup | active | completed
  const [tournamentName, setTournamentName] = useState(saved?.tournamentName || '');
  const [tournamentType, setTournamentType] = useState(saved?.tournamentType || 'bonus');
  const [playerCount, setPlayerCount] = useState(saved?.playerCount || 8);
  const [players, setPlayers] = useState(saved?.players || []);
  const [bracket, setBracket] = useState(saved?.bracket || []);
  const [activeRound, setActiveRound] = useState(saved?.activeRound ?? 0);
  const [activeMatch, setActiveMatch] = useState(saved?.activeMatch ?? 0);
  const [typeConfig, setTypeConfig] = useState(saved?.typeConfig || { numSpins: 50, drawRule: 'no_point' });

  /* ─── Slot search ─── */
  const [slots, setSlots] = useState([]);
  const [slotSearches, setSlotSearches] = useState({});
  const [showSuggestions, setShowSuggestions] = useState({});

  useEffect(() => {
    getAllSlots().then(d => setSlots(d || [])).catch(() => {});
  }, []);

  /* ─── Persist state ─── */
  useEffect(() => {
    saveState({ phase, tournamentName, tournamentType, playerCount, players, bracket, activeRound, activeMatch, typeConfig });
  }, [phase, tournamentName, tournamentType, playerCount, players, bracket, activeRound, activeMatch, typeConfig]);

  /* ─── Init empty players when count changes ─── */
  useEffect(() => {
    if (phase !== 'setup') return;
    setPlayers(prev => {
      const arr = [];
      for (let i = 0; i < playerCount; i++) {
        arr.push(prev[i] || { id: `p${i}`, name: '', twitchUsername: '', slot: { name: '', image: null } });
      }
      return arr;
    });
  }, [playerCount, phase]);

  /* ─── Slot filtering ─── */
  const filteredSlots = useCallback((term) => {
    if (!term || term.length < 1) return [];
    return sortSlotsByProviderPriority(
      slots.filter(s => s?.name?.toLowerCase().includes(term.toLowerCase()))
    ).slice(0, 6);
  }, [slots]);

  /* ─── Player update helpers ─── */
  const updatePlayer = (idx, field, value) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleSlotSearch = (idx, term) => {
    setSlotSearches(prev => ({ ...prev, [idx]: term }));
    setShowSuggestions(prev => ({ ...prev, [idx]: term.length > 0 }));
  };

  const handleSlotSelect = (idx, slot) => {
    updatePlayer(idx, 'slot', { name: slot.name, image: slot.image || slot.image_url || null });
    setSlotSearches(prev => ({ ...prev, [idx]: slot.name }));
    setShowSuggestions(prev => ({ ...prev, [idx]: false }));
  };

  /* ─── Start tournament ─── */
  const canStart = players.every(p => p.name.trim().length > 0);

  const startTournament = () => {
    if (!canStart) return;
    const seeded = seedPlayers(players);
    const config = tournamentType === 'spins'
      ? { numSpins: typeConfig.numSpins || 50 }
      : tournamentType === 'bonus_bo3'
        ? { drawRule: typeConfig.drawRule || 'no_point' }
        : {};
    const newBracket = generateBracket(seeded, tournamentType, config);
    setBracket(newBracket);
    setActiveRound(0);
    setActiveMatch(0);
    setPhase('active');
  };

  /* ─── Reset tournament ─── */
  const resetTournament = () => {
    if (!window.confirm('Reset the entire tournament? This cannot be undone.')) return;
    setPhase('setup');
    setBracket([]);
    setActiveRound(0);
    setActiveMatch(0);
  };

  /* ─── Current match helpers ─── */
  const currentMatch = bracket[activeRound]?.matches[activeMatch] || null;

  const handleRoundInput = (roundIdx, playerKey, field, value) => {
    if (!currentMatch) return;
    const { bracket: newBracket, matchCompleted } = updateBracketMatch(
      bracket, activeRound, activeMatch, roundIdx, playerKey, { [field]: value }, players
    );
    setBracket(newBracket);

    if (matchCompleted) {
      const champ = getChampion(newBracket);
      if (champ) setPhase('completed');
    }
  };

  const handleManualWinner = (winner) => {
    if (!currentMatch) return;
    const current = currentMatch.winner;
    const newWinner = current === winner ? null : winner;
    let newBracket = bracket.map(r => ({
      ...r,
      matches: r.matches.map(m => ({ ...m, rounds: m.rounds.map(rd => ({ ...rd })) })),
    }));
    newBracket[activeRound].matches[activeMatch] = setManualWinner(currentMatch, newWinner);
    if (newWinner) {
      newBracket = propagateWinner(newBracket, activeRound, activeMatch, players);
    }
    setBracket(newBracket);
    if (newWinner && getChampion(newBracket)) setPhase('completed');
  };

  const handleResetMatch = () => {
    let newBracket = bracket.map(r => ({
      ...r,
      matches: r.matches.map(m => ({ ...m, rounds: m.rounds.map(rd => ({ ...rd })) })),
    }));
    newBracket[activeRound].matches[activeMatch] = resetMatch(currentMatch);
    setBracket(newBracket);
  };

  /* ─── Stats ─── */
  const stats = getBracketStats(bracket);
  const champion = getChampion(bracket);

  /* ─── Render ─── */
  return (
    <div className="tp-page">
      <div className="tp-container">
        {/* Header */}
        <header className="tp-header">
          <div className="tp-header-content">
            <h1 className="tp-title">
              <span className="tp-title-icon">&#9876;</span>
              {phase === 'setup' ? 'Tournament Creator' : (tournamentName || 'Tournament')}
            </h1>
            {phase !== 'setup' && (
              <div className="tp-header-meta">
                <span className="tp-badge tp-badge--type">{TOURNAMENT_TYPES[tournamentType]?.icon} {TOURNAMENT_TYPES[tournamentType]?.label}</span>
                <span className="tp-badge tp-badge--players">{playerCount} Players</span>
                {phase === 'completed' && <span className="tp-badge tp-badge--champion">&#127942; Champion: {champion}</span>}
              </div>
            )}
          </div>
          {phase !== 'setup' && (
            <button className="tp-btn tp-btn--danger tp-btn--sm" onClick={resetTournament}>Reset</button>
          )}
        </header>

        {/* ── SETUP PHASE ── */}
        {phase === 'setup' && (
          <SetupPhase
            tournamentName={tournamentName}
            setTournamentName={setTournamentName}
            tournamentType={tournamentType}
            setTournamentType={setTournamentType}
            playerCount={playerCount}
            setPlayerCount={setPlayerCount}
            players={players}
            updatePlayer={updatePlayer}
            typeConfig={typeConfig}
            setTypeConfig={setTypeConfig}
            slotSearches={slotSearches}
            handleSlotSearch={handleSlotSearch}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            filteredSlots={filteredSlots}
            handleSlotSelect={handleSlotSelect}
            canStart={canStart}
            startTournament={startTournament}
          />
        )}

        {/* ── ACTIVE / COMPLETED PHASE ── */}
        {(phase === 'active' || phase === 'completed') && (
          <div className="tp-active-layout">
            {/* Progress bar */}
            <ProgressBar stats={stats} phase={phase} />

            {/* Bracket */}
            <BracketDisplay
              bracket={bracket}
              activeRound={activeRound}
              activeMatch={activeMatch}
              onSelectMatch={(rIdx, mIdx) => { setActiveRound(rIdx); setActiveMatch(mIdx); }}
              tournamentType={tournamentType}
            />

            {/* Match Control Panel */}
            {currentMatch && phase === 'active' && (
              <MatchPanel
                match={currentMatch}
                tournamentType={tournamentType}
                roundLabel={bracket[activeRound]?.label}
                matchNum={activeMatch + 1}
                totalMatches={bracket[activeRound]?.matches.length}
                onRoundInput={handleRoundInput}
                onManualWinner={handleManualWinner}
                onResetMatch={handleResetMatch}
              />
            )}

            {/* Champion Banner */}
            {phase === 'completed' && champion && (
              <div className="tp-champion-banner">
                <div className="tp-champion-trophy">&#127942;</div>
                <h2 className="tp-champion-name">{champion}</h2>
                <p className="tp-champion-subtitle">Tournament Champion</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SETUP PHASE
   ═══════════════════════════════════════════════════ */
function SetupPhase({
  tournamentName, setTournamentName,
  tournamentType, setTournamentType,
  playerCount, setPlayerCount,
  players, updatePlayer,
  typeConfig, setTypeConfig,
  slotSearches, handleSlotSearch,
  showSuggestions, setShowSuggestions,
  filteredSlots, handleSlotSelect,
  canStart, startTournament,
}) {
  return (
    <div className="tp-setup">
      {/* Tournament Config */}
      <section className="tp-card tp-setup-config">
        <h2 className="tp-card-title">Tournament Settings</h2>

        <label className="tp-field">
          <span>Tournament Name</span>
          <input
            type="text"
            value={tournamentName}
            onChange={e => setTournamentName(e.target.value)}
            placeholder="e.g. Friday Night Showdown"
            className="tp-input"
          />
        </label>

        <label className="tp-field">
          <span>Tournament Type</span>
          <div className="tp-type-grid">
            {Object.values(TOURNAMENT_TYPES).map(t => (
              <button
                key={t.id}
                className={`tp-type-btn ${tournamentType === t.id ? 'tp-type-btn--active' : ''}`}
                onClick={() => setTournamentType(t.id)}
                type="button"
              >
                <span className="tp-type-icon">{t.icon}</span>
                <span className="tp-type-label">{t.label}</span>
                <span className="tp-type-desc">{t.description}</span>
              </button>
            ))}
          </div>
        </label>

        <label className="tp-field">
          <span>Player Count</span>
          <div className="tp-count-row">
            {[4, 8, 16].map(n => (
              <button
                key={n}
                className={`tp-count-btn ${playerCount === n ? 'tp-count-btn--active' : ''}`}
                onClick={() => setPlayerCount(n)}
                type="button"
              >{n} Players</button>
            ))}
          </div>
        </label>

        {tournamentType === 'spins' && (
          <label className="tp-field">
            <span>Number of Spins</span>
            <input
              type="number"
              min={1}
              value={typeConfig.numSpins || 50}
              onChange={e => setTypeConfig(prev => ({ ...prev, numSpins: parseInt(e.target.value) || 50 }))}
              className="tp-input tp-input--sm"
            />
          </label>
        )}

        {tournamentType === 'bonus_bo3' && (
          <label className="tp-field">
            <span>Draw Rule</span>
            <select
              value={typeConfig.drawRule || 'no_point'}
              onChange={e => setTypeConfig(prev => ({ ...prev, drawRule: e.target.value }))}
              className="tp-input"
            >
              <option value="no_point">No Point (draw = no point awarded)</option>
              <option value="replay">Replay (draw = round replayed)</option>
            </select>
          </label>
        )}
      </section>

      {/* Player Entry */}
      <section className="tp-card tp-setup-players">
        <h2 className="tp-card-title">Players</h2>
        <div className="tp-players-grid">
          {players.map((player, idx) => (
            <div key={idx} className="tp-player-entry">
              <div className="tp-player-seed">#{idx + 1}</div>
              <div className="tp-player-fields">
                <input
                  type="text"
                  value={player.name}
                  onChange={e => updatePlayer(idx, 'name', e.target.value)}
                  placeholder="Player name"
                  className="tp-input"
                />
                <input
                  type="text"
                  value={player.twitchUsername || ''}
                  onChange={e => updatePlayer(idx, 'twitchUsername', e.target.value)}
                  placeholder="Twitch username (optional)"
                  className="tp-input tp-input--sm"
                />
                <div className="tp-slot-search-wrap">
                  <input
                    type="text"
                    value={slotSearches[idx] ?? player.slot?.name ?? ''}
                    onChange={e => handleSlotSearch(idx, e.target.value)}
                    onFocus={() => { if ((slotSearches[idx] || '').length > 0) setShowSuggestions(prev => ({ ...prev, [idx]: true })); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, [idx]: false })), 200)}
                    placeholder="Search slot..."
                    className="tp-input tp-input--sm"
                  />
                  {showSuggestions[idx] && (
                    <div className="tp-slot-dropdown">
                      {filteredSlots(slotSearches[idx] || '').map(slot => (
                        <button
                          key={slot.id || slot.name}
                          className="tp-slot-option"
                          onMouseDown={() => handleSlotSelect(idx, slot)}
                          type="button"
                        >
                          {slot.image && <img src={slot.image} alt="" className="tp-slot-thumb" />}
                          <span>{slot.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {player.slot?.image && (
                <img src={player.slot.image} alt="" className="tp-player-slot-img" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Start Button */}
      <div className="tp-setup-actions">
        <button
          className={`tp-btn tp-btn--start ${!canStart ? 'tp-btn--disabled' : ''}`}
          onClick={startTournament}
          disabled={!canStart}
          type="button"
        >
          &#9876; Start Tournament
        </button>
        {!canStart && <p className="tp-hint">Fill in all player names to start</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════════ */
function ProgressBar({ stats }) {
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  return (
    <div className="tp-progress">
      <div className="tp-progress-info">
        <span>{stats.completed}/{stats.total} matches completed</span>
        <span>{pct}%</span>
      </div>
      <div className="tp-progress-track">
        <div className="tp-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   BRACKET DISPLAY
   ═══════════════════════════════════════════════════ */
function BracketDisplay({ bracket, activeRound, activeMatch, onSelectMatch, tournamentType }) {
  return (
    <div className="tp-bracket">
      <h2 className="tp-card-title">Bracket</h2>
      <div className="tp-bracket-scroll">
        <div className="tp-bracket-rounds">
          {bracket.map((round, rIdx) => (
            <div key={rIdx} className="tp-bracket-round">
              <div className="tp-bracket-round-label">{round.label}</div>
              <div className="tp-bracket-matches">
                {round.matches.map((match, mIdx) => {
                  const isActive = rIdx === activeRound && mIdx === activeMatch;
                  const winner = match.winner ?? calcMatchWinner(match);
                  const isComplete = match.status === MATCH_STATUS.COMPLETED || winner != null;
                  const p1Win = winner === 'player1';
                  const p2Win = winner === 'player2';

                  return (
                    <button
                      key={mIdx}
                      className={`tp-bracket-match ${isActive ? 'tp-bracket-match--active' : ''} ${isComplete ? 'tp-bracket-match--done' : ''}`}
                      onClick={() => onSelectMatch(rIdx, mIdx)}
                      type="button"
                    >
                      <div className={`tp-bm-player ${p1Win ? 'tp-bm-player--win' : ''} ${p2Win ? 'tp-bm-player--lose' : ''}`}>
                        <span className="tp-bm-name">{match.player1 || 'TBD'}</span>
                        {isComplete && <span className="tp-bm-result">{fmtPlayerResult(match, 'player1', tournamentType)}</span>}
                      </div>
                      <div className="tp-bm-vs">VS</div>
                      <div className={`tp-bm-player ${p2Win ? 'tp-bm-player--win' : ''} ${p1Win ? 'tp-bm-player--lose' : ''}`}>
                        <span className="tp-bm-name">{match.player2 || 'TBD'}</span>
                        {isComplete && <span className="tp-bm-result">{fmtPlayerResult(match, 'player2', tournamentType)}</span>}
                      </div>
                      {isComplete && winner && (
                        <div className="tp-bm-winner-badge">
                          &#10003; {winner === 'player1' ? match.player1 : winner === 'player2' ? match.player2 : 'Draw'}
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
  );
}

function fmtPlayerResult(match, playerKey, type) {
  if (type === 'bonus_bo3') {
    let total = 0, any = false;
    for (const round of match.rounds) {
      const r = calcRoundResult(round[playerKey], type);
      if (r !== null) { total += r; any = true; }
    }
    return any ? fmtVal(total) : '';
  }
  const r = calcRoundResult(match.rounds[0]?.[playerKey], type);
  return r !== null ? fmtVal(r) : '';
}

function fmtVal(val) {
  if (val === null || val === undefined) return '';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}€`;
}

/* ═══════════════════════════════════════════════════
   MATCH CONTROL PANEL
   ═══════════════════════════════════════════════════ */
function MatchPanel({ match, tournamentType, roundLabel, matchNum, totalMatches, onRoundInput, onManualWinner, onResetMatch }) {
  const fields = getRoundInputFields(tournamentType);
  const isBo3 = tournamentType === 'bonus_bo3';
  const scoreboard = isBo3 ? getBoScoreboard(match) : null;
  const winner = match.winner ?? calcMatchWinner(match);

  return (
    <div className="tp-match-panel">
      <div className="tp-mp-header">
        <h3>
          {roundLabel} &mdash; Match {matchNum}/{totalMatches}
        </h3>
        <div className="tp-mp-status">
          {match.status === MATCH_STATUS.COMPLETED
            ? <span className="tp-badge tp-badge--done">Completed</span>
            : match.status === MATCH_STATUS.IN_PROGRESS
              ? <span className="tp-badge tp-badge--live">In Progress</span>
              : <span className="tp-badge tp-badge--pending">Pending</span>
          }
        </div>
      </div>

      {/* Player names banner */}
      <div className="tp-mp-players">
        <div className={`tp-mp-p ${winner === 'player1' ? 'tp-mp-p--win' : ''}`}>
          {match.slot1?.image && <img src={match.slot1.image} alt="" className="tp-mp-slot-img" />}
          <div>
            <div className="tp-mp-p-name">{match.player1}</div>
            {match.slot1?.name && <div className="tp-mp-p-slot">{match.slot1.name}</div>}
          </div>
        </div>
        <div className="tp-mp-vs">VS</div>
        <div className={`tp-mp-p ${winner === 'player2' ? 'tp-mp-p--win' : ''}`}>
          <div style={{ textAlign: 'right' }}>
            <div className="tp-mp-p-name">{match.player2}</div>
            {match.slot2?.name && <div className="tp-mp-p-slot">{match.slot2.name}</div>}
          </div>
          {match.slot2?.image && <img src={match.slot2.image} alt="" className="tp-mp-slot-img" />}
        </div>
      </div>

      {/* Bo3 scoreboard */}
      {isBo3 && scoreboard && (
        <div className="tp-mp-scoreboard">
          <span className={scoreboard.p1Wins >= 2 ? 'tp-score-win' : ''}>{scoreboard.p1Wins}</span>
          <span className="tp-score-sep">&ndash;</span>
          <span className={scoreboard.p2Wins >= 2 ? 'tp-score-win' : ''}>{scoreboard.p2Wins}</span>
        </div>
      )}

      {/* Round inputs */}
      {match.rounds.map((round, rIdx) => (
        <div key={rIdx} className="tp-mp-round">
          {isBo3 && <div className="tp-mp-round-label">Round {rIdx + 1}</div>}
          <div className="tp-mp-round-grid">
            {/* Player 1 */}
            <div className="tp-mp-round-side">
              <div className="tp-mp-side-name">{match.player1}</div>
              {fields.map(f => (
                <label key={f.key} className="tp-mp-input-label">
                  <span>{f.label}</span>
                  <div className="tp-mp-input-wrap">
                    <span className="tp-mp-input-prefix">{f.prefix}</span>
                    <input
                      type="number"
                      step="any"
                      value={round.player1[f.key] ?? ''}
                      onChange={e => {
                        const v = e.target.value === '' ? null : parseFloat(e.target.value);
                        onRoundInput(rIdx, 'player1', f.key, v);
                      }}
                      className="tp-input tp-input--num"
                      placeholder="0.00"
                    />
                  </div>
                </label>
              ))}
              {(() => {
                const r = calcRoundResult(round.player1, tournamentType);
                return r !== null ? (
                  <div className={`tp-mp-result ${r > 0 ? 'tp-mp-result--pos' : r < 0 ? 'tp-mp-result--neg' : ''}`}>
                    {fmtVal(r)}
                  </div>
                ) : null;
              })()}
            </div>

            <div className="tp-mp-round-vs">VS</div>

            {/* Player 2 */}
            <div className="tp-mp-round-side">
              <div className="tp-mp-side-name">{match.player2}</div>
              {fields.map(f => (
                <label key={f.key} className="tp-mp-input-label">
                  <span>{f.label}</span>
                  <div className="tp-mp-input-wrap">
                    <span className="tp-mp-input-prefix">{f.prefix}</span>
                    <input
                      type="number"
                      step="any"
                      value={round.player2[f.key] ?? ''}
                      onChange={e => {
                        const v = e.target.value === '' ? null : parseFloat(e.target.value);
                        onRoundInput(rIdx, 'player2', f.key, v);
                      }}
                      className="tp-input tp-input--num"
                      placeholder="0.00"
                    />
                  </div>
                </label>
              ))}
              {(() => {
                const r = calcRoundResult(round.player2, tournamentType);
                return r !== null ? (
                  <div className={`tp-mp-result ${r > 0 ? 'tp-mp-result--pos' : r < 0 ? 'tp-mp-result--neg' : ''}`}>
                    {fmtVal(r)}
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* Round winner indicator */}
          {round.winner && (
            <div className="tp-mp-round-winner">
              &#10003; {round.winner === 'player1' ? match.player1 : round.winner === 'player2' ? match.player2 : 'Draw'}
            </div>
          )}
        </div>
      ))}

      {/* Manual override & reset */}
      <div className="tp-mp-actions">
        <button className="tp-btn tp-btn--sm tp-btn--outline" onClick={() => onManualWinner('player1')} type="button">
          {match.winner === 'player1' ? '✓ ' : ''}Force {match.player1} Win
        </button>
        <button className="tp-btn tp-btn--sm tp-btn--outline" onClick={() => onManualWinner('player2')} type="button">
          {match.winner === 'player2' ? '✓ ' : ''}Force {match.player2} Win
        </button>
        <button className="tp-btn tp-btn--sm tp-btn--danger" onClick={onResetMatch} type="button">
          Reset Match
        </button>
      </div>
    </div>
  );
}
