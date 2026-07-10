import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronsRight,
  CircleDollarSign,
  Clapperboard,
  Database,
  Gauge,
  Gift,
  LayoutDashboard,
  LibraryBig,
  LineChart,
  LogIn,
  MonitorPlay,
  Play,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import { usePremium } from '../../hooks/usePremium';
import { trackEvent } from '../../utils/analytics';
import trackOfferClick from '../../utils/trackOfferClick';
import AuthModal from '../Auth/AuthModal';
import './LandingPage.css';

const FEATURED_PARTNERS = [
  { id: 'bcgame', name: 'BC.GAME', tag: 'TOP PARTNER', tagColor: '#38bdf8', model: '40% Rev Share', badges: ['CPA Available', 'Weekly Payments'], logo: 'BC', accent: '#38bdf8', logoBg: '#082f49' },
  { id: 'rollbit', name: 'ROLLBIT', tag: 'POPULAR', tagColor: '#34d399', model: 'Stream Friendly', badges: ['Fast Approval', 'Exclusive Bonuses'], logo: 'RB', accent: '#34d399', logoBg: '#06351f' },
  { id: 'duelbits', name: 'Duelbits', tag: 'POPULAR', tagColor: '#fbbf24', model: 'Revenue Share', badges: ['Dedicated Manager', 'High Converting'], logo: 'DB', accent: '#fbbf24', logoBg: '#3a2505' },
  { id: 'stake', name: 'Stake', tag: 'NEW', tagColor: '#a78bfa', model: '35% Rev Share', badges: ['Global Brand', '24/7 Support'], logo: 'ST', accent: '#a78bfa', logoBg: '#24114a' },
  { id: 'sportsbet', name: 'Sportsbet.io', tag: 'NEW', tagColor: '#fb7185', model: 'CPA up to EUR 120', badges: ['Sports Focused', 'Quick Payouts'], logo: 'SB', accent: '#fb7185', logoBg: '#3b1118' },
];

const STREAMER_FEATURES = [
  { icon: MonitorPlay, title: 'Browser-source overlays', desc: 'Professional overlay scenes, bonus hunt widgets and live stream panels ready for OBS.' },
  { icon: Gift, title: 'Viewer engagement', desc: 'Slot requests, giveaways, tournaments, predictions, bets and chat-driven community moments.' },
  { icon: Radio, title: 'Live integrations', desc: 'Tools designed around Twitch, Kick, YouTube and chat workflows where available.' },
  { icon: LayoutDashboard, title: 'Control center', desc: 'Manage widgets, themes, requests, assets and stream utilities from one dashboard.' },
  { icon: BarChart3, title: 'Stream analytics', desc: 'Track traffic, offers and stream performance with admin-friendly analytics.' },
  { icon: Sparkles, title: 'Custom themes', desc: 'Build branded stream surfaces without rebuilding your overlay stack each time.' },
];

const PLAYER_FEATURES = [
  { icon: WalletCards, title: 'Session accounting', desc: 'Track starting deposits, extra deposits, withdrawals, spent amount and final result.' },
  { icon: Trophy, title: 'Bonus hunt results', desc: 'Follow break-even targets, total payout, best win, worst win and highest multiplier.' },
  { icon: LibraryBig, title: 'Personal library', desc: 'Search all-time, monthly, weekly and daily records by slot, provider and result.' },
  { icon: Search, title: 'Slot metadata', desc: 'Use your slot library for images, providers, RTP, volatility and max-win context.' },
  { icon: LineChart, title: 'Simple statistics', desc: 'Readable averages, profit/loss summaries and historical hunt performance.' },
  { icon: ShieldCheck, title: 'Private by design', desc: 'A player product with no OBS links, chat controls or streamer-only setup.' },
];

