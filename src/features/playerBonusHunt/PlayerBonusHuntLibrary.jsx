import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download } from 'lucide-react';
import SlotThumb from './SlotThumb';
import { downloadPlayerExport, getLibrary } from './playerBonusHuntService';
import { formatDate, formatMoney, formatMultiplier, formatSignedMoney } from './format';
import './PlayerBonusHunt.css';

const PERIODS = [
  ['all', 'All time'],
  ['monthly', 'Monthly'],
  ['weekly', 'Weekly'],
  ['daily', 'Daily'],
  ['custom', 'Custom'],
];

const VIEWS = [
  ['overview', 'Overview'],
  ['best-wins', 'Best wins'],
  ['worst-wins', 'Worst wins'],
  ['multipliers', 'Multipliers'],
  ['slots', 'Slots'],
  ['hunts', 'Hunts'],
];

function shiftAnchor(anchor, period, direction) {
  const date = new Date(anchor);
  if (period === 'monthly') date.setMonth(date.getMonth() + direction);
  else if (period === 'weekly') date.setDate(date.getDate() + direction * 7);
  else if (period === 'daily') date.setDate(date.getDate() + direction);
  return date.toISOString().slice(0, 10);
}

function periodLabel(period, anchor, range) {
  if (period === 'all') return 'All time';
  if (period === 'custom') return range?.start ? `${formatDate(range.start)} - ${formatDate(range.end)}` : 'Custom range';
  if (period === 'monthly') return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(anchor));
  if (period === 'weekly') return range?.start ? `${formatDate(range.start)} - ${formatDate(range.end)}` : 'Selected week';
  return formatDate(anchor);
}

