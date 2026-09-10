import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/__broadcast-chat-test') {
      await request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#c5c6c8"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    } else if (url.hostname === 'static-cdn.jtvnw.net' || url.hostname === 'cdn.betterttv.net') {
      await request.respond({ contentType: 'image/webp', body: readFileSync(new URL('../public/player.webp', import.meta.url)) });
    } else if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) {
      await request.continue();
    } else if (['data:', 'blob:'].includes(url.protocol)) await request.continue();
    else await request.abort();
  });
  await page.setViewport({ width: 1600, height: 1100 });
  await page.goto(`${baseUrl}/__broadcast-chat-test`, { waitUntil: 'networkidle0' });
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  await page.evaluate(async version => {
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { default: ChatWidget } = await import('/src/components/OverlayCenter/widgets/chat/ChatWidget.jsx');
    const { switchChatStyle } = await import('/src/components/OverlayCenter/widgets/chat/chatStyles.js');
    const { ensureBetterWidgetConfig, BetterWidgetControls } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    const { createBetterInstance, normalizeBetterInstance, renderBetterWidgetInstance } = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const { getWidgetStyleElements } = await import('/src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js');
    const { setScopedAppearanceConfigValue } = await import('/src/components/OverlayCenter/appearance/v2/appearanceRouting.js');
    const { default: ChatConfig } = await import('/src/components/OverlayCenter/widgets/chat/ChatConfig.jsx');
    const { EDITOR_WIDGET_METADATA } = await import('/src/components/OverlayCenter/editor/editorWidgetMetadata.js');
    const scopeUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith('/EditorControlScope.jsx'))?.name;
    const { EditorControlContext } = await import(scopeUrl);
    await import('/src/components/OverlayCenter/OverlayRenderer.css');
    await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
    const root = ReactDOM.createRoot(document.getElementById('root'));
    const fixtures = [
      { username: 'ChannelHost', isBroadcaster: true, message: 'Welcome in, everyone!' },
      { username: 'Moderator', isMod: true, message: 'Enjoy the stream. Be kind to each other.' },
      { username: 'CommunityVIP', isVip: true, message: 'That was close!' },
      { username: 'LoyalSubscriber', isSub: true, type: 'sub', message: 'Back for another month!' },
      { username: 'GiftGiver', type: 'gift', giftCount: 5, message: 'Gifted 5 subscriptions to chat!' },
      { username: 'RaidLeader', isRaid: true, raidViewers: 50, message: 'is raiding with 50 viewers!' },
      { username: 'ViewerWithAnExtremelyLongDisplayName', message: 'Long links wrap: https://example.com/averylongunbrokentokenandmoretext' },
      { username: 'StreamFan', message: 'Kappa great stream!', twitchEmotes: [{ id: '25', indices: [[0, 4]] }] },
    ].map((message, index) => ({ ...message, id: `chat-${index}`, platform: message.twitchEmotes ? 'twitch' : ['twitch', 'youtube', 'kick'][index % 3], avatarUrl: index % 2 ? '/player.webp' : '/streamer.webp' }));
    window.chatTest = {
      fixtures, switchChatStyle, ensureBetterWidgetConfig, getWidgetStyleElements,
      scoped(config, elementId, propertyId, value) {
        return setScopedAppearanceConfigValue(config, { widgetType: 'chat', widgetVariant: config.chatStyle, elementId, propertyId }, value);
      },
      mount(cases) {
        this.cases = cases;
        root.render(React.createElement('main', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12, padding: 12 } }, cases.map((item, index) => {
          const config = ensureBetterWidgetConfig('chat', {
            chatStyle: 'broadcast_chat', live: true, animation: 'none', stagger: 0, maxMessages: 12,
            showHeaderName: true, showEmptyState: true,
            streamerName: 'Community Live', twitchChannel: '', twitchEnabled: false, youtubeEnabled: false, kickEnabled: false,
            __appearancePreviewMessages: item.messages || fixtures,
            ...item.config,
          });
          const update = next => { window.chatTest.lastConfig = next; this.mount(cases.map((entry, i) => i === index ? { ...entry, config: next } : entry)); };
          const instance = normalizeBetterInstance(JSON.parse(JSON.stringify(createBetterInstance('chat', { width: item.width, height: item.height, config }))));
          window.chatTest.instance = instance;
          const widget = item.runtime ? renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, mode: 'live', runtime: item.runtime, liveWidgets: [] }) : React.createElement(ChatWidget, { config });
          return React.createElement(React.Fragment, { key: index },
            React.createElement('div', { 'data-case': index, style: { width: item.width, height: item.height, flexShrink: 0 } }, widget),
            item.controls ? React.createElement('aside', { style: { width: 320 } },
              item.controls === 'legacy' ? React.createElement(ChatConfig, { config, onChange: update }) :
                React.createElement(EditorControlContext.Provider, { value: { mode: item.controls, tab: '__all', simpleSections: EDITOR_WIDGET_METADATA.chat.simpleSections, sections: { 'Chat Style': true } } },
                  React.createElement(BetterWidgetControls, { type: 'chat', config, onChange: update }))) : null);
        })));
      },
    };
  }, browserHash);
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  const mount = async cases => {
    await page.evaluate(cases => window.chatTest.mount(cases), cases);
    await settle();
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode().catch(() => {}))));
    await settle();
  };
  const geometry = async label => {
    const failures = await page.evaluate(() => [...document.querySelectorAll('[data-case]')].flatMap(host => {
      const errors = [], panel = host.querySelector('.ov-chat-widget');
      const contains = (a, b) => b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1;
      if (!panel || !contains(host.getBoundingClientRect(), panel.getBoundingClientRect())) return ['Panel outside widget'];
      const rows = [...panel.querySelectorAll('.broadcast-chat-row[aria-hidden="false"]')];
      if (!rows.length) errors.push('No visible messages');
      for (const row of rows) {
        if (!contains(panel.querySelector('.ov-chat-messages').getBoundingClientRect(), row.getBoundingClientRect())) errors.push(`Clipped row ${row.textContent}`);
        if (row.scrollWidth > row.clientWidth + 1) errors.push(`Horizontal message overflow: ${row.textContent} (${row.scrollWidth}/${row.clientWidth})`);
        for (const element of row.querySelectorAll('[data-appearance-part="avatar"], [data-appearance-part="username"], [data-appearance-part="badge"]')) {
          if (!contains(row.getBoundingClientRect(), element.getBoundingClientRect())) errors.push(`Clipped ${element.dataset.appearancePart}`);
        }
      }
      const header = panel.querySelector('[data-appearance-part="header"]');
      if (header && header.scrollWidth > header.clientWidth + 1) errors.push('Header overflow');
      return errors.map(error => `${host.dataset.case}: ${error}`);
    }));
    assert.deepEqual(failures, [], label);
  };

  const persistence = await page.evaluate(() => {
    const t = window.chatTest;
    const original = t.scoped(t.ensureBetterWidgetConfig('chat', { text: '#ffddee', twitchChannel: 'preserve_channel', maxMessages: 22, autoFade: true, shoutoutInChat: true }), 'messageText', 'fontSize', 18);
    const broadcast = t.switchChatStyle(original, 'broadcast_chat');
    const custom = t.scoped({ ...broadcast, text: '#ffffff' }, 'messageText', 'fontSize', 17);
    const back = t.switchChatStyle(custom, 'better_chat');
    const restored = t.ensureBetterWidgetConfig('chat', JSON.parse(JSON.stringify(t.switchChatStyle(back, 'broadcast_chat'))));
    return { original, broadcast, back, restored, elements: t.getWidgetStyleElements('chat', 'broadcast_chat').map(e => e.id) };
  });
  assert.equal(persistence.broadcast.text, '#f4f4f5');
  assert.equal(persistence.broadcast.__appearanceExplicitSubElements, undefined);
  assert.equal(persistence.back.text, persistence.original.text);
  assert.deepEqual(persistence.back.__appearanceExplicitSubElements, persistence.original.__appearanceExplicitSubElements);
  assert.equal(persistence.restored.chatStyle, 'broadcast_chat');
  assert.equal(persistence.restored.__appearanceExplicitSubElements.messageText.fontSize, 17);
  for (const key of ['twitchChannel', 'maxMessages', 'autoFade', 'shoutoutInChat']) assert.equal(persistence.restored[key], persistence.original[key]);
  assert(persistence.elements.includes('emptyState') && persistence.elements.includes('avatar'));
  assert(!persistence.elements.includes('platformLegend'));

  const layouts = [[218, 457], [360, 720], [720, 220], [150, 150], [420, 360], [900, 900]];
  for (const flow of ['bottom-to-top', 'top-to-bottom']) {
    await mount(layouts.map(([width, height]) => ({ width, height, config: { flow, entry: flow === 'top-to-bottom' ? 'top' : 'bottom' } })));
    await geometry(flow);
  }
  await mount([{ width: 360, height: 880 }]);
  assert.equal(await page.$$eval('.broadcast-chat-row', rows => rows.length), 8);
  assert.equal(await page.$$eval('[data-appearance-part="badge"]', rows => rows.length), 4);
  assert.equal(await page.$eval('.ov-chat-twitch-emote', image => image.complete && image.naturalWidth > 0), true);
  if (process.env.TEST_SCREENSHOT_PATH) await (await page.$('[data-case]')).screenshot({ path: process.env.TEST_SCREENSHOT_PATH });
  await page.setViewport({ width: 390, height: 844 });
  await mount([{ width: 366, height: 820, config: { fontSize: 20, usernameSize: 20, streamerName: 'A very long streamer name', showViewerCount: true, viewerCount: 99999 } }]);
  await geometry('mobile with large text');
  await page.setViewport({ width: 1600, height: 1100 });
  for (const runtime of ['editor', 'obs']) {
    await mount([{ width: 360, height: 720, runtime }]);
    assert.equal(await page.$eval('.ov-chat-widget', el => el.dataset.betterWidgetVariant), 'broadcast_chat');
    await geometry(runtime);
  }
  for (const controls of ['simple', 'advanced']) {
    await mount([{ width: 360, height: 720, controls, config: { chatStyle: 'better_chat' } }]);
    const selects = await page.$$('aside select');
    let selector;
    for (const select of selects) if (await select.evaluate(el => [...el.options].some(option => option.value === 'broadcast_chat'))) selector = select;
    assert(selector, `${controls}: style selector missing`);
    await selector.select('broadcast_chat');
    await settle();
    assert.equal(await page.evaluate(() => window.chatTest.lastConfig.chatStyle), 'broadcast_chat');
    assert(await page.$('.ov-chat-widget--broadcast_chat'));
  }
  await mount([{ width: 360, height: 720, controls: 'legacy', config: { chatStyle: 'better_chat' } }]);
  await page.evaluate(() => [...document.querySelectorAll('aside button')].find(el => el.textContent.trim() === 'Broadcast').click());
  await settle();
  assert(await page.$('.ov-chat-widget--broadcast_chat'));
  await page.evaluate(() => [...document.querySelectorAll('aside button')].find(el => el.textContent.includes('Presets')).click());
  await page.type('input[placeholder="Preset name..."]', 'Broadcast preset');
  await page.click('.nb-preset-save-btn');
  await settle();
  const savedPreset = await page.evaluate(() => window.chatTest.lastConfig.chatPresets[0]);
  assert.equal(savedPreset.values.text, '#f4f4f5');
  await page.evaluate(() => {
    const item = window.chatTest.cases[0];
    window.chatTest.mount([{ ...item, config: window.chatTest.switchChatStyle(item.config, 'better_chat') }]);
  });
  await settle();
  await page.click('.nb-preset-pill__load');
  await settle();
  assert.equal(await page.evaluate(() => window.chatTest.lastConfig.chatStyle), 'broadcast_chat');
  assert.equal(await page.evaluate(() => window.chatTest.lastConfig.text), '#f4f4f5');
  const bttvCase = { width: 218, height: 457, messages: [{ id: 'bttv', platform: 'twitch', username: 'Viewer', message: 'PogChamp hello' }], config: { __appearancePreviewBttvEmotes: [{ id: 'fixture-emote', code: 'PogChamp' }] } };
  await mount([bttvCase]);
  assert.equal(await page.$eval('.ov-chat-bttv-emote', image => image.complete && image.naturalWidth > 0), true);
  await mount([{ ...bttvCase, config: { ...bttvCase.config, bttvEnabled: false } }]);
  assert.equal(await page.$('.ov-chat-bttv-emote'), null);
  assert.equal(await page.$eval('[data-appearance-part="messageText"]', el => el.textContent), 'PogChamp hello');
  await mount([{ width: 218, height: 457, config: { showHeader: false, showRoleBadges: false, celebrations: { raid: false, sub: false, gift: false }, roleEffects: { enabled: false } } }]);
  assert.equal(await page.$$eval('[data-appearance-part="header"], [data-appearance-part="badge"]', rows => rows.length), 0);
  await geometry('disabled display options');
  await mount([{ width: 218, height: 457, messages: [], config: { emptyMessage: 'Waiting for chat' } }]);
  assert.equal(await page.$eval('[data-appearance-part="emptyState"]', el => el.textContent), 'Waiting for chat');
  await mount([{ width: 218, height: 457, messages: [], config: { showEmptyState: false } }]);
  assert.equal(await page.$('[data-appearance-part="emptyState"]'), null);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await mount([{ width: 360, height: 720, config: { animation: 'slide-up' } }]);
  assert.equal(await page.$eval('.broadcast-chat-row', el => getComputedStyle(el).animationName), 'none');
  const scoped = await page.evaluate(() => {
    let c = { chatStyle: 'broadcast_chat' };
    for (const [element, property, value] of [
      ['message', 'padding', 12], ['messageText', 'textColor', '#ffdd99'],
      ['avatar', 'width', 32], ['header', 'background', '#252527'],
    ]) c = window.chatTest.scoped(c, element, property, value);
    return JSON.parse(JSON.stringify(c));
  });
  await mount([{ width: 360, height: 720, config: scoped }, { width: 360, height: 720 }]);
  assert.equal(await page.$eval('[data-case="0"] [data-appearance-part="messageText"]', el => getComputedStyle(el).color), 'rgb(255, 221, 153)');
  assert.equal(await page.$eval('[data-case="1"] [data-appearance-part="messageText"]', el => getComputedStyle(el).color), 'rgb(244, 244, 245)');
  assert.equal(await page.$eval('[data-case="0"] [data-appearance-part="message"]', el => getComputedStyle(el).display), 'grid');
  assert.equal(await page.$eval('[data-case="0"] [data-appearance-part="avatar"]', el => getComputedStyle(el).width), '32px');
  await geometry('scoped appearance without layout or instance leakage');
  await mount([{ width: 150, height: 150, messages: [{ id: 'long', username: 'Viewer', message: 'A long message with no missing text. '.repeat(40) }], config: { fontSize: 20 } }]);
  await geometry('oversized message stays inside short frame');
  assert.equal(await page.$eval('[data-appearance-part="messageText"]', el => el.textContent), 'A long message with no missing text. '.repeat(40));

  // Drive the real IRC parser locally; no account connection or outbound chat writes.
  await page.evaluate(() => {
    const NativeWebSocket = window.WebSocket;
    window.testSockets = [];
    window.WebSocket = class {
      constructor(url, protocols) {
        if (!url.includes('irc-ws.chat.twitch.tv')) return new NativeWebSocket(url, protocols);
        this.readyState = 1;
        window.testSockets.push(this);
        setTimeout(() => this.onopen?.(), 0);
      }
      send() {}
      close() { this.readyState = 3; }
    };
    window.sendIrc = (text) => window.testSockets.filter(socket => socket.readyState === 1).forEach(socket => socket.onmessage({ data: text }));
  });
  const liveCase = { width: 360, height: 720, messages: [], config: { twitchChannel: 'chat_fixture', twitchEnabled: true, maxMessages: 3, autoFade: false } };
  await mount([liveCase]);
  await page.waitForFunction(() => window.testSockets.length > 0);
  const irc = (id, user, message, tags = '') => `@id=${id};display-name=${user};${tags} :${user}!${user}@${user}.tmi.twitch.tv PRIVMSG #chat_fixture :${message}\r\n`;
  await page.evaluate(text => window.sendIrc(text), irc('one', 'Viewer', 'Persistent message'));
  await settle();
  assert.equal(await page.$eval('[data-appearance-part="messageText"]', el => el.textContent), 'Persistent message');
  const connectionCount = await page.evaluate(() => window.testSockets.length);
  await page.evaluate(() => {
    const item = window.chatTest.cases[0];
    window.chatTest.mount([{ ...item, config: window.chatTest.switchChatStyle(item.config, 'better_chat') }]);
  });
  await settle();
  await page.evaluate(() => {
    const item = window.chatTest.cases[0];
    window.chatTest.mount([{ ...item, config: window.chatTest.switchChatStyle(item.config, 'broadcast_chat') }]);
  });
  await settle();
  assert.equal(await page.evaluate(() => window.testSockets.length), connectionCount, 'A style change must not reconnect chat');
  assert.equal(await page.$eval('[data-appearance-part="messageText"]', el => el.textContent), 'Persistent message');
  await page.evaluate(text => window.sendIrc(text), irc('bot', 'Nightbot', 'Filtered bot') + irc('two', 'Moderator', 'Kappa', 'mod=1;emotes=25:0-4;'));
  await settle();
  assert.equal(await page.$$eval('.broadcast-chat-row', rows => rows.length), 2);
  assert.equal(await page.$eval('[data-appearance-part="badge"]', el => el.textContent), 'MOD');
  assert(await page.$('.ov-chat-twitch-emote'));
  await page.evaluate(text => window.sendIrc(text), irc('three', 'Viewer3', 'Message three') + irc('four', 'Viewer4', 'Message four'));
  await settle();
  assert.equal(await page.$$eval('.broadcast-chat-row', rows => rows.length), 3);
  assert.equal(await page.$eval('.ov-chat-messages', el => el.textContent.includes('Persistent message')), false);
  await mount([{ ...liveCase, config: { ...liveCase.config, autoFade: true, fadeAfter: 2 } }]);
  await page.waitForFunction(() => document.querySelectorAll('.broadcast-chat-row').length === 0, { timeout: 8000 });
  await page.evaluate(text => window.sendIrc(text), '@id=raid;msg-id=raid;msg-param-displayName=Raider;msg-param-viewerCount=50 :tmi.twitch.tv USERNOTICE #chat_fixture\r\n');
  await settle();
  assert.equal(await page.$eval('[data-appearance-part="messageText"]', el => el.textContent), 'is raiding with 50 viewers!');
  await geometry('IRC raid');
  assert.deepEqual(errors, []);
  console.log('Broadcast chat: responsive layouts, editor/OBS parity, controls, isolated persistence, IRC, emotes, roles, raids, filtering, message limits, auto-fade, empty states and reduced motion passed.');
} finally {
  await browser.close();
}
