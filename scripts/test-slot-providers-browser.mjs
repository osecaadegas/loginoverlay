import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { createProviderTestDatabase, providerTestId } from './slot-provider-test-db.mjs';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const db = await createProviderTestDatabase();
const sql = async (query, params = []) => (await db.query(query, params)).rows;
await sql("SELECT save_slot_provider('Alpha',NULL,'/player.webp',NULL,ARRAY['Alpha Gaming'])");
await sql("SELECT save_slot_provider('Beta')");
for (const [n, provider] of [[11, 'Alpha'], [12, 'Alpha Gaming'], [13, 'Alpha'], [14, 'Beta']]) {
  await sql('INSERT INTO slots(id,name,provider,image) VALUES($1,$2,$3,$4)', [providerTestId(n), `Slot ${n}`, provider, '/streamer.webp']);
}
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/__provider-manager-test') {
      return request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#10161d"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range', 'content-type': 'application/json' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 200, headers });
      try {
        const resource = url.pathname.slice('/rest/v1/'.length);
        let data;
        if (resource.startsWith('rpc/')) {
          const rpc = resource.slice(4), args = JSON.parse(request.postData() || '{}');
          const signatures = {
            get_slot_provider_counts: [],
            save_slot_provider: ['p_name', 'p_provider_id', 'p_logo_url', 'p_website_url', 'p_aliases'],
            move_slot_provider_slots: ['p_target_provider_id', 'p_provider_id', 'p_slot_ids', 'p_remove_source', 'p_source_aliases'],
            remove_slot_provider: ['p_provider_id'],
          };
          assert.ok(rpc in signatures, `Unexpected RPC ${rpc}`);
          if (rpc === 'get_slot_provider_counts') data = await sql('SELECT * FROM get_slot_provider_counts()');
          else data = (await sql(`SELECT ${rpc}(${signatures[rpc].map((_, i) => `$${i + 1}`).join(',')}) result`, signatures[rpc].map(name => args[name] ?? null)))[0].result;
        } else {
          assert.ok(['slots', 'slot_providers'].includes(resource), `Unexpected table ${resource}`);
          assert.equal(request.method(), 'GET');
          const rows = await sql(`SELECT * FROM ${resource} ORDER BY ${resource === 'slots' ? 'name' : 'id'}`);
          const offset = Number(url.searchParams.get('offset')) || 0;
          const limit = Number(url.searchParams.get('limit')) || 1000;
          data = rows.slice(offset, offset + limit);
          headers['content-range'] = `${offset}-${Math.max(offset, offset + data.length - 1)}/${rows.length}`;
        }
        return request.respond({ status: 200, headers, body: JSON.stringify(data) });
      } catch (error) {
        return request.respond({ status: 400, headers, body: JSON.stringify({ code: error.code || 'TEST', message: error.message }) });
      }
    }
    if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) return request.continue();
    if (['data:', 'blob:'].includes(url.protocol)) return request.continue();
    return request.abort();
  });
  const boot = async () => {
    await page.goto(`${baseUrl}/__provider-manager-test`, { waitUntil: 'networkidle0' });
    const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
    await page.evaluate(async version => {
      const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
      const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
      const { default: SlotManager } = await import('/src/components/SlotManager/SlotManagerV2.jsx');
      const catalog = await import('/src/utils/slotProviderCatalog.js');
      window.providerCatalogTest = catalog;
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(SlotManager));
    }, browserHash);
    await page.waitForSelector('.sm-row');
  };
  const button = async (text, scope = 'body') => {
    await page.waitForFunction((text, scope) => [...document.querySelectorAll(`${scope} button`)].some(button => button.textContent.trim() === text && !button.disabled), {}, text, scope);
    await page.evaluate((text, scope) => [...document.querySelectorAll(`${scope} button`)].find(button => button.textContent.trim() === text).click(), text, scope);
  };
  const fill = async (label, value) => {
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getTiming().iterations !== Infinity && animation.effect?.target?.closest('.sm-editor'))
      .map(animation => animation.finished.catch(() => {}))));
    const handle = await page.evaluateHandle(label => [...document.querySelectorAll('.sm-prov-form .sm-field')].find(field => field.querySelector('span')?.textContent === label)?.querySelector('input'), label);
    await handle.asElement().click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    if (value) await page.keyboard.type(value);
    await handle.dispose();
  };
  const choose = async name => {
    await page.waitForFunction(name => [...document.querySelectorAll('.sm-prov-name')].some(e => e.textContent === name), {}, name);
    await page.evaluate(name => [...document.querySelectorAll('.sm-prov-name')].find(e => e.textContent === name).closest('button').click(), name);
    await page.waitForSelector('.sm-prov-form');
  };
  const waitSaved = () => page.waitForFunction(() => !document.querySelector('.sm-prov-form'));
  await boot();
  const catalogChecks = await page.evaluate(() => {
    const { buildSlotProviderCatalog, resolveCatalogProviderLogo } = window.providerCatalogTest;
    const entries = buildSlotProviderCatalog([
      { id: 'a', name: 'Renamed', aliases: ['Pragmatic Play'], logo_url: '/player.webp', is_active: true },
      { id: 'b', name: 'Removed', aliases: ['Hacksaw Gaming'], logo_url: '', is_active: false },
    ], [{ provider: 'Pragmatic Play', slot_count: 4 }], ['Pragmatic Play', 'Hacksaw Gaming']);
    return { names: entries.map(e => e.name), count: entries.find(e => e.id === 'a').slot_count,
      logo: resolveCatalogProviderLogo(entries, 'Pragmatic Play'), removedLogo: resolveCatalogProviderLogo(entries, 'Hacksaw Gaming'),
      blankLogo: resolveCatalogProviderLogo([{ name: 'Pragmatic Play', logo_url: '', is_active: true }], 'Pragmatic Play') };
  });
  assert.deepEqual(catalogChecks, { names: ['Removed', 'Renamed'], count: 4, logo: '/player.webp', removedLogo: null, blankLogo: null });

  await button('Providers');
  await choose('Alpha');
  await fill('Provider name', 'Alpha Prime');
  await fill('Logo URL', '/streamer.webp');
  await button('Save provider');
  await waitSaved();
  assert.equal((await sql("SELECT count(*)::int n FROM slots WHERE provider='Alpha Prime'"))[0].n, 3);
  await choose('Alpha Prime');
  assert.equal(await page.$eval('.sm-provider-preview img', img => img.getAttribute('src')), '/streamer.webp');
  await button('Remove logo');
  await button('Save provider');
  await waitSaved();
  assert.equal((await sql("SELECT logo_url FROM slot_providers WHERE name='Alpha Prime'"))[0].logo_url, '');
  await choose('Alpha Prime');
  assert.equal(await page.$('.sm-provider-preview img'), null, 'Removed logo does not fall back to a bundled image');
  await fill('Provider name', 'Beta');
  await button('Save provider');
  await page.waitForSelector('.sm-provider-error');
  assert.match(await page.$eval('.sm-provider-error', el => el.textContent), /already exists/);
  await button('Cancel', '.sm-prov-form');
  await choose('Alpha Prime');
  await button('Remove provider');
  await page.select('.sm-prov-form select', 'Beta');
  await button('Move slots', '.sm-prov-form');
  await waitSaved();
  assert.equal((await sql("SELECT count(*)::int n FROM slots WHERE provider='Beta'"))[0].n, 4);
  assert.equal((await sql("SELECT is_active FROM slot_providers WHERE name='Alpha Prime'"))[0].is_active, false);
  await page.click('.sm-prov-toolbar .sm-provider-removed input');
  await choose('Alpha Prime');
  await button('Restore provider');
  await waitSaved();
  assert.equal((await sql("SELECT is_active FROM slot_providers WHERE name='Alpha Prime'"))[0].is_active, true);
  await page.click('.sm-prov-toolbar .sm-provider-removed input');
  await choose('Alpha Prime');
  await button('Remove provider');
  await waitSaved();
  await button('Add', '.sm-prov-toolbar');
  await fill('Provider name', 'Zeta');
  await fill('Logo URL', '/player.webp');
  await button('Save provider');
  await waitSaved();
  await page.click('[aria-label="Close providers"]');
  await page.waitForFunction(() => !document.querySelector('.sm-editor--providers'));
  await page.click('.sm-row:nth-child(1) input[type="checkbox"]');
  await page.waitForFunction(() => document.querySelectorAll('.sm-row input:checked').length === 1);
  await page.click('.sm-row:nth-child(2) input[type="checkbox"]');
  await page.waitForFunction(() => document.querySelectorAll('.sm-row input:checked').length === 2);
  await button('Move provider');
  await page.select('.sm-prov-form select', 'Zeta');
  await button('Move slots', '.sm-prov-form');
  await page.waitForFunction(() => !document.querySelector('.sm-editor--providers'));
  assert.equal((await sql("SELECT count(*)::int n FROM slots WHERE provider='Zeta'"))[0].n, 2);
  assert.equal((await sql("SELECT count(*)::int n FROM slots WHERE provider='Beta'"))[0].n, 2);

  // A real reload must keep names, logos and removed providers from the database.
  await boot();
  await button('Providers');
  await choose('Zeta');
  assert.equal(await page.$eval('.sm-provider-preview img', img => img.getAttribute('src')), '/player.webp');
  assert.equal(await page.$$eval('.sm-prov-name', names => names.some(e => e.textContent === 'Alpha Prime')), false);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewport({ width, height: 1000 });
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {}))));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const overflow = await page.$eval('.sm-editor--providers', panel => {
      const bounds = panel.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, overflow: panel.scrollWidth > panel.clientWidth + 1,
        badControls: [...panel.querySelectorAll('.sm-prov-form button, .sm-prov-form input')].filter(el => {
          const box = el.getBoundingClientRect(); return box.width && (box.left < bounds.left - 1 || box.right > bounds.right + 1);
        }).map(el => el.textContent) };
    });
    assert.ok(overflow.left >= -1 && overflow.right <= width + 1 && !overflow.overflow && !overflow.badControls.length, JSON.stringify({ width, ...overflow }));
  }
  if (process.env.PROVIDER_SCREENSHOT) await page.screenshot({ path: process.env.PROVIDER_SCREENSHOT });
  assert.deepEqual(errors, []);
  console.log('Provider browser/SQL integration passed: create, rename linked slots, custom/remove logos, duplicate errors, whole-provider move/removal, restore, selected moves, reload persistence and 4 responsive widths.');
} finally {
  await browser.close();
  await db.close();
}
