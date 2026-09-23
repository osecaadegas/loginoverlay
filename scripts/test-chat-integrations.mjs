import assert from 'node:assert/strict';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { resolveChatCommandOwner } from '../api/raid-shoutout.js';

const publicOverlayId = `bo_${'a'.repeat(48)}`;
const overlayToken = 'b'.repeat(48);
const db = {
  from(table) {
    const filters = {};
    const query = {
      select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      is(key, value) { filters[key] = value; return query; },
      async maybeSingle() {
        const valid = table === 'better_overlay_publications'
          ? filters.public_overlay_id === publicOverlayId && filters.revoked_at === null
          : filters.overlay_token === overlayToken && filters.is_active === true;
        return { data: valid ? { owner_user_id: 'owner-a', user_id: 'owner-a' } : null };
      },
    };
    return query;
  },
};
assert.equal(await resolveChatCommandOwner(db, publicOverlayId), 'owner-a');
assert.equal(await resolveChatCommandOwner(db, undefined, overlayToken), 'owner-a');
assert.equal(await resolveChatCommandOwner(db, publicOverlayId, overlayToken), null);
assert.equal(await resolveChatCommandOwner(db, `bo_${'c'.repeat(48)}`), null);
assert.equal(await resolveChatCommandOwner(db, undefined, 'c'.repeat(48)), null);
assert.equal(await resolveChatCommandOwner(db, 'invalid'), null);

