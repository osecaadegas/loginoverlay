import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StreamElementsProvider } from './context/StreamElementsContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import StreamElementsPanel from './components/StreamElements/StreamElementsPanel';
import PointsManager from './components/PointsManager/PointsManager';
import LandingPage from './components/LandingPage/LandingPage';
import Sidebar from './components/Sidebar/Sidebar';
import OffersPage from './components/OffersPage/OffersPage';
import AboutPage from './components/AboutPage/AboutPage';
import TournamentsPage from './components/TournamentsPage/TournamentsPage';
import GuessBalancePage from './components/GuessBalancePage/GuessBalancePage';
import GiveawaysPage from './components/GiveawaysPage/GiveawaysPage';
import { checkUserAccess } from './utils/adminUtils';
import GiveawayPanel from './components/GiveawayPanel/GiveawayPanel';
import TwitchChat from './components/TwitchChat/TwitchChat';
import SlotManagerPage from './components/SlotManager/SlotManagerPage';
import GiveawayPage from './components/GiveawayPanel/GiveawayPage';
import { useStreamElements } from './context/StreamElementsContext';
import ProtectedAdminRoute from './components/ProtectedRoute/ProtectedAdminRoute';
import VoucherManager from './components/VoucherManager/VoucherManager';
import VoucherRedeemPage from './components/VoucherRedeemPage/VoucherRedeemPage';
import GiveawayCreator from './components/GiveawayCreator/GiveawayCreator';
import ProfilePage from './components/ProfilePage/ProfilePage';
import SeasonPass from './components/SeasonPass/SeasonPass';
import SpotifyCallback from './components/SpotifyCallback';
import DeveloperPage from './components/DeveloperPage/DeveloperPage';
import PricingPage from './components/Pricing/PricingPage';
import PrivacyPolicy from './components/Legal/PrivacyPolicy';
import TermsOfService from './components/Legal/TermsOfService';
import LoginPage from './components/Login/LoginPage';
import CookieConsent from './components/CookieConsent/CookieConsent';
import useGiveawayListener from './hooks/useGiveawayListener';
import useSlotRequestListener from './hooks/useSlotRequestListener';
import usePredictionListener from './hooks/usePredictionListener';
import useAnalytics from './hooks/useAnalytics';
// ThemesPage is now rendered inside OverlayControlCenter

