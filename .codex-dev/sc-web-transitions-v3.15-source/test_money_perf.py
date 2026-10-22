"""Synthetic browser perf without OBS: all calls include rasterization readback."""
import base64,statistics
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=(ROOT/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
uri='data:image/png;base64,'+base64.b64encode((ROOT/'bill.png').read_bytes()).decode()
HTML=HTML.replace("image('./bill.png')", "image('"+uri+"')")
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 for size in [(960,540),(1280,720),(1920,1080)]:
  page=b.new_page(viewport=dict(width=size[0],height=size[1]))
  page.on('pageerror',lambda e:print('SCRIPT ERROR',e))
  page.set_content(HTML.replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=money&duration=4.5&intensity=85')"),wait_until='domcontentloaded')
  page.wait_for_function('job&&moneyCoverage>.985',timeout=50000)
  stats=page.evaluate('''() => {
   const out=[];for(let k=0;k<50;k++){
    const a=performance.now();ctx.clearRect(0,0,W,H);
    drawMoneyCover(.25+k*.7/49);ctx.getImageData(0,0,1,1);
    out.push(performance.now()-a);
   }return {frames:out.slice(8),notes:billParts.length,coverage:moneyCoverage}
  }''')
  data=stats['frames'];p95=sorted(data)[int(.95*(len(data)-1))]
  print(f'{size[0]}x{size[1]}: notes={stats["notes"]}, coverage={stats["coverage"]:.3%}, median={statistics.median(data):.2f} ms, p95={p95:.2f} ms')
  page.close()
 b.close()
