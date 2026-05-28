/**
 * BetsConfig.jsx — Admin control panel for the Bets widget.
 *
 * Tabs: 🎮 Game | 📋 Brackets | 💬 Chat | 🎨 Style | 📜 History
 * Follows the same pattern as PredictionsConfig + BonusHuntConfig.
 */
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import TabBar from './shared/TabBar';

// Hex colour presets per theme (applied when user selects a theme from the dropdown)
const THEME_PRESETS_CONFIG = {
  dark: {
    bgColor: '#0a0e14', headerBg: '#141a24', headerText: '#eef2f5',
    barBg: '#1c2330', barFill: '#6366f1', textColor: '#d4dce8', accentColor: '#b8c8d8',
  },
  grey: {
    bgColor: '#2a3040', headerBg: '#333b4d', headerText: '#f1f5f9',
    barBg: '#3a4254', barFill: '#6366f1', textColor: '#e2e8f0', accentColor: '#cbd5e1',
  },
  white: {
    bgColor: '#f8fafc', headerBg: '#f1f5f9', headerText: '#0f172a',
    barBg: '#e2e8f0', barFill: '#6366f1', textColor: '#334155', accentColor: '#475569',
  },
};

const DEFAULT_OPTIONS = [
  { label: '0 – 99' },
  { label: '100 – 199' },
  { label: '200 – 299' },
  { label: '300 – 399' },
  { label: '400 – 499' },
  { label: '500 – 599' },
  { label: '600 – 799' },
  { label: '800 – 999' },
  { label: '1000+' },
];

/** Fire-and-forget SE bot chat message */
function seBotAnnounce(userId, message) {
  if (!userId || !message) return;
  fetch(
    `${window.location.origin}/api/chat-commands?cmd=pred-say&user_id=${encodeURIComponent(userId)}&message=${encodeURIComponent(message)}`
  ).catch(err => console.error('[BetsSay]', err));
}

