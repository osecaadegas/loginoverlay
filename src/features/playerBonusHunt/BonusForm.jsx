import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { searchSlots } from './playerBonusHuntService';
import SlotThumb from './SlotThumb';
import { formatMaxWin, formatRtp, formatVolatility } from './format';

const EMPTY = {
  slot_name: '',
  provider_name: '',
  slot_image_url: '',
  slot_rtp: null,
  slot_volatility: null,
  slot_max_win_multiplier: null,
  slot_theme: '',
  slot_features: [],
  bonus_cost: '',
  bet_size: '',
  payout: '',
  status: 'unopened',
  notes: '',
};

export default function BonusForm({ initial, onSubmit, onCancel, submitLabel = 'Save bonus' }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) });
  const [slotQuery, setSlotQuery] = useState(initial?.slot_name || '');
  const [slotResults, setSlotResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setForm({ ...EMPTY, ...(initial || {}) });
    setSlotQuery(initial?.slot_name || '');
  }, [initial]);

  useEffect(() => {
    if (!slotQuery || slotQuery.trim().length < 3) {
      setSlotResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchSlots(slotQuery.trim());
        setSlotResults(data.slots || []);
      } catch {
        setSlotResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [slotQuery]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setSlotText = (value) => {
    setSlotQuery(value);
    setForm((prev) => ({
      ...prev,
      slot_id: null,
      slot_name: value,
      slot_image_url: '',
      slot_rtp: null,
      slot_volatility: null,
      slot_max_win_multiplier: null,
      slot_theme: '',
      slot_features: [],
    }));
  };

  const selectSlot = (slot) => {
    setForm((prev) => ({
      ...prev,
      slot_id: slot.id || null,
      slot_name: slot.name,
      provider_name: slot.provider || '',
      slot_image_url: slot.image || '',
      slot_rtp: slot.rtp ?? null,
      slot_volatility: slot.volatility || null,
      slot_max_win_multiplier: slot.max_win_multiplier ?? null,
      slot_theme: slot.theme || '',
      slot_features: Array.isArray(slot.features) ? slot.features : [],
    }));
    setSlotQuery(slot.name);
    setSlotResults([]);
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      slot_name: form.slot_name || slotQuery,
      bonus_cost: Number(form.bonus_cost || 0),
      bet_size: Number(form.bet_size || 0),
      payout: Number(form.payout || 0),
    });
  };

  return (
    <form className="pbh-form pbh-bonus-form" onSubmit={submit}>
      <label className="pbh-field pbh-field--search">
        <span>Slot name</span>
        <div className="pbh-searchbox">
          <Search size={16} />
          <input
            value={slotQuery}
            onChange={(event) => setSlotText(event.target.value)}
            placeholder="Search slot library"
            required
          />
        </div>
        {slotResults.length > 0 && (
          <div className="pbh-slot-results">
            {slotResults.map((slot) => (
              <button type="button" key={slot.id} onClick={() => selectSlot(slot)}>
                <SlotThumb src={slot.image} name={slot.name} size="sm" />
                <span className="pbh-slot-result-name">
                  <strong>{slot.name}</strong>
                  <small>{slot.theme || 'Slot library'}</small>
                </span>
                <small>{slot.provider || 'Unknown provider'}</small>
                <small>{formatRtp(slot.rtp)}</small>
                <small>{formatMaxWin(slot.max_win_multiplier)}</small>
                <small>{formatVolatility(slot.volatility)}</small>
              </button>
            ))}
          </div>
        )}
        {searching && <small className="pbh-field__hint">Searching slot database...</small>}
        {!searching && slotQuery.trim().length > 0 && slotQuery.trim().length < 3 && (
          <small className="pbh-field__hint">Type at least 3 letters for database suggestions.</small>
        )}
      </label>

      {(form.slot_rtp || form.slot_max_win_multiplier || form.slot_volatility || form.slot_theme) && (
        <div className="pbh-selected-slot-meta">
          <span>RTP <strong>{formatRtp(form.slot_rtp)}</strong></span>
          <span>Max win <strong>{formatMaxWin(form.slot_max_win_multiplier)}</strong></span>
          <span>Volatility <strong>{formatVolatility(form.slot_volatility)}</strong></span>
          {form.slot_theme && <span>Theme <strong>{form.slot_theme}</strong></span>}
        </div>
      )}

      <label className="pbh-field">
        <span>Provider</span>
        <input value={form.provider_name || ''} onChange={(event) => set('provider_name', event.target.value)} placeholder="Optional" />
      </label>
      <label className="pbh-field">
        <span>Bonus cost</span>
        <input type="number" min="0" step="0.01" value={form.bonus_cost ?? ''} onChange={(event) => set('bonus_cost', event.target.value)} />
      </label>
      <label className="pbh-field">
        <span>Bet size</span>
        <input type="number" min="0" step="0.01" value={form.bet_size ?? ''} onChange={(event) => set('bet_size', event.target.value)} />
      </label>
      <label className="pbh-field">
        <span>Payout</span>
        <input type="number" min="0" step="0.01" value={form.payout ?? ''} onChange={(event) => set('payout', event.target.value)} />
      </label>
      <label className="pbh-field">
        <span>Status</span>
        <select value={form.status || 'unopened'} onChange={(event) => set('status', event.target.value)}>
          <option value="unopened">Unopened</option>
          <option value="opened">Opened</option>
        </select>
      </label>
      <label className="pbh-field pbh-field--wide">
        <span>Notes</span>
        <textarea value={form.notes || ''} onChange={(event) => set('notes', event.target.value)} rows={3} maxLength={1200} />
      </label>
      <div className="pbh-form__actions">
        {onCancel && <button type="button" className="pbh-btn pbh-btn--ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="pbh-btn pbh-btn--primary">{submitLabel}</button>
      </div>
    </form>
  );
}
