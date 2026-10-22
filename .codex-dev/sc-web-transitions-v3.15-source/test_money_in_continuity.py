"""Synthetic Money IN frame continuity check."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
R=Path(__file__).resolve().parent
S=(R/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
uri='data:image/png;base64,'+base64.b64encode((R/'bill.png').read_bytes()).decode()
S=S.replace("image('./bill.png')", "image('"+uri+"')")
S=S.replace('const params=new URLSearchParams(location.search)', "const params=new URLSearchParams('?preview=1&effect=money&duration=4.5&intensity=78')")
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':960,'height':540});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(S,wait_until='domcontentloaded')
 page.wait_for_function('moneyCoverage>.985',timeout=40000)
 result=page.evaluate("""() => {
  const render=p=>{ctx.clearRect(0,0,W,H);drawMoney(p*job.duration,'in',job.duration);const d=ctx.getImageData(0,0,W,H).data;let nonzero=0;for(let i=3;i<d.length;i+=4)if(d[i]>8)nonzero++;return nonzero;};
  return [.03,.15,.30,.45,.55,.569,.570,.571,.60,.78,.96,1].map(p=>({p,nonzero:render(p)}));
 }""")
 print(result)
 assert result[3]['nonzero']>result[1]['nonzero'],'Bills should accumulate progressively'
 assert result[5]['nonzero']>0 and result[6]['nonzero']>0
 assert result[-1]['nonzero']==0,'Money IN must end transparent'
 assert not errors,errors
 b.close()
print('PASS: Money IN visual coverage and clean final frame')
