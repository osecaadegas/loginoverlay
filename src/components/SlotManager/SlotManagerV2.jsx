import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { supabase } from '../../config/supabaseClient';
import { DEFAULT_SLOT_IMAGE } from '../../utils/slotUtils';
import './SlotManagerV2.css';

// ============================================================================
// HOOKS
// ============================================================================

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// ============================================================================
// CONSTANTS
// ============================================================================

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
  'Tumble', 'Wild Symbols', 'Stacked Wilds', 'Mystery Symbols', 'Walking Wilds'
];

const PAGE_SIZES = [25, 50, 100, 200];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StatusBadge = memo(({ status }) => {
  const option = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  return (
    <span className="status-badge" style={{ '--status-color': option.color }}>
      <span className="status-dot" />
      {option.label}
    </span>
  );
});

const VolatilityBadge = memo(({ volatility }) => {
  if (!volatility) return <span className="vol-badge vol-unknown">-</span>;
  const option = VOLATILITY_OPTIONS.find(o => o.value === volatility);
  return (
    <span className="vol-badge" style={{ '--vol-color': option?.color || '#6b7280' }}>
      {option?.label || volatility}
    </span>
  );
});

const Checkbox = memo(({ checked, onChange, indeterminate }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="slot-checkbox" />
  );
});

const SlotRow = memo(({ slot, isSelected, onSelect, onEdit, onDelete, index }) => (
  <tr className={`slot-row ${isSelected ? 'selected' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`} onClick={() => onEdit(slot)}>
    <td className="col-checkbox" onClick={e => e.stopPropagation()}>
      <Checkbox checked={isSelected} onChange={() => onSelect(slot.id)} />
    </td>
    <td className="col-image">
      <div className="slot-image-wrapper">
        <img src={slot.image || DEFAULT_SLOT_IMAGE} alt={slot.name} loading="lazy" onError={e => e.target.src = DEFAULT_SLOT_IMAGE} />
      </div>
    </td>
    <td className="col-name">
      <div className="name-cell">
        <span className="slot-name-text">{slot.name}</span>
        {slot.is_featured && <span className="featured-star">⭐</span>}
      </div>
    </td>
    <td className="col-provider"><span className="provider-tag">{slot.provider}</span></td>
    <td className="col-rtp">{slot.rtp ? <span className="rtp-value">{slot.rtp}%</span> : <span className="no-data">—</span>}</td>
    <td className="col-maxwin">{slot.max_win_multiplier ? <span className="maxwin-value">{Number(slot.max_win_multiplier).toLocaleString()}x</span> : <span className="no-data">—</span>}</td>
    <td className="col-volatility"><VolatilityBadge volatility={slot.volatility} /></td>
    <td className="col-status"><StatusBadge status={slot.status || 'live'} /></td>
    <td className="col-actions" onClick={e => e.stopPropagation()}>
      <div className="row-actions">
        <button className="action-btn edit" onClick={() => onEdit(slot)} title="Edit">✏️</button>
        <button className="action-btn delete" onClick={() => { if (confirm(`Delete "${slot.name}"?`)) onDelete(slot.id); }} title="Delete">🗑️</button>
      </div>
    </td>
  </tr>
));

