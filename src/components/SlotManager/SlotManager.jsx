import { useState, useEffect } from 'react';
import { getAllSlots, addSlot, updateSlot, deleteSlot, getAllProviders, DEFAULT_SLOT_IMAGE } from '../../utils/slotUtils';
import './SlotManager.css';

const SlotManager = () => {
  const [slots, setSlots] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    image: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Load slots and providers
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [slotsData, providersData] = await Promise.all([
        getAllSlots(),
        getAllProviders()
      ]);
      setSlots(slotsData);
      setProviders(providersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter slots
  const filteredSlots = slots.filter(slot => {
    const matchesSearch = slot.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvider = selectedProvider === 'all' || slot.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.name || !formData.provider || !formData.image) {
      setFormError('All fields are required');
      return;
    }

    try {
      let result;
      if (editingSlot) {
        result = await updateSlot(editingSlot.id, formData);
      } else {
        result = await addSlot(formData);
      }

      if (result.success) {
        setFormSuccess(editingSlot ? 'Slot updated successfully!' : 'Slot added successfully!');
        setFormData({ name: '', provider: '', image: '' });
        setEditingSlot(null);
        setShowForm(false);
        await loadData();
        setTimeout(() => setFormSuccess(''), 3000);
      } else {
        setFormError(result.error || 'An error occurred');
      }
    } catch (error) {
      setFormError('An error occurred: ' + error.message);
    }
  };

  // Handle edit
  const handleEdit = (slot) => {
    setEditingSlot(slot);
    setFormData({
      name: slot.name,
      provider: slot.provider,
      image: slot.image
    });
    setShowForm(true);
    setFormError('');
    setFormSuccess('');
  };

  // Handle delete
  const handleDelete = async (slotId, slotName) => {
    if (!confirm(`Are you sure you want to delete "${slotName}"?`)) {
      return;
    }

    try {
      const result = await deleteSlot(slotId);
      if (result.success) {
        setFormSuccess('Slot deleted successfully!');
        await loadData();
        setTimeout(() => setFormSuccess(''), 3000);
      } else {
        setFormError(result.error || 'Error deleting slot');
      }
    } catch (error) {
      setFormError('Error deleting slot: ' + error.message);
    }
  };

  // Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingSlot(null);
    setFormData({ name: '', provider: '', image: '' });
    setFormError('');
    setFormSuccess('');
  };

  if (loading) {
    return <div className="slot-manager-loading">Loading slots...</div>;
  }

  return (
    <div className="slot-manager">
      {/* Compact Header with Inline Actions */}
      <div className="slot-manager-header">
        <div className="header-left">
          <h2>🎰 Slot Database</h2>
          <span className="total-count">{slots.length} total</span>
        </div>
        <button 
          className={`add-slot-btn ${showForm ? 'active' : ''}`}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕' : '+'} {showForm ? 'Close' : 'Add Slot'}
        </button>
      </div>

      {/* Notifications */}
      {formSuccess && <div className="notification success">{formSuccess}</div>}
      {formError && <div className="notification error">{formError}</div>}

      {/* Compact Inline Form */}
      {showForm && (
        <div className="slot-form-inline">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-col">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Slot Name"
                  required
                />
              </div>
              <div className="form-col">
                <input
                  type="text"
                  list="providers-list"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="Provider"
                  required
                />
                <datalist id="providers-list">
                  {providers.map(provider => (
                    <option key={provider} value={provider} />
                  ))}
                </datalist>
              </div>
              <div className="form-col form-col-wide">
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="Image URL"
                  required
                />
              </div>
              <div className="form-col-actions">
                {formData.image && (
                  <div className="mini-preview">
                    <img src={formData.image} alt="Preview" onError={(e) => e.target.src = DEFAULT_SLOT_IMAGE} />
                  </div>
                )}
                <button type="submit" className="btn-submit">
                  {editingSlot ? '💾 Update' : '✓ Add'}
                </button>
                <button type="button" className="btn-cancel-mini" onClick={handleCancel}>
                  ✕
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Compact Filters Bar */}
      <div className="filters-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search slots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-compact"
          />
        </div>
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="provider-filter-compact"
        >
          <option value="all">All Providers ({providers.length})</option>
          {providers.map(provider => (
            <option key={provider} value={provider}>{provider}</option>
          ))}
        </select>
        <span className="results-badge">
          {filteredSlots.length} results
        </span>
      </div>

      {/* Compact Grid List */}
      <div className="slots-grid-compact">
        {filteredSlots.map(slot => (
          <div key={slot.id} className="slot-card">
            <div className="slot-card-image">
              <img src={slot.image} alt={slot.name} />
              <div className="slot-card-overlay">
                <button
                  className="action-btn edit-btn"
                  onClick={() => handleEdit(slot)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDelete(slot.id, slot.name)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="slot-card-info">
              <h4 title={slot.name}>{slot.name}</h4>
              <span className="provider-tag">{slot.provider}</span>
            </div>
          </div>
        ))}
        {filteredSlots.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🎰</span>
            <p>No slots found</p>
            <small>Try adjusting your filters</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotManager;
