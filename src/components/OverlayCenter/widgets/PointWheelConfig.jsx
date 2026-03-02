/**
 * PointWheelConfig.jsx — Streamer control panel for the Point Wheel community game.
 * Open entries → viewers join via !wheel [amount] → spin both wheels → combined multiplier.
 * 70% chance of no payout. Integrates StreamElements points for real payouts.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStreamElements } from '../../../context/StreamElementsContext';

/* ── Default outer wheel segments (12 segments) ── */
const DEFAULT_OUTER = [
  { multi: 0,  label: '0x',  color: '#2d1f3d' },
  { multi: 1,  label: '1x',  color: '#7c3aed' },
  { multi: 0,  label: '0x',  color: '#1e1b2e' },
  { multi: 2,  label: '2x',  color: '#2563eb' },
  { multi: 0,  label: '0x',  color: '#2d1f3d' },
  { multi: 5,  label: '5x',  color: '#d97706' },
  { multi: 0,  label: '0x',  color: '#1e1b2e' },
  { multi: 1,  label: '1x',  color: '#7c3aed' },
  { multi: 0,  label: '0x',  color: '#2d1f3d' },
  { multi: 10, label: '10x', color: '#dc2626' },
  { multi: 0,  label: '0x',  color: '#1e1b2e' },
  { multi: 2,  label: '2x',  color: '#2563eb' },
];

/* ── Default inner wheel segments (8 segments) ── */
const DEFAULT_INNER = [
  { multi: 0, label: '0x', color: '#1a1a2e' },
  { multi: 1, label: '1x', color: '#059669' },
  { multi: 0, label: '0x', color: '#111827' },
  { multi: 2, label: '2x', color: '#0891b2' },
  { multi: 0, label: '0x', color: '#1a1a2e' },
  { multi: 3, label: '3x', color: '#e11d48' },
  { multi: 0, label: '0x', color: '#111827' },
  { multi: 1, label: '1x', color: '#059669' },
];

/* ─── Twitch IRC (anonymous / read-only) ─── */
function useTwitchChat(channel, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const connect = useCallback(() => {
    if (!channel) return;
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('NICK justinfan' + Math.floor(Math.random() * 99999));
      ws.send('JOIN #' + channel.toLowerCase().trim());
    };
    ws.onmessage = (evt) => {
      const lines = evt.data.split('\r\n');
      for (const line of lines) {
        if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
        const m = line.match(/@([^ ]+) :([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.+)/);
        if (!m) continue;
        const tags = Object.fromEntries(m[1].split(';').map(t => t.split('=')));
        onMessage({ username: tags['display-name'] || m[2], message: m[3] });
      }
    };
    ws.onclose = () => { reconnectTimer.current = setTimeout(connect, 3000); };
  }, [channel, onMessage]);
  useEffect(() => {
    connect();
    return () => { clearTimeout(reconnectTimer.current); if (wsRef.current) wsRef.current.close(); };
  }, [connect]);
}

/* ─── Kick chat via Pusher WebSocket ─── */
function useKickChat(chatroomId, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const pingInterval = useRef(null);
  const connect = useCallback(() => {
    if (!chatroomId) return;
    if (wsRef.current) { try { wsRef.current.close(); } catch {} }
    if (pingInterval.current) clearInterval(pingInterval.current);
    const ws = new WebSocket('wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false');
    wsRef.current = ws;
    ws.onopen = () => {
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }, 120000);
    };
    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data);
        if (parsed.event === 'pusher:connection_established') {
          ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatrooms.${chatroomId}.v2` } }));
          ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatroom_${chatroomId}` } }));
          return;
        }
        if (parsed.event === 'App\\Events\\ChatMessageEvent') {
          const msg = JSON.parse(parsed.data);
          onMessage({ username: msg.sender?.username || 'Unknown', message: msg.content || '' });
        }
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      wsRef.current = null;
      if (pingInterval.current) { clearInterval(pingInterval.current); pingInterval.current = null; }
      reconnectTimer.current = setTimeout(connect, 5000);
    };
  }, [chatroomId, onMessage]);
  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);
}

