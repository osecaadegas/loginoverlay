/**
 * SlotSubmissions.jsx — Browse the slot database & submit new slots for approval.
 * Mirrors the SlotManagerV2 table UI but is read-only (no edit / delete / bulk).
 * Uses the same `sm-*` CSS classes from SlotManagerV2.css for identical look.
 */
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitSlot, getMySubmissions } from '../../../services/pendingSlotService';
import { supabase } from '../../../config/supabaseClient';
import { DEFAULT_SLOT_IMAGE } from '../../../utils/slotUtils';
import { buildGoogleSlotImageSearchUrl, buildSlotImageSearchUrl } from '../../../utils/slotImageSearch';
import { getErrorMessage, isDuplicateError } from '../../../utils/errorUtils';
import '../../SlotManager/SlotManagerV2.css';

/* ═══════════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════════ */
const useDebounce = (value, delay) => {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
};

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */
const VOLATILITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#39f5d3' },
  { value: 'medium', label: 'Medium', color: '#ffb84d' },
  { value: 'high', label: 'High', color: '#ff7a2f' },
  { value: 'very_high', label: 'Very High', color: '#f044b7' },
];

const FEATURE_OPTIONS = [
  'Free Spins', 'Multiplier', 'Buy Bonus', 'Cascading Reels', 'Expanding Wilds',
  'Sticky Wilds', 'Scatter', 'Bonus Game', 'Megaways', 'Hold and Spin',
  'Respins', 'Jackpot', 'Gamble Feature', 'Random Wilds', 'Cluster Pays',
  'Tumble', 'Wild Symbols', 'Stacked Wilds', 'Mystery Symbols', 'Walking Wilds',
];

const PAGE_SIZES = [25, 50, 100, 200];

/* ═══════════════════════════════════════════════════════════════════
   TINY INLINE COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */
const VolBadge = memo(({ v }) => {
  if (!v) return <span className="sm-vol sm-vol--none">—</span>;
  const o = VOLATILITY_OPTIONS.find(x => x.value === v);
  return <span className="sm-vol" style={{ '--c': o?.color || '#6b7280' }}>{o?.label || v}</span>;
});

/* ═══════════════════════════════════════════════════════════════════
   DROPDOWN FILTER
   ═══════════════════════════════════════════════════════════════════ */
