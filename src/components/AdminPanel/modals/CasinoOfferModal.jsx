import { useState, useEffect } from 'react';
import { ConfirmButton } from '../components';
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

const EMPTY_FORM = {
  casino_name: '',
  bonus_link: '',
  title: '',
  image_url: '',
  list_image_url: '',
  badge: '',
  badge_class: '',
  min_deposit: '',
  max_withdrawal: '',
  withdrawal_time: '',
  cashback: '',
  bonus_value: '',
  free_spins: '',
  game_providers: '',
  total_games: '',
  license: '',
  welcome_bonus: '',
  languages: '',
  established: '',
  live_support: '',
  details: '',
  deposit_methods: '',
  video_url: '',
  promo_code: '',
  crypto_friendly: true,
  vpn_friendly: false,
  is_premium: false,
  is_active: true,
  display_order: 0
};

export default function CasinoOfferModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  editingOffer = null,
  saving = false 
}) {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (isOpen) {
      if (editingOffer) {
        setFormData({
          ...EMPTY_FORM,
          ...editingOffer,
          deposit_methods: editingOffer.deposit_methods || '',
          video_url: editingOffer.video_url || '',
          promo_code: editingOffer.promo_code || '',
          max_withdrawal: editingOffer.max_withdrawal || '',
          withdrawal_time: editingOffer.withdrawal_time || '',
          languages: editingOffer.languages || '',
          established: editingOffer.established || '',
          live_support: editingOffer.live_support || '',
          crypto_friendly: editingOffer.crypto_friendly ?? true,
          vpn_friendly: editingOffer.vpn_friendly || false,
          is_premium: editingOffer.is_premium || false,
          is_active: editingOffer.is_active !== false,
          display_order: editingOffer.display_order || 0
        });
      } else {
        setFormData({ ...EMPTY_FORM });
      }
    }
  }, [isOpen, editingOffer]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.casino_name || !formData.title || !formData.image_url) {
      alert('Please fill in all required fields (Casino Name, Title, Card Image URL)');
      return;
    }
    onSave(formData);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`co-panel-backdrop ${isOpen ? 'open' : ''}`} onClick={handleBackdropClick}>
      <div className="co-panel">
        {/* Header */}
        <div className="co-panel-header">
          <h2>{editingOffer ? 'Edit Offer' : 'New Offer'}</h2>
          <button className="co-panel-close" onClick={onClose}>✕</button>
        </div>

        {/* Scrollable Body */}
        <div className="co-panel-body">

          {/* Basic Info */}
          <div className="co-section">
            <div className="co-section-title">Basic Info</div>
            <div className="co-row">
              <div className="co-field">
                <label>Casino Name *</label>
                <input type="text" value={formData.casino_name} onChange={e => handleChange('casino_name', e.target.value)} placeholder="e.g., Megarich" />
              </div>
              <div className="co-field">
                <label>Display Order</label>
                <input type="number" value={formData.display_order} onChange={e => handleChange('display_order', parseInt(e.target.value) || 0)} min="0" />
              </div>
            </div>
            <div className="co-field">
              <label>Title / Headline *</label>
              <input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} placeholder="e.g., 665% Bonus & 750 FS up to €6250" />
            </div>
            <div className="co-field">
              <label>Bonus Link *</label>
              <input type="text" value={formData.bonus_link} onChange={e => handleChange('bonus_link', e.target.value)} placeholder="https://..." />
            </div>
          </div>

          {/* Media */}
          <div className="co-section">
            <div className="co-section-title">Media</div>
            <div className="co-field">
              <label>Card Image URL *</label>
              <input type="text" value={formData.image_url} onChange={e => handleChange('image_url', e.target.value)} placeholder="https://..." />
              {formData.image_url && (
                <div className="co-image-preview">
                  <img src={formData.image_url} alt="Preview" onError={e => e.target.style.display='none'} />
                </div>
              )}
            </div>
            <div className="co-field">
              <label>List Image URL (landing page)</label>
              <input type="text" value={formData.list_image_url} onChange={e => handleChange('list_image_url', e.target.value)} placeholder="https://..." />
            </div>
            <div className="co-field">
              <label>Video URL (.mp4)</label>
              <input type="text" value={formData.video_url} onChange={e => handleChange('video_url', e.target.value)} placeholder="https://example.com/promo.mp4" />
            </div>
          </div>

          {/* Badge */}
          <div className="co-section">
            <div className="co-section-title">Badge</div>
            <div className="co-row">
              <div className="co-field">
                <label>Badge Text</label>
                <input type="text" value={formData.badge} onChange={e => handleChange('badge', e.target.value)} placeholder="HOT, NEW, etc." />
              </div>
              <div className="co-field">
                <label>Badge Style</label>
                <select value={formData.badge_class} onChange={e => handleChange('badge_class', e.target.value)}>
                  <option value="">None</option>
                  <option value="hot">🔴 Hot</option>
                  <option value="new">🟢 New</option>
                  <option value="exclusive">🟣 Exclusive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bonus Stats */}
          <div className="co-section">
            <div className="co-section-title">Bonus Stats</div>
            <div className="co-grid-4">
              <div className="co-field">
                <label>Min Deposit</label>
                <input type="text" value={formData.min_deposit} onChange={e => handleChange('min_deposit', e.target.value)} placeholder="20€" />
              </div>
              <div className="co-field">
                <label>Cashback</label>
                <input type="text" value={formData.cashback} onChange={e => handleChange('cashback', e.target.value)} placeholder="30%" />
              </div>
              <div className="co-field">
                <label>Bonus Value</label>
                <input type="text" value={formData.bonus_value} onChange={e => handleChange('bonus_value', e.target.value)} placeholder="665%" />
              </div>
              <div className="co-field">
                <label>Free Spins</label>
                <input type="text" value={formData.free_spins} onChange={e => handleChange('free_spins', e.target.value)} placeholder="Up to 750" />
              </div>
            </div>
            <div className="co-row">
              <div className="co-field">
                <label>Welcome Bonus</label>
                <input type="text" value={formData.welcome_bonus} onChange={e => handleChange('welcome_bonus', e.target.value)} placeholder="100% up to €500" />
              </div>
              <div className="co-field">
                <label>Promo Code</label>
                <input type="text" value={formData.promo_code} onChange={e => handleChange('promo_code', e.target.value)} placeholder="SECA100" />
              </div>
            </div>
          </div>

          {/* Casino Details */}
          <div className="co-section">
            <div className="co-section-title">Casino Details</div>
            <div className="co-grid-4">
              <div className="co-field">
                <label>Max Withdrawal</label>
                <input type="text" value={formData.max_withdrawal} onChange={e => handleChange('max_withdrawal', e.target.value)} placeholder="€5,000/week" />
              </div>
              <div className="co-field">
                <label>Withdrawal Time</label>
                <input type="text" value={formData.withdrawal_time} onChange={e => handleChange('withdrawal_time', e.target.value)} placeholder="Up to 24h" />
              </div>
              <div className="co-field">
                <label>Live Support</label>
                <input type="text" value={formData.live_support} onChange={e => handleChange('live_support', e.target.value)} placeholder="24/7" />
              </div>
              <div className="co-field">
                <label>Established</label>
                <input type="text" value={formData.established} onChange={e => handleChange('established', e.target.value)} placeholder="2024" />
              </div>
            </div>
            <div className="co-row">
              <div className="co-field">
                <label>License</label>
                <input type="text" value={formData.license} onChange={e => handleChange('license', e.target.value)} placeholder="Curaçao" />
              </div>
              <div className="co-field">
                <label>Languages</label>
                <input type="text" value={formData.languages} onChange={e => handleChange('languages', e.target.value)} placeholder="English, Portuguese" />
              </div>
            </div>
            <div className="co-row">
              <div className="co-field">
                <label>Game Providers</label>
                <input type="text" value={formData.game_providers} onChange={e => handleChange('game_providers', e.target.value)} placeholder="90+" />
              </div>
              <div className="co-field">
                <label>Total Games</label>
                <input type="text" value={formData.total_games} onChange={e => handleChange('total_games', e.target.value)} placeholder="5000+" />
              </div>
            </div>
          </div>

          {/* Details / Terms */}
          <div className="co-section">
            <div className="co-section-title">Details / Terms</div>
            <div className="co-field">
              <textarea value={formData.details} onChange={e => handleChange('details', e.target.value)} placeholder="Wagering requirements, terms, etc." rows={4} />
            </div>
          </div>

          {/* Deposit Methods */}
          <div className="co-section">
            <div className="co-section-title">Deposit Methods</div>
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
                        if (e.target.checked) methods.push(method.id);
                        else methods = methods.filter(m => m !== method.id);
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

          {/* Options / Toggles */}
          <div className="co-section">
            <div className="co-section-title">Options</div>
            <div className="co-toggles">
              <label className="co-toggle">
                <input type="checkbox" checked={formData.is_active} onChange={e => handleChange('is_active', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">🟢 Active</span>
              </label>
              <label className="co-toggle">
                <input type="checkbox" checked={formData.is_premium} onChange={e => handleChange('is_premium', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">⭐ Premium</span>
              </label>
              <label className="co-toggle">
                <input type="checkbox" checked={formData.vpn_friendly} onChange={e => handleChange('vpn_friendly', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">🛡️ VPN Friendly</span>
              </label>
              <label className="co-toggle">
                <input type="checkbox" checked={formData.crypto_friendly} onChange={e => handleChange('crypto_friendly', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">₿ Crypto Friendly</span>
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="co-panel-footer">
          {editingOffer && onDelete && (
            <ConfirmButton
              onConfirm={() => onDelete(editingOffer.id)}
              confirmText="Delete?"
              className="co-btn co-btn-delete"
              variant="danger"
            >
              <i className="fas fa-trash"></i> Delete
            </ConfirmButton>
          )}
          <div className="co-footer-right">
            <button className="co-btn co-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="co-btn co-btn-save" onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Saving...</>
              ) : (
                <><i className="fas fa-check"></i> {editingOffer ? 'Update' : 'Create'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}