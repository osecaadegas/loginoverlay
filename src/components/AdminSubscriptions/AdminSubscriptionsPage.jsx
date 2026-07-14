import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Save } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import './AdminSubscriptionsPage.css';

function centsToMoney(cents, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format((Number(cents) || 0) / 100);
}

function textToArray(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayToText(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function Field({ label, children }) {
  return (
    <label className="as-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState(null);
  const [contentDraft, setContentDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [message, setMessage] = useState(null);

  const getToken = async () => {
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) throw error;
    return sessionData.session?.access_token || null;
  };

  const request = async (options = {}) => {
    const token = await getToken();
    if (!token) throw new Error('Admin session required');
    const response = await fetch('/api/admin-subscriptions', {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(payload.error || 'Subscription admin request failed');
      err.payload = payload;
      throw err;
    }
    return payload;
  };

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const payload = await request();
      setData(payload);
      setContentDraft(payload.content || {});
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateCollection = (collection, idKey, id, key, value) => {
    setData((current) => ({
      ...current,
      [collection]: current[collection].map((item) => item[idKey] === id ? { ...item, [key]: value } : item),
    }));
  };

  const saveEntity = async (entity, id, values, savingLabel, confirmedPriceChange = false) => {
    setSavingKey(savingLabel);
    setMessage(null);
    try {
      await request({
        method: 'PATCH',
        body: JSON.stringify({ entity, id, values, confirmedPriceChange }),
      });
      setMessage({ type: 'success', text: 'Saved successfully.' });
      await load();
    } catch (error) {
      if (entity === 'plan' && error.payload?.code === 'price_change_confirmation_required') {
        const confirmPrice = window.confirm([
          'Confirm plan price change?',
          '',
          `Current website price: ${centsToMoney(error.payload.currentWebsitePriceCents)}`,
          `New website price: ${centsToMoney(error.payload.newWebsitePriceCents)}`,
          `Active subscribers on old price: ${error.payload.activeSubscriberCount}`,
          'Mollie stores the amount per subscription, so this affects new subscribers only.',
        ].join('\n'));
        if (confirmPrice) {
          await saveEntity(entity, id, values, savingLabel, true);
          return;
        }
      } else {
        setMessage({ type: 'error', text: error.message });
      }
    } finally {
      setSavingKey(null);
    }
  };

  const saveContent = async () => {
    let parsedFaq = contentDraft.faq;
    let parsedComparison = contentDraft.comparison_rows;
    try {
      if (typeof parsedFaq === 'string') parsedFaq = JSON.parse(parsedFaq || '[]');
      if (typeof parsedComparison === 'string') parsedComparison = JSON.parse(parsedComparison || '[]');
    } catch {
      setMessage({ type: 'error', text: 'FAQ and comparison rows must be valid JSON arrays.' });
      return;
    }

    const trustLabelsText = contentDraft.trust_labels_text ?? arrayToText(contentDraft.trust_labels);
    const content = {
      ...contentDraft,
      trust_labels: textToArray(trustLabelsText),
      faq: parsedFaq,
      comparison_rows: parsedComparison,
    };
    delete content.trust_labels_text;
    await saveEntity('page_content', 'premium_main', { title: data.contentRecord?.title, content, active: true }, 'page-content');
  };

  if (loading) {
    return (
      <main className="as-page as-page--center">
        <Loader2 className="as-spin" />
        <p>Loading subscription editor...</p>
      </main>
    );
  }

  return (
    <main className="as-page">
      <header className="as-header">
        <div>
          <span>Admin</span>
          <h1>Subscriptions</h1>
          <p>Edit premium products, plans, prices, page copy, FAQ and feature availability.</p>
        </div>
        <button type="button" onClick={load} className="as-secondary-btn">Refresh</button>
      </header>

      {message && (
        <div className={`as-message as-message--${message.type}`}>
          {message.type === 'success' ? <Check size={17} /> : <AlertTriangle size={17} />}
          {message.text}
        </div>
      )}

      <section className="as-section">
        <h2>Product types</h2>
        <div className="as-grid as-grid--2">
          {(data.productTypes || []).map((product) => (
            <article className="as-panel" key={product.code}>
              <Field label="Public title">
                <input value={product.title || ''} onChange={(event) => updateCollection('productTypes', 'code', product.code, 'title', event.target.value)} />
              </Field>
              <Field label="Description">
                <textarea value={product.description || ''} onChange={(event) => updateCollection('productTypes', 'code', product.code, 'description', event.target.value)} />
              </Field>
              <div className="as-form-row">
                <Field label="Icon">
                  <input value={product.icon || ''} onChange={(event) => updateCollection('productTypes', 'code', product.code, 'icon', event.target.value)} />
                </Field>
                <Field label="Sort order">
                  <input type="number" value={product.sortOrder || 0} onChange={(event) => updateCollection('productTypes', 'code', product.code, 'sortOrder', Number(event.target.value))} />
                </Field>
              </div>
              <label className="as-check"><input type="checkbox" checked={!!product.active} onChange={(event) => updateCollection('productTypes', 'code', product.code, 'active', event.target.checked)} /> Active</label>
              <button
                type="button"
                className="as-primary-btn"
                disabled={savingKey === product.code}
                onClick={() => saveEntity('product_type', product.code, {
                  public_title: product.title,
                  description: product.description,
                  icon: product.icon,
                  sort_order: product.sortOrder,
                  active: product.active,
                }, product.code)}
              >
                <Save size={16} /> Save product
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="as-section">
        <h2>Plans</h2>
        <div className="as-plan-list">
          {(data.plans || []).map((plan) => (
            <article className="as-panel as-plan-panel" key={plan.id}>
              <div className="as-plan-head">
                <div>
                  <span>{plan.id}</span>
                  <h3>{plan.title}</h3>
                </div>
                <div className="as-price-pill">{centsToMoney(plan.priceCents, plan.currency)}</div>
              </div>
              <div className="as-grid as-grid--3">
                <Field label="Internal name"><input value={plan.internalName || ''} onChange={(event) => updateCollection('plans', 'id', plan.id, 'internalName', event.target.value)} /></Field>
                <Field label="Public title"><input value={plan.title || ''} onChange={(event) => updateCollection('plans', 'id', plan.id, 'title', event.target.value)} /></Field>
                <Field label="Product type">
                  <select value={plan.productType} onChange={(event) => updateCollection('plans', 'id', plan.id, 'productType', event.target.value)}>
                    <option value="player">Player</option>
                    <option value="streamer">Streamer</option>
                  </select>
                </Field>
                <Field label="Price cents"><input type="number" min="1" value={plan.priceCents || 0} onChange={(event) => updateCollection('plans', 'id', plan.id, 'priceCents', Number(event.target.value))} /></Field>
                <Field label="Currency"><input value={plan.currency || 'EUR'} onChange={(event) => updateCollection('plans', 'id', plan.id, 'currency', event.target.value.toUpperCase())} /></Field>
                <Field label="Billing interval">
                  <select value={plan.billingInterval} onChange={(event) => updateCollection('plans', 'id', plan.id, 'billingInterval', event.target.value)}>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </Field>
                <Field label="Interval count"><input type="number" min="1" value={plan.intervalCount || 1} onChange={(event) => updateCollection('plans', 'id', plan.id, 'intervalCount', Number(event.target.value))} /></Field>
                <Field label="Badge"><input value={plan.badge || ''} onChange={(event) => updateCollection('plans', 'id', plan.id, 'badge', event.target.value)} /></Field>
                <Field label="Monthly equivalent cents"><input type="number" value={plan.monthlyEquivalentCents || ''} onChange={(event) => updateCollection('plans', 'id', plan.id, 'monthlyEquivalentCents', event.target.value ? Number(event.target.value) : null)} /></Field>
              </div>
              <Field label="Description"><textarea value={plan.description || ''} onChange={(event) => updateCollection('plans', 'id', plan.id, 'description', event.target.value)} /></Field>
              <Field label="Savings label"><input value={plan.savingsLabel || ''} onChange={(event) => updateCollection('plans', 'id', plan.id, 'savingsLabel', event.target.value)} /></Field>
              <Field label="Inclusion line"><input value={plan.inclusionText || ''} onChange={(event) => updateCollection('plans', 'id', plan.id, 'inclusionText', event.target.value)} /></Field>
              <div className="as-grid as-grid--3">
                <Field label="Provider product ID"><input value={plan.providerProductId || ''} onChange={(event) => updateCollection('plans', 'id', plan.id, 'providerProductId', event.target.value)} /></Field>
                <Field label="Provider price ID"><input value={plan.providerPriceId || ''} onChange={(event) => updateCollection('plans', 'id', plan.id, 'providerPriceId', event.target.value)} /></Field>
                <Field label="Sort order"><input type="number" value={plan.sortOrder || 0} onChange={(event) => updateCollection('plans', 'id', plan.id, 'sortOrder', Number(event.target.value))} /></Field>
              </div>
              <div className="as-plan-meta">
                <span>Provider price: {plan.providerPriceId || 'Mollie amount per subscription'}</span>
                <span>Matches website price: {plan.providerPriceMatches ? 'Yes' : 'Check provider'}</span>
                <span>Active subscribers using this plan: {plan.activeSubscriberCount || 0}</span>
                <span>Price changes affect new subscribers only.</span>
              </div>
              <div className="as-check-row">
                <label className="as-check"><input type="checkbox" checked={!!plan.recommended} onChange={(event) => updateCollection('plans', 'id', plan.id, 'recommended', event.target.checked)} /> Recommended</label>
                <label className="as-check"><input type="checkbox" checked={!!plan.active} onChange={(event) => updateCollection('plans', 'id', plan.id, 'active', event.target.checked)} /> Active</label>
              </div>
              <button
                type="button"
                className="as-primary-btn"
                disabled={savingKey === plan.id}
                onClick={() => saveEntity('plan', plan.id, {
                  internal_name: plan.internalName,
                  public_title: plan.title,
                  description: plan.description,
                  product_type_code: plan.productType,
                  product_code: plan.productType === 'player' ? 'player_bonus_hunt' : 'streamer_premium',
                  price_cents: plan.priceCents,
                  currency: plan.currency,
                  billing_interval: plan.billingInterval,
                  interval_count: plan.intervalCount,
                  badge: plan.badge || null,
                  savings_label: plan.savingsLabel || null,
                  monthly_equivalent_cents: plan.monthlyEquivalentCents || null,
                  inclusion_text: plan.inclusionText,
                  recommended: plan.recommended,
                  sort_order: plan.sortOrder,
                  active: plan.active,
                  provider_product_id: plan.providerProductId || null,
                  provider_price_id: plan.providerPriceId || null,
                }, plan.id)}
              >
                <Save size={16} /> Save plan
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="as-section">
        <h2>Page content</h2>
        <article className="as-panel">
          <div className="as-grid as-grid--2">
            <Field label="Hero heading"><input value={contentDraft.hero_heading || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, hero_heading: event.target.value }))} /></Field>
            <Field label="Hero description"><textarea value={contentDraft.hero_description || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, hero_description: event.target.value }))} /></Field>
            <Field label="Trial heading"><input value={contentDraft.trial_heading || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, trial_heading: event.target.value }))} /></Field>
            <Field label="Trial description"><textarea value={contentDraft.trial_description || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, trial_description: event.target.value }))} /></Field>
            <Field label="Trial supporting"><textarea value={contentDraft.trial_supporting || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, trial_supporting: event.target.value }))} /></Field>
            <Field label="Trust labels"><textarea value={contentDraft.trust_labels_text ?? arrayToText(contentDraft.trust_labels)} onChange={(event) => setContentDraft((draft) => ({ ...draft, trust_labels_text: event.target.value }))} /></Field>
            <Field label="Primary CTA"><input value={contentDraft.primary_cta || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, primary_cta: event.target.value }))} /></Field>
            <Field label="Secondary CTA"><input value={contentDraft.secondary_cta || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, secondary_cta: event.target.value }))} /></Field>
            <Field label="Player section title"><input value={contentDraft.player_section_title || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, player_section_title: event.target.value }))} /></Field>
            <Field label="Player section description"><textarea value={contentDraft.player_section_description || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, player_section_description: event.target.value }))} /></Field>
            <Field label="Streamer section title"><input value={contentDraft.streamer_section_title || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, streamer_section_title: event.target.value }))} /></Field>
            <Field label="Streamer section description"><textarea value={contentDraft.streamer_section_description || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, streamer_section_description: event.target.value }))} /></Field>
            <Field label="FAQ title"><input value={contentDraft.faq_title || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, faq_title: event.target.value }))} /></Field>
            <Field label="Legal note"><textarea value={contentDraft.legal_note || ''} onChange={(event) => setContentDraft((draft) => ({ ...draft, legal_note: event.target.value }))} /></Field>
          </div>
          <Field label="FAQ JSON">
            <textarea className="as-code-textarea" value={typeof contentDraft.faq === 'string' ? contentDraft.faq : JSON.stringify(contentDraft.faq || [], null, 2)} onChange={(event) => setContentDraft((draft) => ({ ...draft, faq: event.target.value }))} />
          </Field>
          <Field label="Comparison rows JSON">
            <textarea className="as-code-textarea" value={typeof contentDraft.comparison_rows === 'string' ? contentDraft.comparison_rows : JSON.stringify(contentDraft.comparison_rows || [], null, 2)} onChange={(event) => setContentDraft((draft) => ({ ...draft, comparison_rows: event.target.value }))} />
          </Field>
          <button type="button" className="as-primary-btn" disabled={savingKey === 'page-content'} onClick={saveContent}><Save size={16} /> Save page content</button>
        </article>
      </section>

      <section className="as-section">
        <h2>Features</h2>
        <div className="as-grid as-grid--2">
          {(data.features || []).map((feature) => (
            <article className="as-panel" key={feature.id}>
              <Field label="Feature title"><input value={feature.title || ''} onChange={(event) => updateCollection('features', 'id', feature.id, 'title', event.target.value)} /></Field>
              <Field label="Description"><textarea value={feature.description || ''} onChange={(event) => updateCollection('features', 'id', feature.id, 'description', event.target.value)} /></Field>
              <div className="as-form-row">
                <Field label="Icon"><input value={feature.icon || ''} onChange={(event) => updateCollection('features', 'id', feature.id, 'icon', event.target.value)} /></Field>
                <Field label="Sort order"><input type="number" value={feature.sortOrder || 0} onChange={(event) => updateCollection('features', 'id', feature.id, 'sortOrder', Number(event.target.value))} /></Field>
              </div>
              <div className="as-check-row">
                <label className="as-check"><input type="checkbox" checked={!!feature.playerAvailable} onChange={(event) => updateCollection('features', 'id', feature.id, 'playerAvailable', event.target.checked)} /> Player</label>
                <label className="as-check"><input type="checkbox" checked={!!feature.streamerAvailable} onChange={(event) => updateCollection('features', 'id', feature.id, 'streamerAvailable', event.target.checked)} /> Streamer</label>
                <label className="as-check"><input type="checkbox" checked={!!feature.active} onChange={(event) => updateCollection('features', 'id', feature.id, 'active', event.target.checked)} /> Active</label>
              </div>
              <button
                type="button"
                className="as-primary-btn"
                disabled={savingKey === feature.id}
                onClick={() => saveEntity('feature', feature.id, {
                  title: feature.title,
                  description: feature.description,
                  icon: feature.icon,
                  player_available: feature.playerAvailable,
                  streamer_available: feature.streamerAvailable,
                  sort_order: feature.sortOrder,
                  active: feature.active,
                }, feature.id)}
              >
                <Save size={16} /> Save feature
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}