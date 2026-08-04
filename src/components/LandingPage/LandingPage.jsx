import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CircleDollarSign,
  Clapperboard,
  Code2,
  Database,
  Gauge,
  Grid3X3,
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
  Swords,
  Trophy,
  Users,
  WalletCards,
} from 'lucide-react';
import { SiKick, SiObsstudio, SiTwitch, SiYoutube } from 'react-icons/si';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import { usePremium } from '../../hooks/usePremium';
import { trackEvent } from '../../utils/analytics';
import trackOfferClick from '../../utils/trackOfferClick';
import { AudienceToggle } from '../Navigation/TopNavigation';
import './LandingPage.css';

const FEATURED_PARTNERS = [
  { id: 'bcgame', name: 'BC.GAME', tag: 'TOP PARTNER', tagColor: '#38bdf8', model: '40% Rev Share', badges: ['CPA Available', 'Weekly Payments'], logo: 'BC', accent: '#38bdf8', logoBg: '#082f49' },
  { id: 'rollbit', name: 'ROLLBIT', tag: 'POPULAR', tagColor: '#34d399', model: 'Stream Friendly', badges: ['Fast Approval', 'Exclusive Bonuses'], logo: 'RB', accent: '#34d399', logoBg: '#06351f' },
  { id: 'duelbits', name: 'Duelbits', tag: 'POPULAR', tagColor: '#fbbf24', model: 'Revenue Share', badges: ['Dedicated Manager', 'High Converting'], logo: 'DB', accent: '#fbbf24', logoBg: '#3a2505' },
  { id: 'stake', name: 'Stake', tag: 'NEW', tagColor: '#a78bfa', model: '35% Rev Share', badges: ['Global Brand', '24/7 Support'], logo: 'ST', accent: '#a78bfa', logoBg: '#24114a' },
  { id: 'sportsbet', name: 'Sportsbet.io', tag: 'NEW', tagColor: '#fb7185', model: 'CPA up to EUR 120', badges: ['Sports Focused', 'Quick Payouts'], logo: 'SB', accent: '#fb7185', logoBg: '#3b1118' },
];

const STREAMER_FEATURES = [
  { icon: LayoutDashboard, title: 'Manage the stream', desc: 'Control bonus hunts, slot requests, RTP stats and session widgets from one focused dashboard.' },
  { icon: Users, title: 'Engage your viewers', desc: 'Let chat request slots, join giveaways, play games, place predictions and compete in stream moments.' },
  { icon: MonitorPlay, title: 'Show better visuals', desc: 'Use OBS-ready browser sources, branded widgets, live alerts and tournament displays.' },
];

const PLAYER_FEATURES = [
  { icon: WalletCards, title: 'Session accounting', desc: 'Track starting deposits, extra deposits, withdrawals, spent amount and final result.' },
  { icon: Trophy, title: 'Bonus hunt results', desc: 'Follow break-even targets, total payout, best win, worst win and highest multiplier.' },
  { icon: LibraryBig, title: 'Slot tracker', desc: 'Search all-time, monthly, weekly and daily records by slot, provider and result.' },
  { icon: Search, title: 'Slot metadata', desc: 'Use your slot library for images, providers, RTP, volatility and max-win context.' },
  { icon: LineChart, title: 'Financial tracker', desc: 'Readable averages, profit/loss tracker summaries and historical hunt performance.' },
  { icon: ShieldCheck, title: 'Private by design', desc: 'A player product with no OBS links, chat controls or streamer-only setup.' },
];

const ROOT_ANSWERS = [
  {
    icon: MonitorPlay,
    title: 'For Streamers',
    desc: 'Interactive OBS overlays, bonus hunts, tournaments, giveaways, chat games and stream controls for iGaming creators.',
  },
  {
    icon: Gauge,
    title: 'For Gamblers',
    desc: 'Track deposits, withdrawals, slot results, break-even progress and profit or loss in a private player dashboard.',
  },
];

