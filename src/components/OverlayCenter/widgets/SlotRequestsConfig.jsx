/**
 * SlotRequestsConfig.jsx — Config panel for Slot Requests widget.
 * Connects to Twitch IRC directly to listen for !sr commands.
 * Lets streamer manage the queue (mark played / clear).
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { SLOT_REQUESTS_STYLE_KEYS } from './styleKeysRegistry';

const FONT_OPTIONS = [
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Bebas Neue', cursive", label: 'Bebas Neue' },
  { value: "'Press Start 2P', cursive", label: 'Press Start 2P' },
];

const S = {
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' },
  hint: { fontSize: '0.7rem', color: '#64748b', margin: 0, lineHeight: 1.4 },
  code: {
    display: 'block', fontSize: '0.65rem', color: '#e2e8f0', background: 'rgba(0,0,0,0.3)',
    padding: '8px 10px', borderRadius: 6, wordBreak: 'break-all', cursor: 'pointer',
    lineHeight: 1.5, border: '1px solid rgba(255,255,255,0.06)',
  },
  btn: {
    padding: '6px 12px', fontSize: '0.76rem', borderRadius: 8, border: 'none',
    cursor: 'pointer', fontWeight: 600, transition: 'opacity 0.2s',
  },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  item: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
    background: 'rgba(255,255,255,0.04)', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  itemName: { fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', flex: 1 },
  itemBy: { fontSize: '0.68rem', color: '#64748b' },
};

export default function SlotRequestsConfig({ config, onChange }) {
  const { user } = useAuth();
  const c = config || {};
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ircStatus, setIrcStatus] = useState('off'); // off | connecting | live
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const [seConnectedForSr, setSeConnectedForSr] = useState(false);

  // Check if user has SE connection for the warning message
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('streamelements_connections')
          .select('se_channel_id, se_jwt_token')
          .eq('user_id', user.id)
          .single();
        setSeConnectedForSr(!!(data?.se_channel_id && data?.se_jwt_token));
      } catch { setSeConnectedForSr(false); }
    })();
  }, [user?.id]);

  const fetchQueue = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('slot_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (data) setRequests(data);
  }, [user]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  /* Realtime updates */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('slot-requests-config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_requests' }, () => {
        fetchQueue();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchQueue]);

  const currentStyle = c.displayStyle || 'v1';
  const { set } = makePerStyleSetters(onChange, c, currentStyle, SLOT_REQUESTS_STYLE_KEYS);

  /* ── Twitch IRC chat listener ── */
  useEffect(() => {
    const raw = c.twitchChannel;
    if (!raw || !user) { setIrcStatus('off'); return; }
    const channel = raw.trim().toLowerCase().replace(/^#/, '');
    if (!channel) { setIrcStatus('off'); return; }

    let ws;
    let alive = true;

    const connect = () => {
      if (!alive) return;
      setIrcStatus('connecting');
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send('PASS SCHMOOPIIE');
        ws.send('NICK justinfan' + Math.floor(Math.random() * 100000));
        ws.send('JOIN #' + channel);
      };

      ws.onmessage = async (event) => {
        const lines = event.data.split('\r\n');
        for (const line of lines) {
          if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
          if (line.includes(' 366 ')) setIrcStatus('live');
          // !sr handling is done by ProfileSection's global IRC listener
        }
      };

      ws.onclose = () => {
        if (alive) { setIrcStatus('off'); reconnectTimer.current = setTimeout(connect, 5000); }
      };
      ws.onerror = () => ws.close();
    };

    const debounce = setTimeout(connect, 800);

    return () => {
      alive = false;
      clearTimeout(debounce);
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [c.twitchChannel, user]);

  const markPlayed = async (id) => {
    await supabase.from('slot_requests').update({ status: 'played' }).eq('id', id);
    fetchQueue();
  };

  const removeRequest = async (id) => {
    await supabase.from('slot_requests').delete().eq('id', id);
    fetchQueue();
  };

  const clearAll = async () => {
    if (!user) return;
    setLoading(true);
    await supabase.from('slot_requests').delete().eq('user_id', user.id).eq('status', 'pending');
    setRequests([]);
    setLoading(false);
  };

  const statusDot = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 };
  const statusColors = { off: '#64748b', connecting: '#f59e0b', live: '#22c55e' };
  const statusLabels = { off: 'Not connected', connecting: 'Connecting…', live: 'Listening to chat' };

  return (
    <div style={S.section}>
      {/* Twitch Channel */}
      <div>
        <p style={S.label}>📺 Twitch Channel</p>
        <p style={S.hint}>Enter your Twitch channel name. The widget will listen for <strong style={{ color: '#e2e8f0' }}>!sr</strong> commands in chat automatically.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <input
            type="text"
            value={c.twitchChannel || ''}
            onChange={e => set('twitchChannel', e.target.value)}
            placeholder="your_channel_name"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, color: '#e2e8f0', padding: '6px 10px', fontSize: '0.78rem',
              outline: 'none',
            }}
          />
          <div style={{ ...statusDot, background: statusColors[ircStatus] }} title={statusLabels[ircStatus]} />
        </div>
        <p style={{ fontSize: '0.65rem', color: statusColors[ircStatus], margin: '4px 0 0', lineHeight: 1.3 }}>
          {statusLabels[ircStatus]}
        </p>
        {ircStatus === 'live' && (
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: '2px 0 0', lineHeight: 1.3 }}>
            Viewers type: <strong style={{ color: '#e2e8f0' }}>!sr Gates of Olympus</strong> — requests appear below instantly
          </p>
        )}
      </div>

      {/* Display options */}
      <div>
        <p style={S.label}>Display</p>

        {/* ── SE Points Cost ── */}
        <div style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={!!c.srSeEnabled}
              onChange={e => set('srSeEnabled', e.target.checked)}
            />
            <span style={{ fontWeight: 600 }}>💰 Require SE Points for !sr</span>
          </label>
          {c.srSeEnabled ? (
            <>
              <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '0 0 6px', lineHeight: 1.4 }}>
                Each !sr will cost the viewer SE points. If they don't have enough, the request is rejected.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0' }}>
                Cost per request:
                <input
                  type="number" min={1} max={1000000} value={c.srSeCost || 100}
                  onChange={e => set('srSeCost', Math.max(1, +e.target.value))}
                  style={{ width: 80, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f59e0b', padding: '4px 8px', fontSize: '0.78rem', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>points</span>
              </label>
              {!seConnectedForSr && (
                <p style={{ fontSize: '0.68rem', color: '#ef4444', margin: '6px 0 0', lineHeight: 1.4, fontWeight: 600 }}>
                  ⚠️ StreamElements not connected — go to Profile and connect SE first.
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              When disabled, all !sr requests are added to the queue for free.
            </p>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={c.showRequester !== false}
            onChange={e => set('showRequester', e.target.checked)}
          />
          Show who requested
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer', marginTop: 4 }}>
          <input
            type="checkbox"
            checked={c.showNumbers !== false}
            onChange={e => set('showNumbers', e.target.checked)}
          />
          Show queue numbers
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', marginTop: 6 }}>
          Max display:
          <input
            type="number" min={1} max={50} value={c.maxDisplay || 10}
            onChange={e => set('maxDisplay', Math.max(1, +e.target.value))}
            style={{ width: 50, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0', padding: '4px 6px', fontSize: '0.78rem' }}
          />
        </label>
      </div>

      {/* Typography */}
      <div>
        <p style={S.label}>🔤 Typography</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 6 }}>
          Font
          <select
            value={c.fontFamily || "'Poppins', sans-serif"}
            onChange={e => set('fontFamily', e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0', padding: '4px 6px', fontSize: '0.78rem' }}
          >
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 6 }}>
          Size
          <input type="range" min={8} max={24} step={1} value={c.fontSize || 14}
            onChange={e => set('fontSize', +e.target.value)}
            style={{ flex: 1, accentColor: '#f59e0b' }}
          />
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', minWidth: 30 }}>{c.fontSize || 14}px</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0' }}>
          Weight
          <select
            value={c.fontWeight || '600'}
            onChange={e => set('fontWeight', e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0', padding: '4px 6px', fontSize: '0.78rem' }}
          >
            <option value="400">Normal</option>
            <option value="600">Semi Bold</option>
            <option value="700">Bold</option>
            <option value="800">Extra Bold</option>
          </select>
        </label>
      </div>

      {/* Queue management */}
      <div>
        <div style={{ ...S.row, marginBottom: 6 }}>
          <p style={{ ...S.label, margin: 0, flex: 1 }}>📋 Queue ({requests.length})</p>
          {requests.length > 0 && (
            <button
              style={{ ...S.btn, background: 'rgba(248,113,113,0.15)', color: '#f87171' }}
              onClick={clearAll}
              disabled={loading}
            >
              {loading ? '...' : 'Clear All'}
            </button>
          )}
        </div>

        {requests.length === 0 && (
          <p style={S.hint}>No pending requests. Viewers can type !sr in chat.</p>
        )}

        {requests.map((r, i) => (
          <div key={r.id} style={{ ...S.item, marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f59e0b', minWidth: 20, textAlign: 'center' }}>#{i + 1}</span>
            {r.slot_image && (
              <img src={r.slot_image} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.itemName}>{r.slot_name}</div>
              {r.requested_by && r.requested_by !== 'anonymous' && (
                <div style={S.itemBy}>by {r.requested_by}</div>
              )}
            </div>
            <button
              style={{ ...S.btn, background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '4px 8px', fontSize: '0.7rem' }}
              onClick={() => markPlayed(r.id)}
              title="Mark as played"
            >
              ✓
            </button>
            <button
              style={{ ...S.btn, background: 'rgba(248,113,113,0.1)', color: '#f87171', padding: '4px 8px', fontSize: '0.7rem' }}
              onClick={() => removeRequest(r.id)}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
