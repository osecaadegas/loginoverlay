import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { GAME_PROVIDERS, getProviderImage, getProviderName } from '../../utils/gameProviders';
import { getMethodIcons } from '../../utils/depositMethods';
import './CasinoOffersManager.css';

export default function CasinoOffersManager() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    casino_name: '',
    title: '',
    image_url: '',
    bonus_link: '',
    badge: '',
    badge_class: '',
    min_deposit: '',
    cashback: '',
    bonus_value: '',
    free_spins: '',
    is_premium: false,
    is_active: true,
    display_order: 0,
    details: '',
    // New fields
    game_providers: [],
    total_games: '',
    license: '',
    deposit_methods: '',
    vpn_friendly: false,
    max_withdrawal: '',
    withdrawal_time: '',
    crypto_friendly: true,
    live_support: '24/7',
    established: '',
    languages: 'English',
    highlights: ['', '', ''],
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('casino_offers')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setOffers(data || []);
    } catch (err) {
      console.error('Error loading offers:', err);
      setMessage({ type: 'error', text: 'Failed to load offers' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      casino_name: '',
      title: '',
      image_url: '',
      bonus_link: '',
      badge: '',
      badge_class: '',
      min_deposit: '',
      cashback: '',
      bonus_value: '',
      free_spins: '',
      is_premium: false,
      is_active: true,
      display_order: 0,
      details: '',
      game_providers: [],
      total_games: '',
      license: '',
      deposit_methods: '',
      vpn_friendly: false,
      max_withdrawal: '',
      withdrawal_time: '',
      crypto_friendly: true,
      live_support: '24/7',
      established: '',
      languages: 'English',
      highlights: ['', '', ''],
    });
    setEditingOffer(null);
    setIsCreating(false);
  };

  const handleEdit = (offer) => {
    setFormData({
      casino_name: offer.casino_name || '',
      title: offer.title || '',
      image_url: offer.image_url || '',
      bonus_link: offer.bonus_link || '',
      badge: offer.badge || '',
      badge_class: offer.badge_class || '',
      min_deposit: offer.min_deposit || '',
      cashback: offer.cashback || '',
      bonus_value: offer.bonus_value || '',
      free_spins: offer.free_spins || '',
      is_premium: offer.is_premium || false,
      is_active: offer.is_active ?? true,
      display_order: offer.display_order || 0,
      details: offer.details || '',
      game_providers: offer.game_providers || [],
      total_games: offer.total_games || '',
      license: offer.license || '',
      deposit_methods: typeof offer.deposit_methods === 'string' 
        ? offer.deposit_methods 
        : (offer.deposit_methods || []).join(', '),
      vpn_friendly: offer.vpn_friendly || false,
      max_withdrawal: offer.max_withdrawal || '',
      withdrawal_time: offer.withdrawal_time || '',
      crypto_friendly: offer.crypto_friendly ?? true,
      live_support: offer.live_support || '24/7',
      established: offer.established || '',
      languages: offer.languages || 'English',
      highlights: offer.highlights || ['', '', ''],
    });
    setEditingOffer(offer);
    setIsCreating(false);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const dataToSave = {
        ...formData,
        highlights: formData.highlights.filter(h => h.trim() !== ''),
      };

      if (editingOffer) {
        // Update existing
        const { error } = await supabase
          .from('casino_offers')
          .update(dataToSave)
          .eq('id', editingOffer.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Offer updated successfully!' });
      } else {
        // Create new
        const { error } = await supabase
          .from('casino_offers')
          .insert([dataToSave]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Offer created successfully!' });
      }

      await loadOffers();
      resetForm();
    } catch (err) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save offer' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (offerId) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    try {
      const { error } = await supabase
        .from('casino_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Offer deleted!' });
      await loadOffers();
    } catch (err) {
      console.error('Delete error:', err);
      setMessage({ type: 'error', text: 'Failed to delete offer' });
    }
  };

  const toggleProvider = (providerId) => {
    setFormData(prev => {
      const current = prev.game_providers || [];
      if (current.includes(providerId)) {
        return { ...prev, game_providers: current.filter(p => p !== providerId) };
      } else {
        return { ...prev, game_providers: [...current, providerId] };
      }
    });
  };

  const updateHighlight = (index, value) => {
    setFormData(prev => {
      const newHighlights = [...(prev.highlights || ['', '', ''])];
      newHighlights[index] = value;
      return { ...prev, highlights: newHighlights };
    });
  };

  if (loading) {
    return (
      <div className="casino-manager">
        <div className="loading">Loading casino offers...</div>
      </div>
    );
  }

  return (
    <div className="casino-manager">
      <div className="manager-header">
        <h1>🎰 Casino Offers Manager</h1>
        <button className="btn-create" onClick={handleCreate}>
          + Add New Offer
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* Edit/Create Form */}
      {(editingOffer || isCreating) && (
        <div className="edit-form">
          <div className="form-header">
            <h2>{editingOffer ? `Edit: ${editingOffer.casino_name}` : 'Create New Offer'}</h2>
            <button className="btn-close" onClick={resetForm}>×</button>
          </div>

          <div className="form-grid">
            {/* Basic Info Section */}
            <div className="form-section">
              <h3>Basic Information</h3>
              
              <div className="form-row">
                <label>Casino Name *</label>
                <input
                  type="text"
                  value={formData.casino_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, casino_name: e.target.value }))}
                  placeholder="e.g., Betovo"
                />
              </div>

              <div className="form-row">
                <label>Title/Bonus Description *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., 100% up to €500 + 200 Free Spins"
                />
              </div>

              <div className="form-row">
                <label>Logo Image URL *</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://... or /images/..."
                />
                {formData.image_url && (
                  <img src={formData.image_url} alt="Preview" className="image-preview" />
                )}
              </div>

              <div className="form-row">
                <label>Bonus Link *</label>
                <input
                  type="text"
                  value={formData.bonus_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonus_link: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="form-row-double">
                <div className="form-row">
                  <label>Bonus Value</label>
                  <input
                    type="text"
                    value={formData.bonus_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, bonus_value: e.target.value }))}
                    placeholder="e.g., 100% or €500"
                  />
                </div>
                <div className="form-row">
                  <label>Free Spins</label>
                  <input
                    type="text"
                    value={formData.free_spins}
                    onChange={(e) => setFormData(prev => ({ ...prev, free_spins: e.target.value }))}
                    placeholder="e.g., 200"
                  />
                </div>
              </div>

              <div className="form-row-double">
                <div className="form-row">
                  <label>Cashback</label>
                  <input
                    type="text"
                    value={formData.cashback}
                    onChange={(e) => setFormData(prev => ({ ...prev, cashback: e.target.value }))}
                    placeholder="e.g., 20%"
                  />
                </div>
                <div className="form-row">
                  <label>Min Deposit</label>
                  <input
                    type="text"
                    value={formData.min_deposit}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_deposit: e.target.value }))}
                    placeholder="e.g., €20"
                  />
                </div>
              </div>

              <div className="form-row-double">
                <div className="form-row">
                  <label>Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="form-row checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_premium}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_premium: e.target.checked }))}
                    />
                    Premium Partner
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>

            {/* Extended Info Section */}
            <div className="form-section">
              <h3>Casino Details (for Info Modal)</h3>

              <div className="form-row-double">
                <div className="form-row">
                  <label>Max Withdrawal</label>
                  <input
                    type="text"
                    value={formData.max_withdrawal}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_withdrawal: e.target.value }))}
                    placeholder="e.g., €5,000 per week"
                  />
                </div>
                <div className="form-row">
                  <label>Withdrawal Time</label>
                  <input
                    type="text"
                    value={formData.withdrawal_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, withdrawal_time: e.target.value }))}
                    placeholder="e.g., Up to 24h"
                  />
                </div>
              </div>

              <div className="form-row-double">
                <div className="form-row">
                  <label>License</label>
                  <input
                    type="text"
                    value={formData.license}
                    onChange={(e) => setFormData(prev => ({ ...prev, license: e.target.value }))}
                    placeholder="e.g., Curaçao, Malta MGA"
                  />
                </div>
                <div className="form-row">
                  <label>Established Year</label>
                  <input
                    type="text"
                    value={formData.established}
                    onChange={(e) => setFormData(prev => ({ ...prev, established: e.target.value }))}
                    placeholder="e.g., 2024"
                  />
                </div>
              </div>

              <div className="form-row-double">
                <div className="form-row">
                  <label>Live Support</label>
                  <input
                    type="text"
                    value={formData.live_support}
                    onChange={(e) => setFormData(prev => ({ ...prev, live_support: e.target.value }))}
                    placeholder="e.g., 24/7"
                  />
                </div>
                <div className="form-row">
                  <label>Languages</label>
                  <input
                    type="text"
                    value={formData.languages}
                    onChange={(e) => setFormData(prev => ({ ...prev, languages: e.target.value }))}
                    placeholder="e.g., English, German, Spanish"
                  />
                </div>
              </div>

              <div className="form-row-double">
                <div className="form-row">
                  <label>Total Games</label>
                  <input
                    type="text"
                    value={formData.total_games}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_games: e.target.value }))}
                    placeholder="e.g., 15000+"
                  />
                </div>
                <div className="form-row checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.crypto_friendly}
                      onChange={(e) => setFormData(prev => ({ ...prev, crypto_friendly: e.target.checked }))}
                    />
                    Crypto Friendly
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.vpn_friendly}
                      onChange={(e) => setFormData(prev => ({ ...prev, vpn_friendly: e.target.checked }))}
                    />
                    VPN Friendly
                  </label>
                </div>
              </div>

              <div className="form-row">
                <label>Deposit Methods (comma separated)</label>
                <textarea
                  value={formData.deposit_methods}
                  onChange={(e) => setFormData(prev => ({ ...prev, deposit_methods: e.target.value }))}
                  placeholder="Bitcoin, Visa, Mastercard, Skrill, Neteller, Bank Transfer..."
                  rows={2}
                />
              </div>

              <div className="form-row">
                <label>Highlights (shown in offer row, up to 3)</label>
                <div className="highlights-inputs">
                  {[0, 1, 2].map(idx => (
                    <input
                      key={idx}
                      type="text"
                      value={(formData.highlights || ['', '', ''])[idx] || ''}
                      onChange={(e) => updateHighlight(idx, e.target.value)}
                      placeholder={`Highlight ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Game Providers Section */}
            <div className="form-section full-width">
              <h3>Game Providers</h3>
              <p className="section-hint">Select the game providers available at this casino</p>
              
              <div className="providers-grid">
                {GAME_PROVIDERS.map(provider => {
                  const isSelected = (formData.game_providers || []).includes(provider.id);
                  return (
                    <div
                      key={provider.id}
                      className={`provider-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleProvider(provider.id)}
                    >
                      <img 
                        src={provider.image} 
                        alt={provider.name}
                        onError={(e) => e.target.src = '/providers/default.png'}
                      />
                      <span>{provider.name}</span>
                      {isSelected && <span className="check">✓</span>}
                    </div>
                  );
                })}
              </div>

              <p className="selected-count">
                {(formData.game_providers || []).length} providers selected
              </p>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-cancel" onClick={resetForm}>Cancel</button>
            <button 
              className="btn-save" 
              onClick={handleSave}
              disabled={saving || !formData.casino_name || !formData.title || !formData.image_url || !formData.bonus_link}
            >
              {saving ? 'Saving...' : (editingOffer ? 'Update Offer' : 'Create Offer')}
            </button>
          </div>
        </div>
      )}

      {/* Offers List */}
      <div className="offers-list">
        <h2>All Offers ({offers.length})</h2>
        
        {offers.length === 0 ? (
          <div className="no-offers">No offers yet. Click "Add New Offer" to create one.</div>
        ) : (
          <div className="offers-table">
            <div className="table-header">
              <span>Order</span>
              <span>Casino</span>
              <span>Bonus</span>
              <span>Providers</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            
            {offers.map(offer => (
              <div key={offer.id} className={`table-row ${!offer.is_active ? 'inactive' : ''}`}>
                <span className="order">{offer.display_order}</span>
                <span className="casino">
                  <img src={offer.image_url} alt={offer.casino_name} />
                  <div>
                    <strong>{offer.casino_name}</strong>
                    {offer.is_premium && <span className="premium-tag">Premium</span>}
                  </div>
                </span>
                <span className="bonus">
                  {offer.bonus_value && <div>{offer.bonus_value}</div>}
                  {offer.free_spins && <div className="free-spins">{offer.free_spins} FS</div>}
                </span>
                <span className="providers">
                  {(offer.game_providers || []).length > 0 ? (
                    <div className="provider-badges">
                      {(offer.game_providers || []).slice(0, 3).map(p => (
                        <img 
                          key={p} 
                          src={getProviderImage(p)} 
                          alt={getProviderName(p)}
                          title={getProviderName(p)}
                        />
                      ))}
                      {(offer.game_providers || []).length > 3 && (
                        <span className="more">+{(offer.game_providers || []).length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-providers">Not set</span>
                  )}
                </span>
                <span className="status">
                  <span className={`status-badge ${offer.is_active ? 'active' : 'inactive'}`}>
                    {offer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </span>
                <span className="actions">
                  <button className="btn-edit" onClick={() => handleEdit(offer)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(offer.id)}>Delete</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
