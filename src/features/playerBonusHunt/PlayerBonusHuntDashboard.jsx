import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, ArrowLeft, ArrowRight, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  archiveHunt,
  deleteHunt,
  duplicateHunt,
  downloadPlayerExport,
  getDashboard,
} from './playerBonusHuntService';
import SlotThumb from './SlotThumb';
import { calculateBonusMultiplier } from './domain.js';
import { formatDate, formatMoney, formatMultiplier, formatSignedMoney } from './format';
import './PlayerBonusHunt.css';

const DASHBOARD_PERIODS = [
  ['all', 'All time'],
  ['yearly', 'Year'],
  ['monthly', 'Month'],
  ['weekly', 'Week'],
  ['daily', 'Day'],
];

function shiftAnchor(anchor, period, direction) {
  const date = new Date(anchor);
  if (period === 'yearly') date.setFullYear(date.getFullYear() + direction);
  else if (period === 'monthly') date.setMonth(date.getMonth() + direction);
  else if (period === 'weekly') date.setDate(date.getDate() + direction * 7);
  else if (period === 'daily') date.setDate(date.getDate() + direction);
  return date.toISOString().slice(0, 10);
}

function periodLabel(period, anchor, range) {
  if (period === 'all') return 'All time';
  if (period === 'yearly') return new Intl.DateTimeFormat('en-GB', { year: 'numeric' }).format(new Date(anchor));
  if (period === 'monthly') return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(anchor));
  if (period === 'weekly') return range?.start ? `${formatDate(range.start)} - ${formatDate(range.end)}` : 'Selected week';
  return formatDate(anchor);
}

function getPrimaryTotals(stats, fallbackCurrency = 'EUR') {
  const rows = Object.values(stats?.totalsByCurrency || {});
  return rows[0] || {
    currency: fallbackCurrency,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalSpent: 0,
    totalPayout: 0,
    breakEven: 0,
    remainingBreakEven: 0,
    profitLoss: 0,
  };
}

function StatCard({ label, value, detail, tone = 'default', title, valueClass = '' }) {
  return (
    <div className={`pbh-stat pbh-stat--${tone}`} title={title || detail || label}>
      <span className="pbh-stat__label">{label}</span>
      <strong className={`pbh-stat__value ${valueClass}`}>{value}</strong>
      {detail && <span className="pbh-stat__detail">{detail}</span>}
    </div>
  );
}

function ResultStatCard({ label, result, value, tone = 'default', detail }) {
  return (
    <div className={`pbh-stat pbh-stat--${tone} pbh-result-stat`}>
      <span className="pbh-stat__label">{label}</span>
      {result ? (
        <div className="pbh-result-stat__body">
          <SlotThumb src={result.slot_image_url} name={result.slot_name} size="sm" />
          <div>
            <strong className={`pbh-stat__value ${tone === 'negative' ? 'pbh-negative' : 'pbh-positive'}`}>{value}</strong>
            <span className="pbh-stat__detail">{result.slot_name}</span>
            {result.provider_name && <span className="pbh-stat__detail">{result.provider_name}</span>}
          </div>
        </div>
      ) : (
        <>
          <strong className="pbh-stat__value">-</strong>
          <span className="pbh-stat__detail">{detail || 'No opened bonuses yet'}</span>
        </>
      )}
    </div>
  );
}

function Progress({ value, label }) {
  return (
    <div className="pbh-progress">
      <div className="pbh-progress__row">
        <span>{label}</span>
        <strong>{Math.max(0, Math.min(100, value || 0))}%</strong>
      </div>
      <div className="pbh-progress__track">
        <span className="pbh-progress__bar" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <section className="pbh-empty">
      <span className="pbh-empty__mark">BH</span>
      <h2>Create your first Bonus Hunt</h2>
      <p>
        Track deposits, withdrawals, bonus costs, payouts, multipliers, and long-term slot results in one private player dashboard.
      </p>
      <Link to="/player/bonus-hunt/new" className="pbh-btn pbh-btn--primary">
        <Plus size={18} /> New hunt
      </Link>
    </section>
  );
}