const STREAMER_PRICING = [
  { id: 'starter', name: 'Starter', price: 'EUR 15', period: '/month', priceAnnual: 'EUR 144', periodAnnual: '/year', subPriceAnnual: 'EUR 12/month billed annually', badge: null, badgeType: null, desc: 'Perfect for new streamers', subPrice: null, features: ['Overlay Center access', 'Core widgets and themes', 'Email support', 'Regular updates'], cta: 'Get Started', highlight: false },
  { id: 'creator', name: 'Creator', price: 'EUR 60', period: '/6 months', priceAnnual: 'EUR 96', periodAnnual: '/year', subPriceAnnual: 'EUR 8/month billed annually', badge: 'MOST POPULAR', badgeType: 'popular', desc: 'For growing content creators', subPrice: 'EUR 10/month', features: ['Everything in Starter', 'Advanced widgets', 'Priority support', 'Early access to new features'], cta: 'Choose Plan', highlight: true },
  { id: 'pro', name: 'Professional', price: 'EUR 180', period: '/year', priceAnnual: 'EUR 144', periodAnnual: '/year', subPriceAnnual: 'EUR 12/month billed annually', badge: 'BEST VALUE', badgeType: 'value', desc: 'For full-time streamers', subPrice: 'EUR 15/month', features: ['Everything in Creator', 'Exclusive partnerships', 'Custom branding', 'Dedicated account manager'], cta: 'Choose Plan', highlight: false },
];

const PLAYER_STATS = [
  { label: 'Starting deposit', value: 'EUR 500' },
  { label: 'Withdrawals', value: 'EUR 120' },
  { label: 'Break even', value: 'EUR 380' },
  { label: 'Current result', value: '+EUR 86', tone: 'positive' },
  { label: 'Best win', value: 'EUR 240', tone: 'positive' },
  { label: 'Highest multi', value: '1,200x', tone: 'positive' },
];

const AUDIENCE_STORAGE_KEY = 'streamerscenter:selectedAudience';
const SELECTION_DELAY_MS = 840;
const STREAMER_PATH_DELAY_MS = 760;

