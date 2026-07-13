import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BadgeEuro,
  Crown,
  Grid3X3,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';
import './TopNavigation.css';

function Brand() {
  return (
    <a href="https://streamerscenter.com/" className="topnav-brand" aria-label="Streamers Center home">
      <span className="topnav-brand__mark">
        <img src="/StreamerCenterLogo.png" alt="" />
      </span>
    </a>
  );
}

function TopNavLink({ to, icon: Icon, children, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `topnav-link${isActive ? ' topnav-link--active' : ''}`}
      onClick={onClick}
    >
      <Icon size={17} />
      <span>{children}</span>
    </NavLink>
  );
}

export default function TopNavigation() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPlayerExperience = location.pathname.startsWith('/player');
  const primaryLinks = [
    { to: '/player/bonus-hunt', label: 'Bonus Hunt', icon: LayoutDashboard },
    { to: '/offers', label: 'Deals', icon: BadgeEuro },
    { to: '/overlay-center', label: 'Overlays', icon: LayoutDashboard },
    { to: '/premium', label: 'Premium', icon: Crown },
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const renderPrimaryLinks = () => (
    <>
      {primaryLinks.map((link) => (
        <TopNavLink key={link.to} to={link.to} icon={link.icon}>
          {link.label}
        </TopNavLink>
      ))}
    </>
  );

  return (
    <header className="topnav-shell">
      <Brand />

      <nav className="topnav-links" aria-label={isPlayerExperience ? 'Player navigation' : 'Streamer navigation'}>
        {renderPrimaryLinks()}
      </nav>

      <div className="topnav-actions">
        <NavLink
          to="/apps"
          className={({ isActive }) => `topnav-account${isActive ? ' topnav-account--active' : ''}`}
        >
          <Grid3X3 size={17} />
          <span>Apps</span>
        </NavLink>

        <button
          type="button"
          className="topnav-mobile-toggle"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="topnav-mobile-panel">
          <nav aria-label="Mobile navigation">{renderPrimaryLinks()}</nav>
          <TopNavLink to="/apps" icon={Grid3X3}>Apps</TopNavLink>
        </div>
      )}
    </header>
  );
}
