/**
 * SlotApprovals.jsx — Admin panel for reviewing pending slot submissions.
 * Approve → copies into the real `slots` table.  Deny → stays in pending with note.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getPendingSlots, approveSlot, denySlot, updatePendingSlot } from '../../../services/pendingSlotService';
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
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

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

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm({
      name: s.name || '',
      provider: s.provider || '',
      image: s.image || '',
      rtp: s.rtp ?? '',
      volatility: s.volatility || '',
      max_win_multiplier: s.max_win_multiplier ?? '',
    });
  };

  const handleSaveEdit = async (id) => {
    setActionLoading(id);
    try {
      await updatePendingSlot(id, {
        name: editForm.name,
        provider: editForm.provider,
        image: editForm.image,
        rtp: editForm.rtp ? parseFloat(editForm.rtp) : null,
        volatility: editForm.volatility || null,
        max_win_multiplier: editForm.max_win_multiplier ? parseFloat(editForm.max_win_multiplier) : null,
      });
      flash('Slot updated!');
      setEditingId(null);
      load();
    } catch (err) {
      flash(`Edit failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === 'all' ? slots : slots.filter(s => s.status === filter);
  const pendingCount = slots.filter(s => s.status === 'pending').length;
  const approvedCount = slots.filter(s => s.status === 'approved').length;
  const deniedCount = slots.filter(s => s.status === 'denied').length;
  const filteredCount = filtered.length;
  const approvalRate = slots.length > 0 ? Math.round((approvedCount / slots.length) * 100) : 0;
  const pageNote = pendingCount > 0
    ? 'Triage pending slot submissions, edit weak metadata before approval, and keep the shared slot catalog clean without leaving the review queue.'
    : 'The queue is clear. Approved and denied submissions remain available here for quick audits and metadata corrections.';
  const filterLabel = filter === 'all'
    ? 'All submissions'
    : filter === 'pending'
      ? 'Pending queue'
      : filter === 'approved'
        ? 'Approved archive'
        : 'Denied archive';

  return (
    <div className="ss-page sa-page" data-tour="approvals-page">
      <div className="sa-page-shell">
      <div className="sa-page-hero">
        <div className="sa-page-hero-copy">
          <span className="sa-page-eyebrow">Moderation Desk</span>
          <h2 className="sa-page-title">Slot approvals</h2>
          <p className="sa-page-subtitle">
            Review community submissions, refine metadata, and approve or deny additions from one sharper admin control surface.
          </p>
          <p className="sa-page-note">{pageNote}</p>
        </div>

        <div className="sa-page-metrics">
          <div className="sa-page-metric-card">
            <span className="sa-page-metric-label">Backlog</span>
            <strong className="sa-page-metric-value">{pendingCount}</strong>
            <span className="sa-page-metric-meta">Submissions waiting for review</span>
          </div>
          <div className="sa-page-metric-card">
            <span className="sa-page-metric-label">Approved</span>
            <strong className="sa-page-metric-value">{approvedCount}</strong>
            <span className="sa-page-metric-meta">Accepted into the live slot database</span>
          </div>
          <div className="sa-page-metric-card">
            <span className="sa-page-metric-label">Denied</span>
            <strong className="sa-page-metric-value">{deniedCount}</strong>
            <span className="sa-page-metric-meta">Rejected with review notes when needed</span>
          </div>
          <div className="sa-page-metric-card">
            <span className="sa-page-metric-label">Approval Rate</span>
            <strong className="sa-page-metric-value">{approvalRate}%</strong>
            <span className="sa-page-metric-meta">Across {slots.length} total submissions</span>
          </div>
        </div>
      </div>

      {/* Flash message */}
      {msg.text && (
        <div className={`ss-flash ss-flash--${msg.type}`}>{msg.text}</div>
      )}

      {/* Filter tabs */}
      <div className="sa-section-heading">
        <div>
          <span className="sa-section-heading__eyebrow">Review Filters</span>
          <h3 className="sa-section-heading__title">Switch between backlog, approvals, and denials without leaving the queue</h3>
        </div>
        <span className="sa-section-heading__pill">{filterLabel}</span>
      </div>

      <div className="sa-filters-card">
        <div className="sa-filters">
          {['pending', 'approved', 'denied', 'all'].map(f => (
            <button
              key={f}
              className={`sa-filter-btn ${filter === f ? 'sa-filter-btn--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'pending' ? `⏳ Pending (${pendingCount})` :
               f === 'approved' ? `✅ Approved (${approvedCount})` :
               f === 'denied' ? `❌ Denied (${deniedCount})` :
               `All (${slots.length})`}
            </button>
          ))}
        </div>
        <p className="sa-filters-note">
          Pending submissions can be edited before approval, denied with an optional reason, or moved into the live database immediately when the data is ready.
        </p>
      </div>

      <div className="sa-section-heading sa-section-heading--compact">
        <div>
          <span className="sa-section-heading__eyebrow">Queue</span>
          <h3 className="sa-section-heading__title">Inspect each submission and take the next moderation action fast</h3>
        </div>
        <span className="sa-section-heading__pill">{filteredCount} shown</span>
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
                {editingId === s.id ? (
                  editForm.image ? (
                    <img src={editForm.image} alt="" className="ss-card-img" />
                  ) : (
                    <div className="ss-card-img ss-card-img--placeholder">🎰</div>
                  )
                ) : s.image ? (
                  <img src={s.image} alt={s.name} className="ss-card-img" />
                ) : (
                  <div className="ss-card-img ss-card-img--placeholder">🎰</div>
                )}
              </div>
              <div className="ss-card-body">
                {editingId === s.id ? (
                  <div className="sa-edit-form">
                    <div className="sa-edit-row">
                      <label>Name</label>
                      <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="sa-edit-row">
                      <label>Provider</label>
                      <input value={editForm.provider} onChange={e => setEditForm(f => ({ ...f, provider: e.target.value }))} />
                    </div>
                    <div className="sa-edit-row">
                      <label>Image URL</label>
                      <input value={editForm.image} onChange={e => setEditForm(f => ({ ...f, image: e.target.value }))} />
                    </div>
                    <div className="sa-edit-row-group">
                      <div className="sa-edit-row">
                        <label>RTP</label>
                        <input type="number" step="0.01" value={editForm.rtp} onChange={e => setEditForm(f => ({ ...f, rtp: e.target.value }))} />
                      </div>
                      <div className="sa-edit-row">
                        <label>Volatility</label>
                        <select value={editForm.volatility} onChange={e => setEditForm(f => ({ ...f, volatility: e.target.value }))}>
                          <option value="">—</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="very_high">Very High</option>
                        </select>
                      </div>
                      <div className="sa-edit-row">
                        <label>Max Win (x)</label>
                        <input type="number" value={editForm.max_win_multiplier} onChange={e => setEditForm(f => ({ ...f, max_win_multiplier: e.target.value }))} />
                      </div>
                    </div>
                    <div className="sa-edit-actions">
                      <button className="sa-edit-save" disabled={actionLoading === s.id} onClick={() => handleSaveEdit(s.id)}>
                        {actionLoading === s.id ? '⏳' : '💾'} Save
                      </button>
                      <button className="sa-edit-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="ss-card-name">{s.name}</div>
                    <div className="ss-card-provider">{s.provider}</div>
                    <div className="ss-card-submitter">
                      <span className="ss-card-submitter-label">Added by</span>
                      <span className="ss-card-submitter-name">{s.submitter_name || s.se_username || 'Unknown user'}</span>
                      {s.submitter_handle && s.submitter_handle !== (s.submitter_name || s.se_username) && (
                        <span className="ss-card-submitter-handle">@{String(s.submitter_handle).replace(/^@/, '')}</span>
                      )}
                    </div>
                    <div className="ss-card-meta">
                      <span>RTP: {s.rtp}%</span>
                      <span>Vol: {s.volatility}</span>
                      <span>Max: {s.max_win_multiplier}x</span>
                    </div>
                  </>
                )}
              </div>
              <div className="ss-card-status">
                <span className={`ss-badge ss-badge--${s.status}`}>
                  {s.status === 'pending' ? '⏳ Pending' : s.status === 'approved' ? '✅ Approved' : '❌ Denied'}
                </span>
                <div className="ss-card-date">{new Date(s.submitted_at).toLocaleDateString()}</div>

                {/* Edit button for any status */}
                {s.status !== 'pending' && (
                  <div className="sa-actions">
                    <button
                      className="sa-edit-btn"
                      onClick={() => editingId === s.id ? setEditingId(null) : startEdit(s)}
                    >
                      {editingId === s.id ? '✕ Close Edit' : '✏️ Edit'}
                    </button>
                  </div>
                )}

                {/* Admin actions for pending */}
                {s.status === 'pending' && (
                  <div className="sa-actions">
                    <button
                      className="sa-edit-btn"
                      onClick={() => editingId === s.id ? setEditingId(null) : startEdit(s)}
                    >
                      {editingId === s.id ? '✕ Close Edit' : '✏️ Edit'}
                    </button>
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
    </div>
  );
}
