import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { mkdir, readFile } from 'node:fs/promises';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const screenshots = process.env.TEST_SCREENSHOT_DIR || '.codex-dev';
await mkdir(screenshots, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
// Optional read-only capture of the real public API for Vite, which has no serverless runtime.
const livePricing = process.env.LIVE_PRICING_RESPONSE_PATH
  ? JSON.parse(await readFile(process.env.LIVE_PRICING_RESPONSE_PATH, 'utf8'))
  : process.env.TEST_LIVE_PUBLIC_CONTENT === '1'
    ? await (await fetch(`${baseUrl}/api/premium?action=page`)).json() : null;
if (process.env.LIVE_PRICING_RESPONSE_PATH) {
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/premium' && url.searchParams.get('action') === 'page' && request.method() === 'GET') {
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(livePricing) });
    }
    return request.continue();
  });
}
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const clickText = async (selector, text) => {
  const handles = await page.$$(selector);
  for (const handle of handles) {
    if ((await handle.evaluate(element => element.textContent.trim())) === text) {
      // Keep controls clear of the fixed site header after the tall preview scrolls.
      await handle.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await wait(100);
      await handle.click();
      return;
    }
  }
  throw new Error(`Missing ${text}`);
};

try {
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.lp-age-modal');
  await clickText('.lp-age-modal button', 'Enter site');
  await clickText('button', 'Reject All');
  await page.waitForSelector('.lp-studio-stage .lp-home-widget-runtime');
  assert.equal(await page.$('vite-error-overlay'), null);
  assert.match(await page.$eval('h1', element => element.textContent), /Your stream/);
  assert.match(await page.$eval('.lp-home-hero__ctas button', element => element.textContent), /Start free trial/);
  assert.equal(await page.$$eval('.lp-ambient > i', elements => elements.length), 2);
  assert.equal(await page.$$eval('.lp-studio-tools button', elements => elements.length), 9);
  assert.match(await page.$eval('.lp-home-hero__copy', e => e.textContent), /Interactive iGaming overlays/);
  assert.deepEqual(await page.$$eval('.lp-home-widget-card h3', els => els.map(e => e.textContent)), ['Bonus Hunt', 'RTP Stats', 'Bets']);
  assert.equal(await page.$$eval('.lp-use-case-grid article', els => els.length), 3);
  assert.equal(await page.$$eval('.lp-home-step', els => els.length), 3);

  for (const [label, type] of [['Chat', 'chat'], ['Bets', 'bets'], ['Connect 4', 'connect_four'], ['Bonus Hunt', 'bonus_hunt'], ['RTP Bar', 'rtp_stats'], ['Navbar', 'navbar'], ['Tournaments', 'tournament'], ['Slideshow', 'slideshow_frame'], ['Giveaway', 'giveaway']]) {
    await clickText('.lp-studio-tools button', label);
    await page.waitForSelector(`.lp-studio-stage[data-preview-widget="${type}"] .lp-home-widget-runtime`);
    await page.waitForFunction(() => document.querySelector(".lp-studio-stage .better-widget-colour-scope")?.textContent.trim().length > 0);
    await page.click('.lp-studio-palette button[aria-label="Rose"]');
    await page.waitForSelector(`.lp-studio-stage[data-preview-theme="rose"] .better-widget-colour-scope[data-colour-theme="rose"]`);
    await page.click('.lp-studio-palette button[aria-label="Neon"]');
    if (type === 'bonus_hunt') {
      for (const format of ['Vertical', 'Horizontal', 'Mainstream']) {
        await clickText('.lp-studio-formats button', format);
        await page.waitForSelector(`.lp-studio-stage [data-orientation="${format.toLowerCase()}"]`);
      }
      await wait(5500);
      assert.equal(await page.$eval('.lp-studio-stage [data-orientation]', element => element.dataset.orientation), 'mainstream', 'Chosen format stays selected during preview updates');
    }
    if (type === 'slideshow_frame') {
      await page.waitForFunction(() => [...document.querySelectorAll('.lp-studio-stage img')].some(image => image.complete && image.naturalWidth > 0 && image.src.includes('/backgrounds/')));
    }
  }
  const surface = await page.$('.lp-studio');
  const box = await surface.boundingBox();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .3);
  await page.waitForFunction(() => document.querySelector('.lp-studio').style.getPropertyValue('--tilt-y') !== '');
  await page.click('.lp-motion-toggle');
  assert.equal(await page.$eval('.lp-home', element => element.dataset.motion), 'off');
  assert.equal(await page.$eval('.lp-studio-float', element => getComputedStyle(element).animationPlayState), 'paused');
  await page.click('.lp-motion-toggle');
  assert.equal(await page.$eval('.lp-home', element => element.dataset.motion), 'on');

  // Visit every section to exercise reveals and viewport-limited previews.
  for (const section of await page.$$('.lp-home-section')) {
    await section.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await wait(130);
  }
  assert.equal(await page.$$eval('.lp-home-section', sections => sections.every(section => section.dataset.revealed === 'true')), true);
  if (livePricing) {
    await page.$eval('#pricing', element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    assert.match(await page.$eval('.lp-trial-banner', element => element.textContent), new RegExp(`${livePricing.trialDays} days`));
    const cardText = {};
    for (const type of ['player', 'streamer']) {
      const product = livePricing.productTypes.find(item => item.code === type);
      await clickText('.lp-plan-toggle button', product.title);
      const plans = livePricing.plans.filter(plan => plan.productType === type && plan.active !== false);
      assert.equal(await page.$$eval('.lp-pricing-cards .premium-image-card', cards => cards.length), plans.length);
      cardText[type] = await page.$$eval('.lp-pricing-cards .premium-card-content', rows => rows.map(row => row.textContent));
      for (const [index, plan] of plans.entries()) {
        const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: plan.currency, minimumFractionDigits: plan.priceCents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(plan.priceCents / 100);
        assert.ok(cardText[type][index].includes(price), 'Full billed price remains visible');
        const monthly = new Intl.NumberFormat('en-IE', { style: 'currency', currency: plan.currency, minimumFractionDigits: Math.round(plan.priceCents / plan.intervalMonths) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(Math.round(plan.priceCents / plan.intervalMonths) / 100);
        assert.ok(cardText[type][index].includes(monthly), 'Monthly equivalent is shown');
      }
      assert.equal(await page.$eval('.lp-trial-banner a', link => link.getAttribute('href')), `/premium?type=${type}`);
    }
    await wait(800);
    await (await page.$('#pricing')).screenshot({ path: `${screenshots}/landing-pricing-live.png` });
  }
  await page.$eval('#widgets', element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const before = await page.$eval('.lp-home-widget-counter', element => element.textContent);
  await page.click('[aria-label="Show next widgets"]');
  assert.notEqual(await page.$eval('.lp-home-widget-counter', element => element.textContent), before);
  await page.click('[aria-label="Show previous widgets"]');
  assert.equal(await page.$eval('.lp-home-widget-counter', element => element.textContent), before);
  await page.$eval('.lp-home-faq', element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.click('.lp-home-faq summary');
  assert.equal(await page.$eval('.lp-home-faq details', element => element.open), true);
  await page.$eval('.lp-footer', element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.click('.lp-footer__contact-toggle');
  assert.equal(await page.$eval('.lp-footer__contact-toggle', element => element.getAttribute('aria-expanded')), 'true');
  await page.click('.lp-footer__contact-toggle');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(850);
  await page.screenshot({ path: `${screenshots}/landing-experience-desktop.png`, fullPage: true });
  await page.screenshot({ path: `${screenshots}/landing-experience-hero.png` });

  for (const [width, height] of [[1920,1080], [1440,900], [1366,768], [1024,768], [768,1024], [430,932], [390,844], [360,800], [320,800]]) {
    await page.setViewport({ width, height });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await wait(300);
    assert.equal(await page.$eval('.lp-marketing-brand img', img => img.complete && img.naturalWidth > 0), true, 'Brand image loads');
    if (width < 1180) {
      assert.equal(await page.$eval('.lp-menu-toggle', el => { const r=el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }), true, 'Menu is a full touch target');
      await page.click('.lp-menu-toggle');
      await wait(300);
      await page.waitForSelector('.lp-mobile-menu[data-open="true"]');
      assert.equal(await page.$$eval('.lp-mobile-menu a', links => links.length), 6);
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('.lp-menu-toggle', el => el.getAttribute('aria-expanded')), 'false');
      await page.click('.lp-menu-toggle');
      await wait(300);
      await page.click('.lp-mobile-menu a[href="#widgets"]');
      assert.equal(await page.$eval('.lp-menu-toggle', el => el.getAttribute('aria-expanded')), 'false');
      assert.equal(await page.$eval('.lp-header-trial', el => { const r=el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.height >= 44; }), true, 'Trial CTA stays visible after navigating');
      await page.click('.lp-menu-toggle');
      await wait(300);
      await page.mouse.click(width / 2, height - 10);
      assert.equal(await page.$eval('.lp-menu-toggle', el => el.getAttribute('aria-expanded')), 'false', 'Click outside dismisses the menu');
    }
    await page.$eval('#playground', element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await wait(250);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width}px: no horizontal overflow`);
    assert.equal(await page.$$eval('.lp-studio, .lp-studio-float', els => els.every(el => { const r=el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; })), true, 'Studio and floating labels stay within the screen');
    await page.click('.lp-studio-palette button[aria-label="Arctic"]');
    assert.equal(await page.$eval('.lp-studio-stage', element => element.dataset.previewTheme), 'arctic');
    assert.equal(await page.$eval('.lp-studio-tools', element => element.scrollWidth > element.clientWidth + 1), false, `${width}px: widget controls fit`);
    await clickText('.lp-studio-tools button', 'Bonus Hunt');
    for (const format of ['Vertical', 'Horizontal', 'Mainstream']) {
      await clickText('.lp-studio-formats button', format);
      await page.waitForSelector(`.lp-studio-stage [data-orientation="${format.toLowerCase()}"]`);
      assert.equal(await page.$eval('.lp-studio-formats', element => element.scrollWidth > element.clientWidth + 1), false, `${width}px: format controls fit`);
    }
    if (width === 390) await (await page.$('.lp-studio')).screenshot({ path: `${screenshots}/landing-bonus-hunt-mobile.png` });
    await clickText('.lp-studio-tools button', 'Giveaway');
    if (width === 390) await page.screenshot({ path: `${screenshots}/landing-experience-mobile.png` });
    if (livePricing) {
      await page.$eval('#pricing', element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width}px: pricing fits`);
      assert.equal(await page.$$eval('.lp-pricing-cards .premium-card-content', cards => cards.every(card => card.scrollHeight <= card.clientHeight + 1)), true, `${width}px: plan content fits`);
      if (width === 390) await (await page.$('#pricing')).screenshot({ path: `${screenshots}/landing-pricing-mobile.png` });
    }
  }

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.waitForFunction(() => document.querySelector('.lp-home').dataset.motion === 'off');
  assert.equal(await page.$eval('.lp-studio-float', element => getComputedStyle(element).animationName), 'none');
  assert.equal(await page.$('.lp-motion-toggle'), null);
  await clickText('.lp-studio-tools button', 'Chat');
  await page.waitForSelector('.lp-studio-stage[data-preview-widget="chat"] .lp-home-widget-runtime');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.click('.lp-home-hero__ctas button');
  await page.waitForFunction(() => location.pathname === '/premium' && new URLSearchParams(location.search).get('type') === 'streamer');
  if (livePricing) {
    await page.waitForSelector('.premium-card-grid .premium-image-card');
    assert.equal(await page.$$eval('.premium-card-grid .premium-image-card', cards => cards.length), livePricing.plans.filter(plan => plan.productType === 'streamer' && plan.active !== false).length);
    // Exercise both guest entry paths without starting a trial or a paid checkout.
    await clickText('.premium-action', 'Start 7-day free trial');
    await page.waitForFunction(() => location.pathname === '/login');
    await page.goBack({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.premium-card-grid .premium-image-card');
    await page.click('.premium-card-grid .premium-image-card');
    await page.waitForFunction(() => location.pathname === '/login');
    await page.goBack({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.premium-card-grid .premium-image-card');
  }
  await page.goBack({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.lp-player-link');
  await page.click('.lp-player-link');
  await page.waitForFunction(() => location.pathname !== '/');
  assert.deepEqual(errors, []);
  console.log('Landing experience passed: real widget/theme controls, age/cookie flow, pointer tilt, motion pause, reduced motion, reveals, carousel, FAQ, contact UI, CTA routes and all eight requested viewports plus 320px.');
} catch (error) {
  console.error({ errors, preview: await page.$eval('.lp-studio-stage', element => ({ ...element.dataset, orientation: element.querySelector('[data-orientation]')?.dataset.orientation })).catch(() => null) });
  await page.screenshot({ path: `${screenshots}/landing-experience-failure.png` });
  throw error;
} finally {
  await browser.close();
}