export default function BetsConfig({ config, onChange }) {
  const { user } = useAuth();
  const userId = user?.id;
  const c = config || {};
  const set    = (k, v) => onChange({ ...c, [k]: v });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [tab, setTab] = useState('game');

  // Apply a theme preset — resets all colour fields to the theme defaults
  const applyTheme = (theme) => {
    const preset = THEME_PRESETS_CONFIG[theme] || THEME_PRESETS_CONFIG.dark;
    onChange({ ...c, colorTheme: theme, ...preset });
  };

  const status      = c.gameStatus  || 'idle';
  const options     = c.options     || DEFAULT_OPTIONS;
  const bets        = c.bets        || {};
  const betters     = c.betters     || {};
  const history     = c.betsHistory || [];
  const chatCommand = c.chatCommand || '!bet';
  const totalPool   = options.reduce((sum, _, i) => sum + (bets[`opt_${i}`] || 0), 0);
  const totalBetters = Object.keys(betters).length;

  /* ── Game actions ── */
  const openBets = () => {
    const opts = options.length > 0 ? options : DEFAULT_OPTIONS;
    setMulti({
      gameStatus: 'open',
      winnerOption: null,
      bets: {},
      betters: {},
      _openedAt: Date.now(),
      options: opts,
    });
    const bracketList = opts
      .map((o, i) => `${o.label} → ${chatCommand} ${i + 1}`)
      .join(' | ');
    seBotAnnounce(
      userId,
      `🎲 BETS OPEN: ${c.question || 'Place your bets!'} — ${bracketList} — Type ${chatCommand} <number> to bet!`
    );
  };

  const lockBets = () => {
    set('gameStatus', 'locked');
    seBotAnnounce(
      userId,
      `🔒 BETS LOCKED! ${totalBetters} bets in the pool (${totalPool.toLocaleString()} pts). Good luck!`
    );
  };

  const resolveWinner = (idx) => {
    const winLabel = options[idx]?.label || `Option ${idx + 1}`;
    const entry = {
      question:  c.question || 'Bets',
      winner:    winLabel,
      pool:      totalPool,
      betters:   totalBetters,
      time:      new Date().toLocaleTimeString(),
      date:      new Date().toLocaleDateString(),
    };
    setMulti({
      gameStatus:   'result',
      winnerOption: idx,
      betsHistory:  [entry, ...history].slice(0, 20),
    });
    seBotAnnounce(
      userId,
      `🏆 RESULT: ${winLabel} wins! Pool: ${totalPool.toLocaleString()} pts from ${totalBetters} bets.`
    );
  };

  const resetBets = () => setMulti({
    gameStatus:   'idle',
    winnerOption: null,
    bets:         {},
    betters:      {},
    _openedAt:    null,
  });

  /* ── Bracket management ── */
  const addOption    = () => set('options', [...options, { label: `Option ${options.length + 1}` }]);
  const removeOption = (idx) => set('options', options.filter((_, i) => i !== idx));
  const updateOption = (idx, label) => {
    const updated = [...options];
    updated[idx]  = { ...updated[idx], label };
    set('options', updated);
  };
  const loadDefaults = () => set('options', DEFAULT_OPTIONS);

  const tabs = [
    { id: 'game',     label: '🎮 Game' },
    { id: 'brackets', label: '📋 Brackets' },
    { id: 'chat',     label: '💬 Chat' },
    { id: 'style',    label: '🎨 Style' },
    { id: 'history',  label: '📜 History' },
  ];

  return (
    <div className="cg-config">
      <TabBar tabs={tabs} active={tab} onChange={setTab} variant="cg" />

      {/* ═══ GAME TAB ═══ */}
      {tab === 'game' && (
        <div className="cg-config__section">
          <label className="cg-config__field">
            <span>Title / Question</span>
            <input
              value={c.question || ''}
              onChange={e => set('question', e.target.value)}
              placeholder="Place your bets!"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label className="cg-config__field">
              <span>Fund Amount</span>
              <input
                type="number"
                value={c.fundAmount || 0}
                onChange={e => set('fundAmount', parseInt(e.target.value) || 0)}
                min={0}
              />
            </label>
            <label className="cg-config__field">
              <span>Currency</span>
              <input
                value={c.currency || '€'}
                onChange={e => set('currency', e.target.value)}
                placeholder="€"
              />
            </label>
          </div>

          <label className="cg-config__field">
            <span>Countdown Timer (seconds, 0 = off)</span>
            <input
              type="number"
              value={c.timerSeconds || 0}
              onChange={e => set('timerSeconds', parseInt(e.target.value) || 0)}
              min={0}
            />
          </label>

          {/* Status card */}
          <div className="cg-config__status-card">
            <div className="cg-config__status-row">
              <span className="cg-config__status-label">Status</span>
              <span className={`cg-config__status-badge cg-config__status-badge--${status}`}>
                {status === 'idle'   ? '⏸ Idle'   :
                 status === 'open'   ? '🟢 Open'   :
                 status === 'locked' ? '🔒 Locked' : '🏆 Result'}
              </span>
            </div>
            {status !== 'idle' && (
              <>
                <div className="cg-config__status-row">
                  <span>Total Pool</span>
                  <span style={{ fontWeight: 700, color: '#b8c8d8' }}>{totalPool.toLocaleString()}</span>
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
                      <span style={{ fontWeight: 600 }}>{amt.toLocaleString()}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="cg-config__actions">
            {status === 'idle' && (
              <button
                className="cg-config__btn cg-config__btn--primary"
                onClick={openBets}
                disabled={options.length < 2}
              >
                🟢 Open Bets
              </button>
            )}
            {status === 'open' && (
              <>
                <button className="cg-config__btn cg-config__btn--accent" onClick={lockBets}>
                  🔒 Lock Bets
                </button>
                <button className="cg-config__btn cg-config__btn--muted" onClick={resetBets}>
                  ⏸ Cancel
                </button>
              </>
            )}
            {status === 'locked' && (
              <>
                <p className="cg-config__hint">Pick the winning bracket:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {options.map((opt, i) => (
                    <button
                      key={i}
                      className="cg-config__btn cg-config__btn--primary"
                      onClick={() => resolveWinner(i)}
                      style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                    >
                      👑 {opt.label}
                    </button>
                  ))}
                </div>
                <button className="cg-config__btn cg-config__btn--muted" onClick={resetBets} style={{ marginTop: 6 }}>
                  🗑️ Cancel
                </button>
              </>
            )}
            {status === 'result' && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={resetBets}>
                🔄 New Round
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ BRACKETS TAB ═══ */}
      {tab === 'brackets' && (
        <div className="cg-config__section">
          <p className="cg-config__hint">
            Configure bracket labels. Viewers type <code>{chatCommand} &lt;number&gt;</code> to bet.
          </p>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color: '#8ba4b8', fontSize: '0.82rem', minWidth: 20 }}>{i + 1}.</span>
              <input
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  color: '#e5e7eb',
                  fontSize: '0.85rem',
                }}
                value={opt.label}
                onChange={e => updateOption(i, e.target.value)}
                disabled={status !== 'idle'}
                placeholder={`Option ${i + 1}`}
              />
              {status === 'idle' && options.length > 2 && (
                <button
                  onClick={() => removeOption(i)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {status === 'idle' && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="cg-config__btn cg-config__btn--primary" onClick={addOption} style={{ fontSize: '0.82rem' }}>
                + Add Bracket
              </button>
              <button className="cg-config__btn cg-config__btn--muted" onClick={loadDefaults} style={{ fontSize: '0.82rem' }}>
                Load Defaults
              </button>
            </div>
          )}
          {status !== 'idle' && (
            <p className="cg-config__hint" style={{ marginTop: 4 }}>⚠️ End the current round to edit brackets.</p>
          )}
        </div>
      )}

      {/* ═══ CHAT TAB ═══ */}
      {tab === 'chat' && (
        <div className="cg-config__section">
          <label className="cg-config__field">
            <span>Chat Command Trigger</span>
            <input
              value={c.chatCommand || '!bet'}
              onChange={e => set('chatCommand', e.target.value)}
              placeholder="!bet"
            />
          </label>
          <p className="cg-config__hint">
            Viewers type <code>{chatCommand} &lt;number&gt;</code> or <code>{chatCommand} &lt;number&gt; &lt;amount&gt;</code>
          </p>

          <label className="cg-config__field">
            <span>Twitch Channel (leave empty for auto-detect)</span>
            <input
              value={c.twitchChannel || ''}
              onChange={e => set('twitchChannel', e.target.value)}
              placeholder="auto-detect from profile"
            />
          </label>

          <label className="cg-config__field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={c.seAnnounce !== false}
              onChange={e => set('seAnnounce', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span>SE Bot announcements (open / lock / result)</span>
          </label>
        </div>
      )}

      {/* ═══ STYLE TAB ═══ */}
      {tab === 'style' && (
        <div className="cg-config__section">

          {/* ── Theme preset ── */}
          <label className="cg-config__label">Color Theme</label>
          <select
            className="cg-config__select"
            value={c.colorTheme || 'dark'}
            onChange={e => applyTheme(e.target.value)}
          >
            <option value="dark">🌑 Dark Glass</option>
            <option value="grey">🌫️ Grey</option>
            <option value="white">☀️ White</option>
          </select>

          {/* ── Bar colour mode ── */}
          <label className="cg-config__label" style={{ marginTop: 8 }}>Bar Colors</label>
          <select
            className="cg-config__select"
            value={c.barColorMode || 'rainbow'}
            onChange={e => set('barColorMode', e.target.value)}
          >
            <option value="rainbow">🌈 Colorful (per option)</option>
            <option value="single">🔵 Single Color</option>
          </select>

          {/* ── Layout ── */}
          <label className="cg-config__label" style={{ marginTop: 8 }}>Layout</label>
          <select
            className="cg-config__select"
            value={c.displayStyle || 'v1_list'}
            onChange={e => set('displayStyle', e.target.value)}
          >
            <option value="v1_list">List (horizontal bars)</option>
            <option value="v2_grid">Grid (vertical fill cards)</option>
          </select>

          <label className="cg-config__label" style={{ marginTop: 8 }}>Font Family</label>
          <select
            className="cg-config__select"
            value={c.fontFamily || "'Inter', sans-serif"}
            onChange={e => set('fontFamily', e.target.value)}
          >
            <option value="'Inter', sans-serif">Inter (default)</option>
            <option value="'Rajdhani', sans-serif">Rajdhani</option>
            <option value="'Oswald', sans-serif">Oswald</option>
            <option value="'Bebas Neue', sans-serif">Bebas Neue</option>
            <option value="'Roboto', sans-serif">Roboto</option>
          </select>

          {/* ── Manual colour overrides ── */}
          <p className="cg-config__hint" style={{ marginTop: 8 }}>
            Manual overrides — selecting a theme above resets these.
          </p>
          <div className="cg-config__color-row">
            <label className="cg-config__color">
              <span>Background</span>
              <input type="color" value={c.bgColor || '#0a0e14'} onChange={e => set('bgColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Header BG</span>
              <input type="color" value={c.headerBg || '#141a24'} onChange={e => set('headerBg', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Header Text</span>
              <input type="color" value={c.headerText || '#eef2f5'} onChange={e => set('headerText', e.target.value)} />
            </label>
          </div>
          <div className="cg-config__color-row">
            <label className="cg-config__color">
              <span>Bar Track</span>
              <input type="color" value={c.barBg || '#1c2330'} onChange={e => set('barBg', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Bar Fill (single)</span>
              <input type="color" value={c.barFill || '#6366f1'} onChange={e => set('barFill', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Text</span>
              <input type="color" value={c.textColor || '#d4dce8'} onChange={e => set('textColor', e.target.value)} />
            </label>
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <div className="cg-config__section">
          {history.length === 0 ? (
            <p className="cg-config__hint">No rounds recorded yet.</p>
          ) : (
            <div className="cg-config__history">
              {history.map((entry, i) => (
                <div key={i} className="cg-config__history-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#eef2f5', fontSize: '0.9rem' }}>
                      🏆 {entry.winner}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{entry.date} {entry.time}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8ba4b8', marginTop: 2 }}>
                    {entry.question} · {entry.betters} bets · {(entry.pool || 0).toLocaleString()} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


