import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { supabase } from '../../config/supabaseClient';
import { DEFAULT_SLOT_IMAGE } from '../../utils/slotUtils';
import './SlotManagerV2.css';

// ============================================================================
// HOOKS
// ============================================================================

// Debounce hook
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

const PAGE_SIZES = [25, 50, 100, 200];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Status Badge
const StatusBadge = memo(({ status }) => {
  const option = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  return (
    <span className="status-badge" style={{ '--status-color': option.color }}>
      <span className="status-dot" />
      {option.label}
    </span>
  );
});

// Volatility Badge
const VolatilityBadge = memo(({ volatility }) => {
  if (!volatility) return <span className="vol-badge vol-unknown">-</span>;
  const option = VOLATILITY_OPTIONS.find(o => o.value === volatility);
  return (
    <span className="vol-badge" style={{ '--vol-color': option?.color || '#6b7280' }}>
      {option?.label || volatility}
    </span>
  );
});

// Checkbox
const Checkbox = memo(({ checked, onChange, indeterminate }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="slot-checkbox"
    />
  );
});

// Slot Row
const SlotRow = memo(({ slot, isSelected, onSelect, onEdit, onDelete, index }) => {
  return (
    <tr 
      className={`slot-row ${isSelected ? 'selected' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}
      onClick={() => onEdit(slot)}
    >
      <td className="col-checkbox" onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onChange={() => onSelect(slot.id)} />
      </td>
      <td className="col-image">
        <div className="slot-image-wrapper">
          <img 
            src={slot.image || DEFAULT_SLOT_IMAGE} 
            alt={slot.name}
            loading="lazy"
            onError={(e) => e.target.src = DEFAULT_SLOT_IMAGE}
          />
        </div>
      </td>
      <td className="col-name">
        <div className="name-cell">
          <span className="slot-name-text">{slot.name}</span>
          {slot.is_featured && <span className="featured-star">⭐</span>}
        </div>
      </td>
      <td className="col-provider">
        <span className="provider-tag">{slot.provider}</span>
      </td>
      <td className="col-rtp">
        {slot.rtp ? <span className="rtp-value">{slot.rtp}%</span> : <span className="no-data">—</span>}
      </td>
      <td className="col-volatility"><VolatilityBadge volatility={slot.volatility} /></td>
      <td className="col-status"><StatusBadge status={slot.status || 'live'} /></td>
      <td className="col-actions" onClick={e => e.stopPropagation()}>
        <div className="row-actions">
          <button className="action-btn edit" onClick={() => onEdit(slot)} title="Edit">
            ✏️
          </button>
          <button 
            className="action-btn delete" 
            onClick={() => {
              if (confirm(`Delete "${slot.name}"?`)) onDelete(slot.id);
            }} 
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
});

// Filter Panel
const FilterPanel = memo(({ 
  providers, 
  filters, 
  onFilterChange,
  isCollapsed,
  onToggleCollapse 
}) => {
  const [providerSearch, setProviderSearch] = useState('');
  
  const filteredProviders = providers.filter(p => 
    p.toLowerCase().includes(providerSearch.toLowerCase())
  );

  const toggleProvider = (provider) => {
    const current = filters.providers || [];
    const updated = current.includes(provider)
      ? current.filter(p => p !== provider)
      : [...current, provider];
    onFilterChange('providers', updated.length ? updated : null);
  };

  const toggleStatus = (status) => {
    const current = filters.status || ['live'];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFilterChange('status', updated.length ? updated : null);
  };

  const toggleVolatility = (vol) => {
    const current = filters.volatility || [];
    const updated = current.includes(vol)
      ? current.filter(v => v !== vol)
      : [...current, vol];
    onFilterChange('volatility', updated.length ? updated : null);
  };

  // Count active filters
  const activeFilterCount = 
    (filters.providers?.length || 0) + 
    (filters.volatility?.length || 0) + 
    (filters.rtpMin ? 1 : 0) + 
    (filters.rtpMax ? 1 : 0) +
    ((filters.status?.length || 0) !== 1 || filters.status?.[0] !== 'live' ? 1 : 0);

  if (isCollapsed) {
    return null;
  }

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>Filters</h3>
        <button className="filter-toggle" onClick={onToggleCollapse}>✕</button>
      </div>

      {/* Status Filter */}
      <div className="filter-section">
        <h4>Status</h4>
        <div className="filter-options">
          {STATUS_OPTIONS.map(opt => (
            <label key={opt.value} className="filter-option">
              <input
                type="checkbox"
                checked={(filters.status || ['live']).includes(opt.value)}
                onChange={() => toggleStatus(opt.value)}
              />
              <span style={{ color: opt.color }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Provider Filter */}
      <div className="filter-section">
        <h4>Provider ({(filters.providers || []).length || 'All'})</h4>
        <input
          type="text"
          placeholder="Search providers..."
          value={providerSearch}
          onChange={e => setProviderSearch(e.target.value)}
          className="provider-search"
        />
        <div className="provider-list">
          {filteredProviders.map(provider => (
            <label key={provider} className="filter-option">
              <input
                type="checkbox"
                checked={(filters.providers || []).includes(provider)}
                onChange={() => toggleProvider(provider)}
              />
              <span>{provider}</span>
            </label>
          ))}
        </div>
        {(filters.providers || []).length > 0 && (
          <button 
            className="clear-btn"
            onClick={() => onFilterChange('providers', null)}
          >
            Clear providers
          </button>
        )}
      </div>

      {/* Volatility Filter */}
      <div className="filter-section">
        <h4>Volatility</h4>
        <div className="filter-options">
          {VOLATILITY_OPTIONS.map(opt => (
            <label key={opt.value} className="filter-option">
              <input
                type="checkbox"
                checked={(filters.volatility || []).includes(opt.value)}
                onChange={() => toggleVolatility(opt.value)}
              />
              <span style={{ color: opt.color }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* RTP Range */}
      <div className="filter-section">
        <h4>RTP Range</h4>
        <div className="rtp-range">
          <input
            type="number"
            placeholder="Min"
            value={filters.rtpMin || ''}
            onChange={e => onFilterChange('rtpMin', e.target.value || null)}
            min="80"
            max="100"
            step="0.1"
          />
          <span>to</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.rtpMax || ''}
            onChange={e => onFilterChange('rtpMax', e.target.value || null)}
            min="80"
            max="100"
            step="0.1"
          />
        </div>
      </div>

      {/* Clear All */}
      <button 
        className="clear-all-btn"
        onClick={() => {
          onFilterChange('providers', null);
          onFilterChange('volatility', null);
          onFilterChange('status', ['live']);
          onFilterChange('rtpMin', null);
          onFilterChange('rtpMax', null);
        }}
      >
        Reset All Filters
      </button>
    </div>
  );
});

// Inspector Panel
const InspectorPanel = memo(({ 
  slot, 
  onClose, 
  onSave, 
  onDelete,
  providers,
  isNew 
}) => {
  const [formData, setFormData] = useState(slot || {});
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    setFormData(slot || {});
    if (isNew && nameInputRef.current) {
      nameInputRef.current.focus();
    }
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
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!slot && !isNew) return null;

  return (
    <div className="inspector-panel" onKeyDown={handleKeyDown}>
      <div className="inspector-header">
        <h3>{isNew ? '➕ New Slot' : '✏️ Edit Slot'}</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="inspector-body">
        {/* Image Preview */}
        <div className="image-preview">
          <img 
            src={formData.image || DEFAULT_SLOT_IMAGE} 
            alt="Preview"
            onError={(e) => e.target.src = DEFAULT_SLOT_IMAGE}
          />
        </div>

        {/* Form Fields */}
        <div className="form-group">
          <label>Name *</label>
          <input
            ref={nameInputRef}
            type="text"
            value={formData.name || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Slot name"
          />
        </div>

        <div className="form-group">
          <label>Provider *</label>
          <input
            type="text"
            list="provider-list"
            value={formData.provider || ''}
            onChange={e => setFormData({ ...formData, provider: e.target.value })}
            placeholder="Provider name"
          />
          <datalist id="provider-list">
            {providers.map(p => <option key={p} value={p} />)}
          </datalist>
        </div>

        <div className="form-group">
          <label>Image URL *</label>
          <input
            type="url"
            value={formData.image || ''}
            onChange={e => setFormData({ ...formData, image: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>RTP (%)</label>
            <input
              type="number"
              value={formData.rtp || ''}
              onChange={e => setFormData({ ...formData, rtp: e.target.value || null })}
              placeholder="96.50"
              step="0.01"
              min="80"
              max="100"
            />
          </div>
          <div className="form-group half">
            <label>Volatility</label>
            <select
              value={formData.volatility || ''}
              onChange={e => setFormData({ ...formData, volatility: e.target.value || null })}
            >
              <option value="">Select...</option>
              {VOLATILITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Reels</label>
            <input
              type="text"
              value={formData.reels || ''}
              onChange={e => setFormData({ ...formData, reels: e.target.value || null })}
              placeholder="5x3, 6x5, Megaways"
            />
          </div>
          <div className="form-group half">
            <label>Max Win (x)</label>
            <input
              type="number"
              value={formData.max_win_multiplier || ''}
              onChange={e => setFormData({ ...formData, max_win_multiplier: e.target.value || null })}
              placeholder="10000"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Status</label>
          <select
            value={formData.status || 'live'}
            onChange={e => setFormData({ ...formData, status: e.target.value })}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.is_featured || false}
              onChange={e => setFormData({ ...formData, is_featured: e.target.checked })}
            />
            <span>⭐ Featured Slot</span>
          </label>
        </div>
      </div>

      <div className="inspector-footer">
        <div className="footer-left">
          {!isNew && (
            <button 
              className="delete-btn"
              onClick={() => {
                if (confirm(`Delete "${formData.name}"?`)) {
                  onDelete(formData.id);
                }
              }}
            >
              🗑️ Delete
            </button>
          )}
        </div>
        <div className="footer-right">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '💾 Saving...' : '💾 Save'} <span className="shortcut">Ctrl+Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
});

// Bulk Action Bar
const BulkActionBar = memo(({ 
  selectedCount, 
  onClear, 
  onBulkDelete, 
  onBulkStatusChange,
  onBulkFeature 
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-bar">
      <span className="bulk-count">{selectedCount} selected</span>
      <div className="bulk-actions">
        <select 
          onChange={e => {
            if (e.target.value) {
              onBulkStatusChange(e.target.value);
              e.target.value = '';
            }
          }}
          defaultValue=""
        >
          <option value="" disabled>Set Status...</option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button onClick={() => onBulkFeature(true)}>⭐ Feature</button>
        <button onClick={() => onBulkFeature(false)}>☆ Unfeature</button>
        <button className="danger" onClick={onBulkDelete}>🗑️ Delete</button>
      </div>
      <button className="clear-selection" onClick={onClear}>✕ Clear</button>
    </div>
  );
});

// Pagination
const Pagination = memo(({ page, totalPages, totalCount, pageSize, onPageChange, onPageSizeChange }) => {
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {startItem}-{endItem} of {totalCount}
      </div>
      <div className="pagination-controls">
        <button 
          disabled={page <= 1} 
          onClick={() => onPageChange(1)}
          title="First page"
        >
          ⏮
        </button>
        <button 
          disabled={page <= 1} 
          onClick={() => onPageChange(page - 1)}
          title="Previous page"
        >
          ◀
        </button>
        <span className="page-indicator">
          Page {page} of {totalPages}
        </span>
        <button 
          disabled={page >= totalPages} 
          onClick={() => onPageChange(page + 1)}
          title="Next page"
        >
          ▶
        </button>
        <button 
          disabled={page >= totalPages} 
          onClick={() => onPageChange(totalPages)}
          title="Last page"
        >
          ⏭
        </button>
      </div>
      <div className="page-size-selector">
        <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}>
          {PAGE_SIZES.map(size => (
            <option key={size} value={size}>{size} per page</option>
          ))}
        </select>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SlotManagerV2 = () => {
  // Data state
  const [slots, setSlots] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: ['live'] });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Inspector state
  const [inspectorSlot, setInspectorSlot] = useState(null);
  const [isNewSlot, setIsNewSlot] = useState(false);

  // Notification state
  const [notification, setNotification] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Show notification
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Load providers
  useEffect(() => {
    const loadProviders = async () => {
      const { data } = await supabase
        .from('slots')
        .select('provider')
        .order('provider');
      
      if (data) {
        const unique = [...new Set(data.map(d => d.provider))].filter(Boolean);
        setProviders(unique);
      }
    };
    loadProviders();
  }, []);

  // Load slots with filters
  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from('slots')
        .select('*', { count: 'exact' });

      // Apply filters
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,provider.ilike.%${debouncedSearch}%`);
      }
      if (filters.providers?.length) {
        query = query.in('provider', filters.providers);
      }
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters.volatility?.length) {
        query = query.in('volatility', filters.volatility);
      }
      if (filters.rtpMin) {
        query = query.gte('rtp', filters.rtpMin);
      }
      if (filters.rtpMax) {
        query = query.lte('rtp', filters.rtpMax);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

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

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, pageSize]);

  // Filter change handler
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Selection handlers
  const handleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === slots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(slots.map(s => s.id)));
    }
  }, [slots, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // CRUD handlers
  const handleSave = useCallback(async (formData) => {
    try {
      if (isNewSlot) {
        const { error } = await supabase
          .from('slots')
          .insert([{
            name: formData.name,
            provider: formData.provider,
            image: formData.image,
            rtp: formData.rtp || null,
            volatility: formData.volatility || null,
            reels: formData.reels || null,
            max_win_multiplier: formData.max_win_multiplier || null,
            status: formData.status || 'live',
            is_featured: formData.is_featured || false,
          }]);
        if (error) throw error;
        showNotification('Slot created successfully!');
      } else {
        const { error } = await supabase
          .from('slots')
          .update({
            name: formData.name,
            provider: formData.provider,
            image: formData.image,
            rtp: formData.rtp || null,
            volatility: formData.volatility || null,
            reels: formData.reels || null,
            max_win_multiplier: formData.max_win_multiplier || null,
            status: formData.status || 'live',
            is_featured: formData.is_featured || false,
          })
          .eq('id', formData.id);
        if (error) throw error;
        showNotification('Slot updated successfully!');
      }
      setInspectorSlot(null);
      setIsNewSlot(false);
      loadSlots();
    } catch (error) {
      console.error('Error saving slot:', error);
      showNotification(error.message, 'error');
    }
  }, [isNewSlot, loadSlots, showNotification]);

  const handleDelete = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('slots')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showNotification('Slot deleted');
      setInspectorSlot(null);
      loadSlots();
    } catch (error) {
      console.error('Error deleting slot:', error);
      showNotification(error.message, 'error');
    }
  }, [loadSlots, showNotification]);

  // Bulk handlers
  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedIds.size} slots?`)) return;
    try {
      const { error } = await supabase
        .from('slots')
        .delete()
        .in('id', Array.from(selectedIds));
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
      const { error } = await supabase
        .from('slots')
        .update({ status })
        .in('id', Array.from(selectedIds));
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
      const { error } = await supabase
        .from('slots')
        .update({ is_featured: featured })
        .in('id', Array.from(selectedIds));
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
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          document.querySelector('.search-input')?.focus();
          break;
        case 'n':
          e.preventDefault();
          setInspectorSlot({});
          setIsNewSlot(true);
          break;
        case 'Escape':
          if (inspectorSlot) {
            setInspectorSlot(null);
            setIsNewSlot(false);
          } else if (selectedIds.size > 0) {
            clearSelection();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectorSlot, selectedIds.size, clearSelection]);

  // Sort handler
  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  }, [sortBy]);

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="slot-manager-v2">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button 
            className={`filter-toggle-btn ${!filtersCollapsed ? 'active' : ''}`}
            onClick={() => setFiltersCollapsed(!filtersCollapsed)}
            title="Toggle filters"
          >
            {filtersCollapsed ? '☰' : '✕'} Filters
            {(() => {
              const count = 
                (filters.providers?.length || 0) + 
                (filters.volatility?.length || 0) + 
                (filters.rtpMin ? 1 : 0) + 
                (filters.rtpMax ? 1 : 0);
              return count > 0 ? <span className="filter-count">{count}</span> : null;
            })()}
          </button>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search slots... (press /)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          <span className="total-badge">{totalCount.toLocaleString()} slots</span>
          <button 
            className="add-btn"
            onClick={() => {
              setInspectorSlot({});
              setIsNewSlot(true);
            }}
          >
            + Add Slot <span className="shortcut">N</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Filter Panel */}
        <FilterPanel
          providers={providers}
          filters={filters}
          onFilterChange={handleFilterChange}
          isCollapsed={filtersCollapsed}
          onToggleCollapse={() => setFiltersCollapsed(!filtersCollapsed)}
        />

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading slots...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🎰</span>
              <h3>No slots found</h3>
              <p>Try adjusting your filters or search term</p>
            </div>
          ) : (
            <table className="slot-table">
              <thead>
                <tr>
                  <th className="col-checkbox">
                    <Checkbox
                      checked={selectedIds.size === slots.length && slots.length > 0}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < slots.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="col-image">Image</th>
                  <th className="col-name" onClick={() => handleSort('name')}>
                    Name <SortIcon column="name" />
                  </th>
                  <th className="col-provider" onClick={() => handleSort('provider')}>
                    Provider <SortIcon column="provider" />
                  </th>
                  <th className="col-rtp" onClick={() => handleSort('rtp')}>
                    RTP <SortIcon column="rtp" />
                  </th>
                  <th className="col-volatility">Volatility</th>
                  <th className="col-status">Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, index) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    index={index}
                    isSelected={selectedIds.has(slot.id)}
                    onSelect={handleSelect}
                    onEdit={slot => {
                      setInspectorSlot(slot);
                      setIsNewSlot(false);
                    }}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>

        {/* Inspector Panel */}
        {(inspectorSlot || isNewSlot) && (
          <InspectorPanel
            slot={inspectorSlot}
            isNew={isNewSlot}
            providers={providers}
            onClose={() => {
              setInspectorSlot(null);
              setIsNewSlot(false);
            }}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkFeature={handleBulkFeature}
      />

      {/* Keyboard shortcuts help */}
      <div className="shortcuts-hint">
        <span><kbd>/</kbd> Search</span>
        <span><kbd>N</kbd> New</span>
        <span><kbd>Esc</kbd> Close/Clear</span>
      </div>
    </div>
  );
};

export default SlotManagerV2;
