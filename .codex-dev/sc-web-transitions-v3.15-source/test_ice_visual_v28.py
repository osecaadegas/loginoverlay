import base64,io
from pathlib import Path
from PIL import Image,ImageStat
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent
html=R.joinpath('overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','').replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=ice&duration=3.0')")
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 pg=b.new_page(viewport={'width':960,'height':540});errors=[];pg.on('pageerror',lambda x:errors.append(str(x)))
 pg.set_content(html,wait_until='domcontentloaded');pg.wait_for_function('shards.length>0',timeout=40000)
 for direction in ['out','in']:
  alpha=[]
  for v in [0,.15,.3,.5,.75,.94,1]:
   x=pg.evaluate('''([v,dir])=>{ctx.clearRect(0,0,W,H);drawIce(v*3,dir,3);return cvs.toDataURL('image/png').split(',')[1]}''',[v,direction]);im=Image.open(io.BytesIO(base64.b64decode(x))).convert('RGBA');alpha.append(round(ImageStat.Stat(im).mean[3],2))
  print('ice',direction,'mean alpha progress',alpha)
  assert alpha[-1]<1 and max(alpha)>5
 assert not errors,errors
 b.close()
