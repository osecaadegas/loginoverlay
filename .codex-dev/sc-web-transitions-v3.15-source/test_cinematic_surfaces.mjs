// Actual WebGL2 checks. SwiftShader measurements are not RTX/OBS performance.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
const base=new URL('./',import.meta.url);
const [money,ice,bill,normal,roughness]=await Promise.all(['money-vfx3d.js','ice-vfx3d.js','bill.png','vfx_assets/golden_sheep_paper_normal.png','vfx_assets/golden_sheep_paper_roughness.png'].map((p,i)=>readFile(new URL(p,base),i<2?'utf8':undefined)));
const browser=await puppeteer.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.SC_CHROME_PATH?{executablePath:process.env.SC_CHROME_PATH}:{})});
try{
 const page=await browser.newPage();await page.setViewport({width:640,height:360});
 const result=await page.evaluate(async ({money,ice,bill,normal,roughness})=>{
  new Function(money)();new Function(ice)();
  const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
  const [art,n,r]=await Promise.all([bill,normal,roughness].map(load));
  const W=640,H=360,checks=[],images={},profiles=['Performance','Balanced','Cinematic','Ultra'];
  const shards=Array.from({length:72},(_,i)=>({cx:40+i%12*50,cy:35+Math.floor(i/12)*56,vx:Math.sin(i*2.399)*620,vy:-180+Math.cos(i*1.4)*400,rot:Math.sin(i)*1.5,delay:i%7*.018,depth:.85+(i%3)*.2,spark:i*.29,poly:[[-26,-29],[26,-29],[26,29],[-26,29]]}));
  const material=document.createElement('canvas');material.width=W;material.height=H;const mg=material.getContext('2d');
  const gradient=mg.createLinearGradient(0,0,W,H);gradient.addColorStop(0,'#8bcbdc');gradient.addColorStop(.45,'#2b627c');gradient.addColorStop(1,'#afced9');mg.fillStyle=gradient;mg.fillRect(0,0,W,H);
  const ledger=renderer=>{
   const gl=renderer.gl,count={};
   for(const noun of ['Buffer','Texture','Program','VertexArray','Framebuffer','Shader']){count[noun]=0;for(const prefix of ['create','delete']){const name=prefix+noun,fn=gl[name].bind(gl);gl[name]=(...args)=>{const answer=fn(...args);if(prefix==='create'&&answer)count[noun]++;if(prefix==='delete'&&args[0])count[noun]--;return answer;};}}
   return count;
  };
  const sample=renderer=>{const gl=renderer.gl,pixels=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let visible=0,opaque=0,checksum=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]>2)visible++;if(pixels[i]>253)opaque++;checksum=(checksum+pixels[i-1]*31+pixels[i-2]*13+pixels[i]*7)%2147483647;}const err=gl.getError();if(err)throw Error('GL error '+err);return {visible,opaque,checksum};};
  const records=t=>Array.from({length:42},(_,i)=>({x:60+i%7*90+Math.sin(i+t)*14,y:40+Math.floor(i/7)*56+Math.cos(i+t)*11,w:122+i%3*7,alpha:i%5===0?.72:1,age:t,rot:Math.sin(i)*.5,depth:Math.cos(i*1.7)*125,phase:i*.19,wave:.9,yaw:Math.sin(i+t)*.46,pitch:Math.cos(i*1.4+t)*.39,hero:i===8?1:0}));
  const mr=new SCMoneyCGI.Renderer(),ir=new SCIceUltra.Renderer(),ml=ledger(mr),il=ledger(ir);
  for(const quality of profiles){
   mr.prepare(art,n,W,H,quality,r);ir.prepare(shards,material,W,H,quality);
   const start=performance.now();const before=records(.2),order=before.map(x=>x.phase).join(',');mr.draw(before,.2);const a=sample(mr);if(before.map(x=>x.phase).join(',')!==order)throw Error('Renderer mutated caller records');
   mr.draw(records(.7),.7);const b=sample(mr);if(a.visible<1500||a.checksum===b.checksum)throw Error('Money absent or motion frozen');
   if(quality==='Cinematic')images.money=mr.canvas.toDataURL();
   mr.draw([],1);const moneyIdle=sample(mr);if(moneyIdle.visible)throw Error('Residual banknotes');
   ir.drawGrowth(0,0);const growthStart=sample(ir);ir.drawGrowth(.55,.55);const growthMiddle=sample(ir);ir.drawGrowth(1,1);const growthEnd=sample(ir);
   if(growthStart.visible||growthMiddle.visible>=growthEnd.visible||growthEnd.opaque<180000)throw Error('Ice nucleation or assembled coverage failed '+JSON.stringify({growthStart,growthMiddle,growthEnd}));
   if(quality==='Cinematic')images.iceCoverage=ir.canvas.toDataURL();
   const phases=[];for(const inbound of [true,false]){for(const p of [.12,.36,.67,1]){ir.draw(p,inbound,1+p*3);const measurement=sample(ir);phases.push({p,inbound,...measurement});if(p===1&&measurement.visible)throw Error('Residual ice');if(p===.36&&quality==='Cinematic'&&inbound)images.iceShatter=ir.canvas.toDataURL();}}
   checks.push({quality,money:{...mr.diagnostics(),start:a,moving:b,idle:moneyIdle},ice:{...ir.diagnostics(),growthStart,growthMiddle,growthEnd,phases},renderReadbackMilliseconds:performance.now()-start});
  }
  mr.dispose();ir.dispose();for(const counts of [ml,il])for(const [key,value] of Object.entries(counts))if(value!==0)throw Error('GPU resource leak '+key+': '+value);
  return {environment:{userAgent:navigator.userAgent,backend:'ANGLE SwiftShader, software rendering, 640x360; timing includes readback and compilation',realOBS:false,hardwareBenchmark:false},checks,resources:{money:ml,ice:il},images};
 },{money,ice,bill:'data:image/png;base64,'+bill.toString('base64'),normal:'data:image/png;base64,'+normal.toString('base64'),roughness:'data:image/png;base64,'+roughness.toString('base64')});
 const output=new URL('./surface-render-evidence/',base);await mkdir(output,{recursive:true});
 for(const [name,data] of Object.entries(result.images))await writeFile(new URL(name+'.png',output),Buffer.from(data.split(',')[1],'base64'));
 delete result.images;await writeFile(new URL('metrics.json',output),JSON.stringify(result,null,2));
 assert.equal(result.checks.length,4);console.log('PASS: four quality profiles, rendered Money motion, Ice growth/dispersion, transparent idle, caller record ordering and balanced GPU resources. '+JSON.stringify(result.resources));
}finally{await browser.close();}
