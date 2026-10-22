from pathlib import Path
import base64,statistics,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
bill='data:image/png;base64,'+base64.b64encode((ROOT/'bill.png').read_bytes()).decode()
h=(ROOT/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','').replace("image('./bill.png')","image('"+bill+"')")
res=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 for W,H in [(1280,720),(1920,1080)]:
  for eff in ['money','smoke','toxic']:
   page=b.new_page(viewport={'width':W,'height':H});err=[];page.on('pageerror',lambda e:err.append(str(e)))
   doc=h.replace('const params=new URLSearchParams(location.search)',f"const params=new URLSearchParams('?preview=1&effect={eff}&duration=3.2&intensity=80')")
   page.set_content(doc,wait_until='domcontentloaded')
   page.wait_for_function('field && job && (job.effect==="money" ? moneyCoverage>=.985 : clouds.length>0)',timeout=60000)
   # Exact per-frame draw+forced-raster benchmark; excludes OBS scene composition.
   frames=page.evaluate('''eff=>{const data=[];
     for(let i=0;i<52;i++){
      const p=.30+i/130,t=performance.now();ctx.clearRect(0,0,W,H);
      if(eff==='money')drawMoneyCover(p);else drawSmokeCover(p,1+i/48);
      ctx.getImageData(W/2,H/2,1,1);
      if(i>5)data.push(performance.now()-t);
     }
     return data;}''',eff)
   frames.sort();result={'effect':eff,'resolution':f'{W}x{H}','median_ms':round(statistics.median(frames),2),'p95_ms':round(frames[int(len(frames)*.95)],2),'max_ms':round(max(frames),2),'browser':'Chromium headless --disable-gpu, forced Canvas2D readback','n':len(frames)}
   print(result);res.append(result)
   assert not err,err
   page.close()
 b.close()
(ROOT/'PERFORMANCE_RESULTS.json').write_text(json.dumps(res,indent=2))
