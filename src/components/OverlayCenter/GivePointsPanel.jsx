/**
 * GivePointsPanel.jsx — Award StreamElements points to a specific viewer
 * or all viewers currently in the Twitch chat.
 *
 * Lives inside the Overlay Control Center as a Community Games panel.
 * Connects to Twitch IRC (anonymous) to track unique chatters.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import useTwitchChat from '../../hooks/useTwitchChat';
import useTwitchChannel from '../../hooks/useTwitchChannel';

export default function GivePointsPanel({ allWidgets }) {
  /* ── StreamElements ── */
  let seCtx = null;
  try { seCtx = useStreamElements(); } catch { /* outside provider */ }
  const seAccount = seCtx?.seAccount;
  const seConnected = !!seAccount?.se_channel_id && !!seAccount?.se_jwt_token;

  /* ── Twitch channel auto-detected from login ── */
  const twitchChannel = useTwitchChannel();

  /* ── Track unique chatters (from Twitch IRC) ── */
  const chattersRef = useRef(new Map()); // username -> { displayName, lastSeen }
  const [chatters, setChatters] = useState([]);
  const [chatConnected, setChatConnected] = useState(false);

  const handleChatMessage = useCallback((msg) => {
    if (!msg.username) return;
    const key = msg.username.toLowerCase();
    chattersRef.current.set(key, {
      displayName: msg.username,
      lastSeen: Date.now(),
    });
    setChatConnected(true);
  }, []);

  useTwitchChat(twitchChannel || '', handleChatMessage);

  /* Refresh the visible chatters list every 5 s */
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      // Keep chatters seen in the last 30 minutes
      const active = [];
      for (const [key, val] of chattersRef.current) {
        if (now - val.lastSeen < 30 * 60 * 1000) {
          active.push({ username: key, displayName: val.displayName, lastSeen: val.lastSeen });
        } else {
          chattersRef.current.delete(key);
        }
      }
      active.sort((a, b) => b.lastSeen - a.lastSeen);
      setChatters(active);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  /* ── UI state ── */
  const [mode, setMode] = useState('single'); // 'single' | 'all'
  const [targetUser, setTargetUser] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [msg, setMsg] = useState(null); // { type: 'ok'|'err', text }
  const [search, setSearch] = useState('');

  const modifyPoints = async (username, pts) => {
    const res = await fetch(
      `https://api.streamelements.com/kappa/v2/points/${seAccount.se_channel_id}/${encodeURIComponent(username)}/${pts}`,
      { method: 'PUT', headers: { 'Authorization': `Bearer ${seAccount.se_jwt_token}`, 'Accept': 'application/json' } }
    );
    if (!res.ok) throw new Error(`SE API ${res.status} for ${username}`);
    return res.json();
  };

  const handleGiveSingle = async () => {
    const pts = parseInt(amount, 10);
    const user = targetUser.trim().toLowerCase();
    if (!user || !pts || pts === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const data = await modifyPoints(user, pts);
      setMsg({ type: 'ok', text: `${pts > 0 ? '+' : ''}${pts} points → ${user} (balance: ${data.newAmount ?? data.points ?? '?'})` });
      setTargetUser('');
      setAmount('');
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleGiveAll = async () => {
    const pts = parseInt(amount, 10);
    if (!pts || pts === 0 || chatters.length === 0) return;
    setBusy(true);
    setMsg(null);
    setProgress({ done: 0, total: chatters.length });
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < chatters.length; i++) {
      try {
        await modifyPoints(chatters[i].username, pts);
        ok++;
      } catch {
        fail++;
      }
      setProgress({ done: i + 1, total: chatters.length });
    }
    setMsg({ type: ok > 0 ? 'ok' : 'err', text: `Done — ${ok} awarded, ${fail} failed (${pts > 0 ? '+' : ''}${pts} each)` });
    setBusy(false);
    setAmount('');
  };

  const filteredChatters = search
    ? chatters.filter(c => c.displayName.toLowerCase().includes(search.toLowerCase()))
    : chatters;

  /* ── Styles (matches the dark-panel aesthetic of the control center) ── */
  const card = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  };
  const label = { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 };
  const input = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    background: 'rgba(0,0,0,0.3)',
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const btnPrimary = {
    padding: '9px 18px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 700,
    fontSize: 13,
    cursor: busy ? 'wait' : 'pointer',
    background: busy ? '#334155' : '#6366f1',
    color: '#fff',
    opacity: busy ? 0.6 : 1,
    transition: 'background 0.2s',
  };
  const chip = (active) => ({
    padding: '6px 14px',
    borderRadius: 99,
    border: active ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.12)',
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    color: active ? '#a5b4fc' : '#94a3b8',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: '#e2e8f0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        💰 Give Points
      </h2>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
        Award or deduct StreamElements points to a specific viewer or everyone in chat.
      </p>

      {/* SE Connection status */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: seConnected ? '#22c55e' : '#ef4444' }} />
        <span style={{ fontSize: 12, color: seConnected ? '#86efac' : '#fca5a5' }}>
          StreamElements {seConnected ? `Connected (${seAccount?.se_username || seAccount?.se_channel_id})` : 'Not connected'}
        </span>
        <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: chatConnected ? '#a855f7' : '#333' }} />
        <span style={{ fontSize: 12, color: chatConnected ? '#c4b5fd' : '#64748b' }}>
          {twitchChannel ? `Twitch: ${twitchChannel}` : 'No Twitch channel'}
          {chatConnected ? ` (${chatters.length} chatters)` : ''}
        </span>
      </div>

      {!seConnected && (
        <div style={{ ...card, background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <p style={{ fontSize: 12, color: '#fca5a5', margin: 0 }}>
            ⚠️ StreamElements not connected. Link your SE account in <b style={{ color: '#e2e8f0' }}>Profile</b> to use this feature.
          </p>
        </div>
      )}

      {seConnected && (
        <>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button style={chip(mode === 'single')} onClick={() => setMode('single')}>👤 Single Viewer</button>
            <button style={chip(mode === 'all')} onClick={() => setMode('all')}>👥 All Chatters</button>
          </div>

          {mode === 'single' && (
            <div style={card}>
              <div style={label}>Username</div>
              <input
                style={input}
                placeholder="Enter Twitch username…"
                value={targetUser}
                onChange={e => setTargetUser(e.target.value)}
              />

              {/* Quick-pick from chatters */}
              {chatters.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ ...label, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Active Chatters</span>
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}>({chatters.length})</span>
                  </div>
                  {chatters.length > 8 && (
                    <input
                      style={{ ...input, marginBottom: 6 }}
                      placeholder="Search chatters…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  )}
                  <div style={{
                    maxHeight: 150,
                    overflowY: 'auto',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}>
                    {filteredChatters.slice(0, 60).map(c => (
                      <button
                        key={c.username}
                        onClick={() => { setTargetUser(c.displayName); setSearch(''); }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: targetUser.toLowerCase() === c.username ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.08)',
                          background: targetUser.toLowerCase() === c.username ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                          color: '#c4b5fd',
                          fontSize: 11,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.displayName}
                      </button>
                    ))}
                    {filteredChatters.length > 60 && (
                      <span style={{ fontSize: 10, color: '#64748b', padding: '4px 6px' }}>+{filteredChatters.length - 60} more</span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ ...label, marginTop: 12 }}>Points Amount</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  style={{ ...input, flex: 1 }}
                  type="number"
                  placeholder="e.g. 500 or -100"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <button style={btnPrimary} disabled={busy || !targetUser.trim() || !amount} onClick={handleGiveSingle}>
                  {busy ? '…' : parseInt(amount, 10) < 0 ? 'Deduct' : 'Give'}
                </button>
              </div>
              {/* Quick amount buttons */}
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {[100, 500, 1000, 5000, 10000].map(n => (
                  <button key={n} onClick={() => setAmount(String(n))} style={{
                    padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)', color: '#86efac', fontSize: 11, cursor: 'pointer',
                  }}>+{n.toLocaleString()}</button>
                ))}
              </div>
            </div>
          )}

          {mode === 'all' && (
            <div style={card}>
              <div style={label}>Give to All Chatters ({chatters.length} active)</div>
              {chatters.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>
                  No chatters tracked yet. Make sure your Twitch channel is set in <b style={{ color: '#e2e8f0' }}>Profile</b>.
                  Chatters appear here as they type in chat.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      style={{ ...input, flex: 1 }}
                      type="number"
                      placeholder="Points per viewer (e.g. 500)"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                    <button style={btnPrimary} disabled={busy || !amount || chatters.length === 0} onClick={handleGiveAll}>
                      {busy ? `${progress.done}/${progress.total}` : 'Give All'}
                    </button>
                  </div>
                  {/* Quick amount buttons */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {[100, 500, 1000, 5000].map(n => (
                      <button key={n} onClick={() => setAmount(String(n))} style={{
                        padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)', color: '#86efac', fontSize: 11, cursor: 'pointer',
                      }}>+{n.toLocaleString()}</button>
                    ))}
                  </div>
                  {/* Preview list */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Will receive points:</div>
                    <div style={{ maxHeight: 100, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {chatters.slice(0, 40).map(c => (
                        <span key={c.username} style={{
                          padding: '2px 6px', borderRadius: 3,
                          background: 'rgba(255,255,255,0.04)', color: '#c4b5fd', fontSize: 10,
                        }}>{c.displayName}</span>
                      ))}
                      {chatters.length > 40 && <span style={{ fontSize: 10, color: '#64748b' }}>+{chatters.length - 40} more</span>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Progress bar for bulk */}
          {busy && mode === 'all' && progress.total > 0 && (
            <div style={{ ...card, padding: 8 }}>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  width: `${(progress.done / progress.total) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #818cf8, #6366f1)',
                  borderRadius: 99,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
                {progress.done} / {progress.total} viewers
              </div>
            </div>
          )}

          {/* Result message */}
          {msg && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 6,
              background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: msg.type === 'ok' ? '#86efac' : '#fca5a5',
              fontSize: 12,
              marginTop: 8,
            }}>
              {msg.text}
            </div>
          )}
        </>
      )}
    </div>
  );
}
