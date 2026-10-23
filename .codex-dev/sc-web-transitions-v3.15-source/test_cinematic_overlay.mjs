// Production overlay playback, with local assets and demonstration camera only.
// This deliberately does not pretend to be a live OBS or hardware benchmark.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
const hardware=process.env.SC_HARDWARE==='1',capture=process.env.SC_CAPTURE!=='0',width=Number(process.env.SC_WIDTH)||640,height=Number(process.env.SC_HEIGHT)||360;
const base=new URL('./',import.meta.url),output=new URL(process.env.SC_OUTPUT||(hardware?'./surface-hardware-evidence/':'./surface-overlay-evidence/'),base);
await mkdir(output,{recursive:true});
const args=hardware?['--enable-webgl','--ignore-gpu-blocklist']:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
const browser=await puppeteer.launch({headless:true,args,...(process.env.SC_CHROME_PATH?{executablePath:process.env.SC_CHROME_PATH}:{})});
const results=[];
try{
 for(const effect of process.argv.slice(2).length?process.argv.slice(2):['money','ice'])for(const direction of ['in','out']){
  const page=await browser.newPage();await page.setViewport({width,height});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setRequestInterception(true);
  page.on('request',async req=>{try{const url=new URL(req.url());if(url.hostname!=='sc-vfx.local'){await req.continue();return;}
   if(url.pathname==='/favicon.ico'){await req.respond({status:204});return;}
   const file=url.pathname==='/overlay'? 'overlay.html':url.pathname.slice(1).replace(/^vfx-assets\//,'vfx_assets/');if(file.includes('..'))throw Error('Invalid fixture asset');
   const content=await readFile(new URL(file,base));await req.respond({status:200,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':'text/html',body:content});
  }catch{await req.respond({status:404,body:'Not found'});}});
  await page.goto(`http://sc-vfx.local/overlay?preview=1&once=1&effect=${effect}&direction=${direction}&duration=${Number(process.env.SC_DURATION)||3}&quality=Cinematic&intensity=75`);
  await page.waitForFunction(()=>window.__scDebug&&window.__scDebug().stage!=='idle',{timeout:20000});
  const phases=[];const began=Date.now();let nextCapture=0,lastStage='',lastCoverage=0;
  while(Date.now()-began<15000){
   const d=await page.evaluate(()=>{const d=window.__scDebug();return {stage:d.stage,time:d.visualSeconds,coverage:d.lastMeasuredCoverage,covered:d.covered,reveal:d.reveal,mode:d.renderMode,moneyGPUError:d.moneyGPUError,iceGPUError:d.iceGPUError,gasGPUError:d.gasGPUError};});
   if(Date.now()-began>nextCapture||d.stage!==lastStage||(d.coverage>=.995&&lastCoverage<.995)){const name=`${effect}-${direction}-${phases.length}-${d.stage}`;if(capture){const encoded=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const c=document.createElement('canvas');c.width=innerWidth;c.height=innerHeight;const g=c.getContext('2d');g.fillStyle='#101b29';g.fillRect(0,0,c.width,c.height);const layers=Array.from(document.querySelectorAll('canvas')).filter(x=>getComputedStyle(x).display!=='none').sort((a,b)=>(parseInt(getComputedStyle(a).zIndex)||0)-(parseInt(getComputedStyle(b).zIndex)||0));for(const layer of layers)g.drawImage(layer,0,0,c.width,c.height);resolve(c.toDataURL());})));await writeFile(new URL(name+'.png',output),Buffer.from(encoded.split(',')[1],'base64'));}phases.push({image:name+'.png',...d});nextCapture=(Date.now()-began)+700;lastStage=d.stage;lastCoverage=d.coverage;}
   if(d.stage==='error'||d.stage==='done')break;
   await new Promise(r=>setTimeout(r,65));
  }
  const final=await page.evaluate(()=>{const d=window.__scDebug(),pixelCounts=[];for(const c of document.querySelectorAll('canvas')){if(c.id==='sc-demo-live'||c.style.display==='none')continue;const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const g=copy.getContext('2d');g.drawImage(c,0,0);const p=g.getImageData(0,0,c.width,c.height).data;let visible=0;for(let i=3;i<p.length;i+=4)if(p[i]>2)visible++;pixelCounts.push({id:c.id,visible});}const gpuCanvas=document.querySelector('#sc-money-cgi')||document.querySelector('#sc-ice-shatter-ultra')||document.querySelector('#sc-raymarched-gas');const gl=gpuCanvas&&gpuCanvas.getContext('webgl2'),ext=gl&&gl.getExtension('WEBGL_debug_renderer_info');const gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';const sorted=d.frameIntervals.slice().sort((a,b)=>a-b),pct=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0;return {...d,pixelCounts,gpu,frameTiming:{samples:sorted.length,p50:pct(.5),p95:pct(.95),p99:pct(.99),max:sorted.at(-1)||0,over25ms:sorted.filter(t=>t>25).length}};});
  const summary={effect,direction,errors,phases,final};results.push(summary);await writeFile(new URL('metrics.json',output),JSON.stringify({environment:{resolution:[width,height],backend:hardware?'Default Chrome ANGLE; inspect actual final.gpu':'SwiftShader software',capture,syntheticCamera:true,realOBS:false},results},null,2));
  console.log(effect,direction,final.stage,'coverage',final.lastMeasuredCoverage,'GPU',final.gpu,'frameMs',final.frameTiming,'errors',errors);
  await page.close();
 }
 for(const result of results){assert.equal(result.final.stage,'done',`${result.effect} ${result.direction} did not complete`);assert.ok(result.final.lastMeasuredCoverage>=.995,'Coverage below safe threshold');assert.equal(result.final.moneyGPUError||result.final.iceGPUError||result.final.gasGPUError,'','Unexpected 2D fallback');assert.equal(result.errors.length,0,'Runtime errors '+result.errors.join(';'));assert.ok(result.final.pixelCounts.every(x=>x.visible===0),'Effect left residual pixels');}
}finally{await browser.close();}