function Totals({ totals }) {
  const rows = Object.values(totals || {});
  if (!rows.length) return null;
  return (
    <div className="pbh-grid pbh-grid--stats">
      {rows.map((row) => (
        <div className="pbh-stat" key={row.currency}>
          <span className="pbh-stat__label">{row.currency} totals</span>
          <strong className={`pbh-stat__value ${row.profitLoss >= 0 ? 'pbh-positive' : 'pbh-negative'}`}>
            {formatSignedMoney(row.profitLoss, row.currency)}
          </strong>
          <span className="pbh-stat__detail">
            {formatMoney(row.totalDeposited, row.currency)} deposited · {formatMoney(row.totalWithdrawn, row.currency)} withdrawn
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultTable({ results, currencyFallback = 'EUR' }) {
  if (!results?.length) return <div className="pbh-empty pbh-empty--small"><h3>No results yet</h3><p>Opened bonuses will appear here.</p></div>;
  return (
    <div className="pbh-table-wrap">
      <table className="pbh-table">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Payout</th>
            <th>Multiplier</th>
            <th>Profit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((bonus) => {
            const currency = bonus.currency || currencyFallback;
            return (
              <tr key={bonus.id}>
                <td>
                  <div className="pbh-slot-cell">
                    <SlotThumb src={bonus.slot_image_url} name={bonus.slot_name} size="sm" />
                    <div>
                      <strong>{bonus.slot_name}</strong>
                      <span>{bonus.provider_name || 'Unknown provider'}</span>
                    </div>
                  </div>
                </td>
                <td>{formatMoney(bonus.payout, currency)}</td>
                <td>{formatMultiplier(bonus.multiplier)}</td>
                <td className={Number(bonus.profit_loss || 0) >= 0 ? 'pbh-positive' : 'pbh-negative'}>
                  {formatSignedMoney(bonus.profit_loss, currency)}
                </td>
                <td><span className={`pbh-pill pbh-pill--${bonus.status}`}>{bonus.status}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SlotLeaderboard({ slots }) {
  if (!slots?.length) return <div className="pbh-empty pbh-empty--small"><h3>No slot data yet</h3><p>Add bonus results to build slot statistics.</p></div>;
  return (
    <div className="pbh-slot-board">
      {slots.slice(0, 30).map((slot) => (
        <article key={`${slot.slotName}-${slot.providerName}-${slot.currency}`}>
          <SlotThumb src={slot.slotImageUrl} name={slot.slotName} />
          <div>
            <h3>{slot.slotName}</h3>
            <p>{slot.providerName || 'Unknown provider'} · {slot.plays} play{slot.plays === 1 ? '' : 's'}</p>
          </div>
          <strong className={slot.profitLoss >= 0 ? 'pbh-positive' : 'pbh-negative'}>{formatSignedMoney(slot.profitLoss, slot.currency)}</strong>
          <span>{formatMoney(slot.totalPayout, slot.currency)} paid · {formatMultiplier(slot.averageMultiplier)}</span>
        </article>
      ))}
    </div>
  );
}

export default function PlayerBonusHuntLibrary() {
  const [period, setPeriod] = useState('all');
  const [view, setView] = useState('overview');
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10));
  const [custom, setCustom] = useState({ start: '', end: '' });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('payout');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => ({
    period,
    view,
    anchor,
    sort,
    search,
    start: custom.start,
    end: custom.end,
  }), [period, view, anchor, sort, search, custom.start, custom.end]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await getLibrary(params);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params]);

  const stats = data?.stats || {};
  const defaultCurrency = Object.keys(stats.totalsByCurrency || {})[0] || 'EUR';

  return (
    <main className="pbh-page">
      <header className="pbh-header">
        <div>
          <span className="pbh-eyebrow">Results library</span>
          <h1>Bonus Hunt Library</h1>
          <p>Historical results across active and completed player hunts.</p>
        </div>
        <div className="pbh-header__actions">
          <Link to="/player/bonus-hunt" className="pbh-btn pbh-btn--ghost">Dashboard</Link>
          <button className="pbh-btn pbh-btn--primary" onClick={() => downloadPlayerExport({ ...params, type: view === 'hunts' ? 'hunts' : 'bonuses' })}>
            <Download size={17} /> Export CSV
          </button>
        </div>
      </header>

      {error && <div className="pbh-alert pbh-alert--error">{error}</div>}

      <section className="pbh-panel">
        <div className="pbh-library-controls">
          <div className="pbh-segments">
            {PERIODS.map(([id, label]) => (
              <button key={id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>{label}</button>
            ))}
          </div>
          {period !== 'all' && period !== 'custom' && (
            <div className="pbh-period-nav">
              <button onClick={() => setAnchor((value) => shiftAnchor(value, period, -1))}><ArrowLeft size={16} /></button>
              <strong>{periodLabel(period, anchor, data?.range)}</strong>
              <button onClick={() => setAnchor((value) => shiftAnchor(value, period, 1))}><ArrowRight size={16} /></button>
            </div>
          )}
          {period === 'custom' && (
            <div className="pbh-custom-range">
              <input type="date" value={custom.start} onChange={(event) => setCustom((prev) => ({ ...prev, start: event.target.value }))} />
              <input type="date" value={custom.end} onChange={(event) => setCustom((prev) => ({ ...prev, end: event.target.value }))} />
            </div>
          )}
          <div className="pbh-segments">
            {VIEWS.map(([id, label]) => (
              <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>
            ))}
          </div>
          <div className="pbh-filterbar pbh-filterbar--compact">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search slots or providers" />
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="payout">Payout</option>
              <option value="profit">Profit</option>
              <option value="slot">Slot name</option>
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="pbh-grid pbh-grid--stats">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="pbh-skeleton" />)}
        </div>
      ) : !stats.huntCount ? (
        <section className="pbh-empty">
          <span className="pbh-empty__mark">LIB</span>
          <h2>Your library is empty</h2>
          <p>Create and track hunts to populate best wins, worst wins, multiplier records, and slot performance.</p>
          <Link className="pbh-btn pbh-btn--primary" to="/player/bonus-hunt/new">Create hunt</Link>
        </section>
      ) : (
        <>
          <Totals totals={stats.totalsByCurrency} />
          <section className="pbh-panel">
            <div className="pbh-section-head">
              <div>
                <h2>{VIEWS.find(([id]) => id === view)?.[1] || 'Overview'}</h2>
                <p>{periodLabel(period, anchor, data?.range)}</p>
              </div>
            </div>

            {view === 'overview' && (
              <div className="pbh-grid pbh-grid--stats">
                <div className="pbh-stat"><span className="pbh-stat__label">Hunts</span><strong className="pbh-stat__value">{stats.huntCount}</strong></div>
                <div className="pbh-stat"><span className="pbh-stat__label">Bonuses</span><strong className="pbh-stat__value">{stats.openedCount}/{stats.bonusCount}</strong></div>
                <div className="pbh-stat"><span className="pbh-stat__label">Average payout</span><strong className="pbh-stat__value">{formatMoney(stats.averagePayout, defaultCurrency)}</strong></div>
                <div className="pbh-stat"><span className="pbh-stat__label">Average multiplier</span><strong className="pbh-stat__value">{formatMultiplier(stats.averageMultiplier)}</strong></div>
              </div>
            )}

            {view === 'best-wins' && <ResultTable results={stats.bestWinsByPayout?.slice(0, 50)} currencyFallback={defaultCurrency} />}
            {view === 'worst-wins' && <ResultTable results={stats.worstWinsByPayout?.slice(0, 50)} currencyFallback={defaultCurrency} />}
            {view === 'multipliers' && <ResultTable results={stats.bestWinsByMultiplier?.slice(0, 50)} currencyFallback={defaultCurrency} />}
            {view === 'slots' && <SlotLeaderboard slots={stats.mostProfitableSlots} />}
            {view === 'hunts' && (
              <div className="pbh-hunt-list">
                {(data.hunts || []).map(({ hunt, stats: huntStats }) => (
                  <Link className="pbh-hunt-row pbh-hunt-row--link" key={hunt.id} to={`/player/bonus-hunt/${hunt.id}`}>
                    <div>
                      <span className={`pbh-pill pbh-pill--${hunt.status}`}>{hunt.status}</span>
                      <h3>{hunt.name}</h3>
                      <p>{formatDate(hunt.hunt_date)}{hunt.casino_name ? ` · ${hunt.casino_name}` : ''}</p>
                    </div>
                    <div className="pbh-hunt-row__metrics">
                      <span>{formatMoney(huntStats.totalDeposits, huntStats.currency)} deposited</span>
                      <span>{formatMoney(huntStats.totalPayout, huntStats.currency)} payout</span>
                      <span className={huntStats.profitLoss >= 0 ? 'pbh-positive' : 'pbh-negative'}>{formatSignedMoney(huntStats.profitLoss, huntStats.currency)}</span>
                      <span>{huntStats.totalBonuses} bonuses</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
