/**
 * CoinFlipConfig.jsx — Streamer control panel for the Coin Flip community game.
 * Start/stop bets, flip the coin, view participants, customize appearance.
 * Supports chat betting via !head / !tails (Twitch + Kick).
 * Integrates StreamElements points for real point deductions & payouts.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStreamElements } from '../../../context/StreamElementsContext';

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
    const ws = new WebSocket(`wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false`);
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

export default function CoinFlipConfig({ config, onChange }) {
  const c = config || {};
  const set = (k, v) => onChange({ ...c, [k]: v });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [tab, setTab] = useState('game');
  const [payoutProcessing, setPayoutProcessing] = useState(false);
  const [payoutResult, setPayoutResult] = useState(null); // { winners:[], losers:[], errors:[] }

  /* ── StreamElements integration ── */
  let seCtx = null;
  try { seCtx = useStreamElements(); } catch { /* not inside provider — graceful fallback */ }
  const seAccount = seCtx?.seAccount;
  const seConnected = !!seAccount?.se_channel_id && !!seAccount?.se_jwt_token;

  /** Modify any viewer's points using the streamer's SE credentials */
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

  /** Check a viewer's current point balance */
  const getViewerPoints = async (username) => {
    if (!seConnected) return null;
    try {
      const res = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seAccount.se_channel_id}/${username}`,
        { headers: { 'Authorization': `Bearer ${seAccount.se_jwt_token}`, 'Accept': 'application/json' } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.points ?? 0;
    } catch { return null; }
  };

  const status = c.gameStatus || 'idle';
  const chatBets = c._chatBets || {};
  const headsBettors = Object.entries(chatBets).filter(([, b]) => b.side === 'heads');
  const tailsBettors = Object.entries(chatBets).filter(([, b]) => b.side === 'tails');
  const betsHeads = headsBettors.reduce((s, [, b]) => s + b.amount, 0);
  const betsTails = tailsBettors.reduce((s, [, b]) => s + b.amount, 0);
  const totalPool = betsHeads + betsTails;
  const history = c.flipHistory || [];
  const pointPayoutsEnabled = !!c.pointPayoutsEnabled && seConnected;

  /* ── Refs for chat bet accumulation ── */
  const chatBetsRef = useRef(chatBets);
  const pendingBetsRef = useRef({});
  useEffect(() => { chatBetsRef.current = chatBets; }, [chatBets]);

  /* Flush pending chat bets to config every 1.5 seconds */
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

  /* ── Chat message handler — !head / !heads / !tails / !tail [amount] ── */
  const minBet = c.minBet || 10;
  const maxBet = c.maxBet || 10000;
  const chatBettingEnabled = !!c.chatBettingEnabled;
  const gameStatus = c.gameStatus || 'idle';

  const handleChatMessage = useCallback((msg) => {
    if (!chatBettingEnabled || gameStatus !== 'open') return;
    const text = (msg.message || '').trim().toLowerCase();
    /* Match: !head, !heads, !tails, !tail — optionally followed by amount */
    const match = text.match(/^!(heads?|tails?)\s*(\d*)$/);
    if (!match) return;

    const side = match[1].startsWith('head') ? 'heads' : 'tails';
    let amount = parseInt(match[2]) || minBet;
    amount = Math.max(minBet, Math.min(maxBet, amount));
    const user = msg.username;
    if (!user) return;

    /* One bet per user per round — first bet wins, ignore duplicates */
    if (chatBetsRef.current[user] || pendingBetsRef.current[user]) return;

    pendingBetsRef.current[user] = { side, amount, time: Date.now() };
  }, [chatBettingEnabled, gameStatus, minBet, maxBet]);

  /* ── Connect to chat platforms when bets are open ── */
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

  /* ── Process SE payouts after flip ── */
  const processPayouts = async (result) => {
    const bets = chatBetsRef.current;
    const entries = Object.entries(bets);
    if (entries.length === 0 || !pointPayoutsEnabled) return;

    setPayoutProcessing(true);
    const winners = [];
    const losers = [];
    const errors = [];

    /* Process all bets concurrently — losers get deducted, winners get awarded */
    const promises = entries.map(async ([username, bet]) => {
      if (bet.side === result) {
        // Winner: award +bet.amount (net profit — they keep their original + win same)
        const res = await modifyViewerPoints(username, bet.amount);
        if (res.success) {
          winners.push({ name: username, amount: bet.amount, balance: res.newBalance });
        } else {
          errors.push({ name: username, error: res.error, side: 'win' });
        }
      } else {
        // Loser: deduct -bet.amount
        const res = await modifyViewerPoints(username, -bet.amount);
        if (res.success) {
          losers.push({ name: username, amount: bet.amount, balance: res.newBalance });
        } else {
          errors.push({ name: username, error: res.error, side: 'lose' });
        }
      }
    });

    await Promise.allSettled(promises);
    setPayoutResult({ winners, losers, errors });
    setPayoutProcessing(false);
  };

  /* ── Game actions ── */
  const openBets = () => {
    setPayoutResult(null);
    setMulti({
      gameStatus: 'open', result: null, _chatBets: {}, flipping: false,
      lastWinner: '', lastWinAmount: 0, _prevResult: c.result || 'heads',
    });
  };
  const closeBets = () => setMulti({ gameStatus: 'idle', _chatBets: {} });

  const flipCoin = () => {
    /* True 50/50 using crypto-quality randomness when available */
    let result;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      result = arr[0] % 2 === 0 ? 'heads' : 'tails';
    } else {
      result = Math.random() < 0.5 ? 'heads' : 'tails';
    }
    setMulti({
      gameStatus: 'flipping',
      flipping: true,
      _flipStart: Date.now(),
      _prevResult: c.result || 'heads',
    });
    // After animation, reveal result & process payouts
    setTimeout(async () => {
      const allBets = chatBetsRef.current;
      const winnersList = Object.entries(allBets)
        .filter(([, b]) => b.side === result)
        .map(([name, b]) => ({ name, amount: b.amount }));
      const newEntry = {
        result,
        time: new Date().toLocaleTimeString(),
        pool: totalPool,
        winners: winnersList.length,
        totalBettors: Object.keys(allBets).length,
      };
      setMulti({
        result,
        flipping: false,
        gameStatus: 'result',
        flipHistory: [newEntry, ...history].slice(0, 30),
      });
      // Process SE point payouts if enabled
      if (pointPayoutsEnabled && Object.keys(allBets).length > 0) {
        await processPayouts(result);
      }
    }, 2800);
  };

  const resetGame = () => {
    setPayoutResult(null);
    setMulti({ gameStatus: 'idle', result: null, flipping: false, _chatBets: {} });
  };

  const tabs = [
    { id: 'game', label: '🎮 Game' },
    { id: 'chat', label: '💬 Chat' },
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
                  <span>🟡 Heads ({headsBettors.length})</span>
                  <span style={{ color: '#facc15', fontWeight: 700 }}>{betsHeads.toLocaleString()} pts</span>
                </div>
                <div className="cg-config__status-row">
                  <span>🔵 Tails ({tailsBettors.length})</span>
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
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
              fontSize: 11, color: '#94a3b8',
            }}>
              <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 12, marginBottom: 6 }}>💰 Payouts Complete</div>
              {payoutResult.winners.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>Winners ({payoutResult.winners.length}):</span>
                  {payoutResult.winners.slice(0, 10).map(w => (
                    <div key={w.name} style={{ paddingLeft: 8 }}>
                      {w.name}: <span style={{ color: '#22c55e' }}>+{w.amount.toLocaleString()}</span>
                      {w.balance != null && <span style={{ color: '#64748b' }}> (bal: {w.balance.toLocaleString()})</span>}
                    </div>
                  ))}
                  {payoutResult.winners.length > 10 && <div style={{ paddingLeft: 8, color: '#64748b' }}>...and {payoutResult.winners.length - 10} more</div>}
                </div>
              )}
              {payoutResult.losers.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>Losers ({payoutResult.losers.length}):</span>
                  {payoutResult.losers.slice(0, 10).map(l => (
                    <div key={l.name} style={{ paddingLeft: 8 }}>
                      {l.name}: <span style={{ color: '#f87171' }}>-{l.amount.toLocaleString()}</span>
                      {l.balance != null && <span style={{ color: '#64748b' }}> (bal: {l.balance.toLocaleString()})</span>}
                    </div>
                  ))}
                  {payoutResult.losers.length > 10 && <div style={{ paddingLeft: 8, color: '#64748b' }}>...and {payoutResult.losers.length - 10} more</div>}
                </div>
              )}
              {payoutResult.errors.length > 0 && (
                <div>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚠️ Errors ({payoutResult.errors.length}):</span>
                  {payoutResult.errors.map((e, i) => (
                    <div key={i} style={{ paddingLeft: 8, color: '#f59e0b' }}>{e.name}: {e.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}

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

      {/* ═══ CHAT BETTING TAB ═══ */}
      {tab === 'chat' && (
        <div className="cg-config__section">
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>Chat Betting</h4>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.5 }}>
            Viewers type <b style={{ color: '#facc15' }}>!head</b> or <b style={{ color: '#60a5fa' }}>!tails</b> in chat to place bets.
            Optionally add an amount: <b style={{ color: '#a78bfa' }}>!head 500</b>
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
              style={{ accentColor: '#22c55e' }}
            />
            <span style={{ fontWeight: 600, fontSize: 13, color: chatBettingEnabled ? '#22c55e' : '#94a3b8' }}>
              {chatBettingEnabled ? '● Chat Betting Enabled' : '○ Chat Betting Disabled'}
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
              style={{ accentColor: '#a855f7' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: c.pointPayoutsEnabled && seConnected ? '#a855f7' : '#94a3b8' }}>
                {c.pointPayoutsEnabled && seConnected ? '● SE Point Payouts On' : '○ SE Point Payouts Off'}
              </span>
              <span style={{ fontSize: 10, color: '#64748b' }}>
                {seConnected
                  ? 'Losers lose their bet, winners gain +bet amount'
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
              StreamElements {seConnected ? `● Connected (${seAccount.se_username || seAccount.se_channel_id})` : '○ Not connected'}
            </span>
          </div>

          {/* Platform status (synced from Profile) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {/* Twitch */}
            <div style={{
              background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: 8, padding: '8px 10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.twitchChannel ? '#a855f7' : '#333' }} />
                <span style={{ fontWeight: 600 }}>Twitch</span>
                {c.twitchChannel && <span style={{ fontSize: 10, color: '#a855f7', marginLeft: 4 }}>{c.twitchChannel}</span>}
                <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <input type="checkbox" checked={!!c.twitchEnabled} onChange={e => set('twitchEnabled', e.target.checked)} style={{ accentColor: '#a855f7' }} />
                  On
                </label>
              </div>
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
                {c.kickChannelId && <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 4 }}>{c.kickChannelId}</span>}
                <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <input type="checkbox" checked={!!c.kickEnabled} onChange={e => set('kickEnabled', e.target.checked)} style={{ accentColor: '#22c55e' }} />
                  On
                </label>
              </div>
              {chatStatus2.kick && <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, marginTop: 4, display: 'block' }}>● Connected</span>}
            </div>

            {/* Profile link */}
            <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
              🔗 Twitch &amp; Kick channels are managed in <b style={{ color: '#a78bfa' }}>Profile</b>. Click <b style={{ color: '#a78bfa' }}>Sync All</b> to update.
            </p>
          </div>

          {/* Live bets display */}
          {(status === 'open' || status === 'result') && Object.keys(chatBets).length > 0 && (
            <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                Live Bets ({Object.keys(chatBets).length})
              </div>
              {/* Heads bets */}
              {headsBettors.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: '#facc15', fontWeight: 600, marginBottom: 3 }}>
                    HEADS ({headsBettors.length})
                  </div>
                  {headsBettors.map(([user, b]) => (
                    <div key={user} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '2px 6px',
                      fontSize: 10, color: '#94a3b8', borderLeft: '2px solid #facc15',
                      marginBottom: 1, background: 'rgba(250,204,21,0.04)',
                    }}>
                      <span>{user}</span>
                      <span style={{ color: '#facc15' }}>{b.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Tails bets */}
              {tailsBettors.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600, marginBottom: 3 }}>
                    TAILS ({tailsBettors.length})
                  </div>
                  {tailsBettors.map(([user, b]) => (
                    <div key={user} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '2px 6px',
                      fontSize: 10, color: '#94a3b8', borderLeft: '2px solid #60a5fa',
                      marginBottom: 1, background: 'rgba(96,165,250,0.04)',
                    }}>
                      <span>{user}</span>
                      <span style={{ color: '#60a5fa' }}>{b.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!c.twitchChannel && !c.kickChannelId && chatBettingEnabled && (
            <p style={{ fontSize: 11, color: '#f59e0b', margin: '8px 0 0' }}>
              ⚠️ No platforms configured — set your Twitch/Kick channels in <b style={{ color: '#e2e8f0' }}>Profile</b> and click <b style={{ color: '#e2e8f0' }}>Sync All</b>.
            </p>
          )}
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
                  {h.totalBettors > 0 && (
                    <span style={{ fontSize: 10, color: '#22c55e' }}>
                      {h.winners}/{h.totalBettors} won
                    </span>
                  )}
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
