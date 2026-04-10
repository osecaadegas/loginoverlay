/**
 * SlotRequestsConfig.jsx — Config panel for the Slot Requests widget.
 *
 * Sections:
 *   1. Twitch Channel + IRC status
 *   2. Command Settings (trigger, cooldown, max queue, dupe prevention)
 *   3. StreamElements Points Integration
 *   4. Custom Chat Messages
 *   5. Display Options (show requester, show numbers, font, colors)
 *   6. Queue Management (list, mark played, reject/refund, clear all)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { SLOT_REQUESTS_STYLE_KEYS } from './styleKeysRegistry';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Bebas Neue', cursive", label: 'Bebas Neue' },
  { value: "'Press Start 2P', cursive", label: 'Press Start 2P' },
];

/* ── Reusable inline styles ── */
const S = {
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', margin: 0 },
  hint: { fontSize: '0.68rem', color: '#64748b', margin: 0, lineHeight: 1.4 },
  card: (accent) => ({
    marginBottom: 10, padding: '10px 12px',
    background: `rgba(${accent}, 0.06)`,
    border: `1px solid rgba(${accent}, 0.15)`,
    borderRadius: 8,
  }),
  input: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: '#e2e8f0', padding: '6px 10px', fontSize: '0.78rem', outline: 'none',
  },
  inputFull: {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: '#e2e8f0', padding: '5px 8px', fontSize: '0.72rem', outline: 'none',
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
};

function ColorPicker({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#e2e8f0' }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 22, height: 22, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
      {label}
    </label>
  );
}

