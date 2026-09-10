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
      scopedConfig(changes) {
        let config = { displayStyle: 'better_bonus_hunt' };
        for (const [elementId, propertyId, value] of changes || [
          ['progressBarFill', 'background', '#f4c442'], ['progressCount', 'textColor', '#f4c442'],
          ['resultPayout', 'textColor', '#f4c442'], ['resultTitle', 'fontSize', 12],
          ['slotRow', 'borderColor', '#f4c442'], ['container', 'borderColor', '#f4c442'],
        ]) config = routing.setScopedAppearanceConfigValue(config, { widgetType: 'bonus_hunt', widgetVariant: 'better_bonus_hunt', elementId, propertyId }, value);
        return JSON.parse(JSON.stringify(config));
      },
      schema: {
        better: getWidgetStyleElements('bonus_hunt', 'better_bonus_hunt').map(e => e.id),
        legacy: getWidgetStyleElements('bonus_hunt', 'v12_classic_sr').map(e => e.id),
        autoscrollImage: getWidgetStyleElements('bonus_hunt', 'better_bonus_hunt').find(e => e.id === 'autoscrollImage').controls,
      },
      mount(cases) {
        this.cases = cases;
        root.render(React.createElement('main', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' } }, cases.map((item, index) => {
          const bonuses = Array.from({ length: item.count ?? 6 }, (_, i) => ({
            id: `bonus-${i}`, slotName: ['Zero payout slot', 'Best result slot', 'A very long bonus hunt slot name that must fit'][i % 3],
            image_url: i % 2 ? '/player.webp' : '/streamer.webp', betSize: 1, payout: i < (item.opened ?? 3) ? (i === 0 ? 0 : i === 1 ? 1234.56 : 2) : null,
            opened: i < (item.opened ?? 3), isSuperBonus: i === 1, isExtremeBonus: i === 2,
            rtp: 96.34, volatility: 'high', max_win_multiplier: 10000,
            ...item.bonusOverrides?.[i],
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
              React.createElement(EditorControlContext.Provider, { value: { mode: item.controls, tab: '__all', simpleSections: ['Orientation', 'Carousel Style', 'Carousel Timing', 'Stats Layout', 'Chat Requests', 'Sizes & Layout'], sections: { Orientation: true, 'Carousel Style': true, 'Carousel Timing': true, 'Stats Layout': true, 'Chat Requests': true, 'Sizes & Layout': true } } },
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
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {}))));
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
      for (const card of panel.querySelectorAll('.better-hunt-autoscroll-card')) {
        const artwork = rect(card.querySelector('img')), bounds = rect(card);
        if (!contains(bounds, artwork) || artwork.width < bounds.width - 4 || artwork.height < bounds.height - 4) report('Autoscroll artwork does not fill the card');
        for (const child of card.querySelectorAll('.better-hunt-autoscroll-copy, .better-hunt-autoscroll-stat')) {
          if (!contains(rect(card), rect(child))) report(`Autoscroll content clipped: ${child.className}`);
        }
        const corners = [...card.querySelectorAll('.better-hunt-autoscroll-stat')];
        if (corners.length !== 3 || card.textContent !== corners.map(corner => corner.querySelector('strong').textContent).join('')) report('Autoscroll should only display the three numeric values');
        if (card.querySelector('[data-appearance-part="autoscrollTitle"], [data-appearance-part="autoscrollStatLabel"]')) report('Autoscroll still displays a name or stat label');
        if (getComputedStyle(card.querySelector('img')).objectFit !== 'cover') report('Autoscroll image does not cover the card');
        for (let i = 0; i < corners.length; i++) for (let j = i + 1; j < corners.length; j++) {
          const a = rect(corners[i]), b = rect(corners[j]);
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) report('Autoscroll corner overlays overlap each other');
        }
        for (const [selector, right, bottom] of [
          ['.better-hunt-autoscroll-stat--autoscrollBet', false, false],
          ['.better-hunt-autoscroll-stat--autoscrollPayout', true, true],
          ['.better-hunt-autoscroll-stat--autoscrollMultiplier', true, false],
        ]) {
          const overlay = card.querySelector(selector), corner = rect(overlay);
          const value = rect(overlay.querySelector('strong'));
          if (Math.abs(right ? artwork.right - corner.right : corner.left - artwork.left) > 0.5 ||
              Math.abs(bottom ? artwork.bottom - corner.bottom : corner.top - artwork.top) > 0.5) report(`Autoscroll overlay not flush with its image corner: ${selector}`);
          if (Math.abs((right ? artwork.right - value.right : value.left - artwork.left) - 2) > 0.5 ||
              Math.abs((bottom ? artwork.bottom - value.bottom : value.top - artwork.top) - 1) > 0.5) report(`Autoscroll value too far from its image edges: ${selector}`);
        }
        for (const value of card.querySelectorAll('.better-hunt-autoscroll-stat strong')) {
          if (value.scrollWidth > value.clientWidth + 2) report(`Autoscroll value clipped: ${value.textContent}`);
        }
        if (rect(card.querySelector('img')).height < 12) report('Autoscroll artwork has no visible area');
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
    for (const carouselMode of orientation === 'horizontal' ? ['3d', 'imagestats', 'stats', 'autoscroll'] : ['3d', 'imagestats', 'stats']) {
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
  for (const orientation of ['vertical', 'mainstream']) {
    for (const viewport of [390, 1440]) {
      await page.setViewport({ width: viewport, height: 1100 });
      for (const drawerMode of ['contain', 'expand']) {
        await mount([320, 402].flatMap(width => [0.75, 1, 1.35].map(uiScale => ({
          width, height: 980, config: { orientation, drawerMode, uiScale, showRequests: true, drawerAlwaysVisible: true },
        }))));
        await checkGeometry(`Compact results ${orientation}/${drawerMode}, viewport ${viewport}`);
        const sizes = await page.$$eval('.better-hunt-result', cards => cards.map(card => {
          const bounds = card.getBoundingClientRect(), art = card.querySelector('.better-hunt-result-art').getBoundingClientRect();
          const payout = card.querySelector('.better-hunt-result-payout').getBoundingClientRect();
          return { compact: card.classList.contains('better-hunt-result--compact'), height: bounds.height,
            artWidth: art.width, artHeight: art.height, artLoaded: card.querySelector('img')?.naturalWidth > 0,
            mirrored: card.classList.contains('better-hunt-result--best') ? art.left >= payout.right : art.right <= payout.left };
        }));
        assert.equal(sizes.length, 12, 'Both Best/Worst cards remain available in every narrow layout');
        assert.ok(sizes.every(size => size.compact && size.height <= 134 && size.artWidth >= 54 && size.artHeight >= 88 && size.artLoaded && size.mirrored), JSON.stringify(sizes));
      }
    }
    for (const runtime of ['editor', 'obs', 'preview']) {
      const resultAppearance = await page.evaluate(() => window.huntTest.scopedConfig([
        ['resultPayout', 'textColor', '#f4c442'], ['resultTitle', 'fontSize', 12],
      ]));
      await mount([{ width: 402, height: 980, runtime, config: { ...resultAppearance, orientation, drawerAlwaysVisible: true } }]);
      await checkGeometry(`Compact results saved appearance: ${orientation}/${runtime}`);
      assert.equal(await page.$eval('.better-hunt-result-payout strong', e => getComputedStyle(e).color), 'rgb(244, 196, 66)');
      assert.equal(await page.$eval('.better-hunt-result-slot', e => getComputedStyle(e).fontSize), '12px');
    }
  }
  if (process.env.RESULTS_SCREENSHOT) {
    await mount([{ width: 402, height: 980, config: { orientation: 'mainstream', uiScale: 1.2, drawerAlwaysVisible: true } }]);
    await checkGeometry('Compact Best/Worst screenshot');
    await (await page.$('.better-hunt-drawer')).screenshot({ path: process.env.RESULTS_SCREENSHOT });
  }
  await page.setViewport({ width: 1600, height: 1000 });
  const base = { width: 1080, height: 340, config: { carouselMode: '3d' } };
  for (const height of [220, 280, 360]) {
    await mount([{ ...base, config: { horizontalHeight: height } }]);
    assert.equal(await page.$('.better-hunt-result--compact'), null, 'Horizontal Best/Worst keeps its existing layout');
    assert.equal(await page.$eval('.better-hunt-result-art', art => art.getBoundingClientRect().width), 34, 'Horizontal artwork sizing is unchanged');
    const gap = await page.$eval('.better-hunt-ring', ring => {
      const center = ring.querySelector('.better-hunt-card--center').getBoundingClientRect();
      return Math.min(...[...ring.querySelectorAll('.better-hunt-card:not(.better-hunt-card--center)')]
        .filter(card => Number(getComputedStyle(card).opacity) > 0)
        .map(card => card.getBoundingClientRect()).filter(card => card.left > center.left)
        .map(card => card.left - center.right));
    });
    assert.ok(gap >= -5 && gap <= 20, `3D ring spacing follows card size at height ${height}: gap ${gap}`);
  }
  const auto = { ...base, config: { carouselMode: 'autoscroll', animations: true, animSpeed: 1, autoscrollSpeed: 40 } };
  for (const count of [0, 1, 2, 6]) {
    await mount([{ ...auto, count }]);
    await checkGeometry(`Autoscroll ${count} slots`);
    if (!count) {
      assert.match(await page.$eval('.better-hunt-autoscroll', e => e.textContent), /No bonuses yet/);
      continue;
    }
    assert.ok(await page.$$eval('.better-hunt-autoscroll-image', images => images.every(img =>
      img.naturalWidth > 0 && img.naturalHeight > 0 && getComputedStyle(img).objectFit === 'cover'
    )), 'Autoscroll artwork covers the entire card without letterboxing');
    const loop = await page.$eval('.better-hunt-autoscroll', viewport => {
      const track = viewport.querySelector('.better-hunt-autoscroll-track');
      const [first, second] = track.children;
      const animation = track.getAnimations()[0];
      animation.pause();
      animation.currentTime = 0;
      const start = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
      animation.currentTime = animation.effect.getComputedTiming().duration;
      const end = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
      return { first: first.offsetWidth, second: second.offsetWidth, viewport: viewport.clientWidth, start, end,
        identical: first.textContent === second.textContent, infinite: animation.effect.getTiming().iterations === Infinity };
    });
    assert.ok(loop.first >= loop.viewport && loop.first === loop.second && loop.identical && loop.infinite, 'Two complete identical groups cover the loop, even for a single slot');
    assert.ok(Math.abs(loop.start - loop.end) < 0.1, 'The infinite loop has no position jump at its boundary');
  }
  // Discard the animation manually scrubbed above before testing CSS pause/resume.
  await mount([base]);
  await mount([{ ...auto, bonusOverrides: { 0: { payout: 0, opened: true }, 1: { betSize: 2, payout: 200, opened: true } } }]);
  const scrollX = () => page.$eval('.better-hunt-autoscroll-track', track => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41);
  const startX = await scrollX();
  await page.waitForFunction(start => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.better-hunt-autoscroll-track')).transform).m41 < start - 5, {}, startX);
  const autoValues = index => page.$eval(`.better-hunt-autoscroll-card[data-slot-index="${index}"]`, card =>
    [...card.querySelectorAll('.better-hunt-autoscroll-stat strong')].map(value => ({ text: value.textContent, label: value.getAttribute('aria-label') })));
  assert.deepEqual(await autoValues(0), [
    { text: '\u20ac1', label: 'Bet: \u20ac1' }, { text: '\u20ac0', label: 'Payout: \u20ac0' }, { text: '0x', label: 'Multi: 0x' },
  ]);
  assert.deepEqual((await autoValues(1)).map(value => value.text), ['\u20ac2', '\u20ac200', '100x']);
  assert.deepEqual((await autoValues(5)).map(value => value.text), ['\u20ac1', '-', '-']);
  await mount([{ ...auto, bonusOverrides: { 1: { betSize: 2, payout: 500, opened: true } } }]);
  assert.deepEqual((await autoValues(1)).map(value => value.text), ['\u20ac2', '\u20ac500', '250x']);
  await mount([{ ...auto, config: { ...auto.config, animations: false } }]);
  const pausedX = await scrollX();
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 120)));
  assert.equal(await scrollX(), pausedX, 'Enable motion pauses the scrolling strip');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await mount([auto]);
  assert.equal(await page.$eval('.better-hunt-autoscroll-track', track => getComputedStyle(track).animationName), 'none');
  await page.emulateMediaFeatures([]);
  const autoAppearance = await page.evaluate(() => window.huntTest.scopedConfig([
    ['autoscrollCard', 'background', '#26332d'], ['autoscrollPayout', 'textColor', '#f4c442'],
    ['autoscrollImage', 'opacity', 0.8],
  ]));
  // Old fit/title settings must not restore letterboxing or visible names.
  autoAppearance.__appearanceExplicitSubElements.autoscrollImage.imageFit = 'contain';
  autoAppearance.__appearanceExplicitSubElements.autoscrollTitle = { fontSize: 40 };
  for (const runtime of [undefined, 'editor', 'obs', 'preview']) {
    await mount([{ ...auto, runtime, config: { ...auto.config, ...autoAppearance, animations: false } }]);
    await checkGeometry(`Autoscroll ${runtime} saved appearance`);
    const values = await page.$eval('.better-hunt-autoscroll-card', card => ({
      background: getComputedStyle(card).backgroundColor,
      payout: getComputedStyle(card.querySelector('[data-appearance-part="autoscrollPayout"]')).color,
      fit: getComputedStyle(card.querySelector('img')).objectFit,
      opacity: getComputedStyle(card.querySelector('img')).opacity,
    }));
    assert.deepEqual(values, { background: 'rgb(38, 51, 45)', payout: 'rgb(244, 196, 66)', fit: 'cover', opacity: '0.8' });
  }
  if (process.env.AUTOSCROLL_SCREENSHOT) {
    await mount([{ ...auto, config: { ...auto.config, animations: false, uiScale: 1.2, showRequests: true, requestView: 'carousel' } }]);
    await checkGeometry('Autoscroll with all horizontal features');
    await (await page.$('[data-case]')).screenshot({ path: process.env.AUTOSCROLL_SCREENSHOT });
  }
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
  for (const carouselMode of ['3d', 'imagestats', 'stats', 'autoscroll']) {
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
  assert.ok(!schema.better.includes('autoscrollTitle') && !schema.better.includes('autoscrollStatLabel'), 'Removed text has no leftover appearance controls');
  assert.ok(!schema.autoscrollImage.includes('imageFit'), 'Autoscroll does not offer a fit option that could add empty bars');
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
    await page.click('[data-control-section="Carousel Style"] .bp-hunt-choice-grid button:nth-child(4)');
    await page.waitForSelector('.better-hunt-autoscroll');
    assert.equal(await page.$eval('.better-hunt-root', e => e.dataset.anim), 'on', 'Selecting Autoscroll starts it immediately');
    assert.match(await page.$eval('[data-control-section="Carousel Timing"]', e => e.textContent), /Scroll speed/);
    const durationBefore = await page.$eval('.better-hunt-autoscroll-track', track => parseFloat(getComputedStyle(track).animationDuration));
    await page.$eval('[data-control-section="Carousel Timing"] input[type="range"]', input => input.focus());
    await page.keyboard.press('End');
    await settle();
    const durationAfter = await page.$eval('.better-hunt-autoscroll-track', track => parseFloat(getComputedStyle(track).animationDuration));
    assert.ok(Math.abs(durationAfter / durationBefore - 0.4) < 0.01, 'The saved speed control changes continuous scrolling speed');
    await page.click('[data-control-section="Orientation"] .bp-hunt-choice-grid button:nth-child(1)');
    assert.equal(await page.$('.better-hunt-autoscroll'), null, 'Autoscroll is not rendered vertically');
    assert.equal(await page.$$eval('[data-control-section="Carousel Style"] .bp-hunt-choice-grid button', buttons => buttons.length), 3, 'Autoscroll is only offered horizontally');
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
  console.log(`Bonus Hunt readability passed: ${checked} layouts, responsive ring spacing, autoscroll loop/data/motion controls, live/OBS/preview parity, progress states, saved appearance and editor controls.`);
} finally {
  await browser.close();
}
