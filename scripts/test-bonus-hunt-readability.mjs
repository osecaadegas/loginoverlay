import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/__hunt-readability-test') {
      await request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#202125"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    } else if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) {
      await request.continue();
    } else if (['data:', 'blob:'].includes(url.protocol)) {
      await request.continue();
    } else {
      await request.abort();
    }
  });
  await page.setViewport({ width: 1600, height: 1000 });
  await page.goto(`${baseUrl}/__hunt-readability-test`, { waitUntil: 'networkidle0' });
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  await page.evaluate(async version => {
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { BetterBonusHuntStyle } = await import('/src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx');
    const { createBetterInstance, normalizeBetterInstance, renderBetterWidgetInstance, getBetterInstanceConstraints } = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const { BetterWidgetPreview, BetterWidgetControls } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    const scopeUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/components/OverlayCenter/editor/EditorControlScope.jsx')?.name;
    const { EditorControlContext } = await import(scopeUrl);
    const { getWidgetStyleElements } = await import('/src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js');
    const routing = await import('/src/components/OverlayCenter/appearance/v2/appearanceRouting.js');
    await import('/src/components/OverlayCenter/OverlayRenderer.css');
    await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
    const root = ReactDOM.createRoot(document.getElementById('root'));
    window.huntTest = {
      normalize: normalizeBetterInstance,
      constraints: getBetterInstanceConstraints,
      scopedConfig() {
        let config = { displayStyle: 'better_bonus_hunt' };
        for (const [elementId, propertyId, value] of [
          ['progressBarFill', 'background', '#f4c442'], ['progressCount', 'textColor', '#f4c442'],
          ['resultPayout', 'textColor', '#f4c442'], ['resultTitle', 'fontSize', 12],
          ['slotRow', 'borderColor', '#f4c442'], ['container', 'borderColor', '#f4c442'],
        ]) config = routing.setScopedAppearanceConfigValue(config, { widgetType: 'bonus_hunt', widgetVariant: 'better_bonus_hunt', elementId, propertyId }, value);
        return JSON.parse(JSON.stringify(config));
      },
      schema: {
        better: getWidgetStyleElements('bonus_hunt', 'better_bonus_hunt').map(e => e.id),
        legacy: getWidgetStyleElements('bonus_hunt', 'v12_classic_sr').map(e => e.id),
      },
      mount(cases) {
        this.cases = cases;
        root.render(React.createElement('main', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' } }, cases.map((item, index) => {
          const bonuses = Array.from({ length: item.count ?? 6 }, (_, i) => ({
            id: `bonus-${i}`, slotName: ['Zero payout slot', 'Best result slot', 'A very long bonus hunt slot name that must fit'][i % 3],
            image_url: i % 2 ? '/player.webp' : '/streamer.webp', betSize: 1, payout: i < (item.opened ?? 3) ? (i === 0 ? 0 : i === 1 ? 1234.56 : 2) : null,
            opened: i < (item.opened ?? 3), isSuperBonus: i === 1, isExtremeBonus: i === 2,
            rtp: 96.34, volatility: 'high', max_win_multiplier: 10000,
          }));
          const config = {
            orientation: 'horizontal', widgetWidth: item.width, panelWidth: item.width,
            widgetHeight: item.height, panelHeight: item.height,
            sessionState: 'opening', statsLayout: 'grid', animations: false, winEffects: false,
            drawerAlwaysVisible: true, showRequests: false, startMoney: 1000, stopMoney: 0,
            fontFamily: 'Arial, sans-serif', uiScale: 1, ...item.config,
          };
          const live = { bonuses, bonusOpening: config.sessionState === 'opening', sessionState: config.sessionState, startMoney: 1000, showRequests: config.showRequests, showSlotRequests: config.showRequests };
          const requests = Array.from({ length: item.requests ?? 1 }, (_, i) => ({ id: `request-${i}`, slot_name: `Requested slot ${i + 1}`, slot_image: '/player.webp', requested_by: `viewer${i + 1}` }));
          config.slotRequests = requests;
          let widget;
          const instance = normalizeBetterInstance(JSON.parse(JSON.stringify(createBetterInstance('bonus_hunt', { width: item.width, height: item.height, config }))));
          if (item.runtime === 'preview') widget = React.createElement(BetterWidgetPreview, { type: 'bonus_hunt', config: { ...instance.config, ...live } });
          else if (item.runtime) widget = renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, mode: 'live', runtime: item.runtime, liveWidgets: [{ id: 'hunt-fixture', widget_type: 'bonus_hunt', config: live }] });
          else widget = React.createElement(BetterBonusHuntStyle, { config, bonuses, stats: {}, currency: '\u20ac' });
          const frame = React.createElement('div', { key: index, 'data-case': index, style: { width: item.width, height: config.orientation === 'horizontal' ? instance.height : item.height, flexShrink: 0 } }, widget);
          if (!item.controls) return frame;
          return React.createElement(React.Fragment, { key: index }, frame,
            React.createElement('aside', { style: { width: 320 } },
              React.createElement(EditorControlContext.Provider, { value: { mode: item.controls, tab: '__all', simpleSections: ['Orientation', 'Carousel Style', 'Stats Layout', 'Chat Requests', 'Sizes & Layout'], sections: { Orientation: true, 'Carousel Style': true, 'Stats Layout': true, 'Chat Requests': true, 'Sizes & Layout': true } } },
                React.createElement(BetterWidgetControls, { type: 'bonus_hunt', config: instance.config, onWidgetChange(patch) {
                  window.huntTest.mount(cases.map((current, i) => i === index ? { ...current, ...patch } : current));
                }, onChange(nextConfig) {
                  window.huntTest.mount(cases.map((current, i) => i === index ? { ...current, config: nextConfig } : current));
                } }))));
        })));
      },
    };
  }, browserHash);
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const mount = async cases => {
    await page.evaluate(cases => window.huntTest.mount(cases), cases);
    await settle();
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
    await settle();
  };
  const checkGeometry = async label => {
    const failures = await page.evaluate(() => [...document.querySelectorAll('[data-case]')].flatMap(host => {
      const result = [], panel = host.querySelector('.better-hunt-panel');
      if (!panel) return ['Missing panel'];
      const rect = e => e.getBoundingClientRect();
      const contains = (a, b) => b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1;
      const p = rect(panel);
      const report = message => result.push(`${host.dataset.case}: ${message}`);
      if (!contains(rect(host), p)) report(`Panel outside frame ${JSON.stringify({ panel: p.toJSON(), host: rect(host).toJSON() })}`);
      const stats = [...panel.querySelectorAll('.better-hunt-stat-grid .better-hunt-stat')];
      if (panel.classList.contains('better-hunt-horizontal') && new Set(stats.map(e => Math.round(rect(e).top))).size !== 1) report('Horizontal stats not all in one row');
      for (const cell of stats) {
        const value = cell.querySelector('strong');
        if (value.scrollWidth > value.clientWidth + 2) report(`Main stat overflow ${value.textContent}: ${JSON.stringify({ width: value.clientWidth, scroll: value.scrollWidth, parent: rect(value).toJSON(), child: rect(value.firstChild).toJSON(), html: value.innerHTML, font: getComputedStyle(value.firstChild).font, spacing: getComputedStyle(value.firstChild).letterSpacing })}`);
      }
      const progress = panel.querySelector('.better-hunt-progress');
      const backdrop = panel.querySelector('.better-hunt-carousel [data-appearance-part="carouselBackdrop"]');
      if (progress && !contains(p, rect(progress))) report('Progress clipped');
      if (backdrop && rect(backdrop).bottom > rect(progress).top + 1) report('Carousel overlaps progress');
      const center = panel.querySelector('.better-hunt-card--center');
      if (center && !contains(rect(backdrop), rect(center))) report('Center 3D card clipped');
      const requests = panel.querySelector('.better-hunt-hstrip-requests .better-hunt-requests');
      if (requests && !contains(rect(requests.parentElement), rect(requests))) report('Horizontal requests clipped');
      for (const row of panel.querySelectorAll('.better-hunt-hstrip-slot-row')) {
        for (const child of row.children) if (!contains(rect(row), rect(child))) report(`Current slot stat clipped: ${row.textContent}`);
      }
      for (const e of panel.querySelectorAll('.better-hunt-result-head, .better-hunt-result-body, .better-hunt-result-stats, .better-hunt-image-stats-copy, .better-hunt-image-row, .better-hunt-stats-title, .better-hunt-stat-strip')) {
        if (getComputedStyle(e).display === 'contents') continue;
        if (!contains(p, rect(e))) report(`Clipped ${e.className}`);
        if (e.closest('.better-hunt-result') && !contains(rect(e.closest('.better-hunt-result')), rect(e))) report(`Result content outside card: ${e.className} ${JSON.stringify({ content: rect(e).toJSON(), card: rect(e.closest('.better-hunt-result')).toJSON() })}`);
      }
      for (const card of panel.querySelectorAll('.better-hunt-result')) {
        if (panel.classList.contains('better-hunt-horizontal') && !contains(p, rect(card))) report('Result card clipped');
        const leaves = [...card.querySelectorAll('em, .better-hunt-result-slot, .better-hunt-result-art, .better-hunt-result-payout, .better-hunt-result-row')];
        for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
          const a = rect(leaves[i]), b = rect(leaves[j]);
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) report(`Result overlap ${leaves[i].className}/${leaves[j].className}`);
        }
        for (const e of card.querySelectorAll('em, .better-hunt-result-payout strong, .better-hunt-result-row strong')) {
          if (!rect(e).height || e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) report(`Hidden or overflowing result text ${e.textContent}`);
        }
      }
      return result;
    }));
    if (failures.length && process.env.HUNT_SCREENSHOT) await page.screenshot({ path: process.env.HUNT_SCREENSHOT, fullPage: true });
    assert.deepEqual(failures, [], label);
  };
  let checked = 0;
  for (const orientation of ['horizontal', 'vertical', 'mainstream']) {
    for (const carouselMode of ['3d', 'imagestats', 'stats']) {
      for (const width of orientation === 'horizontal' ? [800, 1080, 1280] : [320, 402]) {
        const cases = [0.75, 1, 1.35].flatMap(uiScale => [false, true].map(showRequests => ({
          width, height: orientation === 'horizontal' ? 280 : 884,
          config: { orientation, carouselMode, uiScale, showRequests, drawerMode: 'contain', drawerAlwaysVisible: false },
        })));
        await mount(cases);
        await checkGeometry(JSON.stringify({ orientation, carouselMode, width }));
        checked += cases.length;
      }
    }
  }
  for (const skin of ['modern', 'roman', 'metal', 'cyberpunk', 'spartan', 'bloody']) {
    const cases = ['horizontal', 'vertical', 'mainstream'].flatMap(orientation => ['compact', 'image', 'names'].map(listMode => ({ width: orientation === 'horizontal' ? 1080 : 402, height: orientation === 'horizontal' ? 340 : 884, config: { orientation, skin, listMode, showRequests: true } })));
    await mount(cases);
    await checkGeometry(skin);
    checked += cases.length;
  }
  const base = { width: 1080, height: 340, config: { carouselMode: '3d' } };
  const sizing = await page.evaluate(() => {
    const original = { widgetType: 'bonus_hunt', instanceId: 'saved-hunt', x: 80, y: 100, width: 1080, height: 360,
      config: { orientation: 'horizontal', widgetHeight: 360, panelHeight: 360, listMode: 'compact', showRequests: true } };
    const compact = window.huntTest.normalize(original);
    const many = window.huntTest.normalize({ ...compact, config: { ...compact.config, requestVisibleRows: 8 } });
    const fewer = window.huntTest.normalize({ ...many, config: { ...many.config, requestVisibleRows: 2 } });
    const hidden = window.huntTest.normalize({ ...many, config: { ...many.config, showRequests: false } });
    const manual = window.huntTest.normalize({ ...compact, height: 300, config: { ...compact.config, horizontalHeight: 300 } });
    const reloaded = window.huntTest.normalize(JSON.parse(JSON.stringify(manual)));
    const tall = window.huntTest.normalize({ ...original, height: 884, config: { orientation: 'vertical' } });
    return { compact: compact.height, many: many.height, fewer: fewer.height, hidden: hidden.height, manual: manual.height,
      reloaded: reloaded.height, tall: tall.height, min: window.huntTest.constraints(compact).minHeight,
      position: [compact.x, compact.y, compact.width], id: compact.instanceId };
  });
  assert.deepEqual(sizing, { compact: 220, many: 440, fewer: 220, hidden: 220, manual: 300, reloaded: 300, tall: 884, min: 220, position: [80, 100, 1080], id: 'saved-hunt' });
  for (const viewport of [1440, 390]) {
    await page.setViewport({ width: viewport, height: 900 });
    for (const listMode of ['compact', 'image', 'names']) {
      for (const requestVisibleRows of [1, 3, 8]) {
        await mount([{ ...base, requests: 12, config: { showRequests: true, requestView: 'list', listMode, requestVisibleRows, uiScale: 1.2 } }]);
        await checkGeometry(`Compact ${listMode}, ${requestVisibleRows} rows, viewport ${viewport}`);
        const queue = await page.$eval('.better-hunt-request-list', list => {
          const bounds = list.getBoundingClientRect();
          const visible = [...list.querySelectorAll('.better-hunt-request')].filter(row => {
            const r = row.getBoundingClientRect(); return r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1;
          });
          return { count: visible.length, fits: visible.every(row => [...row.querySelectorAll('.better-hunt-request-copy, .better-hunt-request-user')].every(copy => {
            const r = copy.getBoundingClientRect(), parent = row.getBoundingClientRect();
            return r.top >= parent.top && r.bottom <= parent.bottom;
          })) };
        });
        assert.equal(queue.count, requestVisibleRows);
        assert.ok(queue.fits, 'Request slot and viewer fit each compact row');
      }
    }
    await mount([{ ...base, requests: 12, config: { showRequests: true, requestView: 'carousel', uiScale: 1.2 } }]);
    await checkGeometry(`Both 3D carousels and results, viewport ${viewport}`);
    const features = await page.$eval('[data-case]', host => {
      const stage = host.querySelector('.better-hunt-request-stage').getBoundingClientRect();
      const card = host.querySelector('.better-hunt-request-card.is-center').getBoundingClientRect();
      return { height: host.getBoundingClientRect().height, stats: host.querySelectorAll('.better-hunt-stat-grid .better-hunt-stat').length,
        current: host.querySelectorAll('.better-hunt-hstrip-slot-row').length, results: host.querySelectorAll('.better-hunt-result').length,
        cardFits: card.top >= stage.top && card.bottom <= stage.bottom,
        requestArt: [...host.querySelectorAll('.better-hunt-request-card img')].every(img => img.naturalWidth > 0) };
    });
    assert.deepEqual(features, { height: 220, stats: 4, current: 5, results: 2, cardFits: true, requestArt: true });
  }
  await page.setViewport({ width: 1600, height: 1000 });
  for (const runtime of ['editor', 'obs', 'preview']) {
    await mount([{ ...base, runtime }]);
    await checkGeometry(runtime);
    assert.match(await page.$eval('.better-hunt-result--worst', e => e.textContent), /Zero payout slot.*Payout.*0.*Multi.*0x/);
    assert.equal(await page.$eval('[role="progressbar"]', e => e.getAttribute('aria-valuenow')), '3');
  }
  for (const [count, opened] of [[0, 0], [6, 0], [6, 1], [6, 6]]) {
    await mount([{ ...base, count, opened }]);
    assert.equal(await page.$eval('[role="progressbar"]', e => e.getAttribute('aria-valuenow')), `${opened}`);
    const fill = await page.$eval('.better-hunt-track>span', e => parseFloat(e.style.width));
    assert.equal(fill, count ? Math.round(opened / count * 100) : 0);
    await checkGeometry(`opened ${opened}/${count}`);
  }
  for (const carouselMode of ['3d', 'imagestats', 'stats']) {
    for (const sessionState of ['hunt', 'opening', 'ended']) {
      await mount([{ ...base, count: 6, opened: sessionState === 'ended' ? 6 : 1, requests: 12,
        config: { carouselMode, sessionState, showRequests: true, requestView: 'carousel', uiScale: 1.35 } }]);
      await checkGeometry(`Compact ${carouselMode} / ${sessionState}`);
    }
  }
  const scopedConfig = await page.evaluate(() => window.huntTest.scopedConfig());
  await mount(['editor', 'obs'].map(runtime => ({ ...base, runtime, config: { ...base.config, ...scopedConfig, barHeight: 10 } })));
  await checkGeometry('Saved appearance');
  const appearance = await page.$$eval('[data-case]', hosts => hosts.map(host => ({
    fill: getComputedStyle(host.querySelector('.better-hunt-track>span')).backgroundColor,
    width: host.querySelector('.better-hunt-track>span').style.width,
    height: host.querySelector('.better-hunt-track').getBoundingClientRect().height,
    payout: getComputedStyle(host.querySelector('.better-hunt-result-payout strong')).color,
  })));
  assert.deepEqual(appearance[0], appearance[1]);
  assert.deepEqual(appearance[0], { fill: 'rgb(244, 196, 66)', width: '50%', height: 10, payout: 'rgb(244, 196, 66)' });
  const schema = await page.evaluate(() => window.huntTest.schema);
  assert.ok(schema.better.includes('resultPayout') && !schema.legacy.includes('resultPayout'), 'Result controls belong only to Better Hunt');
  for (const controls of ['simple', 'advanced']) {
    await mount([{ ...base, controls }]);
    assert.equal(await page.$('[data-control-section="Stats Layout"]'), null, 'Horizontal does not offer an ineffective grid toggle');
    for (const [button, orientation] of [[1, 'vertical'], [3, 'mainstream'], [2, 'horizontal']]) {
      await page.click(`[data-control-section="Orientation"] .bp-hunt-choice-grid button:nth-child(${button})`);
      await page.waitForSelector(`.better-hunt-root[data-orientation="${orientation}"]`);
      assert.equal(await page.$eval('.better-hunt-root', e => e.dataset.statsLayout), orientation === 'horizontal' ? 'row' : 'grid');
    }
    for (const [button, selector] of [[2, '.better-hunt-image-stats-panel'], [3, '.better-hunt-stats-panel--stats'], [1, '.better-hunt-ring']]) {
      await page.click(`[data-control-section="Carousel Style"] .bp-hunt-choice-grid button:nth-child(${button})`);
      await page.waitForSelector(selector);
    }
    await mount([{ ...base, controls, requests: 12, config: { showRequests: true, listMode: 'compact' } }]);
    const changeSlider = async (label, value) => {
      await page.evaluate(({ label, value }) => {
        const input = [...document.querySelectorAll('.bp-slider')].find(row => row.textContent.includes(label))?.querySelector('input[type="range"]');
        if (!input) throw new Error(`Missing slider ${label}`);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, { label, value });
      await settle();
    };
    await changeSlider('Visible request rows', 8);
    assert.equal(await page.$eval('[data-case]', e => e.getBoundingClientRect().height), 440);
    await changeSlider('Visible request rows', 2);
    assert.equal(await page.$eval('[data-case]', e => e.getBoundingClientRect().height), 220);
    await changeSlider('Widget height', 300);
    assert.equal(await page.$eval('[data-case]', e => e.getBoundingClientRect().height), 300);
    await changeSlider('Widget height', 0);
    assert.equal(await page.$eval('[data-case]', e => e.getBoundingClientRect().height), 220);
  }
  await mount([{ ...base, config: { sessionState: 'hunt', animations: true, carouselMs: 1500 } }]);
  const before = await page.$eval('.better-hunt-card--center img', img => img.alt);
  await page.waitForFunction(before => document.querySelector('.better-hunt-card--center img')?.alt !== before, { timeout: 5000 }, before);
  await page.waitForFunction(() => [...document.querySelectorAll('.better-hunt-ring img')].every(img => img.complete && img.naturalWidth > 0));
  // Accelerate only the two configured drawer timers, without bypassing the production state machine.
  await page.evaluate(() => {
    window.huntOriginalTimeout = window.setTimeout;
    window.setTimeout = (callback, delay, ...args) => window.huntOriginalTimeout(callback, delay === 12000 || delay === 10000 ? 250 : delay, ...args);
  });
  await mount(['contain', 'expand'].map(drawerMode => ({ width: 402, height: 980, config: {
    orientation: 'vertical', drawerMode, drawerAlwaysVisible: false, animations: true,
    drawerHoldSeconds: 12, drawerRevealSeconds: 10, visibleRows: 3,
    widgetHeight: drawerMode === 'expand' ? 0 : 980, panelHeight: drawerMode === 'expand' ? 0 : 980,
  } })));
  const tops = await page.$$eval('.better-hunt-panel', panels => panels.map(e => e.getBoundingClientRect().top));
  await page.waitForFunction(() => [...document.querySelectorAll('.better-hunt-drawer')].every(e => e.getAttribute('aria-hidden') === 'true'));
  assert.deepEqual(await page.$$eval('.better-hunt-panel', panels => panels.map(e => e.getBoundingClientRect().top)), tops, 'Closing drawers preserves the top anchor');
  await page.waitForFunction(() => [...document.querySelectorAll('.better-hunt-drawer')].every(e => e.getAttribute('aria-hidden') === 'false'));
  assert.deepEqual(await page.$$eval('.better-hunt-panel', panels => panels.map(e => e.getBoundingClientRect().top)), tops, 'Revealing drawers preserves the top anchor');
  await page.evaluate(() => { window.setTimeout = window.huntOriginalTimeout; });
  await mount([{ ...base, requests: 12, config: { showRequests: true, requestView: 'carousel', uiScale: 1.2 } }]);
  await page.setViewport({ width: 390, height: 844 });
  await checkGeometry('Mobile viewport preserves horizontal layout');
  await page.setViewport({ width: 1600, height: 1000 });
  const ringPixels = await (await page.$('.better-hunt-ring')).screenshot({ encoding: 'base64' });
  const colors = await page.evaluate(async png => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 40) if (data[i + 3] > 0) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return colors.size;
  }, ringPixels);
  assert.ok(colors > 100, 'Rendered 3D carousel contains nonblank artwork');
  if (process.env.HUNT_SCREENSHOT) await (await page.$('[data-case]')).screenshot({ path: process.env.HUNT_SCREENSHOT });
  assert.deepEqual(errors, []);
  console.log(`Bonus Hunt readability passed: ${checked} layouts, live/OBS/preview parity, progress states, saved appearance and editor controls.`);
} finally {
  await browser.close();
}
