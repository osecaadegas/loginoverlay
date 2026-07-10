import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, CheckCircle2, Edit2, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
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
import { formatDate, formatMaxWin, formatMoney, formatMultiplier, formatRtp, formatSignedMoney, formatVolatility } from './format';
import './PlayerBonusHunt.css';

function SummaryStrip({ stats, currency }) {
  const items = [
    ['Net deposited', formatMoney(stats.netDeposited, currency), 'Deposits minus withdrawals'],
    ['Break even', formatMoney(stats.breakEven, currency), 'Same as net deposited'],
    ['Remaining', formatMoney(stats.remainingBreakEven, currency), 'Needed to break even'],
    ['Profit / Loss', formatSignedMoney(stats.profitLoss, currency), 'Current balance + withdrawals - deposits'],
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

function BonusRow({ bonus, currency, onEdit, onDelete }) {
  const profit = Number(bonus.profit_loss || 0);
  return (
    <tr>
      <td>
        <div className="pbh-slot-cell">
          <SlotThumb src={bonus.slot_image_url} name={bonus.slot_name} size="sm" />
          <div>
            <strong>{bonus.slot_name}</strong>
            <span>{bonus.provider_name || 'Unknown provider'}</span>
          </div>
        </div>
      </td>
      <td>{bonus.provider_name || '-'}</td>
      <td>{formatRtp(bonus.slot_rtp)}</td>
      <td>{formatMaxWin(bonus.slot_max_win_multiplier)}</td>
      <td>{formatVolatility(bonus.slot_volatility)}</td>
      <td>{formatMoney(bonus.bonus_cost, currency)}</td>
      <td>{formatMoney(bonus.bet_size, currency)}</td>
      <td>{formatMoney(bonus.payout, currency)}</td>
      <td>{formatMultiplier(bonus.multiplier)}</td>
      <td className={profit >= 0 ? 'pbh-positive' : 'pbh-negative'}>{formatSignedMoney(profit, currency)}</td>
      <td><span className={`pbh-pill pbh-pill--${bonus.status}`}>{bonus.status}</span></td>
      <td>
        <div className="pbh-actions">
          <button className="pbh-icon-btn" onClick={() => onEdit(bonus)} title="Edit bonus"><Edit2 size={16} /></button>
          <button className="pbh-icon-btn pbh-icon-btn--danger" onClick={() => onDelete(bonus.id)} title="Delete bonus"><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>
  );
}

function BonusCard({ bonus, currency, onEdit, onDelete }) {
  const profit = Number(bonus.profit_loss || 0);
  return (
    <article className="pbh-bonus-card">
      <div className="pbh-bonus-card__top">
        <SlotThumb src={bonus.slot_image_url} name={bonus.slot_name} />
        <div>
          <span className={`pbh-pill pbh-pill--${bonus.status}`}>{bonus.status}</span>
          <h3>{bonus.slot_name}</h3>
          <p>{bonus.provider_name || 'Unknown provider'}</p>
        </div>
      </div>
      <div className="pbh-bonus-card__grid">
        <span>Provider <strong>{bonus.provider_name || '-'}</strong></span>
        <span>RTP <strong>{formatRtp(bonus.slot_rtp)}</strong></span>
        <span>Max win <strong>{formatMaxWin(bonus.slot_max_win_multiplier)}</strong></span>
        <span>Volatility <strong>{formatVolatility(bonus.slot_volatility)}</strong></span>
        <span>Cost <strong>{formatMoney(bonus.bonus_cost, currency)}</strong></span>
        <span>Bet <strong>{formatMoney(bonus.bet_size, currency)}</strong></span>
        <span>Payout <strong>{formatMoney(bonus.payout, currency)}</strong></span>
        <span>Multi <strong>{formatMultiplier(bonus.multiplier)}</strong></span>
        <span className={profit >= 0 ? 'pbh-positive' : 'pbh-negative'}>Result <strong>{formatSignedMoney(profit, currency)}</strong></span>
      </div>
      <div className="pbh-actions">
        <button className="pbh-btn pbh-btn--secondary" onClick={() => onEdit(bonus)}>Edit</button>
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
    bonus_cost: '',
    bet_size: '',
    payout: '',
    status: 'unopened',
    notes: '',
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

function QuickBonusEditor({ draft, setDraft, currency, saving, onSubmit, onCancel }) {
  const set = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      ...draft,
      bonus_cost: Number(draft.bonus_cost || 0),
      bet_size: Number(draft.bet_size || 0),
      payout: Number(draft.payout || 0),
    });
  };

  return (
    <form className="pbh-quick-bonus" onSubmit={submit}>
      <div className="pbh-quick-bonus__slot">
        <SlotThumb src={draft.slot_image_url} name={draft.slot_name} />
        <div>
          <strong>{draft.slot_name}</strong>
          <span>{draft.provider_name || 'Unknown provider'}</span>
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
          <input value={draft.provider_name || ''} onChange={(event) => set('provider_name', event.target.value)} placeholder="Optional" />
        </label>
        <label className="pbh-field">
          <span>Bonus cost</span>
          <input type="number" min="0" step="0.01" value={draft.bonus_cost ?? ''} onChange={(event) => set('bonus_cost', event.target.value)} />
        </label>
        <label className="pbh-field">
          <span>Bet size</span>
          <input type="number" min="0" step="0.01" value={draft.bet_size ?? ''} onChange={(event) => set('bet_size', event.target.value)} />
        </label>
        <label className="pbh-field">
          <span>Payout</span>
          <input type="number" min="0" step="0.01" value={draft.payout ?? ''} onChange={(event) => set('payout', event.target.value)} />
        </label>
        <label className="pbh-field">
          <span>Status</span>
          <select value={draft.status || 'unopened'} onChange={(event) => set('status', event.target.value)}>
            <option value="unopened">Unopened</option>
            <option value="opened">Opened</option>
          </select>
        </label>
      </div>

      <label className="pbh-field pbh-field--wide">
        <span>Notes</span>
        <textarea value={draft.notes || ''} onChange={(event) => set('notes', event.target.value)} rows={2} maxLength={1200} />
      </label>

      <div className="pbh-form__actions pbh-form__actions--split">
        <button type="button" className="pbh-btn pbh-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pbh-btn pbh-btn--primary" disabled={saving}>
          <Plus size={17} /> {saving ? 'Adding...' : 'Add bonus'}
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
  const [huntForm, setHuntForm] = useState(null);
  const [draftBonus, setDraftBonus] = useState(null);
  const [quickSaving, setQuickSaving] = useState(false);
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
      cost: (a, b) => Number(b.bonus_cost || 0) - Number(a.bonus_cost || 0),
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
      if (editingBonus) await updateBonus({ ...payload, bonusId: editingBonus.id });
      else await addBonus({ ...payload, huntId });
      setEditingBonus(null);
      setDraftBonus(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveQuickBonus = async (payload) => {
    setError('');
    setQuickSaving(true);
    try {
      await addBonus({ ...payload, huntId });
      setDraftBonus(null);
      setSlotSearch('');
      setCatalogResults([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setQuickSaving(false);
    }
  };

  const removeBonus = async (bonusId) => {
    if (!window.confirm('Delete this bonus result?')) return;
    setError('');
    try {
      await deleteBonus(bonusId);
      await load();
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
            <p>Break Even = Net Deposited. Profit/Loss = Current Balance + Withdrawals - Deposits.</p>
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

        <div className="pbh-form pbh-form--compact">
          {[
            ['name', 'Hunt name', 'text'],
            ['casino_name', 'Casino', 'text'],
            ['hunt_date', 'Date', 'date'],
            ['starting_deposit', 'Starting deposit', 'number'],
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
              <h2>Edit bonus</h2>
              <p>Slot image, provider, RTP, max win, and volatility are pulled from the existing slot library when available.</p>
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
            <h2>Bonuses</h2>
            <p>{stats.openedBonuses || 0} opened of {stats.totalBonuses || 0}. {formatMoney(stats.remainingBreakEven, currency)} remaining to break even.</p>
          </div>
        </div>

        <div className="pbh-bonus-workbench">
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
            <button
              type="button"
              className={`pbh-btn ${listOptionsActive ? 'pbh-btn--secondary' : 'pbh-btn--ghost'}`}
              onClick={() => setShowListOptions((value) => !value)}
            >
              <SlidersHorizontal size={17} /> List options
            </button>
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
              currency={currency}
              saving={quickSaving}
              onSubmit={saveQuickBonus}
              onCancel={() => setDraftBonus(null)}
            />
          )}

          {showListOptions && (
            <div className="pbh-list-options-panel">
              <div className="pbh-filterbar pbh-filterbar--inline">
                <input value={listSearch} onChange={(event) => setListSearch(event.target.value)} placeholder="Filter saved bonuses" />
                <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">All</option>
                  <option value="opened">Opened</option>
                  <option value="unopened">Unopened</option>
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
                  <option value="cost">Cost</option>
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
                  <tr>
                    <th>Slot</th>
                    <th>Provider</th>
                    <th>RTP</th>
                    <th>Max win</th>
                    <th>Volatility</th>
                    <th>Cost</th>
                    <th>Bet</th>
                    <th>Payout</th>
                    <th>Multi</th>
                    <th>Result</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBonuses.map((bonus) => (
                    <BonusRow key={bonus.id} bonus={bonus} currency={currency} onEdit={setEditingBonus} onDelete={removeBonus} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pbh-card-list">
              {filteredBonuses.map((bonus) => (
                <BonusCard key={bonus.id} bonus={bonus} currency={currency} onEdit={setEditingBonus} onDelete={removeBonus} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
