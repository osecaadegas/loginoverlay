/**
 * SlotSubmissions.jsx — Premium users submit slots for admin approval.
 * Only add — no edit/delete of existing slots.
 * Includes smart slot search: paste a URL or type a name to auto-fill fields.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitSlot, getMySubmissions } from '../../../services/pendingSlotService';
import { analyzeSlotUrl, scrapeSlotMetadata, findSlotImage, fetchSlotAI } from '../../../services/slotSearchService';
import './SlotSubmissions.css';

const EMPTY_FORM = {
  name: '', provider: '', image: '', rtp: '', volatility: '',
  max_win_multiplier: '', slotUrl: '',
};

export default function SlotSubmissions() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showForm, setShowForm] = useState(false);
  const [searchingImage, setSearchingImage] = useState(false);
  const [analyzingUrl, setAnalyzingUrl] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const searchAbort = useRef(null);

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

  /* ── Smart URL analysis: paste/blur a casino URL → auto-fill name, provider, image ── */
  const handleUrlAnalysis = useCallback(async (url) => {
    if (!url || !url.startsWith('http')) return;
    setAnalyzingUrl(true);
    try {
      // 1. Regex-based extraction (instant)
      const regex = await analyzeSlotUrl(url);
      setForm(prev => ({
        ...prev,
        name: regex.name || prev.name,
        provider: regex.provider || prev.provider,
      }));

      // 2. Scrape OG tags (slower, may have better image)
      const meta = await scrapeSlotMetadata(url);
      setForm(prev => {
        const updated = { ...prev };
        if (meta.name && !prev.name) updated.name = meta.name;
        if (meta.imageUrl && !prev.image) updated.image = meta.imageUrl;
        return updated;
      });

      // 3. If still no image, try Google Image search
      const nameToSearch = regex.name || meta.name;
      const provToSearch = regex.provider || '';
      if (nameToSearch) {
        setSearchingImage(true);
        const img = await findSlotImage(nameToSearch, provToSearch);
        if (img) {
          setForm(prev => ({ ...prev, image: prev.image || img }));
        }
        setSearchingImage(false);
      }
    } catch (e) {
      console.warn('[SlotSubmissions] URL analysis error:', e);
    } finally {
      setAnalyzingUrl(false);
    }
  }, []);

  const handleUrlPaste = (e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    if (pasted?.startsWith('http')) {
      setForm(prev => ({ ...prev, slotUrl: pasted }));
      setTimeout(() => handleUrlAnalysis(pasted), 50);
    }
  };

  const handleUrlBlur = () => {
    if (form.slotUrl?.startsWith('http')) handleUrlAnalysis(form.slotUrl);
  };

  /* ── Image search: trigger when user blurs name field or clicks search btn ── */
  const triggerImageSearch = useCallback(async (name, provider) => {
    if (!name || name.length < 2) return;
    if (searchAbort.current) searchAbort.current = true;
    searchAbort.current = false;
    setSearchingImage(true);
    try {
      const img = await findSlotImage(name, provider || '');
      if (!searchAbort.current && img) {
        setForm(prev => ({ ...prev, image: prev.image || img }));
      }
    } catch (_) { /* silent */ }
    setSearchingImage(false);
  }, []);

  const handleNameBlur = () => {
    if (form.name && !form.image) {
      triggerImageSearch(form.name, form.provider);
    }
  };

  const handleSearchClick = () => {
    if (form.name) triggerImageSearch(form.name, form.provider);
  };

  const openGoogleImages = () => {
    const q = `${form.name} ${form.provider} slot`.trim();
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=isch`, '_blank');
  };

  /* ── AI auto-fill: send name to Gemini, fill provider + RTP + volatility + max win ── */
  const handleAiFill = async () => {
    if (!form.name || form.name.length < 2) {
      flash('Type a slot name first.', 'error');
      return;
    }
    setAiLoading(true);
    try {
      const ai = await fetchSlotAI(form.name);
      if (!ai) {
        flash('AI could not find this slot.', 'error');
        return;
      }
      setForm(prev => ({
        ...prev,
        name: ai.name || prev.name,
        provider: ai.provider || prev.provider,
        rtp: ai.rtp != null ? String(ai.rtp) : prev.rtp,
        volatility: ai.volatility || prev.volatility,
        max_win_multiplier: ai.max_win_multiplier != null ? String(ai.max_win_multiplier) : prev.max_win_multiplier,
      }));
      flash(`✨ AI filled: ${ai.name || form.name} by ${ai.provider || '?'}`);

      // Also trigger image search with AI-returned name/provider
      if (!form.image && (ai.name || form.name)) {
        triggerImageSearch(ai.name || form.name, ai.provider || form.provider);
      }
    } catch (e) {
      console.error('[SlotSubmissions] AI error:', e);
      flash('AI lookup failed.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.provider.trim() || !form.image.trim() || !form.rtp || !form.volatility || !form.max_win_multiplier) {
      flash('All fields are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const slotData = {
        name: form.name.trim(),
        provider: form.provider.trim(),
        image: form.image.trim(),
        rtp: parseFloat(form.rtp),
        volatility: form.volatility,
        max_win_multiplier: parseFloat(form.max_win_multiplier),
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
          {/* URL auto-fill bar */}
          <div className="ss-url-bar">
            <label className="ss-url-label">🔗 Paste a casino URL to auto-fill</label>
            <div className="ss-url-row">
              <input
                name="slotUrl"
                value={form.slotUrl}
                onChange={handleChange}
                onPaste={handleUrlPaste}
                onBlur={handleUrlBlur}
                placeholder="https://stake.com/casino/games/gates-of-olympus …"
                className="ss-url-input"
              />
              {analyzingUrl && <span className="ss-url-spinner">⏳ Analyzing…</span>}
            </div>
          </div>

          <div className="ss-form-grid">
            <div className="ss-field ss-field--required">
              <label>Name *</label>
              <div className="ss-name-row">
                <input name="name" value={form.name} onChange={handleChange} onBlur={handleNameBlur} placeholder="e.g. Gates of Olympus" required />
                <button
                  type="button"
                  className="ss-ai-btn"
                  onClick={handleAiFill}
                  disabled={aiLoading || !form.name}
                  title="AI auto-fill all fields"
                >
                  {aiLoading ? '⏳' : '✨ AI Fill'}
                </button>
              </div>
              {aiLoading && <span className="ss-ai-hint">Asking Gemini for slot data…</span>}
            </div>
            <div className="ss-field ss-field--required">
              <label>Provider *</label>
              <input name="provider" value={form.provider} onChange={handleChange} placeholder="e.g. Pragmatic Play" required />
            </div>
            <div className="ss-field ss-field--required ss-field--wide ss-field--image">
              <label>Image URL *</label>
              <div className="ss-image-row">
                <input name="image" value={form.image} onChange={handleChange} placeholder="https://… (auto-filled or paste)" required />
                <button
                  type="button"
                  className="ss-search-btn"
                  onClick={handleSearchClick}
                  disabled={searchingImage || !form.name}
                  title="Search for slot image"
                >
                  {searchingImage ? '⏳' : '🔍'}
                </button>
                <button
                  type="button"
                  className="ss-google-btn"
                  onClick={openGoogleImages}
                  disabled={!form.name}
                  title="Open Google Images"
                >
                  🌐
                </button>
              </div>
              {searchingImage && <span className="ss-search-hint">Searching for image…</span>}
            </div>
            {/* Image preview */}
            {form.image && (
              <div className="ss-field ss-field--wide ss-image-preview-wrap">
                <img src={form.image} alt="Preview" className="ss-image-preview" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
            <div className="ss-field ss-field--required">
              <label>RTP (%) *</label>
              <input name="rtp" type="number" step="0.01" min="0" max="100" value={form.rtp} onChange={handleChange} placeholder="96.50" required />
            </div>
            <div className="ss-field ss-field--required">
              <label>Volatility *</label>
              <select name="volatility" value={form.volatility} onChange={handleChange} required>
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>
            <div className="ss-field ss-field--required">
              <label>Max Win (x) *</label>
              <input name="max_win_multiplier" type="number" step="0.01" value={form.max_win_multiplier} onChange={handleChange} placeholder="5000" required />
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
