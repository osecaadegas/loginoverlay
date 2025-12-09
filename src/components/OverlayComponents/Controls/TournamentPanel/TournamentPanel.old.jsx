import { useState } from 'react';
import './TournamentPanel.css';

const TournamentPanel = ({ onClose }) => {
  const [tournamentType, setTournamentType] = useState('single'); // single or double
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [matches, setMatches] = useState([]);
  const [currentRound, setCurrentRound] = useState('Quarter-Finals');

  const addPlayer = () => {
    if (newPlayerName.trim() && players.length < 16) {
      setPlayers([...players, { id: Date.now(), name: newPlayerName.trim(), eliminated: false }]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const generateBracket = () => {
    if (players.length < 2) {
      alert('Need at least 2 players to generate bracket');
      return;
    }

    // Determine rounds based on player count
    const totalRounds = Math.ceil(Math.log2(players.length));
    const roundNames = ['Finals', 'Semi-Finals', 'Quarter-Finals', 'Round of 16', 'Round of 32'];
    const roundName = roundNames[totalRounds - 1] || `Round ${totalRounds}`;
    
    setCurrentRound(roundName);

    // Create initial matches
    const newMatches = [];
    for (let i = 0; i < players.length; i += 2) {
      if (players[i + 1]) {
        newMatches.push({
          id: Date.now() + i,
          player1: players[i],
          player2: players[i + 1],
          winner: null,
          round: roundName,
          matchNumber: Math.floor(i / 2) + 1
        });
      }
    }
    setMatches(newMatches);
  };

  const advanceWinners = () => {
    const completedMatches = matches.filter(m => m.winner !== null);
    if (completedMatches.length < matches.length) {
      alert('Complete all matches before advancing!');
      return;
    }

    const winners = completedMatches.map(m => 
      players.find(p => p.id === m.winner)
    );

    if (winners.length === 1) {
      alert(`Tournament Winner: ${winners[0].name}! 🏆`);
      return;
    }

    // Create next round
    const newMatches = [];
    const roundNames = ['Finals', 'Semi-Finals', 'Quarter-Finals', 'Round of 16'];
    const nextRoundIndex = roundNames.indexOf(currentRound) - 1;
    const nextRound = nextRoundIndex >= 0 ? roundNames[nextRoundIndex] : 'Finals';
    
    setCurrentRound(nextRound);

    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) {
        newMatches.push({
          id: Date.now() + i,
          player1: winners[i],
          player2: winners[i + 1],
          winner: null,
          round: nextRound,
          matchNumber: Math.floor(i / 2) + 1
        });
      }
    }
    setMatches(newMatches);
  };

  const setWinner = (matchId, winnerId) => {
    setMatches(matches.map(match => 
      match.id === matchId ? { ...match, winner: winnerId } : match
    ));
  };

  const resetTournament = () => {
    if (confirm('Are you sure you want to reset the tournament?')) {
      setMatches([]);
      setPlayers([]);
      setCurrentRound('Quarter-Finals');
    }
  };

  return (
    <div className="tournament-overlay">
      <div className="tournament-panel">
        <div className="tournament-header">
          <h2>🏆 Tournament Bracket</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="tournament-content">
          <div className="tournament-setup">
            <div className="section">
              <h3>Tournament Type</h3>
              <div className="type-selector">
                <button 
                  className={`type-btn ${tournamentType === 'single' ? 'active' : ''}`}
                  onClick={() => setTournamentType('single')}
                >
                  Single Elimination
                </button>
                <button 
                  className={`type-btn ${tournamentType === 'double' ? 'active' : ''}`}
                  onClick={() => setTournamentType('double')}
                >
                  Double Elimination
                </button>
              </div>
            </div>

            <div className="section">
              <h3>Add Players ({players.length}/16)</h3>
              <div className="player-input-group">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                  placeholder="Enter player name"
                  maxLength={20}
                />
                <button className="add-btn" onClick={addPlayer} disabled={players.length >= 16}>
                  ➕ Add
                </button>
              </div>

              <div className="players-list">
                {players.map((player, index) => (
                  <div key={player.id} className="player-item">
                    <span className="player-number">{index + 1}</span>
                    <span className="player-name">{player.name}</span>
                    <button className="remove-btn" onClick={() => removePlayer(player.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h3>Bracket Controls</h3>
              <div className="control-buttons">
                <button className="control-btn generate" onClick={generateBracket}>
                  🎮 Generate Bracket
                </button>
                <button className="control-btn advance" onClick={advanceWinners} disabled={matches.length === 0}>
                  ⏭️ Advance Winners
                </button>
                <button className="control-btn reset" onClick={resetTournament}>
                  🔄 Reset Tournament
                </button>
              </div>
            </div>
          </div>

          {matches.length > 0 && (
            <div className="tournament-bracket">
              <div className="bracket-header">
                <h3>{currentRound}</h3>
                <span className="match-count">{matches.length} Matches</span>
              </div>

              <div className="matches-grid">
                {matches.map((match) => (
                  <div key={match.id} className="match-card">
                    <div className="match-header">
                      Match {match.matchNumber}
                      {match.winner && <span className="match-complete-badge">✓</span>}
                    </div>
                    
                    <div 
                      className={`match-player ${match.winner === match.player1.id ? 'winner' : ''}`}
                      onClick={() => setWinner(match.id, match.player1.id)}
                    >
                      <span className="player-name">{match.player1.name}</span>
                      {match.winner === match.player1.id && <span className="winner-badge">👑</span>}
                    </div>

                    <div className="vs-divider">VS</div>

                    <div 
                      className={`match-player ${match.winner === match.player2.id ? 'winner' : ''}`}
                      onClick={() => setWinner(match.id, match.player2.id)}
                    >
                      <span className="player-name">{match.player2.name}</span>
                      {match.winner === match.player2.id && <span className="winner-badge">👑</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentPanel;
