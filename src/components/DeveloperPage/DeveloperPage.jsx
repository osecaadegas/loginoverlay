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
    { key: 'api',      icon: '🔌', label: 'API' },
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
          {activeTab === 'api' && <ApiPanel />}
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
        <InfoCard title="Hosting" value="Vercel (Serverless)" icon="▲" />
        <InfoCard title="Database" value="Supabase (PostgreSQL)" icon="🗄️" />
        <InfoCard title="Styling" value="Tailwind CSS + Custom CSS" icon="🎨" />
        <InfoCard title="Auth" value="Twitch · Discord · Google" icon="🔐" />
        <InfoCard title="Payments" value="Stripe Subscriptions" icon="💳" />
        <InfoCard title="Realtime" value="Supabase Realtime" icon="📡" />
        <InfoCard title="Domain" value="osecaadegas.pt" icon="🌐" />
      </div>

      <h3 className="dev-section-title">Quick Links</h3>
      <div className="dev-links">
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="dev-link">
          Supabase Dashboard →
        </a>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="dev-link">
          Vercel Dashboard →
        </a>
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="dev-link">
          Stripe Dashboard →
        </a>
        <a href="https://dev.twitch.tv/console" target="_blank" rel="noopener noreferrer" className="dev-link">
          Twitch Developer Console →
        </a>
        <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="dev-link">
          Discord Developer Portal →
        </a>
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="dev-link">
          Google Cloud Console →
        </a>
        <a href="https://github.com/osecaadegas/loginoverlay" target="_blank" rel="noopener noreferrer" className="dev-link">
          GitHub Repository →
        </a>
      </div>
    </div>
  );
}

