/**
 * SlotApprovals.jsx - Admin panel for reviewing pending slot submissions.
 * Approve copies a pending submission into the live slots table.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getPendingSlots, approveSlot, denySlot, updatePendingSlot } from '../../../services/pendingSlotService';
import './SlotSubmissions.css';

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
};

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString();
}

function formatVolatility(value) {
  if (!value) return null;
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function compactNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number.isInteger(number) ? String(number) : String(number.toFixed(2)).replace(/\.?0+$/, '');
}

export default function SlotApprovals() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [batchApproving, setBatchApproving] = useState(false);
  const [approveAllArmed, setApproveAllArmed] = useState(false);
  const [denyNoteId, setDenyNoteId] = useState(null);
  const [denyNote, setDenyNote] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await getPendingSlots();
      setSlots(data);
    } catch (err) {
      console.error('[SlotApprovals] load error:', err);
      setMsg({ text: 'Unable to load slot submissions right now.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingSlots = useMemo(() => slots.filter(slot => slot.status === 'pending'), [slots]);
  const approvedCount = useMemo(() => slots.filter(slot => slot.status === 'approved').length, [slots]);
  const deniedCount = useMemo(() => slots.filter(slot => slot.status === 'denied').length, [slots]);
  const pendingCount = pendingSlots.length;
  const filtered = filter === 'all' ? slots : slots.filter(slot => slot.status === filter);
  const approvalRate = slots.length > 0 ? Math.round((approvedCount / slots.length) * 100) : 0;
  const filterOptions = [
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'approved', label: 'Approved', count: approvedCount },
    { id: 'denied', label: 'Denied', count: deniedCount },
    { id: 'all', label: 'All', count: slots.length },
  ];

  useEffect(() => {
    if (pendingCount === 0 && approveAllArmed) {
      setApproveAllArmed(false);
    }
  }, [approveAllArmed, pendingCount]);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3200);
  };

  const requireAdminSession = () => {
    if (!user?.id) {
      flash('You must be signed in as an admin to review submissions.', 'error');
      return false;
    }
    return true;
  };

  const handleApprove = async (id) => {
    if (!requireAdminSession()) return;
    setActionLoading(id);
    try {
      await approveSlot(id, user.id);
      flash('Slot approved and added to the database.');
      await load({ silent: true });
    } catch (err) {
      console.error('[SlotApprovals] approve error:', err);
      flash(`Approve failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    if (!requireAdminSession()) return;

    const ids = pendingSlots.map(slot => slot.id);
    if (ids.length === 0) {
      setApproveAllArmed(false);
      flash('There are no pending submissions to approve.', 'error');
      return;
    }

    setBatchApproving(true);
    setActionLoading('bulk-approve');
    let approved = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await approveSlot(id, user.id);
        approved += 1;
      } catch (err) {
        failed += 1;
        console.error('[SlotApprovals] bulk approve error:', err);
      }
    }

    setApproveAllArmed(false);
    await load({ silent: true });
    setActionLoading(null);
    setBatchApproving(false);

    if (failed > 0) {
      flash(`${approved} approved. ${failed} could not be approved, so they stayed in the queue.`, 'error');
      return;
    }

    flash(`${approved} pending submissions approved and added to the database.`);
  };

  const handleDeny = async (id) => {
    if (!requireAdminSession()) return;
    setActionLoading(id);
    try {
      await denySlot(id, user.id, denyNote);
      flash('Slot denied.');
      setDenyNoteId(null);
      setDenyNote('');
      await load({ silent: true });
    } catch (err) {
      console.error('[SlotApprovals] deny error:', err);
      flash(`Deny failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (slot) => {
    setEditingId(slot.id);
    setEditForm({
      name: slot.name || '',
      provider: slot.provider || '',
      image: slot.image || '',
      rtp: slot.rtp ?? '',
      volatility: slot.volatility || '',
      max_win_multiplier: slot.max_win_multiplier ?? '',
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
      flash('Slot details updated.');
      setEditingId(null);
      await load({ silent: true });
    } catch (err) {
      console.error('[SlotApprovals] edit error:', err);
      flash(`Edit failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const activeFilter = filterOptions.find(option => option.id === filter);

  return (
    <div className="ss-page sa-page" data-tour="approvals-page">
      <div className="sa-page-shell">
        <section className="sa-page-hero" aria-labelledby="slot-approvals-title">
          <div className="sa-page-hero-copy">
            <span className="sa-page-eyebrow">Moderation Desk</span>
            <h2 id="slot-approvals-title" className="sa-page-title">Slot approvals</h2>
            <p className="sa-page-subtitle">
              Review new slot submissions, fix missing details, and move clean entries into the live database.
            </p>
          </div>

          <div className="sa-hero-actions">
            <div className="sa-hero-action-copy">
              <strong>{pendingCount}</strong>
              <span>{pendingCount === 1 ? 'slot waiting' : 'slots waiting'}</span>
            </div>
            <button
              type="button"
              className="sa-approve-all-btn"
              disabled={pendingCount === 0 || loading || batchApproving}
              onClick={() => setApproveAllArmed(true)}
            >
              {batchApproving ? 'Approving...' : `Verify all pending (${pendingCount})`}
            </button>
          </div>

          <div className="sa-page-metrics" aria-label="Approval summary">
            <div className="sa-page-metric-card">
              <span className="sa-page-metric-label">Pending</span>
              <strong className="sa-page-metric-value">{pendingCount}</strong>
            </div>
            <div className="sa-page-metric-card">
              <span className="sa-page-metric-label">Approved</span>
              <strong className="sa-page-metric-value">{approvedCount}</strong>
            </div>
            <div className="sa-page-metric-card">
              <span className="sa-page-metric-label">Denied</span>
              <strong className="sa-page-metric-value">{deniedCount}</strong>
            </div>
            <div className="sa-page-metric-card">
              <span className="sa-page-metric-label">Rate</span>
              <strong className="sa-page-metric-value">{approvalRate}%</strong>
            </div>
          </div>
        </section>

        {approveAllArmed && (
          <div className="sa-bulk-confirm" role="status">
            <div>
              <strong>Approve all pending submissions?</strong>
              <span>This will add {pendingCount} slots to the live slot database.</span>
            </div>
            <div className="sa-bulk-confirm-actions">
              <button type="button" className="sa-approve-btn" disabled={batchApproving} onClick={handleApproveAll}>
                Confirm approve all
              </button>
              <button type="button" className="sa-edit-cancel" disabled={batchApproving} onClick={() => setApproveAllArmed(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {msg.text && (
          <div className={`ss-flash ss-flash--${msg.type}`} role="status" aria-live="polite">
            {msg.text}
          </div>
        )}

        <section className="sa-filters-card" aria-labelledby="approval-queue-title">
          <div className="sa-toolbar">
            <div className="sa-toolbar-header">
              <span className="sa-section-heading__eyebrow">Review Queue</span>
              <h3 id="approval-queue-title" className="sa-section-heading__title">Choose what to inspect</h3>
            </div>
            <span className="sa-section-heading__pill">
              {activeFilter?.label || 'Queue'} - {filtered.length} shown
            </span>
          </div>

          <div className="sa-filters" role="tablist" aria-label="Submission status filters">
            {filterOptions.map(option => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={filter === option.id}
                className={`sa-filter-btn ${filter === option.id ? 'sa-filter-btn--active' : ''}`}
                onClick={() => setFilter(option.id)}
              >
                <span>{option.label}</span>
                <strong>{option.count}</strong>
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="ss-loading">Loading submissions...</div>
        ) : filtered.length === 0 ? (
          <div className="ss-empty">
            <span className="ss-empty-icon">No slots</span>
            <p>{filter === 'pending' ? 'No pending submissions. The review queue is clear.' : 'No submissions in this category.'}</p>
          </div>
        ) : (
          <div className="ss-list" role="tabpanel" aria-label={`${activeFilter?.label || 'Selected'} submissions`}>
            {filtered.map(slot => {
              const displayImage = editingId === slot.id ? editForm.image : slot.image;
              const displayName = editingId === slot.id ? editForm.name : slot.name;
              const statusLabel = STATUS_LABELS[slot.status] || 'Unknown';
              const meta = [
                ['RTP', compactNumber(slot.rtp) ? `${compactNumber(slot.rtp)}%` : null],
                ['Volatility', formatVolatility(slot.volatility)],
                ['Max win', compactNumber(slot.max_win_multiplier) ? `${compactNumber(slot.max_win_multiplier)}x` : null],
              ].filter(([, value]) => Boolean(value));
              const submitterName = slot.submitter_name || slot.se_username || 'Unknown user';
              const submitterHandle = slot.submitter_handle && slot.submitter_handle !== submitterName
                ? String(slot.submitter_handle).replace(/^@/, '')
                : '';

              return (
                <article key={slot.id} className={`ss-card ss-card--${slot.status}`}>
                  <div className="ss-card-left">
                    {displayImage ? (
                      <img src={displayImage} alt={`${displayName || 'Slot'} artwork`} className="ss-card-img" loading="lazy" />
                    ) : (
                      <div className="ss-card-img ss-card-img--placeholder">No image</div>
                    )}
                  </div>

                  <div className="ss-card-body">
                    {editingId === slot.id ? (
                      <div className="sa-edit-form">
                        <div className="sa-edit-row">
                          <label htmlFor={`slot-name-${slot.id}`}>Name</label>
                          <input id={`slot-name-${slot.id}`} value={editForm.name} onChange={event => setEditForm(form => ({ ...form, name: event.target.value }))} />
                        </div>
                        <div className="sa-edit-row">
                          <label htmlFor={`slot-provider-${slot.id}`}>Provider</label>
                          <input id={`slot-provider-${slot.id}`} value={editForm.provider} onChange={event => setEditForm(form => ({ ...form, provider: event.target.value }))} />
                        </div>
                        <div className="sa-edit-row">
                          <label htmlFor={`slot-image-${slot.id}`}>Image URL</label>
                          <input id={`slot-image-${slot.id}`} value={editForm.image} onChange={event => setEditForm(form => ({ ...form, image: event.target.value }))} />
                        </div>
                        <div className="sa-edit-row-group">
                          <div className="sa-edit-row">
                            <label htmlFor={`slot-rtp-${slot.id}`}>RTP</label>
                            <input id={`slot-rtp-${slot.id}`} type="number" step="0.01" value={editForm.rtp} onChange={event => setEditForm(form => ({ ...form, rtp: event.target.value }))} />
                          </div>
                          <div className="sa-edit-row">
                            <label htmlFor={`slot-volatility-${slot.id}`}>Volatility</label>
                            <select id={`slot-volatility-${slot.id}`} value={editForm.volatility} onChange={event => setEditForm(form => ({ ...form, volatility: event.target.value }))}>
                              <option value="">Not set</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="very_high">Very High</option>
                            </select>
                          </div>
                          <div className="sa-edit-row">
                            <label htmlFor={`slot-max-win-${slot.id}`}>Max Win (x)</label>
                            <input id={`slot-max-win-${slot.id}`} type="number" value={editForm.max_win_multiplier} onChange={event => setEditForm(form => ({ ...form, max_win_multiplier: event.target.value }))} />
                          </div>
                        </div>
                        <div className="sa-edit-actions">
                          <button className="sa-edit-save" disabled={actionLoading === slot.id || batchApproving} onClick={() => handleSaveEdit(slot.id)}>
                            {actionLoading === slot.id ? 'Saving...' : 'Save changes'}
                          </button>
                          <button className="sa-edit-cancel" disabled={batchApproving} onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="ss-card-name">{slot.name || 'Unnamed slot'}</div>
                        <div className="ss-card-provider">{slot.provider || 'Provider missing'}</div>
                        <div className="ss-card-submitter">
                          <span className="ss-card-submitter-label">Submitted by</span>
                          <span className="ss-card-submitter-name">{submitterName}</span>
                          {submitterHandle && <span className="ss-card-submitter-handle">@{submitterHandle}</span>}
                        </div>
                        <div className="ss-card-meta">
                          {meta.length > 0 ? (
                            meta.map(([label, value]) => (
                              <span key={label}>{label}: {value}</span>
                            ))
                          ) : (
                            <span>Metadata needs review</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="ss-card-status">
                    <span className={`ss-badge ss-badge--${slot.status}`}>{statusLabel}</span>
                    <div className="ss-card-date">Submitted {formatDate(slot.submitted_at)}</div>

                    <div className="sa-actions">
                      <button
                        type="button"
                        className="sa-edit-btn"
                        disabled={batchApproving}
                        onClick={() => (editingId === slot.id ? setEditingId(null) : startEdit(slot))}
                      >
                        {editingId === slot.id ? 'Close edit' : 'Edit'}
                      </button>

                      {slot.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="sa-approve-btn"
                            disabled={actionLoading === slot.id || batchApproving}
                            onClick={() => handleApprove(slot.id)}
                          >
                            {actionLoading === slot.id ? 'Approving...' : 'Approve'}
                          </button>

                          {denyNoteId === slot.id ? (
                            <div className="sa-deny-form">
                              <input
                                className="sa-deny-input"
                                value={denyNote}
                                onChange={event => setDenyNote(event.target.value)}
                                placeholder="Reason, optional"
                                aria-label="Deny reason"
                              />
                              <button
                                type="button"
                                className="sa-deny-confirm"
                                disabled={actionLoading === slot.id || batchApproving}
                                onClick={() => handleDeny(slot.id)}
                              >
                                Confirm deny
                              </button>
                              <button
                                type="button"
                                className="sa-deny-cancel"
                                disabled={batchApproving}
                                onClick={() => {
                                  setDenyNoteId(null);
                                  setDenyNote('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="sa-deny-btn"
                              disabled={batchApproving}
                              onClick={() => setDenyNoteId(slot.id)}
                            >
                              Deny
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {slot.review_note && <div className="ss-card-note">Note: {slot.review_note}</div>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
