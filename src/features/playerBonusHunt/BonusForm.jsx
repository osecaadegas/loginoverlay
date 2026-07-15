import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { searchSlots } from './playerBonusHuntService';
import SlotThumb from './SlotThumb';
import { formatMaxWin, formatRtp, formatVolatility } from './format';
import { formatAutoDecimalInput } from './inputFormat';
import { readPlayerCache, removePlayerCache, writePlayerCache } from './clientCache';
import { getProviderImage } from '../../utils/gameProviders';

const EMPTY = {
  slot_name: '',
  provider_name: '',
  slot_image_url: '',
  slot_rtp: null,
  slot_volatility: null,
  slot_max_win_multiplier: null,
  slot_theme: '',
  slot_features: [],
  bonus_type: 'normal',
  bonus_cost: '',
  bet_size: '',
};

function LockedProvider({ provider }) {
  const [failed, setFailed] = useState(false);
  const label = provider || 'Select a library slot';
  const logo = provider && !failed ? getProviderImage(provider) : null;

  useEffect(() => {
    setFailed(false);
  }, [provider]);

  return (
    <div className={`pbh-provider-locked${provider ? '' : ' pbh-provider-locked--empty'}`} aria-label={`Provider: ${label}`}>
      {logo ? (
        <span className="pbh-provider-logo pbh-provider-logo--locked" title={provider}>
          <img src={logo} alt={`${provider} logo`} onError={() => setFailed(true)} />
        </span>
      ) : (
        <span className="pbh-provider-logo pbh-provider-logo--text pbh-provider-logo--locked-text">{label}</span>
      )}
    </div>
  );
}

export default function BonusForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save bonus',
  autoFocus = false,
  resetAfterSubmit = false,
  cacheKey = '',
}) {
  const readCachedForm = () => cacheKey ? readPlayerCache(cacheKey) : null;
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(readCachedForm()?.form || {}), ...(initial || {}) }));
  const [slotQuery, setSlotQuery] = useState(() => readCachedForm()?.slotQuery || initial?.slot_name || '');
  const [slotResults, setSlotResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const slotInputRef = useRef(null);

  useEffect(() => {
    const cached = readCachedForm();
    setForm({ ...EMPTY, ...(cached?.form || {}), ...(initial || {}) });
    setSlotQuery(cached?.slotQuery || initial?.slot_name || '');
  }, [initial, cacheKey]);

  useEffect(() => {
    if (!cacheKey) return;
    writePlayerCache(cacheKey, { form, slotQuery });
  }, [cacheKey, form, slotQuery]);

  useEffect(() => {
    if (!autoFocus) return;
    window.setTimeout(() => slotInputRef.current?.focus(), 0);
  }, [autoFocus]);

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
      provider_name: '',
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

  const selectedType = form.bonus_type || 'normal';
  const toggleType = (type) => set('bonus_type', selectedType === type ? 'normal' : type);

  const resetForNextBonus = () => {
    removePlayerCache(cacheKey);
    setForm({ ...EMPTY });
    setSlotQuery('');
    setSlotResults([]);
    window.setTimeout(() => slotInputRef.current?.focus(), 0);
  };

  const submit = (event) => {
    event.preventDefault();
    const setupFields = { ...form };
    delete setupFields.opened_at;
    delete setupFields.payout;
    delete setupFields.multiplier;
    delete setupFields.profit_loss;
    delete setupFields.status;
    delete setupFields.notes;
    const payload = {
      ...setupFields,
      slot_name: setupFields.slot_name || slotQuery,
      bonus_type: setupFields.bonus_type || 'normal',
      bonus_cost: Number(setupFields.bonus_cost || 0),
      bet_size: Number(setupFields.bet_size || 0),
    };
    const result = onSubmit(payload);
    if (resetAfterSubmit) {
      Promise.resolve(result).then(resetForNextBonus).catch(() => {});
    }
  };

  return (
    <form className="pbh-form pbh-bonus-form" onSubmit={submit}>
      <label className="pbh-field pbh-field--search">
        <span>Slot name</span>
        <div className="pbh-searchbox">
          <Search size={16} />
          <input
            ref={slotInputRef}
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
                  <small>Slot library</small>
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

      {(form.slot_rtp || form.slot_max_win_multiplier || form.slot_volatility) && (
        <div className="pbh-selected-slot-meta">
          <span>RTP <strong>{formatRtp(form.slot_rtp)}</strong></span>
          <span>Max win <strong>{formatMaxWin(form.slot_max_win_multiplier)}</strong></span>
          <span>Volatility <strong>{formatVolatility(form.slot_volatility)}</strong></span>
        </div>
      )}

      <label className="pbh-field">
        <span>Provider</span>
        <LockedProvider provider={form.provider_name} />
      </label>
      <label className="pbh-field">
        <span>Bonus cost</span>
        <input type="number" min="0" step="0.01" value={form.bonus_cost ?? ''} onChange={(event) => set('bonus_cost', event.target.value)} />
      </label>
      <label className="pbh-field">
        <span>Bet size</span>
        <input
          type="text"
          inputMode="decimal"
          value={form.bet_size ?? ''}
          onChange={(event) => set('bet_size', formatAutoDecimalInput(event.target.value))}
          placeholder="0.20"
        />
      </label>
      <div className="pbh-form__actions pbh-form__actions--bonus">
        {onCancel && <button type="button" className="pbh-btn pbh-btn--ghost" onClick={onCancel}>Cancel</button>}
        <div className="pbh-bonus-type-buttons" role="group" aria-label="Bonus type">
          <button
            type="button"
            className={`pbh-type-toggle pbh-type-toggle--super${selectedType === 'super' ? ' active' : ''}`}
            onClick={() => toggleType('super')}
            aria-pressed={selectedType === 'super'}
          >
            Super
          </button>
          <button
            type="button"
            className={`pbh-type-toggle pbh-type-toggle--extreme${selectedType === 'supreme' ? ' active' : ''}`}
            onClick={() => toggleType('supreme')}
            aria-pressed={selectedType === 'supreme'}
          >
            Extreme
          </button>
        </div>
        <button type="submit" className="pbh-btn pbh-btn--primary">{submitLabel}</button>
      </div>
    </form>
  );
}
