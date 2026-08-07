import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import { StreamElementsProvider } from "./context/StreamElementsContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import LandingPage from "./components/LandingPage/LandingPage";
import ToolLandingPage from "./components/LandingPage/ToolLandingPage";
import TopNavigation from "./components/Navigation/TopNavigation";
import OffersPage from "./components/OffersPage/OffersPage";

import SlotManagerPage from "./components/SlotManager/SlotManagerPage";
import ProtectedAdminRoute from "./components/ProtectedRoute/ProtectedAdminRoute";

import ProfilePage from "./components/ProfilePage/ProfilePage";
import AppsPage from "./components/AppsPage/AppsPage";
import SpotifyCallback from "./components/SpotifyCallback";
import DeveloperPage from "./components/DeveloperPage/DeveloperPage";
import PricingPage from "./components/Pricing/PricingPage";
import PrivacyPolicy from "./components/Legal/PrivacyPolicy";
import TermsOfService from "./components/Legal/TermsOfService";
import LoginPage from "./components/Login/LoginPage";
import CookieConsent from "./components/CookieConsent/CookieConsent";
import useSlotRequestListener from "./hooks/useSlotRequestListener";
import usePredictionListener from "./hooks/usePredictionListener";
import useBetsListener from "./hooks/useBetsListener";
import useConnectFourListener from "./hooks/useConnectFourListener";
import useAnalytics from "./hooks/useAnalytics";
import { applyRouteSeo } from "./utils/seo";
import LoadingSpinner from "./components/LoadingSpinner/LoadingSpinner";

/* -- Lazy-loaded heavy routes (code-split) -- */
const AdminPanel = lazy(() => import("./components/AdminPanel/AdminPanel"));
const AdminAffiliatesPage = lazy(
  () => import("./components/AdminAffiliates/AdminAffiliatesPage"),
);
const AdminSubscriptionsPage = lazy(
  () => import("./components/AdminSubscriptions/AdminSubscriptionsPage"),
);
const AffiliateDashboard = lazy(
  () => import("./components/AffiliateDashboard/AffiliateDashboard"),
);
const OverlayControlCenter = lazy(
  () => import("./components/OverlayCenter/OverlayControlCenter"),
);
const WidgetEditorPage = lazy(
  () => import("./components/OverlayCenter/editor/WidgetEditorPage"),
);
const BetterObsOverlay = lazy(
  () => import("./components/OverlayCenter/editor/BetterObsOverlay"),
);
const OverlayRenderer = lazy(
  () => import("./components/OverlayCenter/OverlayRenderer"),
);

const AnalyticsDashboard = lazy(
  () => import("./components/AnalyticsDashboard/AnalyticsDashboard"),
);
const PlayerBonusHuntDashboard = lazy(
  () => import("./features/playerBonusHunt/PlayerBonusHuntDashboard"),
);
const PlayerBonusHuntNew = lazy(
  () => import("./features/playerBonusHunt/PlayerBonusHuntNew"),
);
const PlayerBonusHuntDetail = lazy(
  () => import("./features/playerBonusHunt/PlayerBonusHuntDetail"),
);
const PlayerBonusHuntLibrary = lazy(
  () => import("./features/playerBonusHunt/PlayerBonusHuntLibrary"),
);
const PlayerSubscriptionPage = lazy(
  () => import("./features/playerBonusHunt/PlayerSubscriptionPage"),
);
const ProtectedPlayerRoute = lazy(
  () => import("./features/playerBonusHunt/ProtectedPlayerRoute"),
);
const SlotDetectorDashboard = lazy(
  () => import("./features/slotDetector/SlotDetectorDashboard"),
);

function AppRuntimeHooks() {
  useSlotRequestListener(); // persistent chat listener for !sr commands
  usePredictionListener(); // persistent chat listener for !bet commands
  useBetsListener(); // persistent chat listener for Bets widget
  useConnectFourListener(); // persistent chat listener for Connect Four
  useAnalytics(); // page view tracking + user identification
  return null;
}

function RouteBoundServices() {
  const location = useLocation();
  if (
    location.pathname.startsWith("/overlay/") ||
    location.pathname.startsWith("/obs/overlay/")
  ) {
    return null;
  }
  return (
    <>
      <CookieConsent />
      <SpeedInsights />
    </>
  );
}

