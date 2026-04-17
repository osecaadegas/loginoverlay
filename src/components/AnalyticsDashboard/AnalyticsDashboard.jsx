/**
 * AnalyticsDashboard.jsx — Full analytics admin panel.
 *
 * Tabs: Overview | Users | Offers | Realtime | Traffic | Geo | Fraud | Settings
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
import OverviewTab from './tabs/OverviewTab';
import UsersTab from './tabs/UsersTab';
import OffersTab from './tabs/OffersTab';
import RealtimeTab from './tabs/RealtimeTab';
import TrafficTab from './tabs/TrafficTab';
import GeoTab from './tabs/GeoTab';
import FraudTab from './tabs/FraudTab';
import SettingsTab from './tabs/SettingsTab';
import './AnalyticsDashboard.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'offers', label: 'Offers', icon: '🎰' },
  { id: 'realtime', label: 'Realtime', icon: '⚡' },
  { id: 'traffic', label: 'Traffic', icon: '🔗' },
  { id: 'geo', label: 'Geo', icon: '🌍' },
  { id: 'fraud', label: 'Fraud', icon: '🛡️' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function AnalyticsDashboard() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const analytics = useAnalyticsData();

  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(TABS.find(t => t.id === initialTab) ? initialTab : 'overview');
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/');
  }, [isAdmin, adminLoading, navigate]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  }, [setSearchParams]);

  if (adminLoading) {
    return (
      <div className="an-dash an-dash--loading">
        <div className="an-dash__spinner" />
        <span>Loading analytics...</span>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="an-dash">
      {/* Header */}
      <div className="an-dash__header">
        <div className="an-dash__header-left">
          <h1 className="an-dash__title">📈 Analytics Dashboard</h1>
          <p className="an-dash__subtitle">Track visitors, clicks, and fraud in real-time</p>
        </div>
        <div className="an-dash__header-right">
          <select
            className="an-dash__period-select"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="an-dash__tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`an-dash__tab ${activeTab === tab.id ? 'an-dash__tab--active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="an-dash__tab-icon">{tab.icon}</span>
            <span className="an-dash__tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="an-dash__content">
        {analytics.error && (
          <div className="an-dash__error">
            ⚠️ {analytics.error}
          </div>
        )}

        {activeTab === 'overview' && <OverviewTab analytics={analytics} period={period} />}
        {activeTab === 'users' && <UsersTab analytics={analytics} period={period} />}
        {activeTab === 'offers' && <OffersTab analytics={analytics} period={period} />}
        {activeTab === 'realtime' && <RealtimeTab analytics={analytics} />}
        {activeTab === 'traffic' && <TrafficTab analytics={analytics} period={period} />}
        {activeTab === 'geo' && <GeoTab analytics={analytics} period={period} />}
        {activeTab === 'fraud' && <FraudTab analytics={analytics} />}
        {activeTab === 'settings' && <SettingsTab analytics={analytics} />}
      </div>
    </div>
  );
}
