import { useState, useEffect } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { supabase } from '../../config/supabaseClient';
import './Mines.css';

const GRID_SIZE = 25;
const MINE_OPTIONS = [3, 5, 7, 10, 15, 20, 24]; // Minimum 3 mines for fair risk/reward

// API base URL - uses relative path for Vercel
const API_URL = '/api/mines';

export default function Mines() {
  const { points, isConnected, updateUserPoints } = useStreamElements();
  const [bet, setBet] = useState(50);
  const [mines, setMines] = useState(5);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [jackpot, setJackpot] = useState(false);
  const [revealed, setRevealed] = useState([]);
  const [mineLocations, setMineLocations] = useState([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [nextMultiplier, setNextMultiplier] = useState(null);
  const [profit, setProfit] = useState(0);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [safeCellsRemaining, setSafeCellsRemaining] = useState(0);
  const [maxMultiplier, setMaxMultiplier] = useState(0);
  const [checkingGame, setCheckingGame] = useState(true);
  const [stuckGame, setStuckGame] = useState(null);

  // Check for active game on mount
  useEffect(() => {
    const checkActiveGame = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCheckingGame(false);
          return;
        }

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ action: 'getActiveGame' })
        });

        const data = await response.json();
        
        if (data.success && data.hasActiveGame) {
          // Found an active game - let user resume or forfeit
          setStuckGame(data.game);
        }
      } catch (err) {
        console.error('Error checking active game:', err);
      } finally {
        setCheckingGame(false);
      }
    };

    checkActiveGame();
  }, []);

  // Resume a stuck game
  const resumeGame = () => {
    if (!stuckGame) return;
    
    setGameId(stuckGame.id);
    setBet(stuckGame.bet);
    setMines(stuckGame.mineCount);
    setRevealed(stuckGame.revealedCells || []);
    setMultiplier(stuckGame.multiplier || 1.0);
    setProfit(stuckGame.profit || 0);
    setSafeCellsRemaining(stuckGame.safeCellsRemaining);
    setGameActive(true);
    setGameOver(false);
    setStuckGame(null);
  };

  // Forfeit a stuck game
  const forfeitGame = async () => {
    if (!stuckGame) return;
    
    setLoading(true);
    try {
      await apiCall('forfeit', { gameId: stuckGame.id });
      setStuckGame(null);
    } catch (err) {
      console.error('Forfeit error:', err);
      alert('Failed to forfeit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

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

  // Calculate risk level for display
  const getRiskLevel = (mineCount) => {
    if (mineCount <= 5) return { label: 'Low', color: '#22c55e' };
    if (mineCount <= 10) return { label: 'Medium', color: '#eab308' };
    if (mineCount <= 15) return { label: 'High', color: '#f97316' };
    return { label: 'Extreme', color: '#ef4444' };
  };

  const risk = getRiskLevel(mines);

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
        setMineLocations([]);
        setGameActive(true);
        setGameOver(false);
        setWon(false);
        setJackpot(false);
        setMultiplier(1.0);
        setNextMultiplier(data.game.nextMultipliers?.[0] || null);
        setProfit(0);
        setSafeCellsRemaining(data.game.safeCellsRemaining);
        setMaxMultiplier(data.game.maxMultiplier);
      }
    } catch (error) {
      console.error('Start game error:', error);
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
      const data = await apiCall('reveal', { gameId, cellIndex });
      
      if (data.success) {
        setRevealed(data.revealedCells);
        
        if (data.result === 'mine') {
          setMineLocations(data.minePositions);
          setGameActive(false);
          setGameOver(true);
          setWon(false);
          setJackpot(false);
        } else if (data.gameOver && data.won) {
          setMineLocations(data.minePositions);
          setMultiplier(data.multiplier);
          setProfit(data.profit);
          setJackpot(data.jackpot || false);
          await updateUserPoints(data.profit);
          setGameActive(false);
          setGameOver(true);
          setWon(true);
          setSafeCellsRemaining(0);
        } else {
          setMultiplier(data.multiplier);
          setNextMultiplier(data.nextMultiplier);
          setProfit(data.profit);
          setSafeCellsRemaining(data.safeCellsRemaining);
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
        setMineLocations(data.minePositions);
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
    setNextMultiplier(null);
    setProfit(0);
    setJackpot(false);
    setSafeCellsRemaining(0);
  };

  // Show loading while checking for active game
  if (checkingGame) {
    return (
      <div className="mines-page">
        <div className="mines-header">
          <h1>💣 Mines</h1>
        </div>
        <div className="loading-check">
          <div className="spinner"></div>
          <p>Checking for active games...</p>
        </div>
      </div>
    );
  }

  // Show stuck game recovery modal
  if (stuckGame) {
    return (
      <div className="mines-page">
        <div className="mines-header">
          <h1>💣 Mines</h1>
          <div className="balance-display">
            <span>Balance:</span>
            <strong>{points} pts</strong>
          </div>
        </div>
        
        <div className="stuck-game-modal">
          <div className="stuck-game-content">
            <div className="stuck-icon">⚠️</div>
            <h2>Active Game Found!</h2>
            <p>You have an unfinished game in progress.</p>
            
            <div className="stuck-game-info">
              <div className="info-row">
                <span>Bet:</span>
                <strong>{stuckGame.bet} pts</strong>
              </div>
              <div className="info-row">
                <span>Mines:</span>
                <strong>{stuckGame.mineCount} 💣</strong>
              </div>
              <div className="info-row">
                <span>Cells Found:</span>
                <strong>{stuckGame.revealedCells?.length || 0} 💎</strong>
              </div>
              {stuckGame.profit > 0 && (
                <div className="info-row highlight">
                  <span>Current Value:</span>
                  <strong>{stuckGame.profit} pts ({stuckGame.multiplier?.toFixed(2)}×)</strong>
                </div>
              )}
            </div>

            <div className="stuck-game-actions">
              <button 
                className="btn-resume"
                onClick={resumeGame}
              >
                ▶️ Resume Game
              </button>
              
              {stuckGame.revealedCells?.length > 0 && stuckGame.profit > 0 && (
                <button 
                  className="btn-cashout-stuck"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const data = await apiCall('cashout', { gameId: stuckGame.id });
                      if (data.success) {
                        await updateUserPoints(data.profit);
                        setStuckGame(null);
                        alert(`Cashed out ${data.profit} pts!`);
                      }
                    } catch (err) {
                      alert('Cashout failed: ' + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  💵 Cash Out ({stuckGame.profit} pts)
                </button>
              )}
              
              <button 
                className="btn-forfeit"
                onClick={forfeitGame}
                disabled={loading}
              >
                ❌ Forfeit (Lose {stuckGame.bet} pts)
              </button>
            </div>
            
            <p className="stuck-note">
              If you resume, you can continue playing or cash out at any time.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                    onChange={(e) => setBet(Math.min(500, Math.max(10, parseInt(e.target.value) || 10)))}
                  />
                  <button onClick={() => setBet(Math.min(500, Math.min(points, bet * 2)))}>2×</button>
                </div>
                <div className="quick-bets">
                  <button onClick={() => setBet(25)}>25</button>
                  <button onClick={() => setBet(50)}>50</button>
                  <button onClick={() => setBet(100)}>100</button>
                  <button onClick={() => setBet(250)}>250</button>
                </div>
              </div>

              <div className="control-group">
                <label>
                  Mines: {mines} 
                  <span className="risk-badge" style={{ backgroundColor: risk.color }}>
                    {risk.label} Risk
                  </span>
                </label>
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
                <div className="risk-info">
                  <span>Safe cells: {GRID_SIZE - mines}</span>
                  <span>•</span>
                  <span>Max win: High multipliers!</span>
                </div>
              </div>

              <button
                className="btn-start"
                onClick={startNewGame}
                disabled={!isConnected || bet > points || loading}
              >
                {loading ? 'Starting...' : `Start Game (${bet} pts)`}
              </button>
              
              <div className="house-edge-info">
                🎲 Provably fair • 3% house edge
              </div>
            </div>
          )}

          {gameActive && (
            <div className="game-stats">
              <div className="stat-row">
                <div className="stat">
                  <span>Bet:</span>
                  <strong>{bet} pts</strong>
                </div>
                <div className="stat">
                  <span>Mines:</span>
                  <strong className="mines-count">{mines} 💣</strong>
                </div>
              </div>
              
              <div className="stat-row">
                <div className="stat">
                  <span>Found:</span>
                  <strong className="found-count">{revealed.length} 💎</strong>
                </div>
                <div className="stat">
                  <span>Remaining:</span>
                  <strong>{safeCellsRemaining}</strong>
                </div>
              </div>

              <div className="multiplier-display">
                <div className="mult-label">Current Multiplier</div>
                <div className="mult-value">{multiplier.toFixed(2)}×</div>
                {nextMultiplier && (
                  <div className="next-mult">
                    Next: <span>{nextMultiplier.toFixed(2)}×</span>
                  </div>
                )}
                <div className="profit-value">
                  💰 {profit} pts
                </div>
              </div>

              <button
                className="btn-cashout"
                onClick={cashout}
                disabled={revealed.length === 0 || loading}
              >
                {loading ? 'Processing...' : `💵 Cash Out (${profit} pts)`}
              </button>
              
              <div className="danger-warning">
                ⚠️ {mines} mines hidden • Choose carefully!
              </div>
            </div>
          )}

          {gameOver && (
            <div className="result-display">
              <div className={`result-box ${won ? (jackpot ? 'jackpot' : 'won') : 'lost'}`}>
                <div className="result-icon">
                  {jackpot ? '🏆' : won ? '🎉' : '💥'}
                </div>
                <div className="result-text">
                  {jackpot ? 'JACKPOT!' : won ? 'You Won!' : 'Mine Hit!'}
                </div>
                <div className="result-multiplier">
                  {won ? `${multiplier.toFixed(2)}×` : '0×'}
                </div>
                <div className="result-amount">
                  {won ? `+${profit - bet} pts profit` : `-${bet} pts`}
                </div>
              </div>
              <button className="btn-play-again" onClick={playAgain}>
                🎮 Play Again
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
              const isUnrevealedMine = isMine && gameOver && !isRevealed;

              let cellClass = 'cell';
              if (!gameActive && !gameOver) {
                cellClass += ' idle';
              } else if (gameActive && !isRevealed) {
                cellClass += ' hidden clickable';
              } else if (isSafe) {
                cellClass += ' safe';
              } else if (showMine) {
                cellClass += isRevealed ? ' mine exploded' : ' mine';
              }

              const canClick = gameActive && !isRevealed && !loading;

              return (
                <button
                  key={i}
                  className={cellClass}
                  onClick={() => canClick && clickCell(i)}
                  style={{ cursor: canClick ? 'pointer' : 'default' }}
                >
                  {(!gameActive && !gameOver) && <span className="cell-icon">❓</span>}
                  {(gameActive && !isRevealed) && <span className="cell-icon">💎</span>}
                  {isSafe && <span className="cell-icon safe-icon">💎</span>}
                  {showMine && <span className="cell-icon mine-icon">💣</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
