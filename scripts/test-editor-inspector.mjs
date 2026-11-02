import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const origin = new URL(base).origin;
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/__editor-inspector-test') return request.respond({
      contentType: 'text/html',
      body: `<html><body style="margin:0;background:#071a34"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>`,
    });
    if (url.origin === origin && !url.pathname.startsWith('/api/')) return request.continue();
    return request.abort();
  });
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${base}/__editor-inspector-test`);
  const entry = await (await fetch(`${base}/src/main.jsx`)).text();
  const react = entry.match(/from "([^"\n]*\/react.js\?[^"\n]*)"/)[1];
  const dom = entry.match(/from "([^"\n]*\/react-dom_client.js\?[^"\n]*)"/)[1];
  await page.evaluate(async ({ react, dom }) => {
    const { default: React } = await import(react);
    const { default: ReactDOM } = await import(dom);
    const { default: EditorInspector } = await import('/src/components/OverlayCenter/editor/EditorInspector.jsx');
    const { createBetterInstance } = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const { supabase } = await import('/src/config/supabaseClient.js');
    supabase.rpc = () => Promise.resolve({ data: [], error: null });
    await import('/src/index.css');
    await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
    await import('/src/components/OverlayCenter/editor/EditorWorkspace.css');
    await import('/src/components/OverlayCenter/editor/WidgetEditorPageTheme.css');
    const instance = createBetterInstance('slideshow_frame');
    window.originalConfig = JSON.stringify(instance.config);
    function Host() {
      const [preferences, setPreferences] = React.useState({});
      const [config, setConfig] = React.useState(instance.config);
      window.currentConfig = JSON.stringify(config);
      return React.createElement(EditorInspector, {
        instance: { ...instance, config }, preferences,
        onPreferences: patch => setPreferences(previous => ({ ...previous, ...patch })),
        onUpdate() {}, onConfigChange: setConfig, onWidgetChange() {},
        allWidgets: [], user: { id: '11111111-1111-4111-8111-111111111111' },
      });
    }
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement('aside', {
      className: 'editor-workspace', style: { width: 350, minHeight: '100vh' },
    }, React.createElement(Host)));
  }, { react, dom });
  await page.waitForSelector('.editor-inspector[data-mode="simple"] .bp-section');
  assert.equal(await page.$eval('.editor-geometry', element => element.open), false);
  assert.equal(await page.$eval('.editor-inspector-mode-switch button:first-child', button => button.getAttribute('aria-pressed')), 'true');
  assert.equal(await page.$eval('.editor-inspector', element => element.querySelectorAll('.bp-section__head[aria-expanded="true"]').length), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const sections = await page.$$eval('.editor-inspector .bp-section__head', buttons => buttons.map(button => button.textContent.trim()));
  assert(sections.length >= 2);
  await page.click('.editor-inspector .bp-section:nth-of-type(2) .bp-section__head');
  assert.equal(await page.$eval('.editor-inspector', element => element.querySelectorAll('.bp-section__head[aria-expanded="true"]').length), 1);
  await page.click('.editor-inspector-mode-switch button:last-child');
  await page.waitForSelector('.editor-inspector[data-mode="advanced"] input[aria-label="Search settings"]');
  await page.type('input[aria-label="Search settings"]', 'colour');
  assert.equal(await page.$eval('.editor-scoped-controls', element => element.dataset.searching), 'true');
  await page.click('.editor-inspector-mode-switch button:first-child');
  await page.waitForSelector('.editor-inspector[data-mode="simple"]');
  assert.equal(await page.$('input[aria-label="Search settings"]'), null);
  assert.equal(await page.evaluate(() => window.currentConfig), await page.evaluate(() => window.originalConfig), 'Inspector navigation leaves saved widget settings untouched');
  assert.deepEqual(errors, []);
  console.log('Inspector quick edit, focused sections, fine tune, search and narrow layout passed.');
} finally {
  await browser.close();
}
