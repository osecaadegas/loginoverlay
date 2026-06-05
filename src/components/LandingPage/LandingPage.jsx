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
  { id: 'starter', name: 'Starter',      price: '€15',  period: '/month',    badge: null,           badgeType: null,      desc: 'Perfect for new streamers',    subPrice: null,           features: ['All Overlay Center access', 'Basic widgets & themes', 'Email support', 'Regular updates'],                        cta: 'Get Started', highlight: false },
  { id: 'creator', name: 'Creator',      price: '€60',  period: '/6 months', badge: 'MOST POPULAR', badgeType: 'popular', desc: 'For growing content creators', subPrice: '€10,00 /month', features: ['All Starter features', 'Advanced widgets', 'Priority support', 'Early access to new features'],               cta: 'Choose Plan', highlight: true  },
  { id: 'pro',     name: 'Professional', price: '€120', period: '/year',      badge: 'BEST VALUE',   badgeType: 'value',   desc: 'For full-time streamers',      subPrice: '€10,00 /month', features: ['All Creator features', 'Exclusive partnerships', 'Custom branding', 'Dedicated account manager'],              cta: 'Choose Plan', highlight: false },
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

/* ─── Hero gaming mockup ─── */
function HeroGameMockup() {
  return (
    <div className="lp-game-mockup">
      {/* Glow effects */}
      <div className="lp-gm-glow lp-gm-glow-1" />
      <div className="lp-gm-glow lp-gm-glow-2" />

      {/* Browser chrome */}
      <div className="lp-gm-chrome">
        <div className="lp-gm-dots"><span style={{ background: '#ef4444' }} /><span style={{ background: '#f59e0b' }} /><span style={{ background: '#10b981' }} /></div>
        <span className="lp-gm-url">overlay.secaadegas.pt</span>
        <div className="lp-live-badge">● LIVE</div>
      </div>

      {/* Body */}
      <div className="lp-gm-body">
        {/* Left side - user info card */}
        <div className="lp-gm-user-card">
          <div className="lp-gm-avatar">🎮</div>
          <div>
            <div className="lp-gm-uname">Streamer</div>
            <div className="lp-gm-ulvl">Pro Creator</div>
          </div>
        </div>

        {/* Center slot machine */}
        <div className="lp-gm-center">
          <div className="lp-gm-slot-frame">
            <div className="lp-gm-slot-header">JACKPOT SLOTS</div>
            <div className="lp-gm-reels">
              {['7', '🍒', '7'].map((r, i) => (
                <div key={i} className="lp-gm-reel">
                  <span>{r}</span>
                </div>
              ))}
            </div>
            <div className="lp-gm-spin-glow" />
          </div>
          {/* Coins */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`lp-gm-coin lp-gm-coin-${i + 1}`}>💰</div>
          ))}
        </div>

        {/* Revenue card overlay */}
        <div className="lp-gm-revenue-card">
          <div className="lp-gm-rev-label">Monthly Revenue</div>
          <div className="lp-gm-rev-value">€ — —</div>
          <div className="lp-gm-rev-trend">↑ Growing</div>
          <div className="lp-gm-rev-chart">
            {[30, 50, 40, 70, 55, 80, 90].map((h, i) => (
              <div key={i} className="lp-gm-rev-bar" style={{ height: `${h}%` }} />
            ))}
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
  const [clicks, setClicks]                           = useState(1000);
  const [activeFilter, setActiveFilter]               = useState('All');
  const [billingAnnual, setBillingAnnual]             = useState(true);
  const { user }                                      = useAuth();
  const navigate                                      = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('ageVerified')) setShowAgeVerification(true);
    supabase.from('casino_offers').select('*').eq('is_active', true)
      .order('display_order', { ascending: true }).limit(5)
      .then(({ data }) => { if (data) setCasinoOffers(data); });
  }, []);

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

  const partners = casinoOffers.length > 0
    ? casinoOffers.slice(0, 5).map((o, i) => ({ ...FEATURED_PARTNERS[i], ...o, _fp: FEATURED_PARTNERS[i] }))
    : FEATURED_PARTNERS;

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

          {/* ════ HERO ════ */
          <section className="lp-hero">
            <div className="lp-hero-orb lp-hero-orb-1" />
            <div className="lp-hero-orb lp-hero-orb-2" />
            <div className="lp-hero-grid" />

            <div className="lp-hero-inner">
              {/* Left: copy */}
              <div className="lp-hero-copy">
                <div className="lp-badge">
                  <span className="lp-badge-dot" />
                  #1 OVERLAY &amp; PARTNERSHIP PLATFORM
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
                  </button>
                  <button className="lp-btn-outline-hero" onClick={() => user ? navigate('/overlay') : setShowAuthModal(true)}>
                    View Dashboard
                  </button>
                </div>
              </div>

              {/* Right: gaming image */}
              <HeroGameMockup />
            </div>
          </section>

          {/* ════ STATS + ACCOUNT ROW ════ */}
          <div className="lp-stats-row">
            <div className="lp-stats-grid">
              {[
                { icon: '👥', end: 1250,  suffix: '+',  prefix: '',  label: 'Active Streamers'             },
                { icon: '💶', end: 48000, suffix: '+',  prefix: '€', label: 'Affiliate Revenue Generated'  },
                { icon: '🤝', end: 15,    suffix: '+',  prefix: '',  label: 'Partner Brands'               },
                { icon: '🎧', end: 24,    suffix: '/7', prefix: '',  label: 'Premium Support'              },
              ].map(s => (
                <div key={s.label} className="lp-stat-item">
                  <div className="lp-stat-icon-wrap">{s.icon}</div>
                  <div>
                    <div className="lp-stat-num"><Counter end={s.end} suffix={s.suffix} prefix={s.prefix} /></div>
                    <div className="lp-stat-lbl">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Your Account card */}
            <div className="lp-acct-card">
              <div className="lp-acct-title">Your Account</div>
              <button
                className="lp-acct-premium-btn"
                onClick={() => user ? navigate('/overlay') : setShowAuthModal(true)}
              >
                <span className="lp-acct-crown">♛</span>
                {user ? 'Premium Active' : 'Upgrade to Premium'}
              </button>

              {user && (
                <>
                  <div className="lp-acct-divider" />
                  {[
                    { icon: '🤝', label: 'Affiliate Status',  val: '—', c: '#6366f1' },
                    { icon: '👥', label: 'Total Referrals',   val: '—', c: '#10b981' },
                    { icon: '💶', label: 'Estimated Revenue', val: '—', c: '#f59e0b', bold: true },
                  ].map(r => (
                    <div key={r.label} className="lp-acct-row">
                      <div className="lp-acct-row-icon" style={{ color: r.c }}>{r.icon}</div>
                      <div className="lp-acct-row-body">
                        <span className="lp-acct-row-lbl">{r.label}</span>
                        <span className="lp-acct-row-val" style={r.bold ? { color: r.c } : {}}>{r.val}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              <button className="lp-acct-dash-btn" onClick={() => user ? navigate('/overlay') : setShowAuthModal(true)}>
                {user ? 'Go to Dashboard' : 'Sign In with Twitch'}
              </button>
            </div>
          </div>

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
                const fp   = p._fp || FEATURED_PARTNERS[i] || FEATURED_PARTNERS[0];
                const name = p.casino_name || fp.name;
                return (
                  <div key={fp.id} className="lp-partner-card">
                    <div className="lp-ptag" style={{ background: `${fp.tagColor}22`, color: fp.tagColor, border: `1px solid ${fp.tagColor}44` }}>
                      {fp.tag}
                    </div>
                    <div className="lp-plogo" style={{ background: fp.logoBg }}>
                      {p.list_image_url
                        ? <img src={p.list_image_url} alt={name} />
                        : <span style={{ fontSize: '1.6rem' }}>{fp.logo}</span>}
                    </div>
                    <div className="lp-pname">{name}</div>
                    <div className="lp-pmodel" style={{ color: fp.accent }}>{fp.model}</div>
                    <div className="lp-pchecks">
                      {fp.badges.map(b => (
                        <div key={b} className="lp-pcheck">
                          <span className="lp-pcheck-tick" style={{ color: fp.accent }}>✓</span>
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
            <h2 className="lp-section-h2 lp-section-h2--center">Why Top Creators Choose SecaAdegas</h2>
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

          {/* ════ CALC + MARKETPLACE ════ */}
          <section className="lp-section lp-two-col-wrap">

            {/* Earnings calculator */}
            <div className="lp-calc">
              <h3 className="lp-calc-h3">Earnings Calculator</h3>
              <p className="lp-calc-sub">See how much you can earn with our top partnerships</p>
              <div className="lp-slider-header">
                <span>Monthly Clicks</span>
                <strong>{clicks.toLocaleString()}</strong>
              </div>
              <input
                type="range" min="100" max="10000" step="100"
                value={clicks}
                onChange={e => setClicks(Number(e.target.value))}
                className="lp-slider"
                style={{ '--pct': `${((clicks - 100) / 9900) * 100}%` }}
              />
              <div className="lp-calc-result-header">Estimated Revenue</div>
              <div className="lp-calc-cards">
                {[
                  { label: 'CPA',       val: earnings.cpa,      c: '#6366f1' },
                  { label: 'Rev Share', val: earnings.revShare,  c: '#10b981' },
                  { label: 'Hybrid',    val: earnings.hybrid,    c: '#f59e0b' },
                ].map(r => (
                  <div key={r.label} className="lp-calc-card">
                    <div className="lp-calc-card-lbl">{r.label}</div>
                    <div className="lp-calc-card-val" style={{ color: r.c }}>€{r.val.toLocaleString()}</div>
                    <div className="lp-calc-card-sub">Estimated</div>
                  </div>
                ))}
              </div>
              <p className="lp-calc-note">*Estimates based on average conversion rates</p>
            </div>

            {/* Marketplace */}
            <div className="lp-market">
              <div className="lp-market-header">
                <h3 className="lp-market-title">New Partnership Opportunities</h3>
                <button className="lp-view-all" onClick={() => navigate('/offers')}>View all offers →</button>
              </div>
              {casinoOffers.length > 0 && (
                <div className="lp-market-grid">
                  {casinoOffers.slice(0, 3).map((o, i) => {
                    const fp = FEATURED_PARTNERS[i] || FEATURED_PARTNERS[0];
                    return (
                      <div key={o.id || i} className="lp-market-card">
                        <div className="lp-market-img" style={{ background: fp.logoBg }}>
                          {o.list_image_url
                            ? <img src={o.list_image_url} alt={o.casino_name} style={{ maxHeight: '52px', maxWidth: '80%', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '2.2rem' }}>{fp.logo}</span>}
                          <div className="lp-market-new-badge">NEW</div>
                        </div>
                        <div className="lp-market-info">
                          <div className="lp-market-name">{o.casino_name}</div>
                          <div className="lp-market-model" style={{ color: fp.accent }}>{fp.model}</div>
                          <button className="lp-market-apply" style={{ borderColor: fp.accent, color: fp.accent }} onClick={() => o.bonus_link ? handleOfferClick(o) : navigate('/offers')}>Apply Now</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ════ PRICING ════ */}
          <section className="lp-section">
            <h2 className="lp-section-h2">Choose Your Premium Plan</h2>

            <div className="lp-billing-row">
              <span className={!billingAnnual ? 'lp-bill-active' : ''}>Monthly</span>
              <button className={`lp-toggle ${billingAnnual ? 'lp-toggle--on' : ''}`} onClick={() => setBillingAnnual(b => !b)}>
                <div className="lp-toggle-knob" />
              </button>
              <span className={billingAnnual ? 'lp-bill-active' : ''}>
                Annual <span className="lp-save-badge">Save up to 20%</span>
              </span>
            </div>

            <div className="lp-pricing-grid">
              {PRICING.map(plan => (
                <div key={plan.id} className={`lp-price-card ${plan.highlight ? 'lp-price-card--hi' : ''}`}>
                  {plan.badge && (
                    <div className={`lp-price-badge lp-price-badge--${plan.badgeType}`}>{plan.badge}</div>
                  )}
                  <div className="lp-price-name">{plan.name}</div>
                  <div className="lp-price-desc">{plan.desc}</div>
                  <div className="lp-price-amount">
                    <span className="lp-price-num">{plan.price}</span>
                    <span className="lp-price-period">{plan.period}</span>
                  </div>
                  {plan.subPrice && <div className="lp-price-sub">{plan.subPrice}</div>}
                  <ul className="lp-price-list">
                    {plan.features.map(f => (
                      <li key={f}><span className="lp-tick">✓</span>{f}</li>
                    ))}
                  </ul>
                  <button
                    className={plan.highlight ? 'lp-btn-primary lp-price-cta' : 'lp-btn-price-outline lp-price-cta'}
                    onClick={() => user ? navigate('/overlay') : setShowAuthModal(true)}
                  >{plan.cta}</button>
                </div>
              ))}
            </div>
          </section>

          {/* ════ TRUST BAR ════ */}
          <section className="lp-trust">
            <p className="lp-trust-lbl">Trusted by streamers worldwide</p>
            <div className="lp-trust-logos">
              {TRUST_LOGOS.map(n => <div key={n} className="lp-trust-logo">{n}</div>)}
            </div>
          </section>

          {/* ════ FOOTER ════ */}
          <footer className="lp-footer">
            <div className="lp-footer-left">
              <span className="lp-footer-brand">SecaAdegas</span>
              <span className="lp-footer-copy">© 2026 SecaAdegas All rights reserved.</span>
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
