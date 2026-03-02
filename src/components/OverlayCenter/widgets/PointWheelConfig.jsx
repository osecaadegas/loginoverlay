/**
 * PointWheelConfig.jsx — Streamer control panel for the Point Wheel community game.
 * Streamer sets a point amount → viewers join via !wheel → spin → random outcome pays all participants.
 * Integrates StreamElements points for real payouts.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStreamElements } from '../../../context/StreamElementsContext';
import useTwitchChat from '../../../hooks/useTwitchChat';
import useKickChat from '../../../hooks/useKickChat';
import TabBar from './shared/TabBar';

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
  const participants = c._participants || {};
  const participantList = Object.keys(participants);
  const totalPlayers = participantList.length;
  const history = c.spinHistory || [];
  const noPayout = c.noPayoutChance ?? 70; // percentage
  const pointPayoutsEnabled = !!c.pointPayoutsEnabled && seConnected;
  const basePayout = c.basePayout || 100; // points each participant wins per 1x

  /* ── Refs for chat participant accumulation ── */
  const participantsRef = useRef(participants);
  const pendingJoinsRef = useRef({});
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  /* Flush pending joins every 1.5s */
  useEffect(() => {
    const timer = setInterval(() => {
      const pending = pendingJoinsRef.current;
      if (Object.keys(pending).length > 0) {
        const merged = { ...participantsRef.current, ...pending };
        pendingJoinsRef.current = {};
        onChange({ ...config, _participants: merged });
      }
    }, 1500);
    return () => clearInterval(timer);
  });

  /* ── Chat message handler — !wheel or !spin (no amount needed) ── */
  const chatBettingEnabled = !!c.chatBettingEnabled;
  const gameStatus = c.gameStatus || 'idle';

  const handleChatMessage = useCallback((msg) => {
    if (!chatBettingEnabled || gameStatus !== 'open') return;
    const text = (msg.message || '').trim().toLowerCase();
    if (!/^!(wheel|spin)/.test(text)) return;
    const user = msg.username;
    if (!user) return;
    if (participantsRef.current[user] || pendingJoinsRef.current[user]) return;
    pendingJoinsRef.current[user] = { time: Date.now() };
  }, [chatBettingEnabled, gameStatus]);

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
    const joined = participantsRef.current;
    const usernames = Object.keys(joined);
    if (usernames.length === 0 || !pointPayoutsEnabled) return;

    setPayoutProcessing(true);
    const winners = [];
    const errors = [];

    if (totalMulti > 0) {
      /* Everyone wins! Give each participant basePayout × totalMulti */
      const payout = Math.floor(basePayout * totalMulti);
      const promises = usernames.map(async (username) => {
        const res = await modifyViewerPoints(username, payout);
        if (res.success) {
          winners.push({ name: username, amount: payout, balance: res.newBalance });
        } else {
          errors.push({ name: username, error: res.error });
        }
      });
      await Promise.allSettled(promises);
    }
    /* No win = no loss — viewers don't risk anything */

    setPayoutResult({ winners, losers: [], errors, totalMulti });
    setPayoutProcessing(false);
  };

  /* ── Game actions ── */
  const openEntry = () => {
    setPayoutResult(null);
    setMulti({
      gameStatus: 'open',
      _participants: {},
      _spinning: false,
      _wheelResult: null,
    });
  };

  const cancelEntry = () => setMulti({ gameStatus: 'idle', _participants: {} });

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
      const allParticipants = participantsRef.current;
      const newEntry = {
        outerMulti: result.outerMulti,
        innerMulti: result.innerMulti,
        totalMulti: result.totalMulti,
        payout,
        players: Object.keys(allParticipants).length,
        time: new Date().toLocaleTimeString(),
      };

      setMulti({
        _spinning: false,
        gameStatus: 'result',
        _wheelResult: wheelResult,
        spinHistory: [newEntry, ...history].slice(0, 50),
      });

      if (pointPayoutsEnabled && Object.keys(allParticipants).length > 0) {
        await processPayouts(result.totalMulti);
      }
    }, 6000);
  };

  const resetGame = () => {
    setPayoutResult(null);
    setMulti({
      gameStatus: 'idle',
      _spinning: false,
      _participants: {},
      _wheelResult: null,
    });
  };

  /* ── Quick-add manual entry (for testing) ── */
  const [manualUser, setManualUser] = useState('');
  const addManualEntry = () => {
    if (!manualUser.trim()) return;
    setMulti({
      _participants: { ...participants, [manualUser.trim()]: { time: Date.now() } },
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
      <TabBar tabs={tabs} active={tab} onChange={setTab} variant="cg" />

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
              <div className="cg-config__status-row">
                <span>👥 Joined</span>
                <span style={{ fontWeight: 700, color: '#22c55e' }}>{totalPlayers}</span>
              </div>
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
                {payoutResult.totalMulti > 0 ? '💰 Payouts Complete' : '🎡 No Win — No Points Lost'}
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
              {participantList.map(user => (
                <div key={user} style={{
                  padding: '2px 6px',
                  fontSize: 10, color: '#94a3b8', borderLeft: '2px solid #7c3aed',
                  marginBottom: 1, background: 'rgba(124,58,237,0.04)',
                }}>
                  {user}
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
              <span>Points per Win (per 1x)</span>
              <input type="number" value={basePayout}
                onChange={e => set('basePayout', parseInt(e.target.value) || 100)} />
            </label>
            <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0', lineHeight: 1.4 }}>
              Each participant gets <b style={{ color: '#f59e0b' }}>points × multiplier</b> on a win. No loss on 0x.
            </p>
          </div>
        </div>
      )}

      {/* ═══ CHAT BETTING TAB ═══ */}
      {tab === 'chat' && (
        <div className="cg-config__section">
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>Chat Entry</h4>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.5 }}>
            Viewers type <b style={{ color: '#a78bfa' }}>!wheel</b> or <b style={{ color: '#a78bfa' }}>!spin</b> in chat to join.
            No bet needed — the streamer sets the points.
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
                  ? 'Win: points × multiplier awarded to all participants. No risk for viewers.'
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
                    {h.payout > 0 && <span>• {h.payout.toLocaleString()} pts each</span>}
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
