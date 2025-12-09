import React, { useState, useEffect } from 'react';
import './TournamentControlPanel.css';
import { useBonusHunt } from '../../../../context/BonusHuntContext';
import useDraggable from '../../../../hooks/useDraggable';

const TournamentControlPanel = ({ matches, currentRound, onClose, onMatchComplete, onResetTournament, currentMatchIndex: parentMatchIndex = 0, onMatchIndexChange, slotDataCache = {} }) => {
  const { getSlotImage } = useBonusHunt();
  const draggableRef = useDraggable(true, 'tournament');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(parentMatchIndex);
  const [player1BetSize, setPlayer1BetSize] = useState('');
  const [player1Payout, setPlayer1Payout] = useState('');
  const [player2BetSize, setPlayer2BetSize] = useState('');
  const [player2Payout, setPlayer2Payout] = useState('');
  const [previousRound, setPreviousRound] = useState(currentRound);

  const currentMatch = matches[currentMatchIndex];

  // Save match data to localStorage
  const saveMatchData = (matchIndex, data) => {
    const cacheKey = `tournament_match_${matchIndex}`;
    localStorage.setItem(cacheKey, JSON.stringify(data));
  };

  // Load match data from localStorage
  const loadMatchData = (matchIndex) => {
    const cacheKey = `tournament_match_${matchIndex}`;
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  };

  // Detect phase change and clear all cached data for the new phase
  useEffect(() => {
    if (currentRound !== previousRound && previousRound !== null) {
      // Phase changed - clear all match data for this round
      console.log(`Phase changed from ${previousRound} to ${currentRound} - clearing all inputs`);
      
      // Clear all cached match data
      matches.forEach((_, index) => {
        localStorage.removeItem(`tournament_match_${index}`);
      });
      
      // Clear current inputs
      setPlayer1BetSize('');
      setPlayer1Payout('');
      setPlayer2BetSize('');
      setPlayer2Payout('');
      
      // Reset to first match of new phase
      setCurrentMatchIndex(0);
    }
    setPreviousRound(currentRound);
  }, [currentRound, previousRound, matches]);

  // Sync with parent's match index when it changes (e.g., when advancing rounds)
  useEffect(() => {
    setCurrentMatchIndex(parentMatchIndex);
  }, [parentMatchIndex]);

  useEffect(() => {
    // Load cached data when match changes
    const cachedData = loadMatchData(currentMatchIndex);
    if (cachedData) {
      setPlayer1BetSize(cachedData.player1BetSize || '');
      setPlayer1Payout(cachedData.player1Payout || '');
      setPlayer2BetSize(cachedData.player2BetSize || '');
      setPlayer2Payout(cachedData.player2Payout || '');
    } else {
      setPlayer1BetSize('');
      setPlayer1Payout('');
      setPlayer2BetSize('');
      setPlayer2Payout('');
    }
  }, [currentMatchIndex]);

  // Save data whenever inputs change
  useEffect(() => {
    if (player1BetSize || player1Payout || player2BetSize || player2Payout) {
      saveMatchData(currentMatchIndex, {
        player1BetSize,
        player1Payout,
        player2BetSize,
        player2Payout
      });
    }
  }, [player1BetSize, player1Payout, player2BetSize, player2Payout, currentMatchIndex]);

  const calculateMultiplier = (bet, payout) => {
    const betVal = parseFloat(bet) || 0;
    const payoutVal = parseFloat(payout) || 0;
    if (betVal === 0) return 0;
    return (payoutVal / betVal).toFixed(2);
  };

  const player1Multiplier = calculateMultiplier(player1BetSize, player1Payout);
  const player2Multiplier = calculateMultiplier(player2BetSize, player2Payout);

  const determineWinner = () => {
    const bet1 = parseFloat(player1BetSize);
    const payout1 = parseFloat(player1Payout);
    const bet2 = parseFloat(player2BetSize);
    const payout2 = parseFloat(player2Payout);

    if (!bet1 || bet1 <= 0 || !bet2 || bet2 <= 0) {
      return;
    }

    if (!payout1 || payout1 < 0 || !payout2 || payout2 < 0) {
      return;
    }

    const mult1 = parseFloat(player1Multiplier);
    const mult2 = parseFloat(player2Multiplier);

    // Determine winner: first by payout, then by multiplier if payouts are equal
    let winner;
    if (payout1 > payout2) {
      winner = currentMatch.player1;
    } else if (payout2 > payout1) {
      winner = currentMatch.player2;
    } else {
      // Payouts are equal, compare multipliers
      if (mult1 > mult2) {
        winner = currentMatch.player1;
      } else if (mult2 > mult1) {
        winner = currentMatch.player2;
      } else {
        return;
      }
    }

    // Store the match result with payout data
    const matchResult = {
      matchIndex: currentMatchIndex,
      winner: winner.player,
      player1: {
        ...currentMatch.player1,
        betSize: bet1,
        payout: payout1,
        multiplier: mult1
      },
      player2: {
        ...currentMatch.player2,
        betSize: bet2,
        payout: payout2,
        multiplier: mult2
      }
    };

    onMatchComplete(currentMatchIndex, winner.player, matchResult);

    // Move to next match after a short delay
    setTimeout(() => {
      if (currentMatchIndex < matches.length - 1) {
        const nextIndex = currentMatchIndex + 1;
        if (onMatchIndexChange) {
          onMatchIndexChange(nextIndex);
        }
        setCurrentMatchIndex(nextIndex);
      }
    }, 500);
  };

  const goToMatch = (index) => {
    if (index >= 0 && index < matches.length) {
      if (onMatchIndexChange) {
        onMatchIndexChange(index);
      }
      setCurrentMatchIndex(index);
    }
  };

  if (!currentMatch) return null;

  return (
    <div className="tournament-control-panel" ref={draggableRef}>
      <div className="control-panel-header drag-handle">
        <h3>Tournament Control</h3>
        <button className="control-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="control-panel-content">
        {/* Players Section */}
        <div className="control-players">
          {/* Player 1 */}
          <div className="control-player">
            <div className="control-player-info">
              <div className="control-player-name">{currentMatch.player1?.player || 'Player 1'}</div>
              <div className="control-slot-name">{currentMatch.player1?.slot || 'No slot'}</div>
            </div>
            <div className="player-slot-image">
              <img 
                src={getSlotImage(currentMatch.player1?.slot, slotDataCache[currentMatch.player1?.slot])} 
                alt={currentMatch.player1?.slot}
                onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=Slot'}
              />
              <div className="control-inputs-overlay">
                <div className="control-input-group">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Bet Size"
                    value={player1BetSize}
                    onChange={(e) => setPlayer1BetSize(e.target.value)}
                  />
                </div>
                <div className="control-input-group">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Payout"
                    value={player1Payout}
                    onChange={(e) => setPlayer1Payout(e.target.value)}
                  />
                </div>
                {player1BetSize && player1Payout && (
                  <div className="control-multiplier-display">
                    {player1Multiplier}x
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="control-vs">VS</div>

          {/* Player 2 */}
          <div className="control-player">
            <div className="control-player-info">
              <div className="control-player-name">{currentMatch.player2?.player || 'Player 2'}</div>
              <div className="control-slot-name">{currentMatch.player2?.slot || 'No slot'}</div>
            </div>
            <div className="player-slot-image">
              <img 
                src={getSlotImage(currentMatch.player2?.slot, slotDataCache[currentMatch.player2?.slot])} 
                alt={currentMatch.player2?.slot}
                onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=Slot'}
              />
              <div className="control-inputs-overlay">
                <div className="control-input-group">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Bet Size"
                    value={player2BetSize}
                    onChange={(e) => setPlayer2BetSize(e.target.value)}
                  />
                </div>
                <div className="control-input-group">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Payout"
                    value={player2Payout}
                    onChange={(e) => setPlayer2Payout(e.target.value)}
                  />
                </div>
                {player2BetSize && player2Payout && (
                  <div className="control-multiplier-display">
                    {player2Multiplier}x
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="control-nav-buttons">
          <button 
            className="control-nav-btn"
            onClick={() => goToMatch(currentMatchIndex - 1)}
            disabled={currentMatchIndex === 0}
          >
            ← Previous
          </button>
          <button 
            className="control-nav-btn"
            onClick={() => goToMatch(currentMatchIndex + 1)}
            disabled={currentMatchIndex === matches.length - 1}
          >
            Next →
          </button>
        </div>

        {/* Action Buttons */}
        <div className="control-actions">
          <button className="control-determine-btn" onClick={determineWinner}>
            Determine Winner
          </button>
        </div>

        {/* Reset Button */}
        <button className="control-reset-btn" onClick={onResetTournament}>
          🔄 Reset Tournament
        </button>
      </div>
    </div>
  );
};

export default TournamentControlPanel;