const PLAYER_ANSWERS = [
  {
    icon: WalletCards,
    title: 'What can players track?',
    desc: 'Starting deposits, extra deposits, withdrawals, bonus costs, payouts, multipliers, best wins, worst results, casino brands, providers and profit/loss records.',
  },
  {
    icon: ShieldCheck,
    title: 'Does it require OBS?',
    desc: 'No. Player Center is a private bonus hunt tracker and casino accounting dashboard, separate from streamer overlays and live chat controls.',
  },
  {
    icon: LineChart,
    title: 'Does it predict results?',
    desc: 'No. Streamers Center records play history and session results for organization. It does not predict winnings or imply guaranteed casino outcomes.',
  },
];

const STREAMER_ANSWERS = [
  {
    icon: MonitorPlay,
    title: 'What streamer tools are included?',
    desc: 'Browser-source overlays, bonus hunt widgets, slot request queues, tournaments, giveaways, chat-connected tools, viewer games, custom themes and partner discovery.',
  },
  {
    icon: Clapperboard,
    title: 'Does it work with OBS?',
    desc: 'Yes. Streamers Center overlays and widgets are designed for browser-source live production workflows, including OBS scenes.',
  },
  {
    icon: Radio,
    title: 'Who is it built for?',
    desc: 'Streamers Center is built for iGaming, casino and slot content creators on Twitch, Kick and YouTube Live.',
  },
];

const HOME_PLATFORM_BADGES = [
  { label: 'OBS Ready', icon: SiObsstudio, tone: 'obs' },
  { label: 'Twitch', icon: SiTwitch, tone: 'twitch' },
  { label: 'Kick', icon: SiKick, tone: 'kick' },
  { label: 'YouTube', icon: SiYoutube, tone: 'youtube' },
  { label: 'No Coding', icon: Code2, tone: 'code' },
];

const STREAMER_DEMOS = [
  {
    id: 'bonus',
    label: 'Bonus Hunt',
    title: 'Run bonus hunts without spreadsheet chaos.',
    desc: 'Display opened bonuses, current payout, remaining slots, break-even progress and best results directly on stream.',
    points: ['OBS browser source', 'Slot images and providers', 'Break-even progress'],
  },
  {
    id: 'requests',
    label: 'Slot Requests',
    title: 'Turn chat suggestions into an organized queue.',
    desc: 'Let viewers request slots, keep the queue readable and decide what gets played next from the dashboard.',
    points: ['Viewer request queue', 'Streamer controls', 'Chat-friendly display'],
  },
  {
    id: 'giveaways',
    label: 'Giveaway',
    title: 'Create moments viewers can join instantly.',
    desc: 'Run giveaway panels and calls to action that are easy to read on stream and simple for chat to understand.',
    points: ['Keyword entry display', 'Winner-ready layout', 'Stream-safe visuals'],
  },
  {
    id: 'games',
    label: 'Chat Games',
    title: 'Give chat something to do between spins.',
    desc: 'Add games, predictions and community interactions that keep viewers active during the whole session.',
    points: ['Predictions and bets', 'Viewer games', 'Community commands'],
  },
  {
    id: 'stats',
    label: 'RTP Stats',
    title: 'Show useful slot context at a glance.',
    desc: 'Surface RTP, volatility and slot metadata in a clean overlay style that supports the stream instead of covering it.',
    points: ['RTP display', 'Volatility notes', 'Slot metadata'],
  },
];

const STREAMER_STEPS = [
  'Connect your streaming or chat account where supported.',
  'Configure the widgets and visual style you want on stream.',
  'Add the browser-source URL to OBS or your production scene.',
  'Run bonus hunts, requests, games and giveaways from one place.',
];

const TRUST_POINTS = [
  { icon: ShieldCheck, title: 'Software only', desc: 'Streamers Center does not operate gambling services, accept deposits or process wagers.' },
  { icon: Database, title: 'Clear data boundaries', desc: 'Streamer tools, player tracking and connected-account data stay separated by product area.' },
  { icon: RefreshCw, title: 'Actively maintained', desc: 'Widgets, pricing, screenshots and integrations are updated as the product changes.' },
  { icon: CircleDollarSign, title: 'Stripe billing', desc: 'Checkout and subscription management are handled through Stripe, with VAT shown before payment.' },
];

