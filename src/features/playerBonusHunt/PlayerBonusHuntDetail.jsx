import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowRight, CheckCircle2, CircleDollarSign, Edit2, Plus, Save, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import BonusForm from './BonusForm';
import SlotThumb from './SlotThumb';
import {
  addBonus,
  archiveHunt,
  deleteBonus,
  deleteHunt,
  downloadPlayerExport,
  getHunt,
  searchSlots,
  updateBonus,
  updateHunt,
} from './playerBonusHuntService';
import { calculateBonusMultiplier, calculateHuntStatistics, roundMoney } from './domain.js';
import { formatDate, formatMaxWin, formatMoney, formatMultiplier, formatRtp, formatSignedMoney, formatVolatility } from './format';
import { formatAutoDecimalInput } from './inputFormat';
import { getProviderImage } from '../../utils/gameProviders';
import './PlayerBonusHunt.css';

const BONUS_TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'super', label: 'Super' },
  { value: 'supreme', label: 'Extreme' },
];

const BONUS_TYPE_ORDER = {
  normal: 0,
  super: 1,
  supreme: 2,
};

function bonusTypeLabel(value) {
  return BONUS_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Normal';
}

function SummaryStrip({ stats, currency }) {
  const items = [
    ['Target', formatMoney(stats.target ?? stats.breakEven, currency), 'Deposits minus stop loss'],
    ['Break even', formatMoney(stats.breakEven, currency), 'Same value as target'],
    ['Remaining', formatMoney(stats.remainingBreakEven, currency), 'Target minus opened payouts'],
    ['Profit / Loss', formatSignedMoney(stats.profitLoss, currency), 'Opened payouts minus target'],
    ['Total payout', formatMoney(stats.totalPayout, currency), 'Opened bonuses only'],
    ['Average needed', formatMoney(stats.requiredAveragePayout, currency), `${formatMultiplier(stats.requiredAverageMultiplier)} required`],
  ];
  return (
    <div className="pbh-summary-strip">
      {items.map(([label, value, detail]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{detail}</small>
        </div>
      ))}
    </div>
  );
}

function MathLine({ label, formula, value, tone }) {
  return (
    <div className={`pbh-math-line ${tone ? `pbh-math-line--${tone}` : ''}`}>
      <span>{label}</span>
      <code>{formula}</code>
      <strong>{value}</strong>
    </div>
  );
}

function MathematicsPanel({ stats, currency }) {
  const target = stats.target ?? stats.breakEven;
  const profitTone = stats.profitLoss >= 0 ? 'positive' : 'negative';
  const remainingBonuses = stats.remainingBonuses || 0;
  const liveBreakEven = stats.liveBreakEvenMultiplier ?? stats.requiredAverageMultiplier;
  return (
    <div className="pbh-math-panel" aria-label="Bonus hunt mathematics">
      <div className="pbh-math-panel__head">
        <div>
          <span className="pbh-eyebrow">Mathematics</span>
          <h3>Streamer formula</h3>
        </div>
        <p>Target uses the same formula as the streamer tracker: total deposits minus stop loss.</p>
      </div>
      <div className="pbh-math-grid">
        <MathLine
          label="Target"
          formula={`${formatMoney(stats.totalDeposits, currency)} - ${formatMoney(stats.stopLoss, currency)}`}
          value={formatMoney(target, currency)}
        />
        <MathLine
          label="Profit / Loss"
          formula={`${formatMoney(stats.totalPayout, currency)} - ${formatMoney(target, currency)}`}
          value={formatSignedMoney(stats.profitLoss, currency)}
          tone={profitTone}
        />
        <MathLine
          label="Remaining"
          formula={`${formatMoney(target, currency)} - ${formatMoney(stats.totalPayout, currency)}`}
          value={formatMoney(stats.remainingBreakEven, currency)}
        />
        <MathLine
          label="Live BE x"
          formula={`${formatMoney(stats.remainingBreakEven, currency)} / ${formatMoney(stats.remainingBet, currency)} unopened bet`}
          value={formatMultiplier(liveBreakEven)}
        />
        <MathLine
          label="Average needed"
          formula={`${formatMoney(stats.remainingBreakEven, currency)} / ${remainingBonuses} unopened bonuses`}
          value={formatMoney(stats.requiredAveragePayout, currency)}
        />
      </div>
    </div>
  );
}

function BonusTypePill({ type }) {
  const value = type || 'normal';
  return <span className={`pbh-type-pill pbh-type-pill--${value}`}>{bonusTypeLabel(value)}</span>;
}