/* ── Routes Panel ── */
function RoutesPanel() {
  const routes = [
    { path: '/', desc: 'Landing page', access: 'Public' },
    { path: '/login', desc: 'Multi-platform login (Twitch, Discord, Google)', access: 'Public' },
    { path: '/offers', desc: 'Partners & casino offers', access: 'Public' },
    { path: '/tournaments', desc: 'Tournament listings', access: 'Public' },
    { path: '/guess-balance', desc: 'Guess the balance game', access: 'Public' },
    { path: '/giveaways', desc: 'Active giveaways', access: 'Public' },
    { path: '/vouchers', desc: 'Voucher redeem page', access: 'Public' },
    { path: '/daily-wheel', desc: 'Daily spin wheel', access: 'Public' },
    { path: '/premium', desc: 'Premium subscription tiers', access: 'Public' },
    { path: '/privacy', desc: 'Privacy policy (GDPR)', access: 'Public' },
    { path: '/terms', desc: 'Terms of service', access: 'Public' },
    { path: '/games/blackjack', desc: 'Blackjack game', access: 'User' },
    { path: '/games/mines', desc: 'Mines game', access: 'User' },
    { path: '/games/thelife', desc: 'The Life RPG', access: 'User' },
    { path: '/games/thelife/season-pass', desc: 'Season pass store', access: 'User' },
    { path: '/games/thelife/news', desc: 'The Life journal / news', access: 'User' },
    { path: '/games/dice', desc: 'Dice (coming soon)', access: 'User' },
    { path: '/games/roulette', desc: 'Roulette (coming soon)', access: 'User' },
    { path: '/points', desc: 'StreamElements points panel', access: 'User' },
    { path: '/profile', desc: 'User profile', access: 'User' },
    { path: '/admin', desc: 'Admin panel', access: 'Admin' },
    { path: '/overlay-center', desc: 'Overlay control center (premium)', access: 'Admin' },
    { path: '/overlay/:token', desc: 'Overlay renderer (OBS source)', access: 'Public' },
    { path: '/developer', desc: 'Developer tools (this page)', access: 'Admin' },
    { path: '/webmod/slot-manager', desc: 'Slot manager', access: 'Mod' },
    { path: '/webmod/points-manager', desc: 'Points manager', access: 'Mod' },
    { path: '/webmod/voucher-manager', desc: 'Voucher manager', access: 'Admin' },
    { path: '/webmod/giveaway-creator', desc: 'Giveaway creator', access: 'Admin' },
    { path: '/spotify-callback', desc: 'Spotify OAuth callback', access: 'System' },
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
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(r => (
              <tr key={r.path}>
                <td><code>{r.path}</code></td>
                <td>{r.desc}</td>
                <td><span className={`dev-access-badge dev-access-badge--${r.access.toLowerCase()}`}>{r.access}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Environment Panel ── */
function ApiPanel() {
  const endpoints = [
    { method: 'POST', path: '/api/stripe/create-checkout', desc: 'Create Stripe subscription checkout session' },
    { method: 'POST', path: '/api/stripe/webhook', desc: 'Stripe webhook (checkout, invoice, cancellation)' },
    { method: 'POST', path: '/api/blackjack', desc: 'Blackjack game server actions' },
    { method: 'POST', path: '/api/mines', desc: 'Mines game server actions' },
    { method: 'POST', path: '/api/thelife-wipe', desc: 'The Life season wipe' },
    { method: 'POST', path: '/api/auto-draw-winners', desc: 'Auto-draw giveaway winners' },
    { method: 'GET',  path: '/api/clip-video', desc: 'Clip video proxy' },
    { method: 'GET',  path: '/api/image-search', desc: 'Image search proxy' },
    { method: 'POST', path: '/api/raid-shoutout', desc: 'Raid shoutout handler' },
    { method: 'POST', path: '/api/slot-ai', desc: 'Slot AI suggestions' },
    { method: 'POST', path: '/api/streamelements/award-points', desc: 'Award StreamElements points' },
  ];

  return (
    <div className="dev-panel">
      <h2 className="dev-panel-title">API Endpoints</h2>
      <p className="dev-muted">Vercel serverless functions in <code>/api</code>.</p>
      <div className="dev-table-wrap">
        <table className="dev-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map(e => (
              <tr key={e.path}>
                <td><span className={`dev-method dev-method--${e.method.toLowerCase()}`}>{e.method}</span></td>
                <td><code>{e.path}</code></td>
                <td>{e.desc}</td>
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
    { key: 'VITE_SUPABASE_URL', desc: 'Supabase project URL', status: !!import.meta.env.VITE_SUPABASE_URL },
    { key: 'VITE_SUPABASE_ANON_KEY', desc: 'Supabase anon/public key', status: !!import.meta.env.VITE_SUPABASE_ANON_KEY },
    { key: 'VITE_SPOTIFY_CLIENT_ID', desc: 'Spotify OAuth client ID', status: !!import.meta.env.VITE_SPOTIFY_CLIENT_ID },
    { key: 'VITE_SE_CHANNEL_ID', desc: 'StreamElements channel ID', status: !!import.meta.env.VITE_SE_CHANNEL_ID },
    { key: 'VITE_SE_JWT_TOKEN', desc: 'StreamElements JWT token', status: !!import.meta.env.VITE_SE_JWT_TOKEN },
    { key: 'VITE_AZURE_TRANSLATOR_KEY', desc: 'Azure Translator API key', status: !!import.meta.env.VITE_AZURE_TRANSLATOR_KEY },
  ];

  const serverVars = [
    { key: 'STRIPE_SECRET_KEY', desc: 'Stripe secret API key' },
    { key: 'STRIPE_WEBHOOK_SECRET', desc: 'Stripe webhook signing secret' },
    { key: 'STRIPE_PRICE_1M', desc: 'Stripe price ID — 1 month (€15)' },
    { key: 'STRIPE_PRICE_3M', desc: 'Stripe price ID — 3 months (€40)' },
    { key: 'STRIPE_PRICE_6M', desc: 'Stripe price ID — 6 months (€60)' },
    { key: 'STRIPE_PRICE_12M', desc: 'Stripe price ID — 12 months (€120)' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Supabase service role key (server only)' },
    { key: 'SITE_URL', desc: 'Production URL for redirects' },
  ];

  return (
    <div className="dev-panel">
      <h2 className="dev-panel-title">Environment Variables</h2>
      <p className="dev-muted">Client-side variables (exposed to browser via <code>VITE_</code> prefix).</p>
      <div className="dev-env-list">
        {envVars.map(v => (
          <div key={v.key} className="dev-env-row">
            <code className="dev-env-key">{v.key}</code>
            <span className="dev-env-desc">{v.desc}</span>
            <span className={`dev-env-status ${v.status ? 'dev-env-status--ok' : 'dev-env-status--missing'}`}>
              {v.status ? '✓ Set' : '✗ Missing'}
            </span>
          </div>
        ))}
      </div>

      <h3 className="dev-section-title" style={{ marginTop: '24px' }}>Server-Side (Vercel)</h3>
      <p className="dev-muted">Set in Vercel dashboard → Environment Variables. Not accessible from browser.</p>
      <div className="dev-env-list">
        {serverVars.map(v => (
          <div key={v.key} className="dev-env-row">
            <code className="dev-env-key">{v.key}</code>
            <span className="dev-env-desc">{v.desc}</span>
            <span className="dev-env-status dev-env-status--server">Server</span>
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
