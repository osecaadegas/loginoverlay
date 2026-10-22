"""Synthetic Chromium Canvas2D draw benchmark, NOT actual OBS or GPU latency."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import re,json,statistics
p=Path(__file__).resolve().parent
text=(p/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
with sync_playwright() as pw:
 br=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 for w,h in [(960,540),(1920,1080)]:
  page=br.new_page(viewport={'width':w,'height':h});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  html=text.replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=inferno&direction=out&intensity=75')")
  page.set_content(html,wait_until='domcontentloaded')
  page.wait_for_function("job && job.effect==='inferno' && infernoSeal && infernoCoverFrames.length===22",timeout=60000)
  metrics=page.evaluate('''()=>{
   const times=[];for(let i=0;i<100;i++){
    const t0=performance.now();ctx.clearRect(0,0,W,H);
    if(i%2)drawInfernoCover(.65+(i%12)*.027,i*.021);else drawInferno(i/100*3,'out',3);
    times.push(performance.now()-t0)
   }
   const s=times.slice().sort((a,b)=>a-b);
   return {p50:s[50],p95:s[95],max:s[99],maskCoverage:infernoCoverage,seededParticles:infernoEmbers.length}
  }''')
  print(w,h,metrics, 'errors',errs)
  assert not errs,errs
  (Path('/mnt/data/SC_v33_Inferno_Review')/f'perf_{w}x{h}.json').write_text(json.dumps(metrics,indent=2))
  page.close()
 br.close()
