// Real Chromium/WebGL checks. Synthetic camera, no OBS or webcam certification.
// SC_CHROME_PATH selects an installed browser; SC_GPU_QA_DIR selects evidence dir.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import puppeteer from 'puppeteer';

const source = await readFile(new URL('./gpu-vfx3d.js', import.meta.url), 'utf8');
const baselineRevision=process.env.SC_GPU_BASELINE_PATH||'8de8a6e6';
let baseline=null;
try{baseline=process.env.SC_GPU_BASELINE_PATH?await readFile(process.env.SC_GPU_BASELINE_PATH,'utf8'):
 execFileSync('git',['show',baselineRevision+':.codex-dev/sc-web-transitions-v3.15-source/gpu-vfx3d.js'],{encoding:'utf8',maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});}
catch{console.warn('Baseline unavailable in this source archive; current-renderer validation still runs. Set SC_GPU_BASELINE_PATH for a comparison.');}
const browser = await puppeteer.launch({headless:true, executablePath:process.env.SC_CHROME_PATH,
  args:['--enable-webgl','--ignore-gpu-blocklist']});
const output = new URL(process.env.SC_GPU_QA_DIR || './qa/production-gpu/', import.meta.url);
await mkdir(output, {recursive:true});
try {
 const page=await browser.newPage(); await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
 const result=await page.evaluate(async ({source,baseline})=>{
  new Function(source)();
  const W=640,H=360,types=['inferno','lightning','shadow','holy','sand','crystal','petal','plasma','neon','glitch'];
  const checks=[],frames={},benchmarks=[];
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const subject=canvas(W,H),g=subject.getContext('2d');
  // High-contrast synthetic source, covering both partially transparent and
  // opaque pixels; source RGB must never be copied into the concealment shader.
  g.fillStyle='rgba(255,0,255,.3)';g.fillRect(210,32,224,300);
  g.fillStyle='white';g.fillRect(226,45,194,270);
  const map=g.getImageData(0,0,W,H).data,field={map,mw:W,mh:H};
  const random=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  const particles=Array.from({length:220},(_,i)=>({x:214+random(i)*216,y:38+random(i+473)*286,
   depth:.65+(i%11)*.085,size:.6+(i%7)*.18,tx:Math.sin(i*2.399)*460,ty:-70-Math.cos(i*1.7)*340,
   spin:Math.sin(i*1.618)*4,phase:i*2.399,delay:(i%17)/40}));
  const accents={inferno:'#ff7832',lightning:'#55baff',shadow:'#7761a4',holy:'#ffca6e',sand:'#d4a36e',crystal:'#b178fa',petal:'#f06da9',plasma:'#c05cfa',neon:'#5ce7ef',glitch:'#6f94ff'};
  const makeFX=(type,w=W,h=H)=>({type,W:w,H:h,subject,seal:subject,quality:'Cinematic',field,
   tuning:{accent:accents[type]},config:{color:accents[type],inBuild:.61},motion:1,
   b:{x:w*.328,y:h*.089,w:w*.35,h:h*.833},particles:particles.map(a=>({...a,x:a.x/W*w,y:a.y/H*h})),
   arcs:Array.from({length:7},(_,i)=>({pts:Array.from({length:18},(_,j)=>[w*(.34+i*.045+Math.sin(j*2.4+i)*.02),h*(.10+j*.048)])}))});
  const renderer=new SCGPU3D.Renderer(),gl=renderer.gl;
  const extension=gl.getExtension('WEBGL_debug_renderer_info');
  const environment={userAgent:navigator.userAgent,gpu:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
   realOBS:false,source:'synthetic high-contrast moving source fixture',visualResolution:[W,H],benchmarkResolution:[1920,1080]};
  const pixels=()=>{const p=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
  const digest=()=>{const p=pixels();let visible=0,sum=0;for(let i=3;i<p.length;i+=4){if(p[i]>2)visible++;sum=(sum+p[i-1]*31+p[i-2]*17+p[i]*7)%2147483647;}return {visible,sum};};
  const capture=(type,direction,label)=>{
   const out=canvas(320,200),c=out.getContext('2d');c.fillStyle='#0a1521';c.fillRect(0,0,320,200);
   c.drawImage(renderer.canvas,0,20,320,180);c.fillStyle='white';c.font='12px sans-serif';c.fillText(`${type} ${direction} ${label}`,6,14);
   return out;
  };
  for(const type of types){
   const fx=makeFX(type);renderer.prepare(fx);
   const sheet=canvas(320*5,200*4),sc=sheet.getContext('2d');let cell=0;
   for(const direction of ['in','out']){
    const stages=direction==='out'?[['cover',0,0],['cover',.25,.5],['cover',.6,1.2],['cover',1,2],['cover',1,2.4],['out',.1,2.8],['out',.25,3.2],['out',.5,3.8],['out',.75,4.5],['out',1,5.2]]:
      [['in',0,0],['in',.1,.4],['in',.25,1],['in',.5,2],['cover',1,2.5],['cover',1,2.9],['in',.75,3.4],['in',.9,4],['in',.96,4.3],['in',1,4.5]];
    let holdChecksum=null;
    for(const [stage,p,t] of stages){
     renderer.render(stage,p,t);const sample=digest();
     if(stage==='cover'&&p===1){const coverage=renderer.measureCoverage(field);if(coverage!==1)throw Error(`${type} ${direction} concealed gate failed`);
      if(holdChecksum===sample.sum)throw Error(`${type} ${direction} frozen hold`);holdChecksum=sample.sum;}
     if(p===1&&stage===direction&&sample.visible!==0)throw Error(`${type} ${direction} residual ${sample.visible}`);
     const err=gl.getError();if(err)throw Error(`${type} GL error ${err}`);
     const img=capture(type,direction,stage+' '+Math.round(p*100)+'%');sc.drawImage(img,cell%5*320,Math.floor(cell/5)*200);cell++;
     checks.push({type,direction,stage,progress:p,...sample});
    }
   }
   frames[type]=sheet.toDataURL('image/png');renderer.dispose();
  }
  // Deliberate single-pixel holes and marginal alpha, including odd dimensions
  // and far-edge source footprints. These previously escaped coarse sampling.
  const probes=[];
  for(const [w,h] of [[321,181],[640,360]]){
   renderer.prepare(makeFX('inferno',w,h));
   const mask=new Uint8Array(w*h*4);for(let i=3;i<mask.length;i+=4)mask[i]=32;
   const field={map:mask,mw:w,mh:h};
   gl.clearColor(.2,.3,.4,1);gl.clear(gl.COLOR_BUFFER_BIT);
   if(renderer.measureCoverage(field)!==1)throw Error('Opaque probe failed');
   for(const [x,y,alpha] of [[1,2,0],[w-1,h-1,0],[Math.floor(w*.47),Math.floor(h*.61),253/255]]){
    gl.enable(gl.SCISSOR_TEST);gl.scissor(x,y,1,1);gl.clearColor(.2,.3,.4,alpha);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.SCISSOR_TEST);
    const coverage=renderer.measureCoverage(field);if(coverage!==0)throw Error(`Missed optical hole at ${x},${y}`);
    probes.push({width:w,height:h,x,y,alpha,coverage,readbackBytes:renderer.diagnostics().coverage.readbackBytes});
    gl.clearColor(.2,.3,.4,1);gl.clear(gl.COLOR_BUFFER_BIT);
   }
   field.map.fill(0);renderer.coverageProbe.invalidate();if(renderer.measureCoverage(field)!==0)throw Error('Empty source accepted');
  }
  // Realistic reduced camera matte at a non-integral 7.5x scale. The former
  // Glitch seal missed MSAA samples at curved foreground edges in this case.
  const matte=canvas(256,144),matteContext=matte.getContext('2d');matteContext.fillStyle='rgba(255,255,255,.3)';
  matteContext.beginPath();matteContext.ellipse(128,75,43,64,0,0,Math.PI*2);matteContext.fill();
  const scaledField={mw:256,mh:144,map:matteContext.getImageData(0,0,256,144).data};
  const digitalFX=makeFX('glitch',1920,1080);digitalFX.field=scaledField;renderer.prepare(digitalFX);renderer.render('cover',1,2);
  if(renderer.measureCoverage(scaledField)!==1)throw Error('Fractionally scaled Glitch matte edge leak');
  const asyncChecks=[];
  renderer.prepare(makeFX('inferno'));renderer.render('cover',1,2);
  let pending=renderer.measureCoverageAsync(field);
  if(pending.ready)throw Error('Async gate returned an unsignaled sample');
  for(let i=0;i<30&&!pending.ready;i++){await new Promise(requestAnimationFrame);pending=renderer.measureCoverageAsync(field);}
  if(!pending.ready||pending.ratio!==1)throw Error('Async opaque sample failed '+JSON.stringify({pending,diagnostics:renderer.diagnostics(),glError:gl.getError()}));
  asyncChecks.push(pending);
  renderer.measureCoverageAsync(field);renderer.hide();
  renderer.render('cover',0,3);pending=renderer.measureCoverageAsync(field);
  if(pending.ready)throw Error('Stale pre-hide sample accepted');
  for(let i=0;i<30&&!pending.ready;i++){await new Promise(requestAnimationFrame);pending=renderer.measureCoverageAsync(field);}
  if(!pending.ready||pending.ratio!==0)throw Error('Async cleared sample accepted');
  asyncChecks.push(pending);
  // Resource-ledger covers the entire renderer lifetime including its pool.
  renderer.destroy();
  const nativeGetContext=HTMLCanvasElement.prototype.getContext;
  const resourceCounts={};
  HTMLCanvasElement.prototype.getContext=function(...args){const context=nativeGetContext.apply(this,args);if(args[0]==='webgl2'&&context){
   for(const noun of ['Texture','Framebuffer','Buffer','Program','Shader']){
    resourceCounts[noun]??=0;
    for(const verb of ['create','delete']){const fn=context[verb+noun].bind(context);context[verb+noun]=(...params)=>{const answer=fn(...params);if(verb==='create'&&answer)resourceCounts[noun]++;if(verb==='delete'&&params[0])resourceCounts[noun]--;return answer;};}
   }
  }return context;};
  const disposable=new SCGPU3D.Renderer();
  for(let i=0;i<12;i++){disposable.prepare(makeFX(types[i%types.length]));disposable.render('cover',1,i);disposable.measureCoverage(field);disposable.dispose();}
  disposable.destroy();HTMLCanvasElement.prototype.getContext=nativeGetContext;
  for(const [resource,count]of Object.entries(resourceCounts))if(count!==0)throw Error('GPU resource leak '+resource+' '+count);
  // Same machine, same fixture, stock HEAD source versus edited source.
  // Timings are renderer-only browser wall/GPU time and exclude OBS/encoding.
  for(const [revision,code]of [...(baseline?[['baseline',baseline]]:[]),['updated',source]]){
   new Function(code)();const r=new SCGPU3D.Renderer(),context=r.gl,timer=context.getExtension('EXT_disjoint_timer_query_webgl2');
   for(const type of types.filter(t=>revision==='updated'||t!=='neon')){
    r.prepare(makeFX(type,1920,1080));for(let i=0;i<4;i++)r.render('cover',.8,i/60);
    // Allocate/prewarm coverage outside the measured render loop.
    r.render('cover',1,1);r.measureCoverage(field);
    const cpu=[],raf=[],gpu=[],coverage=[],asyncCoverage=[],pending=[];let previous=0;
    for(let i=0;i<45;i++){
     const now=await new Promise(requestAnimationFrame);if(previous)raf.push(now-previous);previous=now;
     const query=timer?context.createQuery():null;if(query)context.beginQuery(timer.TIME_ELAPSED_EXT,query);
     const begin=performance.now();r.render('cover',.90,2+i/60);cpu.push(performance.now()-begin);
     if(query){context.endQuery(timer.TIME_ELAPSED_EXT);pending.push(query);}
     if(revision==='updated'&&i%10===0){const begin=performance.now();const sample=r.measureCoverageAsync(field);asyncCoverage.push({cpuMilliseconds:performance.now()-begin,ready:sample.ready});}
    }
    r.render('cover',1,3);for(let i=0;i<3;i++){const begin=performance.now();r.measureCoverage(field);coverage.push(performance.now()-begin);}
    // Queries may resolve after submitting several frames; no busy wait.
    for(let attempts=0;pending.length&&attempts<30;attempts++){
     await new Promise(requestAnimationFrame);
     while(pending.length&&context.getQueryParameter(pending[0],context.QUERY_RESULT_AVAILABLE)){
      const q=pending.shift();if(!context.getParameter(timer.GPU_DISJOINT_EXT))gpu.push(context.getQueryParameter(q,context.QUERY_RESULT)/1e6);context.deleteQuery(q);
     }
    }
    for(const query of pending)context.deleteQuery(query);
    const stats=xs=>{if(!xs.length)return null;const sorted=[...xs].sort((a,b)=>a-b);return {mean:xs.reduce((a,b)=>a+b)/xs.length,p95:sorted[Math.floor((xs.length-1)*.95)],p99:sorted[Math.floor((xs.length-1)*.99)],max:sorted.at(-1),samples:xs.length};};
    const intervals=stats(raf);benchmarks.push({revision,type,cpuSubmitMs:stats(cpu),gpuMs:stats(gpu),frameIntervalMs:intervals,fps:intervals?1000/intervals.mean:null,coverageMs:stats(coverage),asyncCoverageCpuMs:stats(asyncCoverage.map(x=>x.cpuMilliseconds)),asyncCoverageReady:asyncCoverage.filter(x=>x.ready).length,diagnostics:r.diagnostics()});
    r.dispose();
   }
   if(r.destroy)r.destroy();else r.canvas.remove();
  }
  return {environment,checks,probes,asyncChecks,resourceCounts,benchmarks,frames};
 },{source,baseline});
 for(const [name,data]of Object.entries(result.frames))await writeFile(new URL(name+'.png',output),Buffer.from(data.split(',')[1],'base64'));
 delete result.frames;result.environment.sourceSHA256=createHash('sha256').update(source).digest('hex');
 result.environment.baselineReference=baseline?baselineRevision:null;
 result.environment.baselineSHA256=baseline?createHash('sha256').update(baseline).digest('hex'):null;
 await writeFile(new URL('metrics.json',output),JSON.stringify(result,null,2));
 assert.equal(result.checks.length,200);assert.equal(result.probes.length,6);
 console.log('PASS 200 actual-render checkpoints, 6 rejected single-pixel/alpha leaks, scaled Glitch matte, async cancellation, 12 pooled lifecycle cycles; 1080p benchmark '+(baseline?'baseline and updated':'updated only')+'. Evidence: '+output.pathname);
 console.log(JSON.stringify(result.environment));
}finally{await browser.close();}
