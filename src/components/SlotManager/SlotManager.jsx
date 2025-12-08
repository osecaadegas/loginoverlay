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
      <div className="slot-manager-header">
        <h2>🎰 Slot Manager</h2>
        <button 
          className="add-slot-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ Add New Slot'}
        </button>
      </div>

      {formSuccess && (
        <div className="form-success">{formSuccess}</div>
      )}

      {showForm && (
        <div className="slot-form-container">
          <h3>{editingSlot ? 'Edit Slot' : 'Add New Slot'}</h3>
          {formError && <div className="form-error">{formError}</div>}
          
          <form onSubmit={handleSubmit} className="slot-form">
            <div className="form-group">
              <label>Slot Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Wanted Dead or Wild"
                required
              />
            </div>

            <div className="form-group">
              <label>Provider *</label>
              <input
                type="text"
                list="providers-list"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="e.g., Hacksaw"
                required
              />
              <datalist id="providers-list">
                {providers.map(provider => (
                  <option key={provider} value={provider} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label>Image URL *</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
                required
              />
              {formData.image && (
                <div className="image-preview">
                  <img src={formData.image} alt="Preview" onError={(e) => e.target.src = DEFAULT_SLOT_IMAGE} />
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingSlot ? 'Update Slot' : 'Add Slot'}
              </button>
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="slot-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search slots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="provider-filter"
          >
            <option value="all">All Providers</option>
            {providers.map(provider => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
        </div>
        <div className="filter-stats">
          Showing {filteredSlots.length} of {slots.length} slots
        </div>
      </div>

      <div className="slots-list">
        {filteredSlots.map(slot => (
          <div key={slot.id} className="slot-item">
            <div className="slot-image">
              <img src={slot.image} alt={slot.name} />
            </div>
            <div className="slot-info">
              <h4>{slot.name}</h4>
              <p className="slot-provider">{slot.provider}</p>
            </div>
            <div className="slot-actions">
              <button
                className="btn-edit"
                onClick={() => handleEdit(slot)}
                title="Edit slot"
              >
                ✏️
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDelete(slot.id, slot.name)}
                title="Delete slot"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        {filteredSlots.length === 0 && (
          <div className="no-slots">
            No slots found matching your filters
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotManager;
