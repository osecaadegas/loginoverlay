/**
 * SlotSubmissions.jsx — Premium users submit slots for admin approval.
 * Only add — no edit/delete of existing slots.
 * Includes smart slot search: paste a URL or type a name to auto-fill fields.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitSlot, getMySubmissions } from '../../../services/pendingSlotService';
import { analyzeSlotUrl, scrapeSlotMetadata, findSlotImage, fetchSlotAI, fetchSafeImage } from '../../../services/slotSearchService';
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
  const [imageSafety, setImageSafety] = useState(null); // { safe, reason, source }
  const [dataSource, setDataSource] = useState(null);   // 'verified_database' | 'gemini_ai'
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

  /* ── Shared AI auto-fill: fetch RTP, provider, volatility, max win, image ── */
  const autoFillInFlight = useRef(false);
  const lastAiName = useRef('');   // track which name was last AI-filled

  const autoFillSlotData = useCallback(async (slotName, providerHint) => {
    if (!slotName || slotName.length < 2) return;
    if (autoFillInFlight.current) return;          // prevent duplicate parallel calls
    autoFillInFlight.current = true;
    setAiLoading(true);
    try {
      const ai = await fetchSlotAI(slotName);
      // Skip if API returned not_found, error, or empty
      if (!ai || ai.source === 'not_found' || ai.source === 'error') {
        const reason = ai?.error || 'Slot not recognized';
        flash(`AI could not find "${slotName}" — ${reason}`, 'error');
        return;
      }
      lastAiName.current = slotName.toLowerCase().trim();
      setForm(prev => ({
        ...prev,
        name:                ai.name             || prev.name,
        provider:            ai.provider          || providerHint || prev.provider,
        rtp:                 ai.rtp != null       ? String(ai.rtp)                 : prev.rtp,
        volatility:          ai.volatility        || prev.volatility,
        max_win_multiplier:  ai.max_win_multiplier != null ? String(ai.max_win_multiplier) : prev.max_win_multiplier,
      }));
      setDataSource(ai.source || 'gemini_ai');
      const srcLabel  = ai.source === 'verified_database' ? '✅ Verified DB' : '🤖 AI';
      const safeLabel = ai.twitch_safe === false ? ' ⚠️ Not Twitch-safe!' : ai.twitch_safe === true ? ' 🟢 Twitch-safe' : '';
      flash(`${srcLabel}: ${ai.name || slotName} by ${ai.provider || '?'}${safeLabel}`);

      // Also search for a safe image if we don't have one yet
      const finalName     = ai.name     || slotName;
      const finalProvider = ai.provider  || providerHint || '';
      // Read current form image via a ref-like pattern (check after state flushes)
      setTimeout(() => {
        setForm(prev => {
          if (!prev.image && finalName) triggerImageSearch(finalName, finalProvider);
          return prev;
        });
      }, 0);
    } catch (e) {
      console.error('[SlotSubmissions] AI auto-fill error:', e);
      flash('AI lookup failed.', 'error');
    } finally {
      setAiLoading(false);
      autoFillInFlight.current = false;
    }
  }, []);

  /* ── Smart URL analysis: paste/blur a casino URL → auto-fill ALL fields ── */
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

      // 3. Auto-fill everything via AI (provider, RTP, volatility, max win, image)
      const nameToSearch = regex.name || meta.name;
      const providerHint = regex.provider || '';
      if (nameToSearch) {
        await autoFillSlotData(nameToSearch, providerHint);
      }
    } catch (e) {
      console.warn('[SlotSubmissions] URL analysis error:', e);
    } finally {
      setAnalyzingUrl(false);
    }
  }, [autoFillSlotData]);

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

  /* ── Image search: uses server-side safe image pipeline ── */
  const triggerImageSearch = useCallback(async (name, provider) => {
    if (!name || name.length < 2) return;
    if (searchAbort.current) searchAbort.current = true;
    searchAbort.current = false;
    setSearchingImage(true);
    setImageSafety(null);
    try {
      // Try safe server-side search first (SafeSearch + Gemini Vision)
      const safeResult = await fetchSafeImage(name, provider || '');
      if (!searchAbort.current && safeResult?.imageUrl) {
        setForm(prev => ({ ...prev, image: prev.image || safeResult.imageUrl }));
        setImageSafety({ safe: safeResult.safe, reason: safeResult.reason, source: safeResult.source });
        setSearchingImage(false);
        return;
      }
      // Fallback: client-side Google Images scrape (no safety validation)
      const img = await findSlotImage(name, provider || '');
      if (!searchAbort.current && img) {
        setForm(prev => ({ ...prev, image: prev.image || img }));
        setImageSafety({ safe: null, reason: 'No AI validation — verify manually', source: 'fallback' });
      }
    } catch (_) { /* silent */ }
    setSearchingImage(false);
  }, []);

  const handleNameBlur = () => {
    if (!form.name || form.name.length < 2) return;
    const currentName = form.name.toLowerCase().trim();
    // Always re-fill if name changed since last AI fill, or if key fields are still empty
    if (currentName !== lastAiName.current || !form.rtp || !form.provider || !form.max_win_multiplier || !form.volatility) {
      autoFillSlotData(form.name, form.provider);
    } else if (!form.image) {
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

  /* ── AI auto-fill button: reuses shared autoFillSlotData ── */
  const handleAiFill = () => {
    if (!form.name || form.name.length < 2) {
      flash('Type a slot name first.', 'error');
      return;
    }
    autoFillSlotData(form.name, form.provider);
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
      setImageSafety(null);
      setDataSource(null);
      lastAiName.current = '';
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
            <div className="ss-field ss-field--required ss-field--name">
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
                <input name="image" value={form.image} onChange={handleChange} placeholder="https://… (auto-filled or paste)" autoComplete="off" required />
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
              {searchingImage && <span className="ss-search-hint">🛡️ Searching with SafeSearch + AI validation…</span>}
            </div>
            {/* Image preview + safety badge */}
            {form.image && (
              <div className="ss-field ss-field--wide ss-image-preview-wrap">
                <img src={form.image} alt="Preview" className="ss-image-preview" onError={(e) => { e.target.style.display = 'none'; }} />
                {imageSafety && (
                  <div className={`ss-safety-badge ${imageSafety.safe === true ? 'ss-safety--safe' : imageSafety.safe === false ? 'ss-safety--unsafe' : 'ss-safety--unknown'}`}>
                    {imageSafety.safe === true ? '🟢 Twitch Safe' : imageSafety.safe === false ? '🔴 May be Unsafe' : '⚪ Unverified'}
                    <span className="ss-safety-reason">{imageSafety.reason}</span>
                  </div>
                )}
                {dataSource && (
                  <span className={`ss-source-badge ${dataSource === 'verified_database' ? 'ss-source--verified' : 'ss-source--ai'}`}>
                    {dataSource === 'verified_database' ? '✅ Verified Data' : '🤖 AI Data'}
                  </span>
                )}
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
