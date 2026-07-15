import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StreamElementsProvider } from './context/StreamElementsContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './components/LandingPage/LandingPage';
import TopNavigation from './components/Navigation/TopNavigation';
import OffersPage from './components/OffersPage/OffersPage';
import AboutPage from './components/AboutPage/AboutPage';

import { checkUserAccess } from './utils/adminUtils';
import TwitchChat from './components/TwitchChat/TwitchChat';
import SlotManagerPage from './components/SlotManager/SlotManagerPage';
import { useStreamElements } from './context/StreamElementsContext';
import ProtectedAdminRoute from './components/ProtectedRoute/ProtectedAdminRoute';

import ProfilePage from './components/ProfilePage/ProfilePage';
import AppsPage from './components/AppsPage/AppsPage';
import SpotifyCallback from './components/SpotifyCallback';
import DeveloperPage from './components/DeveloperPage/DeveloperPage';
import PricingPage from './components/Pricing/PricingPage';
import PrivacyPolicy from './components/Legal/PrivacyPolicy';
import TermsOfService from './components/Legal/TermsOfService';
import LoginPage from './components/Login/LoginPage';
import CookieConsent from './components/CookieConsent/CookieConsent';
import useSlotRequestListener from './hooks/useSlotRequestListener';
import usePredictionListener from './hooks/usePredictionListener';
import useBetsListener from './hooks/useBetsListener';
import useAnalytics from './hooks/useAnalytics';
import { applyRouteSeo } from './utils/seo';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner';
// ThemesPage is now rendered inside OverlayControlCenter

/* ── Lazy-loaded heavy routes (code-split) ── */
const AdminPanel = lazy(() => import('./components/AdminPanel/AdminPanel'));
const AdminSubscriptionsPage = lazy(() => import('./components/AdminSubscriptions/AdminSubscriptionsPage'));
const OverlayControlCenter = lazy(() => import('./components/OverlayCenter/OverlayControlCenter'));
const OverlayRenderer = lazy(() => import('./components/OverlayCenter/OverlayRenderer'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard/AnalyticsDashboard'));
const PlayerBonusHuntDashboard = lazy(() => import('./features/playerBonusHunt/PlayerBonusHuntDashboard'));
const PlayerBonusHuntNew = lazy(() => import('./features/playerBonusHunt/PlayerBonusHuntNew'));
const PlayerBonusHuntDetail = lazy(() => import('./features/playerBonusHunt/PlayerBonusHuntDetail'));
const PlayerBonusHuntLibrary = lazy(() => import('./features/playerBonusHunt/PlayerBonusHuntLibrary'));
const PlayerSubscriptionPage = lazy(() => import('./features/playerBonusHunt/PlayerSubscriptionPage'));
const ProtectedPlayerRoute = lazy(() => import('./features/playerBonusHunt/ProtectedPlayerRoute'));
const SlotDetectorDashboard = lazy(() => import('./features/slotDetector/SlotDetectorDashboard'));

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
    return <LoadingSpinner text="Loading..." fullPage />;
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

function AppRuntimeHooks() {
  useSlotRequestListener(); // persistent chat listener for !sr commands
  usePredictionListener(); // persistent chat listener for !bet commands
  useBetsListener();        // persistent chat listener for Bets widget
  useAnalytics(); // page view tracking + user identification
  return null;
}

// Layout wrapper to show sidebar on all pages except overlay and widget display routes
function LayoutWrapper({ children }) {
  const location = useLocation();
  const isWidgetRoute = location.pathname.startsWith('/widgets/');
  const isOBSOverlay = location.pathname.startsWith('/overlay/');
  const isOverlayCenter = location.pathname.startsWith('/overlay-center');
  const isLandingRoute = location.pathname === '/' || location.pathname === '/player' || location.pathname === '/streamer';
  const isUtilityRoute = location.pathname === '/login' || location.pathname === '/spotify-callback';
  const showTopNavigation = !isLandingRoute && !isWidgetRoute && !isOBSOverlay && !isOverlayCenter && !isUtilityRoute;

  useEffect(() => {
    applyRouteSeo(location.pathname);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {!isOBSOverlay && <AppRuntimeHooks />}
      {showTopNavigation && <TopNavigation />}
      <div className="main-content main-content--no-sidebar">
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
              <Suspense fallback={<LoadingSpinner text="Loading..." fullPage />}>
              <Routes>
                <Route path="/" element={<LandingPage mode="selector" />} />
                <Route path="/player" element={<LandingPage mode="player" />} />
                <Route path="/streamer" element={<LandingPage mode="streamer" />} />
                <Route path="/offers" element={<OffersPage />} />
                <Route path="/apps" element={<AppsPage />} />

                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/premium" element={<PricingPage />} />
                <Route path="/player/subscription" element={<PlayerSubscriptionPage />} />
                <Route path="/player/bonus-hunt" element={
                  <ProtectedPlayerRoute>
                    <PlayerBonusHuntDashboard />
                  </ProtectedPlayerRoute>
                } />
                <Route path="/player/bonus-hunt/new" element={
                  <ProtectedPlayerRoute>
                    <PlayerBonusHuntNew />
                  </ProtectedPlayerRoute>
                } />
                <Route path="/player/bonus-hunt/library" element={
                  <ProtectedPlayerRoute>
                    <PlayerBonusHuntLibrary />
                  </ProtectedPlayerRoute>
                } />
                <Route path="/player/bonus-hunt/:huntId" element={
                  <ProtectedPlayerRoute>
                    <PlayerBonusHuntDetail />
                  </ProtectedPlayerRoute>
                } />

                
                {/* WebMod Routes - For admins and slot_modders */}
                <Route path="/webmod/slot-manager" element={
                  <ProtectedAdminRoute allowSlotModder redirectTo="/offers">
                    <SlotManagerPage />
                  </ProtectedAdminRoute>
                } />

                
                <Route path="/admin" element={
                  <ProtectedAdminRoute>
                    <AdminPanel />
                  </ProtectedAdminRoute>
                } />
                <Route path="/admin/subscriptions" element={
                  <ProtectedAdminRoute>
                    <AdminSubscriptionsPage />
                  </ProtectedAdminRoute>
                } />
                <Route path="/overlay-center/*" element={
                  <ProtectedAdminRoute allowPremium allowModerator redirectTo="/premium">
                    <OverlayControlCenter />
                  </ProtectedAdminRoute>
                } />
                <Route path="/slot-detector" element={
                  <ProtectedAdminRoute allowPremium allowModerator redirectTo="/premium">
                    <SlotDetectorDashboard />
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
