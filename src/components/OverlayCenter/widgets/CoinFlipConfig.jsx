/**
 * CoinFlipConfig.jsx — Streamer control panel for the Coin Flip widget.
 * Instant-flip mode: each chat bet triggers an immediate flip + SE payout.
 * Commands: !bet heads/tails [amt], !heads, !tails, !flip, !cf, !coinflip
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useStreamElements } from '../../../context/StreamElementsContext';
import useTwitchChat from '../../../hooks/useTwitchChat';
import useKickChat from '../../../hooks/useKickChat';
import TabBar from './shared/TabBar';

export default function CoinFlipConfig({ config, onChange }) {
  const c = config || {};
  const set = (k, v) => onChange({ ...c, [k]: v });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [tab, setTab] = useState('game');

  /* ── Points manager state ── */
  const [pmUser, setPmUser] = useState('');
  const [pmAmount, setPmAmount] = useState('');
  const [pmBusy, setPmBusy] = useState(false);
  const [pmMsg, setPmMsg] = useState(null);

  /* ── StreamElements integration ── */
  let seCtx = null;
  try { seCtx = useStreamElements(); } catch { /* not inside provider — graceful fallback */ }
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

  const history = c.flipHistory || [];
  const chatBettingEnabled = !!c.chatBettingEnabled;

  /* ── Chat handler for config preview (noop – widget handles everything) ── */
  const handleChatMessage = useCallback(() => {}, []);

  const chatActive = chatBettingEnabled && !!c.twitchEnabled && !!c.twitchChannel;
  const kickActive = chatBettingEnabled && !!c.kickEnabled && !!c.kickChannelId;
  useTwitchChat(chatActive ? c.twitchChannel : '', handleChatMessage);
  useKickChat(kickActive ? c.kickChannelId : '', handleChatMessage);

  const [chatStatus2, setChatStatus2] = useState({ twitch: false, kick: false });
  useEffect(() => {
    setChatStatus2({ twitch: chatActive, kick: kickActive });
  }, [chatActive, kickActive]);

  /* ── Streamer Quick Flip (no bets, just animation) ── */
  const streamerFlip = () => {
    if (c.flipping) return;
    let result;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      result = arr[0] % 2 === 0 ? 'heads' : 'tails';
    } else {
      result = Math.random() < 0.5 ? 'heads' : 'tails';
    }
    setMulti({
      flipping: true, _flipStart: Date.now(),
      _prevResult: c.result || 'heads', result,
    });
    setTimeout(() => {
      const newEntry = {
        result, time: new Date().toLocaleTimeString(),
        user: 'streamer', side: result, amount: 0, won: true, streamerFlip: true,
      };
      setMulti({
        result, flipping: false,
        flipHistory: [newEntry, ...history].slice(0, 50),
      });
    }, 2800);
  };

  /* ── Points Manager helpers ── */
  const clearPmMsg = () => setTimeout(() => setPmMsg(null), 5000);

  const givePointsToUser = async (username, amount) => {
    if (!username || !amount) return;
    setPmBusy(true);
    const res = await modifyViewerPoints(username.trim().toLowerCase(), amount);
    if (res.success) {
      setPmMsg({ type: 'ok', text: `${amount > 0 ? '+' : ''}${amount.toLocaleString()} pts -> ${username} (bal: ${res.newBalance?.toLocaleString()})` });
    } else {
      setPmMsg({ type: 'err', text: `${username}: ${res.error}` });
    }
    setPmBusy(false);
    clearPmMsg();
  };

  const tabs = [
    { id: 'game', label: '🎮 Game' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'points', label: '💰 Points' },
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
            <span>Min Bet</span>
            <input type="number" value={c.minBet || 10} onChange={e => set('minBet', parseInt(e.target.value) || 10)} />
          </label>
          <label className="cg-config__field">
            <span>Max Bet</span>
            <input type="number" value={c.maxBet || 10000} onChange={e => set('maxBet', parseInt(e.target.value) || 10000)} />
          </label>
          <label className="cg-config__field">
            <span>Cooldown Between Flips (seconds)</span>
            <input type="number" value={c.flipCooldown ?? 5} onChange={e => set('flipCooldown', parseInt(e.target.value) || 5)} min={1} max={60} />
          </label>

          {/* Streamer Quick Flip */}
          <button
            className="cg-config__btn"
            style={{
              width: '100%', padding: '10px 0', marginTop: 4,
              background: 'rgba(168,85,247,0.12)', color: '#c084fc',
              border: '1px solid rgba(168,85,247,0.25)', fontWeight: 700,
            }}
            onClick={streamerFlip}
            disabled={!!c.flipping}
          >
            🎲 Quick Flip (Preview)
          </button>

          <p style={{ fontSize: 10, color: '#64748b', margin: '8px 0 0', lineHeight: 1.5 }}>
            Chat commands: <b style={{ color: '#facc15' }}>!bet heads 500</b>, <b style={{ color: '#60a5fa' }}>!tails 100</b>, <b style={{ color: '#a78bfa' }}>!flip heads</b>, <b style={{ color: '#a78bfa' }}>!cf tails</b>
          </p>
        </div>
      )}

      {/* ═══ CHAT TAB ═══ */}
      {tab === 'chat' && (
        <div className="cg-config__section">
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>Chat Betting</h4>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.5 }}>
            Viewers type <b style={{ color: '#facc15' }}>!bet heads 500</b> or <b style={{ color: '#60a5fa' }}>!tails</b> to instantly trigger a flip.
            Points are paid/deducted automatically.
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
                  ? 'Winners gain bet amount, losers lose bet amount'
                  : 'Connect StreamElements in Profile first'}
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

          {/* Platform status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
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

      {/* ═══ POINTS TAB ═══ */}
      {tab === 'points' && (
        <div className="cg-config__section">
          <h4 style={{ margin: '0 0 4px', fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>Points Manager</h4>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.5 }}>
            Give or take StreamElements points from a specific viewer.
          </p>

          {/* SE connection status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            borderRadius: 6, marginBottom: 12, fontSize: 11,
            background: seConnected ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${seConnected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
            color: seConnected ? '#22c55e' : '#f87171',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: seConnected ? '#22c55e' : '#ef4444' }} />
            <span style={{ fontWeight: 600 }}>
              StreamElements {seConnected ? '● Connected' : '○ Not connected — go to Profile → StreamElements'}
            </span>
          </div>

          {/* Single user section */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 10,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>👤 Single User</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ flex: 2, fontSize: 12 }}
                value={pmUser}
                onChange={e => setPmUser(e.target.value)}
                placeholder="Username"
              />
              <input
                style={{ flex: 1, fontSize: 12 }}
                type="number"
                value={pmAmount}
                onChange={e => setPmAmount(e.target.value)}
                placeholder="Amount"
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="cg-config__btn cg-config__btn--primary"
                style={{ flex: 1, padding: '8px 0' }}
                disabled={!seConnected || pmBusy || !pmUser || !pmAmount}
                onClick={() => givePointsToUser(pmUser, Math.abs(parseInt(pmAmount) || 0))}
              >
                ➕ Give
              </button>
              <button
                className="cg-config__btn"
                style={{
                  flex: 1, padding: '8px 0',
                  background: 'rgba(239,68,68,0.12)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
                disabled={!seConnected || pmBusy || !pmUser || !pmAmount}
                onClick={() => givePointsToUser(pmUser, -Math.abs(parseInt(pmAmount) || 0))}
              >
                ➖ Take
              </button>
            </div>
          </div>

          {/* Processing & result */}
          {pmBusy && (
            <div style={{ fontSize: 12, color: '#facc15', fontWeight: 600, textAlign: 'center', padding: 6 }}>
              ⏳ Processing...
            </div>
          )}
          {pmMsg && (
            <div style={{
              fontSize: 11, fontWeight: 600, padding: '8px 10px', borderRadius: 6,
              background: pmMsg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${pmMsg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: pmMsg.type === 'ok' ? '#4ade80' : '#f87171',
            }}>
              {pmMsg.text}
            </div>
          )}

          {!seConnected && (
            <p style={{ fontSize: 11, color: '#f59e0b', margin: '8px 0 0', lineHeight: 1.5 }}>
              ⚠️ Connect StreamElements in <b style={{ color: '#e2e8f0' }}>Profile</b> → StreamElements, then click <b style={{ color: '#e2e8f0' }}>Sync All</b> to enable points management.
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
            <p className="cg-config__hint">No flips yet. Chat commands will show results here.</p>
          ) : (
            <div className="cg-config__history">
              {history.map((h, i) => (
                <div key={i} className="cg-config__history-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`cg-config__history-result cg-config__history-result--${h.result}`}>
                    {h.result === 'heads' ? '🪙 H' : '🪙 T'}
                  </span>
                  {h.user && (
                    <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600, minWidth: 60 }}>{h.user}</span>
                  )}
                  {h.side && (
                    <span style={{ fontSize: 10, color: h.side === 'heads' ? '#facc15' : '#60a5fa', fontWeight: 600 }}>
                      {h.side === 'heads' ? 'H' : 'T'}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{(h.amount || h.pool || 0).toLocaleString()} pts</span>
                  {h.won != null && (
                    <span style={{ fontSize: 10, color: h.won ? '#22c55e' : '#f87171', fontWeight: 700 }}>
                      {h.won ? '✓ Won' : '✗ Lost'}
                    </span>
                  )}
                  {h.pool != null && h.totalBettors > 0 && (
                    <span style={{ fontSize: 10, color: '#22c55e' }}>
                      {h.winners}/{h.totalBettors} won
                    </span>
                  )}
                  <span className="cg-config__history-time" style={{ marginLeft: 'auto' }}>{h.time}</span>
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