/* ── Lazy-loaded heavy routes (code-split) ── */
const AdminPanel = lazy(() => import('./components/AdminPanel/AdminPanel'));
const BlackjackPremium = lazy(() => import('./components/Blackjack/BlackjackPremium'));
const Mines = lazy(() => import('./components/Mines/Mines'));
const TheLife = lazy(() => import('./components/TheLife/TheLifeNew'));
const TheLifeJournal = lazy(() => import('./components/TheLife/pages/TheLifeJournal'));
const DailyWheelPage = lazy(() => import('./components/DailyWheel/DailyWheelPage'));
const OverlayControlCenter = lazy(() => import('./components/OverlayCenter/OverlayControlCenter'));
const OverlayRenderer = lazy(() => import('./components/OverlayCenter/OverlayRenderer'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard/AnalyticsDashboard'));

function AppContent({ isAdminOverlay = false }) {
  const location = useLocation();
  const { user } = useAuth();
  const { latestRedemption, setLatestRedemption } = useStreamElements();
  // Removed overlay-related state

  // Toggle body class based on current route
  useEffect(() => {
    if (location.pathname === '/admin-overlay') {
      document.body.classList.add('no-sidebar');
    } else {
      document.body.classList.remove('no-sidebar');
    }
  }, [location.pathname]);

  // Load and subscribe to theme changes from database
  useEffect(() => {
    if (!user || location.pathname !== '/overlay') return;

    const loadAndSubscribeTheme = async () => {
      try {
        // Subscribe to real-time theme changes
        const subscription = subscribeToOverlayState(user.id, (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newState = payload.new;
            if (newState.theme) {
              // Save to localStorage and dispatch event to trigger theme application
              localStorage.setItem('selectedTheme', newState.theme);
              window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newState.theme } }));
            }
          }
        });

        return () => {
          unsubscribe(subscription);
        };
      } catch (error) {
        console.error('Error loading/subscribing to theme:', error);
      }
    };

    loadAndSubscribeTheme();
  }, [user, location.pathname]);


  // Listen for customization panel toggles
  useEffect(() => {
    const handleToggleSpotify = (e) => setShowSpotify(e.detail.show);
    const handleToggleTwitch = (e) => setShowTwitchChatWidget(e.detail.show);
    const handleToggleBHStats = (e) => {
      setShowBHStats(e.detail.show);
      if (e.detail.show) setShowStatsPanel(true);
    };
    const handleToggleBHCards = (e) => setShowBHCards(e.detail.show);
    const handleChatSettingsUpdate = () => {
      const settings = localStorage.getItem('overlaySettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setChatSettings({
          position: parsed.chatPosition || 'bottom-left',
          width: parsed.chatWidth || 350,
          height: parsed.chatHeight || 500
        });
      }
    };
    window.addEventListener('toggleSpotify', handleToggleSpotify);
    window.addEventListener('toggleTwitchChat', handleToggleTwitch);
    window.addEventListener('toggleBHStats', handleToggleBHStats);
    window.addEventListener('toggleBHCards', handleToggleBHCards);
    window.addEventListener('chatSettingsUpdated', handleChatSettingsUpdate);
    
    return () => {
      window.removeEventListener('toggleSpotify', handleToggleSpotify);
      window.removeEventListener('toggleTwitchChat', handleToggleTwitch);
      window.removeEventListener('toggleBHStats', handleToggleBHStats);
      window.removeEventListener('toggleBHCards', handleToggleBHCards);
      window.removeEventListener('chatSettingsUpdated', handleChatSettingsUpdate);
    };
  }, []);

  const handleBonusClick = (bonusId) => {
    setSelectedBonusId(bonusId);
    setShowBonusOpening(true);
  };

  const handleMenuSelect = (menuId) => {
    console.log('Menu selected:', menuId);
    switch(menuId) {
      case 'customization':
        setShowCustomization(!showCustomization); // Toggle instead of just opening
        break;
      case 'randomSlot':
        setShowRandomSlot(!showRandomSlot); // Toggle instead of just opening
        break;
      case 'tournament':
        setShowTournament(!showTournament); // Toggle instead of just opening
        break;
      case 'giveaway':
        setShowGiveaway(!showGiveaway); // Toggle instead of just opening
        break;
      default:
        break;
    }
  };

  // Only render overlay UI on /overlay and /admin-overlay routes
  if (location.pathname !== '/overlay' && location.pathname !== '/admin-overlay') {
    return null;
  }

  return (
    <div className="overlay-container">
      <Navbar />
      
      <div className="main-layout">
      </div>
      {showBHPanel && <BHPanel onClose={() => setShowBHPanel(false)} onOpenBonusOpening={(bonusId) => {
        setSelectedBonusId(bonusId);
        setShowBonusOpening(true);
      }} />}
      {showTournament && <TournamentPanel onClose={() => setShowTournament(false)} />}
      {showGiveaway && <GiveawayPanel onClose={() => setShowGiveaway(false)} />}
      {showRandomSlot && <RandomSlotPicker onClose={() => setShowRandomSlot(false)} />}
      
      {/* Twitch Chat (only show if enabled in customization) */}
      {showTwitchChatWidget && <TwitchChat channel={localStorage.getItem('twitchChannel') || ''} position={chatSettings.position} width={chatSettings.width} height={chatSettings.height} />}
      
      {/* Bonus Opening Panel */}
      {showBonusOpening && (
        <BonusOpening 
          bonusId={selectedBonusId} 
          onClose={() => { 
            setShowBonusOpening(false); 
            setSelectedBonusId(null);
            setShowBHPanel(true);
          }}
          onBonusChange={(bonusId) => setSelectedBonusId(bonusId)}
        />
      )}
      
      {/* StreamElements Redemption Notification - Only for Admin Overlay */}
      {isAdminOverlay && latestRedemption && (
        <RedemptionNotification 
          redemption={latestRedemption} 
          onClose={() => setLatestRedemption(null)} 
        />
      )}
      
      <CircularSidebar onMenuSelect={handleMenuSelect} isLocked={isLocked} onLockToggle={() => setIsLocked(!isLocked)} />
    </div>
  );
}

// Protected Route wrapper
function ProtectedOverlay({ isAdminOverlay = false }) {
  const { user, loading } = useAuth();
  const [accessCheck, setAccessCheck] = useState({ checking: true, hasAccess: false, reason: null });

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setAccessCheck({ checking: false, hasAccess: false, reason: 'Not authenticated' });
        return;
      }

      const result = await checkUserAccess(user.id);
      setAccessCheck({ checking: false, ...result });
    };

    checkAccess();
  }, [user]);

  if (loading || accessCheck.checking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!accessCheck.hasAccess) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🚫 Access Denied</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>{accessCheck.reason}</p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 30px',
            background: 'white',
            color: '#667eea',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Return to Home
        </button>
      </div>
    );
  }

  return <AppContent isAdminOverlay={isAdminOverlay} />;
}

