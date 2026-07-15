import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import BonusForm from './BonusForm';
import SlotThumb from './SlotThumb';
import { createHunt } from './playerBonusHuntService';
import { formatMoney } from './format';
import { NEW_HUNT_DRAFT_CACHE_KEY, readPlayerCache, removePlayerCache, writePlayerCache } from './clientCache';
import './PlayerBonusHunt.css';

const today = new Date().toISOString().slice(0, 10);
const DEFAULT_FORM = {
  name: '',
  casino_name: '',
  currency: 'EUR',
  starting_deposit: '',
  stop_loss: '',
  initial_withdrawal: '',
  hunt_date: today,
  notes: '',
};

const bonusTypeLabel = (value) => ({
  normal: 'Normal',
  super: 'Super',
  supreme: 'Extreme',
}[value] || 'Normal');

function readNewHuntDraft() {
  const cached = readPlayerCache(NEW_HUNT_DRAFT_CACHE_KEY);
  return {
    form: { ...DEFAULT_FORM, ...(cached?.form || {}) },
    bonuses: Array.isArray(cached?.bonuses) ? cached.bonuses : [],
    showBonusForm: Boolean(cached?.showBonusForm),
  };
}

export default function PlayerBonusHuntNew() {
  const navigate = useNavigate();
  const [cachedDraft] = useState(readNewHuntDraft);
  const [form, setForm] = useState(cachedDraft.form);
  const [bonuses, setBonuses] = useState(cachedDraft.bonuses);
  const [showBonusForm, setShowBonusForm] = useState(cachedDraft.showBonusForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    writePlayerCache(NEW_HUNT_DRAFT_CACHE_KEY, { form, bonuses, showBonusForm });
  }, [form, bonuses, showBonusForm]);

  const addBonus = (bonus) => {
    setBonuses((prev) => [...prev, { ...bonus, position: prev.length }]);
    setShowBonusForm(true);
  };

  const removeBonus = (index) => {
    setBonuses((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await createHunt({
        ...form,
        starting_deposit: Number(form.starting_deposit || 0),
        stop_loss: Number(form.stop_loss || 0),
        initial_withdrawal: Number(form.initial_withdrawal || 0),
        current_balance: Number(form.starting_deposit || 0) - Number(form.initial_withdrawal || 0),
        bonuses,
      });
      removePlayerCache(NEW_HUNT_DRAFT_CACHE_KEY);
      removePlayerCache(`${NEW_HUNT_DRAFT_CACHE_KEY}.bonusForm`);
      navigate(`/player/bonus-hunt/${result.hunt.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="pbh-page">
      <header className="pbh-header">
        <div>
          <span className="pbh-eyebrow">New session</span>
          <h1>Start a Bonus Hunt</h1>
          <p>Set the money in, choose a date, then add bonuses now or later.</p>
        </div>
        <Link to="/player/bonus-hunt" className="pbh-btn pbh-btn--ghost">Back to dashboard</Link>
      </header>

      {error && <div className="pbh-alert pbh-alert--error">{error}</div>}

      <section className="pbh-panel">
        <form className="pbh-form pbh-form--hunt-setup" onSubmit={submit}>
          <label className="pbh-field">
            <span>Hunt name</span>
            <input value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Friday bonus hunt" maxLength={120} required />
          </label>
          <label className="pbh-field">
            <span>Casino or platform</span>
            <input value={form.casino_name} onChange={(event) => set('casino_name', event.target.value)} placeholder="Optional" maxLength={120} />
          </label>
          <label className="pbh-field">
            <span>Currency</span>
            <select value={form.currency} onChange={(event) => set('currency', event.target.value)}>
              {['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'BRL', 'NOK', 'SEK', 'DKK', 'PLN'].map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </label>
          <label className="pbh-field">
            <span>Hunt date</span>
            <input type="date" value={form.hunt_date} onChange={(event) => set('hunt_date', event.target.value)} required />
          </label>
          <label className="pbh-field">
            <span>Starting deposit</span>
            <input type="number" min="0" step="0.01" value={form.starting_deposit} onChange={(event) => set('starting_deposit', event.target.value)} required />
          </label>
          <label className="pbh-field">
            <span>Stop loss</span>
            <input type="number" min="0" step="0.01" value={form.stop_loss} onChange={(event) => set('stop_loss', event.target.value)} placeholder="0.00" />
          </label>
          <label className="pbh-field">
            <span>Initial withdrawal</span>
            <input type="number" min="0" step="0.01" value={form.initial_withdrawal} onChange={(event) => set('initial_withdrawal', event.target.value)} />
          </label>
          <label className="pbh-field pbh-field--wide">
            <span>Notes</span>
            <textarea value={form.notes} onChange={(event) => set('notes', event.target.value)} rows={4} maxLength={2000} placeholder="Optional private notes" />
          </label>

          <div className="pbh-form__actions pbh-form__actions--split">
            <button type="button" className="pbh-btn pbh-btn--secondary" onClick={() => setShowBonusForm(true)}>
              <Plus size={17} /> Add starting bonus
            </button>
            <button type="submit" className="pbh-btn pbh-btn--primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create hunt'}
            </button>
          </div>
        </form>
      </section>

      {showBonusForm && (
        <section className="pbh-panel">
          <div className="pbh-section-head">
            <div>
              <h2>Add a bonus</h2>
              <p>This bonus will be created with the new hunt.</p>
            </div>
          </div>
          <BonusForm
            onSubmit={addBonus}
            onCancel={() => setShowBonusForm(false)}
            submitLabel="Add to hunt"
            autoFocus
            resetAfterSubmit
            cacheKey={`${NEW_HUNT_DRAFT_CACHE_KEY}.bonusForm`}
          />
        </section>
      )}

      {bonuses.length > 0 && (
        <section className="pbh-panel">
          <div className="pbh-section-head">
            <div>
              <h2>Starting bonuses</h2>
              <p>{bonuses.length} bonus{bonuses.length === 1 ? '' : 'es'} ready.</p>
            </div>
          </div>
          <div className="pbh-mini-list">
            {bonuses.map((bonus, index) => (
              <div key={`${bonus.slot_name}-${index}`} className="pbh-mini-row">
                <SlotThumb src={bonus.slot_image_url} name={bonus.slot_name} size="sm" />
                <div>
                  <strong>{bonus.slot_name}</strong>
                  <span>{bonus.provider_name || 'Unknown provider'}</span>
                </div>
                <span className={`pbh-type-pill pbh-type-pill--${bonus.bonus_type || 'normal'}`}>{bonusTypeLabel(bonus.bonus_type)}</span>
                <span>{formatMoney(bonus.bonus_cost, form.currency)} - Bet {formatMoney(bonus.bet_size, form.currency)}</span>
                <button className="pbh-icon-btn pbh-icon-btn--danger" onClick={() => removeBonus(index)} title="Remove bonus">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
