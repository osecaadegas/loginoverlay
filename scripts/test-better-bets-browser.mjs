import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/__better-bets-test') {
      await request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#202125"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    } else if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) {
      await request.continue();
    } else {
      await request.abort();
    }
  });
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${baseUrl}/__better-bets-test`, { waitUntil: 'networkidle0' });
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  await page.evaluate(async (version) => {
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { createBetterInstance, renderBetterWidgetInstance } = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const { BetterWidgetPreview } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    const { default: BetsWidget } = await import('/src/components/OverlayCenter/widgets/bets/BetsWidget.jsx');
    const { getWidgetStyleElements } = await import('/src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js');
    const routing = await import('/src/components/OverlayCenter/appearance/v2/appearanceRouting.js');
    await import('/src/components/OverlayCenter/OverlayRenderer.css');
    await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
    const root = ReactDOM.createRoot(document.getElementById('root'));
    window.betsTest = {
      schema: {
        better: getWidgetStyleElements('bets', 'better_bets').map((element) => element.id),
        legacy: getWidgetStyleElements('bets', 'StyleSecaBets').map((element) => element.id),
      },
      scopedConfig() {
        let config = { displayStyle: 'better_bets' };
        for (const elementId of ['cardAmountText', 'poolShareLabel']) {
          config = routing.setScopedAppearanceConfigValue(config, { widgetType: 'bets', widgetVariant: 'better_bets', elementId, propertyId: 'textColor' }, '#eeccaa');
        }
        return JSON.parse(JSON.stringify(config));
      },
      mount(cases) {
        root.render(React.createElement('main', { style: { display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' } }, cases.map((item, index) => {
          const live = {
            question: 'What will the bonus hunt return?', gameStatus: 'open', timerSeconds: 180,
            _openedAt: Date.now() - 45000, chatCommand: '!pick',
            options: ['Under 100x', '100 - 199x', '200 - 299x', '300 - 499x', '500 - 999x', '1000x or more'],
            bets: { opt_0: 100, opt_1: 200, opt_2: 300, opt_3: 100, opt_4: 200, opt_5: 100 },
            betters: { alice: { option: 0, amount: 100 }, bob: { option: 1, amount: 200 } },
            ...item.live,
          };
          const config = { animations: false, ...item.config };
          const saved = createBetterInstance('bets', { width: item.width, height: item.height, config });
          const instance = JSON.parse(JSON.stringify(saved));
          let widget;
          if (item.runtime === 'preview') {
            widget = React.createElement(BetterWidgetPreview, { type: 'bets', config: { ...instance.config, ...live } });
          } else if (item.runtime === 'legacy') {
            widget = React.createElement(BetsWidget, { config: { ...live, ...config } });
          } else {
            widget = renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, mode: 'live', runtime: item.runtime || 'editor', liveWidgets: [{ id: 'bets-fixture', widget_type: 'bets', config: live }] });
          }
          return React.createElement('div', { key: index, 'data-case': index, style: { width: item.width, height: item.height, flexShrink: 0 } }, widget);
        })));
      },
    };
  }, browserHash);
  const mount = async (cases) => {
    await page.evaluate((cases) => window.betsTest.mount(cases), cases);
    await page.waitForFunction((count) => document.querySelectorAll('[data-case]').length === count, {}, cases.length);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const cases = [];
  for (const [width, height] of [[280, 400], [360, 540], [640, 300], [778, 300]]) {
    for (const layoutMode of ['cards', 'bars']) {
      for (const columns of [1, 2, 3]) {
        for (const fontScale of [100, 140]) {
          cases.push({ width, height, config: { layoutMode, columns, fontScale } });
        }
      }
    }
  }
  for (const theme of ['neon', 'glass', 'metallic', 'matte']) {
    for (const font of ['cyber', 'sport', 'tech', 'classic']) {
      cases.push({ width: 360, height: 600, config: { theme, font, columns: 2, layoutMode: 'cards' }, live: { question: 'A very long question that must stay visible beside the result badge', options: ['AnExtremelyLongOptionWithoutSpacesOrTruncation', 'A second long option that wraps onto multiple lines', 'Another result'], bets: { opt_0: 999999999, opt_1: 10000000 } } });
    }
  }
  await mount(cases);
  const checkGeometry = async () => {
    const failures = await page.evaluate(() => [...document.querySelectorAll('[data-case]')].flatMap((host) => {
      const bounds = host.getBoundingClientRect();
      const panel = host.querySelector('.bet-widget');
      const result = [];
      if (!panel) return [`${host.dataset.case}: missing panel`];
      const p = panel.getBoundingClientRect();
      if (p.left < bounds.left - 1 || p.right > bounds.right + 1 || p.top < bounds.top - 1 || p.bottom > bounds.bottom + 1) result.push(`${host.dataset.case}: frame clips ${JSON.stringify({ p: p.toJSON(), bounds: bounds.toJSON() })}`);
      for (const element of panel.querySelectorAll('h1, .open-status, .meta-item strong, .option-range, .bar-range, .bar-detail, .bar-amount, .bar-pct, .option-details, .option-command, .bet-entry')) {
        const rect = element.getBoundingClientRect();
        if (getComputedStyle(element).display === 'none' || !rect.width || !rect.height) result.push(`${host.dataset.case}: hidden ${element.className}`);
        if (rect.left < p.left - 1 || rect.right > p.right + 1 || rect.top < p.top - 1 || rect.bottom > p.bottom + 1) result.push(`${host.dataset.case}: content clips ${element.className}`);
        if (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2) result.push(`${host.dataset.case}: text overflow ${element.className} ${element.textContent}`);
      }
      for (const card of panel.querySelectorAll('.bet-option, .bet-bar')) {
        const leaves = [...card.querySelectorAll('.option-number, .option-range, .option-details, .option-command, .bar-num, .bar-range, .bar-detail, .bar-pct, .bar-amount, .bar-track')];
        for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
          const a = leaves[i].getBoundingClientRect(), b = leaves[j].getBoundingClientRect();
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) result.push(`${host.dataset.case}: overlapping ${leaves[i].className} / ${leaves[j].className}`);
        }
      }
      return result;
    }));
    assert.deepEqual(failures, []);
  };
  await checkGeometry();
  await page.setViewport({ width: 390, height: 844 });
  await checkGeometry();
  const base = { width: 778, height: 330, config: { layoutMode: 'bars', columns: 2 } };
  await page.setViewport({ width: 1600, height: 1000 });
  await mount([{ ...base, height: 650, config: { ...base.config, orientation: 'vertical' } }, { ...base, height: 650, config: { ...base.config, orientation: 'horizontal' } }]);
  const orientationWidths = await page.$$eval('.bet-widget', (els) => els.map((el) => el.getBoundingClientRect().width));
  assert.ok(orientationWidths[1] > orientationWidths[0] * 1.5, 'Orientation still changes the board layout');
  await checkGeometry();
  await mount([{ ...base, runtime: 'editor' }, { ...base, runtime: 'obs' }, { ...base, runtime: 'preview' }]);
  assert.equal(await page.$$eval('.better-bets-stage', (els) => els.length), 3, 'Package preview, editor and OBS share Better Bets');
  const text = await page.$$eval('.bet-widget', (els) => els.map((el) => el.textContent));
  assert.equal(text[0], text[1]);
  assert.equal(text[0], text[2]);
  assert.match(text[0], /!pick 1 <amount>/, 'Option command persists even after receiving points');
  assert.match(text[0], /Pool share/);
  assert.match(text[0], /2:1[345]/, 'Uses real elapsed countdown');
  assert.equal(await page.$('.bet-entry input'), null, 'OBS hint is not a fake input');
  const timerBefore = await page.$eval('[data-appearance-part="timerStat"] strong', (el) => el.textContent);
  await page.waitForFunction((before) => document.querySelector('[data-appearance-part="timerStat"] strong').textContent !== before, {}, timerBefore);
  await mount([{ ...base, config: { ...base.config, betterVisibleOptions: 2 }, live: { bets: { opt_0: 100, opt_1: 100, opt_2: 800 } } }]);
  assert.deepEqual(await page.$$eval('.bar-pct', (els) => els.map((el) => el.textContent)), ['10%', '10%'], 'Pool share includes points on options outside the visible limit');
  assert.match(await page.$eval('.bar-detail', (el) => el.textContent), /!pick 1 <amount>/, 'Live pool updates keep the command visible');
  await mount([{ ...base, live: { gameStatus: 'locked' } }]);
  assert.equal(await page.$eval('.bet-entry', (el) => el.textContent), 'Bets closed');
  assert.equal(await page.$('.bet-entry strong').then((el) => el !== null), true);
  await mount([{ ...base, live: { gameStatus: 'result', winnerOption: 0 } }]);
  assert.equal(await page.$$eval('.is-winner', (els) => els.length), 1, 'Winner zero remains valid');
  assert.equal(await page.$$eval('.is-loser', (els) => els.every((el) => getComputedStyle(el).opacity === '1')), true, 'Other options remain readable');
  assert.match(await page.$eval('.bet-entry', (el) => el.textContent), /Winner #1Under 100x/);
  assert.equal(await page.$('.bets-victory'), null, 'Animation toggle also disables the victory broadcast');
  await mount([{ ...base, live: { timerSeconds: 0 } }, { ...base, live: { _openedAt: Date.now() - 500000 } }, { ...base, live: { options: [] } }]);
  assert.deepEqual(await page.$$eval('[data-appearance-part="timerStat"] strong', (els) => els.slice(0, 2).map((el) => el.textContent)), ['No limit', '0:00']);
  assert.equal(await page.$$eval('[data-case="2"] .bet-bar', (els) => els.length), 0, 'Empty live options do not invent choices');
  assert.match(await page.$eval('[data-case="2"] .bet-entry', (el) => el.textContent), /Waiting for options/);

  const custom = { cardRangeText: { textColor: '#ffb4d1', fontSize: 19 }, cardAmountText: { textColor: '#d6ff9a', fontSize: 14 }, poolShareLabel: { textColor: '#ffd180', fontSize: 15 }, individualBetCard: { states: { winner: { borderColor: '#ffee77' } } }, progressBar: { fillColor: '#bc84ff', height: 9 } };
  await mount([{ ...base, config: { ...base.config, subElements: custom }, live: { gameStatus: 'result', winnerOption: 0 } }, { ...base, runtime: 'obs', config: { ...base.config, subElements: custom }, live: { gameStatus: 'result', winnerOption: 0 } }, base]);
  const styles = await page.$$eval('.bet-widget', (els) => els.map((el) => {
    const css = (selector) => getComputedStyle(el.querySelector(selector));
    return [css('.bar-range').color, css('.bar-range').fontSize, css('.bar-amount').color, css('.bets-grid-heading').color, css('.bar-track').height, el.querySelector('.bet-bar').style.getPropertyValue('--accent')];
  }));
  assert.deepEqual(styles[0], styles[1], 'Saved appearance overrides match editor and OBS');
  assert.deepEqual(styles[0], ['rgb(255, 180, 209)', '19px', 'rgb(214, 255, 154)', 'rgb(255, 209, 128)', '9px', '#bc84ff']);
  assert.notEqual(styles[0][0], styles[2][0], 'Instance appearance does not leak');
  await checkGeometry();
  const schema = await page.evaluate(() => window.betsTest.schema);
  for (const id of ['cardAmountText', 'poolShareLabel']) {
    assert.ok(schema.better.includes(id), `${id} is editable in Better Bets`);
    assert.ok(!schema.legacy.includes(id), `${id} is not offered in unrelated styles`);
  }
  const scopedConfig = await page.evaluate(() => window.betsTest.scopedConfig());
  await mount([{ ...base, config: { ...base.config, ...scopedConfig } }]);
  assert.deepEqual(await page.$$eval('.bar-amount, .bets-grid-heading', (els) => [...new Set(els.map((el) => getComputedStyle(el).color))]), ['rgb(238, 204, 170)'], 'Canonical scoped appearance edits survive save/reload and render');

  for (const fillStyle of ['liquid', 'solid', 'pulse', 'scanline', 'plasma']) {
    await mount([{ ...base, config: { ...base.config, animations: true, fillStyle } }]);
    assert.ok(await page.$(`.bf-${fillStyle}`), `${fillStyle} remains available`);
    await mount([{ ...base, config: { ...base.config, animations: false, fillStyle } }]);
    assert.equal(await page.$eval('.bet-widget', (el) => el.getAnimations({ subtree: true }).length), 0, `Animation toggle stops ${fillStyle}`);
  }

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await mount([{ ...base, config: { ...base.config, animations: true, fillStyle: 'liquid' }, live: { gameStatus: 'result', winnerOption: 0 } }]);
  assert.equal(await page.$eval('.bet-widget', (el) => el.getAnimations({ subtree: true }).length), 0, 'Reduced motion stops fills and entrance effects');
  assert.equal(await page.$eval('.bets-victory', (el) => getComputedStyle(el).display), 'none');
  await page.emulateMediaFeatures([]);
  for (const displayStyle of ['v1_list', 'v2_grid', 'v3_grid_2x3', 'StyleSecaBets']) {
    await mount([{ ...base, runtime: 'legacy', config: { displayStyle } }]);
    assert.equal(await page.$('.better-bets-stage'), null, `${displayStyle} keeps its renderer`);
    assert.ok(await page.$('.bets-ov'), `${displayStyle} still renders`);
  }
  await mount([{ width: 360, height: 510, config: { layoutMode: 'cards', columns: 2 } }, base, { ...base, live: { gameStatus: 'result', winnerOption: 2 } }]);
  await checkGeometry();
  if (process.env.BETS_SCREENSHOT) await page.screenshot({ path: process.env.BETS_SCREENSHOT, fullPage: true });
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(`Better Bets passed ${cases.length} responsive configurations on desktop/mobile, shared preview/OBS, live countdown/states, appearance isolation, reduced motion and legacy layouts.`);
} finally {
  await browser.close();
}
