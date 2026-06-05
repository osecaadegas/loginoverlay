import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
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
  badge: '',
  badge_type: '',
  features: [],
  cta: 'Get Started',
  is_highlighted: false,
  display_order: 0,
  is_active: true,
};

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

  useEffect(() => { loadPlans(); loadOffers(); }, []);

  // ── Pricing plans ──
  const loadPlans = async () => {
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
    setEditing({});
  };

  const openEdit = (plan) => {
    setFormData({ ...plan });
    const feats = Array.isArray(plan.features) ? plan.features : [];
    setFeaturesText(feats.join('\n'));
    setEditing(plan);
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
    if (editing?.id) {
      ({ error } = await supabase.from('landing_pricing_plans').update(payload).eq('id', editing.id));
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
      .select('id, casino_name, list_image_url, show_on_landing, landing_order, landing_tag, landing_tag_color, landing_model, landing_badges, landing_accent_color, landing_logo_bg')
      .eq('is_active', true)
      .order('landing_order', { ascending: true });
    setOffers(data || []);
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
          <div className="la-plans-grid">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={[
                  'la-plan-card',
                  plan.is_highlighted ? 'la-plan-card--hi' : '',
                  !plan.is_active ? 'la-plan-card--inactive' : '',
                ].join(' ')}
              >
                {plan.badge && (
                  <div className={`la-plan-badge la-plan-badge--${plan.badge_type || 'default'}`}>
                    {plan.badge}
                  </div>
                )}
                <div className="la-plan-name">{plan.name}</div>
                <div className="la-plan-desc">{plan.description}</div>
                <div className="la-plan-price">
                  {plan.price}<span className="la-plan-period">{plan.period}</span>
                </div>
                {plan.sub_price && <div className="la-plan-sub">{plan.sub_price}</div>}
                <ul className="la-plan-feats">
                  {(Array.isArray(plan.features) ? plan.features : []).map(f => (
                    <li key={f}><span className="la-tick">✓</span>{f}</li>
                  ))}
                </ul>
                <div className="la-plan-order">Order: {plan.display_order}</div>
                <div className="la-plan-actions">
                  <button className="la-btn-sm la-btn-sm--edit" onClick={() => openEdit(plan)}>Edit</button>
                  <button className="la-btn-sm la-btn-sm--toggle" onClick={() => toggleActive(plan)}>
                    {plan.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button className="la-btn-sm la-btn-sm--del" onClick={() => handleDelete(plan.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Partner Cards ── */}
      <div className="la-block">
        <div className="la-block-header">
          <div>
            <h2 className="la-block-title">🤝 Featured Partner Cards</h2>
            <p className="la-block-sub">Control which casino offers appear on the landing page and customise their card display.</p>
          </div>
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
                <div key={offer.id} className={`la-offer-row${isEditing ? ' la-offer-row--open' : ''}`}>
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
                      <button
                        className={`la-btn-sm ${isEditing ? 'la-btn-sm--toggle' : 'la-btn-sm--edit'}`}
                        onClick={() => isEditing ? closeEditOffer() : openEditOffer(offer)}
                      >
                        {isEditing ? 'Close' : 'Edit Card'}
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

      {/* ── Edit Pricing Plan Modal ── */}
      {editing !== null && (
        <div className="la-modal-backdrop" onClick={e => e.target === e.currentTarget && closeEdit()}>
          <div className="la-modal">
            <div className="la-modal-header">
              <h3>{editing?.id ? 'Edit Plan' : 'New Plan'}</h3>
              <button className="la-modal-close" onClick={closeEdit}>✕</button>
            </div>

            <div className="la-modal-body">
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

              <div className="la-row">
                <div className="la-field">
                  <label>Price *</label>
                  <input value={formData.price} onChange={e => set('price', e.target.value)} placeholder="€15" />
                </div>
                <div className="la-field">
                  <label>Period *</label>
                  <input value={formData.period} onChange={e => set('period', e.target.value)} placeholder="/month" />
                </div>
                <div className="la-field">
                  <label>Sub-price line</label>
                  <input value={formData.sub_price || ''} onChange={e => set('sub_price', e.target.value)} placeholder="€10,00 /month" />
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
                <textarea
                  rows={5}
                  value={featuresText}
                  onChange={e => setFeaturesText(e.target.value)}
                  placeholder={'All Overlay Center access\nBasic widgets & themes\nEmail support'}
                />
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
            </div>

            <div className="la-modal-footer">
              <button className="la-btn-cancel" onClick={closeEdit}>Cancel</button>
              <button className="la-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
