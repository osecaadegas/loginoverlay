import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { searchSlots } from './playerBonusHuntService';
import SlotThumb from './SlotThumb';

const EMPTY = {
  slot_name: '',
  provider_name: '',
  slot_image_url: '',
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
    if (!slotQuery || slotQuery.trim().length < 2) {
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
  const selectSlot = (slot) => {
    setForm((prev) => ({
      ...prev,
      slot_id: slot.id || null,
      slot_name: slot.name,
      provider_name: slot.provider || '',
      slot_image_url: slot.image || '',
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
            onChange={(event) => {
              setSlotQuery(event.target.value);
              set('slot_name', event.target.value);
            }}
            placeholder="Search slot library"
            required
          />
        </div>
        {slotResults.length > 0 && (
          <div className="pbh-slot-results">
            {slotResults.map((slot) => (
              <button type="button" key={slot.id} onClick={() => selectSlot(slot)}>
                <SlotThumb src={slot.image} name={slot.name} size="sm" />
                <span>{slot.name}</span>
                <small>{slot.provider}</small>
              </button>
            ))}
          </div>
        )}
        {searching && <small className="pbh-field__hint">Searching slot database...</small>}
      </label>

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
