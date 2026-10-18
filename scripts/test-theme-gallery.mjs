import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { WIDGET_COLOUR_THEMES, getWidgetColourThemeGroups } from '../src/components/OverlayCenter/widgets/shared/colourThemePalettes.js';

const groups = getWidgetColourThemeGroups();
assert.equal(groups[0].key, 'premium');
assert(groups[0].themes.every(theme => theme.thumbnail));
assert(groups[1].themes.every(theme => !theme.thumbnail));
assert.equal(new Set(groups.flatMap(group => group.themes.map(theme => theme.key))).size, WIDGET_COLOUR_THEMES.length);
assert.deepEqual(getWidgetColourThemeGroups(() => false), []);
assert(!getWidgetColourThemeGroups(key => key !== 'arctic').flatMap(group => group.themes).some(theme => theme.key === 'arctic'));
for (const key of ['street_art','candy', 'orbital', 'arctic', 'old_rome']) {
  const theme = groups[0].themes.find(theme => theme.key === key);
  assert(theme && existsSync('public' + theme.thumbnail), key + ' has a real image');
}
const server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0, hmr: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await puppeteer.launch({ headless: true });
const folder = '.codex-dev/theme-gallery'; mkdirSync(folder, { recursive: true });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/__theme-gallery') return request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#171e22;color:white"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>` });
    if (url.origin === base && !url.pathname.startsWith('/api/')) return request.continue();
    if (['data:', 'blob:'].includes(url.protocol)) return request.continue();
    return request.respond({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' });
  });
  const initialize = async () => {
    const entry = await (await fetch('/src/main.jsx')).text();
    const reactUrl = entry.match(/"([^"\n]*\/react\.js[^"\n]*)"/)[1], version = reactUrl.split('?')[1];
    const React = (await import(reactUrl)).default;
    const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js?' + version)).default;
    const { supabase } = await import('/src/config/supabaseClient.js');
    supabase.rpc = async () => ({ data: [], error: null });
    const { BetterWidgetControls } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    const registry = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const { applyWidgetColourTheme } = await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
    await import('/src/index.css');
    await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
    const root = ReactDOM.createRoot(document.getElementById('root'));
    function Controls() {
      const [config, set] = React.useState(() => JSON.parse(localStorage.getItem('gallery-config') || 'null') || applyWidgetColourTheme('chat', registry.getBetterWidgetDefinition('chat').defaultConfig, 'neon'));
      window.galleryConfig = config;
      return React.createElement(BetterWidgetControls, { type: 'chat', config, onChange: next => { localStorage.setItem('gallery-config', JSON.stringify(next)); set(next); } });
    }
    root.render(React.createElement(Controls));
  };
  await page.goto(base + '/__theme-gallery'); await page.evaluate(initialize);
  await page.waitForSelector('[data-theme-group=premium] button');
  const premiumKeys = groups[0].themes.map(theme => theme.key);
  assert.deepEqual(await page.$$eval('[data-theme-group=premium] button', els => els.map(el => el.dataset.colourThemeKey)), premiumKeys);
  assert(await page.evaluate(() => document.querySelector('[data-theme-group=premium]').compareDocumentPosition(document.querySelector('[data-theme-group=palettes]')) & Node.DOCUMENT_POSITION_FOLLOWING));
  assert.equal(await page.$$eval('[data-theme-group=palettes] [data-palette-preview]',els=>els.length),groups[1].themes.length);
  for(const theme of groups[1].themes){await page.click(`[data-colour-theme-key="${theme.key}"]`);assert.equal(await page.$eval(`[data-colour-theme-key="${theme.key}"]`,el=>el.getAttribute('aria-pressed')),'true');}
  for (const theme of groups[0].themes) {
    assert(await page.evaluate(async url => { const img = new Image(); img.src = url; await img.decode(); return img.naturalWidth > 0; }, theme.thumbnail));
    await page.click(`[data-colour-theme-key="${theme.key}"]`);
    await page.waitForFunction(key => window.galleryConfig?.colourTheme === key, {}, theme.key);
    assert.equal(await page.$eval(`[data-colour-theme-key="${theme.key}"]`, el => el.getAttribute('aria-pressed')), 'true');
    assert(await page.$eval(`[data-colour-theme-key="${theme.key}"]`, el => getComputedStyle(el).backgroundSize.split(',').every(value => value.trim() === 'cover')));
  }
  await page.reload(); await page.evaluate(initialize);
  await page.waitForSelector('[data-theme-group=premium] button[aria-pressed=true]');
  assert.equal(await page.evaluate(() => window.galleryConfig.colourTheme), premiumKeys.at(-1));
  for (const width of [320, 240]) {
    await page.setViewport({ width: 480, height: 1000 });
    await page.evaluate(width => { document.getElementById('root').style.width = width + 'px'; }, width);
    const gallery = await page.$('.bp-controls--colour-theme');
    assert(await page.$$eval('[data-colour-theme-key]', (els, width) => els.every(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right <= width + 1; }), width));
    await gallery.screenshot({ path: `${folder}/theme-gallery-${width}.png` });
  }
  assert.deepEqual(errors, []);
  console.log('Theme gallery: automatic grouping, access filtering, all premium images, selection/reload and 320/240px layouts PASS');
} finally { await browser.close(); await server.close(); }
