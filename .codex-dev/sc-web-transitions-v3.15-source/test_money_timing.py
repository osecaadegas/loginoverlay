"""Synthetic visual coverage and hero exit regression; no physical camera used."""
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent
S=(R/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
uri='data:image/png;base64,'+base64.b64encode((R/'bill.png').read_bytes()).decode()
S=S.replace("image('./bill.png')","image('"+uri+"')")
S=S.replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=money&duration=4.5&intensity=78')")
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':960,'height':540});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(S,wait_until='domcontentloaded')
 page.wait_for_function('moneyCoverage>.985',timeout=40000)
 result=page.evaluate('''() => {
 const samples=[];
 for(const progress of [.05,.18,.36,.52,.72,.87,1]){
   ctx.clearRect(0,0,W,H);drawMoneyCover(progress);
   const probe=moneyBoundsMap();
   samples.push([progress,coverageOf(cvs,probe).ratio]);
 }
 ctx.clearRect(0,0,W,H);drawMoney(job.duration,'out',job.duration);
 const pixels=ctx.getImageData(0,0,W,H).data;
 let nontransparent=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]>5)nontransparent++}
 return {samples,finalCoverage:moneyCoverage,nontransparentPixels:nontransparent,count:billParts.length};
 }''')
 print(result)
 assert result['finalCoverage']>=.985
 assert result['samples'][0][1]<result['samples'][-1][1]
 assert result['samples'][-1][1]>=.985
 assert result['nontransparentPixels']==0,'Money OUT leaves artifacts in last frame'
 assert result['count']>30
 assert not errors,errors
 page.close();b.close()
print('PASS: money gradually covers live figure, measured coverage >98.5%, fully clear exit')
