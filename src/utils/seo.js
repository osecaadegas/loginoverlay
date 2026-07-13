const SITE_URL = 'https://streamerscenter.com';
const DEFAULT_TITLE = 'Streamer Tools for iGaming Creators & Bonus Hunt Tracker | Streamers Center';
const DEFAULT_DESCRIPTION = 'Streamer tools for Twitch, Kick and YouTube iGaming creators plus bonus hunt tracking and casino profit/loss dashboards. Run overlays, slot requests, tournaments and giveaways.';
const DEFAULT_IMAGE = `${SITE_URL}/social-preview.png`;

const CORE_TOPICS = [
  'Twitch streamer tools',
  'Kick streamer tools',
  'YouTube live streamer tools',
  'iGaming content creator software',
  'casino streamer overlays',
  'bonus hunt tracker',
  'slot request overlay',
  'casino profit and loss tracker',
];

const ROUTE_TOPICS = {
  '/': CORE_TOPICS,
  '/player': [
    'bonus hunt tracker',
    'casino profit and loss tracker',
    'casino session accounting',
    'slot result tracking',
    'deposit and withdrawal tracking',
  ],
  '/streamer': [
    'streamer overlay tools',
    'OBS browser-source overlays',
    'Twitch casino streamer tools',
    'Kick casino streamer tools',
    'slot requests',
    'stream tournaments',
    'giveaway tools for streamers',
  ],
  '/offers': [
    'iGaming offers',
    'casino affiliate deals',
    'streamer partner deals',
  ],
};

const FAQ_BY_PATH = {
  '/': [
    {
      question: 'What is Streamers Center?',
      answer: 'Streamers Center is a web app for Twitch, Kick and YouTube iGaming content creators and casino players. It combines streamer overlays, bonus hunt tracking, slot requests, tournaments, giveaways, chat tools and casino profit/loss tracking.',
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
      answer: 'Players can track starting deposits, extra deposits, withdrawals, bonus costs, payouts, multipliers, break-even targets, best wins, worst results, casino brands, providers and profit/loss records.',
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
      answer: 'Streamers Center provides browser-source overlays, bonus hunt widgets, slot request queues, tournaments, giveaways, chat-connected tools, viewer games, custom themes and iGaming partner discovery.',
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
    title: 'Bonus Hunt Tracker & Casino Profit/Loss Tool | Streamers Center',
    description: 'Track bonus hunts, casino deposits, withdrawals, wins, losses, providers, brands, break-even targets, payouts and profit/loss records from a private player dashboard.',
    image: `${SITE_URL}/player.png`,
  },
  '/streamer': {
    title: 'Streamer Tools for iGaming Creators | Streamers Center',
    description: 'Run iGaming streams with browser-source overlays, bonus hunt trackers, slot requests, tournaments, giveaways, chat tools, viewer games and partner deal discovery.',
    image: `${SITE_URL}/streamer.png`,
  },
  '/offers': {
    title: 'iGaming Deals and Casino Offers for Streamers | Streamers Center',
    description: 'Explore iGaming deals, casino offers and partner information organized for streamer communities and creators.',
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
      description: 'Streamers Center creates software for iGaming streamers and casino players, including streamer overlays, bonus hunt trackers, slot requests, tournaments, giveaways and casino profit/loss tools.',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/StreamerCenterLogo.png`,
      image: DEFAULT_IMAGE,
      knowsAbout: CORE_TOPICS,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Streamers Center',
      description: 'Bonus hunt tracker, casino profit/loss dashboard, streamer overlays and iGaming creator tools for players and streamers.',
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
      applicationSubCategory: 'Casino session accounting and bonus hunt tracking',
      audience: {
        '@type': 'Audience',
        audienceType: 'casino players and bonus hunt players',
      },
      featureList: [
        'Bonus hunt tracker',
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
      applicationSubCategory: 'Live streaming overlay and iGaming creator tools',
      audience: {
        '@type': 'Audience',
        audienceType: 'Twitch, Kick and YouTube iGaming content creators',
      },
      featureList: [
        'Streamer overlays',
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
      '@id': `${SITE_URL}/offers#igaming-deals`,
      name: 'iGaming deals and casino offers',
      description: 'Casino offers, iGaming deals and partner information organized for streamers and online casino communities.',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Casino offers' },
        { '@type': 'ListItem', position: 2, name: 'Streamer partner deals' },
        { '@type': 'ListItem', position: 3, name: 'iGaming community offers' },
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
