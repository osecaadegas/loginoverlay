import { useState, useEffect } from 'react';
import './CasinoOfferModal.css';

// Deposit methods list
const DEPOSIT_METHODS = [
  { id: 'visa', name: 'Visa', icon: '💳' },
  { id: 'mastercard', name: 'Mastercard', icon: '💳' },
  { id: 'bitcoin', name: 'Bitcoin', icon: '₿' },
  { id: 'ethereum', name: 'Ethereum', icon: 'Ξ' },
  { id: 'litecoin', name: 'Litecoin', icon: 'Ł' },
  { id: 'usdt', name: 'USDT', icon: '₮' },
  { id: 'bank', name: 'Bank Transfer', icon: '🏦' },
  { id: 'skrill', name: 'Skrill', icon: '💰' },
  { id: 'neteller', name: 'Neteller', icon: '💰' },
  { id: 'paysafe', name: 'Paysafecard', icon: '💳' },
  { id: 'apple', name: 'Apple Pay', icon: '🍎' },
  { id: 'google', name: 'Google Pay', icon: '📱' },
];

/**
 * Casino Offer Modal Component
 * Isolated modal for creating/editing casino offers
 */
export default function CasinoOfferModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  editingOffer = null,
  saving = false 
}) {
  const [formData, setFormData] = useState({
    casino_name: '',
    bonus_link: '',
    title: '',
    image_url: '',
    list_image_url: '',
    badge: '',
    badge_class: '',
    min_deposit: '',
    cashback: '',
    bonus_value: '',
    free_spins: '',
    game_providers: '',
    total_games: '',
    license: '',
    welcome_bonus: '',
    details: '',
    deposit_methods: '',
    vpn_friendly: false,
    is_premium: false,
    is_active: true,
    display_order: 0
  });

  // Reset form when modal opens/closes or editing offer changes
  useEffect(() => {
    if (isOpen) {
      if (editingOffer) {
        setFormData({
          ...editingOffer,
          deposit_methods: editingOffer.deposit_methods || '',
          vpn_friendly: editingOffer.vpn_friendly || false,
          is_premium: editingOffer.is_premium || false,
          is_active: editingOffer.is_active !== false,
          display_order: editingOffer.display_order || 0
        });
      } else {
        setFormData({
          casino_name: '',
          bonus_link: '',
          title: '',
          image_url: '',
          list_image_url: '',
          badge: '',
          badge_class: '',
          min_deposit: '',
          cashback: '',
          bonus_value: '',
          free_spins: '',
          game_providers: '',
          total_games: '',
          license: '',
          welcome_bonus: '',
          details: '',
          deposit_methods: '',
          vpn_friendly: false,
          is_premium: false,
          is_active: true,
          display_order: 0
        });
      }
    }
  }, [isOpen, editingOffer]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    if (!formData.casino_name || !formData.title || !formData.image_url) {
      alert('Please fill in all required fields (Casino Name, Title, Card Image URL)');
      return;
    }
    onSave(formData);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="casino-offer-modal-overlay" onClick={handleOverlayClick}>
      <div className="casino-offer-modal">
        {/* Header */}
        <div className="casino-offer-modal-header">
          <h2>{editingOffer ? 'Edit Casino Offer' : 'Create New Casino Offer'}</h2>
          <button className="casino-offer-modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="casino-offer-modal-body">
          {/* Form Fields */}
          <div className="co-form-fields">
            <div className="co-form-row">
              <div className="co-form-group">
                <label>Casino Name *</label>
                <input
                  type="text"
                  value={formData.casino_name}
                  onChange={(e) => handleChange('casino_name', e.target.value)}
                  placeholder="e.g., Ignibet"
                />
              </div>
              <div className="co-form-group">
                <label>Bonus Link *</label>
                <input
                  type="text"
                  value={formData.bonus_link}
                  onChange={(e) => handleChange('bonus_link', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="co-form-group full">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., 665% Bonus & 750 FS up to €6250"
              />
            </div>

            <div className="co-form-group full">
              <label>Card Image URL * (for offers page cards)</label>
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => handleChange('image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="co-form-group full">
              <label>List Image URL (for landing page list)</label>
              <input
                type="text"
                value={formData.list_image_url}
                onChange={(e) => handleChange('list_image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="co-form-row">
              <div className="co-form-group">
                <label>Badge Text</label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => handleChange('badge', e.target.value)}
                  placeholder="HOT, NEW, etc."
                />
              </div>
              <div className="co-form-group">
                <label>Badge Class</label>
                <select
                  value={formData.badge_class}
                  onChange={(e) => handleChange('badge_class', e.target.value)}
                >
                  <option value="">None</option>
                  <option value="hot">Hot</option>
                  <option value="new">New</option>
                  <option value="exclusive">Exclusive</option>
                </select>
              </div>
            </div>

            <div className="co-form-row-4">
              <div className="co-form-group">
                <label>Min Deposit</label>
                <input
                  type="text"
                  value={formData.min_deposit}
                  onChange={(e) => handleChange('min_deposit', e.target.value)}
                  placeholder="20€"
                />
              </div>
              <div className="co-form-group">
                <label>Cashback</label>
                <input
                  type="text"
                  value={formData.cashback}
                  onChange={(e) => handleChange('cashback', e.target.value)}
                  placeholder="30%"
                />
              </div>
              <div className="co-form-group">
                <label>Bonus Value</label>
                <input
                  type="text"
                  value={formData.bonus_value}
                  onChange={(e) => handleChange('bonus_value', e.target.value)}
                  placeholder="665%"
                />
              </div>
              <div className="co-form-group">
                <label>Free Spins</label>
                <input
                  type="text"
                  value={formData.free_spins}
                  onChange={(e) => handleChange('free_spins', e.target.value)}
                  placeholder="Up to 750"
                />
              </div>
            </div>

            <div className="co-form-row-4">
              <div className="co-form-group">
                <label>Game Providers</label>
                <input
                  type="text"
                  value={formData.game_providers}
                  onChange={(e) => handleChange('game_providers', e.target.value)}
                  placeholder="90+"
                />
              </div>
              <div className="co-form-group">
                <label>Total Games</label>
                <input
                  type="text"
                  value={formData.total_games}
                  onChange={(e) => handleChange('total_games', e.target.value)}
                  placeholder="5000+"
                />
              </div>
              <div className="co-form-group">
                <label>License</label>
                <input
                  type="text"
                  value={formData.license}
                  onChange={(e) => handleChange('license', e.target.value)}
                  placeholder="Curaçao"
                />
              </div>
              <div className="co-form-group">
                <label>Welcome Bonus</label>
                <input
                  type="text"
                  value={formData.welcome_bonus}
                  onChange={(e) => handleChange('welcome_bonus', e.target.value)}
                  placeholder="100% up to €500"
                />
              </div>
            </div>

            <div className="co-form-group full">
              <label>Details / Terms</label>
              <textarea
                value={formData.details}
                onChange={(e) => handleChange('details', e.target.value)}
                placeholder="Wagering requirements, terms, etc."
              />
            </div>

            {/* Deposit Methods */}
            <div className="co-form-group full">
              <label>Deposit Methods</label>
              <div className="co-deposit-methods">
                {DEPOSIT_METHODS.map(method => {
                  const selectedMethods = formData.deposit_methods ? formData.deposit_methods.split(',').map(m => m.trim()) : [];
                  const isSelected = selectedMethods.includes(method.id);
                  
                  return (
                    <label key={method.id} className={`co-deposit-method ${isSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          let methods = selectedMethods.filter(m => m);
                          if (e.target.checked) {
                            methods.push(method.id);
                          } else {
                            methods = methods.filter(m => m !== method.id);
                          }
                          handleChange('deposit_methods', methods.join(','));
                        }}
                      />
                      <span className="method-icon">{method.icon}</span>
                      <span className="method-name">{method.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Options Row */}
            <div className="co-form-row">
              <div className="co-form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => handleChange('display_order', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div className="co-form-group">
                <label>Options</label>
                <div className="co-checkbox-group">
                  <label className="co-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.is_premium}
                      onChange={(e) => handleChange('is_premium', e.target.checked)}
                    />
                    <span>⭐ Premium</span>
                  </label>
                  <label className="co-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.vpn_friendly}
                      onChange={(e) => handleChange('vpn_friendly', e.target.checked)}
                    />
                    <span>✅ VPN Friendly</span>
                  </label>
                  <label className="co-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => handleChange('is_active', e.target.checked)}
                    />
                    <span>🟢 Active</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="co-preview-section">
            <div className="co-preview-header">Live Preview</div>
            <div className="co-preview-card">
              <div className="co-preview-image">
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                ) : (
                  <div className="placeholder">
                    <i className="fas fa-image"></i>
                    Preview
                  </div>
                )}
                {formData.badge && formData.badge_class && (
                  <div className={`co-preview-badge ${formData.badge_class}`}>
                    {formData.badge}
                  </div>
                )}
              </div>
              <div className="co-preview-content">
                <div className="co-preview-casino-name">
                  {formData.casino_name || 'Casino Name'}
                </div>
                <div className="co-preview-title">
                  {formData.title || 'Offer Title'}
                </div>
                <div className="co-preview-stats">
                  <div className="co-preview-stat">
                    <div className="co-preview-stat-label">Min Deposit</div>
                    <div className="co-preview-stat-value">{formData.min_deposit || '-'}</div>
                  </div>
                  <div className="co-preview-stat">
                    <div className="co-preview-stat-label">Cashback</div>
                    <div className="co-preview-stat-value">{formData.cashback || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="casino-offer-modal-footer">
          {editingOffer && onDelete && (
            <button className="co-btn co-btn-delete" onClick={() => onDelete(editingOffer.id)}>
              <i className="fas fa-trash"></i>
              Delete
            </button>
          )}
          <button className="co-btn co-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="co-btn co-btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-check"></i>
                {editingOffer ? 'Update Offer' : 'Create Offer'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
