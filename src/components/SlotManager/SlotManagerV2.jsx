import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { supabase } from '../../config/supabaseClient';
import { DEFAULT_SLOT_IMAGE } from '../../utils/slotUtils';
import './SlotManagerV2.css';

/* ═══════════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════════ */

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
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

const STATUS_OPTIONS = [
  { value: 'live', label: 'Live', color: '#22c55e' },
  { value: 'draft', label: 'Draft', color: '#6b7280' },
  { value: 'disabled', label: 'Disabled', color: '#ef4444' },
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

const StatusDot = memo(({ status }) => {
  const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  return <span className="sm-dot" style={{ '--c': s.color }}>{s.label}</span>;
});

const VolBadge = memo(({ v }) => {
  if (!v) return <span className="sm-vol sm-vol--none">—</span>;
  const o = VOLATILITY_OPTIONS.find(x => x.value === v);
  return <span className="sm-vol" style={{ '--c': o?.color || '#6b7280' }}>{o?.label || v}</span>;
});

/* ═══════════════════════════════════════════════════════════════════
   DROPDOWN FILTER (reusable)
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
   SLIDE-IN EDITOR PANEL
   ═══════════════════════════════════════════════════════════════════ */

const EditorPanel = memo(({ slot, onClose, onSave, onDelete, providers, isNew }) => {
  const [form, setForm] = useState(slot || {});
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState(null);
  const [tab, setTab] = useState('basic');
  const nameRef = useRef(null);

  useEffect(() => {
    setForm(slot || {});
    setFetchResult(null);
    setTab('basic');
    if (isNew) setTimeout(() => nameRef.current?.focus(), 100);
  }, [slot, isNew]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name || !form.provider || !form.image) return alert('Name, Provider, and Image URL are required.');
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
    if (e.key === 'Escape') onClose();
  };

  // AI Fetch — uses /api/slot-ai (Gemini + DB pipeline)
  const aiFetch = async () => {
    if (!form.name) return alert('Enter a slot name first.');
    setFetching(true);
    setFetchResult(null);
    try {
      const res = await fetch('/api/slot-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, provider: form.provider }),
      });
      const json = await res.json();
      if (json.source === 'blocked') {
        setFetchResult({ success: false, message: 'Search blocked — not appropriate for streaming platforms.' });
      } else if (json.source === 'not_found' || json.error) {
        setFetchResult({ success: false, message: json.error || 'No data found for this slot.' });
      } else if (json.name) {
        // slot-ai returns a flat object with name, provider, rtp, etc.
        const confidence = json.source?.includes('database') ? 'high' : json.source?.includes('google') ? 'medium' : 'medium';
        setFetchResult({ success: true, data: json, source: json.source, confidence, applied: false });
      } else {
        setFetchResult({ success: false, message: 'No data found for this slot.' });
      }
    } catch (err) {
      setFetchResult({ success: false, message: err.message });
    } finally {
      setFetching(false);
    }
  };

  const applyFetched = () => {
    if (!fetchResult?.data) return;
    const d = fetchResult.data;
    setForm(prev => ({
      ...prev,
      ...(d.provider && !prev.provider ? { provider: d.provider } : {}),
      ...(d.rtp ? { rtp: d.rtp } : {}),
      ...(d.volatility ? { volatility: d.volatility } : {}),
      ...(d.max_win_multiplier ? { max_win_multiplier: d.max_win_multiplier } : {}),
      ...(d.reels ? { reels: d.reels } : {}),
      ...(d.paylines ? { paylines: d.paylines } : {}),
      ...(d.min_bet ? { min_bet: d.min_bet } : {}),
      ...(d.max_bet ? { max_bet: d.max_bet } : {}),
      ...(d.theme ? { theme: d.theme } : {}),
      ...(d.release_date ? { release_date: d.release_date } : {}),
      ...(d.image && !prev.image ? { image: d.image } : {}),
      ...(d.features ? { features: d.features } : {}),
    }));
    setFetchResult(prev => ({ ...prev, applied: true }));
  };

  const toggleFeat = (feat) => {
    const cur = Array.isArray(form.features) ? form.features : [];
    set('features', cur.includes(feat) ? cur.filter(f => f !== feat) : [...cur, feat]);
  };

  if (!slot && !isNew) return null;

  const tabs = [
    { id: 'basic', label: 'Basic' },
    { id: 'stats', label: 'Stats' },
    { id: 'features', label: 'Features' },
    { id: 'extra', label: 'Extra' },
  ];

  return (
    <>
      <div className="sm-overlay" onClick={onClose} />
      <div className="sm-editor" onKeyDown={onKey}>
        {/* Header */}
        <div className="sm-editor-head">
          <h3>{isNew ? 'Add Slot' : 'Edit Slot'}</h3>
          <div className="sm-editor-head-actions">
            <button className={`sm-btn-ai ${fetching ? 'loading' : ''}`} onClick={aiFetch} disabled={fetching}>
              {fetching ? 'Fetching…' : 'AI Fill'}
            </button>
            <button className="sm-btn-close" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        {/* Fetch banner */}
        {fetchResult && (
          <div className={`sm-fetch-banner ${fetchResult.success ? 'ok' : 'err'}`}>
            {fetchResult.success ? (
              <>
                <span className="sm-fetch-info">{fetchResult.confidence} confidence · {fetchResult.source}</span>
                {!fetchResult.applied
                  ? <button className="sm-btn-sm" onClick={applyFetched}>Apply</button>
                  : <span className="sm-applied">Applied</span>}
              </>
            ) : (
              <span>{fetchResult.message}</span>
            )}
            <button className="sm-btn-close-sm" onClick={() => setFetchResult(null)}>×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="sm-tabs">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="sm-editor-body">
          {tab === 'basic' && (
            <>
              {form.image && (
                <div className="sm-img-preview">
                  <img src={form.image || DEFAULT_SLOT_IMAGE} alt="" onError={e => (e.target.src = DEFAULT_SLOT_IMAGE)} />
                </div>
              )}
              <label className="sm-field">
                <span>Name <em>*</em></span>
                <input ref={nameRef} value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Sweet Bonanza" />
              </label>
              <label className="sm-field">
                <span>Provider <em>*</em></span>
                <input list="sm-prov-list" value={form.provider || ''} onChange={e => set('provider', e.target.value)} placeholder="Pragmatic Play" />
                <datalist id="sm-prov-list">{providers.map(p => <option key={p} value={p} />)}</datalist>
              </label>
              <label className="sm-field">
                <span>Image URL <em>*</em></span>
                <input value={form.image || ''} onChange={e => set('image', e.target.value)} placeholder="https://…" />
              </label>
              <label className="sm-field">
                <span>Status</span>
                <select value={form.status || 'live'} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="sm-check">
                <input type="checkbox" checked={form.is_featured || false} onChange={e => set('is_featured', e.target.checked)} />
                <span>Featured Slot</span>
              </label>
            </>
          )}

          {tab === 'stats' && (
            <>
              <div className="sm-form-row">
                <label className="sm-field half">
                  <span>RTP (%)</span>
                  <input type="number" value={form.rtp || ''} onChange={e => set('rtp', e.target.value || null)} placeholder="96.50" step="0.01" min="80" max="100" />
                </label>
                <label className="sm-field half">
                  <span>Volatility</span>
                  <select value={form.volatility || ''} onChange={e => set('volatility', e.target.value || null)}>
                    <option value="">Select…</option>
                    {VOLATILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="sm-form-row">
                <label className="sm-field half">
                  <span>Max Win (x)</span>
                  <input type="number" value={form.max_win_multiplier || ''} onChange={e => set('max_win_multiplier', e.target.value || null)} placeholder="10000" />
                </label>
                <label className="sm-field half">
                  <span>Reels</span>
                  <input value={form.reels || ''} onChange={e => set('reels', e.target.value || null)} placeholder="5x3" />
                </label>
              </div>
              <div className="sm-form-row">
                <label className="sm-field half">
                  <span>Min Bet (€)</span>
                  <input type="number" value={form.min_bet || ''} onChange={e => set('min_bet', e.target.value || null)} placeholder="0.20" step="0.01" min="0" />
                </label>
                <label className="sm-field half">
                  <span>Max Bet (€)</span>
                  <input type="number" value={form.max_bet || ''} onChange={e => set('max_bet', e.target.value || null)} placeholder="100" step="0.01" min="0" />
                </label>
              </div>
              <label className="sm-field">
                <span>Paylines</span>
                <input value={form.paylines || ''} onChange={e => set('paylines', e.target.value || null)} placeholder="10, 20, 243, Megaways" />
              </label>
            </>
          )}

          {tab === 'features' && (
            <>
              <div className="sm-feature-grid">
                {FEATURE_OPTIONS.map(feat => {
                  const active = (Array.isArray(form.features) ? form.features : []).includes(feat);
                  return (
                    <button key={feat} className={`sm-feat-tag ${active ? 'on' : ''}`} onClick={() => toggleFeat(feat)}>{feat}</button>
                  );
                })}
              </div>
              <label className="sm-field">
                <span>Tags (comma separated)</span>
                <input value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '')} onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="popular, new, bonus-buy" />
              </label>
            </>
          )}

          {tab === 'extra' && (
            <>
              <label className="sm-field">
                <span>Theme</span>
                <input value={form.theme || ''} onChange={e => set('theme', e.target.value || null)} placeholder="Egyptian, Fruits, Mythology…" />
              </label>
              <label className="sm-field">
                <span>Release Date</span>
                <input type="date" value={form.release_date || ''} onChange={e => set('release_date', e.target.value || null)} />
              </label>
              <label className="sm-field">
                <span>Description</span>
                <textarea value={form.description || ''} onChange={e => set('description', e.target.value || null)} placeholder="Brief slot description…" rows={4} />
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sm-editor-foot">
          {!isNew && (
            <button className="sm-btn-danger" onClick={() => { if (confirm(`Delete "${form.name}"?`)) onDelete(form.id); }}>Delete</button>
          )}
          <div className="sm-foot-right">
            <button className="sm-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="sm-btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
              <kbd>⌘↵</kbd>
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER MANAGER PANEL
   ═══════════════════════════════════════════════════════════════════ */

const ProviderManager = memo(({ onClose }) => {
  const [list, setList] = useState([]);
  const [hasProvTable, setHasProvTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Probe slot_providers table (may not exist yet)
      const { data: provData, error: provErr } = await supabase.from('slot_providers').select('*').order('name').limit(1000);
      if (!provErr && provData) {
        setHasProvTable(true);
        setList(provData);
        setLoading(false);
        return;
      }
    } catch { /* table doesn't exist */ }

    // Fallback: pull distinct providers from slots table (paginated)
    try {
      let all = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data } = await supabase.from('slots').select('provider').range(from, from + step - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < step) break;
        from += step;
      }
      const unique = [...new Set(all.map(d => (d.provider || '').trim()))].filter(Boolean).sort();
      setList(unique.map(name => ({ name, slug: name.toLowerCase().replace(/\s+/g, '-'), logo_url: null, slot_count: 0 })));
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (prov) => {
    if (!hasProvTable) {
      alert('The slot_providers table has not been created yet. Run the migration SQL in Supabase first.');
      return;
    }
    setSaving(true);
    try {
      if (prov.id) {
        const { error } = await supabase.from('slot_providers').update({ name: prov.name, logo_url: prov.logo_url, website_url: prov.website_url }).eq('id', prov.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('slot_providers').insert([{ name: prov.name, slug: prov.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), logo_url: prov.logo_url, website_url: prov.website_url }]);
        if (error) throw error;
      }
      setEditing(null);
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = list.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="sm-overlay" onClick={onClose} />
      <div className="sm-editor sm-editor--providers">
        <div className="sm-editor-head">
          <h3>Providers</h3>
          <button className="sm-btn-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="sm-prov-toolbar">
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="sm-btn-sm" onClick={() => setEditing({ name: '', logo_url: '', website_url: '' })}>+ Add</button>
        </div>

        {editing && (
          <div className="sm-prov-form">
            <label className="sm-field"><span>Name</span><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></label>
            <label className="sm-field"><span>Logo URL</span><input value={editing.logo_url || ''} onChange={e => setEditing({ ...editing, logo_url: e.target.value })} /></label>
            {editing.logo_url && <img className="sm-prov-logo-preview" src={editing.logo_url} alt="" onError={e => (e.target.style.display = 'none')} />}
            <label className="sm-field"><span>Website</span><input value={editing.website_url || ''} onChange={e => setEditing({ ...editing, website_url: e.target.value })} /></label>
            <div className="sm-prov-form-actions">
              <button className="sm-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="sm-btn-primary" onClick={() => handleSave(editing)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}

        <div className="sm-editor-body">
          {loading ? (
            <div className="sm-empty"><div className="sm-spinner" /><p>Loading…</p></div>
          ) : (
            <div className="sm-prov-grid">
              {filtered.map((p, i) => (
                <button key={p.id || i} className="sm-prov-card" onClick={() => setEditing({ ...p })}>
                  <span className="sm-prov-initial">{(p.name || '?')[0].toUpperCase()}</span>
                  <span className="sm-prov-name">{p.name}</span>
                  {p.slot_count > 0 && <span className="sm-prov-count">{p.slot_count}</span>}
                </button>
              ))}
              {filtered.length === 0 && <p className="sm-no-results">No providers found</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

const SlotManagerV2 = () => {
  // Data
  const [slots, setSlots] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(['live']);
  const [providerFilter, setProviderFilter] = useState([]);
  const [volFilter, setVolFilter] = useState([]);

  // Pagination & sort
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // UI state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editorSlot, setEditorSlot] = useState(null);
  const [isNewSlot, setIsNewSlot] = useState(false);
  const [showProviders, setShowProviders] = useState(false);
  const [notification, setNotification] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const searchRef = useRef(null);

  /* ── Notifications ─────────────────────────────────────────── */
  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  /* ── Load providers ────────────────────────────────────────── */
  const loadProviders = useCallback(async () => {
    try {
      // Paginate to get ALL slots — Supabase defaults to 1000 row limit
      let all = [];
      let from = 0;
      const step = 1000;
      let done = false;
      while (!done) {
        const { data, error } = await supabase.from('slots').select('provider').range(from, from + step - 1);
        if (error) throw error;
        if (!data || data.length === 0) { done = true; break; }
        all = all.concat(data);
        if (data.length < step) done = true;
        from += step;
      }
      setProviders([...new Set(all.map(d => (d.provider || '').trim()))].filter(Boolean).sort());
    } catch (e) {
      console.error('loadProviders:', e);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  /* ── Load slots (paginated + filtered) ─────────────────────── */
  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('slots').select('*', { count: 'exact' });

      if (debouncedSearch) q = q.or(`name.ilike.%${debouncedSearch}%,provider.ilike.%${debouncedSearch}%`);
      if (statusFilter.length) q = q.in('status', statusFilter);
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
  }, [debouncedSearch, statusFilter, providerFilter, volFilter, page, pageSize, sortBy, sortDir, notify]);

  useEffect(() => { loadSlots(); }, [loadSlots]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, providerFilter, volFilter, pageSize]);

  /* ── Selection ─────────────────────────────────────────────── */
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => prev.size === slots.length ? new Set() : new Set(slots.map(s => s.id)));
  }, [slots]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /* ── CRUD ──────────────────────────────────────────────────── */
  const handleSave = useCallback(async (formData) => {
    try {
      const d = {
        name: formData.name?.trim(),
        provider: formData.provider?.trim(),
        image: formData.image?.trim(),
        rtp: formData.rtp || null,
        volatility: formData.volatility || null,
        reels: formData.reels || null,
        max_win_multiplier: formData.max_win_multiplier || null,
        min_bet: formData.min_bet || null,
        max_bet: formData.max_bet || null,
        paylines: formData.paylines || null,
        theme: formData.theme || null,
        release_date: formData.release_date || null,
        description: formData.description || null,
        features: Array.isArray(formData.features) ? formData.features : [],
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        status: formData.status || 'live',
        is_featured: formData.is_featured || false,
      };

      if (!d.name || !d.provider || !d.image) throw new Error('Name, Provider, and Image URL are required.');

      if (isNewSlot) {
        const { error } = await supabase.from('slots').insert([d]);
        if (error) throw error;
        notify('Slot created');
      } else {
        const { error } = await supabase.from('slots').update(d).eq('id', formData.id);
        if (error) throw error;
        notify('Slot updated');
      }
      setEditorSlot(null);
      setIsNewSlot(false);
      await Promise.all([loadSlots(), loadProviders()]);
    } catch (e) {
      console.error('handleSave:', e);
      notify(e.message, 'error');
    }
  }, [isNewSlot, loadSlots, loadProviders, notify]);

  const handleDelete = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('slots').delete().eq('id', id);
      if (error) throw error;
      notify('Slot deleted');
      setEditorSlot(null);
      loadSlots();
    } catch (e) {
      notify(e.message, 'error');
    }
  }, [loadSlots, notify]);

  /* ── Bulk actions ──────────────────────────────────────────── */
  const bulkDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedIds.size} slot(s)?`)) return;
    try {
      const { error } = await supabase.from('slots').delete().in('id', [...selectedIds]);
      if (error) throw error;
      notify(`${selectedIds.size} deleted`);
      clearSelection();
      loadSlots();
    } catch (e) { notify(e.message, 'error'); }
  }, [selectedIds, loadSlots, clearSelection, notify]);

  const bulkStatus = useCallback(async (status) => {
    try {
      const { error } = await supabase.from('slots').update({ status }).in('id', [...selectedIds]);
      if (error) throw error;
      notify(`${selectedIds.size} → ${status}`);
      clearSelection();
      loadSlots();
    } catch (e) { notify(e.message, 'error'); }
  }, [selectedIds, loadSlots, clearSelection, notify]);

  const bulkFeature = useCallback(async (featured) => {
    try {
      const { error } = await supabase.from('slots').update({ is_featured: featured }).in('id', [...selectedIds]);
      if (error) throw error;
      notify(`${selectedIds.size} ${featured ? 'featured' : 'unfeatured'}`);
      clearSelection();
      loadSlots();
    } catch (e) { notify(e.message, 'error'); }
  }, [selectedIds, loadSlots, clearSelection, notify]);

  /* ── Keyboard shortcuts ────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setEditorSlot({}); setIsNewSlot(true); }
      if (e.key === 'Escape') {
        if (showProviders) setShowProviders(false);
        else if (editorSlot) { setEditorSlot(null); setIsNewSlot(false); }
        else if (selectedIds.size > 0) clearSelection();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [editorSlot, selectedIds.size, clearSelection, showProviders]);

  /* ── Sort ───────────────────────────────────────────────────── */
  const handleSort = useCallback((col) => {
    if (sortBy === col) setSortDir(p => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  }, [sortBy]);

  const SortArrow = ({ col }) => {
    if (sortBy !== col) return <span className="sm-sort">↕</span>;
    return <span className="sm-sort active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  /* ── Active filter count ───────────────────────────────────── */
  const hasNonDefaultFilters = (statusFilter.length > 0 && !(statusFilter.length === 1 && statusFilter[0] === 'live'))
    || providerFilter.length > 0
    || volFilter.length > 0;

  const clearAllFilters = () => {
    setStatusFilter(['live']);
    setProviderFilter([]);
    setVolFilter([]);
    setSearchTerm('');
  };

  const providerOptions = providers.map(p => ({ value: p, label: p }));

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="slot-manager-v2">
      {/* Toast */}
      {notification && <div className={`sm-toast ${notification.type}`}>{notification.message}</div>}

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="sm-toolbar">
        <div className="sm-toolbar-left">
          <div className="sm-search">
            <svg className="sm-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input ref={searchRef} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search slots…" />
            {searchTerm && <button className="sm-search-clear" onClick={() => setSearchTerm('')}>×</button>}
          </div>
          <DropdownFilter label="Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
          <DropdownFilter label="Provider" options={providerOptions} selected={providerFilter} onChange={setProviderFilter} />
          <DropdownFilter label="Volatility" options={VOLATILITY_OPTIONS} selected={volFilter} onChange={setVolFilter} />
          {hasNonDefaultFilters && (
            <button className="sm-clear-filters" onClick={clearAllFilters}>Clear filters</button>
          )}
        </div>
        <div className="sm-toolbar-right">
          <span className="sm-count">{totalCount.toLocaleString()} slots</span>
          <button className="sm-btn-ghost" onClick={() => setShowProviders(true)}>Providers</button>
          <button className="sm-btn-primary" onClick={() => { setEditorSlot({}); setIsNewSlot(true); }}>+ Add Slot</button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="sm-table-wrap">
        {loading ? (
          <div className="sm-empty"><div className="sm-spinner" /><p>Loading slots…</p></div>
        ) : slots.length === 0 ? (
          <div className="sm-empty">
            <p className="sm-empty-icon">No slots found</p>
            <p className="sm-empty-sub">Adjust search or filters, or add a new slot.</p>
          </div>
        ) : (
          <table className="sm-table">
            <thead>
              <tr>
                <th className="sm-th-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === slots.length && slots.length > 0}
                    ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < slots.length; }}
                    onChange={toggleAll}
                  />
                </th>
                <th className="sm-th-img" />
                <th className="sm-th-name" onClick={() => handleSort('name')}>Name <SortArrow col="name" /></th>
                <th className="sm-th-prov" onClick={() => handleSort('provider')}>Provider <SortArrow col="provider" /></th>
                <th className="sm-th-rtp" onClick={() => handleSort('rtp')}>RTP <SortArrow col="rtp" /></th>
                <th className="sm-th-maxwin" onClick={() => handleSort('max_win_multiplier')}>Max Win <SortArrow col="max_win_multiplier" /></th>
                <th className="sm-th-vol">Vol.</th>
                <th className="sm-th-status">Status</th>
                <th className="sm-th-actions" />
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, i) => {
                const selected = selectedIds.has(slot.id);
                return (
                  <tr key={slot.id} className={`sm-row ${selected ? 'selected' : ''} ${i % 2 ? 'odd' : ''}`} onClick={() => { setEditorSlot(slot); setIsNewSlot(false); }}>
                    <td className="sm-td-check" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected} onChange={() => toggleSelect(slot.id)} />
                    </td>
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
                    <td className="sm-td-status"><StatusDot status={slot.status || 'live'} /></td>
                    <td className="sm-td-actions" onClick={e => e.stopPropagation()}>
                      <button className="sm-row-btn" onClick={() => { setEditorSlot(slot); setIsNewSlot(false); }} title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button className="sm-row-btn danger" onClick={() => { if (confirm(`Delete "${slot.name}"?`)) handleDelete(slot.id); }} title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
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

      {/* ── Bulk action bar ──────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="sm-bulk">
          <span className="sm-bulk-count">{selectedIds.size} selected</span>
          <select onChange={e => { if (e.target.value) { bulkStatus(e.target.value); e.target.value = ''; } }} defaultValue="">
            <option value="" disabled>Status…</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="sm-btn-sm" onClick={() => bulkFeature(true)}>★ Feature</button>
          <button className="sm-btn-sm" onClick={() => bulkFeature(false)}>☆ Unfeature</button>
          <button className="sm-btn-sm danger" onClick={bulkDelete}>Delete</button>
          <button className="sm-btn-close-sm" onClick={clearSelection}>×</button>
        </div>
      )}

      {/* ── Editor / Providers panels ────────────────────── */}
      {(editorSlot || isNewSlot) && (
        <EditorPanel
          slot={editorSlot}
          isNew={isNewSlot}
          providers={providers}
          onClose={() => { setEditorSlot(null); setIsNewSlot(false); }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      {showProviders && <ProviderManager onClose={() => setShowProviders(false)} />}

      {/* ── Shortcuts hint ───────────────────────────────── */}
      <div className="sm-shortcuts">
        <kbd>/</kbd> Search &nbsp; <kbd>N</kbd> New &nbsp; <kbd>Esc</kbd> Close
      </div>
    </div>
  );
};

export default SlotManagerV2;