function HuntRow({ hunt, onDuplicate, onArchive, onDelete }) {
  const stats = hunt.stats || {};
  const currency = stats.currency || hunt.currency || 'EUR';
  return (
    <article className="pbh-hunt-row">
      <div>
        <span className={`pbh-pill pbh-pill--${hunt.status}`}>{hunt.status}</span>
        <h3>{hunt.name}</h3>
        <p>{formatDate(hunt.hunt_date)}{hunt.casino_name ? ` · ${hunt.casino_name}` : ''}</p>
      </div>
      <div className="pbh-hunt-row__metrics">
        <span>{formatMoney(stats.totalDeposits, currency)} deposited</span>
        <span>{formatMoney(stats.totalWithdrawals, currency)} withdrawn</span>
        <span className={stats.profitLoss >= 0 ? 'pbh-positive' : 'pbh-negative'}>
          {formatSignedMoney(stats.profitLoss, currency)}
        </span>
        <span>{stats.totalBonuses || 0} bonuses</span>
      </div>
      <div className="pbh-actions">
        <Link className="pbh-icon-btn" to={`/player/bonus-hunt/${hunt.id}`} title="Open hunt">
          <ExternalLink size={17} />
        </Link>
        <button className="pbh-icon-btn" onClick={() => onDuplicate(hunt.id)} title="Duplicate hunt">
          <Copy size={17} />
        </button>
        <button className="pbh-icon-btn" onClick={() => onArchive(hunt.id)} title="Archive hunt">
          <Archive size={17} />
        </button>
        <button className="pbh-icon-btn pbh-icon-btn--danger" onClick={() => onDelete(hunt.id)} title="Delete hunt">
          <Trash2 size={17} />
        </button>
      </div>
    </article>
  );
}

