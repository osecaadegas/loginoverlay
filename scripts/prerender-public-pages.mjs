import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SEO_BY_PATH } from '../src/utils/seo.js';

const base = 'https://streamerscenter.com';
const publicPaths = Object.keys(SEO_BY_PATH);
const output = join(process.cwd(), 'dist');
const template = await readFile(join(output, 'index.html'), 'utf8');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const replaceMeta = (html, key, value, attribute = 'name') => {
  const escaped = escapeHtml(value);
  const expression = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*/?>`, 'i');
  return expression.test(html) ? html.replace(expression, `<meta ${attribute}="${key}" content="${escaped}" />`) : html.replace('</head>', `<meta ${attribute}="${key}" content="${escaped}" />\n</head>`);
};

function render(path) {
  const { title, description, image = `${base}/social-preview.png` } = SEO_BY_PATH[path];
  const canonical = `${base}${path === '/' ? '/' : path}`;
  const heading = title.split('|')[0].trim();
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, 'description', description);
  html = replaceMeta(html, 'og:title', title, 'property');
  html = replaceMeta(html, 'og:description', description, 'property');
  html = replaceMeta(html, 'og:url', canonical, 'property');
  html = replaceMeta(html, 'og:image', image, 'property');
  html = replaceMeta(html, 'twitter:title', title);
  html = replaceMeta(html, 'twitter:description', description);
  html = replaceMeta(html, 'twitter:image', image);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>(?:\s*)/i, `<link rel="canonical" href="${canonical}" />\n`);
  const content = `<main id="public-prerender" aria-label="${escapeHtml(heading)}"><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p><nav aria-label="Explore Streamers Center"><a href="/streamer-overlays">Explore overlays</a> <a href="/player">Player tools</a> <a href="/streamer">Streamer tools</a> <a href="/premium">Plans</a></nav></main>`;
  html = html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
  const schema = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: title,
    description, url: canonical, inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: 'Streamers Center', url: `${base}/` },
  };
  html = html.replace(/<script id="streamerscenter-seo-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script id="streamerscenter-seo-jsonld" type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`);
  return html;
}

await writeFile(join(output, 'index.html'), render('/'));
await mkdir(join(output, 'seo'), { recursive: true });
for (const path of publicPaths.filter(path => path !== '/')) {
  await writeFile(join(output, 'seo', `${path.slice(1)}.html`), render(path));
}
// lastmod is intentionally omitted: a deploy date is not evidence that page
// content changed, and stale hardcoded dates are worse than no date.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPaths.map(path => `  <url><loc>${base}${path === '/' ? '/' : path}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(join(output, 'sitemap.xml'), sitemap);
await writeFile(join(process.cwd(), 'public', 'sitemap.xml'), sitemap);
console.log(`Generated initial HTML for ${publicPaths.length} public routes and sitemap.xml`);
