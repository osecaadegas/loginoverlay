const SITE_URL = 'https://osecaadegas.pt';
const DEFAULT_TITLE = 'O Seca Adegas - Overlays e ferramentas para streamers';
const DEFAULT_DESCRIPTION = 'O Seca Adegas ajuda streamers de casino a gerir overlays, bonus hunts, pedidos de slots, torneios, giveaways e ferramentas para comunidades iGaming.';
const DEFAULT_IMAGE = `${SITE_URL}/Hero.png`;

const SEO_BY_PATH = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  '/offers': {
    title: 'Ofertas de casino para streamers | O Seca Adegas',
    description: 'Explora ofertas e parcerias de casino organizadas para comunidades iGaming e streamers.',
  },
  '/premium': {
    title: 'Premium para streamers | O Seca Adegas',
    description: 'Ferramentas premium para streamers: overlays, bonus hunts, widgets e gestão da comunidade.',
  },
  '/privacy': {
    title: 'Politica de Privacidade | O Seca Adegas',
    description: 'Como o O Seca Adegas recolhe, usa e protege dados dos utilizadores.',
  },
  '/terms': {
    title: 'Termos de Servico | O Seca Adegas',
    description: 'Termos e condicoes de utilizacao da plataforma O Seca Adegas.',
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

  document.title = noindex ? `${route.title} | Area privada` : route.title;
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
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: route.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: route.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: DEFAULT_IMAGE });
}
