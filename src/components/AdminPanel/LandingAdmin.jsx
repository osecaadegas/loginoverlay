import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import './LandingAdmin.css';

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

  useEffect(() => { loadPlans(); }, []);

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

      {/* ── Edit Modal ── */}
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
