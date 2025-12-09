import React from 'react';
import TournamentBracket from './TournamentBracket';
import './TournamentBracketOverlay.css';
import useDraggable from '../../hooks/useDraggable';

const TournamentBracketOverlay = ({ matches, currentRound, onSelectWinner, onAdvanceRound, onReset, winner }) => {
  const draggableRef = useDraggable(true, 'bracket');
  
  if (!matches && !winner) return null;

  const allMatchesComplete = matches ? matches.every(m => m.winner !== null) : false;

  return (
    <div className="bracket-container" ref={draggableRef}>
      <div className="bracket-header-bar drag-handle">
        <h1>🏆 Tournament Bracket</h1>
        <button className="bracket-close-btn" onClick={onReset}>✕</button>
      </div>

        {winner ? (
          <div className="tournament-winner-display">
            <div className="winner-crown">👑</div>
            <h2>CHAMPION</h2>
            <div className="winner-player-name">{winner.player}</div>
            <div className="winner-player-slot">{winner.slot}</div>
            <button className="new-tournament-btn" onClick={onReset}>
              Start New Tournament
            </button>
          </div>
        ) : (
          <>
            <TournamentBracket 
              matches={matches}
              currentPhase={currentRound}
              onSelectWinner={onSelectWinner}
            />

            <div className="bracket-footer-actions">
              <button 
                className="advance-round-btn"
                onClick={onAdvanceRound}
                disabled={!allMatchesComplete}
              >
                {allMatchesComplete ? 'Advance to Next Round →' : `${matches.filter(m => m.winner).length}/${matches.length} Matches Complete`}
              </button>
              <button className="reset-tournament-btn" onClick={onReset}>
                Reset Tournament
              </button>
            </div>
          </>
        )}
    </div>
  );
};

export default TournamentBracketOverlay;
