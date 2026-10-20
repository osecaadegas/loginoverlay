import assert from 'node:assert/strict';
import {createServer} from 'vite';
import puppeteer from 'puppeteer';
import {normalizeBackgroundFrame} from '../src/components/OverlayCenter/widgets/background/backgroundSource.js';
assert.equal(normalizeBackgroundFrame().enabled,false);
assert.equal(normalizeBackgroundFrame({width:1920}).x,0);
assert.equal(normalizeBackgroundFrame({keyColor:'invalid'}).keyColor,'#00ff00');
const server=await createServer({logLevel:'silent',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const base=server.resolvedUrls.local[0],browser=await puppeteer.launch({headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:960,height:540});
 await page.setRequestInterception(true);page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/__frame')return r.respond({contentType:'text/html',body:'<html><body style="margin:0;background:transparent"><div id="root"></div><script type="module">import R from "/@react-refresh";R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>'});if(r.url().startsWith(base)||['data:','blob:'].includes(u.protocol))return r.continue();return r.respond({contentType:'application/json',body:'[]'});});
 await page.goto(base+'__frame');await page.evaluate(async()=>{
  const entry=await(await fetch('/src/main.jsx')).text(),url=entry.match(/"([^"\n]*\/react\.js[^"\n]*)"/)[1],R=(await import(url)).default,D=(await import('/node_modules/.vite/deps/react-dom_client.js?'+url.split('?')[1])).default;
  const registry=await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');const root=D.createRoot(document.getElementById('root'));
  window.frameTest={render(mode,keyEnabled=true,runtime='editor',restore=false,theme='street_art'){let config={...registry.getBetterWidgetDefinition('background').defaultConfig,colourTheme:theme,bgMode:mode,imageUrl:'/player.webp',videoUrl:'/smoke_effect2.mp4',gameplayFrame:{enabled:true,keyEnabled,keyColor:'#ff00ff',width:900,height:600,x:400,y:100,radius:24},fxParticles:'none',fxFog:'none',fxGlimpse:'none'};if(restore)config=JSON.parse(localStorage.getItem('frame-test'));else localStorage.setItem('frame-test',JSON.stringify(config));root.render(R.createElement('div',{style:{width:1920,height:1080,transform:'scale(.5)',transformOrigin:'top left'}},registry.renderBetterWidgetInstance({instance:registry.createBetterInstance('background',{config}),runtime,mode:'live',accessVerified:true})));}};
 });
 for(const runtime of ['editor','obs'])for(const mode of ['texture','image','video','transparent']){
  await page.evaluate(({mode,runtime})=>window.frameTest.render(mode,true,runtime),{mode,runtime});await page.waitForSelector('[data-background-gameplay-frame]');
  const geometry=await page.$eval('[data-background-gameplay-frame]',el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,width:r.width,height:r.height,fill:s.backgroundColor,pointer:s.pointerEvents};});
  assert.deepEqual(geometry,{x:200,y:50,width:450,height:300,fill:'rgb(255, 0, 255)',pointer:'none'});
  if(mode==='image')await page.waitForFunction(()=>document.querySelector('img[data-better-element=media]')?.naturalWidth>0);
  if(mode==='video')await page.waitForFunction(()=>document.querySelector('video')?.currentTime>.1);
  await page.evaluate(({mode,runtime})=>window.frameTest.render(mode,false,runtime),{mode,runtime});await page.waitForFunction(()=>document.querySelector('[data-background-gameplay-frame]')?.dataset.keyEnabled==='false');
  assert.equal(await page.$eval('[data-background-gameplay-frame]',el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
 }
 await page.evaluate(()=>window.frameTest.render('image',true,'obs',true));await page.waitForFunction(()=>document.querySelector('[data-background-gameplay-frame]')?.dataset.keyEnabled==='false');
 const {WIDGET_COLOUR_THEMES}=await import('../src/components/OverlayCenter/widgets/shared/colourThemePalettes.js');
 for(const {key} of WIDGET_COLOUR_THEMES){
  await page.evaluate(key=>window.frameTest.render('image',true,'obs',false,key),key);
  await page.waitForFunction(key=>document.querySelector('[data-background-gameplay-frame]')?.dataset.frameTheme===key,{},key);
  assert.equal(await page.$eval('[data-background-gameplay-frame]',el=>getComputedStyle(el).backgroundColor),'rgb(255, 0, 255)');
  assert.notEqual(await page.$eval('[data-background-gameplay-frame]',el=>getComputedStyle(el).boxShadow),'none');
  await page.waitForFunction(()=>document.querySelector('img[data-better-element=media]')?.naturalWidth>0);
 }
 if(process.env.FRAME_SCREENSHOT)await page.screenshot({path:process.env.FRAME_SCREENSHOT});
 assert.deepEqual(errors,[]);console.log('Background frame: texture/image/playing video/transparent, editor and OBS, independent key toggle, bounds and saved configuration PASS');
}finally{await browser.close();await server.close();}
