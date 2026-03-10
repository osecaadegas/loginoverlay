/**
 * SlotRequestsConfig.jsx — Config panel for Slot Requests widget.
 * Shows SE command, lets streamer manage the queue (mark played / clear).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';

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

  const set = (key, val) => onChange({ ...c, [key]: val });

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

  const commandUrl = user
    ? `\${customapi.${window.location.origin}/api/chat-commands?cmd=sr&user_id=${user.id}&requester=\${user}&slot=\${querystring}&_=1}`
    : '(log in to see your command)';

  return (
    <div style={S.section}>
      {/* SE Command */}
      <div>
        <p style={S.label}>🎮 StreamElements Command</p>
        <p style={S.hint}>Create a <strong style={{ color: '#e2e8f0' }}>!sr</strong> command with this response:</p>
        <code
          style={S.code}
          title="Click to copy"
          onClick={(e) => {
            navigator.clipboard.writeText(e.currentTarget.textContent);
            e.currentTarget.style.borderColor = '#f59e0b';
            setTimeout(() => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }, 1500);
          }}
        >
          {commandUrl}
        </code>
        <p style={{ ...S.hint, marginTop: 4 }}>
          Viewers type: <strong style={{ color: '#e2e8f0' }}>!sr Gates of Olympus</strong> · Click to copy
        </p>
      </div>

      {/* Display options */}
      <div>
        <p style={S.label}>Display</p>
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
