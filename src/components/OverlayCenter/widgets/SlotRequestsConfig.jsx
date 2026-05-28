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
import useTwitchChannel from '../../../hooks/useTwitchChannel';
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

/** Parse an rgba(...) or hex string into { hex, opacity }. */
function splitRgba(val) {
  const rgba = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(val || '');
  if (rgba) {
    const toHex = n => parseInt(n, 10).toString(16).padStart(2, '0');
    return { hex: `#${toHex(rgba[1])}${toHex(rgba[2])}${toHex(rgba[3])}`, opacity: rgba[4] !== undefined ? parseFloat(rgba[4]) : 1 };
  }
  return { hex: val || '#000000', opacity: 1 };
}
function buildRgba(hex, opacity) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
  if (!m) return hex;
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  return opacity < 1 ? `rgba(${r},${g},${b},${opacity})` : `#${m[1]}${m[2]}${m[3]}`;
}

/** Color picker that supports both solid hex and rgba (shows hex input + opacity slider). */
function RgbaColorPicker({ label, value, onChange }) {
  const { hex, opacity } = splitRgba(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#e2e8f0', flexWrap: 'wrap' }}>
      <input type="color" value={hex}
        onChange={e => onChange(buildRgba(e.target.value, opacity))}
        style={{ width: 22, height: 22, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
      <span style={{ minWidth: 50 }}>{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={opacity}
        onChange={e => onChange(buildRgba(hex, parseFloat(e.target.value)))}
        style={{ width: 50, accentColor: '#a78bfa' }} />
      <span style={{ fontSize: '0.65rem', color: '#64748b', minWidth: 28 }}>{Math.round(opacity * 100)}%</span>
    </div>
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
      .channel(`sr-config-rt-${user.id}`)
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(`${window.location.origin}/api/chat-commands?cmd=sr-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ request_id: id, user_id: user.id, message_template: c.srMsgRejected || undefined }),
      });
      fetchQueue();
    } catch (err) { console.error('[SR reject]', err); }
  };

  const clearAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      // Call API to refund SE points for all pending requests, then delete them
      await fetch(`${window.location.origin}/api/chat-commands?cmd=sr-clear-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user_id: user.id }),
      });
      setRequests([]);
    } catch (err) {
      console.error('[sr-clear-all] error:', err);
      // Fallback: just delete without refund
      await supabase.from('slot_requests').delete().eq('user_id', user.id).eq('status', 'pending');
      setRequests([]);
    }
    setLoading(false);
  };

  const cmdTrigger = c.commandTrigger || '!sr';
  const chatEnabled = c.srChatEnabled !== false;
  const autoChannel = useTwitchChannel();
  const hasChannel = !!(c.twitchChannel || autoChannel).trim();
  const queueCount = requests.length;
  const queueLimit = c.maxQueueSize || 50;
  const displayLimit = c.maxDisplay || 20;
  const pointsEnabled = !!c.srSeEnabled;
  const currentStyleLabel = {
    v1_minimal: 'Minimal Queue',
    v2_card_stack: 'Card Stack',
    v3_compact: 'Compact Overlay',
  }[currentStyle] || currentStyle;
  const listenerStateLabel = chatEnabled ? (hasChannel ? 'Live' : 'Needs channel') : 'Off';
  const pointModeLabel = pointsEnabled ? `${c.srSeCost || 100} pts` : 'Free';
  const cycleLabel = currentStyle === 'v2_card_stack' || currentStyle === 'v3_compact'
    ? `${((c.autoSpeed || 4000) / 1000).toFixed(1)}s cycle`
    : 'Static list';
  const heroNote = queueCount
    ? `The queue is live with ${queueCount} pending request${queueCount === 1 ? '' : 's'}. Moderate the top picks and keep the overlay pacing aligned with chat activity.`
    : 'The queue is empty right now. Configure the listener, command rules, and display style so viewers can start requesting slots immediately.';

  return (
    <div className="sr-admin-page">

      <div className="sr-admin-hero">
        <div className="sr-admin-hero-copy">
          <span className="sr-admin-eyebrow">Community Queue</span>
          <h3 className="sr-admin-title">Slot requests control room</h3>
          <p className="sr-admin-subtitle">
            Moderate chat-driven slot picks, enforce queue rules, and tune the on-stream request widget from one premium dashboard.
          </p>
          <p className="sr-admin-note">{heroNote}</p>
        </div>

        <div className="sr-admin-metrics">
          <div className="sr-admin-metric-card">
            <span className="sr-admin-metric-label">Listener</span>
            <strong className="sr-admin-metric-value">{listenerStateLabel}</strong>
            <span className="sr-admin-metric-meta">{hasChannel ? (c.twitchChannel || autoChannel) : 'Waiting for channel binding'}</span>
          </div>
          <div className="sr-admin-metric-card">
            <span className="sr-admin-metric-label">Queue</span>
            <strong className="sr-admin-metric-value">{queueCount}/{queueLimit}</strong>
            <span className="sr-admin-metric-meta">Showing up to {displayLimit} requests on stream</span>
          </div>
          <div className="sr-admin-metric-card">
            <span className="sr-admin-metric-label">Pricing</span>
            <strong className="sr-admin-metric-value">{pointModeLabel}</strong>
            <span className="sr-admin-metric-meta">{pointsEnabled ? (seConnected ? 'StreamElements connected' : 'SE connection required') : 'Requests are currently free'}</span>
          </div>
          <div className="sr-admin-metric-card">
            <span className="sr-admin-metric-label">Display</span>
            <strong className="sr-admin-metric-value">{currentStyleLabel}</strong>
            <span className="sr-admin-metric-meta">{cycleLabel}</span>
          </div>
        </div>
      </div>

      <div className="sr-admin-grid sr-admin-grid--top">

      {/* ═══════════════════════════════════════════════
          1. CHAT LISTENER + TWITCH CHANNEL
          ═══════════════════════════════════════════════ */}
      <div className="sr-admin-card sr-admin-card--listener">
        <div className="sr-admin-card-header">
          <div>
            <span className="sr-admin-card-eyebrow">Listener</span>
            <h4 className="sr-admin-card-title">Twitch chat hook</h4>
          </div>
          <span className="sr-admin-card-chip">{listenerStateLabel}</span>
        </div>

        <label className="sr-admin-toggle">
          <input
            type="checkbox"
            checked={chatEnabled}
            onChange={e => set('srChatEnabled', e.target.checked)}
          />
          <span className="sr-admin-toggle-copy">📺 Chat Listener {chatEnabled ? 'ON' : 'OFF'}</span>
          <span className="sr-admin-status-dot" style={{ background: chatEnabled && hasChannel ? '#22c55e' : '#64748b' }} />
        </label>
        {chatEnabled ? (
          <>
            <p className="sr-admin-copy">The widget listens for <strong className="sr-admin-strong">{cmdTrigger}</strong> in your Twitch chat, including inside OBS browser sources.</p>
            <p className="sr-admin-channel-line">
              📺 Channel: <strong style={{ color: '#e2e8f0' }}>{c.twitchChannel || autoChannel || '—'}</strong>
              <span className="sr-admin-copy-muted">(auto-detected from login)</span>
            </p>
            {hasChannel && (
              <p className="sr-admin-success-copy">
                ✓ Listening — viewers type: <strong className="sr-admin-strong">{cmdTrigger} Gates of Olympus</strong>
              </p>
            )}
          </>
        ) : (
          <p className="sr-admin-copy">Turn it on to listen for <strong className="sr-admin-strong">{cmdTrigger}</strong> commands in Twitch chat.</p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          2. COMMAND SETTINGS
          ═══════════════════════════════════════════════ */}
      <div className="sr-admin-card sr-admin-card--command">
        <div className="sr-admin-card-header">
          <div>
            <span className="sr-admin-card-eyebrow">Rules</span>
            <h4 className="sr-admin-card-title">Command settings</h4>
          </div>
          <span className="sr-admin-card-chip">{cmdTrigger}</span>
        </div>

        {/* Command trigger */}
        <label className="sr-admin-inline-field">
          <span className="sr-admin-inline-label">Trigger</span>
          <input
            type="text"
            value={c.commandTrigger || '!sr'}
            onChange={e => set('commandTrigger', e.target.value.trim() || '!sr')}
            placeholder="!sr"
            style={{ ...S.input, width: 80, fontWeight: 700 }}
          />
          <span className="sr-admin-inline-hint">command viewers type</span>
        </label>

        {/* Max queue size */}
        <label className="sr-admin-inline-field">
          <span className="sr-admin-inline-label">Max queue</span>
          <input
            type="number" min={1} max={100}
            value={c.maxQueueSize || 50}
            onChange={e => set('maxQueueSize', Math.max(1, Math.min(100, +e.target.value)))}
            style={{ ...S.input, width: 60 }}
          />
          <span className="sr-admin-inline-hint">max slots in queue</span>
        </label>

        {/* Duplicate prevention */}
        <label className="sr-admin-toggle sr-admin-toggle--compact">
          <input
            type="checkbox"
            checked={c.preventDuplicates !== false}
            onChange={e => set('preventDuplicates', e.target.checked)}
          />
          Prevent duplicate slot requests
        </label>
        <p className="sr-admin-copy sr-admin-copy--indented">
          Same slot can't be requested twice. Points won't be charged.
        </p>

        {/* Cooldown */}
        <label className="sr-admin-inline-field">
          <span className="sr-admin-inline-label">Cooldown</span>
          <input
            type="number" min={0} max={600}
            value={c.cooldownSeconds || 0}
            onChange={e => set('cooldownSeconds', Math.max(0, +e.target.value))}
            style={{ ...S.input, width: 60 }}
          />
          <span className="sr-admin-inline-hint">seconds between requests per user</span>
        </label>
        <p className="sr-admin-copy">
          0 = no cooldown. Prevents spam by limiting how often a viewer can use {cmdTrigger}.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════
          3. STREAMELEMENTS POINTS
          ═══════════════════════════════════════════════ */}
      <div className="sr-admin-card sr-admin-card--points">
        <div className="sr-admin-card-header">
          <div>
            <span className="sr-admin-card-eyebrow">Economy</span>
            <h4 className="sr-admin-card-title">StreamElements points</h4>
          </div>
          <span className="sr-admin-card-chip">{seConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        <label className="sr-admin-toggle sr-admin-toggle--compact">
          <input
            type="checkbox"
            checked={!!c.srSeEnabled}
            onChange={e => set('srSeEnabled', e.target.checked)}
          />
          <span className="sr-admin-toggle-copy">💰 Require SE Points for {cmdTrigger}</span>
        </label>
        {c.srSeEnabled ? (
          <>
            <p className="sr-admin-copy">
              Each request costs SE points. If insufficient, the request is rejected — no charge.
            </p>
            <label className="sr-admin-inline-field">
              <span className="sr-admin-inline-label">Cost</span>
              <input
                type="number" min={1} max={1000000}
                value={c.srSeCost || 100}
                onChange={e => set('srSeCost', Math.max(1, +e.target.value))}
                style={{ ...S.input, width: 80, color: '#f59e0b', fontWeight: 700 }}
              />
              <span className="sr-admin-inline-hint">points</span>
            </label>
            {!seConnected && (
              <p className="sr-admin-error-copy">
                ⚠️ StreamElements not connected — go to Profile and connect SE first.
              </p>
            )}
          </>
        ) : (
          <p className="sr-admin-copy">When disabled, all requests are free.</p>
        )}
      </div>
      </div>

      <div className="sr-admin-grid sr-admin-grid--middle">

      {/* ═══════════════════════════════════════════════
          4. CHAT MESSAGES
          ═══════════════════════════════════════════════ */}
      <div className="sr-admin-card sr-admin-card--messages">
        <div className="sr-admin-card-header">
          <div>
            <span className="sr-admin-card-eyebrow">Automation</span>
            <h4 className="sr-admin-card-title">Chat messages</h4>
          </div>
          <span className="sr-admin-card-chip">Templates</span>
        </div>
        <p className="sr-admin-copy">
          Placeholders: <strong className="sr-admin-placeholder">{'{slot}'}</strong> <strong className="sr-admin-placeholder">{'{user}'}</strong> <strong className="sr-admin-placeholder">{'{cost}'}</strong> <strong className="sr-admin-placeholder">{'{points}'}</strong> <strong className="sr-admin-placeholder">{'{by}'}</strong> <strong className="sr-admin-placeholder">{'{refund}'}</strong>
        </p>
        <div className="sr-admin-message-list">
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
          <div key={key} className="sr-admin-message-field">
            <label className="sr-admin-message-label">{label}</label>
            <input
              type="text"
              value={c[key] || def}
              onChange={e => set(key, e.target.value)}
              className="sr-admin-message-input"
              style={S.inputFull}
            />
          </div>
        ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          5. DISPLAY OPTIONS
          ═══════════════════════════════════════════════ */}
      <div className="sr-admin-column">
      <div className="sr-admin-card sr-admin-card--display">
        <div className="sr-admin-card-header">
          <div>
            <span className="sr-admin-card-eyebrow">Presentation</span>
            <h4 className="sr-admin-card-title">Display options</h4>
          </div>
          <span className="sr-admin-card-chip">{currentStyleLabel}</span>
        </div>

        <label className="sr-admin-toggle sr-admin-toggle--compact">
          <input type="checkbox" checked={c.showRequester !== false} onChange={e => set('showRequester', e.target.checked)} />
          Show who requested
        </label>
        <label className="sr-admin-toggle sr-admin-toggle--compact">
          <input type="checkbox" checked={c.showNumbers !== false} onChange={e => set('showNumbers', e.target.checked)} />
          Show queue numbers
        </label>
        <label className="sr-admin-inline-field">
          <span className="sr-admin-inline-label">Max display</span>
          <input
            type="number" min={1} max={50}
            value={c.maxDisplay || 20}
            onChange={e => set('maxDisplay', Math.max(1, +e.target.value))}
            style={{ ...S.input, width: 50 }}
          />
          <span className="sr-admin-inline-hint">requests shown on overlay</span>
        </label>

        {/* Auto-cycle speed (for card stack / compact) */}
        {(currentStyle === 'v2_card_stack' || currentStyle === 'v3_compact') && (
          <label className="sr-admin-inline-field">
            <span className="sr-admin-inline-label">Cycle speed</span>
            <input type="range" min={1000} max={8000} step={500}
              value={c.autoSpeed || 4000}
              onChange={e => set('autoSpeed', +e.target.value)}
              style={{ flex: 1, accentColor: '#a78bfa' }} />
            <span className="sr-admin-inline-hint sr-admin-inline-hint--fixed">{((c.autoSpeed || 4000) / 1000).toFixed(1)}s</span>
          </label>
        )}
      </div>

      {/* Typography */}
      <div className="sr-admin-card sr-admin-card--theme">
        <div className="sr-admin-card-header">
          <div>
            <span className="sr-admin-card-eyebrow">Visual System</span>
            <h4 className="sr-admin-card-title">Typography & colors</h4>
          </div>
          <span className="sr-admin-card-chip">Overlay styling</span>
        </div>

        <label className="sr-admin-inline-field">
          <span className="sr-admin-inline-label">Font</span>
          <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}
            style={{ flex: 1, ...S.input }}>
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label className="sr-admin-inline-field">
          <span className="sr-admin-inline-label">Size</span>
          <input type="range" min={8} max={24} step={1} value={c.fontSize || 14}
            onChange={e => set('fontSize', +e.target.value)} style={{ flex: 1, accentColor: '#a78bfa' }} />
          <span className="sr-admin-inline-hint sr-admin-inline-hint--fixed">{c.fontSize || 14}px</span>
        </label>
        <label className="sr-admin-inline-field">
          <span className="sr-admin-inline-label">Weight</span>
          <select value={c.fontWeight || '600'} onChange={e => set('fontWeight', e.target.value)}
            style={{ flex: 1, ...S.input }}>
            <option value="400">Normal</option>
            <option value="600">Semi Bold</option>
            <option value="700">Bold</option>
            <option value="800">Extra Bold</option>
          </select>
        </label>

      {/* Colors */}
        <div className="sr-admin-color-block">
        <p className="sr-admin-subheading">Colors</p>
        <div className="sr-admin-color-list">
          <ColorPicker label="Accent" value={c.accentColor || '#a78bfa'} onChange={v => set('accentColor', v)} />
          <ColorPicker label="Text" value={c.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
          <ColorPicker label="Muted" value={c.mutedColor || '#94a3b8'} onChange={v => set('mutedColor', v)} />
          <RgbaColorPicker label="Background" value={c.bgColor || 'rgba(15,17,28,0.75)'} onChange={v => set('bgColor', v)} />
          <RgbaColorPicker label="Card BG" value={c.cardBg || 'rgba(255,255,255,0.04)'} onChange={v => set('cardBg', v)} />
          <RgbaColorPicker label="Border" value={c.borderColor || 'rgba(255,255,255,0.07)'} onChange={v => set('borderColor', v)} />
        </div>
      </div>
      </div>
      </div>
      </div>

      {/* ═══════════════════════════════════════════════
          6. QUEUE MANAGEMENT
          ═══════════════════════════════════════════════ */}
      <div className="sr-admin-card sr-admin-card--queue">
        <div className="sr-admin-card-header sr-admin-card-header--queue">
          <div>
            <span className="sr-admin-card-eyebrow">Moderation</span>
            <h4 className="sr-admin-card-title">Queue management</h4>
          </div>
          <span className="sr-admin-card-chip">{queueCount} pending</span>
          {requests.length > 0 && (
            <button className="sr-admin-btn sr-admin-btn--danger" style={{ ...S.btn }}
              onClick={clearAll} disabled={loading}>
              {loading ? '…' : 'Clear All'}
            </button>
          )}
        </div>

        {requests.length === 0 && (
          <p className="sr-admin-empty">No pending requests. Viewers type {cmdTrigger} in chat.</p>
        )}

        <div className="sr-admin-queue-list">
        {requests.map((r, i) => (
          <div key={r.id} className="sr-admin-queue-row">
            <span className="sr-admin-queue-index">
              #{i + 1}
            </span>
            {r.slot_image && (
              <img src={r.slot_image} alt="" className="sr-admin-queue-image" />
            )}
            <div className="sr-admin-queue-copy">
              <div className="sr-admin-queue-name">
                {r.slot_name}
              </div>
              {r.requested_by && r.requested_by !== 'anonymous' && (
                <div className="sr-admin-queue-by">by {r.requested_by}</div>
              )}
            </div>
            <div className="sr-admin-queue-actions">
            {/* Mark played */}
            <button
              className="sr-admin-btn sr-admin-btn--success"
              style={{ ...S.btn, padding: '4px 8px', fontSize: '0.7rem' }}
              onClick={() => markPlayed(r.id)} title="Mark as played">✓</button>
            {/* Reject & refund */}
            {c.srSeEnabled && (
              <button
                className="sr-admin-btn sr-admin-btn--warn"
                style={{ ...S.btn, padding: '4px 8px', fontSize: '0.7rem' }}
                onClick={() => rejectRequest(r.id)} title="Reject &amp; refund SE points">↩</button>
            )}
            {/* Remove */}
            <button
              className="sr-admin-btn sr-admin-btn--danger"
              style={{ ...S.btn, padding: '4px 8px', fontSize: '0.7rem' }}
              onClick={() => removeRequest(r.id)} title="Remove">✕</button>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
