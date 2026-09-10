import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { createOverlayTestDatabase } from './helpers/overlay-build-test-db.mjs';

globalThis.window = { location: { origin: 'http://localhost' } };
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) };
const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
let browser;
try {
  const service = await server.ssrLoadModule('/src/services/betterOverlayService.js');
  const registry = await server.ssrLoadModule('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
  const { supabase } = await server.ssrLoadModule('/src/config/supabaseClient.js');
  const { client, state } = createOverlayTestDatabase();
  supabase.from = client.from;
  const first = await service.createBetterEditorOverlay('owner-a', 'Stream A');
  const second = await service.createBetterEditorOverlay('owner-a', 'Stream B', first.draftLayout);
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.publicOverlayId, second.publicOverlayId);
  assert.equal((await service.listBetterEditorOverlays('owner-a')).length, 2);
  assert.deepEqual(await service.listBetterEditorOverlays('owner-b'), []);
  assert.equal(second.draftLayout.name, 'Stream B');
  service.selectBetterEditorOverlay('owner-a', second.id);
  assert.equal((await service.getOrCreateBetterEditorOverlay('owner-a')).id, second.id);
  const draft = structuredClone(second.draftLayout);
  draft.instances[1].label = 'My renamed widget';
  const saved = await service.saveBetterDraft('owner-a', draft, second.draftVersion, second.id);
  assert.equal((await service.getOrCreateBetterEditorOverlay('owner-a', second.id)).draftLayout.instances[1].label, 'My renamed widget');
  assert.notEqual((await service.getOrCreateBetterEditorOverlay('owner-a', first.id)).draftLayout.instances[1].label, 'My renamed widget');
  await assert.rejects(service.saveBetterDraft('owner-b', draft, saved.draftVersion, second.id), /unavailable/);
  await assert.rejects(service.saveBetterDraft('owner-a', draft, second.draftVersion, second.id), /another window/);
  const published = await service.publishBetterOverlay('owner-a', draft, saved.draftVersion, second.id);
  assert.equal(state.tables.better_overlay_publications.length, 1);
  assert.equal(state.tables.better_overlay_publications[0].public_overlay_id, second.publicOverlayId);
  const reset = await service.resetBetterDraftLayout('owner-a', published.draftVersion, second.id);
  assert.equal(reset.draftLayout.name, 'Stream B');
  const reverted = await service.revertBetterDraftToPublished('owner-a', reset.draftVersion, second.id);
  assert.equal(reverted.draftLayout.instances[1].label, 'My renamed widget');
  const regenerated = await service.regenerateBetterPublicOverlayId('owner-a', second.id);
  assert.notEqual(regenerated.publicOverlayId, second.publicOverlayId);
  assert.ok(state.tables.better_overlay_publications.find((row) => row.public_overlay_id === second.publicOverlayId).revoked_at);
  assert.equal((await service.getOrCreateBetterEditorOverlay('owner-a', first.id)).publicOverlayId, first.publicOverlayId);
  assert.equal(registry.normalizeBetterLayout(JSON.parse(JSON.stringify(draft))).name, 'Stream B');
  console.log('Overlay build service checks passed: owner/build isolation, rename, copy, save, publish, reset, revert and URL rotation.');

  const { BetterBonusHuntStyle } = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx');
  const { getHorizontalHuntHeight } = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/bonus-hunt/shared/betterHuntSizing.js');
  const art = `data:image/webp;base64,${readFileSync(new URL('../public/player.webp', import.meta.url)).toString('base64')}`;
  const requests = Array.from({ length: 10 }, (_, index) => ({ id: String(index), slot_name: `Requested slot ${index}`, requested_by: `Viewer ${index}`, slot_image: art }));
  const cases = [];
  for (const orientation of ['vertical', 'mainstream', 'horizontal']) {
    for (const listMode of ['compact', 'image', 'names']) {
      for (const requestVisibleRows of [1, 4, 8]) cases.push({ orientation, listMode, requestVisibleRows, requestView: 'list' });
    }
    cases.push({ orientation, requestView: 'carousel' });
  }
  const html = cases.map((config, index) => {
    const widgetHeight = config.orientation === 'horizontal' ? getHorizontalHuntHeight(config) : 1000;
    return `<section data-case="${index}" style="width:${config.orientation === 'horizontal' ? 1080 : 372}px;height:${widgetHeight + 80}px">${renderToStaticMarkup(createElement(BetterBonusHuntStyle, {
      config: { ...config, requests, widgetHeight, animations: false, carouselMode: 'imagestats', showRequests: true }, bonuses: [], stats: {},
    }))}</section>`;
  }).join('');
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(`<body style="margin:0">${html}</body>`);
  await page.evaluate(() => {
    document.querySelectorAll('style').forEach((sheet) => { const decoder = document.createElement('textarea'); decoder.innerHTML = sheet.textContent; sheet.textContent = decoder.value; });
  });
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 1080 });
    const measured = await page.evaluate(() => [...document.querySelectorAll('[data-case]')].map((host) => {
      const box = (element) => { const r = element.getBoundingClientRect(); return { width: r.width, height: r.height, top: r.top, bottom: r.bottom }; };
      const list = host.querySelector('.better-hunt-request-list');
      const stage = host.querySelector('.better-hunt-request-stage');
      const container = host.querySelector('.better-hunt-requests');
      const parentStyle = getComputedStyle(container.parentElement);
      const style = getComputedStyle(container);
      const availableWidth = container.parentElement.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight) - parseFloat(style.marginLeft) - parseFloat(style.marginRight);
      return { index: Number(host.dataset.case), container: box(container), parent: box(container.parentElement), availableWidth, list: list && box(list), rows: list && [...list.querySelectorAll('.better-hunt-request')].map(box), stage: stage && box(stage), card: stage && box(stage.querySelector('.is-center')) };
    }));
    for (const item of measured) {
      const config = cases[item.index];
      assert.ok(item.container.bottom <= item.parent.bottom + 1, `${config.orientation} request container fits the widget height`);
      if (item.stage) {
        assert.ok(Math.abs(item.container.width - item.availableWidth) < 2, `${config.orientation} carousel fills the available panel width`);
        assert.ok(item.container.height < 230, `${config.orientation} carousel container has no unused vertical track`);
        const stageHeight = config.orientation === 'horizontal' ? 140 : 166;
        assert.ok(Math.abs(item.stage.height - stageHeight) < 1, `${config.orientation} compact carousel stage`);
        assert.ok(item.card.top >= item.stage.top && item.card.bottom <= item.stage.bottom, 'Full 3D card remains in the stage');
      } else if (config.orientation === 'horizontal') {
        const fullyVisible = item.rows.filter((row) => row.top >= item.list.top - 1 && row.bottom <= item.list.bottom + 1).length;
        assert.equal(fullyVisible, config.requestVisibleRows, JSON.stringify(config));
      }
    }
  }
  if (process.env.REQUEST_SCREENSHOT) await (await page.$('[data-case="9"]')).screenshot({ path: process.env.REQUEST_SCREENSHOT });
  console.log('Request layout checks passed: 30 configurations, compact 3D stage and horizontal-only row counts, desktop/mobile.');
} finally {
  await browser?.close();
  await server.close();
}
if (process.env.TEST_BASE_URL) await import('./test-editor-builds-browser.mjs');
