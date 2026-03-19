/**
 * Games Panel — Daily Wheel, Mines, Blackjack
 * Each game is self-contained with its own state
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getWheelPrizes, spinWheel, getPoints } from '../extApi';

/* ─── DAILY WHEEL ─── */
function WheelGame({ points, onRefreshPoints }) {
  const [prizes, setPrizes] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [cooldown, setCooldown] = useState(null);
  const [angle, setAngle] = useState(0);

  const loadPrizes = useCallback(async () => {
    try {
      const data = await getWheelPrizes();
      setPrizes(data.prizes || []);
      if (data.next_spin_at) {
        const next = new Date(data.next_spin_at).getTime();
        const diff = next - Date.now();
        setCooldown(diff > 0 ? diff : null);
      } else {
        setCooldown(null);
      }
    } catch (err) {
      console.error('Wheel load error:', err);
    }
  }, []);

  useEffect(() => {
    loadPrizes();
  }, [loadPrizes]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown === null || cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1000) {
          clearInterval(t);
          return null;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const fmtCooldown = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const doSpin = async () => {
    if (spinning || cooldown) return;
    setSpinning(true);
    setResult(null);
    try {
      const data = await spinWheel();
      // Animate: spin to the winning segment
      const idx = prizes.findIndex(p => p.id === data.prize?.id);
      const segAngle = 360 / (prizes.length || 1);
      const targetAngle = 360 * 5 + (360 - (idx * segAngle + segAngle / 2));
      setAngle(prev => prev + targetAngle);
      setTimeout(() => {
        setResult(data.prize);
        setSpinning(false);
        if (data.next_spin_at) {
          const diff = new Date(data.next_spin_at).getTime() - Date.now();
          setCooldown(diff > 0 ? diff : null);
        }
        onRefreshPoints?.();
      }, 3500);
    } catch (err) {
      setSpinning(false);
      if (err.message?.includes('cooldown')) {
        setCooldown(24 * 3600000);
        loadPrizes();
      }
    }
  };

  const colors = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
    '#3b82f6', '#a855f7', '#ec4899', '#14b8a6',
  ];

  return (
    <div className="ext-card" style={{ textAlign: 'center' }}>
      <div className="ext-section-title">🎡 Daily Wheel</div>

      {/* Mini wheel visual */}
      <div className="ext-wheel-container" style={{ margin: '10px auto' }}>
        <div
          className="ext-wheel"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: spinning ? 'transform 3.5s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
          }}
        >
          {prizes.length > 0 ? prizes.map((p, i) => {
            const seg = 360 / prizes.length;
            return (
              <div
                key={p.id}
                className="ext-wheel-segment"
                style={{
                  transform: `rotate(${i * seg}deg)`,
                  background: colors[i % colors.length],
                  clipPath: prizes.length > 1
                    ? `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan((seg * Math.PI) / 360)}% 0%)`
                    : 'circle(50%)',
                }}
              >
                <span className="ext-wheel-label" style={{
                  transform: `rotate(${seg / 2}deg)`,
                }}>
                  {p.label || p.amount}
                </span>
              </div>
            );
          }) : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 32,
            }}>🎡</div>
          )}
        </div>
        <div className="ext-wheel-pointer">▼</div>
      </div>

      {/* Result */}
      {result && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(34,197,94,0.1)',
          borderRadius: 8,
          margin: '8px 0',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--ext-success)',
        }}>
          🎉 {result.label || `+${result.amount} points`}
        </div>
      )}

      {/* Spin button */}
      <button
        className="ext-btn ext-btn-primary"
        disabled={spinning || cooldown}
        onClick={doSpin}
        style={{ width: '100%', marginTop: 6 }}
      >
        {spinning ? '🌀 Spinning...' : cooldown ? `⏳ ${fmtCooldown(cooldown)}` : '🎡 Spin the Wheel'}
      </button>
    </div>
  );
}