const HOME_WIDGETS = [
  { title: 'Bonus Hunt', image: '/screenshoots/bonus-hunt.png', layout: 'portrait' },
  { title: 'RTP Stats', image: '/screenshoots/rtp-stats.png', layout: 'wide' },
  { title: 'Navbar', image: '/screenshoots/navbar.png', layout: 'wide' },
  { title: 'Bets', image: '/screenshoots/bets.png' },
  { title: 'Connect 4 Game', image: '/screenshoots/connect-four.png' },
  { title: 'Giveaway', image: '/screenshoots/giveaway.png' },
  { title: 'Chat', image: '/screenshoots/chat.png', layout: 'portrait' },
  { title: 'Shoutout', image: '/screenshoots/raid-shoutout.png' },
  { title: 'Tournament', image: '/screenshoots/tournament.png' },
  { title: 'Slideshow Frame', image: '/screenshoots/slideshow-frame.png' },
  { title: 'Animated Background', image: '/screenshoots/background.png' },
];

const HOME_STEPS = [
  { icon: Radio, title: 'Connect', desc: 'Link your streaming platform in a few clicks.' },
  { icon: Grid3X3, title: 'Choose Widgets', desc: 'Pick interactive overlays and stream tools.' },
  { icon: LayoutDashboard, title: 'Customize', desc: 'Adjust style, colors, triggers and behavior.' },
  { icon: MonitorPlay, title: 'Add to OBS', desc: 'Add the browser source and go live.' },
];

