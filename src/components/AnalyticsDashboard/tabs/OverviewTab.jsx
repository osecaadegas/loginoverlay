/**
 * OverviewTab.jsx — Dashboard overview with stats cards and charts.
 */
import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

export default function OverviewTab({ analytics, period }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    analytics.fetchOverview(period).then(setData);
  }, [period]);

  if (!data) {
    return <div className="an-tab__loading">Loading overview...</div>;
  }

  const cards = [
    { label: 'Total Sessions', value: data.totalSessions?.toLocaleString(), trend: data.sessionsTrend, icon: '🔗' },
    { label: 'Unique Visitors', value: data.uniqueVisitors?.toLocaleString(), icon: '👤' },
    { label: 'Total Events', value: data.totalEvents?.toLocaleString(), trend: data.eventsTrend, icon: '📌' },
    { label: 'Total Clicks', value: data.totalClicks?.toLocaleString(), icon: '🖱️' },
    { label: 'Suspicious', value: data.suspiciousSessions?.toLocaleString(), icon: '🚨', danger: data.suspiciousSessions > 0 },
  ];

  return (
    <div className="an-tab">
      {/* Stats Cards */}
      <div className="an-stats-grid">
        {cards.map((card, i) => (
          <div key={i} className={`an-stat-card ${card.danger ? 'an-stat-card--danger' : ''}`}>
            <div className="an-stat-card__icon">{card.icon}</div>
            <div className="an-stat-card__content">
              <div className="an-stat-card__value">{card.value}</div>
              <div className="an-stat-card__label">{card.label}</div>
            </div>
            {card.trend && (
              <div className={`an-stat-card__trend ${card.trend.startsWith('+') ? 'an-stat-card__trend--up' : 'an-stat-card__trend--down'}`}>
                {card.trend}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sessions Chart */}
      <div className="an-chart-card">
        <h3 className="an-chart-card__title">Sessions Over Time</h3>
        <div className="an-chart-card__body">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.chart || []}>
              <defs>
                <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#a5b4fc' }}
              />
              <Area type="monotone" dataKey="sessions" stroke="#6366f1" fill="url(#sessionsGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Pages */}
      <div className="an-chart-card">
        <h3 className="an-chart-card__title">Top Pages</h3>
        <div className="an-chart-card__body">
          {data.topPages && data.topPages.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, data.topPages.length * 36)}>
              <BarChart data={data.topPages} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="page" tick={{ fill: '#9ca3af', fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Bar dataKey="views" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="an-tab__empty">No page data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
