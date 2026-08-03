const SITE_URL = 'https://streamerscenter.com';
const DEFAULT_TITLE = 'Interactive iGaming Overlays and Bonus Hunt Tools | Streamers Center';
const DEFAULT_DESCRIPTION = 'Create interactive OBS overlays for bonus hunts, slot requests, tournaments, giveaways, bets and chat games. Streamers Center supports Twitch, Kick and YouTube creators.';
const DEFAULT_IMAGE = `${SITE_URL}/social-preview.png`;
const BRAND_LOGO = `${SITE_URL}/StreamerCenterLogo.png`;
const BRAND_ICON = `${SITE_URL}/favicon-512x512.png`;

const CORE_TOPICS = [
  'iGaming overlays',
  'casino overlays',
  'overlays tracker',
  'casino overlay tracker',
  'Twitch streamer tools',
  'Kick streamer tools',
  'YouTube live streamer tools',
  'iGaming content creator software',
  'casino streamer overlays',
  'bonus hunt tracker',
  'slot tracker',
  'financial tracker',
  'profit loss tracker',
  'slot request overlay',
  'casino profit and loss tracker',
];

const ROUTE_TOPICS = {
  '/': CORE_TOPICS,
  '/player': [
    'bonus hunt tracker',
    'casino profit and loss tracker',
    'profit loss tracker',
    'financial tracker',
    'slot tracker',
    'casino session accounting',
    'slot result tracking',
    'deposit and withdrawal tracking',
  ],
  '/streamer': [
    'iGaming overlays',
    'casino overlays',
    'overlays tracker',
    'casino overlay tracker',
    'streamer overlay tools',
    'OBS browser-source overlays',
    'Twitch casino streamer tools',
    'Kick casino streamer tools',
    'slot requests',
    'stream tournaments',
    'giveaway tools for streamers',
  ],
  '/streamer-overlays': [
    'iGaming overlays',
    'casino streamer overlays',
    'OBS browser-source overlays',
    'interactive stream overlays',
  ],
  '/bonus-hunt-tracker': [
    'bonus hunt tracker',
    'casino bonus hunt tracker',
    'slot bonus tracking',
    'break-even progress tracker',
  ],
  '/casino-profit-loss-tracker': [
    'casino profit and loss tracker',
    'deposit and withdrawal tracking',
    'casino session accounting',
    'slot result tracking',
  ],
  '/slot-request-widget': [
    'slot request widget',
    'slot request overlay',
    'chat slot requests',
    'casino streamer request queue',
  ],
  '/tournament-overlay': [
    'tournament overlay',
    'stream tournament widget',
    'casino streamer tournament',
    'viewer tournament display',
  ],
  '/giveaway-widget': [
    'giveaway widget',
    'stream giveaway overlay',
    'viewer giveaway tool',
    'chat giveaway display',
  ],
  '/chat-games': [
    'chat games',
    'stream chat games',
    'viewer games',
    'iGaming chat interaction',
  ],
  '/offers': [
    'streamer partnerships',
    'creator partnership marketplace',
    'casino streamer deals',
    'gaming creator sponsorships',
    'streaming tools partnerships',
  ],
};

