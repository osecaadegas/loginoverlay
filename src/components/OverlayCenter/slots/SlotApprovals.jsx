/**
 * SlotApprovals.jsx — Admin panel for reviewing pending slot submissions.
 * Approve → copies into the real `slots` table.  Deny → stays in pending with note.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getPendingSlots, approveSlot, denySlot } from '../../../services/pendingSlotService';
import './SlotSubmissions.css';

export default function SlotApprovals() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending | approved | denied | all
  const [actionLoading, setActionLoading] = useState(null); // id being processed
  const [denyNoteId, setDenyNoteId] = useState(null);
  const [denyNote, setDenyNote] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getPendingSlots();
      setSlots(data);
    } catch (err) {
      console.error('[SlotApprovals] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await approveSlot(id, user.id);
      flash('Slot approved and added to database!');
      load();
    } catch (err) {
      console.error('[SlotApprovals] approve error:', err);
      flash(`Approve failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id) => {
    setActionLoading(id);
    try {
      await denySlot(id, user.id, denyNote);
      flash('Slot denied.');
      setDenyNoteId(null);
      setDenyNote('');
      load();
    } catch (err) {
      console.error('[SlotApprovals] deny error:', err);
      flash(`Deny failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === 'all' ? slots : slots.filter(s => s.status === filter);
  const pendingCount = slots.filter(s => s.status === 'pending').length;

  return (
    <div className="ss-page">
      {/* Header */}
      <div className="ss-header">
        <div className="ss-header-left">
          <h2 className="ss-title">🛡️ Slot Approvals</h2>
          <p className="ss-subtitle">Review slot submissions from premium users.</p>
        </div>
        {pendingCount > 0 && (
          <span className="sa-pending-badge">{pendingCount} pending</span>
        )}
      </div>

      {/* Flash message */}
      {msg.text && (
        <div className={`ss-flash ss-flash--${msg.type}`}>{msg.text}</div>
      )}

      {/* Filter tabs */}
      <div className="sa-filters">
        {['pending', 'approved', 'denied', 'all'].map(f => (
          <button
            key={f}
            className={`sa-filter-btn ${filter === f ? 'sa-filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'pending' ? `⏳ Pending (${slots.filter(s => s.status === 'pending').length})` :
             f === 'approved' ? `✅ Approved (${slots.filter(s => s.status === 'approved').length})` :
             f === 'denied' ? `❌ Denied (${slots.filter(s => s.status === 'denied').length})` :
             `All (${slots.length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="ss-loading">Loading submissions…</div>
      ) : filtered.length === 0 ? (
        <div className="ss-empty">
          <span className="ss-empty-icon">{filter === 'pending' ? '✨' : '📭'}</span>
          <p>{filter === 'pending' ? 'No pending submissions. All clear!' : 'No submissions in this category.'}</p>
        </div>
      ) : (
        <div className="ss-list">
          {filtered.map(s => (
            <div key={s.id} className={`ss-card ss-card--${s.status}`}>
              <div className="ss-card-left">
                {s.image ? (
                  <img src={s.image} alt={s.name} className="ss-card-img" />
                ) : (
                  <div className="ss-card-img ss-card-img--placeholder">🎰</div>
                )}
              </div>
              <div className="ss-card-body">
                <div className="ss-card-name">{s.name}</div>
                <div className="ss-card-provider">{s.provider}</div>
                <div className="ss-card-meta">
                  {s.rtp && <span>RTP: {s.rtp}%</span>}
                  {s.volatility && <span>Vol: {s.volatility}</span>}
                  {s.max_win_multiplier && <span>Max: {s.max_win_multiplier}x</span>}
                  {s.reels && <span>Reels: {s.reels}</span>}
                  {s.theme && <span>Theme: {s.theme}</span>}
                </div>
                {/* Expand for full details */}
                <button className="sa-detail-toggle" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  {expandedId === s.id ? '▾ Less' : '▸ Details'}
                </button>
                {expandedId === s.id && (
                  <div className="sa-details">
                    {s.description && <p><strong>Description:</strong> {s.description}</p>}
                    {s.paylines && <p><strong>Paylines:</strong> {s.paylines}</p>}
                    {s.min_bet && <p><strong>Bet range:</strong> {s.min_bet} – {s.max_bet}</p>}
                    {s.features?.length > 0 && <p><strong>Features:</strong> {s.features.join(', ')}</p>}
                    {s.tags?.length > 0 && <p><strong>Tags:</strong> {s.tags.join(', ')}</p>}
                    {s.release_date && <p><strong>Release:</strong> {s.release_date}</p>}
                  </div>
                )}
              </div>
              <div className="ss-card-status">
                <span className={`ss-badge ss-badge--${s.status}`}>
                  {s.status === 'pending' ? '⏳ Pending' : s.status === 'approved' ? '✅ Approved' : '❌ Denied'}
                </span>
                <div className="ss-card-date">{new Date(s.submitted_at).toLocaleDateString()}</div>

                {/* Admin actions */}
                {s.status === 'pending' && (
                  <div className="sa-actions">
                    <button
                      className="sa-approve-btn"
                      disabled={actionLoading === s.id}
                      onClick={() => handleApprove(s.id)}
                    >
                      {actionLoading === s.id ? '…' : '✓ Approve'}
                    </button>
                    {denyNoteId === s.id ? (
                      <div className="sa-deny-form">
                        <input
                          className="sa-deny-input"
                          value={denyNote}
                          onChange={e => setDenyNote(e.target.value)}
                          placeholder="Reason (optional)"
                        />
                        <button
                          className="sa-deny-confirm"
                          disabled={actionLoading === s.id}
                          onClick={() => handleDeny(s.id)}
                        >
                          Confirm Deny
                        </button>
                        <button className="sa-deny-cancel" onClick={() => { setDenyNoteId(null); setDenyNote(''); }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="sa-deny-btn"
                        onClick={() => setDenyNoteId(s.id)}
                      >
                        ✕ Deny
                      </button>
                    )}
                  </div>
                )}
                {s.review_note && <div className="ss-card-note">Note: {s.review_note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
