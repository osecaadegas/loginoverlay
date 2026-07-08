import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import trackOfferClick from '../../utils/trackOfferClick';
import AuthModal from '../Auth/AuthModal';
import './LandingPage.css';

/* ─── Static data ─── */
const FEATURED_PARTNERS = [
  { id: 'bcgame',    name: 'BC.GAME',      tag: 'TOP PARTNER', tagColor: '#0ea5e9', model: '40% Rev Share',   badges: ['CPA Available', 'Weekly Payments'],      logo: '🎮', accent: '#0ea5e9', logoBg: '#003366' },
  { id: 'rollbit',   name: 'ROLLBIT',       tag: 'POPULAR',     tagColor: '#10b981', model: 'Stream Friendly', badges: ['Fast Approval', 'Exclusive Bonuses'],     logo: '🎰', accent: '#10b981', logoBg: '#001a0d' },
  { id: 'duelbits',  name: 'Duelbits',      tag: 'POPULAR',     tagColor: '#f59e0b', model: 'Revenue Share',   badges: ['Dedicated Manager', 'High Converting'],  logo: '⚔️', accent: '#6366f1', logoBg: '#0d0033' },
  { id: 'stake',     name: 'Stake',         tag: 'NEW',         tagColor: '#a855f7', model: '35% Rev Share',   badges: ['Global Brand', '24/7 Support'],           logo: '♟️', accent: '#a855f7', logoBg: '#1a0033' },
  { id: 'sportsbet', name: 'Sportsbet.io',  tag: 'NEW',         tagColor: '#ec4899', model: 'CPA up to €120',  badges: ['Sports Focused', 'Quick Payouts'],        logo: '⚽', accent: '#ec4899', logoBg: '#1a0011' },
];

