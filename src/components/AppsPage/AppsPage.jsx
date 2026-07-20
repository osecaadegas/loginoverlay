import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  Crown,
  Database,
  Download,
  Handshake,
  LogIn,
  LogOut,
  MonitorUp,
  Radar,
  Route,
  ShieldCheck,
  Tags,
  TerminalSquare,
  Trophy,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import './AppsPage.css';

const SCREEN_SPLIT_DOWNLOAD_URL = 'https://mega.nz/folder/2yRmlAKT#tJsEhmABpz6OND8Jo8MsfA';

export default function AppsPage() {
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator, isSlotModder, isPremium, isAffiliate } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const hasOverlayAccess = isAdmin || isModerator || isPremium;

  const tiles = [
    ...(hasOverlayAccess ? [
      { to: '/overlay-center', label: 'Overlay Center', desc: 'OBS widgets and tools', icon: MonitorUp, tone: 'teal', art: 'overlay-center' },
      { to: '/slot-detector', label: 'Slot Detector', desc: 'Auto-detect active slot', icon: Radar, tone: 'cyan', art: 'slot-detector' },
    ] : []),
    ...(user ? [{ to: '/player/bonus-hunt', label: 'Bonus Hunt', desc: 'Player hunt tracker', icon: Trophy, tone: 'blue', art: 'bonus-hunt' }] : []),
    ...(isSlotModder ? [{ to: '/webmod/slot-manager', label: 'Slot Manager', desc: 'Slot database tools', icon: Database, tone: 'emerald', art: 'slot-manager' }] : []),
    { href: SCREEN_SPLIT_DOWNLOAD_URL, external: true, label: 'ScreenSplit Browser', desc: 'Open download folder', icon: Download, tone: 'sky', art: 'screensplit' },
    ...(hasOverlayAccess ? [
      { to: '/overlay-center/setup', label: 'Guided Setup', desc: 'Restart overlay setup flow', icon: Route, tone: 'indigo', art: 'guided-setup' },
      { to: '/overlay-center/tutorial', label: 'Restart Tutorial', desc: 'Walk through Overlay Center again', icon: CircleHelp, tone: 'cyan', art: 'restart-tutorial' },
    ] : []),
    { to: '/offers', label: 'Deals', desc: 'Casino offers and partners', icon: Tags, tone: 'lime', art: 'deals' },
    ...(isAffiliate ? [{ to: '/affiliate', label: 'Affiliate', desc: 'Your tracking links and stats', icon: Handshake, tone: 'teal', art: 'deals' }] : []),
    { to: '/premium', label: 'Premium', desc: 'Plans and access', icon: Crown, tone: 'gold', art: 'premium' },
    ...(isAdmin ? [
      { to: '/admin', label: 'Admin Panel', desc: 'Platform management', icon: ShieldCheck, tone: 'red', art: 'admin' },
      { to: '/admin/affiliates', label: 'Affiliate Manager', desc: 'Links, roles and partner stats', icon: Handshake, tone: 'emerald', art: 'deals' },
      { to: '/admin/subscriptions', label: 'Subscriptions', desc: 'Plans, trials and pricing copy', icon: CreditCard, tone: 'amber', art: 'subscriptions' },
      { to: '/overlay-center/approvals', label: 'Approvals', desc: 'Review submitted slots', icon: ClipboardCheck, tone: 'rose', art: 'approvals' },
      { to: '/analytics', label: 'Analytics', desc: 'Platform statistics', icon: BarChart3, tone: 'blue', art: 'analytics' },
      { to: '/developer', label: 'Developer', desc: 'Internal developer tools', icon: TerminalSquare, tone: 'cyan', art: 'developer' },
    ] : []),
    ...(user ? [{ to: '/profile', label: 'Profile', desc: 'Account settings', icon: UserCog, tone: 'violet', art: 'profile' }] : []),
  ];
  const visibleTiles = tiles.filter(tile => !tile.to || tile.to !== location.pathname);

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
        {visibleTiles.map((tile) => {
          const Icon = tile.icon;
          const tileClassName = `apps-tile apps-tile--${tile.tone} apps-tile--art-${tile.art}`;
          const TileComponent = tile.href ? 'a' : Link;
          const tileProps = tile.href
            ? { href: tile.href, target: tile.external ? '_blank' : undefined, rel: tile.external ? 'noreferrer' : undefined }
            : { to: tile.to };

          return (
            <TileComponent key={tile.to || tile.href} {...tileProps} className={tileClassName}>
              <span className="apps-tile__icon" aria-hidden="true">
                <Icon size={25} strokeWidth={2.35} />
              </span>
              <strong>{tile.label}</strong>
              <span className="apps-tile__desc">{tile.desc}</span>
            </TileComponent>
          );
        })}

        {user ? (
          <button type="button" onClick={logout} className="apps-tile apps-tile--danger apps-tile--art-logout">
            <span className="apps-tile__icon" aria-hidden="true">
              <LogOut size={25} strokeWidth={2.35} />
            </span>
            <strong>Logout</strong>
            <span className="apps-tile__desc">End this session</span>
          </button>
        ) : (
          <button type="button" onClick={login} className="apps-tile apps-tile--violet apps-tile--art-login">
            <span className="apps-tile__icon" aria-hidden="true">
              <LogIn size={25} strokeWidth={2.35} />
            </span>
            <strong>Login</strong>
            <span className="apps-tile__desc">Access your tools</span>
          </button>
        )}
      </section>
    </main>
  );
}
