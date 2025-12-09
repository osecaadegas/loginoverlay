import React from 'react';
import './TournamentBracketWidget.css';
import { useBonusHunt } from '../../../context/BonusHuntContext';

const TournamentBracketWidget = ({ matches, currentRound, currentMatchIndex, slotDataCache = {} }) => {
  const { getSlotImage } = useBonusHunt();

  // Group matches by round for bottom display
  const displayMatches = matches.map((match, idx) => ({
    ...match,
    matchNumber: idx + 1
  }));

  const currentMatch = matches[currentMatchIndex] || null;

  return (
    <div className={`bracket-widget-wrapper ${currentRound.toLowerCase().replace('-', '')}`}>
      {/* Bracket Widget */}
      <div className="bracket-widget-display">
        <div className="bracket-display-header">
          <button className="bracket-close-btn">✕</button>
          
          <div className="bracket-phase-tabs">
            <button className={`phase-tab ${currentRound === 'Quarter-Finals' ? 'active' : ''}`}>
              QUARTER FINALS
            </button>
            <button className={`phase-tab ${currentRound === 'Semi-Finals' ? 'active' : ''}`}>
              SEMI FINALS
            </button>
            <button className={`phase-tab ${currentRound === 'Finals' ? 'active' : ''}`}>
              FINAL
            </button>
          </div>
        </div>

      {/* Grid of all matches */}
      <div className="bracket-matches-grid">
        {displayMatches.map((match, idx) => (
          <div key={match.id || match.matchNumber} className={`bracket-match-cell ${idx === currentMatchIndex ? 'current-match' : ''}`}>
            {/* Player 1 */}
            <div className={`bracket-mini-card ${match.winner === match.player1?.player ? 'winner' : match.winner ? 'loser' : ''}`}>
              <div className="mini-card-name">{match.player1?.player}</div>
              <div className="mini-card-image">
                <img 
                  src={getSlotImage(match.player1?.slot, slotDataCache[match.player1?.slot])} 
                  alt={match.player1?.slot}
                  onError={(e) => e.target.src = 'https://via.placeholder.com/80x100?text=Slot'}
                />
                {match.winner === match.player1?.player && (
                  <div className="mini-winner-badge">✓</div>
                )}
              </div>
              <div className="mini-card-stats">
                <div className="mini-stat multiplier">{match.result?.player1?.multiplier || '0.00'}x</div>
              </div>
            </div>

            {/* VS */}
            <div className={`bracket-mini-vs ${idx === currentMatchIndex ? 'active' : ''}`}>⚔️</div>

            {/* Player 2 */}
            <div className={`bracket-mini-card ${match.winner === match.player2?.player ? 'winner' : match.winner ? 'loser' : ''}`}>
              <div className="mini-card-name">{match.player2?.player}</div>
              <div className="mini-card-image">
                <img 
                  src={getSlotImage(match.player2?.slot, slotDataCache[match.player2?.slot])} 
                  alt={match.player2?.slot}
                  onError={(e) => e.target.src = 'https://via.placeholder.com/80x100?text=Slot'}
                />
                {match.winner === match.player2?.player && (
                  <div className="mini-winner-badge">✓</div>
                )}
              </div>
              <div className="mini-card-stats">
                <div className="mini-stat multiplier">{match.result?.player2?.multiplier || '0.00'}x</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

export default TournamentBracketWidget;
