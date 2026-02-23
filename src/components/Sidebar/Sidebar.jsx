import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { usePremium } from '../../hooks/usePremium';
import { useStreamElements } from '../../context/StreamElementsContext';
import { checkUserAccess } from '../../utils/adminUtils';
import { supabase } from '../../config/supabaseClient';
import { useTranslation, T } from '../../hooks/useTranslation';
import LanguageSwitcher from '../LanguageSwitcher';
import './Sidebar.css';

export default function Sidebar({ className = '', onClose }) {
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showGamesDropdown, setShowGamesDropdown] = useState(false);
  const [showStreamDropdown, setShowStreamDropdown] = useState(false);
  const [showPremiumDropdown, setShowPremiumDropdown] = useState(false);
  const [showWebModDropdown, setShowWebModDropdown] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator, isSlotModder } = useAdmin();
  const { isPremium } = usePremium();
  const { points, loading: pointsLoading } = useStreamElements();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu when route changes (NOT when onClose changes)
  useEffect(() => {
    if (onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Sidebar Admin Status:', { isAdmin, isModerator, isSlotModder, user: user?.email });
  }, [isAdmin, isModerator, isSlotModder, user]);



  // Check overlay access when user changes (unused - can be removed if needed)
  // useEffect(() => {
  //   const checkAccess = async () => {
  //     if (user) {
  //       const { hasAccess } = await checkUserAccess(user.id);
  //     }
  //   };
  //   checkAccess();
  // }, [user]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const avatarOptions = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
  ];

  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load avatar from user metadata or the_life_players
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) return;
      
      // First check user metadata (most up-to-date)
      if (user.user_metadata?.avatar_url) {
        setSelectedAvatar(user.user_metadata.avatar_url);
        return;
      }
      
      // Fallback: check the_life_players table
      try {
        const { data } = await supabase
          .from('the_life_players')
          .select('avatar_url')
          .eq('user_id', user.id)
          .single();
        
        if (data?.avatar_url) {
          setSelectedAvatar(data.avatar_url);
          // Sync to user metadata for future
          await supabase.auth.updateUser({
            data: { avatar_url: data.avatar_url }
          });
          return;
        }
      } catch (err) {
        // Player may not exist yet, that's ok
      }
      
      // Use default avatar
      setSelectedAvatar(avatarOptions[0]);
    };
    
    loadAvatar();
  }, [user]);

  const handleAvatarSelect = async (avatar) => {
    setSelectedAvatar(avatar);
    
    // Update user metadata in Supabase
    if (user) {
      await supabase.auth.updateUser({
        data: { avatar_url: avatar }
      });
    }
    
    setShowAvatarPicker(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;

    try {
      setUploadingAvatar(true);

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      // Update user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      setSelectedAvatar(publicUrl);
      setShowAvatarPicker(false);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const menuItems = [
    { 
      icon: 'fa-solid fa-building-columns', 
      labelKey: 'nav_partners',
      label: 'Casinos & Offers', 
      path: '/offers', 
      show: true 
    },
    { 
      icon: 'fa-solid fa-cart-shopping', 
      labelKey: 'nav_points_store',
      label: 'Shop', 
      path: '/points', 
      show: user 
    },
    { 
      icon: 'fa-solid fa-gamepad', 
      labelKey: 'nav_games',
      label: 'Mini Games', 
      path: '/games', 
      show: true,
      isDropdown: true
    },
    { 
      icon: 'fa-solid fa-gift', 
      labelKey: 'nav_points_manager',
      label: 'Points Manager', 
      path: '/points-manager', 
      show: isModerator 
    },
    { 
      icon: 'fa-solid fa-gear', 
      labelKey: 'nav_admin_panel',
      label: 'Admin Panel', 
      path: '/admin', 
      show: isAdmin 
    },
  ];

  const handleTwitchLogin = () => {
    window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/authorize?provider=twitch&redirect_to=${window.location.origin}`;
  };

  return (
    <>
    <aside className={`sidebar ${className}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <img src="/secalogo.png" alt="Seca Logo" className="sidebar-logo-image" />
        </div>

        {user ? (
          <div className="sidebar-avatar-section">
            <div className="avatar-container" onClick={() => handleNavigation('/profile')}>
              <img src={selectedAvatar} alt="Avatar" className="avatar-image" />
            </div>
            <div className="points-display">
              <svg viewBox="0 0 24 24" className="points-icon" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
              </svg>
              <span className="points-value">
                {pointsLoading ? '...' : points.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="sidebar-login-section">
            <button className="twitch-login-button" onClick={handleTwitchLogin}>
              <svg viewBox="0 0 24 24" className="twitch-icon" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
              </svg>
              <span>{t('login_with_twitch', 'Login with Twitch')}</span>
            </button>
          </div>
        )}

        <nav className="sidebar-nav">
          {/* Home - Standalone at top */}
          <button
            className={`sidebar-item ${isActive('/') ? 'active' : ''}`}
            onClick={() => handleNavigation('/')}
          >
            <span className="sidebar-icon"><i className="fa-solid fa-house" /></span>
            <span className="sidebar-label">{t(T.NAV_HOME, 'Home')}</span>
          </button>

          {menuItems.slice(0, 2).map((item, index) => 
            item.show ? (
              <button
                key={index}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="sidebar-emoji"><i className={item.icon} /></span>
                <span className="sidebar-label">{t(item.labelKey, item.label)}</span>
              </button>
            ) : null
          )}

          {/* Community dropdown - Tournaments, Giveaways, etc */}
          <div className="sidebar-item-wrapper">
            <button
              className={`sidebar-item ${showStreamDropdown ? 'active' : ''}`}
              onClick={() => setShowStreamDropdown(!showStreamDropdown)}
            >
              <span className="sidebar-emoji"><i className="fa-solid fa-users" /></span>
              <span className="sidebar-label">{t('nav_community', 'Community')}</span>
              <span className={`dropdown-arrow ${showStreamDropdown ? 'open' : ''}`}>›</span>
            </button>

            {showStreamDropdown && (
              <div className="sidebar-dropdown">
                <button
                  className={`sidebar-subitem ${isActive('/streams') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/streams')}
                >
                  <span className="subitem-icon"><i className="fa-brands fa-twitch" /></span>
                  <span className="subitem-label">{t('nav_streams', 'Streams')}</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/daily-wheel') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/daily-wheel')}
                >
                  <span className="subitem-icon"><i className="fa-solid fa-dharmachakra" /></span>
                  <span className="subitem-label">{t('nav_daily_wheel', 'Daily Wheel')}</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/guess-balance') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/guess-balance')}
                >
                  <span className="subitem-icon"><i className="fa-solid fa-coins" /></span>
                  <span className="subitem-label">{t('nav_guess_balance', 'Guess the Balance')}</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/tournaments') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/tournaments')}
                >
                  <span className="subitem-icon"><i className="fa-solid fa-trophy" /></span>
                  <span className="subitem-label">{t('nav_tournaments', 'Tournaments')}</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/giveaways') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/giveaways')}
                >
                  <span className="subitem-icon"><i className="fa-solid fa-gift" /></span>
                  <span className="subitem-label">{t('nav_giveaways', 'Giveaways')}</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/vouchers') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/vouchers')}
                >
                  <span className="subitem-icon"><i className="fa-solid fa-ticket" /></span>
                  <span className="subitem-label">{t('nav_vouchers', 'Vouchers')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Mini Games dropdown */}
          {menuItems[2].show && (
            <div className="sidebar-item-wrapper">
              <button
                className={`sidebar-item ${showGamesDropdown ? 'active' : ''}`}
                onClick={() => setShowGamesDropdown(!showGamesDropdown)}
              >
                <span className="sidebar-emoji"><i className={menuItems[2].icon} /></span>
                <span className="sidebar-label">{t(T.NAV_GAMES, menuItems[2].label)}</span>
                <span className={`dropdown-arrow ${showGamesDropdown ? 'open' : ''}`}>›</span>
              </button>

              {showGamesDropdown && (
                <div className="sidebar-dropdown">
                  <button
                    className={`sidebar-subitem ${isActive('/games/blackjack') ? 'active' : ''}`}
                    onClick={() => handleNavigation('/games/blackjack')}
                  >
                    <span className="subitem-icon"><i className="fa-solid fa-cards" /></span>
                    <span className="subitem-label">{t('nav_blackjack', 'Blackjack')}</span>
                  </button>
                  <button
                    className={`sidebar-subitem ${isActive('/games/mines') ? 'active' : ''}`}
                    onClick={() => handleNavigation('/games/mines')}
                  >
                    <span className="subitem-icon"><i className="fa-solid fa-bomb" /></span>
                    <span className="subitem-label">{t('nav_mines', 'Mines')}</span>
                  </button>
                  <button
                    className={`sidebar-subitem ${isActive('/games/thelife') ? 'active' : ''}`}
                    onClick={() => handleNavigation('/games/thelife')}
                  >
                    <span className="subitem-icon"><i className="fa-solid fa-crosshairs" /></span>
                    <span className="subitem-label">{t('nav_thelife', 'The Life')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Premium dropdown removed - overlay system deleted */}

          {/* WebMod dropdown - Only for admins, slot_modders, and moderators */}
          {(isAdmin || isSlotModder || isModerator) && (
            <div className="sidebar-item-wrapper">
              <button
                className={`sidebar-item ${showWebModDropdown ? 'active' : ''}`}
                onClick={() => setShowWebModDropdown(!showWebModDropdown)}
              >
                <span className="sidebar-emoji"><i className="fa-solid fa-wrench" /></span>
                <span className="sidebar-label">{t('nav_webmod', 'WebMod')}</span>
                <span className={`dropdown-arrow ${showWebModDropdown ? 'open' : ''}`}>›</span>
              </button>

              {showWebModDropdown && (
                <div className="sidebar-dropdown">
                  {isSlotModder && (
                    <button
                      className={`sidebar-subitem ${isActive('/webmod/slot-manager') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/webmod/slot-manager')}
                    >
                      <span className="subitem-icon"><i className="fa-solid fa-dice" /></span>
                      <span className="subitem-label">{t('nav_slot_manager', 'Slot Manager')}</span>
                    </button>
                  )}
                  {isModerator && (
                    <button
                      className={`sidebar-subitem ${isActive('/webmod/points-manager') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/webmod/points-manager')}
                    >
                      <span className="subitem-icon"><i className="fa-solid fa-gift" /></span>
                      <span className="subitem-label">{t('nav_points_manager', 'Points Manager')}</span>
                    </button>
                  )}
                  {(isAdmin || isModerator) && (
                    <button
                      className={`sidebar-subitem ${isActive('/webmod/guess-balance') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/webmod/guess-balance')}
                    >
                      <span className="subitem-icon"><i className="fa-solid fa-bullseye" /></span>
                      <span className="subitem-label">{t('nav_guess_balance', 'Guess Balance')}</span>
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        className={`sidebar-subitem ${isActive('/webmod/voucher-manager') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/webmod/voucher-manager')}
                      >
                        <span className="subitem-icon"><i className="fa-solid fa-ticket" /></span>
                        <span className="subitem-label">{t('nav_voucher_manager', 'Voucher Manager')}</span>
                      </button>
                      <button
                        className={`sidebar-subitem ${isActive('/webmod/giveaway-creator') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/webmod/giveaway-creator')}
                      >
                        <span className="subitem-icon"><i className="fa-solid fa-gift" /></span>
                        <span className="subitem-label">{t('nav_giveaway_creator', 'Giveaway Creator')}</span>
                      </button>
                      <button
                        className={`sidebar-subitem ${isActive('/webmod/edit-slots') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/webmod/edit-slots')}
                      >
                        <span className="subitem-icon"><i className="fa-solid fa-pen-to-square" /></span>
                        <span className="subitem-label">{t('nav_edit_slots', 'Edit Slots')}</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Remaining items (Points Manager, Admin Panel) */}
          {menuItems.slice(3).map((item, index) =>
            item.show ? (
              <button
                key={`extra-${index}`}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="sidebar-emoji"><i className={item.icon} /></span>
                <span className="sidebar-label">{t(item.labelKey, item.label)}</span>
              </button>
            ) : null
          )}

          {user && (
            <>
              <div className="sidebar-divider"></div>
              <button
                className="sidebar-item logout"
                onClick={handleLogout}
              >
                <span className="sidebar-emoji"><i className="fa-solid fa-right-from-bracket" /></span>
                <span className="sidebar-label">{t(T.LOGOUT, 'Log Out')}</span>
              </button>
            </>
          )}
        </nav>

        {/* Language Switcher */}
        <div className="sidebar-language">
          <LanguageSwitcher variant="inline" showLabel={true} />
        </div>

        {/* Social Media Links */}
        <div className="sidebar-social">
          <a href="https://discord.gg/ASvCcpp5b8" target="_blank" rel="noopener noreferrer" className="discord-card" title="Discord">
            <div className="discord-card-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            </div>
            <div className="discord-card-text">
              <span className="discord-card-title">DISCORD</span>
              <span className="discord-card-desc">Junta-te à comunidade</span>
            </div>
            <span className="discord-card-arrow">→</span>
          </a>
          <div className="sidebar-social-row">
            <a href="https://www.twitch.tv/osecaadegas95" target="_blank" rel="noopener noreferrer" className="social-card social-twitch" title="Twitch">
              <span className="social-card-text">Twitch</span>
            </a>
            <a href="https://www.youtube.com/@osecaadegas" target="_blank" rel="noopener noreferrer" className="social-card social-youtube" title="YouTube">
              <span className="social-card-text">YouTube</span>
            </a>
            <a href="https://www.instagram.com/osecaadegas/" target="_blank" rel="noopener noreferrer" className="social-card social-instagram" title="Instagram">
              <span className="social-card-text">Instagram</span>
            </a>
          </div>
        </div>
    </aside>

    {showAvatarPicker && (
      <div className="avatar-picker-overlay" onClick={() => setShowAvatarPicker(false)}>
        <div className="avatar-picker-card" onClick={(e) => e.stopPropagation()}>
          <h3 className="avatar-picker-title">Choose Avatar</h3>
          <div className="avatar-grid">
            {avatarOptions.map((avatar, index) => (
              <img
                key={index}
                src={avatar}
                alt={`Avatar ${index + 1}`}
                className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                onClick={() => handleAvatarSelect(avatar)}
              />
            ))}
          </div>
          <div className="avatar-upload-section">
            <label htmlFor="avatar-upload" className={`avatar-upload-btn ${uploadingAvatar ? 'uploading' : ''}`}>
              {uploadingAvatar ? (
                <>
                  <div className="spinner"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="upload-icon" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                  </svg>
                  Upload Custom Image
                </>
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={uploadingAvatar}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
