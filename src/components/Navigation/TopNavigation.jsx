import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeEuro,
  ChevronDown,
  Crown,
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
    <Link to="/" className="topnav-brand" aria-label="Streamers Center home">
      <span className="topnav-brand__mark">
        <img src="/StreamerCenterLogo.png" alt="" />
      </span>
    </Link>
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
  const { isAdmin, isModerator, isSlotModder, isPremium } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  const isPlayerExperience = location.pathname.startsWith('/player');
  const accountLabel = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account';
  const primaryLinks = [
    { to: '/player/bonus-hunt', label: 'Bonus Hunt', icon: LayoutDashboard },
    { to: '/offers', label: 'Deals', icon: BadgeEuro },
    { to: '/overlay-center', label: 'Overlays', icon: LayoutDashboard },
    { to: '/premium', label: 'Premium', icon: Crown },
  ];

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
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

  const renderPrimaryLinks = () => (
    <>
      {primaryLinks.map((link) => (
        <TopNavLink key={link.to} to={link.to} icon={link.icon}>
          {link.label}
        </TopNavLink>
      ))}
    </>
  );

  const renderAccountMenu = () => (
    <div className="topnav-account-menu" role="menu">
      {user ? (
        <>
          <Link to="/profile" role="menuitem">
            <UserRound size={16} /> Profile
          </Link>
          {isPlayerExperience && (
            <Link to="/player/subscription" role="menuitem">
              <Crown size={16} /> Player access
            </Link>
          )}
          {!isPlayerExperience && (
            <Link to="/premium" role="menuitem">
              <Crown size={16} /> Subscription
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" role="menuitem">
              <Shield size={16} /> Admin Panel
            </Link>
          )}
          {isAdmin && (
            <Link to="/analytics" role="menuitem">
              <Shield size={16} /> Analytics
            </Link>
          )}
          {isSlotModder && (
            <Link to="/webmod/slot-manager" role="menuitem">
              <Shield size={16} /> Slot Manager
            </Link>
          )}
          <button type="button" role="menuitem" onClick={logout} className="topnav-account-menu__danger">
            <LogOut size={16} /> Logout
          </button>
        </>
      ) : (
        <button type="button" role="menuitem" onClick={login}>
          <LogIn size={16} /> Login
        </button>
      )}
    </div>
  );

  return (
    <header className="topnav-shell">
      <Brand />

      <nav className="topnav-links" aria-label={isPlayerExperience ? 'Player navigation' : 'Streamer navigation'}>
        {renderPrimaryLinks()}
      </nav>

      <div className="topnav-actions" ref={accountRef}>
        {user ? (
          <button
            type="button"
            className="topnav-account"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((open) => !open)}
          >
            <UserRound size={17} />
            <span>{accountLabel}</span>
            <ChevronDown size={15} />
          </button>
        ) : (
          <button type="button" className="topnav-account" onClick={login}>
            <LogIn size={17} />
            <span>Login</span>
          </button>
        )}

        {accountOpen && renderAccountMenu()}

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
          <div className="topnav-mobile-account">{renderAccountMenu()}</div>
        </div>
      )}
    </header>
  );
}