const FAQ_BY_PATH = {
  '/': [
    {
      question: 'What is Streamers Center?',
      answer: 'Streamers Center is software for Twitch, Kick and YouTube iGaming creators. It helps streamers run interactive overlays, bonus hunts, slot requests, tournaments, giveaways, chat tools and viewer games.',
    },
    {
      question: 'Who is Streamers Center for?',
      answer: 'The streamer tools are built for casino and slot creators who need live production tools. Streamers Center also includes a separate private tracker for gamblers who want session records.',
    },
    {
      question: 'Does Streamers Center operate gambling services?',
      answer: 'No. Streamers Center provides streaming and tracking software. It does not operate gambling services, accept deposits or process wagers.',
    },
  ],
  '/player': [
    {
      question: 'What can players track in Streamers Center?',
      answer: 'Players can use Streamers Center as a bonus hunt tracker, slot tracker, financial tracker and profit/loss tracker for starting deposits, extra deposits, withdrawals, bonus costs, payouts, multipliers, break-even targets, best wins, worst results, casino brands and providers.',
    },
    {
      question: 'Does the player dashboard require streaming software?',
      answer: 'No. The player bonus hunt tracker is a private web dashboard and does not require OBS, Twitch, Kick or streamer-only setup.',
    },
    {
      question: 'Does Streamers Center predict gambling results?',
      answer: 'No. Streamers Center records casino play and bonus hunt results for accounting and organization. It does not predict winnings or imply guaranteed results.',
    },
  ],
  '/streamer': [
    {
      question: 'What streamer tools does Streamers Center provide?',
      answer: 'Streamers Center provides iGaming overlays, casino overlays, browser-source overlay trackers, bonus hunt widgets, slot request queues, tournaments, giveaways, chat-connected tools, viewer games, custom themes and iGaming partner discovery.',
    },
    {
      question: 'Can Streamers Center overlays be used in OBS?',
      answer: 'Yes. Streamers Center overlays and widgets are designed as browser-source scenes for live production workflows such as OBS.',
    },
    {
      question: 'Which creators is Streamers Center built for?',
      answer: 'Streamers Center is built for iGaming, casino and slot content creators on platforms such as Twitch, Kick and YouTube Live.',
    },
  ],
  '/streamer-overlays': [
    {
      question: 'Can Streamers Center overlays be used in OBS?',
      answer: 'Yes. Streamers Center overlays are designed for browser-source live production workflows such as OBS.',
    },
    {
      question: 'Are Streamers Center overlays casino games?',
      answer: 'No. They are visual and interaction tools for streams. Streamers Center does not operate gambling services.',
    },
  ],
  '/bonus-hunt-tracker': [
    {
      question: 'Does the bonus hunt tracker predict results?',
      answer: 'No. It records results and progress. It does not predict winnings or guarantee outcomes.',
    },
    {
      question: 'Can streamers show bonus hunt progress on stream?',
      answer: 'Yes. Streamers can use widget and overlay workflows where available.',
    },
  ],
  '/casino-profit-loss-tracker': [
    {
      question: 'Is Streamers Center a casino?',
      answer: 'No. Streamers Center is tracking software and does not accept deposits or process wagers.',
    },
    {
      question: 'Does the gambler tracker require OBS?',
      answer: 'No. The gambler tracker is a private web dashboard.',
    },
  ],
  '/slot-request-widget': [
    {
      question: 'Can viewers request slots from chat?',
      answer: 'The slot request widget is built around chat-friendly request workflows where integrations are configured.',
    },
    {
      question: 'Can the streamer control the queue?',
      answer: 'Yes. Streamers keep control over what appears and what gets played.',
    },
  ],
  '/tournament-overlay': [
    {
      question: 'Is the tournament overlay for real-money betting?',
      answer: 'No. Streamers Center provides stream presentation tools and does not process wagers.',
    },
    {
      question: 'Can it be used for community events?',
      answer: 'Yes. The goal is to create organized stream moments viewers can follow.',
    },
  ],
  '/giveaway-widget': [
    {
      question: 'Does Streamers Center ship giveaway prizes?',
      answer: 'No. It provides the software display and workflow. Creators remain responsible for giveaway rules and fulfillment.',
    },
    {
      question: 'Can giveaway widgets match my stream style?',
      answer: 'Widgets are designed to fit branded stream visuals.',
    },
  ],
  '/chat-games': [
    {
      question: 'Are chat games gambling?',
      answer: 'No. They are stream interaction tools. Streamers Center does not accept wagers or deposits.',
    },
    {
      question: 'Do viewers need accounts?',
      answer: 'Viewer requirements depend on the configured integration and widget workflow.',
    },
  ],
};

