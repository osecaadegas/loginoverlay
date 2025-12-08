import React from 'react';
import './TournamentBracket.css';

const TournamentBracket = ({ matches, currentPhase, onSelectWinner }) => {
  const getPhaseTitle = () => {
    if (matches.length === 1) return 'FINAL';
    if (matches.length === 2) return 'SEMI-FINALS';
    if (matches.length === 4) return 'QUARTER-FINALS';
    return `ROUND OF ${matches.length * 2}`;
  };

  return (
    <div className="tournament-bracket-display">
      <div className="bracket-phase-header">
        <h2>{getPhaseTitle()}</h2>
        <span className="phase-count">{matches.length} {matches.length === 1 ? 'Match' : 'Matches'}</span>
      </div>

      <div className="bracket-matches-grid" data-match-count={matches.length}>
        {matches.map((match, idx) => (
          <div key={idx} className={`bracket-match-card ${match.winner ? 'completed' : ''}`}>
            <div className="bracket-match-number">Match {idx + 1}</div>
            
            <div 
              className={`bracket-slot ${match.winner === match.player1?.name ? 'winner' : match.winner ? 'loser' : ''}`}
              onClick={() => !match.winner && match.player1 && onSelectWinner(idx, match.player1.name)}
            >
              <div className="bracket-slot-info">
                <div className="bracket-slot-name">{match.player1?.name || 'TBD'}</div>
                <div className="bracket-slot-game">{match.player1?.slot || '—'}</div>
              </div>
              {match.winner === match.player1?.name && (
                <div className="bracket-winner-badge">👑</div>
              )}
            </div>

            <div className="bracket-vs">VS</div>

            <div 
              className={`bracket-slot ${match.winner === match.player2?.name ? 'winner' : match.winner ? 'loser' : ''}`}
              onClick={() => !match.winner && match.player2 && onSelectWinner(idx, match.player2.name)}
            >
              <div className="bracket-slot-info">
                <div className="bracket-slot-name">{match.player2?.name || 'TBD'}</div>
                <div className="bracket-slot-game">{match.player2?.slot || '—'}</div>
              </div>
              {match.winner === match.player2?.name && (
                <div className="bracket-winner-badge">👑</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentBracket;
