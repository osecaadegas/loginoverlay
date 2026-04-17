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
    { label: 'Total Sessions', value: data.totalSessions?.toLocaleString() ?? '0', trend: data.sessionsTrend, icon: '📡' },
    { label: 'Unique Visitors', value: data.uniqueVisitors?.toLocaleString() ?? '0', icon: '👤' },
    { label: 'Total Events', value: data.totalEvents?.toLocaleString() ?? '0', trend: data.eventsTrend, icon: '⚡' },
    { label: 'Total Clicks', value: data.totalClicks?.toLocaleString() ?? '0', icon: '🖱️' },
    { label: 'Suspicious', value: data.suspiciousSessions?.toLocaleString() ?? '0', icon: '🚨', danger: (data.suspiciousSessions || 0) > 0 },
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
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => d.slice(5)} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
              <Tooltip
                contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                labelStyle={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}
                itemStyle={{ color: '#a5b4fc', fontSize: 13 }}
                cursor={{ stroke: 'rgba(99,102,241,0.3)' }}
              />
              <Area type="monotone" dataKey="sessions" stroke="#6366f1" fill="url(#sessionsGradient)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: '#6366f1', strokeWidth: 2, fill: '#1e1b4b' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Pages */}
      <div className="an-chart-card">
        <h3 className="an-chart-card__title">Top Pages</h3>
        <div className="an-chart-card__body">
          {data.topPages && data.topPages.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, data.topPages.length * 40)}>
              <BarChart data={data.topPages} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <YAxis type="category" dataKey="page" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                  labelStyle={{ color: '#64748b' }}
                  cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                />
                <Bar dataKey="views" fill="url(#barGradient)" radius={[0, 6, 6, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
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
