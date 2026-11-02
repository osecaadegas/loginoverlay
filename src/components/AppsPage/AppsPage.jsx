import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BellRing,
  CreditCard,
  Crown,
  Database,
  Download,
  Handshake,
  LogIn,
  LogOut,
  LayoutGrid,
  Radar,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  TerminalSquare,
  Trophy,
  UserCog,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../hooks/useAdmin";
import "./AppsPage.css";

const SCREEN_SPLIT_VERSION = "0.1.18";
const SCREEN_SPLIT_DOWNLOAD_URL = `https://github.com/osecaadegas/loginoverlay/releases/download/screensplit-browser-v${SCREEN_SPLIT_VERSION}/StreamersCenterBrowserSetup-${SCREEN_SPLIT_VERSION}.exe`;

const APP_TILE_ART = {
  "/updates": "/apps-tiles/restart-tutorial.jpg",
  "/overlay-center": "/apps-tiles/overlay-center.jpg",
  "/editor": "/apps-tiles/presets.jpg",
  "/slot-detector": "/apps-tiles/approvals.jpg",
  "/opensource": "/apps-tiles/guided-setup.jpg",
  "/community_overlays_share": "/apps-tiles/streamer-home.jpg",
  "/player/bonus-hunt": "/apps-tiles/bonus-hunt.jpg",
  "/webmod/slot-manager": "/apps-tiles/slot-manager.jpg",
  "/offers": "/apps-tiles/deals.jpg",
  "/affiliate": "/apps-tiles/profile.jpg",
  "/premium": "/apps-tiles/premium.jpg",
  "/admin": "/apps-tiles/admin.jpg",
  "/admin/affiliates": "/apps-tiles/approvals.jpg",
  "/admin/subscriptions": "/apps-tiles/premium.jpg",
  "/analytics": "/apps-tiles/analytics.jpg",
  "/developer": "/apps-tiles/developer.jpg",
  "/profile": "/apps-tiles/profile.jpg",
  "login": "/apps-tiles/login.jpg",
  "logout": "/apps-tiles/logout.jpg",
  "screensplit": "/apps-tiles/screensplit.jpg",
  "transitions": "/iconLOGOs/SC_WEB_TRANSITIONS.png",
};

function AppLink({ tile, className, children, onAction }) {
  if (tile.action) return <button type="button" className={className} onClick={onAction}>{children}</button>;
  if (tile.href) return <a className={className} href={tile.href} download={tile.download} target={tile.external ? "_blank" : undefined} rel={tile.external ? "noopener noreferrer" : undefined}>{children}</a>;
  return <Link className={className} to={tile.to}>{children}</Link>;
}

