import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  Crown,
  Database,
  Download,
  Home,
  LayoutDashboard,
  MonitorUp,
  Palette,
  Route,
  LogIn,
  LogOut,
  ShieldCheck,
  Tags,
  TerminalSquare,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import './AppsPage.css';

const SCREEN_SPLIT_DOWNLOAD_URL = 'https://mega.nz/folder/2yRmlAKT#tJsEhmABpz6OND8Jo8MsfA';

export default function AppsPage() {
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator, isSlotModder, isPremium } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const hasOverlayAccess = isAdmin || isModerator || isPremium;

  const login = () => {
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
  };

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  const sections = [
    {
      id: 'stream',
      eyebrow: 'Stream tools',
      title: 'Build and run the stream',
      desc: 'Core workspaces for overlays, bonus hunts, slot data and local browser tools.',
      tiles: [
        hasOverlayAccess && {
          to: '/overlay-center',
          label: 'Overlay Center',
          kicker: 'Live overlays',
          desc: 'Build OBS widgets, scenes and stream tools.',
          action: 'Open workspace',
          icon: MonitorUp,
          tone: 'teal',
          art: 'overlay-center',
          priority: true,
        },
        user && {
          to: '/player/bonus-hunt',
          label: 'Bonus Hunt',
          kicker: 'Tracker',
          desc: 'Run player bonus hunts and saved hunt sessions.',
          action: 'Start tracking',
          icon: LayoutDashboard,
          tone: 'blue',
          art: 'bonus-hunt',
        },
        isSlotModder && {
          to: '/webmod/slot-manager',
          label: 'Slot Manager',
          kicker: 'Database',
          desc: 'Manage slot records, providers and artwork.',
          action: 'Manage slots',
          icon: Database,
          tone: 'emerald',
          art: 'slot-manager',
        },
        {
          href: SCREEN_SPLIT_DOWNLOAD_URL,
          label: 'ScreenSplit Browser',
          kicker: 'Windows app',
          desc: 'Open the download folder for the Windows browser app.',
          action: 'Open download',
          icon: Download,
          tone: 'sky',
          art: 'screensplit',
        },
      ].filter(Boolean),
    },
    {
      id: 'setup',
      eyebrow: 'Setup',
      title: 'Looks, presets and guidance',
      desc: 'Quick places for styling overlays or walking through the setup flow again.',
      tiles: hasOverlayAccess ? [
        {
          to: '/overlay-center/presets',
          label: 'Presets',
          kicker: 'Saved looks',
          desc: 'Browse reusable overlay styles and layouts.',
          action: 'Browse presets',
          icon: Palette,
          tone: 'violet',
          art: 'presets',
        },
        {
          to: '/overlay-center/setup',
          label: 'Guided Setup',
          kicker: 'Setup flow',
          desc: 'Reconnect services and rebuild your overlay basics.',
          action: 'Start guide',
          icon: Route,
          tone: 'indigo',
          art: 'guided-setup',
        },
        {
          to: '/overlay-center/tutorial',
          label: 'Restart Tutorial',
          kicker: 'Walkthrough',
          desc: 'Replay the Overlay Center introduction.',
          action: 'Restart tutorial',
          icon: CircleHelp,
          tone: 'cyan',
          art: 'restart-tutorial',
        },
      ] : [],
    },
    {
      id: 'business',
      eyebrow: 'Business',
      title: 'Plans, deals and streamer pages',
      desc: 'Public-facing pages and subscription access.',
      tiles: [
        {
          to: '/offers',
          label: 'Deals',
          kicker: 'Offers',
          desc: 'Casino offers, partners and streamer campaigns.',
          action: 'View deals',
          icon: Tags,
          tone: 'lime',
          art: 'deals',
        },
        {
          to: '/premium',
          label: 'Premium',
          kicker: 'Plans',
          desc: 'Compare plans, access and premium features.',
          action: 'See plans',
          icon: Crown,
          tone: 'gold',
          art: 'premium',
        },
        hasOverlayAccess && {
          to: '/offers',
          label: 'Streamer Home',
          kicker: 'Home',
          desc: 'Return to the streamer deals landing page.',
          action: 'Go home',
          icon: Home,
          tone: 'emerald',
          art: 'streamer-home',
        },
      ].filter(Boolean),
    },
    {
      id: 'team',
      eyebrow: 'Admin',
      title: 'Team management and review',
      desc: 'Internal tools for platform management, approvals and reporting.',
      tiles: [
        isAdmin && {
          to: '/admin',
          label: 'Admin Panel',
          kicker: 'Platform',
          desc: 'Manage platform settings and content.',
          action: 'Open admin',
          icon: ShieldCheck,
          tone: 'red',
          art: 'admin',
        },
        isAdmin && {
          to: '/admin/subscriptions',
          label: 'Subscriptions',
          kicker: 'Billing',
          desc: 'Edit plans, trials and subscription copy.',
          action: 'Manage billing',
          icon: CreditCard,
          tone: 'amber',
          art: 'subscriptions',
        },
        isAdmin && {
          to: '/overlay-center/approvals',
          label: 'Approvals',
          kicker: 'Review queue',
          desc: 'Review submitted slots before publishing.',
          action: 'Review slots',
          icon: ClipboardCheck,
          tone: 'rose',
          art: 'approvals',
        },
        isAdmin && {
          to: '/analytics',
          label: 'Analytics',
          kicker: 'Reports',
          desc: 'Check platform traffic, usage and performance.',
          action: 'View stats',
          icon: BarChart3,
          tone: 'blue',
          art: 'analytics',
        },
        isAdmin && {
          to: '/developer',
          label: 'Developer',
          kicker: 'Tools',
          desc: 'Open internal developer utilities.',
          action: 'Open tools',
          icon: TerminalSquare,
          tone: 'cyan',
          art: 'developer',
        },
      ].filter(Boolean),
    },
    {
      id: 'account',
      eyebrow: 'Account',
      title: 'Your session',
      desc: 'Profile access and sign-in controls.',
      tiles: [
        user && {
          to: '/profile',
          label: 'Profile',
          kicker: 'Settings',
          desc: 'Update account details and preferences.',
          action: 'Edit profile',
          icon: UserCog,
          tone: 'violet',
          art: 'profile',
        },
        user ? {
          id: 'logout',
          onClick: logout,
          label: 'Logout',
          kicker: 'Session',
          desc: 'End this browser session safely.',
          action: 'Sign out',
          icon: LogOut,
          tone: 'danger',
          art: 'logout',
        } : {
          id: 'login',
          onClick: login,
          label: 'Login',
          kicker: 'Access',
          desc: 'Sign in to unlock your tools.',
          action: 'Sign in',
          icon: LogIn,
          tone: 'violet',
          art: 'login',
        },
      ].filter(Boolean),
    },
  ].filter((section) => section.tiles.length > 0);

  const renderTile = (tile) => {
    const Icon = tile.icon;
    const tileClassName = [
      'apps-tile',
      `apps-tile--${tile.tone}`,
      `apps-tile--art-${tile.art}`,
      tile.priority ? 'apps-tile--priority' : '',
    ].filter(Boolean).join(' ');
    const TileComponent = tile.href ? 'a' : tile.onClick ? 'button' : Link;
    const tileProps = tile.href
      ? { href: tile.href, download: tile.download ? '' : undefined }
      : tile.onClick
        ? { type: 'button', onClick: tile.onClick }
        : { to: tile.to };

    return (
      <TileComponent key={tile.to || tile.href || tile.id} {...tileProps} className={tileClassName}>
        <span className="apps-tile__body">
          <span className="apps-tile__topline">
            <span className="apps-tile__icon" aria-hidden="true">
              <Icon size={24} strokeWidth={2.25} />
            </span>
            <span className="apps-tile__kicker">{tile.kicker}</span>
          </span>
          <strong>{tile.label}</strong>
          <span className="apps-tile__desc">{tile.desc}</span>
          <span className="apps-tile__action">{tile.action}</span>
        </span>
        <span className="apps-tile__visual" aria-hidden="true" />
      </TileComponent>
    );
  };

  return (
    <main className="apps-page">
      <section className="apps-page__hero">
        <div>
          <span className="apps-page__eyebrow">Apps</span>
          <h1>Apps and tools</h1>
          <p>Pick the right workspace by job, from live overlays to admin review.</p>
        </div>
      </section>

      <section className="apps-sections" aria-label="Available app sections">
        {sections.map((section) => (
          <section className="apps-section" key={section.id} aria-labelledby={`apps-section-${section.id}`}>
            <div className="apps-section__header">
              <span>{section.eyebrow}</span>
              <div>
                <h2 id={`apps-section-${section.id}`}>{section.title}</h2>
                <p>{section.desc}</p>
              </div>
            </div>
            <div className="apps-grid">
              {section.tiles.map(renderTile)}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
