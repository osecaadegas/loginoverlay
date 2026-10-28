// Real WebGL regression. Synthetic inputs deliberately isolate materials and
// resource lifecycle; they are not evidence of a live OBS/webcam rehearsal.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import puppeteer from 'puppeteer';
const base=new URL('./',import.meta.url);
const source=await Promise.all(['money-vfx3d.js','ice-vfx3d.js','gas-vfx3d.js','gpu-vfx3d.js'].map(f=>readFile(new URL(f,base),'utf8')));
const assets=await Promise.all(['bill.png','vfx_assets/golden_sheep_paper_normal.png','vfx_assets/golden_sheep_paper_roughness.png'].map(async f=>'data:image/png;base64,'+(await readFile(new URL(f,base))).toString('base64')));
const baseline=process.env.SC_BASELINE_REF?execFileSync('git',['show',`${process.env.SC_BASELINE_REF}:.codex-dev/sc-web-transitions-v3.15-source/money-vfx3d.js`],{encoding:'utf8'}):null;
const hardware=process.env.SC_HARDWARE==='1';
const browser=await puppeteer.launch({headless:true,args:hardware?['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=d3d11']:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.SC_CHROME_PATH?{executablePath:process.env.SC_CHROME_PATH}:{})});
try{
 const page=await browser.newPage();await page.setViewport({width:960,height:540});
 const result=await page.evaluate(async({source,assets,baseline})=>{
  const W=960,H=540,images={},checks=[];
  const load=src=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=src;});
  const [art,normal,roughness]=await Promise.all(assets.map(load));
  const record=t=>Array.from({length:35},(_,i)=>({x:95+i%7*125+Math.sin(i+t)*18,y:90+Math.floor(i/7)*90+Math.cos(i+t)*12,w:128+(i%3)*17,alpha:1,age:t,rot:Math.sin(i)*.5,depth:Math.cos(i*1.7)*155,phase:i*.197,wave:1.1,yaw:Math.sin(i+t)*.7,pitch:Math.cos(i*1.4+t)*.48,hero:i===8?1:0}));
  const pixels=r=>{const p=new Uint8Array(r.canvas.width*r.canvas.height*4);const gl=r.gl;gl.readPixels(0,0,r.canvas.width,r.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);if(gl.getError())throw Error('GL error');return p;};
  const visible=p=>{let count=0;for(let i=3;i<p.length;i+=4)count+=p[i]>2;return count;};
  let oldFrames;
  if(baseline){new Function(baseline)();const old=new SCMoneyCGI.Renderer();old.prepare(art,normal,W,H,'Cinematic',roughness);oldFrames=[];for(const t of [.2,.7,1.2]){old.draw(record(t),t);oldFrames.push(pixels(old));}old.dispose();old.canvas.remove();}
  for(const script of source)new Function(script)();
  const money=new SCMoneyCGI.Renderer();money.prepare(art,normal,W,H,'Cinematic',roughness,'out');
  const resources=[money.shader,money.meshBuffer,money.instanceBuffer,money.tex,money.normal,money.roughness,money.vao];
  const defaults=[];for(const t of [.2,.7,1.2]){money.draw(record(t),t);defaults.push(pixels(money));}
  if(oldFrames){let changed=0,maxDelta=0;for(let f=0;f<defaults.length;f++)for(let i=0;i<defaults[f].length;i++){const delta=Math.abs(defaults[f][i]-oldFrames[f][i]);if(delta)changed++;maxDelta=Math.max(maxDelta,delta);}if(maxDelta>1||changed>defaults.length*W*H*4*.0001)throw Error('Approved OUT material changed '+changed+' bytes, max '+maxDelta);checks.push({test:'Approved Money OUT',baselineByteIdentical:changed===0,changedBytes:changed,maxChannelDelta:maxDelta,tolerance:'At most 1/255 on 0.01% of channels (driver precision)',frames:3});}
  money.prepare(art,normal,W,H,'Cinematic',roughness,'in');
  if(resources.some((r,i)=>r!==[money.shader,money.meshBuffer,money.instanceBuffer,money.tex,money.normal,money.roughness,money.vao][i]))throw Error('Repeated Money prepare allocated GPU resources');
  money.draw(record(.7),.7);const inPixels=pixels(money);let changed=0;for(let i=0;i<inPixels.length;i++)if(inPixels[i]!==defaults[1][i])changed++;
  if(changed<1000)throw Error('IN bend modes missing');images.moneyIn=money.canvas.toDataURL();
  money.draw([],2);if(visible(pixels(money)))throw Error('Money did not clear');
  checks.push({test:'Money IN independent bend modes and cached resources',changedBytes:changed});money.dispose();money.canvas.remove();
  const gas=new SCGasVolume.Renderer();
  for(const quality of ['Performance','Balanced','Cinematic','Ultra'])for(const effect of ['smoke','toxic'])for(const [location,box] of Object.entries({center:[.3,.12,.4,.85],left:[0,.25,.24,.7],right:[.76,.02,.24,.58],full:[0,0,1,1]})){
   const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='white';g.fillRect(box[0]*W,box[1]*H,box[2]*W,box[3]*H);
   const field={mw:W,mh:H,map:g.getImageData(0,0,W,H).data};gas.prepare(c,W,H,quality,effect,78);
   // Hold an opaque volume for two separated times: delayed acknowledgments
   // must not cause either frozen motion or accidental optical holes.
   const measures=[];for(const time of [2.2,5.4]){gas.draw(1,true,time);const coverage=gas.measureCoverage(field);measures.push(coverage);if(coverage<.995)throw Error(`${effect}/${quality}/${location} unsafe cover ${coverage}`);}
   if(quality==='Cinematic'&&location==='center')for(const [name,p,cover,t] of [['building',.48,true,0.8],['covered',1,true,2.2],['dispersion',.5,false,3.2],['idle',1,false,4]]){gas.lastAge=0;gas.draw(p,cover,t);images[effect+'-'+name]=gas.canvas.toDataURL();}
   gas.draw(1,false,6);if(visible(pixels(gas)))throw Error('Gas residual pixels');
   checks.push({test:'Gas footprint coverage and cleanup',quality,effect,location,coverage:measures});
  }
  const gl=gas.gl,ext=gl.getExtension('WEBGL_debug_renderer_info'),device=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);gas.dispose();
  return {environment:{device,resolution:[W,H],syntheticInputs:true,liveOBS:false,hardwareBenchmark:false},checks,images};
 },{source,assets,baseline});
 const output=new URL(process.env.SC_OUTPUT||'./qa/core-production-regression/',base);await mkdir(output,{recursive:true});
 for(const [name,data] of Object.entries(result.images))await writeFile(new URL(name+'.png',output),Buffer.from(data.split(',')[1],'base64'));
 delete result.images;await writeFile(new URL('metrics.json',output),JSON.stringify(result,null,2));
 assert.ok(result.checks.length>=33);console.log('PASS core renderer production regression: '+result.checks.length+' checks; '+result.environment.device);
}finally{await browser.close();}
