import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
import {createServer} from 'vite';
import puppeteer from 'puppeteer';
const server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0, hmr: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await puppeteer.launch({ headless: true });
const folder = '.codex-dev/solverde-verification';
mkdirSync(folder, { recursive: true });
try {
 const page = await browser.newPage(), errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.setViewport({ width: 1920, height: 1080 });
 await page.setRequestInterception(true);
 page.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname === '/__solverde') return request.respond({ contentType: 'text/html', body: `<html><head><style>html,body{margin:0;background:#090b0e}*{box-sizing:border-box}</style></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>` });
  if (url.origin === base && !url.pathname.startsWith('/api/')) return request.continue();
  if (['blob:', 'data:'].includes(url.protocol)) return request.continue();
  if (request.resourceType() === 'image') return request.respond({ contentType: 'image/webp', body: readFileSync('public/player.webp') });
  return request.respond({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: '[]' });
 });
 const initialize = async () => {
  localStorage.setItem('streamers-center:navbar-crypto-prices',JSON.stringify({savedAt:Date.now(),prices:{btc:{price:65000,change:1.2}}}));
  const entry = await (await fetch('/src/main.jsx')).text();
  const reactUrl = entry.match(/"([^"\n]*\/react\.js[^"\n]*)"/)[1], version = reactUrl.split('?')[1];
  const React = (await import(reactUrl)).default;
  const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js?' + version)).default;
  const router = await import('/node_modules/.vite/deps/react-router-dom.js?' + version);
  const registry = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
  const themes = await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
  const { applySolverdeComposition } = await import('/src/components/OverlayCenter/editor/solverdeComposition.js');
  const { BetterWidgetControls } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
  const appearanceRegistry=await import('/src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js');
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
  const config = (type, extra = {}) => themes.applyWidgetColourTheme(type, { ...registry.getBetterWidgetDefinition(type).defaultConfig, ...extra }, 'solverde');
  window.solverde = {
   registry, themes, config, applySolverdeComposition, appearanceRegistry,
   scene(populated = true, state = 'open') {
    const giveaway = config('giveaway', { title: 'SORTEIO', prize: 'A reward for our viewers', keyword: 'sorteio', participants: populated ? ['ViewerOne', 'ViewerTwo'] : [], isActive: populated && state === 'open', winner: populated && state === 'winner' ? 'ViewerTwo' : '', spinningWinner: populated && state === 'drawing' ? 'ViewerTwo' : '', durationSec: 1.2 });
    const extras = {
     navbar: { displayName: 'STREAMER', streamerName:'STREAMER', motto: 'Your stream, your style', showCrypto: true, startBalance: 500, showCTA:true, ctaText:'BE GAMBLE AWARE!' },
     bonus_hunt: { winEffects: false, bonusOpening:populated, sessionState: 'opening', startMoney: 500,currentBalance:625,breakEven:85, bonuses: populated ? ['Sweet Bonanza', 'Wanted Dead or a Wild', 'Gates of Olympus'].map((slotName, i) => ({ id: String(i), slotName, provider: i === 1 ? 'Hacksaw Gaming' : 'Pragmatic Play', image: '/player.webp', betSize: 1, payout: i === 0 ? 0 : 100 + i, opened: i > 0, isSuperBonus: i === 1 })) : [] },
     current_slot: { slot: populated ? { name: 'Sweet Bonanza', provider: 'Pragmatic Play', image: '/player.webp', rtp: 96.5, max_win_multiplier: 5000, volatility: 'High' } : null },
     bets: { gameStatus:populated?'open':'idle', question:'Place Your Bets', options:['0–99x','100–499x','500x+'].map(label=>({label})), bets:{opt_0:22,opt_1:54,opt_2:24} },
     chat: { live:true,giveawayInChat: true, giveawayPosition: 'bottom', __previewGiveawayConfig: giveaway, __appearancePreviewMessages: populated ? [{ username: 'ViewerOne', message: 'Good luck everyone!', platform: 'twitch' }, { username: 'ViewerTwo', message: 'Olá a todos!', platform: 'youtube' }] : [] },
    };
    const instances = ['background', 'navbar', 'bonus_hunt', 'slideshow_frame', 'chat', 'rtp_stats', 'current_slot', 'bets'].map((type, i) => registry.createBetterInstance(type, { instanceId: 'solverde-' + type, zIndex: i, config: config(type, extras[type]) }));
    const layout = registry.normalizeBetterLayout(applySolverdeComposition({ instances }));
    layout.instances.push(registry.createBetterInstance('giveaway', { instanceId: 'solverde-giveaway', visible: false, config: giveaway }));
    this.layout = layout;
    return layout;
   },
   render(layout = this.scene(), runtime = 'editor') {
    this.layout = layout;
    root.render(h('div', { id: 'solverde-scene', style: { position: 'relative', width: 1920, height: 1080, transform: `scale(${innerWidth / 1920})`, transformOrigin: 'top left' } }, ...layout.instances.filter(i => i.visible !== false).map(instance => h('div', { key: instance.instanceId, 'data-fixture-widget': instance.widgetType, style: { position: 'absolute', left: instance.x, top: instance.y, width: instance.width, height: instance.height, zIndex: instance.zIndex } }, registry.renderBetterWidgetInstance({ instance, layout, mode: 'live', runtime, accessVerified: true })))));
   },
   single(type, extra = {}, mode = 'mock') {
    const instance = registry.createBetterInstance(type, { width: 1000, height: 600, config: config(type, extra) });
    root.render(h('div', { style: { width: instance.width, height: instance.height } }, registry.renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, runtime: 'editor', mode, accessVerified: true })));
   },
   controls(type, extra = {}) {
    function Controls() { const [c, set] = React.useState(config(type, extra)); window.solverde.controlConfig = c; return h('div', { style: { width: 420 } }, h(BetterWidgetControls, { type, config: c, onChange: set })); }
    this.controlsVersion=(this.controlsVersion||0)+1;root.render(h(Controls, { key: type+this.controlsVersion }));
   },
   obs() {
    const layout = this.layout, id = 'bo_' + 'd'.repeat(48), owner = 'solverde-owner';
    const widgets = layout.instances.map(instance => ({ id: instance.instanceId, overlay_id: 'solverde-live', user_id: owner, widget_type: instance.widgetType, config: instance.config, is_visible: instance.visible !== false }));
    const { client, state } = createOverlayTestDatabase({ better_overlay_publications: [{ public_overlay_id: id, owner_user_id: owner, published_layout: layout, published_version: 1, revoked_at: null }], overlay_instances: [{ id: 'solverde-live', user_id: owner, is_active: true }], overlay_widgets: widgets, overlay_themes: [] });
    window.obsDatabase=state;
    supabase.from = client.from; supabase.channel = client.channel; supabase.removeChannel = client.removeChannel;
    this.obsVersion = (this.obsVersion || 0) + 1;
    root.render(h(router.MemoryRouter, { key: this.obsVersion, initialEntries: ['/obs/overlay/' + id] }, h(router.Routes, null, h(router.Route, { path: '/obs/overlay/:publicOverlayId', element: h(BetterObsOverlay) }))));
   },
  };
  window.solverde.render();
 };

 await page.goto(base+'/__solverde');await page.evaluate(initialize);
 const settle=()=>new Promise(resolve=>setTimeout(resolve,700));
 await page.waitForSelector('.solverde-hunt-dock');await settle();
 const dockRect=await page.$eval('.solverde-hunt-dock',el=>el.getBoundingClientRect().toJSON());assert.equal(dockRect.top,810);assert.equal(dockRect.left,20);assert.equal(dockRect.height,246);
 const baseline=await page.evaluate(()=>{const api=window.solverde,layout=api.layout,before=JSON.stringify(layout),again=api.applySolverdeComposition(layout);const locked={...layout.instances[1],locked:true,x:147},duplicate={...layout.instances[1],instanceId:'duplicate',x:222};const safe=api.applySolverdeComposition({instances:[locked,duplicate]});return {immutable:before===JSON.stringify(layout),stable:JSON.stringify(again)===JSON.stringify(api.applySolverdeComposition(again)),protected:safe.instances[0].x===147&&safe.instances[1].x===222,footer:layout.instances.find(i=>i.widgetType==='rtp_stats').height,dock:layout.instances.find(i=>i.widgetType==='bonus_hunt').height};});
 assert(baseline.immutable&&baseline.stable&&baseline.protected,JSON.stringify(baseline));assert.equal(baseline.footer,86);assert.equal(baseline.dock,246);
 const schemas=await page.evaluate(()=>{const r=window.solverde.appearanceRegistry;return {errors:r.validateWidgetAppearanceRegistry().errors.filter(e=>e.includes('solverde_')),footer:r.getWidgetAppearanceV2Elements('current_slot','solverde_footer').map(e=>e.id),dock:r.getWidgetAppearanceV2Elements('bonus_hunt','solverde_dock').map(e=>e.id)};});
 assert.deepEqual(schemas.errors,[]);assert(!schemas.footer.includes('backdrop'));assert(schemas.footer.includes('bestWinValue'));assert(!schemas.dock.includes('requestsPanel'));
 for(const state of ['open','drawing','winner']) {
  await page.evaluate(state=>window.solverde.render(window.solverde.scene(true,state)),state);await settle();
  await page.screenshot({path:folder+'/initial.png'});
  const info=await page.evaluate(()=>{const chat=document.querySelector('.ov-chat-widget'),g=chat.querySelector('.ov-chat-giveaway'),m=chat.querySelector('.ov-chat-messages'),r=g.getBoundingClientRect();return {giveaway:r.toJSON(),messages:m.getBoundingClientRect().toJSON(),chat:chat.getBoundingClientRect().toJSON(),theme:g.dataset.giveawayTheme,heading:chat.querySelector('.solverde-chat-header')?.textContent,widgets:[...document.querySelectorAll('[data-fixture-widget]')].map(el=>[el.dataset.fixtureWidget,el.getBoundingClientRect().toJSON()]),progress:document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'),cards:document.querySelectorAll('.solverde-dock-card').length};});
  assert.equal(info.theme,'solverde');assert(info.heading.includes('COMUNIDADE'));assert(info.giveaway.top>=info.chat.top&&info.giveaway.bottom<=info.messages.top+1&&info.messages.height>80,JSON.stringify(info));
  assert(info.widgets.every(([type,r])=>r.left>=0&&r.top>=0&&r.right<=1921&&r.bottom<=1081),JSON.stringify(info.widgets));assert.equal(info.cards,3);assert.equal(info.progress,'2');
  assert(await page.$('[data-fixture-widget=rtp_stats]'),'reference uses live RTP strip');assert.equal(await page.$('[data-fixture-widget=current_slot]'),null);
  assert(await page.$('.rtp-stats-bar'));assert(await page.$('.solverde-masthead-logo'));
  assert.deepEqual(await page.$$eval('.solverde-prediction-row>strong',els=>els.map(el=>el.textContent)),['22%','54%','24%']);
  await page.screenshot({path:folder+'/reference-'+state+'.png'});
 }
 for(const height of [246,220,200]) {
  await page.evaluate(height=>{const api=window.solverde,l=api.scene();l.instances.find(i=>i.widgetType==='bonus_hunt').height=height;const bets=l.instances.find(i=>i.widgetType==='bets');bets.height=height;bets.config={...bets.config,options:['0–99','100–199','200–299','300–399','400–499','500+'].map(label=>({label})),bets:{opt_0:10,opt_1:20,opt_2:30,opt_3:15,opt_4:15,opt_5:10}};api.render(l)},height);await settle();
  const contained=await page.evaluate(()=>{const dock=document.querySelector('.solverde-hunt-dock').getBoundingClientRect(),ring=document.querySelector('.solverde-progress-ring').getBoundingClientRect();return {ring:ring.bottom<=dock.bottom-5,cards:[...document.querySelectorAll('.solverde-dock-values')].every(e=>{const r=e.getBoundingClientRect(),card=e.closest('.solverde-dock-card').getBoundingClientRect();return r.bottom<=card.bottom&&r.top>=card.top&&r.bottom<=dock.bottom-5}),rows:[...document.querySelectorAll('.solverde-prediction-row')].every(e=>{const r=e.getBoundingClientRect(),track=e.querySelector('.solverde-prediction-track').getBoundingClientRect();return track.top>=r.top&&track.bottom<=r.bottom})};});assert(contained.ring&&contained.cards&&contained.rows,JSON.stringify({height,...contained}));
  assert.deepEqual(await page.$$eval('.solverde-dock-status',els=>els.map(e=>e.textContent)),['ATUAL','ABERTO','ABERTO']);
  await page.screenshot({path:folder+'/dock-six-predictions-'+height+'.png'});
 }
 await page.evaluate(()=>window.solverde.render());await settle();
 assert(await page.$eval('.solverde-provider-chip img',e=>e.naturalWidth>0));assert(await page.$eval('.solverde-dock-card[data-opened=true] .solverde-dock-art',e=>getComputedStyle(e).filter.includes('grayscale(1)')));assert(await page.$('.solverde-atmosphere'));
 assert(await page.$eval('.better-slideshow-frame img',el=>el.naturalWidth>0&&el.src.includes('brand-slide.svg')),'replaceable default slide');
 for(const [width,height] of [[2560,1440],[1366,768],[1920,1080]]){await page.setViewport({width,height});await page.evaluate(()=>window.solverde.render());await settle();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:folder+'/reference-'+width+'.png'});}
 await page.evaluate(()=>window.solverde.render(window.solverde.scene(false)));await settle();assert.equal(await page.$('.ov-chat-giveaway'),null);assert(await page.$('.solverde-dock-empty'));
 await page.evaluate(()=>{const api=window.solverde,l=api.scene();const hunt=l.instances.find(i=>i.widgetType==='bonus_hunt');hunt.config.solverde={...hunt.config.solverde,autoCarousel:true};hunt.config.carouselMs=2000;hunt.config.bonuses=Array.from({length:30},(_,i)=>({id:String(i),slotName:'Long Slot Name '+i,provider:'Provider',image:'/player.webp',betSize:1,payout:i<27?10:0,opened:i<27}));api.render(l);});await settle();
 assert.equal(await page.$eval('[role=progressbar]',el=>el.getAttribute('aria-valuenow')),'27');
 await page.waitForFunction(()=>{const track=document.querySelector('.solverde-dock-track'),active=track?.querySelector('[data-active=true]')?.getBoundingClientRect(),r=track?.getBoundingClientRect();return active&&active.left>=r.left-1&&active.right<=r.right+1;},{timeout:2800});
 assert.equal(await page.$$eval('.solverde-dock-nav button',els=>els.length),0);
 await page.$eval('.solverde-dock-track',e=>e.scrollTo({left:0,behavior:'instant'}));await settle();const before=await page.$eval('.solverde-dock-track',e=>e.scrollLeft);await new Promise(r=>setTimeout(r,2600));assert(await page.$eval('.solverde-dock-track',e=>e.scrollLeft)>before+20,'viewport automatically advances');assert.equal(await page.$eval('.solverde-dock-card[data-active=true]',e=>e.querySelector('.solverde-dock-name strong').textContent),'Long Slot Name 27','viewport motion never changes the real current bonus');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await settle();const reducedScroll=await page.$eval('.solverde-dock-track',e=>e.scrollLeft);await new Promise(r=>setTimeout(r,3500));assert.equal(await page.$eval('.solverde-dock-track',e=>e.scrollLeft),reducedScroll);await page.emulateMediaFeatures([]);

 for(const [type,url] of [['image','/player.webp'],['video','/smoke_effect2.mp4']]){await page.evaluate(({type,url})=>window.solverde.single('slideshow_frame',{mediaItems:[{type,url}],fit:'contain',videoMuted:true,videoLoop:true,autoplay:true},'live'),{type,url});const selector=type==='image'?'.better-slideshow-frame img':'.better-slideshow-frame video';await page.waitForFunction(({selector,type})=>{const el=document.querySelector(selector);return type==='image'?el?.naturalWidth>0:el?.currentTime>.1;},{},{selector,type});assert.equal(await page.$eval(selector,el=>getComputedStyle(el).objectFit),'contain');assert(!await page.$eval(selector,el=>el.src.includes('brand-slide.svg')));}
 await page.evaluate(()=>window.solverde.controls('background'));await page.waitForSelector('[data-effects-theme=solverde]');
 const toggle=async label=>{for(const el of await page.$$('.bp-toggle'))if(await el.evaluate((el,label)=>el.querySelector('strong')?.textContent===label,label)){await el.click();return;}throw Error('Missing toggle '+label);};
 const field=async(label,value)=>page.evaluate(({label,value})=>{const el=[...document.querySelectorAll('label')].find(el=>el.querySelector('span')?.textContent===label)?.querySelector('input,select');if(!el)throw Error('Missing field '+label);const prototype=el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));},{label,value});
 await toggle('Sunburst decorations');await toggle('Reference gameplay frame');await toggle('Idle gameplay fill');await toggle('Smooth emerald background');
 const saved=await page.evaluate(()=>{localStorage.setItem('solver-controls',JSON.stringify(window.solverde.controlConfig));return window.solverde.controlConfig;});assert.equal(saved.solverde.decorations,false);assert.equal(saved.solverde.scenery,false);assert(saved.solverde.gameplayFrame&&saved.solverde.idleBackground);
 await page.reload();await page.evaluate(initialize);await page.evaluate(()=>{const api=window.solverde,l=api.scene();l.instances.find(i=>i.widgetType==='background').config=JSON.parse(localStorage.getItem('solver-controls'));api.render(l);});await settle();assert(await page.$('.solverde-gameplay-frame[data-idle=on]'));assert.equal(await page.$('.solverde-scenery'),null);assert.equal(await page.$('.solverde-atmosphere'),null);
 for(const count of [2,3,4]) {
  await page.evaluate(()=>window.solverde.controls('bonus_hunt'));await page.waitForSelector('[data-effects-theme=solverde]');await toggle('Horizontal hunt dock');await field('Visible cards',count);await field('Dock heading','HUNT PERSONALIZADO');await field('Text size',count===2?10:count===3?14:22);await field('Text font',count===2?'Georgia, serif':'Arial, sans-serif');
  const edited=await page.evaluate(()=>JSON.parse(JSON.stringify(window.solverde.controlConfig)));assert.equal(edited.solverde.dockCards??3,count);assert.equal(edited.solverde.dockTitle,'HUNT PERSONALIZADO');
  await page.evaluate(edited=>{const api=window.solverde,l=api.scene();const hunt=l.instances.find(i=>i.widgetType==='bonus_hunt');hunt.config={...hunt.config,...edited};api.render(l);},edited);await settle();assert.equal(await page.$eval('.solverde-hunt-dock',el=>getComputedStyle(el).getPropertyValue('--slv-dock-cards').trim()),String(count));assert.equal(await page.$eval('.solverde-hunt-progress h2',el=>el.textContent),'HUNT PERSONALIZADO');assert.equal(await page.$eval('.solverde-hunt-dock',el=>getComputedStyle(el).fontSize),`${edited.fontSize}px`);assert.match(await page.$eval('.solverde-hunt-dock',el=>getComputedStyle(el).fontFamily),count===2?/Georgia/:/Arial/);
 }
 await page.evaluate(()=>window.solverde.controls('bonus_hunt'));await page.waitForSelector('[data-effects-theme=solverde]');await toggle('Horizontal hunt dock');await toggle('Provider logos');await toggle('Automatic card carousel');await field('Carousel interval (seconds)',2.5);const carouselSettings=await page.evaluate(()=>window.solverde.controlConfig);assert.equal(carouselSettings.solverde.autoCarousel,false);assert.equal(carouselSettings.carouselMs,2500);await page.evaluate(config=>{const api=window.solverde,l=api.scene();l.instances.find(i=>i.widgetType==='bonus_hunt').config={...l.instances.find(i=>i.widgetType==='bonus_hunt').config,...config};api.render(l)},carouselSettings);await settle();assert.equal(await page.$('.solverde-provider-chip'),null);
 for(const [type,label,selector] of [['current_slot','Integrated slot footer','.cg-widget--solverde'],['bets','Reference prediction rows','.solverde-predictions']]) {
  await page.evaluate(type=>window.solverde.controls(type,type==='bets'?{gameStatus:'open',options:[{label:'0–99x'},{label:'100–499x'},{label:'500x+'}]}:{}),type);await page.waitForSelector('[data-effects-theme=solverde]');await toggle(label);const edited=await page.evaluate(()=>window.solverde.controlConfig);await page.evaluate(({type,edited})=>window.solverde.single(type,edited,'live'),{type,edited});await settle();assert(await page.$(selector),type+' variant toggle changes rendering');
 }
 await page.evaluate(()=>window.solverde.controls('bets'));await page.waitForSelector('[data-effects-theme=solverde]');await toggle('Reference prediction rows');await field('Range text size',12);await field('Percentage text size',18);await field('Text font','Arial, sans-serif');
 const fontConfig=await page.evaluate(()=>{localStorage.setItem('solver-bets',JSON.stringify(window.solverde.controlConfig));return JSON.parse(localStorage.getItem('solver-bets'))});
 await page.evaluate(config=>window.solverde.single('bets',{...config,gameStatus:'open',options:[{label:'0–99x'},{label:'100–499x'},{label:'500x+'}]},'live'),fontConfig);await settle();assert.equal(await page.$eval('.solverde-prediction-row>span:first-child',e=>getComputedStyle(e).fontSize),'12px');assert.equal(await page.$eval('.solverde-prediction-row>strong',e=>getComputedStyle(e).fontSize),'18px');
 await page.evaluate(()=>window.solverde.controls('navbar'));await page.waitForSelector('[data-effects-theme=solverde]');await toggle('Live indicator');await page.evaluate(()=>window.solverde.single('navbar',window.solverde.controlConfig,'live'));await settle();assert.equal(await page.$('.solverde-live'),null);
 await page.evaluate(()=>window.solverde.controls('slideshow_frame'));await page.waitForSelector('[data-effects-theme=solverde]');await toggle('Default Solverde slide');await page.evaluate(()=>window.solverde.single('slideshow_frame',window.solverde.controlConfig,'live'));await settle();assert.equal(await page.$('.better-slideshow-frame img'),null);
 for(const type of ['current_slot','bonus_hunt','chat','rtp_stats','navbar','bets','slideshow_frame','tournament','giveaway','raid_shoutout','slot_bingo','connect_four']){await page.evaluate(type=>window.solverde.single(type),type);await settle();assert(await page.$('[data-colour-theme=solverde]'),type);await page.screenshot({path:folder+'/widget-'+type+'.png'});}
 await page.evaluate(()=>{const api=window.solverde,l=api.scene();const current=l.instances.find(i=>i.widgetType==='current_slot');current.visible=true;current.config.solverde={...current.config.solverde,footer:true};current.config.subElements={slotTitle:{textColor:'#AABBFF',fontSize:19}};api.render(l);});await settle();assert.equal(await page.$eval('.cg-widget--solverde [data-better-element=slotTitle]',el=>getComputedStyle(el).color),'rgb(170, 187, 255)');
 assert.notEqual(await page.$eval('.solverde-dock-name [data-better-element=slotTitle]',el=>getComputedStyle(el).color),'rgb(170, 187, 255)','footer typography does not leak into hunt cards');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert(await page.$$eval('[data-colour-theme=solverde] *',els=>els.every(el=>getComputedStyle(el).animationName==='none')));await page.emulateMediaFeatures([]);
 await page.evaluate(()=>{const api=window.solverde,l=api.scene();for(const i of l.instances)i.config=api.themes.applyWidgetColourTheme(i.widgetType,i.config,'neon');api.render(l);});await settle();assert.equal(await page.$('.solverde-hunt-dock'),null);assert.equal(await page.$('.solverde-environment'),null);
 await page.evaluate(()=>{const api=window.solverde;api.layout=api.scene(true,'open');const bets=api.layout.instances.find(i=>i.widgetType==='bets');bets.config.options=Array.from({length:6},(_,i)=>({label:`${i*100}–${i*100+99}`}));api.obs();});await page.waitForSelector('.better-obs-overlay .solverde-hunt-dock');await settle();
 assert.equal(await page.$$eval('.solverde-prediction-row',els=>els.length),6);assert(await page.$$eval('.solverde-prediction-row',els=>els.every(e=>{const row=e.getBoundingClientRect(),bar=e.querySelector('.solverde-prediction-track').getBoundingClientRect();return bar.top>=row.top&&bar.bottom<=row.bottom})));
 assert(await page.$('.better-obs-overlay .solverde-giveaway-notice'));assert(await page.$('.better-obs-overlay .rtp-stats-bar'));
 const screenshot=await page.screenshot({path:folder+'/published-obs-route.png',omitBackground:true});const alpha=await page.evaluate(async image=>{const img=new Image();img.src=image;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(800,400,1,1).data[3];},'data:image/png;base64,'+Buffer.from(screenshot).toString('base64'));assert.equal(alpha,0,'actual published gameplay opening is transparent');
 assert.equal(await page.$$eval('canvas',els=>els.length),0,'no new per-widget GPU renderers');assert.deepEqual(errors,[]);console.log('Solverde: reference composition, pinned giveaway states, dock/live data/long hunts, media, controls/reload, 12 widget families, overrides, theme cleanup and published transparency PASS');
} finally { await browser.close();await server.close(); }
