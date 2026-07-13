import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeEuro,
  BarChart3,
  Code2,
  Crown,
  Grid3X3,
  LayoutDashboard,
  ListRestart,
  LogIn,
  LogOut,
  PlayCircle,
  RotateCcw,
  Shield,
  Sparkles,
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
  const hasOverlayAccess = isAdmin || isModerator || isPremium;

  const tiles = [
    ...(hasOverlayAccess ? [
      { to: '/overlay-center', label: 'Overlay Center', desc: 'OBS widgets and tools', icon: Grid3X3, tone: 'cyan', art: 'overlay-center' },
    ] : []),
    ...(user ? [{ to: '/player/bonus-hunt', label: 'Bonus Hunt', desc: 'Player hunt tracker', icon: LayoutDashboard, tone: 'blue', art: 'bonus-hunt' }] : []),
    ...(isSlotModder ? [{ to: '/webmod/slot-manager', label: 'Slot Manager', desc: 'Slot database tools', icon: Shield, tone: 'green', art: 'slot-manager' }] : []),
    ...(hasOverlayAccess ? [
      { to: '/overlay-center/presets', label: 'Presets', desc: 'Browse saved overlay looks', icon: Sparkles, tone: 'violet', art: 'presets' },
      { to: '/overlay-center/setup', label: 'Guided Setup', desc: 'Restart overlay setup flow', icon: ListRestart, tone: 'blue', art: 'guided-setup' },
      { to: '/overlay-center/tutorial', label: 'Restart Tutorial', desc: 'Walk through Overlay Center again', icon: RotateCcw, tone: 'cyan', art: 'restart-tutorial' },
    ] : []),
    { to: '/offers', label: 'Deals', desc: 'Casino offers and partners', icon: BadgeEuro, tone: 'green', art: 'deals' },
    { to: '/premium', label: 'Premium', desc: 'Plans and access', icon: Crown, tone: 'gold', art: 'premium' },
    ...(hasOverlayAccess ? [
      { to: '/offers', label: 'Streamer Home', desc: 'Return to streamer deals', icon: PlayCircle, tone: 'green', art: 'streamer-home' },
    ] : []),
    ...(isAdmin ? [
      { to: '/admin', label: 'Admin Panel', desc: 'Platform management', icon: Shield, tone: 'red', art: 'admin' },
      { to: '/overlay-center/approvals', label: 'Approvals', desc: 'Review submitted slots', icon: Shield, tone: 'red', art: 'approvals' },
      { to: '/analytics', label: 'Analytics', desc: 'Platform statistics', icon: BarChart3, tone: 'blue', art: 'analytics' },
      { to: '/developer', label: 'Developer', desc: 'Internal developer tools', icon: Code2, tone: 'cyan', art: 'developer' },
    ] : []),
    ...(user ? [{ to: '/profile', label: 'Profile', desc: 'Account settings', icon: UserRound, tone: 'violet', art: 'profile' }] : []),
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
          const tileClassName = `apps-tile apps-tile--${tile.tone} apps-tile--art-${tile.art}`;
          return (
            <Link key={tile.to} to={tile.to} className={tileClassName}>
              <Icon size={26} />
              <strong>{tile.label}</strong>
              <span>{tile.desc}</span>
            </Link>
          );
        })}

        {user ? (
          <button type="button" onClick={logout} className="apps-tile apps-tile--danger apps-tile--art-logout">
            <LogOut size={26} />
            <strong>Logout</strong>
            <span>End this session</span>
          </button>
        ) : (
          <button type="button" onClick={login} className="apps-tile apps-tile--violet apps-tile--art-login">
            <LogIn size={26} />
            <strong>Login</strong>
            <span>Access your tools</span>
          </button>
        )}
      </section>
    </main>
  );
}
