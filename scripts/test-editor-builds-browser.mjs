import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const browser = await puppeteer.launch({ headless: true });
let page;
try {
  page = await browser.newPage();
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
    await import('/src/index.css');
    await import('/src/styles/custom-fonts.css');
    await import('/src/styles/theme-system.css');
    await import('/src/styles/utilities.css');
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
  const openBuilds = async () => {
    if (!await page.$eval('.editor-build-picker', (dialog) => dialog.open)) await page.click('[aria-label="Choose overlay build"]');
    await page.waitForFunction(() => !document.querySelector('.editor-build-picker [role="status"]'));
  };
  const clickText = async (text, scope = 'body') => {
    if (scope === '.better-editor-builds__list') await openBuilds();
    await page.evaluate(({ text, scope }) => {
    const button = [...document.querySelector(scope).querySelectorAll('button')].find((element) => element.textContent.trim() === text || (scope === '.better-editor-builds__list' && element.title === text));
    if (!button) throw new Error(`Button not found: ${text}`);
    button.click();
  }, { text, scope });
  };
  const buildAction = async (label) => { await openBuilds(); await page.click(`[aria-label="${label}"]`); };
  const editorAction = async (label) => {
    if (!await page.$eval('.editor-actions-menu', (menu) => menu.open)) await page.click('[aria-label="More editor actions"]');
    await clickText(label, '.editor-actions-menu-panel');
  };
  const selectedBuild = () => page.$eval('[aria-label="Choose overlay build"]', (element) => element.textContent);
  const waitBuild = (name) => page.waitForFunction((name) => document.querySelector('[aria-label="Choose overlay build"]')?.textContent === name && !document.querySelector('dialog[open]'), {}, name);
  const enterName = async (selector, value) => {
    await page.click(selector, { clickCount: 3 });
    await page.type(selector, value);
  };
  const searchSettings = (value) => enterName('[aria-label="Search settings"]', value);
  const clearSettingsSearch = () => page.click('[aria-label="Clear settings search"]');
  const choose = (label) => page.evaluate((label) => [...document.querySelectorAll('.editor-scoped-controls button')].find((button) => button.querySelector('strong')?.textContent === label).click(), label);
  const saveDraft = async () => {
    await editorAction('Save Draft');
    await page.waitForFunction(() => document.querySelector('.editor-save-status > span')?.textContent === 'Saved');
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
  await buildAction('Rename overlay build');
  await enterName('.better-editor-name-dialog input', 'My Daytime Build');
  await clickText('Save', '.better-editor-name-dialog');
  await waitBuild('My Daytime Build');

  await buildAction('Duplicate overlay build');
  await enterName('.better-editor-name-dialog input', 'My Evening Build');
  await clickText('Create', '.better-editor-name-dialog');
  await waitBuild('My Evening Build');
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
  assert.match(await selectedBuild(), /My Evening Build/);
  const tables = await page.evaluate(() => window.buildTest.state.tables);
  await page.evaluate(() => window.buildTest.unmount());
  await page.reload({ waitUntil: 'networkidle0' });
  await mount(tables);
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  assert.match(await selectedBuild(), /My Evening Build/);

  await buildAction('New overlay build');
  await enterName('.better-editor-name-dialog input', 'Fresh Build');
  await clickText('Create', '.better-editor-name-dialog');
  await waitBuild('Fresh Build');
  assert.equal(await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.length), 4);
  await clickText('My Daytime Build', '.better-editor-builds__list');
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  await page.click('.better-editor-widget-row__main:has([title="My Live Hunt"])');
  await searchSettings('Chat Requests');
  const rowControl = () => page.evaluate(() => [...document.querySelectorAll('.bp-slider')].some((label) => label.querySelector('em')?.textContent === 'Visible request rows'));
  assert.equal(await rowControl(), false, 'Vertical widgets do not expose a request row control');
  await searchSettings('Orientation');
  await choose('Horizontal');
  await clearSettingsSearch();
  assert.equal(await page.$eval('[aria-label="Frame Height"]', input => input.value), '220', 'Horizontal selection frame uses compact geometry');
  await searchSettings('Chat Requests');
  await clickText('Show requests feed');
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
  assert.equal(requestConfig.widgetHeight, 8 * ({ compact: 44, image: 56, names: 30 }[requestConfig.listMode]) + 88, 'Increasing row count makes only the required room in the widget frame');
  await clickText('My Daytime Build', '.better-editor-builds__list');
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  await page.click('.better-editor-widget-row__main:has([title="My Live Hunt"])');
  await searchSettings('Chat Requests');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.bp-slider')].find((label) => label.querySelector('em')?.textContent === 'Visible request rows').querySelector('input').value), '8');
  await choose('3D');
  assert.equal(await rowControl(), false, 'Carousel does not expose a list row control');
  await choose('List');
  await searchSettings('List Style');
  await choose('Cards');
  await searchSettings('Orientation');
  await choose('Vertical');
  await choose('Horizontal');
  await saveDraft();
  await page.waitForFunction(() => window.buildTest.state.tables.better_editor_overlays.find((row) => row.id === 'build-a').draft_layout.instances.find((item) => item.widgetType === 'bonus_hunt').config.listMode === 'image');
  assert.equal(await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.find((row) => row.id === 'build-a').draft_layout.instances.find((item) => item.widgetType === 'bonus_hunt').height), 8 * 56 + 88, 'List style and orientation changes preserve room for all compact request cards');
  await clearSettingsSearch();

  // UI preferences are local and must not write widget data or trigger a source reload.
  const callsBeforePreferences = await page.evaluate(() => window.buildTest.state.calls.length);
  await clickText('Advanced', '.editor-inspector-tools');
  await clickText('Appearance', '.bp-panel-tabs');
  await searchSettings('not-a-setting');
  assert.equal(await page.$eval('.editor-no-settings', (element) => getComputedStyle(element).display !== 'none'), true);
  await searchSettings('Chat Requests');
  assert.equal(await rowControl(), true, 'Search reaches sections in another category');
  await clearSettingsSearch();
  await page.click('[aria-label="Snapping"]');
  await page.select('[aria-label="Canvas zoom"]', '1');
  await page.click('[aria-label="Zoom to selection"]');
  await page.click('[aria-label="Zoom to selection"]');
  await page.click('[aria-label="Fit canvas"]');
  assert.equal(await page.evaluate(() => window.buildTest.state.calls.length), callsBeforePreferences);
  await clickText('Simple', '.editor-inspector-tools');
  await page.click('.editor-check input');
  await enterName('[aria-label="Frame Width"]', '600');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('[aria-label="Frame Width"]', (input) => input.value), '600', 'Frame width accepts complete numbers before clamping');
  await enterName('[aria-label="Frame Height"]', '700');
  await page.keyboard.press('Enter');
  await saveDraft();
  assert.deepEqual(await page.evaluate(() => {
    const instance = window.buildTest.state.tables.better_editor_overlays.find((row) => row.id === 'build-a').draft_layout.instances.find((item) => item.widgetType === 'bonus_hunt');
    return [instance.width, instance.height, instance.config.widgetWidth, instance.config.widgetHeight];
  }), [600, 700, 600, 700], 'Fit content persists matching frame and content dimensions');
  await page.click('.editor-check input');

  // Save failures leave the editor and its unsaved values intact.
  await page.evaluate(() => { window.buildTest.state.failSave = true; window.buildTest.state.delay = 0; });
  await enterName('[aria-label="Frame X"]', '250');
  await editorAction('Save Draft');
  await page.waitForSelector('.editor-save-error');
  assert.equal(await page.$eval('[aria-label="Frame X"]', (input) => input.value), '250');
  assert.ok(await page.$('.better-editor-canvas'));
  await page.evaluate(() => { window.buildTest.state.failSave = false; });
  await clickText('Retry save', '.editor-save-error');
  await page.waitForSelector('.editor-save-error', { hidden: true });
  await page.click('[aria-label="Undo"]');
  assert.notEqual(await page.$eval('[aria-label="Frame X"]', (input) => input.value), '250');
  await page.click('[aria-label="Redo"]');
  assert.equal(await page.$eval('[aria-label="Frame X"]', (input) => input.value), '250');
  await page.click('[aria-label="Align left"]');
  assert.equal(await page.$eval('[aria-label="Frame X"]', (input) => input.value), '0');

  await page.click('[aria-label="Zoom to selection"]');
  const canvasScale = await page.$eval('.better-editor-canvas', (element) => element.getBoundingClientRect().width / 1920);
  const dragFrame = await page.$eval('.better-editor-canvas-instance.is-selected', (element) => element.getBoundingClientRect().toJSON());
  const previousY = Number(await page.$eval('[aria-label="Frame Y"]', (input) => input.value));
  await page.mouse.move(dragFrame.left + 40, dragFrame.top + 50);
  await page.mouse.down();
  await page.mouse.move(dragFrame.left + 40 + 15 * canvasScale, dragFrame.top + 50 + 20 * canvasScale, { steps: 5 });
  await page.mouse.up();
  assert.ok(Math.abs(Number(await page.$eval('[aria-label="Frame X"]', (input) => input.value)) - 15) <= 1, `Dragging respects zoomed coordinates: ${JSON.stringify(await page.evaluate(() => ['.better-editor-canvas-shell', '.editor-canvas-pan-area', '.better-editor-canvas-viewport', '.better-editor-canvas', '.better-editor-canvas-instance.is-selected'].map((selector) => { const element = document.querySelector(selector); const css = getComputedStyle(element); return { selector, box: element.getBoundingClientRect().toJSON(), scrollLeft: element.scrollLeft, scrollWidth: element.scrollWidth, width: css.width, maxWidth: css.maxWidth, display: css.display }; })))}`);
  assert.ok(Math.abs(Number(await page.$eval('[aria-label="Frame Y"]', (input) => input.value)) - previousY - 20) <= 1);
  const handle = await page.$eval('[aria-label="Resize se"]', (element) => element.getBoundingClientRect().toJSON());
  await page.mouse.move(handle.left + handle.width / 2, handle.top + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.left + handle.width / 2 + 40 * canvasScale, handle.top + handle.height / 2 + 30 * canvasScale, { steps: 5 });
  await page.mouse.up();
  assert.ok(Math.abs(Number(await page.$eval('[aria-label="Frame Width"]', (input) => input.value)) - 640) <= 1, 'Resize handles respect zoomed coordinates');
  assert.ok(Math.abs(Number(await page.$eval('[aria-label="Frame Height"]', input => input.value)) - 730) <= 1, 'Horizontal resize handles retain the requested height');
  await saveDraft();
  assert.ok(Math.abs(await page.evaluate(() => window.buildTest.state.tables.better_editor_overlays.find(row => row.id === 'build-a').draft_layout.instances.find(item => item.widgetType === 'bonus_hunt').config.horizontalHeight) - 730) <= 1, 'Manual horizontal height survives draft normalization');
  await page.click('[aria-label="Undo"]');
  await page.click('[aria-label="Undo"]');
  assert.equal(await page.$eval('[aria-label="Frame X"]', (input) => input.value), '0', 'Each drag or resize is one undo step');
  await page.click('[aria-label="Fit canvas"]');

  await page.click('[aria-label="Lock My Live Hunt"]');
  assert.equal(await page.$eval('[aria-label="Frame X"]', (input) => input.matches(':disabled')), true);
  await page.click('[aria-label="Unlock My Live Hunt"]');
  await page.click('[aria-label="Hide My Live Hunt"]');
  assert.equal(await page.$$('.better-editor-canvas-instance:not(.is-background)').then((items) => items.length), 0);
  await page.click('[aria-label="Show My Live Hunt"]');
  await saveDraft();
  await page.evaluate(() => { window.buildTest.state.failPublication = true; });
  await clickText('Publish to OBS');
  await page.waitForSelector('.editor-save-error');
  assert.ok(await page.$('.better-editor-canvas'), 'Publication failures keep the draft editable');
  await page.evaluate(() => { window.buildTest.state.failPublication = false; });
  await clickText('Retry', '.editor-save-error');
  await page.waitForSelector('.editor-save-error', { hidden: true });
  await page.waitForFunction(() => document.querySelector('.editor-save-status small')?.textContent === 'Published');
  const publicationCount = await page.evaluate(() => window.buildTest.state.tables.better_overlay_publications.length);
  assert.equal(publicationCount, 2, 'Retry repeats publication, not just saving');

  await clickText('Add widget', '.editor-layer-tools');
  await enterName('[aria-label="Search widgets"]', 'statistics');
  assert.equal(await page.$$('.editor-widget-options > button').then((items) => items.length), 1);
  await page.click('.editor-widget-options > button');
  await page.waitForSelector('[aria-label="Better RTP Stats actions"]');
  await page.click('[aria-label="Better RTP Stats actions"]');
  await clickText('Delete widget', '.better-editor-widget-list');
  await page.waitForSelector('.editor-confirm-dialog[open]');
  await clickText('Cancel', '.editor-confirm-dialog');
  assert.ok(await page.$('[aria-label="Better RTP Stats actions"]'));
  await page.click('[aria-label="Better RTP Stats actions"]');
  await clickText('Delete widget', '.better-editor-widget-list');
  await page.waitForSelector('.editor-confirm-dialog[open]');
  await clickText('Confirm', '.editor-confirm-dialog');
  await page.waitForSelector('[aria-label="Better RTP Stats actions"]', { hidden: true });
  await saveDraft();

  await page.click('.better-editor-widget-row__main:has([title="My Live Hunt"])');
  await searchSettings('Orientation');
  await choose('Vertical');
  await clearSettingsSearch();
  await clickText('Sample data', '.editor-canvas-tools');
  await clickText('Preview', '.editor-publish-actions');
  assert.equal(await page.$$('.better-editor-resize-handle').then((items) => items.length), 0);
  assert.equal(await page.$eval('.better-editor-sidebar', (element) => getComputedStyle(element).display), 'none');
  await clickText('Edit', '.editor-publish-actions');
  await saveDraft();
  await page.click('[data-control-section="Orientation"] .bp-section__head');
  await clickText('Stream B', '.better-editor-builds__list');
  await page.waitForSelector('[aria-label="Second Hunt actions"]');
  await clickText('My Daytime Build', '.better-editor-builds__list');
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  assert.equal(await page.$eval('[data-control-section="Orientation"] .bp-section__head', (button) => button.getAttribute('aria-expanded')), 'false', 'Section collapse preference survives build switching');
  await clickText('Advanced', '.editor-inspector-tools');
  await clickText('Content', '.bp-panel-tabs');
  const savedTables = await page.evaluate(() => window.buildTest.state.tables);
  await page.evaluate(() => window.buildTest.unmount());
  await page.reload({ waitUntil: 'networkidle0' });
  await mount(savedTables);
  await page.waitForSelector('[aria-label="My Live Hunt actions"]');
  assert.equal(await page.$eval('.editor-inspector', (element) => element.dataset.mode), 'advanced', 'Control mode persists across reload');
  assert.match(await page.$eval('.bp-panel-tabs button[aria-selected="true"]', (button) => button.textContent), /Content/, 'Category persists across reload');
  assert.equal(await page.$eval('[aria-label="Snapping"]', (button) => button.getAttribute('aria-pressed')), 'false', 'Canvas preference persists across reload');
  await clickText('Simple', '.editor-inspector-tools');
  await page.click('[data-control-section="Orientation"] .bp-section__head');
  await clickText('Sample data', '.editor-canvas-tools');
  if (process.env.EDITOR_SCREENSHOT) {
    await openBuilds();
    await page.screenshot({ path: process.env.EDITOR_SCREENSHOT.replace('.png', '-builds.png') });
    await page.click('[aria-label="Close build picker"]');
  }
  if (process.env.EDITOR_SCREENSHOT) await page.screenshot({ path: process.env.EDITOR_SCREENSHOT });
  await page.setViewport({ width: 390, height: 844 });
  const fits = (selector, parentSelector) => page.evaluate(({ selector, parentSelector }) => [...document.querySelectorAll(selector)].every((element) => {
    const bounds = element.getBoundingClientRect();
    const parent = element.closest(parentSelector).getBoundingClientRect();
    return bounds.left >= parent.left && bounds.right <= parent.right && bounds.top >= parent.top && bounds.bottom <= parent.bottom;
  }), { selector, parentSelector });
  await page.waitForFunction(() => document.querySelector('.editor-workspace').dataset.layersOpen === 'false');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Editor fits mobile width');
  await buildAction('Rename overlay build');
  assert.equal(await page.$eval('dialog[open]', (dialog) => { const box = dialog.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; }), true, 'Name dialog fits mobile viewport');
  await clickText('Cancel', '.better-editor-name-dialog');
  await page.click('[aria-label="Toggle layers"]');
  await page.click('[aria-label="My Live Hunt actions"]');
  await clickText('Rename widget', '.better-editor-widget-list');
  if (process.env.EDITOR_SCREENSHOT) await page.screenshot({ path: process.env.EDITOR_SCREENSHOT.replace('.png', '-mobile.png') });
  const renameBounds = await page.evaluate(() => [...document.querySelectorAll('.better-editor-widget-row__rename input, .better-editor-widget-row__rename button')].map((element) => ({ tag: element.tagName, box: element.getBoundingClientRect().toJSON(), parent: element.closest('.better-editor-widget-row').getBoundingClientRect().toJSON() })));
  assert.equal(await fits('.better-editor-widget-row__rename input, .better-editor-widget-row__rename button', '.better-editor-widget-row'), true, `Rename controls remain inside their narrow widget row: ${JSON.stringify(renameBounds)}`);
  await page.click('[aria-label="Cancel rename"]');
  await page.click('.better-editor-widget-row__main:has([title="My Live Hunt"])');
  assert.equal(await page.$eval('.editor-workspace', (element) => element.dataset.layersOpen === 'false' && element.dataset.settingsOpen === 'true'), true, 'Mobile selection opens only the inspector');
  assert.equal(await fits('.editor-geometry-grid input', '.better-editor-settings'), true);
  if (process.env.EDITOR_SCREENSHOT) await page.screenshot({ path: process.env.EDITOR_SCREENSHOT.replace('.png', '-settings.png') });
  await page.click('[aria-label="Close settings"]');
  for (const width of [320, 768, 1920]) {
    await page.setViewport({ width, height: 1000 });
    await page.waitForFunction(() => {
      const box = document.querySelector('.better-editor-canvas').getBoundingClientRect();
      const shell = document.querySelector('.better-editor-canvas-shell').getBoundingClientRect();
      return box.width > 100 && box.height > 50 && box.width <= shell.width;
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Editor fits ${width}px width`);
    if (process.env.EDITOR_SCREENSHOT) await page.screenshot({ path: process.env.EDITOR_SCREENSHOT.replace('.png', `-${width}.png`) });
  }
  assert.deepEqual(errors, []);
  await page.evaluate(() => window.buildTest.unmount());
  console.log('Editor UI checks passed: builds, publication isolation, settings search, local preferences, save recovery, geometry, history, visibility/locking, add/delete, preview and mobile drawers.');
} catch (error) {
  if (process.env.EDITOR_SCREENSHOT && page) await page.screenshot({ path: process.env.EDITOR_SCREENSHOT.replace('.png', '-failure.png') });
  throw error;
} finally {
  await browser.close();
}
