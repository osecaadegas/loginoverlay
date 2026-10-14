import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nH0AAAAASUVORK5CYII=', 'base64');
const slots = Array.from({ length: 999 }, (_, index) => ({
  id: `working-${index}`,
  name: `Working Slot ${String(index).padStart(4, '0')}`,
  provider: 'Test Provider',
  image: '/__slot-image-working.png',
  status: 'live',
  volatility: 'medium',
  rtp: 96,
  max_win_multiplier: 5000,
}));
slots.push(
  { ...slots[0], id: 'broken-1', name: 'Broken Slot One', image: '/__slot-image-broken.png' },
  { ...slots[0], id: 'broken-2', name: 'Broken Slot Two', image: '/__slot-image-broken.png' },
  { ...slots[0], id: 'missing-1', name: 'Missing Slot Art', image: '' },
);

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  const slotOffsets = [];
  let brokenImageRequests = 0;
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/__slot-image-health-test') {
      return request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#07101c"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    }
    if (url.pathname === '/__slot-image-working.png') {
      return request.respond({ status: 200, contentType: 'image/png', body: onePixelPng });
    }
    if (url.pathname === '/__slot-image-broken.png') {
      brokenImageRequests += 1;
      return request.respond({ status: 404, contentType: 'text/plain', body: 'missing' });
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const headers = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-expose-headers': 'content-range',
        'content-type': 'application/json',
      };
      if (request.method() === 'OPTIONS') return request.respond({ status: 200, headers });
      if (url.pathname.endsWith('/rpc/get_slot_provider_counts')) {
        return request.respond({ status: 200, headers, body: JSON.stringify([{ provider: 'Test Provider', slot_count: slots.length }]) });
      }
      if (url.pathname.endsWith('/slot_providers')) {
        return request.respond({ status: 200, headers: { ...headers, 'content-range': '0-0/1' }, body: JSON.stringify([{
          id: 'provider-1', name: 'Test Provider', slug: 'test-provider', logo_url: '', website_url: '', is_active: true, aliases: [],
        }]) });
      }
      if (url.pathname.endsWith('/slots')) {
        const offset = Number(url.searchParams.get('offset')) || 0;
        const limit = Number(url.searchParams.get('limit')) || 1000;
        slotOffsets.push(offset);
        const data = slots.slice(offset, offset + limit);
        headers['content-range'] = `${offset}-${Math.max(offset, offset + data.length - 1)}/${slots.length}`;
        return request.respond({ status: 200, headers, body: JSON.stringify(data) });
      }
      return request.respond({ status: 404, headers, body: JSON.stringify({ message: `Unexpected ${url.pathname}` }) });
    }
    if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) return request.continue();
    if (['data:', 'blob:'].includes(url.protocol)) return request.continue();
    return request.abort();
  });

  await page.goto(`${baseUrl}/__slot-image-health-test`, { waitUntil: 'domcontentloaded' });
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  await page.evaluate(async version => {
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { default: SlotManager } = await import('/src/components/SlotManager/SlotManagerV2.jsx');
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(SlotManager));
  }, browserHash);
  await page.waitForSelector('.sm-row');

  await page.click('.sm-broken-links-filter');
  await page.waitForFunction(() => document.querySelector('.sm-broken-links-filter')?.getAttribute('aria-pressed') === 'true'
    && !document.querySelector('.sm-image-scan')
    && document.querySelectorAll('.sm-row').length === 3, { timeout: 20000 });

  assert.ok(slotOffsets.includes(1000), `Expected a second full-catalog batch, got offsets ${slotOffsets.join(',')}`);
  assert.deepEqual(await page.$$eval('.sm-row', rows => rows.map(row => row.querySelector('.sm-slot-title-row > span')?.textContent).sort()),
    ['Broken Slot One', 'Broken Slot Two', 'Missing Slot Art']);
  assert.deepEqual(await page.$$eval('.sm-broken-link-badge', badges => badges.map(badge => badge.textContent.trim()).sort()),
    ['Image failed to load', 'Image failed to load', 'Missing image URL']);
  assert.match(await page.$eval('.sm-count', element => element.textContent), /1-3 of 3/);
  assert.ok(brokenImageRequests <= 2, 'The scan should share duplicate URL probes; the rendered fallback row may add one browser request');

  const requestsBeforeRescan = brokenImageRequests;
  await page.click('.sm-rescan-links');
  await page.waitForFunction(() => document.querySelector('.sm-rescan-links')?.disabled);
  await page.waitForFunction(() => !document.querySelector('.sm-rescan-links')?.disabled && document.querySelectorAll('.sm-row').length === 3);
  assert.equal(brokenImageRequests, requestsBeforeRescan + 1, 'Rescan must clear the image health cache and probe the broken URL again');

  await page.setViewport({ width: 390, height: 900 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const filterLayout = await page.$eval('.sm-control-panel', panel => ({
    width: panel.getBoundingClientRect().width,
    buttonRight: panel.querySelector('.sm-broken-links-filter').getBoundingClientRect().right,
    panelRight: panel.getBoundingClientRect().right,
  }));
  assert.ok(filterLayout.buttonRight <= filterLayout.panelRight + 1, JSON.stringify(filterLayout));
  assert.deepEqual(pageErrors, []);
  console.log('Slot Manager browser audit passed: full 1002-slot scan, broken/missing filtering, shared URL cache, rescan and responsive filter layout.');
} finally {
  await browser.close();
}
