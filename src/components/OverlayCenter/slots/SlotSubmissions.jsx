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
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'very_high', label: 'Very High', color: '#ef4444' },
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
  const [expanded, setExpanded] = useState(false);
  const nameRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => { setTimeout(() => { setExpanded(true); nameRef.current?.focus(); }, 30); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const searchImages = async () => {
    const q = `${form.name || ''} ${form.provider || ''} slot`.trim();
    if (!q || q === 'slot') return;
    setImageSearching(true);
    setImageResults([]);
    try {
      const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && data.images?.length) setImageResults(data.images);
    } catch { /* noop */ }
    setImageSearching(false);
  };

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
      onSubmitted();
      onClose();
    } catch (e) {
      alert(e.message?.includes('duplicate') ? 'A slot with this name already exists or is pending.' : `Error: ${e.message}`);
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
        background: 'rgba(255,255,255,0.025)',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 8,
      }}
      onKeyDown={onKey}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', opacity: 0.9 }}>Submit New Slot</span>
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
      {(imageResults.length > 0 || form.image) && (
        <div style={{ padding: '0 14px 8px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {form.image && (
            <img src={form.image} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} onError={e => (e.target.src = DEFAULT_SLOT_IMAGE)} />
          )}
          {imageResults.slice(0, 8).map((img, i) => (
            <button key={i} type="button" onClick={() => { set('image', img.url); setImageResults([]); }}
              style={{ border: form.image === img.url ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 2, background: 'transparent', cursor: 'pointer', width: 48, height: 48, overflow: 'hidden', flexShrink: 0 }}>
              <img src={img.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
            </button>
          ))}
        </div>
      )}

      {/* Features (collapsible) */}
      <details style={{ padding: '0 14px 8px' }}>
        <summary style={{ fontSize: '0.75rem', cursor: 'pointer', opacity: 0.6, userSelect: 'none', marginBottom: 6 }}>
          Features {featCount > 0 && <span style={{ background: '#a855f7', color: '#fff', borderRadius: 8, padding: '1px 6px', fontSize: '0.65rem', marginLeft: 4 }}>{featCount}</span>}
        </summary>
        <div className="sm-feature-grid" style={{ paddingTop: 2 }}>
          {FEATURE_OPTIONS.map(feat => {
            const active = (Array.isArray(form.features) ? form.features : []).includes(feat);
            return <button key={feat} className={`sm-feat-tag ${active ? 'on' : ''}`} onClick={() => toggleFeat(feat)}>{feat}</button>;
          })}
        </div>
      </details>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '6px 14px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
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
    <div className="slot-manager-v2">
      {notification && <div className={`sm-toast ${notification.type}`}>{notification.message}</div>}

      {/* ── Toolbar ── */}
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

      {/* ── Submit Slot Dropdown ── */}
      {showSubmit && (
        <SubmitDropdown
          providers={providers}
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => { notify('Slot submitted for approval! 🎉'); setShowSubmit(false); }}
        />
      )}

      {/* ── Table ── */}
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

      {/* ── Pagination ── */}
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

      {/* ── Panels ── */}
      {showMySubmissions && <MySubmissionsPanel onClose={() => setShowMySubmissions(false)} />}

      {/* ── Shortcuts hint ── */}
      <div className="sm-shortcuts">
        <kbd>/</kbd> Search &nbsp; <kbd>N</kbd> New &nbsp; <kbd>Esc</kbd> Close
      </div>
    </div>
  );
}
