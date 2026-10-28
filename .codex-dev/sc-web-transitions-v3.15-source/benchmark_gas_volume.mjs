import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import puppeteer from 'puppeteer';
const hardware=process.env.SC_GAS_HARDWARE==='1';
const args=hardware?['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=d3d11']:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
const browser=await puppeteer.launch({headless:true,executablePath:process.env.SC_CHROME_PATH,args});
try{
 const page=await browser.newPage();await page.setViewport({width:1920,height:1080});
 for(const file of ['gpu-vfx3d.js','gas-vfx3d.js'])await page.addScriptTag({content:await readFile(new URL('./'+file,import.meta.url),'utf8')});
 const reports=[];
 for(const effect of ['smoke','toxic'])for(const quality of ['Performance','Balanced','Cinematic','Ultra']){
  const result=await page.evaluate(async({quality,effect})=>{
   const subject=document.createElement('canvas');subject.width=1920;subject.height=1080;
   const ctx=subject.getContext('2d');ctx.fillStyle='white';ctx.fillRect(560,120,800,900);
   const field={mw:1920,mh:1080,map:ctx.getImageData(0,0,1920,1080).data};
   const renderer=new SCGasVolume.Renderer();renderer.prepare(subject,1920,1080,quality,effect,78);
   const gl=renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info');
   const device=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
   const timings=[];let last=0;
   for(let frame=0;frame<120;frame++){
    const now=await new Promise(requestAnimationFrame);if(frame>=30&&last)timings.push(now-last);last=now;
    // Stable covered hold is the expensive state, motion remains active.
    renderer.draw(1,true,2.2+frame/60);
   }
   await new Promise(requestAnimationFrame);renderer.pollTimers();
   const coverage=renderer.measureCoverage(field);
   const d=renderer.diagnostics();const sorted=[...timings].sort((a,b)=>a-b);
   const p=f=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*f))];
   renderer.draw(.999,false,5);const pixels=new Uint8Array(4);gl.readPixels(renderer.canvas.width>>1,renderer.canvas.height>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   const releasedAlpha=pixels[3];renderer.dispose();
   return {effect,quality,device,canvas:'1920x1080',coverage,frameSamples:timings.length,frameIntervalMsP50:p(.5),frameIntervalMsP95:p(.95),frameIntervalMsP99:p(.99),over25ms:timings.filter(x=>x>25).length,diagnostics:d,releasedAlpha};
  },{quality,effect});
  reports.push(result);console.log(JSON.stringify(result));
  assert.ok(result.coverage>=.995,`${effect}/${quality} failed actual-alpha cover ${result.coverage}`);
  assert.equal(result.releasedAlpha,0,`${effect}/${quality} failed near-complete cleanup`);
 }
 await mkdir(new URL('./gas-render-evidence/',import.meta.url),{recursive:true});
 await writeFile(new URL(`./gas-render-evidence/benchmark-${hardware?'hardware':'software'}.json`,import.meta.url),JSON.stringify({measuredAt:new Date().toISOString(),environment:'Headless Chrome, independent WebGL renderer, synthetic rectangular camera mask. Not OBS or encoder load.',hardwareRequested:hardware,reports},null,2));
}finally{await browser.close();}
