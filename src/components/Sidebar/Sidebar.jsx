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
      icon: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>, 
      labelKey: 'nav_partners',
      label: 'Partners', 
      path: '/offers', 
      show: true 
    },
    { 
      icon: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>, 
      labelKey: 'nav_points_store',
      label: 'Points Store', 
      path: '/points', 
      show: user 
    },
    { 
      icon: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z"/></svg>, 
      labelKey: 'nav_games',
      label: 'Games', 
      path: '/games', 
      show: true,
      isDropdown: true
    },
    { 
      icon: <svg viewBox="0 0 24 25" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>, 
      labelKey: 'nav_points_manager',
      label: 'Points Manager', 
      path: '/points-manager', 
      show: isModerator 
    },

    { 
      icon: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>, 
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
          {/* Home (Live Stream) - Standalone at top */}
          <button
            className={`sidebar-item ${isActive('/') ? 'active' : ''}`}
            onClick={() => handleNavigation('/')}
          >
            <span className="sidebar-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </span>
            <span className="sidebar-label">{t(T.NAV_HOME, 'Home')}</span>
          </button>

          {menuItems.slice(0, 2).map((item, index) => 
            item.show ? (
              <button
                key={index}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="sidebar-icon">{item.icon}</span>
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
              <span className="sidebar-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              </span>
              <span className="sidebar-label">{t('nav_community', 'Community')}</span>
              <span className={`dropdown-arrow ${showStreamDropdown ? 'open' : ''}`}>▼</span>
            </button>

            {showStreamDropdown && (
              <div className="sidebar-dropdown">
                <button
                  className={`sidebar-subitem ${isActive('/daily-wheel') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/daily-wheel')}
                >
                  <span className="subitem-icon">🎡</span>
                  <span className="subitem-label">{t('nav_daily_wheel', 'Daily Wheel')}</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/guess-balance') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/guess-balance')}
                >
                  <span className="subitem-icon">💰</span>
                  <span className="subitem-label">{t('nav_guess_balance', 'Guess the Balance')}</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/tournaments') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/tournaments')}
                >
                  <span className="subitem-icon">🏆</span>
                  <span className="subitem-label">{t('nav_tournaments', 'Tournaments')}</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/giveaways') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/giveaways')}
                >
                  <span className="subitem-icon">🎁</span>
                  <span className="subitem-label">{t('nav_giveaways', 'Giveaways')}</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/vouchers') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/vouchers')}
                >
                  <span className="subitem-icon">🎟️</span>
                  <span className="subitem-label">{t('nav_vouchers', 'Vouchers')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Games dropdown */}
          {menuItems[2].show && (
            <div className="sidebar-item-wrapper">
              <button
                className={`sidebar-item ${showGamesDropdown ? 'active' : ''}`}
                onClick={() => setShowGamesDropdown(!showGamesDropdown)}
              >
                <span className="sidebar-icon">{menuItems[2].icon}</span>
                <span className="sidebar-label">{t(T.NAV_GAMES, 'Games')}</span>
                <span className={`dropdown-arrow ${showGamesDropdown ? 'open' : ''}`}>▼</span>
              </button>

              {showGamesDropdown && (
                <div className="sidebar-dropdown">
                  <button
                    className={`sidebar-subitem ${isActive('/games/blackjack') ? 'active' : ''}`}
                    onClick={() => handleNavigation('/games/blackjack')}
                  >
                    <span className="subitem-icon">🃏</span>
                    <span className="subitem-label">{t('nav_blackjack', 'Blackjack')}</span>
                  </button>
                  <button
                    className={`sidebar-subitem ${isActive('/games/mines') ? 'active' : ''}`}
                    onClick={() => handleNavigation('/games/mines')}
                  >
                    <span className="subitem-icon">💣</span>
                    <span className="subitem-label">{t('nav_mines', 'Mines')}</span>
                  </button>
                  <button
                    className={`sidebar-subitem ${isActive('/games/thelife') ? 'active' : ''}`}
                    onClick={() => handleNavigation('/games/thelife')}
                  >
                    <span className="subitem-icon">🔫</span>
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
                <span className="sidebar-icon">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
                </span>
                <span className="sidebar-label">{t('nav_webmod', 'WebMod')}</span>
                <span className={`dropdown-arrow ${showWebModDropdown ? 'open' : ''}`}>▼</span>
              </button>

              {showWebModDropdown && (
                <div className="sidebar-dropdown">
                  {isSlotModder && (
                    <button
                      className={`sidebar-subitem ${isActive('/webmod/slot-manager') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/webmod/slot-manager')}
                    >
                      <span className="subitem-icon">🎰</span>
                      <span className="subitem-label">{t('nav_slot_manager', 'Slot Manager')}</span>
                    </button>
                  )}
                  {isModerator && (
                    <button
                      className={`sidebar-subitem ${isActive('/webmod/points-manager') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/webmod/points-manager')}
                    >
                      <span className="subitem-icon">🎁</span>
                      <span className="subitem-label">{t('nav_points_manager', 'Points Manager')}</span>
                    </button>
                  )}
                  {(isAdmin || isModerator) && (
                    <button
                      className={`sidebar-subitem ${isActive('/webmod/guess-balance') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/webmod/guess-balance')}
                    >
                      <span className="subitem-icon">🎯</span>
                      <span className="subitem-label">{t('nav_guess_balance', 'Guess Balance')}</span>
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        className={`sidebar-subitem ${isActive('/webmod/voucher-manager') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/webmod/voucher-manager')}
                      >
                        <span className="subitem-icon">🎟️</span>
                        <span className="subitem-label">{t('nav_voucher_manager', 'Voucher Manager')}</span>
                      </button>
                      <button
                        className={`sidebar-subitem ${isActive('/webmod/giveaway-creator') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/webmod/giveaway-creator')}
                      >
                        <span className="subitem-icon">🎁</span>
                        <span className="subitem-label">{t('nav_giveaway_creator', 'Giveaway Creator')}</span>
                      </button>
                      <button
                        className={`sidebar-subitem ${isActive('/webmod/edit-slots') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/webmod/edit-slots')}
                      >
                        <span className="subitem-icon">✏️</span>
                        <span className="subitem-label">{t('nav_edit_slots', 'Edit Slots')}</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {menuItems[4].show && (
            <button
              className={`sidebar-item ${isActive(menuItems[4].path) ? 'active' : ''}`}
              onClick={() => handleNavigation(menuItems[4].path)}
            >
              <span className="sidebar-icon">{menuItems[4].icon}</span>
              <span className="sidebar-label">{t(menuItems[4].labelKey, menuItems[4].label)}</span>
            </button>
          )}

          {menuItems[5].show && (
            <button
              className={`sidebar-item ${isActive(menuItems[5].path) ? 'active' : ''}`}
              onClick={() => handleNavigation(menuItems[5].path)}
            >
              <span className="sidebar-icon">{menuItems[5].icon}</span>
              <span className="sidebar-label">{t(menuItems[5].labelKey, menuItems[5].label)}</span>
            </button>
          )}

          {user && (
            <>
              <div className="sidebar-divider"></div>
              <button
                className="sidebar-item logout"
                onClick={handleLogout}
              >
                <span className="sidebar-icon">🚪</span>
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
          <a href="https://www.twitch.tv/osecaadegas95" target="_blank" rel="noopener noreferrer" className="social-card social-twitch" title="Twitch">
            <span className="social-card-text">Twitch</span>
          </a>
          <a href="https://www.youtube.com/@osecaadegas" target="_blank" rel="noopener noreferrer" className="social-card social-youtube" title="YouTube">
            <span className="social-card-text">YouTube</span>
          </a>
          <a href="https://www.instagram.com/osecaadegas/" target="_blank" rel="noopener noreferrer" className="social-card social-instagram" title="Instagram">
            <span className="social-card-text">Instagram</span>
          </a>
          <a href="https://discord.gg/ASvCcpp5b8" target="_blank" rel="noopener noreferrer" className="social-card social-discord" title="Discord">
            <span className="social-card-text">Discord</span>
          </a>
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
