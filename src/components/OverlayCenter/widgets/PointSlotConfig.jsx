/**
 * PointSlotConfig.jsx — Streamer control panel for the Point Slot community game.
 * Configure symbols, spin the reels, set bet amounts, view results.
 */
import React, { useState } from 'react';

const DEFAULT_SYM = ['🍒','🍋','🍊','🍇','⭐','💎','7️⃣','🔔'];

export default function PointSlotConfig({ config, onChange }) {
  const c = config || {};
  const set = (k, v) => onChange({ ...c, [k]: v });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [tab, setTab] = useState('game');

  const status = c.gameStatus || 'idle';
  const symbols = c.symbols || DEFAULT_SYM;
  const history = c.spinHistory || [];

  /* ── Game actions ── */
  const openBets = () => setMulti({ gameStatus: 'open', results: [], spinning: false, lastWin: false });

  const spinReels = () => {
    const reelCount = c.reelCount || 3;
    const syms = c.symbols || DEFAULT_SYM;
    const results = Array.from({ length: reelCount }, () => syms[Math.floor(Math.random() * syms.length)]);
    const isWin = results.every(s => s === results[0]);

    setMulti({
      gameStatus: 'spinning',
      spinning: true,
      _spinStart: Date.now(),
    });

    setTimeout(() => {
      const entry = {
        results: [...results],
        time: new Date().toLocaleTimeString(),
        win: isWin,
      };
      setMulti({
        results,
        spinning: false,
        lastWin: isWin,
        gameStatus: 'result',
        spinHistory: [entry, ...history].slice(0, 20),
      });
    }, 3000);
  };

  const resetGame = () => setMulti({
    gameStatus: 'idle', results: [], spinning: false, lastWin: false,
  });

  /* ── Symbol editing ── */
  const [newSymbol, setNewSymbol] = useState('');
  const addSymbol = () => {
    const s = newSymbol.trim();
    if (s && !symbols.includes(s)) {
      set('symbols', [...symbols, s]);
      setNewSymbol('');
    }
  };
  const removeSymbol = (idx) => {
    if (symbols.length <= 3) return;
    set('symbols', symbols.filter((_, i) => i !== idx));
  };

  const tabs = [
    { id: 'game', label: '🎮 Game' },
    { id: 'symbols', label: '🎰 Symbols' },
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
            <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Point Slot" />
          </label>

          <div className="cg-config__status-card">
            <div className="cg-config__status-row">
              <span className="cg-config__status-label">Status</span>
              <span className={`cg-config__status-badge cg-config__status-badge--${status}`}>
                {status === 'idle' ? '⏸ Idle' : status === 'open' ? '🟢 Bets Open' : status === 'spinning' ? '🎰 Spinning' : '🏆 Result'}
              </span>
            </div>
            {c.results && c.results.length > 0 && (
              <div className="cg-config__status-row">
                <span>Last Result</span>
                <span style={{ fontSize: '1.2rem' }}>{c.results.join(' ')}</span>
              </div>
            )}
          </div>

          <div className="cg-config__actions">
            {status === 'idle' && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={openBets}>
                🟢 Open Bets
              </button>
            )}
            {status === 'open' && (
              <>
                <button className="cg-config__btn cg-config__btn--accent" onClick={spinReels}>
                  🎰 Spin!
                </button>
                <button className="cg-config__btn cg-config__btn--muted" onClick={resetGame}>
                  ⏸ Cancel
                </button>
              </>
            )}
            {(status === 'result' || status === 'spinning') && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={resetGame}>
                🔄 New Round
              </button>
            )}
          </div>

          <label className="cg-config__field">
            <span>Number of Reels</span>
            <select value={c.reelCount || 3} onChange={e => set('reelCount', parseInt(e.target.value))}>
              <option value={3}>3 Reels</option>
              <option value={4}>4 Reels</option>
              <option value={5}>5 Reels</option>
            </select>
          </label>

          <label className="cg-config__field">
            <span>Bet Per Spin</span>
            <input type="number" value={c.betAmount || 100} onChange={e => set('betAmount', parseInt(e.target.value) || 100)} />
          </label>
          <label className="cg-config__field">
            <span>Win Multiplier (all match)</span>
            <input type="number" value={c.winMultiplier || 10} onChange={e => set('winMultiplier', parseFloat(e.target.value) || 10)} />
          </label>
        </div>
      )}

      {/* ═══ SYMBOLS TAB ═══ */}
      {tab === 'symbols' && (
        <div className="cg-config__section">
          <p className="cg-config__hint">Customize the symbols on the reels. Minimum 3 symbols.</p>
          <div className="cg-config__symbol-grid">
            {symbols.map((s, i) => (
              <div key={i} className="cg-config__symbol-chip">
                <span style={{ fontSize: '1.3rem' }}>{s}</span>
                {symbols.length > 3 && (
                  <button className="cg-config__symbol-remove" onClick={() => removeSymbol(i)}>✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="cg-config__add-row">
            <input value={newSymbol} onChange={e => setNewSymbol(e.target.value)} placeholder="Emoji or text" maxLength={4}
              onKeyDown={e => e.key === 'Enter' && addSymbol()} />
            <button className="cg-config__btn cg-config__btn--primary" onClick={addSymbol} disabled={!newSymbol.trim()}>
              + Add
            </button>
          </div>
          <button className="cg-config__btn cg-config__btn--muted" style={{ marginTop: 8 }}
            onClick={() => set('symbols', [...DEFAULT_SYM])}>
            🔄 Reset to Default
          </button>
        </div>
      )}

      {/* ═══ STYLE TAB ═══ */}
      {tab === 'style' && (
        <div className="cg-config__section">
          <div className="cg-config__color-row">
            <label className="cg-config__color">
              <span>Accent</span>
              <input type="color" value={c.accentColor || '#f59e0b'} onChange={e => set('accentColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Machine</span>
              <input type="color" value={c.machineColor || '#dc2626'} onChange={e => set('machineColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Reel Bg</span>
              <input type="color" value={c.reelBg || '#1a1a2e'} onChange={e => set('reelBg', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Text</span>
              <input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} />
            </label>
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <div className="cg-config__section">
          {history.length === 0 ? (
            <p className="cg-config__hint">No spins yet.</p>
          ) : (
            <div className="cg-config__history">
              {history.map((h, i) => (
                <div key={i} className="cg-config__history-row">
                  <span style={{ fontSize: '1.1rem' }}>{h.results?.join(' ')}</span>
                  <span className={h.win ? 'cg-config__history-win' : 'cg-config__history-loss'}>
                    {h.win ? '🏆 WIN' : '❌'}
                  </span>
                  <span className="cg-config__history-time">{h.time}</span>
                </div>
              ))}
            </div>
          )}
          {history.length > 0 && (
            <button className="cg-config__btn cg-config__btn--muted" onClick={() => set('spinHistory', [])}>
              🗑️ Clear History
            </button>
          )}
        </div>
      )}
    </div>
  );
}