// ──────────────── FILTER PANEL ────────────────
const FilterPanel = memo(({ providers, filters, onFilterChange, isCollapsed, onToggleCollapse }) => {
  const [providerSearch, setProviderSearch] = useState('');
  const filteredProviders = providers.filter(p => p.toLowerCase().includes(providerSearch.toLowerCase()));

  const toggle = (key, value, defaults) => {
    const current = filters[key] || defaults || [];
    const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    onFilterChange(key, updated.length ? updated : null);
  };

  if (isCollapsed) return null;

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>Filters</h3>
        <button className="filter-toggle" onClick={onToggleCollapse}>✕</button>
      </div>
      <div className="filter-section">
        <h4>Status</h4>
        <div className="filter-options">
          {STATUS_OPTIONS.map(opt => (
            <label key={opt.value} className="filter-option">
              <input type="checkbox" checked={(filters.status || ['live']).includes(opt.value)} onChange={() => toggle('status', opt.value, ['live'])} />
              <span style={{ color: opt.color }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="filter-section">
        <h4>Provider ({(filters.providers || []).length || 'All'})</h4>
        <input type="text" placeholder="Search providers..." value={providerSearch} onChange={e => setProviderSearch(e.target.value)} className="provider-search" />
        <div className="provider-list">
          {filteredProviders.map(provider => (
            <label key={provider} className="filter-option">
              <input type="checkbox" checked={(filters.providers || []).includes(provider)} onChange={() => toggle('providers', provider)} />
              <span>{provider}</span>
            </label>
          ))}
        </div>
        {(filters.providers || []).length > 0 && (
          <button className="clear-btn" onClick={() => onFilterChange('providers', null)}>Clear providers</button>
        )}
      </div>
      <div className="filter-section">
        <h4>Volatility</h4>
        <div className="filter-options">
          {VOLATILITY_OPTIONS.map(opt => (
            <label key={opt.value} className="filter-option">
              <input type="checkbox" checked={(filters.volatility || []).includes(opt.value)} onChange={() => toggle('volatility', opt.value)} />
              <span style={{ color: opt.color }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="filter-section">
        <h4>RTP Range</h4>
        <div className="rtp-range">
          <input type="number" placeholder="Min" value={filters.rtpMin || ''} onChange={e => onFilterChange('rtpMin', e.target.value || null)} min="80" max="100" step="0.1" />
          <span>to</span>
          <input type="number" placeholder="Max" value={filters.rtpMax || ''} onChange={e => onFilterChange('rtpMax', e.target.value || null)} min="80" max="100" step="0.1" />
        </div>
      </div>
      <div className="filter-section">
        <h4>Max Win</h4>
        <div className="rtp-range">
          <input type="number" placeholder="Min x" value={filters.maxWinMin || ''} onChange={e => onFilterChange('maxWinMin', e.target.value || null)} min="0" />
          <span>to</span>
          <input type="number" placeholder="Max x" value={filters.maxWinMax || ''} onChange={e => onFilterChange('maxWinMax', e.target.value || null)} min="0" />
        </div>
      </div>
      <div className="filter-section">
        <h4>Features</h4>
        <div className="filter-options features-filter">
          {FEATURE_OPTIONS.slice(0, 10).map(feat => (
            <label key={feat} className="filter-option feature-tag-option">
              <input type="checkbox" checked={(filters.features || []).includes(feat)} onChange={() => toggle('features', feat)} />
              <span>{feat}</span>
            </label>
          ))}
        </div>
      </div>
      <button className="clear-all-btn" onClick={() => {
        onFilterChange('providers', null);
        onFilterChange('volatility', null);
        onFilterChange('status', ['live']);
        onFilterChange('rtpMin', null);
        onFilterChange('rtpMax', null);
        onFilterChange('maxWinMin', null);
        onFilterChange('maxWinMax', null);
        onFilterChange('features', null);
      }}>
        Reset All Filters
      </button>
    </div>
  );
});

// ──────────────── INSPECTOR PANEL (enhanced) ────────────────
const InspectorPanel = memo(({ slot, onClose, onSave, onDelete, providers, isNew }) => {
  const [formData, setFormData] = useState(slot || {});
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const nameInputRef = useRef(null);

  useEffect(() => {
    setFormData(slot || {});
    setFetchResult(null);
    setActiveTab('basic');
    if (isNew && nameInputRef.current) nameInputRef.current.focus();
  }, [slot, isNew]);

  const handleSave = async () => {
    if (!formData.name || !formData.provider || !formData.image) {
      alert('Name, provider, and image are required');
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
    if (e.key === 'Escape') onClose();
  };

  // AI Fetch
  const handleAIFetch = async () => {
    if (!formData.name) {
      alert('Enter a slot name first');
      return;
    }
    setFetching(true);
    setFetchResult(null);
    try {
      const res = await fetch('/api/fetch-slot-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, provider: formData.provider })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setFetchResult({ ...json, applied: false });
      } else {
        setFetchResult({ success: false, message: json.message || 'No data found' });
      }
    } catch (err) {
      setFetchResult({ success: false, message: err.message });
    } finally {
      setFetching(false);
    }
  };

  const applyFetchedData = () => {
    if (!fetchResult?.data) return;
    const d = fetchResult.data;
    setFormData(prev => ({
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

  const toggleFeature = (feat) => {
    const current = Array.isArray(formData.features) ? formData.features : [];
    const updated = current.includes(feat) ? current.filter(f => f !== feat) : [...current, feat];
    setFormData({ ...formData, features: updated });
  };

  if (!slot && !isNew) return null;

  return (
    <>
      <div className="inspector-backdrop" onClick={onClose} />
      <div className="inspector-panel" onKeyDown={handleKeyDown}>
        <div className="inspector-header">
          <h3>{isNew ? '➕ New Slot' : '✏️ Edit Slot'}</h3>
          <div className="inspector-header-actions">
            <button className={`ai-fetch-btn ${fetching ? 'loading' : ''}`} onClick={handleAIFetch} disabled={fetching} title="Auto-fill slot info using AI">
              {fetching ? '⏳ Fetching...' : '🤖 AI Fetch'}
            </button>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* AI Fetch Result Banner */}
        {fetchResult && (
          <div className={`fetch-result-banner ${fetchResult.success ? 'success' : 'error'}`}>
            {fetchResult.success ? (
              <>
                <div className="fetch-info">
                  <span className="fetch-badge">✨ {fetchResult.confidence} confidence</span>
                  <span className="fetch-source">Source: {fetchResult.source}</span>
                </div>
                {!fetchResult.applied ? (
                  <button className="apply-btn" onClick={applyFetchedData}>Apply Data</button>
                ) : (
                  <span className="applied-badge">✅ Applied</span>
                )}
              </>
            ) : (
              <span className="fetch-error">{fetchResult.message}</span>
            )}
            <button className="dismiss-btn" onClick={() => setFetchResult(null)}>✕</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="inspector-tabs">
          <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')}>Basic</button>
          <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>Stats</button>
          <button className={activeTab === 'features' ? 'active' : ''} onClick={() => setActiveTab('features')}>Features</button>
          <button className={activeTab === 'extra' ? 'active' : ''} onClick={() => setActiveTab('extra')}>Extra</button>
        </div>

        <div className="inspector-body">
          {/* BASIC TAB */}
          {activeTab === 'basic' && (
            <>
              <div className="image-preview">
                <img src={formData.image || DEFAULT_SLOT_IMAGE} alt="Preview" onError={e => e.target.src = DEFAULT_SLOT_IMAGE} />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input ref={nameInputRef} type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Slot name" />
              </div>
              <div className="form-group">
                <label>Provider *</label>
                <input type="text" list="provider-list" value={formData.provider || ''} onChange={e => setFormData({ ...formData, provider: e.target.value })} placeholder="Provider name" />
                <datalist id="provider-list">
                  {providers.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>Image URL *</label>
                <input type="url" value={formData.image || ''} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={formData.status || 'live'} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.is_featured || false} onChange={e => setFormData({ ...formData, is_featured: e.target.checked })} />
                  <span>⭐ Featured Slot</span>
                </label>
              </div>
            </>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <>
              <div className="form-row">
                <div className="form-group half">
                  <label>RTP (%)</label>
                  <input type="number" value={formData.rtp || ''} onChange={e => setFormData({ ...formData, rtp: e.target.value || null })} placeholder="96.50" step="0.01" min="80" max="100" />
                </div>
                <div className="form-group half">
                  <label>Volatility</label>
                  <select value={formData.volatility || ''} onChange={e => setFormData({ ...formData, volatility: e.target.value || null })}>
                    <option value="">Select...</option>
                    {VOLATILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Max Win (x)</label>
                  <input type="number" value={formData.max_win_multiplier || ''} onChange={e => setFormData({ ...formData, max_win_multiplier: e.target.value || null })} placeholder="10000" />
                </div>
                <div className="form-group half">
                  <label>Reels</label>
                  <input type="text" value={formData.reels || ''} onChange={e => setFormData({ ...formData, reels: e.target.value || null })} placeholder="5x3, 6x5, Megaways" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Min Bet (€)</label>
                  <input type="number" value={formData.min_bet || ''} onChange={e => setFormData({ ...formData, min_bet: e.target.value || null })} placeholder="0.20" step="0.01" min="0" />
                </div>
                <div className="form-group half">
                  <label>Max Bet (€)</label>
                  <input type="number" value={formData.max_bet || ''} onChange={e => setFormData({ ...formData, max_bet: e.target.value || null })} placeholder="100.00" step="0.01" min="0" />
                </div>
              </div>
              <div className="form-group">
                <label>Paylines</label>
                <input type="text" value={formData.paylines || ''} onChange={e => setFormData({ ...formData, paylines: e.target.value || null })} placeholder="10, 20, 243, Megaways, Cluster" />
              </div>
            </>
          )}

          {/* FEATURES TAB */}
          {activeTab === 'features' && (
            <>
              <div className="form-group">
                <label>Features</label>
                <div className="feature-grid">
                  {FEATURE_OPTIONS.map(feat => {
                    const features = Array.isArray(formData.features) ? formData.features : [];
                    return (
                      <label key={feat} className={`feature-tag ${features.includes(feat) ? 'active' : ''}`}>
                        <input type="checkbox" checked={features.includes(feat)} onChange={() => toggleFeature(feat)} />
                        {feat}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input type="text" value={Array.isArray(formData.tags) ? formData.tags.join(', ') : (formData.tags || '')} onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="popular, new, bonus-buy" />
              </div>
            </>
          )}

          {/* EXTRA TAB */}
          {activeTab === 'extra' && (
            <>
              <div className="form-group">
                <label>Theme</label>
                <input type="text" value={formData.theme || ''} onChange={e => setFormData({ ...formData, theme: e.target.value || null })} placeholder="Egyptian, Fruits, Mythology..." />
              </div>
              <div className="form-group">
                <label>Release Date</label>
                <input type="date" value={formData.release_date || ''} onChange={e => setFormData({ ...formData, release_date: e.target.value || null })} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value || null })} placeholder="Brief slot description..." rows={4} />
              </div>
            </>
          )}
        </div>

        <div className="inspector-footer">
          <div className="footer-left">
            {!isNew && (
              <button className="delete-btn" onClick={() => { if (confirm(`Delete "${formData.name}"?`)) onDelete(formData.id); }}>
                🗑️ Delete
              </button>
            )}
          </div>
          <div className="footer-right">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? '💾 Saving...' : '💾 Save'} <span className="shortcut">Ctrl+Enter</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

// ──────────────── PROVIDER MANAGER ────────────────
const ProviderManager = memo(({ onClose }) => {
  const [providersList, setProvidersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingProvider, setEditingProvider] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('slot_providers')
        .select('*')
        .order('name');
      if (error) throw error;
      setProvidersList(data || []);
    } catch (err) {
      console.error('Error loading providers:', err);
      // Fallback: load from slots directly
      try {
        const { data } = await supabase.from('slots').select('provider').order('provider');
        if (data) {
          const unique = [...new Set(data.map(d => (d.provider || '').trim()))].filter(Boolean);
          setProvidersList(unique.map(name => ({ name, slug: name.toLowerCase().replace(/\s+/g, '-'), logo_url: null, slot_count: 0 })));
        }
      } catch (e2) {
        console.error(e2);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const handleSave = async (provider) => {
    setSaving(true);
    try {
      if (provider.id) {
        const { error } = await supabase.from('slot_providers').update({
          name: provider.name,
          logo_url: provider.logo_url,
          website_url: provider.website_url,
        }).eq('id', provider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('slot_providers').insert([{
          name: provider.name,
          slug: provider.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          logo_url: provider.logo_url,
          website_url: provider.website_url,
        }]);
        if (error) throw error;
      }
      setEditingProvider(null);
      loadProviders();
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = providersList.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="inspector-backdrop" onClick={onClose} />
      <div className="inspector-panel provider-panel" style={{ width: '480px' }}>
        <div className="inspector-header">
          <h3>🎮 Provider Manager</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="provider-toolbar">
          <input type="text" placeholder="Search providers..." value={search} onChange={e => setSearch(e.target.value)} className="provider-search-input" />
          <button className="add-provider-btn" onClick={() => setEditingProvider({ name: '', logo_url: '', website_url: '' })}>+ Add</button>
        </div>

        {editingProvider && (
          <div className="provider-edit-form">
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={editingProvider.name} onChange={e => setEditingProvider({ ...editingProvider, name: e.target.value })} placeholder="Provider name" />
            </div>
            <div className="form-group">
              <label>Logo URL</label>
              <input type="text" value={editingProvider.logo_url || ''} onChange={e => setEditingProvider({ ...editingProvider, logo_url: e.target.value })} placeholder="https://..." />
              {editingProvider.logo_url && (
                <div className="provider-logo-preview">
                  <img src={editingProvider.logo_url} alt="Logo" onError={e => e.target.style.display='none'} />
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Website URL</label>
              <input type="text" value={editingProvider.website_url || ''} onChange={e => setEditingProvider({ ...editingProvider, website_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="provider-edit-actions">
              <button className="cancel-btn" onClick={() => setEditingProvider(null)}>Cancel</button>
              <button className="save-btn" onClick={() => handleSave(editingProvider)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        )}

        <div className="inspector-body">
          {loading ? (
            <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>
          ) : (
            <div className="provider-grid">
              {filtered.map((provider, i) => (
                <div key={provider.id || i} className="provider-card" onClick={() => setEditingProvider({ ...provider })}>
                  <div className="provider-card-logo">
                    {provider.logo_url ? (
                      <img src={provider.logo_url} alt={provider.name} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <div className="provider-card-initial" style={{ display: provider.logo_url ? 'none' : 'flex' }}>
                      {(provider.name || '?')[0].toUpperCase()}
                    </div>
                  </div>
                  <div className="provider-card-info">
                    <span className="provider-card-name">{provider.name}</span>
                    {provider.slot_count > 0 && <span className="provider-card-count">{provider.slot_count} slots</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

// ──────────────── BULK ACTION BAR ────────────────
const BulkActionBar = memo(({ selectedCount, onClear, onBulkDelete, onBulkStatusChange, onBulkFeature }) => {
  if (selectedCount === 0) return null;
  return (
    <div className="bulk-bar">
      <span className="bulk-count">{selectedCount} selected</span>
      <div className="bulk-actions">
        <select onChange={e => { if (e.target.value) { onBulkStatusChange(e.target.value); e.target.value = ''; } }} defaultValue="">
          <option value="" disabled>Set Status...</option>
          {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <button onClick={() => onBulkFeature(true)}>⭐ Feature</button>
        <button onClick={() => onBulkFeature(false)}>☆ Unfeature</button>
        <button className="danger" onClick={onBulkDelete}>🗑️ Delete</button>
      </div>
      <button className="clear-selection" onClick={onClear}>✕ Clear</button>
    </div>
  );
});

// ──────────────── PAGINATION ────────────────
const Pagination = memo(({ page, totalPages, totalCount, pageSize, onPageChange, onPageSizeChange }) => {
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);
  return (
    <div className="pagination">
      <div className="pagination-info">Showing {startItem}-{endItem} of {totalCount}</div>
      <div className="pagination-controls">
        <button disabled={page <= 1} onClick={() => onPageChange(1)} title="First page">⏮</button>
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="Previous page">◀</button>
        <span className="page-indicator">Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} title="Next page">▶</button>
        <button disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} title="Last page">⏭</button>
      </div>
      <div className="page-size-selector">
        <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}>
          {PAGE_SIZES.map(size => <option key={size} value={size}>{size} per page</option>)}
        </select>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SlotManagerV2 = () => {
  const [slots, setSlots] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: ['live'] });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [inspectorSlot, setInspectorSlot] = useState(null);
  const [isNewSlot, setIsNewSlot] = useState(false);
  const [showProviderManager, setShowProviderManager] = useState(false);
  const [notification, setNotification] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('slots').select('provider').order('provider');
      if (error) throw error;
      if (data) {
        const unique = [...new Set(data.map(d => (d.provider || '').trim()))].filter(Boolean);
        setProviders(unique);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('slots').select('*', { count: 'exact' });

      if (debouncedSearch) query = query.or(`name.ilike.%${debouncedSearch}%,provider.ilike.%${debouncedSearch}%`);
      if (filters.providers?.length) query = query.in('provider', filters.providers);
      if (filters.status?.length) query = query.in('status', filters.status);
      if (filters.volatility?.length) query = query.in('volatility', filters.volatility);
      if (filters.rtpMin) query = query.gte('rtp', filters.rtpMin);
      if (filters.rtpMax) query = query.lte('rtp', filters.rtpMax);
      if (filters.maxWinMin) query = query.gte('max_win_multiplier', filters.maxWinMin);
      if (filters.maxWinMax) query = query.lte('max_win_multiplier', filters.maxWinMax);
      // Features filter (JSONB contains)
      if (filters.features?.length) {
        filters.features.forEach(feat => {
          query = query.contains('features', JSON.stringify([feat]));
        });
      }

      query = query.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      setSlots(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error loading slots:', error);
      showNotification('Error loading slots', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, page, pageSize, sortBy, sortDir, showNotification]);

  useEffect(() => { loadSlots(); }, [loadSlots]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filters, pageSize]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === slots.length ? new Set() : new Set(slots.map(s => s.id)));
  }, [slots]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

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

      if (!d.name || !d.provider || !d.image) throw new Error('Name, provider, and image are required');

      if (isNewSlot) {
        const { error } = await supabase.from('slots').insert([d]);
        if (error) throw error;
        showNotification('Slot created successfully!');
      } else {
        const { error } = await supabase.from('slots').update(d).eq('id', formData.id);
        if (error) throw error;
        showNotification('Slot updated successfully!');
      }
      setInspectorSlot(null);
      setIsNewSlot(false);
      await Promise.all([loadSlots(), loadProviders()]);
    } catch (error) {
      console.error('Error saving slot:', error);
      showNotification(error.message, 'error');
    }
  }, [isNewSlot, loadProviders, loadSlots, showNotification]);

  const handleDelete = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('slots').delete().eq('id', id);
      if (error) throw error;
      showNotification('Slot deleted');
      setInspectorSlot(null);
      loadSlots();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }, [loadSlots, showNotification]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedIds.size} slots?`)) return;
    try {
      const { error } = await supabase.from('slots').delete().in('id', Array.from(selectedIds));
      if (error) throw error;
      showNotification(`${selectedIds.size} slots deleted`);
      clearSelection();
      loadSlots();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }, [selectedIds, loadSlots, clearSelection, showNotification]);

  const handleBulkStatusChange = useCallback(async (status) => {
    try {
      const { error } = await supabase.from('slots').update({ status }).in('id', Array.from(selectedIds));
      if (error) throw error;
      showNotification(`${selectedIds.size} slots updated to ${status}`);
      clearSelection();
      loadSlots();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }, [selectedIds, loadSlots, clearSelection, showNotification]);

  const handleBulkFeature = useCallback(async (featured) => {
    try {
      const { error } = await supabase.from('slots').update({ is_featured: featured }).in('id', Array.from(selectedIds));
      if (error) throw error;
      showNotification(`${selectedIds.size} slots ${featured ? 'featured' : 'unfeatured'}`);
      clearSelection();
      loadSlots();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }, [selectedIds, loadSlots, clearSelection, showNotification]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      switch (e.key) {
        case '/': e.preventDefault(); document.querySelector('.search-input')?.focus(); break;
        case 'n': e.preventDefault(); setInspectorSlot({}); setIsNewSlot(true); break;
        case 'Escape':
          if (showProviderManager) setShowProviderManager(false);
          else if (inspectorSlot) { setInspectorSlot(null); setIsNewSlot(false); }
          else if (selectedIds.size > 0) clearSelection();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectorSlot, selectedIds.size, clearSelection, showProviderManager]);

  const handleSort = useCallback((column) => {
    if (sortBy === column) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortDir('asc'); }
  }, [sortBy]);

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="slot-manager-v2">
      {notification && <div className={`notification ${notification.type}`}>{notification.message}</div>}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button className={`filter-toggle-btn ${!filtersCollapsed ? 'active' : ''}`} onClick={() => setFiltersCollapsed(!filtersCollapsed)} title="Toggle filters">
            {filtersCollapsed ? '☰' : '✕'} Filters
            {(() => {
              const count = (filters.providers?.length || 0) + (filters.volatility?.length || 0) + (filters.rtpMin ? 1 : 0) + (filters.rtpMax ? 1 : 0) + (filters.maxWinMin ? 1 : 0) + (filters.maxWinMax ? 1 : 0) + (filters.features?.length || 0);
              return count > 0 ? <span className="filter-count">{count}</span> : null;
            })()}
          </button>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input" placeholder="Search slots... (press /)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>}
          </div>
        </div>
        <div className="toolbar-right">
          <span className="total-badge">{totalCount.toLocaleString()} slots</span>
          <button className="provider-btn" onClick={() => setShowProviderManager(true)} title="Manage Providers">
            🎮 Providers
          </button>
          <button className="add-btn" onClick={() => { setInspectorSlot({}); setIsNewSlot(true); }}>
            + Add Slot <span className="shortcut">N</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <FilterPanel providers={providers} filters={filters} onFilterChange={handleFilterChange} isCollapsed={filtersCollapsed} onToggleCollapse={() => setFiltersCollapsed(!filtersCollapsed)} />
        <div className="table-container">
          {loading ? (
            <div className="loading-state"><div className="spinner"></div><p>Loading slots...</p></div>
          ) : slots.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">🎰</span><h3>No slots found</h3><p>Try adjusting your filters or search term</p></div>
          ) : (
            <table className="slot-table">
              <thead>
                <tr>
                  <th className="col-checkbox"><Checkbox checked={selectedIds.size === slots.length && slots.length > 0} indeterminate={selectedIds.size > 0 && selectedIds.size < slots.length} onChange={handleSelectAll} /></th>
                  <th className="col-image">Image</th>
                  <th className="col-name" onClick={() => handleSort('name')}>Name <SortIcon column="name" /></th>
                  <th className="col-provider" onClick={() => handleSort('provider')}>Provider <SortIcon column="provider" /></th>
                  <th className="col-rtp" onClick={() => handleSort('rtp')}>RTP <SortIcon column="rtp" /></th>
                  <th className="col-maxwin" onClick={() => handleSort('max_win_multiplier')}>Max Win <SortIcon column="max_win_multiplier" /></th>
                  <th className="col-volatility">Volatility</th>
                  <th className="col-status">Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, index) => (
                  <SlotRow key={slot.id} slot={slot} index={index} isSelected={selectedIds.has(slot.id)} onSelect={handleSelect} onEdit={s => { setInspectorSlot(s); setIsNewSlot(false); }} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          )}
          {!loading && totalCount > 0 && (
            <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          )}
        </div>

        {(inspectorSlot || isNewSlot) && (
          <InspectorPanel slot={inspectorSlot} isNew={isNewSlot} providers={providers} onClose={() => { setInspectorSlot(null); setIsNewSlot(false); }} onSave={handleSave} onDelete={handleDelete} />
        )}

        {showProviderManager && (
          <ProviderManager onClose={() => setShowProviderManager(false)} />
        )}
      </div>

      <BulkActionBar selectedCount={selectedIds.size} onClear={clearSelection} onBulkDelete={handleBulkDelete} onBulkStatusChange={handleBulkStatusChange} onBulkFeature={handleBulkFeature} />

      <div className="shortcuts-hint">
        <span><kbd>/</kbd> Search</span>
        <span><kbd>N</kbd> New</span>
        <span><kbd>Esc</kbd> Close/Clear</span>
      </div>
    </div>
  );
};

export default SlotManagerV2;