import { useState } from 'react';
import './TournamentModal.css';

export default function TournamentModal({ overlay, onClose, slots, updateSettings }) {
  const [players, setPlayers] = useState(['', '', '', '', '', '', '', '']);
  const [selectedSlots, setSelectedSlots] = useState([null, null, null, null, null, null, null, null]);
  const [slotSearches, setSlotSearches] = useState(['', '', '', '', '', '', '', '']);
  const [showSlotSuggestions, setShowSlotSuggestions] = useState([false, false, false, false, false, false, false, false]);
  const [matchFormat, setMatchFormat] = useState('single'); // 'single' or 'bo3'
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [betAmount, setBetAmount] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [editMode, setEditMode] = useState(false);

  const handlePlayerChange = (index, value) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
    
    // If tournament is already started, update the settings immediately
    if (tournamentStarted && overlay.settings.widgets?.tournaments?.data) {
      const currentData = overlay.settings.widgets.tournaments.data;
      const newSettings = {
        ...overlay.settings,
        widgets: {
          ...overlay.settings.widgets,
          tournaments: {
            ...overlay.settings.widgets.tournaments,
            data: {
              ...currentData,
              players: newPlayers
            }
          }
        }
      };
      updateSettings(newSettings);
    }
  };

  const handleSlotSearch = (index, value) => {
    const newSearches = [...slotSearches];
    newSearches[index] = value;
    setSlotSearches(newSearches);
    
    const newShowSuggestions = [...showSlotSuggestions];
    newShowSuggestions[index] = value.length > 0;
    setShowSlotSuggestions(newShowSuggestions);
  };

  const handleSlotSelect = (index, slot) => {
    const newSelectedSlots = [...selectedSlots];
    newSelectedSlots[index] = slot;
    setSelectedSlots(newSelectedSlots);
    
    const newSearches = [...slotSearches];
    newSearches[index] = slot.name;
    setSlotSearches(newSearches);
    
    const newShowSuggestions = [...showSlotSuggestions];
    newShowSuggestions[index] = false;
    setShowSlotSuggestions(newShowSuggestions);
    
    // If tournament is already started, update the settings immediately
    if (tournamentStarted && overlay.settings.widgets?.tournaments?.data) {
      const currentData = overlay.settings.widgets.tournaments.data;
      const newSettings = {
        ...overlay.settings,
        widgets: {
          ...overlay.settings.widgets,
          tournaments: {
            ...overlay.settings.widgets.tournaments,
            data: {
              ...currentData,
              slots: newSelectedSlots
            }
          }
        }
      };
      updateSettings(newSettings);
    }
  };

  const filteredSlots = (searchTerm) => {
    if (!searchTerm || searchTerm.length === 0) return [];
    return slots.filter(slot => 
      slot && slot.name && slot.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  };

  const startTournament = () => {
    // Validate all players and slots are filled
    if (players.some(p => !p) || selectedSlots.some(s => !s)) {
      alert('Please fill in all player names and select slots for each player');
      return;
    }

    const tournamentData = {
      players,
      slots: selectedSlots,
      format: matchFormat,
      phase: 'quarterfinals',
      matches: generateBracket(),
      history: []
    };

    const newSettings = {
      ...overlay.settings,
      widgets: {
        ...overlay.settings.widgets,
        tournaments: {
          ...overlay.settings.widgets.tournaments,
          active: true,
          data: tournamentData
        }
      }
    };
    updateSettings(newSettings);
    setTournamentStarted(true);
  };

  const generateBracket = () => {
    // Generate quarter-final matches (8 players)
    return [
      { player1: 0, player2: 1, winner: null }, // QF1
      { player1: 2, player2: 3, winner: null }, // QF2
      { player1: 4, player2: 5, winner: null }, // QF3
      { player1: 6, player2: 7, winner: null }  // QF4
    ];
  };

  const advanceToNextPhase = () => {
    const currentData = overlay.settings.widgets?.tournaments?.data;
    if (!currentData) return;

    const { matches, phase, players: currentPlayers, slots: currentSlots } = currentData;
    
    // Check if all matches have winners
    const allMatchesComplete = matches.every(m => m.winner !== null);
    if (!allMatchesComplete) {
      alert('Please complete all matches before advancing to the next phase');
      return;
    }

    let newMatches = [];
    let newPhase = phase;
    const winners = matches.map(m => m.winner);

    if (phase === 'quarterfinals') {
      // Create semi-final matches from quarter-final winners
      newPhase = 'semifinals';
      newMatches = [
        { player1: winners[0], player2: winners[1], winner: null },
        { player1: winners[2], player2: winners[3], winner: null }
      ];
    } else if (phase === 'semifinals') {
      // Create finals match from semi-final winners
      newPhase = 'finals';
      newMatches = [
        { player1: winners[0], player2: winners[1], winner: null }
      ];
    }

    const newSettings = {
      ...overlay.settings,
      widgets: {
        ...overlay.settings.widgets,
        tournaments: {
          ...overlay.settings.widgets.tournaments,
          data: {
            ...currentData,
            phase: newPhase,
            matches: newMatches,
            history: [...(currentData.history || []), { phase, matches }]
          }
        }
      }
    };
    updateSettings(newSettings);
  };



  return (
    <>
      <div className="modal-overlay-transparent" onClick={onClose}></div>
      <div className="modal-draggable tournament-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>🏆 Tournament Manager</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            {!tournamentStarted ? (
              <>
                {/* Tournament Setup */}
                <div className="form-section">
                  <h3>Match Format</h3>
                  <div className="format-toggle">
                    <button 
                      className={`format-btn ${matchFormat === 'single' ? 'active' : ''}`}
                      onClick={() => setMatchFormat('single')}
                    >
                      Single Match
                    </button>
                    <button 
                      className={`format-btn ${matchFormat === 'bo3' ? 'active' : ''}`}
                      onClick={() => setMatchFormat('bo3')}
                    >
                      Best of 3
                    </button>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Players & Slots</h3>
                  <div className="tournament-players-grid">
                    {players.map((player, index) => (
                      <div key={index} className="tournament-player-entry">
                        <div className="player-header">
                          <span className="player-number">#{index + 1}</span>
                          <span className="player-label">Player {index + 1}</span>
                        </div>
                        <input 
                          type="text"
                          value={player}
                          onChange={(e) => handlePlayerChange(index, e.target.value)}
                          placeholder="Player name"
                          className="tournament-player-input"
                        />
                        
                        <div className="tournament-slot-wrapper">
                          <input 
                            type="text"
                            value={slotSearches[index]}
                            onChange={(e) => handleSlotSearch(index, e.target.value)}
                            onFocus={() => {
                              const newShowSuggestions = [...showSlotSuggestions];
                              newShowSuggestions[index] = slotSearches[index].length > 0;
                              setShowSlotSuggestions(newShowSuggestions);
                            }}
                            placeholder="Search slot..."
                            className="tournament-slot-input"
                          />
                          {selectedSlots[index] && (
                            <div className="selected-slot-preview">
                              <img src={selectedSlots[index].image} alt={selectedSlots[index].name} />
                            </div>
                          )}
                          {showSlotSuggestions[index] && filteredSlots(slotSearches[index]).length > 0 && (
                            <div className="tournament-slot-suggestions">
                              {filteredSlots(slotSearches[index]).map(slot => (
                                <div 
                                  key={slot.id}
                                  className="tournament-slot-suggestion"
                                  onClick={() => handleSlotSelect(index, slot)}
                                >
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

                <button className="action-button start-tournament-btn" onClick={startTournament}>
                  🚀 Start Tournament
                </button>
              </>
            ) : (
              <>
                {/* Tournament Controls */}
                {(() => {
                  const currentData = overlay.settings.widgets?.tournaments?.data;
                  const currentPhase = currentData?.phase || 'quarterfinals';
                  const phaseLabels = {
                    quarterfinals: 'Quarter-Finals',
                    semifinals: 'Semi-Finals',
                    finals: 'Finals'
                  };
                  
                  const calculateMultiplier = (bet, payout) => {
                    const betNum = parseFloat(bet);
                    const payoutNum = parseFloat(payout);
                    if (isNaN(betNum) || isNaN(payoutNum) || betNum === 0) return 0;
                    return payoutNum / betNum;
                  };

                  const autoCalculateWinner = (matchIndex) => {
                    const match = currentData.matches[matchIndex];
                    const matchData = match.data || {};
                    const p1Data = matchData.player1 || {};
                    const p2Data = matchData.player2 || {};

                    const isBo3 = currentData.format === 'bo3';
                    let p1X, p2X;

                    if (isBo3) {
                      // For BO3, sum all payouts
                      const p1Total = (parseFloat(p1Data.payout1) || 0) + (parseFloat(p1Data.payout2) || 0) + (parseFloat(p1Data.payout3) || 0);
                      const p2Total = (parseFloat(p2Data.payout1) || 0) + (parseFloat(p2Data.payout2) || 0) + (parseFloat(p2Data.payout3) || 0);
                      p1X = calculateMultiplier(p1Data.bet, p1Total);
                      p2X = calculateMultiplier(p2Data.bet, p2Total);
                    } else {
                      p1X = calculateMultiplier(p1Data.bet, p1Data.payout);
                      p2X = calculateMultiplier(p2Data.bet, p2Data.payout);
                    }

                    // Auto-select winner based on higher X
                    if (p1X > 0 || p2X > 0) {
                      const tournamentData = { ...currentData };
                      tournamentData.matches[matchIndex].winner = p1X > p2X ? match.player1 : match.player2;
                      
                      const newSettings = {
                        ...overlay.settings,
                        widgets: {
                          ...overlay.settings.widgets,
                          tournaments: {
                            ...overlay.settings.widgets.tournaments,
                            data: tournamentData
                          }
                        }
                      };
                      updateSettings(newSettings);
                    }
                  };

                  const setMatchWinner = (matchIndex, winnerId) => {
                    const tournamentData = { ...currentData };
                    tournamentData.matches[matchIndex].winner = winnerId;
                    
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        tournaments: {
                          ...overlay.settings.widgets.tournaments,
                          data: tournamentData
                        }
                      }
                    };
                    updateSettings(newSettings);
                  };

                  return (
                    <>
                      <div className="form-section">
                        <h3>Current Phase: {phaseLabels[currentPhase]}</h3>
                        <div className="current-match-display">
                          {currentData?.matches?.length || 0} {currentData?.matches?.length === 1 ? 'Match' : 'Matches'} in this phase
                        </div>
                      </div>

                      <div className="form-section">
                        <h3>Match Results</h3>
                        <div className="matches-list">
                          {currentData?.matches?.map((match, index) => {
                            const matchData = match.data || {};
                            const player1Data = matchData.player1 || {};
                            const player2Data = matchData.player2 || {};
                            const isBo3 = currentData.format === 'bo3';
                            
                            // Determine if this is the current active match
                            const isCurrentMatch = (() => {
                              for (let i = 0; i < index; i++) {
                                const prevMatch = currentData.matches[i];
                                const prevData = prevMatch.data || {};
                                const p1 = prevData.player1 || {};
                                const p2 = prevData.player2 || {};
                                // Check if previous match is incomplete
                                if (!p1.bet || !p2.bet || !p1.payout || !p2.payout) {
                                  return false;
                                }
                              }
                              return true;
                            })();
                            
                            const savePlayerData = (playerKey, field, value) => {
                              const updatedMatches = [...currentData.matches];
                              const currentMatchData = updatedMatches[index].data || {};
                              const playerData = currentMatchData[playerKey] || {};
                              
                              updatedMatches[index] = {
                                ...updatedMatches[index],
                                data: {
                                  ...currentMatchData,
                                  [playerKey]: {
                                    ...playerData,
                                    [field]: parseFloat(value) || 0
                                  }
                                }
                              };
                              
                              const newSettings = {
                                ...overlay.settings,
                                widgets: {
                                  ...overlay.settings.widgets,
                                  tournaments: {
                                    ...overlay.settings.widgets.tournaments,
                                    data: { ...currentData, matches: updatedMatches, currentMatchIndex: index }
                                  }
                                }
                              };
                              updateSettings(newSettings);
                            };
                            
                            return (
                              <div key={index} className={`match-result-card ${isCurrentMatch ? 'active-match' : ''} ${!isCurrentMatch ? 'disabled-match' : ''}`}>
                                <div className="match-title">Match {index + 1} {isCurrentMatch && '(Active)'}</div>

                                {/* Player Cards with Slot Images and Inputs */}
                                <div className="match-players">
                                  <div className="player-card">
                                    <div className="player-slot-image">
                                      <img 
                                        src={selectedSlots[match.player1]?.image || '/placeholder-slot.png'} 
                                        alt={selectedSlots[match.player1]?.name} 
                                      />
                                    </div>
                                    
                                    {/* Player 1 Inputs */}
                                    <div className="player-inputs">
                                      <div className="match-input-group">
                                        <label className="match-input-label">Bet (€)</label>
                                        <input
                                          type="number"
                                          className="match-input"
                                          defaultValue={player1Data.bet || ''}
                                          onBlur={(e) => savePlayerData('player1', 'bet', e.target.value)}
                                          placeholder="0.00"
                                          disabled={!isCurrentMatch}
                                        />
                                      </div>
                                      
                                      {isBo3 ? (
                                        <div className="payout-inputs-bo3">
                                          <div className="match-input-group">
                                            <label className="match-input-label">G1</label>
                                            <input
                                              type="number"
                                              className="match-input"
                                              defaultValue={player1Data.payout1 || ''}
                                              onBlur={(e) => {
                                                savePlayerData('player1', 'payout1', e.target.value);
                                                setTimeout(() => autoCalculateWinner(index), 100);
                                              }}
                                              placeholder="0"
                                              disabled={!isCurrentMatch}
                                            />
                                          </div>
                                          <div className="match-input-group">
                                            <label className="match-input-label">G2</label>
                                            <input
                                              type="number"
                                              className="match-input"
                                              defaultValue={player1Data.payout2 || ''}
                                              onBlur={(e) => {
                                                savePlayerData('player1', 'payout2', e.target.value);
                                                setTimeout(() => autoCalculateWinner(index), 100);
                                              }}
                                              placeholder="0"
                                              disabled={!isCurrentMatch}
                                            />
                                          </div>
                                          <div className="match-input-group">
                                            <label className="match-input-label">G3</label>
                                            <input
                                              type="number"
                                              className="match-input"
                                              defaultValue={player1Data.payout3 || ''}
                                              onBlur={(e) => {
                                                savePlayerData('player1', 'payout3', e.target.value);
                                                setTimeout(() => autoCalculateWinner(index), 100);
                                              }}
                                              placeholder="0"
                                              disabled={!isCurrentMatch}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="match-input-group">
                                          <label className="match-input-label">Payout (€)</label>
                                          <input
                                            type="number"
                                            className="match-input"
                                            defaultValue={player1Data.payout || ''}
                                            onBlur={(e) => {
                                              savePlayerData('player1', 'payout', e.target.value);
                                              setTimeout(() => autoCalculateWinner(index), 100);
                                            }}
                                            placeholder="0.00"
                                            disabled={!isCurrentMatch}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    
                                    <button
                                      className={`winner-select-btn ${match.winner === match.player1 ? 'winner' : ''}`}
                                      onClick={() => isCurrentMatch && setMatchWinner(index, match.winner === match.player1 ? null : match.player1)}
                                      disabled={!isCurrentMatch}
                                    >
                                      {match.winner === match.player1 && '👑 '}
                                      {players[match.player1]}
                                    </button>
                                  </div>
                                  
                                  <span className="vs-text">VS</span>
                                  
                                  <div className="player-card">
                                    <div className="player-slot-image">
                                      <img 
                                        src={selectedSlots[match.player2]?.image || '/placeholder-slot.png'} 
                                        alt={selectedSlots[match.player2]?.name} 
                                      />
                                    </div>
                                    
                                    {/* Player 2 Inputs */}
                                    <div className="player-inputs">
                                      <div className="match-input-group">
                                        <label className="match-input-label">Bet (€)</label>
                                        <input
                                          type="number"
                                          className="match-input"
                                          defaultValue={player2Data.bet || ''}
                                          onBlur={(e) => savePlayerData('player2', 'bet', e.target.value)}
                                          placeholder="0.00"
                                          disabled={!isCurrentMatch}
                                        />
                                      </div>
                                      
                                      {isBo3 ? (
                                        <div className="payout-inputs-bo3">
                                          <div className="match-input-group">
                                            <label className="match-input-label">G1</label>
                                            <input
                                              type="number"
                                              className="match-input"
                                              defaultValue={player2Data.payout1 || ''}
                                              onBlur={(e) => {
                                                savePlayerData('player2', 'payout1', e.target.value);
                                                setTimeout(() => autoCalculateWinner(index), 100);
                                              }}
                                              placeholder="0"
                                              disabled={!isCurrentMatch}
                                            />
                                          </div>
                                          <div className="match-input-group">
                                            <label className="match-input-label">G2</label>
                                            <input
                                              type="number"
                                              className="match-input"
                                              defaultValue={player2Data.payout2 || ''}
                                              onBlur={(e) => {
                                                savePlayerData('player2', 'payout2', e.target.value);
                                                setTimeout(() => autoCalculateWinner(index), 100);
                                              }}
                                              placeholder="0"
                                              disabled={!isCurrentMatch}
                                            />
                                          </div>
                                          <div className="match-input-group">
                                            <label className="match-input-label">G3</label>
                                            <input
                                              type="number"
                                              className="match-input"
                                              defaultValue={player2Data.payout3 || ''}
                                              onBlur={(e) => {
                                                savePlayerData('player2', 'payout3', e.target.value);
                                                setTimeout(() => autoCalculateWinner(index), 100);
                                              }}
                                              placeholder="0"
                                              disabled={!isCurrentMatch}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="match-input-group">
                                          <label className="match-input-label">Payout (€)</label>
                                          <input
                                            type="number"
                                            className="match-input"
                                            defaultValue={player2Data.payout || ''}
                                            onBlur={(e) => {
                                              savePlayerData('player2', 'payout', e.target.value);
                                              setTimeout(() => autoCalculateWinner(index), 100);
                                            }}
                                            placeholder="0.00"
                                            disabled={!isCurrentMatch}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    
                                    <button
                                      className={`winner-select-btn ${match.winner === match.player2 ? 'winner' : ''}`}
                                      onClick={() => isCurrentMatch && setMatchWinner(index, match.winner === match.player2 ? null : match.player2)}
                                      disabled={!isCurrentMatch}
                                    >
                                      {match.winner === match.player2 && '👑 '}
                                      {players[match.player2]}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="tournament-actions">
                        {currentPhase !== 'finals' && (
                          <button 
                            className="action-button advance-btn compact" 
                            onClick={advanceToNextPhase}
                          >
                            ⏭️ Advance
                          </button>
                        )}
                        <button 
                          className="action-button edit-btn compact"
                          onClick={() => setEditMode(!editMode)}
                        >
                          {editMode ? '✓ Done' : '✏️ Edit'}
                        </button>
                      </div>

                      <div className="form-section">

                        {editMode && (
                          <div className="tournament-players-grid edit-mode">
                            {players.map((player, index) => (
                              <div key={index} className="tournament-player-entry">
                                <div className="player-header">
                                  <span className="player-number">#{index + 1}</span>
                                  <span className="player-label">Player {index + 1}</span>
                                </div>
                                <input 
                                  type="text"
                                  value={player}
                                  onChange={(e) => handlePlayerChange(index, e.target.value)}
                                  className="tournament-player-input"
                                />
                                
                                <div className="tournament-slot-wrapper">
                                  <input 
                                    type="text"
                                    value={slotSearches[index]}
                                    onChange={(e) => handleSlotSearch(index, e.target.value)}
                                    className="tournament-slot-input"
                                  />
                                  {selectedSlots[index] && (
                                    <div className="selected-slot-preview">
                                      <img src={selectedSlots[index].image} alt={selectedSlots[index].name} />
                                    </div>
                                  )}
                                  {showSlotSuggestions[index] && filteredSlots(slotSearches[index]).length > 0 && (
                                    <div className="tournament-slot-suggestions">
                                      {filteredSlots(slotSearches[index]).map(slot => (
                                        <div 
                                          key={slot.id}
                                          className="tournament-slot-suggestion"
                                          onClick={() => handleSlotSelect(index, slot)}
                                        >
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
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