/* ─── MINES ─── */
function MinesGame({ points, onRefreshPoints }) {
  const GRID_SIZE = 5;
  const [mineCount, setMineCount] = useState(3);
  const [bet, setBet] = useState(10);
  const [game, setGame] = useState(null); // { grid, revealed, mines, gameOver, won, multiplier, cashOut }
  const [revealedCells, setRevealedCells] = useState(new Set());

  const startGame = () => {
    if (bet > points) return;
    // Build grid: place mines randomly
    const totalCells = GRID_SIZE * GRID_SIZE;
    const minePositions = new Set();
    while (minePositions.size < mineCount) {
      minePositions.add(Math.floor(Math.random() * totalCells));
    }
    setGame({
      minePositions,
      gameOver: false,
      won: false,
      mulitplier: 1,
      cashOutValue: 0,
      safeRevealed: 0,
    });
    setRevealedCells(new Set());
  };

  const getMultiplier = (safeCells) => {
    const totalCells = GRID_SIZE * GRID_SIZE;
    const safeTiles = totalCells - mineCount;
    let multi = 1;
    for (let i = 0; i < safeCells; i++) {
      multi *= (totalCells - i) / (safeTiles - i);
    }
    return Math.max(1, multi * 0.97); // 3% house edge
  };

  const revealCell = (idx) => {
    if (!game || game.gameOver || revealedCells.has(idx)) return;

    const nextRevealed = new Set(revealedCells);
    nextRevealed.add(idx);
    setRevealedCells(nextRevealed);

    if (game.minePositions.has(idx)) {
      // Hit mine — game over
      setGame(prev => ({
        ...prev,
        gameOver: true,
        won: false,
        safeRevealed: prev.safeRevealed,
      }));
    } else {
      const safeCount = game.safeRevealed + 1;
      setGame(prev => ({
        ...prev,
        safeRevealed: safeCount,
        cashOutValue: Math.floor(bet * getMultiplier(safeCount)),
      }));
    }
  };

  const cashOut = () => {
    if (!game || game.gameOver || game.safeRevealed === 0) return;
    setGame(prev => ({
      ...prev,
      gameOver: true,
      won: true,
    }));
    onRefreshPoints?.();
  };

  return (
    <div className="ext-card">
      <div className="ext-section-title">💣 Mines</div>

      {!game || game.gameOver ? (
        <div>
          {game?.gameOver && (
            <div style={{
              padding: '6px 8px',
              marginBottom: 8,
              borderRadius: 6,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 13,
              background: game.won
                ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: game.won
                ? 'var(--ext-success)' : 'var(--ext-danger)',
            }}>
              {game.won
                ? `💰 Cashed out: ${game.cashOutValue} pts (${getMultiplier(game.safeRevealed).toFixed(2)}x)`
                : `💥 BOOM! Lost ${bet} pts`}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="ext-label">Mines</label>
              <select
                className="ext-input"
                value={mineCount}
                onChange={e => setMineCount(Number(e.target.value))}
              >
                {[1, 2, 3, 5, 7, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n} mines</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="ext-label">Bet</label>
              <input
                type="number"
                className="ext-input"
                value={bet}
                onChange={e => setBet(Math.max(1, Number(e.target.value)))}
                min={1}
              />
            </div>
          </div>

          <button
            className="ext-btn ext-btn-primary"
            onClick={startGame}
            disabled={bet > points}
            style={{ width: '100%' }}
          >
            {bet > points ? 'Not enough points' : `💣 Start (${bet} pts)`}
          </button>
        </div>
      ) : (
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginBottom: 6,
            fontSize: 12, fontWeight: 600,
          }}>
            <span>Multi: {getMultiplier(game.safeRevealed).toFixed(2)}x</span>
            <span>Win: {game.cashOutValue} pts</span>
          </div>

          {/* Grid */}
          <div className="ext-mines-grid">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
              const isRevealed = revealedCells.has(i);
              const isMine = game.minePositions.has(i);
              const showMine = game.gameOver && isMine;

              return (
                <button
                  key={i}
                  className={`ext-mine-cell ${isRevealed ? (isMine ? 'mine' : 'safe') : ''} ${showMine ? 'mine' : ''}`}
                  onClick={() => revealCell(i)}
                  disabled={game.gameOver || isRevealed}
                >
                  {isRevealed && !isMine ? '💎' : showMine ? '💣' : ''}
                </button>
              );
            })}
          </div>

          {game.safeRevealed > 0 && !game.gameOver && (
            <button
              className="ext-btn ext-btn-success"
              onClick={cashOut}
              style={{ width: '100%', marginTop: 8 }}
            >
              💰 Cash Out ({game.cashOutValue} pts)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── BLACKJACK ─── */
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  // Shuffle with Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(rank) {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c.rank), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function CardDisplay({ card, hidden }) {
  if (hidden) return <div className="ext-bj-card hidden">?</div>;
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <div className={`ext-bj-card ${isRed ? 'red' : 'black'}`}>
      <span>{card.rank}</span>
      <span className="ext-bj-suit">{card.suit}</span>
    </div>
  );
}

function BlackjackGame({ points, onRefreshPoints }) {
  const [bet, setBet] = useState(10);
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [phase, setPhase] = useState('bet'); // bet | playing | dealer_turn | result
  const [result, setResult] = useState(null); // { text, payout }

  const deal = () => {
    if (bet > points) return;
    const d = createDeck();
    const p = [d.pop(), d.pop()];
    const dl = [d.pop(), d.pop()];
    setDeck(d);
    setPlayer(p);
    setDealer(dl);
    setResult(null);

    // Check blackjack
    if (handValue(p) === 21) {
      if (handValue(dl) === 21) {
        setResult({ text: 'Push — both Blackjack', payout: 0 });
        setPhase('result');
      } else {
        setResult({ text: 'Blackjack! 🎉', payout: Math.floor(bet * 1.5) });
        setPhase('result');
        onRefreshPoints?.();
      }
    } else {
      setPhase('playing');
    }
  };

  const hit = () => {
    const d = [...deck];
    const p = [...player, d.pop()];
    setDeck(d);
    setPlayer(p);
    if (handValue(p) > 21) {
      setResult({ text: 'Bust! 💥', payout: -bet });
      setPhase('result');
      onRefreshPoints?.();
    }
  };

  const stand = () => {
    setPhase('dealer_turn');
    const d = [...deck];
    const dl = [...dealer];
    while (handValue(dl) < 17) {
      dl.push(d.pop());
    }
    setDeck(d);
    setDealer(dl);

    const pv = handValue(player);
    const dv = handValue(dl);

    let res;
    if (dv > 21) {
      res = { text: 'Dealer busts! 🎉', payout: bet };
    } else if (pv > dv) {
      res = { text: 'You win! 🎉', payout: bet };
    } else if (pv < dv) {
      res = { text: 'Dealer wins', payout: -bet };
    } else {
      res = { text: 'Push', payout: 0 };
    }
    setResult(res);
    setPhase('result');
    onRefreshPoints?.();
  };

  const doubleDown = () => {
    if (bet * 2 > points) return;
    const d = [...deck];
    const p = [...player, d.pop()];
    setDeck(d);
    setPlayer(p);
    setBet(prev => prev * 2);

    if (handValue(p) > 21) {
      setResult({ text: 'Bust! 💥', payout: -(bet * 2) });
      setPhase('result');
      onRefreshPoints?.();
    } else {
      // Force stand after double
      setPhase('dealer_turn');
      const dl = [...dealer];
      while (handValue(dl) < 17) {
        dl.push(d.pop());
      }
      setDeck(d);
      setDealer(dl);

      const pv = handValue(p);
      const dv = handValue(dl);
      let res;
      if (dv > 21) {
        res = { text: 'Dealer busts! 🎉', payout: bet * 2 };
      } else if (pv > dv) {
        res = { text: 'You win! 🎉', payout: bet * 2 };
      } else if (pv < dv) {
        res = { text: 'Dealer wins', payout: -(bet * 2) };
      } else {
        res = { text: 'Push', payout: 0 };
      }
      setResult(res);
      setPhase('result');
      onRefreshPoints?.();
    }
  };

  const showDealerHole = phase === 'dealer_turn' || phase === 'result';

  return (
    <div className="ext-card">
      <div className="ext-section-title">🃏 Blackjack</div>

      {phase === 'bet' && (
        <div>
          <label className="ext-label">Bet</label>
          <input
            type="number"
            className="ext-input"
            value={bet}
            onChange={e => setBet(Math.max(1, Number(e.target.value)))}
            min={1}
          />
          <button
            className="ext-btn ext-btn-primary"
            onClick={deal}
            disabled={bet > points}
            style={{ width: '100%', marginTop: 6 }}
          >
            {bet > points ? 'Not enough points' : `🃏 Deal (${bet} pts)`}
          </button>
        </div>
      )}

      {phase !== 'bet' && (
        <div>
          {/* Dealer */}
          <div style={{ marginBottom: 8 }}>
            <div className="ext-label">
              Dealer {showDealerHole ? `(${handValue(dealer)})` : ''}
            </div>
            <div className="ext-bj-hand">
              {dealer.map((c, i) => (
                <CardDisplay key={i} card={c} hidden={i === 1 && !showDealerHole} />
              ))}
            </div>
          </div>

          {/* Player */}
          <div style={{ marginBottom: 8 }}>
            <div className="ext-label">You ({handValue(player)})</div>
            <div className="ext-bj-hand">
              {player.map((c, i) => <CardDisplay key={i} card={c} />)}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div style={{
              padding: '6px 8px',
              margin: '6px 0',
              borderRadius: 6,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 13,
              background: result.payout > 0
                ? 'rgba(34,197,94,0.1)' : result.payout < 0
                  ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
              color: result.payout > 0
                ? 'var(--ext-success)' : result.payout < 0
                  ? 'var(--ext-danger)' : 'var(--ext-text)',
            }}>
              {result.text} {result.payout > 0 ? `+${result.payout}` : result.payout < 0 ? result.payout : ''} pts
            </div>
          )}

          {/* Actions */}
          {phase === 'playing' && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="ext-btn ext-btn-primary" onClick={hit} style={{ flex: 1 }}>
                Hit
              </button>
              <button className="ext-btn ext-btn-success" onClick={stand} style={{ flex: 1 }}>
                Stand
              </button>
              {player.length === 2 && (
                <button
                  className="ext-btn ext-btn-ghost"
                  onClick={doubleDown}
                  disabled={bet * 2 > points}
                  style={{ flex: 1 }}
                >
                  2x
                </button>
              )}
            </div>
          )}

          {phase === 'result' && (
            <button
              className="ext-btn ext-btn-primary"
              onClick={() => { setPhase('bet'); setResult(null); }}
              style={{ width: '100%', marginTop: 4 }}
            >
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── MAIN GAMES PANEL ─── */
export default function GamesPanel({ points, onPointsChange }) {
  const [tab, setTab] = useState('wheel');

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {[
          { id: 'wheel', label: '🎡 Wheel' },
          { id: 'mines', label: '💣 Mines' },
          { id: 'blackjack', label: '🃏 BJ' },
        ].map(t => (
          <button
            key={t.id}
            className={`ext-btn ext-btn-sm ${tab === t.id ? 'ext-btn-primary' : 'ext-btn-ghost'}`}
            onClick={() => setTab(t.id)}
            style={{ flex: 1 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'wheel' && <WheelGame points={points} onRefreshPoints={onPointsChange} />}
      {tab === 'mines' && <MinesGame points={points} onRefreshPoints={onPointsChange} />}
      {tab === 'blackjack' && <BlackjackGame points={points} onRefreshPoints={onPointsChange} />}
    </div>
  );
}
