import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { usePremium } from '../../hooks/usePremium';
import { useStreamElements } from '../../context/StreamElementsContext';
import { supabase } from '../../config/supabaseClient';
import { useTranslation, T } from '../../hooks/useTranslation';
import LanguageSwitcher from '../LanguageSwitcher';
import './Sidebar.css';

/* ── SVG icon helper ── */
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d={d} fill="currentColor" />
  </svg>
);

const ICONS = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  partners: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z',
  store: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z',
  community: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  games: 'M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z',
  webmod: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  admin: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
  code: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  overlay: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z',
  premium: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  bonushunt: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  tournament: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z',
  logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
  chevron: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
};

const TwitchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
  </svg>
);

export default function Sidebar({ className = '', onClose }) {
  const [openSection, setOpenSection] = useState(null);
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator, isSlotModder } = useAdmin();
  const { isPremium } = usePremium();
  const { points, loading: pointsLoading } = useStreamElements();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=1');

  // Close mobile sidebar on route change
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load avatar
  useEffect(() => {
    if (!user) return;
    if (user.user_metadata?.avatar_url) {
      setAvatar(user.user_metadata.avatar_url);
      return;
    }
    supabase
      .from('the_life_players')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => { if (data?.avatar_url) setAvatar(data.avatar_url); });
  }, [user]);

  const go = (path) => navigate(path);
  const active = (path) => location.pathname === path;
  const toggle = (key) => setOpenSection(openSection === key ? null : key);

  const handleTwitchLogin = () => {
    window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/authorize?provider=twitch&redirect_to=${window.location.origin}`;
  };

  const handleLogout = async () => {
    await signOut();
    go('/');
  };

  /* ── Dropdown link sets ── */
  const communityLinks = [
    { emoji: '🎡', labelKey: 'nav_daily_wheel',     label: 'Daily Wheel',       path: '/daily-wheel' },
    { emoji: '💰', labelKey: 'nav_guess_balance',    label: 'Guess the Balance', path: '/guess-balance' },
    { emoji: '🏆', labelKey: 'nav_tournaments',      label: 'Tournaments',       path: '/tournaments' },
    { emoji: '🎁', labelKey: 'nav_giveaways',        label: 'Giveaways',         path: '/giveaways' },
    { emoji: '🎟️', labelKey: 'nav_vouchers',         label: 'Vouchers',          path: '/vouchers' },
  ];

  const gameLinks = [
    { emoji: '🃏', labelKey: 'nav_blackjack', label: 'Blackjack', path: '/games/blackjack' },
    { emoji: '💣', labelKey: 'nav_mines',     label: 'Mines',     path: '/games/mines' },
    { emoji: '🔫', labelKey: 'nav_thelife',   label: 'The Life',  path: '/games/thelife' },
  ];

  const webmodLinks = [
    isSlotModder  && { emoji: '🎰', labelKey: 'nav_slot_manager',     label: 'Slot Manager',     path: '/webmod/slot-manager' },
    isModerator   && { emoji: '🎁', labelKey: 'nav_points_manager',   label: 'Points Manager',   path: '/webmod/points-manager' },
    (isAdmin || isModerator) && { emoji: '🎯', labelKey: 'nav_guess_balance', label: 'Guess Balance', path: '/webmod/guess-balance' },
    isAdmin       && { emoji: '🎟️', labelKey: 'nav_voucher_manager',  label: 'Voucher Manager',  path: '/webmod/voucher-manager' },
    isAdmin       && { emoji: '🎁', labelKey: 'nav_giveaway_creator', label: 'Giveaway Creator',  path: '/webmod/giveaway-creator' },
    isAdmin       && { emoji: '✏️', labelKey: 'nav_edit_slots',       label: 'Edit Slots',        path: '/webmod/edit-slots' },
  ].filter(Boolean);

  /* ── Sub-components ── */
  const NavItem = ({ icon, labelKey, label, path, onClick, danger }) => (
    <button
      className={`sb-item${active(path) ? ' sb-item--active' : ''}${danger ? ' sb-item--danger' : ''}`}
      onClick={onClick || (() => go(path))}
    >
      <span className="sb-item__icon"><Icon d={icon} /></span>
      <span className="sb-item__label">{t(labelKey, label)}</span>
    </button>
  );

  const Dropdown = ({ icon, labelKey, label, sectionKey, links }) => (
    <div className="sb-section">
      <button
        className={`sb-item${openSection === sectionKey ? ' sb-item--open' : ''}`}
        onClick={() => toggle(sectionKey)}
      >
        <span className="sb-item__icon"><Icon d={icon} /></span>
        <span className="sb-item__label">{t(labelKey, label)}</span>
        <span className={`sb-item__arrow${openSection === sectionKey ? ' sb-item__arrow--open' : ''}`}>
          <Icon d={ICONS.chevron} size={16} />
        </span>
      </button>
      <div className={`sb-dropdown${openSection === sectionKey ? ' sb-dropdown--open' : ''}`}>
        <div className="sb-dropdown__inner">
          {links.map((link) => (
            <button
              key={link.path}
              className={`sb-sub${active(link.path) ? ' sb-sub--active' : ''}`}
              onClick={() => go(link.path)}
            >
              <span className="sb-sub__emoji">{link.emoji}</span>
              <span className="sb-sub__label">{t(link.labelKey, link.label)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <aside className={`sb ${className}`}>
      {/* Logo */}
      <div className="sb-logo">
        <img src="/secalogo.png" alt="Logo" className="sb-logo__img" />
      </div>

      {/* User area */}
      {user ? (
        <div className="sb-user" onClick={() => go('/profile')}>
          <img src={avatar} alt="" className="sb-user__avatar" />
          <div className="sb-user__info">
            <span className="sb-user__name">
              {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player'}
            </span>
            <span className="sb-user__points">
              {pointsLoading ? '···' : points.toLocaleString()} pts
            </span>
          </div>
        </div>
      ) : (
        <button className="sb-twitch" onClick={handleTwitchLogin}>
          <TwitchIcon />
          <span>{t('login_with_twitch', 'Login with Twitch')}</span>
        </button>
      )}

      {/* Navigation */}
      <nav className="sb-nav">
        <NavItem icon={ICONS.home} labelKey={T.NAV_HOME} label="Home" path="/" />
        <NavItem icon={ICONS.partners} labelKey="nav_partners" label="Partners" path="/offers" />
        {user && <NavItem icon={ICONS.store} labelKey="nav_points_store" label="Points Store" path="/points" />}

        <Dropdown icon={ICONS.community} labelKey="nav_community" label="Community" sectionKey="community" links={communityLinks} />
        <Dropdown icon={ICONS.games} labelKey={T.NAV_GAMES} label="Games" sectionKey="games" links={gameLinks} />

        {(isAdmin || isSlotModder || isModerator) && (
          <Dropdown icon={ICONS.webmod} labelKey="nav_webmod" label="WebMod" sectionKey="webmod" links={webmodLinks} />
        )}

        {isAdmin && (
          <NavItem icon={ICONS.admin} labelKey="nav_admin_panel" label="Admin Panel" path="/admin" />
        )}
        {isAdmin && (
          <NavItem icon={ICONS.code} labelKey="nav_developer" label="Developer" path="/developer" />
        )}
        {user && !isAdmin && (
          <NavItem icon={ICONS.premium} labelKey="nav_premium" label="Premium" path="/premium" />
        )}
        {(isAdmin || isPremium) && (
          <NavItem icon={ICONS.overlay} labelKey="nav_overlay_center" label="Overlay Center" path="/overlay-center" />
        )}

        {user && (
          <>
            <div className="sb-divider" />
            <NavItem
              icon={ICONS.logout}
              labelKey={T.LOGOUT}
              label="Log Out"
              danger
              onClick={handleLogout}
            />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        <div className="sb-lang">
          <LanguageSwitcher variant="inline" showLabel={true} />
        </div>
        <div className="sb-socials">
          {[
            { href: 'https://www.twitch.tv/osecaadegas95', label: 'Twitch',    cls: 'sb-social--twitch' },
            { href: 'https://www.youtube.com/@osecaadegas', label: 'YouTube',   cls: 'sb-social--youtube' },
            { href: 'https://www.instagram.com/osecaadegas/', label: 'Instagram', cls: 'sb-social--instagram' },
            { href: 'https://discord.gg/ASvCcpp5b8',       label: 'Discord',   cls: 'sb-social--discord' },
          ].map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
               className={`sb-social ${s.cls}`} title={s.label}>
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
