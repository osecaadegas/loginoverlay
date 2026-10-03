import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

globalThis.window = { location: { origin: 'http://localhost' } };
const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});
let browser;

try {
  const { BetterBonusHuntStyle } = await server.ssrLoadModule(
    '/src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx',
  );
  const { createBetterInstance, renderBetterWidgetInstance } = await server.ssrLoadModule(
    '/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx',
  );
  const art = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="144"%3E%3Crect width="96" height="144" fill="%230b87a0"/%3E%3C/svg%3E';
  const bonuses = Array.from({ length: 6 }, (_, index) => ({
    id: `containment-${index}`,
    slot_name: index ? `Bonus ${index + 1}` : 'A Very Long Bonus Hunt Slot Name',
    image_url: art,
    bet: 1.25,
    rtp: 96.34,
    volatility: 'high',
    max_win_multiplier: 10000,
    isSuperBonus: index === 1,
    isExtremeBonus: index === 2,
  }));
  const cases = [];
  for (const width of [320, 372, 600]) {
    for (const carouselMode of ['3d', 'imagestats', 'stats']) {
      for (const uiScale of [0.75, 1, 1.35]) {
        for (const drawerMode of ['contain', 'expand']) {
          cases.push({ width, carouselMode, uiScale, drawerMode });
        }
      }
    }
  }
  for (const carouselMode of ['3d', 'imagestats', 'stats']) {
    for (const runtime of ['editor', 'obs']) {
      cases.push({ width: 372, carouselMode, uiScale: 1.35, drawerMode: 'contain', runtime });
    }
  }
  const markup = cases.map(({ width, carouselMode, uiScale, drawerMode, runtime }, index) => {
    const config = {
      orientation: 'mainstream',
      carouselMode,
      uiScale,
      drawerMode,
      panelWidth: width,
      panelHeight: drawerMode === 'contain' ? 884 : 0,
      sessionState: 'opening',
      statsLayout: 'grid',
      animations: false,
      showRequests: false,
      startMoney: 1000,
      fontFamily: 'Arial, sans-serif',
    };
    let widget = createElement(BetterBonusHuntStyle, { config, bonuses, stats: {}, currency: 'EUR' });
    if (runtime) {
      config.subElements = {
        slotCarouselContainer: { padding: 12, gap: 8 },
        carouselBackdrop: { borderWidth: 3, radius: 18 },
        slotImage: { height: 500, imageSize: 400 },
        slotTitle: { fontSize: 24 },
      };
      const savedInstance = createBetterInstance('bonus_hunt', { width, height: 884, config });
      const instance = JSON.parse(JSON.stringify(savedInstance));
      assert.deepEqual(instance.config, savedInstance.config, 'Reload preserves saved carousel appearance');
      widget = renderBetterWidgetInstance({
        instance,
        layout: { instances: [instance] },
        mode: 'live',
        runtime,
        liveWidgets: [{
          id: 'live-carousel-hunt',
          widget_type: 'bonus_hunt',
          config: { bonuses, bonusOpening: true, startMoney: 1000, showRequests: false },
        }],
      });
    }
    return `<div data-case="${index}" style="width:${width}px;height:1000px">${renderToStaticMarkup(widget)}</div>`;
  }).join('');
  const highDpiBonuses = Array.from({ length: 22 }, (_, index) => ({
    ...bonuses[index % bonuses.length],
    id: `high-dpi-${index}`,
    slot_name: `High DPI Bonus ${index + 1}`,
  }));
  const highDpiMarkup = renderToStaticMarkup(createElement(BetterBonusHuntStyle, {
    config: {
      orientation: 'mainstream',
      carouselMode: 'imagestats',
      listMode: 'image',
      visibleRows: 5,
      panelWidth: 748,
      panelHeight: 1894,
      __betterInstanceWidth: 748,
      __betterInstanceHeight: 1894,
      __obsRenderScale: 2,
      sessionState: 'opening',
      animations: true,
      showRequests: false,
      startMoney: 1000,
      fontFamily: 'Arial, sans-serif',
    },
    bonuses: highDpiBonuses,
    stats: {},
    currency: 'EUR',
  }));

  browser = await puppeteer.launch({
    headless: true,
    args: ['--disable-gpu'],
    ...(process.env.PUPPETEER_USER_DATA_DIR
      ? { userDataDir: process.env.PUPPETEER_USER_DATA_DIR }
      : {}),
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setContent(`<html><head><style>body{margin:0;background:#202020} [data-case]{display:inline-block;vertical-align:top}</style></head><body>${markup}<div data-high-dpi-case style="width:748px;height:1894px">${highDpiMarkup}</div></body></html>`);
  // React's server markup escapes CSS text; restore the text the client renderer uses.
  await page.evaluate(() => {
    for (const sheet of document.querySelectorAll('style')) {
      const decoder = document.createElement('textarea');
      decoder.innerHTML = sheet.textContent;
      sheet.textContent = decoder.value;
    }
  });
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));

  const measure = () => page.evaluate(() => [...document.querySelectorAll('[data-case]')].map((host) => {
    const panel = host.querySelector('.better-hunt-mainstream');
    const carousel = host.querySelector('.better-hunt-carousel');
    const backdrop = carousel.querySelector('[data-appearance-part="carouselBackdrop"]');
    const bounds = (element) => {
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    const contents = backdrop.querySelectorAll('.better-hunt-image-stats-copy, .better-hunt-image-row, .better-hunt-stats-title, .better-hunt-stats-title h3, .better-hunt-stat-strip');
    const list = panel.querySelector('.better-hunt-list');
    const listTrack = list.querySelector('.better-hunt-list-inner');
    const listGroups = [...list.querySelectorAll('.better-hunt-list-group')];
    const firstGroupRows = [...listGroups[0].querySelectorAll('.better-hunt-row')];
    return {
      index: Number(host.dataset.case),
      panel: bounds(panel),
      carousel: bounds(carousel),
      backdrop: bounds(backdrop),
      contents: [...contents].map((element) => ({
        ...bounds(element),
        className: element.className || element.tagName,
        parentWidth: element.parentElement.clientWidth,
        parentMinWidth: getComputedStyle(element.parentElement).minWidth,
      })),
      imageLoaded: [...backdrop.querySelectorAll('img')].every((img) => img.naturalWidth > 0),
      listLoop: list.dataset.loop,
      listGroups: listGroups.length,
      listTrackAnimation: getComputedStyle(listTrack).animationName,
      listGroupAnimations: listGroups.map((group) => ({
        name: getComputedStyle(group).animationName,
        iterations: getComputedStyle(group).animationIterationCount,
        height: group.getBoundingClientRect().height,
      })),
      positionNumberCount: list.querySelectorAll('.better-hunt-row-id').length,
      tierRows: firstGroupRows.map((row) => ({
        tier: row.dataset.bonusTier,
        className: row.className,
        borderColor: getComputedStyle(row).borderColor,
        backgroundImage: getComputedStyle(row).backgroundImage,
        titleColor: getComputedStyle(row.querySelector('.better-hunt-slot-marquee')).color,
      })),
    };
  }));
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewport(viewport);
    for (const item of await measure()) {
      const label = JSON.stringify({ ...cases[item.index], viewport: viewport.width });
      assert.ok(item.carousel.x >= item.panel.x + 10 && item.carousel.right <= item.panel.right - 10,
        `${label}: carousel stays inset inside the main card`);
      assert.ok(item.backdrop.x >= item.carousel.x - 1 && item.backdrop.right <= item.carousel.right + 1,
        `${label}: backdrop fits the carousel container`);
      for (const content of item.contents) {
        assert.ok(content.x >= item.backdrop.x - 1 && content.right <= item.backdrop.right + 1
          && content.y >= item.backdrop.y - 1 && content.bottom <= item.backdrop.bottom + 1,
        `${label}: slot text and every stat row fit inside their backdrop (${JSON.stringify({ content, backdrop: item.backdrop })})`);
      }
      assert.ok(item.imageLoaded, `${label}: slot artwork renders`);
      assert.equal(item.listLoop, 'infinite', `${label}: overflowing Main Stream list enables its infinite loop`);
      assert.equal(item.listGroups, 2, `${label}: looping list duplicates its rows for a seamless handoff`);
      assert.equal(item.listTrackAnimation, 'none', `${label}: the combined two-copy track is not promoted as one oversized OBS texture`);
      assert.deepEqual(
        item.listGroupAnimations.map(({ name }) => name),
        ['better-hunt-marquee-up-primary', 'better-hunt-marquee-up-secondary'],
        `${label}: each bounded list copy owns one half of the seamless handoff`,
      );
      assert.ok(
        item.listGroupAnimations.every(({ iterations }) => iterations === 'infinite'),
        `${label}: both bounded list layers animate continuously`,
      );
      assert.ok(
        Math.abs(item.listGroupAnimations[0].height - item.listGroupAnimations[1].height) < 0.01,
        `${label}: both carousel copies have identical geometry at the loop boundary`,
      );
      assert.equal(item.positionNumberCount, 0, `${label}: Main Stream list does not render position numbers`);
      const normalRow = item.tierRows.find((row) => row.tier === 'normal');
      const superRow = item.tierRows.find((row) => row.tier === 'super');
      const extremeRow = item.tierRows.find((row) => row.tier === 'extreme');
      assert.ok(normalRow && superRow && extremeRow, `${label}: normal, Super, and Extreme rows render tier metadata`);
      assert.match(superRow.className, /better-hunt-row--super/, `${label}: Super row receives its tier class`);
      assert.match(extremeRow.className, /better-hunt-row--extreme/, `${label}: Extreme row receives its tier class`);
      assert.notEqual(superRow.borderColor, normalRow.borderColor, `${label}: Super row uses its gold border colour`);
      assert.notEqual(extremeRow.borderColor, normalRow.borderColor, `${label}: Extreme row uses its red border colour`);
      assert.notEqual(superRow.titleColor, normalRow.titleColor, `${label}: Super title uses its gold colour`);
      assert.notEqual(extremeRow.titleColor, normalRow.titleColor, `${label}: Extreme title uses its red colour`);
      assert.notEqual(superRow.backgroundImage, normalRow.backgroundImage, `${label}: Super row has a tier-coloured background`);
      assert.notEqual(extremeRow.backgroundImage, normalRow.backgroundImage, `${label}: Extreme row has a tier-coloured background`);
    }
  }
  const highDpiLayers = await page.$eval('[data-high-dpi-case]', (host) => {
    const groups = [...host.querySelectorAll('.better-hunt-list-group')];
    return {
      trackAnimation: getComputedStyle(host.querySelector('.better-hunt-list-inner')).animationName,
      groups: groups.map((group) => ({
        animation: getComputedStyle(group).animationName,
        height: group.getBoundingClientRect().height,
      })),
    };
  });
  assert.equal(highDpiLayers.trackAnimation, 'none', '2x OBS list avoids a combined promoted texture');
  assert.equal(highDpiLayers.groups.length, 2, '2x OBS list keeps two seamless copies');
  assert.ok(
    highDpiLayers.groups.every(({ height }) => height > 0 && height < 8192),
    `Each 2x OBS carousel layer stays below 8192px (${JSON.stringify(highDpiLayers.groups)})`,
  );
  assert.ok(
    highDpiLayers.groups.reduce((total, { height }) => total + height, 0) > 8192,
    'The old combined 2x layer would exceed the practical OBS Chromium texture threshold',
  );
  const sampleHighDpiLoop = (offsetMs) => page.$eval('[data-high-dpi-case]', async (host, offset) => {
    const list = host.querySelector('.better-hunt-list');
    const groups = [...host.querySelectorAll('.better-hunt-list-group')];
    const animations = groups.flatMap((group) => group.getAnimations());
    const duration = Number(animations[0]?.effect?.getTiming()?.duration) || 1;
    animations.forEach((animation) => {
      animation.pause();
      animation.currentTime = duration + offset;
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const listTop = list.getBoundingClientRect().top;
    return groups
      .map((group) => {
        const row = group.querySelector('.better-hunt-row');
        const rect = row.getBoundingClientRect();
        return {
          slot: row.querySelector('.better-hunt-slot-marquee')?.textContent?.trim(),
          top: rect.top - listTop,
        };
      })
      .sort((a, b) => Math.abs(a.top) - Math.abs(b.top))[0];
  }, offsetMs);
  const beforeLoop = await sampleHighDpiLoop(-1);
  const afterLoop = await sampleHighDpiLoop(1);
  assert.equal(
    afterLoop.slot,
    beforeLoop.slot,
    `2x OBS loop hands off to the identical slot without a content jump (${JSON.stringify({ beforeLoop, afterLoop })})`,
  );
  assert.ok(
    Math.abs(afterLoop.top - beforeLoop.top) < 2,
    `2x OBS loop remains position-continuous across reset (${JSON.stringify({ beforeLoop, afterLoop })})`,
  );
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  assert.deepEqual(
    await page.$$eval('.better-hunt-list-group', (groups) => groups.map((group) => getComputedStyle(group).animationName)),
    Array(cases.length * 2 + 2).fill('none'),
    'Reduced motion disables both bounded Main Stream list layers',
  );
  await page.emulateMediaFeatures([]);
  assert.deepEqual(errors, [], 'No browser runtime errors');
  if (process.env.CAROUSEL_SCREENSHOT) {
    await page.setViewport({ width: 1440, height: 1000 });
    await (await page.$('[data-case="27"]')).screenshot({ path: process.env.CAROUSEL_SCREENSHOT });
  }
  console.log(`Mainstream carousel containment passed for ${cases.length} configurations across desktop and mobile viewports.`);
} finally {
  await browser?.close();
  await server.close();
}
