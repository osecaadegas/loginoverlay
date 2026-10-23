import assert from 'node:assert/strict';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { fitSlotWindowSource, sanitizeSlotWindowConfig } from '../src/components/OverlayCenter/widgets/slot-window/slotWindowModel.js';
assert.deepEqual(fitSlotWindowSource(1000,500,600,320,'cover'),{width:640,height:320});
assert.deepEqual(fitSlotWindowSource(1000,500,600,320,'contain'),{width:600,height:300});
assert.equal(sanitizeSlotWindowConfig({fit:'invalid'}).fit,'cover');
const server=await createServer({server:{port:5197,host:'127.0.0.1'},logLevel:'error'});
await server.listen();
const browser=await puppeteer.launch({headless:true,executablePath:process.env.SC_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage();
 await page.setRequestInterception(true);
 page.on('request',req=>req.url().startsWith('http://127.0.0.1:17832/')?req.respond({status:200,contentType:'text/html',body:'<html></html>'}):req.continue());
 await page.goto('http://127.0.0.1:5197');
 const result=await page.evaluate(async()=>{
  const React=await import('/node_modules/.vite/deps/react.js');
  const DOM=await import('/node_modules/.vite/deps/react-dom_client.js');
  const createRoot=DOM.createRoot || DOM.default.createRoot;
  const {default:Grid,sanitizeBonusHuntGrid}=await import('/src/components/OverlayCenter/widgets/slot-window/BonusHuntGridWidget.jsx');
  const config=sanitizeBonusHuntGrid({gap:8,colourTheme:'clear_ice',slots:[0,1,2,3].map(i=>({sourceUrl:`http://127.0.0.1:17832/view/panel-${i+1}?token=${'a'.repeat(48)}`,cornerTopLeft:10+i}))});
  document.body.innerHTML='<div id="grid-test" style="width:1200px;height:700px"></div>';
  createRoot(document.querySelector('#grid-test')).render((React.createElement || React.default.createElement)(Grid,{config,runtime:'obs'}));
  await new Promise(r=>setTimeout(r,500));
  return {slots:config.slots.map(s=>s.cornerTopLeft),frames:[...document.querySelectorAll('#grid-test iframe')].map(f=>({width:f.parentElement.clientWidth,height:f.parentElement.clientHeight,src:f.src})),restored:sanitizeBonusHuntGrid(JSON.parse(JSON.stringify(config))).slots.length};
 });
 assert.equal(result.frames.length,4);
 assert.equal(new Set(result.frames.map(f=>`${f.width}x${f.height}`)).size,1);
 assert.deepEqual(result.slots,[10,11,12,13]);
 assert.equal(result.restored,4);
 result.frames.forEach((f,i)=>assert.ok(f.src.includes(`/panel-${i+1}?`)));
 console.log('PASS: four equal cells, independent sources/corners, config round-trip and cover/contain geometry. Synthetic feeds; live ScreenSplit not tested.');
} finally {await browser.close();await server.close();}
