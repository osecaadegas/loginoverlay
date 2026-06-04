import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import trackOfferClick from '../../utils/trackOfferClick';
import AuthModal from '../Auth/AuthModal';
import './LandingPage.css';

/* ─── Static data ─── */
const FEATURED_PARTNERS = [
  { id: 'bcgame',    name: 'BC.GAME',      tag: 'TOP PARTNER', tagColor: '#0ea5e9', model: '40% Rev Share',   badges: ['CPA Available', 'Fast Approval', 'Weekly Payments'],      logo: '🎮', accent: '#0ea5e9' },
  { id: 'rollbit',   name: 'Rollbit',       tag: 'POPULAR',     tagColor: '#10b981', model: 'Stream Friendly', badges: ['Fast Approval', 'NFT Rewards', 'Exclusive Bonuses'],        logo: '🎰', accent: '#10b981' },
  { id: 'duelbits',  name: 'Duelbits',      tag: 'POPULAR',     tagColor: '#f59e0b', model: 'Revenue Share',   badges: ['Dedicated Manager', 'High Converting', '24/7 Support'],   logo: '⚔️', accent: '#a855f7' },
  { id: 'stake',     name: 'Stake',         tag: 'NEW',         tagColor: '#6366f1', model: '35% Rev Share',   badges: ['Global Brand', '24/7 Support', 'Quick Payouts'],           logo: '♟️', accent: '#6366f1' },
  { id: 'sportsbet', name: 'Sportsbet.io',  tag: 'NEW',         tagColor: '#ec4899', model: 'CPA up to €120',  badges: ['Sports Focused', 'Quick Payouts', 'EU GEOs'],              logo: '⚽', accent: '#ec4899' },
];

const FEATURES = [
  { icon: '✦',  title: 'Premium Overlays',    desc: 'Professional & unique overlays for every stream style',              color: '#6366f1' },
  { icon: '⊞',  title: 'Interactive Widgets', desc: 'Engage your audience with games, polls, leaderboards & more',        color: '#a855f7' },
  { icon: '⚡', title: 'Automated Tools',      desc: 'Save time with automation and smart stream management',              color: '#0ea5e9' },
  { icon: '📊', title: 'Advanced Analytics',  desc: 'Track performance and maximize your earnings',                       color: '#10b981' },
  { icon: '🎧', title: 'Priority Support',     desc: 'Get help fast from our creator success team',                       color: '#f59e0b' },
  { icon: '🔄', title: 'Weekly Updates',       desc: 'New features & partners added every week',                          color: '#ec4899' },
];

const MARKETPLACE = [
  { name: 'Crypto Casino X', model: '30% Rev Share',  desc: 'High converting crypto offers',      extra: '+ Exclusive bonuses', img: '🎲', color: '#f59e0b' },
  { name: 'Sportsbook Pro',  model: 'CPA up to €120', desc: 'Premium sports traffic global GEOs', extra: '',                    img: '⚽', color: '#10b981' },
  { name: 'Poker Network',   model: '25% Rev Share',  desc: 'Strong brand + loyal players',       extra: '+ weekly rakeback',   img: '🃏', color: '#a855f7' },
];

const PRICING = [
  { id: 'starter', name: 'Starter',      price: '€15',  period: '/month',    badge: null,           badgeType: null,      desc: 'Perfect for new streamers',    subPrice: null,        features: ['All Overlay Center access', 'Basic widgets & themes', 'Email support', 'Regular updates'],                             cta: 'Get Started', highlight: false },
  { id: 'creator', name: 'Creator',      price: '€60',  period: '/6 months', badge: 'MOST POPULAR', badgeType: 'popular', desc: 'For growing content creators', subPrice: '€10 /month', features: ['All Starter features', 'Advanced widgets', 'Priority support', 'Early access to new features'],                   cta: 'Choose Plan', highlight: true  },
  { id: 'pro',     name: 'Professional', price: '€120', period: '/year',      badge: 'BEST VALUE',   badgeType: 'value',   desc: 'For full-time streamers',      subPrice: null,        features: ['All Creator features', 'Exclusive partnerships', 'Custom branding', 'Dedicated account manager'],                  cta: 'Choose Plan', highlight: false },
];

