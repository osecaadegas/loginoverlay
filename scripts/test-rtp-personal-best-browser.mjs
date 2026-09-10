import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const origin = new URL(baseUrl).origin;
const publicA = `bo_${'a'.repeat(48)}`;
const publicB = `bo_${'b'.repeat(48)}`;
const legacyB = 'c'.repeat(48);
const records = { 'owner-a': 120, 'owner-b': 950 };
const requests = { public: 0, private: 0, writes: 0 };
let failPublic = false, responseDelay = 0;
const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  const diagnostics = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (['error', 'warn'].includes(message.type())) diagnostics.push(message.text()); });
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    const json = (body, status = 200) => request.respond({
      status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body),
    });
    if (request.method() === 'OPTIONS') {
      await request.respond({ status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
        'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
      } });
    } else if (url.pathname === '/__rtp-best-test') {
      await request.respond({ contentType: 'text/html', body: `<html><head>
        <link rel="stylesheet" href="/src/components/OverlayCenter/OverlayCenter.css">
        </head><body style="margin:0;background:#111"><div id="root" style="width:100%;height:90px"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh';
        RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    } else if (url.pathname === '/api/slot-personal-best') {
      requests.public += 1;
      const owner = url.searchParams.get('publicOverlayId') === publicA ? 'owner-a' : 'owner-b';
      const name = url.searchParams.get('slotName');
      const best = name === 'Mad Blast' ? { slot_name: name, slot_provider: 'Reel Gaming', best_win: records[owner], best_multiplier: 475 } : null;
      if (responseDelay) await new Promise((resolve) => setTimeout(resolve, responseDelay));
      await json({ best }, failPublic ? 503 : 200);
    } else if (url.pathname === '/rest/v1/user_slot_records') {
      requests.private += 1;
      const owner = url.searchParams.get('user_id')?.replace(/^eq\./, '');
      await json([{ slot_name: 'Mad Blast', slot_provider: 'Reel Gaming', best_win: records[owner] || 0, best_multiplier: 60 }]);
    } else if (url.pathname === '/rest/v1/slots') {
      await json({ id: '11111111-1111-4111-8111-111111111111', name: 'Mad Blast', provider: 'Reel Gaming', rtp: 96, volatility: 'high', max_win_multiplier: 10000 });
    } else if (url.pathname === '/rest/v1/overlay_widgets') {
      requests.writes += 1;
      await json([]);
    } else if (url.origin === origin) {
      await request.continue();
    } else {
      await request.abort();
    }
  });
  await page.goto(`${baseUrl}/__rtp-best-test`, { waitUntil: 'networkidle0' });
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  await page.evaluate(async (version) => {
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { default: Widget } = await import('/src/components/OverlayCenter/widgets/rtp-stats/RtpStatsWidget.jsx');
    const { supabase } = await import('/src/config/supabaseClient.js');
    const timers = new Set();
    const realSetInterval = window.setInterval;
    const realClearInterval = window.clearInterval;
    window.setInterval = (callback, duration, ...args) => {
      if (duration === 60000) { timers.add(callback); return callback; }
      return realSetInterval(callback, duration, ...args);
    };
    window.clearInterval = (id) => { timers.delete(id); realClearInterval(id); };
    let onRecordChange;
    supabase.channel = () => {
      const channel = { on: (_type, _filter, callback) => { onRecordChange = callback; return channel; }, subscribe: () => channel };
      return channel;
    };
    supabase.removeChannel = () => { onRecordChange = null; };
    const root = ReactDOM.createRoot(document.getElementById('root'));
    window.rtpTest = {
      render: (props) => root.render(React.createElement(Widget, {
        allWidgets: [{ widget_type: 'bonus_hunt', config: { bonuses: [{
          id: 123, slotName: props.slotName || 'Mad Blast',
          slot: { id: '11111111-1111-4111-8111-111111111111', name: props.slotName || 'Mad Blast', provider: 'Reel Gaming', rtp: 96, volatility: 'high', max_win_multiplier: 10000 },
          opened: false,
        }] } }],
        ...props,
      })),
      refresh: () => { for (const callback of timers) callback(); },
      emit: () => onRecordChange?.({ eventType: 'UPDATE', new: { slot_name: 'Mad Blast', slot_provider: 'Reel Gaming' } }),
      unmount: () => root.unmount(),
    };
  }, browserHash);

  const render = (props) => page.evaluate((value) => window.rtpTest.render(value), props);
  const waitBest = async (value) => {
    try {
      await page.waitForFunction((amount) => document.querySelector('[data-appearance-part="personalBest"]')?.textContent.includes(amount), { timeout: 10000 }, String(value));
    } catch (error) {
      console.error({ expected: value, requests, diagnostics, text: await page.$eval('#root', (element) => element.textContent) });
      throw error;
    }
  };
  const bestText = () => page.$eval('[data-appearance-part="personalBest"]', (element) => element.textContent);
  for (const displayStyle of ['v1', 'metal', 'StyleSecaRTP', 'better_rtp', 'neon', 'minimal', 'glass', 'vertical']) {
    await render({ userId: 'owner-b', publicOverlayId: publicB, widgetId: 'rtp-instance', config: { displayStyle } });
    await waitBest(950);
  }
  assert.equal(requests.private, 0, 'OBS must not query the private table');
  assert.equal(requests.writes, 0, 'OBS must never write widget config');
  assert.equal(requests.public, 1, 'Changing appearance or identical slot objects must not refetch');

  await render({ userId: 'owner-a', publicOverlayId: publicA, config: {} });
  await waitBest(120);
  responseDelay = 500;
  await render({ userId: 'owner-b', publicOverlayId: publicB, config: {} });
  await page.waitForFunction(() => !document.querySelector('[data-appearance-part="personalBest"]')?.textContent.includes('120'));
  await waitBest(950);
  await render({ userId: 'owner-a', publicOverlayId: publicA, config: {} });
  await render({ userId: 'owner-b', publicOverlayId: publicB, slotName: 'Never Played', config: {} });
  await page.waitForNetworkIdle();
  assert.doesNotMatch(await bestText(), /120|950/, 'Late previous-slot response cannot leak into the next slot');
  responseDelay = 0;

  await render({ userId: 'owner-b', overlayToken: legacyB, config: {} });
  await waitBest(950);
  failPublic = true;
  await page.evaluate(() => window.rtpTest.refresh());
  await page.waitForNetworkIdle();
  assert.match(await bestText(), /950/, 'Transient outage preserves the same slot best');
  failPublic = false;
  records['owner-b'] = 975;
  await page.evaluate(() => window.rtpTest.refresh());
  await waitBest(975);

  await render({ userId: 'owner-a', config: { displayStyle: 'better_rtp' } });
  await waitBest(120);
  records['owner-a'] = 250;
  await page.evaluate(() => window.rtpTest.emit());
  await waitBest(250);

  responseDelay = 500;
  await render({ userId: 'owner-b', publicOverlayId: publicB, config: {
    _cachedBestWin: { userId: 'owner-b', slotName: 'Mad Blast', best_win: 333, best_multiplier: 100 },
  } });
  await waitBest(333);
  await waitBest(975);
  await render({ userId: 'owner-a', publicOverlayId: publicA, config: {
    _cachedBestWin: { userId: 'owner-b', slotName: 'Mad Blast', best_win: 99999 },
  } });
  await page.waitForNetworkIdle();
  assert.doesNotMatch(await bestText(), /99999/, 'A different owner cache is rejected');
  await waitBest(250);

  await page.setViewport({ width: 390, height: 844 });
  await page.$eval('#root', (element) => { element.style.height = '450px'; });
  await render({ userId: 'owner-a', publicOverlayId: publicA, config: { displayStyle: 'vertical' } });
  await waitBest(250);
  const bounds = await page.$eval('[data-appearance-part="personalBest"]', (element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right };
  });
  assert.ok(bounds.width > 0 && bounds.height > 0 && bounds.left >= 0 && bounds.right <= 390);
  if (process.env.RTP_SCREENSHOT) await page.screenshot({ path: process.env.RTP_SCREENSHOT });
  await page.evaluate(() => window.rtpTest.unmount());
  assert.deepEqual(errors, []);
  console.log('RTP browser checks passed: 8 styles, both OBS tokens, editor realtime, owner/slot changes, cached fallback, retry, mobile.');
} finally {
  await browser.close();
}
