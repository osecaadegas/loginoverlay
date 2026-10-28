// Assemble already-captured production frames; does not modify the renderer.
import {readFile,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
const output=new URL('../qa/3.18.0/core-visual/',import.meta.url);
const data=JSON.parse(await readFile(new URL('metrics.json',output),'utf8'));
const browser=await puppeteer.launch({headless:true,...(process.env.SC_CHROME_PATH?{executablePath:process.env.SC_CHROME_PATH}:{})});
try{
 const page=await browser.newPage();
 for(const effect of ['money','ice','smoke','toxic']){
  const rows=data.results.filter(r=>r.effect===effect);
  for(const row of rows)for(const frame of row.phases)frame.data='data:image/png;base64,'+(await readFile(new URL(frame.image,output))).toString('base64');
  const encoded=await page.evaluate(async rows=>{
   const canvas=document.createElement('canvas');canvas.width=320*Math.max(...rows.map(r=>r.phases.length));canvas.height=204*rows.length;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#08121d';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font='12px sans-serif';
   for(const [y,row]of rows.entries())for(const [x,frame]of row.phases.entries()){
    const image=new Image();image.src=frame.data;await image.decode();ctx.drawImage(image,x*320,y*204+24,320,180);
    ctx.fillStyle='white';ctx.fillText(`${row.effect} ${row.direction} ${frame.stage} ${frame.time.toFixed(2)}s`,x*320+5,y*204+16);
   }
   return canvas.toDataURL('image/jpeg',.91);
  },rows);
  await writeFile(new URL(effect+'-contact.jpg',output),Buffer.from(encoded.split(',')[1],'base64'));
 }
 console.log('Four labelled production contact sheets created from captured frames. Labels are actual sampled timestamps.');
}finally{await browser.close();}
