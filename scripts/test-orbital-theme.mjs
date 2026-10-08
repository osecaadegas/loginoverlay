import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { normalizeOrbitalSettings, orbitalParticleBudgets } from '../src/effects/ThemeEffects/orbital/orbitalTheme.js';
import { normalizeThemeEffectsConfig, patchThemeEffectsConfig } from '../src/effects/ThemeEffects/themeEffectsConfig.js';
import { getThemeEffectDefinition } from '../src/effects/ThemeEffects/themes/themeDefinitions.js';
import { orbitalStructure } from '../src/effects/ThemeEffects/orbital/orbitalStructureGeometry.js';
import { applyOrbitalComposition } from '../src/components/OverlayCenter/editor/orbitalComposition.js';

const compositionInput = { instances: ['background', 'navbar', 'bonus_hunt', 'current_slot', 'giveaway'].map((widgetType, index) => ({ instanceId: String(index), widgetType, x: 30, y: 40, width: 300, height: 200, config: { colourTheme: 'orbital', bonuses: [{ payout: 240 }], subElements: { slotTitle: { color: '#fff' } } } })) };
const originalComposition = structuredClone(compositionInput);
const composed = applyOrbitalComposition(compositionInput);
assert.deepEqual(compositionInput, originalComposition, 'composition is undoable without mutating history');
assert.deepEqual(applyOrbitalComposition(composed), composed, 'reapplying composition never compounds scale');
assert.deepEqual(composed.instances[0], compositionInput.instances[0], 'background is untouched');
assert.deepEqual(composed.instances[2].config.bonuses, compositionInput.instances[2].config.bonuses, 'slot data survives composition');
assert.deepEqual(composed.instances[3].config.subElements, compositionInput.instances[3].config.subElements, 'custom appearance overrides survive composition');
for (const patch of [{ locked: true }, { visible: false }, { config: { colourTheme: 'arctic' } }]) {
  const protectedInstance = { ...compositionInput.instances[1], ...patch };
  assert.deepEqual(applyOrbitalComposition({ instances: [protectedInstance] }).instances[0], protectedInstance);
}

const structuralTargets = [
  ['navbar', 14, 10, 1892, 65], ['bonus_hunt', 14, 88, 340, 975],
  ['rtp_stats', 370, 746, 1115, 68], ['slideshow_frame', 1504, 88, 402, 260],
  ['giveaway', 1504, 366, 402, 230], ['chat', 1504, 614, 402, 449],
  ['background', 0, 0, 1920, 1080],
].map(([widgetType, x, y, width, height]) => ({ id: widgetType, widgetType, x, y, width, height, opacity: 1, theme: { family: 'orbital' }, effects: { orbital: { environment: 'earth_orbit' } } }));
assert.equal(orbitalStructure(structuralTargets, 1920, 1080).length, 2, 'aligned scene has connected comms and window frames');
assert.equal(orbitalStructure(structuralTargets.map(t => ({ ...t, theme: { family: 'ice' } })), 1920, 1080).length, 0, 'no structure on other themes');
assert(!orbitalStructure(structuralTargets.map(t => t.widgetType === 'giveaway' ? { ...t, x: 900 } : t), 1920, 1080).some(f => f.id === 'comms-column'), 'detached widgets are never enclosed in a shared column');
assert(!orbitalStructure([...structuralTargets, { ...structuralTargets[1], id: 'obstruction', widgetType: 'bets', x: 355, width: 90 }], 1920, 1080).some(f => f.id === 'gameplay-window'), 'rails never cross another widget');
assert(!orbitalStructure(structuralTargets.map(t => t.widgetType === 'background' ? { ...t, effects: { orbital: { environment: 'off' } } } : t), 1920, 1080).some(f => f.id === 'gameplay-window'), 'transparent background has no gameplay frame');

assert.equal(getThemeEffectDefinition('space').id, 'orbital');
assert.equal(normalizeOrbitalSettings({ environment: 'invalid', intensity: 4, hudGlow: -2 }).environment, 'earth_orbit');
assert.equal(normalizeOrbitalSettings({ intensity: 4 }).intensity, 1);
assert.equal(normalizeOrbitalSettings({ hudGlow: -2 }).hudGlow, 0);
assert.equal(normalizeOrbitalSettings({ intensity: null }).intensity, .7);
const preserved = patchThemeEffectsConfig('orbital', { orbital: { stars: false, earthVisibility: .3 }, ice: { frost: .2 } }, { orbital: { environment: 'off' } });
assert.equal(preserved.orbital.stars, false);
assert.equal(preserved.orbital.earthVisibility, .3);
assert.equal(preserved.ice.frost, .2);
for (const [quality, limit] of [['low', 40], ['balanced', 90], ['ultra', 150]]) {
  const targets = Array.from({ length: 16 }, (_, i) => ({ id: String(i), widgetType: i < 2 ? 'background' : 'chat', theme: { family: 'orbital' }, effects: normalizeThemeEffectsConfig('orbital', { quality }) }));
  assert([...orbitalParticleBudgets(targets).values()].reduce((total, value) => total + value.count, 0) <= limit);
  assert([...orbitalParticleBudgets(targets, { hardwareConcurrency: 2 }).values()].every(value => value.quality === 'low'));
}