const SEO_BY_PATH = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE,
  },
  '/player': {
    title: 'Bonus Hunt Tracker, Slot Tracker & Profit/Loss Tracker | Streamers Center',
    description: 'Track bonus hunts, slots, casino deposits, withdrawals, wins, losses, providers, brands, break-even targets, payouts and profit/loss records from a private financial tracker.',
    image: `${SITE_URL}/player.png`,
  },
  '/streamer': {
    title: 'iGaming Overlays & Casino Streamer Tools | Streamers Center',
    description: 'Run iGaming streams with casino overlays, browser-source overlay trackers, bonus hunt trackers, slot requests, tournaments, giveaways, chat tools and viewer games.',
    image: `${SITE_URL}/streamer.png`,
  },
  '/streamer-overlays': {
    title: 'Interactive iGaming Overlays for OBS | Streamers Center',
    description: 'Create OBS-ready iGaming overlays for bonus hunts, slot requests, tournaments, giveaways and chat moments with Streamers Center.',
    image: `${SITE_URL}/streamer.png`,
  },
  '/bonus-hunt-tracker': {
    title: 'Bonus Hunt Tracker for Streamers and Gamblers | Streamers Center',
    description: 'Track opened bonuses, payouts, multipliers, slot images, providers and break-even progress for stream overlays or private sessions.',
    image: `${SITE_URL}/player.png`,
  },
  '/casino-profit-loss-tracker': {
    title: 'Casino Profit and Loss Tracker | Streamers Center',
    description: 'Track casino deposits, withdrawals, slot results and profit or loss by day, week, month or session in a private gambler dashboard.',
    image: `${SITE_URL}/player.png`,
  },
  '/slot-request-widget': {
    title: 'Slot Request Widget for Casino Streams | Streamers Center',
    description: 'Let viewers request slots and keep chat suggestions organized with a streamer-controlled slot request widget and overlay workflow.',
    image: `${SITE_URL}/streamer.png`,
  },
  '/tournament-overlay': {
    title: 'Tournament Overlay for iGaming Streams | Streamers Center',
    description: 'Create tournament-style stream moments with round, bracket and viewer event displays built for iGaming creators.',
    image: `${SITE_URL}/streamer.png`,
  },
  '/giveaway-widget': {
    title: 'Giveaway Widget for Streamers | Streamers Center',
    description: 'Run stream-friendly giveaway displays with clear entry, status and winner-ready layouts for iGaming communities.',
    image: `${SITE_URL}/streamer.png`,
  },
  '/chat-games': {
    title: 'Chat Games for iGaming Streamers | Streamers Center',
    description: 'Add chat games, predictions and viewer interactions that keep iGaming stream communities active between spins.',
    image: `${SITE_URL}/streamer.png`,
  },
  '/offers': {
    title: 'Streamer Partnerships Marketplace | Streamers Center',
    description: 'Discover verified casino, gaming, streaming tool and creator service partnerships available through Streamers Center.',
  },
  '/premium': {
    title: 'Premium Streamer Tools and Overlays | Streamers Center',
    description: 'Premium streamer tools for overlays, bonus hunt widgets, browser-source scenes, tournaments, giveaways and community management.',
  },
  '/privacy': {
    title: 'Privacy Policy | Streamers Center',
    description: 'How Streamers Center and Streamers Center Browser collect, use, store, protect and let users control their data.',
  },
  '/terms': {
    title: 'Terms of Service | Streamers Center',
    description: 'Terms and conditions for using Streamers Center web features, overlays, subscriptions and Streamers Center Browser.',
  },
};

const NOINDEX_PREFIXES = [
  '/admin',
  '/analytics',
  '/developer',
  '/login',
  '/overlay',
  '/overlay-center',
  '/player/bonus-hunt',
  '/player/subscription',
  '/profile',
  '/spotify-callback',
  '/webmod',
  '/widgets',
];

function topicThings(pathname) {
  return (ROUTE_TOPICS[pathname] || CORE_TOPICS).map((name) => ({
    '@type': 'Thing',
    name,
  }));
}

function getAudience(pathname) {
  if (pathname === '/player') {
    return {
      '@type': 'Audience',
      audienceType: 'casino players and bonus hunt players',
    };
  }

  if (pathname === '/streamer') {
    return {
      '@type': 'Audience',
      audienceType: 'Twitch, Kick and YouTube iGaming content creators',
    };
  }

  return {
    '@type': 'Audience',
    audienceType: 'iGaming streamers, casino content creators and casino players',
  };
}

function buildFaqPage(pathname, canonical) {
  const faqs = FAQ_BY_PATH[pathname];
  if (!faqs?.length) return null;

  return {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

function upsertMeta(selector, attrs) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }
  Object.entries(attrs).forEach(([key, value]) => tag.setAttribute(key, value));
}

