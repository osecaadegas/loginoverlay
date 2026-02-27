/**
 * SlotSubmissions.jsx — Premium users submit slots for admin approval.
 * Only add — no edit/delete of existing slots.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitSlot, getMySubmissions } from '../../../services/pendingSlotService';
import './SlotSubmissions.css';

const EMPTY_FORM = {
  name: '', provider: '', image: '', rtp: '', volatility: '',
  max_win_multiplier: '', reels: '', min_bet: '0.10', max_bet: '100',
  features: '', tags: '', description: '', release_date: '',
  paylines: '', theme: '',
};

export default function SlotSubmissions() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showForm, setShowForm] = useState(false);

  const loadSubmissions = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMySubmissions(user.id);
      setSubmissions(data);
    } catch (err) {
      console.error('[SlotSubmissions] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.provider.trim()) {
      flash('Name and Provider are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const slotData = {
        ...form,
        rtp: form.rtp ? parseFloat(form.rtp) : null,
        max_win_multiplier: form.max_win_multiplier ? parseFloat(form.max_win_multiplier) : null,
        min_bet: form.min_bet ? parseFloat(form.min_bet) : 0.10,
        max_bet: form.max_bet ? parseFloat(form.max_bet) : 100,
        features: form.features ? form.features.split(',').map(f => f.trim()).filter(Boolean) : [],
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      await submitSlot(user.id, slotData);
      flash('Slot submitted for approval!');
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadSubmissions();
    } catch (err) {
      console.error('[SlotSubmissions] submit error:', err);
      flash(err.message?.includes('duplicate') ? 'A slot with this name already exists.' : `Error: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const deniedCount = submissions.filter(s => s.status === 'denied').length;

  return (
    <div className="ss-page">
      {/* Header */}
      <div className="ss-header">
        <div className="ss-header-left">
          <h2 className="ss-title">🎰 Submit a Slot</h2>
          <p className="ss-subtitle">Suggest slots to add to the database. An admin will review them.</p>
        </div>
        <button className="ss-add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Submission'}
        </button>
      </div>

      {/* Flash message */}
      {msg.text && (
        <div className={`ss-flash ss-flash--${msg.type}`}>{msg.text}</div>
      )}

      {/* Submission form */}
      {showForm && (
        <form className="ss-form" onSubmit={handleSubmit}>
          <div className="ss-form-grid">
            <div className="ss-field ss-field--required">
              <label>Name *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Gates of Olympus" required />
            </div>
            <div className="ss-field ss-field--required">
              <label>Provider *</label>
              <input name="provider" value={form.provider} onChange={handleChange} placeholder="e.g. Pragmatic Play" required />
            </div>
            <div className="ss-field">
              <label>Image URL</label>
              <input name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
            </div>
            <div className="ss-field">
              <label>RTP (%)</label>
              <input name="rtp" type="number" step="0.01" min="0" max="100" value={form.rtp} onChange={handleChange} placeholder="96.50" />
            </div>
            <div className="ss-field">
              <label>Volatility</label>
              <select name="volatility" value={form.volatility} onChange={handleChange}>
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>
            <div className="ss-field">
              <label>Max Win (x)</label>
              <input name="max_win_multiplier" type="number" step="0.01" value={form.max_win_multiplier} onChange={handleChange} placeholder="5000" />
            </div>
            <div className="ss-field">
              <label>Reels</label>
              <input name="reels" value={form.reels} onChange={handleChange} placeholder="5x3" />
            </div>
            <div className="ss-field">
              <label>Paylines</label>
              <input name="paylines" value={form.paylines} onChange={handleChange} placeholder="20" />
            </div>
            <div className="ss-field">
              <label>Min Bet</label>
              <input name="min_bet" type="number" step="0.01" value={form.min_bet} onChange={handleChange} />
            </div>
            <div className="ss-field">
              <label>Max Bet</label>
              <input name="max_bet" type="number" step="0.01" value={form.max_bet} onChange={handleChange} />
            </div>
            <div className="ss-field">
              <label>Theme</label>
              <input name="theme" value={form.theme} onChange={handleChange} placeholder="Greek Mythology" />
            </div>
            <div className="ss-field">
              <label>Release Date</label>
              <input name="release_date" type="date" value={form.release_date} onChange={handleChange} />
            </div>
            <div className="ss-field ss-field--wide">
              <label>Features (comma-separated)</label>
              <input name="features" value={form.features} onChange={handleChange} placeholder="Free Spins, Multiplier, Bonus Buy" />
            </div>
            <div className="ss-field ss-field--wide">
              <label>Tags (comma-separated)</label>
              <input name="tags" value={form.tags} onChange={handleChange} placeholder="popular, new, megaways" />
            </div>
            <div className="ss-field ss-field--wide">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Short description of the slot..." />
            </div>
          </div>
          <div className="ss-form-actions">
            <button type="submit" className="ss-submit-btn" disabled={submitting}>
              {submitting ? 'Submitting…' : '📤 Submit for Approval'}
            </button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="ss-stats">
        <div className="ss-stat"><span className="ss-stat-num">{submissions.length}</span><span className="ss-stat-label">Total</span></div>
        <div className="ss-stat ss-stat--pending"><span className="ss-stat-num">{pendingCount}</span><span className="ss-stat-label">Pending</span></div>
        <div className="ss-stat ss-stat--approved"><span className="ss-stat-num">{approvedCount}</span><span className="ss-stat-label">Approved</span></div>
        <div className="ss-stat ss-stat--denied"><span className="ss-stat-num">{deniedCount}</span><span className="ss-stat-label">Denied</span></div>
      </div>

      {/* Submissions list */}
      {loading ? (
        <div className="ss-loading">Loading your submissions…</div>
      ) : submissions.length === 0 ? (
        <div className="ss-empty">
          <span className="ss-empty-icon">📭</span>
          <p>No submissions yet. Click "+ New Submission" to suggest a slot.</p>
        </div>
      ) : (
        <div className="ss-list">
          {submissions.map(s => (
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
                </div>
              </div>
              <div className="ss-card-status">
                <span className={`ss-badge ss-badge--${s.status}`}>
                  {s.status === 'pending' ? '⏳ Pending' : s.status === 'approved' ? '✅ Approved' : '❌ Denied'}
                </span>
                {s.review_note && <div className="ss-card-note">Note: {s.review_note}</div>}
                <div className="ss-card-date">{new Date(s.submitted_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
