const SITE_URL = 'https://streamerscenter.com';
const DEFAULT_TITLE = 'iGaming Overlays, Bonus Hunt Tracker & Casino Profit/Loss Tracker | Streamers Center';
const DEFAULT_DESCRIPTION = 'iGaming and casino overlays, bonus hunt tracker, slot tracker, financial tracker and profit/loss tracker for Twitch, Kick and YouTube streamers and casino players.';
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
      answer: 'Streamers Center is a web app for Twitch, Kick and YouTube iGaming content creators and casino players. It combines iGaming overlays, casino overlays, bonus hunt tracking, slot tracking, slot requests, tournaments, giveaways, chat tools and casino profit/loss tracking.',
    },
    {
      question: 'Who is Streamers Center for?',
      answer: 'Streamers Center is built for casino and slot streamers who need live production tools, and for players who want a private bonus hunt tracker and casino session accounting dashboard.',
    },
    {
      question: 'Is Streamers Center an audio or retail store?',
      answer: 'No. Streamers Center is software for livestream creators and casino players. It is not an audio equipment shop, Hi-Fi retailer or physical party decoration store.',
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
    description: 'How Streamers Center collects, uses and protects user data.',
  },
  '/terms': {
    title: 'Terms of Service | Streamers Center',
    description: 'Terms and conditions for using the Streamers Center platform.',
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
      description: 'Streamers Center creates software for iGaming streamers and casino players, including iGaming overlays, casino overlays, bonus hunt trackers, slot trackers, financial trackers, slot requests, tournaments, giveaways and casino profit/loss tools.',
      url: `${SITE_URL}/`,
      logo: BRAND_LOGO,
      image: BRAND_ICON,
      icon: BRAND_ICON,
      thumbnailUrl: BRAND_ICON,
      foundingDate: '2026',
      slogan: 'iGaming overlays and casino tracking tools for streamers and players.',
      knowsAbout: CORE_TOPICS,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Streamers Center',
      description: 'iGaming overlays, casino overlays, bonus hunt tracker, slot tracker, financial tracker, profit/loss tracker and creator tools for players and streamers.',
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
