import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { WIDGET_COLOUR_THEMES, getWidgetColourTheme, getHuntColourTheme } from '../src/components/OverlayCenter/widgets/shared/colourThemePalettes.js';

const newThemes = ['gold', 'violet', 'rose', 'arctic', 'lime', 'luxe', 'gladiator', 'old_rome'];
assert.deepEqual(WIDGET_COLOUR_THEMES.map(theme => theme.key), ['neon', 'metallic', 'sunset', 'cyberpunk', 'crimson', 'emerald', ...newThemes]);
for (const [key, surface] of [['gradient', '#131a4a'], ['matte', '#181d24']]) {
  assert.equal(getWidgetColourTheme(key).surface, surface, `${key}: retain saved palette`);
  assert.equal(getHuntColourTheme(`theme_${key}`).panelMid, surface, `${key}: retain saved Hunt appearance`);
}
const luminance = color => color.slice(1).match(/../g).map(hex => {
  const channel = parseInt(hex, 16) / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
for (const theme of WIDGET_COLOUR_THEMES.filter(theme => [...newThemes, 'sunset', 'cyberpunk'].includes(theme.key))) {
  for (const token of ['text', 'muted', 'accent']) {
    for (const surface of ['background', 'surface', 'raised']) {
      const values = [luminance(theme[token]), luminance(theme[surface])].sort((a, b) => b - a);
      assert((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${theme.key}: ${token} contrast on ${surface}`);
    }
  }
}

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/__widget-colour-themes') {
      await request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#242528;color:#fff"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    } else if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) await request.continue();
    else if (request.resourceType() === 'image') await request.respond({ contentType: 'image/webp', body: readFileSync(new URL('../public/player.webp', import.meta.url)) });
    else if (['data:', 'blob:'].includes(url.protocol)) await request.continue();
    else await request.abort();
  });
  await page.setViewport({ width: 1600, height: 1100 });
  await page.goto(`${baseUrl}/__widget-colour-themes`, { waitUntil: 'networkidle0' });
  const { browserHash } = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url), 'utf8'));
  await page.evaluate(async version => {
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const { BetterWidgetControls, ensureBetterWidgetConfig } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    const registry = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const themes = await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
    const { WIDGET_COLOUR_THEMES } = await import('/src/components/OverlayCenter/widgets/shared/colourThemePalettes.js');
    const { switchChatStyle } = await import('/src/components/OverlayCenter/widgets/chat/chatStyles.js');
    const { resolveBonusHuntSyncedColors } = await import('/src/components/OverlayCenter/widgets/shared/bonusHuntColorSync.js');
    const routing = await import('/src/components/OverlayCenter/appearance/v2/appearanceRouting.js');
    const scopeUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith('/EditorControlScope.jsx'))?.name;
    const { EditorControlContext } = await import(scopeUrl);
    await import('/src/index.css');
    await import('/src/components/OverlayCenter/OverlayRenderer.css');
    await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
    const style = document.createElement('style');
    style.textContent = '[data-preview] *, [data-preview] *::before, [data-preview] *::after { animation:none!important;transition:none!important }';
    document.head.append(style);
    const root = ReactDOM.createRoot(document.getElementById('root'));
    window.themeTest = {
      ...themes, ...registry, routing, switchChatStyle, ensureBetterWidgetConfig, resolveBonusHuntSyncedColors,
      themes: WIDGET_COLOUR_THEMES.map(theme => theme.key),
      types: registry.getBetterWidgetTypes(),
      base(type) {
        const c = registry.resolveBetterWidgetConfig(type, registry.getBetterWidgetDefinition(type).defaultConfig, 'mock');
        return { ...c, twitchChannel: '', twitchEnabled: false, youtubeEnabled: false, kickEnabled: false,
          live: true, showNowPlaying: false, showCrypto: false, showSocials: false, showClock: false,
          bgMode: type === 'background' ? 'texture' : c.bgMode, textureType: type === 'background' ? 'grid' : c.textureType,
          __appearancePreviewMessages: [{ id: 'viewer', username: 'Stream Viewer', message: 'A readable chat message', avatarUrl: '/player.webp' }],
          animation: 'none', animations: false, __previewAlert: { raider_username: 'Streamer', raider_avatar_url: '/player.webp' },
          mediaText: '/player.webp|image|Live media', imageUrl: type === 'background' ? '/player.webp' : c.imageUrl,
        };
      },
      mount(type, config, { runtime = 'editor', controls = 'simple', width = 320, search = '' } = {}) {
        const definition = registry.getBetterWidgetDefinition(type);
        const c = config || this.base(type);
        this.current = { type, config: c, runtime, controls, width, search };
        const instance = registry.normalizeBetterInstance(JSON.parse(JSON.stringify(registry.createBetterInstance(type, { config: c }))));
        this.instance = instance;
        root.render(React.createElement('main', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16, padding: 12 } },
          React.createElement('aside', { style: { width, flexShrink: 0 } },
            React.createElement(EditorControlContext.Provider, { value: { mode: controls, tab: '__all', search,
              simpleSections: definition.editor.simpleSections, sections: { 'Colour Theme': true }, onSection() {} } },
              React.createElement(BetterWidgetControls, { type, config: c, widget: { ...instance, config: c }, onChange: next => {
                window.themeTest.lastConfig = next;
                this.mount(type, next, { runtime, controls, width, search });
              } }))),
          React.createElement('div', { 'data-preview': type, style: { width: instance.width, height: instance.height, flexShrink: 0 } },
            registry.renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, mode: 'live', runtime }))));
      },
      appearance() {
        const host = document.querySelector('[data-preview]');
        return [...host.querySelectorAll('*')].filter(el => el.getBoundingClientRect().width > 0).map(el => {
          const css = getComputedStyle(el);
          return [el.tagName, el.className?.baseVal ?? el.className, css.backgroundColor, css.backgroundImage, css.borderColor, css.color];
        });
      },
    };
  }, browserHash);
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  const mount = async (type, config, options) => {
    await page.evaluate(({ type, config, options }) => window.themeTest.mount(type, config, options), { type, config, options });
    await settle();
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
    await settle();
  };
  const types = await page.evaluate(() => window.themeTest.types);
  const themes = await page.evaluate(() => window.themeTest.themes);
  assert.equal(types.length, 12);
  const unit = await page.evaluate(() => {
    const t = window.themeTest, failures = [];
    const freeze = obj => { if (obj && typeof obj === 'object') { Object.freeze(obj); Object.values(obj).forEach(freeze); } return obj; };
    for (const type of t.types) {
      const original = freeze(t.base(type));
      const before = JSON.stringify(original);
      for (const theme of [...t.themes, 'gradient', 'matte']) {
        const patch = t.buildWidgetColourThemePatch(type, original, theme);
        if (!patch || !Object.keys(patch).length) failures.push(`${type}: missing palette mapping`);
        const applied = t.applyWidgetColourTheme(type, original, theme);
        if (JSON.stringify(original) !== before) failures.push(`${type}: mutated source`);
        for (const key of Object.keys(original)) if (!(key in patch) && key !== 'colourTheme') {
          if (JSON.stringify(original[key]) !== JSON.stringify(applied[key])) failures.push(`${type}: changed ${key}`);
        }
        const reloaded = t.normalizeBetterInstance(JSON.parse(JSON.stringify(t.createBetterInstance(type, { config: applied }))));
        if (t.getSelectedWidgetColourTheme(type, reloaded.config) !== theme) failures.push(`${type}: selection did not survive reload`);
      }
    }
    let chat = t.ensureBetterWidgetConfig('chat', { ...t.base('chat'), chatStyle: 'broadcast_chat' });
    chat = t.routing.setScopedAppearanceConfigValue(chat, { widgetType: 'chat', widgetVariant: 'broadcast_chat', elementId: 'messageText', propertyId: 'textColor' }, '#abcdef');
    chat = t.routing.setScopedAppearanceConfigValue(chat, { widgetType: 'chat', widgetVariant: 'broadcast_chat', elementId: 'messageText', propertyId: 'fontSize' }, 19);
    const changed = t.applyWidgetColourTheme('chat', chat, 'emerald');
    if (changed.__appearanceExplicitSubElements.messageText.textColor !== '#edfff7' || changed.__appearanceExplicitSubElements.messageText.fontSize !== 19) failures.push('Element colour update affected typography');
    if (t.routing.getScopedAppearanceConfigValue(changed, { widgetType: 'chat', widgetVariant: 'broadcast_chat', elementId: 'messageText', propertyId: 'textColor' }) !== '#edfff7') failures.push('Scoped colour did not update');
    let switched = t.switchChatStyle(changed, 'better_chat');
    switched = t.applyWidgetColourTheme('chat', switched, 'crimson');
    switched = t.switchChatStyle(switched, 'broadcast_chat');
    if (t.getSelectedWidgetColourTheme('chat', switched) !== 'emerald') failures.push('Chat styles leaked colour themes');
    if (t.getSelectedWidgetColourTheme('chat', { ...changed, text: '#fedcba' }) !== null) failures.push('Manual colours show a stale selected palette');
    if (t.getSelectedWidgetColourTheme('bets', { betTheme: 'crimson' }) !== 'crimson') failures.push('Legacy Bets theme selection');
    if (t.getSelectedWidgetColourTheme('bets', {}) !== 'neon') failures.push('Default Bets theme selection');
    const hunt = t.applyWidgetColourTheme('bonus_hunt', t.base('bonus_hunt'), 'emerald');
    for (const type of ['bets', 'chat', 'navbar']) {
      const linked = t.applyWidgetColourTheme(type, { ...t.base(type), bonusHuntColorSync: { enabled: true } }, 'crimson');
      if (!linked.bonusHuntColorSync.enabled) failures.push(`${type}: theme disabled linked colours`);
      const colors = t.resolveBonusHuntSyncedColors(linked, [{ widget_type: 'bonus_hunt', config: hunt }]);
      if (colors.primaryColor !== hunt.headerAccent || colors.secondaryColor !== hunt.headerColor) failures.push(`${type}: linked colours no longer follow the Hunt theme`);
    }
    const bingo = t.base('slot_bingo');
    if (bingo.squares.length !== 25 || bingo.squares[12].label !== 'FREE' || !bingo.squares[12].completed) failures.push('Slot Bingo default board');
    return failures;
  });
  assert.deepEqual(unit, []);
  for (const type of types) {
    const appearances = new Set();
    for (const theme of themes) {
      await mount(type);
      assert.equal(await page.$$eval('.bp-theme-grid button', buttons => buttons.length), themes.length, `${type}: all themes`);
      await page.evaluate(theme => [...document.querySelectorAll('.bp-theme-grid button')].find(button => button.dataset.colourThemeKey === theme).click(), theme);
      await settle();
      const result = await page.evaluate(() => ({ config: window.themeTest.lastConfig, style: window.themeTest.appearance(), selected: document.querySelector('.bp-theme-grid [aria-pressed="true"]')?.dataset.colourThemeKey }));
      assert.equal(result.selected, theme, `${type}: selected theme`);
      assert(result.style.length > 0, `${type}: blank preview`);
      if (type === 'bets') assert.equal(await page.$eval('.better-bets-stage', stage => stage.dataset.theme), theme, `${theme}: Bets must not fall back to Neon`);
      appearances.add(JSON.stringify(result.style));
      await mount(type, result.config);
      assert.deepEqual(await page.evaluate(() => window.themeTest.appearance()), result.style, `${type}/${theme}: reload matches preview`);
      if (!['raid_shoutout', 'connect_four'].includes(type)) {
        await mount(type, result.config, { runtime: 'obs' });
        assert.deepEqual(await page.evaluate(() => window.themeTest.appearance()), result.style, `${type}/${theme}: OBS matches editor`);
      }
    }
    assert.equal(appearances.size, themes.length, `${type}: each theme visibly changes the renderer`);
    await mount(type, undefined, { controls: 'advanced', width: 220 });
    assert.equal(await page.$$eval('.bp-theme-grid button', buttons => buttons.length), themes.length, `${type}: advanced controls`);
    assert.equal(await page.$eval('.bp-theme-grid', grid => grid.scrollWidth <= grid.clientWidth + 1 && [...grid.querySelectorAll('button')].every(button => button.scrollWidth <= button.clientWidth + 1)), true, `${type}: narrow controls fit`);
    console.log(`${type}: all ${themes.length} themes, reload and available runtime rendering passed`);
  }
  for (const theme of ['gradient', 'matte']) {
    const legacy = await page.evaluate(theme => window.themeTest.applyWidgetColourTheme('bets', window.themeTest.base('bets'), theme), theme);
    await mount('bets', legacy, { runtime: 'obs' });
    assert.equal(await page.$eval('.better-bets-stage', stage => stage.dataset.theme), theme, `${theme}: legacy Bets rendering`);
    assert.equal(await page.$('.bp-theme-grid [aria-pressed="true"]'), null, `${theme}: retired palette must not select a replacement`);
  }
  await mount('chat', { ...(await page.evaluate(() => window.themeTest.base('chat'))), chatStyle: 'broadcast_chat' }, { search: 'emerald' });
  assert.equal(await page.$$eval('.bp-theme-grid button', buttons => buttons.length), themes.length, 'Theme search');
  if (process.env.TEST_SCREENSHOT_PATH) {
    await mount('bets', await page.evaluate(() => window.themeTest.applyWidgetColourTheme('bets', window.themeTest.base('bets'), 'cyberpunk')));
    await page.screenshot({ path: process.env.TEST_SCREENSHOT_PATH });
  }
  assert.deepEqual(errors, []);
  console.log(`All widget colour themes passed: ${types.length * themes.length} palette combinations, readable new palettes, isolated configuration, responsive controls, reload and editor/OBS parity.`);
} finally {
  await browser.close();
}
