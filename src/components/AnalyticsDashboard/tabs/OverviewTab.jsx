/**
 * OverviewTab.jsx — Dashboard overview with stats cards and charts.
 */
import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

function formatNumber(value) {
  return (Number(value) || 0).toLocaleString();
}

function objectRows(value = {}, labelKey = 'label', valueKey = 'count') {
  return Object.entries(value)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ [labelKey]: label, [valueKey]: count }));
}

function Breakdown({ title, rows, labelKey = 'label', valueKey = 'count', empty = 'No data yet' }) {
  return (
    <section className="an-chart-card">
      <h3 className="an-chart-card__title">{title}</h3>
      <div className="an-chart-card__body an-chart-card__body--plain">
        {rows.length ? (
          <div className="an-metric-list">
            {rows.map(row => (
              <div className="an-metric-row" key={row[labelKey]}>
                <span>{row[labelKey]}</span>
                <strong>{formatNumber(row[valueKey])}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="an-tab__empty">{empty}</p>
        )}
      </div>
    </section>
  );
}

export default function OverviewTab({ analytics, period }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    analytics.fetchOverview(period).then(setData);
  }, [period]);

  if (!data) {
    return <div className="an-tab__loading">Loading overview...</div>;
  }

  const cards = [
    { label: 'Total Sessions', value: formatNumber(data.totalSessions), trend: data.sessionsTrend, icon: '📡' },
    { label: 'Unique Visitors', value: formatNumber(data.uniqueVisitors), icon: '👤' },
    { label: 'Total Events', value: formatNumber(data.totalEvents), trend: data.eventsTrend, icon: '⚡' },
    { label: 'Page Views', value: formatNumber(data.totalPageViews), icon: '📄' },
    { label: 'Total Clicks', value: formatNumber(data.totalClicks), icon: '🖱️' },
    { label: 'Suspicious', value: formatNumber(data.suspiciousSessions), icon: '🚨', danger: (data.suspiciousSessions || 0) > 0 },
  ];
  const topEvents = data.topEvents || objectRows(data.byEventName || {}, 'event', 'count');
  const experiences = objectRows(data.byExperience || {}, 'experience', 'count');
  const referrers = objectRows(data.byReferrer || {}, 'source', 'sessions');
  const devices = objectRows(data.deviceTypes || {}, 'device', 'sessions');
  const countries = data.topCountries || [];

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

      {/* Activity Chart */}
      <div className="an-chart-card">
        <h3 className="an-chart-card__title">Activity Over Time</h3>
        <div className="an-chart-card__body">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.chart || []}>
              <defs>
                <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pageViewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
              <Area type="monotone" dataKey="pageViews" stroke="#10b981" fill="url(#pageViewsGradient)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="clicks" stroke="#f59e0b" fill="url(#clicksGradient)" strokeWidth={2} dot={false} />
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

      <div className="an-product-grid">
        <Breakdown title="Top Events" rows={topEvents} labelKey="event" valueKey="count" />
        <Breakdown title="Experiences" rows={experiences} labelKey="experience" valueKey="count" />
      </div>

      <div className="an-product-grid">
        <Breakdown title="Traffic Sources" rows={referrers} labelKey="source" valueKey="sessions" />
        <Breakdown title="Devices" rows={devices} labelKey="device" valueKey="sessions" />
      </div>

      <Breakdown title="Top Countries" rows={countries} labelKey="country" valueKey="sessions" />
    </div>
  );
}