function ProviderLogo({ provider, className = '' }) {
  const [failed, setFailed] = useState(false);
  const logo = !failed ? getProviderImage(provider) : null;
  const label = provider || 'Unknown provider';

  useEffect(() => {
    setFailed(false);
  }, [provider]);

  if (logo) {
    return (
      <span className={`pbh-provider-logo ${className}`} title={label}>
        <img src={logo} alt={`${label} logo`} onError={() => setFailed(true)} />
      </span>
    );
  }

  return <span className={`pbh-provider-logo pbh-provider-logo--text ${className}`} title={label}>{label}</span>;
}

function LockedProvider({ provider }) {
  const label = provider || 'Select a library slot';
  return (
    <div className={`pbh-provider-locked${provider ? '' : ' pbh-provider-locked--empty'}`} aria-label={`Provider: ${label}`}>
      {provider ? (
        <ProviderLogo provider={provider} className="pbh-provider-logo--locked" />
      ) : (
        <span className="pbh-provider-logo pbh-provider-logo--text pbh-provider-logo--locked-text">{label}</span>
      )}
    </div>
  );
}

function PayoutInput({ bonus, value, saving, onChange, onSave, onKeyDown }) {
  const isDirty = value !== (bonus.status === 'opened' ? String(bonus.payout ?? '') : '');
  return (
    <div className="pbh-payout-cell">
      <input
        className="pbh-payout-input"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        data-payout-id={bonus.id}
        onChange={(event) => onChange(bonus.id, event.target.value)}
        onBlur={(event) => onSave(bonus, event.target.value)}
        onKeyDown={(event) => onKeyDown(event, bonus)}
        placeholder="0.00"
      />
      <button
        type="button"
        className="pbh-icon-btn pbh-icon-btn--compact"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onSave(bonus, value)}
        disabled={saving || !isDirty}
        title="Save payout"
      >
        <Save size={15} />
      </button>
    </div>
  );
}

function getOpeningMetrics(bonus, payoutValue) {
  const raw = String(payoutValue ?? '').trim();
  if (!raw) return { hasPayout: false, multiplier: null, profit: null };
  const payout = Number(raw);
  if (!Number.isFinite(payout) || payout < 0) return { hasPayout: false, multiplier: null, profit: null };
  return {
    hasPayout: true,
    multiplier: calculateBonusMultiplier({ ...bonus, payout }),
    profit: roundMoney(payout - Number(bonus.bonus_cost || 0)),
  };
}

function BonusRow({
  bonus,
  currency,
  phase,
  payoutValue,
  payoutSaving,
  onPayoutChange,
  onPayoutSave,
  onPayoutKeyDown,
  onEdit,
  onDelete,
}) {
  const isOpening = phase === 'opening';
  const openingMetrics = isOpening ? getOpeningMetrics(bonus, payoutValue) : null;
  const hasResult = isOpening ? openingMetrics.hasPayout : bonus.status === 'opened';
  const profit = isOpening ? openingMetrics.profit : Number(bonus.profit_loss || 0);
  return (
    <tr className={hasResult ? 'pbh-row--opened' : ''}>
      <td>
        <div className="pbh-slot-cell">
          <SlotThumb src={bonus.slot_image_url} name={bonus.slot_name} size="sm" />
          <div>
            <strong>{bonus.slot_name}</strong>
            <ProviderLogo provider={bonus.provider_name} className="pbh-provider-logo--inline" />
          </div>
        </div>
      </td>
      {isOpening ? (
        <>
          <td><BonusTypePill type={bonus.bonus_type} /></td>
          <td>{formatMoney(bonus.bonus_cost, currency)}</td>
          <td>{formatMoney(bonus.bet_size, currency)}</td>
          <td>
            <PayoutInput
              bonus={bonus}
              value={payoutValue}
              saving={payoutSaving}
              onChange={onPayoutChange}
              onSave={onPayoutSave}
              onKeyDown={onPayoutKeyDown}
            />
          </td>
          <td>{hasResult ? formatMultiplier(openingMetrics.multiplier) : '-'}</td>
          <td className={hasResult ? (profit >= 0 ? 'pbh-positive' : 'pbh-negative') : ''}>
            {hasResult ? formatSignedMoney(profit, currency) : '-'}
          </td>
        </>
      ) : (
        <>
          <td><ProviderLogo provider={bonus.provider_name} /></td>
          <td><BonusTypePill type={bonus.bonus_type} /></td>
          <td>{formatRtp(bonus.slot_rtp)}</td>
          <td>{formatMaxWin(bonus.slot_max_win_multiplier)}</td>
          <td>{formatVolatility(bonus.slot_volatility)}</td>
          <td>{formatMoney(bonus.bonus_cost, currency)}</td>
          <td>{formatMoney(bonus.bet_size, currency)}</td>
        </>
      )}
      <td>
        <div className="pbh-actions">
          <button className="pbh-icon-btn" onClick={() => onEdit(bonus)} title="Edit bonus setup"><Edit2 size={16} /></button>
          <button className="pbh-icon-btn pbh-icon-btn--danger" onClick={() => onDelete(bonus.id)} title="Delete bonus"><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>
  );
}

