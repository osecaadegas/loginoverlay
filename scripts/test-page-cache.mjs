import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

// Run against the local Vite server. All account responses are isolated test fixtures.
const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const browser = await puppeteer.launch({ headless: true });
const counts = { roles: 0, premium: 0, player: 0 };
let denied = false;
let failRoles = false;
let responseDelay = 0;

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message); });
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    const json = async (body, status = 200) => {
      if (responseDelay) await new Promise((resolve) => setTimeout(resolve, responseDelay));
      await request.respond({
        status,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(body),
      });
    };
    if (url.pathname === '/__page-cache-test') {
      await request.respond({
        contentType: 'text/html',
        body: `<html><body><div id="root"></div><script type="module">
          import RefreshRuntime from '/@react-refresh';
          RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$ = () => {};
          window.$RefreshSig$ = () => (type) => type;
          window.__vite_plugin_react_preamble_installed__ = true;
        </script></body></html>`,
      });
    } else if (url.pathname === '/rest/v1/user_roles') {
      counts.roles += 1;
      await json(failRoles ? { message: 'Role lookup failed' } : denied ? [] : [
        { role: 'premium', is_active: true, access_expires_at: null },
      ], failRoles ? 500 : 200);
    } else if (url.pathname === '/api/premium') {
      counts.premium += 1;
      await json({ access: { hasStreamerAccess: !denied, roleNames: [], roles: [] } });
    } else if (url.pathname === '/api/player-subscription') {
      counts.player += 1;
      await json({ entitled: !denied, subscription: { status: denied ? 'expired' : 'active' } });
    } else if (url.origin === new URL(baseUrl).origin) {
      await request.continue();
    } else {
      await request.abort();
    }
  });

  await page.goto(`${baseUrl}/__page-cache-test`, { waitUntil: 'networkidle0' });
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  await page.evaluate(async (dependencyVersion) => {
    const dependency = (name) => `/node_modules/.vite/deps/${name}.js?v=${dependencyVersion}`;
    const { default: React } = await import(dependency('react'));
    const { default: ReactDOM } = await import(dependency('react-dom_client'));
    const { QueryClientProvider } = await import(dependency('@tanstack_react-query'));
    const { MemoryRouter, Routes, Route } = await import(dependency('react-router-dom'));
    const { supabase } = await import('/src/config/supabaseClient.js');
    const { queryClient, invalidateAccountQueries } = await import('/src/config/queryClient.js');
    const { AuthProvider, useAuth } = await import('/src/context/AuthContext.jsx');
    const { useAdmin } = await import('/src/hooks/useAdmin.js');
    const { usePremium } = await import('/src/hooks/usePremium.js');
    const { default: usePlayerSubscription } = await import('/src/features/playerBonusHunt/usePlayerSubscription.js');
    const { default: ProtectedAdminRoute } = await import('/src/components/ProtectedRoute/ProtectedAdminRoute.jsx');
    const { default: ProtectedPlayerRoute } = await import('/src/features/playerBonusHunt/ProtectedPlayerRoute.jsx');
    const h = React.createElement;
    const callbacks = new Set();
    const state = window.cacheTest = {
      session: { user: { id: 'cache-user-a', email: 'cache-a@example.test', user_metadata: {} }, access_token: 'test-only' },
      userEffects: 0,
      mounts: 0,
      preferenceWrites: 0,
      authCallbackActive: false,
      preferenceLockViolation: false,
      root: ReactDOM.createRoot(document.getElementById('root')),
      queryClient,
      invalidateAccountQueries,
    };
    localStorage.setItem('streamerscenter:selectedAudience', 'streamer');
    supabase.auth.getSession = async () => ({ data: { session: structuredClone(state.session) } });
    supabase.auth.onAuthStateChange = (callback) => {
      callbacks.add(callback);
      return { data: { subscription: { unsubscribe: () => callbacks.delete(callback) } } };
    };
    supabase.auth.updateUser = async () => {
      state.preferenceWrites += 1;
      state.preferenceLockViolation ||= state.authCallbackActive;
      return { data: { user: state.session?.user } };
    };
    state.emit = (event, session = state.session) => {
      state.session = session;
      state.authCallbackActive = true;
      for (const callback of callbacks) callback(event, structuredClone(session));
      state.authCallbackActive = false;
    };
    function Probe() {
      const { user } = useAuth();
      const admin = useAdmin();
      const premium = usePremium();
      const player = usePlayerSubscription();
      const [draft, setDraft] = React.useState('');
      React.useEffect(() => { state.userEffects += 1; }, [user]);
      React.useEffect(() => { state.mounts += 1; }, []);
      state.refreshPlayer = player.refresh;
      return h('div', { id: 'probe', 'data-user': user.id },
        h('input', { id: 'draft', value: draft, onChange: (event) => setDraft(event.target.value) }),
        h('output', { id: 'account' }, `${admin.isPremium}:${premium.isPremium}:${player.entitled}`),
        h('output', { id: 'profile' }, user.user_metadata?.full_name || ''),
      );
    }
    function TestRoutes() {
      const [show, setShow] = React.useState(true);
      state.show = setShow;
      return h(MemoryRouter, { initialEntries: ['/protected'] }, h(Routes, null,
        h(Route, {
          path: '/protected',
          element: show ? h(ProtectedAdminRoute, { allowPremium: true, redirectTo: '/denied' },
            h(ProtectedPlayerRoute, null, h(Probe))) : h('div', { id: 'away' }, 'Away'),
        }),
        h(Route, { path: '/denied', element: h('div', { id: 'denied' }, 'Access denied') }),
        h(Route, { path: '/login', element: h('div', { id: 'signed-out' }, 'Signed out') }),
        h(Route, { path: '/player/subscription', element: h('div', { id: 'player-denied' }, 'Player access denied') }),
      ));
    }
    state.tree = () => h(QueryClientProvider, { client: queryClient }, h(AuthProvider, null, h(TestRoutes)));
    state.render = () => state.root.render(state.tree());
    state.render();
  }, browserHash);

  await page.waitForFunction(() => document.getElementById('account')?.textContent === 'true:true:true');
  await page.type('#draft', 'Unsaved hunt settings');
  const initialCounts = { ...counts };
  const initial = await page.evaluate(() => ({
    userEffects: cacheTest.userEffects, mounts: cacheTest.mounts, preferenceWrites: cacheTest.preferenceWrites,
  }));
  assert.equal(counts.roles, 1, 'Route guard and page share one role request');
  assert.equal(counts.player, 1, 'Player guard and page share one subscription request');

  const otherWindow = await browser.newPage();
  for (let i = 0; i < 3; i += 1) {
    await otherWindow.bringToFront();
    await page.bringToFront();
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      cacheTest.emit('SIGNED_IN');
      cacheTest.emit('TOKEN_REFRESHED', { ...cacheTest.session, access_token: `rotated-${Date.now()}` });
    });
  }
  await otherWindow.close();
  await page.waitForNetworkIdle();
  assert.deepEqual(counts, initialCounts, 'Window switches must not repeat account requests');
  assert.deepEqual(await page.evaluate(() => ({
    userEffects: cacheTest.userEffects, mounts: cacheTest.mounts, preferenceWrites: cacheTest.preferenceWrites,
  })), initial, 'Focus and token refresh must not rerun page effects or remount');
  assert.equal(await page.$eval('#draft', (input) => input.value), 'Unsaved hunt settings');

  await page.evaluate(() => cacheTest.emit('USER_UPDATED', {
    ...cacheTest.session,
    user: { ...cacheTest.session.user, user_metadata: { full_name: 'Updated profile' } },
  }));
  await page.waitForFunction(() => document.getElementById('profile')?.textContent === 'Updated profile');
  assert.equal(await page.$eval('#draft', (input) => input.value), 'Unsaved hunt settings');
  assert.deepEqual(counts, initialCounts, 'Profile changes do not reset cached access');

  responseDelay = 200;
  await page.evaluate(() => {
    cacheTest.refreshDone = false;
    cacheTest.invalidateAccountQueries(cacheTest.session.user.id).then(() => { cacheTest.refreshDone = true; });
  });
  assert.equal(await page.$eval('#draft', (input) => input.value), 'Unsaved hunt settings', 'Background refresh keeps form mounted');
  await page.waitForFunction(() => cacheTest.refreshDone);
  assert.equal(await page.evaluate(() => cacheTest.mounts), initial.mounts);
  await page.evaluate(() => cacheTest.refreshPlayer());
  assert.ok(counts.player > initialCounts.player, 'Explicit refresh still fetches current subscription');
  responseDelay = 0;

  const beforeRemount = { ...counts };
  await page.evaluate(() => cacheTest.show(false));
  await page.waitForSelector('#away');
  await page.evaluate(() => cacheTest.show(true));
  await page.waitForSelector('#draft');
  await page.waitForNetworkIdle();
  assert.deepEqual(counts, beforeRemount, 'Returning to a page reuses fresh account cache');

  await page.evaluate(() => cacheTest.emit('SIGNED_IN', {
    ...cacheTest.session,
    user: { id: 'cache-user-b', email: 'cache-b@example.test', user_metadata: {} },
  }));
  await page.waitForFunction(() => document.getElementById('probe')?.dataset.user === 'cache-user-b');
  assert.equal(await page.$eval('#draft', (input) => input.value), '', 'Changing accounts discards previous page state');
  assert.equal(await page.evaluate(() => cacheTest.queryClient.getQueryCache().getAll().some((query) =>
    query.queryKey[1] === 'cache-user-a')), false, 'Previous account cache is removed');
  assert.equal(await page.evaluate(() => cacheTest.preferenceLockViolation), false, 'Preference sync runs outside the auth callback');

  denied = true;
  failRoles = true;
  await page.evaluate(() => cacheTest.invalidateAccountQueries(cacheTest.session.user.id));
  await page.waitForFunction(() => !!document.getElementById('denied') || !!document.getElementById('player-denied'));
  assert.equal(await page.$('#probe'), null, 'Failed or revoked access cannot expose cached protected content');

  await page.evaluate(() => cacheTest.emit('SIGNED_OUT', null));
  await page.waitForSelector('#signed-out');
  assert.equal(await page.evaluate(() => cacheTest.queryClient.getQueryCache().getAll().some((query) =>
    query.queryKey[1] === 'cache-user-b')), false, 'Sign-out removes account cache');

  // A slow bootstrap must not restore a session after a newer sign-out event.
  await page.evaluate(async () => {
    const { supabase } = await import('/src/config/supabaseClient.js');
    cacheTest.root.render(null);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const oldSession = { user: { id: 'old-session', user_metadata: {} }, access_token: 'old-token' };
    supabase.auth.getSession = () => new Promise((resolve) => {
      cacheTest.resolveSession = () => resolve({ data: { session: oldSession } });
    });
    cacheTest.render();
  });
  await page.waitForFunction(() => typeof cacheTest.resolveSession === 'function');
  await page.evaluate(() => { cacheTest.emit('SIGNED_OUT', null); cacheTest.resolveSession(); });
  await page.waitForSelector('#signed-out');
  assert.equal(await page.$('#probe'), null, 'Late bootstrap cannot undo sign-out');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Page cache browser tests passed: focus, token refresh, drafts, profile updates, shared cache, refresh, account isolation, revocation, and bootstrap race.');
} finally {
  await browser.close();
}
