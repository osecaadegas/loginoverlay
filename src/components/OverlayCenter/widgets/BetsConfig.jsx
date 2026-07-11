/**
 * BetsConfig.jsx — Admin control panel for the Bets widget.
 *
 * Tabs: 🎮 Game | 📋 Brackets | 💬 Chat | 📜 History
 * Follows the same pattern as PredictionsConfig + BonusHuntConfig.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import TabBar from './shared/TabBar';

const BETS_OPTION_PALETTE = [
  '#6366f1',
  '#22c55e',
  '#f97316',
  '#64748b',
  '#06b6d4',
  '#ef4444',
  '#eab308',
  '#64748b',
  '#14b8a6',
  '#f59e0b',
];

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

const TIMER_PRESETS = [
  { value: 600, label: '600 seconds', detail: '10 minutes' },
  { value: 1200, label: '1200 seconds', detail: '20 minutes' },
];

const CHAT_TEMPLATE_FIELDS = [
  {
    key: 'betMsgPlaced',
    label: 'Bet accepted',
    help: 'Sent when a viewer bet is saved without deducting points.',
    placeholder: '@{user}, your {amount} point bet on {option} is in.',
  },
  {
    key: 'betMsgPlacedSe',
    label: 'Bet accepted and points deducted',
    help: 'Sent when StreamElements points are deducted successfully.',
    placeholder: '@{user}, your {amount} point bet on {option} is in. Points deducted.',
  },
  {
    key: 'betMsgNoPoints',
    label: 'Not enough points',
    help: 'Sent when a viewer tries to bet more than their balance.',
    placeholder: '@{user}, you have {balance} points and tried to bet {amount}.',
  },
  {
    key: 'betMsgAlreadyBet',
    label: 'Viewer already has a bet',
    help: 'Sent when the same viewer tries to bet again in the same round.',
    placeholder: '@{user}, you already have a bet in this round.',
  },
  {
    key: 'betMsgNotOpen',
    label: 'Bets are closed',
    help: 'Sent when someone tries to bet before opening or after locking the round.',
    placeholder: '@{user}, bets are closed right now.',
  },
  {
    key: 'betMsgWinner',
    label: 'Winner and payout message',
    help: 'Sent after you choose the winning bracket and payouts finish.',
    placeholder: '{option} wins. {winners} winner(s), {total} points paid out.',
  },
];

const DEFAULT_CHAT_TEMPLATES = Object.fromEntries(
  CHAT_TEMPLATE_FIELDS.map(({ key, placeholder }) => [key, placeholder])
);

function getChatTemplateValues(config = {}) {
  return Object.fromEntries(
    CHAT_TEMPLATE_FIELDS.map(({ key, placeholder }) => [
      key,
      typeof config[key] === 'string' ? config[key] : placeholder,
    ])
  );
}

function chatTemplateSignature(values = {}) {
  return CHAT_TEMPLATE_FIELDS.map(({ key }) => values[key] || '').join('\u001f');
}

function normalizeBracketOptions(source = DEFAULT_OPTIONS) {
  const safeSource = Array.isArray(source) && source.length ? source : DEFAULT_OPTIONS;
  return safeSource.map((option, index) => ({
    ...option,
    label: String(option?.label || `Bracket ${index + 1}`).trim() || `Bracket ${index + 1}`,
  }));
}

function bracketSignature(options) {
  return normalizeBracketOptions(options).map(option => option.label.toLowerCase()).join('|');
}

function summarizeBracketSet(options) {
  return normalizeBracketOptions(options).map((option, index) => `${index + 1}. ${option.label}`).join(' | ');
}

function dateScore(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function createBracketMemory(options, question, history = [], usage = []) {
  const snapshot = normalizeBracketOptions(options);
  const signature = bracketSignature(snapshot);
  if (!signature) return {};

  const now = new Date().toISOString();
  const summary = summarizeBracketSet(snapshot);
  const title = question || 'Place your bets!';
  const recentEntry = {
    id: `${Date.now()}-recent`,
    question: title,
    options: snapshot,
    summary,
    count: snapshot.length,
    usedAt: now,
  };
  const existingUsage = usage.find(entry => bracketSignature(entry.options) === signature);
  const usageEntry = {
    id: existingUsage?.id || `${Date.now()}-usage`,
    question: title,
    options: snapshot,
    summary,
    count: snapshot.length,
    uses: (existingUsage?.uses || 0) + 1,
    lastUsedAt: now,
  };

  return {
    bracketHistory: [recentEntry, ...history.filter(entry => bracketSignature(entry.options) !== signature)].slice(0, 12),
    bracketUsage: [usageEntry, ...usage.filter(entry => bracketSignature(entry.options) !== signature)]
      .sort((a, b) => (b.uses || 0) - (a.uses || 0) || dateScore(b.lastUsedAt) - dateScore(a.lastUsedAt))
      .slice(0, 6),
  };
}

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
  const [chatTemplateDrafts, setChatTemplateDrafts] = useState(() => getChatTemplateValues(c));
  const [chatTemplateSaveMsg, setChatTemplateSaveMsg] = useState('');
  const chatTemplateConfigValues = getChatTemplateValues(c);
  const chatTemplateConfigSignature = chatTemplateSignature(chatTemplateConfigValues);
  const chatTemplateDraftSignature = chatTemplateSignature(chatTemplateDrafts);
  const chatTemplatesDirty = chatTemplateDraftSignature !== chatTemplateConfigSignature;

  useEffect(() => {
    const missingTemplates = Object.entries(DEFAULT_CHAT_TEMPLATES).reduce((acc, [key, template]) => {
      if (typeof c[key] !== 'string') acc[key] = template;
      return acc;
    }, {});

    if (Object.keys(missingTemplates).length > 0) {
      onChange({ ...c, ...missingTemplates });
    }
  }, [c, onChange]);

  useEffect(() => {
    setChatTemplateDrafts(getChatTemplateValues(c));
  }, [chatTemplateConfigSignature]);

  const status      = c.gameStatus  || 'idle';
  const options     = c.options     || DEFAULT_OPTIONS;
  const bets        = c.bets        || {};
  const betters     = c.betters     || {};
  const history     = c.betsHistory || [];
  const bracketHistory = Array.isArray(c.bracketHistory) ? c.bracketHistory : [];
  const bracketUsage = Array.isArray(c.bracketUsage) ? c.bracketUsage : [];
  const chatCommand = c.chatCommand || '!bet';
  const pointsEnabled = c.betSeEnabled !== false;
  const timerSeconds = Number(c.timerSeconds || 0);
  const customTimerActive = !TIMER_PRESETS.some(preset => preset.value === timerSeconds);
  const totalPool   = options.reduce((sum, _, i) => sum + (bets[`opt_${i}`] || 0), 0);
  const totalBetters = Object.keys(betters).length;
  const maxOptionPool = Math.max(1, ...options.map((_, i) => bets[`opt_${i}`] || 0));
  const optionStats = options.map((opt, i) => {
    const amount = bets[`opt_${i}`] || 0;
    const percent = totalPool > 0 ? Math.round((amount / totalPool) * 100) : 0;
    const betterCount = Object.values(betters).filter(better => better?.option === i).length;
    return {
      amount,
      betterCount,
      color: BETS_OPTION_PALETTE[i % BETS_OPTION_PALETTE.length],
      fillHeight: maxOptionPool > 0 ? Math.round((amount / maxOptionPool) * 100) : 0,
      label: (opt.label || `Option ${i + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, ''),
      percent,
    };
  });

  const saveChatTemplates = () => {
    setMulti(chatTemplateDrafts);
    setChatTemplateSaveMsg('Saved preset texts');
  };

  /* ── Game actions ── */
  const openBets = () => {
    const opts = normalizeBracketOptions(options.length > 0 ? options : DEFAULT_OPTIONS);
    setMulti({
      gameStatus: 'open',
      winnerOption: null,
      bets: {},
      betters: {},
      _openedAt: Date.now(),
      options: opts,
      ...createBracketMemory(opts, c.question || 'Place your bets!', bracketHistory, bracketUsage),
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
      brackets:  normalizeBracketOptions(options),
      bracketSummary: summarizeBracketSet(options),
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
  const duplicateOption = (idx) => {
    const source = options[idx] || { label: `Bracket ${idx + 1}` };
    const updated = [...options];
    updated.splice(idx + 1, 0, { ...source, label: `${source.label || `Bracket ${idx + 1}`} copy` });
    set('options', updated);
  };
  const moveOption = (idx, direction) => {
    const nextIndex = idx + direction;
    if (nextIndex < 0 || nextIndex >= options.length) return;
    const updated = [...options];
    [updated[idx], updated[nextIndex]] = [updated[nextIndex], updated[idx]];
    set('options', updated);
  };
  const updateOption = (idx, label) => {
    const updated = [...options];
    updated[idx]  = { ...updated[idx], label };
    set('options', updated);
  };
  const loadDefaults = () => set('options', normalizeBracketOptions(DEFAULT_OPTIONS));

  const roundStatusCard = (
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
  );

  const tabs = [
    { id: 'game',     label: '🎮 Game' },
    { id: 'brackets', label: '📋 Brackets' },
    { id: 'chat',     label: '💬 Chat' },
    { id: 'history',  label: '📜 History' },
  ];

  return (
    <div className="cg-config cg-config--modern">
      <TabBar tabs={tabs} active={tab} onChange={setTab} variant="cg" />

      {/* ═══ GAME TAB ═══ */}
      {tab === 'game' && (
        <div className="cg-config__section cg-config__game-layout">
          <section className="cg-config__game-card cg-config__game-card--setup">
            <div className="cg-config__game-card-header">
              <div>
                <strong>Round setup</strong>
                <span>Question and betting window</span>
              </div>
            </div>

            <label className="cg-config__field">
              <span>Title / Question</span>
              <input
                value={c.question || ''}
                onChange={e => set('question', e.target.value)}
                placeholder="Place your bets!"
              />
            </label>

            <div className="cg-config__field">
              <span>Betting Timer</span>
              <div className="cg-config__timer-grid">
                {TIMER_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`cg-config__btn cg-config__timer-option ${timerSeconds === preset.value ? 'cg-config__btn--primary' : 'cg-config__btn--muted'}`}
                    onClick={() => set('timerSeconds', preset.value)}
                  >
                    <strong>{preset.label}</strong>
                    <small>{preset.detail}</small>
                  </button>
                ))}
                <button
                  type="button"
                  className={`cg-config__btn cg-config__timer-option ${customTimerActive ? 'cg-config__btn--primary' : 'cg-config__btn--muted'}`}
                  onClick={() => set('timerSeconds', customTimerActive ? timerSeconds : 0)}
                >
                  <strong>Custom</strong>
                  <small>{customTimerActive ? `${timerSeconds} seconds` : 'Manual value'}</small>
                </button>
              </div>
              <div className="cg-config__custom-timer-row">
                <input
                  type="number"
                  value={customTimerActive ? timerSeconds : ''}
                  onChange={e => set('timerSeconds', parseInt(e.target.value, 10) || 0)}
                  min={0}
                  placeholder="Custom seconds"
                  disabled={!customTimerActive}
                />
                <span>seconds</span>
              </div>
              <p className="cg-config__hint">Use a preset or enter a custom value. Set custom to 0 for no timer.</p>
            </div>
          </section>

          <aside className="cg-config__game-card cg-config__game-card--controls">
            <div className="cg-config__game-card-header">
              <div>
                <strong>Round controls</strong>
                <span>Current state and actions</span>
              </div>
            </div>

            {roundStatusCard}

            {/* Action buttons */}
            <div className="cg-config__actions cg-config__game-actions">
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
                <div className="cg-config__winner-picker">
                  <p className="cg-config__hint">Pick the winning bracket:</p>
                  <div className="cg-config__winner-grid">
                    {optionStats.map((stat, i) => (
                      <button
                        key={`${stat.label}-${i}`}
                        type="button"
                        className="cg-config__winner-tile"
                        onClick={() => resolveWinner(i)}
                        style={{ '--winner-color': stat.color, '--winner-fill': `${stat.fillHeight}%` }}
                      >
                        <span className="cg-config__winner-fill" />
                        <span className="cg-config__winner-num">{i + 1}</span>
                        <strong>{stat.label}</strong>
                        <span className="cg-config__winner-percent">{stat.percent}%</span>
                        <small>{stat.amount.toLocaleString()} pts · {stat.betterCount} bet{stat.betterCount === 1 ? '' : 's'}</small>
                      </button>
                    ))}
                  </div>
                  <button className="cg-config__btn cg-config__btn--muted" onClick={resetBets} style={{ marginTop: 6 }}>
                    🗑️ Cancel
                  </button>
                </div>
              )}
              {status === 'result' && (
                <button className="cg-config__btn cg-config__btn--primary" onClick={resetBets}>
                  🔄 New Round
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ═══ BRACKETS TAB ═══ */}
      {tab === 'brackets' && (
        <div className="cg-config__section" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 380px)', gap: 14, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <p className="cg-config__hint">
              Each row is one bracket viewers can choose. The row number is the chat number: <code>{chatCommand} 1 &lt;amount&gt;</code>, <code>{chatCommand} 2 &lt;amount&gt;</code>, and so on.
            </p>

            {options.map((opt, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr) auto', gap: 8, alignItems: 'end', padding: '8px 0', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 800 }}>Bracket {i + 1}</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{chatCommand} {i + 1}</span>
                </div>
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
                {status === 'idle' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="cg-config__btn cg-config__btn--muted" onClick={() => moveOption(i, -1)} disabled={i === 0}>Up</button>
                    <button type="button" className="cg-config__btn cg-config__btn--muted" onClick={() => moveOption(i, 1)} disabled={i === options.length - 1}>Down</button>
                    <button type="button" className="cg-config__btn cg-config__btn--muted" onClick={() => duplicateOption(i)}>Copy</button>
                    {options.length > 2 && <button type="button" className="cg-config__btn cg-config__btn--muted" onClick={() => removeOption(i)}>Remove</button>}
                  </div>
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
              <p className="cg-config__hint" style={{ marginTop: 4 }}>End the current round before changing bracket labels or loading saved setups.</p>
            )}
          </div>

          <aside style={{ display: 'grid', gap: 12 }}>
            {roundStatusCard}
          </aside>
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

          {/* ── Chat reply messages ── */}
          <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(16,185,129,0.07)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7', marginBottom: 4 }}>
                  Chat reply messages
                </p>
                {chatTemplateSaveMsg && <p style={{ fontSize: '0.72rem', color: '#86efac', margin: 0 }}>{chatTemplateSaveMsg}</p>}
              </div>
              <button
                type="button"
                className="cg-config__btn cg-config__btn--primary"
                onClick={saveChatTemplates}
                style={{ flex: '0 0 auto', minWidth: 154, paddingInline: 14 }}
              >
                Save preset texts
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 10 }}>
              Write the exact chat replies the bot should send. These words are replaced automatically: <code style={{ color: '#c7d2fe' }}>{'{user}'}</code> viewer name, <code style={{ color: '#c7d2fe' }}>{'{amount}'}</code> bet amount, <code style={{ color: '#c7d2fe' }}>{'{option}'}</code> bracket label, <code style={{ color: '#c7d2fe' }}>{'{balance}'}</code> viewer balance, <code style={{ color: '#c7d2fe' }}>{'{winners}'}</code> winners, <code style={{ color: '#c7d2fe' }}>{'{total}'}</code> paid points.
            </p>
            {CHAT_TEMPLATE_FIELDS.map(({ key, label, help, placeholder }) => (
              <label key={key} className="cg-config__field" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem' }}>
                  <strong style={{ display: 'block', color: '#dbeafe' }}>{label}</strong>
                  <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.68rem', fontWeight: 500 }}>{help}</small>
                </span>
                <input
                  value={chatTemplateDrafts[key] ?? placeholder}
                  onChange={e => {
                    setChatTemplateDrafts(prev => ({ ...prev, [key]: e.target.value }));
                    setChatTemplateSaveMsg('');
                  }}
                  placeholder={placeholder}
                  style={{ fontSize: '0.75rem' }}
                />
              </label>
            ))}
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
                  {entry.bracketSummary && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3 }}>
                      Brackets: {entry.bracketSummary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


