import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0, hmr: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
let browser;
mkdirSync('.codex-dev/giveaway-theme-verification', { recursive: true });
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1600, height: 1000 });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/__giveaway-themes') return request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#202125"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>` });
    if (url.origin === base && !url.pathname.startsWith('/api/')) return request.continue();
    if (['data:', 'blob:'].includes(url.protocol)) return request.continue();
    return request.respond({ contentType: 'application/json', body: '[]', headers: { 'access-control-allow-origin': '*' } });
  });
  const initialize = async () => {
    const source = await (await fetch('/src/main.jsx')).text();
    const React = (await import(source.match(/"([^"\n]*\/react\.js[^"\n]*)"/)[1])).default;
    const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const registry = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const { applyWidgetColourTheme } = await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
    const { WIDGET_COLOUR_THEMES } = await import('/src/components/OverlayCenter/widgets/shared/colourThemePalettes.js');
    const { resolveEmbeddedGiveawayConfig } = await import('/src/components/OverlayCenter/widgets/giveaway/embeddedGiveawayConfig.js');
    const { setScopedAppearanceConfigValue } = await import('/src/components/OverlayCenter/appearance/v2/appearanceRouting.js');
    const { ChatGiveawayAppearanceControls } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    await import('/src/components/OverlayCenter/OverlayRenderer.css');
    const root = ReactDOM.createRoot(document.getElementById('root')), h = React.createElement;
    const themed = (type, key, config = {}) => applyWidgetColourTheme(type, { ...registry.getBetterWidgetDefinition(type).defaultConfig, ...config }, key);
    const live = state => ({ title: 'Connected giveaway', prize: 'Community prize', keyword: 'join', participants: ['ViewerOne', 'ViewerTwo'], isActive: state === 'open', spinningWinner: state === 'drawing' ? 'ViewerTwo' : '', winner: state === 'winner' ? 'ViewerTwo' : '', durationSec: 1.2 });
    window.giveawayThemes = {
      keys: WIDGET_COLOUR_THEMES.map(theme => theme.key),
      matrix() {
        let count = 0;
        for (const theme of this.keys) for (const other of this.keys) {
          let giveaway = themed('giveaway', other, live('winner'));
          giveaway = setScopedAppearanceConfigValue(giveaway, { widgetType: 'giveaway', widgetVariant: 'better_giveaway', elementId: 'prize', propertyId: 'textColor' }, '#ff0000');
          giveaway.subElements = { ...giveaway.subElements, title: { textColor: '#ff0000', fontSize: 31, states: { winner: { textColor: '#ff0000' } } } };
          const chat = themed('chat', theme, { themeEffects: { enabled: false } });
          const before = JSON.stringify({ giveaway, chat });
          const result = resolveEmbeddedGiveawayConfig(chat, giveaway);
          const expected = themed('giveaway', theme);
          if (result.colourTheme !== theme || result.bgColor !== expected.bgColor || result.accentColor !== expected.accentColor || result.subElements.title.textColor === '#ff0000' || result.subElements.title.fontSize !== 31) throw new Error('Inherited appearance mismatch: ' + theme + '/' + other);
          if (JSON.stringify(result.themeEffects) !== JSON.stringify(chat.themeEffects) || result.winner !== giveaway.winner || result.participants !== giveaway.participants || result.keyword !== giveaway.keyword) throw new Error('Live data or effects mismatch');
          const custom = resolveEmbeddedGiveawayConfig({ ...chat, giveawayCustomAppearance: true, giveawayAppearance: { ...expected, titleColor: '#123456', radius: 27 } }, giveaway);
          if (custom.titleColor !== '#123456' || custom.radius !== 27 || custom.colourTheme !== theme) throw new Error('Explicit custom appearance lost');
          const stale = resolveEmbeddedGiveawayConfig({ ...chat, giveawayCustomAppearance: true, giveawayAppearance: giveaway }, giveaway);
          if (stale.colourTheme !== theme || (other !== theme && stale.bgColor !== expected.bgColor)) throw new Error('Stale custom theme survives');
          if (before !== JSON.stringify({ giveaway, chat })) throw new Error('Source mutated');
          count++;
        }
        return count;
      },
      render(theme, state = 'open', mode = 'editor', restore = false, size = {}) {
        const source = registry.createBetterInstance('giveaway', { instanceId: 'source', width: 420, height: 270, config: themed('giveaway', theme === 'candy' ? 'gladiator' : 'candy', live(state)) });
        const chat = registry.createBetterInstance('chat', { instanceId: 'chat-a', width: size.width || 378, height: size.height || 659, config: themed('chat', theme, { giveawayInChat: true, shoutoutInChat: false, bttvEnabled: false, ...size.chatConfig }) });
        const second = registry.createBetterInstance('chat', { instanceId: 'chat-b', width: 378, height: 659, config: themed('chat', 'arctic', { giveawayInChat: true, shoutoutInChat: false, bttvEnabled: false }) });
        const instances = restore ? JSON.parse(localStorage.getItem('giveaway-theme-layout')) : [chat, second, source];
        localStorage.setItem('giveaway-theme-layout', JSON.stringify(instances));
        const render = (instance, id) => h('div', { id, style: { width: instance.width, height: instance.height } }, registry.renderBetterWidgetInstance({ instance, layout: { instances }, mode: mode === 'sample' || size.messages ? 'mock' : 'live', runtime: mode === 'obs' ? 'obs' : 'editor', accessVerified: true }));
        root.render(h('main', { style: { display: 'flex', gap: 20, padding: 10 } }, ...instances.map((instance, i) => render(instance, ['chat-a', 'chat-b', 'standalone'][i]))));
        return resolveEmbeddedGiveawayConfig(instances[0].config, instances[2].config);
      },
      controls() {
        function Controls() {
          const [config, setConfig] = React.useState(themed('chat', 'candy', { giveawayCustomAppearance: true }));
          return h(ChatGiveawayAppearanceControls, { config, onChange: setConfig, allWidgets: [] });
        }
        root.render(h(Controls));
      },
    };
  };
  await page.goto(base + '/__giveaway-themes');
  await page.evaluate(initialize);
  const keys = await page.evaluate(() => window.giveawayThemes.keys);
  assert.equal(await page.evaluate(() => window.giveawayThemes.matrix()), keys.length ** 2);
  let renders = 0;
  for (const mode of ['editor', 'obs', 'sample']) for (const theme of keys) for (const state of ['open', 'drawing', 'winner']) {
    const expected = await page.evaluate(({ theme, state, mode }) => window.giveawayThemes.render(theme, state, mode), { theme, state, mode });
    await page.waitForFunction(theme => document.querySelector('#chat-a .ov-chat-giveaway')?.dataset.giveawayTheme === theme, {}, theme);
    await new Promise(resolve => setTimeout(resolve, 90));
    assert.equal(await page.$eval('#chat-b .ov-chat-giveaway', el => el.dataset.giveawayTheme), 'arctic', 'second chat keeps its own theme');
    assert.equal(await page.$eval('#standalone [data-widget-type=giveaway]', el => el.dataset.colourTheme), theme === 'candy' ? 'gladiator' : 'candy', 'standalone appearance independent');
    const style = await page.$eval('#chat-a .ov-chat-giveaway', el => ({ bg: getComputedStyle(el).getPropertyValue('--gw-result-surface').trim(), name: el.textContent }));
    assert.equal(style.bg, expected.bgColor, theme + '/' + mode + '/' + state + ' visible resolved palette');
    if (mode === 'sample') assert.match(style.name, /Giveaway #1/);
    else assert.match(style.name, state === 'winner' ? /ViewerTwo/ : state === 'drawing' ? /Drawing/ : /Connected giveaway/);
    if (await page.$('#chat-a :is(.street-giveaway-notice,.studio-giveaway-notice,.gc-giveaway-notice)')) {
      const actual=await page.$eval('#chat-a :is(.street-giveaway-notice,.studio-giveaway-notice,.gc-giveaway-notice)',el=>getComputedStyle(el).backgroundColor);
      const wanted=await page.evaluate(value=>{const el=document.createElement('span');el.style.backgroundColor=value;document.body.append(el);const colour=getComputedStyle(el).backgroundColor;el.remove();return colour},expected.bgColor);
      assert.equal(actual,wanted,'native notice follows the owning chat surface');
    } else if (await page.$('#chat-a .premium-giveaway-notice')) {
      const actual = await page.$eval('#chat-a .solverde-giveaway-notice', el => getComputedStyle(el).backgroundColor);
      const wanted = await page.evaluate(value => { const el=document.createElement('span');el.style.backgroundColor=value;document.body.append(el);const color=getComputedStyle(el).backgroundColor;el.remove();return color; }, expected.bgColor);
      assert.equal(actual,wanted,'native Solverde notice uses the resolved giveaway surface');
    } else if (mode === 'sample' || state !== 'winner') {
      assert(await page.$('#chat-a .better-giveaway-widget'),JSON.stringify({theme,state,mode,html:await page.$eval('#chat-a .ov-chat-giveaway',e=>e.innerHTML.slice(0,500))}));
      assert.equal(await page.$eval('#chat-a .better-giveaway-widget', el => getComputedStyle(el).getPropertyValue('--w-bg').trim()), expected.bgColor, 'actual open/drawing renderer receives chat surface');
    }
    if(mode !== 'sample' && state === 'drawing') {
      await page.waitForSelector('#chat-a [data-giveaway-state=drawing] .better-gw-roulette-stage.is-measured');
      const bounds=await page.evaluate(()=>{
        const rect=selector=>{const r=document.querySelector('#chat-a '+selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
        return {bay:rect('.ov-chat-giveaway'),viewport:rect('.better-gw-roulette-viewport'),status:rect('.better-gw-roulette-status'),messages:rect('.ov-chat-messages'),header:rect('.better-gw-header'),avatar:rect('.better-gw-avatar-bubble'),name:rect('.better-gw-avatar-name')};
      });
      for(const key of ['viewport','status','header'])assert(bounds[key].top>=bounds.bay.top-1&&bounds[key].bottom<=bounds.bay.bottom+1,theme+'/'+mode+' '+key+' inside reserved giveaway bay: '+JSON.stringify(bounds));
      assert(bounds.viewport.height>=70,theme+' usable roulette viewport');
      assert(bounds.name.bottom<=bounds.viewport.bottom+1&&bounds.avatar.top>=bounds.viewport.top-1,theme+' complete participant avatars and names');
      assert(bounds.messages.top>=bounds.bay.bottom-1,theme+' messages start beneath drawing');
      if(mode==='obs')await page.screenshot({path:'.codex-dev/giveaway-theme-verification/drawing-'+theme+'.png'});
    }
    if (mode !== 'sample' && state === 'winner' && !['arctic', 'orbital', 'candy'].includes(theme)) {
      const actual = await page.$eval('#chat-a .better-gw-result-name', el => getComputedStyle(el).color);
      const wanted = await page.evaluate(({ value, theme }) => { const el = document.createElement('span'); el.style.color = theme === 'old_rome' ? 'var(--theme-text-primary)' : value; document.querySelector('#chat-a .ov-chat-giveaway').append(el); const color = getComputedStyle(el).color; el.remove(); return color; }, { value: expected.textColor, theme });
      assert.equal(actual, wanted, theme + ' winner uses theme text colour');
      assert.equal(await page.$eval('#chat-a .better-gw-result-frost', el => getComputedStyle(el).display), 'none');
    }
    if (mode === 'obs' && ['candy', 'arctic', 'old_rome', 'orbital'].includes(theme)) await page.screenshot({ path: `.codex-dev/giveaway-theme-verification/${theme}-${state}.png` });
    renders++;
  }
  for(const theme of keys){
    await page.evaluate(theme=>window.giveawayThemes.render(theme,'drawing','obs',false,{width:280,height:440}),theme);
    await page.waitForFunction(theme=>document.querySelector('#chat-a [data-giveaway-state=drawing]')?.dataset.giveawayTheme===theme,{},theme);
    await new Promise(r=>setTimeout(r,120));
    const fits=await page.evaluate(()=>{const bay=document.querySelector('#chat-a .ov-chat-giveaway').getBoundingClientRect(),status=document.querySelector('#chat-a .better-gw-roulette-status').getBoundingClientRect(),viewport=document.querySelector('#chat-a .better-gw-roulette-viewport').getBoundingClientRect(),name=document.querySelector('#chat-a .better-gw-avatar-name').getBoundingClientRect();return {bay:bay.height,viewport:viewport.height,status:status.bottom<=bay.bottom+1,name:name.bottom<=viewport.bottom+1};});
    assert(fits.viewport>=30&&fits.status&&fits.name,theme+' narrow chat retains complete reel: '+JSON.stringify(fits));
  }
  for(const theme of ['street_art','candy'])for(const runtime of ['editor','obs'])for(const chatStyle of ['better_chat','broadcast_chat','community_chat','classic','floating','stack']){
    await page.evaluate(({theme,runtime,chatStyle})=>window.giveawayThemes.render(theme,'winner',runtime,false,{messages:true,chatConfig:{chatStyle,flow:'top-to-bottom',entry:'bottom',animation:'none',twitchEnabled:false,__appearancePreviewMessages:[{id:'one',username:'FirstViewer',message:'First message',platform:'twitch'},{id:'two',username:'NewestViewer',message:'Newest message above the decorations',platform:'twitch'}]}}),{theme,runtime,chatStyle});
    await new Promise(r=>setTimeout(r,250));
    const geometry=await page.evaluate(()=>{const list=document.querySelector('#chat-a .ov-chat-messages'),r=list.getBoundingClientRect(),rows=[...list.children].map(el=>el.getBoundingClientRect()).filter(r=>r.height>0),last=rows.at(-1),prop=document.querySelector('#chat-a .street-chat-props,#chat-a .candy-decoration--jar').getBoundingClientRect(),giveaway=document.querySelector('#chat-a .ov-chat-giveaway').getBoundingClientRect();return {propTop:prop.top,lastBottom:last?.bottom,listBottom:r.bottom,gap:last?r.bottom-last.bottom:999,above:!!last&&last.bottom>prop.top,pinned:giveaway.bottom<=r.top+2,flow:getComputedStyle(list).justifyContent};});
    assert.equal(geometry.flow,'flex-end',theme+'/'+runtime+'/'+chatStyle+' renders over props');
    assert(geometry.gap>=0&&geometry.gap<20&&geometry.above&&geometry.pinned,JSON.stringify({theme,runtime,chatStyle,geometry}));
    if(runtime==='obs'&&chatStyle==='broadcast_chat')await page.screenshot({path:'.codex-dev/giveaway-theme-verification/bottom-anchored-'+theme+'.png'});
  }
  for(const theme of ['street_art','candy']){
    await page.evaluate(theme=>window.giveawayThemes.render(theme,'open','obs',false,{chatConfig:{flow:'top-to-bottom',entry:'top',decoratedChatFlowVersion:1}}),theme);await new Promise(r=>setTimeout(r,100));
    assert.equal(await page.$eval('#chat-a .ov-chat-messages',el=>getComputedStyle(el).justifyContent),'flex-start','explicit top-down flow stays configurable');
  }
  await page.evaluate(() => window.giveawayThemes.render('candy', 'winner', 'obs'));
  await page.reload(); await page.evaluate(initialize);
  await page.evaluate(() => window.giveawayThemes.render('candy', 'winner', 'obs', true));
  await page.waitForSelector('#chat-a [data-giveaway-theme=candy] .better-gw-result-card');
  await page.evaluate(() => window.giveawayThemes.controls());
  await page.waitForSelector('.chat-giveaway-appearance-controls');
  assert.equal(await page.$('.chat-giveaway-appearance-controls .bp-theme-grid'), null, 'nested theme controls belong to chat');
  assert.equal(await page.$('.chat-giveaway-appearance-controls [data-effects-theme]'), null, 'nested effects belong to chat');
  assert.deepEqual(errors, []);
  console.log(`Embedded giveaway: ${keys.length ** 2} theme pairs, ${renders} real rendered states, independent instances, stale custom snapshots, reload and controls: PASS`);
} finally { await browser?.close(); await server.close(); }
