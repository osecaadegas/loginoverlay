import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3012';
const browser = await puppeteer.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/__runtime-test') return request.respond({ contentType: 'text/html', body: `<html><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>` });
    if (url.pathname === '/src/context/AuthContext.jsx') return request.respond({ contentType: 'application/javascript', body: 'export const useAuth = () => window.testAuth || {}; export const AuthProvider = ({children}) => children;' });
    if (url.pathname === '/src/utils/azureTranslator.js') return request.respond({ contentType: 'application/javascript', body: `export const DEFAULT_LANGUAGE = 'en'; export const LANGUAGES = {en:'en',pt:'pt',es:'es'}; export const loadUITranslations = async()=>({}); export const getSupportedLanguages = async()=>['en','pt','es']; export const translateAndCache = async(value)=>value;` });
    if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) return request.continue();
    if (['data:', 'blob:'].includes(url.protocol)) return request.continue();
    return request.abort(); // No real chat, credentials, loyalty mutations or DB writes in regression tests.
  });
  await page.goto(`${baseUrl}/__runtime-test`, { waitUntil: 'networkidle0' });
  const results = await page.evaluate(async () => {
    const results = [];
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const wait = (ms = 70) => new Promise(resolve => setTimeout(resolve, ms));
    const source = await (await fetch('/src/components/LandingPage/SubscriberReviews.jsx')).text();
    const dependency = name => source.match(new RegExp('"([^"\\n]*' + name + '\\.js[^"\\n]*)"'))[1];
    const { default: React } = await import(dependency('/react'));
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { QueryClient, QueryClientProvider } = await import(dependency('@tanstack_react-query'));
    const { default: useTwitchChat } = await import('/src/hooks/useTwitchChat.js');
    const { supabase } = await import('/src/config/supabaseClient.js');
    const h = React.createElement;
    const root = ReactDOM.createRoot(document.getElementById('root'));
    let sockets = [];
    class Socket {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      constructor(url) { this.url = url; this.readyState = 0; this.sent = []; this.closes = 0; sockets.push(this); }
      send(value) { this.sent.push(value); }
      open() { this.readyState = 1; this.onopen?.(); }
      close() { this.closes++; this.readyState = 3; this.onclose?.(); }
      message(value) { this.onmessage?.({ data: value }); }
    }
    window.WebSocket = Socket;
    function Listener({ channel, version = 1, raids = true }) {
      useTwitchChat(channel, message => received.push({ version, message }), {
        parseRaids: raids, onRoomState: room => rooms.push({ version, room }),
      });
      return null;
    }
    const received = [], rooms = [];
    root.render(h(React.StrictMode, null, h(Listener, { channel: ' #TeSt ' })));
    await wait();
    check(sockets.length === 1, 'StrictMode must create exactly one socket');
    const first = sockets[0]; first.open();
    check(first.sent.includes('JOIN #test'), 'Channel normalization and IRC join are preserved');
    root.render(h(React.StrictMode, null, h(Listener, { channel: 'test', version: 2 })));
    await wait();
    check(sockets.length === 1 && first.closes === 0, 'Fresh callbacks must not reconnect');
    first.message('PING :tmi.twitch.tv\r\n@room-id=123 :tmi.twitch.tv ROOMSTATE #test\r\n@id=m1;user-id=456;room-id=123;display-name=Viewer;badges=subscriber/3;subscriber=1;emotes=25:0-4;bits=5 :viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #test :Kappa hello\r\n');
    check(first.sent.includes('PONG :tmi.twitch.tv'), 'Keepalive replies are preserved');
    check(rooms[0].version === 2 && rooms[0].room.channelId === '123', 'ROOMSTATE uses the latest callback');
    check(received[0].version === 2 && received[0].message.twitchUserId === '456' && received[0].message.broadcasterId === '123', 'Messages retain authenticated listener identity fields');
    check(received[0].message.isSub && received[0].message.bits === 5 && received[0].message.twitchEmotes[0].id === '25', 'Badges, bits and emotes remain intact');
    first.message('@id=r1;msg-id=raid;msg-param-displayName=Raider;msg-param-viewerCount=12 :tmi.twitch.tv USERNOTICE #test\r\n');
    check(received[1].message.isRaid && received[1].message.raidViewers === 12, 'Raid parsing is preserved');
    root.render(h(React.StrictMode, null, h(Listener, { channel: 'test', version: 3, raids: false })));
    await wait();
    first.message('@id=r2;msg-id=raid :tmi.twitch.tv USERNOTICE #test\r\n');
    check(received.length === 2 && sockets.length === 1, 'Raid option updates without reconnecting');
    first.close(); await wait(3100);
    check(sockets.length === 2, 'Unexpected close reconnects once');
    const pending = sockets[1]; root.render(null); await wait();
    check(pending.closes === 0, 'Unmount must not abort an in-progress handshake');
    pending.open();
    check(pending.closes === 1 && pending.sent.length === 0, 'Retired handshake closes without joining');
    await wait(3100); check(sockets.length === 2, 'Unmount must never schedule another reconnect');
    root.render(h(Listener, { channel: 'old' })); await wait();
    const old = sockets.at(-1);
    root.render(h(Listener, { channel: 'new' })); await wait();
    old.open(); sockets.at(-1).open();
    check(old.sent.length === 0 && sockets.at(-1).sent.includes('JOIN #new'), 'Channel switch retires only the old socket');
    root.render(null); await wait();
    results.push('PASS: StrictMode, callback changes, IRC parsing, reconnect, channel change and unmount');

    // Provide a real signed-in channel fallback to reproduce landing preview connections.
    localStorage.setItem('twitchChannel', 'runtimefixture');
    window.testAuth = { user: { id: 'user-test', identities: [{ provider: 'twitch', identity_data: { sub: '123' } }] } };
    supabase.auth.getUser = async () => ({ data: { user: window.testAuth.user } });
    let writes = [], queries = [], profile = null, delayedProfile = null;
    const connection = { verified_at: '2026-09-22', verified_twitch_id: '123', se_username: 'runtimefixture', se_channel_id: 'testchannel', se_jwt_token: 'test-only' };
    supabase.from = table => {
      const query = { table }; queries.push(query);
      const q = {
        select() { return q; }, eq(key, value) { query[key] = value; return q; },
        maybeSingle() { query.optional = true; return table === 'user_profiles' && delayedProfile ? delayedProfile : Promise.resolve({ data: table === 'user_profiles' ? profile : connection, error: null }); },
        single() { return Promise.resolve({ data: { config: { participants: [] } }, error: null }); },
        upsert(values, options) { writes.push({ table, values, options }); profile = { ...profile, ...values }; return Promise.resolve({ error: null }); },
        update(values) { writes.push({ table, values }); return q; },
        then(resolve) { return Promise.resolve({ data: null, error: null }).then(resolve); },
      }; return q;
    };
    const { default: ChatWidget } = await import('/src/components/OverlayCenter/widgets/chat/ChatWidget.jsx');
    const { default: GiveawayWidget } = await import('/src/components/OverlayCenter/widgets/giveaway/GiveawayWidget.jsx');
    const { createBetterInstance, renderBetterWidgetInstance } = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const mount = child => root.render(h(QueryClientProvider, { client }, child));
    sockets = [];
    mount(h(ChatWidget, { config: { twitchEnabled: false, bttvEnabled: false, showEmptyState: false } }));
    await wait(); check(sockets.length === 0, 'Disabled Twitch must not fall back to the signed-in channel');
    mount(h(ChatWidget, { config: { twitchEnabled: true, twitchChannel: 'runtimefixture', bttvEnabled: false } }));
    await wait(); check(sockets.length === 1, 'Enabled live chat still connects');
    sockets[0].open(); root.render(null); await wait(); sockets = [];
    const instance = createBetterInstance('giveaway', { instanceId: 'landing-giveaway' });
    mount(renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, mode: 'mock' }));
    await wait(2150);
    check(sockets.length === 0 && writes.length === 0, 'Mock giveaway must not connect or write');
    mount(h(GiveawayWidget, { widgetId: 'real-widget', config: { keyword: 'join', participants: [], twitchChannel: 'runtimefixture' } }));
    await wait(); check(sockets.length === 1, 'Live giveaway still connects'); sockets[0].open();
    sockets[0].message('@id=g1;display-name=Participant :participant!p@p.tmi.twitch.tv PRIVMSG #runtimefixture :!join\r\n');
    await wait(2100);
    check(writes.some(w => w.table === 'overlay_widgets' && w.values.config.participants.includes('Participant')), 'Live giveaway still saves real entries');
    root.render(null); await wait();
    results.push('PASS: disabled chat and mock giveaway stay offline; live chat and giveaway entry processing work');

    const { LanguageProvider, useLanguage } = await import('/src/contexts/LanguageContext.jsx');
    function LanguageProbe() { window.languageState = useLanguage(); return h('span', null, window.languageState.language); }
    localStorage.setItem('preferred_language', 'en'); queries = []; writes = [];
    root.render(h(LanguageProvider, null, h(LanguageProbe))); await wait();
    check(queries.some(q => q.table === 'user_profiles' && q.optional), 'Missing profile uses optional lookup');
    check(window.languageState.language === 'en', 'Missing profile retains the local/default language');
    await window.languageState.setLanguage('pt'); await wait();
    check(profile.preferred_language === 'pt' && writes[0].options.onConflict === 'user_id', 'First preference is persisted with an owner-scoped upsert');
    root.render(null); await wait();
    let resolveProfile;
    delayedProfile = new Promise(resolve => { resolveProfile = resolve; });
    root.render(h(LanguageProvider, null, h(LanguageProbe))); await wait();
    await window.languageState.setLanguage('es'); await wait();
    resolveProfile({ data: { preferred_language: 'en' }, error: null }); await wait();
    check(window.languageState.language === 'es', 'Slow profile response must not overwrite a newer selection');
    delayedProfile = null; root.render(null); await wait();
    results.push('PASS: missing profile, first saved language and stale-response protection');

    const { StreamElementsProvider, useStreamElements } = await import('/src/context/StreamElementsContext.jsx');
    function PointsProbe() { window.pointsState = useStreamElements(); return null; }
    const originalFetch = window.fetch; const pointsRequests = [];
    window.fetch = async (url, options) => { pointsRequests.push(url); return { ok: true, json: async () => ({ points: 42 }) }; };
    root.render(h(StreamElementsProvider, null, h(PointsProbe))); await wait();
    check(window.pointsState.seAccount?.se_username === 'runtimefixture', 'Verified connection still loads');
    check(pointsRequests.length === 0, 'Global connection load must not query unused broadcaster points');
    await window.pointsState.refreshPoints(); await wait();
    check(pointsRequests.length === 1 && window.pointsState.points === 42, 'Explicit balance refresh still fetches and returns points');
    window.fetch = originalFetch;
    root.unmount();
    results.push('PASS: verified StreamElements connection loads without owner lookup; explicit balance refresh works');
    return results;
  });
  results.forEach(result => console.log(result));
  assert.deepEqual(errors, [], 'No browser runtime exceptions');
} finally {
  await browser.close();
}
