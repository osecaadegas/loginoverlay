/**
 * DeveloperPage.jsx — Admin-only developer tools & info page.
 */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { useAuth } from '../../context/AuthContext';
import './DeveloperPage.css';

export default function DeveloperPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState('overview');

  if (authLoading || adminLoading) {
    return (
      <div className="dev-page">
        <div className="dev-loading">
          <div className="dev-spinner" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/offers" replace />;
  }

  const tabs = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'routes',   icon: '🗺️', label: 'Routes' },
    { key: 'env',      icon: '⚙️', label: 'Environment' },
    { key: 'logs',     icon: '📝', label: 'Logs' },
  ];

  return (
    <div className="dev-page">
      <div className="dev-layout">
        {/* Header */}
        <header className="dev-header">
          <div className="dev-header-left">
            <span className="dev-header-icon">🛠️</span>
            <h1 className="dev-header-title">Developer</h1>
          </div>
          <div className="dev-header-right">
            <span className="dev-user-badge">
              <span className="dev-badge-dot" />
              {user.email}
            </span>
          </div>
        </header>

        {/* Tab navigation */}
        <nav className="dev-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`dev-tab ${activeTab === tab.key ? 'dev-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="dev-tab-icon">{tab.icon}</span>
              <span className="dev-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <main className="dev-content">
          {activeTab === 'overview' && <OverviewPanel />}
          {activeTab === 'routes' && <RoutesPanel />}
          {activeTab === 'env' && <EnvPanel />}
          {activeTab === 'logs' && <LogsPanel />}
        </main>
      </div>
    </div>
  );
}

/* ── Overview Panel ── */
function OverviewPanel() {
  return (
    <div className="dev-panel">
      <h2 className="dev-panel-title">Project Overview</h2>
      <div className="dev-card-grid">
        <InfoCard title="Framework" value="React 18 + Vite 5" icon="⚛️" />
        <InfoCard title="Hosting" value="Vercel" icon="▲" />
        <InfoCard title="Database" value="Supabase (PostgreSQL)" icon="🗄️" />
        <InfoCard title="Styling" value="Tailwind CSS + Custom CSS" icon="🎨" />
        <InfoCard title="Auth" value="Supabase Auth (Twitch OAuth)" icon="🔐" />
        <InfoCard title="Realtime" value="Supabase Realtime" icon="📡" />
      </div>

      <h3 className="dev-section-title">Quick Links</h3>
      <div className="dev-links">
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="dev-link">
          Supabase Dashboard →
        </a>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="dev-link">
          Vercel Dashboard →
        </a>
        <a href="https://dev.twitch.tv/console" target="_blank" rel="noopener noreferrer" className="dev-link">
          Twitch Developer Console →
        </a>
      </div>
    </div>
  );
}

/* ── Routes Panel ── */
function RoutesPanel() {
  const routes = [
    { path: '/', desc: 'Landing page' },
    { path: '/offers', desc: 'Partners & offers' },
    { path: '/tournaments', desc: 'Tournaments page' },
    { path: '/giveaways', desc: 'Giveaways page' },
    { path: '/vouchers', desc: 'Voucher redeem' },
    { path: '/daily-wheel', desc: 'Daily wheel spin' },
    { path: '/games/blackjack', desc: 'Blackjack game' },
    { path: '/games/mines', desc: 'Mines game' },
    { path: '/games/thelife', desc: 'The Life RPG' },
    { path: '/points', desc: 'StreamElements points' },
    { path: '/profile', desc: 'User profile' },
    { path: '/admin', desc: 'Admin panel' },
    { path: '/overlay-center', desc: 'Overlay control center' },
    { path: '/overlay/:token', desc: 'Overlay renderer (OBS)' },
    { path: '/developer', desc: 'Developer page (this page)' },
    { path: '/webmod/slot-manager', desc: 'Slot manager (webmod)' },
    { path: '/webmod/voucher-manager', desc: 'Voucher manager (admin)' },
    { path: '/webmod/giveaway-creator', desc: 'Giveaway creator (admin)' },
  ];

  return (
    <div className="dev-panel">
      <h2 className="dev-panel-title">Application Routes</h2>
      <div className="dev-table-wrap">
        <table className="dev-table">
          <thead>
            <tr>
              <th>Path</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(r => (
              <tr key={r.path}>
                <td><code>{r.path}</code></td>
                <td>{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Environment Panel ── */
function EnvPanel() {
  const envVars = [
    { key: 'VITE_SUPABASE_URL', status: !!import.meta.env.VITE_SUPABASE_URL },
    { key: 'VITE_SUPABASE_ANON_KEY', status: !!import.meta.env.VITE_SUPABASE_ANON_KEY },
    { key: 'VITE_SPOTIFY_CLIENT_ID', status: !!import.meta.env.VITE_SPOTIFY_CLIENT_ID },
    { key: 'VITE_SE_CHANNEL_ID', status: !!import.meta.env.VITE_SE_CHANNEL_ID },
    { key: 'VITE_SE_JWT_TOKEN', status: !!import.meta.env.VITE_SE_JWT_TOKEN },
    { key: 'VITE_AZURE_TRANSLATOR_KEY', status: !!import.meta.env.VITE_AZURE_TRANSLATOR_KEY },
    { key: 'VITE_STRIPE_PREMIUM_PRICE_ID', status: !!import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID },
  ];

  return (
    <div className="dev-panel">
      <h2 className="dev-panel-title">Environment Variables</h2>
      <p className="dev-muted">Shows whether each variable is set (values are hidden for security).</p>
      <div className="dev-env-list">
        {envVars.map(v => (
          <div key={v.key} className="dev-env-row">
            <code className="dev-env-key">{v.key}</code>
            <span className={`dev-env-status ${v.status ? 'dev-env-status--ok' : 'dev-env-status--missing'}`}>
              {v.status ? '✓ Set' : '✗ Missing'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Logs Panel (placeholder for future use) ── */
function LogsPanel() {
  return (
    <div className="dev-panel">
      <h2 className="dev-panel-title">Application Logs</h2>
      <p className="dev-muted">Console log viewer — coming soon. For now, check your browser DevTools or Vercel logs.</p>
      <div className="dev-placeholder">
        <span className="dev-placeholder-icon">📋</span>
        <span>Log streaming will appear here in a future update</span>
      </div>
    </div>
  );
}

/* ── Info Card Component ── */
function InfoCard({ title, value, icon }) {
  return (
    <div className="dev-info-card">
      <span className="dev-info-card-icon">{icon}</span>
      <div className="dev-info-card-text">
        <span className="dev-info-card-title">{title}</span>
        <span className="dev-info-card-value">{value}</span>
      </div>
    </div>
  );
}
