import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

for (const entryPath of [
  '../src/components/OverlayCenter/editor/WidgetEditorPage.jsx',
  '../src/components/OverlayCenter/editor/BetterObsOverlay.jsx',
]) {
  const entrySource = readFileSync(new URL(entryPath, import.meta.url), 'utf8');
  assert.match(entrySource, /import\s+["']\.\.\/OverlayRenderer\.css["'];/, `${entryPath} loads the shared widget renderer styles`);
}

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const browser = await puppeteer.launch({
  headless: true,
  ...(process.env.PUPPETEER_USER_DATA_DIR
    ? { userDataDir: process.env.PUPPETEER_USER_DATA_DIR }
    : {}),
});
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
    const { BetterWidgetPreview, BetterWidgetControls } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    // Reuse the controls' HMR-versioned context instead of creating a second provider module.
    const scopeUrl = performance.getEntriesByType('resource').find((entry) => new URL(entry.name).pathname === '/src/components/OverlayCenter/editor/EditorControlScope.jsx')?.name;
    if (!scopeUrl) throw new Error('Editor control context was not loaded');
    const { EditorControlContext } = await import(scopeUrl);
    const { default: BetsWidget } = await import('/src/components/OverlayCenter/widgets/bets/BetsWidget.jsx');
    const { getWidgetStyleElements, getWidgetStyleOptionsForQuickEditor } = await import('/src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js');
    const routing = await import('/src/components/OverlayCenter/appearance/v2/appearanceRouting.js');
    const { applyWidgetColourTheme } = await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
    await Promise.all([
      import('/src/components/OverlayCenter/editor/WidgetEditorPage.jsx'),
      import('/src/components/OverlayCenter/editor/BetterObsOverlay.jsx'),
    ]);
    await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
    const root = ReactDOM.createRoot(document.getElementById('root'));
    window.betsTest = {
      schema: {
        better: getWidgetStyleElements('bets', 'better_bets').map((element) => element.id),
        legacy: getWidgetStyleElements('bets', 'StyleSecaBets').map((element) => element.id),
        styles: getWidgetStyleOptionsForQuickEditor('bets').map((style) => style.id),
      },
      scopedConfig() {
        let config = { displayStyle: 'better_bets' };
        for (const elementId of ['cardAmountText', 'poolShareLabel']) {
          config = routing.setScopedAppearanceConfigValue(config, { widgetType: 'bets', widgetVariant: 'better_bets', elementId, propertyId: 'textColor' }, '#eeccaa');
        }
        return JSON.parse(JSON.stringify(config));
      },
      themedConfig(config, theme) {
        return JSON.parse(JSON.stringify(applyWidgetColourTheme('bets', config, theme)));
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
          const frame = React.createElement('div', { 'data-case': index, style: { width: item.width, height: item.height, flexShrink: 0 } }, widget);
          if (!item.controls) return React.cloneElement(frame, { key: index });
          return React.createElement(React.Fragment, { key: index }, frame,
            React.createElement('aside', { style: { width: 300 } },
              React.createElement(EditorControlContext.Provider, { value: { mode: item.controls, tab: 'layout', simpleSections: item.simpleSections || ['Orientation'], sections: { Orientation: true, 'Bets Style': true, 'Colour Theme': true }, onTab() {}, onSection() {} } },
                React.createElement(BetterWidgetControls, { type: 'bets', config: instance.config, onChange(nextConfig) {
                  window.betsTest.updatedCases = cases.map((current, i) => i === index ? { ...current, config: nextConfig } : current);
                  window.betsTest.mount(window.betsTest.updatedCases);
                } }))));
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
        const style = getComputedStyle(element);
        const intentionallyEllipsized = style.textOverflow === 'ellipsis' && style.overflow === 'hidden';
        if (!intentionallyEllipsized && (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2)) result.push(`${host.dataset.case}: text overflow ${element.className} ${element.textContent}`);
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
  for (const width of [280, 320, 360]) {
    for (const runtime of ['editor', 'obs', 'preview']) {
      for (const layoutMode of ['cards', 'bars']) {
        for (const columns of [1, 2, 3]) {
          await mount(['vertical', 'horizontal'].map((orientation) => ({ width, height: 540, runtime, config: { orientation, layoutMode, columns } })));
          const ratios = await page.$$eval('.bet-widget', (els) => els.map((el) => {
            const { width, height } = el.getBoundingClientRect();
            return width / height;
          }));
          assert.ok(ratios[1] > ratios[0] * 1.25, `${runtime} ${layoutMode} ${columns} columns at ${width}px: horizontal must not collapse to vertical (${ratios})`);
          await checkGeometry();
        }
      }
    }
  }
  const base = { width: 778, height: 330, config: { layoutMode: 'bars', columns: 2 } };
  await page.setViewport({ width: 1600, height: 1000 });
  const panelRatio = () => page.$eval('.bet-widget', (el) => { const box = el.getBoundingClientRect(); return box.width / box.height; });
  for (const controls of ['simple', 'advanced']) {
    await mount([{ width: 320, height: 540, controls, config: { layoutMode: 'bars', columns: 2, orientation: 'vertical', fontScale: 115, fillStyle: 'solid' } }]);
    const before = await panelRatio();
    assert.ok(await page.$('[data-control-section="Orientation"] .bp-segmented'), `${controls}: orientation controls render; ${await page.$eval('aside', (el) => el.textContent)}`);
    await page.click('[data-control-section="Orientation"] .bp-segmented button:nth-child(2)');
    await page.waitForSelector('.bet-widget.is-horizontal');
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(await panelRatio() > before * 1.25, `${controls}: clicking Horizontal changes a narrow widget`);
    const savedCases = await page.evaluate(() => JSON.parse(JSON.stringify(window.betsTest.updatedCases)));
    assert.equal(savedCases[0].config.orientation, 'horizontal');
    assert.equal(savedCases[0].config.columns, 2);
    assert.equal(savedCases[0].config.fontScale, 115);
    assert.equal(savedCases[0].config.fillStyle, 'solid');
    assert.equal(savedCases[0].width, 320, 'Orientation does not overwrite the saved frame');
    await mount(savedCases.map((item) => ({ ...item, runtime: 'obs' })));
    assert.ok(await panelRatio() > before * 1.25, `${controls}: saved orientation renders in OBS after reload`);
    await page.click('[data-control-section="Orientation"] .bp-segmented button:first-child');
    await page.waitForFunction(() => !document.querySelector('.bet-widget.is-horizontal'));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(Math.abs(await panelRatio() - before) < 0.02, `${controls}: clicking Vertical restores the layout`);
    await checkGeometry();
  }
  await mount([{ ...base, height: 650, config: { ...base.config, orientation: 'vertical' } }, { ...base, height: 650, config: { ...base.config, orientation: 'horizontal' } }]);
  const orientationWidths = await page.$$eval('.bet-widget', (els) => els.map((el) => el.getBoundingClientRect().width));
  assert.ok(orientationWidths[1] > orientationWidths[0] * 1.5, 'Orientation still changes the board layout');
  await checkGeometry();
  await mount(['editor', 'obs', 'preview'].map((runtime) => ({ width: 320, height: 300, runtime, config: { orientation: 'horizontal', layoutMode: 'bars', columns: 2, fontScale: 100 } })));
  const horizontalBarReadability = await page.$$eval('[data-case]', (hosts) => hosts.map((host) => {
    const fit = host.querySelector('.better-bets-fit');
    const scale = fit.getBoundingClientRect().width / fit.offsetWidth;
    const visibleSize = (selector) => Number.parseFloat(getComputedStyle(host.querySelector(selector)).fontSize) * scale;
    const track = host.querySelector('.bar-track');
    return {
      scale,
      fitSize: [fit.offsetWidth, fit.offsetHeight],
      widgetSize: [fit.firstElementChild?.scrollWidth || 0, fit.firstElementChild?.scrollHeight || 0],
      gridColumns: getComputedStyle(host.querySelector('.bars-grid')).gridTemplateColumns,
      barHeights: [...host.querySelectorAll('.bet-bar')].map((bar) => bar.getBoundingClientRect().height / scale),
      firstLabelFits: (() => { const label = host.querySelector('.bar-range'); return label.scrollWidth <= label.clientWidth + 2; })(),
      label: visibleSize('.bar-range'),
      percent: visibleSize('.bar-pct'),
      detail: visibleSize('.bet-entry'),
      amount: visibleSize('.bar-amount'),
      track: track.getBoundingClientRect().height,
      commandVisible: host.querySelector('.bet-entry')?.textContent.includes('!pick <number> <amount>') || false,
    };
  }));
  for (const [runtimeIndex, metrics] of horizontalBarReadability.entries()) {
    const runtime = ['editor', 'obs', 'preview'][runtimeIndex];
    assert.ok(metrics.scale >= 0.66, `${runtime}: horizontal progress bars avoid excessive whole-widget downscaling (${JSON.stringify(metrics)})`);
    assert.ok(metrics.label >= 12, `${runtime}: horizontal progress-bar labels remain readable (${JSON.stringify(metrics)})`);
    assert.ok(metrics.percent >= 16, `${runtime}: horizontal progress-bar percentages remain prominent (${JSON.stringify(metrics)})`);
    assert.ok(metrics.detail >= 10, `${runtime}: horizontal progress-bar command instruction remains readable (${JSON.stringify(metrics)})`);
    assert.equal(metrics.commandVisible, true, `${runtime}: horizontal mode keeps the full betting command visible in its footer (${JSON.stringify(metrics)})`);
    assert.ok(metrics.amount >= 10, `${runtime}: horizontal progress-bar amounts remain readable (${JSON.stringify(metrics)})`);
    assert.ok(metrics.track >= 5, `${runtime}: horizontal progress bars remain visibly thick (${JSON.stringify(metrics)})`);
    assert.equal(metrics.firstLabelFits, true, `${runtime}: the standard option label remains fully visible (${JSON.stringify(metrics)})`);
  }
  await checkGeometry();
  await mount([{ ...base, runtime: 'editor' }, { ...base, runtime: 'obs' }, { ...base, runtime: 'preview' }]);
  assert.equal(await page.$$eval('.better-bets-stage', (els) => els.length), 3, 'Package preview, editor and OBS share Better Bets');
  const text = await page.$$eval('.bet-widget', (els) => els.map((el) => el.textContent));
  assert.equal(text[0], text[1]);
  assert.equal(text[0], text[2]);
  assert.match(text[0], /!pick <number> <amount>/, 'Horizontal progress bars keep the complete betting command in the readable footer');
  assert.match(text[0], /Pool share/);
  assert.match(text[0], /2:1[345]/, 'Uses real elapsed countdown');
  assert.equal(await page.$('.bet-entry input'), null, 'OBS hint is not a fake input');
  const timerBefore = await page.$eval('[data-appearance-part="timerStat"] strong', (el) => el.textContent);
  await page.waitForFunction((before) => document.querySelector('[data-appearance-part="timerStat"] strong').textContent !== before, {}, timerBefore);
  await mount([{ ...base, config: { ...base.config, betterVisibleOptions: 2 }, live: { bets: { opt_0: 100, opt_1: 100, opt_2: 800 } } }]);
  assert.deepEqual(await page.$$eval('.bar-pct', (els) => els.map((el) => el.textContent)), ['10%', '10%'], 'Pool share includes points on options outside the visible limit');
  assert.match(await page.$eval('.bet-entry', (el) => el.textContent), /!pick <number> <amount>/, 'Live pool updates keep the command visible');
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
  assert.ok(schema.styles.includes('compact_scoreboard'), 'Compact Scoreboard is available in the quick style picker');
  for (const id of ['cardAmountText', 'poolShareLabel']) {
    assert.ok(schema.better.includes(id), `${id} is editable in Better Bets`);
    assert.ok(!schema.legacy.includes(id), `${id} is not offered in unrelated styles`);
  }
  const scopedConfig = await page.evaluate(() => window.betsTest.scopedConfig());
  await mount([{ ...base, config: { ...base.config, ...scopedConfig } }]);
  assert.deepEqual(await page.$$eval('.bar-amount, .bets-grid-heading', (els) => [...new Set(els.map((el) => getComputedStyle(el).color))]), ['rgb(238, 204, 170)'], 'Canonical scoped appearance edits survive save/reload and render');

  const styleSelector = '[data-control-section="Bets Style"] select';
  for (const controls of ['simple', 'advanced']) {
    await mount([{ width: 320, height: 300, controls, simpleSections: ['Bets Style'], config: { displayStyle: 'better_bets' } }]);
    if (controls === 'advanced' && !(await page.$(styleSelector))) {
      await page.click('.bp-controls--bets .bp-panel-tabs[data-level="primary"] button[title="Appearance"]');
      await page.waitForSelector(styleSelector);
    }
    assert.ok(await page.$(styleSelector), `${controls}: exposes the Bets style selector`);
    assert.ok(
      await page.$eval(styleSelector, (select) => [...select.options].some((option) => option.value === 'compact_scoreboard' && option.textContent === 'Compact Scoreboard')),
      `${controls}: lists Compact Scoreboard by name`,
    );
    await page.select(styleSelector, 'compact_scoreboard');
    await page.waitForSelector('[data-case="0"] .bets-ov--compact-scoreboard');
    const compactSavedCases = await page.evaluate(() => JSON.parse(JSON.stringify(window.betsTest.updatedCases)));
    assert.equal(compactSavedCases[0].config.displayStyle, 'compact_scoreboard', `${controls}: style selection persists in widget config`);
    await mount(compactSavedCases.map((item) => ({ ...item, controls: undefined, runtime: 'obs' })));
    assert.ok(await page.$('[data-case="0"] .bets-ov--compact-scoreboard'), `${controls}: saved Compact Scoreboard renders in OBS`);

    await mount([{ width: 320, height: 300, controls, simpleSections: ['Bets Style', 'Colour Theme'], config: { displayStyle: 'compact_scoreboard', theme: 'neon' } }]);
    if (!(await page.$('.bp-controls--colour-theme .bp-theme-grid'))) {
      await page.click('[data-control-section="Colour Theme"] .bp-section__head');
      await page.waitForSelector('.bp-controls--colour-theme .bp-theme-grid');
    }
    const emeraldThemeButton = await page.$('.bp-controls--colour-theme .bp-theme-grid button:nth-child(6)');
    assert.ok(emeraldThemeButton, `${controls}: exposes shared colour themes for Compact Scoreboard`);
    await emeraldThemeButton.click();
    await page.waitForFunction(() => window.betsTest.updatedCases?.[0]?.config?.theme === 'emerald');
    const themedSavedCases = await page.evaluate(() => JSON.parse(JSON.stringify(window.betsTest.updatedCases)));
    assert.equal(themedSavedCases[0].config.colourTheme, 'emerald', `${controls}: colour theme selection persists in widget config`);
    assert.equal(
      await page.$eval('[data-case="0"] .bets-ov', (root) => root.style.getPropertyValue('--bets-bar-fill').trim()),
      '#6ee7b7',
      `${controls}: selected colour theme updates the editor preview`,
    );
    await mount(themedSavedCases.map((item) => ({ ...item, controls: undefined, runtime: 'obs' })));
    assert.equal(
      await page.$eval('[data-case="0"] .bets-ov', (root) => root.style.getPropertyValue('--bets-bar-fill').trim()),
      '#6ee7b7',
      `${controls}: selected colour theme survives reload in OBS`,
    );
  }

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
  const legacyStyleCases = [
    { displayStyle: 'v1_list', className: 'bets-ov--market-list', width: 430, height: 500 },
    { displayStyle: 'v2_grid', className: 'bets-ov--arcade-grid', width: 430, height: 500 },
    { displayStyle: 'v3_grid_2x3', className: 'bets-ov--grid-2x3', width: 600, height: 360 },
    { displayStyle: 'compact_scoreboard', className: 'bets-ov--compact-scoreboard', width: 260, height: 190 },
    { displayStyle: 'StyleSecaBets', className: 'bets-ov--styleseca', width: 400, height: 510 },
  ];
  for (const { displayStyle, width, height } of legacyStyleCases) {
    const emeraldConfig = await page.evaluate(
      ({ displayStyle }) => window.betsTest.themedConfig({ displayStyle }, 'emerald'),
      { displayStyle },
    );
    assert.equal(emeraldConfig.theme, 'emerald', `${displayStyle}: shared theme selection is saved`);
    assert.equal(emeraldConfig.bgColor, '#04120d', `${displayStyle}: shared background colour is saved`);
    assert.equal(emeraldConfig.barFill, '#6ee7b7', `${displayStyle}: shared accent colour is saved`);
    await mount(['editor', 'obs', 'preview'].map((runtime) => ({ width, height, runtime, config: emeraldConfig })));
    const emeraldSignatures = await page.$$eval('.bets-ov', (roots) => roots.map((root) => [
      root.style.getPropertyValue('--bets-bg').trim(),
      root.style.getPropertyValue('--bets-hdr-bg').trim(),
      root.style.getPropertyValue('--bets-bar-fill').trim(),
      root.style.getPropertyValue('--bets-text').trim(),
      root.style.getPropertyValue('--bets-border').trim(),
    ]));
    assert.equal(new Set(emeraldSignatures.map(JSON.stringify)).size, 1, `${displayStyle}: editor, OBS and preview share the selected theme`);
    assert.deepEqual(emeraldSignatures[0], ['#04120d', '#062719', '#6ee7b7', '#edfff7', '#15845b'], `${displayStyle}: Emerald colours reach its renderer`);

    const crimsonConfig = await page.evaluate(
      ({ displayStyle }) => window.betsTest.themedConfig({ displayStyle }, 'crimson'),
      { displayStyle },
    );
    await mount([{ width, height, runtime: 'obs', config: crimsonConfig }]);
    const crimsonSignature = await page.$eval('.bets-ov', (root) => root.style.getPropertyValue('--bets-bg').trim());
    assert.equal(crimsonSignature, '#100408', `${displayStyle}: changing the theme changes the rendered palette`);
  }
  for (const { displayStyle, className, width, height } of legacyStyleCases) {
    await mount([{ ...base, runtime: 'legacy', config: { displayStyle } }]);
    assert.equal(await page.$('.better-bets-stage'), null, `${displayStyle} keeps its renderer`);
    assert.ok(await page.$('.bets-ov'), `${displayStyle} still renders`);
    assert.ok(await page.$(`.${className}`), `${displayStyle} has its own visual identity class`);
    assert.equal(await page.$eval('.bets-ov', (root) => root.dataset.betsStyle), displayStyle, `${displayStyle} is identifiable in editor and OBS diagnostics`);

    await mount(['editor', 'obs', 'preview'].map((runtime) => ({ width, height, runtime, config: { displayStyle } })));
    await new Promise((resolve) => setTimeout(resolve, 650));
    const runtimeStyles = await page.$$eval('[data-case]', (hosts) => hosts.map((host) => {
      const root = host.querySelector('.bets-ov');
      const rootBox = root?.getBoundingClientRect();
      const hostBox = host.getBoundingClientRect();
      const cards = root ? [...root.querySelectorAll('.bets-ov__card, .bets-ov__row')] : [];
      return {
        style: root?.dataset.betsStyle,
        classes: root?.className || '',
        cardCount: cards.length,
        rootBox: rootBox ? { left: rootBox.left, top: rootBox.top, right: rootBox.right, bottom: rootBox.bottom, width: rootBox.width, height: rootBox.height } : null,
        hostBox: { left: hostBox.left, top: hostBox.top, right: hostBox.right, bottom: hostBox.bottom, width: hostBox.width, height: hostBox.height },
        insideFrame: Boolean(rootBox) && rootBox.left >= hostBox.left - 1 && rootBox.right <= hostBox.right + 1
          && rootBox.top >= hostBox.top - 1 && rootBox.bottom <= hostBox.bottom + 1,
        cardsInside: cards.every((card) => {
          const box = card.getBoundingClientRect();
          return box.left >= rootBox.left - 1 && box.right <= rootBox.right + 1
            && box.top >= rootBox.top - 1 && box.bottom <= rootBox.bottom + 1;
        }),
      };
    }));
    for (const [runtimeIndex, item] of runtimeStyles.entries()) {
      assert.equal(item.style, displayStyle, `${displayStyle}: ${['editor', 'obs', 'preview'][runtimeIndex]} keeps the saved style`);
      assert.match(item.classes, new RegExp(className), `${displayStyle}: ${['editor', 'obs', 'preview'][runtimeIndex]} uses the dedicated class`);
      assert.equal(item.cardCount, 6, `${displayStyle}: ${['editor', 'obs', 'preview'][runtimeIndex]} renders all six live choices`);
      assert.ok(item.insideFrame && item.cardsInside, `${displayStyle}: ${['editor', 'obs', 'preview'][runtimeIndex]} stays inside its widget frame (${JSON.stringify(item)})`);
    }
    const visualIdentity = await page.$eval('[data-case="0"]', (host) => {
      const root = host.querySelector('.bets-ov');
      const card = root.querySelector('.bets-ov__card, .bets-ov__row');
      return {
        rootShadow: getComputedStyle(root).boxShadow,
        rowMetaDisplay: getComputedStyle(root.querySelector('.bets-ov__row-meta') || root).display,
        cardClipPath: getComputedStyle(card).clipPath,
        cardBodyDisplay: getComputedStyle(root.querySelector('.bets-ov__card-body') || root).display,
        statsDisplay: getComputedStyle(root.querySelector('.bets-ov__stats')).display,
        hasSecaScaleFrame: Boolean(host.querySelector('.seca-bets-resize-container .seca-bets-design')),
      };
    });
    assert.notEqual(visualIdentity.rootShadow, 'none', `${displayStyle}: shared renderer CSS is loaded by the real editor entry point`);
    if (displayStyle === 'v1_list') assert.equal(visualIdentity.rowMetaDisplay, 'grid', 'List uses its market-ledger row grid');
    if (displayStyle === 'v2_grid') assert.match(visualIdentity.cardClipPath, /polygon/, 'Grid uses arcade tile geometry');
    if (displayStyle === 'v3_grid_2x3') assert.equal(visualIdentity.cardBodyDisplay, 'grid', 'Grid 2x3 uses the sportsbook card layout');
    if (displayStyle === 'compact_scoreboard') assert.equal(visualIdentity.statsDisplay, 'none', 'Compact Scoreboard removes the stats strip');
    if (displayStyle === 'StyleSecaBets') assert.equal(visualIdentity.hasSecaScaleFrame, true, 'StyleSeca keeps its fixed design scale frame');
  }

  await mount(legacyStyleCases.map(({ displayStyle, width, height }) => ({ width, height, runtime: 'obs', config: { displayStyle } })));
  await new Promise((resolve) => setTimeout(resolve, 650));
  const identitySignatures = await page.$$eval('[data-case]', (hosts) => hosts.map((host) => {
    const root = host.querySelector('.bets-ov');
    const card = root.querySelector('.bets-ov__card, .bets-ov__row');
    const body = root.querySelector('.bets-ov__card-body');
    return [
      getComputedStyle(root).boxShadow,
      card ? getComputedStyle(card).clipPath : 'list-row',
      body ? getComputedStyle(body).display : getComputedStyle(root.querySelector('.bets-ov__row-meta')).display,
    ].join('|');
  }));
  assert.equal(new Set(identitySignatures).size, legacyStyleCases.length, 'Every non-Better Bets style has a distinct computed visual signature');
  if (process.env.BETS_STYLES_SCREENSHOT) {
    await page.evaluate(() => {
      document.body.style.background = '#070a11';
      document.body.style.padding = '16px';
      document.querySelector('main').style.gap = '16px';
    });
    await page.screenshot({ path: process.env.BETS_STYLES_SCREENSHOT, fullPage: true });
  }
  const compactCases = ['editor', 'obs', 'preview'].map((runtime) => ({
    width: 230,
    height: 190,
    runtime,
    config: { displayStyle: 'compact_scoreboard', showTimer: true, showFooter: true },
  }));
  await mount(compactCases);
  await new Promise((resolve) => setTimeout(resolve, 650));
  const compactMeasurements = await page.$$eval('[data-case]', (hosts) => hosts.map((host) => {
    const root = host.querySelector('.bets-ov--compact-scoreboard');
    const hostBox = host.getBoundingClientRect();
    const rootBox = root?.getBoundingClientRect();
    const cards = root ? [...root.querySelectorAll('.bets-ov__card')] : [];
    const label = root?.querySelector('.bets-ov__card-label');
    const percentage = root?.querySelector('.bets-ov__card-pct');
    const footer = root?.querySelector('.bets-ov__hint');
    if (!root) return { hasRoot: false, html: host.innerHTML.slice(0, 600) };
    return {
      hasRoot: Boolean(root),
      cardCount: cards.length,
      statsHidden: getComputedStyle(root.querySelector('.bets-ov__stats')).display,
      insideFrame: rootBox.left >= hostBox.left - 1 && rootBox.right <= hostBox.right + 1
        && rootBox.top >= hostBox.top - 1 && rootBox.bottom <= hostBox.bottom + 1,
      cardsInside: cards.every((card) => {
        const box = card.getBoundingClientRect();
        return box.left >= rootBox.left - 1 && box.right <= rootBox.right + 1
          && box.top >= rootBox.top - 1 && box.bottom <= rootBox.bottom + 1;
      }),
      labelFontSize: Number.parseFloat(getComputedStyle(label).fontSize),
      percentageFontSize: Number.parseFloat(getComputedStyle(percentage).fontSize),
      footerText: footer?.textContent || '',
      text: root.textContent,
    };
  }));
  for (const [index, item] of compactMeasurements.entries()) {
    assert.ok(item.hasRoot, `${compactCases[index].runtime}: compact scoreboard renderer is selected`);
    assert.equal(item.cardCount, 6, `${compactCases[index].runtime}: all six live choices remain visible`);
    assert.equal(item.statsHidden, 'none', `${compactCases[index].runtime}: redundant stats do not consume small-screen space`);
    assert.ok(item.insideFrame && item.cardsInside, `${compactCases[index].runtime}: compact scoreboard fits 230x190 (${JSON.stringify(item)})`);
    assert.ok(item.labelFontSize >= 11, `${compactCases[index].runtime}: choice labels remain readable`);
    assert.ok(item.percentageFontSize >= 15, `${compactCases[index].runtime}: percentages remain readable`);
    assert.match(item.footerText, /Bet: !pick <number>/, `${compactCases[index].runtime}: compact command hint remains available`);
  }
  assert.equal(compactMeasurements[0].text, compactMeasurements[1].text, 'Compact editor and OBS use the same live data');
  assert.equal(compactMeasurements[0].text, compactMeasurements[2].text, 'Compact preview matches the live renderer');
  if (process.env.BETS_COMPACT_SCREENSHOT) {
    await (await page.$('[data-case="0"]')).screenshot({ path: process.env.BETS_COMPACT_SCREENSHOT });
  }
  await mount([{ width: 360, height: 510, config: { layoutMode: 'cards', columns: 2 } }, base, { ...base, live: { gameStatus: 'result', winnerOption: 2 } }]);
  await checkGeometry();
  if (process.env.BETS_SCREENSHOT) await page.screenshot({ path: process.env.BETS_SCREENSHOT, fullPage: true });
  if (process.env.BETS_ORIENTATION_SCREENSHOT) {
    await page.setViewport({ width: 680, height: 560 });
    await mount(['vertical', 'horizontal'].map((orientation) => ({ width: 320, height: 540, runtime: 'obs', config: { layoutMode: 'bars', columns: 2, orientation } })));
    await checkGeometry();
    await page.screenshot({ path: process.env.BETS_ORIENTATION_SCREENSHOT, fullPage: true });
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(`Better Bets passed ${cases.length} responsive configurations, 54 narrow-frame orientation comparisons, Simple/Advanced orientation clicks and reload, shared preview/OBS, live countdown/states, appearance isolation, reduced motion and legacy layouts.`);
} finally {
  await browser.close();
}
