import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { normalizeVolcanicSettings } from '../src/effects/ThemeEffects/volcanic/volcanicTheme.js';

assert.equal(normalizeVolcanicSettings({}).motion, false);
assert.equal(normalizeVolcanicSettings({ volcanic: { motion: true }, themeEffects: { enabled: false } }).motion, false);
const server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0, hmr: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await puppeteer.launch({ headless: true });
const folder = '.codex-dev/volcanic-verification';
mkdirSync(folder, { recursive: true });
try {
 const page = await browser.newPage(), errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.setViewport({ width: 1920, height: 1080 });
 await page.setRequestInterception(true);
 page.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname === '/__volcanic') return request.respond({ contentType: 'text/html', body: `<html><head><style>html,body{margin:0;background:#090b0e}*{box-sizing:border-box}</style></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>` });
  if (url.origin === base && !url.pathname.startsWith('/api/')) return request.continue();
  if (['blob:', 'data:'].includes(url.protocol)) return request.continue();
  if (request.resourceType() === 'image') return request.respond({ contentType: 'image/webp', body: readFileSync('public/player.webp') });
  return request.respond({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: '[]' });
 });
 const initialize = async () => {
  const entry = await (await fetch('/src/main.jsx')).text();
  const reactUrl = entry.match(/"([^"\n]*\/react\.js[^"\n]*)"/)[1], version = reactUrl.split('?')[1];
  const React = (await import(reactUrl)).default;
  const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js?' + version)).default;
  const router = await import('/node_modules/.vite/deps/react-router-dom.js?' + version);
  const registry = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
  const themes = await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
  const { applyVolcanicComposition } = await import('/src/components/OverlayCenter/editor/volcanicComposition.js');
  const { BetterWidgetControls } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
  const { supabase } = await import('/src/config/supabaseClient.js');
  const { createOverlayTestDatabase } = await import('/scripts/helpers/overlay-build-test-db.mjs');
  const { default: BetterObsOverlay } = await import('/src/components/OverlayCenter/editor/BetterObsOverlay.jsx');
  await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
  await import('/src/components/OverlayCenter/OverlayRenderer.css');
  const root = ReactDOM.createRoot(document.getElementById('root')), h = React.createElement;
  const emptyClient = createOverlayTestDatabase().client;
  supabase.from = emptyClient.from; supabase.channel = emptyClient.channel; supabase.removeChannel = emptyClient.removeChannel;
  supabase.rpc = async () => ({ data: [], error: null });
  supabase.auth.getUser = async () => ({ data: { user: null } });
  const config = (type, extra = {}) => themes.applyWidgetColourTheme(type, { ...registry.getBetterWidgetDefinition(type).defaultConfig, ...extra }, 'volcanic');
  window.volcanic = {
   registry, themes, config, applyVolcanicComposition,
   scene(populated = true, state = 'open') {
    const giveaway = config('giveaway', { title: 'Community giveaway', prize: 'A reward for our viewers', keyword: 'join', participants: populated ? ['ViewerOne', 'ViewerTwo'] : [], isActive: populated && state === 'open', winner: populated && state === 'winner' ? 'ViewerTwo' : '', spinningWinner: populated && state === 'drawing' ? 'ViewerTwo' : '', durationSec: 1.2 });
    const extras = {
     navbar: { displayName: 'STREAMER', streamerName:'STREAMER', motto: 'Your stream, your style', showCrypto: false, startBalance: 500 },
     bonus_hunt: { winEffects: false, bonusOpening:populated, sessionState: 'opening', startMoney: 500, bonuses: populated ? ['Sweet Bonanza', 'Wanted Dead or a Wild', 'Gates of Olympus'].map((slotName, i) => ({ id: String(i), slotName, provider: i === 1 ? 'Hacksaw Gaming' : 'Pragmatic Play', image: '/player.webp', betSize: 1, payout: i === 0 ? 0 : 100 + i, opened: i > 0, isSuperBonus: i === 1 })) : [] },
     current_slot: { slot: populated ? { name: 'Sweet Bonanza', provider: 'Pragmatic Play', image: '/player.webp', rtp: 96.5, max_win_multiplier: 5000, volatility: 'High' } : null },
     bets: { gameStatus:populated?'open':'idle', question:'Place Your Bets', options:['0 – 99','100 – 199','200 – 499','500+'].map(label=>({label})), bets:{opt_0:20,opt_1:35,opt_2:30,opt_3:15} },
     chat: { giveawayInChat: true, giveawayPosition: 'bottom', __previewGiveawayConfig: giveaway, __appearancePreviewMessages: populated ? [{ username: 'ViewerOne', message: 'Good luck everyone!', platform: 'twitch' }, { username: 'ViewerTwo', message: 'Olá a todos!', platform: 'youtube' }] : [] },
    };
    const instances = ['background', 'navbar', 'bonus_hunt', 'slideshow_frame', 'chat', 'rtp_stats', 'current_slot', 'bets'].map((type, i) => registry.createBetterInstance(type, { instanceId: 'volcanic-' + type, zIndex: i, config: config(type, extras[type]) }));
    const layout = registry.normalizeBetterLayout(applyVolcanicComposition({ instances }));
    layout.instances.push(registry.createBetterInstance('giveaway', { instanceId: 'volcanic-giveaway', visible: false, config: giveaway }));
    this.layout = layout;
    return layout;
   },
   render(layout = this.scene(), runtime = 'editor') {
    this.layout = layout;
    root.render(h('div', { id: 'volcanic-scene', style: { position: 'relative', width: 1920, height: 1080, transform: `scale(${innerWidth / 1920})`, transformOrigin: 'top left' } }, ...layout.instances.filter(i => i.visible !== false).map(instance => h('div', { key: instance.instanceId, 'data-fixture-widget': instance.widgetType, style: { position: 'absolute', left: instance.x, top: instance.y, width: instance.width, height: instance.height, zIndex: instance.zIndex } }, registry.renderBetterWidgetInstance({ instance, layout, mode: 'live', runtime, accessVerified: true })))));
   },
   single(type, extra = {}, mode = 'mock') {
    const instance = registry.createBetterInstance(type, { width: 1000, height: 600, config: config(type, extra) });
    root.render(h('div', { style: { width: instance.width, height: instance.height } }, registry.renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, runtime: 'editor', mode, accessVerified: true })));
   },
   controls(type, extra = {}) {
    function Controls() { const [c, set] = React.useState(config(type, extra)); window.volcanic.controlConfig = c; return h('div', { style: { width: 420 } }, h(BetterWidgetControls, { type, config: c, onChange: set })); }
    root.render(h(Controls, { key: type }));
   },
   obs() {
    const layout = this.layout, id = 'bo_' + 'd'.repeat(48), owner = 'volcanic-owner';
    const widgets = layout.instances.map(instance => ({ id: instance.instanceId, overlay_id: 'volcanic-live', user_id: owner, widget_type: instance.widgetType, config: instance.config, is_visible: instance.visible !== false }));
    const { client, state } = createOverlayTestDatabase({ better_overlay_publications: [{ public_overlay_id: id, owner_user_id: owner, published_layout: layout, published_version: 1, revoked_at: null }], overlay_instances: [{ id: 'volcanic-live', user_id: owner, is_active: true }], overlay_widgets: widgets, overlay_themes: [] });
    window.obsDatabase=state;
    supabase.from = client.from; supabase.channel = client.channel; supabase.removeChannel = client.removeChannel;
    root.render(h(router.MemoryRouter, { initialEntries: ['/obs/overlay/' + id] }, h(router.Routes, null, h(router.Route, { path: '/obs/overlay/:publicOverlayId', element: h(BetterObsOverlay) }))));
   },
  };
  window.volcanic.render();
 };
 await page.goto(base + '/__volcanic'); await page.evaluate(initialize);
 const settle = () => new Promise(resolve => setTimeout(resolve, 800));
 await page.waitForSelector('.volcanic-scenery'); await settle();
 const preset = await page.evaluate(() => { const api = window.volcanic, layout = api.layout, before = JSON.stringify(layout), after = api.applyVolcanicComposition(layout); const locked = { ...layout.instances[1], locked: true, x: 123 }; const duplicate = { ...layout.instances[1], instanceId: 'duplicate', x: 234 }; const protectedLayout = api.applyVolcanicComposition({ instances: [locked, duplicate] }); return { immutable: before === JSON.stringify(layout), stable: JSON.stringify(after.instances) === JSON.stringify(api.applyVolcanicComposition(after).instances), protected: protectedLayout.instances[0].x === 123 && protectedLayout.instances[1].x === 234 }; });
 assert(preset.immutable && preset.stable && preset.protected);
 for (const state of ['open', 'drawing', 'winner']) {
  await page.evaluate(state => window.volcanic.render(window.volcanic.scene(true, state)), state); await settle();
  const geometry = await page.evaluate(() => { const chat = document.querySelector('.ov-chat-widget'), giveaway = chat.querySelector('.ov-chat-giveaway'), messages = chat.querySelector('.ov-chat-messages'); const g = giveaway.getBoundingClientRect(), m = messages.getBoundingClientRect(), c = chat.getBoundingClientRect(); return { pinned: giveaway.compareDocumentPosition(messages) & Node.DOCUMENT_POSITION_FOLLOWING, contained: g.top >= c.top && g.bottom <= m.top + 1 && g.right <= c.right + 1, theme: giveaway.dataset.giveawayTheme, messages: m.height }; });
  assert(geometry.pinned && geometry.contained && geometry.messages > 0 && geometry.theme === 'volcanic', JSON.stringify(geometry));
  assert(await page.evaluate(()=>[...document.querySelectorAll('[data-fixture-widget]')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=1920.5&&r.bottom<=1080.5;})),'all reference widget boundaries fit the canvas');
  const cards=await page.evaluate(()=>{const last=document.querySelector('.better-hunt-list-group:first-child .better-hunt-row--image:last-child'),list=document.querySelector('.better-hunt-main-list-wrap');return {last:last.getBoundingClientRect().toJSON(),list:list.getBoundingClientRect().toJSON(),children:[...document.querySelector('.better-hunt-mainstream').children].map(e=>[e.className,e.getBoundingClientRect().height])};});assert(cards.last.bottom<=cards.list.bottom+1,'all three slot cards fit: '+JSON.stringify(cards));
  await page.screenshot({ path: `${folder}/reference-${state}.png` });
 }
 await page.evaluate(() => window.volcanic.render(window.volcanic.scene(false))); await settle();
 assert.equal(await page.$('.ov-chat-giveaway'), null, 'empty giveaway reclaims space');
 await page.screenshot({ path: `${folder}/reference-empty.png` });
 for (const [width, height] of [[1920,1080],[2560,1440],[1366,768]]) {
  await page.setViewport({ width, height }); await page.evaluate(() => window.volcanic.render()); await settle();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: `${folder}/reference-${width}.png` });
 }
 await page.setViewport({ width:1920, height:1080 });
 for (const type of ['current_slot','bonus_hunt','chat','rtp_stats','navbar','bets','slideshow_frame','tournament','giveaway','raid_shoutout','slot_bingo','connect_four']) {
  await page.evaluate(type => window.volcanic.single(type), type); await settle();
  assert(await page.$('[data-colour-theme=volcanic]'), type + ' receives theme');
  await page.screenshot({ path: `${folder}/widget-${type}.png` });
 }
 for (const [type,url] of [['image','/player.webp'],['video','/smoke_effect2.mp4']]) {
  await page.evaluate(({type,url})=>window.volcanic.single('slideshow_frame',{mediaText:'',mediaItems:[{type,url}],fit:'contain',autoplay:true,videoMuted:true,videoLoop:true},'live'),{type,url});
  const selector=type==='image'?'.better-slideshow-frame img':'.better-slideshow-frame video';
  await page.waitForFunction(({selector,type})=>{const el=document.querySelector(selector);return type==='image'?el?.naturalWidth>0:el?.currentTime>.1;},{},{selector,type});
  assert.equal(await page.$eval(selector,el=>getComputedStyle(el).objectFit),'contain');
 }
 await page.evaluate(()=>{const api=window.volcanic,c=api.config('current_slot');c.borderColor='#00AAFF';c.subElements={slotTitle:{textColor:'#9AB3FF',fontSize:20}};const instance=api.registry.createBetterInstance('current_slot',{width:980,height:194,config:c});api.render({instances:[instance]},'obs');});await settle();
 assert.equal(await page.$eval('.cg-widget',el=>getComputedStyle(el).borderColor),'rgb(0, 170, 255)');
 assert.equal(await page.$eval('[data-better-element=slotTitle]',el=>getComputedStyle(el).color),'rgb(154, 179, 255)','saved element overrides retain precedence');
 await page.evaluate(() => window.volcanic.controls('background')); await page.waitForSelector('[data-effects-theme=volcanic]');
 const toggle = async label => { for (const el of await page.$$('.bp-toggle')) if (await el.evaluate((el,label) => el.querySelector('strong')?.textContent === label, label)) { await el.click(); return; } throw new Error('Missing toggle '+label); };
 await toggle('Basalt and lava scenery'); await toggle('Reference gameplay rim'); await toggle('Idle gameplay background'); await toggle('Subtle ember motion');
 for(const label of await page.$$('label.bp-text')) if(await label.evaluate(el=>el.querySelector('span')?.textContent==='Effect quality')) await (await label.$('select')).select('low');
 const saved = await page.evaluate(() => { localStorage.setItem('volcanic-control-test',JSON.stringify(window.volcanic.controlConfig)); return window.volcanic.controlConfig; });
 assert(saved.volcanic.scenery === false && saved.volcanic.referenceFrame && saved.volcanic.idleBackground && saved.volcanic.motion);
 assert.equal(saved.themeEffects.quality,'low','quality control updates persisted configuration');
 await page.reload(); await page.evaluate(initialize);
 await page.evaluate(() => { const api=window.volcanic, c=JSON.parse(localStorage.getItem('volcanic-control-test')); const layout=api.scene(); layout.instances.find(i=>i.widgetType==='background').config=c; api.render(layout); }); await settle();
 assert.equal(await page.$('.volcanic-scenery'),null); assert(await page.$('.volcanic-viewport-rim[data-idle=on]'));
 await page.evaluate(() => { const api=window.volcanic, layout=api.scene(); const bg=layout.instances.find(i=>i.widgetType==='background'); bg.config.volcanic.motion=true; bg.config.themeEffects={enabled:true,quality:'low'}; api.render(layout); }); await settle();
 assert.equal(await page.$$eval('.volcanic-embers i',els=>els.length),2);
 await page.emulateMediaFeatures([{ name:'prefers-reduced-motion',value:'reduce' }]);
 assert.equal(await page.$eval('.volcanic-embers',el=>getComputedStyle(el).display),'none');
 await page.emulateMediaFeatures([]);
 await page.evaluate(() => { const api=window.volcanic, layout=api.scene(); layout.instances.find(i=>i.widgetType==='background').config.volcanic.motion=true; api.render(layout); }); await settle();
 assert.equal(await page.$$eval('canvas',els=>els.length),0,'Volcanic adds no GPU renderers');
 await page.evaluate(()=>{const api=window.volcanic,layout=api.scene();const bg=layout.instances.find(i=>i.widgetType==='background');bg.config=api.themes.applyWidgetColourTheme('background',bg.config,'candy');api.render(layout);});await settle();
 assert.equal(await page.$('.volcanic-environment'),null,'theme switch removes scenery and ember nodes');
 await page.evaluate(() => { const api=window.volcanic, layout=api.scene(true,'winner'); localStorage.setItem('volcanic-published-layout',JSON.stringify(layout)); api.layout=layout; api.obs(); });
 await page.waitForSelector('.better-obs-overlay .volcanic-scenery').catch(async error=>{console.error(await page.evaluate(()=>({html:document.getElementById('root').innerHTML.slice(0,2500),calls:window.obsDatabase.calls})),errors);throw error;}); await page.waitForSelector('.better-obs-overlay .ov-chat-giveaway .better-gw-result-card'); await settle();
 assert.equal(await page.$eval('.volcanic-viewport-rim',el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','actual published opening stays transparent');
 assert.equal(await page.$eval('.ov-chat-giveaway',el=>el.dataset.giveawayTheme),'volcanic');
 const screenshot = await page.screenshot({ path:`${folder}/published-obs-route.png`,omitBackground:true });
 assert.equal(await page.evaluate(async image=>{const img=new Image();img.src=image;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(900,400,1,1).data[3];},'data:image/png;base64,'+Buffer.from(screenshot).toString('base64')),0,'published gameplay opening is truly transparent');
 assert.equal(await page.$$eval('.theme-effects-layer__canvas',els=>els.length),0);
 assert.deepEqual(errors,[]);
 console.log('Volcanic: 12 widget families, three resolutions, real published OBS route, pinned giveaways, controls/reload, transparency, motion/reduced motion and preset safety: PASS');
} finally { await browser.close(); await server.close(); }
