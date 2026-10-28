// Runs the unmodified production overlay against a simulated controller/OBS
// bridge. Tests wire timing/coverage/lifecycle, not live OBS or RTX performance.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import puppeteer from 'puppeteer';
const base=new URL('./',import.meta.url);
const browser=await puppeteer.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist'],...(process.env.SC_CHROME_PATH?{executablePath:process.env.SC_CHROME_PATH}:{})});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const job=(id,effect,direction)=>({job_id:id,phase:'prepare',effect,direction,duration:2.4,intensity:65,quality:'Performance',renderer_mode:'gpu',camera_ready:false,tuning:{}});
const results=[];
const output=new URL('./qa/3.18.0/bridge/',base);
await mkdir(output,{recursive:true});
try {
 const scenarios=process.argv.slice(2).length?process.argv.slice(2):[...['money','ice','smoke','toxic','inferno','lightning','shadow','holy','sand','crystal','petal','neon','plasma','glitch'].flatMap(effect=>['in','out'].map(direction=>`${effect}-${direction}`)),'cancel-prepare','missing-clips'];
 for(const scenario of scenarios) {
  const page=await browser.newPage();await page.setViewport({width:640,height:360});
  const camera=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=360;const g=c.getContext('2d');g.fillStyle='#e0ab85';g.beginPath();g.arc(320,75,39,0,Math.PI*2);g.fill();g.fillStyle='#345c92';g.beginPath();g.ellipse(320,255,106,154,0,0,Math.PI*2);g.fill();return c.toDataURL();});
  const png=Buffer.from(camera.split(',')[1],'base64');
  let state=scenario==='missing-clips'?{job_id:0,phase:'idle'}:scenario==='cancel-prepare'?job(201,'money','in'):job(101,...scenario.split('-'));
  const signals=[],errors=[],holds=[];let completed=false,cancelled=false,dropReady=true;
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on('request',async req=>{
   try {
    const u=new URL(req.url());if(u.hostname!=='sc-vfx.local'){await req.continue();return;}
    const action=u.pathname.slice(1);
    if(action==='state'){await req.respond({status:200,contentType:'application/json',body:JSON.stringify(state)});return;}
    if(action==='heartbeat'||action==='favicon.ico'){await req.respond({status:200,contentType:'application/json',body:'{}'});return;}
    if(action.startsWith('cinematic-plates/')){await req.respond({status:404,body:'Optional clip not installed'});return;}
    if(action==='frame.png'){
     if(scenario==='cancel-prepare'){setTimeout(()=>{state={job_id:0,phase:'idle'};cancelled=true;},50);await sleep(700);}
     await req.respond({status:200,contentType:'image/png',body:png});return;
    }
    if(['ready','covered','reveal','done','error'].includes(action)) {
     const id=Number(u.searchParams.get('id')),coverage=Number(u.searchParams.get('coverage'));
     const frame=Number(u.searchParams.get('frame')),confirmations=Number(u.searchParams.get('confirmations'));
     signals.push({action,id,coverage,frame,confirmations,reason:u.searchParams.get('reason'),time:Date.now()});
     if(id!==state.job_id){await req.respond({status:409});return;}
     if(action==='error'){errors.push(u.searchParams.get('reason'));await req.respond({status:200,body:'{}'});return;}
     if(action==='ready'&&state.phase==='prepare'){
      state={...state,phase:state.direction==='out'?'cover':'play'};
      if(dropReady){dropReady=false;await req.abort('failed');return;}
     }
     if(action==='covered'||action==='reveal'){
      assert.ok(coverage>=.995,`${scenario} requested switch with coverage ${coverage}`);
      assert.ok(Number.isSafeInteger(frame)&&frame>0,`${scenario} missing rendered frame evidence`);
      assert.ok(confirmations>=2,`${scenario} missing consecutive coverage confirmations`);
      // Screenshot the presented compositor image. Reading WebGL drawImage
      // between rAFs is invalid with preserveDrawingBuffer=false and can
      // falsely claim a frozen frame because that buffer has been discarded.
      const sample=async()=>({time:await page.evaluate(()=>window.__scDebug().visualSeconds),checksum:createHash('sha256').update(await page.screenshot()).digest('hex')});
      const start=await sample();
      await sleep(500);
      const end=await sample();
      holds.push({start,end});assert.ok(end.time>start.time+.25,`${scenario} animation clock froze during confirmation`);
      assert.notEqual(end.checksum,start.checksum,`${scenario} rendered pixels froze during confirmation`);
      state={...state,phase:'play',camera_ready:action==='reveal'};
     }
     if(action==='done'){
      assert.ok(signals.some(s=>s.action===(state.direction==='in'?'reveal':'covered')),'Finished without coverage');
      const visible=await page.evaluate(()=>{let total=0;for(const source of document.querySelectorAll('canvas')){if(source.style.display==='none')continue;const copy=document.createElement('canvas');copy.width=source.width;copy.height=source.height;const g=copy.getContext('2d');g.drawImage(source,0,0);const p=g.getImageData(0,0,copy.width,copy.height).data;for(let k=3;k<p.length;k+=4)if(p[k]>1)total++;}return total;});
      assert.equal(visible,0,'Done reached controller before compositor cleanup');completed=true;state={job_id:0,phase:'idle'};
     }
     await req.respond({status:200,contentType:'application/json',body:'{"ok":true}'});return;
    }
    const file=action==='overlay'?'overlay.html':action.replace(/^vfx-assets\//,'vfx_assets/');if(file.includes('..'))throw Error('Invalid path');
    const content=await readFile(new URL(file,base));await req.respond({status:200,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'text/html',body:content});
   }catch(e){errors.push(String(e));if(!req.isInterceptResolutionHandled())await req.respond({status:500,body:String(e)});}
  });
  await page.goto('http://sc-vfx.local/overlay?rid=simulated-controller');
  if(scenario==='missing-clips') {
   const attempts=await page.evaluate(async()=>{
    const results=[];
    for(let i=0;i<4;i++){
     job={effect:i%2?'smoke':'toxic',renderer_mode:'2d'};
     const pending=prepare3D();
     // Also exercise cancellation while the optional HEAD requests are pending.
     if(i===3)prepareEpoch++;
     await pending;
     results.push({canvases:document.querySelectorAll('#sc-cinematic-plates').length,error:cinematicPlateError});
    }
    job=null;return results;
   });
   assert.ok(attempts.slice(0,3).every(x=>x.error.includes('not installed')),'Did not exercise failed optional media preparation');
   assert.ok(attempts.every(x=>x.canvases===0),'Failed/stale optional media candidate leaked canvases');
   assert.deepEqual(errors,[]);const result={scenario,simulatedMissingAssets:true,attempts};results.push(result);console.log(JSON.stringify(result));await writeFile(new URL('results.json',output),JSON.stringify(results,null,2));await page.close();continue;
  }
  const deadline=Date.now()+18000;
  while(Date.now()<deadline&&!completed&&!errors.length){if(cancelled){await sleep(1100);break;}await sleep(70);}
  const final=await page.evaluate(()=>window.__scDebug());
  assert.deepEqual(errors,[],`${scenario} runtime/bridge errors`);
  if(scenario==='cancel-prepare'){
   assert.equal(final.stage,'idle','Cancelled asynchronous prepare resurrected old job');
   assert.equal(signals.length,0,'Cancelled prepare emitted acknowledgments');
  }else{
   assert.ok(completed,`${scenario} did not complete: ${final.stage} coverage ${final.lastMeasuredCoverage}`);
   assert.ok(holds.length>=1,'Did not exercise delayed camera confirmation');
  }
  const result={scenario,simulatedOBS:true,completed,stage:final.stage,signals,holds};results.push(result);console.log(JSON.stringify(result));
  await writeFile(new URL('results.json',output),JSON.stringify(results,null,2));
  await page.close();
 }
}finally{await browser.close();}
