import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { usePremium } from '../../hooks/usePremium';
import { useStreamElements } from '../../context/StreamElementsContext';
import { checkUserAccess } from '../../utils/adminUtils';
import { supabase } from '../../config/supabaseClient';
import './Sidebar.css';

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showGamesDropdown, setShowGamesDropdown] = useState(false);
  const [showStreamDropdown, setShowStreamDropdown] = useState(false);
  const [showPremiumDropdown, setShowPremiumDropdown] = useState(false);
  const [showWebModDropdown, setShowWebModDropdown] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator, isSlotModder } = useAdmin();
  const { isPremium } = usePremium();
  const { points, loading: pointsLoading } = useStreamElements();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

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

  // Load avatar from user metadata
  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setSelectedAvatar(user.user_metadata.avatar_url);
    } else if (user) {
      setSelectedAvatar(avatarOptions[0]);
    }
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
      label: 'Partners', 
      path: '/offers', 
      show: true 
    },
    { 
      icon: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>, 
      label: 'Points Store', 
      path: '/points', 
      show: user 
    },
    { 
      icon: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z"/></svg>, 
      label: 'Games', 
      path: '/games', 
      show: true,
      isDropdown: true
    },
    { 
      icon: <svg viewBox="0 0 24 25" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>, 
      label: 'Points Manager', 
      path: '/points-manager', 
      show: isModerator 
    },

    { 
      icon: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>, 
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
    {/* Mobile Hamburger Button */}
    <button 
      className="mobile-menu-toggle"
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      aria-label="Toggle menu"
    >
      <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
      <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
      <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
    </button>

    {/* Mobile Overlay */}
    {isMobileMenuOpen && (
      <div 
        className="mobile-menu-overlay"
        onClick={() => setIsMobileMenuOpen(false)}
      />
    )}

    <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
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
              <span>Login with Twitch</span>
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
            <span className="sidebar-label">Home</span>
          </button>

          {menuItems.slice(0, 2).map((item, index) => 
            item.show ? (
              <button
                key={index}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
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
              <span className="sidebar-label">Community</span>
              <span className={`dropdown-arrow ${showStreamDropdown ? 'open' : ''}`}>▼</span>
            </button>

            {showStreamDropdown && (
              <div className="sidebar-dropdown">
                <button
                  className={`sidebar-subitem ${isActive('/tournaments') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/tournaments')}
                >
                  <span className="subitem-icon">🏆</span>
                  <span className="subitem-label">Tournaments</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/guess-balance') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/guess-balance')}
                >
                  <span className="subitem-icon">💰</span>
                  <span className="subitem-label">Guess the Balance</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/giveaways') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/giveaways')}
                >
                  <span className="subitem-icon">🎁</span>
                  <span className="subitem-label">Giveaways</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/vouchers') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/vouchers')}
                >
                  <span className="subitem-icon">🎟️</span>
                  <span className="subitem-label">Vouchers</span>
                </button>
                <button
                  className={`sidebar-subitem ${isActive('/daily-wheel') ? 'active' : ''}`}
                  onClick={() => handleNavigation('/daily-wheel')}
                >
                  <span className="subitem-icon">🎡</span>
                  <span className="subitem-label">Daily Wheel</span>
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
                <span className="sidebar-label">{menuItems[2].label}</span>
                <span className={`dropdown-arrow ${showGamesDropdown ? 'open' : ''}`}>▼</span>
              </button>

              {showGamesDropdown && (
                <div className="sidebar-dropdown">
                  <button
                    className={`sidebar-subitem ${isActive('/games/blackjack') ? 'active' : ''}`}
                    onClick={() => handleNavigation('/games/blackjack')}
                  >
                    <span className="subitem-icon">🃏</span>
                    <span className="subitem-label">Blackjack</span>
                  </button>
                  <button
                    className={`sidebar-subitem ${isActive('/games/mines') ? 'active' : ''}`}
                    onClick={() => handleNavigation('/games/mines')}
                  >
                    <span className="subitem-icon">💣</span>
                    <span className="subitem-label">Mines</span>
                  </button>
                  <button
                    className={`sidebar-subitem ${isActive('/games/thelife') ? 'active' : ''}`}
                    onClick={() => handleNavigation('/games/thelife')}
                  >
                    <span className="subitem-icon">🔫</span>
                    <span className="subitem-label">The Life</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Premium dropdown removed - overlay system deleted */}

          {/* WebMod dropdown - Only for admins and slot_modders */}
          {(isAdmin || isSlotModder) && (
            <div className="sidebar-item-wrapper">
              <button
                className={`sidebar-item ${showWebModDropdown ? 'active' : ''}`}
                onClick={() => setShowWebModDropdown(!showWebModDropdown)}
              >
                <span className="sidebar-icon">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
                </span>
                <span className="sidebar-label">WebMod</span>
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
                      <span className="subitem-label">Slot Manager</span>
                    </button>
                  )}
                  {isModerator && (
                    <button
                      className={`sidebar-subitem ${isActive('/webmod/points-manager') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/webmod/points-manager')}
                    >
                      <span className="subitem-icon">🎁</span>
                      <span className="subitem-label">Points Manager</span>
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        className={`sidebar-subitem ${isActive('/webmod/voucher-manager') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/webmod/voucher-manager')}
                      >
                        <span className="subitem-icon">🎟️</span>
                        <span className="subitem-label">Voucher Manager</span>
                      </button>
                      <button
                        className={`sidebar-subitem ${isActive('/webmod/giveaway-creator') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/webmod/giveaway-creator')}
                      >
                        <span className="subitem-icon">🎁</span>
                        <span className="subitem-label">Giveaway Creator</span>
                      </button>
                      <button
                        className={`sidebar-subitem ${isActive('/webmod/edit-slots') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/webmod/edit-slots')}
                      >
                        <span className="subitem-icon">✏️</span>
                        <span className="subitem-label">Edit Slots</span>
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
              <span className="sidebar-label">{menuItems[4].label}</span>
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
                <span className="sidebar-label">Log Out</span>
              </button>
            </>
          )}
        </nav>

        {/* Social Media Links */}
        <div className="sidebar-social">
          <a href="https://www.instagram.com/osecaadegas/" target="_blank" rel="noopener noreferrer" className="social-link" title="Instagram">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a href="https://t.me/+6dgd1_FRNq03Nzc8" target="_blank" rel="noopener noreferrer" className="social-link" title="Telegram">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </a>
          <a href="https://discord.gg/UbUjYzVuvj" target="_blank" rel="noopener noreferrer" className="social-link" title="Discord">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0 a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </a>
          <a href="https://www.twitch.tv/osecaadegas95" target="_blank" rel="noopener noreferrer" className="social-link" title="Twitch">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
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
