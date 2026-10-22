// Preview assets are static captures from the production editor/OBS renderer.
// A preset is published in this catalog only when it also has a safe, complete
// scene image and a real editor composition.
export const OVERLAY_SHOWCASE_CATALOG = Object.freeze([
  { id: 'galactic_command', name: 'Galactic Command', category: 'Gaming', thumbnail: '/overlays/showcase/galactic-command-thumb.webp', fullPreview: '/overlays/showcase/galactic-command.webp', published: true, featuredRank: 1, publishedAt: '2026-10-19', destination: '/editor?theme=galactic_command', description: 'A spacecraft command deck with a transparent gameplay viewport.' },
  { id: 'street_art', name: 'Street Art', category: 'Casino', thumbnail: '/overlays/showcase/street-art-thumb.webp', fullPreview: '/overlays/showcase/street-art.webp', published: true, featuredRank: 2, publishedAt: '2026-10-18', destination: '/editor?theme=street_art', description: 'Distressed metal, torn headers and paint accents.' },
  { id: 'starter_studio', name: 'Starter Studio', category: 'Custom', thumbnail: '/overlays/showcase/starter-studio-thumb.webp', fullPreview: '/overlays/showcase/starter-studio.webp', published: true, featuredRank: 3, publishedAt: '2026-10-18', destination: '/editor?theme=starter_studio', description: 'A clean broadcast layout with teal and champagne details.' },
  { id: 'solverde', name: 'Solverde', category: 'Casino', thumbnail: '/overlays/showcase/solverde-thumb.webp', fullPreview: '/overlays/showcase/solverde.webp', published: true, landingPage: false, featuredRank: 4, publishedAt: '2026-10-18', destination: '/editor?theme=solverde', description: 'An emerald broadcast scene with a wide hunt dock.' },
  { id: 'candy', name: 'Candy', category: 'Casino', thumbnail: '/overlays/showcase/candy-thumb.webp', fullPreview: '/overlays/showcase/candy.webp', published: true, featuredRank: 5, publishedAt: '2026-10-17', destination: '/editor?theme=candy', description: 'Glossy candy colours with themed frames and chat accents.' },
  { id: 'volcanic', name: 'Volcanic', category: 'Casino', thumbnail: '/overlays/showcase/volcanic-thumb.webp', fullPreview: '/overlays/showcase/volcanic.webp', published: true, featuredRank: 6, publishedAt: '2026-10-19', destination: '/editor?theme=volcanic', description: 'Dark basalt surfaces with ember details.' },
  { id: 'orbital', name: 'Space / Orbital', category: 'Gaming', thumbnail: null, fullPreview: null, published: false, featuredRank: null, publishedAt: '2026-10-19', destination: '/editor?theme=orbital', description: 'An orbital composition with a broad gameplay window.' },
]);

export function isLandingShowcaseTheme(theme) {
  return Boolean(theme.published && theme.landingPage !== false && theme.thumbnail && theme.fullPreview);
}

export const OVERLAY_SHOWCASE_CATEGORIES = Object.freeze([
  'All', ...new Set(OVERLAY_SHOWCASE_CATALOG.filter(isLandingShowcaseTheme).map(theme => theme.category)),
]);

export function getFeaturedOverlayThemes(limit = 6) {
  return OVERLAY_SHOWCASE_CATALOG.filter(isLandingShowcaseTheme)
    .sort((a, b) => a.featuredRank - b.featuredRank).slice(0, limit);
}

export function isNewOverlayTheme(theme, now = Date.now()) {
  const publishedAt = Date.parse(`${theme.publishedAt}T00:00:00Z`);
  const newestPublishedAt = Math.max(...OVERLAY_SHOWCASE_CATALOG.filter(isLandingShowcaseTheme).map(item => Date.parse(`${item.publishedAt}T00:00:00Z`)).filter(Number.isFinite));
  return isLandingShowcaseTheme(theme) && Number.isFinite(publishedAt) && publishedAt === newestPublishedAt && now >= publishedAt && now - publishedAt < 30 * 24 * 60 * 60 * 1000;
}
