import React, { useEffect, useState } from 'react';

function formatNumber(value, decimals = 0) {
  const number = Number(value) || 0;
  return number.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function StatCard({ label, value, note, tone = 'neutral' }) {
  return (
    <div className={`an-stat-card an-stat-card--${tone}`}>
      <div className="an-stat-card__content">
        <div className="an-stat-card__value">{value}</div>
        <div className="an-stat-card__label">{label}</div>
        {note && <div className="an-stat-card__note">{note}</div>}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="an-chart-card">
      <h3 className="an-chart-card__title">{title}</h3>
      <div className="an-chart-card__body an-chart-card__body--plain">
        {children}
      </div>
    </section>
  );
}

export default function ProductAnalyticsTab({ analytics, period }) {
  const [data, setData] = useState(null);
  const { fetchProductOverview } = analytics;

  useEffect(() => {
    fetchProductOverview({ period }).then(setData);
  }, [fetchProductOverview, period]);

  if (!data) return <div className="an-tab__loading">Loading product analytics...</div>;

  const playerCurrencyRows = data.player?.totalsByCurrency || [];
  const topOffers = data.offers || [];
  const statuses = Object.entries(data.revenue?.subscriptionStatuses || {});

  return (
    <div className="an-tab">
      <div className="an-stats-grid">
        <StatCard label="Sessions" value={formatNumber(data.acquisition?.sessions)} note={`${formatNumber(data.acquisition?.uniqueVisitors)} unique visitors`} />
        <StatCard label="Player sessions" value={formatNumber(data.acquisition?.playerSessions)} note={`${formatNumber(data.player?.events)} player events`} tone="success" />
        <StatCard label="Streamer sessions" value={formatNumber(data.acquisition?.streamerSessions)} note={`${formatNumber(data.streamer?.overlaySessions)} overlay sessions`} />
        <StatCard label="Offer clicks" value={formatNumber(data.streamer?.offerClicks)} note={`${formatNumber(data.streamer?.offersActive)} active offers`} />
        <StatCard label="Estimated Player MRR" value={formatMoney(data.revenue?.estimatedPlayerMrrEur, 'EUR')} note={`${formatNumber(data.revenue?.activePlayerSubscriptions)} active player subs`} tone="success" />
      </div>

      <div className="an-product-grid">
        <Section title="Player Product">
          <div className="an-metric-list">
            <Metric label="Active subscriptions" value={formatNumber(data.player?.activeSubscriptions)} />
            <Metric label="Trialing" value={formatNumber(data.player?.trialing)} />
            <Metric label="Hunts created" value={formatNumber(data.player?.huntsCreated)} />
            <Metric label="Active hunts" value={formatNumber(data.player?.activeHunts)} />
            <Metric label="Completed hunts" value={formatNumber(data.player?.completedHunts)} />
            <Metric label="Bonuses added" value={formatNumber(data.player?.bonusesAdded)} />
            <Metric label="Bonuses opened" value={formatNumber(data.player?.bonusesOpened)} />
            <Metric label="Average payout" value={formatMoney(data.player?.averagePayout, 'EUR')} />
            <Metric label="Average multiplier" value={`${formatNumber(data.player?.averageMultiplier, 2)}x`} />
          </div>
        </Section>

        <Section title="Streamer Product">
          <div className="an-metric-list">
            <Metric label="Premium users" value={formatNumber(data.streamer?.activePremiumUsers)} />
            <Metric label="Active Stripe subscriptions" value={formatNumber(data.streamer?.activeStripeSubscriptions)} />
            <Metric label="Streamer events" value={formatNumber(data.streamer?.events)} />
            <Metric label="Overlay sessions" value={formatNumber(data.streamer?.overlaySessions)} />
            <Metric label="Premium page views" value={formatNumber(data.streamer?.premiumViews)} />
            <Metric label="Premium offers" value={formatNumber(data.streamer?.premiumOffers)} />
          </div>
        </Section>
      </div>

      <Section title="Player Totals By Currency">
        {playerCurrencyRows.length ? (
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Hunts</th>
                  <th>Deposits</th>
                  <th>Withdrawals</th>
                  <th>Bonus cost</th>
                  <th>Payout</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {playerCurrencyRows.map(row => (
                  <tr key={row.currency}>
                    <td>{row.currency}</td>
                    <td>{formatNumber(row.hunts)}</td>
                    <td>{formatMoney(row.totalDeposits, row.currency)}</td>
                    <td>{formatMoney(row.totalWithdrawals, row.currency)}</td>
                    <td>{formatMoney(row.totalBonusCost, row.currency)}</td>
                    <td>{formatMoney(row.totalPayout, row.currency)}</td>
                    <td className={row.profitLoss >= 0 ? 'an-positive' : 'an-negative'}>
                      {formatMoney(row.profitLoss, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="an-tab__empty">No player hunt totals in this period.</p>
        )}
      </Section>

      <div className="an-product-grid">
        <Section title="Top Offers">
          {topOffers.length ? (
            <div className="an-metric-list">
              {topOffers.map(offer => (
                <Metric
                  key={offer.offer_id}
                  label={offer.name}
                  value={formatNumber(offer.clicks)}
                  note={`${formatNumber(offer.analyticsClicks)} analytics, ${formatNumber(offer.legacyClicks)} legacy`}
                />
              ))}
            </div>
          ) : (
            <p className="an-tab__empty">No offer clicks in this period.</p>
          )}
        </Section>

        <Section title="Subscription Statuses">
          {statuses.length ? (
            <div className="an-metric-list">
              {statuses.map(([status, count]) => (
                <Metric key={status} label={status || 'unknown'} value={formatNumber(count)} />
              ))}
            </div>
          ) : (
            <p className="an-tab__empty">No subscription records found.</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Metric({ label, value, note }) {
  return (
    <div className="an-metric-row">
      <div>
        <span>{label}</span>
        {note && <small>{note}</small>}
      </div>
      <strong>{value}</strong>
    </div>
  );
}
