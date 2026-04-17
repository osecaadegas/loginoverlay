/**
 * OffersTab.jsx — Offer performance analytics.
 */
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

export default function OffersTab({ analytics, period }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    analytics.fetchOffers({ since }).then(setData);
  }, [period]);

  if (!data) return <div className="an-tab__loading">Loading offer stats...</div>;

  const offers = data.offers || [];
  const chartData = offers.slice(0, 10).map(o => ({
    name: o.name?.length > 20 ? o.name.slice(0, 18) + '...' : o.name,
    clicks: o.clean_clicks,
    suspicious: o.suspicious_clicks,
  }));

  return (
    <div className="an-tab">
      {/* Chart */}
      {chartData.length > 0 && (
        <div className="an-chart-card">
          <h3 className="an-chart-card__title">Top Offers by Clicks</h3>
          <div className="an-chart-card__body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Bar dataKey="clicks" stackId="a" fill="#22c55e" name="Clean Clicks" radius={[0, 0, 0, 0]} />
                <Bar dataKey="suspicious" stackId="a" fill="#ef4444" name="Suspicious" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="an-table-wrap">
        <table className="an-table">
          <thead>
            <tr>
              <th>Offer</th><th>Total Clicks</th><th>Clean</th><th>Suspicious</th>
              <th>Unique Clickers</th><th>CTR</th>
            </tr>
          </thead>
          <tbody>
            {offers.map(o => (
              <tr key={o.offer_id}>
                <td className="an-table__offer-name">{o.name}</td>
                <td>{o.total_clicks}</td>
                <td className="an-text--success">{o.clean_clicks}</td>
                <td className={o.suspicious_clicks > 0 ? 'an-text--danger' : ''}>{o.suspicious_clicks}</td>
                <td>{o.unique_clickers}</td>
                <td>{o.ctr}%</td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr><td colSpan="6" className="an-table__empty">No offer data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="an-tab__footnote">
        Total pageviews in period: {data.totalPageviews?.toLocaleString()}
        · CTR = clicks / total pageviews
      </p>
    </div>
  );
}
