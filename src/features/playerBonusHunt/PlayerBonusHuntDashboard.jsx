import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  archiveHunt,
  deleteHunt,
  duplicateHunt,
  downloadPlayerExport,
  getDashboard,
} from './playerBonusHuntService';
import { formatDate, formatMoney, formatMultiplier, formatSignedMoney } from './format';
import './PlayerBonusHunt.css';

function StatCard({ label, value, detail, tone = 'default', title }) {
  return (
    <div className={`pbh-stat pbh-stat--${tone}`} title={title || detail || label}>
      <span className="pbh-stat__label">{label}</span>
      <strong className="pbh-stat__value">{value}</strong>
      {detail && <span className="pbh-stat__detail">{detail}</span>}
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

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getDashboard());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const current = data?.current;
  const stats = current?.stats || {};
  const currency = stats.currency || current?.currency || 'EUR';
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
                <span className={`pbh-pill pbh-pill--${current.status}`}>{current.status}</span>
                <h2>{current.name}</h2>
                <p>{formatDate(current.hunt_date)}{current.casino_name ? ` · ${current.casino_name}` : ''}</p>
              </div>
              <Link to={`/player/bonus-hunt/${current.id}`} className="pbh-btn pbh-btn--secondary">Continue</Link>
            </div>

            <div className="pbh-grid pbh-grid--stats">
              <StatCard label="Starting deposit" value={formatMoney(stats.startingDeposit, currency)} />
              <StatCard label="Additional deposits" value={formatMoney(stats.additionalDeposits, currency)} />
              <StatCard label="Withdrawals" value={formatMoney(stats.totalWithdrawals, currency)} />
              <StatCard label="Total spent" value={formatMoney(stats.totalSpent, currency)} title="Sum of all bonus costs." />
              <StatCard label="Current balance" value={formatMoney(stats.currentBalance, currency)} />
              <StatCard label="Break even" value={formatMoney(stats.breakEven, currency)} title="Target = max(Net Deposited, 0)." />
              <StatCard label="Remaining" value={formatMoney(stats.remainingBreakEven, currency)} detail="target minus payouts" />
              <StatCard
                label="Profit / Loss"
                value={formatSignedMoney(stats.profitLoss, currency)}
                tone={stats.profitLoss >= 0 ? 'positive' : 'negative'}
                title="Opened payouts minus break-even target."
              />
              <StatCard label="Total payout" value={formatMoney(stats.totalPayout, currency)} />
              <StatCard label="Bonuses" value={`${stats.openedBonuses}/${stats.totalBonuses}`} detail={`${stats.remainingBonuses} remaining`} />
              <StatCard label="Best win" value={stats.bestWin ? formatMoney(stats.bestWin.payout, currency) : '-'} detail={stats.bestWin?.slot_name} />
              <StatCard label="Worst win" value={stats.worstWin ? formatMoney(stats.worstWin.payout, currency) : '-'} detail={stats.worstWin?.slot_name} />
              <StatCard label="Best multiplier" value={formatMultiplier(stats.bestMultiplier)} detail={stats.bestMultiplierBonus?.slot_name} />
              <StatCard label="Average payout" value={formatMoney(stats.averagePayout, currency)} />
              <StatCard label="Average multiplier" value={formatMultiplier(stats.averageMultiplier)} />
              <StatCard label="Required average" value={formatMoney(stats.requiredAveragePayout, currency)} detail={`${formatMultiplier(stats.requiredAverageMultiplier)} needed`} />
            </div>

            <div className="pbh-progress-grid">
              <Progress value={stats.completion} label="Hunt completion" />
              <Progress value={stats.breakEven > 0 ? Math.min(100, Math.max(0, ((stats.breakEven - stats.remainingBreakEven) / stats.breakEven) * 100)) : 100} label="Break-even progress" />
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
