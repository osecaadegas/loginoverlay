// Real local Go server + real Chromium UI. No OBS, camera or streaming claims.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,sep} from 'node:path';
import puppeteer from 'puppeteer';

const base=new URL('./',import.meta.url),out=process.env.SC_UI_QA_OUTPUT?pathToFileURL(resolve(process.env.SC_UI_QA_OUTPUT)+sep):new URL('./qa/3.18.0/ui/',base);
await mkdir(out,{recursive:true});
const executable=process.argv[2];
assert.ok(executable,'Pass the compiled application path');
const port=Number(process.env.SC_DIAGNOSTIC_PORT)||18768;
const url=`http://127.0.0.1:${port}`;
try{await fetch(url+'/health');throw Error(`Port ${port} already occupied; refusing to touch another application`);}catch(e){if(!e.cause)throw e;}
const proc=spawn(executable,['--serve'],{windowsHide:true,env:{...process.env,SC_DIAGNOSTIC_PORT:String(port),APPDATA:fileURLToPath(new URL('profile/',out))},stdio:['ignore','pipe','pipe']});
let serverLog='';proc.stdout.on('data',x=>serverLog+=x);proc.stderr.on('data',x=>serverLog+=x);
let browser;
try{
 let connected=false;for(let i=0;i<80;i++){try{connected=(await fetch(url+'/health')).ok;if(connected)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(connected,'Server did not start: '+serverLog);
 assert.equal((await fetch(url+'/api/status')).status,403,'Status must require the UI token');
 const html=await(await fetch(url)).text(),token=html.match(/const TOKEN='([^']+)'/)[1];
 const headers={'X-SC-Token':token,'Content-Type':'application/json'};
 const api=async(path,body)=>{const res=await fetch(url+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};};
 const exported=await api('/api/settings/export');assert.equal(exported.status,200);assert.ok(exported.data.defaults);assert.ok(exported.data.schemaVersion);
 assert.equal(JSON.stringify(exported.data).includes('obsPassword'),false);
 const bad=await api('/api/settings/import',{schemaVersion:999,settings:exported.data.settings});assert.ok(bad.status>=400,'Future schema must be rejected');
 browser=await puppeteer.launch({headless:true,executablePath:process.env.SC_CHROME_PATH,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage();await page.setViewport({width:1280,height:1000});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url);await page.waitForSelector('#obs.show');
 await page.click('[data-tab="dashboard"]');assert.equal(await page.$$eval('.effect',nodes=>nodes.length),14);
 await page.click('#choose-neon');await page.waitForFunction(()=>document.querySelector('#effect-message').textContent.includes('NEON'));
 await page.select('#preview-direction','in');await page.click('#toggle-preview');
 await page.waitForFunction(()=>document.querySelector('#preview').src.includes('direction=in'));
 await page.screenshot({path:fileURLToPath(new URL('dashboard.png',out)),fullPage:true});
 await page.click('[data-tab="diagnostics"]');assert.equal(await page.$eval('#preview',el=>el.getAttribute('src')),'about:blank','Hidden preview must release playback');
 await page.screenshot({path:fileURLToPath(new URL('diagnostics.png',out)),fullPage:true});
 await page.click('#recover-camera');await page.waitForFunction(()=>document.querySelector('#recover-camera').textContent.includes('failed'));
 assert.equal((await api('/api/status')).data.cameraVisibility,'unknown','Disconnected recovery must not fabricate visible camera state');
 await page.setViewport({width:600,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'UI must fit small desktop windows');
 await page.screenshot({path:fileURLToPath(new URL('compact.png',out)),fullPage:true});
 const diagnostics=await api('/api/diagnostics');assert.equal(diagnostics.status,200);assert.ok(!JSON.stringify(diagnostics.data).includes(token),'Diagnostics leaked UI token');
 assert.equal(errors.length,0,errors.join('\n'));
 const quit=await api('/api/quit',{});assert.equal(quit.status,200);
 await Promise.race([new Promise(resolve=>proc.once('exit',resolve)),new Promise((_,reject)=>setTimeout(()=>reject(Error('Safe no-camera shutdown timed out')),10000))]);
 await writeFile(new URL('result.json',out),JSON.stringify({server:'actual Go --serve',browser:'Chromium',realOBS:false,passed:true,checks:['private status','versioned export','invalid schema refusal','14 effects','preview direction','preview teardown','unconfirmed recovery','responsive UI','redacted diagnostics','coordinated quit']},null,2));
 console.log('PASS actual local Go server and Chromium product UI; live OBS not tested');
}finally{if(browser)await browser.close();if(proc.exitCode===null)proc.kill();await writeFile(new URL('server.log',out),serverLog);}
