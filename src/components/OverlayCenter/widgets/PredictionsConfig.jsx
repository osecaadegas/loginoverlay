/**
 * PredictionsConfig.jsx — Streamer control panel for BH Predictions.
 * Configure bracket options, open/lock/resolve predictions, manage SE-point bets.
 */
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import TabBar from './shared/TabBar';

const DEFAULT_OPTIONS = [
  { label: '0 - 299 - !bet 1' },
  { label: '300 - 399 - !bet 2' },
  { label: '400 - 499 - !bet 3' },
  { label: '500 - 599 - !bet 4' },
  { label: '600 - 699 - !bet 5' },
  { label: '700 - 799 - !bet 6' },
  { label: '800 - 899 - !bet 7' },
  { label: '900 + - !bet 8' },
];

/** Fire-and-forget SE bot chat message */
function seBotAnnounce(userId, message) {
  if (!userId || !message) return;
  fetch(`${window.location.origin}/api/chat-commands?cmd=pred-say&user_id=${encodeURIComponent(userId)}&message=${encodeURIComponent(message)}`)
    .catch(err => console.error('[PredSay]', err));
}

export default function PredictionsConfig({ config, onChange }) {
  const { user } = useAuth();
  const userId = user?.id;
  const c = config || {};
  const set = (k, v) => onChange({ ...c, [k]: v });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [tab, setTab] = useState('game');

  const status = c.gameStatus || 'idle';
  const gridLayout = c.gridLayout || '4col';
  const options = c.options || DEFAULT_OPTIONS;
  const bets = c.bets || {};
  const betters = c.betters || {};
  const totalPool = options.reduce((sum, _, i) => sum + (bets[`opt_${i}`] || 0), 0);
  const totalBetters = Object.keys(betters).length;
  const history = c.predHistory || [];

  /* ── Game actions ── */
  const cmdTrigger = c.commandTrigger || '!bet';

  const openPrediction = () => {
    const opts = options.length > 0 ? options : DEFAULT_OPTIONS;
    setMulti({
      gameStatus: 'open',
      winnerOption: null,
      bets: {},
      betters: {},
      _openedAt: Date.now(),
      options: opts,
    });
    // Build SE announce message
    const bracketList = opts.map((o, i) => `${o.label.replace(/\s*-\s*!bet\s*\d+$/i, '')} → ${cmdTrigger} ${i + 1}`).join(' | ');
    seBotAnnounce(userId, `🔮 PREDICTION OPEN: ${c.question || 'Prediction'} — ${bracketList} — Type ${cmdTrigger} <number> <amount> to bet!`);
  };

  const lockPrediction = () => {
    set('gameStatus', 'locked');
    seBotAnnounce(userId, `🔒 BETS LOCKED! ${totalBetters} bets in the pool (${totalPool.toLocaleString()} pts). Good luck!`);
  };

  const resolveWinner = (idx) => {
    const winLabel = (options[idx]?.label || `Option ${idx + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, '');
    const entry = {
      question: c.question || 'Prediction',
      winner: winLabel,
      pool: totalPool,
      betters: totalBetters,
      time: new Date().toLocaleTimeString(),
    };
    setMulti({
      gameStatus: 'result',
      winnerOption: idx,
      predHistory: [entry, ...history].slice(0, 20),
    });
    seBotAnnounce(userId, `🏆 RESULT: ${winLabel} wins! Pool: ${totalPool.toLocaleString()} pts from ${totalBetters} bets.`);
  };

  const resetGame = () => setMulti({
    gameStatus: 'idle',
    winnerOption: null,
    bets: {},
    betters: {},
    _openedAt: null,
  });

  /* ── Options management ── */
  const addOption = () => set('options', [...options, { label: `Option ${options.length + 1}` }]);
  const removeOption = (idx) => set('options', options.filter((_, i) => i !== idx));
  const updateOption = (idx, label) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], label };
    set('options', updated);
  };
  const loadDefaults = () => set('options', DEFAULT_OPTIONS);

  const tabs = [
    { id: 'game', label: '🎮 Game' },
    { id: 'options', label: '📋 Options' },
    { id: 'style', label: '🎨 Style' },
    { id: 'history', label: '📜 History' },
  ];

  return (
    <div className="cg-config">
      <TabBar tabs={tabs} active={tab} onChange={setTab} variant="cg" />

      {/* ═══ GAME TAB ═══ */}
      {tab === 'game' && (
        <div className="cg-config__section">
          <label className="cg-config__field">
            <span>Title / Question</span>
            <input value={c.question || ''} onChange={e => set('question', e.target.value)} placeholder="Total do Bónus Hunt?" />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label className="cg-config__field">
              <span>Fund Amount</span>
              <input type="number" value={c.fundAmount || 0} onChange={e => set('fundAmount', parseInt(e.target.value) || 0)} min={0} />
            </label>
            <label className="cg-config__field">
              <span>Currency</span>
              <input value={c.currency || '€'} onChange={e => set('currency', e.target.value)} placeholder="€" />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label className="cg-config__field">
              <span>Timer (seconds)</span>
              <input type="number" value={c.timerSeconds || 0} onChange={e => set('timerSeconds', parseInt(e.target.value) || 0)} min={0} />
            </label>
            <label className="cg-config__field">
              <span>Chat Command</span>
              <input value={c.commandTrigger || '!bet'} onChange={e => set('commandTrigger', e.target.value)} placeholder="!bet" />
            </label>
          </div>

          {/* Twitch channel */}
          <label className="cg-config__field">
            <span>Twitch Channel (leave empty for auto)</span>
            <input value={c.twitchChannel || ''} onChange={e => set('twitchChannel', e.target.value)} placeholder="auto-detect" />
          </label>

          {/* Status card */}
          <div className="cg-config__status-card">
            <div className="cg-config__status-row">
              <span className="cg-config__status-label">Status</span>
              <span className={`cg-config__status-badge cg-config__status-badge--${status}`}>
                {status === 'idle' ? '⏸ Idle' : status === 'open' ? '🟢 Open' : status === 'locked' ? '🔒 Locked' : '🏆 Result'}
              </span>
            </div>
            {status !== 'idle' && (
              <>
                <div className="cg-config__status-row">
                  <span>Total Pool</span>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>{totalPool.toLocaleString()} pts</span>
                </div>
                <div className="cg-config__status-row">
                  <span>Total Bets</span>
                  <span style={{ fontWeight: 700 }}>{totalBetters}</span>
                </div>
                {options.map((opt, i) => {
                  const amt = bets[`opt_${i}`] || 0;
                  if (amt === 0) return null;
                  return (
                    <div key={i} className="cg-config__status-row" style={{ fontSize: '0.82rem' }}>
                      <span>{opt.label}</span>
                      <span style={{ fontWeight: 600 }}>{amt.toLocaleString()} pts</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="cg-config__actions">
            {status === 'idle' && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={openPrediction}
                disabled={options.length < 2}>
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
                <p className="cg-config__hint">Pick the winning bracket:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {options.map((opt, i) => (
                    <button key={i} className="cg-config__btn cg-config__btn--primary" onClick={() => resolveWinner(i)}
                      style={{ fontSize: '0.82rem', padding: '6px 10px' }}>
                      👑 {opt.label}
                    </button>
                  ))}
                </div>
                <button className="cg-config__btn cg-config__btn--muted" onClick={resetGame} style={{ marginTop: 6 }}>
                  🗑️ Cancel
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

      {/* ═══ OPTIONS TAB ═══ */}
      {tab === 'options' && (
        <div className="cg-config__section">
          <p className="cg-config__hint">Configure the betting brackets. Viewers use <code>!bet &lt;number&gt; &lt;amount&gt;</code></p>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color: '#9ca3af', fontSize: '0.82rem', minWidth: 20 }}>{i + 1}.</span>
              <input
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '6px 8px', color: '#e5e7eb', fontSize: '0.85rem' }}
                value={opt.label}
                onChange={e => updateOption(i, e.target.value)}
                disabled={status !== 'idle'}
              />
              {status === 'idle' && options.length > 2 && (
                <button onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}>✕</button>
              )}
            </div>
          ))}
          {status === 'idle' && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="cg-config__btn cg-config__btn--primary" onClick={addOption} style={{ fontSize: '0.82rem' }}>
                + Add Option
              </button>
              <button className="cg-config__btn cg-config__btn--muted" onClick={loadDefaults} style={{ fontSize: '0.82rem' }}>
                Load Defaults
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ STYLE TAB ═══ */}
      {tab === 'style' && (
        <div className="cg-config__section">
          <label className="cg-config__label">Grid Layout</label>
          <select className="cg-config__select" value={gridLayout} onChange={e => set('gridLayout', e.target.value)}>
            <option value="4col">4 Columns × 2 Rows</option>
            <option value="2col">2 Columns × 4 Rows</option>
          </select>
          <div className="cg-config__color-row" style={{ marginTop: 8 }}>
            <label className="cg-config__color">
              <span>Background</span>
              <input type="color" value={c.bgColor || '#1e3550'} onChange={e => set('bgColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Header</span>
              <input type="color" value={c.headerBg || '#2a4a6b'} onChange={e => set('headerBg', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Title</span>
              <input type="color" value={c.headerText || '#e8d48b'} onChange={e => set('headerText', e.target.value)} />
            </label>
          </div>
          <div className="cg-config__color-row">
            <label className="cg-config__color">
              <span>Bar BG</span>
              <input type="color" value={c.barBg || '#3a5a7a'} onChange={e => set('barBg', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Bar Fill</span>
              <input type="color" value={c.barFill || '#c4a44a'} onChange={e => set('barFill', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Text</span>
              <input type="color" value={c.textColor || '#c8d8e8'} onChange={e => set('textColor', e.target.value)} />
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
                  <span className="cg-config__history-pool">{h.pool?.toLocaleString() || 0} pts ({h.betters || 0} bets)</span>
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