// Layout wrapper to show sidebar on all pages except overlay and widget display routes
function LayoutWrapper({ children }) {
  const location = useLocation();
  const isWidgetRoute = location.pathname.startsWith("/widgets/");
  const isOBSOverlay = location.pathname.startsWith("/overlay/");
  const isBetterOBSOverlay = location.pathname.startsWith("/obs/overlay/");
  const isEditorRoute = location.pathname === "/editor";
  const isPremiumRoute = location.pathname === "/premium";
  const isSystemRoute = location.pathname === "/spotify-callback";
  const showTopNavigation =
    !isWidgetRoute &&
    !isOBSOverlay &&
    !isBetterOBSOverlay &&
    !isSystemRoute;

  useEffect(() => {
    applyRouteSeo(location.pathname);
  }, [location.pathname]);

  return (
    <div className={`app-layout${isEditorRoute ? " app-layout--editor" : ""}`}>
      {!isOBSOverlay && !isBetterOBSOverlay && <AppRuntimeHooks />}
      {showTopNavigation && <TopNavigation />}
      <div
        className={`main-content main-content--no-sidebar${isPremiumRoute ? " main-content--premium" : ""}${isEditorRoute ? " main-content--editor" : ""}`}
      >
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
                <Suspense
                  fallback={<LoadingSpinner text="Loading..." fullPage />}
                >
                  <Routes>
                    <Route path="/" element={<LandingPage mode="selector" />} />
                    <Route
                      path="/player"
                      element={<LandingPage mode="player" />}
                    />
                    <Route
                      path="/streamer"
                      element={<LandingPage mode="streamer" />}
                    />
                    <Route path="/streamer-overlays" element={<ToolLandingPage />} />
                    <Route path="/bonus-hunt-tracker" element={<ToolLandingPage />} />
                    <Route path="/casino-profit-loss-tracker" element={<ToolLandingPage />} />
                    <Route path="/slot-request-widget" element={<ToolLandingPage />} />
                    <Route path="/tournament-overlay" element={<ToolLandingPage />} />
                    <Route path="/giveaway-widget" element={<ToolLandingPage />} />
                    <Route path="/chat-games" element={<ToolLandingPage />} />
                    <Route path="/offers" element={<OffersPage />} />
                    <Route path="/apps" element={<AppsPage />} />

                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/premium" element={<PricingPage />} />
                    <Route
                      path="/affiliate"
                      element={
                        <ProtectedAdminRoute allowAffiliate redirectTo="/apps">
                          <AffiliateDashboard />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="/player/subscription"
                      element={<PlayerSubscriptionPage />}
                    />
                    <Route
                      path="/player/bonus-hunt"
                      element={
                        <ProtectedPlayerRoute>
                          <PlayerBonusHuntDashboard />
                        </ProtectedPlayerRoute>
                      }
                    />
                    <Route
                      path="/player/bonus-hunt/new"
                      element={
                        <ProtectedPlayerRoute>
                          <PlayerBonusHuntNew />
                        </ProtectedPlayerRoute>
                      }
                    />
                    <Route
                      path="/player/bonus-hunt/library"
                      element={
                        <ProtectedPlayerRoute>
                          <PlayerBonusHuntLibrary />
                        </ProtectedPlayerRoute>
                      }
                    />
                    <Route
                      path="/player/bonus-hunt/:huntId"
                      element={
                        <ProtectedPlayerRoute>
                          <PlayerBonusHuntDetail />
                        </ProtectedPlayerRoute>
                      }
                    />

                    {/* WebMod Routes - For admins and slot_modders */}
                    <Route
                      path="/webmod/slot-manager"
                      element={
                        <ProtectedAdminRoute
                          allowSlotModder
                          redirectTo="/offers"
                        >
                          <SlotManagerPage />
                        </ProtectedAdminRoute>
                      }
                    />

                    <Route
                      path="/admin"
                      element={
                        <ProtectedAdminRoute>
                          <AdminPanel />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="/admin/subscriptions"
                      element={
                        <ProtectedAdminRoute>
                          <AdminSubscriptionsPage />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="/admin/affiliates"
                      element={
                        <ProtectedAdminRoute>
                          <AdminAffiliatesPage />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="/overlay-center/*"
                      element={
                        <ProtectedAdminRoute
                          allowPremium
                          allowModerator
                          redirectTo="/premium"
                        >
                          <OverlayControlCenter />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="/editor"
                      element={
                        <ProtectedAdminRoute
                          allowPremium
                          allowModerator
                          redirectTo="/premium"
                        >
                          <WidgetEditorPage />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="/slot-detector"
                      element={
                        <ProtectedAdminRoute
                          allowPremium
                          allowModerator
                          redirectTo="/premium"
                        >
                          <SlotDetectorDashboard />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="/overlay/:token"
                      element={<OverlayRenderer />}
                    />
                    <Route
                      path="/obs/overlay/:publicOverlayId"
                      element={<BetterObsOverlay />}
                    />
                    <Route
                      path="/obs/overlay/:publicOverlayId/widget/:instanceId"
                      element={<BetterObsOverlay />}
                    />
                    <Route
                      path="/developer"
                      element={
                        <ProtectedAdminRoute>
                          <DeveloperPage />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedAdminRoute>
                          <AnalyticsDashboard />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="/spotify-callback"
                      element={<SpotifyCallback />}
                    />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                  </Routes>
                </Suspense>
              </LayoutWrapper>
              <RouteBoundServices />
            </BrowserRouter>
          </ThemeProvider>
        </LanguageProvider>
      </StreamElementsProvider>
    </AuthProvider>
  );
}

export default App;
