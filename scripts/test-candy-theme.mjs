import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { normalizeCandySettings, candyWidgetPalette } from '../src/effects/ThemeEffects/candy/candyTheme.js';
assert.deepEqual(normalizeCandySettings({background:false,decorations:false,motion:true}),{background:false,decorations:false,motion:true});
assert.equal(candyWidgetPalette('chat',{key:'arctic',text:'#fff'}).text,'#fff');
const server=await createServer({logLevel:'silent',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const base=server.resolvedUrls.local[0].replace(/\/$/,'');
const browser=await puppeteer.launch({headless:true});
mkdirSync('.codex-dev/candy-verification',{recursive:true});
try {
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.setViewport({width:1920,height:1080});await page.setRequestInterception(true);
 page.on('request',async r=>{const u=new URL(r.url());
 if(u.pathname==='/__candy')return r.respond({contentType:'text/html',body:`<html><head><style>html,body{margin:0;background:transparent}*{box-sizing:border-box}</style></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>`});
 if(u.origin===base&&!u.pathname.startsWith('/api/'))return r.continue();
 if(['data:','blob:'].includes(u.protocol))return r.continue();
 if(r.method()==='OPTIONS')return r.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
 if(r.resourceType()==='image')return r.respond({contentType:'image/webp',body:readFileSync('public/player.webp')});
 return r.respond({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'[]'});
 });
 await page.goto(base+'/__candy');
 const {browserHash}=JSON.parse(readFileSync('node_modules/.vite/deps/_metadata.json','utf8'));
 const initialize=async version=>{
 const React=(await import('/node_modules/.vite/deps/react.js?v='+version)).default;
 const ReactDOM=(await import('/node_modules/.vite/deps/react-dom_client.js?v='+version)).default;
 const registry=await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
 const themes=await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
 const {applyCandyComposition}=await import('/src/components/OverlayCenter/editor/candyComposition.js');
 const {BetterWidgetControls}=await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
 await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
 await import('/src/components/OverlayCenter/OverlayRenderer.css');
 await import('/src/components/OverlayCenter/editor/BetterObsOverlay.css');
 const root=ReactDOM.createRoot(document.getElementById('root')),h=React.createElement;
 window.candy={registry,themes,applyCandyComposition,
 config(type,extra={}){return themes.applyWidgetColourTheme(type,{...registry.getBetterWidgetDefinition(type).defaultConfig,...extra},'candy');},
 scene({runtime='editor',populated=false,decorations=true,background=true,single='',theme='candy'}={}){
 const types=single?[single]:['background','navbar','bonus_hunt','rtp_stats','slideshow_frame','chat'];
 const extra={bonus_hunt:{orientation:'vertical',statsLayout:'grid',showRequests:true,drawerMode:'contain',sessionState:'hunt',winEffects:false,bonuses:populated?[{id:'one',slotName:'Gates of Olympus 1000 — a particularly long slot title',provider:'Pragmatic Play',betSize:4,payout:4500,opened:true,image:'/player.webp'},{id:'two',slotName:'Sweet Bonanza',betSize:2,payout:0,opened:false,image:'/player.webp'}]:[],requests:[],start:2000},navbar:{displayName:'StreamersCenter',motto:'Your stream, your style',showCrypto:false},chat:{showHeader:true,headerTitle:'LIVE',__appearancePreviewMessages:populated?Array.from({length:18},(_,i)=>({id:String(i),username:'Viewer '+i,message:'A readable chat message with a long username and more text '+i,text:'Candy theme — olá a todos! '+i})):[]},slideshow_frame:{mediaText:''}};
 let instances=types.map((type,i)=>registry.createBetterInstance(type,{instanceId:'candy-'+type,zIndex:i,x:0,y:0,width:single?900:380,height:single?650:300,config:themes.applyWidgetColourTheme(type,{...this.config(type,extra[type]),candy:{decorations,background}},theme)}));
 if(!single)instances=registry.normalizeBetterLayout(applyCandyComposition({instances})).instances;
 this.instances=instances;this.runtime=runtime;
 root.render(h('div',{style:{position:'relative',width:1920,height:1080,transform:`scale(${innerWidth/1920})`,transformOrigin:'top left'}},...instances.map(instance=>h('div',{key:instance.instanceId,'data-fixture-widget':instance.widgetType,style:{position:'absolute',left:instance.x,top:instance.y,width:instance.width,height:instance.height,zIndex:instance.zIndex}},registry.renderBetterWidgetInstance({instance,layout:{instances},mode:populated?'mock':'live',runtime,accessVerified:true})))));
 },
 controls(type){const app=this;function Controls(){const [c,set]=React.useState(app.config(type));window.candy.controlConfig=c;return h('div',{style:{width:420}},h(BetterWidgetControls,{type,config:c,onChange:set}));}root.render(h(Controls,{key:type}));},
 renderConfig(instance,runtime='editor',mode='live',companions=[]){this.instances=[instance,...companions];root.render(h('div',{style:{width:instance.width,height:instance.height}},registry.renderBetterWidgetInstance({instance,layout:{instances:this.instances},mode,runtime,accessVerified:true})));}
 };window.candy.scene();
 };await page.evaluate(initialize,browserHash);
 const wait=()=>new Promise(r=>setTimeout(r,800));await page.waitForSelector('.candy-hunt-composition');await wait();
 await page.screenshot({path:'.codex-dev/candy-verification/reference-empty.png'});
 writeFileSync('.codex-dev/candy-verification/dom.json',JSON.stringify(await page.$$eval('[data-colour-theme]',nodes=>nodes.map(root=>({type:root.dataset.widgetType,elements:[...root.querySelectorAll('*')].map(el=>({tag:el.tagName,class:typeof el.className==='string'?el.className:'',part:el.dataset.widgetElement||el.dataset.appearancePart||el.dataset.betterElement,text:el.children.length?'':el.textContent.slice(0,100)}))}))),null,2));
 assert.equal(await page.$$eval('.candy-module',n=>n.length),5);
 for(const runtime of ['editor','obs']){
 await page.evaluate(runtime=>window.candy.scene({runtime,populated:true}),runtime);await wait();
 await page.screenshot({path:`.codex-dev/candy-verification/populated-${runtime}.png`});
 assert.equal(await page.$$eval('.candy-decoration',els=>els.length),2);
 assert.equal(await page.$$eval('.theme-effects-layer__canvas',els=>els.length),0,'no extra WebGL canvas');
 assert(await page.evaluate(()=>{const chat=document.querySelector('.ov-chat-widget').getBoundingClientRect(),jar=document.querySelector('.candy-decoration--jar').getBoundingClientRect();return chat.bottom<=jar.top+1;}),'chat content stops above the jar decoration');
 const sizes=await page.$$eval('[data-fixture-widget]',els=>els.map(el=>{const r=el.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]}));assert(sizes.every(([l,t,r,b])=>l>=0&&t>=0&&r<=1920&&b<=1080),'reference widgets contained');
 }
 for(const type of ['current_slot','slot_bingo','connect_four','tournament','bonus_hunt','giveaway','navbar','chat','rtp_stats','slideshow_frame','bets','raid_shoutout']){
 await page.evaluate(type=>window.candy.scene({single:type,populated:true}),type);await wait();
 assert(await page.$('.candy-module'),type+' receives material');
 await page.screenshot({path:`.codex-dev/candy-verification/widget-${type}.png`});
 }
 await page.evaluate(()=>window.candy.scene({decorations:false,background:false}));await wait();
 assert.equal(await page.$$eval('.candy-decoration,.candy-capsules,.candy-lollipop,.candy-environment-image,.candy-environment-sweets',n=>n.length),0,'independent transparency controls');
 const preset=await page.evaluate(()=>{const original={instances:window.candy.instances};const copy=JSON.stringify(original),next=window.candy.applyCandyComposition(original);return {immutable:copy===JSON.stringify(original),stable:JSON.stringify(next)===JSON.stringify(window.candy.applyCandyComposition(next)),roundTrip:JSON.stringify(window.candy.registry.normalizeBetterLayout(JSON.parse(JSON.stringify(next))).instances.map(x=>x.config.candy))};});assert(preset.immutable&&preset.stable);
 for(const [width,height] of [[2560,1440],[1366,768]]){await page.setViewport({width,height});await page.evaluate(()=>window.candy.scene());await wait();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`.codex-dev/candy-verification/reference-${width}.png`});}

 await page.setViewport({width:1920,height:1080});
 await page.evaluate(()=>window.candy.controls('background'));await page.waitForSelector('[data-effects-theme="candy"] .bp-toggle');
 const toggle=async label=>{const handles=await page.$$('.bp-toggle');for(const handle of handles){if(await handle.evaluate((el,label)=>el.querySelector('strong')?.textContent===label,label)){await handle.click();return;}}throw new Error('Missing toggle '+label);};
 await toggle('Candy-shop background');await toggle('Candy decorations');await toggle('Gentle candy motion');
 const saved=await page.evaluate(()=>{const config=window.candy.controlConfig;localStorage.setItem('candy-regression-config',JSON.stringify(config));return config;});
 assert.deepEqual(saved.candy,{background:false,decorations:false,motion:true});
 await page.reload();await page.evaluate(initialize,browserHash);
 await page.evaluate(()=>{const config=JSON.parse(localStorage.getItem('candy-regression-config'));window.candy.renderConfig(window.candy.registry.createBetterInstance('background',{config}), 'obs');});await wait();
 assert.equal(await page.$('.candy-environment-image'),null,'saved background setting renders transparently after reload');
 await page.evaluate(()=>window.candy.controls('chat'));await page.waitForSelector('[data-colour-theme-key="candy"]');
 await page.click('[data-colour-theme-key="arctic"]');await wait();assert.equal(await page.$('[data-effects-theme="candy"]'),null);
 await page.click('[data-colour-theme-key="candy"]');await page.waitForSelector('[data-effects-theme="candy"]');
 const typed=await page.evaluate(()=>{const config=window.candy.controlConfig;return {text:config.text,panel:config.panel,font:config.font};});assert.equal(typed.text,'#30136C');assert.equal(typed.panel,'#DDF7FF');
 await page.click('[role="tab"][data-category="appearance"]');
 // Locate the actual message-font control, not an arbitrary style selector.
 const fonts=await page.$$('label.bp-text');let changedFont=false;
 for(const label of fonts){if(await label.evaluate(el=>el.querySelector('span')?.textContent==='Message font')){const select=await label.$('select');const value=await select.evaluate(el=>[...el.options].find(o=>o.textContent.includes('Impact'))?.value);assert(value);await select.select(value);changedFont=true;break;}}
 assert(changedFont,'message font control is available');
 const sliders=await page.$$('label.bp-slider');
 for(const label of sliders){if(await label.evaluate(el=>el.querySelector('em')?.textContent==='Message size')){const input=await label.$('input');await input.focus();await page.keyboard.press('End');break;}}
 const changed=await page.evaluate(()=>window.candy.controlConfig);assert(changed.font.includes('Impact'));assert.equal(changed.fontSize,20);
 await page.evaluate(config=>{const instance=window.candy.registry.createBetterInstance('chat',{width:378,height:659,config});window.candy.renderConfig(instance,'obs');},changed);await wait();
 assert((await page.$eval('.ov-chat-widget',el=>getComputedStyle(el).fontFamily)).includes('Impact'),'font reaches OBS renderer');
 assert.equal(await page.$eval('.ov-chat-widget',el=>getComputedStyle(el).fontSize),'20px','font size reaches OBS renderer');
 for(const [type,url] of [['image','/player.webp'],['video','/smoke_effect2.mp4']]){
  await page.evaluate(({type,url})=>{const config=window.candy.config('slideshow_frame',{mediaText:'',mediaItems:[{type,url}],fit:'contain',autoplay:true,videoMuted:true,videoLoop:true});window.candy.renderConfig(window.candy.registry.createBetterInstance('slideshow_frame',{width:378,height:248,config}),'obs');},{type,url});
  const selector=type==='image'?'.better-slideshow-frame img':'.better-slideshow-frame video';await page.waitForSelector(selector);
  if(type==='image') await page.waitForFunction(()=>document.querySelector('.better-slideshow-frame img')?.naturalWidth>0);
  else await page.waitForFunction(()=>document.querySelector('.better-slideshow-frame video')?.currentTime>.1);
  assert.equal(await page.$eval(selector,el=>getComputedStyle(el).objectFit),'contain');
  assert.equal(await page.$('.better-slideshow-frame__empty'),null,'guidance only appears when media is absent');
 }

 for(const runtime of ['editor','obs']){
  for(const decorations of [true,false]){
   await page.evaluate(({runtime,decorations})=>{const giveaway=window.candy.registry.createBetterInstance('giveaway',{config:window.candy.config('giveaway',{winner:{name:'CommunityWinner',avatarUrl:'/player.webp'},prize:'Community prize'})});const chat=window.candy.registry.createBetterInstance('chat',{width:378,height:659,config:window.candy.config('chat',{giveawayInChat:true,showHeader:true,candy:{decorations}})});window.candy.renderConfig(chat,runtime,'live',[giveaway]);},{runtime,decorations});await wait();
   const geometry=await page.evaluate(()=>{const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width};};return {inner:rect('.candy-module-content'),header:rect('.ov-chat-widget > [data-better-element=header]'),card:rect('.better-gw-result-card'),bay:rect('.ov-chat-giveaway'),messages:rect('.ov-chat-messages'),jar:document.querySelector('.candy-decoration--jar')?rect('.candy-decoration--jar'):null};});
   assert(geometry.card.top-geometry.header.bottom<20,'winner starts just below the chat header: '+JSON.stringify(geometry));
   assert(geometry.card.bottom<=geometry.bay.bottom+1,'winner fully fits compact bay: '+JSON.stringify(geometry));
   assert(geometry.messages.height>300,'Candy chat regains message space: '+JSON.stringify(geometry));
   if(decorations){assert(Math.abs(geometry.jar.width-geometry.inner.width*.34)<2,'jar uses half its previous 68% width');assert(geometry.messages.bottom<=geometry.jar.top+1,'messages stay above decoration');}else assert.equal(geometry.jar,null);
   await page.screenshot({path:`.codex-dev/candy-verification/chat-space-${runtime}-${decorations}.png`});
  }
  for(const type of ['current_slot','rtp_stats']){
   await page.evaluate(({runtime,type})=>{const config=window.candy.config(type,{slot:{name:'Current game',provider:'Pragmatic Play',image:'/player.webp'},provider:'Pragmatic Play',providerLogoUrl:'/player.webp',previewMode:true});window.candy.renderConfig(window.candy.registry.createBetterInstance(type,{width:type==='current_slot'?695:1114,height:type==='current_slot'?187:76,config}),runtime,'mock');},{runtime,type});await wait();
   const selector=type==='current_slot'?'.cg-provider-logo':'[data-better-element="provider"] img';
   await page.waitForSelector(selector);assert.equal(await page.$eval(selector,el=>getComputedStyle(el).filter),'brightness(0)',type+' provider uses black alpha silhouette in '+runtime);
   await page.screenshot({path:`.codex-dev/candy-verification/provider-${type}-${runtime}.png`});
  }
  for(const height of [44,48,56,76]){
   await page.evaluate(({height,runtime})=>{const config=window.candy.config('rtp_stats',{barHeight:58,barPadY:8,previewMode:true});window.candy.renderConfig(window.candy.registry.createBetterInstance('rtp_stats',{width:1114,height,config}),runtime,'mock');},{height,runtime});await wait();
   const geometry=await page.evaluate(()=>{const root=document.querySelector('.rtp-stats-bar'),box=root.getBoundingClientRect(),frame=document.querySelector('.candy-module-content').getBoundingClientRect();const nodes=[...root.querySelectorAll(':scope > h1,:scope > div')];return {fits:box.top>=frame.top-.5&&box.bottom<=frame.bottom+.5,items:nodes.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,delta:Math.abs((r.top+r.bottom-box.top-box.bottom)/2)};}),box:{top:box.top,bottom:box.bottom}};});
   assert(geometry.fits, runtime+' '+height+' RTP bar fits inside candy frame: '+JSON.stringify(geometry));
   assert(geometry.items.length>=4,JSON.stringify(geometry));assert(geometry.items.every(r=>r.top>=geometry.box.top-.5&&r.bottom<=geometry.box.bottom+.5&&r.delta<=1),runtime+' '+height+' every RTP item is centered and unclipped: '+JSON.stringify(geometry));
   await page.screenshot({path:'.codex-dev/candy-verification/rtp-'+height+'-'+runtime+'.png'});
  }
  await page.evaluate(runtime=>{const config=window.candy.config('bonus_hunt',{orientation:'mainstream',carouselMode:'imagestats',listMode:'image',sessionState:'ended',drawerAlwaysVisible:true,resultFlipSeconds:1,winEffects:false,showRequests:false,widgetWidth:370,panelWidth:370,widgetHeight:1044,panelHeight:1044,bonuses:[{id:'best',slotName:'Candy Stars',provider:'Provider',betSize:1,payout:100,opened:true,image:'/player.webp'},{id:'worst',slotName:'Gates of Hades',provider:'Provider',betSize:1,payout:1,opened:true,isSuperBonus:true,image:'/player.webp'}]});window.candy.renderConfig(window.candy.registry.createBetterInstance('bonus_hunt',{width:370,height:1044,config}),runtime);},runtime);await wait();await page.waitForSelector('.better-hunt-result--best');
  const colors=await page.evaluate(()=>{const selectors=['.better-hunt-main-name','.better-hunt-image-stats-title h3','.better-hunt-image-row strong','.better-hunt-row-main .better-hunt-slot-marquee','.better-hunt-mini-stat','.better-hunt-result-slot'];return selectors.map(selector=>({selector,colors:[...document.querySelectorAll(selector)].map(el=>getComputedStyle(el).color)}));});
  for(const item of colors){assert(item.colors.length,item.selector+' populated');assert(item.colors.every(color=>color==='rgb(48, 19, 108)'),runtime+' '+item.selector+' uses legible dark purple: '+JSON.stringify(item));}
  assert.equal(await page.$eval('.better-hunt-result--best .better-hunt-result-payout>strong',el=>getComputedStyle(el).color),'rgb(8, 120, 111)');
  assert.equal(await page.$eval('.better-hunt-result--worst .better-hunt-result-payout>strong',el=>getComputedStyle(el).color),'rgb(161, 38, 100)');
  assert(await page.evaluate(()=>{const frame=document.querySelector('.candy-module-content').getBoundingClientRect(),result=document.querySelector('.better-hunt-result-flipper').getBoundingClientRect();return result.top>=frame.top&&result.bottom<=frame.bottom+1;}),'always-visible best/worst card fits inside the Candy frame');
  await page.screenshot({path:'.codex-dev/candy-verification/mainstream-contrast-'+runtime+'.png'});
 }

 const oldAppearance=await page.evaluate(()=>{const original={...window.candy.config('bonus_hunt'),subElements:{headerTitle:{textColor:'#ffffff'},slotTitle:{textColor:'#ffffff'},betValue:{textColor:'#ffffff'},resultStatValue:{textColor:'#ffffff'}}};const recolored=window.candy.themes.applyWidgetColourTheme('bonus_hunt',original,'candy');return {original:original.subElements,updated:recolored.subElements};});
 assert.equal(oldAppearance.original.headerTitle.textColor,'#ffffff');
 for(const id of ['headerTitle','slotTitle','betValue','resultStatValue'])assert.equal(oldAppearance.updated[id].textColor,'#30136C',id+' old white appearance is refreshed by theme selection');
 const isolation=await page.evaluate(()=>{const config=window.candy.config('chat',{text:'#30136C'});const original=JSON.stringify(config);const copy=window.candy.themes.applyWidgetColourTheme('chat',config,'arctic');return {unchanged:original===JSON.stringify(config),arctic:copy.text!=='#30136C'};});assert(isolation.unchanged&&isolation.arctic);
 assert.deepEqual(errors,[]);console.log('Candy: 12 widget types, editor/OBS renderer, three resolutions, preset immutability, transparency controls: PASS');
}finally{await browser.close();await server.close();}
