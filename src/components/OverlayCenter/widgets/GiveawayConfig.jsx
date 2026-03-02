import React, { useState, useEffect, useRef, useCallback } from 'react';
import useTwitchChat from '../../../hooks/useTwitchChat';
import useKickChat from '../../../hooks/useKickChat';
import TabBar from './shared/TabBar';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
];

/* ─── Giveaway Config Panel ─── */
export default function GiveawayConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [activeTab, setActiveTab] = useState('setup');
  const [confirmClear, setConfirmClear] = useState(false);
  const [chatStatus, setChatStatus] = useState({ twitch: false, kick: false });

  // Navbar sync
  const nb = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!nb) return;
    setMulti({
      bgColor: nb.bgColor || '#111318',
      accentColor: nb.accentColor || '#7c3aed',
      textColor: nb.textColor || '#f1f5f9',
      mutedColor: nb.mutedColor || '#94a3b8',
      borderColor: nb.borderColor || nb.accentColor || '#7c3aed',
      fontFamily: nb.fontFamily || "'Inter', sans-serif",
    });
  };

  const participants = c.participants || [];
  const participantsRef = useRef(new Set(participants));
  const pendingRef = useRef([]);
  const flushTimer = useRef(null);

  // Keep participantsRef in sync with config
  useEffect(() => {
    participantsRef.current = new Set(c.participants || []);
  }, [c.participants]);

  // Flush pending participants to config every 2 seconds
  useEffect(() => {
    flushTimer.current = setInterval(() => {
      if (pendingRef.current.length > 0) {
        const current = c.participants || [];
        const merged = [...new Set([...current, ...pendingRef.current])];
        pendingRef.current = [];
        if (merged.length !== current.length) {
          onChange({ ...c, participants: merged });
        }
      }
    }, 2000);
    return () => clearInterval(flushTimer.current);
  });

  const keyword = (c.keyword || '').toLowerCase().trim();
  const isActive = !!c.isActive && !!keyword;

  // Chat message handler — check for keyword match
  const handleMessage = useCallback((msg) => {
    if (!keyword) return;
    const text = (msg.message || '').trim().toLowerCase();
    // Match "!keyword" exactly (with optional trailing whitespace)
    if (text === `!${keyword}` || text.startsWith(`!${keyword} `)) {
      const name = msg.username;
      if (name && !participantsRef.current.has(name)) {
        participantsRef.current.add(name);
        pendingRef.current.push(name);
      }
    }
  }, [keyword]);

  // Connect to platforms when giveaway is active
  useTwitchChat(isActive && c.twitchEnabled ? c.twitchChannel : '', handleMessage);
  useKickChat(isActive && c.kickEnabled ? c.kickChannelId : '', handleMessage);

  // Track connection status
  useEffect(() => {
    setChatStatus({
      twitch: isActive && !!c.twitchEnabled && !!c.twitchChannel,
      kick: isActive && !!c.kickEnabled && !!c.kickChannelId,
    });
  }, [isActive, c.twitchEnabled, c.twitchChannel, c.kickEnabled, c.kickChannelId]);

  // Draw a random winner
  const drawWinner = () => {
    const list = c.participants || [];
    if (list.length === 0) return;
    const idx = Math.floor(Math.random() * list.length);
    set('winner', list[idx]);
  };

  // Clear all entries
  const clearEntries = () => {
    setMulti({ participants: [], winner: '' });
    participantsRef.current.clear();
    pendingRef.current = [];
    setConfirmClear(false);
  };

  const TABS = [
    { id: 'setup', label: '🎁 Setup' },
    { id: 'platforms', label: '📡 Chat' },
    { id: 'participants', label: `👥 Entries (${participants.length})` },
    { id: 'style', label: '🎨 Style' },
  ];

  return (
    <div className="nb-config">
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* ═══════ SETUP TAB ═══════ */}
      {activeTab === 'setup' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Giveaway Setup</h4>
          <label className="nb-field">
            <span>Title</span>
            <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Giveaway Title" />
          </label>
          <label className="nb-field">
            <span>Prize</span>
            <input value={c.prize || ''} onChange={e => set('prize', e.target.value)} placeholder="€500 Bonus" />
          </label>
          <label className="nb-field">
            <span>Chat Keyword (without !)</span>
            <input value={c.keyword || ''} onChange={e => set('keyword', e.target.value)} placeholder="giveaway" />
          </label>
          <p className="oc-config-hint" style={{ fontSize: 11, marginTop: -4 }}>
            Viewers type <strong>!{c.keyword || 'keyword'}</strong> in chat to enter the giveaway.
          </p>
          <label className="nb-field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input type="checkbox" checked={!!c.isActive} onChange={e => set('isActive', e.target.checked)} />
            <span style={{ fontWeight: 600 }}>Giveaway Active</span>
          </label>
          {isActive && (
            <div style={{
              background: '#22c55e18', border: '1px solid #22c55e44', borderRadius: 8,
              padding: '8px 12px', fontSize: 11, color: '#22c55e', marginTop: 4,
            }}>
              ✅ Giveaway is LIVE — monitoring chat for <strong>!{keyword}</strong>
              {!chatStatus.twitch && !chatStatus.kick && (
                <div style={{ color: '#f59e0b', marginTop: 4 }}>
                  ⚠️ No chat platforms connected. Go to the Chat tab to set up Twitch or Kick.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════ PLATFORMS TAB ═══════ */}
      {activeTab === 'platforms' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Chat Platforms</h4>
          <p className="oc-config-hint" style={{ marginBottom: 10, fontSize: 11 }}>
            Channel names are managed in your <b>Profile</b>. Click <b>Sync All</b> there to update.
          </p>

          {/* Twitch */}
          <div style={{
            background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)',
            borderRadius: 8, padding: 10, marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.twitchChannel ? '#a855f7' : '#333' }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Twitch</span>
              {c.twitchChannel ? (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#a855f7', fontWeight: 600 }}>{c.twitchChannel}</span>
              ) : (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>Set in Profile</span>
              )}
              {chatStatus.twitch && <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, marginLeft: 4 }}>● Live</span>}
            </div>
          </div>

          {/* Kick */}
          <div style={{
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 8, padding: 10, marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.kickChannelId ? '#22c55e' : '#333' }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Kick</span>
              {c.kickChannelId ? (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22c55e', fontWeight: 600 }}>{c.kickChannelId}</span>
              ) : (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>Set in Profile</span>
              )}
              {chatStatus.kick && <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, marginLeft: 4 }}>● Live</span>}
            </div>
          </div>

          {!c.twitchChannel && !c.kickChannelId && (
            <p className="oc-config-hint" style={{ fontSize: 11, color: '#f59e0b' }}>
              ⚠️ No platforms configured — go to Profile and add your channels, then Sync.
            </p>
          )}
        </div>
      )}

      {/* ═══════ PARTICIPANTS TAB ═══════ */}
      {activeTab === 'participants' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Participants ({participants.length})</h4>

          {/* Draw Winner Button */}
          <button
            onClick={drawWinner}
            disabled={participants.length === 0}
            style={{
              width: '100%', padding: '12px 16px', marginBottom: 8,
              background: participants.length > 0 ? 'linear-gradient(135deg, #9346ff, #6d28d9)' : '#333',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 700, cursor: participants.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s', opacity: participants.length > 0 ? 1 : 0.5,
            }}
          >
            🎲 Draw Random Winner
          </button>

          {/* Winner display */}
          {c.winner && (
            <div style={{
              background: '#9346ff22', border: '1px solid #9346ff55', borderRadius: 8,
              padding: '10px 14px', marginBottom: 8, textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>🎉 Winner</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#c4b5fd', marginTop: 2 }}>{c.winner}</div>
              <button
                onClick={() => set('winner', '')}
                style={{
                  marginTop: 6, padding: '4px 12px', fontSize: 10,
                  background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                  cursor: 'pointer',
                }}>
                Clear Winner
              </button>
            </div>
          )}

          {/* Participant list */}
          {participants.length > 0 ? (
            <div style={{
              maxHeight: 220, overflowY: 'auto', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
              padding: 6, marginBottom: 8,
            }}>
              {participants.map((name, i) => (
                <div key={i} style={{
                  padding: '4px 10px', fontSize: 12, color: '#e2e8f0',
                  display: 'flex', alignItems: 'center', gap: 6,
                  borderRadius: 4,
                  background: name === c.winner ? '#9346ff22' : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}>
                  <span style={{ color: '#64748b', fontSize: 10, minWidth: 24 }}>#{i + 1}</span>
                  <span style={{ fontWeight: name === c.winner ? 700 : 400, color: name === c.winner ? '#c4b5fd' : '#e2e8f0' }}>{name}</span>
                  {name === c.winner && <span style={{ marginLeft: 'auto', fontSize: 10 }}>🏆</span>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: 20, textAlign: 'center', color: '#64748b', fontSize: 12,
              background: 'rgba(255,255,255,0.02)', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8,
            }}>
              {isActive ? '⏳ Waiting for entries...' : '📋 No entries yet. Activate the giveaway to start.'}
            </div>
          )}

          {/* Clear entries */}
          {participants.length > 0 && (
            confirmClear ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={clearEntries} style={{
                  flex: 1, padding: '8px', background: '#ef4444', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Confirm Clear All</button>
                <button onClick={() => setConfirmClear(false)} style={{
                  flex: 1, padding: '8px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} style={{
                width: '100%', padding: '8px', background: 'rgba(239,68,68,0.15)', color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
              }}>🗑️ Clear All Entries</button>
            )
          )}
        </div>
      )}

      {/* ═══════ STYLE TAB ═══════ */}
      {activeTab === 'style' && (
        <div className="nb-section">
          {nb && (
            <button className="oc-btn oc-btn--sm oc-btn--primary" style={{ width: '100%', marginBottom: 12 }} onClick={syncFromNavbar}>
              🔗 Sync Colors from Navbar
            </button>
          )}

          <h4 className="nb-subtitle">Colors</h4>
          <label className="nb-field">
            <span>Background</span>
            <input type="color" value={c.bgColor || '#13151e'} onChange={e => set('bgColor', e.target.value)} />
          </label>
          <label className="nb-field">
            <span>Accent</span>
            <input type="color" value={c.accentColor || '#9346ff'} onChange={e => set('accentColor', e.target.value)} />
          </label>
          <label className="nb-field">
            <span>Text</span>
            <input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} />
          </label>
          <label className="nb-field">
            <span>Muted Text</span>
            <input type="color" value={c.mutedColor || '#94a3b8'} onChange={e => set('mutedColor', e.target.value)} />
          </label>
          <label className="nb-field">
            <span>Card / Border</span>
            <input type="color" value={c.borderColor || '#1e293b'} onChange={e => set('borderColor', e.target.value)} />
          </label>

          <h4 className="nb-subtitle">Font</h4>
          <label className="nb-field">
            <span>Font Family</span>
            <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>

          <h4 className="nb-subtitle">Custom CSS</h4>
          <textarea
            className="oc-widget-css-input"
            value={c.custom_css || ''}
            onChange={e => set('custom_css', e.target.value)}
            rows={4}
            placeholder={`/* custom CSS for this widget */`}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}
