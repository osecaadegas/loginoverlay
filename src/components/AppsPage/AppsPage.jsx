import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CircleUserRound,
  Compass,
  CreditCard,
  Crown,
  Database,
  Download,
  Gamepad2,
  Handshake,
  LogIn,
  LogOut,
  LayoutGrid,
  MonitorDown,
  Radar,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tags,
  TerminalSquare,
  Trophy,
  UserCog,
  Wrench,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../hooks/useAdmin";
import "./AppsPage.css";

const SCREEN_SPLIT_VERSION = "0.1.18";
const SCREEN_SPLIT_DOWNLOAD_URL = `https://github.com/osecaadegas/loginoverlay/releases/download/screensplit-browser-v${SCREEN_SPLIT_VERSION}/StreamersCenterBrowserSetup-${SCREEN_SPLIT_VERSION}.exe`;

const APP_SECTIONS = [
  { id: "stream", title: "Create & stream", icon: Sparkles, hint: "Overlays and live tools" },
  { id: "play", title: "Play & discover", icon: Gamepad2, hint: "Games and offers" },
  { id: "desktop", title: "Desktop apps", icon: MonitorDown, hint: "Install on Windows" },
  { id: "account", title: "Account", icon: CircleUserRound, hint: "Your access and settings" },
  { id: "manage", title: "Management", icon: Wrench, hint: "Tools for your role" },
];

const APP_GROUP_BY_ROUTE = {
  "/overlay-center": "stream", "/editor": "stream", "/slot-detector": "stream",
  "/opensource": "stream", "/community_overlays_share": "stream",
  "/player/bonus-hunt": "play", "/offers": "play",
  "/webmod/slot-manager": "manage", "/admin": "manage",
  "/admin/affiliates": "manage", "/admin/subscriptions": "manage",
  "/analytics": "manage", "/developer": "manage",
};

const tileGroup = (tile) => tile.href ? "desktop" : APP_GROUP_BY_ROUTE[tile.to] || "account";

function AppLink({ tile, className, children, onAction }) {
  if (tile.action) return <button type="button" className={className} onClick={onAction}>{children}</button>;
  if (tile.href) return <a className={className} href={tile.href} download={tile.download} target={tile.external ? "_blank" : undefined} rel={tile.external ? "noopener noreferrer" : undefined}>{children}</a>;
  return <Link className={className} to={tile.to}>{children}</Link>;
}

export default function AppsPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
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
  const quickDestinations = hasOverlayAccess
    ? ["/editor", "/overlay-center", "/community_overlays_share"]
    : isFreeTier
      ? ["/opensource", "/community_overlays_share", "/player/bonus-hunt"]
      : user
        ? ["/player/bonus-hunt", "/community_overlays_share", "/offers"]
        : ["/premium", "/offers", SCREEN_SPLIT_DOWNLOAD_URL];
  const quickTiles = quickDestinations
    .map((destination) => visibleTiles.find((tile) => (tile.to || tile.href) === destination))
    .filter(Boolean);
  const primaryTile = quickTiles[0];
  const availableSections = APP_SECTIONS.filter((section) =>
    visibleTiles.some((tile) => tileGroup(tile) === section.id),
  );
  const query = search.trim().toLocaleLowerCase();
  const sections = availableSections
    .filter((section) => category === "all" || category === section.id)
    .map((section) => ({
      ...section,
      items: visibleTiles.filter((tile) => tileGroup(tile) === section.id &&
        (!query || `${tile.label} ${tile.desc}`.toLocaleLowerCase().includes(query))),
    }))
    .filter((section) => section.items.length > 0);
  const actionFor = (tile) => tile.action === "logout" ? logout : login;

  const renderTile = (tile) => {
    const Icon = tile.icon;
    return <AppLink key={tile.to || tile.href || tile.action} tile={tile} onAction={actionFor(tile)} className={`apps-tile apps-tile--${tile.tone}${tileGroup(tile) === "desktop" ? " apps-tile--download" : ""}`}>
      <span className={`apps-tile__icon${tile.logo ? " apps-tile__icon--logo" : ""}`} aria-hidden="true">
        {tile.logo ? <img src={tile.logo} alt="" /> : <Icon size={22} strokeWidth={2.1} />}
      </span>
      <span className="apps-tile__copy"><strong>{tile.label}</strong><span className="apps-tile__desc">{tile.desc}</span></span>
      <span className="apps-tile__arrow" aria-hidden="true">{tile.href ? <Download size={18} /> : <ArrowRight size={18} />}</span>
    </AppLink>;
  };

  return (
    <main className="apps-page">
      <section className="apps-page__hero">
        <div className="apps-page__intro">
          <span className="apps-page__eyebrow"><Compass size={14} /> Your workspace</span>
          <h1>What would you like to do?</h1>
          <p>Find your overlays, games and desktop tools in one place.</p>
          <div className="apps-page__hero-actions">
            {primaryTile && <AppLink tile={primaryTile} onAction={actionFor(primaryTile)} className="apps-page__primary-action">{primaryTile.label}<ArrowRight size={18} aria-hidden="true" /></AppLink>}
            <a href="#apps-directory" className="apps-page__secondary-action">Browse all tools</a>
          </div>
        </div>
        <div className="apps-page__quick" aria-label="Quick launch">
          <div className="apps-page__quick-heading"><span>Quick launch</span><Sparkles size={17} aria-hidden="true" /></div>
          {quickTiles.map((tile, index) => {
            const Icon = tile.icon;
            return <AppLink tile={tile} key={tile.to || tile.href} className="apps-page__quick-link">
              <span className="apps-page__quick-number">0{index + 1}</span>
              <span className="apps-page__quick-icon" aria-hidden="true"><Icon size={18} /></span>
              <strong>{tile.label}</strong>
              <ArrowRight size={17} aria-hidden="true" />
            </AppLink>;
          })}
        </div>
      </section>

      <section className="apps-page__directory" id="apps-directory" aria-label="Available app sections">
        <div className="apps-page__directory-heading">
          <div><span className="apps-page__section-kicker">Explore</span><h2>Everything you need</h2></div>
          <label className="apps-page__search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search tools</span><input type="search" placeholder="Search tools" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="apps-page__filters" role="group" aria-label="Tool categories">
          {[{ id: "all", title: "All tools" }, ...availableSections].map((section) => <button key={section.id} type="button" className={`apps-page__filter${category === section.id ? " apps-page__filter--active" : ""}`} aria-pressed={category === section.id} onClick={() => setCategory(section.id)}>{section.title}</button>)}
        </div>
        {sections.length ? sections.map((section) => {
          const Icon = section.icon;
          return <section className={`apps-section apps-section--${section.id}`} key={section.id} aria-labelledby={`apps-section-${section.id}`}>
            <header className="apps-section__heading"><span className="apps-section__symbol"><Icon size={20} aria-hidden="true" /></span><div><h3 id={`apps-section-${section.id}`}>{section.title}</h3><p>{section.hint}</p></div><span className="apps-section__count">{section.items.length}</span></header>
            <div className="apps-grid">{section.items.map(renderTile)}</div>
          </section>;
        }) : <div className="apps-page__empty"><Search size={26} aria-hidden="true" /><h3>No tools found</h3><p>Try another name or category.</p><button type="button" onClick={() => { setSearch(""); setCategory("all"); }}>Show all tools</button></div>}
      </section>
    </main>
  );
}