function BonusCard({
  bonus,
  currency,
  phase,
  payoutValue,
  payoutSaving,
  onPayoutChange,
  onPayoutSave,
  onPayoutKeyDown,
  onEdit,
  onDelete,
}) {
  const isOpening = phase === 'opening';
  const openingMetrics = isOpening ? getOpeningMetrics(bonus, payoutValue) : null;
  const hasResult = isOpening ? openingMetrics.hasPayout : bonus.status === 'opened';
  const profit = isOpening ? openingMetrics.profit : Number(bonus.profit_loss || 0);
  return (
    <article className={`pbh-bonus-card ${hasResult ? 'pbh-bonus-card--opened' : ''}`}>
      <div className="pbh-bonus-card__top">
        <SlotThumb src={bonus.slot_image_url} name={bonus.slot_name} />
        <div>
          <BonusTypePill type={bonus.bonus_type} />
          <h3>{bonus.slot_name}</h3>
          <ProviderLogo provider={bonus.provider_name} className="pbh-provider-logo--inline" />
        </div>
      </div>
      <div className="pbh-bonus-card__grid">
        {!isOpening && (
          <>
            <span>Provider <strong><ProviderLogo provider={bonus.provider_name} /></strong></span>
            <span>RTP <strong>{formatRtp(bonus.slot_rtp)}</strong></span>
            <span>Max win <strong>{formatMaxWin(bonus.slot_max_win_multiplier)}</strong></span>
            <span>Volatility <strong>{formatVolatility(bonus.slot_volatility)}</strong></span>
          </>
        )}
        <span>Cost <strong>{formatMoney(bonus.bonus_cost, currency)}</strong></span>
        <span>Bet <strong>{formatMoney(bonus.bet_size, currency)}</strong></span>
        {isOpening && (
          <>
            <span className="pbh-bonus-card__payout">Payout
              <PayoutInput
                bonus={bonus}
                value={payoutValue}
                saving={payoutSaving}
                onChange={onPayoutChange}
                onSave={onPayoutSave}
                onKeyDown={onPayoutKeyDown}
              />
            </span>
            <span>Multi <strong>{hasResult ? formatMultiplier(openingMetrics.multiplier) : '-'}</strong></span>
            <span className={hasResult ? (profit >= 0 ? 'pbh-positive' : 'pbh-negative') : ''}>
              Result <strong>{hasResult ? formatSignedMoney(profit, currency) : '-'}</strong>
            </span>
          </>
        )}
      </div>
      <div className="pbh-actions">
        <button className="pbh-btn pbh-btn--secondary" onClick={() => onEdit(bonus)}>Edit setup</button>
        <button className="pbh-btn pbh-btn--danger" onClick={() => onDelete(bonus.id)}>Delete</button>
      </div>
    </article>
  );
}

function slotToDraft(slot) {
  return {
    slot_id: slot.id || null,
    slot_name: slot.name || '',
    provider_name: slot.provider || '',
    slot_image_url: slot.image || '',
    slot_rtp: slot.rtp ?? null,
    slot_volatility: slot.volatility || null,
    slot_max_win_multiplier: slot.max_win_multiplier ?? null,
    slot_theme: slot.theme || '',
    slot_features: Array.isArray(slot.features) ? slot.features : [],
    bonus_type: 'normal',
    bonus_cost: '',
    bet_size: '',
  };
}