const server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0, hmr: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const out = '.codex-dev/orbital-verification';
mkdirSync(out, { recursive: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('[ThemeEffects]')) errors.push(message.text()); });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/__orbital') return request.respond({ contentType: 'text/html', body: `<html><head><style>html,body{margin:0;background:transparent} .theme-effects-layer__debug,.theme-effects-layer__target-debug{display:none!important}</style></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>` });
    if (url.origin === base && !url.pathname.startsWith('/api/')) return request.continue();
    if (['data:', 'blob:'].includes(url.protocol)) return request.continue();
    if (request.resourceType() === 'image') return request.respond({ contentType: 'image/webp', body: readFileSync('public/player.webp') });
    return request.abort();
  });
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${base}/__orbital?fxDebug=1`, { waitUntil: 'networkidle0' });
  const { browserHash } = JSON.parse(readFileSync('node_modules/.vite/deps/_metadata.json', 'utf8'));
  await page.evaluate(async version => {
    const React = (await import(`/node_modules/.vite/deps/react.js?v=${version}`)).default;
    const ReactDOM = (await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`)).default;
    const registry = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const themes = await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
    const { applyOrbitalComposition } = await import('/src/components/OverlayCenter/editor/orbitalComposition.js');
    const { BetterWidgetControls } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    const { default: FX } = await import('/src/effects/ThemeEffects/ThemeEffectsLayer.jsx');
    const { emitIceEvent } = await import('/src/effects/ThemeEffects/emitIceEvent.js');
    await import('/src/components/OverlayCenter/OverlayRenderer.css');
    await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
    await import('/src/components/OverlayCenter/editor/BetterObsOverlay.css');
    const root = ReactDOM.createRoot(document.getElementById('root'));
    const h = React.createElement;
    window.orbital = {
      ...registry, ...themes, root, types: registry.getBetterWidgetTypes(),
      config(type, extra = {}) {
        const c = registry.resolveBetterWidgetConfig(type, registry.getBetterWidgetDefinition(type).defaultConfig, 'mock');
        return themes.applyWidgetColourTheme(type, { ...c, ...extra, live: true, showCrypto: false, showNowPlaying: false, showSocials: false, twitchEnabled: false, kickEnabled: false, youtubeEnabled: false, bttvEnabled: false, animations: false }, extra.colourTheme || 'orbital');
      },
      scene({ single = '', environment = 'earth_orbit', quality = 'balanced', runtime = 'editor', effects = true, stars = true, animation = true, theme = 'orbital', glow = .45, seed = '' } = {}) {
        const specs = [
          ['background', 0, 0, 1920, 1080, {}],
          ['navbar', 14, 10, 1892, 65, {}],
          ['bonus_hunt', 14, 88, 340, 975, { sessionState: 'opening', drawerMode: 'contain', drawerAlwaysVisible: false, orientation: 'mainstream', carouselMode: 'imagestats', widgetHeight: 975, showRequests: true, bonuses: [
            { id: '1', slotName: 'Le Vampire', provider: 'Hacksaw Gaming', image: '/player.webp', betSize: .5, payout: 150, opened: true },
            { id: '3', slotName: 'Gates of Olympus 1000', provider: 'Pragmatic Play', image: '/player.webp', betSize: .5, payout: 50, opened: true },
            { id: '2', slotName: 'Wanted Dead or a Wild', provider: 'Hacksaw Gaming', image: '/player.webp', betSize: .5, opened: false, isSuperBonus: true },
          ] }],
          ['rtp_stats', 370, 746, 1115, 68, {}],
          ['current_slot', 370, 823, 1115, 240, { slot: { name: 'Le Vampire', provider: 'Hacksaw Gaming', image: '/player.webp', rtp: 96.51, volatility: 'High', max_win_multiplier: 15000 }, bestWin: 150, bestMultiplier: 300 }],
          ['slideshow_frame', 1504, 88, 402, 260, { mediaText: '' }],
          ['giveaway', 1504, 366, 402, 230, {}],
          ['chat', 1504, 614, 402, 449, {}],
          ['bets', 660, 410, 540, 320, { orientation: 'horizontal', layoutMode: 'bars', columns: 2, gameStatus: 'open', options: ['0 - 99x', '100 - 199x', '200 - 299x', '300x+'], bets: { opt_0: 100, opt_1: 50 }, betters: {} }],
          ['tournament', 0, 0, 1000, 600, {}], ['connect_four', 0, 0, 900, 600, {}],
          ['slot_bingo', 0, 0, 600, 600, {}], ['raid_shoutout', 0, 0, 800, 450, {}],
        ];
        const originalWidgets = specs.filter(([type], index) => single ? type === single : index < 9).map(([type, x, y, width, height, extra], index) => registry.createBetterInstance(type, {
          instanceId: `orbital-${type}${seed}`, x: single ? 0 : x, y: single ? 0 : y, width, height, zIndex: index,
          config: this.config(type, { ...extra, colourTheme: theme, themeEffects: { enabled: effects, quality, orbital: { environment, stars, hudGlow: glow, backgroundAnimation: animation } } }),
        }));
        const widgets = single ? originalWidgets : registry.normalizeBetterLayout(applyOrbitalComposition({ instances: originalWidgets })).instances;
        this.widgets = widgets;
        const width = single ? widgets[0].width : 1920, height = single ? widgets[0].height : 1080;
        const scale = single ? Math.min(1, innerWidth / width, innerHeight / height) : innerWidth / 1920;
        this.lastSize = { width, height, scale };
        root.render(h('div', { className: 'orbital-test-canvas', style: { position: 'relative', width, height, transform: `scale(${scale})`, transformOrigin: 'top left' } },
          ...widgets.map(instance => h('div', { key: instance.instanceId, 'data-effect-target-id': instance.instanceId, style: { position: 'absolute', left: instance.x, top: instance.y, width: instance.width, height: instance.height, zIndex: instance.zIndex } }, registry.renderBetterWidgetInstance({ instance, layout: { instances: widgets }, mode: 'live', runtime: runtime === 'editor' ? 'editor' : 'obs' }))),
          h(FX, { instances: widgets, width, height, singleInstanceId: single ? widgets[0].instanceId : '', runtime }),
        ));
      },
      event(kind = 'super') { emitIceEvent(document.querySelector('[data-colour-theme="orbital"][data-widget-type="bonus_hunt"]'), kind); },
      controls(type, config, mode = 'simple') {
        const Control = () => {
          const [c, set] = React.useState(config || this.config(type));
          window.orbital.controlConfig = c;
          return h('div', { style: { width: 420, background: '#0b1420', color: '#fff' } }, h(BetterWidgetControls, { type, config: c, onChange: set }));
        };
        root.render(h(Control, { key: `${type}-${mode}` }));
      },
    };
    window.orbital.scene();
  }, browserHash);
  const wait = async () => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (await page.$('.theme-effects-layer__canvas')) await page.waitForFunction(() => document.querySelector('.theme-effects-layer__debug')?.dataset.ready === 'true');
  };
  await page.waitForSelector('.theme-effects-layer__debug', { visible: false });
  await page.waitForFunction(() => Number(document.querySelector('.theme-effects-layer__debug')?.dataset.frames) > 3);
  assert.equal(await page.$$eval('.theme-effects-layer__canvas', list => list.length), 1);
  await page.waitForSelector('[data-orbital-structure="gameplay-window"]');
  assert.equal(await page.$$eval('[data-orbital-structure="comms-column"]', nodes => nodes.length), 1);
  const compositionSizes = await page.evaluate(() => {
    const size = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { width: r.width, height: r.height, top: r.top, bottom: r.bottom }; };
    return { hunt: size('.better-hunt-panel'), game: size('.cg-widget'), telemetry: size('.rtp-stats-bar'), giveaway: size('.better-giveaway-widget'), header: size('.better-gw-header'), reel: size('.better-gw-reel-zone') };
  });
  assert(compositionSizes.hunt.width >= 1920 * .17 && compositionSizes.hunt.width <= 1920 * .19, 'painted left module occupies 17–19% of the screen');
  assert(compositionSizes.giveaway.width >= 1920 * .17, 'giveaway fills its sidebar instead of shrinking into a floating card');
  assert(compositionSizes.game.height >= 285 && compositionSizes.telemetry.height >= 78, 'bottom modules use their enlarged editor dimensions');
  assert(compositionSizes.header.bottom <= compositionSizes.reel.top + 1, 'giveaway header remains clear of spinning reel');
  assert(await page.$eval('.better-slideshow-frame__inner', el => getComputedStyle(el).maskComposite.includes('exclude')), 'observation housing leaves media aperture transparent');
  await page.screenshot({ path: `${out}/orbital-1920.png` });
  for (const [width, height] of [[2560, 1440], [1366, 768], [1920, 1080]]) {
    await page.setViewport({ width, height });
    await page.evaluate(() => window.orbital.scene());
    await wait();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no horizontal overflow ${width}`);
    const bounds = await page.$$eval('.theme-effects-layer__target-debug', nodes => nodes.map(node => ({ x: parseFloat(node.style.left), y: parseFloat(node.style.top), width: parseFloat(node.style.width), height: parseFloat(node.style.height) })));
    assert(bounds.every(box => box.x >= -1 && box.y >= -1 && box.x + box.width <= 1921 && box.y + box.height <= 1081), `effect bounds ${width}`);
    await page.screenshot({ path: `${out}/orbital-${width}.png` });
  }
  writeFileSync(out+'/dom.json',JSON.stringify(await page.$$eval('[data-colour-theme]',nodes=>nodes.map(root=>({type:root.dataset.widgetType,elements:[...root.querySelectorAll('*')].filter(el=>el.className || el.dataset.widgetElement || el.dataset.appearancePart).map(el=>({tag:el.tagName,class:typeof el.className==='string'?el.className:'',part:el.dataset.widgetElement || el.dataset.appearancePart || el.dataset.betterElement}))}))),null,2));
  const serialized = await page.evaluate(() => {
    const first = window.orbital.widgets;
    const second = window.orbital.normalizeBetterLayout(JSON.parse(JSON.stringify({ instances: first })));
    return first.every((widget, i) => JSON.stringify(widget.config.themeEffects) === JSON.stringify(second.instances[i].config.themeEffects));
  });
  assert(serialized, 'per-instance settings survive saved-layout normalization');
  for (const type of await page.evaluate(() => window.orbital.types)) {
    await page.evaluate(type => window.orbital.scene({ single: type, runtime: ['connect_four', 'raid_shoutout'].includes(type) ? 'editor' : 'obs-single' }), type);
    await wait();
    assert.equal(await page.$eval('[data-colour-theme]', el => el.dataset.colourTheme), 'orbital', type);
    assert.equal(await page.$$eval('.orbital-structure', nodes => nodes.length), 0, `${type}: individual browser source never gets scene-wide rails`);
    assert.equal(await page.$$eval('.theme-effects-layer__canvas', nodes => nodes.length), 1, `${type}: single renderer`);
    if (type !== 'background') {
      const frames=await page.$$eval('[data-colour-theme="orbital"] *',nodes=>nodes.filter(el=>{
        const skin=getComputedStyle(el,'::after');
        return skin.content==='""' && skin.maskComposite.includes('exclude') && skin.pointerEvents==='none';
      }).length);
      assert(frames>0,type+': recessed metal frame reaches the actual rendered surface');
    }
    await page.screenshot({ path: `${out}/widget-${type}.png` });
  }
  await page.evaluate(() => window.orbital.scene({single:'current_slot',theme:'emerald'})); await wait();
  assert.equal(await page.$eval('.cg-widget',el=>getComputedStyle(el,'::after').content),'none','Orbital casing never leaks into another theme');
  for (const environment of ['earth_orbit', 'earth_night', 'earth_sunrise', 'deep_space', 'off']) {
    await page.evaluate(environment => window.orbital.scene({ single: 'background', environment, runtime: 'obs-single' }), environment);
    await wait();
    assert.equal(await page.$eval('[data-orbital-environment]', el => el.dataset.orbitalEnvironment), environment);
    assert.equal(await page.$$eval('.orbital-environment__earth', els => els.length), ['deep_space', 'off'].includes(environment) ? 0 : 1);
    await page.screenshot({ path: `${out}/environment-${environment}.png`, omitBackground: true });
  }
  const transparent = (await page.screenshot({ omitBackground: true })).toString('base64');
  assert.equal(await page.evaluate(async png => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 0) return false;
    return true;
  }, transparent), true, 'Off produces a fully transparent OBS screenshot, including the FX canvas');
  await page.evaluate(() => window.orbital.scene({ stars: false })); await wait();
  assert.equal(await page.$$eval('[data-orbital-stars] circle', els => els.length), 0);
  await page.evaluate(() => window.orbital.scene({ animation: false })); await wait();
  const before = await page.$eval('[data-orbital-drift="earth"]', el => el.style.transform);
  await wait();
  assert.equal(await page.$eval('[data-orbital-drift="earth"]', el => el.style.transform), before, 'Background animation off freezes Earth');
  await page.evaluate(() => window.orbital.scene()); await wait();
  await page.evaluate(() => window.orbital.event('super')); await wait();
  assert.equal(await page.$eval('.theme-effects-layer__debug', el => el.dataset.lastEvent), 'super');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await wait();
  await page.waitForFunction(() => document.querySelector('.theme-effects-layer__debug')?.dataset.running === 'false');
  const reducedBefore = await page.$eval('[data-orbital-drift="earth"]', el => el.style.transform);
  const reducedFrames = await page.$eval('.theme-effects-layer__debug', el => el.dataset.frames);
  await wait();
  assert.equal(await page.$eval('[data-orbital-drift="earth"]', el => el.style.transform), reducedBefore, 'reduced motion freezes environment');
  assert.equal(await page.$eval('.theme-effects-layer__debug', el => el.dataset.frames), reducedFrames, 'static reduced-motion scene stops continuous GPU rendering');
  await page.emulateMediaFeatures([]);
  const secondPage = await browser.newPage(); await secondPage.bringToFront(); await wait();
  const hiddenBefore = await page.$eval('[data-orbital-drift="earth"]', el => el.style.transform);
  await wait();
  assert.equal(await page.$eval('[data-orbital-drift="earth"]', el => el.style.transform), hiddenBefore, 'hidden tab pauses shared motion');
  await secondPage.close(); await page.bringToFront();
  await page.evaluate(() => window.orbital.controls('background')); await wait();
  for (const [label, property] of [['Environment intensity', 'intensity'], ['Earth visibility', 'earthVisibility'], ['Atmosphere glow', 'atmosphereGlow'], ['Stars intensity', 'starsIntensity']]) {
    await page.evaluate(label => {
      const input = [...document.querySelectorAll('.bp-slider')].find(el => el.querySelector('em')?.textContent === label).querySelector('input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '37');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, label);
    assert.equal(await page.evaluate(property => window.orbital.controlConfig.themeEffects.orbital[property], property), .37, label);
  }
  await page.click('.bp-toggle::-p-text(Stars)');
  assert.equal(await page.evaluate(() => window.orbital.controlConfig.themeEffects.orbital.stars), false);
  await page.click('.bp-toggle::-p-text(Background animation)');
  assert.equal(await page.evaluate(() => window.orbital.controlConfig.themeEffects.orbital.backgroundAnimation), false);
  await page.click('[aria-label="Effect quality"] button::-p-text(Low)');
  assert.equal(await page.evaluate(() => window.orbital.controlConfig.themeEffects.quality), 'low');
  const offButton = await page.waitForSelector('button::-p-text(Off · transparent)'); await offButton.click();
  await wait();
  assert.equal(await page.evaluate(() => window.orbital.controlConfig.themeEffects.orbital.environment), 'off');
  await page.screenshot({ path: `${out}/controls.png` });
  await page.evaluate(() => window.orbital.controls('current_slot')); await wait();
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('.bp-slider')].find(el => el.querySelector('em')?.textContent === 'HUD glow').querySelector('input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '23');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(await page.evaluate(() => window.orbital.controlConfig.themeEffects.orbital.hudGlow), .23);
  await page.click('.bp-toggle::-p-text(Particles)');
  assert.equal(await page.evaluate(() => window.orbital.controlConfig.themeEffects.orbital.particles), false);
  const rangePreserved = await page.evaluate(() => {
    const config = { subElements: { progressBar: { fillColor: '#e15c25' }, cardNumberBadge: { background: '#397823' } }, cardColors: [{ accent: '#112233' }, { accent: '#abcdef' }] };
    const changed = window.orbital.applyWidgetColourTheme('bets', config, 'orbital');
    return JSON.stringify(changed.cardColors) === JSON.stringify(config.cardColors) && changed.subElements.progressBar.fillColor === '#e15c25' && changed.subElements.cardNumberBadge.background === '#397823';
  });
  assert(rangePreserved, 'prediction range colours retain their meaning');
  assert.deepEqual(errors, [], 'no runtime/effect errors');
  writeFileSync(`${out}/result.json`, JSON.stringify({ passed: true, resolutions: ['1920x1080', '2560x1440', '1366x768'], widgetTypes: await page.evaluate(() => window.orbital.types), checks: ['environment modes', 'pixel alpha transparency', 'budgets', 'saved config normalization', 'range colours', 'event routing', 'reduced motion', 'background pause', 'hidden tab pause', 'editor control'] }, null, 2));
  console.log('Orbital theme checks passed. Screenshots: ' + out);
} finally { await browser.close(); await server.close(); }