export default function AppsPage() {
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator, isSlotModder, isPremium, isAffiliate, isFreeTier } =
    useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const hasOverlayAccess = isAdmin || isModerator || isPremium;

  const tiles = [
    ...(isPremium ? [{ to: "/updates", label: "Updates", desc: "Website, overlays & browser releases", icon: BellRing, tone: "cyan", art: "updates" }] : []),
    ...(hasOverlayAccess
      ? [
          {
            to: "/overlay-center",
            label: "Widget Data",
            desc: "Live data for Better widgets",
            icon: Database,
            tone: "teal",
            art: "overlay-center",
          },
          {
            to: "/editor",
            label: "Better Editor",
            desc: "Live overlay canvas",
            icon: SlidersHorizontal,
            tone: "cyan",
            art: "editor",
          },
          {
            to: "/slot-detector",
            label: "Slot Detector",
            desc: "Auto-detect active slot",
            icon: Radar,
            tone: "cyan",
            art: "slot-detector",
          },
        ]
      : []),
    ...(isAdmin || isFreeTier
      ? [
          {
            to: "/opensource",
            label: "Open Source Overlay",
            desc: "Manage your free Twitch overlay and copy its OBS link",
            icon: SlidersHorizontal,
            tone: "teal",
            art: "editor",
          },
        ]
      : []),
    ...(user
      ? [
          {
            to: "/community_overlays_share",
            label: "Community Overlays",
            desc: "Browse builds available to your account",
            icon: LayoutGrid,
            tone: "cyan",
            art: "editor",
          },
          {
            to: "/player/bonus-hunt",
            label: "Bonus Hunt",
            desc: "Player hunt tracker",
            icon: Trophy,
            tone: "blue",
            art: "bonus-hunt",
          },
        ]
      : []),
    ...(isSlotModder
      ? [
          {
            to: "/webmod/slot-manager",
            label: "Slot Manager",
            desc: "Slot database tools",
            icon: Database,
            tone: "emerald",
            art: "slot-manager",
          },
        ]
      : []),
    {
      href: SCREEN_SPLIT_DOWNLOAD_URL,
      external: true,
      label: "ScreenSplit Browser",
      desc: `Download the Windows installer (v${SCREEN_SPLIT_VERSION})`,
      icon: Download,
      logo: "/iconLOGOs/SC_BROWSER.png",
      tone: "sky",
      art: "screensplit",
    },
    {
      href: "/SC_Web_Transitions.zip",
      download: "SC_Web_Transitions.zip",
      label: "SC Web Transitions",
      desc: "Download the latest Windows build and source (ZIP)",
      icon: Download,
      logo: "/iconLOGOs/SC_WEB_TRANSITIONS.png",
      tone: "cyan",
      art: "screensplit",
    },
    {
      to: "/offers",
      label: "Deals",
      desc: "Casino offers and partners",
      icon: Tags,
      tone: "lime",
      art: "deals",
    },
    ...(isAffiliate
      ? [
          {
            to: "/affiliate",
            label: "Affiliate",
            desc: "Your tracking links and stats",
            icon: Handshake,
            tone: "teal",
            art: "deals",
          },
        ]
      : []),
    {
      to: "/premium",
      label: "Premium",
      desc: "Plans and access",
      icon: Crown,
      tone: "gold",
      art: "premium",
    },
    ...(isAdmin
      ? [
          {
            to: "/admin",
            label: "Admin Panel",
            desc: "Platform management",
            icon: ShieldCheck,
            tone: "red",
            art: "admin",
          },
          {
            to: "/admin/affiliates",
            label: "Affiliate Manager",
            desc: "Links, roles and partner stats",
            icon: Handshake,
            tone: "emerald",
            art: "deals",
          },
          {
            to: "/admin/subscriptions",
            label: "Subscriptions",
            desc: "Plans, trials and pricing copy",
            icon: CreditCard,
            tone: "amber",
            art: "subscriptions",
          },
          {
            to: "/analytics",
            label: "Analytics",
            desc: "Platform statistics",
            icon: BarChart3,
            tone: "blue",
            art: "analytics",
          },
          {
            to: "/developer",
            label: "Developer",
            desc: "Internal developer tools",
            icon: TerminalSquare,
            tone: "cyan",
            art: "developer",
          },
        ]
      : []),
    ...(user
      ? [
          {
            to: "/profile",
            label: "Profile",
            desc: "Account settings",
            icon: UserCog,
            tone: "violet",
            art: "profile",
          },
        ]
      : []),
  ];
  const login = () => {
    navigate("/login", {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  const logout = async () => {
    await signOut();
    navigate("/");
  };

  const accountTile = user
    ? { action: "logout", label: "Log out", desc: "End this session", icon: LogOut, tone: "red" }
    : { action: "login", label: "Log in", desc: "Access your tools", icon: LogIn, tone: "violet" };
  const visibleTiles = [...tiles, accountTile].filter(
    (tile) => !tile.to || tile.to !== location.pathname,
  );
  const actionFor = (tile) => tile.action === "logout" ? logout : login;

  const renderTile = (tile) => {
    const Icon = tile.icon;
    const artwork = tile.action
      ? APP_TILE_ART[tile.action]
      : tile.logo === "/iconLOGOs/SC_BROWSER.png"
        ? APP_TILE_ART.screensplit
        : tile.logo === "/iconLOGOs/SC_WEB_TRANSITIONS.png"
          ? APP_TILE_ART.transitions
          : APP_TILE_ART[tile.to];
    return <AppLink
      key={tile.to || tile.href || tile.action}
      tile={tile}
      onAction={actionFor(tile)}
      className={`apps-tile apps-tile--${tile.tone}${tile.logo ? " apps-tile--download" : ""}${tile.logo === "/iconLOGOs/SC_WEB_TRANSITIONS.png" ? " apps-tile--transitions" : ""}`}
    >
      {artwork && <span className="apps-tile__art" style={{ backgroundImage: `url("${artwork}")` }} aria-hidden="true" />}
      <span className="apps-tile__top">
        <span className={`apps-tile__icon${tile.logo ? " apps-tile__icon--logo" : ""}`} aria-hidden="true">
          {tile.logo ? <img src={tile.logo} alt="" /> : <Icon size={25} strokeWidth={2} />}
        </span>
        {tile.href && <Download size={17} aria-hidden="true" />}
      </span>
      <span className="apps-tile__copy"><strong>{tile.label}</strong><span className="apps-tile__desc">{tile.desc}</span></span>
    </AppLink>;
  };

  return (
    <main className="apps-page">
      <h1>Apps</h1>
      <section className="apps-grid" aria-label="Available apps and tools">
        {visibleTiles.map(renderTile)}
      </section>
    </main>
  );
}
