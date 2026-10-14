import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3011';
const origin = new URL(base).origin;
const coverSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#be8a35"/><stop offset=".55" stop-color="#5d3527"/><stop offset="1" stop-color="#101c32"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><circle cx="200" cy="205" r="112" fill="#181a22" opacity=".7"/><path d="M92 435h216v72H92z" fill="#080d18" opacity=".82"/><text x="200" y="470" text-anchor="middle" fill="#f0b54a" font-family="Arial" font-size="35" font-weight="900">BOUNTY</text><text x="200" y="540" text-anchor="middle" fill="white" font-family="Arial" font-size="17" font-weight="700">HACKSAW GAMING</text></svg>';

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 720, height: 940, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/__current-game-portrait-test') return request.respond({ contentType: 'text/html', body: '<html><body style="margin:0;background:#10141b"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>' });
    if (url.pathname === '/portrait-cover.svg') return request.respond({ contentType: 'image/svg+xml', body: coverSvg });
    if (url.pathname === '/rest/v1/slots') return request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: 'null' });
    if (url.origin === origin) return request.continue();
    return request.abort();
  });
  await page.goto(`${base}/__current-game-portrait-test`);
  const entry = await (await fetch(`${base}/src/main.jsx`)).text();
  const react = entry.match(/from "([^"\n]*\/react.js\?[^"\n]*)"/)[1];
  const dom = entry.match(/from "([^"\n]*\/react-dom_client.js\?[^"\n]*)"/)[1];
  await page.evaluate(async ({ react, dom }) => {
    const { default: React } = await import(react);
    const { default: DOM } = await import(dom);
    const registry = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const root = DOM.createRoot(document.getElementById('root'));
    const config = {
      displayStyle: 'portrait_card',
      slot: { id: 'preview', name: 'Bounty', provider: 'Hacksaw Gaming', image: '/portrait-cover.svg', rtp: 96.5, volatility: 'High', max_win_multiplier: 15000 },
      __previewPersonalBest: { best_multiplier: 108 },
    };
    window.renderPortrait = (width, height, runtime = 'editor') => {
      const instance = registry.createBetterInstance('current_slot', { width, height, config });
      window.portraitInstance = instance;
      root.render(React.createElement('div', { id: 'frame', style: { width, height } }, registry.renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, runtime, accessVerified: true })));
    };
    window.renderPortrait(225, 400, 'editor');
  }, { react, dom });
  await page.waitForSelector('.cg-widget--portrait .cg-portrait-cover');
  await page.waitForFunction(() => document.querySelector('.cg-portrait-cover')?.complete);
  const inspect = async () => page.evaluate(() => {
    const widget = document.querySelector('.cg-widget--portrait');
    const art = widget.querySelector('.cg-portrait-art');
    const box = widget.getBoundingClientRect();
    const artBox = art.getBoundingClientRect();
    return {
      instanceStyle: window.portraitInstance.config.displayStyle,
      instanceSize: [window.portraitInstance.width, window.portraitInstance.height],
      widget: [box.width, box.height],
      art: [artBox.width, artBox.height],
      objectFit: getComputedStyle(widget.querySelector('.cg-portrait-cover')).objectFit,
      labels: [...widget.querySelectorAll('.cg-stat > span')].map(node => node.textContent.trim()),
      overflow: widget.scrollWidth > widget.clientWidth + 1 || widget.scrollHeight > widget.clientHeight + 1,
    };
  });
  const editor = await inspect();
  assert.equal(editor.instanceStyle, 'portrait_card');
  assert.deepEqual(editor.instanceSize, [225, 400]);
  assert.deepEqual(editor.widget, [225, 400]);
  assert.ok(editor.art[0] > 210 && editor.art[1] > 265, 'Artwork fills the portrait card');
  assert.equal(editor.objectFit, 'cover');
  assert.deepEqual(editor.labels, ['Max win', 'RTP', 'Volat.', 'Best']);
  assert.equal(editor.overflow, false);
  await (await page.$('#frame')).screenshot({ path: '.codex-dev/current-slot-portrait-editor.png' });

  await page.evaluate(() => window.renderPortrait(450, 800, 'obs'));
  await page.waitForFunction(() => document.querySelector('#frame')?.clientWidth === 450);
  const obs = await inspect();
  assert.equal(obs.instanceStyle, 'portrait_card');
  assert.deepEqual(obs.instanceSize, [450, 800]);
  assert.deepEqual(obs.widget, [450, 800]);
  assert.equal(obs.objectFit, 'cover');
  assert.equal(obs.overflow, false);
  await (await page.$('#frame')).screenshot({ path: '.codex-dev/current-slot-portrait-obs.png' });
  assert.deepEqual(errors, []);
  console.log('Portrait Current Game passed through the shared editor and OBS renderer at 225x400 and 450x800.');
} finally {
  await browser.close();
}
