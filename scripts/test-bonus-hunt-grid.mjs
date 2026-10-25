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
 await page.setViewport({width:1280,height:800});
 await page.setRequestInterception(true);
 page.on('request',req=>req.url().startsWith('http://127.0.0.1:17832/')?req.respond({status:200,contentType:'text/html',body:'<html></html>'}):req.continue());
 await page.goto('http://127.0.0.1:5197');
 const result=await page.evaluate(async()=>{
  const React=await import('/node_modules/.vite/deps/react.js');
  const DOM=await import('/node_modules/.vite/deps/react-dom_client.js');
  const createRoot=DOM.createRoot || DOM.default.createRoot;
  const {default:Grid,sanitizeBonusHuntGrid}=await import('/src/components/OverlayCenter/widgets/slot-window/BonusHuntGridWidget.jsx');
  const config=sanitizeBonusHuntGrid({gap:8,colourTheme:'clear_ice',frameTopLeft:96,frameWidth:6,slots:[0,1,2,3].map(i=>({sourceUrl:`http://127.0.0.1:17832/view/panel-${i+1}?token=${'a'.repeat(48)}`,cornerTopLeft:10+i}))});
  document.body.innerHTML='<div id="grid-test" style="width:1200px;height:700px"></div>';
  const root=createRoot(document.querySelector('#grid-test'));
  const h=React.createElement || React.default.createElement;
  root.render(h(Grid,{config,runtime:'obs'}));
  await new Promise(r=>setTimeout(r,500));
  const outer=document.querySelector('#grid-test > section');
  const style=getComputedStyle(outer);
  const bounds=outer.getBoundingClientRect();
  const hit=document.elementFromPoint(bounds.x+1,bounds.y+1);
  const result={slots:config.slots.map(s=>s.cornerTopLeft),frames:[...document.querySelectorAll('#grid-test iframe')].map(f=>({width:f.parentElement.clientWidth,height:f.parentElement.clientHeight,src:f.src})),restored:sanitizeBonusHuntGrid(JSON.parse(JSON.stringify(config))),radius:style.borderRadius,borderWidth:style.borderTopWidth,cornerClipped:!outer.contains(hit)};
  result.singleCorners=[];
  for(const key of ['frameTopLeft','frameTopRight','frameBottomRight','frameBottomLeft']){
    root.render(h(Grid,{config:{...config,frameTopLeft:0,frameTopRight:0,frameBottomRight:0,frameBottomLeft:0,[key]:80},runtime:'obs'}));
    await new Promise(r=>setTimeout(r,60));
    const current=getComputedStyle(outer);
    result.singleCorners.push([current.borderTopLeftRadius,current.borderTopRightRadius,current.borderBottomRightRadius,current.borderBottomLeftRadius]);
  }
  return result;
 });
 assert.equal(result.frames.length,4);
 assert.equal(new Set(result.frames.map(f=>`${f.width}x${f.height}`)).size,1);
 assert.deepEqual(result.slots,[10,11,12,13]);
 assert.equal(result.restored.slots.length,4);
 assert.equal(result.restored.frameTopLeft,96);
 assert.equal(result.restored.frameTopRight,0);
 assert.equal(result.radius,'96px 0px 0px');
 assert.equal(result.borderWidth,'6px');
 assert.equal(result.cornerClipped,true);
 assert.deepEqual(result.singleCorners,[['80px','0px','0px','0px'],['0px','80px','0px','0px'],['0px','0px','80px','0px'],['0px','0px','0px','80px']]);
 result.frames.forEach((f,i)=>assert.ok(f.src.includes(`/panel-${i+1}?`)));
 await page.screenshot({path:'.codex-dev/bonus-grid-frame.png'});
 console.log('PASS: four equal cells, independent outer and slot corners, actual outer clipping, config round-trip and cover/contain geometry. Synthetic feeds; live ScreenSplit not tested.');
} finally {await browser.close();await server.close();}