const styles = ['classic', 'glow_panel', 'metal', 'StyleSecaChat', 'cards', 'floating', 'bubble', 'stack', 'sidebar', 'typewriter', 'bh_stats', 'better_chat', 'broadcast_chat', 'community_chat'];
const server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0, open: false } });
let browser;
try {
  await server.listen();
  const baseUrl = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/__chat-integrations') return request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#202125"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>` });
    if (url.origin === baseUrl && !url.pathname.startsWith('/api/')) return request.continue();
    if (['data:', 'blob:'].includes(url.protocol)) return request.continue();
    return request.abort();
  });
  await page.goto(`${baseUrl}/__chat-integrations`, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    const source = await (await fetch('/src/components/OverlayCenter/widgets/chat/ChatWidget.jsx')).text();
    const reactUrl = source.match(/"([^"\n]*\/react\.js[^"\n]*)"/)[1];
    const { default: React } = await import(reactUrl);
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { default: ChatWidget } = await import('/src/components/OverlayCenter/widgets/chat/ChatWidget.jsx');
    const { createBetterInstance, renderBetterWidgetInstance } = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const { switchChatStyle } = await import('/src/components/OverlayCenter/widgets/chat/chatStyles.js');
    const { withChatPreviewSamples } = await import('/src/components/OverlayCenter/widgets/chat/chatPreviewSamples.js');
    const { ChatGiveawayAppearanceControls } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    const { resolveEmbeddedGiveawayConfig } = await import('/src/components/OverlayCenter/widgets/giveaway/embeddedGiveawayConfig.js');
    const { default: GiveawayWidget } = await import('/src/components/OverlayCenter/widgets/giveaway/GiveawayWidget.jsx');
    const { supabase } = await import('/src/config/supabaseClient.js');
    await import('/src/components/OverlayCenter/OverlayRenderer.css');
    const root = ReactDOM.createRoot(document.getElementById('root'));
    const h = React.createElement;
    window.commandCalls = [];
    window.writes = [];
    window.sockets = [];
    const callbacks = new Set();
    localStorage.setItem('twitchChannel', 'fixture');
    supabase.auth.getUser = async () => ({ data: { user: null } });
    supabase.channel = () => {
      let callback;
      const channel = { on(event, filter, cb) { callback = cb; return channel; }, subscribe() { callbacks.add(callback); return channel; }, unsubscribe() { callbacks.delete(callback); } };
      return channel;
    };
    supabase.removeChannel = channel => channel.unsubscribe();
    supabase.from = table => {
      const query = {
        select() { return query; }, eq() { return query; }, order() { return query; }, limit() { return query; },
        single: async () => ({ data: { config: window.giveawayConfig } }),
        maybeSingle: async () => ({ data: null }),
        update(value) { window.writes.push({ table, value }); if (table === 'overlay_widgets') window.giveawayConfig = value.config; return query; },
        then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
      };
      return query;
    };
    const realFetch = window.fetch;
    window.fetch = async (url, options) => {
      if (url !== '/api/raid-shoutout') return realFetch(url, options);
      const command = JSON.parse(options.body);
      window.commandCalls.push(command);
      callbacks.forEach(callback => callback({ new: { id: command.sourceEventId, status: 'pending', raider_username: command.raiderUsername, raider_display_name: 'Target Streamer' } }));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };
    window.WebSocket = class {
      static OPEN = 1; static CONNECTING = 0; static CLOSED = 3;
      constructor(url) { this.url = url; this.readyState = 0; window.sockets.push(this); setTimeout(() => { if (this.readyState === 0) { this.readyState = 1; this.onopen?.(); } }, 10); }
      send() {} close() { this.readyState = 3; this.onclose?.(); }
    };
    window.irc = (text, moderator = true) => window.sockets.filter(socket => socket.readyState === 1).forEach(socket => socket.onmessage?.({ data: `@id=event-${Date.now()};display-name=Viewer;mod=${moderator ? 1 : 0};badges= :viewer!v@v.tmi.twitch.tv PRIVMSG #fixture :${text}\r\n` }));
    window.mountChat = ({ style = 'classic', state = 'open', position = 'top', width = 360, height = 600, live = false, legacy = false, registry = false, mode = 'live', enabled = true, editorPreview = false, sample = false, shoutout = true } = {}) => {
      const config = {
        chatStyle: style, live: true, bttvEnabled: false, twitchEnabled: live, twitchChannel: 'fixture',
        giveawayInChat: enabled, giveawayPosition: position, shoutoutInChat: shoutout,
        shoutoutPosition: position, shoutoutHeight: 180, shoutoutDuration: 10,
        __appearancePreviewMessages: [{ id: 'sample', username: 'StreamFan', message: 'Enjoy the stream!' }],
        ...(live ? {} : { __previewShoutoutAlert: { raider_username: 'preview', raider_display_name: 'Preview Streamer' } }),
        ...(sample ? withChatPreviewSamples() : {}),
      };
      const restored = switchChatStyle(switchChatStyle(config, 'community_chat'), style);
      if (restored.giveawayInChat !== enabled || restored.shoutoutInChat !== shoutout || restored.giveawayPosition !== position) throw new Error('Integration settings lost on style switch');
      window.giveawayConfig = {
        title: 'Community Giveaway', prize: 'Channel reward', keyword: 'join',
        participants: state === 'empty' ? [] : [{ name: 'First Viewer' }, 'SecondViewer'],
        isActive: state === 'open', spinningWinner: state === 'drawing' ? 'SecondViewer' : '',
        winner: state === 'winner' ? 'SecondViewer' : '', twitchChannel: 'fixture', twitchEnabled: live || editorPreview,
      };
      const giveawayWidget = { id: 'giveaway-source', widget_type: 'giveaway', is_visible: false, config: window.giveawayConfig };
      const instance = createBetterInstance('chat', { config });
      const content = registry
        ? renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, mode, runtime: live ? 'obs' : 'editor', liveWidgets: [giveawayWidget] })
        : h(ChatWidget, { key: `${style}-${live}-${legacy}`, config, allWidgets: [giveawayWidget], previewOnly: !live && !editorPreview, runtime: live ? 'obs' : 'editor', userId: 'owner-a', ...(legacy ? { overlayToken: 'b'.repeat(48) } : { publicOverlayId: `bo_${'a'.repeat(48)}` }) });
      root.render(h('div', { id: 'host', style: { width, height, margin: 12 } }, content));
    };
    window.mountGiveawayEditor = (initialConfig = {}, state = 'open') => {
      const live = { title: 'Matching giveaway', prize: 'Channel reward', keyword: 'join', participants: ['First Viewer', 'SecondViewer'], isActive: state === 'open', spinningWinner: state === 'drawing' ? 'SecondViewer' : '', winner: state === 'winner' ? 'SecondViewer' : '', twitchEnabled: false, kickEnabled: false, durationSec: 1.2 };
      const source = resolveEmbeddedGiveawayConfig({}, live, { panelHi: '#363d46', bgColor: '#20252d', panelLo: '#14181c', cardHi: '#363d46', cardLo: '#252a31', lineColor: '#64748b', __appearanceExplicitSubElements: { container: { borderRadius: 24 } } });
      window.sourceAppearanceBefore = JSON.stringify(source);
      window.sourceAppearance = source;
      function EditorFixture() {
        const [config, setConfig] = React.useState({ chatStyle: 'community_chat', live: true, twitchEnabled: false, giveawayInChat: true, shoutoutInChat: false, __appearancePreviewMessages: [{ username: 'Viewer', message: 'Still chatting' }], ...initialConfig });
        window.savedGiveawayChat = config;
        const allWidgets = [{ id: 'source', widget_type: 'giveaway', config: source }];
        return h('main', { style: { display: 'flex', gap: 16 } },
          h('div', { id: 'edited-chat', style: { width: 420, height: 720 } }, h(ChatWidget, { config, allWidgets, runtime: 'obs', previewOnly: true })),
          h('div', { id: 'standalone-giveaway', style: { width: 420, height: 270 } }, h(GiveawayWidget, { config: source, previewOnly: true })),
          h('aside', { style: { width: 360 } }, h(ChatGiveawayAppearanceControls, { config, onChange: setConfig, allWidgets })));
      }
      root.render(h(EditorFixture, { key: Math.random() }));
    };
    window.restoreGiveawayChat = () => {
      const config = JSON.parse(JSON.stringify(window.savedGiveawayChat));
      const switched = switchChatStyle(config, 'broadcast_chat');
      if (switched.giveawayAppearance) throw new Error('Giveaway appearance leaked to another chat style');
      window.mountGiveawayEditor(switchChatStyle(switched, 'community_chat'), 'drawing');
    };
  });
  const settle = () => new Promise(resolve => setTimeout(resolve, 150));
  for (const style of styles) {
    for (const [state, position, width, height] of [['open', 'top', 320, 600], ['drawing', 'bottom', 600, 480], ['winner', 'top', 240, 400], ['open', 'bottom', 150, 150]]) {
      await page.evaluate(options => window.mountChat(options), { style, state, position, width, height, shoutout: false });
      await settle();
      const result = await page.evaluate(() => {
        const host = document.getElementById('host').getBoundingClientRect();
        const giveaway = document.querySelector('.ov-chat-giveaway');
        const rect = giveaway.getBoundingClientRect();
        const messages = document.querySelector('.ov-chat-messages').getBoundingClientRect();
        return { text: giveaway.textContent, fits: rect.left >= host.left - 1 && rect.right <= host.right + 1 && rect.bottom <= host.bottom + 1, bounds: { host: host.toJSON(), giveaway: rect.toJSON() }, messageHeight: messages.height };
      });
      assert.ok(result.fits && result.messageHeight > 0, `${style}/${state}/${width}x${height}: giveaway and messages fit: ${JSON.stringify(result)}`);
      assert.match(result.text, state === 'open' ? /!join/ : state === 'drawing' ? /Drawing/ : /SecondViewer/);
    }
  }
  await page.evaluate(() => window.mountChat({ editorPreview: true }));
  await settle();
  for (const style of styles) {
    await page.evaluate(style => window.mountChat({ style, sample: true, height: 900 }), style);
    await settle();
    const text = await page.$eval('#host', element => element.textContent);
    for (const expected of ['ChannelOwner', 'LoyalSub', 'CommunityVIP', 'ChatModerator', '!so RaidLeader', '!join']) {
      assert.ok(text.includes(expected), `${style}: sample displays ${expected}`);
    }
    assert.match(await page.$eval('.better-shoutout-card', element => element.textContent), /RaidLeader/);
    assert.equal(await page.$('.ov-chat-giveaway'), null, `${style}: active !so temporarily removes the giveaway`);
    assert.equal(await page.$eval('.ov-chat-shoutout', element => element.dataset.chatSlot), 'giveaway', `${style}: active !so occupies the giveaway slot`);
    await page.evaluate(style => window.mountChat({ style, sample: true, height: 900, shoutout: false }), style);
    await settle();
    assert.match(await page.$eval('.ov-chat-giveaway', element => element.textContent), /Giveaway #1/, `${style}: giveaway returns when !so is inactive`);
  }
  for (const style of styles) {
    await page.evaluate(style => window.mountChat({ style, state: 'empty', height: 600, shoutout: false }), style);
    await settle();
    const availableChatHeight = await page.$eval('.ov-chat-messages', element => element.getBoundingClientRect().height);
    await page.evaluate(style => window.mountChat({ style, state: 'empty', height: 600, shoutout: true }), style);
    await settle();
    const standaloneShoutout = await page.evaluate(() => ({
      slot: document.querySelector('.ov-chat-shoutout')?.dataset.chatSlot,
      animation: document.querySelector('.better-shoutout-card')?.className || '',
      chatHeight: document.querySelector('.ov-chat-messages')?.getBoundingClientRect().height || 0,
    }));
    assert.equal(standaloneShoutout.slot, 'messages', `${style}: !so uses chat space when no giveaway is visible`);
    assert.match(standaloneShoutout.animation, /anim-slide-left/, `${style}: standalone !so keeps its animation`);
    assert.ok(standaloneShoutout.chatHeight < availableChatHeight, `${style}: standalone !so temporarily reduces visible chat space`);
  }
  assert.equal(await page.evaluate(() => window.sockets.length), 0, 'Previews never connect giveaway listeners to Twitch, even without previewOnly');
  assert.equal(await page.evaluate(() => window.writes.length), 0, 'Previews never write giveaway entries or consume alerts');
  assert.equal(await page.evaluate(() => window.commandCalls.length), 0, 'Sample !so messages never call the shoutout API');
  for (const style of styles) {
    for (const legacy of [false, true]) {
      await page.evaluate(options => window.mountChat(options), { style, live: true, legacy, state: 'empty' });
      await settle();
      const before = await page.evaluate(() => window.commandCalls.length);
      await page.evaluate(() => window.irc('!so target', false));
      await settle();
      assert.equal(await page.evaluate(() => window.commandCalls.length), before, `${style}: viewer !so ignored`);
      await page.evaluate(() => window.irc('!so target', true));
      await page.waitForFunction(count => window.commandCalls.length > count, {}, before);
      await page.waitForSelector('.better-shoutout-card');
      const call = await page.evaluate(() => window.commandCalls.at(-1));
      assert.equal(legacy ? call.overlayToken : call.publicOverlayId, legacy ? overlayToken : publicOverlayId);
      assert.equal(call.requesterRole, 'moderator');
    }
  }
  await page.evaluate(() => window.mountChat({ style: 'community_chat', live: true, state: 'open' }));
  await settle();
  await page.evaluate(() => window.irc('!join', false));
  await page.waitForFunction(() => window.writes.some(write => write.table === 'overlay_widgets' && write.value.config.participants.includes('Viewer')), { timeout: 5000 });
  await page.evaluate(() => window.mountChat({ registry: true, style: 'community_chat', state: 'winner', shoutout: false }));
  await settle();
  assert.match(await page.$eval('.ov-chat-giveaway', element => element.textContent), /SecondViewer/, 'A chat-only layout receives the live giveaway source');
  await page.evaluate(() => window.mountChat({ registry: true, style: 'community_chat', state: 'empty' }));
  await settle();
  assert.equal(await page.$('.ov-chat-giveaway'), null, 'Idle giveaway collapses');
  await page.evaluate(() => window.mountChat({ registry: true, style: 'community_chat', enabled: false }));
  await settle();
  assert.equal(await page.$('.ov-chat-giveaway'), null, 'Toggle disables giveaway display');
  await page.evaluate(() => window.mountChat({ registry: true, mode: 'mock', style: 'community_chat', shoutout: false }));
  await settle();
  assert.match(await page.$eval('.ov-chat-giveaway', element => element.textContent), /Giveaway #1/, 'Sample mode uses giveaway sample data');
  await page.evaluate(() => window.mountGiveawayEditor());
  await settle();
  const matching = await page.evaluate(() => {
    const properties = ['backgroundImage', 'borderRadius', 'borderColor', 'fontFamily'];
    const styles = ['#edited-chat', '#standalone-giveaway'].map(root => getComputedStyle(document.querySelector(`${root} .better-giveaway-widget`)));
    return properties.every(property => styles[0][property] === styles[1][property]);
  });
  assert.equal(matching, true, 'Embedded card uses the standalone giveaway appearance');
  await page.evaluate(() => [...document.querySelectorAll('aside button')].find(button => button.textContent.includes('Custom giveaway appearance')).click());
  await settle();
  const changeField = async (label, value) => {
    await page.evaluate(({ label, value }) => {
      const field = [...document.querySelectorAll('aside label')].find(element => element.querySelector('em')?.textContent === label || element.querySelector('strong')?.textContent === label || element.querySelector('span')?.textContent === label);
      const input = field?.querySelector('input,select');
      if (!input) throw new Error(`Missing control: ${label}`);
      const prototype = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, String(value));
      input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    }, { label, value });
    await settle();
  };
  await changeField('Title colour', '#ff00aa');
  await changeField('Renderer background', '#123456');
  await changeField('Giveaway height in chat', 310);
  await page.evaluate(() => [...document.querySelectorAll('aside [data-level="secondary"] button')].find(button => button.textContent === 'Edges').click());
  await settle();
  await changeField('Corner units', '%');
  await changeField('Top left', 35);
  await changeField('Bottom right', 15);
  await changeField('Border width', 4);
  await page.evaluate(() => [...document.querySelectorAll('aside [data-level="secondary"] button')].find(button => button.textContent === 'Typography').click());
  await settle();
  await changeField('Title', 32);
  await changeField('Roll avatar size', 48);
  await page.evaluate(() => window.restoreGiveawayChat());
  await new Promise(resolve => setTimeout(resolve, 1800));
  const custom = await page.evaluate(() => {
    const card = document.querySelector('#edited-chat .better-giveaway-widget');
    const track = card.querySelector('.better-gw-roulette-track');
    const viewport = card.querySelector('.better-gw-roulette-viewport').getBoundingClientRect();
    const winner = card.querySelector('[data-giveaway-winner="true"]').getBoundingClientRect();
    return {
      colour: getComputedStyle(card.querySelector('.better-gw-name')).color,
      size: getComputedStyle(card.querySelector('.better-gw-name')).fontSize,
      radius: getComputedStyle(card).borderTopLeftRadius,
      border: getComputedStyle(card).borderTopWidth,
      avatar: getComputedStyle(card.querySelector('.better-gw-avatar-bubble')).width,
      fillsChat: Math.abs(card.getBoundingClientRect().width - document.querySelector('#edited-chat .ov-chat-giveaway').getBoundingClientRect().width) < 1,
      animation: getComputedStyle(track).animationName,
      standaloneAnimation: getComputedStyle(document.querySelector('#standalone-giveaway .better-gw-roulette-track')).animationName,
      centered: Math.abs(winner.x + winner.width / 2 - viewport.x - viewport.width / 2) < 2,
      sourceUnchanged: window.sourceAppearanceBefore === JSON.stringify(window.sourceAppearance),
      saved: window.savedGiveawayChat,
    };
  });
  assert.equal(custom.colour, 'rgb(255, 0, 170)');
  assert.equal(custom.size, '32px');
  assert.equal(custom.radius, '35%');
  assert.equal(custom.border, '4px');
  assert.equal(custom.avatar, '48px');
  assert.equal(custom.fillsChat, true, 'Embedded giveaway always fills the chat width');
  assert.equal(custom.animation, 'better-gw-reel-spin');
  assert.equal(custom.animation, custom.standaloneAnimation, 'Embedded roulette matches the standalone animation');
  assert.equal(custom.centered, true, 'Roll lands on the selected winner');
  assert.equal(custom.sourceUnchanged, true);
  assert.equal(custom.saved.giveawayAppearance.participants, undefined, 'Appearance controls never store live entrants');
  assert.equal(custom.saved.giveawayAppearance.keyword, undefined, 'Appearance controls never replace the live keyword');
  assert.equal(custom.saved.giveawayHeight, 310);
  if (process.env.CHAT_GIVEAWAY_SCREENSHOT) await (await page.$('#edited-chat')).screenshot({ path: process.env.CHAT_GIVEAWAY_SCREENSHOT });
  await page.evaluate(() => window.mountChat({ style: 'community_chat', sample: true, width: 480, height: 900 }));
  await new Promise(resolve => setTimeout(resolve, 900));
  if (process.env.CHAT_INTEGRATIONS_SCREENSHOT) await (await page.$('#host')).screenshot({ path: process.env.CHAT_INTEGRATIONS_SCREENSHOT });
  assert.deepEqual(errors, []);
  console.log(`Combined chat verified across ${styles.length} styles: giveaway states, sizing, live entry collection, chat-only source, previews, moderator commands, legacy and published OBS tokens.`);
} finally {
  await browser?.close();
  await server.close();
}