export default function SlotRequestsConfig({ config, onChange }) {
  const { user } = useAuth();
  const c = config || {};
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seConnected, setSeConnected] = useState(false);

  /* ── Check SE connection status ── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('streamelements_connections')
          .select('se_channel_id, se_jwt_token')
          .eq('user_id', user.id)
          .single();
        setSeConnected(!!(data?.se_channel_id && data?.se_jwt_token));
      } catch { setSeConnected(false); }
    })();
  }, [user?.id]);

  /* ── Fetch queue ── */
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

  /* ── Realtime updates ── */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('sr-config-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_requests' }, () => fetchQueue())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchQueue]);

  const currentStyle = c.displayStyle || 'v1_minimal';
  const { set } = makePerStyleSetters(onChange, c, currentStyle, SLOT_REQUESTS_STYLE_KEYS);

  /* ── Actions ── */
  const markPlayed = async (id) => {
    await supabase.from('slot_requests').update({ status: 'played' }).eq('id', id);
    fetchQueue();
  };

  const removeRequest = async (id) => {
    await supabase.from('slot_requests').delete().eq('id', id);
    fetchQueue();
  };

  const rejectRequest = async (id) => {
    try {
      await fetch(`${window.location.origin}/api/chat-commands?cmd=sr-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: id, user_id: user.id, message_template: c.srMsgRejected || undefined }),
      });
      fetchQueue();
    } catch (err) { console.error('[SR reject]', err); }
  };

  const clearAll = async () => {
    if (!user) return;
    setLoading(true);
    await supabase.from('slot_requests').delete().eq('user_id', user.id).eq('status', 'pending');
    setRequests([]);
    setLoading(false);
  };

  const cmdTrigger = c.commandTrigger || '!sr';
  const chatEnabled = !!c.srChatEnabled;
  const hasChannel = !!(c.twitchChannel || '').trim();

  return (
    <div style={S.section}>

      {/* ═══════════════════════════════════════════════
          1. CHAT LISTENER + TWITCH CHANNEL
          ═══════════════════════════════════════════════ */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={chatEnabled}
            onChange={e => set('srChatEnabled', e.target.checked)}
          />
          <span style={{ fontWeight: 700 }}>📺 Chat Listener {chatEnabled ? 'ON' : 'OFF'}</span>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: chatEnabled && hasChannel ? '#22c55e' : '#64748b',
          }} />
        </label>
        {chatEnabled ? (
          <>
            <p style={S.hint}>The widget listens for <strong style={{ color: '#e2e8f0' }}>{cmdTrigger}</strong> in your Twitch chat — even inside OBS.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input
                type="text"
                value={c.twitchChannel || ''}
                onChange={e => set('twitchChannel', e.target.value)}
                placeholder="your_channel_name"
                style={{ ...S.input, flex: 1 }}
              />
            </div>
            {hasChannel && (
              <p style={{ fontSize: '0.65rem', color: '#22c55e', margin: '4px 0 0', lineHeight: 1.3 }}>
                ✓ Listening — viewers type: <strong style={{ color: '#e2e8f0' }}>{cmdTrigger} Gates of Olympus</strong>
              </p>
            )}
            {!hasChannel && (
              <p style={{ fontSize: '0.65rem', color: '#f59e0b', margin: '4px 0 0', lineHeight: 1.3 }}>
                ⚠️ Enter your Twitch channel name above
              </p>
            )}
          </>
        ) : (
          <p style={S.hint}>Turn on to listen for <strong style={{ color: '#e2e8f0' }}>{cmdTrigger}</strong> commands in Twitch chat.</p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          2. COMMAND SETTINGS
          ═══════════════════════════════════════════════ */}
      <div style={S.card('99,102,241')}>
        <p style={{ ...S.label, marginBottom: 8 }}>⚡ Command Settings</p>

        {/* Command trigger */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 8 }}>
          Trigger:
          <input
            type="text"
            value={c.commandTrigger || '!sr'}
            onChange={e => set('commandTrigger', e.target.value.trim() || '!sr')}
            placeholder="!sr"
            style={{ ...S.input, width: 80, fontWeight: 700 }}
          />
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>command viewers type</span>
        </label>

        {/* Max queue size */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 8 }}>
          Max queue:
          <input
            type="number" min={1} max={100}
            value={c.maxQueueSize || 50}
            onChange={e => set('maxQueueSize', Math.max(1, Math.min(100, +e.target.value)))}
            style={{ ...S.input, width: 60 }}
          />
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>max slots in queue</span>
        </label>

        {/* Duplicate prevention */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={c.preventDuplicates !== false}
            onChange={e => set('preventDuplicates', e.target.checked)}
          />
          Prevent duplicate slot requests
        </label>
        <p style={{ ...S.hint, marginLeft: 26, marginBottom: 8 }}>
          Same slot can't be requested twice. Points won't be charged.
        </p>

        {/* Cooldown */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0' }}>
          Cooldown:
          <input
            type="number" min={0} max={600}
            value={c.cooldownSeconds || 0}
            onChange={e => set('cooldownSeconds', Math.max(0, +e.target.value))}
            style={{ ...S.input, width: 60 }}
          />
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>seconds between requests per user</span>
        </label>
        <p style={{ ...S.hint, marginTop: 2 }}>
          0 = no cooldown. Prevents spam by limiting how often a viewer can use {cmdTrigger}.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════
          3. STREAMELEMENTS POINTS
          ═══════════════════════════════════════════════ */}
      <div style={S.card('245,158,11')}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={!!c.srSeEnabled}
            onChange={e => set('srSeEnabled', e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>💰 Require SE Points for {cmdTrigger}</span>
        </label>
        {c.srSeEnabled ? (
          <>
            <p style={{ ...S.hint, marginBottom: 6 }}>
              Each request costs SE points. If insufficient, the request is rejected — no charge.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0' }}>
              Cost:
              <input
                type="number" min={1} max={1000000}
                value={c.srSeCost || 100}
                onChange={e => set('srSeCost', Math.max(1, +e.target.value))}
                style={{ ...S.input, width: 80, color: '#f59e0b', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>points</span>
            </label>
            {!seConnected && (
              <p style={{ fontSize: '0.68rem', color: '#ef4444', margin: '6px 0 0', lineHeight: 1.4, fontWeight: 600 }}>
                ⚠️ StreamElements not connected — go to Profile and connect SE first.
              </p>
            )}
          </>
        ) : (
          <p style={S.hint}>When disabled, all requests are free.</p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          4. CHAT MESSAGES
          ═══════════════════════════════════════════════ */}
      <div style={S.card('99,102,241')}>
        <p style={{ ...S.label, marginBottom: 4 }}>💬 Chat Messages</p>
        <p style={{ ...S.hint, marginBottom: 8 }}>
          Placeholders: <strong style={{ color: '#c4b5fd' }}>{'{slot}'}</strong> <strong style={{ color: '#c4b5fd' }}>{'{user}'}</strong> <strong style={{ color: '#c4b5fd' }}>{'{cost}'}</strong> <strong style={{ color: '#c4b5fd' }}>{'{points}'}</strong> <strong style={{ color: '#c4b5fd' }}>{'{by}'}</strong> <strong style={{ color: '#c4b5fd' }}>{'{refund}'}</strong>
        </p>
        {[
          { key: 'srMsgAccepted', label: 'Accepted (free)', def: '🎰 Added "{slot}" to the queue (requested by {user})' },
          { key: 'srMsgAcceptedCost', label: 'Accepted (with cost)', def: '🎰 Added "{slot}" to the queue ({user} — {cost} points deducted)' },
          { key: 'srMsgNotEnough', label: 'Not enough points', def: '❌ {user}, you need {cost} points to request a slot (you have {points}).' },
          { key: 'srMsgDuplicate', label: 'Already in queue', def: '⚠️ {user}, "{slot}" is already in the queue (requested by {by}). No points taken!' },
          { key: 'srMsgRejected', label: 'Rejected (refund)', def: '🚫 {user}, your request for "{slot}" was rejected. {refund}' },
          { key: 'srMsgNoMatch', label: 'Slot not found', def: '❌ {user}, could not find that slot. Please try again.' },
          { key: 'srMsgCooldown', label: 'Cooldown active', def: '⏳ {user}, please wait before requesting another slot.' },
          { key: 'srMsgQueueFull', label: 'Queue full', def: '❌ {user}, the slot queue is full right now.' },
        ].map(({ key, label, def }) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <label style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 600 }}>{label}</label>
            <input
              type="text"
              value={c[key] || def}
              onChange={e => set(key, e.target.value)}
              style={S.inputFull}
            />
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          5. DISPLAY OPTIONS
          ═══════════════════════════════════════════════ */}
      <div>
        <p style={S.label}>🎨 Display</p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer', marginTop: 4 }}>
          <input type="checkbox" checked={c.showRequester !== false} onChange={e => set('showRequester', e.target.checked)} />
          Show who requested
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer', marginTop: 4 }}>
          <input type="checkbox" checked={c.showNumbers !== false} onChange={e => set('showNumbers', e.target.checked)} />
          Show queue numbers
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', marginTop: 6 }}>
          Max display:
          <input
            type="number" min={1} max={50}
            value={c.maxDisplay || 20}
            onChange={e => set('maxDisplay', Math.max(1, +e.target.value))}
            style={{ ...S.input, width: 50 }}
          />
        </label>

        {/* Auto-cycle speed (for card stack / compact) */}
        {(currentStyle === 'v2_card_stack' || currentStyle === 'v3_compact') && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', marginTop: 6 }}>
            Cycle speed:
            <input type="range" min={1000} max={8000} step={500}
              value={c.autoSpeed || 4000}
              onChange={e => set('autoSpeed', +e.target.value)}
              style={{ flex: 1, accentColor: '#a78bfa' }} />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', minWidth: 30 }}>{((c.autoSpeed || 4000) / 1000).toFixed(1)}s</span>
          </label>
        )}
      </div>

      {/* Typography */}
      <div>
        <p style={S.label}>🔤 Typography</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 6 }}>
          Font
          <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}
            style={{ flex: 1, ...S.input }}>
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 6 }}>
          Size
          <input type="range" min={8} max={24} step={1} value={c.fontSize || 14}
            onChange={e => set('fontSize', +e.target.value)} style={{ flex: 1, accentColor: '#a78bfa' }} />
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', minWidth: 30 }}>{c.fontSize || 14}px</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e2e8f0' }}>
          Weight
          <select value={c.fontWeight || '600'} onChange={e => set('fontWeight', e.target.value)}
            style={{ flex: 1, ...S.input }}>
            <option value="400">Normal</option>
            <option value="600">Semi Bold</option>
            <option value="700">Bold</option>
            <option value="800">Extra Bold</option>
          </select>
        </label>
      </div>

      {/* Colors */}
      <div>
        <p style={S.label}>🎨 Colors</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          <ColorPicker label="Accent" value={c.accentColor || '#a78bfa'} onChange={v => set('accentColor', v)} />
          <ColorPicker label="Text" value={c.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
          <ColorPicker label="Muted" value={c.mutedColor || '#94a3b8'} onChange={v => set('mutedColor', v)} />
          <ColorPicker label="Background" value={c.bgColor || '#0f111c'} onChange={v => set('bgColor', v)} />
          <ColorPicker label="Card BG" value={c.cardBg || '#1a1c2e'} onChange={v => set('cardBg', v)} />
          <ColorPicker label="Border" value={c.borderColor || '#1e2030'} onChange={v => set('borderColor', v)} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          6. QUEUE MANAGEMENT
          ═══════════════════════════════════════════════ */}
      <div>
        <div style={{ ...S.row, marginBottom: 6 }}>
          <p style={{ ...S.label, flex: 1 }}>📋 Queue ({requests.length})</p>
          {requests.length > 0 && (
            <button style={{ ...S.btn, background: 'rgba(248,113,113,0.15)', color: '#f87171' }}
              onClick={clearAll} disabled={loading}>
              {loading ? '…' : 'Clear All'}
            </button>
          )}
        </div>

        {requests.length === 0 && (
          <p style={S.hint}>No pending requests. Viewers type {cmdTrigger} in chat.</p>
        )}

        {requests.map((r, i) => (
          <div key={r.id} style={{ ...S.item, marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a78bfa', minWidth: 20, textAlign: 'center' }}>
              #{i + 1}
            </span>
            {r.slot_image && (
              <img src={r.slot_image} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.slot_name}
              </div>
              {r.requested_by && r.requested_by !== 'anonymous' && (
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>by {r.requested_by}</div>
              )}
            </div>
            {/* Mark played */}
            <button
              style={{ ...S.btn, background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '4px 8px', fontSize: '0.7rem' }}
              onClick={() => markPlayed(r.id)} title="Mark as played">✓</button>
            {/* Reject & refund */}
            {c.srSeEnabled && (
              <button
                style={{ ...S.btn, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', padding: '4px 8px', fontSize: '0.7rem' }}
                onClick={() => rejectRequest(r.id)} title="Reject &amp; refund SE points">↩</button>
            )}
            {/* Remove */}
            <button
              style={{ ...S.btn, background: 'rgba(248,113,113,0.1)', color: '#f87171', padding: '4px 8px', fontSize: '0.7rem' }}
              onClick={() => removeRequest(r.id)} title="Remove">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
