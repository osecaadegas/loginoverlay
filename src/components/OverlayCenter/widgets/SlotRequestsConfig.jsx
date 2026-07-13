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
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { makePerStyleSetters } from './shared/perStyleConfig';
import useTwitchChannel from '../../../hooks/useTwitchChannel';
import { SLOT_REQUESTS_STYLE_KEYS } from './styleKeysRegistry';

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

export default function SlotRequestsConfig({ config, onChange, mode = 'full' }) {
  const { user } = useAuth();
  const c = config || {};
  const isSidebar = mode === 'sidebar';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seConnected, setSeConnected] = useState(false);
  const [activeSection, setActiveSection] = useState('setup');
  // Monotonic counter — any fetchQueue result older than the latest is discarded.
  const fetchSeqRef = useRef(0);

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

  /* ── Fetch queue (stale-result protected) ── */
  const fetchQueue = useCallback(async () => {
    if (!user) return;
    const seq = ++fetchSeqRef.current;
    const { data } = await supabase
      .from('slot_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    // Discard if a newer fetch already completed while this one was in flight
    if (seq !== fetchSeqRef.current) return;
    if (data) setRequests(data);
  }, [user]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  /* ── Realtime updates ── */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`sr-config-rt-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_requests',
        filter: `user_id=eq.${user.id}` }, () => fetchQueue())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchQueue]);

  const currentStyle = c.displayStyle || 'v1_minimal';
  const { set } = makePerStyleSetters(onChange, c, currentStyle, SLOT_REQUESTS_STYLE_KEYS);

  // Track which request IDs are currently in-flight so the buttons are disabled
  // until the server round-trip completes. This prevents double-click double-refund.
  const [busyIds, setBusyIds] = useState(new Set());
  const setBusy = (id) => setBusyIds(prev => new Set(prev).add(id));
  const clearBusy = (id) => setBusyIds(prev => { const n = new Set(prev); n.delete(id); return n; });

  /* ── Actions ── */
  const markPlayed = async (id) => {
    if (busyIds.has(id)) return;
    setBusy(id);
    try {
      await supabase.from('slot_requests').update({ status: 'played' }).eq('id', id);
      await fetchQueue();
    } finally { clearBusy(id); }
  };

  const removeRequest = async (id) => {
    if (busyIds.has(id)) return;
    setBusy(id);
    try {
      await supabase.from('slot_requests').delete().eq('id', id);
      await fetchQueue();
    } finally { clearBusy(id); }
  };

  const rejectRequest = async (id) => {
    if (busyIds.has(id)) return;
    setBusy(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(`${window.location.origin}/api/chat-commands?cmd=sr-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ request_id: id, user_id: user.id, message_template: c.srMsgRejected || undefined }),
      });
      if (!resp.ok && resp.status !== 409) {
        console.error('[SR reject] unexpected status:', resp.status);
      }
      await fetchQueue();
    } catch (err) {
      console.error('[SR reject]', err);
    } finally { clearBusy(id); }
  };

  const clearAll = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(`${window.location.origin}/api/chat-commands?cmd=sr-clear-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (resp.ok) {
        // API confirmed success — re-fetch to sync with DB truth
        await fetchQueue();
      } else {
        console.error('[sr-clear-all] API error:', resp.status);
        // Don't optimistically clear — let the user see the real state
        await fetchQueue();
      }
    } catch (err) {
      console.error('[sr-clear-all] error:', err);
      // Network failure — still refresh from DB so UI is accurate
      await fetchQueue();
    } finally {
      setLoading(false);
    }
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
    ? `${queueCount} pending request${queueCount === 1 ? '' : 's'} waiting in the queue.`
    : 'No pending requests yet. Start with Setup, then check Queue once chat begins using the command.';
  const sidebarSteps = [
    {
      key: 'listener',
      title: 'Turn the listener on',
      detail: chatEnabled
        ? (hasChannel ? `Bound to ${c.twitchChannel || autoChannel}` : 'Listener is on, but no Twitch channel is bound yet')
        : 'Enable chat listening so requests are accepted',
      ready: chatEnabled && hasChannel,
    },
    {
      key: 'command',
      title: 'Confirm the command rules',
      detail: `${cmdTrigger} • max ${queueLimit} • ${c.cooldownSeconds || 0}s cooldown`,
      ready: true,
    },
    {
      key: 'pricing',
      title: pointsEnabled ? 'Charge StreamElements points' : 'Keep requests free',
      detail: pointsEnabled
        ? (seConnected ? `${c.srSeCost || 100} points per request` : 'Connect StreamElements in Profile before charging points')
        : 'Viewers can request without spending points',
      ready: !pointsEnabled || seConnected,
    },
  ];
  const inlineFieldClass = `sr-admin-inline-field${isSidebar ? ' sr-admin-inline-field--stacked' : ''}`;
  const messageTemplates = [
    { key: 'srMsgAccepted', label: 'Success: accepted (free)', def: '🎰 Added "{slot}" to the queue (requested by {user})' },
    { key: 'srMsgAcceptedCost', label: 'Success: accepted (with cost)', def: '🎰 Added "{slot}" to the queue ({user} — {cost} points deducted)' },
    { key: 'srMsgNotEnough', label: 'Error: not enough points', def: '❌ {user}, you need {cost} points to request a slot (you have {points}).' },
    { key: 'srMsgDuplicate', label: 'Error: already in queue', def: '⚠️ {user}, "{slot}" is already in the queue (requested by {by}). No points taken!' },
    { key: 'srMsgRejected', label: 'Refund: rejected request', def: '🚫 {user}, your request for "{slot}" was rejected. {refund}' },
    { key: 'srMsgClearAll', label: 'Refund: clear whole queue', def: '🗑️ The slot request queue has been cleared. All points have been refunded!' },
    { key: 'srMsgNoMatch', label: 'Error: slot not found', def: '❌ {user}, could not find that slot. Please try again.' },
    { key: 'srMsgCooldown', label: 'Error: cooldown active', def: '⏳ {user}, please wait before requesting another slot.' },
    { key: 'srMsgQueueFull', label: 'Error: queue full', def: '❌ {user}, the slot queue is full right now.' },
  ];
  const readySteps = sidebarSteps.filter(step => step.ready).length;
  const sectionTabs = [
    { key: 'setup', label: 'Setup', meta: `${readySteps}/${sidebarSteps.length} ready` },
    { key: 'overlay', label: 'Overlay', meta: currentStyleLabel },
    { key: 'queue', label: 'Queue', meta: `${queueCount} pending` },
    { key: 'advanced', label: 'Advanced', meta: 'Chat replies' },
  ];

  return (
    <div data-tour="slot-requests-page">
    <div className={`sr-admin-page${isSidebar ? ' sr-admin-page--sidebar' : ''}`}>

      <div className="sr-admin-hero sr-admin-hero--simple">
        <div className="sr-admin-hero-copy">
          <span className="sr-admin-eyebrow">Community Queue</span>
          <h3 className="sr-admin-title">Slot requests setup</h3>
          <p className="sr-admin-subtitle">
            Configure the chat listener, overlay behaviour, and live moderation from one predictable place.
          </p>
          <p className="sr-admin-note">{heroNote}</p>
          <div className="sr-admin-status-strip">
            <div className="sr-admin-status-item">
              <span>Listener</span>
              <strong>{listenerStateLabel}</strong>
            </div>
            <div className="sr-admin-status-item">
              <span>Command</span>
              <strong>{cmdTrigger}</strong>
            </div>
            <div className="sr-admin-status-item">
              <span>Pricing</span>
              <strong>{pointModeLabel}</strong>
            </div>
            <div className="sr-admin-status-item">
              <span>Display</span>
              <strong>{currentStyleLabel}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="sr-admin-nav" role="tablist" aria-label="Slot Requests sections">
        {sectionTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeSection === tab.key}
            className={`sr-admin-nav-btn${activeSection === tab.key ? ' sr-admin-nav-btn--active' : ''}`}
            onClick={() => setActiveSection(tab.key)}
          >
            <span>{tab.label}</span>
            <small>{tab.meta}</small>
          </button>
        ))}
      </div>

      {activeSection === 'setup' && (
      <div className="sr-admin-panel" role="tabpanel">
        <div className="sr-admin-section-intro">
          <div>
            <span className="sr-admin-card-eyebrow">Start here</span>
            <h4 className="sr-admin-card-title">Make chat requests work</h4>
          </div>
          <div className="sr-admin-quickstart sr-admin-quickstart--inline">
            {sidebarSteps.map((step, index) => (
              <div key={step.key} className={`sr-admin-quickstep${step.ready ? ' sr-admin-quickstep--ready' : ''}`}>
                <span className="sr-admin-quickstep-index">{index + 1}</span>
                <div className="sr-admin-quickstep-copy">
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </div>
              </div>
            ))}
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
            <h4 className="sr-admin-card-title">Twitch chat listener</h4>
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
            <p className="sr-admin-copy">When the listener is on, viewers can request slots by typing <strong className="sr-admin-strong">{cmdTrigger}</strong> in chat.</p>
            <p className="sr-admin-channel-line">
              📺 Channel: <strong style={{ color: '#e2e8f0' }}>{c.twitchChannel || autoChannel || '—'}</strong>
              <span className="sr-admin-copy-muted">(auto-detected from login)</span>
            </p>
            {hasChannel && (
              <p className="sr-admin-success-copy">
                ✓ Ready — viewers type: <strong className="sr-admin-strong">{`${cmdTrigger} Gates of Olympus`}</strong>
              </p>
            )}
          </>
        ) : (
          <p className="sr-admin-copy">Turn it on first. Until then, chat commands like <strong className="sr-admin-strong">{cmdTrigger}</strong> are ignored.</p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          2. COMMAND SETTINGS
          ═══════════════════════════════════════════════ */}
      <div className="sr-admin-card sr-admin-card--command">
        <div className="sr-admin-card-header">
          <div>
            <span className="sr-admin-card-eyebrow">Rules</span>
            <h4 className="sr-admin-card-title">Request command</h4>
          </div>
          <span className="sr-admin-card-chip">{cmdTrigger}</span>
        </div>

        <div className="sr-admin-field-grid">
          <label className={inlineFieldClass}>
            <span className="sr-admin-inline-label">Trigger</span>
            <input
              type="text"
              value={c.commandTrigger || '!sr'}
              onChange={e => set('commandTrigger', e.target.value.trim() || '!sr')}
              placeholder="!sr"
              style={{ ...S.input, width: isSidebar ? '100%' : 80, fontWeight: 700 }}
            />
            <span className="sr-admin-inline-hint">What viewers type in chat</span>
          </label>

          <label className={inlineFieldClass}>
            <span className="sr-admin-inline-label">Max queue</span>
            <input
              type="number" min={1} max={100}
              value={c.maxQueueSize || 50}
              onChange={e => set('maxQueueSize', Math.max(1, Math.min(100, +e.target.value)))}
              style={{ ...S.input, width: isSidebar ? '100%' : 60 }}
            />
            <span className="sr-admin-inline-hint">How many requests can wait at once</span>
          </label>

          <label className={inlineFieldClass}>
            <span className="sr-admin-inline-label">Cooldown</span>
            <input
              type="number" min={0} max={600}
              value={c.cooldownSeconds || 0}
              onChange={e => set('cooldownSeconds', Math.max(0, +e.target.value))}
              style={{ ...S.input, width: isSidebar ? '100%' : 60 }}
            />
            <span className="sr-admin-inline-hint">Seconds a user must wait before the next request</span>
          </label>
        </div>

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
            <h4 className="sr-admin-card-title">StreamElements pricing</h4>
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
            <label className={inlineFieldClass}>
              <span className="sr-admin-inline-label">Cost</span>
              <input
                type="number" min={1} max={1000000}
                value={c.srSeCost || 100}
                onChange={e => set('srSeCost', Math.max(1, +e.target.value))}
                style={{ ...S.input, width: isSidebar ? '100%' : 80, color: '#f59e0b', fontWeight: 700 }}
              />
              <span className="sr-admin-inline-hint">Points charged per accepted request</span>
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
      </div>
      )}

      {activeSection === 'advanced' && (
      <div className="sr-admin-panel" role="tabpanel">

      {/* ═══════════════════════════════════════════════
          4. CHAT MESSAGES
          ═══════════════════════════════════════════════ */}
      <div className="sr-admin-card sr-admin-card--messages sr-admin-card--wide">
        <div className="sr-admin-card-header">
          <div>
            <span className="sr-admin-card-eyebrow">Advanced</span>
            <h4 className="sr-admin-card-title">Chat reply templates</h4>
          </div>
          <span className="sr-admin-card-chip">Optional</span>
        </div>
        <p className="sr-admin-copy">
          Placeholders: <strong className="sr-admin-placeholder">{'{slot}'}</strong> <strong className="sr-admin-placeholder">{'{user}'}</strong> <strong className="sr-admin-placeholder">{'{cost}'}</strong> <strong className="sr-admin-placeholder">{'{points}'}</strong> <strong className="sr-admin-placeholder">{'{by}'}</strong> <strong className="sr-admin-placeholder">{'{refund}'}</strong>
        </p>
        <div className="sr-admin-message-list">
        {messageTemplates.map(({ key, label, def }) => (
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
      </div>
      )}

      {/* ═══════════════════════════════════════════════
          5. DISPLAY OPTIONS
          ═══════════════════════════════════════════════ */}
      {activeSection === 'overlay' && (
      <div className="sr-admin-panel" role="tabpanel">
      <div className="sr-admin-card sr-admin-card--display sr-admin-card--wide">
        <div className="sr-admin-card-header">
          <div>
            <span className="sr-admin-card-eyebrow">Presentation</span>
            <h4 className="sr-admin-card-title">Overlay behaviour</h4>
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
        <label className={inlineFieldClass}>
          <span className="sr-admin-inline-label">Max display</span>
          <input
            type="number" min={1} max={50}
            value={c.maxDisplay || 20}
            onChange={e => set('maxDisplay', Math.max(1, +e.target.value))}
            style={{ ...S.input, width: isSidebar ? '100%' : 50 }}
          />
          <span className="sr-admin-inline-hint">How many requests appear on the overlay</span>
        </label>

        {/* Auto-cycle speed (for card stack / compact) */}
        {(currentStyle === 'v2_card_stack' || currentStyle === 'v3_compact') && (
          <label className={inlineFieldClass}>
            <span className="sr-admin-inline-label">Cycle speed</span>
            <input type="range" min={1000} max={8000} step={500}
              value={c.autoSpeed || 4000}
              onChange={e => set('autoSpeed', +e.target.value)}
              style={{ flex: 1, accentColor: '#94a3b8' }} />
            <span className="sr-admin-inline-hint sr-admin-inline-hint--fixed">{((c.autoSpeed || 4000) / 1000).toFixed(1)}s</span>
          </label>
        )}
      </div>
      </div>
      )}

      {/* ═══════════════════════════════════════════════
          6. QUEUE MANAGEMENT
          ═══════════════════════════════════════════════ */}
      {activeSection === 'queue' && (
      <div className="sr-admin-panel" role="tabpanel">
      <div className="sr-admin-card sr-admin-card--queue">
        <div className="sr-admin-card-header sr-admin-card-header--queue">
          <div>
            <span className="sr-admin-card-eyebrow">Moderation</span>
            <h4 className="sr-admin-card-title">Pending queue</h4>
          </div>
          <span className="sr-admin-card-chip">{queueCount} pending</span>
          {requests.length > 0 && (
            <button className="sr-admin-btn sr-admin-btn--warn" style={{ ...S.btn }}
              onClick={clearAll} disabled={loading}
              title={c.srSeEnabled ? 'Refund SE points to all pending users and remove them from the queue' : 'Remove all pending requests from the queue'}>
              {loading ? '…' : (c.srSeEnabled ? '↩ Refund All' : '🗑️ Clear All')}
            </button>
          )}
        </div>

        {requests.length === 0 && (
          <p className="sr-admin-empty">No pending requests yet. Once the listener is on, viewers can type <strong className="sr-admin-strong">{`${cmdTrigger} <slot name>`}</strong> in chat.</p>
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
              disabled={busyIds.has(r.id)}
              onClick={() => markPlayed(r.id)} title="Mark as played">
              {busyIds.has(r.id) ? '…' : 'Mark Played'}
            </button>
            {/* Reject & refund — always shown; no-op if SE not connected */}
            <button
              className="sr-admin-btn sr-admin-btn--warn"
              style={{ ...S.btn, padding: '4px 8px', fontSize: '0.7rem', opacity: busyIds.has(r.id) ? 0.5 : 1 }}
              disabled={busyIds.has(r.id)}
              onClick={() => rejectRequest(r.id)}
              title={c.srSeEnabled ? 'Reject & refund SE points to this user' : 'Reject request (SE points not enabled)'}>
              {busyIds.has(r.id) ? '…' : (c.srSeEnabled ? 'Reject + Refund' : 'Reject')}
            </button>
            {/* Remove without refund */}
            <button
              className="sr-admin-btn sr-admin-btn--danger"
              style={{ ...S.btn, padding: '4px 8px', fontSize: '0.7rem', opacity: busyIds.has(r.id) ? 0.5 : 1 }}
              disabled={busyIds.has(r.id)}
              onClick={() => removeRequest(r.id)} title="Remove without refund">Remove</button>
            </div>
          </div>
        ))}
        </div>
      </div>
      </div>
      )}
    </div>
    </div>
  );
}
