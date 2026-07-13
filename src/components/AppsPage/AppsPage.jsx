import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeEuro,
  BarChart3,
  Code2,
  Crown,
  Grid3X3,
  LayoutDashboard,
  LogIn,
  LogOut,
  Shield,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import './AppsPage.css';

export default function AppsPage() {
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator, isSlotModder, isPremium } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const tiles = [
    { to: '/offers', label: 'Deals', desc: 'Casino offers and partners', icon: BadgeEuro, tone: 'green' },
    { to: '/premium', label: 'Premium', desc: 'Plans and access', icon: Crown, tone: 'gold' },
    ...(user ? [{ to: '/profile', label: 'Profile', desc: 'Account settings', icon: UserRound, tone: 'violet' }] : []),
    ...(user ? [{ to: '/player/bonus-hunt', label: 'Bonus Hunt', desc: 'Player hunt tracker', icon: LayoutDashboard, tone: 'blue' }] : []),
    ...(isAdmin || isModerator || isPremium ? [{ to: '/overlay-center', label: 'Overlay Center', desc: 'OBS widgets and tools', icon: Grid3X3, tone: 'cyan' }] : []),
    ...(isAdmin ? [
      { to: '/admin', label: 'Admin Panel', desc: 'Platform management', icon: Shield, tone: 'red' },
      { to: '/analytics', label: 'Analytics', desc: 'Platform statistics', icon: BarChart3, tone: 'blue' },
      { to: '/developer', label: 'Developer', desc: 'Internal developer tools', icon: Code2, tone: 'cyan' },
    ] : []),
    ...(isSlotModder ? [{ to: '/webmod/slot-manager', label: 'Slot Manager', desc: 'Slot database tools', icon: Shield, tone: 'green' }] : []),
  ];

  const login = () => {
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
  };

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <main className="apps-page">
      <section className="apps-page__hero">
        <div>
          <span className="apps-page__eyebrow">Apps</span>
          <h1>Choose where to go</h1>
        </div>
      </section>

      <section className="apps-grid" aria-label="Available app sections">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.to} to={tile.to} className={`apps-tile apps-tile--${tile.tone}`}>
              <Icon size={26} />
              <strong>{tile.label}</strong>
              <span>{tile.desc}</span>
            </Link>
          );
        })}

        {user ? (
          <button type="button" onClick={logout} className="apps-tile apps-tile--danger">
            <LogOut size={26} />
            <strong>Logout</strong>
            <span>End this session</span>
          </button>
        ) : (
          <button type="button" onClick={login} className="apps-tile apps-tile--violet">
            <LogIn size={26} />
            <strong>Login</strong>
            <span>Access your tools</span>
          </button>
        )}
      </section>
    </main>
  );
}