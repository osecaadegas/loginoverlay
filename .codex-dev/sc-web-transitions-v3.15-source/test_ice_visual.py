"""Regression for the retained Ice effect's 2D fallback (synthetic silhouette)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
html=(P/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','').replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=ice&duration=3&intensity=80')")
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':960,'height':540});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.wait_for_function('job&&shards.length>5',timeout=20000)
 values=page.evaluate('''() => {
  const sample=[];
  for(const mode of ['cover','out','in']){
   ctx.clearRect(0,0,W,H);
   if(mode==='cover')drawIceCover(.8);
   else drawIce(job.duration*.33,mode,job.duration);
   let d=ctx.getImageData(0,0,W,H).data,c=0;
   for(let i=3;i<d.length;i+=4*13)if(d[i]>5)c++;
   sample.push({mode,pixels:c});
  }
  return {shards:shards.length,samples:sample};
 }''')
 print(values)
 assert all(s['pixels']>0 for s in values['samples']),values
 assert not errors,errors
 browser.close()
print('PASS: Ice cover, OUT, and IN render nontransparent animation frames')