const HOME_PRICING = [
  { name: 'Gambler Monthly', category: 'Gambler', image: '/player3eur.png', to: '/premium?type=player', tone: 'player' },
  { name: 'Gambler Yearly', category: 'Gambler', image: '/player25eur.png', to: '/premium?type=player', tone: 'player', badge: 'Best Value', badgeTone: 'player' },
  { name: 'Streamer Monthly', category: 'Streamer', image: '/25.png', to: '/premium?type=streamer', tone: 'streamer' },
  { name: 'Streamer 6 Months', category: 'Streamer', image: '/130.png', to: '/premium?type=streamer', tone: 'streamer' },
  { name: 'Streamer Yearly', category: 'Streamer', image: '/250.png', to: '/premium?type=streamer', tone: 'streamer', badge: 'Best Value', badgeTone: 'streamer' },
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

const LANDING_IMAGES = {
  player: '/player.png',
  streamer: '/streamer.png',
};

const AUDIENCE_TRANSITION_MS = 1280;
const REDUCED_MOTION_TRANSITION_MS = 120;

const AUDIENCE_STORAGE_KEY = 'streamerscenter:selectedAudience';
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

function launchAudienceTransition(audience) {
  const existing = document.querySelector('.lp-route-transition');
  if (existing) existing.remove();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = prefersReducedMotion ? REDUCED_MOTION_TRANSITION_MS : AUDIENCE_TRANSITION_MS;

  const transition = document.createElement('div');
  transition.className = `lp-route-transition lp-route-transition--${audience}`;
  transition.setAttribute('aria-hidden', 'true');
  transition.innerHTML = `
    <img src="${LANDING_IMAGES[audience]}" alt="" />
    <span class="lp-route-transition__veil"></span>
    <span class="lp-route-transition__label">${audience === 'player' ? 'Opening Player Center' : 'Opening Streamer Center'}</span>
  `;
  document.body.appendChild(transition);
  window.requestAnimationFrame(() => transition.classList.add('is-running'));

  window.setTimeout(() => {
    transition.classList.add('is-leaving');
    window.setTimeout(() => transition.remove(), 520);
  }, duration + 520);

  return duration;
}

function BrandMark() {
  return (
    <a href="https://streamerscenter.com/" className="lp-brand" aria-label="Streamers Center home">
      <span className="lp-brand__mark">
        <img src="/StreamerCenterLogo.png" alt="" />
      </span>
    </a>
  );
}

function LandingNav({ activeAudience, user, onLogin, onSwitch }) {
  return (
    <header className="lp-site-nav">
      <div className="lp-site-nav__brand-zone">
        <BrandMark />
        <AudienceToggle activeAudience={activeAudience} onSelect={onSwitch} />
      </div>
      <nav className="lp-site-nav__links" aria-label="Main navigation">
        {user ? (
          <Link className="lp-nav-btn lp-nav-btn--ghost" to="/apps">
            <Grid3X3 size={16} /> Apps
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
  const description = isPlayer
    ? (
      <>
        <span className="lp-audience-panel__lead">Track your <strong>Profits/Losses</strong></span>
        Have your own <strong>Bonus hunt tracker</strong>, <strong>slot tracker</strong> and <strong>profit/loss tracker</strong>. Keep track of <strong>deposits</strong>, <strong>wins</strong>, <strong>losses</strong> by either <strong>casino brand</strong>, <strong>year</strong>, <strong>monthly</strong>, <strong>weekly</strong>, <strong>daily</strong> or <strong>provider</strong>. A financial tracker at the tip of your fingers.
      </>
    )
    : (
      <>
        Improve your <strong>stream numbers</strong>. Whether you are a <strong>new streamer</strong> or a <strong>small-time streamer</strong>, elevate your game with <strong>iGaming overlays</strong>, <strong>casino overlays</strong>, <strong>bonus hunt trackers</strong>, <strong>tournament brackets</strong>, <strong>bets</strong>, <strong>giveaways</strong>, <strong>chat tools</strong> and <strong>games for your chat</strong>. Everything you need to be an <strong>elite streamer</strong> in one place.
      </>
    );
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
      <span className="lp-audience-panel__media" aria-hidden="true">
        <img src={LANDING_IMAGES[audience]} alt="" loading="eager" decoding="async" />
      </span>
      <span className="lp-audience-panel__shade" />
      {isPlayer && (
        <>
          <span className="lp-audience-panel__desc">{description}</span>
          <span className="lp-audience-panel__preview">
            <Preview expanded={selecting} />
          </span>
        </>
      )}
    </button>
  );
}

function AudienceGateway({ previewAudience, selectingAudience, onPreview, onClearPreview, onSelect }) {
  const locked = !!selectingAudience;

  return (
    <section
      className={[
        'lp-gateway',
        previewAudience ? `lp-gateway--preview-${previewAudience}` : '',
        selectingAudience ? `lp-gateway--selecting-${selectingAudience}` : '',
      ].filter(Boolean).join(' ')}
      aria-labelledby="audience-selector-heading"
    >
      <h1 id="audience-selector-heading" className="lp-sr-only">
        iGaming overlays, bonus hunt tracker, slot tracker and casino financial tracking
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

function AnswerSection({ eyebrow, title, children, answers }) {
  return (
    <section className="lp-section">
      <SectionHeading eyebrow={eyebrow} title={title}>{children}</SectionHeading>
      <ProductFeatureGrid features={answers} />
    </section>
  );
}

function RootOverview() {
  return (
    <main className="lp-selected lp-selected--overview">
      <section className="lp-section lp-journey-overview">
        <div>
          <span className="lp-eyebrow">Choose your path</span>
          <h2>Built for iGaming streamers first, with a private tracker for gamblers.</h2>
          <p>
            Streamers Center helps creators run interactive streams viewers can participate in.
            The gambler tracker is kept separate for players who only want session records and profit or loss clarity.
          </p>
        </div>
        <ProductFeatureGrid features={ROOT_ANSWERS} />
      </section>
    </main>
  );
}

function HomeLanding({ user, onLogin, onStreamerCta, onPlayerCta }) {
  const [pinnedWidget, setPinnedWidget] = useState(null);

  useEffect(() => {
    if (!pinnedWidget) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPinnedWidget(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinnedWidget]);

  return (
    <main className="lp-home">
      <header className="lp-home-nav">
        <div className="lp-home-nav__left">
          <Link to="/" className="lp-home-brand" aria-label="Streamers Center home">
            <img src="/StreamerCenterLogo.png" alt="" />
          </Link>
          <AudienceToggle activeAudience="streamer" />
        </div>
        <nav className="lp-home-nav__links" aria-label="Main navigation">
          <a href="#widgets">Widgets</a>
          <Link to="/offers">Deals</Link>
          <a href="#pricing">Pricing</a>
          <a href="#demo">Demo</a>
        </nav>
        <div className="lp-home-nav__actions">
          {user ? (
            <Link to="/apps">Apps</Link>
          ) : (
            <button type="button" onClick={onLogin}>Login</button>
          )}
          <button type="button" className="lp-home-nav__primary" onClick={onStreamerCta}>Start Free Trial</button>
        </div>
      </header>

      <section className="lp-home-hero" id="demo">
        <div className="lp-home-hero__copy">
          <h1>
            Turn your stream <span className="lp-home-hero__nowrap">into an</span>{" "}
            <strong>interactive experience</strong>
          </h1>
          <p>
            Interactive iGaming overlays, bonus hunts, tournaments, giveaways, slot requests,
            bets, chat tools and games, all in one place.
          </p>
          <div className="lp-home-hero__ctas">
            <button type="button" className="lp-btn lp-btn--streamer" onClick={onStreamerCta}>
              Start Free Trial <ArrowRight size={18} />
            </button>
            <a className="lp-btn lp-btn--ghost" href="#widgets">
              View Demo <Play size={18} />
            </a>
          </div>
          <div className="lp-home-platforms" aria-label="Supported workflow">
            {HOME_PLATFORM_BADGES.map(({ label, icon: Icon, tone }) => (
              <span key={label} className={`lp-home-platforms__badge lp-home-platforms__badge--${tone}`}>
                <Icon aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="lp-home-hero__media">
          <img src="/streamer.png" alt="Streamers Center overlay tools preview" loading="eager" decoding="async" />
        </div>
      </section>

      <section className="lp-home-section lp-home-audiences">
        <h2>Built for Streamers and Gamblers</h2>
        <div className="lp-home-audience-grid">
          <button type="button" className="lp-home-audience lp-home-audience--streamer" onClick={onStreamerCta}>
            <span className="lp-home-audience__badge">Most Popular</span>
            <MonitorPlay size={34} />
            <h3>For Streamers</h3>
            <p>Engage your audience and grow your channel.</p>
            <ul>
              <li>Bonus hunts, slot requests, giveaways</li>
              <li>Tournaments, chat games, interactive polls</li>
              <li>OBS-ready overlays and alerts</li>
              <li>All-in-one dashboard, easy to customize</li>
            </ul>
          </button>
          <button type="button" className="lp-home-audience lp-home-audience--player" onClick={onPlayerCta}>
            <Users size={34} />
            <h3>For Gamblers</h3>
            <p>Track your activity and measure results.</p>
            <ul>
              <li>Track deposits, withdrawals and sessions</li>
              <li>Best wins, biggest losses, profit/loss</li>
              <li>Detailed history and stats over time</li>
              <li>Personal dashboard and insights</li>
            </ul>
          </button>
        </div>
      </section>

      <section className="lp-home-section lp-home-widgets" id="widgets">
        <h2>See the widgets in action</h2>
        <div className="lp-home-widget-grid">
          {HOME_WIDGETS.map((widget) => (
            <button
              key={widget.title}
              type="button"
              className={`lp-home-widget-card lp-home-widget-card--${widget.layout || 'standard'}${pinnedWidget?.title === widget.title ? ' is-pinned' : ''}`}
              aria-pressed={pinnedWidget?.title === widget.title}
              aria-label={`${pinnedWidget?.title === widget.title ? 'Unpin' : 'Pin'} ${widget.title} widget preview`}
              onClick={() => setPinnedWidget((current) => current?.title === widget.title ? null : widget)}
            >
              <h3>{widget.title}</h3>
              <img src={widget.image} alt={`${widget.title} widget screenshot`} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
        {pinnedWidget && (
          <aside className={`lp-home-widget-float lp-home-widget-float--${pinnedWidget.layout || 'standard'}`} aria-live="polite" aria-label={`${pinnedWidget.title} pinned widget preview`}>
            <img src={pinnedWidget.image} alt={`${pinnedWidget.title} pinned widget preview`} />
          </aside>
        )}
      </section>

      <section className="lp-home-section lp-home-steps">
        <h2>How it works</h2>
        <div className="lp-home-step-grid">
          {HOME_STEPS.map(({ icon: Icon, title, desc }, index) => (
            <article key={title} className="lp-home-step">
              <Icon size={34} />
              <div>
                <h3>{index + 1}. {title}</h3>
                <p>{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-home-section lp-home-pricing" id="pricing">
        <h2>Simple, transparent pricing</h2>
        <div className="lp-home-price-groups">
          {['Gambler', 'Streamer'].map((category, categoryIndex) => (
            <div key={category} className={`lp-home-price-group lp-home-price-group--${category.toLowerCase()}`}>
              <h3>{category}s</h3>
              <div className="lp-home-price-grid">
                {HOME_PRICING.filter((plan) => plan.category === category).map((plan) => (
                  <Link
                    key={plan.name}
                    to={plan.to}
                    className={`lp-home-price lp-home-price--image lp-home-price--${plan.tone}${plan.badge ? ' lp-home-price--featured' : ''}`}
                    aria-label={`${plan.name} pricing`}
                  >
                    {plan.badge && (
                      <span className={`lp-home-price__badge lp-home-price__badge--${plan.badgeTone || plan.tone}`}>
                        {plan.badge}
                      </span>
                    )}
                    <img src={plan.image} alt={`${plan.name} subscription card`} loading="lazy" decoding="async" />
                  </Link>
                ))}
              </div>
              {categoryIndex === 0 && <span className="lp-home-price-divider" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function StreamerIntro({ onStreamerCta }) {
  return (
    <section className="lp-section lp-streamer-intro">
      <div className="lp-streamer-intro__copy">
        <span className="lp-eyebrow">Streamer tools</span>
        <h2>Build a stream your viewers want to interact with.</h2>
        <p>
          Turn passive viewers into active participants with OBS-ready overlays, bonus hunts,
          slot requests, tournaments, giveaways and chat games controlled from one place.
        </p>
        <div className="lp-selected-hero__ctas">
          <button type="button" className="lp-btn lp-btn--streamer" onClick={onStreamerCta}>
            Explore Streamer Tools <ArrowRight size={18} />
          </button>
          <Link className="lp-btn lp-btn--ghost" to="/premium?type=player">
            Open Gambler Tracker <Gauge size={18} />
          </Link>
        </div>
      </div>
      <div className="lp-platform-strip" aria-label="Supported streamer workflow">
        {['OBS-ready', 'Twitch', 'Kick', 'YouTube', 'No coding required'].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function WidgetDemoSection() {
  const [activeDemoId, setActiveDemoId] = useState(STREAMER_DEMOS[0].id);
  const activeDemo = STREAMER_DEMOS.find((demo) => demo.id === activeDemoId) || STREAMER_DEMOS[0];

  return (
    <section className="lp-section lp-widget-demo" id="live-demo">
      <div className="lp-widget-demo__header">
        <SectionHeading eyebrow="Live demo" title="Show the tools instead of explaining them.">
          Switch between the stream moments a viewer naturally understands: hunts, requests, giveaways, games and slot stats.
        </SectionHeading>
        <Link className="lp-btn lp-btn--ghost" to="/premium?type=streamer">
          See Pricing <Play size={18} />
        </Link>
      </div>
      <div className="lp-demo-tabs" role="tablist" aria-label="Streamer widget demos">
        {STREAMER_DEMOS.map((demo) => (
          <button
            key={demo.id}
            type="button"
            role="tab"
            aria-selected={activeDemo.id === demo.id}
            className={activeDemo.id === demo.id ? 'is-active' : ''}
            onClick={() => setActiveDemoId(demo.id)}
          >
            {demo.label}
          </button>
        ))}
      </div>
      <div className="lp-demo-stage">
        <div className="lp-demo-stage__copy">
          <h3>{activeDemo.title}</h3>
          <p>{activeDemo.desc}</p>
          <ul>
            {activeDemo.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </div>
        <div className={`lp-demo-widget lp-demo-widget--${activeDemo.id}`} aria-hidden="true">
          <span>{activeDemo.label}</span>
          <strong>{activeDemo.points[0]}</strong>
          <div className="lp-preview-progress"><span style={{ width: activeDemo.id === 'stats' ? '96%' : '72%' }} /></div>
          <small>{activeDemo.points[1]}</small>
          <small>{activeDemo.points[2]}</small>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="lp-section lp-how-it-works">
      <SectionHeading eyebrow="How it works" title="From dashboard to OBS in four steps.">
        The setup path stays practical for small and growing iGaming streamers.
      </SectionHeading>
      <ol>
        {STREAMER_STEPS.map((step, index) => (
          <li key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TrustComplianceSection() {
  return (
    <section className="lp-section lp-trust-section">
      <SectionHeading eyebrow="Trust and compliance" title="Streaming software, not a gambling operator.">
        Streamers Center provides tools for presentation, chat interaction and record keeping.
        It does not accept wagers, operate casino games or process player deposits.
      </SectionHeading>
      <ProductFeatureGrid features={TRUST_POINTS} />
    </section>
  );
}

function PlayerLanding({ headingRef, onPrimaryCta, user }) {
  return (
    <main className="lp-selected lp-selected--player">
      <section className="lp-selected-hero">
        <div className="lp-selected-hero__media" aria-hidden="true">
          <img src={LANDING_IMAGES.player} alt="" loading="eager" decoding="async" />
        </div>
        <div className="lp-selected-hero__copy">
          <span className="lp-eyebrow">Player Center</span>
          <h1 ref={headingRef} tabIndex="-1">
            Bonus hunt tracker, slot tracker and casino profit/loss tools for players.
          </h1>
          <p>
            Track deposits, withdrawals, bonus costs, payouts, multipliers, break-even targets,
            best wins, worst results and slot performance in a private financial tracker made for regular casino players.
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

      <AnswerSection
        eyebrow="Quick answers"
        title="Built for casino session records, not predictions."
        answers={PLAYER_ANSWERS}
      >
        Player Center keeps bonus hunt and casino play history organized without implying future results.
      </AnswerSection>

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
        <div className="lp-selected-hero__media" aria-hidden="true">
          <img src={LANDING_IMAGES.streamer} alt="" loading="eager" decoding="async" />
        </div>
        <h1 ref={headingRef} tabIndex="-1" className="lp-sr-only">
          Build a stream your viewers want to interact with.
        </h1>
      </section>

      <StreamerIntro onStreamerCta={onStreamerCta} />

      <WidgetDemoSection />

      <section className="lp-section">
        <SectionHeading eyebrow="Creator toolkit" title="Everything for a more interactive stream, grouped by workflow.">
          Manage the stream, engage your viewers and show better visuals without spreading the production across disconnected tools.
        </SectionHeading>
        <ProductFeatureGrid features={STREAMER_FEATURES} />
      </section>

      <AnswerSection
        eyebrow="Quick answers"
        title="Built for iGaming creators and live production."
        answers={STREAMER_ANSWERS}
      >
        Streamers Center focuses on Twitch, Kick and YouTube creator workflows for casino and slot content.
      </AnswerSection>

      <HowItWorksSection />

      <section className="lp-section lp-streamer-showcase">
        <div className="lp-showcase-card lp-showcase-card--wide">
          <MonitorPlay size={24} />
          <h3>Overlay Center</h3>
          <p>Build browser-source scenes, iGaming overlays, casino overlays, custom themes, bonus hunt widgets and branded live panels.</p>
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
          Premium access unlocks Overlay Center and the streamer-focused tools. Prices are shown before 23% VAT and billing is handled through Stripe.
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

      <TrustComplianceSection />

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
      <div>
        <span>Streamers Center</span>
        <p>Streaming and tracking software only. We do not operate gambling services, accept deposits or process wagers.</p>
      </div>
      <nav aria-label="Footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
    </footer>
  );
}

export default function LandingPage({ mode = 'selector' }) {
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [casinoOffers, setCasinoOffers] = useState([]);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [previewAudience, setPreviewAudience] = useState(null);
  const [selectingAudience, setSelectingAudience] = useState(null);
  const [switchingAudience, setSwitchingAudience] = useState(null);
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const location = useLocation();
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

  const openAuth = () => {
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
  };

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

  const navigateAudience = (audience) => {
    if (!user) {
      navigate(`/premium?type=${audience}`, { state: { fromAudienceSelector: true } });
      return;
    }
    const route = audience === 'player' ? '/player/bonus-hunt' : '/overlay-center';
    navigate(route, { state: { fromAudienceSelector: true } });
  };

  const selectAudience = (audience) => {
    if (selectingAudience) return;
    setSelectingAudience(audience);
    setPreviewAudience(null);
    rememberAudience(user, audience);
    trackEvent(`audience_${audience}_selected`, { route: location.pathname });
    const transitionDuration = launchAudienceTransition(audience);
    window.setTimeout(() => navigateAudience(audience), transitionDuration);
  };

  const switchAudience = (audience) => {
    if (audience === activeAudience || switchingAudience) return;
    setSwitchingAudience(audience);
    rememberAudience(user, audience);
    trackEvent('audience_switched', { from: activeAudience, to: audience });
    navigateAudience(audience);
  };

  const startPlayerTrial = () => {
    trackEvent('player_cta_clicked', { route: location.pathname });
    rememberAudience(user, 'player');
    if (!user) {
      navigate('/premium?type=player');
      return;
    }
    navigate('/player/bonus-hunt');
  };

  const startStreamer = () => {
    trackEvent('streamer_cta_clicked', { route: location.pathname, premium: isPremium });
    if (!user) {
      navigate('/premium?type=streamer');
      return;
    }
    navigate(isPremium ? '/overlay-center' : '/premium?type=streamer');
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
            <div className="lp-age-modal__badge" aria-hidden="true">
              <span className="lp-age-modal__icon">18+</span>
            </div>
            <span className="lp-age-modal__eyebrow">Responsible access</span>
            <h2 id="lp-age-title">Confirm your age</h2>
            <p>Streamers Center includes gambling-related tools and content. Please confirm you are old enough to continue.</p>
            <div className="lp-age-modal__notice">
              <span>Age restricted</span>
              <strong>18+ only</strong>
            </div>
            <div className="lp-age-modal__actions">
              <button type="button" onClick={() => { localStorage.setItem('ageVerified', 'true'); setShowAgeVerification(false); }}>
                Enter site
              </button>
              <button type="button" className="lp-age-modal__deny" onClick={() => { window.location.href = 'https://www.google.com'; }}>
                Exit
              </button>
            </div>
            <small>Please play responsibly.</small>
          </div>
        </div>
      )}

      <div className={`lp-page${activeAudience ? ` lp-page--${activeAudience}` : ' lp-page--selector'}${switchingAudience ? ` lp-page--switching-${switchingAudience}` : ''}`}>
        {mode !== 'selector' && (
          <LandingNav
            activeAudience={activeAudience}
            user={user}
            onLogin={openAuth}
            onSwitch={switchAudience}
          />
        )}

        {mode === 'selector' ? (
          <HomeLanding
            user={user}
            onLogin={openAuth}
            onStreamerCta={startStreamer}
            onPlayerCta={startPlayerTrial}
          />
        ) : mode === 'player' ? (
          <PlayerLanding headingRef={headingRef} onPrimaryCta={startPlayerTrial} user={user} />
        ) : mode === 'streamer' ? (
          <StreamerLanding
            headingRef={headingRef}
            pricingPlans={pricingPlans}
            partners={partners}
            onStreamerCta={startStreamer}
            onOfferClick={handleOfferClick}
          />
        ) : (
          null
        )}

        {(mode === 'selector' || mode === 'player' || mode === 'streamer') && <Footer />}
      </div>

    </>
  );
}
