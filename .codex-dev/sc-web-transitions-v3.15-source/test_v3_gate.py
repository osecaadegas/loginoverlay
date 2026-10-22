"""IN cover verification using the actual renderer at t=0 (synthetic OBS mask)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
R=Path(__file__).resolve().parent
raw=(R/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
b64=base64.b64encode((R/'bill.png').read_bytes()).decode()
raw=raw.replace("image('./bill.png')",f"image('data:image/png;base64,{b64}')")
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 for effect in ['money','smoke','toxic','ice']:
  page=browser.new_page(viewport={'width':960,'height':540});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  html=raw.replace('const params=new URLSearchParams(location.search)',f"const params=new URLSearchParams('?preview=1&effect={effect}&direction=in&intensity=80')")
  page.set_content(html,wait_until='domcontentloaded')
  page.wait_for_function('job && (job.effect==="money"? moneyCoverage>.985 :job.effect==="ice"? shards.length>0:clouds.length>0)',timeout=30000)
  vals=page.evaluate('''()=>{
    ctx.clearRect(0,0,W,H);
    if(job.effect==='money')drawMoney(0,'in',3);
    else if(job.effect==='ice')drawIce(0,'in',3);
    else drawSmoke(0,'in',3);
    const data=ctx.getImageData(0,0,W,H).data;
    let visible=0;for(let i=3;i<data.length;i+=4)if(data[i]>220)visible++;
    return {visibleFraction:visible/(W*H),count:visible};
  }''')
  print(effect,'initial IN opaque fraction',round(vals['visibleFraction'],3))
  assert vals['visibleFraction']>0.11, (effect,vals)
  assert not errors,(effect,errors)
  page.close()
 browser.close()
print('IN cover render smoke/toxic/money/ice: passed (synthetic)')
