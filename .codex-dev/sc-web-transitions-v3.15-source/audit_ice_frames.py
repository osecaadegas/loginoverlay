from pathlib import Path
import io,base64
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
R=Path(__file__).parent
html=(R/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','').replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=ice&duration=3.0')")
frames=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':960,'height':540})
 page.set_content(html,wait_until='domcontentloaded')
 page.wait_for_function('shards.length>0',timeout=40000)
 for dr in ['out','in']:
  for x in [0,.1,.2,.3,.45,.6,.75,.87,1.0]:
   b64=page.evaluate('''([fraction,dir])=>{ctx.clearRect(0,0,W,H);drawIce(fraction*3,dir,3);return cvs.toDataURL('image/png').split(',')[1]}''',[x,dr])
   im=Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA')
   bg=Image.new('RGBA',im.size,(28,33,48,255));bg.alpha_composite(im);im=bg.convert('RGB');im.thumbnail((320,180));frames.append((dr,x,im.copy()))
 browser.close()
out=Image.new('RGB',(320*9,2*220),(10,13,21));d=ImageDraw.Draw(out)
for n,(dr,x,im) in enumerate(frames):
 row=n//9;col=n%9;out.paste(im,(col*320,row*220+30));d.text((col*320+10,row*220+7),f'{dr.upper()} {x:.0%}',fill='white')
out.save(R/'audit_ice_comparison.jpg',quality=87)
print('wrote',R/'audit_ice_comparison.jpg')
