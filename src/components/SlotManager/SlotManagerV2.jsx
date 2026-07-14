import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { supabase } from '../../config/supabaseClient';
import { DEFAULT_SLOT_IMAGE } from '../../utils/slotUtils';
import { buildGoogleSlotImageSearchUrl, buildSlotImageSearchUrl } from '../../utils/slotImageSearch';
import { getErrorMessage } from '../../utils/errorUtils';
import { getLocalProviderNames, getProviderIdentityKey, getProviderImage } from '../../utils/gameProviders';
import { BarChart3, Building2, Database, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
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

const ProviderLogo = memo(({ provider, logoUrl = '', className = '', fallbackMode = 'text' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [provider, logoUrl]);

  const logo = !failed ? (logoUrl || getProviderImage(provider)) : null;

  if (logo) {
    return (
      <span className={`sm-provider-logo-wrap ${className}`} title={provider || 'Provider'}>
        <img
          className="sm-provider-logo"
          src={logo}
          alt={provider ? `${provider} logo` : 'Provider logo'}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  if (fallbackMode === 'initial') {
    return (
      <span className={`sm-provider-logo-initial ${className}`} title={provider || 'Unknown provider'}>
        {(provider || '?').trim().charAt(0).toUpperCase() || '?'}
      </span>
    );
  }

  return <span className={`sm-provider-fallback ${className}`} title={provider || 'Unknown provider'}>{provider || '—'}</span>;
});

const normalizeProviderName = (provider) => String(provider || '').trim().replace(/\s+/g, ' ');

const findExistingProvider = (provider, providers) => {
  const candidate = normalizeProviderName(provider).toLowerCase();
  if (!candidate) return '';
  return providers.find(item => normalizeProviderName(item).toLowerCase() === candidate) || '';
};

const findKnownProvider = (provider, providers, aliases = {}) => {
  const direct = findExistingProvider(provider, providers);
  if (direct) return direct;

  const candidate = normalizeProviderName(provider).toLowerCase();
  if (!candidate) return '';

  return Object.entries(aliases).find(([, values]) => (
    Array.isArray(values) && values.some(value => normalizeProviderName(value).toLowerCase() === candidate)
  ))?.[0] || '';
};

const toProviderSlug = (provider) => normalizeProviderName(provider).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const providerIdentityKey = (provider) => {
  const name = normalizeProviderName(provider);
  return getProviderIdentityKey(name) || toProviderSlug(name);
};

const providerDisplayScore = (provider) => {
  const name = normalizeProviderName(provider);
  const compact = name.replace(/[^a-z]/gi, '');
  const allCapsPenalty = compact.length > 2 && compact === compact.toUpperCase() ? -20 : 0;
  return name.length + (/[a-z]/.test(name) ? 12 : 0) + (/\s/.test(name) ? 8 : 0) + allCapsPenalty;
};

const buildProviderCatalog = (names) => {
  const groups = new Map();

  names.forEach(rawName => {
    const name = normalizeProviderName(rawName);
    if (!name || !toProviderSlug(name)) return;

    const key = providerIdentityKey(name);
    if (!key) return;

    const current = groups.get(key) || { display: name, aliases: new Set() };
    current.aliases.add(name);
    if (providerDisplayScore(name) > providerDisplayScore(current.display)) {
      current.display = name;
    }
    groups.set(key, current);
  });

  const aliases = {};
  const providers = [...groups.values()]
    .map(group => {
      aliases[group.display] = [...group.aliases];
      return group.display;
    })
    .sort((a, b) => a.localeCompare(b));

  return { providers, aliases };
};

const mergeProviderRow = (groups, rawName, fields = {}) => {
  const name = normalizeProviderName(rawName);
  if (!name || !toProviderSlug(name)) return;

  const key = providerIdentityKey(name);
  if (!key) return;

  const current = groups.get(key) || {
    name,
    slug: toProviderSlug(name),
    logo_url: '',
    website_url: '',
    slot_count: 0,
  };

  const next = {
    ...current,
    ...fields,
    name: current.id ? current.name : (
      fields.id || providerDisplayScore(name) > providerDisplayScore(current.name)
        ? name
        : current.name
    ),
    slug: fields.slug || current.slug || toProviderSlug(name),
    logo_url: fields.logo_url ?? current.logo_url,
    website_url: fields.website_url ?? current.website_url,
    slot_count: Math.max(Number(current.slot_count) || 0, Number(fields.slot_count) || 0),
  };

  groups.set(key, next);
};

const ProviderPicker = memo(({ providers, value, onChange, onCreateProvider }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const close = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query ? providers.filter(provider => provider.toLowerCase().includes(query)) : providers;
    return list.slice(0, 80);
  }, [providers, search]);

  const choose = (provider) => {
    onChange(provider);
    setSearch('');
    setCreateError('');
    setOpen(false);
  };

  const proposedProvider = normalizeProviderName(search);
  const proposedProviderKey = providerIdentityKey(proposedProvider);
  const canCreateProvider = !!onCreateProvider
    && proposedProvider
    && proposedProviderKey
    && !findExistingProvider(proposedProvider, providers)
    && !providers.some(provider => providerIdentityKey(provider) === proposedProviderKey);

  const createProvider = async () => {
    if (!canCreateProvider) return;
    setCreating(true);
    setCreateError('');
    try {
      const created = await onCreateProvider(proposedProvider);
      choose(created || proposedProvider);
    } catch (error) {
      setCreateError(getErrorMessage(error, 'Could not add provider.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="sm-provider-picker" ref={ref}>
      <button type="button" className={`sm-provider-picker-btn ${value ? 'has-value' : ''}`} onClick={() => setOpen(prev => !prev)}>
        {value ? <ProviderLogo provider={value} className="sm-provider-logo--picker" /> : <span>Select existing provider</span>}
        <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
      </button>
      {open && (
        <div className="sm-provider-picker-menu">
          <input value={search} onChange={event => { setSearch(event.target.value); setCreateError(''); }} placeholder="Search providers…" autoFocus />
          <div className="sm-provider-picker-list">
            {filtered.map(provider => (
              <button key={provider} type="button" className={`sm-provider-picker-option ${value === provider ? 'selected' : ''}`} onClick={() => choose(provider)}>
                <ProviderLogo provider={provider} className="sm-provider-logo--picker-option" />
                <span>{provider}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="sm-provider-picker-empty">No existing provider found</p>}
            {canCreateProvider && (
              <button type="button" className="sm-provider-picker-create" onClick={createProvider} disabled={creating}>
                {creating ? 'Adding provider…' : `+ Add "${proposedProvider}" provider`}
              </button>
            )}
            {createError && <p className="sm-provider-picker-error">{createError}</p>}
          </div>
        </div>
      )}
    </div>
  );
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
            <label key={opt.value} className="sm-dropdown-item" title={opt.label}>
              <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} />
              {opt.color && <span className="sm-dropdown-dot" style={{ background: opt.color }} />}
              {opt.provider ? (
                <>
                  {getProviderImage(opt.provider) && <ProviderLogo provider={opt.provider} className="sm-provider-logo--filter" />}
                  <span className="sm-provider-filter-name">{opt.label}</span>
                </>
              ) : (
                <span>{opt.label}</span>
              )}
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

const EditorPanel = memo(({ slot, onClose, onSave, onDelete, providers, isNew, onCreateProvider }) => {
  const [form, setForm] = useState(slot || {});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('basic');
  const [imgResults, setImgResults] = useState([]);
  const [imgSearching, setImgSearching] = useState(false);
  const [imgSearchMeta, setImgSearchMeta] = useState(null);
  const [scrapedImages, setScrapedImages] = useState([]);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const nameRef = useRef(null);
  const scrapeRef = useRef('');

  useEffect(() => {
    setForm(slot || {});
    setTab('basic');
    setImgResults([]);
    setImgSearchMeta(null);
    setScrapedImages([]);
    scrapeRef.current = '';
    if (isNew) setTimeout(() => nameRef.current?.focus(), 100);
  }, [slot, isNew]);

  // Auto-scrape slot info (RTP, volatility, max win, provider, images) from demoslot/slotark/slotslaunch
  useEffect(() => {
    const n = (form.name || '').trim();
    if (!n || n.length < 3) return;
    if (n === scrapeRef.current) return;
    scrapeRef.current = n;
    const timer = setTimeout(async () => {
      setScrapeLoading(true);
      try {
        const res = await fetch(`/api/fetch-slot-info?name=${encodeURIComponent(n)}`);
        if (res.ok) {
          const { info } = await res.json();
          if (info) {
            const existingProvider = findExistingProvider(info.provider, providers);
            setScrapedImages(info.images || (info.image ? [info.image] : []));
            setForm(prev => ({
              ...prev,
              ...(existingProvider && !prev.provider ? { provider: existingProvider } : {}),
              ...(info.rtp && !prev.rtp ? { rtp: String(info.rtp) } : {}),
              ...(info.volatility && !prev.volatility ? { volatility: info.volatility } : {}),
              ...(info.max_win_multiplier && !prev.max_win_multiplier ? { max_win_multiplier: String(info.max_win_multiplier) } : {}),
              ...(info.image && !prev.image ? { image: info.image } : {}),
            }));
          } else { setScrapedImages([]); }
        } else { setScrapedImages([]); }
      } catch { setScrapedImages([]); }
      setScrapeLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [form.name, providers]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const searchImages = async () => {
    const name = (form.name || '').trim();
    const provider = (form.provider || '').trim();
    if (!name && !provider) return;
    const fallbackMeta = {
      googleUrl: buildGoogleSlotImageSearchUrl({ name, provider }),
      totalResults: 0,
    };
    setImgSearching(true);
    setImgResults([]);
    setImgSearchMeta(fallbackMeta);
    try {
      const res = await fetch(buildSlotImageSearchUrl({ name, provider }));
      const data = await res.json();
      if (res.ok) {
        setImgResults(data.images || []);
        setImgSearchMeta({
          googleUrl: data.googleUrl || fallbackMeta.googleUrl,
          bingUrl: data.bingUrl,
          query: data.query,
          totalResults: data.images?.length || 0,
        });
      }
    } catch { /* noop */ }
    setImgSearching(false);
  };

  const save = async () => {
    if (!form.name || !form.provider || !form.image) return alert('Name, Provider, and Image URL are required.');
    if (!findExistingProvider(form.provider, providers)) return alert('Select an existing provider from the provider list.');
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
    if (e.key === 'Escape') onClose();
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
          <button className="sm-btn-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

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
                <ProviderPicker
                  providers={providers}
                  value={form.provider || ''}
                  onChange={provider => set('provider', provider)}
                  onCreateProvider={onCreateProvider}
                />
              </label>
              <label className="sm-field">
                <span>Image URL <em>*</em></span>
                <div className="sm-img-search-row">
                  <input value={form.image || ''} onChange={e => set('image', e.target.value)} placeholder="https://… or search →" />
                  <button type="button" className="sm-img-search-btn" onClick={searchImages} disabled={(!form.name && !form.provider) || imgSearching}>
                    {imgSearching ? '⏳' : '🔍'}
                  </button>
                </div>
              </label>
              {(imgResults.length > 0 || imgSearchMeta?.googleUrl) && (
                <div className="sm-img-results">
                  {imgResults.slice(0, 8).map((img, i) => (
                    <button key={i} type="button"
                      className={`sm-img-result-btn${form.image === img.url ? ' selected' : ''}`}
                      onClick={() => { set('image', img.url); setImgResults([]); }}>
                      <img src={img.thumb} alt="" />
                    </button>
                  ))}
                  {imgSearchMeta?.googleUrl && (
                    <a className="sm-img-google-link" href={imgSearchMeta.googleUrl} target="_blank" rel="noreferrer">
                      Open Google Images
                    </a>
                  )}
                </div>
              )}
              {scrapeLoading && (
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0' }}>⏳ Auto-fetching slot info…</p>
              )}
              {scrapedImages.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Scraped images (DemoSlot / SlotArk / SlotsLaunch):</span>
                  <div className="sm-img-results" style={{ marginTop: 4 }}>
                    {scrapedImages.slice(0, 12).map((url, i) => (
                      <button key={`sc-${i}`} type="button"
                        className={`sm-img-result-btn${form.image === url ? ' selected' : ''}`}
                        onClick={() => set('image', url)}>
                        <img src={url} alt="" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
    const providerGroups = new Map();

    try {
      // Probe slot_providers table (may not exist yet)
      const { data: provData, error: provErr } = await supabase.from('slot_providers').select('*').order('name').limit(1000);
      if (!provErr && provData) {
        setHasProvTable(true);
        provData.forEach(provider => {
          mergeProviderRow(providerGroups, provider.name, {
            ...provider,
            slot_count: Number(provider.slot_count) || 0,
          });
        });
      }
    } catch { /* table doesn't exist */ }

    getLocalProviderNames().forEach(name => {
      mergeProviderRow(providerGroups, name, {
        logo_url: getProviderImage(name),
        is_local_logo: true,
      });
    });

    // Pull distinct providers from slots table too (paginated), even when slot_providers exists.
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

      const counts = new Map();
      all.forEach(row => {
        const name = normalizeProviderName(row.provider);
        if (!name) return;
        const key = providerIdentityKey(name) || toProviderSlug(name);
        counts.set(key, {
          name,
          count: (counts.get(key)?.count || 0) + 1,
        });
      });

      counts.forEach(({ name, count }) => {
        mergeProviderRow(providerGroups, name, { slot_count: count });
      });
    } catch { /* noop */ }

    setList([...providerGroups.values()].sort((a, b) => a.name.localeCompare(b.name)));
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
      alert('Error: ' + getErrorMessage(err, 'Could not save provider.'));
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
                  <ProviderLogo
                    provider={p.name}
                    logoUrl={p.logo_url}
                    className="sm-provider-logo--provider-card"
                    fallbackMode="initial"
                  />
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
  const [providerAliases, setProviderAliases] = useState({});
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
      const providerNames = [];

      try {
        const { data: managedProviders, error: providerError } = await supabase
          .from('slot_providers')
          .select('name')
          .order('name')
          .limit(1000);
        if (!providerError && Array.isArray(managedProviders)) {
          managedProviders.forEach(row => {
            const name = normalizeProviderName(row.name);
            if (name) providerNames.push(name);
          });
        }
      } catch { /* slot_providers may not exist in older databases */ }

      // Paginate to get ALL slot-used providers — Supabase defaults to 1000 row limit.
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
      all.forEach(row => {
        const name = normalizeProviderName(row.provider);
        if (name) providerNames.push(name);
      });
      providerNames.push(...getLocalProviderNames());
      const catalog = buildProviderCatalog(providerNames);
      setProviders(catalog.providers);
      setProviderAliases(catalog.aliases);
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
      if (providerFilter.length) {
        const providerValues = [...new Set(providerFilter.flatMap(provider => providerAliases[provider] || [provider]))];
        q = q.in('provider', providerValues);
      }
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
  }, [debouncedSearch, statusFilter, providerFilter, providerAliases, volFilter, page, pageSize, sortBy, sortDir, notify]);

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
  const handleCreateProvider = useCallback(async (rawName) => {
    const name = normalizeProviderName(rawName);
    if (!name) throw new Error('Provider name is required.');

    const existing = findKnownProvider(name, providers, providerAliases);
    if (existing) return existing;

    const slug = toProviderSlug(name);
    if (!slug) throw new Error('Provider name must include letters or numbers.');

    const { data, error } = await supabase
      .from('slot_providers')
      .insert([{ name, slug }])
      .select('name')
      .single();

    if (error) throw error;

    const createdName = normalizeProviderName(data?.name) || name;
    setProviders(prev => {
      const next = new Set(prev);
      next.add(createdName);
      return [...next].sort((a, b) => a.localeCompare(b));
    });
    setProviderAliases(prev => ({ ...prev, [createdName]: [createdName] }));
    notify(`Provider "${createdName}" added`);
    await loadProviders();
    return createdName;
  }, [loadProviders, notify, providerAliases, providers]);

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
      if (!findKnownProvider(d.provider, providers, providerAliases)) throw new Error('Select an existing provider from the provider list.');

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
      notify(getErrorMessage(e, 'Could not save slot.'), 'error');
    }
  }, [isNewSlot, loadSlots, loadProviders, notify, providerAliases, providers]);

  const handleDelete = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('slots').delete().eq('id', id);
      if (error) throw error;
      notify('Slot deleted');
      setEditorSlot(null);
      loadSlots();
    } catch (e) {
      notify(getErrorMessage(e, 'Could not delete slot.'), 'error');
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
    } catch (e) { notify(getErrorMessage(e, 'Could not delete slots.'), 'error'); }
  }, [selectedIds, loadSlots, clearSelection, notify]);

  const bulkStatus = useCallback(async (status) => {
    try {
      const { error } = await supabase.from('slots').update({ status }).in('id', [...selectedIds]);
      if (error) throw error;
      notify(`${selectedIds.size} → ${status}`);
      clearSelection();
      loadSlots();
    } catch (e) { notify(getErrorMessage(e, 'Could not update slots.'), 'error'); }
  }, [selectedIds, loadSlots, clearSelection, notify]);

  const bulkFeature = useCallback(async (featured) => {
    try {
      const { error } = await supabase.from('slots').update({ is_featured: featured }).in('id', [...selectedIds]);
      if (error) throw error;
      notify(`${selectedIds.size} ${featured ? 'featured' : 'unfeatured'}`);
      clearSelection();
      loadSlots();
    } catch (e) { notify(getErrorMessage(e, 'Could not update slots.'), 'error'); }
  }, [selectedIds, loadSlots, clearSelection, notify]);

  /* ── Bulk stat check (scrape RTP / Max Win / Volatility) ─── */
  const [statCheckRunning, setStatCheckRunning] = useState(false);
  const [statCheckProgress, setStatCheckProgress] = useState({ done: 0, total: 0, updated: 0, page: 0, totalPages: 0 });
  const [statCheckReport, setStatCheckReport] = useState(null);
  const [statCheckShowPanel, setStatCheckShowPanel] = useState(false);
  const [statCheckMode, setStatCheckMode] = useState('all'); // 'all' | 'newest' | 'provider'
  const [statCheckProvider, setStatCheckProvider] = useState('');
  const [statCheckPage, setStatCheckPage] = useState(1);
  const [statCheckTotalPages, setStatCheckTotalPages] = useState(1);
  const [statCheckDataFilter, setStatCheckDataFilter] = useState('any'); // 'any' | 'all' | 'one'
  const [statCheckFast, setStatCheckFast] = useState(true);
  const [statCheckSources, setStatCheckSources] = useState({ demoslot: true, slotark: true, slotslaunch: true });
  const statCheckAbort = useRef(false);
  const STAT_CHECK_PAGE = 200;
  const STAT_CHECK_BATCH = 5;
  const getProviderQueryValues = useCallback((provider) => (
    [...new Set(providerAliases[provider] || [provider])]
  ), [providerAliases]);

  // Helper: apply the data-missing filter to a query
  const applyDataFilter = (q, filter) => {
    if (filter === 'all') {
      // Missing ALL three stats
      return q.is('rtp', null).is('volatility', null).is('max_win_multiplier', null);
    } else if (filter === 'one') {
      // Missing exactly one
      return q.or(
        'and(rtp.is.null,volatility.not.is.null,max_win_multiplier.not.is.null),'
        + 'and(rtp.not.is.null,volatility.is.null,max_win_multiplier.not.is.null),'
        + 'and(rtp.not.is.null,volatility.not.is.null,max_win_multiplier.is.null)'
      );
    }
    // 'any' — missing at least one
    return q.or('rtp.is.null,volatility.is.null,max_win_multiplier.is.null');
  };

  // Count slots needing check for the current mode (for page picker)
  const refreshStatCheckCount = useCallback(async () => {
    let q = supabase.from('slots').select('id', { count: 'exact', head: true });
    q = applyDataFilter(q, statCheckDataFilter);
    if (statCheckMode === 'provider' && statCheckProvider) q = q.in('provider', getProviderQueryValues(statCheckProvider));
    const { count } = await q;
    const total = count || 0;
    setStatCheckTotalPages(Math.max(1, Math.ceil(total / STAT_CHECK_PAGE)));
    if (statCheckPage > Math.max(1, Math.ceil(total / STAT_CHECK_PAGE))) setStatCheckPage(1);
  }, [getProviderQueryValues, statCheckMode, statCheckProvider, statCheckPage, statCheckDataFilter]);

  useEffect(() => { if (statCheckShowPanel) refreshStatCheckCount(); }, [statCheckShowPanel, statCheckMode, statCheckProvider, statCheckDataFilter, refreshStatCheckCount]);

  const bulkStatCheck = useCallback(async () => {
    if (statCheckRunning) { statCheckAbort.current = true; return; }
    statCheckAbort.current = false;
    setStatCheckRunning(true);
    setStatCheckReport(null);
    setStatCheckProgress({ done: 0, total: 0, updated: 0, page: 0, totalPages: 0 });

    const report = [];
    let totalChecked = 0, totalUpdated = 0, totalSkipped = 0, totalFailed = 0;

    try {
      // Build base query
      const buildQuery = (select, opts) => {
        let q = supabase.from('slots').select(select, opts);
        q = applyDataFilter(q, statCheckDataFilter);
        if (statCheckMode === 'provider' && statCheckProvider) q = q.in('provider', getProviderQueryValues(statCheckProvider));
        if (statCheckMode === 'newest') q = q.order('created_at', { ascending: false, nullsFirst: false });
        else q = q.order('name', { ascending: true });
        return q;
      };

      // Count
      const { count, error: cErr } = await buildQuery('id', { count: 'exact', head: true });
      if (cErr) throw cErr;
      const total = count || 0;
      if (total === 0) { notify('All matching slots already have stats filled'); setStatCheckRunning(false); return; }

      const totalPages = Math.ceil(total / STAT_CHECK_PAGE);
      const startPage = statCheckPage - 1; // 0-indexed
      const from = startPage * STAT_CHECK_PAGE;
      const to = Math.min(from + STAT_CHECK_PAGE - 1, total - 1);
      const pageSlotCount = to - from + 1;

      setStatCheckProgress({ done: 0, total: pageSlotCount, updated: 0, page: statCheckPage, totalPages });

      // Fetch the chosen page
      const { data: pageSlots, error: pErr } = await buildQuery('id, name, provider, rtp, volatility, max_win_multiplier')
        .range(from, to);
      if (pErr) throw pErr;
      if (!pageSlots || pageSlots.length === 0) { notify('No slots on this page'); setStatCheckRunning(false); return; }

      // Build query params for the API
      const srcList = Object.entries(statCheckSources).filter(([, v]) => v).map(([k]) => k).join(',');
      const qp = `${statCheckFast ? '&fast=1' : ''}${srcList !== 'demoslot,slotark,slotslaunch' ? `&sources=${srcList}` : ''}`;

      // Process a single slot
      const processSlot = async (slot) => {
        try {
          const res = await fetch(`/api/fetch-slot-info?name=${encodeURIComponent(slot.name)}${qp}`);
          if (res.ok || res.status === 404) {
            const data = await res.json();
            const info = data?.info;
            if (info) {
              const upd = {};
              const changes = [];
              if (!slot.rtp && info.rtp) { upd.rtp = info.rtp; changes.push(`RTP: ${info.rtp}%`); }
              if (!slot.volatility && info.volatility) { upd.volatility = info.volatility; changes.push(`Volatility: ${info.volatility}`); }
              if (!slot.max_win_multiplier && info.max_win_multiplier) { upd.max_win_multiplier = info.max_win_multiplier; changes.push(`Max Win: ${info.max_win_multiplier}x`); }
              if (Object.keys(upd).length > 0) {
                const { error } = await supabase.from('slots').update(upd).eq('id', slot.id);
                if (!error) return { name: slot.name, status: 'updated', changes };
                return { name: slot.name, status: 'error', changes: [error.message] };
              }
              return { name: slot.name, status: 'no-data', changes: ['No new data found'] };
            }
            return { name: slot.name, status: 'no-data', changes: ['Not found on scraping sources'] };
          }
          return { name: slot.name, status: 'error', changes: [`HTTP ${res.status}`] };
        } catch (err) {
          return { name: slot.name, status: 'error', changes: [err.message || 'Network error'] };
        }
      };

      // Process in parallel batches of STAT_CHECK_BATCH
      for (let i = 0; i < pageSlots.length; i += STAT_CHECK_BATCH) {
        if (statCheckAbort.current) break;
        const batch = pageSlots.slice(i, i + STAT_CHECK_BATCH);
        const results = await Promise.all(batch.map(processSlot));
        for (const r of results) {
          totalChecked++;
          if (r.status === 'updated') totalUpdated++;
          else if (r.status === 'error') totalFailed++;
          else totalSkipped++;
          report.push(r);
        }
        setStatCheckProgress({ done: totalChecked, total: pageSlotCount, updated: totalUpdated, page: statCheckPage, totalPages });
      }

      setStatCheckReport({ entries: report, total: totalChecked, updated: totalUpdated, skipped: totalSkipped, failed: totalFailed });
      notify(`Done! Checked ${totalChecked} slots, updated ${totalUpdated}`);
      loadSlots();
      refreshStatCheckCount();
    } catch (e) {
      console.error('bulkStatCheck:', e);
      notify(getErrorMessage(e, 'Could not check slot stats.'), 'error');
    } finally {
      setStatCheckRunning(false);
    }
  }, [getProviderQueryValues, statCheckRunning, statCheckMode, statCheckProvider, statCheckPage, statCheckFast, statCheckSources, statCheckDataFilter, loadSlots, notify, refreshStatCheckCount]);

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

  const providerOptions = providers.map(p => ({ value: p, label: p, provider: p }));
  const statusLabelMap = Object.fromEntries(STATUS_OPTIONS.map(option => [option.value, option.label]));
  const volatilityLabelMap = Object.fromEntries(VOLATILITY_OPTIONS.map(option => [option.value, option.label]));
  const activeFilterChips = [
    ...statusFilter.map(value => `Status: ${statusLabelMap[value] || value}`),
    ...providerFilter.map(value => `Provider: ${value}`),
    ...volFilter.map(value => `Volatility: ${volatilityLabelMap[value] || value}`),
    ...(searchTerm.trim() ? [`Search: ${searchTerm.trim()}`] : []),
  ];
  const slotsWithStats = slots.filter(slot => slot.rtp || slot.max_win_multiplier || slot.volatility).length;
  const shownRangeStart = totalCount > 0 ? ((page - 1) * pageSize + 1) : 0;
  const shownRangeEnd = Math.min(page * pageSize, totalCount);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="slot-manager-v2">
      {/* Toast */}
      {notification && <div className={`sm-toast ${notification.type}`}>{notification.message}</div>}

      <header className="sm-page-header">
        <div className="sm-title-block">
          <span className="sm-eyebrow">Database tools</span>
          <h1><Database size={26} /> Slot Manager</h1>
          <p>Search, maintain and enrich the slot library used across bonus hunts and overlays.</p>
        </div>
        <div className="sm-header-actions">
          <button type="button" className="sm-btn-ghost" onClick={() => setStatCheckShowPanel(p => !p)}>
            <RefreshCw size={15} />
            {statCheckShowPanel ? 'Close Stats' : 'Check Stats'}
          </button>
          <button type="button" className="sm-btn-ghost" onClick={() => setShowProviders(true)}>
            <Building2 size={15} />
            Providers
          </button>
          <button type="button" className="sm-btn-primary" onClick={() => { setEditorSlot({}); setIsNewSlot(true); }}>
            <Plus size={15} />
            Add Slot
          </button>
        </div>
      </header>

      <section className="sm-stats-grid" aria-label="Slot database summary">
        <div className="sm-stat-card">
          <Database size={18} />
          <div>
            <strong>{totalCount.toLocaleString()}</strong>
            <span>Matching slots</span>
          </div>
        </div>
        <div className="sm-stat-card">
          <Building2 size={18} />
          <div>
            <strong>{providers.length.toLocaleString()}</strong>
            <span>Clean providers</span>
          </div>
        </div>
        <div className="sm-stat-card">
          <BarChart3 size={18} />
          <div>
            <strong>{slotsWithStats.toLocaleString()}</strong>
            <span>With stats on page</span>
          </div>
        </div>
        <div className="sm-stat-card">
          <SlidersHorizontal size={18} />
          <div>
            <strong>{selectedIds.size.toLocaleString()}</strong>
            <span>Selected</span>
          </div>
        </div>
      </section>

      <section className="sm-control-panel" aria-label="Slot filters">
        <div className="sm-toolbar">
          <div className="sm-toolbar-left">
            <div className="sm-search">
              <Search className="sm-search-icon" size={15} />
              <input ref={searchRef} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search slots or providers..." />
              {searchTerm && <button type="button" className="sm-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">×</button>}
            </div>
            <DropdownFilter label="Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
            <DropdownFilter label="Provider" options={providerOptions} selected={providerFilter} onChange={setProviderFilter} />
            <DropdownFilter label="Volatility" options={VOLATILITY_OPTIONS} selected={volFilter} onChange={setVolFilter} />
          </div>
          <div className="sm-toolbar-right">
            <span className="sm-count">
              {shownRangeStart.toLocaleString()}-{shownRangeEnd.toLocaleString()} of {totalCount.toLocaleString()}
            </span>
            {hasNonDefaultFilters && (
              <button type="button" className="sm-clear-filters" onClick={clearAllFilters}>Clear filters</button>
            )}
          </div>
        </div>
        {activeFilterChips.length > 0 && (
          <div className="sm-active-filters" aria-label="Active filters">
            {activeFilterChips.slice(0, 8).map(chip => <span key={chip} className="sm-filter-chip">{chip}</span>)}
            {activeFilterChips.length > 8 && <span className="sm-filter-chip">+{activeFilterChips.length - 8} more</span>}
          </div>
        )}
      </section>

      {/* ── Stat check control panel ──────────────────────── */}
      {statCheckShowPanel && (
        <section className="sm-stat-check-panel" aria-label="Slot stat checker">
          <div className="sm-stat-check-head">
            <div>
              <span className="sm-eyebrow">Enrichment</span>
              <h2>Check missing slot stats</h2>
            </div>
            <p>Fetch RTP, volatility and max-win data for slots that still need metadata.</p>
          </div>

          <div className="sm-stat-check-grid">
            <div className="sm-stat-group">
              <span className="sm-stat-label">Mode</span>
              <div className="sm-segment-group">
                {['all', 'newest', 'provider'].map(m => (
                  <button key={m} type="button" disabled={statCheckRunning}
                    className={`sm-segment ${statCheckMode === m ? 'active' : ''}`}
                    onClick={() => { setStatCheckMode(m); setStatCheckPage(1); }}>
                    {m === 'all' ? 'All' : m === 'newest' ? 'Newest' : 'Provider'}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm-stat-group">
              <span className="sm-stat-label">Missing data</span>
              <div className="sm-segment-group">
                {[['any', 'Any'], ['all', 'All'], ['one', 'One field']].map(([v, lbl]) => (
                  <button key={v} type="button" disabled={statCheckRunning}
                    className={`sm-segment ${statCheckDataFilter === v ? 'active purple' : ''}`}
                    onClick={() => { setStatCheckDataFilter(v); setStatCheckPage(1); }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {statCheckMode === 'provider' && (
              <label className="sm-stat-group sm-stat-select">
                <span className="sm-stat-label">Provider</span>
                <select value={statCheckProvider} disabled={statCheckRunning}
                  onChange={e => { setStatCheckProvider(e.target.value); setStatCheckPage(1); }}>
                  <option value="">Select Provider</option>
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            )}

            <div className="sm-stat-group sm-stat-pager">
              <span className="sm-stat-label">Page</span>
              <div className="sm-page-stepper">
                <button type="button" disabled={statCheckRunning || statCheckPage <= 1} onClick={() => setStatCheckPage(p => p - 1)}>‹</button>
                <span>{statCheckPage} / {statCheckTotalPages}</span>
                <button type="button" disabled={statCheckRunning || statCheckPage >= statCheckTotalPages} onClick={() => setStatCheckPage(p => p + 1)}>›</button>
              </div>
              <small>200 slots per page</small>
            </div>
          </div>

          <div className="sm-stat-check-grid sm-stat-check-grid--sources">
            <div className="sm-stat-group">
              <span className="sm-stat-label">Sources</span>
              <div className="sm-segment-group">
                {[['demoslot', 'DemoSlot'], ['slotark', 'SlotArk'], ['slotslaunch', 'SlotsLaunch']].map(([k, lbl]) => (
                  <button key={k} type="button" disabled={statCheckRunning}
                    className={`sm-segment ${statCheckSources[k] ? 'active teal' : ''}`}
                    onClick={() => setStatCheckSources(s => ({ ...s, [k]: !s[k] }))}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm-stat-group">
              <span className="sm-stat-label">Depth</span>
              <button type="button" disabled={statCheckRunning}
                className={`sm-segment sm-depth-toggle ${statCheckFast ? 'active amber' : ''}`}
                onClick={() => setStatCheckFast(f => !f)}>
                {statCheckFast ? 'Fast mode' : 'Deep mode'}
              </button>
              <small>{statCheckFast ? 'Direct URLs only' : 'Includes Bing fallback'}</small>
            </div>

            <div className="sm-stat-group sm-stat-action-group">
              <span className="sm-stat-label">Run</span>
              <button type="button" className={`sm-stat-run ${statCheckRunning ? 'stop' : ''}`} onClick={bulkStatCheck}
                disabled={statCheckMode === 'provider' && !statCheckProvider}>
                {statCheckRunning ? 'Stop check' : 'Start check'}
              </button>
            </div>
          </div>

          {statCheckRunning && statCheckProgress.total > 0 && (
            <div className="sm-stat-progress">
              <div className="sm-stat-progress-copy">
                <span>{statCheckProgress.done}/{statCheckProgress.total} slots checked</span>
                <strong>{statCheckProgress.updated} updated</strong>
              </div>
              <div className="sm-stat-progress-track">
                <div style={{ width: `${(statCheckProgress.done / statCheckProgress.total * 100)}%` }} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Stat check report ────────────────────────────── */}
      {statCheckReport && (
        <section className="sm-stat-report">
          <div className="sm-stat-report-head">
            <div>
              <span className="sm-eyebrow">Report</span>
              <h2>Stat check results</h2>
            </div>
            <div className="sm-report-metrics">
              <span>{statCheckReport.updated} updated</span>
              <span>{statCheckReport.skipped} skipped</span>
              <span>{statCheckReport.failed} failed</span>
              <span>{statCheckReport.total} checked</span>
            </div>
            <button type="button" onClick={() => setStatCheckReport(null)} className="sm-btn-close" aria-label="Close stat check report">×</button>
          </div>
          <table className="sm-report-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {statCheckReport.entries.map((e, i) => (
                <tr key={i}>
                  <td>{e.name}</td>
                  <td>
                    <span className={`sm-report-status ${e.status}`}>
                      {e.status === 'updated' ? 'Updated' : e.status === 'error' ? 'Error' : 'Skipped'}
                    </span>
                  </td>
                  <td>{e.changes.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

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
                      <div className="sm-slot-title-row">
                        <span>{slot.name}</span>
                        {slot.is_featured && <span className="sm-star" title="Featured">★</span>}
                      </div>
                      <div className="sm-slot-meta">
                        {slot.theme || slot.reels || slot.paylines || 'Slot record'}
                      </div>
                    </td>
                    <td className="sm-td-prov"><ProviderLogo provider={slot.provider} className="sm-provider-logo--table" /></td>
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
          onCreateProvider={handleCreateProvider}
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
