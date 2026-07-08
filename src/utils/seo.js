const SITE_URL = 'https://streamerscenter.com';
const DEFAULT_TITLE = 'Streamers Center - Overlays and tools for streamers';
const DEFAULT_DESCRIPTION = 'Streamers Center helps casino streamers manage overlays, bonus hunts, slot requests, tournaments, giveaways and iGaming community tools.';
const DEFAULT_IMAGE = `${SITE_URL}/Hero.png`;

const SEO_BY_PATH = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  '/offers': {
    title: 'Casino offers for streamers | Streamers Center',
    description: 'Explore casino offers and partnerships organized for iGaming communities and streamers.',
  },
  '/premium': {
    title: 'Premium for streamers | Streamers Center',
    description: 'Premium streamer tools: overlays, bonus hunts, widgets and community management.',
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
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: DEFAULT_IMAGE });
}
