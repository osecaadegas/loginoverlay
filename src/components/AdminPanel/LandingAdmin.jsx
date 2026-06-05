import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { CasinoOfferModal } from './modals';
import './LandingAdmin.css';

/* ─── Partner card mini-preview ─── */
function CardPreview({ name, tag, tagColor, logoBg, accent, model, badges, imgUrl }) {
  const tc = tagColor || '#0ea5e9';
  const ac = accent   || '#0ea5e9';
  return (
    <div className="la-card-preview">
      {tag && (
        <div className="la-cp-tag" style={{ background: `${tc}22`, color: tc, border: `1px solid ${tc}44` }}>
          {tag}
        </div>
      )}
      <div className="la-cp-logo" style={{ background: logoBg || '#1e293b' }}>
        {imgUrl
          ? <img src={imgUrl} alt={name} style={{ maxWidth: '80%', maxHeight: '40px', objectFit: 'contain' }} />
          : <span style={{ fontSize: '1.4rem' }}>🎰</span>}
      </div>
      <div className="la-cp-name">{name || 'Casino Name'}</div>
      <div className="la-cp-model" style={{ color: ac }}>{model || 'Deal Type'}</div>
      <div className="la-cp-badges">
        {(badges || ['Feature 1', 'Feature 2']).map((b, i) => (
          <div key={i} className="la-cp-badge">
            <span style={{ color: ac }}>✓</span> {b}
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_PLAN = {
  name: '',
  description: '',
  price: '',
  period: '',
  sub_price: '',
  price_annual: '',
  period_annual: '',
  sub_price_annual: '',
  badge: '',
  badge_type: '',
  features: [],
  cta: 'Get Started',
  is_highlighted: false,
  display_order: 0,
  is_active: true,
};

const OFFER_ALLOWED_COLS = [
  'casino_name', 'bonus_link', 'title', 'image_url', 'list_image_url',
  'badge', 'badge_class', 'min_deposit', 'max_withdrawal', 'withdrawal_time',
  'cashback', 'bonus_value', 'free_spins', 'game_providers', 'total_games',
  'license', 'welcome_bonus', 'languages', 'established', 'live_support',
  'details', 'deposit_methods', 'video_url', 'promo_code',
  'crypto_friendly', 'vpn_friendly', 'is_premium', 'is_active', 'display_order',
  'highlights', 'landing_tag', 'landing_tag_color', 'landing_model', 'landing_badges',
  'landing_accent_color', 'landing_logo_bg', 'show_on_landing', 'landing_order',
];

export default function LandingAdmin() {
  const [plans, setPlans]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [editing, setEditing]       = useState(null);
  const [formData, setFormData]     = useState({ ...EMPTY_PLAN });
  const [featuresText, setFeaturesText] = useState('');
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState(null);

  // ── Partner cards state ──
  const [offers, setOffers]           = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [editingOffer, setEditingOffer]   = useState(null); // offer id being edited
  const [offerForm, setOfferForm]        = useState({});
  const [offerBadgesText, setOfferBadgesText] = useState('');
  const [offerSaving, setOfferSaving]    = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [modalOffer, setModalOffer]         = useState(null);
  const [modalSaving, setModalSaving]       = useState(false);

  useEffect(() => { loadPlans(); loadOffers(); }, []);

  // ── Pricing plans ──
  const loadPlans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('landing_pricing_plans')
      .select('*')
      .order('display_order');
    setPlans(data || []);
    setLoading(false);
  };

  const openNew = () => {
    setFormData({ ...EMPTY_PLAN });
    setFeaturesText('');
    setEditing('new');
  };

  const openEdit = (plan) => {
    if (editing === plan.id) { setEditing(null); return; }
    setFormData({ ...plan });
    const feats = Array.isArray(plan.features) ? plan.features : [];
    setFeaturesText(feats.join('\n'));
    setEditing(plan.id);
  };

  const closeEdit = () => setEditing(null);

  const set = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.period) {
      setMsg({ type: 'error', text: 'Name, Price, and Period are required.' });
      return;
    }
    setSaving(true);
    const payload = {
      ...formData,
      features: featuresText.split('\n').map(s => s.trim()).filter(Boolean),
    };
    delete payload.id;
    delete payload.created_at;

    let error;
    if (editing && editing !== 'new') {
      ({ error } = await supabase.from('landing_pricing_plans').update(payload).eq('id', editing));
    } else {
      ({ error } = await supabase.from('landing_pricing_plans').insert(payload));
    }
    setSaving(false);
    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: editing?.id ? 'Plan updated.' : 'Plan created.' });
      closeEdit();
      loadPlans();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this pricing plan?')) return;
    await supabase.from('landing_pricing_plans').delete().eq('id', id);
    loadPlans();
  };

  const toggleActive = async (plan) => {
    await supabase.from('landing_pricing_plans').update({ is_active: !plan.is_active }).eq('id', plan.id);
    loadPlans();
  };

  // ── Partner card helpers ──
  const loadOffers = async () => {
    setOffersLoading(true);
    const { data } = await supabase
      .from('casino_offers')
      .select('*');
    const sorted = [...(data || [])].sort((a, b) => {
      const landingDelta = Number(!!b.show_on_landing) - Number(!!a.show_on_landing);
      if (landingDelta !== 0) return landingDelta;
      const activeDelta = Number(!!b.is_active) - Number(!!a.is_active);
      if (activeDelta !== 0) return activeDelta;
      const landingOrderDelta = (a.landing_order ?? 9999) - (b.landing_order ?? 9999);
      if (landingOrderDelta !== 0) return landingOrderDelta;
      return (a.display_order ?? 9999) - (b.display_order ?? 9999);
    });
    setOffers(sorted);
    setOffersLoading(false);
  };

  const openEditOffer = (offer) => {
    setEditingOffer(offer.id);
    setOfferForm({
      landing_tag:         offer.landing_tag         || '',
      landing_tag_color:   offer.landing_tag_color   || '#0ea5e9',
      landing_model:       offer.landing_model        || '',
      landing_accent_color:offer.landing_accent_color || '#0ea5e9',
      landing_logo_bg:     offer.landing_logo_bg      || '',
      landing_order:       offer.landing_order        ?? 0,
    });
    const b = Array.isArray(offer.landing_badges) ? offer.landing_badges : [];
    setOfferBadgesText(b.join('\n'));
  };

  const closeEditOffer = () => { setEditingOffer(null); setOfferForm({}); };

  const setOF = (field, value) => setOfferForm(p => ({ ...p, [field]: value }));

  const saveOffer = async () => {
    setOfferSaving(true);
    const badges = offerBadgesText.split('\n').map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from('casino_offers').update({
      ...offerForm,
      landing_order:  parseInt(offerForm.landing_order) || 0,
      landing_badges: badges,
    }).eq('id', editingOffer);
    setOfferSaving(false);
    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Partner card updated.' });
      closeEditOffer();
      loadOffers();
    }
  };

  const toggleShowOnLanding = async (offer) => {
    await supabase.from('casino_offers')
      .update({ show_on_landing: !offer.show_on_landing })
      .eq('id', offer.id);
    loadOffers();
  };

  const toggleOfferActive = async (offer) => {
    await supabase.from('casino_offers')
      .update({ is_active: !offer.is_active })
      .eq('id', offer.id);
    loadOffers();
  };

  const openOfferModal = (offer = null) => {
    setModalOffer(offer);
    setShowOfferModal(true);
  };

  const closeOfferModal = () => {
    setShowOfferModal(false);
    setModalOffer(null);
  };

  const saveOfferModal = async (formData) => {
    setModalSaving(true);
    try {
      const payload = {};
      for (const key of OFFER_ALLOWED_COLS) {
        if (key in formData) payload[key] = formData[key];
      }

      if (typeof payload.game_providers === 'string') {
        try {
          payload.game_providers = JSON.parse(payload.game_providers);
        } catch {
          payload.game_providers = [];
        }
      }

      if (modalOffer) {
        const { error } = await supabase
          .from('casino_offers')
          .update(payload)
          .eq('id', modalOffer.id);
        if (error) throw error;
        setMsg({ type: 'success', text: 'Partner offer updated.' });
      } else {
        const { data: authData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('casino_offers')
          .insert([{ ...payload, created_by: authData.user?.id || null }]);
        if (error) throw error;
        setMsg({ type: 'success', text: 'Partner offer created.' });
      }

      closeOfferModal();
      loadOffers();
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'Failed to save partner offer.' });
    } finally {
      setModalSaving(false);
    }
  };

  const deleteOfferModal = async (offerId) => {
    if (!window.confirm('Delete this casino offer completely?')) return;
    try {
      const { error } = await supabase.from('casino_offers').delete().eq('id', offerId);
      if (error) throw error;
      setMsg({ type: 'success', text: 'Partner offer deleted.' });
      closeOfferModal();
      loadOffers();
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'Failed to delete partner offer.' });
    }
  };

  return (
    <div className="la-wrap">
      {msg && (
        <div className={`la-msg la-msg--${msg.type}`} onClick={() => setMsg(null)}>
          {msg.text}
        </div>
      )}

      {/* ── Pricing Plans ── */}
      <div className="la-block">
        <div className="la-block-header">
          <div>
            <h2 className="la-block-title">💳 Pricing Plans</h2>
            <p className="la-block-sub">Manage subscription tiers shown on the landing page.</p>
          </div>
          <button className="la-btn-add" onClick={openNew}>+ Add Plan</button>
        </div>

        {loading ? (
          <div className="la-loading">Loading...</div>
        ) : plans.length === 0 ? (
          <div className="la-empty">No pricing plans yet. Click "Add Plan" to create one.</div>
        ) : (
          <div className="la-plans-list">
            {plans.map(plan => (
              <div key={plan.id} className={['la-plan-row', !plan.is_active ? 'la-plan-row--inactive' : ''].join(' ')}>
                {/* ── Summary row ── */}
                <div className="la-plan-row-header">
                  <div className="la-plan-row-info">
                    {plan.badge && <span className={`la-plan-badge la-plan-badge--${plan.badge_type || 'default'}`}>{plan.badge}</span>}
                    <span className="la-plan-name">{plan.name}</span>
                    <span className="la-plan-price">{plan.price}<span className="la-plan-period">{plan.period}</span></span>
                    {plan.description && <span className="la-plan-desc">{plan.description}</span>}
                    <span className="la-plan-order-badge">#{plan.display_order}</span>
                  </div>
                  <div className="la-plan-actions">
                    <button className="la-btn-sm la-btn-sm--edit" onClick={() => openEdit(plan)}>
                      {editing === plan.id ? '▲ Close' : '✏️ Edit'}
                    </button>
                    <button className="la-btn-sm la-btn-sm--toggle" onClick={() => toggleActive(plan)}>
                      {plan.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button className="la-btn-sm la-btn-sm--del" onClick={() => handleDelete(plan.id)}>🗑</button>
                  </div>
                </div>

                {/* ── Inline edit form ── */}
                {editing === plan.id && (
                  <div className="la-inline-form">
                    {/* period suggestions shared by both period fields */}
                    <datalist id="period-suggestions">
                      <option value="/month" />
                      <option value="/6 months" />
                      <option value="/half year" />
                      <option value="/year" />
                      <option value="/lifetime" />
                    </datalist>

                    <div className="la-row">
                      <div className="la-field">
                        <label>Plan Name *</label>
                        <input value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Starter" />
                      </div>
                      <div className="la-field la-field--sm">
                        <label>Display Order</label>
                        <input type="number" value={formData.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} min="0" />
                      </div>
                    </div>
                    <div className="la-field">
                      <label>Description</label>
                      <input value={formData.description || ''} onChange={e => set('description', e.target.value)} placeholder="Perfect for new streamers" />
                    </div>
                    <div className="la-field-group-label">📅 Monthly billing</div>
                    <div className="la-row">
                      <div className="la-field">
                        <label>Monthly Price *</label>
                        <input value={formData.price} onChange={e => set('price', e.target.value)} placeholder="€15" />
                      </div>
                      <div className="la-field">
                        <label>Period *</label>
                        <input list="period-suggestions" value={formData.period} onChange={e => set('period', e.target.value)} placeholder="/month" />
                      </div>
                      <div className="la-field">
                        <label>Sub-price line</label>
                        <input value={formData.sub_price || ''} onChange={e => set('sub_price', e.target.value)} placeholder="e.g. billed monthly" />
                      </div>
                    </div>
                    <div className="la-field-group-label">📆 Annual billing <span className="la-field-hint">(shown when Annual toggle is selected)</span></div>
                    <div className="la-row">
                      <div className="la-field">
                        <label>Annual Price</label>
                        <input value={formData.price_annual || ''} onChange={e => set('price_annual', e.target.value)} placeholder="€144" />
                      </div>
                      <div className="la-field">
                        <label>Annual Period</label>
                        <input list="period-suggestions" value={formData.period_annual || ''} onChange={e => set('period_annual', e.target.value)} placeholder="/year" />
                      </div>
                      <div className="la-field">
                        <label>Annual sub-price</label>
                        <input value={formData.sub_price_annual || ''} onChange={e => set('sub_price_annual', e.target.value)} placeholder="€12/month billed annually" />
                      </div>
                    </div>
                    <div className="la-row">
                      <div className="la-field">
                        <label>Badge Text</label>
                        <input value={formData.badge || ''} onChange={e => set('badge', e.target.value)} placeholder="MOST POPULAR" />
                      </div>
                      <div className="la-field">
                        <label>Badge Style</label>
                        <select value={formData.badge_type || ''} onChange={e => set('badge_type', e.target.value)}>
                          <option value="">None</option>
                          <option value="popular">Purple — Popular</option>
                          <option value="value">Orange — Best Value</option>
                        </select>
                      </div>
                      <div className="la-field">
                        <label>CTA Button</label>
                        <input value={formData.cta || ''} onChange={e => set('cta', e.target.value)} placeholder="Get Started" />
                      </div>
                    </div>
                    <div className="la-field">
                      <label>Features <span className="la-field-hint">(one per line)</span></label>
                      <textarea rows={5} value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder={'All Overlay Center access\nBasic widgets & themes\nEmail support'} />
                    </div>
                    <div className="la-checks-row">
                      <label className="la-check">
                        <input type="checkbox" checked={formData.is_highlighted} onChange={e => set('is_highlighted', e.target.checked)} />
                        Highlighted card
                      </label>
                      <label className="la-check">
                        <input type="checkbox" checked={formData.is_active} onChange={e => set('is_active', e.target.checked)} />
                        Active (visible)
                      </label>
                    </div>
                    <div className="la-inline-form-footer">
                      <button className="la-btn-cancel" onClick={closeEdit}>Cancel</button>
                      <button className="la-btn-save" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save Plan'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* ── New plan inline form ── */}
            {editing === 'new' && (
              <div className="la-plan-row">
                <div className="la-inline-form">
                  <datalist id="period-suggestions">
                    <option value="/month" />
                    <option value="/6 months" />
                    <option value="/half year" />
                    <option value="/year" />
                    <option value="/lifetime" />
                  </datalist>
                  <div className="la-row">
                    <div className="la-field"><label>Plan Name *</label><input value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Starter" /></div>
                    <div className="la-field la-field--sm"><label>Display Order</label><input type="number" value={formData.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} min="0" /></div>
                  </div>
                  <div className="la-field"><label>Description</label><input value={formData.description || ''} onChange={e => set('description', e.target.value)} placeholder="For new streamers" /></div>
                  <div className="la-field-group-label">📅 Monthly billing</div>
                  <div className="la-row">
                    <div className="la-field"><label>Monthly Price *</label><input value={formData.price} onChange={e => set('price', e.target.value)} placeholder="€15" /></div>
                    <div className="la-field"><label>Period *</label><input list="period-suggestions" value={formData.period} onChange={e => set('period', e.target.value)} placeholder="/month" /></div>
                    <div className="la-field"><label>Sub-price line</label><input value={formData.sub_price || ''} onChange={e => set('sub_price', e.target.value)} placeholder="billed monthly" /></div>
                  </div>
                  <div className="la-field-group-label">📆 Annual billing</div>
                  <div className="la-row">
                    <div className="la-field"><label>Annual Price</label><input value={formData.price_annual || ''} onChange={e => set('price_annual', e.target.value)} placeholder="€144" /></div>
                    <div className="la-field"><label>Annual Period</label><input list="period-suggestions" value={formData.period_annual || ''} onChange={e => set('period_annual', e.target.value)} placeholder="/year" /></div>
                    <div className="la-field"><label>Annual sub-price</label><input value={formData.sub_price_annual || ''} onChange={e => set('sub_price_annual', e.target.value)} placeholder="€12/month billed annually" /></div>
                  </div>
                  <div className="la-row">
                    <div className="la-field"><label>Badge Text</label><input value={formData.badge || ''} onChange={e => set('badge', e.target.value)} placeholder="MOST POPULAR" /></div>
                    <div className="la-field"><label>Badge Style</label><select value={formData.badge_type || ''} onChange={e => set('badge_type', e.target.value)}><option value="">None</option><option value="popular">Purple — Popular</option><option value="value">Orange — Best Value</option></select></div>
                    <div className="la-field"><label>CTA Button</label><input value={formData.cta || ''} onChange={e => set('cta', e.target.value)} placeholder="Get Started" /></div>
                  </div>
                  <div className="la-field"><label>Features <span className="la-field-hint">(one per line)</span></label><textarea rows={4} value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder="Feature 1\nFeature 2" /></div>
                  <div className="la-checks-row">
                    <label className="la-check"><input type="checkbox" checked={formData.is_highlighted} onChange={e => set('is_highlighted', e.target.checked)} /> Highlighted card</label>
                    <label className="la-check"><input type="checkbox" checked={formData.is_active} onChange={e => set('is_active', e.target.checked)} /> Active (visible)</label>
                  </div>
                  <div className="la-inline-form-footer">
                    <button className="la-btn-cancel" onClick={closeEdit}>Cancel</button>
                    <button className="la-btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Plan'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Partner Cards ── */}
      <div className="la-block">
        <div className="la-block-header">
          <div>
            <h2 className="la-block-title">🤝 Featured Partner Cards</h2>
            <p className="la-block-sub">Add, edit, hide, disable, reorder, and remove the partner cards used on the landing page.</p>
          </div>
          <button className="la-btn-add" onClick={() => openOfferModal()}>
            + Add Partner
          </button>
        </div>

        {offersLoading ? (
          <div className="la-loading">Loading offers…</div>
        ) : offers.length === 0 ? (
          <div className="la-empty">No active casino offers found.</div>
        ) : (
          <div className="la-offers-list">
            {offers.map(offer => {
              const isEditing = editingOffer === offer.id;
              const badges = Array.isArray(offer.landing_badges) ? offer.landing_badges : [];
              return (
                <div
                  key={offer.id}
                  className={[
                    'la-offer-row',
                    isEditing ? 'la-offer-row--open' : '',
                    !offer.is_active ? 'la-offer-row--inactive' : '',
                    !offer.show_on_landing ? 'la-offer-row--hidden' : '',
                  ].join(' ')}
                >
                  {/* Row header */}
                  <div className="la-offer-rowhead">
                    <div className="la-offer-thumb">
                      {offer.list_image_url
                        ? <img src={offer.list_image_url} alt={offer.casino_name} />
                        : <span>🎰</span>}
                    </div>
                    <div className="la-offer-info">
                      <span className="la-offer-name">{offer.casino_name}</span>
                      {offer.landing_tag && (
                        <span className="la-offer-tag" style={{ background: `${offer.landing_tag_color || '#0ea5e9'}22`, color: offer.landing_tag_color || '#0ea5e9' }}>
                          {offer.landing_tag}
                        </span>
                      )}
                      <span className={`la-offer-status ${offer.is_active ? 'la-offer-status--active' : 'la-offer-status--inactive'}`}>
                        {offer.is_active ? 'Offer active' : 'Offer disabled'}
                      </span>
                      <span className={`la-offer-status ${offer.show_on_landing ? 'la-offer-status--visible' : 'la-offer-status--hidden'}`}>
                        {offer.show_on_landing ? 'Landing visible' : 'Landing hidden'}
                      </span>
                      <span className="la-plan-order-badge">Landing #{offer.landing_order ?? 0}</span>
                    </div>
                    <div className="la-offer-actions">
                      <label className="la-toggle" title="Show on landing page">
                        <input
                          type="checkbox"
                          checked={!!offer.show_on_landing}
                          onChange={() => toggleShowOnLanding(offer)}
                        />
                        <span className="la-toggle-track">
                          <span className="la-toggle-thumb" />
                        </span>
                        <span className="la-toggle-label">{offer.show_on_landing ? 'Visible' : 'Hidden'}</span>
                      </label>
                      <label className="la-toggle" title="Offer active state">
                        <input
                          type="checkbox"
                          checked={!!offer.is_active}
                          onChange={() => toggleOfferActive(offer)}
                        />
                        <span className="la-toggle-track">
                          <span className="la-toggle-thumb" />
                        </span>
                        <span className="la-toggle-label">{offer.is_active ? 'Active' : 'Disabled'}</span>
                      </label>
                      <button
                        className={`la-btn-sm ${isEditing ? 'la-btn-sm--toggle' : 'la-btn-sm--edit'}`}
                        onClick={() => isEditing ? closeEditOffer() : openEditOffer(offer)}
                      >
                        {isEditing ? 'Close Card' : 'Landing Card'}
                      </button>
                      <button
                        className="la-btn-sm la-btn-sm--edit"
                        onClick={() => openOfferModal(offer)}
                      >
                        Full Edit
                      </button>
                    </div>
                  </div>

                  {/* Inline editor */}
                  {isEditing && (
                    <div className="la-offer-editor">
                      <div className="la-offer-editor-form">
                        <div className="la-row">
                          <div className="la-field">
                            <label>Tag Label</label>
                            <input value={offerForm.landing_tag} onChange={e => setOF('landing_tag', e.target.value)} placeholder="TOP PARTNER" />
                          </div>
                          <div className="la-field la-field--color">
                            <label>Tag Color</label>
                            <div className="la-color-row">
                              <input type="color" value={offerForm.landing_tag_color || '#0ea5e9'} onChange={e => setOF('landing_tag_color', e.target.value)} />
                              <input value={offerForm.landing_tag_color} onChange={e => setOF('landing_tag_color', e.target.value)} placeholder="#0ea5e9" />
                            </div>
                          </div>
                        </div>
                        <div className="la-row">
                          <div className="la-field">
                            <label>Deal / Model Text</label>
                            <input value={offerForm.landing_model} onChange={e => setOF('landing_model', e.target.value)} placeholder="40% Rev Share" />
                          </div>
                          <div className="la-field la-field--color">
                            <label>Accent Color</label>
                            <div className="la-color-row">
                              <input type="color" value={offerForm.landing_accent_color || '#0ea5e9'} onChange={e => setOF('landing_accent_color', e.target.value)} />
                              <input value={offerForm.landing_accent_color} onChange={e => setOF('landing_accent_color', e.target.value)} placeholder="#0ea5e9" />
                            </div>
                          </div>
                          <div className="la-field la-field--color">
                            <label>Logo Background</label>
                            <div className="la-color-row">
                              <input type="color" value={offerForm.landing_logo_bg || '#1e293b'} onChange={e => setOF('landing_logo_bg', e.target.value)} />
                              <input value={offerForm.landing_logo_bg} onChange={e => setOF('landing_logo_bg', e.target.value)} placeholder="#003366" />
                            </div>
                          </div>
                        </div>
                        <div className="la-row">
                          <div className="la-field">
                            <label>Feature Badges <span className="la-field-hint">(one per line)</span></label>
                            <textarea
                              rows={3}
                              value={offerBadgesText}
                              onChange={e => setOfferBadgesText(e.target.value)}
                              placeholder={'CPA Available\nWeekly Payments\nFast Approval'}
                            />
                          </div>
                          <div className="la-field la-field--sm">
                            <label>Display Order</label>
                            <input type="number" value={offerForm.landing_order} onChange={e => setOF('landing_order', e.target.value)} min="0" />
                          </div>
                        </div>
                        <div className="la-offer-editor-footer">
                          <button className="la-btn-cancel" onClick={closeEditOffer}>Cancel</button>
                          <button className="la-btn-save" onClick={saveOffer} disabled={offerSaving}>
                            {offerSaving ? 'Saving…' : 'Save Card'}
                          </button>
                        </div>
                      </div>
                      <CardPreview
                        name={offer.casino_name}
                        tag={offerForm.landing_tag}
                        tagColor={offerForm.landing_tag_color}
                        logoBg={offerForm.landing_logo_bg}
                        accent={offerForm.landing_accent_color}
                        model={offerForm.landing_model}
                        badges={offerBadgesText.split('\n').map(s => s.trim()).filter(Boolean)}
                        imgUrl={offer.list_image_url}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CasinoOfferModal
        isOpen={showOfferModal}
        onClose={closeOfferModal}
        onSave={saveOfferModal}
        onDelete={deleteOfferModal}
        editingOffer={modalOffer}
        saving={modalSaving}
      />


    </div>
  );
}
