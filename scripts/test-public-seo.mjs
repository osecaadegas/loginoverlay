import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SEO_BY_PATH } from '../src/utils/seo.js';

const root = process.cwd();
const vercel = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
const sitemap = await readFile(join(root, 'dist', 'sitemap.xml'), 'utf8');
const routes = new Set(vercel.rewrites.map(rule => `${rule.source}|${rule.destination}`));
const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

for (const [path, seo] of Object.entries(SEO_BY_PATH)) {
  const file = path === '/' ? join(root, 'dist', 'index.html') : join(root, 'dist', 'seo', `${path.slice(1)}.html`);
  const html = await readFile(file, 'utf8');
  const canonical = `https://streamerscenter.com${path === '/' ? '/' : path}`;
  assert.ok(html.includes(`<title>${escapeHtml(seo.title)}</title>`), `${path} title`);
  assert.ok(html.includes(`href="${canonical}"`), `${path} canonical`);
  assert.ok(html.includes('id="public-prerender"'), `${path} initial content`);
  assert.ok(html.includes(seo.description.replace(/&/g, '&amp;')), `${path} description`);
  assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), `${path} sitemap`);
  if (path !== '/') assert.ok(routes.has(`${path}|/seo/${path.slice(1)}.html`), `${path} rewrite`);
}
assert.equal((sitemap.match(/<loc>/g) || []).length, Object.keys(SEO_BY_PATH).length);
console.log(`Verified initial HTML, canonicals, rewrites and sitemap for ${Object.keys(SEO_BY_PATH).length} public routes.`);