function rememberAudience(user, audience) {
  localStorage.setItem(AUDIENCE_STORAGE_KEY, audience);

  if (!user) return;

  supabase.auth.updateUser({
    data: { selected_experience: audience },
  })
    .then(({ error }) => {
      if (error) console.warn('[LandingPage] Failed to persist audience preference:', error);
    })
    .catch((error) => {
      console.warn('[LandingPage] Failed to persist audience preference:', error);
    });
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

function BrandMark() {
  return (
    <Link to="/" className="lp-brand" aria-label="Streamers Center home">
      <span className="lp-brand__mark">
        <img src="/newlogo.png" alt="" />
      </span>
      <span className="lp-brand__text">
        <strong>Streamers</strong>
        <span>Center</span>
      </span>
    </Link>
  );
}

function AudienceSwitcher({ activeAudience, onSwitch, onReset }) {
  return (
    <div className="lp-audience-switcher" aria-label="Audience switcher">
      <button
        type="button"
        className={activeAudience === 'player' ? 'is-active' : ''}
        aria-current={activeAudience === 'player' ? 'page' : undefined}
        onClick={() => onSwitch('player')}
      >
        Player
      </button>
      <button
        type="button"
        className={activeAudience === 'streamer' ? 'is-active' : ''}
        aria-current={activeAudience === 'streamer' ? 'page' : undefined}
        onClick={() => onSwitch('streamer')}
      >
        Streamer
      </button>
      <button type="button" className="lp-audience-switcher__reset" onClick={onReset}>
        Selector
      </button>
    </div>
  );
}

function LandingNav({ activeAudience, user, onLogin, onSwitch, onReset }) {
  return (
    <header className="lp-site-nav">
      <BrandMark />
      <nav className="lp-site-nav__links" aria-label="Main navigation">
        {activeAudience ? (
          <AudienceSwitcher activeAudience={activeAudience} onSwitch={onSwitch} onReset={onReset} />
        ) : (
          <span className="lp-site-nav__tagline">Tools for players and streamers</span>
        )}
        {user ? (
          <Link className="lp-nav-btn lp-nav-btn--ghost" to="/profile">
            <UserRound size={16} /> Account
          </Link>
        ) : (
          <button type="button" className="lp-nav-btn lp-nav-btn--ghost" onClick={onLogin}>
            <LogIn size={16} /> Login
          </button>
        )}
      </nav>
    </header>
  );
}

function PlayerPreview({ expanded = false }) {
  return (
    <div className={`lp-preview lp-preview--player${expanded ? ' lp-preview--expanded' : ''}`} aria-hidden="true">
      <div className="lp-player-preview__summary">
        <div>
          <span>Break-even progress</span>
          <strong>86%</strong>
        </div>
        <div className="lp-preview-progress">
          <span style={{ width: '86%' }} />
        </div>
      </div>
      <div className="lp-player-preview__grid">
        {PLAYER_STATS.map((stat) => (
          <div key={stat.label} className={`lp-mini-stat ${stat.tone ? `lp-mini-stat--${stat.tone}` : ''}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
      <div className="lp-preview-table">
        {[
          ['Gates of Olympus', 'Pragmatic Play', '+EUR 180', '900x'],
          ['2 Wild 2 Die', 'Hacksaw', '-EUR 22', '0x'],
          ['Power of Merlin', 'Pragmatic Play', '+EUR 240', '1,200x'],
        ].map(([slot, provider, result, multi]) => (
          <div key={slot} className="lp-preview-row">
            <span>
              <strong>{slot}</strong>
              <em>{provider}</em>
            </span>
            <b className={result.startsWith('+') ? 'is-positive' : 'is-negative'}>{result}</b>
            <small>{multi}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreamerPreview({ expanded = false }) {
  return (
    <div className={`lp-preview lp-preview--streamer${expanded ? ' lp-preview--expanded' : ''}`} aria-hidden="true">
      <div className="lp-streamer-preview__stage">
        <div className="lp-streamer-preview__live">
          <span />
          LIVE CONTROL
        </div>
        <div className="lp-overlay-card lp-overlay-card--hunt">
          <small>Bonus Hunt</small>
          <strong>24 / 42 opened</strong>
          <div className="lp-preview-progress"><span style={{ width: '57%' }} /></div>
        </div>
        <div className="lp-overlay-card lp-overlay-card--request">
          <small>Slot Request</small>
          <strong>Book of Shadows</strong>
          <em>Queued by chat</em>
        </div>
        <div className="lp-overlay-card lp-overlay-card--tournament">
          <small>Tournament</small>
          <strong>Round 3</strong>
          <div className="lp-bracket-lines" />
        </div>
      </div>
      <div className="lp-streamer-preview__dock">
        {['OBS', 'Bonus Hunt', 'Requests', 'Giveaways'].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function AudiencePanel({ audience, previewed, dimmed, selecting, locked, onPreview, onClearPreview, onSelect }) {
  const isPlayer = audience === 'player';
  const label = isPlayer ? 'PLAYER' : 'STREAMER';
  const title = isPlayer
    ? 'Track every session. Understand every result.'
    : 'Build a stream your audience remembers.';
  const description = isPlayer
    ? 'Manage bonus hunts, deposits, withdrawals, break-even targets, wins, multipliers and personal records from one simple dashboard.'
    : 'Professional overlays, bonus hunts, slot requests, tournaments, giveaways, viewer games and live-streaming tools in one platform.';
  const cta = isPlayer ? 'Enter Player Center' : 'Enter Streamer Center';
  const Preview = isPlayer ? PlayerPreview : StreamerPreview;

  return (
    <button
      type="button"
      className={[
        'lp-audience-panel',
        `lp-audience-panel--${audience}`,
        previewed ? 'is-previewed' : '',
        dimmed ? 'is-dimmed' : '',
        selecting ? 'is-selecting' : '',
      ].filter(Boolean).join(' ')}
      onMouseEnter={() => !locked && onPreview(audience)}
      onMouseLeave={() => !locked && onClearPreview()}
      onFocus={() => !locked && onPreview(audience)}
      onBlur={() => !locked && onClearPreview()}
      onClick={() => onSelect(audience)}
      aria-label={cta}
      disabled={locked && !selecting}
    >
      <span className="lp-audience-panel__shade" />
      <span className="lp-audience-panel__content">
        <span className="lp-eyebrow">{label}</span>
        <span className="lp-audience-panel__title">{title}</span>
        <span className="lp-audience-panel__desc">{description}</span>
        <span className="lp-panel-cta">
          {cta}
          <ArrowRight size={18} />
        </span>
        <span className="lp-panel-explore">
          Explore <ChevronsRight size={16} />
        </span>
      </span>
      <span className="lp-audience-panel__preview">
        <Preview expanded={selecting} />
      </span>
    </button>
  );
}

function AudienceGateway({ previewAudience, selectingAudience, onPreview, onClearPreview, onSelect }) {
  const locked = !!selectingAudience;

  return (
    <section
      className={[
        'lp-gateway',
        selectingAudience ? `lp-gateway--selecting-${selectingAudience}` : '',
      ].filter(Boolean).join(' ')}
      aria-labelledby="audience-selector-heading"
    >
      <h1 id="audience-selector-heading" className="lp-sr-only">
        Choose Streamers Center for players or streamers
      </h1>
      <AudiencePanel
        audience="player"
        previewed={previewAudience === 'player'}
        dimmed={previewAudience === 'streamer'}
        selecting={selectingAudience === 'player'}
        locked={locked}
        onPreview={onPreview}
        onClearPreview={onClearPreview}
        onSelect={onSelect}
      />
      <div className="lp-audience-divider" aria-hidden="true">
        <span />
      </div>
      <AudiencePanel
        audience="streamer"
        previewed={previewAudience === 'streamer'}
        dimmed={previewAudience === 'player'}
        selecting={selectingAudience === 'streamer'}
        locked={locked}
        onPreview={onPreview}
        onClearPreview={onClearPreview}
        onSelect={onSelect}
      />
    </section>
  );
}

function DealsPreview() {
  return (
    <div className="lp-preview lp-preview--deals" aria-hidden="true">
      <div className="lp-deals-preview__header">
        <span>Partner opportunities</span>
        <strong>5 live offers</strong>
      </div>
      {FEATURED_PARTNERS.slice(0, 3).map((partner) => (
        <div key={partner.id} className="lp-deals-preview__row">
          <span style={{ background: partner.logoBg }}>{partner.logo}</span>
          <div>
            <strong>{partner.name}</strong>
            <em>{partner.model}</em>
          </div>
          <small style={{ color: partner.accent }}>{partner.tag}</small>
        </div>
      ))}
    </div>
  );
}

function StreamerPathPanel({ path, previewed, dimmed, selecting, locked, onPreview, onClearPreview, onSelect }) {
  const isDeals = path === 'deals';
  const label = isDeals ? 'DEALS' : 'OVERLAYS';
  const title = isDeals ? 'Find deals for your stream' : 'Build your stream experience';
  const description = isDeals
    ? 'Explore casino partnerships, streamer offers and available collaboration opportunities.'
    : 'Manage overlays, bonus hunts, slot requests, tournaments, giveaways and viewer interactions.';
  const cta = isDeals ? 'Explore Deals' : 'Open Overlay Center';
  const Preview = isDeals ? DealsPreview : StreamerPreview;

  return (
    <button
      type="button"
      className={[
        'lp-audience-panel',
        'lp-streamer-path-panel',
        `lp-streamer-path-panel--${path}`,
        previewed ? 'is-previewed' : '',
        dimmed ? 'is-dimmed' : '',
        selecting ? 'is-selecting' : '',
      ].filter(Boolean).join(' ')}
      onMouseEnter={() => !locked && onPreview(path)}
      onMouseLeave={() => !locked && onClearPreview()}
      onFocus={() => !locked && onPreview(path)}
      onBlur={() => !locked && onClearPreview()}
      onClick={() => onSelect(path)}
      aria-label={cta}
      disabled={locked && !selecting}
    >
      <span className="lp-audience-panel__shade" />
      <span className="lp-audience-panel__content">
        <span className="lp-eyebrow">{label}</span>
        <span className="lp-audience-panel__title">{title}</span>
        <span className="lp-audience-panel__desc">{description}</span>
        <span className="lp-panel-cta lp-panel-cta--streamer-path">
          {cta}
          <ArrowRight size={18} />
        </span>
        <span className="lp-panel-explore">
          Select <ChevronsRight size={16} />
        </span>
      </span>
      <span className="lp-audience-panel__preview">
        <Preview expanded={selecting} />
      </span>
    </button>
  );
}

function StreamerPathGateway({ previewPath, selectingPath, onPreview, onClearPreview, onSelect }) {
  const locked = !!selectingPath;

  return (
    <section
      className={[
        'lp-gateway',
        'lp-streamer-path-gateway',
        selectingPath ? `lp-streamer-path-gateway--selecting-${selectingPath}` : '',
      ].filter(Boolean).join(' ')}
      aria-labelledby="streamer-path-heading"
    >
      <h1 id="streamer-path-heading" className="lp-sr-only">
        Choose Streamers Center streamer deals or overlays
      </h1>
      <StreamerPathPanel
        path="deals"
        previewed={previewPath === 'deals'}
        dimmed={previewPath === 'overlays'}
        selecting={selectingPath === 'deals'}
        locked={locked}
        onPreview={onPreview}
        onClearPreview={onClearPreview}
        onSelect={onSelect}
      />
      <div className="lp-audience-divider" aria-hidden="true">
        <span />
      </div>
      <StreamerPathPanel
        path="overlays"
        previewed={previewPath === 'overlays'}
        dimmed={previewPath === 'deals'}
        selecting={selectingPath === 'overlays'}
        locked={locked}
        onPreview={onPreview}
        onClearPreview={onClearPreview}
        onSelect={onSelect}
      />
    </section>
  );
}

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="lp-section-heading">
      <span className="lp-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

function ProductFeatureGrid({ features }) {
  return (
    <div className="lp-feature-grid">
      {features.map(({ icon: Icon, title, desc }) => (
        <article className="lp-feature-card" key={title}>
          <span className="lp-feature-card__icon"><Icon size={22} /></span>
          <h3>{title}</h3>
          <p>{desc}</p>
        </article>
      ))}
    </div>
  );
}

function PlayerLanding({ headingRef, onPrimaryCta, user }) {
  return (
    <main className="lp-selected lp-selected--player">
      <section className="lp-selected-hero">
        <div className="lp-selected-hero__copy">
          <span className="lp-eyebrow">Player Center</span>
          <h1 ref={headingRef} tabIndex="-1">
            Personal bonus hunts without the streamer setup.
          </h1>
          <p>
            Track deposits, withdrawals, bonus costs, payouts, multipliers, break-even targets,
            best wins and worst results in a private dashboard made for regular casino players.
          </p>
          <div className="lp-selected-hero__ctas">
            <button type="button" className="lp-btn lp-btn--player" onClick={onPrimaryCta}>
              Start 30-Day Free Trial <ArrowRight size={18} />
            </button>
            {user && (
              <Link className="lp-btn lp-btn--ghost" to="/player/bonus-hunt">
                Open Bonus Hunt <LayoutDashboard size={18} />
              </Link>
            )}
          </div>
          <p className="lp-responsible-note">
            First 30 days free, then EUR 3 per month after payment authorization. Track your play responsibly;
            Streamers Center records results and never implies guaranteed winnings.
          </p>
        </div>
        <div className="lp-selected-hero__preview">
          <PlayerPreview expanded />
        </div>
      </section>

      <section className="lp-section">
        <SectionHeading eyebrow="Session clarity" title="Everything a player needs, no OBS required.">
          Follow each hunt from setup to opening with consistent accounting and readable results.
        </SectionHeading>
        <ProductFeatureGrid features={PLAYER_FEATURES} />
      </section>

      <section className="lp-section lp-player-insight">
        <div>
          <SectionHeading eyebrow="Personal records" title="Your best all-time results stay easy to find.">
            Use daily, weekly, monthly and all-time filters to compare sessions, slots, providers,
            payouts and multipliers without mixing currencies or streamer data.
          </SectionHeading>
          <div className="lp-filter-pills" aria-hidden="true">
            {['All time', 'Year', 'Month', 'Week', 'Day'].map((filter) => <span key={filter}>{filter}</span>)}
          </div>
        </div>
        <div className="lp-record-stack" aria-hidden="true">
          {[
            ['Best win', 'Power of Merlin', '+EUR 500', 'positive'],
            ['Worst win', '2 Wild 2 Die', 'EUR 0', 'negative'],
            ['Best multiplier', 'Gates of Olympus', '2,500x', 'positive'],
          ].map(([label, slot, value, tone]) => (
            <div key={label} className={`lp-record-card lp-record-card--${tone}`}>
              <span>{label}</span>
              <strong>{value}</strong>
              <em>{slot}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-player-plan">
        <div>
          <span className="lp-eyebrow">Player plan</span>
          <h2>Try the full player dashboard for 30 days.</h2>
          <p>
            After the free trial, the Player plan renews monthly at EUR 3 only after you authorize
            recurring billing through the secure payment flow.
          </p>
        </div>
        <button type="button" className="lp-btn lp-btn--player" onClick={onPrimaryCta}>
          Start 30-Day Free Trial <ArrowRight size={18} />
        </button>
      </section>
    </main>
  );
}

function normalizePricingPlans(pricingPlans) {
  if (!pricingPlans.length) return STREAMER_PRICING;
  return pricingPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    period: plan.period,
    subPrice: plan.sub_price,
    priceAnnual: plan.price_annual || null,
    periodAnnual: plan.period_annual || null,
    subPriceAnnual: plan.sub_price_annual || null,
    badge: plan.badge,
    badgeType: plan.badge_type,
    desc: plan.description,
    features: Array.isArray(plan.features) ? plan.features : [],
    cta: plan.cta || 'Get Started',
    highlight: plan.is_highlighted,
  }));
}

function PartnerCard({ partner, fallback, onClick }) {
  const name = partner.casino_name || fallback.name;
  const tag = partner.landing_tag || fallback.tag;
  const tagColor = partner.landing_tag_color || fallback.tagColor;
  const logoBg = partner.landing_logo_bg || fallback.logoBg;
  const accent = partner.landing_accent_color || fallback.accent;
  const model = partner.landing_model || fallback.model;
  const badges = Array.isArray(partner.landing_badges) && partner.landing_badges.length
    ? partner.landing_badges
    : fallback.badges;

  return (
    <article className="lp-partner-card">
      <span className="lp-partner-card__tag" style={{ '--tag-color': tagColor }}>{tag}</span>
      <div className="lp-partner-card__logo" style={{ background: logoBg }}>
        {partner.list_image_url ? <img src={partner.list_image_url} alt={name} /> : <span>{fallback.logo}</span>}
      </div>
      <h3>{name}</h3>
      <strong style={{ color: accent }}>{model}</strong>
      <ul>
        {badges.map((badge) => <li key={badge}>{badge}</li>)}
      </ul>
      <button type="button" onClick={() => onClick(partner)}>
        View offer
      </button>
    </article>
  );
}

function StreamerLanding({ headingRef, pricingPlans, partners, onStreamerCta, onOfferClick }) {
  const activePlans = normalizePricingPlans(pricingPlans);

  return (
    <main className="lp-selected lp-selected--streamer">
      <section className="lp-selected-hero">
        <div className="lp-selected-hero__copy">
          <span className="lp-eyebrow">Streamer Center</span>
          <h1 ref={headingRef} tabIndex="-1">
            Build a stream your audience remembers.
          </h1>
          <p>
            Professional browser-source overlays, bonus hunt trackers, slot requests, tournaments,
            giveaways, viewer games and chat-connected tools in one production dashboard.
          </p>
          <div className="lp-selected-hero__ctas">
            <button type="button" className="lp-btn lp-btn--streamer" onClick={onStreamerCta}>
              Build My Stream <ArrowRight size={18} />
            </button>
            <Link className="lp-btn lp-btn--ghost" to="/offers">
              View partners <Sparkles size={18} />
            </Link>
          </div>
        </div>
        <div className="lp-selected-hero__preview">
          <StreamerPreview expanded />
        </div>
      </section>

      <section className="lp-section">
        <SectionHeading eyebrow="Creator toolkit" title="Everything for a more interactive stream.">
          Keep OBS overlays, chat interactions, bonus hunts, viewer commands and stream tools under one roof.
        </SectionHeading>
        <ProductFeatureGrid features={STREAMER_FEATURES} />
      </section>

      <section className="lp-section lp-streamer-showcase">
        <div className="lp-showcase-card lp-showcase-card--wide">
          <MonitorPlay size={24} />
          <h3>Overlay Center</h3>
          <p>Build browser-source scenes, custom themes, bonus hunt widgets and branded live panels.</p>
        </div>
        <div className="lp-showcase-card">
          <Swords size={24} />
          <h3>Tournaments</h3>
          <p>Create competitive stream moments without leaving the control center.</p>
        </div>
        <div className="lp-showcase-card">
          <Users size={24} />
          <h3>Slot requests</h3>
          <p>Let viewers request slots and keep the queue organized during stream.</p>
        </div>
        <div className="lp-showcase-card">
          <Clapperboard size={24} />
          <h3>OBS ready</h3>
          <p>Use browser-source overlays that are designed for live production workflows.</p>
        </div>
      </section>

      <section className="lp-section">
        <SectionHeading eyebrow="Premium" title="Choose your streamer plan.">
          Premium access unlocks Overlay Center and the streamer-focused tools.
        </SectionHeading>
        <div className="lp-pricing-grid">
          {activePlans.map((plan) => {
            const displayPrice = plan.priceAnnual || plan.price;
            const displayPeriod = plan.periodAnnual || plan.period;
            const displaySubPrice = plan.subPriceAnnual || plan.subPrice;
            return (
              <article key={plan.id} className={`lp-price-card${plan.highlight ? ' lp-price-card--highlight' : ''}`}>
                {plan.badge && <span className={`lp-price-card__badge lp-price-card__badge--${plan.badgeType}`}>{plan.badge}</span>}
                <h3>{plan.name}</h3>
                <p>{plan.desc}</p>
                <div className="lp-price-card__amount">
                  <strong>{displayPrice}</strong>
                  <span>{displayPeriod}</span>
                </div>
                {displaySubPrice && <em>{displaySubPrice}</em>}
                <ul>
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <button type="button" onClick={onStreamerCta}>{plan.cta}</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="lp-section">
        <SectionHeading eyebrow="Partners" title="Featured affiliate partners.">
          Keep the existing partner content visible while the streamer entrance gets a sharper first impression.
        </SectionHeading>
        <div className="lp-partners-grid">
          {partners.map((partner, index) => {
            const fallback = FEATURED_PARTNERS[index] || FEATURED_PARTNERS[0];
            return <PartnerCard key={partner.id || fallback.id} partner={partner} fallback={fallback} onClick={onOfferClick} />;
          })}
        </div>
      </section>
    </main>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <span>Streamers Center</span>
      <nav aria-label="Footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
    </footer>
  );
}

export default function LandingPage({ mode = 'selector' }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [casinoOffers, setCasinoOffers] = useState([]);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [previewAudience, setPreviewAudience] = useState(null);
  const [selectingAudience, setSelectingAudience] = useState(null);
  const [previewStreamerPath, setPreviewStreamerPath] = useState(null);
  const [selectingStreamerPath, setSelectingStreamerPath] = useState(null);
  const [switchingAudience, setSwitchingAudience] = useState(null);
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const headingRef = useRef(null);
  const previewTrackedRef = useRef(null);
  const activeAudience = mode === 'player' || mode === 'streamer' ? mode : null;

  useEffect(() => {
    if (!localStorage.getItem('ageVerified')) setShowAgeVerification(true);

    supabase
      .from('casino_offers')
      .select('*')
      .eq('is_active', true)
      .eq('show_on_landing', true)
      .order('landing_order', { ascending: true })
      .then(({ data }) => {
        if (data?.length) setCasinoOffers(data);
      });

    supabase
      .from('landing_pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data?.length) setPricingPlans(data);
      });
  }, []);

  useEffect(() => {
    trackEvent('audience_selector_viewed', { route: location.pathname, mode });
  }, [location.pathname, mode]);

  useEffect(() => {
    if (!activeAudience) return;
    const focusHeading = () => headingRef.current?.focus();
    focusHeading();
    const frame = window.requestAnimationFrame(focusHeading);
    const id = window.setTimeout(focusHeading, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(id);
    };
  }, [activeAudience, location.pathname]);

  useEffect(() => {
    return () => {
      setSelectingAudience(null);
      setSelectingStreamerPath(null);
      setSwitchingAudience(null);
    };
  }, [location.pathname]);

  const partners = useMemo(() => {
    if (casinoOffers.length) {
      return casinoOffers.slice(0, 5).map((offer, index) => ({
        ...FEATURED_PARTNERS[index],
        ...offer,
      }));
    }
    return FEATURED_PARTNERS;
  }, [casinoOffers]);

  const openAuth = () => setShowAuthModal(true);

  const handlePreview = (audience) => {
    if (selectingAudience) return;
    setPreviewAudience(audience);
    if (previewTrackedRef.current !== audience) {
      previewTrackedRef.current = audience;
      trackEvent(`audience_${audience}_previewed`, { route: location.pathname });
    }
  };

  const clearPreview = () => {
    if (!selectingAudience) setPreviewAudience(null);
  };

  const navigateAudience = (audience, delay) => {
    const route = audience === 'player' ? '/player/bonus-hunt' : '/streamer';
    window.setTimeout(() => {
      navigate(route, { state: { fromAudienceSelector: true } });
    }, delay);
  };

  const selectAudience = (audience) => {
    if (selectingAudience) return;
    setSelectingAudience(audience);
    setPreviewAudience(null);
    rememberAudience(user, audience);
    trackEvent(`audience_${audience}_selected`, { route: location.pathname });
    navigateAudience(audience, reducedMotion ? 0 : SELECTION_DELAY_MS);
  };

  const switchAudience = (audience) => {
    if (audience === activeAudience || switchingAudience) return;
    setSwitchingAudience(audience);
    rememberAudience(user, audience);
    trackEvent('audience_switched', { from: activeAudience, to: audience });
    navigateAudience(audience, reducedMotion ? 0 : 420);
  };

  const resetSelector = () => {
    trackEvent('audience_switched', { from: activeAudience, to: 'selector' });
    navigate('/');
  };

  const startPlayerTrial = () => {
    trackEvent('player_cta_clicked', { route: location.pathname });
    rememberAudience(user, 'player');
    navigate('/player/bonus-hunt');
  };

  const previewStreamerChoice = (path) => {
    if (selectingStreamerPath) return;
    setPreviewStreamerPath(path);
    trackEvent(`audience_streamer_${path}_previewed`, { route: location.pathname });
  };

  const clearStreamerChoice = () => {
    if (!selectingStreamerPath) setPreviewStreamerPath(null);
  };

  const selectStreamerPath = (path) => {
    if (selectingStreamerPath) return;
    setSelectingStreamerPath(path);
    setPreviewStreamerPath(null);
    rememberAudience(user, 'streamer');
    const route = path === 'deals' ? '/offers' : '/overlay-center';
    trackEvent(`audience_streamer_${path}_selected`, { route: location.pathname, destination: route });
    window.setTimeout(() => {
      navigate(route, { state: { fromAudienceSelector: true } });
    }, reducedMotion ? 0 : STREAMER_PATH_DELAY_MS);
  };

  const startStreamer = () => {
    trackEvent('streamer_cta_clicked', { route: location.pathname, premium: isPremium });
    if (!user) {
      openAuth();
      return;
    }
    navigate(isPremium ? '/overlay-center' : '/premium');
  };

  const handleOfferClick = (offer) => {
    if (!offer.bonus_link) {
      navigate('/offers');
      return;
    }
    trackOfferClick({ offerId: offer.id, casinoName: offer.casino_name, pageSource: 'streamer-landing' });
    window.open(offer.bonus_link, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {showAgeVerification && (
        <div className="lp-age-overlay" role="dialog" aria-modal="true" aria-labelledby="lp-age-title">
          <div className="lp-age-modal">
            <span className="lp-age-modal__icon">18+</span>
            <h2 id="lp-age-title">Age Verification</h2>
            <p>This website contains gambling-related content. You must be 18 or older to enter.</p>
            <div className="lp-age-modal__actions">
              <button type="button" onClick={() => { localStorage.setItem('ageVerified', 'true'); setShowAgeVerification(false); }}>
                I am 18+
              </button>
              <button type="button" className="lp-age-modal__deny" onClick={() => { window.location.href = 'https://www.google.com'; }}>
                Exit
              </button>
            </div>
            <small>18+ only. Please play responsibly.</small>
          </div>
        </div>
      )}

      <div className={`lp-page${activeAudience ? ` lp-page--${activeAudience}` : ' lp-page--selector'}${switchingAudience ? ` lp-page--switching-${switchingAudience}` : ''}`}>
        <LandingNav
          activeAudience={activeAudience}
          user={user}
          onLogin={openAuth}
          onSwitch={switchAudience}
          onReset={resetSelector}
        />

        {mode === 'selector' ? (
          <AudienceGateway
            previewAudience={previewAudience}
            selectingAudience={selectingAudience}
            onPreview={handlePreview}
            onClearPreview={clearPreview}
            onSelect={selectAudience}
          />
        ) : mode === 'player' ? (
          <PlayerLanding headingRef={headingRef} onPrimaryCta={startPlayerTrial} user={user} />
        ) : (
          <StreamerPathGateway
            previewPath={previewStreamerPath}
            selectingPath={selectingStreamerPath}
            onPreview={previewStreamerChoice}
            onClearPreview={clearStreamerChoice}
            onSelect={selectStreamerPath}
          />
        )}

        {mode === 'player' && <Footer />}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}