export default function PlayerBonusHuntDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [period, setPeriod] = useState('all');
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 10));

  const dashboardParams = useMemo(() => ({
    period,
    anchor: period === 'all' ? undefined : anchor,
  }), [period, anchor]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getDashboard(dashboardParams));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [dashboardParams]);

  const current = data?.current;
  const summaryStats = data?.summary?.stats || data?.library || {};
  const primaryTotals = getPrimaryTotals(summaryStats, current?.currency || 'EUR');
  const currency = primaryTotals.currency || current?.currency || 'EUR';
  const bestWin = summaryStats.bestWinsByPayout?.[0] || null;
  const worstWin = summaryStats.worstWinsByPayout?.[0] || null;
  const bestMultiplierBonus = summaryStats.bestWinsByMultiplier?.[0] || null;
  const bestMultiplierValue = bestMultiplierBonus
    ? formatMultiplier(bestMultiplierBonus.multiplier ?? calculateBonusMultiplier(bestMultiplierBonus))
    : '-';
  const completion = summaryStats.bonusCount > 0 ? Math.round(((summaryStats.openedCount || 0) / summaryStats.bonusCount) * 100) : 0;
  const breakEvenProgress = primaryTotals.breakEven > 0
    ? Math.min(100, Math.max(0, ((primaryTotals.breakEven - primaryTotals.remainingBreakEven) / primaryTotals.breakEven) * 100))
    : 100;
  const history = useMemo(() => data?.history || [], [data]);

  const runAction = async (label, fn) => {
    setBusy(label);
    setError('');
    try {
      const result = await fn();
      await load();
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy('');
    }
  };

  const handleDuplicate = (huntId) => runAction('duplicate', async () => {
    const result = await duplicateHunt(huntId);
    if (result?.hunt?.id) navigate(`/player/bonus-hunt/${result.hunt.id}`);
  });

  const handleArchive = (huntId) => runAction('archive', () => archiveHunt(huntId));

  const handleDelete = (huntId) => {
    if (!window.confirm('Delete this hunt? This hides it from your history but keeps billing and account data untouched.')) return;
    runAction('delete', () => deleteHunt(huntId));
  };

  if (loading) {
    return (
      <main className="pbh-page">
        <div className="pbh-skeleton pbh-skeleton--hero" />
        <div className="pbh-grid pbh-grid--stats">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="pbh-skeleton" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="pbh-page">
      <header className="pbh-header">
        <div>
          <span className="pbh-eyebrow">Player tools</span>
          <h1>Bonus Hunt</h1>
          <p>Private session tracking for deposits, withdrawals, bonuses, payouts, and slot results.</p>
        </div>
        <div className="pbh-header__actions">
          <Link to="/player/bonus-hunt/library" className="pbh-btn pbh-btn--ghost">Library</Link>
          <button className="pbh-btn pbh-btn--ghost" onClick={() => downloadPlayerExport({ type: 'hunts' })}>Export hunts</button>
          <Link to="/player/bonus-hunt/new" className="pbh-btn pbh-btn--primary">
            <Plus size={18} /> New hunt
          </Link>
        </div>
      </header>

      {error && <div className="pbh-alert pbh-alert--error">{error}</div>}
      {busy && <div className="pbh-alert">Working on {busy}...</div>}

      {!current ? (
        <EmptyDashboard />
      ) : (
        <>
          <section className="pbh-panel pbh-current">
            <div className="pbh-current__title">
              <div>
                <span className="pbh-eyebrow">{period === 'all' ? 'Best all time' : 'Best in period'}</span>
                <h2>Performance summary</h2>
                <p>
                  {periodLabel(period, anchor, data?.summary?.range)}
                  {current ? ` · Current hunt: ${current.name}` : ''}
                </p>
              </div>
              <div className="pbh-summary-actions">
                <div className="pbh-segments pbh-segments--compact">
                  {DASHBOARD_PERIODS.map(([id, label]) => (
                    <button key={id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>{label}</button>
                  ))}
                </div>
                {period !== 'all' && (
                  <div className="pbh-period-nav pbh-period-nav--compact">
                    <button onClick={() => setAnchor((value) => shiftAnchor(value, period, -1))} title="Previous period"><ArrowLeft size={16} /></button>
                    <strong>{periodLabel(period, anchor, data?.summary?.range)}</strong>
                    <button onClick={() => setAnchor((value) => shiftAnchor(value, period, 1))} title="Next period"><ArrowRight size={16} /></button>
                  </div>
                )}
                <Link to={`/player/bonus-hunt/${current.id}`} className="pbh-btn pbh-btn--secondary">Continue</Link>
              </div>
            </div>

            <div className="pbh-grid pbh-grid--stats">
              <StatCard label="Total deposits" value={formatMoney(primaryTotals.totalDeposited, currency)} />
              <StatCard label="Total withdrawals" value={formatMoney(primaryTotals.totalWithdrawn, currency)} />
              <StatCard label="Break even" value={formatMoney(primaryTotals.breakEven, currency)} title="Target = deposits minus withdrawals." />
              <StatCard label="Remaining" value={formatMoney(primaryTotals.remainingBreakEven, currency)} detail="target minus payouts" />
              <StatCard label="Total spent" value={formatMoney(primaryTotals.totalSpent, currency)} title="Sum of all bonus costs." />
              <StatCard label="Total payout" value={formatMoney(primaryTotals.totalPayout, currency)} />
              <StatCard
                label="Profit / Loss"
                value={formatSignedMoney(primaryTotals.profitLoss, currency)}
                tone={primaryTotals.profitLoss >= 0 ? 'positive' : 'negative'}
                valueClass={primaryTotals.profitLoss >= 0 ? 'pbh-positive' : 'pbh-negative'}
                detail={primaryTotals.profitLoss >= 0 ? 'Profit' : 'Loss'}
                title="Opened payouts minus break-even target for the selected period."
              />
              <StatCard label="Bonuses" value={`${summaryStats.openedCount || 0}/${summaryStats.bonusCount || 0}`} detail={`${Math.max(0, (summaryStats.bonusCount || 0) - (summaryStats.openedCount || 0))} remaining`} />
              <StatCard label="Average payout" value={formatMoney(summaryStats.averagePayout, currency)} />
              <ResultStatCard label="Best win" result={bestWin} value={bestWin ? formatMoney(bestWin.payout, bestWin.currency || currency) : '-'} tone="positive" />
              <ResultStatCard label="Worst win" result={worstWin} value={worstWin ? formatMoney(worstWin.payout, worstWin.currency || currency) : '-'} tone="negative" />
              <ResultStatCard label="Best multiplier" result={bestMultiplierBonus} value={bestMultiplierValue} tone="positive" />
              <StatCard label="Average multiplier" value={formatMultiplier(summaryStats.averageMultiplier)} />
            </div>

            <div className="pbh-progress-grid">
              <Progress value={completion} label="Bonus completion" />
              <Progress value={breakEvenProgress} label="Break-even progress" />
            </div>
          </section>

          <section className="pbh-panel">
            <div className="pbh-section-head">
              <div>
                <h2>Hunt history</h2>
                <p>All active, completed, and archived player hunts.</p>
              </div>
            </div>
            <div className="pbh-hunt-list">
              {history.map((hunt) => (
                <HuntRow
                  key={hunt.id}
                  hunt={hunt}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
