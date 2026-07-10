import React, { useEffect, useState } from 'react';

function formatNumber(value, decimals = 0) {
  return (Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function QualityCard({ label, value, note, bad }) {
  return (
    <div className={`an-stat-card ${bad ? 'an-stat-card--danger' : ''}`}>
      <div className="an-stat-card__content">
        <div className="an-stat-card__value">{value}</div>
        <div className="an-stat-card__label">{label}</div>
        {note && <div className="an-stat-card__note">{note}</div>}
      </div>
    </div>
  );
}

export default function DataQualityTab({ analytics, period }) {
  const [data, setData] = useState(null);
  const { fetchDataQuality } = analytics;

  useEffect(() => {
    fetchDataQuality({ period }).then(setData);
  }, [fetchDataQuality, period]);

  if (!data) return <div className="an-tab__loading">Loading data quality...</div>;

  const issues = data.issues || {};
  const coverage = data.coverage || {};
  const examples = data.examples || {};

  return (
    <div className="an-tab">
      <div className="an-stats-grid">
        <QualityCard label="Events checked" value={formatNumber(data.totalEvents)} note={`${data.period || period} sample`} />
        <QualityCard label="Known event coverage" value={`${formatNumber(coverage.knownEventPercent, 1)}%`} bad={coverage.knownEventPercent < 90} />
        <QualityCard label="Route coverage" value={`${formatNumber(coverage.routePercent, 1)}%`} bad={coverage.routePercent < 95} />
        <QualityCard label="Event ID coverage" value={`${formatNumber(coverage.eventIdPercent, 1)}%`} bad={coverage.eventIdPercent < 95} />
      </div>

      <div className="an-product-grid">
        <section className="an-chart-card">
          <h3 className="an-chart-card__title">Tracking Issues</h3>
          <div className="an-chart-card__body an-chart-card__body--plain">
            <div className="an-metric-list">
              <Issue label="Unknown event names" value={issues.unknownEvents} />
              <Issue label="Missing route or page" value={issues.missingRoute} />
              <Issue label="Missing product context" value={issues.missingProductContext} />
              <Issue label="Offer clicks missing offer" value={issues.offerClicksMissingOffer} />
              <Issue label="Missing session" value={issues.missingSession} />
              <Issue label="Missing visitor" value={issues.missingVisitor} />
            </div>
          </div>
        </section>

        <section className="an-chart-card">
          <h3 className="an-chart-card__title">What This Means</h3>
          <div className="an-chart-card__body an-chart-card__body--plain">
            <p className="an-tab__footnote">
              Event ID coverage should increase after the new frontend SDK is deployed. Unknown events usually come from
              older tracking names or direct calls that bypass the shared analytics taxonomy.
            </p>
            <p className="an-tab__footnote">
              Route and product context are required to split reporting between Player, Streamer, Overlay and Admin areas.
            </p>
          </div>
        </section>
      </div>

      <section className="an-chart-card">
        <h3 className="an-chart-card__title">Unknown Event Examples</h3>
        <div className="an-chart-card__body an-chart-card__body--plain">
          <ExampleTable rows={examples.unknownEvents || []} empty="No unknown events in this period." />
        </div>
      </section>

      <section className="an-chart-card">
        <h3 className="an-chart-card__title">Missing Route Examples</h3>
        <div className="an-chart-card__body an-chart-card__body--plain">
          <ExampleTable rows={examples.missingRoute || []} empty="No missing-route events in this period." />
        </div>
      </section>
    </div>
  );
}

function Issue({ label, value }) {
  const count = Number(value) || 0;
  return (
    <div className="an-metric-row">
      <span>{label}</span>
      <strong className={count > 0 ? 'an-negative' : 'an-positive'}>{formatNumber(count)}</strong>
    </div>
  );
}

function ExampleTable({ rows, empty }) {
  if (!rows.length) return <p className="an-tab__empty">{empty}</p>;
  return (
    <div className="an-table-wrap">
      <table className="an-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Legacy type</th>
            <th>Event name</th>
            <th>Page</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</td>
              <td>{row.event_type || '-'}</td>
              <td>{row.event_name || '-'}</td>
              <td>{row.page_url || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
