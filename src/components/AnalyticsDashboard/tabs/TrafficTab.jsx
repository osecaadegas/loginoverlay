/**
 * TrafficTab.jsx — Traffic source analytics.
 */
import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4'];
const SOURCE_LABELS = {
  direct: '🔗 Direct',
  twitch: '🟣 Twitch',
  search: '🔍 Search',
  social: '📱 Social',
  other: '🌐 Other',
};

export default function TrafficTab({ analytics, period }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    analytics.fetchTraffic({ since }).then(setData);
  }, [period]);

  if (!data) return <div className="an-tab__loading">Loading traffic data...</div>;

  const sources = data.sources || [];
  const totalSessions = sources.reduce((s, src) => s + src.sessions, 0);
  const chartData = sources.map(s => ({
    name: SOURCE_LABELS[s.source] || s.source,
    value: s.sessions,
  }));

  return (
    <div className="an-tab">
      <div className="an-traffic-grid">
        {/* Pie Chart */}
        <div className="an-chart-card">
          <h3 className="an-chart-card__title">Traffic Distribution</h3>
          <div className="an-chart-card__body" style={{ height: 300 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="an-tab__empty">No traffic data</p>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="an-card">
          <h3 className="an-card__title">Source Breakdown</h3>
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr>
                  <th>Source</th><th>Sessions</th><th>Share</th><th>Visitors</th>
                  <th>Bounce Rate</th><th>Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => (
                  <tr key={s.source}>
                    <td>
                      <span className="an-source-dot" style={{ background: COLORS[i % COLORS.length] }} />
                      {SOURCE_LABELS[s.source] || s.source}
                    </td>
                    <td>{s.sessions.toLocaleString()}</td>
                    <td>{totalSessions > 0 ? ((s.sessions / totalSessions) * 100).toFixed(1) : 0}%</td>
                    <td>{s.unique_visitors}</td>
                    <td>{s.bounce_rate}%</td>
                    <td>{s.avg_duration ? `${Math.floor(s.avg_duration / 60)}m ${s.avg_duration % 60}s` : '-'}</td>
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