function SlotCatalogSuggestions({ slots, loading, error, query, onAdd, onCustom }) {
  if (query.trim().length < 3) return null;
  return (
      <div className="pbh-catalog-suggestions">
        <div className="pbh-catalog-suggestions__head">
          <div>
            <strong>Slot database</strong>
            <span>Pick a slot to pull image, provider, RTP, max win, and volatility into this hunt.</span>
          </div>
          {loading ? <small>Searching...</small> : <button className="pbh-btn pbh-btn--ghost" onClick={onCustom}>Use typed name</button>}
        </div>
      {error && <div className="pbh-alert pbh-alert--error">{error}</div>}
      {!loading && !error && slots.length === 0 ? (
        <div className="pbh-catalog-empty">
          <span>No slot database matches for "{query}".</span>
          <button className="pbh-btn pbh-btn--ghost" onClick={onCustom}>Use typed name</button>
        </div>
      ) : (
        <div className="pbh-table-wrap">
          <table className="pbh-table pbh-catalog-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Provider</th>
                <th>RTP</th>
                <th>Max win</th>
                <th>Volatility</th>
                <th>Theme</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <td>
                    <div className="pbh-slot-cell">
                      <SlotThumb src={slot.image} name={slot.name} size="sm" />
                      <div>
                        <strong>{slot.name}</strong>
                        <span>{Array.isArray(slot.features) && slot.features.length ? slot.features.slice(0, 3).join(', ') : 'From slot library'}</span>
                      </div>
                    </div>
                  </td>
                  <td>{slot.provider || '-'}</td>
                  <td>{formatRtp(slot.rtp)}</td>
                  <td>{formatMaxWin(slot.max_win_multiplier)}</td>
                  <td>{formatVolatility(slot.volatility)}</td>
                  <td>{slot.theme || '-'}</td>
                  <td>
                    <button className="pbh-btn pbh-btn--secondary" onClick={() => onAdd(slot)}>Select</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QuickBonusEditor({ draft, setDraft, saving, onSubmit, onCancel }) {
  const set = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const selectedType = draft.bonus_type || 'normal';
  const toggleType = (type) => set('bonus_type', selectedType === type ? 'normal' : type);
  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      ...draft,
      bonus_type: draft.bonus_type || 'normal',
      bonus_cost: Number(draft.bonus_cost || 0),
      bet_size: Number(draft.bet_size || 0),
    });
  };

  return (
    <form className="pbh-quick-bonus" onSubmit={submit}>
      <div className="pbh-quick-bonus__slot">
        <SlotThumb src={draft.slot_image_url} name={draft.slot_name} />
        <div>
          <strong>{draft.slot_name}</strong>
          <ProviderLogo provider={draft.provider_name} className="pbh-provider-logo--inline" />
        </div>
      </div>

      <div className="pbh-selected-slot-meta">
        <span>RTP <strong>{formatRtp(draft.slot_rtp)}</strong></span>
        <span>Max win <strong>{formatMaxWin(draft.slot_max_win_multiplier)}</strong></span>
        <span>Volatility <strong>{formatVolatility(draft.slot_volatility)}</strong></span>
        <span>Theme <strong>{draft.slot_theme || '-'}</strong></span>
      </div>

      <div className="pbh-quick-bonus__fields">
        <label className="pbh-field">
          <span>Provider</span>
          <LockedProvider provider={draft.provider_name} />
        </label>
        <label className="pbh-field">
          <span>Bonus cost</span>
          <input type="number" min="0" step="0.01" value={draft.bonus_cost ?? ''} onChange={(event) => set('bonus_cost', event.target.value)} />
        </label>
        <label className="pbh-field">
          <span>Bet size</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.bet_size ?? ''}
            onChange={(event) => set('bet_size', formatAutoDecimalInput(event.target.value))}
            placeholder="0.20"
          />
        </label>
      </div>

      <div className="pbh-form__actions pbh-form__actions--bonus">
        <button type="button" className="pbh-btn pbh-btn--ghost" onClick={onCancel}>Cancel</button>
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
        <button type="submit" className="pbh-btn pbh-btn--primary" disabled={saving}>
          <Plus size={17} /> {saving ? 'Adding...' : 'Add to hunt'}
        </button>
      </div>
    </form>
  );
}

