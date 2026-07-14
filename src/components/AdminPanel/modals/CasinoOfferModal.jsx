import { useState, useEffect } from 'react';
import { ConfirmButton } from '../components';
import { GAME_PROVIDERS } from '../../../utils/gameProviders';
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

const PARTNERSHIP_CATEGORIES = [
  { value: 'casino', label: 'Casino' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'streaming_tools', label: 'Streaming Tools' },
  { value: 'creator_services', label: 'Creator Services' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'registered', label: 'Registered users only' },
  { value: 'premium', label: 'Premium streamers only' },
  { value: 'admin', label: 'Admin only' },
  { value: 'hidden', label: 'Hidden' },
];

const DEAL_MODELS = ['CPA', 'Revenue Share', 'Hybrid', 'Sponsorship', 'Affiliate', 'Fixed Fee'];
const PLATFORM_OPTIONS = ['Twitch', 'Kick', 'YouTube', 'TikTok', 'Website', 'Social Media'];

const listToText = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.join('\n');
    } catch {
      return value;
    }
  }
  return '';
};

const textToList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  return String(value)
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean);
};

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidUrl = (value) => !value || /^https?:\/\//i.test(value);

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
  game_providers: '[]',
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
  display_order: 0,
  landing_tag: '',
  landing_tag_color: '',
  landing_model: '',
  landing_badges: '',
  landing_accent_color: '',
  landing_logo_bg: '',
  slug: '',
  partner_logo_url: '',
  cover_image_url: '',
  partnership_category: 'casino',
  short_description: '',
  is_verified: true,
  is_featured: false,
  is_exclusive: false,
  is_new: false,
  is_hot: false,
  has_direct_manager: false,
  streamer_balance_available: false,
  application_status: 'open',
  applications_close_at: '',
  application_url: '',
  terms_url: '',
  visibility: 'public',
  deal_model: 'Affiliate',
  cpa_amount: '',
  cpa_currency: 'EUR',
  revenue_share_percent: '',
  fixed_fee_amount: '',
  fixed_fee_currency: 'EUR',
  hybrid_terms: '',
  min_ftd_requirement: '',
  minimum_deposit: '',
  minimum_deposit_currency: 'EUR',
  cookie_duration_days: '',
  payment_frequency: '',
  payment_methods: '',
  player_promotion: '',
  traffic_requirements: '',
  restrictions: '',
  supported_geos: '',
  supported_platforms: PLATFORM_OPTIONS.slice(0, 3).join('\n'),
  public_notes: '',
  private_notes: '',
  last_updated_at: '',
  archived_at: '',
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
  const [providerSearch, setProviderSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProviderSearch('');
      if (editingOffer) {
        // Parse game_providers — could be JSON array string or plain string
        let parsedProviders = '[]';
        if (editingOffer.game_providers) {
          if (typeof editingOffer.game_providers === 'string') {
            try {
              const parsed = JSON.parse(editingOffer.game_providers);
              parsedProviders = Array.isArray(parsed) ? JSON.stringify(parsed) : '[]';
            } catch {
              parsedProviders = '[]';
            }
          } else if (Array.isArray(editingOffer.game_providers)) {
            parsedProviders = JSON.stringify(editingOffer.game_providers);
          }
        }
        setFormData({
          ...EMPTY_FORM,
          ...editingOffer,
          game_providers: parsedProviders,
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
          display_order: editingOffer.display_order || 0,
          landing_tag: editingOffer.landing_tag || '',
          landing_tag_color: editingOffer.landing_tag_color || '',
          landing_model: editingOffer.landing_model || '',
          landing_badges: Array.isArray(editingOffer.landing_badges)
            ? editingOffer.landing_badges.join('\n')
            : (editingOffer.landing_badges || ''),
          landing_accent_color: editingOffer.landing_accent_color || '',
          landing_logo_bg: editingOffer.landing_logo_bg || '',
          slug: editingOffer.slug || '',
          partner_logo_url: editingOffer.partner_logo_url || '',
          cover_image_url: editingOffer.cover_image_url || '',
          partnership_category: editingOffer.partnership_category || 'casino',
          short_description: editingOffer.short_description || '',
          is_verified: editingOffer.is_verified !== false,
          is_featured: editingOffer.is_featured || false,
          is_exclusive: editingOffer.is_exclusive || false,
          is_new: editingOffer.is_new || false,
          is_hot: editingOffer.is_hot || false,
          has_direct_manager: editingOffer.has_direct_manager || false,
          streamer_balance_available: editingOffer.streamer_balance_available || false,
          application_status: editingOffer.application_status || 'open',
          applications_close_at: editingOffer.applications_close_at || '',
          application_url: editingOffer.application_url || '',
          terms_url: editingOffer.terms_url || '',
          visibility: editingOffer.visibility || (editingOffer.is_premium ? 'premium' : 'public'),
          deal_model: editingOffer.deal_model || editingOffer.landing_model || 'Affiliate',
          cpa_amount: editingOffer.cpa_amount ?? '',
          cpa_currency: editingOffer.cpa_currency || 'EUR',
          revenue_share_percent: editingOffer.revenue_share_percent ?? '',
          fixed_fee_amount: editingOffer.fixed_fee_amount ?? '',
          fixed_fee_currency: editingOffer.fixed_fee_currency || 'EUR',
          hybrid_terms: editingOffer.hybrid_terms || '',
          min_ftd_requirement: editingOffer.min_ftd_requirement ?? '',
          minimum_deposit: editingOffer.minimum_deposit ?? '',
          minimum_deposit_currency: editingOffer.minimum_deposit_currency || 'EUR',
          cookie_duration_days: editingOffer.cookie_duration_days ?? '',
          payment_frequency: editingOffer.payment_frequency || '',
          payment_methods: listToText(editingOffer.payment_methods),
          player_promotion: editingOffer.player_promotion || '',
          traffic_requirements: editingOffer.traffic_requirements || '',
          restrictions: editingOffer.restrictions || '',
          supported_geos: listToText(editingOffer.supported_geos),
          supported_platforms: listToText(editingOffer.supported_platforms) || PLATFORM_OPTIONS.slice(0, 3).join('\n'),
          public_notes: editingOffer.public_notes || '',
          private_notes: editingOffer.private_notes || '',
          last_updated_at: editingOffer.last_updated_at ? editingOffer.last_updated_at.slice(0, 10) : '',
          archived_at: editingOffer.archived_at || '',
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
    if (!formData.casino_name || !formData.title || (!formData.image_url && !formData.cover_image_url)) {
      alert('Please fill in all required fields (Partner Name, Title, and at least one image URL)');
      return;
    }

    if (formData.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
      alert('Slug must use lowercase letters, numbers and single hyphens only.');
      return;
    }

    const urlFields = [
      ['Bonus Link', formData.bonus_link],
      ['Card Image URL', formData.image_url],
      ['List Image URL', formData.list_image_url],
      ['Logo URL', formData.partner_logo_url],
      ['Cover Image URL', formData.cover_image_url],
      ['Application URL', formData.application_url],
      ['Terms URL', formData.terms_url],
      ['Video URL', formData.video_url],
    ];
    const invalidUrl = urlFields.find(([, value]) => !isValidUrl(value));
    if (invalidUrl) {
      alert(`${invalidUrl[0]} must start with http:// or https://`);
      return;
    }

    const percentage = toNumberOrNull(formData.revenue_share_percent);
    if (percentage !== null && (percentage < 0 || percentage > 100)) {
      alert('Revenue share percentage must be between 0 and 100.');
      return;
    }

    const numericFields = [
      ['CPA amount', formData.cpa_amount],
      ['Fixed fee', formData.fixed_fee_amount],
      ['Minimum deposit', formData.minimum_deposit],
      ['Minimum FTD requirement', formData.min_ftd_requirement],
      ['Cookie duration', formData.cookie_duration_days],
    ];
    const invalidNumber = numericFields.find(([, value]) => {
      const parsed = toNumberOrNull(value);
      return parsed !== null && parsed < 0;
    });
    if (invalidNumber) {
      alert(`${invalidNumber[0]} cannot be negative.`);
      return;
    }

    const payload = {
      ...formData,
      landing_badges: formData.landing_badges
        ? formData.landing_badges.split('\n').map(s => s.trim()).filter(Boolean)
        : [],
      supported_geos: textToList(formData.supported_geos),
      supported_platforms: textToList(formData.supported_platforms),
      payment_methods: textToList(formData.payment_methods),
      cpa_amount: toNumberOrNull(formData.cpa_amount),
      revenue_share_percent: toNumberOrNull(formData.revenue_share_percent),
      fixed_fee_amount: toNumberOrNull(formData.fixed_fee_amount),
      min_ftd_requirement: toNumberOrNull(formData.min_ftd_requirement),
      minimum_deposit: toNumberOrNull(formData.minimum_deposit),
      cookie_duration_days: toNumberOrNull(formData.cookie_duration_days),
      applications_close_at: formData.applications_close_at || null,
      last_updated_at: formData.last_updated_at || null,
      archived_at: formData.visibility === 'hidden' ? (formData.archived_at || null) : null,
    };
    onSave(payload);
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
                <label>Partner Name *</label>
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

          {/* Marketplace Details */}
          <div className="co-section">
            <div className="co-section-title">Streamer Marketplace</div>
            <div className="co-row">
              <div className="co-field">
                <label>Unique Slug</label>
                <input type="text" value={formData.slug} onChange={e => handleChange('slug', e.target.value.toLowerCase())} placeholder="megarich-partnership" />
              </div>
              <div className="co-field">
                <label>Category</label>
                <select value={formData.partnership_category} onChange={e => handleChange('partnership_category', e.target.value)}>
                  {PARTNERSHIP_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="co-row">
              <div className="co-field">
                <label>Visibility</label>
                <select value={formData.visibility} onChange={e => handleChange('visibility', e.target.value)}>
                  {VISIBILITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="co-field">
                <label>Last Updated</label>
                <input type="date" value={formData.last_updated_at || ''} onChange={e => handleChange('last_updated_at', e.target.value)} />
              </div>
            </div>
            <div className="co-field">
              <label>Short Description</label>
              <textarea
                rows={3}
                value={formData.short_description}
                onChange={e => handleChange('short_description', e.target.value)}
                placeholder="Short streamer-focused summary for the marketplace card."
              />
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
            <div className="co-row">
              <div className="co-field">
                <label>Partner Logo URL</label>
                <input type="text" value={formData.partner_logo_url} onChange={e => handleChange('partner_logo_url', e.target.value)} placeholder="https://..." />
              </div>
              <div className="co-field">
                <label>Cover Image URL</label>
                <input type="text" value={formData.cover_image_url} onChange={e => handleChange('cover_image_url', e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="co-field">
              <label>Video URL (.mp4)</label>
              <input type="text" value={formData.video_url} onChange={e => handleChange('video_url', e.target.value)} placeholder="https://example.com/promo.mp4" />
            </div>
          </div>

          {/* Commercial Terms */}
          <div className="co-section">
            <div className="co-section-title">Commercial Terms</div>
            <div className="co-row">
              <div className="co-field">
                <label>Deal Model</label>
                <select value={formData.deal_model} onChange={e => handleChange('deal_model', e.target.value)}>
                  {DEAL_MODELS.map(model => <option key={model} value={model}>{model}</option>)}
                </select>
              </div>
              <div className="co-field">
                <label>Payment Frequency</label>
                <input type="text" value={formData.payment_frequency} onChange={e => handleChange('payment_frequency', e.target.value)} placeholder="Monthly, weekly, net 30..." />
              </div>
            </div>
            <div className="co-grid-4">
              <div className="co-field">
                <label>CPA Amount</label>
                <input type="number" value={formData.cpa_amount} onChange={e => handleChange('cpa_amount', e.target.value)} min="0" step="0.01" />
              </div>
              <div className="co-field">
                <label>CPA Currency</label>
                <input type="text" value={formData.cpa_currency} onChange={e => handleChange('cpa_currency', e.target.value.toUpperCase())} placeholder="EUR" />
              </div>
              <div className="co-field">
                <label>Revenue Share %</label>
                <input type="number" value={formData.revenue_share_percent} onChange={e => handleChange('revenue_share_percent', e.target.value)} min="0" max="100" step="0.01" />
              </div>
              <div className="co-field">
                <label>Fixed Fee</label>
                <input type="number" value={formData.fixed_fee_amount} onChange={e => handleChange('fixed_fee_amount', e.target.value)} min="0" step="0.01" />
              </div>
            </div>
            <div className="co-row">
              <div className="co-field">
                <label>Fixed Fee Currency</label>
                <input type="text" value={formData.fixed_fee_currency} onChange={e => handleChange('fixed_fee_currency', e.target.value.toUpperCase())} placeholder="EUR" />
              </div>
              <div className="co-field">
                <label>Cookie Duration Days</label>
                <input type="number" value={formData.cookie_duration_days} onChange={e => handleChange('cookie_duration_days', e.target.value)} min="0" />
              </div>
            </div>
            <div className="co-field">
              <label>Hybrid Terms</label>
              <input type="text" value={formData.hybrid_terms} onChange={e => handleChange('hybrid_terms', e.target.value)} placeholder="Custom hybrid deal, CPA + RevShare, etc." />
            </div>
          </div>

          {/* Traffic and Requirements */}
          <div className="co-section">
            <div className="co-section-title">Traffic and Requirements</div>
            <div className="co-row">
              <div className="co-field">
                <label>Supported GEOs <span style={{ fontWeight: 400, color: '#64748b' }}>(one per line or comma-separated)</span></label>
                <textarea rows={3} value={formData.supported_geos} onChange={e => handleChange('supported_geos', e.target.value)} placeholder={'PT\nEU\nBR'} />
              </div>
              <div className="co-field">
                <label>Supported Platforms</label>
                <textarea rows={3} value={formData.supported_platforms} onChange={e => handleChange('supported_platforms', e.target.value)} placeholder={PLATFORM_OPTIONS.join('\n')} />
              </div>
            </div>
            <div className="co-grid-4">
              <div className="co-field">
                <label>Min. FTD Requirement</label>
                <input type="number" value={formData.min_ftd_requirement} onChange={e => handleChange('min_ftd_requirement', e.target.value)} min="0" />
              </div>
              <div className="co-field">
                <label>Minimum Deposit</label>
                <input type="number" value={formData.minimum_deposit} onChange={e => handleChange('minimum_deposit', e.target.value)} min="0" step="0.01" />
              </div>
              <div className="co-field">
                <label>Deposit Currency</label>
                <input type="text" value={formData.minimum_deposit_currency} onChange={e => handleChange('minimum_deposit_currency', e.target.value.toUpperCase())} placeholder="EUR" />
              </div>
              <div className="co-field">
                <label>Payment Methods</label>
                <input type="text" value={formData.payment_methods} onChange={e => handleChange('payment_methods', e.target.value)} placeholder="Bank, PayPal, Crypto" />
              </div>
            </div>
            <div className="co-field">
              <label>Traffic Requirements</label>
              <textarea rows={3} value={formData.traffic_requirements} onChange={e => handleChange('traffic_requirements', e.target.value)} placeholder="Viewer averages, content rules, platform requirements..." />
            </div>
            <div className="co-field">
              <label>Restrictions</label>
              <textarea rows={3} value={formData.restrictions} onChange={e => handleChange('restrictions', e.target.value)} placeholder="Restricted GEOs, traffic types, compliance notes..." />
            </div>
          </div>

          {/* Applications */}
          <div className="co-section">
            <div className="co-section-title">Applications</div>
            <div className="co-row">
              <div className="co-field">
                <label>Application Status</label>
                <select value={formData.application_status} onChange={e => handleChange('application_status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="limited">Limited Availability</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="co-field">
                <label>Applications Close At</label>
                <input type="date" value={formData.applications_close_at || ''} onChange={e => handleChange('applications_close_at', e.target.value)} />
              </div>
            </div>
            <div className="co-row">
              <div className="co-field">
                <label>Application URL</label>
                <input type="text" value={formData.application_url} onChange={e => handleChange('application_url', e.target.value)} placeholder="https://..." />
              </div>
              <div className="co-field">
                <label>Terms URL</label>
                <input type="text" value={formData.terms_url} onChange={e => handleChange('terms_url', e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="co-field">
              <label>Player Promotion</label>
              <textarea rows={3} value={formData.player_promotion} onChange={e => handleChange('player_promotion', e.target.value)} placeholder="Player-facing promo shown inside the full details panel." />
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
                <input type="text" value={formData.promo_code} onChange={e => handleChange('promo_code', e.target.value)} placeholder="SC100" />
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
            <div className="co-field">
              <label>Total Games</label>
              <input type="text" value={formData.total_games} onChange={e => handleChange('total_games', e.target.value)} placeholder="5000+" />
            </div>
          </div>

          {/* Top Providers Picker */}
          <div className="co-section">
            <div className="co-section-title">
              Top Providers
              {(() => {
                try { const arr = JSON.parse(formData.game_providers); return Array.isArray(arr) && arr.length > 0 ? ` (${arr.length} selected)` : ''; } catch { return ''; }
              })()}
            </div>
            <div className="co-field" style={{ marginBottom: 8 }}>
              <input
                type="text"
                value={providerSearch}
                onChange={e => setProviderSearch(e.target.value)}
                placeholder="Search providers..."
                className="co-provider-search"
              />
            </div>
            <div className="co-provider-grid">
              {GAME_PROVIDERS
                .filter(p => !providerSearch || p.name.toLowerCase().includes(providerSearch.toLowerCase()))
                .map(provider => {
                  let selectedProviders = [];
                  try { selectedProviders = JSON.parse(formData.game_providers) || []; } catch { selectedProviders = []; }
                  const isSelected = selectedProviders.includes(provider.id);
                  return (
                    <label key={provider.id} className={`co-provider-chip ${isSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          let providers = [...selectedProviders];
                          if (e.target.checked) providers.push(provider.id);
                          else providers = providers.filter(id => id !== provider.id);
                          handleChange('game_providers', JSON.stringify(providers));
                        }}
                      />
                      <span className="co-provider-name">{provider.name}</span>
                      {isSelected && <i className="fa-solid fa-check co-provider-check" />}
                    </label>
                  );
                })}
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
              <label className="co-toggle">
                <input type="checkbox" checked={formData.is_verified} onChange={e => handleChange('is_verified', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">Verified Partner</span>
              </label>
              <label className="co-toggle">
                <input type="checkbox" checked={formData.is_featured} onChange={e => handleChange('is_featured', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">Featured</span>
              </label>
              <label className="co-toggle">
                <input type="checkbox" checked={formData.is_exclusive} onChange={e => handleChange('is_exclusive', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">Exclusive</span>
              </label>
              <label className="co-toggle">
                <input type="checkbox" checked={formData.is_new} onChange={e => handleChange('is_new', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">New</span>
              </label>
              <label className="co-toggle">
                <input type="checkbox" checked={formData.is_hot} onChange={e => handleChange('is_hot', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">Hot</span>
              </label>
              <label className="co-toggle">
                <input type="checkbox" checked={formData.has_direct_manager} onChange={e => handleChange('has_direct_manager', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">Direct Manager</span>
              </label>
              <label className="co-toggle">
                <input type="checkbox" checked={formData.streamer_balance_available} onChange={e => handleChange('streamer_balance_available', e.target.checked)} />
                <span className="co-toggle-slider"></span>
                <span className="co-toggle-label">Streamer Balance</span>
              </label>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="co-section">
            <div className="co-section-title">Admin Notes</div>
            <div className="co-field">
              <label>Public Notes</label>
              <textarea rows={3} value={formData.public_notes} onChange={e => handleChange('public_notes', e.target.value)} placeholder="Optional non-confidential notes for future public display." />
            </div>
            <div className="co-field">
              <label>Private Notes</label>
              <textarea rows={3} value={formData.private_notes} onChange={e => handleChange('private_notes', e.target.value)} placeholder="Internal-only terms or admin notes. Not rendered on public pages." />
            </div>
          </div>

          {/* Landing Card Display */}
          <div className="co-section">
            <div className="co-section-title">🏠 Landing Card Display</div>
            <div className="co-row">
              <div className="co-field">
                <label>Tag Label</label>
                <input type="text" value={formData.landing_tag} onChange={e => handleChange('landing_tag', e.target.value)} placeholder="TOP PARTNER" />
              </div>
              <div className="co-field">
                <label>Tag Color (hex)</label>
                <input type="text" value={formData.landing_tag_color} onChange={e => handleChange('landing_tag_color', e.target.value)} placeholder="#0ea5e9" />
              </div>
            </div>
            <div className="co-row">
              <div className="co-field">
                <label>Model / Deal Type</label>
                <input type="text" value={formData.landing_model} onChange={e => handleChange('landing_model', e.target.value)} placeholder="40% Rev Share" />
              </div>
              <div className="co-field">
                <label>Accent Color (hex)</label>
                <input type="text" value={formData.landing_accent_color} onChange={e => handleChange('landing_accent_color', e.target.value)} placeholder="#0ea5e9" />
              </div>
              <div className="co-field">
                <label>Logo Background</label>
                <input type="text" value={formData.landing_logo_bg} onChange={e => handleChange('landing_logo_bg', e.target.value)} placeholder="#003366" />
              </div>
            </div>
            <div className="co-field">
              <label>Feature Badges <span style={{ fontWeight: 400, color: '#64748b' }}>(one per line)</span></label>
              <textarea
                rows={3}
                value={formData.landing_badges}
                onChange={e => handleChange('landing_badges', e.target.value)}
                placeholder={'CPA Available\nWeekly Payments\nFast Approval'}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 10px', color: '#e2e8f0', outline: 'none' }}
              />
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