const FEATURES = [
  { icon: '✦',  title: 'Premium Overlays',    desc: 'Professional & unique overlays for every stream style',              color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  { icon: '⊞',  title: 'Interactive Widgets', desc: 'Engage your audience with games, polls, leaderboards & more',        color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  { icon: '⚡', title: 'Automated Tools',      desc: 'Save time with automation and smart stream management',              color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)'  },
  { icon: '📊', title: 'Advanced Analytics',  desc: 'Track performance and maximize your earnings',                       color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  { icon: '🎧', title: 'Priority Support',     desc: 'Get help fast from our creator success team',                       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { icon: '🔄', title: 'Constant Updates',     desc: 'New features & partners added every week',                          color: '#ec4899', bg: 'rgba(236,72,153,0.12)'  },
];

const PRICING = [
  { id: 'starter', name: 'Starter',      price: '€15',  period: '/month',    priceAnnual: '€144', periodAnnual: '/year',  subPriceAnnual: '€12/month billed annually',  badge: null,           badgeType: null,      desc: 'Perfect for new streamers',    subPrice: null,            features: ['All Overlay Center access', 'Basic widgets & themes', 'Email support', 'Regular updates'],                        cta: 'Get Started', highlight: false },
  { id: 'creator', name: 'Creator',      price: '€60',  period: '/6 months', priceAnnual: '€96',  periodAnnual: '/year',  subPriceAnnual: '€8/month billed annually',   badge: 'MOST POPULAR', badgeType: 'popular', desc: 'For growing content creators', subPrice: '€10,00 /month', features: ['All Starter features', 'Advanced widgets', 'Priority support', 'Early access to new features'],               cta: 'Choose Plan', highlight: true  },
  { id: 'pro',     name: 'Professional', price: '€180', period: '/year',      priceAnnual: '€144', periodAnnual: '/year',  subPriceAnnual: '€12/month billed annually',  badge: 'BEST VALUE',   badgeType: 'value',   desc: 'For full-time streamers',      subPrice: '€15,00 /month', features: ['All Creator features', 'Exclusive partnerships', 'Custom branding', 'Dedicated account manager'],              cta: 'Choose Plan', highlight: false },
];

const FILTERS = ['All', 'Casino', 'Sports', 'Crypto', 'Poker', 'Trading'];

const TRUST_LOGOS = ['KICK', 'Twitch', 'YouTube', 'Stake', 'BC.GAME', 'Rollbit', 'Duelbits', 'Sportsbet.io'];

/* ─── Animated counter ─── */
function Counter({ end, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started.current) return;
      started.current = true;
      const t = Number(end), dur = 1800, t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        setCount(Math.floor((1 - Math.pow(1 - p, 3)) * t));
        if (p < 1) requestAnimationFrame(tick); else setCount(t);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── Hero dashboard mockup ─── */
function HeroGameMockup() {
  return (
    <div className="lp-hero-right">
      {/* Lightning bolts */}
      <div className="lp-lightning lp-lightning-1">⚡</div>
      <div className="lp-lightning lp-lightning-2">⚡</div>

      {/* Floating 3D icons */}
      <div className="lp-float-icon lp-float-rocket">🚀</div>
      <div className="lp-float-icon lp-float-trophy">🏆</div>
      <div className="lp-float-icon lp-float-heart">💜</div>

      {/* Dashboard tablet */}
      <div className="lp-dash-tablet">
        {/* Top bar */}
        <div className="lp-dash-topbar">
          <div className="lp-dash-brand">
            <span className="lp-dash-brand-icon">⬡</span>
            <span className="lp-dash-brand-name">Streamers Center</span>
          </div>
          <div className="lp-dash-topbar-right">
            <span className="lp-dash-icon-btn">📅</span>
            <span className="lp-dash-icon-btn">🔔</span>
            <span className="lp-dash-live">▶ LIVE</span>
          </div>
        </div>

        {/* Main area */}
        <div className="lp-dash-body">
          {/* Sidebar */}
          <div className="lp-dash-sidebar">
            {['Dashboard', 'Alerts', 'Chatbot', 'Goals', 'Giveaways', 'Loyalty', 'Analytics', 'Settings'].map((item, i) => (
              <div key={item} className={`lp-dash-sitem${i === 0 ? ' lp-dash-sitem--on' : ''}`}>{item}</div>
            ))}
          </div>

          {/* Content */}
          <div className="lp-dash-main">
            {/* Stat cards */}
            <div className="lp-dash-stats">
              <div className="lp-dash-stat">
                <div className="lp-dash-stat-lbl">Audience</div>
                <div className="lp-dash-stat-val">12.5K <span className="lp-dash-up">+28%</span></div>
                <div className="lp-dash-stat-sub">vs last week</div>
                <div className="lp-dash-spark lp-dash-spark--purple" />
              </div>
              <div className="lp-dash-stat">
                <div className="lp-dash-stat-lbl">Engagement</div>
                <div className="lp-dash-stat-val">8.9K <span className="lp-dash-up">+35%</span></div>
                <div className="lp-dash-stat-sub">vs last week</div>
                <div className="lp-dash-spark lp-dash-spark--bars" />
              </div>
              <div className="lp-dash-stat">
                <div className="lp-dash-stat-lbl">Revenue</div>
                <div className="lp-dash-stat-val">€4.7K <span className="lp-dash-up">+42%</span></div>
                <div className="lp-dash-stat-sub">vs last week</div>
                <div className="lp-dash-spark lp-dash-spark--pink" />
              </div>
            </div>

            {/* Bottom row */}
            <div className="lp-dash-bottom">
              <div className="lp-dash-goal">
                <div className="lp-dash-goal-lbl">Subscriber goal</div>
                <div className="lp-dash-goal-val">8,750 <span>/ 10,000</span></div>
                <div className="lp-dash-prog-track">
                  <div className="lp-dash-prog-bar" style={{ width: '87%' }} />
                </div>
                <div className="lp-dash-goal-pct">87%</div>
              </div>
              <div className="lp-dash-alerts">
                <div className="lp-dash-alerts-lbl">Recent alerts</div>
                {[
                  { icon: '💜', text: 'New follower',       time: '2m ago' },
                  { icon: '💰', text: 'Donation received',  time: '5m ago' },
                  { icon: '✅', text: 'New subscriber',     time: '7m ago' },
                ].map(a => (
                  <div key={a.text} className="lp-dash-alert-row">
                    <span>{a.icon}</span>
                    <span className="lp-dash-alert-text">{a.text}</span>
                    <span className="lp-dash-alert-time">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust strip */}
            <div className="lp-dash-trust">
              <span>⭐ Trusted by thousands of streamers</span>
              <div className="lp-dash-avatars">
                {['🧑', '👩', '🧔'].map((a, i) => <span key={i} className="lp-dash-av">{a}</span>)}
              </div>
              <span className="lp-dash-trust-count">+10k active streamers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ Main Page ══════════════ */
export default function LandingPage() {
  const [showAuthModal, setShowAuthModal]             = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [casinoOffers, setCasinoOffers]               = useState([]);
  const [pricingPlans, setPricingPlans]               = useState([]);
  const [activeFilter, setActiveFilter]               = useState('All');
  const [billingAnnual, setBillingAnnual]             = useState(true);
  const { user }                                      = useAuth();
  const navigate                                      = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('ageVerified')) setShowAgeVerification(true);
    supabase.from('casino_offers').select('*').eq('is_active', true).eq('show_on_landing', true)
      .order('landing_order', { ascending: true })
      .then(({ data }) => { if (data?.length) setCasinoOffers(data); });
    supabase.from('landing_pricing_plans').select('*').eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => { if (data?.length) setPricingPlans(data); });
  }, []);

  const handleOfferClick = (offer) => {
    if (!offer.bonus_link) return;
    trackOfferClick({ offerId: offer.id, casinoName: offer.casino_name, pageSource: 'landing' });
    window.open(offer.bonus_link, '_blank', 'noopener,noreferrer');
  };

  const partners = casinoOffers.length > 0
    ? casinoOffers.slice(0, 5).map((o, i) => ({ ...FEATURED_PARTNERS[i], ...o, _fp: FEATURED_PARTNERS[i] }))
    : FEATURED_PARTNERS;

  // Normalize DB pricing plans to match static schema
  const activePlans = pricingPlans.length > 0
    ? pricingPlans.map(p => ({
        id:             p.id,
        name:           p.name,
        price:          p.price,
        period:         p.period,
        subPrice:       p.sub_price,
        priceAnnual:    p.price_annual    || null,
        periodAnnual:   p.period_annual   || null,
        subPriceAnnual: p.sub_price_annual || null,
        badge:          p.badge,
        badgeType:      p.badge_type,
        desc:           p.description,
        features:       Array.isArray(p.features) ? p.features : [],
        cta:            p.cta || 'Get Started',
        highlight:      p.is_highlighted,
      }))
    : PRICING;

  return (
    <>
      {/* Age Gate */}
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

      <div className="lp-content">

          {/* ════ HERO ════ */}
          <section className="lp-hero">
            <div className="lp-hero-orb lp-hero-orb-1" />
            <div className="lp-hero-orb lp-hero-orb-2" />
            <div className="lp-hero-grid" />

            <div className="lp-hero-inner">
              {/* Left: copy */}
              <div className="lp-hero-copy">
                <div className="lp-badge">
                  <span className="lp-badge-dot" />
                  THE COMPLETE PLATFORM FOR STREAMERS
                </div>
                <h1 className="lp-h1">
                  Grow your stream<br />
                  <span className="lp-grad">&amp; earn more!</span>
                </h1>
                <p className="lp-hero-sub">
                  Powerful tools to grow your audience, engage your
                  community and increase your revenue.
                </p>
                <div className="lp-hero-ctas">
                  <button className="lp-btn-primary" onClick={() => user ? navigate('/overlay') : setShowAuthModal(true)}>
                    🚀 GET STARTED
                  </button>
                  <button className="lp-btn-outline-hero" onClick={() => navigate('/offers')}>
                    ▶ LEARN MORE
                  </button>
                </div>
                <div className="lp-hero-feats">
                  <div className="lp-hero-feat">
                    <span className="lp-hero-feat-icon">👥</span>
                    <div><div className="lp-hero-feat-title">More audience</div><div className="lp-hero-feat-sub">Grow your community</div></div>
                  </div>
                  <div className="lp-hero-feat">
                    <span className="lp-hero-feat-icon">📈</span>
                    <div><div className="lp-hero-feat-title">More engagement</div><div className="lp-hero-feat-sub">Interact and retain more</div></div>
                  </div>
                  <div className="lp-hero-feat">
                    <span className="lp-hero-feat-icon">💰</span>
                    <div><div className="lp-hero-feat-title">More earnings</div><div className="lp-hero-feat-sub">Monetize your content</div></div>
                  </div>
                </div>
              </div>

              {/* Right: dashboard mockup */}
              <HeroGameMockup />
            </div>
          </section>

          {/* ════ PRICING ════ */}
          <section className="lp-section">
            <h2 className="lp-section-h2">Choose Your Premium Plan</h2>

            <div className="lp-pricing-grid">
              {activePlans.map(plan => {
                const showAnnual = billingAnnual && plan.priceAnnual;
                const displayPrice    = showAnnual ? plan.priceAnnual    : plan.price;
                const displayPeriod   = showAnnual ? (plan.periodAnnual  || plan.period) : plan.period;
                const displaySubPrice = showAnnual ? plan.subPriceAnnual : plan.subPrice;
                return (
                  <div key={plan.id} className={`lp-price-card ${plan.highlight ? 'lp-price-card--hi' : ''}`}>
                    {plan.badge && (
                      <div className={`lp-price-badge lp-price-badge--${plan.badgeType}`}>{plan.badge}</div>
                    )}
                    <div className="lp-price-name">{plan.name}</div>
                    <div className="lp-price-desc">{plan.desc}</div>
                    <div className="lp-price-amount">
                      <span className="lp-price-num">{displayPrice}</span>
                      <span className="lp-price-period">{displayPeriod}</span>
                    </div>
                    {displaySubPrice && <div className="lp-price-sub">{displaySubPrice}</div>}
                    <ul className="lp-price-list">
                      {plan.features.map(f => (
                        <li key={f}><span className="lp-tick">✓</span>{f}</li>
                      ))}
                    </ul>
                    <button
                      className={plan.highlight ? 'lp-btn-primary lp-price-cta' : 'lp-btn-price-outline lp-price-cta'}
                      onClick={() => user ? navigate('/premium') : setShowAuthModal(true)}
                    >{plan.cta}</button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ════ FEATURED PARTNERS ════ */}
          <section className="lp-section">
            <div className="lp-section-top">
              <div>
                <h2 className="lp-section-h2">Featured Affiliate Partners</h2>
              </div>
              <button className="lp-view-all" onClick={() => navigate('/offers')}>View all partners →</button>
            </div>

            <div className="lp-partners-grid">
              {partners.map((p, i) => {
                const fp       = p._fp || FEATURED_PARTNERS[i] || FEATURED_PARTNERS[0];
                const name     = p.casino_name || fp.name;
                const tag      = p.landing_tag        || fp.tag;
                const tagColor = p.landing_tag_color  || fp.tagColor;
                const logoBg   = p.landing_logo_bg    || fp.logoBg;
                const accent   = p.landing_accent_color || fp.accent;
                const model    = p.landing_model      || fp.model;
                const badges   = (() => {
                  if (p.landing_badges) {
                    const b = Array.isArray(p.landing_badges) ? p.landing_badges : null;
                    if (b?.length) return b;
                  }
                  return fp.badges;
                })();
                return (
                  <div key={fp.id || i} className="lp-partner-card">
                    <div className="lp-ptag" style={{ background: `${tagColor}22`, color: tagColor, border: `1px solid ${tagColor}44` }}>
                      {tag}
                    </div>
                    <div className="lp-plogo" style={{ background: logoBg }}>
                      {p.list_image_url
                        ? <img src={p.list_image_url} alt={name} />
                        : <span style={{ fontSize: '1.6rem' }}>{fp.logo}</span>}
                    </div>
                    <div className="lp-pname">{name}</div>
                    <div className="lp-pmodel" style={{ color: accent }}>{model}</div>
                    <div className="lp-pchecks">
                      {badges.map(b => (
                        <div key={b} className="lp-pcheck">
                          <span className="lp-pcheck-tick" style={{ color: accent }}>✓</span>
                          {b}
                        </div>
                      ))}
                    </div>
                    <button className="lp-papply" onClick={() => p.bonus_link ? handleOfferClick(p) : navigate('/offers')}>
                      Apply Now
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ════ WHY CHOOSE ════ */}
          <section className="lp-section">
            <h2 className="lp-section-h2 lp-section-h2--center">Why Top Creators Choose Streamers Center</h2>
            <div className="lp-features-grid">
              {FEATURES.map(f => (
                <div key={f.title} className="lp-feat-card">
                  <div className="lp-feat-icon-wrap" style={{ background: f.bg, boxShadow: `0 0 20px ${f.color}30` }}>
                    <span style={{ color: f.color, fontSize: '1.5rem' }}>{f.icon}</span>
                  </div>
                  <div className="lp-feat-title">{f.title}</div>
                  <div className="lp-feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ════ FOOTER ════ */}
          <footer className="lp-footer">
            <div className="lp-footer-left">
              <span className="lp-footer-brand">Streamers Center</span>
              <span className="lp-footer-copy">© 2026 Streamers Center All rights reserved.</span>
            </div>
            <div className="lp-footer-links">
              <button className="lp-footer-link">Privacy</button>
              <button className="lp-footer-link">Terms</button>
            </div>
          </footer>

      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}
