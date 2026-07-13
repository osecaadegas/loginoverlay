import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeEuro,
  BarChart3,
  Crown,
  Grid3X3,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Shield,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
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
  const { user, signOut } = useAuth();
  const { isAdmin, isSlotModder } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const accountRef = useRef(null);

  const isPlayerExperience = location.pathname.startsWith('/player');
  const primaryLinks = [
    { to: '/player/bonus-hunt', label: 'Bonus Hunt', icon: LayoutDashboard },
    { to: '/offers', label: 'Deals', icon: BadgeEuro },
    { to: '/overlay-center', label: 'Overlays', icon: LayoutDashboard },
    { to: '/premium', label: 'Premium', icon: Crown },
  ];
  const moreItems = [
    { to: '/player/bonus-hunt', label: 'Bonus Hunt', desc: 'Player hunt tracker', icon: LayoutDashboard, tone: 'blue' },
    { to: '/offers', label: 'Deals', desc: 'Casino offers and partners', icon: BadgeEuro, tone: 'green' },
    { to: '/overlay-center', label: 'Overlay Center', desc: 'OBS widgets and tools', icon: Grid3X3, tone: 'cyan' },
    { to: '/premium', label: 'Premium', desc: 'Plans and access', icon: Crown, tone: 'gold' },
    ...(user ? [{ to: '/profile', label: 'Profile', desc: 'Account settings', icon: UserRound, tone: 'violet' }] : []),
    ...(isAdmin ? [
      { to: '/admin', label: 'Admin Panel', desc: 'Platform management', icon: Shield, tone: 'red' },
      { to: '/analytics', label: 'Analytics', desc: 'Platform statistics', icon: BarChart3, tone: 'blue' },
    ] : []),
    ...(isSlotModder ? [{ to: '/webmod/slot-manager', label: 'Slot Manager', desc: 'Slot database tools', icon: Shield, tone: 'green' }] : []),
  ];

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const login = () => {
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
  };

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  const closeMenus = () => {
    setMoreOpen(false);
    setMobileOpen(false);
  };

  const renderPrimaryLinks = () => (
    <>
      {primaryLinks.map((link) => (
        <TopNavLink key={link.to} to={link.to} icon={link.icon}>
          {link.label}
        </TopNavLink>
      ))}
    </>
  );

  const renderMoreMenu = () => (
    <div className="topnav-more-menu" role="menu" aria-label="More sections">
      <div className="topnav-more-grid">
        {moreItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} role="menuitem" className={`topnav-more-tile topnav-more-tile--${item.tone}`} onClick={closeMenus}>
              <Icon size={24} />
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </Link>
          );
        })}
        {user ? (
          <button type="button" role="menuitem" onClick={logout} className="topnav-more-tile topnav-more-tile--danger">
            <LogOut size={24} />
            <strong>Logout</strong>
            <span>End this session</span>
          </button>
        ) : (
          <button type="button" role="menuitem" onClick={login} className="topnav-more-tile topnav-more-tile--violet">
            <LogIn size={24} />
            <strong>Login</strong>
            <span>Access your tools</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <header className="topnav-shell">
      <Brand />

      <nav className="topnav-links" aria-label={isPlayerExperience ? 'Player navigation' : 'Streamer navigation'}>
        {renderPrimaryLinks()}
      </nav>

      <div className="topnav-actions" ref={accountRef}>
        <button
          type="button"
          className="topnav-account"
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          <Grid3X3 size={17} />
          <span>More</span>
        </button>

        {moreOpen && renderMoreMenu()}

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
          <div className="topnav-mobile-account">{renderMoreMenu()}</div>
        </div>
      )}
    </header>
  );
}