/* ── Angle calculation: given target segment index, calculate wheel rotation ── */
function calcSpinAngle(prevAngle, targetIdx, segCount) {
  const segAngle = 360 / segCount;
  const segCenter = targetIdx * segAngle + segAngle / 2;
  const currentMod = ((prevAngle % 360) + 360) % 360;
  const targetMod = ((360 - segCenter) % 360 + 360) % 360;
  const delta = ((targetMod - currentMod) % 360 + 360) % 360;
  const fullSpins = 8 + Math.floor(Math.random() * 5); // 8-12 full rotations
  return prevAngle + delta + 360 * fullSpins;
}

export default function PointWheelConfig({ config, onChange }) {
  const c = config || {};
  const set = (k, v) => onChange({ ...c, [k]: v });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [tab, setTab] = useState('game');
  const [payoutProcessing, setPayoutProcessing] = useState(false);
  const [payoutResult, setPayoutResult] = useState(null);

  const outerSegs = c.outerSegments || DEFAULT_OUTER;
  const innerSegs = c.innerSegments || DEFAULT_INNER;

  /* ── StreamElements integration ── */
  let seCtx = null;
  try { seCtx = useStreamElements(); } catch {}
  const seAccount = seCtx?.seAccount;
  const seConnected = !!seAccount?.se_channel_id && !!seAccount?.se_jwt_token;

  const modifyViewerPoints = async (username, amount) => {
    if (!seConnected) return { success: false, error: 'SE not connected' };
    try {
      const res = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seAccount.se_channel_id}/${username}/${amount}`,
        { method: 'PUT', headers: { 'Authorization': `Bearer ${seAccount.se_jwt_token}`, 'Accept': 'application/json' } }
      );
      if (!res.ok) throw new Error(`SE API ${res.status}`);
      const data = await res.json();
      return { success: true, newBalance: data.newAmount ?? data.points };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const status = c.gameStatus || 'idle';
  const chatBets = c._chatBets || {};
  const betEntries = Object.entries(chatBets);
  const totalPlayers = betEntries.length;
  const totalPool = betEntries.reduce((s, [, b]) => s + (b.amount || 0), 0);
  const history = c.spinHistory || [];
  const noPayout = c.noPayoutChance ?? 70; // percentage
  const pointPayoutsEnabled = !!c.pointPayoutsEnabled && seConnected;
  const basePayout = c.basePayout || 100; // base points per 1x multiplier

  /* ── Refs for chat bet accumulation ── */
  const chatBetsRef = useRef(chatBets);
  const pendingBetsRef = useRef({});
  useEffect(() => { chatBetsRef.current = chatBets; }, [chatBets]);

  /* Flush pending chat bets every 1.5s */
  useEffect(() => {
    const timer = setInterval(() => {
      const pending = pendingBetsRef.current;
      if (Object.keys(pending).length > 0) {
        const merged = { ...chatBetsRef.current, ...pending };
        pendingBetsRef.current = {};
        onChange({ ...config, _chatBets: merged });
      }
    }, 1500);
    return () => clearInterval(timer);
  });

  /* ── Chat message handler — !wheel [amount] or !spin [amount] ── */
  const minBet = c.minBet || 10;
  const maxBet = c.maxBet || 10000;
  const chatBettingEnabled = !!c.chatBettingEnabled;
  const gameStatus = c.gameStatus || 'idle';

  const handleChatMessage = useCallback((msg) => {
    if (!chatBettingEnabled || gameStatus !== 'open') return;
    const text = (msg.message || '').trim().toLowerCase();
    const match = text.match(/^!(wheel|spin)\s*(\d*)$/);
    if (!match) return;
    let amount = parseInt(match[2]) || minBet;
    amount = Math.max(minBet, Math.min(maxBet, amount));
    const user = msg.username;
    if (!user) return;
    if (chatBetsRef.current[user] || pendingBetsRef.current[user]) return;
    pendingBetsRef.current[user] = { amount, time: Date.now() };
  }, [chatBettingEnabled, gameStatus, minBet, maxBet]);

  /* ── Connect chat platforms when entries are open ── */
  const chatActive = chatBettingEnabled && status === 'open';
  useTwitchChat(chatActive && c.twitchEnabled ? c.twitchChannel : '', handleChatMessage);
  useKickChat(chatActive && c.kickEnabled ? c.kickChannelId : '', handleChatMessage);

  const [chatStatus2, setChatStatus2] = useState({ twitch: false, kick: false });
  useEffect(() => {
    setChatStatus2({
      twitch: chatActive && !!c.twitchEnabled && !!c.twitchChannel,
      kick: chatActive && !!c.kickEnabled && !!c.kickChannelId,
    });
  }, [chatActive, c.twitchEnabled, c.twitchChannel, c.kickEnabled, c.kickChannelId]);

  /* ── Determine spin result with 70% no-payout chance ── */
  const computeSpinResult = () => {
    const outerZero = outerSegs.map((s, i) => ({ ...s, idx: i })).filter(s => s.multi === 0);
    const outerNon = outerSegs.map((s, i) => ({ ...s, idx: i })).filter(s => s.multi > 0);
    const innerZero = innerSegs.map((s, i) => ({ ...s, idx: i })).filter(s => s.multi === 0);
    const innerNon = innerSegs.map((s, i) => ({ ...s, idx: i })).filter(s => s.multi > 0);

    const rand = typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295
      : Math.random();

    if (rand < (noPayout / 100)) {
      /* No payout — land at least one wheel on 0x */
      const outerTarget = outerZero.length > 0
        ? outerZero[Math.floor(Math.random() * outerZero.length)]
        : { idx: 0, multi: 0 };
      /* Inner can be random (either zero or non-zero — doesn't matter since outer is 0) */
      const innerTarget = innerSegs[Math.floor(Math.random() * innerSegs.length)];
      const innerIdx = innerSegs.indexOf(innerTarget);
      return {
        outerIdx: outerTarget.idx,
        innerIdx: innerIdx >= 0 ? innerIdx : 0,
        outerMulti: 0,
        innerMulti: innerTarget?.multi || 0,
        totalMulti: 0,
      };
    } else {
      /* Payout! Both wheels land on non-zero */
      const outerTarget = outerNon.length > 0
        ? outerNon[Math.floor(Math.random() * outerNon.length)]
        : { idx: 1, multi: 1 };
      const innerTarget = innerNon.length > 0
        ? innerNon[Math.floor(Math.random() * innerNon.length)]
        : { idx: 1, multi: 1 };
      const totalMulti = outerTarget.multi * innerTarget.multi;
      return {
        outerIdx: outerTarget.idx,
        innerIdx: innerTarget.idx,
        outerMulti: outerTarget.multi,
        innerMulti: innerTarget.multi,
        totalMulti,
      };
    }
  };

  /* ── Process SE payouts ── */
  const processPayouts = async (totalMulti) => {
    const bets = chatBetsRef.current;
    const entries = Object.entries(bets);
    if (entries.length === 0 || !pointPayoutsEnabled) return;

    setPayoutProcessing(true);
    const winners = [];
    const losers = [];
    const errors = [];

    if (totalMulti > 0) {
      /* Everyone wins! Give each participant bet * totalMulti */
      const promises = entries.map(async ([username, bet]) => {
        const payout = Math.floor(bet.amount * totalMulti);
        const res = await modifyViewerPoints(username, payout);
        if (res.success) {
          winners.push({ name: username, amount: payout, balance: res.newBalance });
        } else {
          errors.push({ name: username, error: res.error });
        }
      });
      await Promise.allSettled(promises);
    } else {
      /* No win — deduct bet amount from all participants */
      const promises = entries.map(async ([username, bet]) => {
        const res = await modifyViewerPoints(username, -bet.amount);
        if (res.success) {
          losers.push({ name: username, amount: bet.amount, balance: res.newBalance });
        } else {
          errors.push({ name: username, error: res.error });
        }
      });
      await Promise.allSettled(promises);
    }

    setPayoutResult({ winners, losers, errors, totalMulti });
    setPayoutProcessing(false);
  };

  /* ── Game actions ── */
  const openEntry = () => {
    setPayoutResult(null);
    setMulti({
      gameStatus: 'open',
      _chatBets: {},
      _spinning: false,
      _wheelResult: null,
    });
  };

  const cancelEntry = () => setMulti({ gameStatus: 'idle', _chatBets: {} });

  const spinWheel = () => {
    const result = computeSpinResult();
    const prevOuter = c._outerAngle || 0;
    const prevInner = c._innerAngle || 0;
    const newOuterAngle = calcSpinAngle(prevOuter, result.outerIdx, outerSegs.length);
    const newInnerAngle = calcSpinAngle(prevInner, result.innerIdx, innerSegs.length);

    setMulti({
      gameStatus: 'spinning',
      _spinning: true,
      _spinStart: Date.now(),
      _outerAngle: newOuterAngle,
      _innerAngle: newInnerAngle,
    });

    /* After animation completes, reveal result */
    setTimeout(async () => {
      const payout = result.totalMulti > 0 ? Math.floor(basePayout * result.totalMulti) : 0;
      const wheelResult = { ...result, payout };
      const allBets = chatBetsRef.current;
      const newEntry = {
        outerMulti: result.outerMulti,
        innerMulti: result.innerMulti,
        totalMulti: result.totalMulti,
        payout,
        players: Object.keys(allBets).length,
        pool: Object.values(allBets).reduce((s, b) => s + (b.amount || 0), 0),
        time: new Date().toLocaleTimeString(),
      };

      setMulti({
        _spinning: false,
        gameStatus: 'result',
        _wheelResult: wheelResult,
        spinHistory: [newEntry, ...history].slice(0, 50),
      });

      if (pointPayoutsEnabled && Object.keys(allBets).length > 0) {
        await processPayouts(result.totalMulti);
      }
    }, 6000);
  };

  const resetGame = () => {
    setPayoutResult(null);
    setMulti({
      gameStatus: 'idle',
      _spinning: false,
      _chatBets: {},
      _wheelResult: null,
    });
  };

  /* ── Quick-add manual entry (for testing / manual entries) ── */
  const [manualUser, setManualUser] = useState('');
  const [manualAmount, setManualAmount] = useState(minBet);
  const addManualEntry = () => {
    if (!manualUser.trim()) return;
    const amt = Math.max(minBet, Math.min(maxBet, manualAmount || minBet));
    setMulti({
      _chatBets: { ...chatBets, [manualUser.trim()]: { amount: amt, time: Date.now() } },
    });
    setManualUser('');
  };

  const tabs = [
    { id: 'game', label: '🎮 Game' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'style', label: '🎨 Style' },
    { id: 'history', label: '📜 History' },
  ];

  const statusEmoji = {
    idle: '⏸ Idle',
    open: '🟢 Entry Open',
    spinning: '🎡 Spinning',
    result: '🏆 Result',
  };

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
            <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Point Wheel" />
          </label>

          {/* Status display */}
          <div className="cg-config__status-card">
            <div className="cg-config__status-row">
              <span className="cg-config__status-label">Status</span>
              <span className={`cg-config__status-badge cg-config__status-badge--${status}`}>
                {statusEmoji[status] || status}
              </span>
            </div>
            {(status === 'open' || status === 'result' || status === 'spinning') && (
              <>
                <div className="cg-config__status-row">
                  <span>👥 Players</span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>{totalPlayers}</span>
                </div>
                <div className="cg-config__status-row">
                  <span>💰 Total Pool</span>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>{totalPool.toLocaleString()} pts</span>
                </div>
              </>
            )}
            {status === 'result' && c._wheelResult && (
              <>
                <div className="cg-config__status-row">
                  <span>🎯 Outer</span>
                  <span style={{ fontWeight: 700, color: '#a78bfa' }}>{c._wheelResult.outerMulti}x</span>
                </div>
                <div className="cg-config__status-row">
                  <span>🎯 Inner</span>
                  <span style={{ fontWeight: 700, color: '#06b6d4' }}>{c._wheelResult.innerMulti}x</span>
                </div>
                <div className="cg-config__status-row">
                  <span>⚡ Combined</span>
                  <span style={{
                    fontWeight: 800, fontSize: 14,
                    color: c._wheelResult.totalMulti > 0 ? '#22c55e' : '#ef4444',
                  }}>
                    {c._wheelResult.totalMulti > 0 ? `${c._wheelResult.totalMulti}x` : 'NO WIN'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Game controls */}
          <div className="cg-config__actions">
            {status === 'idle' && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={openEntry}>
                🟢 Open Entry
              </button>
            )}
            {status === 'open' && (
              <>
                <button className="cg-config__btn cg-config__btn--accent" onClick={spinWheel}
                  disabled={totalPlayers === 0}
                  title={totalPlayers === 0 ? 'Need at least 1 player' : 'Spin both wheels!'}>
                  🎡 Spin Wheel
                </button>
                <button className="cg-config__btn cg-config__btn--muted" onClick={cancelEntry}>
                  ⏸ Cancel
                </button>
              </>
            )}
            {(status === 'result' || status === 'spinning') && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={resetGame}
                disabled={status === 'spinning'}>
                🔄 New Round
              </button>
            )}
          </div>

          {/* Payout processing indicator */}
          {payoutProcessing && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 8,
              background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)',
              fontSize: 12, color: '#facc15', fontWeight: 600, textAlign: 'center',
            }}>
              ⏳ Processing SE point payouts...
            </div>
          )}

          {/* Payout results */}
          {payoutResult && !payoutProcessing && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 8,
              background: payoutResult.totalMulti > 0
                ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${payoutResult.totalMulti > 0
                ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
              fontSize: 11, color: '#94a3b8',
            }}>
              <div style={{
                fontWeight: 700, fontSize: 12, marginBottom: 6,
                color: payoutResult.totalMulti > 0 ? '#22c55e' : '#ef4444',
              }}>
                {payoutResult.totalMulti > 0 ? '💰 Payouts Complete' : '💸 Bets Collected (No Win)'}
              </div>
              {payoutResult.winners.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>
                    Winners ({payoutResult.winners.length}):
                  </span>
                  {payoutResult.winners.slice(0, 10).map(w => (
                    <div key={w.name} style={{ paddingLeft: 8 }}>
                      {w.name}: <span style={{ color: '#22c55e' }}>+{w.amount.toLocaleString()}</span>
                      {w.balance != null && <span style={{ color: '#64748b' }}> (bal: {w.balance.toLocaleString()})</span>}
                    </div>
                  ))}
                  {payoutResult.winners.length > 10 && (
                    <div style={{ paddingLeft: 8, color: '#64748b' }}>
                      ...and {payoutResult.winners.length - 10} more
                    </div>
                  )}
                </div>
              )}
              {payoutResult.losers.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>
                    Deducted ({payoutResult.losers.length}):
                  </span>
                  {payoutResult.losers.slice(0, 10).map(l => (
                    <div key={l.name} style={{ paddingLeft: 8 }}>
                      {l.name}: <span style={{ color: '#f87171' }}>-{l.amount.toLocaleString()}</span>
                      {l.balance != null && <span style={{ color: '#64748b' }}> (bal: {l.balance.toLocaleString()})</span>}
                    </div>
                  ))}
                  {payoutResult.losers.length > 10 && (
                    <div style={{ paddingLeft: 8, color: '#64748b' }}>
                      ...and {payoutResult.losers.length - 10} more
                    </div>
                  )}
                </div>
              )}
              {payoutResult.errors.length > 0 && (
                <div>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                    ⚠️ Errors ({payoutResult.errors.length}):
                  </span>
                  {payoutResult.errors.map((e, i) => (
                    <div key={i} style={{ paddingLeft: 8, color: '#f59e0b' }}>{e.name}: {e.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual entry (for testing) */}
          {status === 'open' && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 8,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                ➕ Manual Entry (Testing)
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={manualUser} onChange={e => setManualUser(e.target.value)}
                  placeholder="Username" style={{
                    flex: 1, padding: '5px 8px', fontSize: 11, borderRadius: 4,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e2e8f0', outline: 'none',
                  }} />
                <input type="number" value={manualAmount} onChange={e => setManualAmount(parseInt(e.target.value) || minBet)}
                  style={{
                    width: 70, padding: '5px 8px', fontSize: 11, borderRadius: 4,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e2e8f0', outline: 'none',
                  }} />
                <button onClick={addManualEntry} style={{
                  padding: '5px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                  background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600,
                }}>Add</button>
              </div>
            </div>
          )}

          {/* Players list */}
          {(status === 'open' || status === 'result') && totalPlayers > 0 && (
            <div style={{ maxHeight: 160, overflow: 'auto', marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                👥 Participants ({totalPlayers})
              </div>
              {betEntries.map(([user, b]) => (
                <div key={user} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '2px 6px',
                  fontSize: 10, color: '#94a3b8', borderLeft: '2px solid #7c3aed',
                  marginBottom: 1, background: 'rgba(124,58,237,0.04)',
                }}>
                  <span>{user}</span>
                  <span style={{ color: '#a78bfa' }}>{(b.amount || 0).toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* Game settings */}
          <div style={{
            marginTop: 8, padding: '10px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>⚙️ Settings</div>
            <label className="cg-config__field">
              <span>No-Payout Chance (%)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min={0} max={95} step={5}
                  value={noPayout}
                  onChange={e => set('noPayoutChance', parseInt(e.target.value))}
                  style={{ flex: 1 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', minWidth: 35 }}>{noPayout}%</span>
              </div>
            </label>
            <label className="cg-config__field">
              <span>Base Payout (pts per 1x)</span>
              <input type="number" value={basePayout}
                onChange={e => set('basePayout', parseInt(e.target.value) || 100)} />
            </label>
            <label className="cg-config__field">
              <span>Min Entry</span>
              <input type="number" value={minBet}
                onChange={e => set('minBet', parseInt(e.target.value) || 10)} />
            </label>
            <label className="cg-config__field">
              <span>Max Entry</span>
              <input type="number" value={maxBet}
                onChange={e => set('maxBet', parseInt(e.target.value) || 10000)} />
            </label>
          </div>
        </div>
      )}

      {/* ═══ CHAT BETTING TAB ═══ */}
      {tab === 'chat' && (
        <div className="cg-config__section">
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>Chat Entry</h4>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.5 }}>
            Viewers type <b style={{ color: '#a78bfa' }}>!wheel</b> or <b style={{ color: '#a78bfa' }}>!spin</b> in chat to enter.
            Optionally add an amount: <b style={{ color: '#f59e0b' }}>!wheel 500</b>
          </p>

          {/* Chat betting toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: chatBettingEnabled ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${chatBettingEnabled ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 8, cursor: 'pointer', marginBottom: 8, transition: 'all 0.2s',
          }}>
            <input type="checkbox" checked={chatBettingEnabled}
              onChange={e => set('chatBettingEnabled', e.target.checked)}
              style={{ accentColor: '#22c55e' }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: chatBettingEnabled ? '#22c55e' : '#94a3b8' }}>
              {chatBettingEnabled ? '● Chat Entry Enabled' : '○ Chat Entry Disabled'}
            </span>
          </label>

          {/* SE Point payouts toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: c.pointPayoutsEnabled ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${c.pointPayoutsEnabled ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 8, cursor: 'pointer', marginBottom: 12, transition: 'all 0.2s',
            opacity: seConnected ? 1 : 0.5,
          }}>
            <input type="checkbox" checked={!!c.pointPayoutsEnabled}
              onChange={e => set('pointPayoutsEnabled', e.target.checked)}
              disabled={!seConnected}
              style={{ accentColor: '#a855f7' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: c.pointPayoutsEnabled && seConnected ? '#a855f7' : '#94a3b8' }}>
                {c.pointPayoutsEnabled && seConnected ? '● SE Point Payouts On' : '○ SE Point Payouts Off'}
              </span>
              <span style={{ fontSize: 10, color: '#64748b' }}>
                {seConnected
                  ? 'Win: bet × multiplier awarded. Lose: bet deducted.'
                  : '⚠️ Connect StreamElements in Profile first'}
              </span>
            </div>
          </label>

          {/* SE connection status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            borderRadius: 6, marginBottom: 12, fontSize: 11,
            background: seConnected ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${seConnected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
            color: seConnected ? '#22c55e' : '#f87171',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: seConnected ? '#22c55e' : '#ef4444' }} />
            <span style={{ fontWeight: 600 }}>
              StreamElements {seConnected
                ? `● Connected (${seAccount.se_username || seAccount.se_channel_id})`
                : '○ Not connected'}
            </span>
          </div>

          {/* Platform configs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {/* Twitch */}
            <div style={{
              background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: 8, padding: '8px 10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.twitchChannel ? '#a855f7' : '#333' }} />
                <span style={{ fontWeight: 600 }}>Twitch</span>
                <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <input type="checkbox" checked={!!c.twitchEnabled} onChange={e => set('twitchEnabled', e.target.checked)} style={{ accentColor: '#a855f7' }} />
                  On
                </label>
              </div>
              <input value={c.twitchChannel || ''} onChange={e => set('twitchChannel', e.target.value)}
                placeholder="Twitch channel name" style={{
                  width: '100%', marginTop: 6, padding: '5px 8px', fontSize: 11, borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e2e8f0', outline: 'none',
                }} />
              {chatStatus2.twitch && <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, marginTop: 4, display: 'block' }}>● Connected</span>}
            </div>

            {/* Kick */}
            <div style={{
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 8, padding: '8px 10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.kickChannelId ? '#22c55e' : '#333' }} />
                <span style={{ fontWeight: 600 }}>Kick</span>
                <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <input type="checkbox" checked={!!c.kickEnabled} onChange={e => set('kickEnabled', e.target.checked)} style={{ accentColor: '#22c55e' }} />
                  On
                </label>
              </div>
              <input value={c.kickChannelId || ''} onChange={e => set('kickChannelId', e.target.value)}
                placeholder="Kick chatroom ID" style={{
                  width: '100%', marginTop: 6, padding: '5px 8px', fontSize: 11, borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e2e8f0', outline: 'none',
                }} />
              {chatStatus2.kick && <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, marginTop: 4, display: 'block' }}>● Connected</span>}
            </div>
          </div>

          {!c.twitchChannel && !c.kickChannelId && chatBettingEnabled && (
            <p style={{ fontSize: 11, color: '#f59e0b', margin: '8px 0 0' }}>
              ⚠️ No platforms configured — add your Twitch channel or Kick chatroom ID above.
            </p>
          )}
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
              <span>Text</span>
              <input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} />
            </label>
          </div>

          {/* Info about wheel color customization */}
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 12px', lineHeight: 1.5 }}>
            Wheel segment colors are pre-configured per style. The accent color affects the pointer and result display.
          </p>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <div className="cg-config__section">
          {history.length === 0 ? (
            <p className="cg-config__hint">No spins yet. Start a game to see history here.</p>
          ) : (
            <div className="cg-config__history">
              {history.map((h, i) => (
                <div key={i} className="cg-config__history-row" style={{ flexDirection: 'column', gap: 2, padding: '6px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 800,
                      color: h.totalMulti > 0 ? '#22c55e' : '#ef4444',
                    }}>
                      {h.totalMulti > 0 ? `${h.totalMulti}x` : 'NO WIN'}
                    </span>
                    <span className="cg-config__history-time">{h.time}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#64748b' }}>
                    <span>Outer {h.outerMulti}x × Inner {h.innerMulti}x</span>
                    {h.players > 0 && <span>• {h.players} players</span>}
                    {h.pool > 0 && <span>• {h.pool.toLocaleString()} pts</span>}
                  </div>
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
