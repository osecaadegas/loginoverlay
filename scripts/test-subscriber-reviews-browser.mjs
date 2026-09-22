import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3012';
const browser = await puppeteer.launch({ headless: true });
let eligible = true, saved = null, failPublic = false, postCount = 0;
let page;
const errors = [];
try {
  page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/__reviews-test') return request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#080f18;font-family:Arial"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>` });
    if (url.pathname === '/api/reviews') {
      let payload, status = 200;
      if (request.method() === 'POST') {
        assert.equal(request.headers().authorization, 'Bearer test-only');
        const body = JSON.parse(request.postData()); postCount++;
        saved = saved || { id: 'review-1', displayName: body.displayName, body: body.body, rating: body.rating, published: true, productCode: 'streamer_premium', rewardDays: 3, rewardEnd: '2027-01-15T00:00:00Z' };
        saved.rewardStatus = postCount === 1 ? 'pending' : 'applied';
        payload = { review: saved, message: postCount === 1 ? 'Your review is saved. Retry to finish applying your reward.' : undefined };
        status = postCount === 1 ? 202 : 200;
      } else if (url.searchParams.get('action') === 'mine') payload = { review: saved, eligible, productCode: 'streamer_premium' };
      else if (failPublic) { status = 503; payload = { error: 'Test unavailable' }; }
      else payload = { reviews: saved ? [{ id: saved.id, display_name: saved.displayName, rating: saved.rating, body: saved.body, product_code: saved.productCode, created_at: '2026-09-22T00:00:00Z' }] : [], summary: { count: saved ? 1 : 0, average: saved ? saved.rating : null }, nextOffset: null };
      return request.respond({ status, contentType: 'application/json', body: JSON.stringify(payload) });
    }
    if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) return request.continue();
    if (['data:', 'blob:'].includes(url.protocol)) return request.continue();
    return request.abort();
  });
  await page.goto(`${baseUrl}/__reviews-test`, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    // Use this running Vite server's actual import URLs, not another server's disk cache hash.
    const source = await (await fetch('/src/components/LandingPage/SubscriberReviews.jsx')).text();
    const dependency = (name) => source.match(new RegExp('"([^"\\n]*' + name + '\\.js[^"\\n]*)"'))[1];
    const { default: React } = await import(dependency('/react'));
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { BrowserRouter } = await import(dependency('react-router-dom'));
    const { QueryClient, QueryClientProvider } = await import(dependency('@tanstack_react-query'));
    const { default: Reviews } = await import('/src/components/LandingPage/SubscriberReviews.jsx');
    const { supabase } = await import('/src/config/supabaseClient.js');
    await import('/src/components/LandingPage/LandingPage.css');
    await import('/src/components/LandingPage/LandingModern.css');
    supabase.auth.getSession = async () => ({ data: { session: { access_token: 'test-only' } } });
    const root = ReactDOM.createRoot(document.getElementById('root'));
    let iteration = 0;
    window.mountReviews = (signedIn = true) => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      root.render(React.createElement(QueryClientProvider, { client, key: ++iteration },
        React.createElement(BrowserRouter, null, React.createElement('div', { className: 'lp-home' }, React.createElement(Reviews, { user: signedIn ? { id: 'test-user' } : null, onLogin: () => { window.loginClicked = true; } })))));
    };
    window.mountReviews();
  });
  await page.waitForSelector('.sr-form');
  await page.click('input[name="review-rating"][value="1"]');
  await page.type('input[autocomplete="nickname"]', 'Browser test');
  await page.type('textarea', '<img src=x onerror=alert(1)> Honest critical feedback for testing.');
  await page.click('input[type="checkbox"]');
  await page.click('.sr-form button');
  await page.waitForFunction(() => document.querySelector('.sr-own')?.textContent.includes('Retry reward'));
  assert.equal(postCount, 1);
  await page.waitForSelector('.sr-card');
  assert.equal(await page.$('.sr-card img'), null, 'Review text is escaped, never interpreted as HTML');
  assert.match(await page.$eval('.sr-card', el => el.textContent), /3-day incentive/);
  await page.click('.sr-own button');
  await page.waitForFunction(() => document.querySelector('.sr-own')?.textContent.includes('three free days have been added'));
  assert.equal(postCount, 2);
  assert.equal(await page.$('.sr-form'), null, 'Only one review form per account');
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  saved = null; eligible = false;
  await page.evaluate(() => window.mountReviews());
  await page.waitForFunction(() => document.querySelector('.sr-write')?.textContent.includes('An active Player or Streamer subscription is needed'));
  assert.equal(await page.$('.sr-form'), null);
  await page.evaluate(() => window.mountReviews(false));
  await page.waitForFunction(() => document.querySelector('.sr-write button')?.textContent.includes('Sign in'));
  await page.click('.sr-write button'); assert.equal(await page.evaluate(() => window.loginClicked), true);
  failPublic = true;
  await page.evaluate(() => window.mountReviews(false));
  await page.waitForFunction(() => document.querySelector('.sr-feed')?.textContent.includes('couldn’t load'));
  failPublic = false;
  await page.click('.sr-feed button');
  await page.waitForSelector('.sr-empty');
  assert.deepEqual(errors, []);
  console.log('Review browser checks passed: eligible form, one-star submission, pending/retry, success, escaped content, disclosure, mobile, non-subscriber, signed-out and network failure/retry.');
} catch (error) {
  console.error({ browserErrors: errors, pageText: await page?.evaluate(() => document.body.innerText).catch(() => '') });
  throw error;
} finally { await browser.close(); }
