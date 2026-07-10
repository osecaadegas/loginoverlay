/**
 * BetsConfig.jsx — Admin control panel for the Bets widget.
 *
 * Tabs: 🎮 Game | 📋 Brackets | 💬 Chat | 🎨 Style | 📜 History
 * Follows the same pattern as PredictionsConfig + BonusHuntConfig.
 */
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import TabBar from './shared/TabBar';
import { MetricCard, SectionHeader, SetupChecklist, StatusBadge } from '../ui';

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
  const pointsEnabled = c.betSeEnabled !== false;
  const totalPool   = options.reduce((sum, _, i) => sum + (bets[`opt_${i}`] || 0), 0);
  const totalBetters = Object.keys(betters).length;
  const setupItems = [
    {
      key: 'question',
      title: 'Set the bet question',
      detail: c.question || 'Add the title viewers will see on stream',
      ready: !!(c.question || '').trim(),
    },
    {
      key: 'brackets',
      title: 'Confirm brackets',
      detail: `${options.length} bracket${options.length === 1 ? '' : 's'} configured`,
      ready: options.length >= 2,
    },
    {
      key: 'chat',
      title: 'Chat command ready',
      detail: `Viewers type ${chatCommand} <number> <amount>`,
      ready: !!chatCommand,
    },
  ];

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
      .map((o, i) => `${o.label} → ${chatCommand} ${i + 1} <amount>`)
      .join(' | ');
    if (c.seAnnounce !== false) {
      seBotAnnounce(
        userId,
        `🎲 BETS OPEN: ${c.question || 'Place your bets!'} — ${bracketList} — Type ${chatCommand} <number> <amount> to bet!`
      );
    }
  };

  const lockBets = () => {
    set('gameStatus', 'locked');
    if (c.seAnnounce !== false) {
      seBotAnnounce(
        userId,
        `🔒 BETS LOCKED! ${totalBetters} bets in the pool (${totalPool.toLocaleString()} pts). Good luck!`
      );
    }
  };

  const resolveWinner = async (idx) => {
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

    // If SE points mode is on, pay out winners server-side
    if (pointsEnabled && userId) {
      const { supabase } = await import('../../../config/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      fetch(
        `${window.location.origin}/api/chat-commands?cmd=bet-payout&user_id=${encodeURIComponent(userId)}&winner_idx=${idx}`,
        {
          method: 'GET',
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        }
      )
        .then(r => r.json())
        .then(d => {
          if (!d.ok) console.error('[BetsPayout]', d.error);
          else console.info(`[BetsPayout] ${d.paid} winners paid, total pool ${d.totalPool}`);
        })
        .catch(e => console.error('[BetsPayout]', e));
      return; // announcement will be made by the API
    }

    if (c.seAnnounce !== false) {
      seBotAnnounce(
        userId,
        `🏆 RESULT: ${winLabel} wins! Pool: ${totalPool.toLocaleString()} pts from ${totalBetters} bets.`
      );
    }
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
    <div className="cg-config cg-config--modern">
      <div className="cg-config__hero">
        <SectionHeader
          eyebrow="Live Betting"
          title="Bets control room"
          description="Open a chat-powered betting round, lock entries, resolve the winning bracket, and keep the overlay state obvious before it hits OBS."
          pill={<StatusBadge tone={status === 'open' ? 'live' : status === 'idle' ? 'neutral' : 'active'}>{status}</StatusBadge>}
        />
        <div className="cg-config__metrics">
          <MetricCard label="Pool" value={totalPool.toLocaleString()} meta={`${totalBetters} viewer${totalBetters === 1 ? '' : 's'} in this round`} />
          <MetricCard label="Brackets" value={options.length} meta="Available betting outcomes" />
          <MetricCard label="Command" value={chatCommand} meta={c.twitchChannel || 'Uses profile channel when available'} />
        </div>
        <SetupChecklist items={setupItems} title="Round readiness" />
      </div>

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
            Configure bracket labels. Viewers type <code>{chatCommand} &lt;number&gt; &lt;amount&gt;</code> to bet.
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
            Viewers type <code>{chatCommand} &lt;number&gt; &lt;amount&gt;</code>
          </p>

          <label className="cg-config__field">
            <span>Twitch Channel (leave empty for auto-detect)</span>
            <input
              value={c.twitchChannel || ''}
              onChange={e => set('twitchChannel', e.target.value)}
              placeholder="auto-detect from profile"
            />
          </label>

          {/* ── SE Command setup ── */}
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.25)' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>
              🔗 StreamElements Command (reliable chat listener)
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 6 }}>
              In SE, create a custom command <code>{chatCommand}</code> with this URL response:
            </p>
            <code style={{ display: 'block', fontSize: '0.7rem', wordBreak: 'break-all', color: '#c7d2fe', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: 4 }}>
              {`${window.location.origin}/api/chat-commands?cmd=bet&user_id=${userId || '<your-user-id>'}&w1=\${1}&w2=\${2}&requester=\${user.username}`}
            </code>
          </div>

          {/* ── SE Points deduction ── */}
          <label className="cg-config__field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 10 }}>
            <input
              type="checkbox"
              checked={pointsEnabled}
              onChange={e => set('betSeEnabled', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span>Deduct SE points equal to bet amount</span>
          </label>
          {pointsEnabled && (
            <p className="cg-config__hint">
              Requires SE connected. The viewer's typed amount will be deducted from their SE balance before the bet is recorded.
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <label className="cg-config__field">
              <span>Min bet amount</span>
              <input
                type="number"
                value={c.betMinAmount ?? 1}
                onChange={e => set('betMinAmount', parseInt(e.target.value) || 1)}
                min={1}
              />
            </label>
            <label className="cg-config__field">
              <span>Max bet (0 = no limit)</span>
              <input
                type="number"
                value={c.betMaxAmount ?? 0}
                onChange={e => set('betMaxAmount', parseInt(e.target.value) || 0)}
                min={0}
              />
            </label>
          </div>

          <label className="cg-config__field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={c.seAnnounce !== false}
              onChange={e => set('seAnnounce', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span>SE Bot announcements (open / lock / result)</span>
          </label>

          {/* ── Chat Message Templates ── */}
          <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(16,185,129,0.07)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7', marginBottom: 4 }}>
              💬 Chat Message Templates
            </p>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 10 }}>
              Available variables: <code style={{ color: '#c7d2fe' }}>{'{user}'}</code> <code style={{ color: '#c7d2fe' }}>{'{amount}'}</code> <code style={{ color: '#c7d2fe' }}>{'{option}'}</code> <code style={{ color: '#c7d2fe' }}>{'{balance}'}</code> <code style={{ color: '#c7d2fe' }}>{'{winners}'}</code> <code style={{ color: '#c7d2fe' }}>{'{total}'}</code>
            </p>
            {[
              { key: 'betMsgPlaced',    label: '✅ Bet placed',              placeholder: '@{user} ✅ Bet of {amount} pts registered on {option}!' },
              { key: 'betMsgPlacedSe', label: '✅ Bet placed (SE deduct)',   placeholder: '@{user} ✅ Bet of {amount} pts registered on {option}! Points deducted.' },
              { key: 'betMsgNoPoints', label: '❌ Not enough points',         placeholder: '@{user} ❌ Not enough points — you have {balance} but tried to bet {amount}.' },
              { key: 'betMsgAlreadyBet',label: '❌ Already bet',              placeholder: '@{user} ❌ You already placed a bet this round.' },
              { key: 'betMsgNotOpen',  label: '❌ Bets not open',             placeholder: '@{user} ❌ Bets are not open right now.' },
              { key: 'betMsgWinner',   label: '🏆 Winner announced',          placeholder: '🏆 BETS PAID OUT! {option} wins! {winners} winners — {total} pts distributed!' },
            ].map(({ key, label, placeholder }) => (
              <label key={key} className="cg-config__field" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem' }}>{label}</span>
                <input
                  value={c[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ fontSize: '0.75rem' }}
                />
              </label>
            ))}
          </div>
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
            <option value="v3_grid_2x3">Grid (2 rows × 3 columns)</option>
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


