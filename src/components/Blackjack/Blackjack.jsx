import { useState, useEffect } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { supabase } from '../../config/supabaseClient';
import './Blackjack3D.css';

// API base URL - uses relative path for Vercel
const API_URL = '/api/blackjack';

export default function Blackjack() {
  const { points, isConnected, updateUserPoints } = useStreamElements();
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerValue, setPlayerValue] = useState(0);
  const [dealerValue, setDealerValue] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [perfectPairsBet, setPerfectPairsBet] = useState(0);
  const [twentyOnePlusThreeBet, setTwentyOnePlusThreeBet] = useState(0);
  const [gameState, setGameState] = useState('betting'); // betting, playing, finished
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(0);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBalance(points);
  }, [points]);

  // Helper to make authenticated API calls
  const apiCall = async (action, params = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ action, ...params })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API error');
    }
    return data;
  };

  const startGame = async () => {
    if (!isConnected) {
      setMessage('Please connect your StreamElements account first!');
      return;
    }

    if (betAmount > balance || betAmount <= 0) {
      setMessage('Invalid bet amount!');
      return;
    }

    setLoading(true);
    try {
      // Deduct bet from balance
      const totalBet = betAmount + perfectPairsBet + twentyOnePlusThreeBet;
      await updateUserPoints(-totalBet);

      // Call server to deal cards
      const data = await apiCall('deal', { 
        bet: betAmount, 
        perfectPairsBet, 
        twentyOnePlusThreeBet 
      });

      if (data.success) {
        setGameId(data.game.id);
        setPlayerHand(data.game.playerHand);
        setDealerHand(data.game.dealerHand);
        setPlayerValue(data.game.playerValue);
        setDealerValue(data.game.dealerValue);

        if (data.game.status === 'finished') {
          // Instant result (blackjack or push)
          handleGameEnd(data.game);
        } else {
          setGameState('playing');
          setMessage('');
        }
      }
    } catch (error) {
      console.error('Start game error:', error);
      // Refund bet on error
      const totalBet = betAmount + perfectPairsBet + twentyOnePlusThreeBet;
      await updateUserPoints(totalBet);
      setMessage('Failed to start game: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const hit = async () => {
    if (gameState !== 'playing' || loading) return;

    setLoading(true);
    try {
      const data = await apiCall('hit', { gameId });

      if (data.success) {
        setPlayerHand(data.game.playerHand);
        setPlayerValue(data.game.playerValue);

        if (data.game.status === 'finished') {
          setDealerHand(data.game.dealerHand);
          setDealerValue(data.game.dealerValue);
          handleGameEnd(data.game);
        }
      }
    } catch (error) {
      console.error('Hit error:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const stand = async () => {
    if (gameState !== 'playing' || loading) return;

    setLoading(true);
    try {
      const data = await apiCall('stand', { gameId });

      if (data.success) {
        setPlayerHand(data.game.playerHand);
        setDealerHand(data.game.dealerHand);
        setPlayerValue(data.game.playerValue);
        setDealerValue(data.game.dealerValue);
        handleGameEnd(data.game);
      }
    } catch (error) {
      console.error('Stand error:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGameEnd = async (game) => {
    let resultMessage = '';
    
    switch (game.result) {
      case 'blackjack':
        resultMessage = `Blackjack! You win ${game.resultAmount} points!`;
        break;
      case 'player_win':
        resultMessage = `You win ${game.resultAmount} points!`;
        break;
      case 'dealer_win':
        resultMessage = 'Dealer wins!';
        break;
      case 'push':
        resultMessage = 'Push! Bet returned.';
        break;
      case 'bust':
        resultMessage = 'Bust! You lose.';
        break;
      default:
        resultMessage = 'Game over';
    }

    // Update points if won
    if (game.resultAmount > 0) {
      await updateUserPoints(game.resultAmount);
    }

    setMessage(resultMessage);
    setGameState('finished');
  };

  const resetGame = () => {
    setGameId(null);
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerValue(0);
    setDealerValue(null);
    setGameState('betting');
    setMessage('');
  };

  const getCardColor = (card) => {
    if (card.hidden) return '';
    return card.color || (card.suit === '♥' || card.suit === '♦' ? 'red' : 'black');
  };

  return (
    <div className="blackjack-container">
      <div className="blackjack-header">
        <h1>🃏 Blackjack</h1>
        <div className="balance-display">
          <span className="balance-label">Balance:</span>
          <span className="balance-amount">{balance} pts</span>
        </div>
      </div>

      {!isConnected && (
        <div className="connection-warning">
          <p>⚠️ Connect with Twitch to access the games</p>
        </div>
      )}

      <div className="game-layout">
        {/* Left Panel - Betting */}
        <div className="betting-panel">
          <h2>Place Your Bet</h2>
          
          {/* Main Bet */}
          <div className="bet-section">
            <label>Bet Amount (Max 200)</label>
            <div className="bet-input-group">
              <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))}>-</button>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.min(200, Math.max(10, parseInt(e.target.value) || 10)))}
                min="10"
                max="200"
              />
              <button onClick={() => setBetAmount(Math.min(200, betAmount + 10))}>+</button>
            </div>
            <div className="quick-bet-chips">
              <button onClick={() => setBetAmount(10)}>10</button>
              <button onClick={() => setBetAmount(25)}>25</button>
              <button onClick={() => setBetAmount(50)}>50</button>
              <button onClick={() => setBetAmount(100)}>100</button>
              <button onClick={() => setBetAmount(200)}>200</button>
            </div>
          </div>

          {/* Side Bets */}
          <div className="side-bets-section">
            <h3>Side Bets (Max 10 each)</h3>
            
            <div className="side-bet">
              <label>Perfect Pairs</label>
              <div className="bet-input-group">
                <button onClick={() => setPerfectPairsBet(Math.max(0, perfectPairsBet - 5))}>-</button>
                <input
                  type="number"
                  value={perfectPairsBet}
                  onChange={(e) => setPerfectPairsBet(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                  min="0"
                  max="10"
                />
                <button onClick={() => setPerfectPairsBet(Math.min(10, perfectPairsBet + 5))}>+</button>
              </div>
            </div>

            <div className="side-bet">
              <label>21+3</label>
              <div className="bet-input-group">
                <button onClick={() => setTwentyOnePlusThreeBet(Math.max(0, twentyOnePlusThreeBet - 5))}>-</button>
                <input
                  type="number"
                  value={twentyOnePlusThreeBet}
                  onChange={(e) => setTwentyOnePlusThreeBet(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                  min="0"
                  max="10"
                />
                <button onClick={() => setTwentyOnePlusThreeBet(Math.min(10, twentyOnePlusThreeBet + 5))}>+</button>
              </div>
            </div>
          </div>

          {gameState === 'betting' && (
            <button className="deal-button" onClick={startGame} disabled={!isConnected || loading}>
              {loading ? 'Dealing...' : 'Deal Cards'}
            </button>
          )}

          {gameState === 'finished' && (
            <button className="deal-button" onClick={resetGame}>
              New Game
            </button>
          )}
        </div>

        {/* Right Panel - Game Table */}
        <div className="game-table">
          {/* Dealer Hand */}
          <div className="hand dealer-hand">
            <h3>Dealer's Hand {dealerValue !== null && `(${dealerValue})`}</h3>
            <div className="cards">
              {dealerHand.map((card, index) => (
                <div
                  key={index}
                  className={`card ${card.hidden ? 'card-hidden' : ''}`}
                >
                  {card.hidden ? (
                    <div className="card-back">🂠</div>
                  ) : (
                    <>
                      <div className={`card-rank ${getCardColor(card)}`}>{card.rank}</div>
                      <div className={`card-suit ${getCardColor(card)}`}>{card.suit}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Player Hand */}
          <div className="hand player-hand">
            <h3>Your Hand ({playerValue})</h3>
            <div className="cards">
              {playerHand.map((card, index) => (
                <div key={index} className="card">
                  <div className={`card-rank ${getCardColor(card)}`}>{card.rank}</div>
                  <div className={`card-suit ${getCardColor(card)}`}>{card.suit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Controls */}
          {gameState === 'playing' && (
            <div className="game-controls">
              <button className="action-button hit-button" onClick={hit} disabled={loading}>
                {loading ? '...' : 'Hit'}
              </button>
              <button className="action-button stand-button" onClick={stand} disabled={loading}>
                {loading ? '...' : 'Stand'}
              </button>
            </div>
          )}

          {gameState === 'finished' && (
            <div className="game-result">
              <p className="result-message">{message}</p>
              <button className="play-again-button" onClick={resetGame}>
                Play Again
              </button>
            </div>
          )}

          {message && gameState !== 'finished' && (
            <p className="game-message">{message}</p>
          )}

          {gameState === 'betting' && (
            <div className="waiting-message">
              <p>Place your bet to start the game</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