export default function PlayerBonusHuntDetail() {
  const { huntId } = useParams();
  const navigate = useNavigate();
  const [hunt, setHunt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingBonus, setEditingBonus] = useState(null);
  const [filter, setFilter] = useState('all');
  const [provider, setProvider] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [sort, setSort] = useState('position');
  const [bonusPhase, setBonusPhase] = useState('hunt');
  const [huntForm, setHuntForm] = useState(null);
  const [draftBonus, setDraftBonus] = useState(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [payoutDrafts, setPayoutDrafts] = useState({});
  const [savingPayoutId, setSavingPayoutId] = useState(null);
  const [showListOptions, setShowListOptions] = useState(false);
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getHunt(huntId);
      setHunt(data.hunt);
      setHuntForm(data.hunt);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateLocalBonuses = (updater) => {
    setHunt((prev) => {
      if (!prev) return prev;
      const currentBonuses = prev.bonuses || [];
      const nextBonuses = typeof updater === 'function' ? updater(currentBonuses) : updater;
      return {
        ...prev,
        bonuses: nextBonuses,
        stats: calculateHuntStatistics(prev, nextBonuses),
      };
    });
  };

  useEffect(() => {
    load();
  }, [huntId]);

  useEffect(() => {
    const q = slotSearch.trim();
    if (q.length < 3) {
      setCatalogResults([]);
      setCatalogError('');
      setCatalogLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setCatalogLoading(true);
      setCatalogError('');
      try {
        const data = await searchSlots(q);
        setCatalogResults(data.slots || []);
      } catch (err) {
        setCatalogResults([]);
        setCatalogError(err.message || 'Slot search failed.');
      } finally {
        setCatalogLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [slotSearch]);

  const bonuses = hunt?.bonuses || [];
  const stats = hunt?.stats || {};
  const currency = stats.currency || hunt?.currency || 'EUR';
  useEffect(() => {
    const next = {};
    for (const bonus of hunt?.bonuses || []) {
      next[bonus.id] = bonus.status === 'opened' ? String(bonus.payout ?? '') : '';
    }
    setPayoutDrafts(next);
  }, [hunt?.id, hunt?.bonuses]);

  const providers = useMemo(() => [...new Set(bonuses.map((bonus) => bonus.provider_name).filter(Boolean))].sort(), [bonuses]);
  const filteredBonuses = useMemo(() => {
    let rows = [...bonuses];
    if (filter === 'opened') rows = rows.filter((bonus) => bonus.status === 'opened');
    if (filter === 'unopened') rows = rows.filter((bonus) => bonus.status !== 'opened');
    if (filter === 'profitable') rows = rows.filter((bonus) => Number(bonus.profit_loss || 0) >= 0 && bonus.status === 'opened');
    if (filter === 'losing') rows = rows.filter((bonus) => Number(bonus.profit_loss || 0) < 0 && bonus.status === 'opened');
    if (provider) rows = rows.filter((bonus) => bonus.provider_name === provider);
    if (listSearch.trim()) {
      const q = listSearch.trim().toLowerCase();
      rows = rows.filter((bonus) => `${bonus.slot_name} ${bonus.provider_name || ''}`.toLowerCase().includes(q));
    }
    const sorters = {
      position: (a, b) => Number(a.position || 0) - Number(b.position || 0),
      slot: (a, b) => String(a.slot_name).localeCompare(String(b.slot_name)),
      provider: (a, b) => String(a.provider_name || '').localeCompare(String(b.provider_name || '')),
      type: (a, b) => (BONUS_TYPE_ORDER[a.bonus_type || 'normal'] ?? 0) - (BONUS_TYPE_ORDER[b.bonus_type || 'normal'] ?? 0),
      cost: (a, b) => Number(b.bonus_cost || 0) - Number(a.bonus_cost || 0),
      bet: (a, b) => Number(b.bet_size || 0) - Number(a.bet_size || 0),
      payout: (a, b) => Number(b.payout || 0) - Number(a.payout || 0),
      multiplier: (a, b) => Number(b.multiplier || 0) - Number(a.multiplier || 0),
      profit: (a, b) => Number(b.profit_loss || 0) - Number(a.profit_loss || 0),
      best: (a, b) => Number(b.payout || 0) - Number(a.payout || 0),
      worst: (a, b) => Number(a.payout || 0) - Number(b.payout || 0),
    };
    return rows.sort(sorters[sort] || sorters.position);
  }, [bonuses, filter, provider, listSearch, sort]);

  const saveHunt = async () => {
    setError('');
    setMessage('');
    try {
      const result = await updateHunt({
        huntId,
        name: huntForm.name,
        casino_name: huntForm.casino_name,
        currency: huntForm.currency,
        starting_deposit: Number(huntForm.starting_deposit || 0),
        stop_loss: Number(huntForm.stop_loss || 0),
        additional_deposits: Number(huntForm.additional_deposits || 0),
        initial_withdrawal: Number(huntForm.initial_withdrawal || 0),
        total_withdrawals: Number(huntForm.total_withdrawals || 0),
        current_balance: Number(huntForm.current_balance || 0),
        hunt_date: huntForm.hunt_date,
        notes: huntForm.notes || '',
        status: huntForm.status,
      });
      setHunt(result.hunt);
      setHuntForm(result.hunt);
      setMessage('Hunt updated.');
    } catch (err) {
      setError(err.message);
    }
  };

  const saveBonus = async (payload) => {
    setError('');
    try {
      if (editingBonus) {
        const result = await updateBonus({ ...payload, bonusId: editingBonus.id });
        updateLocalBonuses((rows) => rows.map((bonus) => bonus.id === result.bonus.id ? result.bonus : bonus));
      } else {
        const result = await addBonus({ ...payload, huntId });
        updateLocalBonuses((rows) => [...rows, result.bonus]);
      }
      setEditingBonus(null);
      setDraftBonus(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveQuickBonus = async (payload) => {
    setError('');
    setQuickSaving(true);
    try {
      const result = await addBonus({ ...payload, huntId });
      updateLocalBonuses((rows) => [...rows, result.bonus]);
      setDraftBonus(null);
      setSlotSearch('');
      setCatalogResults([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setQuickSaving(false);
    }
  };

  const setPayoutDraft = (bonusId, value) => {
    setPayoutDrafts((prev) => ({ ...prev, [bonusId]: value }));
  };

  const saveOpeningPayout = async (bonus, nextValue) => {
    const raw = String(nextValue ?? payoutDrafts[bonus.id] ?? '').trim();
    const currentRaw = bonus.status === 'opened' ? String(bonus.payout ?? '') : '';
    if (raw === currentRaw) return;

    const payload = { bonusId: bonus.id };
    if (raw === '') {
      payload.payout = 0;
      payload.status = 'unopened';
    } else {
      const payout = Number(raw);
      if (!Number.isFinite(payout) || payout < 0) {
        setError('Payout must be zero or greater.');
        return;
      }
      payload.payout = payout;
      payload.status = 'opened';
    }

    setError('');
    setSavingPayoutId(bonus.id);
    try {
      const result = await updateBonus(payload);
      updateLocalBonuses((rows) => rows.map((row) => row.id === result.bonus.id ? result.bonus : row));
      setPayoutDrafts((prev) => ({
        ...prev,
        [result.bonus.id]: result.bonus.status === 'opened' ? String(result.bonus.payout ?? '') : '',
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPayoutId(null);
    }
  };

  const handlePayoutKeyDown = (event, bonus) => {
    if (event.key === 'Escape') {
      setPayoutDraft(bonus.id, bonus.status === 'opened' ? String(bonus.payout ?? '') : '');
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const inputs = Array.from(document.querySelectorAll('.pbh-payout-input'));
    const index = inputs.indexOf(event.currentTarget);
    event.currentTarget.blur();
    window.setTimeout(() => inputs[index + 1]?.focus(), 0);
  };

  const removeBonus = async (bonusId) => {
    if (!window.confirm('Delete this bonus?')) return;
    setError('');
    try {
      await deleteBonus(bonusId);
      updateLocalBonuses((rows) => rows.filter((bonus) => bonus.id !== bonusId));
    } catch (err) {
      setError(err.message);
    }
  };

  const setStatus = async (status) => {
    setError('');
    try {
      const result = await updateHunt({ huntId, status });
      setHunt(result.hunt);
      setHuntForm(result.hunt);
    } catch (err) {
      setError(err.message);
    }
  };

  const archiveCurrent = async () => {
    await archiveHunt(huntId);
    navigate('/player/bonus-hunt');
  };

  const deleteCurrent = async () => {
    if (!window.confirm('Delete this hunt? This cannot be undone from the app UI.')) return;
    await deleteHunt(huntId);
    navigate('/player/bonus-hunt');
  };

  const addSuggestedSlot = (slot) => {
    setEditingBonus(null);
    setDraftBonus(slotToDraft(slot));
    setSlotSearch(slot.name || slotSearch);
    setCatalogResults([]);
  };

  const addTypedSlot = () => {
    const name = slotSearch.trim();
    if (!name) return;
    setEditingBonus(null);
    setDraftBonus(slotToDraft({ name }));
  };

  const listOptionsActive = filter !== 'all' || provider || listSearch.trim() || sort !== 'position';

  if (loading) return <main className="pbh-page"><div className="pbh-skeleton pbh-skeleton--hero" /></main>;
  if (error && !hunt) return <main className="pbh-page"><div className="pbh-alert pbh-alert--error">{error}</div></main>;

  return (
    <main className="pbh-page">
      <header className="pbh-header">
        <div>
          <span className="pbh-eyebrow">Hunt detail</span>
          <h1>{hunt.name}</h1>
          <p>{formatDate(hunt.hunt_date)}{hunt.casino_name ? ` · ${hunt.casino_name}` : ''}</p>
        </div>
        <div className="pbh-header__actions">
          <Link to="/player/bonus-hunt" className="pbh-btn pbh-btn--ghost">Dashboard</Link>
          <button className="pbh-btn pbh-btn--ghost" onClick={() => downloadPlayerExport({ type: 'bonuses', start: hunt.hunt_date, end: hunt.hunt_date, period: 'custom' })}>Export</button>
        </div>
      </header>

      {error && <div className="pbh-alert pbh-alert--error">{error}</div>}
      {message && <div className="pbh-alert pbh-alert--success">{message}</div>}

      <section className="pbh-panel">
        <div className="pbh-detail-head">
          <div>
            <span className={`pbh-pill pbh-pill--${hunt.status}`}>{hunt.status}</span>
            <h2>Accounting</h2>
            <p>Target = deposits minus stop loss. Profit/Loss = opened payouts minus target.</p>
          </div>
          <div className="pbh-actions">
            {hunt.status !== 'completed' && (
              <button className="pbh-btn pbh-btn--secondary" onClick={() => setStatus('completed')}>
                <CheckCircle2 size={17} /> Complete
              </button>
            )}
            <button className="pbh-btn pbh-btn--ghost" onClick={archiveCurrent}><Archive size={17} /> Archive</button>
            <button className="pbh-btn pbh-btn--danger" onClick={deleteCurrent}><Trash2 size={17} /> Delete</button>
          </div>
        </div>

        <SummaryStrip stats={stats} currency={currency} />
        <MathematicsPanel stats={stats} currency={currency} />

        <div className="pbh-form pbh-form--compact">
          {[
            ['name', 'Hunt name', 'text'],
            ['casino_name', 'Casino', 'text'],
            ['hunt_date', 'Date', 'date'],
            ['starting_deposit', 'Starting deposit', 'number'],
            ['stop_loss', 'Stop loss', 'number'],
            ['additional_deposits', 'Additional deposits', 'number'],
            ['initial_withdrawal', 'Initial withdrawal', 'number'],
            ['total_withdrawals', 'Withdrawals', 'number'],
            ['current_balance', 'Current balance', 'number'],
          ].map(([key, label, type]) => (
            <label className="pbh-field" key={key}>
              <span>{label}</span>
              <input
                type={type}
                min={type === 'number' ? '0' : undefined}
                step={type === 'number' ? '0.01' : undefined}
                value={huntForm?.[key] ?? ''}
                onChange={(event) => setHuntForm((prev) => ({ ...prev, [key]: event.target.value }))}
              />
            </label>
          ))}
          <label className="pbh-field">
            <span>Currency</span>
            <select value={huntForm?.currency || 'EUR'} onChange={(event) => setHuntForm((prev) => ({ ...prev, currency: event.target.value }))}>
              {['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'BRL', 'NOK', 'SEK', 'DKK', 'PLN'].map((cur) => <option key={cur}>{cur}</option>)}
            </select>
          </label>
          <label className="pbh-field">
            <span>Status</span>
            <select value={huntForm?.status || 'active'} onChange={(event) => setHuntForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="pbh-field pbh-field--wide">
            <span>Notes</span>
            <textarea rows={3} value={huntForm?.notes || ''} onChange={(event) => setHuntForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>
          <div className="pbh-form__actions pbh-form__actions--wide">
            <button className="pbh-btn pbh-btn--primary" onClick={saveHunt}>Save hunt</button>
          </div>
        </div>
      </section>

      {editingBonus && (
        <section className="pbh-panel">
          <div className="pbh-section-head">
            <div>
              <h2>Edit bonus setup</h2>
              <p>Change the slot, provider, type, cost, or bet size. Payouts are entered in bonus opening.</p>
            </div>
          </div>
          <BonusForm
            initial={editingBonus}
            onSubmit={saveBonus}
            onCancel={() => setEditingBonus(null)}
            submitLabel="Save bonus"
          />
        </section>
      )}

      <section className="pbh-panel">
        <div className="pbh-section-head">
          <div>
            <h2>{bonusPhase === 'opening' ? 'Bonus opening' : 'Bonus hunt'}</h2>
            <p>
              {bonusPhase === 'opening'
                ? `${stats.openedBonuses || 0} opened of ${stats.totalBonuses || 0}. Enter payouts only when the bonus has been opened.`
                : `${stats.totalBonuses || 0} bonuses added. Add slots, type, cost, and bet size before opening.`}
            </p>
          </div>
          <div className="pbh-actions">
            <button
              type="button"
              className={bonusPhase === 'opening' ? 'pbh-btn pbh-btn--ghost' : 'pbh-btn pbh-btn--primary'}
              onClick={() => {
                setBonusPhase((phase) => (phase === 'opening' ? 'hunt' : 'opening'));
                setDraftBonus(null);
              }}
              disabled={bonuses.length === 0}
            >
              {bonusPhase === 'opening' ? (
                <>Back to hunt setup</>
              ) : (
                <><ArrowRight size={17} /> Proceed to bonus opening</>
              )}
            </button>
            <button
              type="button"
              className={`pbh-btn ${listOptionsActive ? 'pbh-btn--secondary' : 'pbh-btn--ghost'}`}
              onClick={() => setShowListOptions((value) => !value)}
            >
              <SlidersHorizontal size={17} /> List options
            </button>
          </div>
        </div>

        <div className="pbh-bonus-workbench">
          {bonusPhase === 'hunt' ? (
            <>
              <div className="pbh-add-slot-row">
                <label className="pbh-add-slot-search">
                  <span>Add a slot</span>
                  <div className="pbh-searchbox">
                    <Search size={16} />
                    <input
                      value={slotSearch}
                      onChange={(event) => {
                        setSlotSearch(event.target.value);
                        setDraftBonus(null);
                      }}
                      placeholder="Type 3 letters, slot name, or provider"
                    />
                  </div>
                </label>
              </div>

              {!draftBonus && (
                <SlotCatalogSuggestions
                  slots={catalogResults}
                  loading={catalogLoading}
                  error={catalogError}
                  query={slotSearch}
                  onAdd={addSuggestedSlot}
                  onCustom={addTypedSlot}
                />
              )}

              {draftBonus && (
                <QuickBonusEditor
                  draft={draftBonus}
                  setDraft={setDraftBonus}
                  saving={quickSaving}
                  onSubmit={saveQuickBonus}
                  onCancel={() => setDraftBonus(null)}
                />
              )}
            </>
          ) : (
            <div className="pbh-opening-panel">
              <CircleDollarSign size={22} />
              <div>
                <strong>Enter payouts per row</strong>
                <span>Leave a payout empty to keep it pending. Type 0 to save a real zero-payout bonus.</span>
              </div>
              <div className="pbh-opening-panel__meta">
                <strong>{stats.openedBonuses || 0}/{stats.totalBonuses || 0}</strong>
                <span>{formatMoney(stats.remainingBreakEven, currency)} remaining</span>
              </div>
            </div>
          )}

          {showListOptions && (
            <div className="pbh-list-options-panel">
              <div className="pbh-filterbar pbh-filterbar--inline">
                <input value={listSearch} onChange={(event) => setListSearch(event.target.value)} placeholder="Filter saved bonuses" />
                <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">All</option>
                  <option value="opened">With payout</option>
                  <option value="unopened">Still to open</option>
                  <option value="profitable">Profitable</option>
                  <option value="losing">Losing</option>
                </select>
                <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                  <option value="">All providers</option>
                  {providers.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="position">Added order</option>
                  <option value="slot">Slot name</option>
                  <option value="provider">Provider</option>
                  <option value="type">Type</option>
                  <option value="cost">Cost</option>
                  <option value="bet">Bet size</option>
                  <option value="payout">Payout</option>
                  <option value="multiplier">Multiplier</option>
                  <option value="profit">Profit</option>
                  <option value="best">Best result</option>
                  <option value="worst">Worst result</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {filteredBonuses.length === 0 ? (
          <div className="pbh-empty pbh-empty--small">
            <h3>No bonuses match</h3>
            <p>Add a bonus or adjust the filters.</p>
          </div>
        ) : (
          <>
            <div className="pbh-table-wrap">
              <table className="pbh-table">
                <thead>
                  {bonusPhase === 'opening' ? (
                    <tr>
                      <th>Slot</th>
                      <th>Type</th>
                      <th>Cost</th>
                      <th>Bet</th>
                      <th>Payout</th>
                      <th>Multi</th>
                      <th>Result</th>
                      <th>Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Slot</th>
                      <th>Provider</th>
                      <th>Type</th>
                      <th>RTP</th>
                      <th>Max win</th>
                      <th>Volatility</th>
                      <th>Cost</th>
                      <th>Bet</th>
                      <th>Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filteredBonuses.map((bonus) => (
                    <BonusRow
                      key={bonus.id}
                      bonus={bonus}
                      currency={currency}
                      phase={bonusPhase}
                      payoutValue={payoutDrafts[bonus.id] ?? ''}
                      payoutSaving={savingPayoutId === bonus.id}
                      onPayoutChange={setPayoutDraft}
                      onPayoutSave={saveOpeningPayout}
                      onPayoutKeyDown={handlePayoutKeyDown}
                      onEdit={setEditingBonus}
                      onDelete={removeBonus}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pbh-card-list">
              {filteredBonuses.map((bonus) => (
                <BonusCard
                  key={bonus.id}
                  bonus={bonus}
                  currency={currency}
                  phase={bonusPhase}
                  payoutValue={payoutDrafts[bonus.id] ?? ''}
                  payoutSaving={savingPayoutId === bonus.id}
                  onPayoutChange={setPayoutDraft}
                  onPayoutSave={saveOpeningPayout}
                  onPayoutKeyDown={handlePayoutKeyDown}
                  onEdit={setEditingBonus}
                  onDelete={removeBonus}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
