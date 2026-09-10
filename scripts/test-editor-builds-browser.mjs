import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/__editor-build-test') {
      await request.respond({ contentType: 'text/html', body: `<html><body style="margin:0"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    } else if (url.pathname.startsWith('/api/')) {
      await request.respond({ contentType: 'application/json', body: JSON.stringify({ requests: [], actions: [], best: null }) });
    } else if (url.origin === new URL(baseUrl).origin) {
      await request.continue();
    } else {
      await request.abort();
    }
  });
  await page.goto(`${baseUrl}/__editor-build-test`, { waitUntil: 'networkidle0' });
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  const mount = (tables) => page.evaluate(async ({ version, tables }) => {
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { MemoryRouter } = await import(`/node_modules/.vite/deps/react-router-dom.js?v=${version}`);
    const { AuthProvider } = await import('/src/context/AuthContext.jsx');
    const { supabase } = await import('/src/config/supabaseClient.js');
    const { createOverlayTestDatabase } = await import('/scripts/helpers/overlay-build-test-db.mjs');
    const { createBetterInstance, normalizeBetterLayout } = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const { default: Editor } = await import('/src/components/OverlayCenter/editor/WidgetEditorPage.jsx');
    const user = { id: 'build-user', user_metadata: {} };
    const layout = (name, label) => normalizeBetterLayout({ name, instances: [
      createBetterInstance('background', { visible: false }),
      createBetterInstance('bonus_hunt', { label, config: { animations: false, showRequests: false } }),
    ] });
    const defaults = {
      better_editor_overlays: [
        { id: 'build-a', user_id: user.id, public_overlay_id: `bo_${'a'.repeat(48)}`, draft_layout: layout('Stream A', 'Original Hunt'), draft_version: 1, published_version: 0 },
        { id: 'build-b', user_id: user.id, public_overlay_id: `bo_${'b'.repeat(48)}`, draft_layout: layout('Stream B', 'Second Hunt'), draft_version: 1, published_version: 0 },
      ],
      overlay_instances: [{ id: 'legacy', user_id: user.id, is_active: true }],
      overlay_themes: [{ user_id: user.id, overlay_id: 'legacy' }],
      overlay_widgets: [],
    };
    const { client, state } = createOverlayTestDatabase(tables || defaults);
    supabase.from = client.from;
    supabase.channel = client.channel;
    supabase.removeChannel = client.removeChannel;
    supabase.auth.getSession = async () => ({ data: { session: { user, access_token: 'test-fixture' } } });
    supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
    const root = ReactDOM.createRoot(document.getElementById('root'));
    window.buildTest = { state, unmount: () => root.unmount() };
    root.render(React.createElement(AuthProvider, null, React.createElement(MemoryRouter, null, React.createElement(Editor))));
  }, { version: browserHash, tables });
  await mount();
  await page.waitForSelector('[aria-label="Original Hunt actions"]');
  const clickText = (text, scope = 'body') => page.evaluate(({ text, scope }) => {
    const button = [...document.querySelector(scope).querySelectorAll('button')].find((element) => element.textContent.trim() === text);
    if (!button) throw new Error(`Button not found: ${text}`);
    button.click();
  }, { text, scope });
  const enterName = async (selector, value) => {
    await page.click(selector, { clickCount: 3 });
    await page.type(selector, value);
  };
  await page.click('[aria-label="Original Hunt actions"]');
  await clickText('Rename widget', '.better-editor-widget-list');
  await enterName('[aria-label="Widget name"]', 'My Live Hunt');
  await page.evaluate(() => { window.buildTest.state.delay = 700; });
  await page.keyboard.press('Enter');
  await clickText('Stream B', '.better-editor-builds__list');
  await page.waitForSelector('[aria-label="Second Hunt actions"]');
  assert.equal(await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.find((row) => row.id === 'build-a').draft_layout.instances.find((item) => item.widgetType === 'bonus_hunt').label), 'My Live Hunt');
  assert.equal(await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.find((row) => row.id === 'build-b').draft_version), 1);

  await clickText('Stream A', '.better-editor-builds__list');
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  await page.click('[aria-label="Rename overlay build"]');
  await enterName('.better-editor-name-dialog input', 'My Daytime Build');
  await clickText('Save', '.better-editor-name-dialog');
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  await page.waitForFunction(() => document.querySelector('.better-editor-builds__list [aria-current]')?.textContent.includes('My Daytime Build'));

  await page.click('[aria-label="Duplicate overlay build"]');
  await enterName('.better-editor-name-dialog input', 'My Evening Build');
  await clickText('Create', '.better-editor-name-dialog');
  await page.waitForFunction(() => document.querySelector('.better-editor-builds__list [aria-current]')?.textContent.includes('My Evening Build'));
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  assert.equal(await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.length), 3);
  await clickText('Publish to OBS');
  await page.waitForFunction(() => window.buildTest.state.tables.better_overlay_publications?.length === 1);
  assert.equal(await page.evaluate(() => window.buildTest.state.tables.better_overlay_publications[0].published_layout.name), 'My Evening Build');
  assert.equal(await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.find((row) => row.id === 'build-a').published_version), 0);

  // A different folder's broadcast must not replace the selected build.
  await page.evaluate(async () => {
    const channel = new BroadcastChannel('streamers-center-better-editor:build-user');
    channel.postMessage({ type: 'better-editor-draft-saved', overlayId: 'build-b', draftVersion: 999 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    channel.close();
  });
  assert.match(await page.$eval('.better-editor-builds__list [aria-current]', (element) => element.textContent), /My Evening Build/);
  const tables = await page.evaluate(() => window.buildTest.state.tables);
  await page.evaluate(() => window.buildTest.unmount());
  await page.reload({ waitUntil: 'networkidle0' });
  await mount(tables);
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  assert.match(await page.$eval('.better-editor-builds__list [aria-current]', (element) => element.textContent), /My Evening Build/);

  await page.click('[aria-label="New overlay build"]');
  await enterName('.better-editor-name-dialog input', 'Fresh Build');
  await clickText('Create', '.better-editor-name-dialog');
  await page.waitForFunction(() => document.querySelector('.better-editor-builds__list [aria-current]')?.textContent.includes('Fresh Build'));
  assert.equal(await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.length), 4);
  await clickText('My Daytime Build', '.better-editor-builds__list');
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  await page.click('.better-editor-widget-row__main:has([title="My Live Hunt"])');
  await clickText('Content');
  const rowControl = () => page.evaluate(() => [...document.querySelectorAll('.bp-slider')].some((label) => label.querySelector('em')?.textContent === 'Visible request rows'));
  assert.equal(await rowControl(), false, 'Vertical widgets do not expose a request row control');
  await clickText('Layout');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.querySelector('strong')?.textContent === 'Horizontal').click());
  await clickText('Content');
  assert.equal(await rowControl(), true, 'Horizontal request lists expose a row control');
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('.bp-slider')].find((label) => label.querySelector('em')?.textContent === 'Visible request rows').querySelector('input');
    input.focus();
  });
  await page.keyboard.press('End');
  await clickText('Stream B', '.better-editor-builds__list');
  await page.waitForSelector('[aria-label="Second Hunt actions"]');
  const requestConfig = await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.find((row) => row.id === 'build-a').draft_layout.instances.find((item) => item.widgetType === 'bonus_hunt').config);
  assert.equal(requestConfig.requestVisibleRows, 8);
  assert.ok(requestConfig.widgetHeight >= 8 * 58 + 112, 'Increasing row count also makes room in the widget frame');
  await clickText('My Daytime Build', '.better-editor-builds__list');
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  await page.click('.better-editor-widget-row__main:has([title="My Live Hunt"])');
  await clickText('Content');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.bp-slider')].find((label) => label.querySelector('em')?.textContent === 'Visible request rows').querySelector('input').value), '8');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.querySelector('strong')?.textContent === '3D').click());
  assert.equal(await rowControl(), false, 'Carousel does not expose a list row control');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.querySelector('strong')?.textContent === 'List').click());
  await clickText('Layout');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.querySelector('strong')?.textContent === 'Cards').click());
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.querySelector('strong')?.textContent === 'Vertical').click());
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.querySelector('strong')?.textContent === 'Horizontal').click());
  await clickText('Save Draft');
  await page.waitForFunction(() => window.buildTest.state.tables.better_editor_overlays.find((row) => row.id === 'build-a').draft_layout.instances.find((item) => item.widgetType === 'bonus_hunt').config.listMode === 'image');
  assert.ok(await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.find((row) => row.id === 'build-a').draft_layout.instances.find((item) => item.widgetType === 'bonus_hunt').config.widgetHeight >= 8 * 106 + 112), 'List style and orientation changes preserve room for all requested rows');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Save Draft' && !button.disabled));
  await clickText('Save Draft');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Save Draft' && !button.disabled));
  if (process.env.EDITOR_SCREENSHOT) await page.screenshot({ path: process.env.EDITOR_SCREENSHOT });
  await page.setViewport({ width: 390, height: 844 });
  const fits = (selector, parentSelector) => page.evaluate(({ selector, parentSelector }) => [...document.querySelectorAll(selector)].every((element) => {
    const bounds = element.getBoundingClientRect();
    const parent = element.closest(parentSelector).getBoundingClientRect();
    return bounds.left >= parent.left && bounds.right <= parent.right && bounds.top >= parent.top && bounds.bottom <= parent.bottom;
  }), { selector, parentSelector });
  assert.equal(await fits('.better-editor-builds__heading button', '.better-editor-builds'), true, 'Folder actions fit the narrow sidebar');
  await page.click('[aria-label="Rename overlay build"]');
  assert.equal(await page.$eval('dialog', (dialog) => { const box = dialog.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; }), true, 'Name dialog fits mobile viewport');
  await clickText('Cancel', '.better-editor-name-dialog');
  await page.click('[aria-label="My Live Hunt actions"]');
  await clickText('Rename widget', '.better-editor-widget-list');
  if (process.env.EDITOR_SCREENSHOT) await page.screenshot({ path: process.env.EDITOR_SCREENSHOT });
  const renameBounds = await page.evaluate(() => [...document.querySelectorAll('.better-editor-widget-row__rename input, .better-editor-widget-row__rename button')].map((element) => ({ tag: element.tagName, box: element.getBoundingClientRect().toJSON(), parent: element.closest('.better-editor-widget-row').getBoundingClientRect().toJSON() })));
  assert.equal(await fits('.better-editor-widget-row__rename input, .better-editor-widget-row__rename button', '.better-editor-widget-row'), true, `Rename controls remain inside their narrow widget row: ${JSON.stringify(renameBounds)}`);
  await page.click('[aria-label="Cancel rename"]');
  assert.deepEqual(errors, []);
  await page.evaluate(() => window.buildTest.unmount());
  console.log('Editor UI checks passed: rename widgets/builds, switch with pending save, copy/create folders, isolated publication, cross-window isolation, horizontal row controls and reload.');
} finally {
  await browser.close();
}
