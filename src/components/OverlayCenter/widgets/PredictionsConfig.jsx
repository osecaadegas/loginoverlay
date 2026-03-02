/**
 * PredictionsConfig.jsx — Streamer control panel for Predictions game.
 * Set question, two outcomes, open/close/lock/resolve predictions.
 */
import React, { useState } from 'react';

export default function PredictionsConfig({ config, onChange }) {
  const c = config || {};
  const set = (k, v) => onChange({ ...c, [k]: v });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [tab, setTab] = useState('game');

  const status = c.gameStatus || 'idle';
  const betsA = c.betsA || 0;
  const betsB = c.betsB || 0;
  const total = betsA + betsB;
  const history = c.predHistory || [];

  /* ── Game actions ── */
  const openPrediction = () => setMulti({
    gameStatus: 'open', winner: null, betsA: 0, betsB: 0,
    _openedAt: Date.now(),
  });
  const lockPrediction = () => set('gameStatus', 'locked');
  const resolveA = () => {
    const entry = {
      question: c.question || 'Prediction',
      winner: c.optionA || 'Option A',
      pool: total,
      time: new Date().toLocaleTimeString(),
    };
    setMulti({
      gameStatus: 'result',
      winner: 'a',
      predHistory: [entry, ...history].slice(0, 20),
    });
  };
  const resolveB = () => {
    const entry = {
      question: c.question || 'Prediction',
      winner: c.optionB || 'Option B',
      pool: total,
      time: new Date().toLocaleTimeString(),
    };
    setMulti({
      gameStatus: 'result',
      winner: 'b',
      predHistory: [entry, ...history].slice(0, 20),
    });
  };
  const resetGame = () => setMulti({
    gameStatus: 'idle', winner: null, betsA: 0, betsB: 0, _openedAt: null,
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
            <span>Question</span>
            <input value={c.question || ''} onChange={e => set('question', e.target.value)} placeholder="Will I hit a bonus?" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label className="cg-config__field">
              <span>Option A</span>
              <input value={c.optionA || ''} onChange={e => set('optionA', e.target.value)} placeholder="Yes" />
            </label>
            <label className="cg-config__field">
              <span>Option B</span>
              <input value={c.optionB || ''} onChange={e => set('optionB', e.target.value)} placeholder="No" />
            </label>
          </div>

          <label className="cg-config__field">
            <span>Timer (seconds, 0 = no timer)</span>
            <input type="number" value={c.timerSeconds || 0} onChange={e => set('timerSeconds', parseInt(e.target.value) || 0)} min={0} />
          </label>

          <div className="cg-config__status-card">
            <div className="cg-config__status-row">
              <span className="cg-config__status-label">Status</span>
              <span className={`cg-config__status-badge cg-config__status-badge--${status}`}>
                {status === 'idle' ? '⏸ Idle' : status === 'open' ? '🟢 Open' : status === 'locked' ? '🔒 Locked' : '🏆 Result'}
              </span>
            </div>
            {(status !== 'idle') && (
              <>
                <div className="cg-config__status-row">
                  <span style={{ color: c.colorA || '#3b82f6' }}>{c.optionA || 'A'}</span>
                  <span style={{ fontWeight: 700 }}>{betsA.toLocaleString()} pts</span>
                </div>
                <div className="cg-config__status-row">
                  <span style={{ color: c.colorB || '#ef4444' }}>{c.optionB || 'B'}</span>
                  <span style={{ fontWeight: 700 }}>{betsB.toLocaleString()} pts</span>
                </div>
                <div className="cg-config__status-row">
                  <span>Total Pool</span>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>{total.toLocaleString()} pts</span>
                </div>
              </>
            )}
          </div>

          <div className="cg-config__actions">
            {status === 'idle' && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={openPrediction}
                disabled={!c.question || !c.optionA || !c.optionB}>
                🟢 Open Prediction
              </button>
            )}
            {status === 'open' && (
              <>
                <button className="cg-config__btn cg-config__btn--accent" onClick={lockPrediction}>
                  🔒 Lock Bets
                </button>
                <button className="cg-config__btn cg-config__btn--muted" onClick={resetGame}>
                  ⏸ Cancel
                </button>
              </>
            )}
            {status === 'locked' && (
              <>
                <p className="cg-config__hint">Pick the winner:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="cg-config__btn cg-config__btn--primary" onClick={resolveA}
                    style={{ background: c.colorA || '#3b82f6' }}>
                    👑 {c.optionA || 'A'} Wins
                  </button>
                  <button className="cg-config__btn cg-config__btn--primary" onClick={resolveB}
                    style={{ background: c.colorB || '#ef4444' }}>
                    👑 {c.optionB || 'B'} Wins
                  </button>
                </div>
                <button className="cg-config__btn cg-config__btn--muted" onClick={resetGame}>
                  🗑️ Cancel & Refund
                </button>
              </>
            )}
            {status === 'result' && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={resetGame}>
                🔄 New Prediction
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ STYLE TAB ═══ */}
      {tab === 'style' && (
        <div className="cg-config__section">
          <div className="cg-config__color-row">
            <label className="cg-config__color">
              <span>Accent</span>
              <input type="color" value={c.accentColor || '#7c3aed'} onChange={e => set('accentColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Option A</span>
              <input type="color" value={c.colorA || '#3b82f6'} onChange={e => set('colorA', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Option B</span>
              <input type="color" value={c.colorB || '#ef4444'} onChange={e => set('colorB', e.target.value)} />
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
            <p className="cg-config__hint">No predictions yet.</p>
          ) : (
            <div className="cg-config__history">
              {history.map((h, i) => (
                <div key={i} className="cg-config__history-row">
                  <span style={{ flex: 1, fontSize: '0.82rem' }}>{h.question}</span>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>👑 {h.winner}</span>
                  <span className="cg-config__history-pool">{h.pool?.toLocaleString() || 0} pts</span>
                  <span className="cg-config__history-time">{h.time}</span>
                </div>
              ))}
            </div>
          )}
          {history.length > 0 && (
            <button className="cg-config__btn cg-config__btn--muted" onClick={() => set('predHistory', [])}>
              🗑️ Clear History
            </button>
          )}
        </div>
      )}
    </div>
  );
}
