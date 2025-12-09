import { useState, useEffect } from 'react';
import './TournamentPanel.css';
import { getAllSlots, searchSlotsByName, getRandomSlots } from '../../../../utils/slotUtils';
import TournamentBracketWidget from '../TournamentBracket/TournamentBracketWidget';
import TournamentControlPanel from '../TournamentBracket/TournamentControlPanel';
import { useBonusHunt } from '../../../../context/BonusHuntContext';
import { useAuth } from '../../../../context/AuthContext';
import { 
  getUserTournament, 
  upsertUserTournament, 
  subscribeToTournament,
  unsubscribe 
} from '../../../../utils/overlayUtils';
import useDraggable from '../../../../hooks/useDraggable';

const TournamentPanel = ({ onClose }) => {
  const { getSlotImage } = useBonusHunt();
  const { user } = useAuth();
  const draggableRef = useDraggable(true, 'tournament');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [tournamentSize, setTournamentSize] = useState(8);
  const [tournamentFormat, setTournamentFormat] = useState('single-elimination');
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [winner, setWinner] = useState(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showSetup, setShowSetup] = useState(true);
  
  // Slot suggestions state
  const [slotSuggestions, setSlotSuggestions] = useState({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);
  const [slotDatabase, setSlotDatabase] = useState([]);
  const [slotDataCache, setSlotDataCache] = useState({});

  // Load slots from Supabase
  useEffect(() => {
    async function loadSlots() {
      const slots = await getAllSlots();
      setSlotDatabase(slots);
    }
    loadSlots();
  }, []);

  // Load user's tournament from database on mount
  useEffect(() => {
    if (!user) {
      setIsInitialized(false);
      return;
    }

    const loadTournament = async () => {
      try {
        const tournament = await getUserTournament(user.id);
        if (tournament) {
          setTournamentSize(tournament.tournament_size || 8);
          setTournamentFormat(tournament.tournament_format || 'single-elimination');
          setParticipants(tournament.participants || []);
          setMatches(tournament.matches || []);
          setCurrentRound(tournament.current_round);
          setCurrentMatchIndex(tournament.current_match_index || 0);
          setTournamentStarted(tournament.tournament_started || false);
          setWinner(tournament.winner);
          setShowSetup(tournament.show_setup !== false);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading tournament:', error);
        setIsInitialized(true);
      }
    };

    loadTournament();
  }, [user]);

  // Subscribe to real-time tournament updates
  useEffect(() => {
    if (!user || !isInitialized) return;

    const subscription = subscribeToTournament(user.id, (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const tournament = payload.new;
        setTournamentSize(tournament.tournament_size || 8);
        setTournamentFormat(tournament.tournament_format || 'single-elimination');
        setParticipants(tournament.participants || []);
        setMatches(tournament.matches || []);
        setCurrentRound(tournament.current_round);
        setCurrentMatchIndex(tournament.current_match_index || 0);
        setTournamentStarted(tournament.tournament_started || false);
        setWinner(tournament.winner);
        setShowSetup(tournament.show_setup !== false);
      }
    });

    return () => {
      unsubscribe(subscription);
    };
  }, [user, isInitialized]);

  // Save tournament to database whenever state changes
  useEffect(() => {
    if (!user || !isInitialized) return;

    const saveTournament = async () => {
      try {
        await upsertUserTournament(user.id, {
          tournament_size: tournamentSize,
          tournament_format: tournamentFormat,
          participants,
          matches,
          current_round: currentRound,
          current_match_index: currentMatchIndex,
          tournament_started: tournamentStarted,
          winner,
          show_setup: showSetup
        });
      } catch (error) {
        console.error('Error saving tournament:', error);
      }
    };

    const debounceTimer = setTimeout(saveTournament, 500);
    return () => clearTimeout(debounceTimer);
  }, [
    tournamentSize,
    tournamentFormat,
    participants,
    matches,
    currentRound,
    currentMatchIndex,
    tournamentStarted,
    winner,
    showSetup,
    user,
    isInitialized
  ]);

  // Initialize empty participant slots when size changes (only if not loaded from storage)
  useEffect(() => {
    if (participants.length === 0 || participants.length !== tournamentSize) {
      const newParticipants = Array.from({ length: tournamentSize }, (_, i) => ({
        id: i + 1,
        player: '',
        slot: '',
        eliminated: false
      }));
      setParticipants(newParticipants);
    }
  }, [tournamentSize]);

  const fillRandomSlots = async () => {
    const randomNames = [
      'ProGamer', 'SlotMaster', 'LuckyStreamer', 'BigWinner', 'CasinoKing', 'SpinLord',
      'BonusHunter', 'RollMaster', 'WildCard', 'MegaSpin', 'JackpotJoe', 'LuckyLuke',
      'SpinDoctor', 'SlotBeast', 'CasinoAce', 'MegaWin', 'BonusKing', 'SpinMaster'
    ];

    const shuffledNames = [...randomNames].sort(() => 0.5 - Math.random());
    const randomSlots = await getRandomSlots(tournamentSize);

    // Cache slot data
    const slotCache = {};
    randomSlots.forEach(slot => {
      if (slot?.name) {
        slotCache[slot.name] = slot;
      }
    });
    setSlotDataCache(prev => ({ ...prev, ...slotCache }));

    setParticipants(prev => prev.map((p, i) => ({
      ...p,
      player: shuffledNames[i] || `Player ${i + 1}`,
      slot: randomSlots[i]?.name || 'Random Slot'
    })));
  };

  const clearAll = () => {
    setParticipants(prev => prev.map(p => ({ ...p, player: '', slot: '' })));
  };

  // Handle slot input change with suggestions
  const handleSlotInputChange = async (index, value) => {
    const newParticipants = [...participants];
    newParticipants[index].slot = value;
    setParticipants(newParticipants);

    if (value.length >= 3) {
      const matches = await searchSlotsByName(value);
      const limitedMatches = matches.slice(0, 8);
      
      setSlotSuggestions(prev => ({
        ...prev,
        [index]: limitedMatches
      }));
      
      if (limitedMatches.length > 0) {
        setActiveSuggestionIndex(index);
      }
    } else {
      setSlotSuggestions(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      if (activeSuggestionIndex === index) {
        setActiveSuggestionIndex(null);
      }
    }
  };

  // Fetch slot data for a specific slot name
  const fetchSlotData = async (slotName) => {
    if (slotDataCache[slotName]) {
      return slotDataCache[slotName];
    }
    
    const slots = await searchSlotsByName(slotName);
    const exactMatch = slots.find(s => s.name.toLowerCase() === slotName.toLowerCase());
    
    if (exactMatch) {
      setSlotDataCache(prev => ({ ...prev, [slotName]: exactMatch }));
      return exactMatch;
    }
    
    return null;
  };

  // Select suggestion
  const selectSlotSuggestion = async (index, slotName, slotData = null) => {
    const newParticipants = [...participants];
    newParticipants[index].slot = slotName;
    setParticipants(newParticipants);
    
    // Cache slot data if provided
    if (slotData) {
      setSlotDataCache(prev => ({ ...prev, [slotName]: slotData }));
    } else {
      // Fetch slot data if not provided
      await fetchSlotData(slotName);
    }
    
    setSlotSuggestions(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    setActiveSuggestionIndex(null);
  };

  const validateSetup = () => {
    const validParticipants = participants.filter(p => p.player.trim() && p.slot.trim());
    
    if (validParticipants.length < 2) {
      return false;
    }

    // Check for duplicate players
    const playerNames = validParticipants.map(p => p.player.toLowerCase());
    const hasDuplicates = playerNames.some((name, index) => playerNames.indexOf(name) !== index);
    
    if (hasDuplicates) {
      return false;
    }

    // Start tournament and close setup panel
    startTournament();
    setShowSetup(false);
    return true;
  };

  const startTournament = async () => {
    const validParticipants = participants.filter(p => p.player.trim() && p.slot.trim());
    
    // Fetch slot data for all participants if not already cached
    const slotsToFetch = validParticipants
      .map(p => p.slot)
      .filter(slotName => !slotDataCache[slotName]);
    
    if (slotsToFetch.length > 0) {
      const slotPromises = slotsToFetch.map(slotName => fetchSlotData(slotName));
      await Promise.all(slotPromises);
    }
    
    // Create first round matches
    const firstRoundMatches = [];
    for (let i = 0; i < validParticipants.length; i += 2) {
      if (validParticipants[i + 1]) {
        firstRoundMatches.push({
          id: `match-${i / 2}`,
          player1: validParticipants[i],
          player2: validParticipants[i + 1],
          winner: null,
          round: getRoundName(validParticipants.length)
        });
      }
    }

    setMatches(firstRoundMatches);
    setCurrentRound(getRoundName(validParticipants.length));
    setCurrentMatchIndex(0);
    setTournamentStarted(true);
  };

  const getRoundName = (playerCount) => {
    const rounds = {
      2: 'Finals',
      4: 'Semi-Finals',
      8: 'Quarter-Finals',
      16: 'Round of 16',
      32: 'Round of 32'
    };
    return rounds[playerCount] || `Round of ${playerCount}`;
  };

  const setMatchWinner = (matchIndex, winnerName) => {
    setMatches(prev => prev.map((match, idx) =>
      idx === matchIndex ? { ...match, winner: winnerName } : match
    ));
  };

  const handleMatchComplete = (matchIndex, winnerName, matchResult) => {
    const updatedMatches = [...matches];
    updatedMatches[matchIndex] = { 
      ...updatedMatches[matchIndex], 
      winner: winnerName,
      result: matchResult
    };
    setMatches(updatedMatches);

    // Check if all matches are complete
    const allComplete = updatedMatches.every(m => m.winner !== null);
    
    if (allComplete) {
      const winners = updatedMatches.map(match => {
        if (match.winner === match.player1?.player) {
          return {
            ...match.player1,
            finalPayout: match.result?.player1?.payout,
            finalMultiplier: match.result?.player1?.multiplier
          };
        }
        if (match.winner === match.player2?.player) {
          return {
            ...match.player2,
            finalPayout: match.result?.player2?.payout,
            finalMultiplier: match.result?.player2?.multiplier
          };
        }
        return null;
      }).filter(Boolean);

      if (winners.length === 1) {
        setWinner(winners[0]);
        return;
      }

      // Create next round matches - advance winners to next phase
      setTimeout(() => {
        const nextRoundMatches = [];
        for (let i = 0; i < winners.length; i += 2) {
          if (winners[i + 1]) {
            nextRoundMatches.push({
              id: `match-r${Date.now()}-${i / 2}`,
              player1: winners[i],
              player2: winners[i + 1],
              winner: null,
              round: getRoundName(winners.length)
            });
          }
        }

        setMatches(nextRoundMatches);
        setCurrentRound(getRoundName(winners.length));
        setCurrentMatchIndex(0);
      }, 1000);
    }
  };
  const resetTournament = () => {
    setMatches([]);
    setTournamentStarted(false);
    setWinner(null);
    setCurrentRound(null);
    setCurrentMatchIndex(0);
    setShowSetup(true);
  };

  const closeAll = () => {
    setMatches([]);
    setTournamentStarted(false);
    setWinner(null);
    setCurrentRound(null);
    setCurrentMatchIndex(0);
    setShowSetup(true);
    onClose();
  };

  return (
    <>
      {showSetup && (
          <div className="tournament-panel" ref={draggableRef}>
            <div className="tournament-header drag-handle">
              <h2>🏆 TOURNAMENT</h2>
              <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            <div className="tournament-setup">
              <div className="setup-controls">
                <div className="control-group">
                  <label>SIZE</label>
                  <select value={tournamentSize} onChange={(e) => setTournamentSize(Number(e.target.value))}>
                    <option value={4}>4 Players</option>
                    <option value={8}>8 Players</option>
                    <option value={16}>16 Players</option>
                    <option value={32}>32 Players</option>
                  </select>
                </div>

                <div className="control-group">
                  <label>FORMAT</label>
                  <select value={tournamentFormat} onChange={(e) => setTournamentFormat(e.target.value)}>
                    <option value="single-elimination">Single</option>
                    <option value="double-elimination">Double</option>
                  </select>
                </div>
              </div>

              <div className="quick-actions">
                <button className="action-btn" onClick={fillRandomSlots}>🎲 Random</button>
                <button className="action-btn" onClick={clearAll}>🗑️ Clear</button>
                <button className="action-btn" onClick={validateSetup}>✅ Check</button>
              </div>

              <div className="participants-grid">
                {participants.map((participant, index) => (
                  <div key={participant.id} className="participant-entry">
                    <div className="participant-number">{index + 1}</div>
                    <input
                      type="text"
                      placeholder="Player"
                      value={participant.player}
                      onChange={(e) => {
                        const newParticipants = [...participants];
                        newParticipants[index].player = e.target.value;
                        setParticipants(newParticipants);
                      }}
                    />
                    <div className="slot-input-wrapper">
                      <input
                        type="text"
                        placeholder="Slot"
                        value={participant.slot}
                        onChange={(e) => handleSlotInputChange(index, e.target.value)}
                        onFocus={() => {
                          if (participant.slot.length >= 3 && slotSuggestions[index]?.length > 0) {
                            setActiveSuggestionIndex(index);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            if (activeSuggestionIndex === index) {
                              setActiveSuggestionIndex(null);
                            }
                          }, 200);
                        }}
                      />
                      {activeSuggestionIndex === index && slotSuggestions[index]?.length > 0 && (
                        <div className="tournament-slot-suggestions">
                          {slotSuggestions[index].map((slot, idx) => (
                            <div
                              key={idx}
                              className="tournament-suggestion-item"
                              onMouseDown={() => selectSlotSuggestion(index, slot.name, slot)}
                            >
                              <img src={slot.image} alt={slot.name} />
                              <div className="tournament-suggestion-info">
                                <div className="tournament-suggestion-name">{slot.name}</div>
                                <div className="tournament-suggestion-provider">{slot.provider}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button className="start-tournament-btn" onClick={validateSetup}>
                ✅ Validate & Start
              </button>
            </div>
          </div>
      )}

      {tournamentStarted && !winner && matches.length > 0 && (
        <>
          <TournamentBracketWidget
            matches={matches}
            currentRound={currentRound}
            currentMatchIndex={currentMatchIndex}
            slotDataCache={slotDataCache}
          />
          <TournamentControlPanel
            matches={matches}
            currentRound={currentRound}
            onClose={closeAll}
            onMatchComplete={handleMatchComplete}
            onResetTournament={resetTournament}
            currentMatchIndex={currentMatchIndex}
            onMatchIndexChange={setCurrentMatchIndex}
          />
        </>
      )}

      {winner && (
        <div className="tournament-winner-widget">
          <div className="winner-widget-content">
            <h2>CHAMPION!</h2>
            <div className="winner-slot-card">
              <div className="winner-player-overlay">{winner.player}</div>
              <img 
                src={getSlotImage(winner.slot, slotDataCache[winner.slot])} 
                alt={winner.slot}
                className="winner-slot-image"
                onError={(e) => e.target.src = 'https://via.placeholder.com/250x320?text=Slot'}
              />
              <div className="winner-slot-name">{winner.slot}</div>
              {winner.finalPayout !== undefined && winner.finalMultiplier !== undefined && (
                <div className="winner-stats-overlay">
                  <div className="winner-stat-half">
                    <span className="winner-stat-label">💵 PAYOUT</span>
                    <span className="winner-stat-value">{winner.finalPayout.toFixed(2)}</span>
                  </div>
                  <div className="winner-stat-divider"></div>
                  <div className="winner-stat-half">
                    <span className="winner-stat-label">✨ MULTI</span>
                    <span className="winner-stat-value">{winner.finalMultiplier}x</span>
                  </div>
                </div>
              )}
            </div>
            <button className="new-tournament-btn" onClick={resetTournament}>
              New Tournament
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TournamentPanel;
