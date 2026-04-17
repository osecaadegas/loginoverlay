/**
 * GeoTab.jsx — Geographic analytics with country/city breakdown.
 */
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function GeoTab({ analytics, period }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    analytics.fetchGeo({ since }).then(setData);
  }, [period]);

  if (!data) return <div className="an-tab__loading">Loading geo data...</div>;

  const countries = data.countries || [];
  const cities = data.cities || [];
  const totalSessions = countries.reduce((s, c) => s + c.sessions, 0);

  const chartData = countries.slice(0, 10).map(c => ({
    name: `${getFlagEmoji(c.country_code)} ${c.country}`,
    sessions: c.sessions,
    visitors: c.unique_visitors,
  }));

  return (
    <div className="an-tab">
      {/* Country Chart */}
      {chartData.length > 0 && (
        <div className="an-chart-card">
          <h3 className="an-chart-card__title">Top Countries</h3>
          <div className="an-chart-card__body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} width={130} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Bar dataKey="sessions" fill="#6366f1" radius={[0, 4, 4, 0]} name="Sessions" />
                <Bar dataKey="visitors" fill="#22c55e" radius={[0, 4, 4, 0]} name="Unique Visitors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="an-geo-grid">
        {/* Countries Table */}
        <div className="an-card">
          <h3 className="an-card__title">Countries ({countries.length})</h3>
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr><th>Country</th><th>Sessions</th><th>Share</th><th>Visitors</th></tr>
              </thead>
              <tbody>
                {countries.map(c => (
                  <tr key={c.country_code}>
                    <td>{getFlagEmoji(c.country_code)} {c.country}</td>
                    <td>{c.sessions.toLocaleString()}</td>
                    <td>{totalSessions > 0 ? ((c.sessions / totalSessions) * 100).toFixed(1) : 0}%</td>
                    <td>{c.unique_visitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cities Table */}
        <div className="an-card">
          <h3 className="an-card__title">Top Cities</h3>
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr><th>City</th><th>Country</th><th>Sessions</th></tr>
              </thead>
              <tbody>
                {cities.map((c, i) => (
                  <tr key={i}>
                    <td>{c.city}</td>
                    <td>{getFlagEmoji(c.country_code)} {c.country_code}</td>
                    <td>{c.sessions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}