function upsertLink(rel, href) {
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

function upsertJsonLd(data) {
  let tag = document.getElementById('streamerscenter-seo-jsonld');
  if (!tag) {
    tag = document.createElement('script');
    tag.id = 'streamerscenter-seo-jsonld';
    tag.type = 'application/ld+json';
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

function getStructuredData(pathname, route, canonical) {
  const pageType = pathname === '/offers' ? 'CollectionPage' : 'WebPage';
  const topics = topicThings(pathname);
  const audience = getAudience(pathname);
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Streamers Center',
      alternateName: ['Streamer Center', 'streamerscenter.com'],
      description: 'Streamers Center creates software for iGaming streamers and casino players, including interactive overlays, bonus hunt tools, slot request widgets, tournaments, giveaways, chat games and private casino session tracking.',
      url: `${SITE_URL}/`,
      logo: BRAND_LOGO,
      image: BRAND_ICON,
      icon: BRAND_ICON,
      thumbnailUrl: BRAND_ICON,
      foundingDate: '2026',
      slogan: 'Interactive iGaming overlays and tracking tools for streamers and players.',
      knowsAbout: CORE_TOPICS,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Streamers Center',
      description: 'Interactive iGaming overlays, bonus hunt tools, slot request widgets, tournaments, giveaways, chat games and private tracking tools for streamers and players.',
      inLanguage: 'en',
      keywords: CORE_TOPICS.join(', '),
      about: CORE_TOPICS.map((name) => ({ '@type': 'Thing', name })),
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': pageType,
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: route.title,
      description: route.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      inLanguage: 'en',
      keywords: (ROUTE_TOPICS[pathname] || CORE_TOPICS).join(', '),
      about: topics,
      audience,
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: route.image || DEFAULT_IMAGE,
      },
    },
  ];

  if (pathname === '/' || pathname === '/player') {
    graph.push({
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/player#bonus-hunt-tracker`,
      name: 'Streamers Center Bonus Hunt Tracker',
      url: `${SITE_URL}/player`,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      description: 'A casino bonus hunt tracker for deposits, withdrawals, wins, losses, providers, brands, break-even targets, multipliers and profit/loss records.',
      applicationSubCategory: 'Casino session accounting, slot tracking and profit/loss tracking',
      audience: {
        '@type': 'Audience',
        audienceType: 'casino players and bonus hunt players',
      },
      featureList: [
        'Bonus hunt tracker',
        'Slot tracker',
        'Financial tracker',
        'Profit loss tracker',
        'Casino profit and loss tracking',
        'Deposit, withdrawal, win and loss records',
        'Daily, weekly, monthly and yearly filters',
        'Casino brand and provider tracking',
      ],
      offers: {
        '@type': 'Offer',
        price: '3',
        priceCurrency: 'EUR',
        category: 'Subscription',
      },
      publisher: { '@id': `${SITE_URL}/#organization` },
    });
  }

  if (pathname === '/' || pathname === '/streamer') {
    graph.push({
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/streamer#streamer-tools`,
      name: 'Streamers Center Streamer Tools',
      url: `${SITE_URL}/streamer`,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      description: 'Streamer tools for iGaming creators, including overlays, bonus hunt trackers, slot requests, tournaments, giveaways, chat tools and viewer games.',
      applicationSubCategory: 'Live streaming iGaming overlays and casino overlay tracker tools',
      audience: {
        '@type': 'Audience',
        audienceType: 'Twitch, Kick and YouTube iGaming content creators',
      },
      featureList: [
        'Streamer overlays',
        'iGaming overlays',
        'Casino overlays',
        'Overlay tracker',
        'Browser-source widgets',
        'Bonus hunt tracker for streams',
        'Slot requests and chat commands',
        'Tournaments, giveaways and viewer games',
        'iGaming partner and deal discovery',
      ],
      publisher: { '@id': `${SITE_URL}/#organization` },
    });
  }

  if (pathname === '/offers') {
    graph.push({
      '@type': 'ItemList',
      '@id': `${SITE_URL}/offers#streamer-partnerships`,
      name: 'Streamer partnerships marketplace',
      description: 'Verified casino, gaming, streaming tool and creator service partnerships for streamers.',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Casino partnerships' },
        { '@type': 'ListItem', position: 2, name: 'Gaming partnerships' },
        { '@type': 'ListItem', position: 3, name: 'Streaming tools partnerships' },
        { '@type': 'ListItem', position: 4, name: 'Creator services partnerships' },
      ],
    });
  }

  const faqPage = buildFaqPage(pathname, canonical);
  if (faqPage) graph.push(faqPage);

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function applyRouteSeo(pathname) {
  const route = SEO_BY_PATH[pathname] || SEO_BY_PATH['/'];
  const noindex = NOINDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const canonical = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;

  document.title = noindex ? `${route.title} | Private area` : route.title;
  upsertMeta('meta[name="description"]', { name: 'description', content: route.description });
  upsertMeta('meta[name="keywords"]', {
    name: 'keywords',
    content: (ROUTE_TOPICS[pathname] || CORE_TOPICS).join(', '),
  });
  upsertMeta('meta[name="robots"]', {
    name: 'robots',
    content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
  });
  upsertLink('canonical', canonical);

  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: route.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: route.description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: route.image || DEFAULT_IMAGE });
  upsertMeta('meta[property="og:image:secure_url"]', { property: 'og:image:secure_url', content: route.image || DEFAULT_IMAGE });
  upsertMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' });
  upsertMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '630' });
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: `${route.title} preview` });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: route.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: route.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: route.image || DEFAULT_IMAGE });
  upsertJsonLd(getStructuredData(pathname, route, canonical));
}
