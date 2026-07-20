import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, Link2, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import {
  copyText,
  downloadAffiliateExport,
  fetchAffiliateDashboard,
  formatMoneyMinor,
} from '../../services/affiliateService';
import './AffiliateDashboard.css';

const ranges = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

function dateParams(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function moneyList(values) {
  const entries = Object.entries(values || {});
  if (!entries.length) return '€0.00';
  return entries.map(([currency, amount]) => formatMoneyMinor(amount, currency)).join(' / ');
}

function StatCard({ label, value, hint }) {
  return (
    <article className="affiliate-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

function MiniBars({ title, data }) {
  return (
    <section className="affiliate-panel">
      <h2>{title}</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={(data || []).slice(0, 8)}>
          <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} interval={0} height={44} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(125,211,252,.08)' }} contentStyle={{ background: '#101522', border: '1px solid #2b3650', borderRadius: 8 }} />
          <Bar dataKey="value" fill="#67e8f9" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

export default function AffiliateDashboard() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchAffiliateDashboard(dateParams(range)));
    } catch (err) {
      setError(err.message || 'Could not load affiliate dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [range]);

  const bestLink = useMemo(() => {
    return [...(data?.links || [])].sort((a, b) => Number(b.clickTotals?.humanClicks || 0) - Number(a.clickTotals?.humanClicks || 0))[0];
  }, [data]);

  const handleCopy = async (link) => {
    await copyText(link.trackingUrl);
    setCopiedId(link.id);
    window.setTimeout(() => setCopiedId(''), 1200);
  };

  if (loading) return <LoadingSpinner text="Loading affiliate dashboard..." fullPage />;

  if (error) {
    return (
      <main className="affiliate-page">
        <section className="affiliate-empty">
          <ShieldCheck size={34} />
          <h1>Affiliate access required</h1>
          <p>{error}</p>
          <button type="button" onClick={load}>Try again</button>
        </section>
      </main>
    );
  }

  const totals = data?.totals || {};

  return (
    <main className="affiliate-page">
      <header className="affiliate-hero">
        <div>
          <span className="affiliate-eyebrow">Affiliate</span>
          <h1>Tracking links and partner stats</h1>
          <p>Use your assigned links, compare Streamers Center click tracking with partner reports, and export your numbers when needed.</p>
        </div>
        <div className="affiliate-actions">
          <div className="affiliate-segment">
            {ranges.map((item) => (
              <button key={item.value} type="button" className={range === item.value ? 'is-active' : ''} onClick={() => setRange(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={load}><RefreshCw size={16} /> Refresh</button>
          <button type="button" onClick={downloadAffiliateExport}><Download size={16} /> Export</button>
        </div>
      </header>

      <section className="affiliate-stats">
        <StatCard label="Human clicks" value={totals.humanLikelyClicks || 0} hint={`${totals.trackedClicks || 0} total tracked`} />
        <StatCard label="Unique clicks" value={totals.uniqueClicks || 0} hint={`${totals.suspectedBotClicks || 0} suspected bot`} />
        <StatCard label="Partner clicks" value={totals.partnerClicks || 0} hint="Partner reported" />
        <StatCard label="Registrations" value={totals.registrations || 0} />
        <StatCard label="FTDs" value={totals.ftds || 0} />
        <StatCard label="Commission" value={moneyList(totals.commissionByCurrency)} />
        <StatCard label="Deposits" value={moneyList(totals.depositsByCurrency)} />
        <StatCard label="Active links" value={totals.activeLinks || 0} hint={bestLink ? `Best: ${bestLink.brandName}` : ''} />
      </section>

      <section className="affiliate-grid affiliate-grid--charts">
        <section className="affiliate-panel affiliate-panel--wide">
          <h2>Click trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.analytics?.clicksByDay || []}>
              <defs>
                <linearGradient id="affiliateClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#67e8f9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#101522', border: '1px solid #2b3650', borderRadius: 8 }} />
              <Area type="monotone" dataKey="humanClicks" stroke="#67e8f9" fill="url(#affiliateClicks)" strokeWidth={3} />
              <Area type="monotone" dataKey="uniqueClicks" stroke="#a78bfa" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </section>
        <MiniBars title="Sources" data={data?.analytics?.bySource} />
        <MiniBars title="Countries" data={data?.analytics?.byCountry} />
      </section>

      <section className="affiliate-panel">
        <div className="affiliate-panel__title">
          <h2>Your tracking links</h2>
          <span>{data?.links?.length || 0} links</span>
        </div>
        <div className="affiliate-link-table">
          {(data?.links || []).map((link) => (
            <article key={link.id} className="affiliate-link-row">
              <div className="affiliate-brand">
                {link.brandLogoUrl ? <img src={link.brandLogoUrl} alt="" /> : <Link2 size={24} />}
                <div>
                  <strong>{link.brandName}</strong>
                  <span>{link.offerName || 'Default offer'} · {link.destinationDomain}</span>
                </div>
              </div>
              <code>{link.trackingUrl}</code>
              <div className="affiliate-row-metrics">
                <span>{link.clickTotals?.humanClicks || 0}<small>Clicks</small></span>
                <span>{link.clickTotals?.uniqueClicks || 0}<small>Unique</small></span>
                <span>{link.statsTotals?.registrations || 0}<small>Regs</small></span>
                <span>{link.statsTotals?.ftds || 0}<small>FTD</small></span>
              </div>
              <div className="affiliate-row-actions">
                <button type="button" onClick={() => handleCopy(link)}>{copiedId === link.id ? 'Copied' : 'Copy'}</button>
                <a href={link.trackingUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Test</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="affiliate-note">
        <TrendingUp size={18} />
        <p>Tracked clicks are measured by Streamers Center before redirect. Registrations, deposits and commissions are partner-reported, so payout totals can differ until the partner approves the period.</p>
      </section>
    </main>
  );
}