const DropdownFilter = memo(({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (val) => {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val];
    onChange(next);
  };
  const count = selected.length;
  return (
    <div className="sm-dropdown" ref={ref}>
      <button className={`sm-dropdown-btn ${count > 0 ? 'active' : ''}`} onClick={() => setOpen(!open)}>
        {label}{count > 0 && <span className="sm-badge">{count}</span>}
        <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
      </button>
      {open && (
        <div className="sm-dropdown-menu">
          {count > 0 && (
            <button className="sm-dropdown-clear" onClick={() => { onChange([]); setOpen(false); }}>Clear all</button>
          )}
          {options.map(opt => (
            <label key={opt.value} className="sm-dropdown-item">
              <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} />
              {opt.color && <span className="sm-dropdown-dot" style={{ background: opt.color }} />}
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   SUBMIT NEW SLOT DROPDOWN (inline, expands below toolbar)
   ═══════════════════════════════════════════════════════════════════ */
const SubmitDropdown = memo(({ providers, onClose, onSubmitted }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageResults, setImageResults] = useState([]);
  const [imageSearching, setImageSearching] = useState(false);
  const [imageSearchMeta, setImageSearchMeta] = useState(null);
  const [scrapedImages, setScrapedImages] = useState([]);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const nameRef = useRef(null);
  const wrapRef = useRef(null);
  const scrapeRef = useRef('');
  const autoImageRef = useRef('');

  useEffect(() => { setTimeout(() => { setExpanded(true); nameRef.current?.focus(); }, 30); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const searchImages = async (nameOverride, providerOverride) => {
    const name = (typeof nameOverride === 'string' ? nameOverride : form.name || '').trim();
    const provider = (typeof providerOverride === 'string' ? providerOverride : form.provider || '').trim();
    if (!name && !provider) return;
    const fallbackMeta = {
      googleUrl: buildGoogleSlotImageSearchUrl({ name, provider }),
      totalResults: 0,
    };
    setImageSearching(true);
    setImageResults([]);
    setImageSearchMeta(fallbackMeta);
    try {
      const res = await fetch(buildSlotImageSearchUrl({ name, provider }));
      const data = await res.json();
      if (res.ok) {
        setImageResults(data.images || []);
        setImageSearchMeta({
          googleUrl: data.googleUrl || fallbackMeta.googleUrl,
          bingUrl: data.bingUrl,
          query: data.query,
          totalResults: data.images?.length || 0,
        });
      }
    } catch { /* noop */ }
    setImageSearching(false);
  };

  useEffect(() => {
    const name = (form.name || '').trim();
    if (!name || name.length < 3) return;
    if (name === scrapeRef.current) return;
    scrapeRef.current = name;

    const timer = setTimeout(async () => {
      setScrapeLoading(true);
      try {
        const res = await fetch(`/api/fetch-slot-info?name=${encodeURIComponent(name)}`);
        if (res.ok) {
          const { info } = await res.json();
          if (info) {
            const images = info.images || (info.image ? [info.image] : []);
            setScrapedImages(images);
            setForm(prev => ({
              ...prev,
              ...(info.provider && !prev.provider ? { provider: info.provider } : {}),
              ...(info.rtp && !prev.rtp ? { rtp: String(info.rtp) } : {}),
              ...(info.volatility && !prev.volatility ? { volatility: info.volatility } : {}),
              ...(info.max_win_multiplier && !prev.max_win_multiplier ? { max_win_multiplier: String(info.max_win_multiplier) } : {}),
              ...(info.image && !prev.image ? { image: info.image } : {}),
            }));
          } else {
            setScrapedImages([]);
          }
        } else {
          setScrapedImages([]);
        }
      } catch {
        setScrapedImages([]);
      } finally {
        setScrapeLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.name]);

  useEffect(() => {
    const name = (form.name || '').trim();
    const provider = (form.provider || '').trim();
    if (!name || !provider) return;
    const key = `${name}|${provider}`;
    if (key === autoImageRef.current) return;
    autoImageRef.current = key;
    const timer = setTimeout(() => searchImages(name, provider), 450);
    return () => clearTimeout(timer);
  }, [form.name, form.provider]);

  const toggleFeat = (feat) => {
    const cur = Array.isArray(form.features) ? form.features : [];
    set('features', cur.includes(feat) ? cur.filter(f => f !== feat) : [...cur, feat]);
  };

  const save = async () => {
    if (!form.name?.trim() || !form.provider?.trim() || !form.image?.trim()) {
      return alert('Name, Provider, and Image URL are required.');
    }
    setSaving(true);
    try {
      await submitSlot(user.id, {
        name: form.name.trim(),
        provider: form.provider.trim(),
        image: form.image.trim(),
        rtp: form.rtp ? parseFloat(form.rtp) : null,
        volatility: form.volatility || null,
        max_win_multiplier: form.max_win_multiplier ? parseFloat(form.max_win_multiplier) : null,
      });
      setScrapedImages([]);
      onSubmitted();
      onClose();
    } catch (e) {
      const message = getErrorMessage(e, 'Could not submit slot.');
      alert(isDuplicateError(message) ? 'A slot with this name already exists or is pending.' : `Error: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
    if (e.key === 'Escape') onClose();
  };

  const featCount = (Array.isArray(form.features) ? form.features : []).length;

  return (
    <div
      ref={wrapRef}
      className="ss-submit-dropdown"
      style={{
        maxHeight: expanded ? (wrapRef.current?.scrollHeight || 1000) + 'px' : '0px',
        opacity: expanded ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
        background: 'linear-gradient(150deg, rgba(36,16,74,0.78), rgba(18,3,43,0.9))',
        borderRadius: 22,
        border: '1px solid rgba(194,92,255,0.28)',
        marginBottom: 8,
      }}
      onKeyDown={onKey}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', borderBottom: '1px solid rgba(194,92,255,0.22)' }}>
        <span style={{ fontWeight: 850, fontSize: '0.85rem', opacity: 1, color: '#fff7ff' }}>Submit New Slot</span>
        <button className="sm-btn-close" onClick={onClose} style={{ width: 24, height: 24, padding: 0 }}>
          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Form grid */}
      <div style={{ padding: '10px 14px 6px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 12px', alignItems: 'start' }}>
        {/* Name */}
        <label className="sm-field">
          <span>Name <em>*</em></span>
          <input ref={nameRef} value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Sweet Bonanza" />
        </label>
        {/* Provider */}
        <label className="sm-field">
          <span>Provider <em>*</em></span>
          <input list="ss-prov-list" value={form.provider || ''} onChange={e => set('provider', e.target.value)} placeholder="Pragmatic Play" />
          <datalist id="ss-prov-list">{providers.map(p => <option key={p} value={p} />)}</datalist>
        </label>
        {/* RTP */}
        <label className="sm-field">
          <span>RTP (%)</span>
          <input type="number" value={form.rtp || ''} onChange={e => set('rtp', e.target.value || null)} placeholder="96.50" step="0.01" min="80" max="100" />
        </label>
        {/* Volatility */}
        <label className="sm-field">
          <span>Volatility</span>
          <select value={form.volatility || ''} onChange={e => set('volatility', e.target.value || null)}>
            <option value="">Select…</option>
            {VOLATILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        {/* Max Win */}
        <label className="sm-field">
          <span>Max Win (x)</span>
          <input type="number" value={form.max_win_multiplier || ''} onChange={e => set('max_win_multiplier', e.target.value || null)} placeholder="10000" />
        </label>
        {/* Image URL — fits in grid like other fields */}
        <label className="sm-field" style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <span>Image <em>*</em></span>
          <div style={{ display: 'flex', gap: 4 }}>
            <input style={{ flex: 1, fontSize: '0.72rem', padding: '5px 8px' }} value={form.image || ''} onChange={e => set('image', e.target.value)} placeholder="Paste URL or search →" />
            <button type="button" className="sm-btn-sm" onClick={searchImages} disabled={!form.name || imageSearching}
              title={form.name ? `Search Google Images for "${form.name}"` : 'Enter a slot name first'}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', whiteSpace: 'nowrap', padding: '4px 8px' }}>
              {imageSearching ? '⏳' : '🔍'} <span style={{ opacity: 0.8 }}>Search Image</span>
            </button>
          </div>
        </label>
      </div>

      {/* Image results + preview row */}
      {scrapeLoading && (
        <p style={{ fontSize: 11, color: '#c9b8e8', margin: '0 14px 8px' }}>Auto-fetching slot info...</p>
      )}

      {(imageResults.length > 0 || form.image || scrapedImages.length > 0 || imageSearchMeta?.googleUrl) && (
        <div style={{ padding: '0 14px 8px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {form.image && (
            <img src={form.image} alt="" style={{ width: 90, height: 90, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(168,85,247,0.4)' }} onError={e => (e.target.src = DEFAULT_SLOT_IMAGE)} />
          )}
          {scrapedImages.slice(0, 8).map((url, i) => (
            <button key={`scraped-${i}`} type="button" onClick={() => set('image', url)}
              style={{ border: form.image === url ? '2px solid #f044b7' : '1px solid rgba(194,92,255,0.28)', borderRadius: 12, padding: 2, background: 'rgba(18,3,43,0.58)', cursor: 'pointer', width: 90, height: 90, overflow: 'hidden', flexShrink: 0 }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
            </button>
          ))}
          {imageResults.slice(0, 8).map((img, i) => (
            <button key={i} type="button" onClick={() => { set('image', img.url); setImageResults([]); }}
              style={{ border: form.image === img.url ? '2px solid #f044b7' : '1px solid rgba(194,92,255,0.28)', borderRadius: 12, padding: 2, background: 'rgba(18,3,43,0.58)', cursor: 'pointer', width: 90, height: 90, overflow: 'hidden', flexShrink: 0 }}>
              <img src={img.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
            </button>
          ))}
          {imageSearchMeta?.googleUrl && (
            <a className="sm-img-google-link" href={imageSearchMeta.googleUrl} target="_blank" rel="noreferrer">
              Open Google Images
            </a>
          )}
        </div>
      )}

      {/* Features (collapsible) */}
      <details style={{ padding: '0 14px 8px' }}>
        <summary style={{ fontSize: '0.75rem', cursor: 'pointer', opacity: 0.6, userSelect: 'none', marginBottom: 6 }}>
          Features {featCount > 0 && <span style={{ background: 'linear-gradient(135deg, #f044b7, #8b5cf6)', color: '#fff7ff', borderRadius: 999, padding: '1px 7px', fontSize: '0.65rem', marginLeft: 4 }}>{featCount}</span>}
        </summary>
        <div className="sm-feature-grid" style={{ paddingTop: 2 }}>
          {FEATURE_OPTIONS.map(feat => {
            const active = (Array.isArray(form.features) ? form.features : []).includes(feat);
            return <button key={feat} className={`sm-feat-tag ${active ? 'on' : ''}`} onClick={() => toggleFeat(feat)}>{feat}</button>;
          })}
        </div>
      </details>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 16px 12px', borderTop: '1px solid rgba(194,92,255,0.22)' }}>
        <button className="sm-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="sm-btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Submitting…' : '📤 Submit for Approval'}
        </button>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   MY SUBMISSIONS PANEL (slide-in) — track pending / approved / denied
   ═══════════════════════════════════════════════════════════════════ */
const MySubmissionsPanel = memo(({ onClose }) => {
  const { user } = useAuth();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setSubs(await getMySubmissions(user.id)); } catch { /* noop */ }
      setLoading(false);
    })();
  }, [user]);

  const badge = (s) => s === 'pending' ? '⏳ Pending' : s === 'approved' ? '✅ Approved' : '❌ Denied';

  return (
    <>
      <div className="sm-overlay" onClick={onClose} />
      <div className="sm-editor">
        <div className="sm-editor-head">
          <h3>My Submissions</h3>
          <button className="sm-btn-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="sm-editor-body">
          {loading ? (
            <div className="sm-empty"><div className="sm-spinner" /><p>Loading…</p></div>
          ) : subs.length === 0 ? (
            <div className="sm-empty"><p>No submissions yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {subs.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(18,3,43,0.68)', borderRadius: 16, border: '1px solid rgba(194,92,255,0.24)' }}>
                  <img src={s.image || DEFAULT_SLOT_IMAGE} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} onError={e => (e.target.src = DEFAULT_SLOT_IMAGE)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{s.provider}</div>
                  </div>
                  <span style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{badge(s.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT — Browse slots (read-only table) + submit new
   ═══════════════════════════════════════════════════════════════════ */
export default function SlotSubmissions() {
  /* ── Data ── */
  const [slots, setSlots] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  /* ── Filters ── */
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState([]);
  const [volFilter, setVolFilter] = useState([]);

  /* ── Pagination & sort ── */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  /* ── UI state ── */
  const [showSubmit, setShowSubmit] = useState(false);
  const [showMySubmissions, setShowMySubmissions] = useState(false);
  const [notification, setNotification] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const searchRef = useRef(null);

  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  /* ── Load providers ── */
  const loadProviders = useCallback(async () => {
    try {
      let all = [], from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase.from('slots').select('provider').range(from, from + step - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < step) break;
        from += step;
      }
      setProviders([...new Set(all.map(d => (d.provider || '').trim()))].filter(Boolean).sort());
    } catch { /* noop */ }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  /* ── Load slots (only live) ── */
  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('slots').select('*', { count: 'exact' }).eq('status', 'live');
      if (debouncedSearch) q = q.or(`name.ilike.%${debouncedSearch}%,provider.ilike.%${debouncedSearch}%`);
      if (providerFilter.length) q = q.in('provider', providerFilter);
      if (volFilter.length) q = q.in('volatility', volFilter);
      q = q.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });
      const from = (page - 1) * pageSize;
      q = q.range(from, from + pageSize - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      setSlots(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (e) {
      console.error('loadSlots:', e);
      notify('Error loading slots', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, providerFilter, volFilter, page, pageSize, sortBy, sortDir, notify]);

  useEffect(() => { loadSlots(); }, [loadSlots]);
  useEffect(() => { setPage(1); }, [debouncedSearch, providerFilter, volFilter, pageSize]);

  /* ── Sort ── */
  const handleSort = useCallback((col) => {
    if (sortBy === col) setSortDir(p => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  }, [sortBy]);

  const SortArrow = ({ col }) => {
    if (sortBy !== col) return <span className="sm-sort">↕</span>;
    return <span className="sm-sort active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const hasFilters = providerFilter.length > 0 || volFilter.length > 0;
  const clearAllFilters = () => { setProviderFilter([]); setVolFilter([]); setSearchTerm(''); };
  const providerOptions = providers.map(p => ({ value: p, label: p }));
  const activeFilterCount = providerFilter.length + volFilter.length + (searchTerm.trim() ? 1 : 0);
  const visibleStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleEnd = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const resultRangeLabel = loading ? 'Loading…' : totalCount > 0 ? `${visibleStart}-${visibleEnd}` : '0 results';
  const pageModeLabel = showSubmit ? 'Submission open' : 'Catalog mode';
  const heroNote = totalCount > 0
    ? 'Browse the live slot catalog, narrow the list by provider and volatility, and open the inline submission flow when a missing game needs review.'
    : 'No slots are visible in the current view. Adjust the filters or submit a missing game for approval from this same workspace.';

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handleKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setShowSubmit(true); }
      if (e.key === 'Escape') {
        if (showSubmit) setShowSubmit(false);
        else if (showMySubmissions) setShowMySubmissions(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showSubmit, showMySubmissions]);

  /* ── Render ── */
  return (
    <div className="slot-manager-v2" data-tour="slots-page">
      <div className="ssm-page-shell">
        {notification && <div className={`sm-toast ${notification.type}`}>{notification.message}</div>}

        <div className="ssm-page-hero">
          <div className="ssm-page-hero-copy">
            <span className="ssm-page-eyebrow">Catalog Control</span>
            <h2 className="ssm-page-title">Submit slots</h2>
            <p className="ssm-page-subtitle">
              Browse the live slot catalog, spot missing games, and send new submissions into the approval queue from one focused workspace.
            </p>
            <p className="ssm-page-note">{heroNote}</p>
          </div>

          <div className="ssm-page-metrics">
            <div className="ssm-page-metric-card">
              <span className="ssm-page-metric-label">Catalog</span>
              <strong className="ssm-page-metric-value">{totalCount}</strong>
              <span className="ssm-page-metric-meta">Live slots in the current query</span>
            </div>
            <div className="ssm-page-metric-card">
              <span className="ssm-page-metric-label">Providers</span>
              <strong className="ssm-page-metric-value">{providers.length}</strong>
              <span className="ssm-page-metric-meta">Known studios available for filtering</span>
            </div>
            <div className="ssm-page-metric-card">
              <span className="ssm-page-metric-label">Visible Range</span>
              <strong className="ssm-page-metric-value">{resultRangeLabel}</strong>
              <span className="ssm-page-metric-meta">Page {page} of {totalPages || 1}</span>
            </div>
            <div className="ssm-page-metric-card">
              <span className="ssm-page-metric-label">Filters</span>
              <strong className="ssm-page-metric-value">{activeFilterCount}</strong>
              <span className="ssm-page-metric-meta">{pageModeLabel}</span>
            </div>
          </div>
        </div>

        <div className="ssm-section-heading">
          <div>
            <span className="ssm-section-eyebrow">Explore & Submit</span>
            <h3 className="ssm-section-title">Search the database, refine the list, and open the inline submission flow</h3>
          </div>
          <span className="ssm-section-pill">{pageModeLabel}</span>
        </div>

        <div className="ssm-toolbar-card">
          <div className="sm-toolbar">
            <div className="sm-toolbar-left">
              <div className="sm-search">
                <svg className="sm-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <input ref={searchRef} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search slots…" />
                {searchTerm && <button className="sm-search-clear" onClick={() => setSearchTerm('')}>×</button>}
              </div>
              <DropdownFilter label="Provider" options={providerOptions} selected={providerFilter} onChange={setProviderFilter} />
              <DropdownFilter label="Volatility" options={VOLATILITY_OPTIONS} selected={volFilter} onChange={setVolFilter} />
              {hasFilters && <button className="sm-clear-filters" onClick={clearAllFilters}>Clear filters</button>}
            </div>
            <div className="sm-toolbar-right">
              <span className="sm-count">{totalCount.toLocaleString()} slots</span>
              <button className="sm-btn-ghost" onClick={() => setShowMySubmissions(true)}>My Submissions</button>
              <button className={`sm-btn-primary${showSubmit ? ' active' : ''}`} onClick={() => setShowSubmit(s => !s)}>
                {showSubmit ? '✕ Close' : '+ Submit Slot'}
              </button>
            </div>
          </div>

          {showSubmit && (
            <SubmitDropdown
              providers={providers}
              onClose={() => setShowSubmit(false)}
              onSubmitted={() => { notify('Slot submitted for approval! 🎉'); setShowSubmit(false); }}
            />
          )}
        </div>

        <div className="ssm-section-heading ssm-section-heading--compact">
          <div>
            <span className="ssm-section-eyebrow">Live Catalog</span>
            <h3 className="ssm-section-title">Scan the current database and verify what still needs submission</h3>
          </div>
          <span className="ssm-section-pill">{resultRangeLabel}</span>
        </div>

        <div className="ssm-results-card">
          <div className="sm-table-wrap">
            {loading ? (
              <div className="sm-empty"><div className="sm-spinner" /><p>Loading slots…</p></div>
            ) : slots.length === 0 ? (
              <div className="sm-empty">
                <p className="sm-empty-icon">No slots found</p>
                <p className="sm-empty-sub">Adjust search or filters.</p>
              </div>
            ) : (
              <table className="sm-table">
                <thead>
                  <tr>
                    <th className="sm-th-img" />
                    <th className="sm-th-name" onClick={() => handleSort('name')}>Name <SortArrow col="name" /></th>
                    <th className="sm-th-prov" onClick={() => handleSort('provider')}>Provider <SortArrow col="provider" /></th>
                    <th className="sm-th-rtp" onClick={() => handleSort('rtp')}>RTP <SortArrow col="rtp" /></th>
                    <th className="sm-th-maxwin" onClick={() => handleSort('max_win_multiplier')}>Max Win <SortArrow col="max_win_multiplier" /></th>
                    <th className="sm-th-vol">Vol.</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, i) => (
                    <tr key={slot.id} className={`sm-row ${i % 2 ? 'odd' : ''}`}>
                      <td className="sm-td-img">
                        <img src={slot.image || DEFAULT_SLOT_IMAGE} alt="" loading="lazy" onError={e => (e.target.src = DEFAULT_SLOT_IMAGE)} />
                      </td>
                      <td className="sm-td-name">
                        {slot.name}
                        {slot.is_featured && <span className="sm-star" title="Featured">★</span>}
                      </td>
                      <td className="sm-td-prov">{slot.provider}</td>
                      <td className="sm-td-rtp">{slot.rtp ? `${slot.rtp}%` : '—'}</td>
                      <td className="sm-td-maxwin">{slot.max_win_multiplier ? `${Number(slot.max_win_multiplier).toLocaleString()}x` : '—'}</td>
                      <td className="sm-td-vol"><VolBadge v={slot.volatility} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && totalCount > 0 && (
            <div className="sm-pagination">
              <span className="sm-pag-info">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
              </span>
              <div className="sm-pag-controls">
                <button disabled={page <= 1} onClick={() => setPage(1)}>«</button>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                <span>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
              </div>
              <select className="sm-pag-size" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
              </select>
            </div>
          )}

          <div className="sm-shortcuts">
            <kbd>/</kbd> Search &nbsp; <kbd>N</kbd> New &nbsp; <kbd>Esc</kbd> Close
          </div>
        </div>

        {/* ── Panels ── */}
        {showMySubmissions && <MySubmissionsPanel onClose={() => setShowMySubmissions(false)} />}
      </div>
    </div>
  );
}
