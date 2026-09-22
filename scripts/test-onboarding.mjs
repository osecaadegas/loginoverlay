import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { setupNavigation, shouldStartTutorial } from '../shared/overlayOnboarding.js';
assert.deepEqual(setupNavigation({ quickSetup: true, currentStep: 0 }).steps, [0, 5, 6]);
assert.equal(setupNavigation({ quickSetup: true, currentStep: 5 }).previous, 0);
for (let currentStep = 0; currentStep < 7; currentStep++) assert.equal(setupNavigation({ currentStep }).step, currentStep);
for (const panel of ['home', 'setup', 'integrations', 'preview', 'widget-detail']) assert.equal(shouldStartTutorial(panel), false);
assert.equal(shouldStartTutorial('tutorial'), true);
const centerSource = readFileSync(new URL('../src/components/OverlayCenter/OverlayControlCenter.jsx', import.meta.url), 'utf8');
assert(!centerSource.includes('tutorial.status === "in_progress"'));
assert(!centerSource.includes('firstRunPanels'));

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/__onboarding-test') {
      await request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#c5c6c8"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    } else if (url.pathname === '/src/services/serviceReadinessService.js') {
      await request.respond({ contentType: 'application/javascript', body: 'export async function checkAllServiceReadiness() { window.readinessCalls = (window.readinessCalls || 0) + 1; if (window.failReadiness) throw new Error("Readiness test unavailable"); return { checks: [], checkedAt: new Date().toISOString() }; }' });
    } else if (url.hostname === 'static-cdn.jtvnw.net' || url.hostname === 'cdn.betterttv.net') {
      await request.respond({ contentType: 'image/webp', body: readFileSync(new URL('../public/player.webp', import.meta.url)) });
    } else if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) {
      await request.continue();
    } else if (['data:', 'blob:'].includes(url.protocol)) await request.continue();
    else await request.abort();
  });
  await page.setViewport({ width: 1600, height: 1100 });
  await page.goto(`${baseUrl}/__onboarding-test`, { waitUntil: 'networkidle0' });
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  await page.evaluate(async version => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js?v=' + version);
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js?v=' + version);
    const { SetupWizard } = await import('/src/components/OverlayCenter/OverlayControlCenter.jsx');
    const { default: GuidedTutorial } = await import('/src/components/OverlayCenter/GuidedTutorial.jsx');
    const { normalizeSetupDetails } = await import('/shared/serviceSetupModel.js');
    const root = ReactDOM.createRoot(document.getElementById('root'));
    window.writes = []; window.created = []; window.pages = [];
    window.mountWizard = (options = {}) => {
      function Harness() {
        const [widgets, setWidgets] = React.useState(options.widgets || []);
        const [setup, setSetup] = React.useState({ quickSetup: true, currentStep: 0, status: 'not_started', selectedTools: ['background'], details: normalizeSetupDetails({ overlayName: 'My overlay' }), ...options });
        return React.createElement(SetupWizard, {
          setup, widgets, theme: {}, instance: { id: 'test', overlay_token: 'test-only' }, integrations: {},
          saveSetup: async next => { if (window.failSave) throw new Error('Save test unavailable'); await new Promise(resolve => setTimeout(resolve, 20)); window.writes.push(next); setSetup(next); },
          saveTheme: async () => {},
          addWidget: async type => { window.created.push(type); setWidgets(prev => [...prev, { id: type, widget_type: type, config: {} }]); },
          saveWidget: async (widget, options) => { if (!options?.immediate) throw new Error('Setup must await widget writes'); if (window.failWidgetSave) throw new Error('Widget save failed'); },
          onFinish: () => { window.finished = true; }, onExit: () => { window.exited = true; },
        });
      }
      root.render(React.createElement(Harness, { key: Date.now() }));
    };
    window.mountTour = () => {
      function TourHarness() {
        const [active, setActive] = React.useState(true);
        return React.createElement(GuidedTutorial, { active, onClose: () => { window.tourClosed = true; setActive(false); }, goToPage: page => window.pages.push(page) });
      }
      root.render(React.createElement(TourHarness, { key: Date.now() }));
    };
  }, browserHash);
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const mount = async options => { await page.evaluate(options => window.mountWizard(options), options); await settle(); };
  const click = async text => { await page.evaluate(text => {
    const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text);
    if (!button || button.disabled) throw new Error('Button unavailable: ' + text);
    button.click();
  }, text); await settle(); };
  await mount();
  assert.match(await page.$eval('.oc2-eyebrow', el => el.textContent), /1 of 3/);
  if (process.env.TEST_SETUP_SCREENSHOT_PATH) await page.screenshot({ path: process.env.TEST_SETUP_SCREENSHOT_PATH, fullPage: true });
  await click('Save and continue');
  await page.waitForFunction(() => window.writes.at(-1)?.currentStep === 5);
  await page.waitForFunction(() => document.querySelector('.oc2-eyebrow')?.textContent.includes('2 of 3'));
  assert.deepEqual(await page.evaluate(() => window.created), ['background']);
  assert.equal(await page.$$eval('.oc2-service-section[open]', els => els.length), 0, 'Optional service details start closed');
  await click('Back');
  assert.match(await page.$eval('.oc2-eyebrow', el => el.textContent), /1 of 3/);
  await click('Save and continue');
  await page.waitForFunction(() => document.querySelector('.oc2-eyebrow')?.textContent.includes('2 of 3'));
  assert.deepEqual(await page.evaluate(() => window.created), ['background'], 'Back/next must not duplicate tools');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Continue') && !b.disabled));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Continue') && !b.disabled).click());
  await page.waitForFunction(() => document.querySelector('.oc2-eyebrow')?.textContent.includes('3 of 3'));
  await click('Finish setup');
  await page.waitForFunction(() => window.finished === true);
  assert.equal(await page.evaluate(() => window.writes.at(-1).status), 'completed');
  await mount({ currentStep: 0 });
  await page.evaluate(() => { window.failSave = true; window.exited = false; });
  await click('Save and exit');
  assert.match(await page.$eval('.oc2-error-list', el => el.textContent), /Save test unavailable/);
  assert.equal(await page.evaluate(() => window.exited), false);
  await page.evaluate(() => { window.failSave = false; });
  await click('Save and exit');
  await page.waitForFunction(() => window.exited === true);
  await mount({ quickSetup: false, currentStep: 2 });
  assert.match(await page.$eval('.oc2-eyebrow', el => el.textContent), /3 of 7/);
  assert.equal(await page.$eval('h1', el => el.textContent), 'Branding');
  await page.evaluate(() => { window.failReadiness = true; });
  await mount({ currentStep: 5 });
  await page.waitForFunction(() => document.body.textContent.includes('Readiness test unavailable'));
  assert.equal(await page.$$eval('button', buttons => buttons.find(b => b.textContent.includes('Continue')).disabled), true, 'A failed readiness request must not allow continuation');
  await page.evaluate(() => { window.failReadiness = false; window.mountTour(); });
  await settle();
  await page.setViewport({ width: 390, height: 844 });
  for (let step = 1; step < 5; step++) {
    await page.waitForFunction(() => !document.querySelector('.gt-tooltip--waiting'));
    await click('Next →');
    assert.match(await page.$eval('.gt-tooltip-step', el => el.textContent), new RegExp((step + 1) + ' / 5'));
  }
  await click('Finish ✓');
  assert.equal(await page.evaluate(() => window.tourClosed), true);
  assert.equal(await page.evaluate(() => window.pages.some(page => ['editor', 'appearance', 'approvals'].includes(page))), false);
  await page.evaluate(() => { window.mountTour(); Storage.prototype.setItem = () => { throw new Error('Storage blocked'); }; });
  await settle();
  await click('Skip tour ✕');
  assert.equal(await page.$('.gt-overlay'), null, 'Skipping works with blocked storage');
  assert.deepEqual(errors, []);
  console.log('Onboarding: three-step completion, legacy resume, no duplicate tools, save/exit failures, readiness failure gating, optional sections, five-step tour and blocked storage passed.');
} finally { await browser.close(); }
