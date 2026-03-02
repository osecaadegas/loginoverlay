/**
 * CoinFlipConfig.jsx — Streamer control panel for the Coin Flip community game.
 * Start/stop bets, flip the coin, view participants, customize appearance.
 */
import React, { useState } from 'react';

export default function CoinFlipConfig({ config, onChange }) {
  const c = config || {};
  const set = (k, v) => onChange({ ...c, [k]: v });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [tab, setTab] = useState('game');

  const status = c.gameStatus || 'idle';
  const betsHeads = c.betsHeads || 0;
  const betsTails = c.betsTails || 0;
  const totalPool = betsHeads + betsTails;
  const history = c.flipHistory || [];

  /* ── Game actions ── */
  const openBets = () => setMulti({ gameStatus: 'open', result: null, betsHeads: 0, betsTails: 0, flipping: false, lastWinner: '', lastWinAmount: 0, _prevResult: c.result || 'heads' });
  const closeBets = () => set('gameStatus', 'idle');

  const flipCoin = () => {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    setMulti({
      gameStatus: 'flipping',
      flipping: true,
      _flipStart: Date.now(),
      _prevResult: c.result || 'heads',
    });
    // After animation, reveal result
    setTimeout(() => {
      const newEntry = {
        result,
        time: new Date().toLocaleTimeString(),
        pool: totalPool,
      };
      setMulti({
        result,
        flipping: false,
        gameStatus: 'result',
        flipHistory: [newEntry, ...history].slice(0, 20),
      });
    }, 2500);
  };

  const resetGame = () => setMulti({
    gameStatus: 'idle', result: null, flipping: false,
    betsHeads: 0, betsTails: 0, lastWinner: '', lastWinAmount: 0,
  });

  const tabs = [
    { id: 'game', label: '🎮 Game' },
    { id: 'style', label: '🎨 Style' },
    { id: 'history', label: '📜 History' },
  ];

  return (
    <div className="cg-config">
      <div className="cg-config__tabs">
        {tabs.map(t => (
          <button key={t.id}
            className={`cg-config__tab ${tab === t.id ? 'cg-config__tab--active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ GAME TAB ═══ */}
      {tab === 'game' && (
        <div className="cg-config__section">
          <label className="cg-config__field">
            <span>Game Title</span>
            <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Coin Flip!" />
          </label>

          {/* Status display */}
          <div className="cg-config__status-card">
            <div className="cg-config__status-row">
              <span className="cg-config__status-label">Status</span>
              <span className={`cg-config__status-badge cg-config__status-badge--${status}`}>
                {status === 'idle' ? '⏸ Idle' : status === 'open' ? '🟢 Bets Open' : status === 'flipping' ? '🪙 Flipping' : '🏆 Result'}
              </span>
            </div>
            {(status === 'open' || status === 'result') && (
              <>
                <div className="cg-config__status-row">
                  <span>Heads Pool</span>
                  <span style={{ color: '#facc15', fontWeight: 700 }}>{betsHeads.toLocaleString()} pts</span>
                </div>
                <div className="cg-config__status-row">
                  <span>Tails Pool</span>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>{betsTails.toLocaleString()} pts</span>
                </div>
                <div className="cg-config__status-row">
                  <span>Total Pool</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{totalPool.toLocaleString()} pts</span>
                </div>
              </>
            )}
          </div>

          {/* Game controls */}
          <div className="cg-config__actions">
            {status === 'idle' && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={openBets}>
                🟢 Open Bets
              </button>
            )}
            {status === 'open' && (
              <>
                <button className="cg-config__btn cg-config__btn--accent" onClick={flipCoin}>
                  🪙 Flip Coin
                </button>
                <button className="cg-config__btn cg-config__btn--muted" onClick={closeBets}>
                  ⏸ Cancel
                </button>
              </>
            )}
            {(status === 'result' || status === 'flipping') && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={resetGame}>
                🔄 New Round
              </button>
            )}
          </div>

          <label className="cg-config__field">
            <span>Min Bet</span>
            <input type="number" value={c.minBet || 10} onChange={e => set('minBet', parseInt(e.target.value) || 10)} />
          </label>
          <label className="cg-config__field">
            <span>Max Bet</span>
            <input type="number" value={c.maxBet || 10000} onChange={e => set('maxBet', parseInt(e.target.value) || 10000)} />
          </label>
          <label className="cg-config__field">
            <span>Heads Label</span>
            <input value={c.headsLabel || 'HEADS'} onChange={e => set('headsLabel', e.target.value)} />
          </label>
          <label className="cg-config__field">
            <span>Tails Label</span>
            <input value={c.tailsLabel || 'TAILS'} onChange={e => set('tailsLabel', e.target.value)} />
          </label>
        </div>
      )}

      {/* ═══ STYLE TAB ═══ */}
      {tab === 'style' && (
        <div className="cg-config__section">
          <div className="cg-config__color-row">
            <label className="cg-config__color">
              <span>Heads Color</span>
              <input type="color" value={c.headsColor || '#facc15'} onChange={e => set('headsColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Tails Color</span>
              <input type="color" value={c.tailsColor || '#60a5fa'} onChange={e => set('tailsColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Accent</span>
              <input type="color" value={c.accentColor || '#f59e0b'} onChange={e => set('accentColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Text</span>
              <input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} />
            </label>
          </div>
          <label className="cg-config__field">
            <span>Heads Image URL (optional)</span>
            <input value={c.headsImage || ''} onChange={e => set('headsImage', e.target.value)} placeholder="https://..." />
          </label>
          <label className="cg-config__field">
            <span>Tails Image URL (optional)</span>
            <input value={c.tailsImage || ''} onChange={e => set('tailsImage', e.target.value)} placeholder="https://..." />
          </label>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <div className="cg-config__section">
          {history.length === 0 ? (
            <p className="cg-config__hint">No flips yet. Start a game to see history here.</p>
          ) : (
            <div className="cg-config__history">
              {history.map((h, i) => (
                <div key={i} className="cg-config__history-row">
                  <span className={`cg-config__history-result cg-config__history-result--${h.result}`}>
                    {h.result === 'heads' ? '🪙 H' : '🪙 T'}
                  </span>
                  <span className="cg-config__history-pool">{h.pool?.toLocaleString() || 0} pts</span>
                  <span className="cg-config__history-time">{h.time}</span>
                </div>
              ))}
            </div>
          )}
          {history.length > 0 && (
            <button className="cg-config__btn cg-config__btn--muted" onClick={() => set('flipHistory', [])}>
              🗑️ Clear History
            </button>
          )}
        </div>
      )}
    </div>
  );
}
