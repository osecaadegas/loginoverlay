import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
const source=await readFile(new URL('./gpu-vfx3d.js',import.meta.url),'utf8');
const browser=await puppeteer.launch({headless:true,executablePath:process.env.SC_CHROME_PATH,args:['--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage();
 const results=await page.evaluate(source=>{
  new Function(source)();const W=320,H=180,results=[];
  const r=new SCGPU3D.Renderer();
  for(const type of ['inferno','lightning','shadow','holy','sand','crystal','petal','plasma'])for(const quality of ['Performance','Balanced','Cinematic','Ultra'])for(const rect of [[7,8,70,95],[210,45,95,120]]){
   const subject=document.createElement('canvas');subject.width=W;subject.height=H;const g=subject.getContext('2d');
   g.fillStyle='rgba(255,0,255,.3)';g.fillRect(...rect);const map=g.getImageData(0,0,W,H).data;
   const fx={type,W,H,subject,seal:subject,quality,b:{x:rect[0],y:rect[1],w:rect[2],h:rect[3]},tuning:{},config:{color:'#77bbff',inBuild:.61},motion:1,particles:[],arcs:[]};
   const pixels=()=>{const p=new Uint8Array(W*H*4);r.gl.readPixels(0,0,W,H,r.gl.RGBA,r.gl.UNSIGNED_BYTE,p);return p;};
   r.prepare(fx);r.render('cover',1,2);const a=pixels(),coverage=r.measureCoverage({map,mw:W,mh:H});
   g.clearRect(0,0,W,H);g.fillStyle='rgba(0,255,0,.3)';g.fillRect(...rect);
   r.prepare(fx);r.render('cover',1,2);const b=pixels();
   let rgbDifference=0;for(let i=0;i<a.length;i++)rgbDifference+=Math.abs(a[i]-b[i]);
   r.render('out',1,4);const end=pixels();let residual=0;for(let i=3;i<end.length;i+=4)if(end[i]>2)residual++;
   results.push({type,quality,rect,coverage,rgbDifference,residual});
  }
  r.dispose();return results;
 },source);
 for(const x of results){assert.equal(x.coverage,1,JSON.stringify(x));assert.equal(x.rgbDifference,0,'Camera RGB leaked into '+x.type);assert.equal(x.residual,0,JSON.stringify(x));}
 console.log('PASS',results.length,'actual GPU cases: translucent shifted camera footprints, RGB-independent concealment, repeated preparation and clean release');
}finally{await browser.close();}
