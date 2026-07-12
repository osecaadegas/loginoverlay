const SITE_URL = 'https://streamerscenter.com';
const DEFAULT_TITLE = 'Bonus Hunt Tracker & Streamer Tools | Streamers Center';
const DEFAULT_DESCRIPTION = 'Streamers Center combines a bonus hunt tracker, casino profit/loss financial tracking, streamer overlays, chat tools, tournaments, giveaways and iGaming deal discovery.';
const DEFAULT_IMAGE = `${SITE_URL}/Hero.png`;

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
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Streamers Center',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/StreamerCenterLogo.png`,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Streamers Center',
      description: 'Bonus hunt tracker, streamer tools, iGaming deal discovery and casino profit/loss financial tracking for players and creators.',
      inLanguage: 'en',
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
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: `${route.title} preview` });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: route.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: route.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: route.image || DEFAULT_IMAGE });
  upsertJsonLd(getStructuredData(pathname, route, canonical));
}
