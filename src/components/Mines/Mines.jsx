import { useState } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { supabase } from '../../config/supabaseClient';
import './Mines.css';

const GRID_SIZE = 25;
const MINE_OPTIONS = [1, 3, 5, 10, 15];

// API base URL - uses relative path for Vercel
const API_URL = '/api/mines';

export default function Mines() {
  const { points, isConnected, updateUserPoints } = useStreamElements();
  const [bet, setBet] = useState(50);
  const [mines, setMines] = useState(3);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [revealed, setRevealed] = useState([]);
  const [mineLocations, setMineLocations] = useState([]); // Only set after game ends
  const [multiplier, setMultiplier] = useState(1.0);
  const [profit, setProfit] = useState(0);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const startNewGame = async () => {
    if (!isConnected) {
      alert('Connect StreamElements first!');
      return;
    }
    if (bet > points || bet < 10) {
      alert('Invalid bet amount!');
      return;
    }

    setLoading(true);
    try {
      // Deduct bet first
      await updateUserPoints(-bet);
      
      // Start game on server (mine positions generated server-side)
      const data = await apiCall('start', { bet, mineCount: mines });
      
      if (data.success) {
        setGameId(data.game.id);
        setRevealed([]);
        setMineLocations([]); // We don't know mine positions!
        setGameActive(true);
        setGameOver(false);
        setWon(false);
        setMultiplier(1.0);
        setProfit(0);
      }
    } catch (error) {
      console.error('Start game error:', error);
      // Refund bet if game failed to start
      await updateUserPoints(bet);
      alert('Failed to start game: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clickCell = async (cellIndex) => {
    if (!gameActive || revealed.includes(cellIndex) || loading) return;

    setLoading(true);
    try {
      // Send click to server for validation
      const data = await apiCall('reveal', { gameId, cellIndex });
      
      if (data.success) {
        setRevealed(data.revealedCells);
        
        if (data.result === 'mine') {
          // Hit a mine - game over
          setMineLocations(data.minePositions); // Server reveals positions now
          setGameActive(false);
          setGameOver(true);
          setWon(false);
        } else if (data.gameOver && data.won) {
          // Found all safe cells - auto win
          setMineLocations(data.minePositions);
          setMultiplier(data.multiplier);
          setProfit(data.profit);
          await updateUserPoints(data.profit);
          setGameActive(false);
          setGameOver(true);
          setWon(true);
        } else {
          // Safe cell, game continues
          setMultiplier(data.multiplier);
          setProfit(data.profit);
        }
      }
    } catch (error) {
      console.error('Reveal error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cashout = async () => {
    if (!gameActive || revealed.length === 0 || loading) return;
    
    setLoading(true);
    try {
      const data = await apiCall('cashout', { gameId });
      
      if (data.success) {
        setMineLocations(data.minePositions); // Reveal positions after cashout
        setProfit(data.profit);
        await updateUserPoints(data.profit);
        setGameActive(false);
        setGameOver(true);
        setWon(true);
      }
    } catch (error) {
      console.error('Cashout error:', error);
      alert('Cashout failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const playAgain = () => {
    setGameId(null);
    setGameActive(false);
    setGameOver(false);
    setRevealed([]);
    setMineLocations([]);
    setMultiplier(1.0);
    setProfit(0);
  };

  return (
    <div className="mines-page">
      <div className="mines-header">
        <h1>💣 Mines</h1>
        <div className="balance-display">
          <span>Balance:</span>
          <strong>{points} pts</strong>
        </div>
      </div>

      {!isConnected && (
        <div className="alert-box">
          ⚠️ Connect StreamElements to play
        </div>
      )}

      <div className="mines-layout">
        {/* Controls */}
        <div className="controls-panel">
          {!gameActive && !gameOver && (
            <div className="setup-controls">
              <div className="control-group">
                <label>Bet Amount</label>
                <div className="bet-controls">
                  <button onClick={() => setBet(Math.max(10, bet / 2))}>½</button>
                  <input
                    type="number"
                    value={bet}
                    onChange={(e) => setBet(Math.min(200, Math.max(10, parseInt(e.target.value) || 10)))}
                  />
                  <button onClick={() => setBet(Math.min(200, Math.min(points, bet * 2)))}>2×</button>
                </div>
                <div className="quick-bets">
                  <button onClick={() => setBet(25)}>25</button>
                  <button onClick={() => setBet(50)}>50</button>
                  <button onClick={() => setBet(100)}>100</button>
                  <button onClick={() => setBet(200)}>200</button>
                </div>
              </div>

              <div className="control-group">
                <label>Mines: {mines}</label>
                <div className="mine-select">
                  {MINE_OPTIONS.map(num => (
                    <button
                      key={num}
                      className={mines === num ? 'active' : ''}
                      onClick={() => setMines(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn-start"
                onClick={startNewGame}
                disabled={!isConnected || bet > points || loading}
              >
                {loading ? 'Starting...' : `Start Game (${bet} pts)`}
              </button>
            </div>
          )}

          {gameActive && (
            <div className="game-stats">
              <div className="stat">
                <span>Bet:</span>
                <strong>{bet} pts</strong>
              </div>
              <div className="stat">
                <span>Mines:</span>
                <strong>{mines}</strong>
              </div>
              <div className="stat">
                <span>Found:</span>
                <strong>{revealed.length}/{GRID_SIZE - mines}</strong>
              </div>

              <div className="multiplier-display">
                <div className="mult-label">Multiplier</div>
                <div className="mult-value">{multiplier.toFixed(2)}×</div>
                <div className="profit-value">Win: {profit} pts</div>
              </div>

              <button
                className="btn-cashout"
                onClick={cashout}
                disabled={revealed.length === 0 || loading}
              >
                {loading ? 'Processing...' : `Cash Out (${profit} pts)`}
              </button>
            </div>
          )}

          {gameOver && (
            <div className="result-display">
              <div className={`result-box ${won ? 'won' : 'lost'}`}>
                <div className="result-icon">{won ? '🎉' : '💥'}</div>
                <div className="result-text">{won ? 'You Won!' : 'Mine Hit!'}</div>
                <div className="result-amount">
                  {won ? `+${profit - bet} pts` : `-${bet} pts`}
                </div>
              </div>
              <button className="btn-play-again" onClick={playAgain}>
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid-panel">
          <div className="mines-grid">
            {Array.from({ length: GRID_SIZE }, (_, i) => {
              const isRevealed = revealed.includes(i);
              const isMine = mineLocations.includes(i);
              const showMine = isMine && gameOver;
              const isSafe = isRevealed && !isMine;

              let cellClass = 'cell';
              if (!gameActive && !gameOver) {
                cellClass += ' idle';
              } else if (gameActive && !isRevealed) {
                cellClass += ' hidden';
              } else if (isSafe) {
                cellClass += ' safe';
              } else if (showMine) {
                cellClass += ' mine';
              }

              return (
                <button
                  key={i}
                  className={cellClass}
                  onClick={() => clickCell(i)}
                  disabled={!gameActive || isRevealed || loading}
                  style={{
                    minHeight: '80px',
                    minWidth: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {(!gameActive && !gameOver) && <span>💎</span>}
                  {(gameActive && !isRevealed) && <span style={{fontSize: '2rem'}}>💎</span>}
                  {isSafe && <span style={{fontSize: '2rem'}}>💎</span>}
                  {showMine && <span style={{fontSize: '2rem'}}>💣</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