// Layout wrapper to show sidebar on all pages except overlay and widget display routes
function LayoutWrapper({ children }) {
  const location = useLocation();
  useGiveawayListener(); // persistent chat listener for giveaway keyword
  useSlotRequestListener(); // persistent chat listener for !sr commands
  usePredictionListener(); // persistent chat listener for !bet commands
  useAnalytics(); // page view tracking + user identification
  const isWidgetRoute = location.pathname.startsWith('/widgets/');
  const isOBSOverlay = location.pathname.startsWith('/overlay/');
  const isOverlayCenter = location.pathname === '/overlay-center';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const showSidebar = location.pathname !== '/overlay' && 
                      location.pathname !== '/admin-overlay' && 
                      !isWidgetRoute &&
                      !isOBSOverlay &&
                      !isOverlayCenter;

  // Detect screen size changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // Auto-close sidebar when switching to desktop
      if (!mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen, isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="app-layout">
      {showSidebar && (
        <>
          {/* Mobile toggle button */}
          {isMobile && (
            <button 
              className="sidebar-toggle-btn touch-target" 
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
          )}
          
          {/* Sidebar with open state */}
          <Sidebar className={sidebarOpen ? 'open' : ''} onClose={closeSidebar} />
          
          {/* Backdrop overlay - mobile only */}
          {isMobile && sidebarOpen && (
            <div 
              className="sidebar-backdrop visible" 
              onClick={closeSidebar}
              aria-hidden="true"
            />
          )}
        </>
      )}
      <div className={`main-content ${showSidebar ? '' : 'main-content--no-sidebar'}`}>
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <StreamElementsProvider>
        <LanguageProvider>
          <ThemeProvider>
          <BrowserRouter>
            <LayoutWrapper>
              <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8' }}>Loading...</div>}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/offers" element={<OffersPage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/guess-balance" element={<GuessBalancePage />} />
                <Route path="/giveaways" element={<GiveawaysPage />} />
                <Route path="/vouchers" element={<VoucherRedeemPage />} />
                <Route path="/daily-wheel" element={<DailyWheelPage />} />
                <Route path="/games/dice" element={<div style={{ padding: '20px', color: '#fff' }}>Dice - Coming Soon</div>} />
                <Route path="/games/roulette" element={<div style={{ padding: '20px', color: '#fff' }}>Roulette - Coming Soon</div>} />
                <Route path="/games/blackjack" element={<BlackjackPremium />} />
                <Route path="/games/mines" element={<Mines />} />
                <Route path="/games/thelife" element={<TheLife />} />
                <Route path="/games/thelife/season-pass" element={<SeasonPass />} />
                <Route path="/games/thelife/news" element={<TheLifeJournal />} />
                <Route path="/points" element={<StreamElementsPanel />} />
                <Route path="/streamelements" element={<StreamElementsPanel />} />
                <Route path="/points-manager" element={<PointsManager />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/premium" element={<PricingPage />} />

                
                {/* WebMod Routes - For admins and slot_modders */}
                <Route path="/webmod/slot-manager" element={<SlotManagerPage />} />
                <Route path="/webmod/points-manager" element={<PointsManager />} />
                <Route path="/webmod/voucher-manager" element={
                  <ProtectedAdminRoute>
                    <VoucherManager />
                  </ProtectedAdminRoute>
                } />
                <Route path="/webmod/giveaway-creator" element={
                  <ProtectedAdminRoute>
                    <GiveawayCreator />
                  </ProtectedAdminRoute>
                } />
                
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/overlay-center" element={
                  <ProtectedAdminRoute>
                    <OverlayControlCenter />
                  </ProtectedAdminRoute>
                } />
                <Route path="/overlay/:token" element={<OverlayRenderer />} />
                <Route path="/developer" element={
                  <ProtectedAdminRoute>
                    <DeveloperPage />
                  </ProtectedAdminRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedAdminRoute>
                    <AnalyticsDashboard />
                  </ProtectedAdminRoute>
                } />
                <Route path="/spotify-callback" element={<SpotifyCallback />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
              </Routes>
              </Suspense>
            </LayoutWrapper>
            <CookieConsent />
          </BrowserRouter>
          </ThemeProvider>
        </LanguageProvider>
      </StreamElementsProvider>
      <SpeedInsights />
    </AuthProvider>
  );
}

export default App;
