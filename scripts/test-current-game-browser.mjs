import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { combineSlotResults } from '../shared/slotPersonalBest.js';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3011';
const origin = new URL(base).origin;
const slot = { id: 'a9b7585a-91a9-4df0-91d1-4f2b5431ef14', name: 'Le Vampire', provider: 'Hacksaw Gaming', rtp: 97.57, volatility: 'high', max_win_multiplier: 15000,
  image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOZqT7owAHtJL2bY-fWjOdPdkytAFU8_oE57sIfpUaxg&s' };
const owner = '33333333-3333-4333-8333-333333333333';
const legacy = { slot_id: slot.id, slot_name: slot.name, slot_provider: slot.provider, best_win: 540, best_multiplier: 108 };
const rows = [{ id: 'hunt-result', user_id: owner, slot_name: slot.name, slot_provider: slot.provider, bet_size: 5, payout: 540, multiplier: 108, hunt_name: 'Test hunt', created_at: '2026-10-01T12:00:00Z' }];
let uncertain = true, writeCount = 0;
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    const json = (body, status=200) => request.respond({ status, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body:JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return request.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':request.headers()['access-control-request-headers'] || '*'}});
    if (url.pathname === '/__current-game-test') return request.respond({contentType:'text/html',body:`<html><body style="margin:0;padding:20px;background:#071019;font-family:Arial"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>`});
    if (url.pathname === '/rest/v1/slots') return json(url.searchParams.get('name')?.startsWith('ilike.') ? [slot] : { ...slot, name: url.searchParams.get('name')?.replace(/^eq\./, '') || slot.name });
    if (url.pathname === '/rest/v1/user_slot_records') return json([legacy]);
    if (url.pathname === '/rest/v1/bonus_hunt_history') return json([]);
    if (url.pathname === '/rest/v1/user_slot_results') {
      assert.equal(url.searchParams.get('user_id') || (request.method()==='POST' ? `eq.${JSON.parse(request.postData()).user_id}` : ''), `eq.${owner}`);
      if (request.method()==='POST') {
        writeCount++;
        const row=JSON.parse(request.postData());
        if(rows.some(item=>item.id===row.id)) return json({code:'23505',message:'duplicate'},409);
        rows.unshift({...row,created_at:new Date().toISOString()});
        if(uncertain){uncertain=false;return json({message:'Response lost; retry this save'},503);}
        return json(null,201);
      }
      const id=url.searchParams.get('id')?.replace('eq.','');
      return json(id ? rows.find(row=>row.id===id) : rows);
    }
    if (url.pathname === '/api/slot-personal-best') return json({best:combineSlotResults(legacy,rows,slot)});
    if(url.origin===origin || url.hostname==='encrypted-tbn0.gstatic.com') return request.continue();
    return request.abort();
  });
  await page.goto(base+'/__current-game-test');
  const entry=await(await fetch(base+'/src/main.jsx')).text();
  const configModule=await(await fetch(base+'/src/components/OverlayCenter/widgets/current-slot/CurrentSlotConfig.jsx')).text();
  const dependencies={react:entry.match(/from "([^"\n]*\/react.js\?[^"\n]*)"/)[1],dom:entry.match(/from "([^"\n]*\/react-dom_client.js\?[^"\n]*)"/)[1],router:configModule.match(/from "([^"\n]*react[_-]router[_-]dom[^"\n]*)"/)[1]};
  await page.evaluate(async ({dependencies,owner,slot})=>{
    const {default:React}=await import(dependencies.react),{default:DOM}=await import(dependencies.dom);
    const {MemoryRouter}=await import(dependencies.router);
    const {supabase}=await import('/src/config/supabaseClient.js');
    supabase.auth.getSession=async()=>({data:{session:{user:{id:owner,user_metadata:{}}}},error:null});
    supabase.auth.onAuthStateChange=()=>({data:{subscription:{unsubscribe(){}}}});
    supabase.channel=()=>{const channel={on:()=>channel,subscribe:()=>channel};return channel;};
    supabase.removeChannel=()=>{};
    const {AuthProvider}=await import('/src/context/AuthContext.jsx');
    const {default:Config}=await import('/src/components/OverlayCenter/widgets/current-slot/CurrentSlotConfig.jsx');
    const {default:Widget}=await import('/src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.jsx');
    const registry=await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const {setScopedAppearanceConfigValue}=await import('/src/components/OverlayCenter/appearance/v2/appearanceRouting.js');
    const {applyWidgetColourTheme}=await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
    let styledConfig={slot,displayStyle:'immersive_current'};
    for(const [elementId,propertyId,value] of [['slotTitle','textColor','#ff0000'],['slotImage','imageUrl','/favicon.ico']]) {
      styledConfig=setScopedAppearanceConfigValue(styledConfig,{widgetType:'current_slot',widgetVariant:'immersive_current',elementId,propertyId},value);
    }
    styledConfig=JSON.parse(JSON.stringify(registry.createBetterInstance('current_slot',{config:styledConfig}))).config;
    window.currentTheme=applyWidgetColourTheme('current_slot',{},'arctic');
    const {WIDGET_COLOUR_THEMES}=await import('/src/components/OverlayCenter/widgets/shared/colourThemePalettes.js');
    const {BetterWidgetControls}=await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    window.themePalette=WIDGET_COLOUR_THEMES;
    function Themes({runtime}) {
      const [config,setConfig]=React.useState(()=>JSON.parse(localStorage.getItem('test-current-theme') || JSON.stringify(setScopedAppearanceConfigValue(styledConfig,{widgetType:'current_slot',widgetVariant:'immersive_current',elementId:'bestMultiValue',propertyId:'textColor'},'#ff0000'))));
      const instance=registry.createBetterInstance('current_slot',{config});
      window.themeConfig=instance.config;
      return React.createElement(React.Fragment,null,
        React.createElement(BetterWidgetControls,{type:'current_slot',config,onChange:next=>{localStorage.setItem('test-current-theme',JSON.stringify(next));setConfig(next);}}),
        React.createElement('div',{style:{width:1320,height:290}},registry.renderBetterWidgetInstance({instance,layout:{instances:[instance]},userId:owner,runtime})));
    }
    const root=DOM.createRoot(document.getElementById('root'));
    function App(){const [config,setConfig]=React.useState(JSON.parse(localStorage.getItem('test-current-config')||'{}'));return React.createElement(Config,{config,onChange:value=>{localStorage.setItem('test-current-config',JSON.stringify(value));setConfig(value);}});}
    window.currentTest={
      themes:runtime=>root.render(React.createElement(Themes,{runtime,key:runtime})),
      mount:()=>root.render(React.createElement(MemoryRouter,null,React.createElement(AuthProvider,null,React.createElement(App)))),
      obs:()=>root.render(React.createElement('div',{style:{height:290,width:1320}},registry.renderBetterWidgetInstance({instance:registry.createBetterInstance('current_slot'),layout:{instances:[]},userId:owner,publicOverlayId:'bo_'+'a'.repeat(48),liveWidgets:[{id:'source',widget_type:'current_slot',config:JSON.parse(localStorage.getItem('test-current-config'))}],runtime:'obs'}))),
      styled:()=>root.render(React.createElement('div',{style:{height:290,width:1320}},React.createElement(Widget,{widgetId:'appearance-test',userId:owner,config:styledConfig}))),
      layout:(width,height,config={},runtime='editor')=>root.render(React.createElement('div',{style:{width,height}},registry.renderBetterWidgetInstance({instance:registry.createBetterInstance('current_slot',{width,height,config:{slot,...config}}),layout:{instances:[]},userId:owner,runtime}))),
      unmount:()=>root.render(null),
    };
    window.currentTest.mount();
  },{dependencies,owner,slot});
  await page.type('input[placeholder="Type a slot name…"]','Vampire');
  await page.waitForSelector('.cg-search-results button');
  await page.click('.cg-search-results button');
  await page.waitForFunction(()=>document.querySelector('[data-better-element="bestWinValue"]')?.textContent.includes('540'));
  const fill=async(selector,value)=>{await page.$eval(selector,e=>e.select());await page.type(selector,value);};
  await fill('[name=current-bet]','2');await fill('[name=current-payout]','400');
  await page.click('button[type=submit]');
  await page.waitForFunction(()=>document.querySelector('button[type=submit]')?.textContent==='Retry this save');
  assert.equal(rows.length,2);
  await page.click('button[type=submit]');
  await page.waitForFunction(()=>document.body.textContent.includes('Result saved to your shared slot history'));
  assert.equal(rows.length,2,'Uncertain response retry must not duplicate payment');
  assert.equal(writeCount,2);
  await page.waitForFunction(()=>document.querySelector('[data-better-element="bestMultiValue"]')?.textContent.includes('200x'));
  assert.match(await page.$eval('[data-better-element="bestWinValue"]',e=>e.textContent),/540/);
  assert.match(await page.$eval('[data-better-element="averageWinValue"]',e=>e.textContent),/470/);
  await fill('[name=current-payout]','0');await page.click('button[type=submit]');
  await page.waitForFunction(()=>document.querySelectorAll('.cg-page tbody tr').length===3);
  assert.equal(rows.length,3);
  for(const width of [1920,1440,1024,768,430,390,360]){
    await page.setViewport({width,height:1000});
    const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,preview:document.querySelector('.cg-widget').getBoundingClientRect().toJSON()}));
    assert.ok(geometry.scroll<=width,`No page overflow at ${width}: ${geometry.scroll}`);
    assert.ok(geometry.preview.right<=width && geometry.preview.width>0);
  }
  await page.setViewport({width:1440,height:1000});
  await page.evaluate(()=>window.currentTest.unmount());await page.waitForFunction(()=>!document.querySelector('.cg-page'));
  await page.evaluate(()=>window.currentTest.mount());
  await page.waitForFunction(()=>document.querySelector('.cg-name-block')?.textContent.includes('Le Vampire') && document.querySelectorAll('.cg-page tbody tr').length===3);
  await page.evaluate(()=>window.currentTest.obs());
  await page.waitForFunction(()=>document.querySelector('[data-better-element="bestMultiValue"]')?.textContent.includes('200x'));
  assert.match(await page.$eval('[data-better-element="slotTitle"]',e=>e.textContent),/Le Vampire/);
  await page.screenshot({path:'.codex-dev/current-game-widget.png'});
  await page.evaluate(()=>window.currentTest.styled());
  await page.waitForFunction(()=>document.querySelector('[data-better-element="slotTitle"]')?.style.color==='rgb(255, 0, 0)');
  assert.match(await page.$eval('[data-better-element="slotImage"]',e=>e.src),/favicon.ico/);
  assert.equal(await page.evaluate(()=>window.currentTheme.colourTheme),'arctic');
  assert.ok(await page.evaluate(()=>/^#[a-f0-9]{6}$/i.test(window.currentTheme.accentColor)));
  const palette=await page.evaluate(()=>window.themePalette);
  for(const runtime of ['editor','obs']) {
    await page.evaluate(runtime=>window.currentTest.themes(runtime),runtime);
    await page.waitForSelector('[data-colour-theme-key="neon"]');
    for(const theme of palette) {
      await page.click('[data-colour-theme-key="'+theme.key+'"]');
      await page.waitForFunction(key=>document.querySelector('[data-colour-theme-key="'+key+'"]')?.getAttribute('aria-pressed')==='true',{},theme.key);
      const state=await page.evaluate(()=>({
        config:window.themeConfig,
        accent:document.querySelector('.cg-widget').style.getPropertyValue('--cg-accent'),
        panel:document.querySelector('.cg-widget').style.getPropertyValue('--cg-panel'),
        badge:document.querySelector('.cg-widget').style.getPropertyValue('--cg-badge'),
        best:document.querySelector('[data-better-element="bestMultiValue"]').style.color,
      }));
      assert.equal(state.best,'rgb('+theme.accent.slice(1).match(/../g).map(hex=>parseInt(hex,16)).join(', ')+')', 'Rendered record uses selected accent');
      assert.equal(state.accent,theme.accent, runtime+' '+theme.key+' accent');
      assert.equal(state.panel,theme.surface, runtime+' '+theme.key+' panel');
      assert.equal(state.badge,theme.raised, runtime+' '+theme.key+' badge');
      assert.equal(state.config.__appearanceExplicitSubElements.bestMultiValue.textColor,theme.accent,'Saved element override follows palette');
      assert.equal(state.config.__appearanceExplicitSubElements.slotTitle.textColor,theme.text);
      assert.equal(state.config.slot.id,slot.id,'Theme does not change game selection');
      assert.equal(state.config.__appearanceExplicitSubElements.slotImage.imageUrl,'/favicon.ico','Theme preserves artwork');
    }
  }
  assert.ok(palette.length >= 14);
  for (const runtime of ['editor','obs']) {
    for (const [width,height] of [[1100,240],[2048,446],[1320,290],[680,140],[1920,420],[1100,180],[680,400]]) {
      await page.setViewport({width:Math.max(1440,width+40),height:1000,deviceScaleFactor:1});
      await page.evaluate(({width,height,runtime})=>window.currentTest.layout(width,height,{},runtime),{width,height,runtime});
      await page.waitForFunction(()=>document.querySelector('.cg-widget')?.clientWidth > 0);
      const dimensions=await page.evaluate(()=>{
        const widget=document.querySelector('.cg-widget'),box=widget.getBoundingClientRect();
        const info=[...document.querySelectorAll('.cg-info .cg-stat')].map(e=>e.getBoundingClientRect().toJSON());
        const records=[...document.querySelectorAll('.cg-records .cg-stat')].map(e=>e.getBoundingClientRect().toJSON());
        const style=selector=>getComputedStyle(widget.querySelector(selector));
        const cover=widget.querySelector('.cg-cover').getBoundingClientRect();
        return {cover:{width:cover.width,height:cover.height},fonts:{title:parseFloat(style('h2').fontSize),heading:parseFloat(style('h3').fontSize),label:parseFloat(style('.cg-stat > span').fontSize),value:parseFloat(style('.cg-stat strong').fontSize),provider:parseFloat(style('.cg-name-block p').fontSize),badge:parseFloat(style('.cg-current').fontSize)},icon:parseFloat(style('h3 svg').width),gap:parseFloat(style('.cg-info').rowGap),radius:parseFloat(style('.cg-stat').borderRadius),padding:parseFloat(style('.cg-stat').paddingLeft),width:box.width,height:box.height,info,records,overflow:[...widget.querySelectorAll('.cg-stat,.cg-name-block,h3')].filter(e=>e.scrollWidth>e.clientWidth+1 || e.scrollHeight>e.clientHeight+1).map(e=>e.className || e.tagName),title:parseFloat(getComputedStyle(widget.querySelector('h2')).fontSize)};
      });
      const scale=Math.min(width/1100,height/240);
      const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<.1,label+': '+actual+' expected '+expected);
      near(dimensions.width,1100*scale,'Reference width');
      near(dimensions.height,240*scale,'Reference height');
      near(dimensions.cover.width,135*scale,'Artwork width');
      near(dimensions.cover.height,205*scale,'Artwork height');
      for(const [key,value] of Object.entries({title:27,heading:18,label:15,value:19,provider:12,badge:13})) near(dimensions.fonts[key],value*scale,key);
      near(dimensions.icon,23*scale,'Header icon');
      near(dimensions.gap,6*scale,'Row gap');
      near(dimensions.radius,10*scale,'Card radius');
      near(dimensions.padding,12*scale,'Card horizontal padding');
      dimensions.info.forEach(row=>near(row.height,51*scale,'Card height'));
      assert.deepEqual(dimensions.overflow,[],runtime+' overflow at '+width+'x'+height);
      dimensions.info.forEach((row,i)=>{assert.ok(Math.abs(row.y-dimensions.records[i].y)<1);assert.ok(Math.abs(row.height-dimensions.records[i].height)<1);});
      if((width===1100 && height===240) || width===2048) {
        await (await page.$('.cg-viewport')).screenshot({path:'.codex-dev/current-slot-compact-'+width+'-'+runtime+'.png'});
        if(width===1100) {
          await page.setViewport({width:1440,height:1000,deviceScaleFactor:2});
          const dpiSize=await page.$eval('.cg-widget',e=>({width:e.getBoundingClientRect().width,title:getComputedStyle(e.querySelector('h2')).fontSize}));
          near(dpiSize.width,1100,'High DPI preserves CSS size');
          near(parseFloat(dpiSize.title),27,'High DPI preserves font size');
          await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
        }
      }
    }
    // Long names pass through the same config and catalog lookup as the normal selection.
    await page.evaluate(runtime=>window.currentTest.layout(1100,240,{slot:{name:'Gates of Olympus 1000',provider:'Pragmatic Play'}},runtime),runtime);
    await page.waitForFunction(()=>document.querySelector('.cg-name-block h2')?.textContent==='Gates of Olympus 1000');
    const longTitle=await page.$eval('.cg-name-block',e=>({width:e.clientWidth,scroll:e.scrollWidth,height:e.getBoundingClientRect().height,parent:e.parentElement.getBoundingClientRect().height}));
    assert.ok(longTitle.scroll<=longTitle.width+1 && longTitle.height<=longTitle.parent);
    await (await page.$('.cg-widget')).screenshot({path:'.codex-dev/current-slot-long-title-'+runtime+'.png'});
    await page.evaluate(runtime=>window.currentTest.layout(1100,240,{showArtwork:false,showPersonalRecords:false},runtime),runtime);
    await page.waitForFunction(()=>!document.querySelector('.cg-records') && !document.querySelector('.cg-cover'));
    assert.equal(await page.$$eval('.cg-widget > .cg-info',els=>els.length),1);
  }
  assert.deepEqual(errors,[]);
  console.log('All registered Current Game themes passed through the real picker in editor and OBS, including saved element overrides and reload.');
  console.log('Current Game browser checks passed: real catalog artwork, selection, shared records, payment retry, zero payout, reload, seven widths, OBS and independent appearance.');
} finally {await browser.close();}