const FILTERS = ['All', 'Casino', 'Sports', 'Crypto', 'Poker', 'Trading'];

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home',                 key: 'home',        path: '/'          },
  { icon: '🤝', label: 'Affiliate Partners',   key: 'affiliates',  path: '/offers'    },
  { icon: '🛒', label: 'Offers Marketplace',   key: 'marketplace', path: '/offers'    },
  { icon: '🖥', label: 'Overlay Center',        key: 'overlay',     path: '/overlay'   },
  { icon: '🎮', label: 'Games',                key: 'games',       path: '/overlay'   },
  { icon: '⊞',  label: 'Widgets',              key: 'widgets',     path: '/overlay'   },
  { icon: '📊', label: 'Analytics',            key: 'analytics',   path: '/overlay'   },
  { icon: '🔧', label: 'Developer API',        key: 'api',         path: '/overlay'   },
  { icon: '👥', label: 'Community',            key: 'community',   path: '/'          },
  { icon: '⚙️', label: 'Settings',             key: 'settings',    path: '/overlay'   },
];

/* ─── Animated counter ─── */
function Counter({ end, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const ref     = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;
      const target = Number(end);
      const duration = 1800;
      const startTime = performance.now();
      const tick = (now) => {
        const p = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setCount(Math.floor(eased * target));
        if (p < 1) requestAnimationFrame(tick);
        else setCount(target);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── Main page ─── */
export default function LandingPage() {
  const [showAuthModal, setShowAuthModal]             = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [casinoOffers, setCasinoOffers]               = useState([]);
  const [clicks, setClicks]                           = useState(1000);
  const [activeFilter, setActiveFilter]               = useState('All');
  const [billingAnnual, setBillingAnnual]             = useState(true);
  const [activeNav, setActiveNav]                     = useState('home');
  const [sidebarOpen, setSidebarOpen]                 = useState(false);
  const { user, signInWithTwitch }                    = useAuth();
  const navigate                                      = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('ageVerified')) setShowAgeVerification(true);
    loadOffers();
  }, []);

  const loadOffers = async () => {
    const { data } = await supabase
      .from('casino_offers')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(5);
    if (data) setCasinoOffers(data);
  };

  const handleOfferClick = (offer) => {
    if (!offer.bonus_link) return;
    trackOfferClick({ offerId: offer.id, casinoName: offer.casino_name, pageSource: 'landing' });
    window.open(offer.bonus_link, '_blank', 'noopener,noreferrer');
  };

  const earnings = {
    cpa:      Math.round(clicks * 0.35),
    revShare: Math.round(clicks * 0.58),
    hybrid:   Math.round(clicks * 0.74),
  };

  /* Merge DB offers with static partner metadata */
  const partners = casinoOffers.length > 0
    ? casinoOffers.slice(0, 5).map((o, i) => ({ ...FEATURED_PARTNERS[i], ...o, _fp: FEATURED_PARTNERS[i] }))
    : FEATURED_PARTNERS;

  const handleNav = (item) => {
    setActiveNav(item.key);
    setSidebarOpen(false);
    if (item.path !== '/') {
      if (!user && item.path === '/overlay') { setShowAuthModal(true); return; }
      navigate(item.path);
    }
  };

  return (
    <>
      {/* ── Age Gate ── */}
      {showAgeVerification && (
        <div className="lp-age-overlay">
          <div className="lp-age-modal">
            <div className="lp-age-icon">🔞</div>
            <h2>Age Verification</h2>
            <p>This website contains gambling content. You must be 18+ to enter.</p>
            <div className="lp-age-btns">
              <button onClick={() => { localStorage.setItem('ageVerified', 'true'); setShowAgeVerification(false); }}>✓ I'm 18+</button>
              <button className="lp-age-deny" onClick={() => { window.location.href = 'https://www.google.com'; }}>✗ Exit</button>
            </div>
            <p className="lp-age-legal">18+ Only • Responsible Gambling</p>
          </div>
        </div>
      )}

      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && <div className="lp-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* ══ ROOT LAYOUT ══ */}
      <div className="lp-layout">

        {/* ══════════ LEFT SIDEBAR ══════════ */}
        <aside className={`lp-sidebar ${sidebarOpen ? 'lp-sidebar--open' : ''}`}>

          {/* Logo */}
          <div className="lp-sb-logo">
            <div className="lp-sb-logo-icon">S</div>
            <div>
              <div className="lp-sb-logo-name">SecaAdegas</div>
              <div className="lp-sb-logo-tagline">Creator Platform</div>
            </div>
          </div>

          {/* User profile card */}
          <div className="lp-sb-profile">
            <div className="lp-sb-avatar">
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} alt="" />
                : <span>🎮</span>}
            </div>
            <div className="lp-sb-profile-info">
              <div className="lp-sb-username">{user?.user_metadata?.display_name || 'Guest User'}</div>
              <div className="lp-sb-points">⚡ {user ? '1,250 pts' : '0 pts'}</div>
              <div className={`lp-sb-status ${user ? 'lp-sb-status--premium' : ''}`}>
                {user ? '★ Premium' : '○ Free'}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="lp-sb-nav">
            <div className="lp-sb-nav-label">MENU</div>
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={`lp-sb-nav-item ${activeNav === item.key ? 'lp-sb-nav-item--active' : ''}`}
                onClick={() => handleNav(item)}
              >
                <span className="lp-sb-nav-icon">{item.icon}</span>
                <span className="lp-sb-nav-label-txt">{item.label}</span>
                {item.key === 'home' && <span className="lp-sb-nav-dot" />}
              </button>
            ))}
          </nav>

          {/* Bottom: language + socials */}
          <div className="lp-sb-bottom">
            <div className="lp-sb-lang">
              <span className="lp-sb-lang-icon">🌐</span>
              <span>EN</span>
              <span className="lp-sb-lang-arrow">▾</span>
            </div>
            <div className="lp-sb-socials">
              {[
                { title: 'Discord', href: 'https://discord.gg/4yZ3F2Pk4z', d: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' },
                { title: 'Kick',    href: 'https://kick.com',                d: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14H9V8h2v8zm4-4l-4 4V8l4 4z' },
                { title: 'Twitch',  href: 'https://www.twitch.tv/osecaadegas95', d: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z' },
                { title: 'YouTube', href: 'https://www.youtube.com/@osecaadegas', d: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
              ].map(s => (
                <a key={s.title} href={s.href} title={s.title} target="_blank" rel="noopener noreferrer" className="lp-sb-social">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={s.d} /></svg>
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* ══════════ MAIN CONTENT ══════════ */}
        <main className="lp-main">

          {/* ── Mobile topbar ── */}
          <div className="lp-topbar">
            <button className="lp-hamburger" onClick={() => setSidebarOpen(o => !o)}>
              <span /><span /><span />
            </button>
            <span className="lp-topbar-brand">SecaAdegas</span>
            <button className="lp-btn-primary lp-topbar-cta" onClick={() => user ? navigate('/overlay') : setShowAuthModal(true)}>
              {user ? 'Dashboard' : 'Sign In'}
            </button>
          </div>

          {/* ══════════ HERO ══════════ */}
          <section className="lp-hero">
            <div className="lp-hero-orb lp-hero-orb-1" />
            <div className="lp-hero-orb lp-hero-orb-2" />
            <div className="lp-hero-grid" />

            <div className="lp-hero-inner">
              {/* Copy */}
              <div className="lp-hero-copy">
                <div className="lp-badge">
                  <span className="lp-badge-dot" />
                  #1 Overlay &amp; Partnership Platform
                </div>

                <h1 className="lp-h1">
                  <span className="lp-grad">Grow Your Stream</span><br />
                  <span className="lp-grad">&amp; Earn More</span>
                </h1>

                <p className="lp-hero-sub">
                  Premium overlays, interactive widgets, affiliate partnerships
                  and advanced tools to grow your audience and income.
                </p>

                <div className="lp-hero-ctas">
                  <button className="lp-btn-primary" onClick={() => navigate('/offers')}>
                    Explore Partnerships
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                  <button className="lp-btn-secondary" onClick={() => user ? navigate('/overlay') : setShowAuthModal(true)}>
                    View Dashboard
                  </button>
                </div>
              </div>

              {/* Right: mockup + account panel */}
              <div className="lp-hero-right">
                {/* Product mockup */}
                <div className="lp-mockup">
                  <div className="lp-mockup-inner">
                    <div className="lp-mockup-topbar">
                      <div className="lp-mockup-dots">
                        <span style={{ background: '#ef4444' }} /><span style={{ background: '#f59e0b' }} /><span style={{ background: '#10b981' }} />
                      </div>
                      <span className="lp-mockup-title">Overlay Dashboard</span>
                    </div>
                    <div className="lp-mock-reels">
                      {['7', '🍒', '7'].map((r, i) => <div key={i} className="lp-mock-reel">{r}</div>)}
                    </div>
                    <div className="lp-mock-stats">
                      {[
                        { val: '2.4k', lbl: 'Live Viewers', c: '#0ea5e9' },
                        { val: '87',   lbl: 'Conversions',  c: '#10b981' },
                        { val: '€1.2k',lbl: 'Revenue',      c: '#f59e0b' },
                      ].map((s, i) => (
                        <>
                          {i > 0 && <div key={`d${i}`} className="lp-mock-divider" />}
                          <div key={s.lbl} className="lp-mock-stat">
                            <span className="lp-mock-stat-val" style={{ color: s.c }}>{s.val}</span>
                            <span className="lp-mock-stat-lbl">{s.lbl}</span>
                          </div>
                        </>
                      ))}
                    </div>
                    <div className="lp-mock-bars">
                      {[
                        { w: '82%', c: '#6366f1', lbl: 'Overlay CTR' },
                        { w: '61%', c: '#0ea5e9', lbl: 'Conversion'  },
                        { w: '45%', c: '#10b981', lbl: 'Retention'   },
                      ].map(b => (
                        <div key={b.lbl} className="lp-mock-bar-row">
                          <span className="lp-mock-bar-lbl">{b.lbl}</span>
                          <div className="lp-mock-bar-track">
                            <div className="lp-mock-bar-fill" style={{ width: b.w, background: b.c }} />
                          </div>
                          <span className="lp-mock-bar-pct">{b.w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Account panel */}
                <div className="lp-account-panel">
                  <div className="lp-acct-header">
                    <div className="lp-acct-avatar">
                      {user?.user_metadata?.avatar_url
                        ? <img src={user.user_metadata.avatar_url} alt="" />
                        : <span>🎮</span>}
                    </div>
                    <div>
                      <div className="lp-acct-name">{user?.user_metadata?.display_name || 'Your Account'}</div>
                      <div className={`lp-acct-badge ${user ? 'lp-acct-badge--active' : 'lp-acct-badge--inactive'}`}>
                        {user ? '● Premium Active' : '○ Not signed in'}
                      </div>
                    </div>
                  </div>
                  <div className="lp-acct-divider" />
                  {[
                    { icon: '🤝', label: 'Affiliate Status',  val: '3 Active Deals', c: '#6366f1' },
                    { icon: '👥', label: 'Total Referrals',   val: '124',            c: '#10b981' },
                    { icon: '💶', label: 'Est. Revenue',      val: '€782.45',        c: '#f59e0b', bold: true },
                  ].map(r => (
                    <div key={r.label} className="lp-acct-row">
                      <div className="lp-acct-row-icon" style={{ background: `${r.c}18`, color: r.c }}>{r.icon}</div>
                      <div className="lp-acct-row-body">
                        <span className="lp-acct-row-label">{r.label}</span>
                        <span className="lp-acct-row-val" style={r.bold ? { color: r.c, fontWeight: 700 } : {}}>{r.val}</span>
                      </div>
                    </div>
                  ))}
                  <button className="lp-btn-primary lp-acct-cta" onClick={() => user ? navigate('/overlay') : setShowAuthModal(true)}>
                    {user ? 'Go to Dashboard' : 'Sign In with Twitch'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════ STATS ══════════ */}
          <section className="lp-stats">
            {[
              { label: 'Active Streamers',  end: 1250,  suffix: '+',  prefix: '',  icon: '👥' },
              { label: 'Affiliate Revenue', end: 48000, suffix: '+',  prefix: '€', icon: '💶' },
              { label: 'Partner Brands',    end: 15,    suffix: '+',  prefix: '',  icon: '🤝' },
              { label: 'Support',           end: 24,    suffix: '/7', prefix: '',  icon: '🎧' },
            ].map(s => (
              <div key={s.label} className="lp-stat-card">
                <div className="lp-stat-icon">{s.icon}</div>
                <div className="lp-stat-num"><Counter end={s.end} suffix={s.suffix} prefix={s.prefix} /></div>
                <div className="lp-stat-lbl">{s.label}</div>
              </div>
            ))}
          </section>

          {/* ══════════ FEATURED PARTNERS ══════════ */}
          <section className="lp-section">
            <div className="lp-section-top">
              <div>
                <h2 className="lp-section-h2">Featured Affiliate Partners</h2>
                <p className="lp-section-sub">Hand-picked programs with the best commissions for streamers</p>
              </div>
              <button className="lp-link-btn" onClick={() => navigate('/offers')}>View all →</button>
            </div>

            <div className="lp-partners-grid">
              {partners.map((p, i) => {
                const fp   = p._fp || FEATURED_PARTNERS[i] || FEATURED_PARTNERS[0];
                const name = p.casino_name || fp.name;
                return (
                  <div key={fp.id} className="lp-partner-card" style={{ '--acc': fp.accent }}>
                    <div className="lp-partner-tag" style={{ background: `${fp.tagColor}20`, color: fp.tagColor, border: `1px solid ${fp.tagColor}40` }}>
                      {fp.tag}
                    </div>
                    <div className="lp-partner-logo">
                      {p.list_image_url ? <img src={p.list_image_url} alt={name} /> : <span>{fp.logo}</span>}
                    </div>
                    <div className="lp-partner-name">{name}</div>
                    <div className="lp-partner-model" style={{ color: fp.accent }}>{fp.model}</div>
                    <div className="lp-partner-checks">
                      {fp.badges.map(b => <span key={b} className="lp-check-item">✓ {b}</span>)}
                    </div>
                    <button className="lp-partner-btn" style={{ '--acc': fp.accent }} onClick={() => p.bonus_link ? handleOfferClick(p) : navigate('/offers')}>
                      Apply Now
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ══════════ WHY CHOOSE US ══════════ */}
          <section className="lp-section lp-features-wrap">
            <div className="lp-section-top lp-section-top--center">
              <h2 className="lp-section-h2">Why Top Creators Choose SecaAdegas</h2>
              <p className="lp-section-sub">Everything you need to build, monetize, and grow your stream</p>
            </div>
            <div className="lp-features-grid">
              {FEATURES.map(f => (
                <div key={f.title} className="lp-feat-card" style={{ '--fc': f.color }}>
                  <div className="lp-feat-icon" style={{ background: `${f.color}18`, color: f.color }}>{f.icon}</div>
                  <h3 className="lp-feat-title">{f.title}</h3>
                  <p className="lp-feat-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════ CALC + MARKETPLACE ══════════ */}
          <section className="lp-section lp-two-col">

            {/* Earnings Calculator */}
            <div className="lp-calc">
              <h3 className="lp-calc-h3">Earnings Calculator</h3>
              <p className="lp-calc-sub">See how much you can earn with our top partnerships</p>
              <div className="lp-slider-row">
                <span>Monthly Clicks</span>
                <strong>{clicks.toLocaleString()}</strong>
              </div>
              <div className="lp-slider-wrap">
                <input
                  type="range" min="100" max="10000" step="100"
                  value={clicks}
                  onChange={e => setClicks(Number(e.target.value))}
                  className="lp-slider"
                  style={{ '--pct': `${((clicks - 100) / 9900) * 100}%` }}
                />
              </div>
              <div className="lp-calc-cards">
                {[
                  { label: 'CPA',       val: earnings.cpa,      color: '#6366f1' },
                  { label: 'Rev Share', val: earnings.revShare,  color: '#10b981' },
                  { label: 'Hybrid',    val: earnings.hybrid,    color: '#f59e0b' },
                ].map(r => (
                  <div key={r.label} className="lp-calc-result">
                    <span className="lp-calc-result-lbl">{r.label}</span>
                    <span className="lp-calc-result-val" style={{ color: r.color }}>€{r.val.toLocaleString()}</span>
                    <span className="lp-calc-result-sub">Estimated</span>
                  </div>
                ))}
              </div>
              <p className="lp-calc-note">*Estimates based on average conversion rates</p>
            </div>

            {/* Partnership Marketplace */}
            <div className="lp-market">
              <div className="lp-section-top">
                <h3 className="lp-section-h2" style={{ fontSize: '1.25rem' }}>New Partnership Opportunities</h3>
                <button className="lp-link-btn" onClick={() => navigate('/offers')}>View all →</button>
              </div>
              <div className="lp-filters">
                {FILTERS.map(f => (
                  <button key={f} className={`lp-filter ${activeFilter === f ? 'lp-filter--on' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
                ))}
              </div>
              <div className="lp-market-list">
                {MARKETPLACE.map(m => (
                  <div key={m.name} className="lp-market-item" style={{ '--mc': m.color }}>
                    <div className="lp-market-left">
                      <div className="lp-market-icon" style={{ background: `${m.color}18`, color: m.color }}>{m.img}</div>
                      <div>
                        <span className="lp-market-new" style={{ background: `${m.color}20`, color: m.color }}>NEW</span>
                        <div className="lp-market-name">{m.name}</div>
                        <div className="lp-market-model" style={{ color: m.color }}>{m.model}</div>
                      </div>
                    </div>
                    <div className="lp-market-right">
                      <div className="lp-market-desc">{m.desc}</div>
                      {m.extra && <div className="lp-market-extra">{m.extra}</div>}
                      <button className="lp-market-btn" style={{ background: m.color }} onClick={() => navigate('/offers')}>Apply Now</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════ PRICING ══════════ */}
          <section className="lp-section lp-pricing-wrap">
            <div className="lp-section-top lp-section-top--center">
              <h2 className="lp-section-h2">Choose Your Premium Plan</h2>
              <p className="lp-section-sub">Start free, scale as you grow</p>
            </div>
            <div className="lp-billing-row">
              <span className={!billingAnnual ? 'lp-bill-active' : ''}>Monthly</span>
              <button className={`lp-toggle ${billingAnnual ? 'lp-toggle--on' : ''}`} onClick={() => setBillingAnnual(b => !b)}>
                <div className="lp-toggle-knob" />
              </button>
              <span className={billingAnnual ? 'lp-bill-active' : ''}>Annual <span className="lp-save-badge">Save 20%</span></span>
            </div>
            <div className="lp-pricing-grid">
              {PRICING.map(plan => (
                <div key={plan.id} className={`lp-price-card ${plan.highlight ? 'lp-price-card--hi' : ''}`}>
                  {plan.badge && (
                    <div className={`lp-price-badge ${plan.badgeType === 'popular' ? 'lp-price-badge--pop' : 'lp-price-badge--val'}`}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="lp-price-name">{plan.name}</div>
                  <div className="lp-price-desc">{plan.desc}</div>
                  <div className="lp-price-amount">
                    <span className="lp-price-num">{plan.price}</span>
                    <span className="lp-price-period">{plan.period}</span>
                  </div>
                  {plan.subPrice && <div className="lp-price-sub">{plan.subPrice}</div>}
                  <ul className="lp-price-features">
                    {plan.features.map(f => <li key={f}><span className="lp-tick">✓</span>{f}</li>)}
                  </ul>
                  <button
                    className={plan.highlight ? 'lp-btn-primary lp-price-cta' : 'lp-btn-outline lp-price-cta'}
                    onClick={() => user ? navigate('/overlay') : setShowAuthModal(true)}
                  >{plan.cta}</button>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════ TRUST + FOOTER ══════════ */}
          <section className="lp-trust">
            <p className="lp-trust-label">Trusted by streamers worldwide</p>
            <div className="lp-trust-logos">
              {['Kick', 'Twitch', 'YouTube', 'BC.GAME', 'Rollbit', 'Duelbits'].map(n => (
                <div key={n} className="lp-trust-logo">{n}</div>
              ))}
            </div>
          </section>

          <footer className="lp-footer">
            <span className="lp-footer-brand">SecaAdegas</span>
            <span className="lp-footer-copy">© 2026 SecaAdegas • 18+ Responsible Gambling</span>
          </footer>

        </main>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}
